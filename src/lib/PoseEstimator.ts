// MediaPipe Pose integration for real-time 3D landmark extraction
import { Landmark3D, PoseData } from '@/types';

// MediaPipe Pose configuration
interface PoseConfig {
    modelComplexity: 0 | 1 | 2;
    smoothLandmarks: boolean;
    enableSegmentation: boolean;
    smoothSegmentation: boolean;
    minDetectionConfidence: number;
    minTrackingConfidence: number;
}

const DEFAULT_CONFIG: PoseConfig = {
    modelComplexity: 1, // Balanced for stability and accuracy
    smoothLandmarks: true,
    enableSegmentation: false,
    smoothSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
};

type PoseCallback = (pose: PoseData | null) => void;

/**
 * PoseEstimator - Singleton class for MediaPipe Pose integration
 * Handles initialization, real-time processing, and 3D landmark extraction
 */
class PoseEstimatorClass {
    private pose: any = null;
    private camera: any = null;
    private isInitialized = false;
    private isProcessing = false;
    private callback: PoseCallback | null = null;
    private lastTimestamp = 0;
    private frameCount = 0;
    private fps = 0;
    private fpsInterval: NodeJS.Timeout | null = null;

    /**
     * Initialize MediaPipe Pose model
     */
    async initialize(config: Partial<PoseConfig> = {}): Promise<void> {
        if (this.isInitialized) return;

        const mergedConfig = { ...DEFAULT_CONFIG, ...config };

        try {
            // Dynamic import for MediaPipe
            const { Pose } = await import('@mediapipe/pose');

            this.pose = new Pose({
                locateFile: (file: string) => {
                    return `/models/pose/${file}`;
                },
            });

            this.pose.setOptions({
                modelComplexity: mergedConfig.modelComplexity,
                smoothLandmarks: mergedConfig.smoothLandmarks,
                enableSegmentation: mergedConfig.enableSegmentation,
                smoothSegmentation: mergedConfig.smoothSegmentation,
                minDetectionConfidence: mergedConfig.minDetectionConfidence,
                minTrackingConfidence: mergedConfig.minTrackingConfidence,
            });

            this.pose.onResults(this.handleResults.bind(this));

            await this.pose.initialize();
            this.isInitialized = true;

            // Start FPS counter
            this.startFPSCounter();

            console.log('PoseEstimator initialized successfully');
        } catch (error) {
            console.error('Failed to initialize PoseEstimator:', error);
            throw error;
        }
    }

    /**
     * Start real-time pose estimation from video element
     */
    async startRealtime(
        videoElement: HTMLVideoElement,
        callback: PoseCallback
    ): Promise<void> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        this.callback = callback;
        this.isProcessing = true;

        const processFrame = async () => {
            if (!this.isProcessing || !this.pose) return;

            if (videoElement.readyState >= 2) {
                await this.pose.send({ image: videoElement });
                this.frameCount++;
            }

            requestAnimationFrame(processFrame);
        };

        requestAnimationFrame(processFrame);
    }

    /**
     * Stop real-time processing
     */
    stop(): void {
        this.isProcessing = false;
        this.callback = null;

        if (this.camera) {
            this.camera.stop();
            this.camera = null;
        }

        this.stopFPSCounter();
    }

    /**
     * Process a single frame
     */
    async estimatePose(imageOrVideo: HTMLImageElement | HTMLVideoElement): Promise<PoseData | null> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        return new Promise((resolve) => {
            const originalCallback = this.callback;

            this.callback = (pose) => {
                this.callback = originalCallback;
                resolve(pose);
            };

            this.pose.send({ image: imageOrVideo });
        });
    }

    /**
     * Handle pose detection results
     */
    private handleResults(results: any): void {
        const timestamp = performance.now();

        if (!results.poseLandmarks) {
            this.callback?.(null);
            return;
        }

        // Convert to 3D landmarks with world coordinates
        const landmarks: Landmark3D[] = results.poseLandmarks.map((lm: any, index: number) => {
            // Use world landmarks for 3D coordinates if available
            const worldLm = results.poseWorldLandmarks?.[index];

            return {
                x: lm.x,
                y: lm.y,
                z: worldLm?.z ?? lm.z ?? 0,
                visibility: lm.visibility ?? 1,
            };
        });

        const poseData: PoseData = {
            landmarks,
            timestamp,
        };

        this.lastTimestamp = timestamp;
        this.callback?.(poseData);
    }

    /**
     * Start FPS counter
     */
    private startFPSCounter(): void {
        this.fpsInterval = setInterval(() => {
            this.fps = this.frameCount;
            this.frameCount = 0;
        }, 1000);
    }

    /**
     * Stop FPS counter
     */
    private stopFPSCounter(): void {
        if (this.fpsInterval) {
            clearInterval(this.fpsInterval);
            this.fpsInterval = null;
        }
    }

    /**
     * Get current FPS
     */
    getFPS(): number {
        return this.fps;
    }

    /**
     * Check if initialized
     */
    getIsInitialized(): boolean {
        return this.isInitialized;
    }

    /**
     * Check if processing
     */
    getIsProcessing(): boolean {
        return this.isProcessing;
    }

    /**
     * Get specific landmark
     */
    static getLandmarkName(index: number): string {
        const names = [
            'nose', 'left_eye_inner', 'left_eye', 'left_eye_outer',
            'right_eye_inner', 'right_eye', 'right_eye_outer',
            'left_ear', 'right_ear', 'mouth_left', 'mouth_right',
            'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
            'left_wrist', 'right_wrist', 'left_pinky', 'right_pinky',
            'left_index', 'right_index', 'left_thumb', 'right_thumb',
            'left_hip', 'right_hip', 'left_knee', 'right_knee',
            'left_ankle', 'right_ankle', 'left_heel', 'right_heel',
            'left_foot_index', 'right_foot_index'
        ];
        return names[index] || `landmark_${index}`;
    }
}

// Singleton instance
export const PoseEstimator = new PoseEstimatorClass();

// Also export the class for testing purposes
export { PoseEstimatorClass };
