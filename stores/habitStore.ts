import { create } from 'zustand';
import { Habit, HabitLog, HeatmapDay } from '../types';
import { supabase } from '../lib/supabase';
import { todayISO } from '../lib/utils';

interface HabitState {
  habits: Habit[];
  logs: HabitLog[];
  loading: boolean;
  fetch: (userId: string) => Promise<void>;
  createHabit: (
    userId: string,
    data: Pick<Habit, 'title' | 'description' | 'frequency' | 'target_days' | 'icon' | 'color'>
  ) => Promise<Habit | null>;
  updateHabit: (id: string, data: Partial<Habit>) => Promise<void>;
  archiveHabit: (id: string) => Promise<void>;
  logCompletion: (habitId: string, userId: string) => Promise<void>;
  undoCompletion: (habitId: string, userId: string) => Promise<void>;
  fetchHeatmap: (habitId: string, userId: string) => Promise<HeatmapDay[]>;
}

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: [],
  logs: [],
  loading: false,

  fetch: async (userId) => {
    set({ loading: true });
    const today = todayISO();
    const yearAgo = new Date(Date.now() - 365 * 86400000).toISOString().split('T')[0];

    const [{ data: habits }, { data: logs }] = await Promise.all([
      supabase.from('habits').select('*').eq('user_id', userId).eq('is_archived', false),
      supabase
        .from('habit_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('date', yearAgo),
    ]);

    const todayLogs = (logs ?? []).filter((l) => l.date === today);
    const enriched: Habit[] = (habits ?? []).map((h) => {
      const hLogs = (logs ?? [])
        .filter((l) => l.habit_id === h.id)
        .map((l) => l.date)
        .sort();
      return {
        ...h,
        completedToday: todayLogs.some((l) => l.habit_id === h.id),
        streak: computeStreak(hLogs),
        longest_streak: computeLongestStreak(hLogs),
      };
    });

    set({ habits: enriched, logs: logs ?? [], loading: false });
  },

  createHabit: async (userId, data) => {
    const { data: created } = await supabase
      .from('habits')
      .insert({
        user_id: userId,
        title: data.title,
        description: data.description ?? null,
        frequency: data.frequency,
        target_days: data.target_days ?? null,
        icon: data.icon ?? null,
        color: data.color ?? null,
        is_archived: false,
      })
      .select()
      .single();
    if (created) {
      const enriched: Habit = {
        ...created,
        completedToday: false,
        streak: 0,
        longest_streak: 0,
      };
      set({ habits: [enriched, ...get().habits] });
      return enriched;
    }
    return null;
  },

  updateHabit: async (id, data) => {
    await supabase.from('habits').update(data).eq('id', id);
    set({
      habits: get().habits.map((h) => (h.id === id ? { ...h, ...data } : h)),
    });
  },

  archiveHabit: async (id) => {
    await supabase.from('habits').update({ is_archived: true }).eq('id', id);
    set({ habits: get().habits.filter((h) => h.id !== id) });
  },

  logCompletion: async (habitId, userId) => {
    const today = todayISO();
    const { data } = await supabase
      .from('habit_logs')
      .insert({ habit_id: habitId, user_id: userId, date: today, completed_at: new Date().toISOString() })
      .select()
      .single();
    if (data) {
      const newLogs = [...get().logs, data];
      set({
        logs: newLogs,
        habits: get().habits.map((h) => {
          if (h.id !== habitId) return h;
          const hLogDates = newLogs.filter((l) => l.habit_id === habitId).map((l) => l.date).sort();
          const newStreak = computeStreak(hLogDates);
          return {
            ...h,
            completedToday: true,
            streak: newStreak,
            longest_streak: Math.max(h.longest_streak ?? 0, newStreak),
          };
        }),
      });
    }
  },

  undoCompletion: async (habitId, userId) => {
    const today = todayISO();
    await supabase
      .from('habit_logs')
      .delete()
      .eq('habit_id', habitId)
      .eq('user_id', userId)
      .eq('date', today);
    const newLogs = get().logs.filter((l) => !(l.habit_id === habitId && l.date === today));
    set({
      logs: newLogs,
      habits: get().habits.map((h) => {
        if (h.id !== habitId) return h;
        const hLogDates = newLogs.filter((l) => l.habit_id === habitId).map((l) => l.date).sort();
        return {
          ...h,
          completedToday: false,
          streak: computeStreak(hLogDates),
        };
      }),
    });
  },

  fetchHeatmap: async (habitId, userId) => {
    const today = todayISO();
    const from = new Date(Date.now() - 364 * 86400000).toISOString().split('T')[0];

    const [{ data: habit }, { data: logs }] = await Promise.all([
      supabase.from('habits').select('frequency,target_days,created_at').eq('id', habitId).single(),
      supabase
        .from('habit_logs')
        .select('date')
        .eq('habit_id', habitId)
        .eq('user_id', userId)
        .gte('date', from),
    ]);

    const completedSet = new Set((logs ?? []).map((l) => l.date));
    const result: HeatmapDay[] = [];
    const cursor = new Date(from);
    const todayDate = new Date(today);

    while (cursor <= todayDate) {
      const dateStr = cursor.toISOString().split('T')[0];
      const isDueDay = isHabitDueOn(cursor, habit);
      let status: 'none' | 'completed' | 'missed' = 'none';
      if (isDueDay) {
        status = completedSet.has(dateStr) ? 'completed' : 'missed';
      }
      result.push({ date: dateStr, status });
      cursor.setDate(cursor.getDate() + 1);
    }

    return result;
  },
}));

function isHabitDueOn(date: Date, habit: { frequency: string; target_days: number[] | null } | null): boolean {
  if (!habit) return true;
  if (habit.frequency === 'daily') return true;
  if (habit.frequency === 'weekly') {
    const dow = date.getDay(); // 0=Sun..6=Sat
    if (!habit.target_days || habit.target_days.length === 0) return true;
    return habit.target_days.includes(dow);
  }
  return true;
}

function computeStreak(sortedDates: string[]): number {
  if (!sortedDates.length) return 0;
  const today = todayISO();
  let streak = 0;
  let check = today;
  for (let i = sortedDates.length - 1; i >= 0; i--) {
    if (sortedDates[i] === check) {
      streak++;
      const d = new Date(check);
      d.setDate(d.getDate() - 1);
      check = d.toISOString().split('T')[0];
    } else {
      break;
    }
  }
  return streak;
}

function computeLongestStreak(sortedDates: string[]): number {
  if (!sortedDates.length) return 0;
  let longest = 1;
  let current = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1]);
    const curr = new Date(sortedDates[i]);
    const diff = (curr.getTime() - prev.getTime()) / 86400000;
    if (diff === 1) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 1;
    }
  }
  return longest;
}
