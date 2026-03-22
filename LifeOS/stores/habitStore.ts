import { create } from 'zustand';
import { Habit, HabitLog } from '../types';
import { supabase } from '../lib/supabase';
import { todayISO } from '../lib/utils';

interface HabitState {
  habits: Habit[];
  logs: HabitLog[];
  loading: boolean;
  fetch: (userId: string) => Promise<void>;
  logCompletion: (habitId: string, userId: string) => Promise<void>;
  undoCompletion: (habitId: string, userId: string) => Promise<void>;
}

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: [],
  logs: [],
  loading: false,

  fetch: async (userId) => {
    set({ loading: true });
    const today = todayISO();
    const [{ data: habits }, { data: logs }] = await Promise.all([
      supabase.from('habits').select('*').eq('user_id', userId),
      supabase
        .from('habit_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('date', new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]),
    ]);

    const todayLogs = (logs ?? []).filter((l) => l.date === today);
    const enriched: Habit[] = (habits ?? []).map((h) => {
      const hLogs = (logs ?? []).filter((l) => l.habit_id === h.id).map((l) => l.date).sort();
      return {
        ...h,
        completedToday: todayLogs.some((l) => l.habit_id === h.id),
        streak: computeStreak(hLogs),
      };
    });

    set({ habits: enriched, logs: logs ?? [], loading: false });
  },

  logCompletion: async (habitId, userId) => {
    const today = todayISO();
    const { data } = await supabase
      .from('habit_logs')
      .insert({ habit_id: habitId, user_id: userId, date: today, completed_at: new Date().toISOString() })
      .select()
      .single();
    if (data) {
      set({
        logs: [...get().logs, data],
        habits: get().habits.map((h) =>
          h.id === habitId ? { ...h, completedToday: true, streak: (h.streak ?? 0) + 1 } : h
        ),
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
    set({
      logs: get().logs.filter((l) => !(l.habit_id === habitId && l.date === today)),
      habits: get().habits.map((h) =>
        h.id === habitId
          ? { ...h, completedToday: false, streak: Math.max(0, (h.streak ?? 1) - 1) }
          : h
      ),
    });
  },
}));

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
