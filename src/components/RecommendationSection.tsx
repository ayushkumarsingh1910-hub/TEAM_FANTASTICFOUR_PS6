'use client';

import React from 'react';
import Link from 'next/link';
import { ExerciseDefinition } from '@/types';
import { exercises } from '@/data/exercises';

interface RecommendationSectionProps {
    currentExerciseId: string;
}

export default function RecommendationSection({ currentExerciseId }: RecommendationSectionProps) {
    const currentExercise = exercises.find(e => e.id === currentExerciseId);

    // Suggest exercises from same category or just others
    const recommendations = exercises
        .filter(e => e.id !== currentExerciseId)
        .sort((a, b) => {
            if (currentExercise && a.category === currentExercise.category && b.category !== currentExercise.category) return -1;
            if (currentExercise && b.category === currentExercise.category && a.category !== currentExercise.category) return 1;
            return 0;
        })
        .slice(0, 3);

    return (
        <div className="mt-8">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="text-xl">🚀</span>
                Recommended for You
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {recommendations.map((ex) => (
                    <Link
                        key={ex.id}
                        href={`/exercise/${ex.id}`}
                        className="group relative overflow-hidden rounded-2xl bg-slate-900/50 border border-slate-800 p-4 transition-all hover:bg-slate-800 hover:border-cyan-500/50"
                    >
                        <div className="flex items-center gap-3">
                            <div className="text-3xl group-hover:scale-110 transition-transform">
                                {ex.icon}
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">
                                    {ex.name}
                                </h4>
                                <p className="text-xs text-slate-400 capitalize">{ex.category} • {ex.difficulty}</p>
                            </div>
                        </div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 bg-cyan-500/10 rounded-tl-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-cyan-500 text-xs">→</span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
