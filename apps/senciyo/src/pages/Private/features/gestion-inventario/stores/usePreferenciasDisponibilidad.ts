// src/features/gestion-inventario/stores/usePreferenciasDisponibilidad.ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  PreferenciasDisponibilidad,
  DensidadTabla,
  ColumnaDisponibilidad
} from '../models/disponibilidad.types';
import { lsKey } from '../../../../../shared/tenant';

const TODAS_LAS_COLUMNAS: ColumnaDisponibilidad[] = [
  'codigo',
  'producto',
  'unidadMinima',
  'real',
  'reservado',
  'disponible',
  'stockMinimo',
  'stockMaximo',
  'situacion',
  'acciones'
];

const COLUMNAS_VISIBLES_POR_DEFECTO: ColumnaDisponibilidad[] = [
  'codigo',
  'producto',
  'unidadMinima',
  'real',
  'reservado',
  'disponible',
  'situacion',
  'acciones'
];

const PREFERENCIAS_INICIALES: PreferenciasDisponibilidad = {
  densidad: 'compacta',
  columnasVisibles: COLUMNAS_VISIBLES_POR_DEFECTO,
  mostrarColumnasPorAlmacen: true,
  itemsPorPagina: 25
};

const STORAGE_KEY = 'inventario-disponibilidad-preferencias';

const tenantAwareStorage = () => ({
  getItem: (name: string) => {
    if (typeof window === 'undefined') {
      return null;
    }
    const scoped = resolveTenantStorageKey(name);
    if (!scoped) {
      return null;
    }
    return window.localStorage.getItem(scoped);
  },
  setItem: (name: string, value: string) => {
    if (typeof window === 'undefined') {
      return;
    }
    const scoped = resolveTenantStorageKey(name);
    if (!scoped) {
      return;
    }
    window.localStorage.setItem(scoped, value);
  },
  removeItem: (name: string) => {
    if (typeof window === 'undefined') {
      return;
    }
    const scoped = resolveTenantStorageKey(name);
    if (!scoped) {
      return;
    }
    window.localStorage.removeItem(scoped);
  }
});

const resolveTenantStorageKey = (base: string): string | null => {
  try {
    const scoped = lsKey(base);
    if (typeof window !== 'undefined') {
      const legacyValue = window.localStorage.getItem(base);
      if (legacyValue !== null && window.localStorage.getItem(scoped) === null) {
        window.localStorage.setItem(scoped, legacyValue);
        window.localStorage.removeItem(base);
      }
    }
    return scoped;
  } catch {
    return null;
  }
};

interface PreferenciasDisponibilidadState extends PreferenciasDisponibilidad {
  cambiarDensidad: (densidad: DensidadTabla) => void;

  toggleColumna: (columna: ColumnaDisponibilidad) => void;
  mostrarTodasColumnas: () => void;
  ocultarTodasColumnasOpcionales: () => void;

  toggleColumnasPorAlmacen: () => void;

  cambiarItemsPorPagina: (items: number) => void;

  resetearPreferencias: () => void;
}

export const usePreferenciasDisponibilidad = create<PreferenciasDisponibilidadState>()(
  persist(
    (set) => ({
      ...PREFERENCIAS_INICIALES,

      cambiarDensidad: (densidad) => {
        set({ densidad });
      },

      toggleColumna: (columna) => {
        set((state) => {
          const columnas = state.columnasVisibles;
          const existe = columnas.includes(columna);

          if (existe && columnas.length === 1) {
            return state;
          }

          return {
            columnasVisibles: existe
              ? columnas.filter(c => c !== columna)
              : [...columnas, columna]
          };
        });
      },

      mostrarTodasColumnas: () => {
        set({ columnasVisibles: TODAS_LAS_COLUMNAS, mostrarColumnasPorAlmacen: true });
      },

      ocultarTodasColumnasOpcionales: () => {
        set({
          columnasVisibles: ['codigo', 'producto', 'unidadMinima', 'disponible', 'acciones'],
          mostrarColumnasPorAlmacen: false
        });
      },

      toggleColumnasPorAlmacen: () => {
        set((state) => ({ mostrarColumnasPorAlmacen: !state.mostrarColumnasPorAlmacen }));
      },

      cambiarItemsPorPagina: (items) => {
        set({ itemsPorPagina: items });
      },

      resetearPreferencias: () => {
        set({ ...PREFERENCIAS_INICIALES });
      }
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(tenantAwareStorage),
    }
  )
);
