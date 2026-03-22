import { create } from 'zustand';
import { Company } from '../types';
import { supabase } from '../lib/supabase';

interface CompanyState {
  companies: Company[];
  loading: boolean;
  fetch: (userId: string) => Promise<void>;
  create: (company: Omit<Company, 'id' | 'created_at'>) => Promise<void>;
  update: (id: string, updates: Partial<Company>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useCompanyStore = create<CompanyState>((set, get) => ({
  companies: [],
  loading: false,

  fetch: async (userId) => {
    set({ loading: true });
    const { data } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });
    set({ companies: data ?? [], loading: false });
  },

  create: async (company) => {
    const { data } = await supabase.from('companies').insert(company).select().single();
    if (data) {
      set({
        companies: [...get().companies, data].sort((a, b) => a.name.localeCompare(b.name)),
      });
    }
  },

  update: async (id, updates) => {
    await supabase.from('companies').update(updates).eq('id', id);
    set({
      companies: get().companies.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    });
  },

  remove: async (id) => {
    await supabase.from('companies').delete().eq('id', id);
    set({ companies: get().companies.filter((c) => c.id !== id) });
  },
}));
