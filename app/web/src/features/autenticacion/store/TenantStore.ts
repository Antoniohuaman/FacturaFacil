// src/features/autenticacion/store/TenantStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Empresa, Establecimiento, WorkspaceContext } from '../types/auth.types';

/**
 * ============================================
 * TENANT STORE - Estado de Multi-Tenancy
 * ============================================
 */

interface TenantState {
  // Estado
  empresas: Empresa[];
  contextoActual: WorkspaceContext | null;
  isLoading: boolean;
  
  // Acciones
  setEmpresas: (empresas: Empresa[]) => void;
  addEmpresa: (empresa: Empresa) => void;
  removeEmpresa: (empresaId: string) => void;
  setContextoActual: (contexto: WorkspaceContext | null) => void;
  setLoading: (value: boolean) => void;
  reset: () => void;
  
  // Getters
  getEmpresaActual: () => Empresa | null;
  getEstablecimientoActual: () => Establecimiento | null;
  getEstablecimientosByEmpresa: (empresaId: string) => Establecimiento[];
}

const initialState = {
  empresas: [],
  contextoActual: null,
  isLoading: false,
};

export const useTenantStore = create<TenantState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      setEmpresas: (empresas) => set({ empresas }),
      
      addEmpresa: (empresa) => set((state) => ({
        empresas: [...state.empresas, empresa],
      })),
      
      removeEmpresa: (empresaId) => set((state) => ({
        empresas: state.empresas.filter(e => e.id !== empresaId),
        contextoActual: state.contextoActual?.empresaId === empresaId 
          ? null 
          : state.contextoActual,
      })),
      
      setContextoActual: (contexto) => set({ contextoActual: contexto }),
      
      setLoading: (value) => set({ isLoading: value }),
      
      reset: () => set(initialState),
      
      // Getters
      getEmpresaActual: () => {
        const { empresas, contextoActual } = get();
        if (!contextoActual) return null;
        return empresas.find(e => e.id === contextoActual.empresaId) || null;
      },
      
      getEstablecimientoActual: () => {
        const { contextoActual } = get();
        const empresa = get().getEmpresaActual();
        if (!empresa || !contextoActual) return null;
        return empresa.establecimientos.find(
          e => e.id === contextoActual.establecimientoId
        ) || null;
      },
      
      getEstablecimientosByEmpresa: (empresaId) => {
        const { empresas } = get();
        const empresa = empresas.find(e => e.id === empresaId);
        return empresa?.establecimientos || [];
      },
    }),
    {
      name: 'senciyo-tenant-store',
      partialize: (state) => ({
        empresas: state.empresas,
        contextoActual: state.contextoActual,
      }),
    }
  )
);

// ==========================================

// NOTA: Para usar estos stores necesitas instalar zustand
// npm install zustand
// Si no quieres usar zustand, puedo adaptarlo a React Context