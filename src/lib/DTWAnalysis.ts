// Dynamic Time Warping analysis for comparing user movement to gold standard
import { Landmark3D, GoldStandardSequence, DTWResult } from '@/types';

/**
 * Calculate Euclidean distance between two pose frames
 */
function poseDistance(frame1: Landmark3D[], frame2: Landmark3D[]): number {
    if (frame1.length !== frame2.length) return Infinity;

    let totalDistance = 0;
    for (let i = 0; i < frame1.length; i++) {
        const dx = frame1[i].x - frame2[i].x;
        const dy = frame1[i].y - frame2[i].y;
        const dz = frame1[i].z - frame2[i].z;
        totalDistance += Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    return totalDistance / frame1.length;
}

/**
 * Dynamic Time Warping algorithm for comparing pose sequences
 * @param userSequence - Array of user pose frames
 * @param goldSequence - Gold standard sequence to compare against
 * @returns DTW result with distance, alignment path, and quality score
 */
export function computeDTW(
    userSequence: Landmark3D[][],
    goldSequence: GoldStandardSequence
): DTWResult {
    const n = userSequence.length;
    const m = goldSequence.frames.length;

    if (n === 0 || m === 0) {
        return {
            distance: Infinity,
            normalizedDistance: Infinity,
            alignmentPath: [],
            qualityScore: 0,
        };
    }

    // Initialize DTW matrix with infinity
    const dtw: number[][] = Array(n + 1)
        .fill(null)
        .map(() => Array(m + 1).fill(Infinity));

    dtw[0][0] = 0;

    // Fill DTW matrix
    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            const cost = poseDistance(
                userSequence[i - 1],
                goldSequence.frames[j - 1].landmarks
            );

            dtw[i][j] = cost + Math.min(
                dtw[i - 1][j],     // Insertion
                dtw[i][j - 1],     // Deletion
                dtw[i - 1][j - 1]  // Match
            );
        }
    }

    // Backtrack to find alignment path
    const path: [number, number][] = [];
    let i = n, j = m;

    while (i > 0 && j > 0) {
        path.unshift([i - 1, j - 1]);

        const diag = dtw[i - 1][j - 1];
        const left = dtw[i][j - 1];
        const up = dtw[i - 1][j];

        if (diag <= left && diag <= up) {
            i--;
            j--;
        } else if (left <= up) {
            j--;
        } else {
            i--;
        }
    }

    const distance = dtw[n][m];
    const normalizedDistance = distance / Math.max(n, m);

    // Calculate quality score (0-100)
    // Lower distance = higher quality
    // Typical good performance: normalized distance < 0.1
    const qualityScore = Math.max(0, Math.min(100,
        Math.round(100 * Math.exp(-normalizedDistance * 5))
    ));

    return {
        distance,
        normalizedDistance,
        alignmentPath: path,
        qualityScore,
    };
}

/**
 * Real-time DTW for streaming pose data
 * Uses a sliding window approach for efficiency
 */
export class StreamingDTW {
    private goldSequence: GoldStandardSequence;
    private userBuffer: Landmark3D[][] = [];
    private windowSize: number;
    private lastResult: DTWResult | null = null;

    constructor(goldSequence: GoldStandardSequence, windowSize: number = 30) {
        this.goldSequence = goldSequence;
        this.windowSize = windowSize;
    }

    /**
     * Add a new frame and compute DTW if buffer is sufficient
     */
    addFrame(landmarks: Landmark3D[]): DTWResult | null {
        this.userBuffer.push(landmarks);

        // Keep buffer at window size
        if (this.userBuffer.length > this.windowSize * 2) {
            this.userBuffer = this.userBuffer.slice(-this.windowSize);
        }

        // Only compute if we have enough frames
        if (this.userBuffer.length >= this.windowSize / 2) {
            this.lastResult = computeDTW(this.userBuffer, this.goldSequence);
            return this.lastResult;
        }

        return this.lastResult;
    }

    /**
     * Reset the streaming buffer
     */
    reset(): void {
        this.userBuffer = [];
        this.lastResult = null;
    }

    /**
     * Get the current quality score
     */
    getCurrentScore(): number {
        return this.lastResult?.qualityScore ?? 0;
    }
}

/**
 * Placeholder gold standard sequences for exercises
 * In production, these would be recorded from expert demonstrations
 */
export const goldStandards: { [exerciseId: string]: GoldStandardSequence } = {
    pushup: {
        exerciseId: 'pushup',
        duration: 2000, // 2 seconds per rep
        frames: [
            // Top position (extended arms)
            {
                landmarks: generatePlaceholderLandmarks(0),
                phase: 'UP',
                timestamp: 0,
            },
            // Mid descent
            {
                landmarks: generatePlaceholderLandmarks(500),
                phase: 'DOWN',
                timestamp: 500,
            },
            // Bottom position
            {
                landmarks: generatePlaceholderLandmarks(1000),
                phase: 'DOWN',
                timestamp: 1000,
            },
            // Mid ascent
            {
                landmarks: generatePlaceholderLandmarks(1500),
                phase: 'UP',
                timestamp: 1500,
            },
            // Top position
            {
                landmarks: generatePlaceholderLandmarks(2000),
                phase: 'COMPLETE',
                timestamp: 2000,
            },
        ],
    },
    squat: {
        exerciseId: 'squat',
        duration: 3000,
        frames: [
            {
                landmarks: generatePlaceholderLandmarks(0),
                phase: 'UP',
                timestamp: 0,
            },
            {
                landmarks: generatePlaceholderLandmarks(750),
                phase: 'DOWN',
                timestamp: 750,
            },
            {
                landmarks: generatePlaceholderLandmarks(1500),
                phase: 'HOLD',
                timestamp: 1500,
            },
            {
                landmarks: generatePlaceholderLandmarks(2250),
                phase: 'UP',
                timestamp: 2250,
            },
            {
                landmarks: generatePlaceholderLandmarks(3000),
                phase: 'COMPLETE',
                timestamp: 3000,
            },
        ],
    },
};

/**
 * Generate placeholder landmarks for gold standard
 * In production, replace with actual recorded landmarks
 */
function generatePlaceholderLandmarks(timestamp: number): Landmark3D[] {
    const landmarks: Landmark3D[] = [];
    for (let i = 0; i < 33; i++) {
        landmarks.push({
            x: 0.5 + Math.sin(timestamp / 1000) * 0.1,
            y: 0.5 + Math.cos(timestamp / 1000) * 0.1,
            z: 0,
            visibility: 1,
        });
    }
    return landmarks;
}
