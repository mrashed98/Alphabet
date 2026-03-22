import { create } from 'zustand';
import { Contact } from '../types';
import { supabase } from '../lib/supabase';

interface ContactState {
  contacts: Contact[];
  loading: boolean;
  fetch: (userId: string) => Promise<void>;
  create: (contact: Omit<Contact, 'id' | 'created_at'>) => Promise<void>;
  update: (id: string, updates: Partial<Contact>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useContactStore = create<ContactState>((set, get) => ({
  contacts: [],
  loading: false,

  fetch: async (userId) => {
    set({ loading: true });
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });
    set({ contacts: data ?? [], loading: false });
  },

  create: async (contact) => {
    const { data } = await supabase.from('contacts').insert(contact).select().single();
    if (data) {
      set({
        contacts: [...get().contacts, data].sort((a, b) => a.name.localeCompare(b.name)),
      });
    }
  },

  update: async (id, updates) => {
    await supabase.from('contacts').update(updates).eq('id', id);
    set({
      contacts: get().contacts.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    });
  },

  remove: async (id) => {
    await supabase.from('contacts').delete().eq('id', id);
    set({ contacts: get().contacts.filter((c) => c.id !== id) });
  },
}));
