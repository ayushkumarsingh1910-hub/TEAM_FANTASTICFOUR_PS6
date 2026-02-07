'use client';

import React from 'react';
import { ExerciseState, JointStress, ExerciseDefinition } from '@/types';

interface FeedbackPanelProps {
    exerciseState: ExerciseState;
    exercise: ExerciseDefinition | undefined;
    elapsedTime: number;
}

export default function FeedbackPanel({
    exerciseState,
    exercise,
    elapsedTime,
}: FeedbackPanelProps) {
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getFormColor = (score: number): string => {
        if (score >= 80) return 'text-green-400';
        if (score >= 60) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getFormGradient = (score: number): string => {
        if (score >= 80) return 'from-green-500 to-emerald-500';
        if (score >= 60) return 'from-yellow-500 to-orange-500';
        return 'from-red-500 to-rose-500';
    };

    const getPhaseLabel = (phase: string): string => {
        switch (phase) {
            case 'IDLE': return 'Ready';
            case 'DOWN': return 'Lowering';
            case 'UP': return 'Rising';
            case 'HOLD': return 'Hold';
            case 'COMPLETE': return 'Rep Done!';
            default: return phase;
        }
    };

    const badFormFeedback = exerciseState.jointStress.filter(
        (js) => js.stressLevel === 'bad' && js.message
    );

    const warningFeedback = exerciseState.jointStress.filter(
        (js) => js.stressLevel === 'warning' && js.message
    );

    return (
        <div className="h-full flex flex-col gap-4">
            {/* Main stats */}
            <div className="grid grid-cols-2 gap-4">
                {/* Rep counter */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-6">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full blur-2xl" />
                    <div className="relative">
                        <p className="text-slate-400 text-sm mb-1">{exercise?.id === 'plank' ? 'Hold Time' : 'Reps'}</p>
                        <p className="text-5xl font-black text-white">
                            {exerciseState.repCount}
                            {exercise?.id === 'plank' && <span className="text-2xl ml-1 font-bold text-slate-400">s</span>}
                        </p>
                        <p className="text-cyan-400 text-sm mt-2 font-medium">
                            {getPhaseLabel(exerciseState.phase)}
                        </p>
                    </div>
                </div>

                {/* Timer */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-6">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-2xl" />
                    <div className="relative">
                        <p className="text-slate-400 text-sm mb-1">Time</p>
                        <p className="text-5xl font-black text-white font-mono">{formatTime(elapsedTime)}</p>
                        <p className="text-purple-400 text-sm mt-2 font-medium">Active</p>
                    </div>
                </div>
            </div>

            {/* Form score */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-slate-400 text-sm">Form Score</p>
                        <p className={`text-4xl font-black ${getFormColor(exerciseState.formScore)}`}>
                            {exerciseState.formScore}%
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-slate-400 text-sm">Symmetry</p>
                        <p className="text-2xl font-bold text-cyan-400">{exerciseState.symmetryScore}%</p>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                    <div
                        className={`h-full bg-gradient-to-r ${getFormGradient(exerciseState.formScore)} transition-all duration-300`}
                        style={{ width: `${exerciseState.formScore}%` }}
                    />
                </div>
            </div>

            {/* Joint angle & velocity */}
            <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-slate-800/50 border border-slate-700/30 p-4">
                    <p className="text-slate-400 text-xs mb-1">Joint Angle</p>
                    <div className="flex items-center gap-2">
                        <p className="text-2xl font-bold text-white">{Math.round(exerciseState.currentAngle)}°</p>
                        <div className="flex-1 h-1.5 bg-slate-700 rounded-full">
                            <div
                                className="h-full bg-cyan-500 rounded-full"
                                style={{ width: `${Math.min(100, (exerciseState.currentAngle / 180) * 100)}%` }}
                            />
                        </div>
                    </div>
                </div>
                <div className={`rounded-2xl bg-slate-800/50 border border-slate-700/30 p-4 transition-all duration-500 ${exerciseState.painScore > 60 ? 'shadow-[0_0_20px_rgba(239,68,68,0.2)] border-red-500/50' : ''}`}>
                    <p className="text-slate-400 text-xs mb-1">Pain Detector</p>
                    <div className="flex items-center gap-2">
                        <p className={`text-2xl font-bold transition-colors ${exerciseState.painScore > 60 ? 'text-red-400 animate-pulse' :
                            exerciseState.painScore > 30 ? 'text-yellow-400' : 'text-green-400'}`}>
                            {exerciseState.painScore > 60 ? 'Pain Alert' : exerciseState.painScore > 30 ? 'Strained' : 'Comfort'}
                        </p>
                        <div className="flex-1 h-3 bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-300 ${exerciseState.painScore > 60 ? 'bg-red-500' :
                                    exerciseState.painScore > 30 ? 'bg-yellow-500' : 'bg-green-500'
                                    }`}
                                style={{ width: `${exerciseState.painScore}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Joint Stress Monitoring */}
            <div className="rounded-2xl bg-slate-800/50 border border-slate-700/30 p-4">
                <p className="text-slate-400 text-sm font-medium mb-3">Joint Health Monitor</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {exerciseState.jointStress.map((js, idx) => (
                        <div
                            key={idx}
                            className={`px-3 py-2 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 border ${js.stressLevel === 'bad' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                                js.stressLevel === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' :
                                    'bg-green-500/10 border-green-500/30 text-green-400'
                                }`}
                        >
                            <span>Joint {js.jointId}</span>
                            <div className={`w-2 h-2 rounded-full ${js.stressLevel === 'bad' ? 'bg-red-500 pulse' :
                                js.stressLevel === 'warning' ? 'bg-yellow-500' :
                                    'bg-green-500'
                                }`} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Real-time feedback */}
            <div className="flex-1 rounded-2xl bg-slate-800/50 border border-slate-700/30 p-4 overflow-auto">
                <p className="text-slate-400 text-sm font-medium mb-3">Real-time Feedback</p>

                {badFormFeedback.length > 0 && (
                    <div className="space-y-2 mb-3">
                        {badFormFeedback.map((fb, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30"
                            >
                                <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
                                    ⚠️
                                </div>
                                <p className="text-red-400 text-sm font-medium">{fb.message}</p>
                            </div>
                        ))}
                    </div>
                )}

                {warningFeedback.length > 0 && (
                    <div className="space-y-2 mb-3">
                        {warningFeedback.map((fb, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30"
                            >
                                <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400">
                                    💡
                                </div>
                                <p className="text-yellow-400 text-sm font-medium">{fb.message}</p>
                            </div>
                        ))}
                    </div>
                )}

                {badFormFeedback.length === 0 && warningFeedback.length === 0 && (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/30">
                        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                            ✓
                        </div>
                        <p className="text-green-400 text-sm font-medium">Great form! Keep it up!</p>
                    </div>
                )}
            </div>

            {/* Exercise info */}
            {exercise && (
                <div className="rounded-2xl bg-slate-800/50 border border-slate-700/30 p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{exercise.icon}</span>
                        <div>
                            <p className="text-white font-semibold">{exercise.name}</p>
                            <p className="text-slate-400 text-xs">
                                {exercise.primaryMuscles.slice(0, 2).join(', ')}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
