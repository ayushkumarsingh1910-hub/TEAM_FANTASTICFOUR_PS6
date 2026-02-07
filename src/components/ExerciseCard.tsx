'use client';

import React from 'react';
import Link from 'next/link';
import { ExerciseDefinition } from '@/types';

interface ExerciseCardProps {
    exercise: ExerciseDefinition;
    stats?: {
        totalReps: number;
        avgFormScore: number;
        lastSession?: Date;
    };
}

const difficultyColors = {
    beginner: 'from-emerald-500 to-teal-600',
    intermediate: 'from-amber-500 to-orange-600',
    advanced: 'from-rose-500 to-red-600',
};

const categoryIcons = {
    upper: '💪',
    lower: '🦵',
    core: '🧘',
    'full-body': '🏃',
};

export default function ExerciseCard({ exercise, stats }: ExerciseCardProps) {
    return (
        <Link href={`/exercise/${exercise.id}`}>
            <div className="group relative h-full overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-cyan-500/20 hover:border-cyan-500/30 cursor-pointer">
                {/* Animated gradient border */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-cyan-500/10 group-hover:via-purple-500/10 group-hover:to-pink-500/10 transition-all duration-500" />

                {/* Difficulty badge */}
                <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold text-white bg-gradient-to-r ${difficultyColors[exercise.difficulty]} shadow-lg`}>
                    {exercise.difficulty.charAt(0).toUpperCase() + exercise.difficulty.slice(1)}
                </div>

                {/* Content */}
                <div className="relative p-6">
                    {/* Icon and title */}
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center text-4xl group-hover:scale-110 transition-transform duration-300">
                            {exercise.icon}
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                                {exercise.name}
                            </h3>
                            <p className="text-sm text-slate-400 flex items-center gap-2">
                                <span>{categoryIcons[exercise.category]}</span>
                                {exercise.category.charAt(0).toUpperCase() + exercise.category.slice(1).replace('-', ' ')}
                            </p>
                        </div>
                    </div>

                    {/* Description */}
                    <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                        {exercise.description}
                    </p>

                    {/* Muscles */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        {exercise.primaryMuscles.slice(0, 3).map((muscle) => (
                            <span
                                key={muscle}
                                className="px-2 py-1 rounded-lg bg-slate-700/50 text-xs text-slate-300"
                            >
                                {muscle}
                            </span>
                        ))}
                        {exercise.primaryMuscles.length > 3 && (
                            <span className="px-2 py-1 rounded-lg bg-slate-700/50 text-xs text-slate-300">
                                +{exercise.primaryMuscles.length - 3}
                            </span>
                        )}
                    </div>

                    {/* Stats (if available) */}
                    {stats && (
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700/50">
                            <div>
                                <p className="text-2xl font-bold text-white">{stats.totalReps}</p>
                                <p className="text-xs text-slate-400">Total Reps</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-cyan-400">{stats.avgFormScore}%</p>
                                <p className="text-xs text-slate-400">Avg Form</p>
                            </div>
                        </div>
                    )}

                    {/* Hover indicator */}
                    <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center text-white">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Animated pulse effect on hover */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-0 rounded-2xl animate-pulse-slow bg-gradient-to-r from-cyan-500/5 via-transparent to-purple-500/5" />
                </div>
            </div>
        </Link>
    );
}
