import { useState, useCallback } from 'react';
import { useConfigurationContext } from '../contexto/ContextoConfiguracion';
import { almacenesApi } from '../api/almacenesApi';
import { mapBackendToFrontend, mapFrontendToBackendInput } from '../api/almacenesMapper';
import { getCurrentEmpresaId } from '../api/config';
import { ApiError, NetworkError } from '../api/fetchApi';
import type { Almacen } from '../modelos/Almacen';

export function useAlmacenes() {
  const { state, dispatch } = useConfigurationContext();
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const empresaId = getCurrentEmpresaId();
  const almacenes = state.almacenes;

  const handleError = (err: unknown, operation: string): void => {
    console.error(`Error ${operation} almacén:`, err);
    if (err instanceof ApiError) setError(`Error del servidor: ${err.message}`);
    else if (err instanceof NetworkError) setError(`Error de red: ${err.message}`);
    else if (err instanceof Error) setError(err.message);
    else setError(`Error desconocido al ${operation} almacén`);
  };

  const cargarAlmacenes = useCallback(
    async (search?: string, estado?: boolean, establecimientoId?: string) => {
      if (!empresaId) {
        setError('No se pudo determinar la empresa actual');
        return;
      }

      try {
        setIsFetching(true);
        setError(null);
        const items = await almacenesApi.listAll({ empresaId, search, estado, establecimientoId });
        const almacenesData = items.map((dto) => mapBackendToFrontend(dto));
        dispatch({ type: 'SET_ALMACENES', payload: almacenesData });
      } catch (err) {
        handleError(err, 'cargar');
      } finally {
        setIsFetching(false);
      }
    },
    [empresaId, dispatch]
  );

  const crearAlmacen = useCallback(
    async (data: Partial<Almacen>): Promise<Almacen | null> => {
      if (!empresaId) throw new Error('No se pudo determinar la empresa actual');

      try {
        setIsSaving(true);
        const inputDto = mapFrontendToBackendInput(data, empresaId);
        const response = await almacenesApi.create(inputDto);

        if (!response.exito || !response.data) {
          throw new Error(response.mensaje || 'Error al crear almacén');
        }

        const nuevoAlmacen = mapBackendToFrontend(response.data, data);
        dispatch({ type: 'ADD_ALMACEN', payload: nuevoAlmacen });
        return nuevoAlmacen;
      } catch (err) {
        console.error('Error creando almacén:', err);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [empresaId, dispatch]
  );

  const actualizarAlmacen = useCallback(
    async (id: string, data: Partial<Almacen>): Promise<Almacen | null> => {
      if (!empresaId) throw new Error('No se pudo determinar la empresa actual');

      try {
        setIsSaving(true);
        const existing = almacenes.find((e) => e.id === id);
        const inputDto = mapFrontendToBackendInput({ ...existing, ...data }, empresaId);
        const response = await almacenesApi.update(id, inputDto);

        if (!response.exito || !response.data) {
          throw new Error(response.mensaje || 'Error al actualizar almacén');
        }

        const actualizado = mapBackendToFrontend(response.data, { ...existing, ...data });
        dispatch({ type: 'UPDATE_ALMACEN', payload: actualizado });
        return actualizado;
      } catch (err) {
        console.error('Error actualizando almacén:', err);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [empresaId, dispatch, almacenes]
  );

  const eliminarAlmacen = useCallback(
    async (id: string): Promise<void> => {
      try {
        setIsDeleting(true);
        const response = await almacenesApi.delete(id);

        if (!response.exito) {
          throw new Error(response.mensaje || 'Error al eliminar almacén');
        }

        dispatch({ type: 'DELETE_ALMACEN', payload: id });
      } catch (err) {
        console.error('Error eliminando almacén:', err);
        throw err;
      } finally {
        setIsDeleting(false);
      }
    },
    [dispatch]
  );

  const toggleStatus = useCallback(
    async (id: string): Promise<void> => {
      const almacen = almacenes.find((e) => e.id === id);
      if (!almacen) throw new Error('Almacén no encontrado');
      await actualizarAlmacen(id, {
        ...almacen,
        esActivo: !almacen.esActivo,
      });
    },
    [almacenes, actualizarAlmacen]
  );

  return {
    almacenes,
    isFetching,
    isSaving,
    isDeleting,
    isLoading: isFetching || isSaving || isDeleting,
    error,
    cargarAlmacenes,
    crearAlmacen,
    actualizarAlmacen,
    eliminarAlmacen,
    toggleStatus,
  };
}
