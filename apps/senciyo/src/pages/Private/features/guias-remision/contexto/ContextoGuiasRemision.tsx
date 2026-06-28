/* eslint-disable react-refresh/only-export-components -- archivo mezcla provider y hook de contexto */
import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { GuiaRemision } from '../modelos/GuiaRemision';
import { guiasRemisionDataSource } from '../api/fuenteDatosGRE';
import { useTenant } from '@/shared/tenant/TenantContext';

interface EstadoGuiasRemision {
  guias: GuiaRemision[];
  cargando: boolean;
}

type AccionGuiasRemision =
  | { type: 'ESTABLECER_GUIAS'; payload: GuiaRemision[] }
  | { type: 'AGREGAR_GUIA'; payload: GuiaRemision }
  | { type: 'ACTUALIZAR_GUIA'; payload: GuiaRemision }
  | { type: 'ELIMINAR_GUIA'; payload: string }
  | { type: 'SET_CARGANDO'; payload: boolean };

function reducer(
  state: EstadoGuiasRemision,
  accion: AccionGuiasRemision,
): EstadoGuiasRemision {
  switch (accion.type) {
    case 'ESTABLECER_GUIAS':
      return { ...state, guias: accion.payload };
    case 'AGREGAR_GUIA':
      return { ...state, guias: [accion.payload, ...state.guias] };
    case 'ACTUALIZAR_GUIA':
      return {
        ...state,
        guias: state.guias.map((g) =>
          g.id === accion.payload.id ? accion.payload : g,
        ),
      };
    case 'ELIMINAR_GUIA':
      return {
        ...state,
        guias: state.guias.filter((g) => g.id !== accion.payload),
      };
    case 'SET_CARGANDO':
      return { ...state, cargando: accion.payload };
    default:
      return state;
  }
}

interface ContextoGuiasRemisionValor {
  state: EstadoGuiasRemision;
  agregarGuia: (guia: GuiaRemision) => Promise<void>;
  actualizarGuia: (guia: GuiaRemision) => Promise<void>;
  eliminarGuia: (id: string) => Promise<void>;
  recargar: () => Promise<void>;
}

const ContextoGuiasRemision =
  createContext<ContextoGuiasRemisionValor | null>(null);

export function GuiasRemisionProvider({ children }: { children: ReactNode }) {
  const { tenantId } = useTenant();
  const [state, dispatch] = useReducer(reducer, {
    guias: [],
    cargando: false,
  });

  const cargar = useCallback(async () => {
    if (!tenantId) return;
    dispatch({ type: 'SET_CARGANDO', payload: true });
    try {
      const guias = await guiasRemisionDataSource.list(tenantId);
      dispatch({ type: 'ESTABLECER_GUIAS', payload: guias });
    } finally {
      dispatch({ type: 'SET_CARGANDO', payload: false });
    }
  }, [tenantId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const agregarGuia = useCallback(
    async (guia: GuiaRemision) => {
      if (!tenantId) return;
      const guardada = await guiasRemisionDataSource.save(tenantId, guia);
      dispatch({ type: 'AGREGAR_GUIA', payload: guardada });
    },
    [tenantId],
  );

  const actualizarGuia = useCallback(
    async (guia: GuiaRemision) => {
      if (!tenantId) return;
      const guardada = await guiasRemisionDataSource.save(tenantId, guia);
      dispatch({ type: 'ACTUALIZAR_GUIA', payload: guardada });
    },
    [tenantId],
  );

  const eliminarGuia = useCallback(
    async (id: string) => {
      if (!tenantId) return;
      await guiasRemisionDataSource.delete(tenantId, id);
      dispatch({ type: 'ELIMINAR_GUIA', payload: id });
    },
    [tenantId],
  );

  const recargar = useCallback(async () => {
    await cargar();
  }, [cargar]);

  return (
    <ContextoGuiasRemision.Provider
      value={{ state, agregarGuia, actualizarGuia, eliminarGuia, recargar }}
    >
      {children}
    </ContextoGuiasRemision.Provider>
  );
}

export function useGuiasRemision(): ContextoGuiasRemisionValor {
  const ctx = useContext(ContextoGuiasRemision);
  if (!ctx) {
    throw new Error(
      'useGuiasRemision debe usarse dentro de GuiasRemisionProvider',
    );
  }
  return ctx;
}

export function useGuiasRemisionOpcional(): ContextoGuiasRemisionValor | null {
  return useContext(ContextoGuiasRemision);
}
