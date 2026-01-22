import { useState, useCallback } from 'react';
import { empresasApi } from '../api/empresasApi';
import { mapBackendToFrontend, mapFrontendToBackendInput } from '../api/empresasMapper';
import { useConfigurationContext } from '../contexto/ContextoConfiguracion';
import type { Company } from '../modelos/Company';
import { ApiError } from '../api/fetchApi';

export function useEmpresas() {
  const { state, dispatch } = useConfigurationContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarEmpresa = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await empresasApi.getById(id);
      if (response.exito && response.data) {
        const empresa = mapBackendToFrontend(response.data);
        dispatch({ type: 'SET_COMPANY', payload: empresa });
        return empresa;
      }
      throw new Error(response.mensaje || 'Error al cargar la empresa');
    } catch (err) {
      const mensaje = err instanceof ApiError ? err.message : 'Error de conexión';
      setError(mensaje);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  const crearEmpresa = async (datos: Partial<Company>) => {
    setIsLoading(true);
    setError(null);
    try {
      const dto = mapFrontendToBackendInput(datos);
      const response = await empresasApi.create(dto);
      
      if (response.exito && response.data) {
        const nuevaEmpresa = mapBackendToFrontend(response.data);
        dispatch({ type: 'SET_COMPANY', payload: nuevaEmpresa });
        return nuevaEmpresa;
      }
      throw new Error(response.mensaje || 'Error al crear la empresa');
    } catch (err) {
      const mensaje = err instanceof ApiError ? err.message : 'Error al guardar';
      setError(mensaje);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const actualizarEmpresa = async (id: string, datos: Partial<Company>) => {
    setIsLoading(true);
    setError(null);
    try {
      const dto = mapFrontendToBackendInput(datos);
      const response = await empresasApi.update(id, dto);
      
      if (response.exito && response.data) {
        const empresaActualizada = mapBackendToFrontend(response.data);
        dispatch({ type: 'SET_COMPANY', payload: empresaActualizada });
        return empresaActualizada;
      }
      throw new Error(response.mensaje || 'Error al actualizar la empresa');
    } catch (err) {
      const mensaje = err instanceof ApiError ? err.message : 'Error al actualizar';
      setError(mensaje);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    empresa: state.company,
    isLoading,
    error,
    cargarEmpresa,
    crearEmpresa,
    actualizarEmpresa,
  };
}
