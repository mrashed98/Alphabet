import { create } from 'zustand';
import { TaskTag } from '../types';
import { supabase } from '../lib/supabase';

interface TaskTagState {
  tags: TaskTag[];
  loading: boolean;
  fetch: (userId: string) => Promise<void>;
  create: (tag: Omit<TaskTag, 'id' | 'created_at'>) => Promise<void>;
  update: (id: string, updates: Partial<TaskTag>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  assignToTask: (taskId: string, tagId: string) => Promise<void>;
  removeFromTask: (taskId: string, tagId: string) => Promise<void>;
}

export const useTaskTagStore = create<TaskTagState>((set, get) => ({
  tags: [],
  loading: false,

  fetch: async (userId) => {
    set({ loading: true });
    const { data } = await supabase
      .from('task_tags')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });
    set({ tags: data ?? [], loading: false });
  },

  create: async (tag) => {
    const { data } = await supabase.from('task_tags').insert(tag).select().single();
    if (data) {
      set({
        tags: [...get().tags, data].sort((a, b) => a.name.localeCompare(b.name)),
      });
    }
  },

  update: async (id, updates) => {
    await supabase.from('task_tags').update(updates).eq('id', id);
    set({
      tags: get().tags.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    });
  },

  remove: async (id) => {
    await supabase.from('task_tags').delete().eq('id', id);
    set({ tags: get().tags.filter((t) => t.id !== id) });
  },

  assignToTask: async (taskId, tagId) => {
    await supabase.from('task_tag_assignments').insert({ task_id: taskId, tag_id: tagId });
  },

  removeFromTask: async (taskId, tagId) => {
    await supabase
      .from('task_tag_assignments')
      .delete()
      .eq('task_id', taskId)
      .eq('tag_id', tagId);
  },
}));
