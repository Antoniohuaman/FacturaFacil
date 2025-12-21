// src/features/gestion-inventario/stores/usePreferenciasDisponibilidad.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  PreferenciasDisponibilidad,
  VistaGuardada,
  DensidadTabla,
  ColumnaDisponibilidad
} from '../models/disponibilidad.types';

/**
 * Columnas por defecto visibles en la tabla
 */
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

/**
 * Preferencias iniciales
 */
const PREFERENCIAS_INICIALES: PreferenciasDisponibilidad = {
  densidad: 'compacta',
  columnasVisibles: COLUMNAS_VISIBLES_POR_DEFECTO,
  vistasGuardadas: [],
  itemsPorPagina: 25
};

interface PreferenciasDisponibilidadState extends PreferenciasDisponibilidad {
  // Acciones para densidad
  cambiarDensidad: (densidad: DensidadTabla) => void;

  // Acciones para columnas
  toggleColumna: (columna: ColumnaDisponibilidad) => void;
  mostrarTodasColumnas: () => void;
  ocultarTodasColumnasOpcionales: () => void;

  // Acciones para vistas guardadas
  guardarVista: (vista: Omit<VistaGuardada, 'id' | 'fechaCreacion'>) => void;
  eliminarVista: (vistaId: string) => void;
  activarVista: (vistaId: string) => void;
  desactivarVista: () => void;
  aplicarVista: (vista: VistaGuardada) => void;

  // Acciones para items por página
  cambiarItemsPorPagina: (items: number) => void;

  // Reset
  resetearPreferencias: () => void;
}

/**
 * Store de preferencias de disponibilidad
 * Persiste en localStorage automáticamente
 */
export const usePreferenciasDisponibilidad = create<PreferenciasDisponibilidadState>()(
  persist(
    (set, get) => ({
      ...PREFERENCIAS_INICIALES,

      // Cambiar densidad de la tabla
      cambiarDensidad: (densidad) => {
        set({ densidad });
      },

      // Toggle visibilidad de columna
      toggleColumna: (columna) => {
        set((state) => {
          const columnas = state.columnasVisibles;
          const existe = columnas.includes(columna);

          // No permitir ocultar todas las columnas
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

      // Mostrar todas las columnas
      mostrarTodasColumnas: () => {
        set({ columnasVisibles: TODAS_LAS_COLUMNAS });
      },

      // Ocultar columnas opcionales (mantener solo código, producto, disponible, acciones)
      ocultarTodasColumnasOpcionales: () => {
        set({
          columnasVisibles: ['codigo', 'producto', 'unidadMinima', 'disponible', 'acciones']
        });
      },

      // Guardar nueva vista
      guardarVista: (vista) => {
        const nuevaVista: VistaGuardada = {
          ...vista,
          id: `vista-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          fechaCreacion: new Date()
        };

        set((state) => ({
          vistasGuardadas: [...state.vistasGuardadas, nuevaVista]
        }));

        return nuevaVista.id;
      },

      // Eliminar vista guardada
      eliminarVista: (vistaId) => {
        set((state) => ({
          vistasGuardadas: state.vistasGuardadas.filter(v => v.id !== vistaId),
          vistaActivaId: state.vistaActivaId === vistaId ? undefined : state.vistaActivaId
        }));
      },

      // Activar vista
      activarVista: (vistaId) => {
        const vista = get().vistasGuardadas.find(v => v.id === vistaId);
        if (vista) {
          set({ vistaActivaId: vistaId });
          get().aplicarVista(vista);
        }
      },

      // Desactivar vista
      desactivarVista: () => {
        set({ vistaActivaId: undefined });
      },

      // Aplicar configuración de una vista
      aplicarVista: (vista) => {
        set({
          columnasVisibles: vista.columnasVisibles,
          densidad: vista.densidad
        });
      },

      // Cambiar items por página
      cambiarItemsPorPagina: (items) => {
        set({ itemsPorPagina: items });
      },

      // Resetear a preferencias por defecto
      resetearPreferencias: () => {
        set({
          ...PREFERENCIAS_INICIALES,
          vistasGuardadas: get().vistasGuardadas, // Mantener vistas guardadas
          vistaActivaId: undefined
        });
      }
    }),
    {
      name: 'inventario-disponibilidad-preferencias', // Clave en localStorage
      version: 1
    }
  )
);
