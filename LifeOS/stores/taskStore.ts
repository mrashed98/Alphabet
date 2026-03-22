import { create } from 'zustand';
import { Task } from '../types';
import { supabase } from '../lib/supabase';

interface TaskState {
  tasks: Task[];
  loading: boolean;
  fetch: (userId: string) => Promise<void>;
  create: (task: Omit<Task, 'id' | 'created_at'>) => Promise<void>;
  update: (id: string, updates: Partial<Task>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,

  fetch: async (userId) => {
    set({ loading: true });
    const { data } = await supabase
      .from('tasks')
      .select('*, project:projects(id,name,company,color)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    set({ tasks: data ?? [], loading: false });
  },

  create: async (task) => {
    const { data } = await supabase.from('tasks').insert(task).select().single();
    if (data) set({ tasks: [data, ...get().tasks] });
  },

  update: async (id, updates) => {
    await supabase.from('tasks').update(updates).eq('id', id);
    set({
      tasks: get().tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    });
  },

  remove: async (id) => {
    await supabase.from('tasks').delete().eq('id', id);
    set({ tasks: get().tasks.filter((t) => t.id !== id) });
  },
}));
