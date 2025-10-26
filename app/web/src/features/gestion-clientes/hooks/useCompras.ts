import { useState, useCallback, useEffect } from 'react';
import { comprasClient } from '../api';
import type { Compra, CompraDetalle } from '../models';
import { useCaja } from '../../control-caja/context/CajaContext';

export const useCompras = (clienteId?: number | string) => {
  const { showToast } = useCaja();
  const [compras, setCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Cargar compras de un cliente
   */
  const fetchCompras = useCallback(async (id: number | string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await comprasClient.getComprasByCliente(id);
      setCompras(response.data);
    } catch (err: any) {
      const errorMessage = err.message || 'Error al cargar historial de compras';
      setError(errorMessage);
      showToast('error', 'Error', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  /**
   * Obtener detalle de una compra
   */
  const getCompraDetalle = useCallback(async (
    clienteIdParam: number | string,
    compraId: number | string
  ): Promise<CompraDetalle | null> => {
    setLoading(true);
    setError(null);

    try {
      const detalle = await comprasClient.getCompraDetalle(clienteIdParam, compraId);
      return detalle;
    } catch (err: any) {
      const errorMessage = err.message || 'Error al cargar detalle de compra';
      setError(errorMessage);
      showToast('error', 'Error', errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Cargar compras al montar si se proporciona clienteId
  useEffect(() => {
    if (clienteId) {
      fetchCompras(clienteId);
    }
  }, [clienteId, fetchCompras]);

  return {
    compras,
    loading,
    error,
    fetchCompras,
    getCompraDetalle,
  };
};
