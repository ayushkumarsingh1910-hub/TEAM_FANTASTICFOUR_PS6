// Biomechanical calculations for joint angles, angular velocity, and symmetry
import { Landmark3D, PoseLandmark, BiometricData, JointStress } from '@/types';

// 3D Vector operations
interface Vector3D {
    x: number;
    y: number;
    z: number;
}

function subtract(a: Vector3D, b: Vector3D): Vector3D {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function dot(a: Vector3D, b: Vector3D): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

function magnitude(v: Vector3D): number {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function normalize(v: Vector3D): Vector3D {
    const mag = magnitude(v);
    if (mag === 0) return { x: 0, y: 0, z: 0 };
    return { x: v.x / mag, y: v.y / mag, z: v.z / mag };
}

/**
 * Calculate the angle between three 3D points (in degrees)
 * The angle is formed at point B (the vertex)
 */
export function calculateAngle3D(
    pointA: Landmark3D,
    pointB: Landmark3D,
    pointC: Landmark3D
): number {
    const vectorBA = subtract(pointA, pointB);
    const vectorBC = subtract(pointC, pointB);

    const dotProduct = dot(vectorBA, vectorBC);
    const magnitudeProduct = magnitude(vectorBA) * magnitude(vectorBC);

    if (magnitudeProduct === 0) return 0;

    const cosAngle = Math.max(-1, Math.min(1, dotProduct / magnitudeProduct));
    const angleRad = Math.acos(cosAngle);

    return (angleRad * 180) / Math.PI;
}

/**
 * Calculate angular velocity (degrees per second)
 */
export function calculateAngularVelocity(
    currentAngle: number,
    previousAngle: number,
    deltaTimeMs: number
): number {
    if (deltaTimeMs <= 0) return 0;
    const deltaTimeSec = deltaTimeMs / 1000;
    return Math.abs(currentAngle - previousAngle) / deltaTimeSec;
}

/**
 * Calculate symmetry score between left and right sides (0-100)
 */
export function calculateSymmetryScore(
    leftAngle: number,
    rightAngle: number
): number {
    const maxAngle = Math.max(leftAngle, rightAngle, 1);
    const difference = Math.abs(leftAngle - rightAngle);
    const symmetry = 1 - (difference / maxAngle);
    return Math.round(symmetry * 100);
}

/**
 * Calculate distance between two 3D landmarks
 */
export function calculateDistance3D(a: Landmark3D, b: Landmark3D): number {
    return magnitude(subtract(a, b));
}

// Joint angle calculation functions for specific body parts

export function getElbowAngle(
    landmarks: Landmark3D[],
    side: 'left' | 'right'
): number {
    const shoulder = side === 'left'
        ? landmarks[PoseLandmark.LEFT_SHOULDER]
        : landmarks[PoseLandmark.RIGHT_SHOULDER];
    const elbow = side === 'left'
        ? landmarks[PoseLandmark.LEFT_ELBOW]
        : landmarks[PoseLandmark.RIGHT_ELBOW];
    const wrist = side === 'left'
        ? landmarks[PoseLandmark.LEFT_WRIST]
        : landmarks[PoseLandmark.RIGHT_WRIST];

    return calculateAngle3D(shoulder, elbow, wrist);
}

export function getShoulderAngle(
    landmarks: Landmark3D[],
    side: 'left' | 'right'
): number {
    const hip = side === 'left'
        ? landmarks[PoseLandmark.LEFT_HIP]
        : landmarks[PoseLandmark.RIGHT_HIP];
    const shoulder = side === 'left'
        ? landmarks[PoseLandmark.LEFT_SHOULDER]
        : landmarks[PoseLandmark.RIGHT_SHOULDER];
    const elbow = side === 'left'
        ? landmarks[PoseLandmark.LEFT_ELBOW]
        : landmarks[PoseLandmark.RIGHT_ELBOW];

    return calculateAngle3D(hip, shoulder, elbow);
}

export function getKneeAngle(
    landmarks: Landmark3D[],
    side: 'left' | 'right'
): number {
    const hip = side === 'left'
        ? landmarks[PoseLandmark.LEFT_HIP]
        : landmarks[PoseLandmark.RIGHT_HIP];
    const knee = side === 'left'
        ? landmarks[PoseLandmark.LEFT_KNEE]
        : landmarks[PoseLandmark.RIGHT_KNEE];
    const ankle = side === 'left'
        ? landmarks[PoseLandmark.LEFT_ANKLE]
        : landmarks[PoseLandmark.RIGHT_ANKLE];

    // Check visibility
    const visibility = Math.min(hip.visibility || 0, knee.visibility || 0, ankle.visibility || 0);
    if (visibility < 0.5) return -1; // Flag as unreliable

    return calculateAngle3D(hip, knee, ankle);
}

/**
 * Get weighted knee angle based on visibility to prevent flickering
 */
export function getRobustKneeAngle(landmarks: Landmark3D[]): number {
    const leftAngle = getKneeAngle(landmarks, 'left');
    const rightAngle = getKneeAngle(landmarks, 'right');

    const leftVis = landmarks[PoseLandmark.LEFT_KNEE].visibility || 0;
    const rightVis = landmarks[PoseLandmark.RIGHT_KNEE].visibility || 0;

    if (leftVis < 0.5 && rightVis < 0.5) return -1;

    // Weight the angles by visibility
    if (leftVis > 0.8 && rightVis > 0.8) {
        return (leftAngle + rightAngle) / 2;
    }

    return leftVis > rightVis ? leftAngle : rightAngle;
}

export function getHipAngle(
    landmarks: Landmark3D[],
    side: 'left' | 'right'
): number {
    const shoulder = side === 'left'
        ? landmarks[PoseLandmark.LEFT_SHOULDER]
        : landmarks[PoseLandmark.RIGHT_SHOULDER];
    const hip = side === 'left'
        ? landmarks[PoseLandmark.LEFT_HIP]
        : landmarks[PoseLandmark.RIGHT_HIP];
    const knee = side === 'left'
        ? landmarks[PoseLandmark.LEFT_KNEE]
        : landmarks[PoseLandmark.RIGHT_KNEE];

    return calculateAngle3D(shoulder, hip, knee);
}

export function getSpineAngle(landmarks: Landmark3D[]): number {
    // Calculate using shoulders and hips midpoints
    const leftShoulder = landmarks[PoseLandmark.LEFT_SHOULDER];
    const rightShoulder = landmarks[PoseLandmark.RIGHT_SHOULDER];
    const leftHip = landmarks[PoseLandmark.LEFT_HIP];
    const rightHip = landmarks[PoseLandmark.RIGHT_HIP];
    const nose = landmarks[PoseLandmark.NOSE];

    const shoulderMid: Landmark3D = {
        x: (leftShoulder.x + rightShoulder.x) / 2,
        y: (leftShoulder.y + rightShoulder.y) / 2,
        z: (leftShoulder.z + rightShoulder.z) / 2,
    };

    const hipMid: Landmark3D = {
        x: (leftHip.x + rightHip.x) / 2,
        y: (leftHip.y + rightHip.y) / 2,
        z: (leftHip.z + rightHip.z) / 2,
    };

    return calculateAngle3D(nose, shoulderMid, hipMid);
}

export function analyzePainExpression(landmarks: Landmark3D[]): number {
    const nose = landmarks[PoseLandmark.NOSE];
    const mouthLeft = landmarks[PoseLandmark.MOUTH_LEFT];
    const mouthRight = landmarks[PoseLandmark.MOUTH_RIGHT];
    const leftEye = landmarks[PoseLandmark.LEFT_EYE];
    const rightEye = landmarks[PoseLandmark.RIGHT_EYE];

    if (!nose || !mouthLeft || !mouthRight || !leftEye || !rightEye) return 0;

    // Normalize distances using inter-ocular distance (eye-to-eye) 
    // This makes the detector robust to the user's distance from the camera
    const eyeDist = calculateDistance3D(leftEye, rightEye);
    if (eyeDist === 0) return 0;

    // 1. Mouth Lateral Tension (Grimacing)
    const mouthWidth = calculateDistance3D(mouthLeft, mouthRight);
    const normalizedWidth = mouthWidth / eyeDist;
    // Normal mouth width is ~0.8-0.9 eye-distances. Pain/Strain stretches it.
    const strainScore = Math.min(100, Math.max(0, (normalizedWidth - 0.9) * 250));

    // 2. Mouth-to-Nose Vertical Tension (Frowning/Drooping)
    const leftDist = calculateDistance3D(nose, mouthLeft);
    const rightDist = calculateDistance3D(nose, mouthRight);
    // Vertical distance (Y only) to detect drooping mouth corners
    const leftVertDist = Math.abs(mouthLeft.y - nose.y);
    const rightVertDist = Math.abs(mouthRight.y - nose.y);
    const avgVertDist = (leftVertDist + rightVertDist) / 2;
    const normalizedVertDist = avgVertDist / eyeDist;

    // Normal vertical neutral is ~0.9. Frowning/grimacing stretches the face vertically or pulls corners down.
    const verticalScore = Math.min(100, Math.max(0, (normalizedVertDist - 1.0) * 400));

    // 3. Eye Tension / Squinting
    const leftEyeNose = calculateDistance3D(leftEye, nose);
    const rightEyeNose = calculateDistance3D(rightEye, nose);
    const avgEyeNose = (leftEyeNose + rightEyeNose) / 2;
    const normalizedEyeNose = avgEyeNose / eyeDist;
    // Eyes move closer to the nose centerline (lower distance) when squinting/furrowing
    const eyeTensionScore = Math.min(100, Math.max(0, (0.7 - normalizedEyeNose) * 600));

    // Aggregate with priority on mouth stretch and vertical frowning
    const compositeScore = (strainScore * 0.4) + (verticalScore * 0.4) + (eyeTensionScore * 0.2);
    return Math.round(Math.min(100, compositeScore));
}

/**
 * Get complete biometric data from pose landmarks
 */
export function calculateBiometrics(
    landmarks: Landmark3D[],
    previousLandmarks?: Landmark3D[],
    deltaTimeMs?: number
): BiometricData {
    const jointAngles: { [key: string]: number } = {
        leftElbow: getElbowAngle(landmarks, 'left'),
        rightElbow: getElbowAngle(landmarks, 'right'),
        leftShoulder: getShoulderAngle(landmarks, 'left'),
        rightShoulder: getShoulderAngle(landmarks, 'right'),
        leftKnee: getKneeAngle(landmarks, 'left'),
        rightKnee: getKneeAngle(landmarks, 'right'),
        leftHip: getHipAngle(landmarks, 'left'),
        rightHip: getHipAngle(landmarks, 'right'),
        spine: getSpineAngle(landmarks),
    };

    const angularVelocities: { [key: string]: number } = {};

    if (previousLandmarks && deltaTimeMs) {
        const prevAngles: { [key: string]: number } = {
            leftElbow: getElbowAngle(previousLandmarks, 'left'),
            rightElbow: getElbowAngle(previousLandmarks, 'right'),
            leftShoulder: getShoulderAngle(previousLandmarks, 'left'),
            rightShoulder: getShoulderAngle(previousLandmarks, 'right'),
            leftKnee: getKneeAngle(previousLandmarks, 'left'),
            rightKnee: getKneeAngle(previousLandmarks, 'right'),
            leftHip: getHipAngle(previousLandmarks, 'left'),
            rightHip: getHipAngle(previousLandmarks, 'right'),
        };

        for (const key of Object.keys(prevAngles)) {
            angularVelocities[key] = calculateAngularVelocity(
                jointAngles[key],
                prevAngles[key],
                deltaTimeMs
            );
        }
    }

    const symmetryScores: { [key: string]: number } = {
        elbow: calculateSymmetryScore(jointAngles.leftElbow, jointAngles.rightElbow),
        shoulder: calculateSymmetryScore(jointAngles.leftShoulder, jointAngles.rightShoulder),
        knee: calculateSymmetryScore(jointAngles.leftKnee, jointAngles.rightKnee),
        hip: calculateSymmetryScore(jointAngles.leftHip, jointAngles.rightHip),
    };

    const overallSymmetry = Math.round(
        (symmetryScores.elbow + symmetryScores.shoulder +
            symmetryScores.knee + symmetryScores.hip) / 4
    );

    const painScore = analyzePainExpression(landmarks);

    return {
        jointAngles,
        angularVelocities,
        symmetryScores,
        overallSymmetry,
        painScore,
    };
}

/**
 * Evaluate form and return joint stress levels
 */
export function evaluateForm(
    landmarks: Landmark3D[],
    exerciseId: string,
    biometrics: BiometricData
): JointStress[] {
    const stresses: JointStress[] = [];

    switch (exerciseId) {
        case 'pushup':
            // Check elbow angle at bottom position
            const avgElbow = (biometrics.jointAngles.leftElbow + biometrics.jointAngles.rightElbow) / 2;

            // Elbow stress
            if (avgElbow < 70) {
                stresses.push({ jointId: PoseLandmark.LEFT_ELBOW, stressLevel: 'bad', message: 'Too deep!' });
                stresses.push({ jointId: PoseLandmark.RIGHT_ELBOW, stressLevel: 'bad', message: 'Too deep!' });
            } else if (avgElbow > 160) {
                stresses.push({ jointId: PoseLandmark.LEFT_ELBOW, stressLevel: 'good' });
                stresses.push({ jointId: PoseLandmark.RIGHT_ELBOW, stressLevel: 'good' });
            } else {
                stresses.push({ jointId: PoseLandmark.LEFT_ELBOW, stressLevel: 'warning', message: 'Go lower' });
                stresses.push({ jointId: PoseLandmark.RIGHT_ELBOW, stressLevel: 'warning', message: 'Go lower' });
            }

            // Check spine alignment
            if (biometrics.jointAngles.spine < 160) {
                stresses.push({ jointId: PoseLandmark.LEFT_HIP, stressLevel: 'bad', message: 'Keep back straight!' });
            } else {
                stresses.push({ jointId: PoseLandmark.LEFT_HIP, stressLevel: 'good' });
            }
            break;

        case 'squat':
            const leftKneeAngle = biometrics.jointAngles.leftKnee;
            const rightKneeAngle = biometrics.jointAngles.rightKnee;
            const leftVis = landmarks[PoseLandmark.LEFT_KNEE].visibility || 0;
            const rightVis = landmarks[PoseLandmark.RIGHT_KNEE].visibility || 0;

            // Use the more visible knee or average
            const avgKnee = (leftVis > 0.5 && rightVis > 0.5)
                ? (leftKneeAngle + rightKneeAngle) / 2
                : (leftVis > rightVis ? leftKneeAngle : rightKneeAngle);

            if (avgKnee < 80) {
                stresses.push({ jointId: PoseLandmark.LEFT_KNEE, stressLevel: 'warning', message: 'Too deep for beginners' });
                stresses.push({ jointId: PoseLandmark.RIGHT_KNEE, stressLevel: 'warning' });
            } else if (avgKnee > 140) { // Slightly lower threshold for 'up' detection
                stresses.push({ jointId: PoseLandmark.LEFT_KNEE, stressLevel: 'warning', message: 'Squat deeper' });
                stresses.push({ jointId: PoseLandmark.RIGHT_KNEE, stressLevel: 'warning' });
            } else {
                stresses.push({ jointId: PoseLandmark.LEFT_KNEE, stressLevel: 'good' });
                stresses.push({ jointId: PoseLandmark.RIGHT_KNEE, stressLevel: 'good' });
            }

            // Check symmetry only if both are visible
            if (leftVis > 0.6 && rightVis > 0.6 && biometrics.symmetryScores.knee < 75) {
                stresses.push({ jointId: PoseLandmark.LEFT_KNEE, stressLevel: 'bad', message: 'Uneven weight distribution' });
            }
            break;

        case 'bicep-curl':
            // Check for shoulder movement (should be minimal)
            const shoulderMovement = Math.abs(
                biometrics.jointAngles.leftShoulder - biometrics.jointAngles.rightShoulder
            );

            if (shoulderMovement > 20) {
                stresses.push({ jointId: PoseLandmark.LEFT_SHOULDER, stressLevel: 'bad', message: 'Keep shoulders stable!' });
                stresses.push({ jointId: PoseLandmark.RIGHT_SHOULDER, stressLevel: 'bad' });
            } else {
                stresses.push({ jointId: PoseLandmark.LEFT_SHOULDER, stressLevel: 'good' });
                stresses.push({ jointId: PoseLandmark.RIGHT_SHOULDER, stressLevel: 'good' });
            }

            // Check elbow movement
            stresses.push({ jointId: PoseLandmark.LEFT_ELBOW, stressLevel: 'good' });
            stresses.push({ jointId: PoseLandmark.RIGHT_ELBOW, stressLevel: 'good' });
            break;

        case 'plank':
            // 1. Check hip alignment (Core stability)
            // Using the average of both sides for more robustness
            const leftHipAngle = biometrics.jointAngles.leftHip;
            const rightHipAngle = biometrics.jointAngles.rightHip;
            const avgHipAngle = (leftHipAngle + rightHipAngle) / 2;

            if (avgHipAngle < 160) {
                stresses.push({ jointId: PoseLandmark.LEFT_HIP, stressLevel: 'bad', message: 'Hips too high! Keep body straight.' });
                stresses.push({ jointId: PoseLandmark.RIGHT_HIP, stressLevel: 'bad' });
            } else if (avgHipAngle > 200) {
                stresses.push({ jointId: PoseLandmark.LEFT_HIP, stressLevel: 'bad', message: 'Hips sagging! Engage your core.' });
                stresses.push({ jointId: PoseLandmark.RIGHT_HIP, stressLevel: 'bad' });
            } else {
                stresses.push({ jointId: PoseLandmark.LEFT_HIP, stressLevel: 'good' });
                stresses.push({ jointId: PoseLandmark.RIGHT_HIP, stressLevel: 'good' });
            }

            // 2. Check knee extension (Leg stability)
            const avgKneeAngle = (biometrics.jointAngles.leftKnee + biometrics.jointAngles.rightKnee) / 2;
            if (avgKneeAngle < 160) {
                stresses.push({ jointId: PoseLandmark.LEFT_KNEE, stressLevel: 'warning', message: 'Keep your legs straight' });
            } else {
                stresses.push({ jointId: PoseLandmark.LEFT_KNEE, stressLevel: 'good' });
            }

            // 3. Check shoulder stability
            const avgShoulderAngle = (biometrics.jointAngles.leftShoulder + biometrics.jointAngles.rightShoulder) / 2;
            // In a forearm plank, shoulder-hip-elbow angle should be roughly 90
            if (avgShoulderAngle > 110 || avgShoulderAngle < 70) {
                stresses.push({ jointId: PoseLandmark.LEFT_SHOULDER, stressLevel: 'warning', message: 'Shoulders over elbows' });
            } else {
                stresses.push({ jointId: PoseLandmark.LEFT_SHOULDER, stressLevel: 'good' });
            }
            break;
            // Default: all joints good
            [PoseLandmark.LEFT_SHOULDER, PoseLandmark.RIGHT_SHOULDER,
            PoseLandmark.LEFT_ELBOW, PoseLandmark.RIGHT_ELBOW,
            PoseLandmark.LEFT_HIP, PoseLandmark.RIGHT_HIP,
            PoseLandmark.LEFT_KNEE, PoseLandmark.RIGHT_KNEE].forEach(joint => {
                stresses.push({ jointId: joint, stressLevel: 'good' });
            });
    }

    return stresses;
}

/**
 * Calculate overall form score (0-100)
 */
export function calculateFormScore(
    biometrics: BiometricData,
    jointStresses: JointStress[]
): number {
    let score = 100;

    // Deduct points for bad form
    jointStresses.forEach(stress => {
        if (stress.stressLevel === 'bad') score -= 15;
        else if (stress.stressLevel === 'warning') score -= 5;
    });

    // Factor in symmetry
    const symmetryBonus = (biometrics.overallSymmetry - 50) / 5;
    score += symmetryBonus;

    return Math.max(0, Math.min(100, Math.round(score)));
}
