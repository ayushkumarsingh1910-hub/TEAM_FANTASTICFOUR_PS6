'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
} from 'recharts';
import { getWeeklyStats, getMonthlyStats, getAllSessions, getCurrentStreak } from '@/lib/db';
import { DailyStats, WorkoutSession, StreakData } from '@/types';
import { exercises } from '@/data/exercises';
import StreakCounter from '@/components/StreakCounter';

const COLORS = ['#06b6d4', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444'];

export default function DashboardPage() {
    const [period, setPeriod] = useState<'week' | 'month'>('week');
    const [stats, setStats] = useState<DailyStats[]>([]);
    const [sessions, setSessions] = useState<WorkoutSession[]>([]);
    const [streak, setStreak] = useState<StreakData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);
                const data = period === 'week' ? await getWeeklyStats() : await getMonthlyStats();
                const allSessions = await getAllSessions();
                const streakData = await getCurrentStreak();

                setStats(data);
                setSessions(allSessions);
                setStreak(streakData);
            } catch (error) {
                console.error('Failed to load dashboard data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [period]);

    // Calculate summary stats
    const totalReps = stats.reduce((acc, s) => acc + s.totalReps, 0);
    const totalDuration = stats.reduce((acc, s) => acc + s.totalDuration, 0);
    const avgFormScore = stats.length > 0
        ? Math.round(stats.reduce((acc, s) => acc + s.avgFormScore, 0) / stats.length)
        : 0;
    const totalWorkouts = stats.reduce((acc, s) => acc + s.exerciseCount, 0);

    // Prepare chart data
    const chartData = stats.map(s => ({
        date: new Date(s.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        reps: s.totalReps,
        formScore: s.avgFormScore,
        duration: Math.round(s.totalDuration / 60),
        workouts: s.exerciseCount,
    }));

    // Exercise breakdown
    const exerciseBreakdown: { name: string; value: number; color: string }[] = [];
    const exerciseCounts: { [key: string]: number } = {};

    sessions.forEach(s => {
        exerciseCounts[s.exerciseId] = (exerciseCounts[s.exerciseId] || 0) + s.reps;
    });

    Object.entries(exerciseCounts).forEach(([id, count], index) => {
        const exercise = exercises.find(e => e.id === id);
        exerciseBreakdown.push({
            name: exercise?.name || id,
            value: count,
            color: COLORS[index % COLORS.length],
        });
    });

    // Form score trend
    const formTrend = sessions.slice(-10).reverse().map((s, i) => ({
        session: i + 1,
        score: s.formScore,
        exercise: exercises.find(e => e.id === s.exerciseId)?.name || s.exerciseId,
    }));

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <main className="min-h-screen pb-20">
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
                                <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                                <p className="text-sm text-slate-400">Your fitness analytics</p>
                            </div>
                        </div>

                        {/* Period Toggle */}
                        <div className="flex items-center gap-2 bg-slate-800 rounded-xl p-1">
                            <button
                                onClick={() => setPeriod('week')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${period === 'week'
                                    ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                                    : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                Weekly
                            </button>
                            <button
                                onClick={() => setPeriod('month')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${period === 'month'
                                    ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                                    : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                Monthly
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="stat-card">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center text-xl">
                                💪
                            </div>
                            <p className="text-slate-400 text-sm">Total Reps</p>
                        </div>
                        <p className="text-3xl font-bold text-white">{totalReps.toLocaleString()}</p>
                    </div>

                    <div className="stat-card">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-xl">
                                ⏱️
                            </div>
                            <p className="text-slate-400 text-sm">Total Time</p>
                        </div>
                        <p className="text-3xl font-bold text-white">{Math.round(totalDuration / 60)}m</p>
                    </div>

                    <div className="stat-card">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center text-xl">
                                🎯
                            </div>
                            <p className="text-slate-400 text-sm">Avg Form</p>
                        </div>
                        <p className="text-3xl font-bold text-white">{avgFormScore}%</p>
                    </div>

                    <div className="stat-card">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center text-xl">
                                🏋️
                            </div>
                            <p className="text-slate-400 text-sm">Workouts</p>
                        </div>
                        <p className="text-3xl font-bold text-white">{totalWorkouts}</p>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Main Charts */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Reps Chart */}
                        <div className="glass rounded-2xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <span className="text-2xl">📊</span>
                                Daily Reps
                            </h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="repsGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                                        <YAxis stroke="#64748b" fontSize={12} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#1e293b',
                                                border: '1px solid #334155',
                                                borderRadius: '12px',
                                            }}
                                            labelStyle={{ color: '#fff' }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="reps"
                                            stroke="#06b6d4"
                                            strokeWidth={2}
                                            fill="url(#repsGradient)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Form Score Trend */}
                        <div className="glass rounded-2xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <span className="text-2xl">📈</span>
                                Form Score Trend
                            </h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={formTrend}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis dataKey="session" stroke="#64748b" fontSize={12} />
                                        <YAxis domain={[0, 100]} stroke="#64748b" fontSize={12} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#1e293b',
                                                border: '1px solid #334155',
                                                borderRadius: '12px',
                                            }}
                                            labelStyle={{ color: '#fff' }}
                                            formatter={(value: number) => [`${value}%`, 'Form Score']}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="score"
                                            stroke="#8b5cf6"
                                            strokeWidth={3}
                                            dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                                            activeDot={{ r: 6, fill: '#a78bfa' }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Duration Chart */}
                        <div className="glass rounded-2xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <span className="text-2xl">⏰</span>
                                Workout Duration (minutes)
                            </h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                                        <YAxis stroke="#64748b" fontSize={12} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#1e293b',
                                                border: '1px solid #334155',
                                                borderRadius: '12px',
                                            }}
                                            labelStyle={{ color: '#fff' }}
                                        />
                                        <Bar dataKey="duration" fill="#ec4899" radius={[8, 8, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-8">
                        {/* Streak */}
                        <StreakCounter />

                        {/* Exercise Breakdown */}
                        <div className="glass rounded-2xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <span className="text-2xl">🥧</span>
                                Exercise Mix
                            </h3>
                            {exerciseBreakdown.length > 0 ? (
                                <>
                                    <div className="h-48">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={exerciseBreakdown}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={40}
                                                    outerRadius={70}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {exerciseBreakdown.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: '#1e293b',
                                                        border: '1px solid #334155',
                                                        borderRadius: '12px',
                                                    }}
                                                    formatter={(value: number, name: any) => {
                                                        const exercise = exercises.find(e => e.name === name);
                                                        const unit = exercise?.id === 'plank' ? 's' : ' reps';
                                                        return [value + unit];
                                                    }}
                                                />

                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="space-y-2 mt-4">
                                        {exerciseBreakdown.slice(0, 5).map((item, index) => (
                                            <div key={index} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-3 h-3 rounded-full"
                                                        style={{ backgroundColor: item.color }}
                                                    />
                                                    <span className="text-sm text-slate-300">{item.name}</span>
                                                </div>
                                                <span className="text-sm text-slate-400">{item.value}{exercises.find(e => e.name === item.name)?.id === 'plank' ? 's' : ' reps'}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-slate-400">No exercises recorded yet</p>
                                    <Link href="/" className="text-cyan-400 text-sm hover:underline mt-2 block">
                                        Start your first workout
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Recent Sessions */}
                        <div className="glass rounded-2xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <span className="text-2xl">🕐</span>
                                Recent Sessions
                            </h3>
                            <div className="space-y-3">
                                {sessions.slice(0, 5).map((session, index) => {
                                    const exercise = exercises.find(e => e.id === session.exerciseId);
                                    return (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-xl">{exercise?.icon || '💪'}</span>
                                                <div>
                                                    <p className="text-sm text-white font-medium">
                                                        {exercise?.name || session.exerciseId}
                                                    </p>
                                                    <p className="text-xs text-slate-400">
                                                        {new Date(session.date).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-cyan-400 font-semibold">
                                                    {session.reps}{exercise?.id === 'plank' ? 's' : ' reps'}
                                                </p>
                                                <p className="text-xs text-slate-400">{session.formScore}% form</p>
                                            </div>
                                        </div>
                                    );
                                })}
                                {sessions.length === 0 && (
                                    <p className="text-center text-slate-400 py-4">No sessions yet</p>
                                )}
                            </div>
                        </div>

                        {/* Privacy Badge */}
                        <div className="glass rounded-2xl p-6 text-center">
                            <div className="w-16 h-16 mx-auto rounded-2xl bg-green-500/20 flex items-center justify-center text-3xl mb-4">
                                🔒
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">100% Private</h3>
                            <p className="text-sm text-slate-400">
                                All your data is stored locally on your device. Nothing is sent to any server.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
