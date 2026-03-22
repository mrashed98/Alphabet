import { create } from 'zustand';
import { LifeEvent } from '../types';
import { supabase } from '../lib/supabase';

interface LifeEventState {
  lifeEvents: LifeEvent[];
  loading: boolean;
  fetch: (userId: string) => Promise<void>;
  create: (lifeEvent: Omit<LifeEvent, 'id' | 'created_at'>) => Promise<void>;
  update: (id: string, updates: Partial<LifeEvent>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** Returns events whose notification window begins within the next `days` days */
  upcoming: (days?: number) => LifeEvent[];
}

export const useLifeEventStore = create<LifeEventState>((set, get) => ({
  lifeEvents: [],
  loading: false,

  fetch: async (userId) => {
    set({ loading: true });
    const { data } = await supabase
      .from('life_events')
      .select('*')
      .eq('user_id', userId)
      .order('event_date', { ascending: true });
    set({ lifeEvents: data ?? [], loading: false });
  },

  create: async (lifeEvent) => {
    const { data } = await supabase.from('life_events').insert(lifeEvent).select().single();
    if (data) {
      set({
        lifeEvents: [...get().lifeEvents, data].sort((a, b) =>
          a.event_date.localeCompare(b.event_date)
        ),
      });
    }
  },

  update: async (id, updates) => {
    await supabase.from('life_events').update(updates).eq('id', id);
    set({
      lifeEvents: get().lifeEvents.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    });
  },

  remove: async (id) => {
    await supabase.from('life_events').delete().eq('id', id);
    set({ lifeEvents: get().lifeEvents.filter((e) => e.id !== id) });
  },

  upcoming: (days = 30) => {
    const today = new Date();
    const currentYear = today.getFullYear();
    return get().lifeEvents.filter((event) => {
      // Strip year from event_date for recurring (birthday/anniversary/etc.)
      const [, month, day] = event.event_date.split('-');
      const thisYear = new Date(`${currentYear}-${month}-${day}`);
      const notifyDate = new Date(thisYear);
      notifyDate.setDate(notifyDate.getDate() - event.advance_days);
      return notifyDate <= new Date(today.getTime() + days * 86_400_000) && thisYear >= today;
    });
  },
}));
