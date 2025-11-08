/* eslint-disable react-refresh/only-export-components -- archivo mezcla context y utilidades; split diferido */
import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
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
import { cajasDataSource } from "../../configuracion-sistema/api/cajasDataSource";
import { useUserSession } from "../../../contexts/UserSessionContext";

interface CajaContextValue {
  // Estado de caja
  status: CajaStatus;
  aperturaActual: AperturaCaja | null;
  movimientos: Movimiento[];

  // Configuración
  margenDescuadre: number;
  setMargenDescuadre: (margen: number) => void;

  // Acciones de caja
  abrirCaja: (apertura: Omit<AperturaCaja, 'id'>) => Promise<void>;
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
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [margenDescuadre, setMargenDescuadre] = useState<number>(1.0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Obtener empresaId y establecimientoId del contexto de sesión
  const { session } = useUserSession();
  const empresaId = session?.currentCompanyId || '';
  const establecimientoId = session?.currentEstablishmentId || '';

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
  const abrirCaja = useCallback(async (apertura: Omit<AperturaCaja, 'id'>) => {
    setIsLoading(true);
    try {
      // Validar autorización del usuario para operar esta caja
      if (empresaId && establecimientoId && apertura.cajaId && session?.userId) {
        try {
          const caja = await cajasDataSource.getById(empresaId, establecimientoId, apertura.cajaId);
          
          // Verificar si el usuario está autorizado
          if (caja && caja.usuariosAutorizados && caja.usuariosAutorizados.length > 0) {
            if (!caja.usuariosAutorizados.includes(session.userId)) {
              showToast(
                "error",
                "No autorizado",
                "No estás autorizado para operar esta caja."
              );
              setIsLoading(false);
              return;
            }
          }
        } catch (error) {
          console.error('Error validando autorización de caja:', error);
          // Continuamos si no podemos verificar (para no bloquear en caso de error de sistema)
        }
      }

      // Simular llamada a API
      await new Promise((resolve) => setTimeout(resolve, 800));

      const nuevaApertura: AperturaCaja = {
        ...apertura,
        id: `apertura-${Date.now()}`,
      };

      setAperturaActual(nuevaApertura);
      setStatus("abierta");
      setMovimientos([]);

      // Actualizar flags en Configuración → Cajas
      if (empresaId && establecimientoId && apertura.cajaId) {
        try {
          await cajasDataSource.update(empresaId, establecimientoId, apertura.cajaId, {
            tieneHistorial: true,
            tieneSesionAbierta: true
          });
        } catch (error) {
          console.error('Error actualizando flags de caja:', error);
          // No bloqueamos la apertura si falla la actualización de flags
          showToast(
            "warning",
            "Advertencia",
            "La caja se abrió pero no se pudieron actualizar todos los registros."
          );
        }
      }

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
  }, [showToast, empresaId, establecimientoId]);

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

      // Validar descuadre
      if (Math.abs(descuadre) > margenDescuadre) {
        throw new DescuadreError(descuadre, margenDescuadre);
      }

      setStatus("cerrada");
      setAperturaActual(null);

      // Actualizar flag de sesión en Configuración → Cajas
      if (empresaId && establecimientoId && aperturaActual.cajaId) {
        try {
          await cajasDataSource.update(empresaId, establecimientoId, aperturaActual.cajaId, {
            tieneSesionAbierta: false
          });
        } catch (error) {
          console.error('Error actualizando flag de sesión:', error);
          // No bloqueamos el cierre si falla la actualización del flag
        }
      }

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
  }, [aperturaActual, movimientos, margenDescuadre, showToast, empresaId, establecimientoId]);

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
      movimientos,
      margenDescuadre,
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
      movimientos,
      margenDescuadre,
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
