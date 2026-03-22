import { create } from 'zustand';
import { Note } from '../types';
import { supabase } from '../lib/supabase';

interface NoteState {
  notes: Note[];
  loading: boolean;
  fetch: (userId: string, habitId?: string | null) => Promise<void>;
  create: (note: Omit<Note, 'id' | 'created_at' | 'updated_at'>) => Promise<Note | null>;
  update: (id: string, updates: Partial<Note>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
}

export const useNoteStore = create<NoteState>((set, get) => ({
  notes: [],
  loading: false,

  fetch: async (userId, habitId) => {
    set({ loading: true });
    let query = supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false });
    if (habitId) {
      query = query.eq('habit_id', habitId);
    }
    const { data } = await query;
    set({ notes: data ?? [], loading: false });
  },

  create: async (note) => {
    const now = new Date().toISOString();
    const { data } = await supabase
      .from('notes')
      .insert({ ...note, created_at: now, updated_at: now })
      .select()
      .single();
    if (data) {
      set({ notes: [data, ...get().notes] });
      return data;
    }
    return null;
  },

  update: async (id, updates) => {
    const now = new Date().toISOString();
    const payload = { ...updates, updated_at: now };
    await supabase.from('notes').update(payload).eq('id', id);
    set({
      notes: get().notes.map((n) => (n.id === id ? { ...n, ...payload } : n)),
    });
  },

  remove: async (id) => {
    await supabase.from('notes').delete().eq('id', id);
    set({ notes: get().notes.filter((n) => n.id !== id) });
  },

  togglePin: async (id) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;
    const newPinned = !note.pinned;
    await supabase.from('notes').update({ pinned: newPinned }).eq('id', id);
    const updated = get().notes
      .map((n) => (n.id === id ? { ...n, pinned: newPinned } : n))
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
    set({ notes: updated });
  },
}));
