/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
import { useState, useCallback, useEffect } from 'react';
import { clientesClient } from '../api';
import type {
  Cliente,
  ClienteFilters,
  PaginatedResponse,
  CreateClienteDTO,
  UpdateClienteDTO,
  BulkImportRequest,
  BulkImportResponse,
} from '../models';
import { useCaja } from '../../control-caja/context/CajaContext';
import { useTenant } from '../../../shared/tenant/TenantContext';

const INITIAL_PAGINATION = {
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 0,
};

export const useClientes = (initialFilters?: ClienteFilters) => {
  const { showToast } = useCaja();
  const { tenantId } = useTenant();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [transientClientes, setTransientClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState(INITIAL_PAGINATION);

  /**
   * Cargar clientes desde la API
   */
  const fetchClientes = useCallback(async (filters?: ClienteFilters) => {
    if (!tenantId) {
      return;
    }
    setLoading(true);
    setError(null);

    const ctrl = new AbortController();

    try {
      const response: PaginatedResponse<Cliente> = await clientesClient.getClientes(filters, { signal: ctrl.signal });

      setClientes(response.data);
      setPagination({
        total: response.total,
        page: response.page,
        limit: response.limit,
        totalPages: response.totalPages,
      });
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        const errorMessage = err.message || 'Error al cargar clientes';
        setError(errorMessage);
        showToast('error', 'Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [showToast, tenantId]);

  /**
   * Crear nuevo cliente
   */
  const createCliente = useCallback(async (data: CreateClienteDTO): Promise<Cliente | null> => {
    setLoading(true);
    setError(null);

    try {
      const newCliente = await clientesClient.createCliente(data);

      showToast(
        'success',
        '¡Cliente creado!',
        `${newCliente.name} fue creado exitosamente`
      );

      // Recargar lista
      await fetchClientes(initialFilters);

      return newCliente;
    } catch (err: any) {
      const errorMessage = err.message || 'Error al crear cliente';
      setError(errorMessage);
      showToast('error', 'Error al crear cliente', errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [showToast, fetchClientes, initialFilters]);

  /**
   * Actualizar cliente existente
   */
  const updateCliente = useCallback(async (
    id: number | string,
    data: UpdateClienteDTO
  ): Promise<Cliente | null> => {
    setLoading(true);
    setError(null);

    try {
      const updatedCliente = await clientesClient.updateCliente(id, data);

      showToast(
        'success',
        '¡Cliente actualizado!',
        `${updatedCliente.name} fue actualizado exitosamente`
      );

      // Actualizar en la lista local
      setClientes((prev) =>
        prev.map((c) => (c.id === id ? updatedCliente : c))
      );

      return updatedCliente;
    } catch (err: any) {
      const errorMessage = err.message || 'Error al actualizar cliente';
      setError(errorMessage);
      showToast('error', 'Error al actualizar cliente', errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  /**
   * Eliminar cliente
   */
  const deleteCliente = useCallback(async (id: number | string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      await clientesClient.deleteCliente(id);

      showToast(
        'success',
        'Cliente eliminado',
        'El cliente fue eliminado exitosamente'
      );

      // Remover de la lista local
      setClientes((prev) => prev.filter((c) => c.id !== id));

      return true;
    } catch (err: any) {
      const errorMessage = err.message || 'Error al eliminar cliente';
      setError(errorMessage);
      showToast('error', 'Error al eliminar cliente', errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  /**
   * Obtener cliente por ID
   */
  const getClienteById = useCallback(async (id: number | string): Promise<Cliente | null> => {
    setLoading(true);
    setError(null);

    try {
      const cliente = await clientesClient.getClienteById(id);
      return cliente;
    } catch (err: any) {
      const errorMessage = err.message || 'Error al cargar cliente';
      setError(errorMessage);
      showToast('error', 'Error', errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Cargar clientes al montar
  useEffect(() => {
    if (!tenantId) {
      setClientes([]);
      setTransientClientes([]);
      setPagination(INITIAL_PAGINATION);
      setLoading(false);
      return;
    }

    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    clientesClient
      .getClientes(initialFilters, { signal: ctrl.signal })
      .then((response: PaginatedResponse<Cliente>) => {
        setClientes(response.data);
        setPagination({
          total: response.total,
          page: response.page,
          limit: response.limit,
          totalPages: response.totalPages,
        });
      })
      .catch((err: any) => {
        if (err?.name !== 'AbortError') {
          const errorMessage = err.message || 'Error al cargar clientes';
          setError(errorMessage);
          showToast('error', 'Error', errorMessage);
        }
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [initialFilters, showToast, tenantId]);

  /**
   * Inyecta clientes transitorios (no persistidos) en memoria
   */
  const applyTransientClientes = useCallback((items: Cliente[]) => {
    const stamped = items.map((c, idx) => ({
      ...c,
      id: c.id ?? `t-${Date.now()}-${idx}`,
      transient: true as const,
    }));
    setTransientClientes(stamped);
    const count = stamped.length;
    showToast('success', 'Importación aplicada', `${count} cliente${count === 1 ? '' : 's'} transitorio${count === 1 ? '' : 's'} agregado${count === 1 ? '' : 's'} al listado`);
  }, [showToast]);

  /**
   * Limpia los clientes transitorios
   */
  const clearTransientClientes = useCallback(() => {
    setTransientClientes([]);
    showToast('info', 'Importación revertida', 'Se quitaron los registros transitorios del listado');
  }, [showToast]);

  const bulkImportClientes = useCallback(async (
    payload: BulkImportRequest
  ): Promise<BulkImportResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await clientesClient.bulkImportClientes(payload);
      await fetchClientes(initialFilters);

      const { summary } = result;
      const createdLabel = summary.created === 1 ? '1 cliente creado' : `${summary.created} clientes creados`;
      const updatedLabel = summary.updated === 1 ? '1 cliente actualizado' : `${summary.updated} clientes actualizados`;

      showToast(
        'success',
        'Importación completada',
        `${createdLabel} · ${updatedLabel}`
      );

      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Error al importar clientes';
      setError(errorMessage);
      showToast('error', 'No se pudo completar la importación', errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchClientes, initialFilters, showToast]);

  const transientCount = transientClientes.length;

  return {
    clientes,
    transientClientes,
    loading,
    error,
    pagination,
    fetchClientes,
    createCliente,
    updateCliente,
    deleteCliente,
    getClienteById,
    applyTransientClientes,
    clearTransientClientes,
    transientCount,
    bulkImportClientes,
  };
};
