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

const NOMBRES_EMPRESA_INVALIDOS = new Set(['pendiente', 'empresa', 'empresa sin nombre']);

const obtenerNombreEmpresa = (empresa: Empresa) =>
  (empresa.razonSocial || empresa.nombreComercial || '').trim();

const esEmpresaValida = (empresa: Empresa) => {
  const nombre = obtenerNombreEmpresa(empresa);
  if (!empresa.id || !nombre) return false;
  return !NOMBRES_EMPRESA_INVALIDOS.has(nombre.toLowerCase());
};

export const filtrarEmpresasValidas = (empresas: Empresa[]) =>
  empresas.filter(esEmpresaValida);

const initialState = {
  empresas: [],
  contextoActual: null,
  isLoading: false,
};

export const useTenantStore = create<TenantState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      setEmpresas: (empresas) => set((state) => {
        const filtradas = filtrarEmpresasValidas(empresas);
        const contextoValido = state.contextoActual
          ? filtradas.some((empresa) => empresa.id === state.contextoActual?.empresaId)
          : true;
        return {
          empresas: filtradas,
          contextoActual: contextoValido ? state.contextoActual : null,
        };
      }),
      
      addEmpresa: (empresa) => set((state) => {
        if (!esEmpresaValida(empresa)) {
          return state;
        }
        return { empresas: [...state.empresas, empresa] };
      }),
      
      removeEmpresa: (empresaId) => set((state) => ({
        empresas: state.empresas.filter(e => e.id !== empresaId),
        contextoActual: state.contextoActual?.empresaId === empresaId 
          ? null 
          : state.contextoActual,
      })),
      
      setContextoActual: (contexto) => set((state) => {
        if (!contexto) return { contextoActual: null };
        const contextoValido = state.empresas.some((empresa) => empresa.id === contexto.empresaId);
        return { contextoActual: contextoValido ? contexto : null };
      }),
      
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
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.setEmpresas(state.empresas);
        state.setContextoActual(state.contextoActual);
      },
    }
  )
);

// ==========================================

// NOTA: Para usar estos stores necesitas instalar zustand
// npm install zustand
// Si no quieres usar zustand, puedo adaptarlo a React Context