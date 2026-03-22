import { create } from 'zustand';
import { Project } from '../types';
import { supabase } from '../lib/supabase';

interface ProjectState {
  projects: Project[];
  loading: boolean;
  fetch: (userId: string) => Promise<void>;
  create: (project: Omit<Project, 'id' | 'created_at'>) => Promise<void>;
  update: (id: string, updates: Partial<Project>) => Promise<void>;
  archive: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  loading: false,

  fetch: async (userId) => {
    set({ loading: true });
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .is('archived_at', null)
      .order('name', { ascending: true });
    set({ projects: data ?? [], loading: false });
  },

  create: async (project) => {
    const { data } = await supabase.from('projects').insert(project).select().single();
    if (data) {
      set({
        projects: [...get().projects, data].sort((a, b) => a.name.localeCompare(b.name)),
      });
    }
  },

  update: async (id, updates) => {
    await supabase.from('projects').update(updates).eq('id', id);
    set({
      projects: get().projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    });
  },

  archive: async (id) => {
    const archived_at = new Date().toISOString();
    await supabase.from('projects').update({ archived_at }).eq('id', id);
    set({ projects: get().projects.filter((p) => p.id !== id) });
  },

  remove: async (id) => {
    await supabase.from('projects').delete().eq('id', id);
    set({ projects: get().projects.filter((p) => p.id !== id) });
  },
}));
