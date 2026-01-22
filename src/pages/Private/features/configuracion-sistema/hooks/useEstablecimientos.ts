/* eslint-disable react-hooks/exhaustive-deps -- dependencias extensas; ajuste diferido */
import { useState, useCallback } from 'react';
import { useConfigurationContext } from '../contexto/ContextoConfiguracion';
import { establecimientosApi } from '../api/establecimientosApi';
import { mapBackendToFrontend, mapFrontendToBackendInput } from '../api/establecimientosMapper';
import { getCurrentEmpresaId } from '../api/config';
import { ApiError, NetworkError } from '../api/fetchApi';
import type { Establecimiento } from '../modelos/Establecimiento';

/**
 * Hook para gestionar establecimientos con integración al backend
 * Estrategia híbrida: campos básicos en backend + campos extendidos en frontend
 */
export function useEstablecimientos() {
  const { state, dispatch } = useConfigurationContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const empresaId = getCurrentEmpresaId();
  const Establecimientos = state.Establecimientos;

  /**
   * Cargar establecimientos desde el backend
   */
  const cargarEstablecimientos = useCallback(async () => {
    if (!empresaId) {
      setError('No se pudo determinar la empresa actual');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Llamar API
      const items = await establecimientosApi.listAll(empresaId);

      // Mapear a modelo del frontend
      const establecimientos = items.map((dto) => {
        return mapBackendToFrontend(dto);
      });

      // Actualizar estado global
      dispatch({ type: 'SET_EstablecimientoS', payload: establecimientos });
    } catch (err) {
      console.error('Error cargando establecimientos:', err);
      // ... rest of error handling ...

      if (err instanceof ApiError) {
        setError(`Error del servidor: ${err.message}`);
      } else if (err instanceof NetworkError) {
        setError(`Error de red: ${err.message}`);
      } else {
        setError('Error desconocido al cargar establecimientos');
      }
    } finally {
      setIsLoading(false);
    }
  }, [empresaId, dispatch]);

  /**
   * Crear un nuevo establecimiento
   */
  const crearEstablecimiento = useCallback(
    async (data: Partial<Establecimiento>): Promise<Establecimiento | null> => {
      if (!empresaId) {
        throw new Error('No se pudo determinar la empresa actual');
      }

      try {
        setIsLoading(true);
        setError(null);

        // Mapear a DTO del backend
        const inputDto = mapFrontendToBackendInput(data, empresaId);

        // Llamar API
        const response = await establecimientosApi.create(inputDto);

        if (!response.exito || !response.data) {
          throw new Error(response.mensaje || 'Error al crear establecimiento');
        }

        // Mapear respuesta a modelo del frontend (con campos extendidos)
        const nuevoEstablecimiento = mapBackendToFrontend(response.data, data);

        // Actualizar estado global
        dispatch({ type: 'ADD_Establecimiento', payload: nuevoEstablecimiento });

        return nuevoEstablecimiento;
      } catch (err) {
        console.error('Error creando establecimiento:', err);

        if (err instanceof ApiError) {
          setError(`Error del servidor: ${err.message}`);
        } else if (err instanceof NetworkError) {
          setError(`Error de red: ${err.message}`);
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Error desconocido al crear establecimiento');
        }

        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [empresaId, dispatch]
  );

  /**
   * Actualizar un establecimiento existente
   */
  const actualizarEstablecimiento = useCallback(
    async (id: string, data: Partial<Establecimiento>): Promise<Establecimiento | null> => {
      if (!empresaId) {
        throw new Error('No se pudo determinar la empresa actual');
      }

      try {
        setIsLoading(true);
        setError(null);

        // Obtener datos actuales (para preservar campos extendidos)
        const existing = Establecimientos.find((e) => e.id === id);

        // Mapear a DTO del backend
        const inputDto = mapFrontendToBackendInput({ ...existing, ...data }, empresaId);

        // Llamar API
        const response = await establecimientosApi.update(id, inputDto);

        if (!response.exito || !response.data) {
          throw new Error(response.mensaje || 'Error al actualizar establecimiento');
        }

        // Mapear respuesta (preservando campos extendidos)
        const actualizado = mapBackendToFrontend(response.data, { ...existing, ...data });

        // Actualizar estado global
        dispatch({ type: 'UPDATE_Establecimiento', payload: actualizado });

        return actualizado;
      } catch (err) {
        console.error('Error actualizando establecimiento:', err);

        if (err instanceof ApiError) {
          setError(`Error del servidor: ${err.message}`);
        } else if (err instanceof NetworkError) {
          setError(`Error de red: ${err.message}`);
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Error desconocido al actualizar establecimiento');
        }

        throw err;
      } finally {
        setIsLoading(false);
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
        setIsLoading(true);
        setError(null);

        // Llamar API
        const response = await establecimientosApi.delete(id);

        if (!response.exito) {
          throw new Error(response.mensaje || 'Error al eliminar establecimiento');
        }

        // Actualizar estado global
        dispatch({ type: 'DELETE_Establecimiento', payload: id });
      } catch (err) {
        console.error('Error eliminando establecimiento:', err);

        if (err instanceof ApiError) {
          setError(`Error del servidor: ${err.message}`);
        } else if (err instanceof NetworkError) {
          setError(`Error de red: ${err.message}`);
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Error desconocido al eliminar establecimiento');
        }

        throw err;
      } finally {
        setIsLoading(false);
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
      if (!establecimiento) {
        throw new Error('Establecimiento no encontrado');
      }

      // Actualizar con el estado invertido
      await actualizarEstablecimiento(id, {
        ...establecimiento,
        estaActivoEstablecimiento: !establecimiento.estaActivoEstablecimiento,
      });
    },
    [Establecimientos, actualizarEstablecimiento]
  );

  return {
    establecimientos: Establecimientos,
    isLoading,
    error,
    cargarEstablecimientos,
    crearEstablecimiento,
    actualizarEstablecimiento,
    eliminarEstablecimiento,
    toggleStatus,
  };
}