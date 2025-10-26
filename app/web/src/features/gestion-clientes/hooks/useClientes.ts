import { useState, useCallback, useEffect } from 'react';
import { clientesClient } from '../api';
import type { Cliente, ClienteFilters, PaginatedResponse, CreateClienteDTO, UpdateClienteDTO } from '../models';
import { useCaja } from '../../control-caja/context/CajaContext';

export const useClientes = (initialFilters?: ClienteFilters) => {
  const { showToast } = useCaja();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });

  /**
   * Cargar clientes desde la API
   */
  const fetchClientes = useCallback(async (filters?: ClienteFilters) => {
    setLoading(true);
    setError(null);

    try {
      const response: PaginatedResponse<Cliente> = await clientesClient.getClientes(filters);

      setClientes(response.data);
      setPagination({
        total: response.total,
        page: response.page,
        limit: response.limit,
        totalPages: response.totalPages,
      });
    } catch (err: any) {
      const errorMessage = err.message || 'Error al cargar clientes';
      setError(errorMessage);
      showToast('error', 'Error', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

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
    fetchClientes(initialFilters);
  }, []);

  return {
    clientes,
    loading,
    error,
    pagination,
    fetchClientes,
    createCliente,
    updateCliente,
    deleteCliente,
    getClienteById,
  };
};
