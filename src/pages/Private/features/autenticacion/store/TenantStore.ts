// src/features/autenticacion/store/TenantStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Empresa, Establecimiento, WorkspaceContext } from '../types/auth.types';
import type {
  UsuarioEmpresaResumen,
  EstablecimientoDTO,
  EmpresaCompletaDTO,
  ContextoTrabajo
} from '../types/api.types';
import { pickEmpresaActiva, pickEstablecimientoActivo } from '../types/api.types';

interface TenantState {
  empresasResumen: UsuarioEmpresaResumen[];
  establecimientos: EstablecimientoDTO[];
  empresaActiva: UsuarioEmpresaResumen | null;
  establecimientoActivo: EstablecimientoDTO | null;
  empresaCompleta: EmpresaCompletaDTO | null;
  contextoTrabajo: ContextoTrabajo | null;

  empresas: Empresa[];
  contextoActual: WorkspaceContext | null;
  isLoading: boolean;

  setLoginData: (empresas: UsuarioEmpresaResumen[], establecimientos: EstablecimientoDTO[]) => void;
  setEmpresaCompleta: (empresa: EmpresaCompletaDTO | null) => void;
  cambiarEmpresaActiva: (empresaId: string) => void;
  cambiarEstablecimientoActivo: (establecimientoId: string) => void;

  setEmpresas: (empresas: Empresa[]) => void;
  addEmpresa: (empresa: Empresa) => void;
  removeEmpresa: (empresaId: string) => void;
  setContextoActual: (contexto: WorkspaceContext | null) => void;
  setLoading: (value: boolean) => void;
  reset: () => void;

  getEmpresaActual: () => Empresa | null;
  getEstablecimientoActual: () => Establecimiento | null;
  getEstablecimientosByEmpresa: (empresaId: string) => Establecimiento[];
}

const initialState = {
  empresasResumen: [],
  establecimientos: [],
  empresaActiva: null,
  establecimientoActivo: null,
  empresaCompleta: null,
  contextoTrabajo: null,
  empresas: [],
  contextoActual: null,
  isLoading: false,
};

export const useTenantStore = create<TenantState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ==================== ACCIONES NUEVAS ====================

      /**
       * Configura los datos del login (empresas + establecimientos)
       * Aplica automáticamente la regla empresas[0]
       */
      setLoginData: (empresasResumen, establecimientos) => {
        const empresaActiva = pickEmpresaActiva(empresasResumen);
        const establecimientoActivo = pickEstablecimientoActivo(empresaActiva, establecimientos);

        const contextoTrabajo: ContextoTrabajo | null = empresaActiva && establecimientoActivo
          ? {
              empresaId: empresaActiva.empresaId,
              establecimientoId: establecimientoActivo.id,
              empresaRuc: empresaActiva.empresaRuc,
              empresaRazonSocial: empresaActiva.empresaRazonSocial,
              establecimientoNombre: establecimientoActivo.nombre,
            }
          : null;

        set({
          empresasResumen,
          establecimientos,
          empresaActiva,
          establecimientoActivo,
          contextoTrabajo,
        });
      },

      /**
       * Almacena la empresa completa obtenida de GET /empresas/{id}
       */
      setEmpresaCompleta: (empresaCompleta) => {
        set({ empresaCompleta, isLoading: false });
      },

      /**
       * Cambia la empresa activa y actualiza el contexto
       */
      cambiarEmpresaActiva: (empresaId) => {
        const { empresasResumen, establecimientos } = get();
        const empresaActiva = empresasResumen.find(e => e.empresaId === empresaId) || null;
        const establecimientoActivo = pickEstablecimientoActivo(empresaActiva, establecimientos);

        const contextoTrabajo: ContextoTrabajo | null = empresaActiva && establecimientoActivo
          ? {
              empresaId: empresaActiva.empresaId,
              establecimientoId: establecimientoActivo.id,
              empresaRuc: empresaActiva.empresaRuc,
              empresaRazonSocial: empresaActiva.empresaRazonSocial,
              establecimientoNombre: establecimientoActivo.nombre,
            }
          : null;

        set({
          empresaActiva,
          establecimientoActivo,
          contextoTrabajo,
          empresaCompleta: null, // Reset empresa completa al cambiar
        });
      },

      /**
       * Cambia el establecimiento activo
       */
      cambiarEstablecimientoActivo: (establecimientoId) => {
        const { establecimientos, empresaActiva } = get();
        const establecimientoActivo = establecimientos.find(e => e.id === establecimientoId) || null;

        if (!empresaActiva || !establecimientoActivo) return;

        const contextoTrabajo: ContextoTrabajo = {
          empresaId: empresaActiva.empresaId,
          establecimientoId: establecimientoActivo.id,
          empresaRuc: empresaActiva.empresaRuc,
          empresaRazonSocial: empresaActiva.empresaRazonSocial,
          establecimientoNombre: establecimientoActivo.nombre,
        };

        set({ establecimientoActivo, contextoTrabajo });
      },

      // ==================== ACCIONES LEGACY ====================

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
        // Nuevo estado (prioritario)
        empresasResumen: state.empresasResumen,
        establecimientos: state.establecimientos,
        empresaActiva: state.empresaActiva,
        establecimientoActivo: state.establecimientoActivo,
        empresaCompleta: state.empresaCompleta,
        contextoTrabajo: state.contextoTrabajo,

        // Legacy (compatibilidad)
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