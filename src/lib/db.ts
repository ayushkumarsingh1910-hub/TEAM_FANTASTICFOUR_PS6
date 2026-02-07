// Dexie.js IndexedDB setup for local-only data persistence
import Dexie, { Table } from 'dexie';
import { WorkoutSession, DailyStats, StreakData } from '@/types';

export class PhysioDatabase extends Dexie {
    sessions!: Table<WorkoutSession>;
    dailyStats!: Table<DailyStats>;
    streaks!: Table<StreakData>;

    constructor() {
        super('PhysioAIDB');

        this.version(1).stores({
            sessions: '++id, date, exerciseId, reps, formScore, duration',
            dailyStats: 'date, totalReps, avgFormScore, exerciseCount, totalDuration',
            streaks: '++id, lastActiveDate, currentStreak, longestStreak'
        });
    }
}

export const db = new PhysioDatabase();

// Helper functions for database operations

export async function saveWorkoutSession(session: Omit<WorkoutSession, 'id'>): Promise<number> {
    const id = await db.sessions.add(session as WorkoutSession);
    await updateDailyStats(session);
    await updateStreak();
    return id as number;
}

export async function updateDailyStats(session: Omit<WorkoutSession, 'id'>): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    let stats = await db.dailyStats.get(today);

    if (stats) {
        const totalReps = stats.totalReps + session.reps;
        const totalFormScore = stats.avgFormScore * stats.exerciseCount + session.formScore;
        const exerciseCount = stats.exerciseCount + 1;

        stats.totalReps = totalReps;
        stats.avgFormScore = totalFormScore / exerciseCount;
        stats.exerciseCount = exerciseCount;
        stats.totalDuration += session.duration;

        if (!stats.exercises) stats.exercises = {};
        stats.exercises[session.exerciseId] = (stats.exercises[session.exerciseId] || 0) + session.reps;

        await db.dailyStats.put(stats);
    } else {
        await db.dailyStats.add({
            date: today,
            totalReps: session.reps,
            avgFormScore: session.formScore,
            exerciseCount: 1,
            totalDuration: session.duration,
            exercises: { [session.exerciseId]: session.reps }
        });
    }
}

export async function updateStreak(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    let streak = await db.streaks.orderBy('id').last();

    if (streak) {
        if (streak.lastActiveDate === today) {
            // Already worked out today, no update needed
            return;
        } else if (streak.lastActiveDate === yesterday) {
            // Continuing streak
            streak.currentStreak += 1;
            streak.lastActiveDate = today;
            if (streak.currentStreak > streak.longestStreak) {
                streak.longestStreak = streak.currentStreak;
            }
            await db.streaks.put(streak);
        } else {
            // Streak broken, start new
            await db.streaks.add({
                lastActiveDate: today,
                currentStreak: 1,
                longestStreak: streak.longestStreak
            });
        }
    } else {
        // First workout ever
        await db.streaks.add({
            lastActiveDate: today,
            currentStreak: 1,
            longestStreak: 1
        });
    }
}

export async function getCurrentStreak(): Promise<StreakData | null> {
    const streak = await db.streaks.orderBy('id').last();
    if (!streak) return null;

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Check if streak is still valid
    if (streak.lastActiveDate !== today && streak.lastActiveDate !== yesterday) {
        return { ...streak, currentStreak: 0 };
    }

    return streak;
}

export async function getWeeklyStats(): Promise<DailyStats[]> {
    const endDate = new Date();
    const startDate = new Date(Date.now() - 7 * 86400000);

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    return db.dailyStats
        .where('date')
        .between(startStr, endStr, true, true)
        .toArray();
}

export async function getMonthlyStats(): Promise<DailyStats[]> {
    const endDate = new Date();
    const startDate = new Date(Date.now() - 30 * 86400000);

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    return db.dailyStats
        .where('date')
        .between(startStr, endStr, true, true)
        .toArray();
}

export async function getSessionsByExercise(exerciseId: string): Promise<WorkoutSession[]> {
    return db.sessions.where('exerciseId').equals(exerciseId).toArray();
}

export async function getAllSessions(): Promise<WorkoutSession[]> {
    return db.sessions.orderBy('date').reverse().toArray();
}

export async function getTodaysSessions(): Promise<WorkoutSession[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return db.sessions
        .where('date')
        .between(today, tomorrow, true, false)
        .toArray();
}
