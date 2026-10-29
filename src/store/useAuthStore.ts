import { create } from 'zustand';
import type { Database } from '@/types/database.types';

export type UserProfile = Database['public']['Tables']['profiles']['Row'];

interface AuthState {
  user: UserProfile | null;
  authReady: boolean; // false selama initial session belum dimuat
  setUser: (user: UserProfile | null) => void;
  setAuthReady: (ready: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  authReady: false,
  setUser: (user) => set({ user }),
  setAuthReady: (authReady) => set({ authReady }),
  logout: () => set({ user: null }),
}));