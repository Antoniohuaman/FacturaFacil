/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
import { useState, useCallback, useEffect } from 'react';
import { comprasClient } from '../api';
import type { Compra, CompraDetalle } from '../models';
import { useCaja } from '../../control-caja/context/CajaContext';

export const useCompras = (clienteId?: number | string) => {
  const { showToast } = useCaja();
  const [compras, setCompras] = useState<Compra[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Cargar compras de un cliente
   */
  const fetchCompras = useCallback(async (
    id: number | string,
    options?: { signal?: AbortSignal }
  ) => {
    setLoadingList(true);
    setError(null);

    try {
      const response = await comprasClient.getComprasByCliente(id, { signal: options?.signal });
      setCompras(response.data ?? []);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return;
      }
      const errorMessage = err?.message || 'Error al cargar historial de ventas';
      setError(errorMessage);
      showToast('error', 'Error', errorMessage);
    } finally {
      if (!options?.signal?.aborted) {
        setLoadingList(false);
      }
    }
  }, [showToast]);

  /**
   * Obtener detalle de una compra
   */
  const getCompraDetalle = useCallback(async (
    clienteIdParam: number | string,
    compraId: number | string
  ): Promise<CompraDetalle | null> => {
    setLoadingDetalle(true);
    setError(null);

    try {
      const detalle = await comprasClient.getCompraDetalle(clienteIdParam, compraId);
      return detalle;
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return null;
      }
      const errorMessage = err?.message || 'Error al cargar detalle de venta';
      setError(errorMessage);
      showToast('error', 'Error', errorMessage);
      return null;
    } finally {
      setLoadingDetalle(false);
    }
  }, [showToast]);

  // Cargar compras al montar si se proporciona clienteId
  useEffect(() => {
    if (!clienteId) {
      return undefined;
    }
    const ctrl = new AbortController();
    fetchCompras(clienteId, { signal: ctrl.signal });
    return () => ctrl.abort();
  }, [clienteId, fetchCompras]);

  const reload = useCallback(() => {
    if (!clienteId) return;
    fetchCompras(clienteId);
  }, [clienteId, fetchCompras]);

  return {
    compras,
    loadingList,
    loadingDetalle,
    error,
    fetchCompras,
    getCompraDetalle,
    reload,
  };
};
