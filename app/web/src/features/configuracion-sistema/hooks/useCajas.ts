// Custom hook for managing Cajas (Cash Registers)
// Scoped by empresaId and establecimientoId from ConfigurationContext

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useConfigurationContext } from '../context/ConfigurationContext';
import type { Caja, CreateCajaInput, UpdateCajaInput } from '../models/Caja';
import { cajasDataSource } from '../api/cajasDataSource';
import type { ValidationError } from '../utils/cajasValidator';
import { validateCreateCaja, validateUpdateCaja } from '../utils/cajasValidator';

interface UseCajasReturn {
  cajas: Caja[];
  loading: boolean;
  error: string | null;
  
  // Actions
  loadCajas: () => Promise<void>;
  createCaja: (input: CreateCajaInput) => Promise<Caja>;
  updateCaja: (id: string, input: UpdateCajaInput) => Promise<Caja>;
  toggleCajaEnabled: (id: string) => Promise<Caja>;
  deleteCaja: (id: string) => Promise<void>;
  
  // Getters
  getCaja: (id: string) => Caja | undefined;
  getEnabledCajas: () => Caja[];
  getCajasByEstablishment: (establecimientoId: string) => Caja[];
  
  // Validation
  validateCaja: (input: CreateCajaInput | UpdateCajaInput, cajaId?: string) => ValidationError[];
  
  // Stats
  getCajasStats: () => {
    total: number;
    enabled: number;
    disabled: number;
  };
}

/**
 * Hook for managing cajas scoped by company and establishment
 * Requires empresaId from company and establecimientoId from UserSessionContext
 */
export function useCajas(empresaId?: string, establecimientoId?: string): UseCajasReturn {
  const { state, dispatch } = useConfigurationContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get cajas from context state
  const cajas = useMemo(() => state.cajas || [], [state.cajas]);

  /**
   * Load cajas for current company and establishment
   */
  const loadCajas = useCallback(async () => {
    if (!empresaId || !establecimientoId) {
      setError('Empresa y establecimiento son requeridos');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const loadedCajas = await cajasDataSource.list(empresaId, establecimientoId);
      dispatch({ type: 'SET_CAJAS', payload: loadedCajas });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al cargar cajas';
      setError(errorMsg);
      console.error('Error loading cajas:', err);
    } finally {
      setLoading(false);
    }
  }, [empresaId, establecimientoId, dispatch]);

  /**
   * Create a new caja
   */
  const createCaja = useCallback(async (input: CreateCajaInput): Promise<Caja> => {
    if (!empresaId || !establecimientoId) {
      throw new Error('Empresa y establecimiento son requeridos');
    }

    // Validate input with users from context
    const validation = validateCreateCaja(input, cajas, state.employees);
    if (!validation.isValid) {
      throw new Error(validation.errors.map(e => e.message).join(', '));
    }

    setLoading(true);
    setError(null);

    try {
      const newCaja = await cajasDataSource.create(empresaId, establecimientoId, input);
      dispatch({ type: 'ADD_CAJA', payload: newCaja });
      return newCaja;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al crear caja';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [empresaId, establecimientoId, cajas, dispatch, state.employees]);

  /**
   * Update an existing caja
   */
  const updateCaja = useCallback(async (id: string, input: UpdateCajaInput): Promise<Caja> => {
    if (!empresaId || !establecimientoId) {
      throw new Error('Empresa y establecimiento son requeridos');
    }

    // Validate input with users from context
    const validation = validateUpdateCaja(input, cajas, id, state.employees);
    if (!validation.isValid) {
      throw new Error(validation.errors.map(e => e.message).join(', '));
    }

    setLoading(true);
    setError(null);

    try {
      const updatedCaja = await cajasDataSource.update(empresaId, establecimientoId, id, input);
      dispatch({ type: 'UPDATE_CAJA', payload: updatedCaja });
      return updatedCaja;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al actualizar caja';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [empresaId, establecimientoId, cajas, dispatch, state.employees]);

  /**
   * Toggle enabled/disabled state of a caja
   */
  const toggleCajaEnabled = useCallback(async (id: string): Promise<Caja> => {
    if (!empresaId || !establecimientoId) {
      throw new Error('Empresa y establecimiento son requeridos');
    }

    setLoading(true);
    setError(null);

    try {
      const toggledCaja = await cajasDataSource.toggleEnabled(empresaId, establecimientoId, id);
      dispatch({ type: 'UPDATE_CAJA', payload: toggledCaja });
      return toggledCaja;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al cambiar estado de caja';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [empresaId, establecimientoId, dispatch]);

  /**
   * Delete a caja
   */
  const deleteCaja = useCallback(async (id: string): Promise<void> => {
    if (!empresaId || !establecimientoId) {
      throw new Error('Empresa y establecimiento son requeridos');
    }

    setLoading(true);
    setError(null);

    try {
      if (cajasDataSource.delete) {
        await cajasDataSource.delete(empresaId, establecimientoId, id);
        dispatch({ type: 'DELETE_CAJA', payload: id });
      } else {
        throw new Error('Delete operation not supported');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al eliminar caja';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [empresaId, establecimientoId, dispatch]);

  /**
   * Get a specific caja by ID
   */
  const getCaja = useCallback((id: string): Caja | undefined => {
    return cajas.find(c => c.id === id);
  }, [cajas]);

  /**
   * Get only enabled cajas
   */
  const getEnabledCajas = useCallback((): Caja[] => {
    return cajas.filter(c => c.habilitada);
  }, [cajas]);

  /**
   * Get cajas by specific establishment
   */
  const getCajasByEstablishment = useCallback((estId: string): Caja[] => {
    return cajas.filter(c => c.establecimientoId === estId);
  }, [cajas]);

  /**
   * Validate caja input without saving
   */
  const validateCaja = useCallback((
    input: CreateCajaInput | UpdateCajaInput, 
    cajaId?: string
  ): ValidationError[] => {
    if (cajaId) {
      // Update validation with users from context
      const validation = validateUpdateCaja(input as UpdateCajaInput, cajas, cajaId, state.employees);
      return validation.errors;
    } else {
      // Create validation with users from context
      const validation = validateCreateCaja(input as CreateCajaInput, cajas, state.employees);
      return validation.errors;
    }
  }, [cajas, state.employees]);

  /**
   * Get statistics about cajas
   */
  const getCajasStats = useCallback(() => {
    return {
      total: cajas.length,
      enabled: cajas.filter(c => c.habilitada).length,
      disabled: cajas.filter(c => !c.habilitada).length
    };
  }, [cajas]);

  // Auto-load cajas when empresaId or establecimientoId changes
  useEffect(() => {
    if (empresaId && establecimientoId) {
      void loadCajas();
    }
  }, [empresaId, establecimientoId, loadCajas]);

  return {
    cajas,
    loading,
    error,
    loadCajas,
    createCaja,
    updateCaja,
    toggleCajaEnabled,
    deleteCaja,
    getCaja,
    getEnabledCajas,
    getCajasByEstablishment,
    validateCaja,
    getCajasStats
  };
}
