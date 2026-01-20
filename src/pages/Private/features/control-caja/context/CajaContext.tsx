/* eslint-disable react-refresh/only-export-components -- archivo mezcla context y utilidades; split diferido */
import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef, type ReactNode } from "react";
import type {
  CajaStatus,
  AperturaCaja,
  Movimiento,
  ResumenCaja,
  CierreCaja
} from "../models";
import type { ToastMessage, ToastType } from "../components/common/Toast";
import { calcularResumenCaja } from "../utils/calculations";
import { DescuadreError, CajaCerradaError, handleCajaError } from "../utils/errors";
import { lsKey } from "../../../../../shared/tenant";
import { useTenant } from "../../../../../shared/tenant/TenantContext";
import { useConfigurationContext } from "../../configuracion-sistema/contexto/ContextoConfiguracion";
import { useCurrentCompanyId, useCurrentEstablecimientoId } from "../../../../../contexts/UserSessionContext";
import { resolveActiveCajaForEstablecimiento, NoActiveCajaError } from "../../configuracion-sistema/utilidades/seleccionCaja";
import type { MedioPago } from "../../../../../shared/payments/medioPago";

type PersistedMovimiento = Omit<Movimiento, 'fecha'> & { fecha: string };

const STORAGE_KEYS = {
  historialMovimientos: "control_caja_historial_movimientos",
} as const;

const getStorageKey = (
  base: string,
  empresaId?: string | null,
  options?: { allowFallback?: boolean }
): string | null => {
  try {
    return lsKey(base, empresaId ?? undefined);
  } catch {
    if (options?.allowFallback) {
      return base;
    }
    return null;
  }
};

const serializeMovimientos = (movimientos: Movimiento[]): PersistedMovimiento[] =>
  movimientos.map((movimiento) => ({
    ...movimiento,
    fecha: movimiento.fecha.toISOString(),
  }));

const deserializeMovimientos = (raw: PersistedMovimiento[] | null | undefined): Movimiento[] =>
  (Array.isArray(raw) ? raw : [])
    .map((movimiento) => ({
      ...movimiento,
      fecha: new Date(movimiento.fecha),
    }))
    .filter((movimiento) => !Number.isNaN(movimiento.fecha.getTime()));

const sortMovimientosByFechaDesc = (movimientos: Movimiento[]): Movimiento[] =>
  [...movimientos].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

interface CajaContextValue {
  // Estado de caja
  status: CajaStatus;
  aperturaActual: AperturaCaja | null;
  activeCajaId: string | null;
  activeCajaMediosPago: MedioPago[];
  movimientos: Movimiento[];
  historialMovimientos: Movimiento[];
  historialCargado: boolean;

  // Configuración
  margenDescuadre: number;
  setMargenDescuadre: (margen: number) => void;

  // Acciones de caja
  abrirCaja: (apertura: Omit<AperturaCaja, 'id' | 'cajaId'>) => Promise<void>;
  cerrarCaja: (cierreCaja: Omit<CierreCaja, 'id' | 'aperturaId'>) => Promise<void>;

  // Movimientos
  agregarMovimiento: (movimiento: Omit<Movimiento, 'id' | 'fecha' | 'cajaId' | 'aperturaId'>) => Promise<void>;

  // Resumen y cálculos
  getResumen: () => ResumenCaja;

  // Toasts
  toasts: ToastMessage[];
  showToast: (type: ToastType, title: string, message: string, duration?: number) => void;
  removeToast: (id: string) => void;

  // Loading states
  isLoading: boolean;
}

const CajaContext = createContext<CajaContextValue | undefined>(undefined);

export const useCaja = () => {
  const context = useContext(CajaContext);
  if (!context) {
    throw new Error("useCaja debe usarse dentro de CajaProvider");
  }
  return context;
};

interface CajaProviderProps {
  children: ReactNode;
}

export const CajaProvider = ({ children }: CajaProviderProps) => {
  // Estados principales
  const [status, setStatus] = useState<CajaStatus>("cerrada");
  const [aperturaActual, setAperturaActual] = useState<AperturaCaja | null>(null);
  const [activeCajaId, setActiveCajaId] = useState<string | null>(null);
  const [activeCajaMediosPago, setActiveCajaMediosPago] = useState<MedioPago[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [historialMovimientos, setHistorialMovimientos] = useState<Movimiento[]>([]);
  const [historialHydrated, setHistorialHydrated] = useState(false);
  const { tenantId } = useTenant();
  const { state: configurationState } = useConfigurationContext();
  const empresaId = useCurrentCompanyId();
  const establecimientoId = useCurrentEstablecimientoId();
  const lastTenantIdRef = useRef<string | null>(null);
  const lastScopeRef = useRef<string | null>(null);

  const historialKeyBase = useMemo(() => {
    if (!empresaId || !establecimientoId || !activeCajaId) {
      return null;
    }

    // El historial se persiste por empresa + establecimiento + caja.
    return `${STORAGE_KEYS.historialMovimientos}:${establecimientoId}:${activeCajaId}`;
  }, [empresaId, establecimientoId, activeCajaId]);

  useEffect(() => {
    if (historialHydrated || typeof window === "undefined") {
      return;
    }

    try {
      if (!historialKeyBase) {
        setHistorialHydrated(true);
        return;
      }

      const storageKey = getStorageKey(historialKeyBase, empresaId, { allowFallback: true });
      if (!storageKey) {
        setHistorialHydrated(true);
        return;
      }
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as PersistedMovimiento[];
        const movimientosPersistidos = deserializeMovimientos(parsed);
        setHistorialMovimientos((prev) => {
          if (prev.length === 0) {
            return sortMovimientosByFechaDesc(movimientosPersistidos);
          }

          const existentes = new Set(prev.map((mov) => mov.id));
          const merged = [...prev];
          movimientosPersistidos.forEach((movimiento) => {
            if (!existentes.has(movimiento.id)) {
              merged.push(movimiento);
            }
          });
          return sortMovimientosByFechaDesc(merged);
        });
      }
    } catch (error) {
      console.warn("[Caja] No se pudo cargar el historial de movimientos", error);
    } finally {
      setHistorialHydrated(true);
    }
  }, [historialHydrated, tenantId, empresaId, historialKeyBase]);

  useEffect(() => {
    if (!historialHydrated || typeof window === "undefined") {
      return;
    }

    try {
      if (!historialKeyBase) {
        return;
      }

      const storageKey = getStorageKey(historialKeyBase, empresaId);
      if (!storageKey) {
        return;
      }
      const serialized = JSON.stringify(serializeMovimientos(historialMovimientos));
      window.localStorage.setItem(storageKey, serialized);
    } catch (error) {
      console.warn("[Caja] No se pudo persistir el historial de movimientos", error);
    }
  }, [historialHydrated, historialMovimientos, tenantId, empresaId, historialKeyBase]);

  useEffect(() => {
    if (lastTenantIdRef.current === tenantId) {
      return;
    }
    lastTenantIdRef.current = tenantId ?? null;
    lastScopeRef.current = null;

    setStatus("cerrada");
    setAperturaActual(null);
    setMovimientos([]);
    setHistorialMovimientos([]);
    setHistorialHydrated(false);
  }, [tenantId]);

  useEffect(() => {
    const scope = `${empresaId ?? ""}:${establecimientoId ?? ""}:${activeCajaId ?? ""}`;
    if (!empresaId || !establecimientoId || !activeCajaId) {
      lastScopeRef.current = scope;
      return;
    }

    if (lastScopeRef.current === scope) {
      return;
    }

    // Cambio de scope operativo: evitar fugas de estado entre empresa/establecimiento/caja.
    lastScopeRef.current = scope;
    setStatus("cerrada");
    setAperturaActual(null);
    setMovimientos([]);
    setHistorialMovimientos([]);
    setHistorialHydrated(false);
  }, [empresaId, establecimientoId, activeCajaId]);

  const [margenDescuadre, setMargenDescuadre] = useState<number>(1.0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Resolver caja activa desde configuración de sistema
  useEffect(() => {
    // Si aún no hay empresa/establecimiento seleccionados (onboarding, tenant recién creado),
    // dejamos la caja en un estado seguro sin intentar resolver configuración.
    if (!empresaId || !establecimientoId) {
      setActiveCajaId(null);
      setActiveCajaMediosPago([]);
      return;
    }

    try {
      const activeCaja = resolveActiveCajaForEstablecimiento({
        empresaId,
        establecimientoId,
        cajas: configurationState.cajas ?? [],
      });
      setActiveCajaId(activeCaja.id);
      setActiveCajaMediosPago(activeCaja.mediosPagoPermitidos);
      // Margen de descuadre se interpreta como porcentaje (0-50).
      // Margen permitido en monto = (margenDescuadre / 100) * saldoEsperado.
      setMargenDescuadre(activeCaja.margenDescuadreCaja);
    } catch (error) {
      if (error instanceof NoActiveCajaError) {
        console.error('[Caja] No se pudo resolver caja activa:', error.message);
      } else {
        console.error('[Caja] Error inesperado al resolver caja activa:', error);
      }
      setActiveCajaId(null);
      setActiveCajaMediosPago([]);
    }
  }, [empresaId, establecimientoId, configurationState.cajas]);

  // Funciones de toast
  const showToast = useCallback((type: ToastType, title: string, message: string, duration: number = 5000) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: ToastMessage = { id, type, title, message, duration };
    setToasts((prev) => [...prev, newToast]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Funciones de caja
  const abrirCaja = useCallback(async (apertura: Omit<AperturaCaja, 'id' | 'cajaId'>) => {
    if (!activeCajaId) {
      const error = new NoActiveCajaError();
      showToast("error", "Error", error.message);
      throw error;
    }

    setIsLoading(true);
    try {
      // TODO: Validación de autorización debe hacerse en la página que llama a abrirCaja
      // (donde se tiene acceso a useUserSession)
      
      // Simular llamada a API
      await new Promise((resolve) => setTimeout(resolve, 800));

      const nuevaApertura: AperturaCaja = {
        ...apertura,
        id: `apertura-${Date.now()}`,
        cajaId: activeCajaId,
      };

      setAperturaActual(nuevaApertura);
      setStatus("abierta");
      setMovimientos([]);

      // TODO: Actualización de flags (tieneHistorial, tieneSesionAbierta) debe hacerse
      // desde la página que tiene acceso a empresaId/establecimientoId

      showToast(
        "success",
        "¡Caja abierta!",
        `Caja abierta exitosamente con un monto inicial de S/ ${apertura.montoInicialTotal.toFixed(2)}`
      );
    } catch (error) {
      showToast(
        "error",
        "Error",
        "No se pudo abrir la caja. Por favor, intente nuevamente."
      );
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [activeCajaId, showToast]);

  const cerrarCaja = useCallback(async (cierreCaja: Omit<CierreCaja, 'id' | 'aperturaId'>) => {
    if (!aperturaActual) {
      const error = new CajaCerradaError();
      showToast("error", "Error", error.message);
      return;
    }

    setIsLoading(true);
    try {
      // Simular llamada a API con el objeto completo de cierre
      await new Promise((resolve) => setTimeout(resolve, 800));

      const resumen = calcularResumenCaja(aperturaActual, movimientos);
      const descuadre = cierreCaja.montoFinalTotal - resumen.saldo;

      // Interpretar margenDescuadre como porcentaje (0-50).
      // Margen permitido en monto = (margenDescuadre / 100) * saldo esperado.
      const margenPermitidoEnMonto = (margenDescuadre / 100) * Math.abs(resumen.saldo);

      if (Math.abs(descuadre) > margenPermitidoEnMonto) {
        throw new DescuadreError(descuadre, margenPermitidoEnMonto);
      }

      setStatus("cerrada");
      setAperturaActual(null);

      // TODO: Actualización de flag tieneSesionAbierta debe hacerse desde la página
      // que tiene acceso a empresaId/establecimientoId

      showToast(
        "success",
        "¡Caja cerrada!",
        descuadre === 0
          ? "Cierre realizado sin descuadres."
          : `Cierre realizado con un descuadre de S/ ${descuadre.toFixed(2)}`
      );
    } catch (error) {
      const errorMessage = handleCajaError(error);
      showToast("error", "Error al cerrar", errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [aperturaActual, movimientos, margenDescuadre, showToast]);

  const agregarMovimiento = useCallback(async (movimiento: Omit<Movimiento, 'id' | 'fecha' | 'cajaId' | 'aperturaId'>) => {
    if (!aperturaActual) {
      const error = new CajaCerradaError();
      showToast("error", "Error", error.message);
      return;
    }

    setIsLoading(true);
    try {
      // Simular llamada a API
      await new Promise((resolve) => setTimeout(resolve, 500));

      const nuevoMovimiento: Movimiento = {
        ...movimiento,
        id: `mov-${Date.now()}`,
        cajaId: aperturaActual.cajaId,
        aperturaId: aperturaActual.id,
        fecha: new Date(),
      };

      setMovimientos((prev) => [nuevoMovimiento, ...prev]);
      setHistorialMovimientos((prev) => [nuevoMovimiento, ...prev]);

      showToast(
        "success",
        "Movimiento registrado",
        `${movimiento.tipo} de S/ ${movimiento.monto.toFixed(2)} registrado correctamente.`
      );
    } catch (error) {
      const errorMessage = handleCajaError(error);
      showToast("error", "Error", errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [aperturaActual, showToast]);

  const getResumen = useCallback((): ResumenCaja => {
    return calcularResumenCaja(aperturaActual, movimientos);
  }, [aperturaActual, movimientos]);

  const value = useMemo(
    () => ({
      status,
      aperturaActual,
      activeCajaId,
      activeCajaMediosPago,
      movimientos,
      margenDescuadre,
      historialMovimientos,
      historialCargado: historialHydrated,
      setMargenDescuadre,
      abrirCaja,
      cerrarCaja,
      agregarMovimiento,
      getResumen,
      toasts,
      showToast,
      removeToast,
      isLoading,
    }),
    [
      status,
      aperturaActual,
      activeCajaId,
      activeCajaMediosPago,
      movimientos,
      margenDescuadre,
      historialMovimientos,
      historialHydrated,
      abrirCaja,
      cerrarCaja,
      agregarMovimiento,
      getResumen,
      toasts,
      showToast,
      removeToast,
      isLoading,
    ]
  );

  return <CajaContext.Provider value={value}>{children}</CajaContext.Provider>;
};
