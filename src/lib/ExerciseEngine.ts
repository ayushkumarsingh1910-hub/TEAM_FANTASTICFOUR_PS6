// Exercise engine for rep counting, phase detection, and form validation
import {
    ExerciseState,
    ExercisePhase,
    Landmark3D,
    PoseLandmark,
    JointStress,
    ExerciseDefinition
} from '@/types';
import {
    getElbowAngle,
    getKneeAngle,
    getShoulderAngle,
    calculateAngle3D,
    calculateBiometrics,
    evaluateForm,
    calculateFormScore
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
        };
    }

    /**
     * Process a new pose frame
     */
    processFrame(landmarks: Landmark3D[], timestamp: number): ExerciseState {
        if (!this.exercise || landmarks.length < 33) {
            return this.state;
        }

        const deltaTime = this.previousTimestamp ? timestamp - this.previousTimestamp : 16;

        // Calculate biometrics
        const biometrics = calculateBiometrics(
            landmarks,
            this.previousLandmarks || undefined,
            deltaTime
        );

        // Get primary angle for this exercise
        const primaryAngle = this.getPrimaryAngle(landmarks);
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
                velocities.push(Math.abs(this.angleHistory[i] - this.angleHistory[i - 1]) / (deltaTime / 1000));
            }
            this.state.angularVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
        }

        // Update symmetry score
        this.state.symmetryScore = biometrics.overallSymmetry;

        // Evaluate form
        const jointStresses = evaluateForm(landmarks, this.exerciseId, biometrics);
        this.state.jointStress = jointStresses;
        this.state.formScore = calculateFormScore(biometrics, jointStresses);

        // Update pain score
        this.state.painScore = biometrics.painScore;

        // Detect phase transitions
        this.detectPhaseTransition(primaryAngle);

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
                return (getElbowAngle(landmarks, 'left') + getElbowAngle(landmarks, 'right')) / 2;

            case 'squat':
            case 'lunge':
                const robustAngle = (landmarks: Landmark3D[]) => {
                    const leftVis = landmarks[6].visibility || 0; // KNEE indices are 25, 26 but let's be careful
                    // Actually, let's just use the function from Biometrics.
                    return 0; // Placeholder for now, will fix below.
                };
                // Wait, I should import it or use it. It's already imported in ExerciseEngine via Biometrics? 
                // No, I need to export it or just use the logic.
                const leftKnee = (landmarks[PoseLandmark.LEFT_KNEE].visibility || 0) > 0.5 ? getKneeAngle(landmarks, 'left') : -1;
                const rightKnee = (landmarks[PoseLandmark.RIGHT_KNEE].visibility || 0) > 0.5 ? getKneeAngle(landmarks, 'right') : -1;

                if (leftKnee !== -1 && rightKnee !== -1) return (leftKnee + rightKnee) / 2;
                if (leftKnee !== -1) return leftKnee;
                if (rightKnee !== -1) return rightKnee;
                return (getKneeAngle(landmarks, 'left') + getKneeAngle(landmarks, 'right')) / 2;

            case 'bicep-curl':
                return (getElbowAngle(landmarks, 'left') + getElbowAngle(landmarks, 'right')) / 2;

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
     * Detect phase transitions and count reps
     */
    private detectPhaseTransition(currentAngle: number): void {
        if (!this.exercise) return;

        const { downAngleThreshold, upAngleThreshold } = this.exercise;

        // Different exercises have different phase detection logic
        switch (this.exerciseId) {
            case 'pushup':
            case 'tricep-dip':
                // Elbow angle: starts high (extended), goes low (bent), back to high
                // Tightened buffers (10 deg instead of 20) to prevent jitter counting
                if (this.state.phase === 'IDLE' || this.state.phase === 'UP' || this.state.phase === 'COMPLETE') {
                    if (currentAngle < downAngleThreshold + 10) {
                        this.state.phase = 'DOWN';
                    }
                } else if (this.state.phase === 'DOWN') {
                    if (currentAngle > upAngleThreshold - 10) {
                        this.state.phase = 'UP';
                        this.countRep();
                    }
                }
                break;

            case 'squat':
            case 'lunge':
                // Knee angle: starts high (standing), goes low (squatting), back to high
                if (this.state.phase === 'IDLE' || this.state.phase === 'UP' || this.state.phase === 'COMPLETE') {
                    if (currentAngle < downAngleThreshold + 20) {
                        this.state.phase = 'DOWN';
                    }
                } else if (this.state.phase === 'DOWN') {
                    if (currentAngle > upAngleThreshold - 20) {
                        this.state.phase = 'UP';
                        this.countRep();
                    }
                }
                break;

            case 'bicep-curl':
                // Elbow angle: starts high (extended), goes low (curled), back to high
                if (this.state.phase === 'IDLE' || this.state.phase === 'UP' || this.state.phase === 'COMPLETE') {
                    if (currentAngle < upAngleThreshold + 20) {
                        this.state.phase = 'DOWN';
                    }
                } else if (this.state.phase === 'DOWN') {
                    if (currentAngle > downAngleThreshold - 20) {
                        this.state.phase = 'UP';
                        this.countRep();
                    }
                }
                break;

            case 'shoulder-press':
            case 'lateral-raise':
                if (this.state.phase === 'IDLE' || this.state.phase === 'DOWN' || this.state.phase === 'COMPLETE') {
                    if (currentAngle > upAngleThreshold - 10) {
                        this.state.phase = 'UP';
                    }
                } else if (this.state.phase === 'UP') {
                    if (currentAngle < downAngleThreshold + 10) {
                        this.state.phase = 'DOWN';
                        this.countRep();
                    }
                }
                break;

            case 'jumping-jack':
                // Based on arm spread
                if (this.state.phase === 'IDLE' || this.state.phase === 'DOWN' || this.state.phase === 'COMPLETE') {
                    if (currentAngle > upAngleThreshold) {
                        this.state.phase = 'UP';
                    }
                } else if (this.state.phase === 'UP') {
                    if (currentAngle < downAngleThreshold + 10) {
                        this.state.phase = 'DOWN';
                        this.countRep();
                    }
                }
                break;

            case 'plank':
                // Time-based tracking for plank
                const isGoodForm = this.state.formScore > 70;
                const isAligned = Math.abs(currentAngle - 180) < 30;

                if (isGoodForm && isAligned) {
                    const now = Date.now();
                    if (!this.state.isHolding) {
                        this.state.isHolding = true;
                        this.state.phase = 'HOLD';
                        this.lastHoldTick = now;
                    } else {
                        // Accumulate time
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
                } else {
                    if (this.state.isHolding) {
                        this.state.isHolding = false;
                        this.state.phase = 'IDLE';
                    }
                }
                break;

            default:
                // Generic up/down detection
                if (this.state.phase === 'IDLE' || this.state.phase === 'UP' || this.state.phase === 'COMPLETE') {
                    if (currentAngle < downAngleThreshold + 20) {
                        this.state.phase = 'DOWN';
                    }
                } else if (this.state.phase === 'DOWN') {
                    if (currentAngle > upAngleThreshold - 20) {
                        this.state.phase = 'UP';
                        this.countRep();
                    }
                }
        }
    }

    /**
     * Count a rep and notify callbacks
     */
    private countRep(): void {
        this.state.repCount++;
        this.state.lastRepTime = Date.now();
        this.state.phase = 'COMPLETE';

        // Notify callbacks
        this.repCallbacks.forEach(cb => cb(this.state.repCount));
    }

    /**
     * Calculate jumping jack angle (arm spread)
     */
    private getJumpingJackAngle(landmarks: Landmark3D[]): number {
        const leftWrist = landmarks[PoseLandmark.LEFT_WRIST];
        const rightWrist = landmarks[PoseLandmark.RIGHT_WRIST];
        const leftShoulder = landmarks[PoseLandmark.LEFT_SHOULDER];
        const rightShoulder = landmarks[PoseLandmark.RIGHT_SHOULDER];

        // Calculate arm spread as angle from vertical
        const leftArmAngle = Math.atan2(
            leftWrist.x - leftShoulder.x,
            leftShoulder.y - leftWrist.y
        ) * 180 / Math.PI;

        const rightArmAngle = Math.atan2(
            rightShoulder.x - rightWrist.x,
            rightShoulder.y - rightWrist.y
        ) * 180 / Math.PI;

        return (Math.abs(leftArmAngle) + Math.abs(rightArmAngle)) / 2;
    }

    /**
     * Calculate ankle angle for calf raises
     */
    private getAnkleAngle(landmarks: Landmark3D[]): number {
        const leftKnee = landmarks[PoseLandmark.LEFT_KNEE];
        const leftAnkle = landmarks[PoseLandmark.LEFT_ANKLE];
        const leftHeel = landmarks[PoseLandmark.LEFT_HEEL];

        // Calculate angle at ankle
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

    /**
     * Calculate plank angle (hip alignment)
     */
    private getPlankAngle(landmarks: Landmark3D[]): number {
        const leftShoulder = landmarks[PoseLandmark.LEFT_SHOULDER];
        const leftHip = landmarks[PoseLandmark.LEFT_HIP];
        const leftAnkle = landmarks[PoseLandmark.LEFT_ANKLE];

        const rightShoulder = landmarks[PoseLandmark.RIGHT_SHOULDER];
        const rightHip = landmarks[PoseLandmark.RIGHT_HIP];
        const rightAnkle = landmarks[PoseLandmark.RIGHT_ANKLE];

        // Determine which side is more visible
        const leftScore = (leftShoulder.visibility || 0) + (leftHip.visibility || 0) + (leftAnkle.visibility || 0);
        const rightScore = (rightShoulder.visibility || 0) + (rightHip.visibility || 0) + (rightAnkle.visibility || 0);

        if (leftScore > rightScore && leftScore > 1.5) {
            return calculateAngle3D(leftShoulder, leftHip, leftAnkle);
        } else if (rightScore > 1.5) {
            return calculateAngle3D(rightShoulder, rightHip, rightAnkle);
        } else {
            // Fallback or average if visibility is low
            return 180;
        }
    }

    /**
     * Subscribe to rep count updates
     */
    onRep(callback: (count: number) => void): void {
        this.repCallbacks.push(callback);
    }

    /**
     * Subscribe to form updates
     */
    onFormUpdate(callback: (score: number, stresses: JointStress[]) => void): void {
        this.formCallbacks.push(callback);
    }

    /**
     * Get current state
     */
    getState(): ExerciseState {
        return { ...this.state };
    }

    /**
     * Get elapsed time in seconds
     */
    getElapsedTime(): number {
        return (Date.now() - this.state.startTime) / 1000;
    }

    /**
     * Reset the engine
     */
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
        };
        this.previousLandmarks = null;
        this.previousTimestamp = 0;
        this.angleHistory = [];
        this.cumulativeHoldDuration = 0;
        this.lastHoldTick = 0;
    }

    /**
     * Get the exercise definition
     */
    getExercise(): ExerciseDefinition | undefined {
        return this.exercise;
    }
}
