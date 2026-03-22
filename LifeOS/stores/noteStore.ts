import { create } from 'zustand';
import { Note } from '../types';
import { supabase } from '../lib/supabase';

interface NoteState {
  notes: Note[];
  loading: boolean;
  fetch: (userId: string) => Promise<void>;
  create: (note: Omit<Note, 'id' | 'created_at'>) => Promise<void>;
  update: (id: string, updates: Partial<Note>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useNoteStore = create<NoteState>((set, get) => ({
  notes: [],
  loading: false,

  fetch: async (userId) => {
    set({ loading: true });
    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    set({ notes: data ?? [], loading: false });
  },

  create: async (note) => {
    const { data } = await supabase.from('notes').insert(note).select().single();
    if (data) set({ notes: [data, ...get().notes] });
  },

  update: async (id, updates) => {
    await supabase.from('notes').update(updates).eq('id', id);
    set({
      notes: get().notes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
    });
  },

  remove: async (id) => {
    await supabase.from('notes').delete().eq('id', id);
    set({ notes: get().notes.filter((n) => n.id !== id) });
  },
}));
