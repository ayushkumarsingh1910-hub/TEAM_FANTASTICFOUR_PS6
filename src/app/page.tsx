'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import ExerciseCard from '@/components/ExerciseCard';
import StreakCounter from '@/components/StreakCounter';
import { exercises } from '@/data/exercises';
import { getWeeklyStats, getTodaysSessions } from '@/lib/db';
import { DailyStats, WorkoutSession } from '@/types';

export default function Home() {
  const [weeklyStats, setWeeklyStats] = useState<DailyStats[]>([]);
  const [todaySessions, setTodaySessions] = useState<WorkoutSession[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    const loadData = async () => {
      try {
        const weekly = await getWeeklyStats();
        const today = await getTodaysSessions();
        setWeeklyStats(weekly);
        setTodaySessions(today);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };
    loadData();
  }, []);

  const categories = ['all', 'upper', 'lower', 'core', 'full-body'];

  const filteredExercises = selectedCategory === 'all'
    ? exercises
    : exercises.filter(e => e.category === selectedCategory);

  const totalTodayReps = todaySessions.reduce((acc, s) => acc + s.reps, 0);
  const totalTodayTime = todaySessions.reduce((acc, s) => acc + s.duration, 0);

  return (
    <main className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-2xl shadow-lg shadow-cyan-500/30">
                🏥
              </div>
              <div>
                <h1 className="text-2xl font-bold gradient-text">Physio.AI</h1>
                <p className="text-sm text-slate-400">Privacy-First Physio Assistant</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <StreakCounter compact />
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm mb-6">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                100% On-Device AI
              </div>
              <h2 className="text-4xl sm:text-5xl font-black text-white mb-4 leading-tight">
                Your Personal
                <span className="block gradient-text">AI Physio Therapist</span>
              </h2>
              <p className="text-lg text-slate-400 mb-8">
                Clinical-grade exercise tracking with real-time biomechanical analysis.
                All processing happens on your device — your data never leaves.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  3D Pose Tracking
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Real-time Feedback
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Privacy First
                </div>
              </div>
            </div>

            {/* Today's Stats Card */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 blur-3xl" />
              <div className="relative glass rounded-3xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">📊</span>
                  Today's Progress
                </h3>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-cyan-400">{todaySessions.length}</p>
                    <p className="text-xs text-slate-400">Workouts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-purple-400">{totalTodayReps}</p>
                    <p className="text-xs text-slate-400">Total Reps</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-pink-400">{Math.floor(totalTodayTime / 60)}</p>
                    <p className="text-xs text-slate-400">Minutes</p>
                  </div>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 transition-all duration-1000"
                    style={{ width: `${Math.min((totalTodayReps / 100) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-2 text-center">
                  {totalTodayReps}/100 daily rep goal
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="px-4 sm:px-6 lg:px-8 mb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${selectedCategory === cat
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
              >
                {cat === 'all' ? 'All Exercises' : cat.charAt(0).toUpperCase() + cat.slice(1).replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Exercise Grid */}
      <section className="px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <span className="text-3xl">💪</span>
            Choose Your Exercise
            <span className="ml-auto text-sm font-normal text-slate-400">
              {filteredExercises.length} exercises
            </span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredExercises.map((exercise) => (
              <ExerciseCard key={exercise.id} exercise={exercise} />
            ))}
          </div>
        </div>
      </section>

      {/* Privacy Badge */}
      <section className="px-4 sm:px-6 lg:px-8 mt-16">
        <div className="max-w-7xl mx-auto">
          <div className="glass rounded-2xl p-6 flex flex-wrap items-center justify-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center text-2xl">
                🔒
              </div>
              <div>
                <p className="text-white font-semibold">Privacy First</p>
                <p className="text-sm text-slate-400">All data stored locally</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center text-2xl">
                📱
              </div>
              <div>
                <p className="text-white font-semibold">Works Offline</p>
                <p className="text-sm text-slate-400">No internet required</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-2xl">
                🏥
              </div>
              <div>
                <p className="text-white font-semibold">Clinical Grade</p>
                <p className="text-sm text-slate-400">Biomechanical analysis</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
