import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";
import type {
  CajaStatus,
  AperturaCaja,
  Movimiento,
  ResumenCaja
} from "../models";
import type { ToastMessage, ToastType } from "../components/common/Toast";

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
  cerrarCaja: (montoFinal: number, observaciones?: string) => Promise<void>;

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
      // Simular llamada a API
      await new Promise((resolve) => setTimeout(resolve, 800));

      const nuevaApertura: AperturaCaja = {
        ...apertura,
        id: `apertura-${Date.now()}`,
      };

      setAperturaActual(nuevaApertura);
      setStatus("abierta");
      setMovimientos([]);

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
  }, [showToast]);

  const cerrarCaja = useCallback(async (montoFinal: number, observaciones?: string) => {
    if (!aperturaActual) {
      showToast("error", "Error", "No hay una caja abierta para cerrar.");
      return;
    }

    setIsLoading(true);
    try {
      // Simular llamada a API
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Calcular resumen directamente
      const ingresos = movimientos
        .filter((m) => m.tipo === "Ingreso")
        .reduce((sum, m) => sum + m.monto, 0);
      const egresos = movimientos
        .filter((m) => m.tipo === "Egreso")
        .reduce((sum, m) => sum + m.monto, 0);
      const saldoEsperado = aperturaActual.montoInicialTotal + ingresos - egresos;
      const descuadre = montoFinal - saldoEsperado;

      // Validar descuadre
      if (Math.abs(descuadre) > margenDescuadre) {
        throw new Error(
          `El descuadre de S/ ${descuadre.toFixed(2)} excede el margen permitido de S/ ${margenDescuadre.toFixed(2)}`
        );
      }

      setStatus("cerrada");
      setAperturaActual(null);

      showToast(
        "success",
        "¡Caja cerrada!",
        descuadre === 0
          ? "Cierre realizado sin descuadres."
          : `Cierre realizado con un descuadre de S/ ${descuadre.toFixed(2)}`
      );
    } catch (error) {
      showToast(
        "error",
        "Error al cerrar",
        error instanceof Error ? error.message : "No se pudo cerrar la caja."
      );
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [aperturaActual, movimientos, margenDescuadre, showToast]);

  const agregarMovimiento = useCallback(async (movimiento: Omit<Movimiento, 'id' | 'fecha' | 'cajaId' | 'aperturaId'>) => {
    if (!aperturaActual) {
      showToast("error", "Error", "Debe abrir la caja antes de registrar movimientos.");
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
      showToast(
        "error",
        "Error",
        "No se pudo registrar el movimiento."
      );
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [aperturaActual, showToast]);

  const getResumen = useCallback((): ResumenCaja => {
    if (!aperturaActual) {
      return {
        apertura: 0,
        ingresos: 0,
        egresos: 0,
        saldo: 0,
        totalEfectivo: 0,
        totalTarjeta: 0,
        totalYape: 0,
        totalOtros: 0,
        cantidadMovimientos: 0,
      };
    }

    const ingresos = movimientos
      .filter((m) => m.tipo === "Ingreso")
      .reduce((sum, m) => sum + m.monto, 0);

    const egresos = movimientos
      .filter((m) => m.tipo === "Egreso")
      .reduce((sum, m) => sum + m.monto, 0);

    const totalEfectivo = movimientos
      .filter((m) => m.medioPago === "Efectivo")
      .reduce((sum, m) => (m.tipo === "Ingreso" ? sum + m.monto : sum - m.monto), aperturaActual.montoInicialEfectivo);

    const totalTarjeta = movimientos
      .filter((m) => m.medioPago === "Tarjeta")
      .reduce((sum, m) => (m.tipo === "Ingreso" ? sum + m.monto : sum - m.monto), aperturaActual.montoInicialTarjeta);

    const totalYape = movimientos
      .filter((m) => m.medioPago === "Yape")
      .reduce((sum, m) => (m.tipo === "Ingreso" ? sum + m.monto : sum - m.monto), aperturaActual.montoInicialYape);

    const totalOtros = movimientos
      .filter((m) => !["Efectivo", "Tarjeta", "Yape"].includes(m.medioPago))
      .reduce((sum, m) => (m.tipo === "Ingreso" ? sum + m.monto : sum - m.monto), aperturaActual.montoInicialOtros);

    return {
      apertura: aperturaActual.montoInicialTotal,
      ingresos,
      egresos,
      saldo: aperturaActual.montoInicialTotal + ingresos - egresos,
      totalEfectivo,
      totalTarjeta,
      totalYape,
      totalOtros,
      cantidadMovimientos: movimientos.length,
    };
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
