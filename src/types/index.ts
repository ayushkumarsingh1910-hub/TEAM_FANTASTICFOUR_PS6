// Type definitions for the Privacy-First AI Rehab Assistant

// MediaPipe Pose landmark indices
export enum PoseLandmark {
  NOSE = 0,
  LEFT_EYE_INNER = 1,
  LEFT_EYE = 2,
  LEFT_EYE_OUTER = 3,
  RIGHT_EYE_INNER = 4,
  RIGHT_EYE = 5,
  RIGHT_EYE_OUTER = 6,
  LEFT_EAR = 7,
  RIGHT_EAR = 8,
  MOUTH_LEFT = 9,
  MOUTH_RIGHT = 10,
  LEFT_SHOULDER = 11,
  RIGHT_SHOULDER = 12,
  LEFT_ELBOW = 13,
  RIGHT_ELBOW = 14,
  LEFT_WRIST = 15,
  RIGHT_WRIST = 16,
  LEFT_PINKY = 17,
  RIGHT_PINKY = 18,
  LEFT_INDEX = 19,
  RIGHT_INDEX = 20,
  LEFT_THUMB = 21,
  RIGHT_THUMB = 22,
  LEFT_HIP = 23,
  RIGHT_HIP = 24,
  LEFT_KNEE = 25,
  RIGHT_KNEE = 26,
  LEFT_ANKLE = 27,
  RIGHT_ANKLE = 28,
  LEFT_HEEL = 29,
  RIGHT_HEEL = 30,
  LEFT_FOOT_INDEX = 31,
  RIGHT_FOOT_INDEX = 32,
}

// 3D Landmark position
export interface Landmark3D {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

// Complete pose data
export interface PoseData {
  landmarks: Landmark3D[];
  timestamp: number;
}

// Exercise phase states
export type ExercisePhase = 'IDLE' | 'DOWN' | 'UP' | 'HOLD' | 'COMPLETE';

// Exercise definition
export interface ExerciseDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'upper' | 'lower' | 'core' | 'full-body';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  primaryMuscles: string[];
  keyLandmarks: PoseLandmark[];
  downAngleThreshold: number;
  upAngleThreshold: number;
  formCriteria: FormCriterion[];
  instructions: string[];
  benefits: string[];
}

// Form validation criterion
export interface FormCriterion {
  id: string;
  name: string;
  description: string;
  checkFunction: string; // Name of the validation function
  weight: number; // Importance weight 0-1
}

// Joint stress levels for avatar visualization
export interface JointStress {
  jointId: PoseLandmark;
  stressLevel: 'good' | 'warning' | 'bad';
  message?: string;
}

// Real-time exercise state
export interface ExerciseState {
  exerciseId: string;
  phase: ExercisePhase;
  repCount: number;
  currentAngle: number;
  formScore: number;
  jointStress: JointStress[];
  startTime: number;
  lastRepTime?: number;
  angularVelocity: number;
  symmetryScore: number;
  holdStartTime?: number;
  isHolding?: boolean;
  painScore: number; // 0-100 (backwards compatibility)
  painAnalysis: PainAnalysis;
  safetyLog: SafetyLog;
  isCalibrating: boolean;
  calibrationProgress: number; // 0-100
}

// Session data for persistence
export interface WorkoutSession {
  id?: number;
  date: Date;
  exerciseId: string;
  reps: number;
  formScore: number;
  duration: number; // seconds
  calories?: number;
  feedback?: string[];
}

// Daily statistics
export interface DailyStats {
  date: string; // YYYY-MM-DD format
  totalReps: number;
  avgFormScore: number;
  exerciseCount: number;
  totalDuration: number; // seconds
  exercises: { [exerciseId: string]: number }; // exerciseId -> rep count
}

// Streak data
export interface StreakData {
  id?: number;
  lastActiveDate: string;
  currentStreak: number;
  longestStreak: number;
}

// Gold standard pose sequence for DTW
export interface GoldStandardFrame {
  landmarks: Landmark3D[];
  phase: ExercisePhase;
  timestamp: number;
}

export interface GoldStandardSequence {
  exerciseId: string;
  frames: GoldStandardFrame[];
  duration: number;
}

// DTW comparison result
export interface DTWResult {
  distance: number;
  normalizedDistance: number;
  alignmentPath: [number, number][];
  qualityScore: number; // 0-100
}

// Clinical Pain Analysis (FACS-based)
export interface PainAnalysis {
  pain_detected: boolean;
  confidence_score: number;
  primary_action_units: string[];
  intensity_level: 'Low' | 'Moderate' | 'High' | 'Critical';
  recommended_action: 'Continue' | 'Warning: Reduce Weight' | 'STOP_EXERCISE';
  pain_score_raw: number; // 0-10 scale
}

// Beginner-friendly Safety Log (RCAFT)
export interface SafetyLog {
  status: 'Scanning' | 'Effort Detected' | 'PAIN ALERT' | 'Calibrating';
  pain_level: number; // 1-100
  ui_message: string;
  system_command: null | 'HALT_WORKOUT';
}

// Biometric calculations
export interface BiometricData {
  jointAngles: { [key: string]: number };
  angularVelocities: { [key: string]: number };
  symmetryScores: { [key: string]: number };
  overallSymmetry: number;
  painScore: number; // 0-100 (backwards compatibility)
  painAnalysis: PainAnalysis;
  safetyLog: SafetyLog;
}

// Weekly/Monthly report data
export interface ReportData {
  period: 'week' | 'month';
  startDate: string;
  endDate: string;
  totalWorkouts: number;
  totalReps: number;
  totalDuration: number;
  avgFormScore: number;
  exerciseBreakdown: { exerciseId: string; reps: number; avgScore: number }[];
  streakDays: number;
  improvement: number; // percentage improvement from previous period
  dailyData: DailyStats[];
}
