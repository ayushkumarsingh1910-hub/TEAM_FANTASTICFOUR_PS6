'use client';

import React, { useState, useEffect } from 'react';
import { getCurrentStreak } from '@/lib/db';
import { StreakData } from '@/types';

interface StreakCounterProps {
    compact?: boolean;
}

export default function StreakCounter({ compact = false }: StreakCounterProps) {
    const [streak, setStreak] = useState<StreakData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadStreak = async () => {
            try {
                const data = await getCurrentStreak();
                setStreak(data);
            } catch (error) {
                console.error('Failed to load streak:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadStreak();
    }, []);

    if (isLoading) {
        return (
            <div className={`animate-pulse ${compact ? 'h-12' : 'h-32'} bg-slate-800 rounded-2xl`} />
        );
    }

    const currentStreak = streak?.currentStreak ?? 0;
    const longestStreak = streak?.longestStreak ?? 0;

    if (compact) {
        return (
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/30">
                <div className="text-3xl">🔥</div>
                <div>
                    <p className="text-2xl font-bold text-white">{currentStreak}</p>
                    <p className="text-xs text-orange-300">Day Streak</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-6">
            {/* Animated fire background */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-32 h-32 bg-gradient-to-t from-orange-500/30 via-amber-500/10 to-transparent rounded-full blur-2xl animate-pulse" />
            </div>

            <div className="relative">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Daily Streak</h3>
                    <div className="text-4xl animate-bounce-slow">🔥</div>
                </div>

                {/* Current streak */}
                <div className="text-center mb-6">
                    <div className="relative inline-block">
                        <span className="text-6xl font-black bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 bg-clip-text text-transparent">
                            {currentStreak}
                        </span>
                        {currentStreak > 0 && (
                            <span className="absolute -top-2 -right-6 text-2xl animate-pulse">⚡</span>
                        )}
                    </div>
                    <p className="text-slate-400 mt-2">
                        {currentStreak === 0
                            ? 'Start your streak today!'
                            : currentStreak === 1
                                ? 'day - Keep it going!'
                                : `days - Amazing consistency!`}
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-cyan-400">{longestStreak}</p>
                        <p className="text-xs text-slate-400">Longest Streak</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-purple-400">
                            {currentStreak >= 7 ? '🏆' : currentStreak >= 3 ? '🥈' : '🥉'}
                        </p>
                        <p className="text-xs text-slate-400">Badge</p>
                    </div>
                </div>

                {/* Streak milestones */}
                <div className="mt-4 flex items-center gap-2">
                    {[3, 7, 14, 30].map((milestone) => (
                        <div
                            key={milestone}
                            className={`flex-1 h-2 rounded-full ${currentStreak >= milestone
                                ? 'bg-gradient-to-r from-orange-500 to-amber-500'
                                : 'bg-slate-700'
                                }`}
                        />
                    ))}
                </div>
                <div className="flex justify-between mt-1 text-xs text-slate-500">
                    <span>3d</span>
                    <span>7d</span>
                    <span>14d</span>
                    <span>30d</span>
                </div>

                {/* Motivational message */}
                {currentStreak > 0 && (
                    <div className="mt-4 px-4 py-3 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
                        <p className="text-sm text-green-400 text-center">
                            {currentStreak >= 30
                                ? "🎉 Incredible! You're a fitness legend!"
                                : currentStreak >= 14
                                    ? "💪 Two weeks strong! Unstoppable!"
                                    : currentStreak >= 7
                                        ? "🌟 One week done! You're on fire!"
                                        : currentStreak >= 3
                                            ? "⭐ Great start! Keep building momentum!"
                                            : "🚀 Day one of many! You got this!"}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
