'use client';

import React from 'react';
import { ExerciseDefinition } from '@/types';

interface ExerciseGuideProps {
    exercise: ExerciseDefinition;
    children?: React.ReactNode;
}

export default function ExerciseGuide({ exercise, children }: ExerciseGuideProps) {
    return (
        <div className="rounded-2xl bg-slate-900/50 backdrop-blur-md border border-slate-800 p-6 h-full flex flex-col">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-2xl">
                    🎯
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white leading-none mb-1">Exercise Guide</h3>
                    <p className="text-xs text-slate-400">Real-time Form Instructions</p>
                </div>
            </div>

            <div className="space-y-4 flex-1">
                <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Instructions</p>
                    <div className="space-y-2">
                        {exercise.instructions.map((step, idx) => (
                            <div key={idx} className="flex gap-3 group">
                                <div className="shrink-0 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-400 group-hover:border-cyan-500/50 group-hover:text-cyan-400 transition-colors">
                                    {idx + 1}
                                </div>
                                <p className="text-sm text-slate-300 group-hover:text-white transition-colors">
                                    {step}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {children && (
                    <div className="pt-4 border-t border-slate-800 flex justify-center">
                        <div className="w-full max-w-[300px] aspect-square rounded-xl overflow-hidden shadow-inner bg-black/20">
                            {children}
                        </div>
                    </div>
                )}

                <div className="pt-4 border-t border-slate-800">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Target Muscles</p>
                    <div className="flex flex-wrap gap-2">
                        {exercise.primaryMuscles.map((muscle, idx) => (
                            <span
                                key={idx}
                                className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium"
                            >
                                {muscle}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-800">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Benefits</p>
                    <ul className="space-y-1">
                        {exercise.benefits.map((benefit, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-sm text-slate-400">
                                <span className="text-cyan-500">✦</span>
                                {benefit}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-cyan-500/5 to-purple-500/5 border border-white/5">
                <p className="text-xs text-slate-400 italic text-center">
                    "Maintain steady breathing and focus on slow, controlled segments."
                </p>
            </div>
        </div>
    );
}
