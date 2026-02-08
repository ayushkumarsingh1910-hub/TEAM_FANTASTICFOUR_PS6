// Exercise engine for rep counting, phase detection, and form validation
import {
    ExerciseDefinition,
    ExercisePhase,
    ExerciseState,
    JointStress,
    Landmark3D,
    PoseLandmark,
    SafetyLog
} from '@/types';
import {
    CalibrationBaseline,
    calculateAngle3D,
    calculateBiometrics,
    calculateDistance3D,
    calculateFormScore,
    evaluateForm,
    getElbowAngle,
    getRobustElbowAngle,
    getKneeAngle,
    getShoulderAngle
} from './Biometrics';
import { getExerciseById } from '@/data/exercises';

/**
 * ExerciseEngine - Handles exercise tracking, rep counting, and form validation
 */
export class ExerciseEngine {
    private exerciseId: string;
    private exercise: ExerciseDefinition | undefined;
    private state: ExerciseState;
    private previousLandmarks: Landmark3D[] | null = null;
    private previousTimestamp: number = 0;
    private angleHistory: number[] = [];
    private repCallbacks: ((count: number) => void)[] = [];
    private formCallbacks: ((score: number, stresses: JointStress[]) => void)[] = [];
    private cumulativeHoldDuration: number = 0;
    private lastHoldTick: number = 0;
    private acutePainStartTime: number | null = null;
    private stopCallbacks: (() => void)[] = [];

    // RCAFT Calibration
    private calibrationFrames: Landmark3D[][] = [];
    private calibrationStartTime: number | null = null;
    private baseline: CalibrationBaseline | null = null;

    // Movement Smoothing & Robustness
    private smaAngleHistory: number[] = [];
    private painEMA: number = 0;
    private lastRepTimestamp: number = 0;
    private readonly REP_COOLDOWN_MS = 850; // Increased for better separation
    private readonly SMA_WINDOW = 7; // Increased smoothing
    private readonly EMA_ALPHA = 0.3;

    // State Persistence
    private lastAttemptedPhase: string = 'IDLE';
    private phaseFrameCount: number = 0;
    private readonly MIN_PHASE_FRAMES = 4; // Increased for damping
    private lastValidAngleTimestamp: number = 0;

    constructor(exerciseId: string) {
        this.exerciseId = exerciseId;
        this.exercise = getExerciseById(exerciseId);

        this.state = {
            exerciseId,
            phase: 'IDLE',
            repCount: 0,
            currentAngle: 0,
            formScore: 100,
            jointStress: [],
            startTime: Date.now(),
            angularVelocity: 0,
            symmetryScore: 100,
            isHolding: false,
            painScore: 0,
            painAnalysis: {
                pain_detected: false,
                confidence_score: 0,
                primary_action_units: [],
                intensity_level: 'Low',
                recommended_action: 'Continue',
                pain_score_raw: 0
            },
            safetyLog: {
                status: 'Scanning',
                pain_level: 0,
                ui_message: 'Starting calibration...',
                system_command: null
            },
            isCalibrating: true,
            calibrationProgress: 0
        };
    }

    /**
     * Process a new pose frame
     */
    processFrame(landmarks: Landmark3D[], timestamp: number): ExerciseState {
        if (!this.exercise || landmarks.length < 33) {
            return this.state;
        }

        const deltaTimeMs = this.previousTimestamp ? timestamp - this.previousTimestamp : 16;

        // RCAFT: Calibration Phase handling
        if (this.state.isCalibrating) {
            this.handleCalibration(landmarks, timestamp);
            return this.state;
        }

        // Calculate biometrics with baseline normalization
        const biometrics = calculateBiometrics(
            landmarks,
            this.previousLandmarks || undefined,
            deltaTimeMs,
            this.baseline || undefined
        );

        // Get primary angle for this exercise
        let primaryAngle = this.getPrimaryAngle(landmarks);

        // Latching Logic: If visibility is lost briefly (< 300ms), reuse last valid angle
        if (primaryAngle === -1) {
            if (timestamp - this.lastValidAngleTimestamp < 300 && this.state.currentAngle !== 0) {
                primaryAngle = this.state.currentAngle;
            }
        } else {
            this.lastValidAngleTimestamp = timestamp;
        }

        this.state.currentAngle = primaryAngle;

        // Track angle history for velocity calculation
        this.angleHistory.push(primaryAngle);
        if (this.angleHistory.length > 10) {
            this.angleHistory.shift();
        }

        // Calculate angular velocity
        if (this.angleHistory.length >= 2) {
            const velocities = [];
            for (let i = 1; i < this.angleHistory.length; i++) {
                if (this.angleHistory[i] !== -1 && this.angleHistory[i - 1] !== -1) {
                    velocities.push(Math.abs(this.angleHistory[i] - this.angleHistory[i - 1]) / (deltaTimeMs / 1000));
                }
            }
            this.state.angularVelocity = velocities.length > 0
                ? velocities.reduce((a, b) => a + b, 0) / velocities.length
                : 0;
        }

        // Apply SMA Smoothing to Current Angle
        if (primaryAngle !== -1) {
            this.smaAngleHistory.push(primaryAngle);
            if (this.smaAngleHistory.length > this.SMA_WINDOW) this.smaAngleHistory.shift();
        }

        const smoothedAngle = this.smaAngleHistory.length > 0
            ? this.smaAngleHistory.reduce((a, b) => a + b, 0) / this.smaAngleHistory.length
            : -1;

        this.state.currentAngle = smoothedAngle;

        // Update symmetry score
        this.state.symmetryScore = biometrics.overallSymmetry;

        // Evaluate form
        const jointStresses = evaluateForm(landmarks, this.exerciseId, biometrics);
        this.state.jointStress = jointStresses;
        this.state.formScore = calculateFormScore(biometrics, jointStresses);

        // Update pain score and analysis with EMA Smoothing
        const rawPainScore = biometrics.painScore;
        this.painEMA = (this.EMA_ALPHA * rawPainScore) + ((1 - this.EMA_ALPHA) * this.painEMA);

        this.state.painScore = Math.round(this.painEMA);
        this.state.painAnalysis = {
            ...biometrics.painAnalysis,
            pain_score_raw: this.painEMA / 10 // Sync with EMA
        };
        this.state.safetyLog = {
            ...biometrics.safetyLog,
            pain_level: Math.round(this.painEMA)
        };

        // Clinical Temporal Differentiation: Effort vs Acute Pain
        this.handleClinicalPainThresholds(biometrics.painAnalysis, timestamp);

        // Detect phase transitions - IGNORE INVALID ANGLES & TRACKING GLITCHES
        // Velocity guard: Extreme velocity spikes are almost always tracking errors
        const isGlitching = this.state.angularVelocity > 1000;
        const cooldownActive = timestamp - this.lastRepTimestamp < this.REP_COOLDOWN_MS;

        if (smoothedAngle !== -1 && smoothedAngle !== 0 && !isGlitching && !cooldownActive) {
            this.detectPhaseTransition(smoothedAngle, timestamp);
        }

        // Notify form callbacks
        this.formCallbacks.forEach(cb => cb(this.state.formScore, jointStresses));

        // Store for next frame
        this.previousLandmarks = [...landmarks];
        this.previousTimestamp = timestamp;

        return this.state;
    }

    /**
     * Get the primary angle for the current exercise
     */
    private getPrimaryAngle(landmarks: Landmark3D[]): number {
        switch (this.exerciseId) {
            case 'pushup':
            case 'tricep-dip':
                return getRobustElbowAngle(landmarks);

            case 'squat':
            case 'lunge':
                const leftKnee = (landmarks[PoseLandmark.LEFT_KNEE].visibility || 0) > 0.5 ? getKneeAngle(landmarks, 'left') : -1;
                const rightKnee = (landmarks[PoseLandmark.RIGHT_KNEE].visibility || 0) > 0.5 ? getKneeAngle(landmarks, 'right') : -1;

                if (leftKnee !== -1 && rightKnee !== -1) return (leftKnee + rightKnee) / 2;
                if (leftKnee !== -1) return leftKnee;
                if (rightKnee !== -1) return rightKnee;
                return (getKneeAngle(landmarks, 'left') + getKneeAngle(landmarks, 'right')) / 2;

            case 'bicep-curl':
                return getRobustElbowAngle(landmarks);

            case 'shoulder-press':
            case 'lateral-raise':
                return (getShoulderAngle(landmarks, 'left') + getShoulderAngle(landmarks, 'right')) / 2;

            case 'jumping-jack':
                return this.getJumpingJackAngle(landmarks);

            case 'calf-raise':
                return this.getAnkleAngle(landmarks);

            case 'plank':
                return this.getPlankAngle(landmarks);

            default:
                return (getElbowAngle(landmarks, 'left') + getElbowAngle(landmarks, 'right')) / 2;
        }
    }

    /**
     * Detect phase transitions and count reps with Frame Persistence logic
     */
    private updatePhase(newPhase: string): void {
        if (newPhase === this.lastAttemptedPhase) {
            this.phaseFrameCount++;
        } else {
            this.lastAttemptedPhase = newPhase;
            this.phaseFrameCount = 1;
        }

        if (this.phaseFrameCount >= this.MIN_PHASE_FRAMES) {
            this.state.phase = newPhase as ExercisePhase;
        }
    }

    private detectPhaseTransition(currentAngle: number, timestamp: number): void {
        if (!this.exercise) return;

        const { downAngleThreshold, upAngleThreshold } = this.exercise;

        // Different exercises have different phase detection logic
        switch (this.exerciseId) {
            case 'pushup':
            case 'tricep-dip':
                if (this.state.phase === 'IDLE' || this.state.phase === 'UP' || this.state.phase === 'COMPLETE') {
                    if (currentAngle < downAngleThreshold + 10) {
                        this.updatePhase('DOWN');
                    }
                } else if (this.state.phase === 'DOWN') {
                    if (currentAngle > upAngleThreshold - 10) {
                        this.countRep();
                        this.lastRepTimestamp = timestamp;
                        this.updatePhase('UP');
                    }
                }
                break;

            case 'squat':
            case 'lunge':
                if (this.state.phase === 'IDLE' || this.state.phase === 'UP' || this.state.phase === 'COMPLETE') {
                    if (currentAngle < downAngleThreshold + 10) {
                        this.updatePhase('DOWN');
                    }
                } else if (this.state.phase === 'DOWN') {
                    if (currentAngle > upAngleThreshold - 10) {
                        this.countRep();
                        this.updatePhase('UP');
                    }
                }
                break;

            case 'bicep-curl':
                if (this.state.phase === 'IDLE' || this.state.phase === 'DOWN' || this.state.phase === 'COMPLETE') {
                    // Start: Need to reach near-full contraction
                    if (currentAngle < upAngleThreshold + 10) {
                        this.updatePhase('UP');
                    }
                } else if (this.state.phase === 'UP') {
                    // End: Need to reach near-full extension
                    if (currentAngle > downAngleThreshold - 10) {
                        this.countRep();
                        this.lastRepTimestamp = timestamp;
                        this.updatePhase('DOWN');
                    }
                }
                break;

            case 'shoulder-press':
            case 'lateral-raise':
                if (this.state.phase === 'IDLE' || this.state.phase === 'DOWN' || this.state.phase === 'COMPLETE') {
                    if (currentAngle > upAngleThreshold - 10) {
                        this.updatePhase('UP');
                    }
                } else if (this.state.phase === 'UP') {
                    if (currentAngle < downAngleThreshold + 10) {
                        this.countRep();
                        this.lastRepTimestamp = timestamp;
                        this.updatePhase('DOWN');
                    }
                }
                break;

            case 'jumping-jack':
                if (this.state.phase === 'IDLE' || this.state.phase === 'DOWN' || this.state.phase === 'COMPLETE') {
                    if (currentAngle > upAngleThreshold - 10) {
                        this.updatePhase('UP');
                    }
                } else if (this.state.phase === 'UP') {
                    if (currentAngle < downAngleThreshold + 10) {
                        this.countRep();
                        this.lastRepTimestamp = timestamp;
                        this.updatePhase('DOWN');
                    }
                }
                break;

            case 'plank':
                const isGoodForm = this.state.formScore > 70;
                const isAligned = Math.abs(currentAngle - 180) < 30;

                if (isGoodForm && isAligned) {
                    const now = Date.now();

                    // Use persistence for plank holding
                    if (this.lastAttemptedPhase !== 'HOLD') {
                        this.lastAttemptedPhase = 'HOLD';
                        this.phaseFrameCount = 1;
                    } else {
                        this.phaseFrameCount++;
                    }

                    if (this.phaseFrameCount >= this.MIN_PHASE_FRAMES) {
                        if (!this.state.isHolding) {
                            this.state.isHolding = true;
                            this.state.phase = 'HOLD';
                            this.lastHoldTick = now;
                        } else {
                            const delta = now - this.lastHoldTick;
                            if (delta > 0) {
                                this.cumulativeHoldDuration += delta;
                                const newCount = Math.floor(this.cumulativeHoldDuration / 1000);

                                if (newCount > this.state.repCount) {
                                    this.state.repCount = newCount;
                                    this.state.lastRepTime = now;
                                    this.repCallbacks.forEach(cb => cb(this.state.repCount));
                                }
                            }
                            this.lastHoldTick = now;
                        }
                    }
                } else {
                    if (this.lastAttemptedPhase !== 'IDLE') {
                        this.lastAttemptedPhase = 'IDLE';
                        this.phaseFrameCount = 1;
                    } else {
                        this.phaseFrameCount++;
                    }

                    if (this.phaseFrameCount >= this.MIN_PHASE_FRAMES && this.state.isHolding) {
                        this.state.isHolding = false;
                        this.state.phase = 'IDLE';
                    }
                }
                break;

            default:
                if (this.state.phase === 'IDLE' || this.state.phase === 'UP' || this.state.phase === 'COMPLETE') {
                    if (currentAngle < downAngleThreshold + 10) {
                        this.updatePhase('DOWN');
                    }
                } else if (this.state.phase === 'DOWN') {
                    if (currentAngle > upAngleThreshold - 10) {
                        this.countRep();
                        this.lastRepTimestamp = timestamp;
                        this.updatePhase('UP');
                    }
                }
                break;
        }
    }

    private countRep(): void {
        this.state.repCount++;
        this.state.lastRepTime = Date.now();
        this.state.phase = 'COMPLETE';
        this.repCallbacks.forEach(cb => cb(this.state.repCount));

        // Clear phase history to force a clean reset for the next rep
        this.lastAttemptedPhase = 'COMPLETE';
        this.phaseFrameCount = 0;
    }

    private getJumpingJackAngle(landmarks: Landmark3D[]): number {
        const leftWrist = landmarks[PoseLandmark.LEFT_WRIST];
        const rightWrist = landmarks[PoseLandmark.RIGHT_WRIST];
        const leftShoulder = landmarks[PoseLandmark.LEFT_SHOULDER];
        const rightShoulder = landmarks[PoseLandmark.RIGHT_SHOULDER];

        const leftArmAngle = Math.atan2(leftWrist.x - leftShoulder.x, leftShoulder.y - leftWrist.y) * 180 / Math.PI;
        const rightArmAngle = Math.atan2(rightShoulder.x - rightWrist.x, rightShoulder.y - rightWrist.y) * 180 / Math.PI;

        return (Math.abs(leftArmAngle) + Math.abs(rightArmAngle)) / 2;
    }

    private getAnkleAngle(landmarks: Landmark3D[]): number {
        const leftKnee = landmarks[PoseLandmark.LEFT_KNEE];
        const leftAnkle = landmarks[PoseLandmark.LEFT_ANKLE];
        const leftHeel = landmarks[PoseLandmark.LEFT_HEEL];

        const dx1 = leftKnee.x - leftAnkle.x;
        const dy1 = leftKnee.y - leftAnkle.y;
        const dx2 = leftHeel.x - leftAnkle.x;
        const dy2 = leftHeel.y - leftAnkle.y;

        const dotProduct = dx1 * dx2 + dy1 * dy2;
        const mag1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
        const mag2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

        if (mag1 === 0 || mag2 === 0) return 90;
        const cosAngle = dotProduct / (mag1 * mag2);
        return Math.acos(Math.max(-1, Math.min(1, cosAngle))) * 180 / Math.PI;
    }

    private getPlankAngle(landmarks: Landmark3D[]): number {
        const leftShoulder = landmarks[PoseLandmark.LEFT_SHOULDER];
        const leftHip = landmarks[PoseLandmark.LEFT_HIP];
        const leftAnkle = landmarks[PoseLandmark.LEFT_ANKLE];
        const rightShoulder = landmarks[PoseLandmark.RIGHT_SHOULDER];
        const rightHip = landmarks[PoseLandmark.RIGHT_HIP];
        const rightAnkle = landmarks[PoseLandmark.RIGHT_ANKLE];

        const leftScore = (leftShoulder.visibility || 0) + (leftHip.visibility || 0) + (leftAnkle.visibility || 0);
        const rightScore = (rightShoulder.visibility || 0) + (rightHip.visibility || 0) + (rightAnkle.visibility || 0);

        if (leftScore > rightScore && leftScore > 1.5) {
            return calculateAngle3D(leftShoulder, leftHip, leftAnkle);
        } else if (rightScore > 1.5) {
            return calculateAngle3D(rightShoulder, rightHip, rightAnkle);
        }
        return 180;
    }

    onRep(callback: (count: number) => void): void {
        this.repCallbacks.push(callback);
    }

    onFormUpdate(callback: (score: number, stresses: JointStress[]) => void): void {
        this.formCallbacks.push(callback);
    }

    onStopRequest(callback: () => void): void {
        this.stopCallbacks.push(callback);
    }

    getState(): ExerciseState {
        return { ...this.state };
    }

    getExercise(): ExerciseDefinition | undefined {
        return this.exercise;
    }

    getElapsedTime(): number {
        return (Date.now() - this.state.startTime) / 1000;
    }

    reset(): void {
        this.state = {
            exerciseId: this.exerciseId,
            phase: 'IDLE',
            repCount: 0,
            currentAngle: 0,
            formScore: 100,
            jointStress: [],
            startTime: Date.now(),
            angularVelocity: 0,
            symmetryScore: 100,
            isHolding: false,
            painScore: 0,
            painAnalysis: {
                pain_detected: false,
                confidence_score: 0,
                primary_action_units: [],
                intensity_level: 'Low',
                recommended_action: 'Continue',
                pain_score_raw: 0
            },
            safetyLog: {
                status: 'Scanning',
                pain_level: 0,
                ui_message: 'Starting calibration...',
                system_command: null
            },
            isCalibrating: true,
            calibrationProgress: 0
        };
        this.previousLandmarks = null;
        this.previousTimestamp = 0;
        this.angleHistory = [];
        this.cumulativeHoldDuration = 0;
        this.lastHoldTick = 0;
        this.acutePainStartTime = null;
        this.calibrationFrames = [];
        this.calibrationStartTime = null;
        this.baseline = null;
        this.smaAngleHistory = [];
        this.painEMA = 0;
        this.lastRepTimestamp = 0;
    }

    private handleCalibration(landmarks: Landmark3D[], timestamp: number): void {
        if (!this.calibrationStartTime) {
            this.calibrationStartTime = timestamp;
        }

        const elapsed = timestamp - this.calibrationStartTime;
        this.state.calibrationProgress = Math.min(100, (elapsed / 3000) * 100);
        this.state.safetyLog.status = 'Calibrating';
        this.state.safetyLog.ui_message = 'Please maintain a neutral expression...';

        this.calibrationFrames.push(landmarks);

        if (elapsed >= 3000) {
            this.baseline = this.computeBaseline();
            this.state.isCalibrating = false;
            this.state.safetyLog.status = 'Scanning';
            this.state.safetyLog.ui_message = 'Calibration complete. Starting analysis.';
        }
    }

    private computeBaseline(): CalibrationBaseline {
        let counts = 0;
        const sums = { eyeDist: 0, eyeNoseRatio: 0, eyeNarrowRatio: 0, mouthNoseRatio: 0, mouthWidthRatio: 0 };

        this.calibrationFrames.forEach(frame => {
            const nose = frame[PoseLandmark.NOSE];
            const leftEye = frame[PoseLandmark.LEFT_EYE];
            const rightEye = frame[PoseLandmark.RIGHT_EYE];
            const leftEyeInner = frame[PoseLandmark.LEFT_EYE_INNER];
            const rightEyeInner = frame[PoseLandmark.RIGHT_EYE_INNER];
            const leftEyeOuter = frame[PoseLandmark.LEFT_EYE_OUTER];
            const rightEyeOuter = frame[PoseLandmark.RIGHT_EYE_OUTER];
            const mouthLeft = frame[PoseLandmark.MOUTH_LEFT];
            const mouthRight = frame[PoseLandmark.MOUTH_RIGHT];

            if (nose && leftEye && rightEye && leftEyeInner && rightEyeInner && mouthLeft && mouthRight) {
                const eyeDist = calculateDistance3D(leftEye, rightEye);
                if (eyeDist === 0) return;

                sums.eyeDist += eyeDist;
                sums.eyeNoseRatio += ((calculateDistance3D(leftEyeInner, nose) + calculateDistance3D(rightEyeInner, nose)) / 2) / eyeDist;
                sums.eyeNarrowRatio += ((Math.abs(leftEyeInner.x - leftEyeOuter.x) + Math.abs(rightEyeInner.x - rightEyeOuter.x)) / 2) / eyeDist;
                sums.mouthNoseRatio += ((calculateDistance3D(mouthLeft, nose) + calculateDistance3D(mouthRight, nose)) / 2) / eyeDist;
                sums.mouthWidthRatio += calculateDistance3D(mouthLeft, mouthRight) / eyeDist;
                counts++;
            }
        });

        if (counts === 0) {
            return { eyeDist: 0.1, eyeNoseRatio: 0.6, eyeNarrowRatio: 0.25, mouthNoseRatio: 0.9, mouthWidthRatio: 0.9 };
        }

        return {
            eyeDist: sums.eyeDist / counts,
            eyeNoseRatio: sums.eyeNoseRatio / counts,
            eyeNarrowRatio: sums.eyeNarrowRatio / counts,
            mouthNoseRatio: sums.mouthNoseRatio / counts,
            mouthWidthRatio: sums.mouthWidthRatio / counts,
        };
    }

    private handleClinicalPainThresholds(analysis: any, timestamp: number): void {
        const painScoreRaw = analysis.pain_score_raw;
        const isPeak = this.isPeakOfContraction();

        this.state.safetyLog.pain_level = Math.round(painScoreRaw * 10);

        if (painScoreRaw > 8.5) {
            if (isPeak && analysis.intensity_level !== 'Critical') {
                this.state.safetyLog.status = 'Effort Detected';
                this.state.safetyLog.ui_message = 'High effort detected. Keep breathing.';
                this.acutePainStartTime = null;
            } else {
                this.state.safetyLog.status = 'PAIN ALERT';
                this.state.safetyLog.ui_message = 'Sudden muscle tension! Ease up.';

                if (this.acutePainStartTime === null) {
                    this.acutePainStartTime = timestamp;
                } else if (timestamp - this.acutePainStartTime > 2500) {
                    this.state.safetyLog.ui_message = 'Stop! Drop the weights';
                    this.state.safetyLog.system_command = 'HALT_WORKOUT';
                    this.state.painAnalysis.recommended_action = 'STOP_EXERCISE';
                    this.stopCallbacks.forEach(cb => cb());
                }
            }
        } else {
            this.state.safetyLog.status = 'Scanning';
            this.state.safetyLog.ui_message = 'Motion within safe comfort zones.';
            this.acutePainStartTime = null;
        }
    }

    private isPeakOfContraction(): boolean {
        if (!this.exercise) return false;
        const { currentAngle } = this.state;
        const { downAngleThreshold, upAngleThreshold } = this.exercise;

        // Peak exertion is usually at the bottom of a squat/pushup or top of a curl
        switch (this.exerciseId) {
            case 'bicep-curl':
                return currentAngle < upAngleThreshold + 15;
            case 'squat':
            case 'pushup':
                return currentAngle < downAngleThreshold + 15;
            default:
                return false;
        }
    }
}
