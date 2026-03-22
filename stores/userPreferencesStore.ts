import { create } from 'zustand';
import { UserPreferences, Holiday } from '../types';
import { supabase } from '../lib/supabase';

interface UserPreferencesState {
  prefs: UserPreferences | null;
  holidays: Holiday[];
  loading: boolean;
  fetch: (userId: string) => Promise<void>;
  setCountry: (userId: string, countryCode: string) => Promise<void>;
  fetchHolidays: (countryCode: string, year: number) => Promise<void>;
}

export const useUserPreferencesStore = create<UserPreferencesState>((set, get) => ({
  prefs: null,
  holidays: [],
  loading: false,

  fetch: async (userId) => {
    set({ loading: true });
    const { data } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    const prefs = data ?? null;
    set({ prefs, loading: false });
    if (prefs?.country_code) {
      const year = new Date().getFullYear();
      await get().fetchHolidays(prefs.country_code, year);
    }
  },

  setCountry: async (userId, countryCode) => {
    const existing = get().prefs;
    if (existing) {
      const { data } = await supabase
        .from('user_preferences')
        .update({ country_code: countryCode, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .select()
        .single();
      if (data) set({ prefs: data });
    } else {
      const { data } = await supabase
        .from('user_preferences')
        .insert({ user_id: userId, country_code: countryCode })
        .select()
        .single();
      if (data) set({ prefs: data });
    }
    const year = new Date().getFullYear();
    await get().fetchHolidays(countryCode, year);
  },

  fetchHolidays: async (countryCode, year) => {
    const { data } = await supabase
      .from('holidays')
      .select('*')
      .eq('country_code', countryCode)
      .in('year', [year, year + 1]);
    set({ holidays: data ?? [] });
  },
}));
