import { create } from 'zustand';
import { NotificationPreferences } from '../types';
import { supabase } from '../lib/supabase';

interface NotificationPreferencesState {
  prefs: NotificationPreferences | null;
  loading: boolean;
  fetch: (userId: string) => Promise<void>;
  save: (userId: string, updates: Partial<Omit<NotificationPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => Promise<void>;
}

const DEFAULTS = {
  birthdays_enabled: true,
  life_events_enabled: true,
  tasks_enabled: true,
  quiet_hours_start: null,
  quiet_hours_end: null,
};

export const useNotificationPreferencesStore = create<NotificationPreferencesState>((set, get) => ({
  prefs: null,
  loading: false,

  fetch: async (userId) => {
    set({ loading: true });
    const { data } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    set({ prefs: data ?? null, loading: false });
  },

  save: async (userId, updates) => {
    const existing = get().prefs;
    if (existing) {
      const { data } = await supabase
        .from('notification_preferences')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .select()
        .single();
      if (data) set({ prefs: data });
    } else {
      const { data } = await supabase
        .from('notification_preferences')
        .insert({ user_id: userId, ...DEFAULTS, ...updates })
        .select()
        .single();
      if (data) set({ prefs: data });
    }
  },
}));
