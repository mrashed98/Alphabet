import { create } from 'zustand';
import { Contact } from '../types';
import { supabase } from '../lib/supabase';

/** Returns days until next birthday occurrence (0 = today, negative = already passed this year). */
export function daysUntilBirthday(birthday: string | null): number | null {
  if (!birthday) return null;
  const today = new Date();
  // Support both MM-DD and YYYY-MM-DD
  const parts = birthday.split('-');
  const month = parseInt(parts.length === 3 ? parts[1] : parts[0], 10) - 1;
  const day = parseInt(parts.length === 3 ? parts[2] : parts[1], 10);
  const next = new Date(today.getFullYear(), month, day);
  if (next < today) next.setFullYear(today.getFullYear() + 1);
  return Math.ceil((next.getTime() - today.setHours(0, 0, 0, 0)) / 86_400_000);
}

interface ContactState {
  contacts: Contact[];
  loading: boolean;
  /** Fetch contacts sorted by next birthday occurrence */
  fetch: (userId: string) => Promise<void>;
  create: (contact: Omit<Contact, 'id' | 'created_at'>) => Promise<Contact | null>;
  update: (id: string, updates: Partial<Contact>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

function sortByBirthday(contacts: Contact[]): Contact[] {
  return [...contacts].sort((a, b) => {
    const da = daysUntilBirthday(a.birthday) ?? Infinity;
    const db = daysUntilBirthday(b.birthday) ?? Infinity;
    if (da !== db) return da - db;
    return a.name.localeCompare(b.name);
  });
}

export const useContactStore = create<ContactState>((set, get) => ({
  contacts: [],
  loading: false,

  fetch: async (userId) => {
    set({ loading: true });
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId);
    set({ contacts: sortByBirthday(data ?? []), loading: false });
  },

  create: async (contact) => {
    const { data } = await supabase.from('contacts').insert(contact).select().single();
    if (data) {
      set({ contacts: sortByBirthday([...get().contacts, data]) });
    }
    return data ?? null;
  },

  update: async (id, updates) => {
    await supabase.from('contacts').update(updates).eq('id', id);
    set({
      contacts: sortByBirthday(
        get().contacts.map((c) => (c.id === id ? { ...c, ...updates } : c))
      ),
    });
  },

  remove: async (id) => {
    await supabase.from('contacts').delete().eq('id', id);
    set({ contacts: get().contacts.filter((c) => c.id !== id) });
  },
}));
