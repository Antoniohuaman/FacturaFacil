// src/features/autenticacion/store/AuthStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types/auth.types';

/**
 * ============================================
 * AUTH STORE - Estado Global de Autenticación
 * ============================================
 */

export type AuthStatus = 
  | 'idle' 
  | 'loading' 
  | 'authenticated' 
  | 'unauthenticated' 
  | 'requires_2fa'
  | 'requires_workspace';

interface AuthState {
  // Estado
  user: User | null;
  isAuthenticated: boolean;
  hasWorkspace: boolean;
  require2FA: boolean;
  status: AuthStatus;
  error: string | null;
  
  // Acciones
  setUser: (user: User | null) => void;
  setAuthenticated: (value: boolean) => void;
  setHasWorkspace: (value: boolean) => void;
  setRequire2FA: (value: boolean) => void;
  setStatus: (status: AuthStatus) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  user: null,
  isAuthenticated: false,
  hasWorkspace: false,
  require2FA: false,
  status: 'idle' as AuthStatus,
  error: null,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...initialState,
      
      setUser: (user) => set({ user }),
      
      setAuthenticated: (value) => set({ 
        isAuthenticated: value,
        status: value ? 'authenticated' : 'unauthenticated',
      }),
      
      setHasWorkspace: (value) => set({ hasWorkspace: value }),
      
      setRequire2FA: (value) => set({ 
        require2FA: value,
        status: value ? 'requires_2fa' : 'authenticated',
      }),
      
      setStatus: (status) => set({ status }),
      
      setError: (error) => set({ error }),
      
      clearError: () => set({ error: null }),
      
      reset: () => set(initialState),
    }),
    {
      name: 'senciyo-auth-store',
      partialize: (state) => ({
        user: state.user,
        hasWorkspace: state.hasWorkspace,
      }),
    }
  )
);
