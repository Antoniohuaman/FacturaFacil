import { useMemo, useState } from 'react';
import { useCobranzasContext } from '../context/CobranzasContext';
import type {
  CobranzaDocumento,
  CobranzaFilters,
  CobranzaTabKey,
  CobranzasSummary,
  CobranzaStatus,
  CuentaPorCobrarSummary,
} from '../models/cobranzas.types';
import { DEFAULT_COBRANZA_FILTERS } from '../utils/constants';

const textIncludes = (value: string, search: string) =>
  value.toLowerCase().includes(search.trim().toLowerCase());

const inRange = (date: string, from: string, to: string) => {
  if (!from && !to) return true;
  const time = new Date(date).getTime();
  const fromTime = from ? new Date(from).getTime() : Number.NEGATIVE_INFINITY;
  const toTime = to ? new Date(to).getTime() : Number.POSITIVE_INFINITY;
  return time >= fromTime && time <= toTime;
};

const ALLOWED_ACCOUNT_STATES: CobranzaStatus[] = ['pendiente', 'parcial', 'vencido'];
const INSTALLMENT_TOLERANCE = 0.01;

const hasPendingInstallments = (cuenta: CuentaPorCobrarSummary) => {
  if (typeof cuenta.pendingInstallmentsCount === 'number') {
    return cuenta.pendingInstallmentsCount > 0;
  }

  if (cuenta.installments?.length) {
    return cuenta.installments.some((installment) => installment.remaining > INSTALLMENT_TOLERANCE);
  }

  return false;
};

const hasOutstandingBalance = (cuenta: CuentaPorCobrarSummary) => cuenta.saldo > INSTALLMENT_TOLERANCE;

const shouldDisplayCuenta = (cuenta: CuentaPorCobrarSummary) => {
  if (!ALLOWED_ACCOUNT_STATES.includes(cuenta.estado)) {
    return false;
  }

  return hasPendingInstallments(cuenta) || hasOutstandingBalance(cuenta);
};

const isFullyPaidCobranza = (cobranza: CobranzaDocumento) => {
  if (cobranza.estado === 'cancelado') {
    return true;
  }

  if (typeof cobranza.installmentsInfo?.pending === 'number') {
    return cobranza.installmentsInfo.pending <= 0;
  }

  return false;
};

type CobranzaWithDisplayAmount = CobranzaDocumento & { displayAmount: number };

export const useCobranzasDashboard = () => {
  const { cuentas, cobranzas, registerCobranza } = useCobranzasContext();
  const [activeTab, setActiveTab] = useState<CobranzaTabKey>('cuentas');
  const [filters, setFilters] = useState<CobranzaFilters>(DEFAULT_COBRANZA_FILTERS);

  const handleFilterChange = <K extends keyof CobranzaFilters>(key: K, value: CobranzaFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleDateChange = (key: 'from' | 'to', value: string) => {
    setFilters((prev) => ({
      ...prev,
      rangoFechas: {
        ...prev.rangoFechas,
        [key]: value,
      },
    }));
  };

  const resetFilters = () => setFilters(DEFAULT_COBRANZA_FILTERS);

  const cuentasPorComprobante = useMemo(() => {
    return cuentas.reduce<Record<string, CuentaPorCobrarSummary>>((acc, cuenta) => {
      acc[cuenta.comprobanteId] = cuenta;
      return acc;
    }, {});
  }, [cuentas]);

  const filteredCuentas = useMemo(() => {
    return cuentas.filter((cuenta) => {
      if (!shouldDisplayCuenta(cuenta)) {
        return false;
      }

      if (!inRange(cuenta.fechaEmision, filters.rangoFechas.from, filters.rangoFechas.to)) {
        return false;
      }

      if (filters.cliente && !textIncludes(`${cuenta.clienteNombre} ${cuenta.clienteDocumento}`, filters.cliente)) {
        return false;
      }

      if (filters.estado !== 'todos' && cuenta.estado !== filters.estado) {
        return false;
      }

      if (filters.formaPago !== 'todos' && cuenta.formaPago !== filters.formaPago) {
        return false;
      }

      if (filters.sucursal && filters.sucursal !== 'todos' && cuenta.sucursal !== filters.sucursal) {
        return false;
      }

      if (filters.cajero && filters.cajero !== 'todos' && cuenta.cajero !== filters.cajero) {
        return false;
      }

      return true;
    });
  }, [cuentas, filters.cajero, filters.cliente, filters.estado, filters.formaPago, filters.rangoFechas.from, filters.rangoFechas.to, filters.sucursal]);

  const filteredCobranzas = useMemo<CobranzaWithDisplayAmount[]>(() => {
    const resolveDisplayAmount = (cobranza: CobranzaDocumento) => {
      if (cobranza.estado === 'cancelado') {
        const cuentaRelacionada = cuentasPorComprobante[cobranza.comprobanteId];
        if (cuentaRelacionada?.total) {
          return cuentaRelacionada.total;
        }
      }
      return cobranza.monto;
    };

    return cobranzas
      .filter((cobranza) => {
        if (!isFullyPaidCobranza(cobranza)) {
          return false;
        }

        if (!inRange(cobranza.fechaCobranza, filters.rangoFechas.from, filters.rangoFechas.to)) {
          return false;
        }

        if (filters.cliente && !textIncludes(cobranza.clienteNombre, filters.cliente)) {
          return false;
        }

        if (filters.estado !== 'todos' && cobranza.estado !== filters.estado) {
          return false;
        }

        if (filters.medioPago !== 'todos' && cobranza.medioPago.toLowerCase() !== filters.medioPago) {
          return false;
        }

        if (filters.sucursal && filters.sucursal !== 'todos' && cobranza.cajaDestino !== filters.sucursal) {
          return false;
        }

        return true;
      })
      .map((cobranza) => ({
        ...cobranza,
        displayAmount: resolveDisplayAmount(cobranza),
      }));
  }, [cobranzas, cuentasPorComprobante, filters.cliente, filters.estado, filters.medioPago, filters.rangoFechas.from, filters.rangoFechas.to, filters.sucursal]);

  const resumen = useMemo<CobranzasSummary>(() => {
    const totalDocumentosPendientes = filteredCuentas.length;
    const totalSaldoPendiente = filteredCuentas.reduce((acc, cuenta) => acc + cuenta.saldo, 0);
    const totalVencido = filteredCuentas
      .filter((cuenta) => cuenta.estado === 'vencido')
      .reduce((acc, cuenta) => acc + cuenta.saldo, 0);
    const totalCobranzas = filteredCobranzas.length;
    const totalCobrado = filteredCobranzas.reduce((acc, item) => acc + item.displayAmount, 0);

    return {
      totalDocumentosPendientes,
      totalSaldoPendiente,
      totalVencido,
      totalCobranzas,
      totalCobrado,
    };
  }, [filteredCobranzas, filteredCuentas]);

  return {
    activeTab,
    setActiveTab,
    filters,
    handleFilterChange,
    handleDateChange,
    resetFilters,
    filteredCuentas,
    filteredCobranzas,
    resumen,
    registerCobranza,
    cuentas,
    cobranzas,
  };
};
