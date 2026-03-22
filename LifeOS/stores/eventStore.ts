import { create } from 'zustand';
import { Event } from '../types';
import { supabase } from '../lib/supabase';

interface EventState {
  events: Event[];
  loading: boolean;
  fetch: (userId: string) => Promise<void>;
  create: (event: Omit<Event, 'id' | 'created_at'>) => Promise<void>;
  update: (id: string, updates: Partial<Event>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useEventStore = create<EventState>((set, get) => ({
  events: [],
  loading: false,

  fetch: async (userId) => {
    set({ loading: true });
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .order('start_at', { ascending: true });
    set({ events: data ?? [], loading: false });
  },

  create: async (event) => {
    const { data } = await supabase.from('events').insert(event).select().single();
    if (data) set({ events: [...get().events, data].sort((a, b) => a.start_at.localeCompare(b.start_at)) });
  },

  update: async (id, updates) => {
    await supabase.from('events').update(updates).eq('id', id);
    set({
      events: get().events.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    });
  },

  remove: async (id) => {
    await supabase.from('events').delete().eq('id', id);
    set({ events: get().events.filter((e) => e.id !== id) });
  },
}));
