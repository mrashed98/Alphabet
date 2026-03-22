import { create } from 'zustand';
import { Reminder } from '../types';
import { supabase } from '../lib/supabase';

interface ReminderState {
  reminders: Reminder[];
  loading: boolean;
  fetch: (userId: string) => Promise<void>;
  create: (reminder: Omit<Reminder, 'id' | 'created_at'>) => Promise<void>;
  update: (id: string, updates: Partial<Reminder>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useReminderStore = create<ReminderState>((set, get) => ({
  reminders: [],
  loading: false,

  fetch: async (userId) => {
    set({ loading: true });
    const { data } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .order('remind_at', { ascending: true });
    set({ reminders: data ?? [], loading: false });
  },

  create: async (reminder) => {
    const { data } = await supabase.from('reminders').insert(reminder).select().single();
    if (data) {
      set({
        reminders: [...get().reminders, data].sort((a, b) => a.remind_at.localeCompare(b.remind_at)),
      });
    }
  },

  update: async (id, updates) => {
    await supabase.from('reminders').update(updates).eq('id', id);
    set({
      reminders: get().reminders.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    });
  },

  remove: async (id) => {
    await supabase.from('reminders').delete().eq('id', id);
    set({ reminders: get().reminders.filter((r) => r.id !== id) });
  },
}));
