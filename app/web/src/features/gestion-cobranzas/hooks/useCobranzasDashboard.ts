import { useMemo, useState } from 'react';
import { useCobranzasContext } from '../context/CobranzasContext';
import type {
  CobranzaFilters,
  CobranzaTabKey,
  CobranzasSummary,
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

  const filteredCuentas = useMemo(() => {
    return cuentas.filter((cuenta) => {
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

  const filteredCobranzas = useMemo(() => {
    return cobranzas.filter((cobranza) => {
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
    });
  }, [cobranzas, filters.cliente, filters.estado, filters.medioPago, filters.rangoFechas.from, filters.rangoFechas.to, filters.sucursal]);

  const resumen = useMemo<CobranzasSummary>(() => {
    const totalDocumentosPendientes = filteredCuentas.length;
    const totalSaldoPendiente = filteredCuentas.reduce((acc, cuenta) => acc + cuenta.saldo, 0);
    const totalVencido = filteredCuentas
      .filter((cuenta) => cuenta.estado === 'vencido')
      .reduce((acc, cuenta) => acc + cuenta.saldo, 0);
    const totalCobranzas = filteredCobranzas.length;
    const totalCobrado = filteredCobranzas.reduce((acc, item) => acc + item.monto, 0);

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
