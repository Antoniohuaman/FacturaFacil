/* eslint-disable react-refresh/only-export-components -- archivo mezcla provider y hook de contexto */
import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type { GuiaRemision } from '../modelos/GuiaRemision';
import { guiasRemisionDataSource } from '../api/fuenteDatosGRE';
import { useTenant } from '@/shared/tenant/TenantContext';
import { useUserSession } from '@/contexts/UserSessionContext';
import { useConfigurationContext } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import { obtenerUsuarioDesdeSesion, tienePermiso } from '../../configuracion-sistema/utilidades/permisos';

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
  const { session } = useUserSession();
  const { state: configState, rolesConfigurados } = useConfigurationContext();
  const [state, dispatch] = useReducer(reducer, {
    guias: [],
    cargando: false,
  });

  // Misma fuente de permisos reales que `PermisoGuard` (rutas) — cada comando de este contexto
  // vuelve a verificar el permiso aquí, así que un mismo control real protege tanto el guard de
  // rutas como una llamada directa a este contexto (componente o consola) sin pasar por él.
  // `ventas.gre.emitir` ya cubre crear/editar/emitir; se reutiliza también para anular, eliminar
  // borrador y duplicar (GRE-P1-004) — no existe hoy una necesidad funcional real de granularidad
  // adicional (los 3 roles de sistema no la requieren).
  const usuarioActual = useMemo(
    () => obtenerUsuarioDesdeSesion(configState.users, session),
    [configState.users, session],
  );

  const verificarPermisoGRE = useCallback(
    (mensajeError: string) => {
      const autorizado = tienePermiso({
        usuario: usuarioActual,
        permisoId: 'ventas.gre.emitir',
        rolesDisponibles: rolesConfigurados,
        establecimientoId: session?.currentEstablecimientoId,
      });
      if (!autorizado) {
        throw new Error(mensajeError);
      }
    },
    [usuarioActual, rolesConfigurados, session?.currentEstablecimientoId],
  );

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
      verificarPermisoGRE('No tienes permiso para crear ni duplicar guías de remisión.');
      const guardada = await guiasRemisionDataSource.save(tenantId, guia);
      dispatch({ type: 'AGREGAR_GUIA', payload: guardada });
    },
    [tenantId, verificarPermisoGRE],
  );

  const actualizarGuia = useCallback(
    async (guia: GuiaRemision) => {
      if (!tenantId) return;
      verificarPermisoGRE('No tienes permiso para modificar, emitir o anular guías de remisión.');
      const guardada = await guiasRemisionDataSource.save(tenantId, guia);
      dispatch({ type: 'ACTUALIZAR_GUIA', payload: guardada });
    },
    [tenantId, verificarPermisoGRE],
  );

  const eliminarGuia = useCallback(
    async (id: string) => {
      if (!tenantId) return;
      verificarPermisoGRE('No tienes permiso para eliminar borradores de guías de remisión.');
      await guiasRemisionDataSource.delete(tenantId, id);
      dispatch({ type: 'ELIMINAR_GUIA', payload: id });
    },
    [tenantId, verificarPermisoGRE],
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
