'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { exercises } from '@/data/exercises';
import { ExerciseEngine } from '@/lib/ExerciseEngine';
import { saveWorkoutSession } from '@/lib/db';
import { PoseData, ExerciseState, JointStress, Landmark3D } from '@/types';
import FeedbackPanel from '@/components/FeedbackPanel';
import ExerciseGuide from '@/components/ExerciseGuide';
import RecommendationSection from '@/components/RecommendationSection';
import { voiceAssistant } from '@/lib/VoiceAssistant';
import type { WebcamCanvasProps } from '@/components/WebcamCanvas';
import type { Avatar3DProps } from '@/components/Avatar3D';

// Dynamic imports for heavy components
const WebcamCanvas = dynamic<WebcamCanvasProps>(() => import('@/components/WebcamCanvas'), {
    ssr: false,
    loading: () => (
        <div className="w-full aspect-video bg-slate-900 rounded-2xl flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
        </div>
    )
});

const Avatar3D = dynamic<Avatar3DProps>(() => import('@/components/Avatar3D'), {
    ssr: false,
    loading: () => (
        <div className="w-full aspect-square bg-slate-900 rounded-2xl flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
    )
});

export default function ExercisePage() {
    const params = useParams();
    const router = useRouter();
    const exerciseId = params?.id as string;

    const exercise = exercises.find(e => e.id === exerciseId);
    const engineRef = useRef<ExerciseEngine | null>(null);
    const startTimeRef = useRef<number>(Date.now());

    const [isActive, setIsActive] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [currentLandmarks, setCurrentLandmarks] = useState<Landmark3D[] | null>(null);
    const [exerciseState, setExerciseState] = useState<ExerciseState>({
        exerciseId: exerciseId || '',
        phase: 'IDLE',
        repCount: 0,
        currentAngle: 0,
        formScore: 100,
        jointStress: [],
        startTime: Date.now(),
        angularVelocity: 0,
        symmetryScore: 100,
        painScore: 0,
    });
    const [elapsedTime, setElapsedTime] = useState(0);
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
    const [showCompletionModal, setShowCompletionModal] = useState(false);

    // Voice feedback hooks
    useEffect(() => {
        voiceAssistant.setEnabled(isVoiceEnabled);
    }, [isVoiceEnabled]);

    useEffect(() => {
        if (isActive && exerciseState.repCount > 0) {
            voiceAssistant.countRep(exerciseState.repCount);
        }
    }, [exerciseState.repCount, isActive]);

    useEffect(() => {
        if (isActive && !isPaused && exerciseState.painScore > 60) {
            voiceAssistant.warnPain(exerciseState.painScore);
        }
    }, [exerciseState.painScore, isActive, isPaused]);

    useEffect(() => {
        if (isActive && !isPaused) {
            voiceAssistant.giveMotivationalFeedback(exerciseState.formScore);
        }
    }, [exerciseState.formScore, isActive, isPaused]);

    // Initialize engine
    useEffect(() => {
        if (exerciseId) {
            engineRef.current = new ExerciseEngine(exerciseId);
        }
        return () => {
            engineRef.current = null;
        };
    }, [exerciseId]);

    // Timer
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isActive && !isPaused) {
            interval = setInterval(() => {
                setElapsedTime((Date.now() - startTimeRef.current) / 1000);
            }, 100);
        }
        return () => clearInterval(interval);
    }, [isActive, isPaused]);

    // Handle pose detection
    const handlePoseDetected = useCallback((pose: PoseData | null) => {
        if (!pose || !engineRef.current || isPaused) {
            setCurrentLandmarks(null);
            return;
        }

        setCurrentLandmarks(pose.landmarks);

        if (isActive) {
            const state = engineRef.current.processFrame(pose.landmarks, pose.timestamp);
            setExerciseState(state);
        }
    }, [isActive, isPaused]);

    // Start exercise
    const handleStart = () => {
        startTimeRef.current = Date.now();
        setIsActive(true);
        setIsPaused(false);
        setElapsedTime(0);
        engineRef.current?.reset();
    };

    // Pause/Resume
    const handlePauseResume = () => {
        setIsPaused(!isPaused);
    };

    // Finish exercise
    const handleFinish = async () => {
        setIsActive(false);
        setIsPaused(false);

        if (exerciseState.repCount > 0) {
            voiceAssistant.onComplete();
            await saveWorkoutSession({
                date: new Date(),
                exerciseId: exerciseId,
                reps: exerciseState.repCount,
                formScore: exerciseState.formScore,
                duration: Math.floor(elapsedTime),
            });
            setShowCompletionModal(true);
        }
    };

    // Handle completion modal close
    const handleCloseModal = () => {
        setShowCompletionModal(false);
        router.push('/');
    };

    if (!exercise) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-2xl text-white mb-4">Exercise not found</p>
                    <Link href="/" className="btn-primary">
                        Back to Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-slate-950">
            {/* Header */}
            <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/"
                                className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors"
                            >
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                                    <span>{exercise.icon}</span>
                                    {exercise.name}
                                </h1>
                                <p className="text-sm text-slate-400">{exercise.category}</p>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isVoiceEnabled ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-500'
                                    }`}
                                title={isVoiceEnabled ? 'Disable Voice' : 'Enable Voice'}
                            >
                                {isVoiceEnabled ? '🔊' : '🔇'}
                            </button>
                            {!isActive ? (
                                <button
                                    onClick={handleStart}
                                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold hover:shadow-lg hover:shadow-cyan-500/30 transition-all flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                    </svg>
                                    Start
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={handlePauseResume}
                                        className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors flex items-center gap-2"
                                    >
                                        {isPaused ? (
                                            <>
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                                </svg>
                                                Resume
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                                Pause
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={handleFinish}
                                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold hover:shadow-lg hover:shadow-green-500/30 transition-all flex items-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        Finish
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main content */}
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="grid lg:grid-cols-4 gap-6">
                    {/* Column 1 & 2: Main Camera View */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Webcam */}
                        <div className="relative">
                            <WebcamCanvas
                                onPoseDetected={handlePoseDetected}
                                showLandmarks={true}
                                width={800}
                                height={600}
                            />

                            {/* Overlay status */}
                            {!isActive && (
                                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center rounded-2xl">
                                    <div className="text-center">
                                        <div className="text-6xl mb-4">{exercise.icon}</div>
                                        <h2 className="text-2xl font-bold text-white mb-2">Ready to start?</h2>
                                        <p className="text-slate-400 mb-6">Position yourself in frame and click Start</p>
                                        <button
                                            onClick={handleStart}
                                            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-lg font-semibold hover:shadow-xl hover:shadow-cyan-500/30 transition-all animate-pulse"
                                        >
                                            Start Exercise
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Paused overlay */}
                            {isPaused && (
                                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center rounded-2xl">
                                    <div className="text-center">
                                        <div className="text-6xl mb-4">⏸️</div>
                                        <h2 className="text-2xl font-bold text-white mb-2">Paused</h2>
                                        <button
                                            onClick={handlePauseResume}
                                            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-lg font-semibold"
                                        >
                                            Resume
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Column 3: Real-time Exercise Guide + Miniature Avatar */}
                    <div className="lg:col-span-1">
                        <ExerciseGuide exercise={exercise}>
                            <Avatar3D
                                landmarks={currentLandmarks}
                                jointStresses={exerciseState.jointStress}
                                width={300}
                                height={300}
                            />
                        </ExerciseGuide>
                    </div>

                    {/* Column 4: Feedback Panel */}
                    <div className="lg:col-span-1">
                        <FeedbackPanel
                            exerciseState={exerciseState}
                            exercise={exercise}
                            elapsedTime={elapsedTime}
                        />
                    </div>
                </div>
            </div>

            {/* Completion Modal */}
            {showCompletionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="glass rounded-3xl p-8 max-w-md w-full mx-4 text-center animate-float">
                        <div className="text-7xl mb-6 animate-bounce-slow">🎉</div>
                        <h2 className="text-3xl font-bold text-white mb-2">Great Workout!</h2>
                        <p className="text-slate-400 mb-8">You crushed {exercise.name}</p>

                        <div className="grid grid-cols-3 gap-4 mb-8">
                            <div className="bg-slate-800/50 rounded-xl p-4">
                                <p className="text-3xl font-bold text-cyan-400">
                                    {exerciseState.repCount}{exercise.id === 'plank' ? 's' : ''}
                                </p>
                                <p className="text-xs text-slate-400">{exercise.id === 'plank' ? 'Hold Time' : 'Reps'}</p>
                            </div>
                            <div className="bg-slate-800/50 rounded-xl p-4">
                                <p className="text-3xl font-bold text-purple-400">{exerciseState.formScore}%</p>
                                <p className="text-xs text-slate-400">Form Score</p>
                            </div>
                            <div className="bg-slate-800/50 rounded-xl p-4">
                                <p className="text-3xl font-bold text-pink-400">{Math.floor(elapsedTime / 60)}:{String(Math.floor(elapsedTime % 60)).padStart(2, '0')}</p>
                                <p className="text-xs text-slate-400">Duration</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => {
                                    setShowCompletionModal(false);
                                    handleStart();
                                }}
                                className="flex-1 btn-secondary"
                            >
                                Go Again
                            </button>
                            <button
                                onClick={handleCloseModal}
                                className="flex-1 btn-primary"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
