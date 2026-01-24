import { useState, useCallback } from 'react';
import { useConfigurationContext } from '../contexto/ContextoConfiguracion';
import { establecimientosApi } from '../api/establecimientosApi';
import { mapBackendToFrontend, mapFrontendToBackendInput } from '../api/establecimientosMapper';
import { getCurrentEmpresaId } from '../api/config';
import { ApiError, NetworkError } from '../api/fetchApi';
import type { Establecimiento } from '../modelos/Establecimiento';

export function useEstablecimientos() {
  const { state, dispatch } = useConfigurationContext();
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const empresaId = getCurrentEmpresaId();
  const Establecimientos = state.Establecimientos;

  const cargarEstablecimientos = useCallback(
    async (search?: string, estado?: boolean) => {
      if (!empresaId) {
        setError('No se pudo determinar la empresa actual');
        return;
      }

      try {
        setIsFetching(true);
        setError(null);
        const items = await establecimientosApi.listAll({
          empresaId,
          search,
          estado,
        });
        const establecimientos = items.map((dto) => mapBackendToFrontend(dto));
        dispatch({ type: 'SET_EstablecimientoS', payload: establecimientos });
      } catch (err) {
        console.error('Error cargando establecimientos:', err);
        if (err instanceof ApiError) setError(`Error del servidor: ${err.message}`);
        else if (err instanceof NetworkError) setError(`Error de red: ${err.message}`);
        else setError('Error desconocido al cargar establecimientos');
      } finally {
        setIsFetching(false);
      }
    },
    [empresaId, dispatch]
  );

  /**
   * Crear un nuevo establecimiento
   */
  const crearEstablecimiento = useCallback(
    async (data: Partial<Establecimiento>): Promise<Establecimiento | null> => {
      if (!empresaId) throw new Error('No se pudo determinar la empresa actual');

      try {
        setIsSaving(true);
        setError(null);
        const inputDto = mapFrontendToBackendInput(data, empresaId);
        const response = await establecimientosApi.create(inputDto);

        if (!response.exito || !response.data) {
          throw new Error(response.mensaje || 'Error al crear establecimiento');
        }

        const nuevoEstablecimiento = mapBackendToFrontend(response.data, data);
        dispatch({ type: 'ADD_Establecimiento', payload: nuevoEstablecimiento });
        return nuevoEstablecimiento;
      } catch (err) {
        console.error('Error creando establecimiento:', err);
        if (err instanceof ApiError) setError(`Error del servidor: ${err.message}`);
        else if (err instanceof NetworkError) setError(`Error de red: ${err.message}`);
        else if (err instanceof Error) setError(err.message);
        else setError('Error desconocido al crear establecimiento');
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [empresaId, dispatch]
  );

  /**
   * Actualizar un establecimiento existente
   */
  const actualizarEstablecimiento = useCallback(
    async (id: string, data: Partial<Establecimiento>): Promise<Establecimiento | null> => {
      if (!empresaId) throw new Error('No se pudo determinar la empresa actual');

      try {
        setIsSaving(true);
        setError(null);
        const existing = Establecimientos.find((e) => e.id === id);
        const inputDto = mapFrontendToBackendInput({ ...existing, ...data }, empresaId);
        const response = await establecimientosApi.update(id, inputDto);

        if (!response.exito || !response.data) {
          throw new Error(response.mensaje || 'Error al actualizar establecimiento');
        }

        const actualizado = mapBackendToFrontend(response.data, { ...existing, ...data });
        dispatch({ type: 'UPDATE_Establecimiento', payload: actualizado });
        return actualizado;
      } catch (err) {
        console.error('Error actualizando establecimiento:', err);
        if (err instanceof ApiError) setError(`Error del servidor: ${err.message}`);
        else if (err instanceof NetworkError) setError(`Error de red: ${err.message}`);
        else if (err instanceof Error) setError(err.message);
        else setError('Error desconocido al actualizar establecimiento');
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [empresaId, dispatch, Establecimientos]
  );

  /**
   * Eliminar un establecimiento
   */
  const eliminarEstablecimiento = useCallback(
    async (id: string): Promise<void> => {
      try {
        setIsDeleting(true);
        setError(null);
        const response = await establecimientosApi.delete(id);

        if (!response.exito) {
          throw new Error(response.mensaje || 'Error al eliminar establecimiento');
        }

        dispatch({ type: 'DELETE_Establecimiento', payload: id });
      } catch (err) {
        console.error('Error eliminando establecimiento:', err);
        if (err instanceof ApiError) setError(`Error del servidor: ${err.message}`);
        else if (err instanceof NetworkError) setError(`Error de red: ${err.message}`);
        else if (err instanceof Error) setError(err.message);
        else setError('Error desconocido al eliminar establecimiento');
        throw err;
      } finally {
        setIsDeleting(false);
      }
    },
    [dispatch]
  );

  /**
   * Toggle status (activar/desactivar)
   */
  const toggleStatus = useCallback(
    async (id: string): Promise<void> => {
      const establecimiento = Establecimientos.find((e) => e.id === id);
      if (!establecimiento) throw new Error('Establecimiento no encontrado');

      await actualizarEstablecimiento(id, {
        ...establecimiento,
        esActivo: !establecimiento.esActivo,
      });
    },
    [Establecimientos, actualizarEstablecimiento]
  );

  return {
    establecimientos: Establecimientos,
    isFetching,
    isSaving,
    isDeleting,
    isLoading: isFetching || isSaving || isDeleting,
    error,
    cargarEstablecimientos,
    crearEstablecimiento,
    actualizarEstablecimiento,
    eliminarEstablecimiento,
    toggleStatus,
  };
}
