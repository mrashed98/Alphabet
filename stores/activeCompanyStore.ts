import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ActiveCompanyState {
  activeCompanyId: string | null;
  setActiveCompanyId: (id: string | null) => void;
}

export const useActiveCompanyStore = create<ActiveCompanyState>()(
  persist(
    (set) => ({
      activeCompanyId: null,
      setActiveCompanyId: (id) => set({ activeCompanyId: id }),
    }),
    {
      name: 'lifeos-active-company',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
