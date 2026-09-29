import { create } from 'zustand'

import { persist } from 'zustand/middleware'

export interface UserData {
  id: string;
  email: string;
  fullName?: string;
  employeeId?: string;
  role: string;
  permissions: string[];
  work_arrangement?: string;
  primary_work_location?: any;
}

interface AuthState {
  user: UserData | null;
  setAuth: (user: UserData) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setAuth: (user) => set({ user }),
      clearAuth: () => set({ user: null }),
    }),
    {
      name: 'auth-storage'
    }
  )
);
