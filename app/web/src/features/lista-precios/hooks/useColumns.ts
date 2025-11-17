// src/features/lista-precios/hooks/useColumns.ts
import { useState, useEffect, useCallback } from 'react';
import type { Column, NewColumnForm } from '../models/PriceTypes';
import { generateColumnId, getNextOrder } from '../utils/priceHelpers';
import { lsKey } from '../utils/tenantHelpers';

/**
 * Utilidad para cargar desde localStorage
 */
const loadFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return defaultValue;
    return JSON.parse(stored);
  } catch (error) {
    console.error(`[useColumns] Error loading ${key} from localStorage:`, error);
    return defaultValue;
  }
};

/**
 * Utilidad para guardar en localStorage
 */
const saveToLocalStorage = (key: string, data: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`[useColumns] Error saving ${key} to localStorage:`, error);
  }
};

/**
 * Hook para gestión de columnas de precios
 */
export const useColumns = () => {
  const [columns, setColumns] = useState<Column[]>(() =>
    loadFromLocalStorage<Column[]>(lsKey('price_list_columns'), [])
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persistir columnas en localStorage cuando cambien
  useEffect(() => {
    saveToLocalStorage(lsKey('price_list_columns'), columns);
  }, [columns]);

  // Sincronizar cambios de otras pestañas
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === lsKey('price_list_columns') && e.newValue) {
        try {
          const newColumns = JSON.parse(e.newValue);
          setColumns(newColumns);
        } catch (error) {
          console.error('[useColumns] Error parsing columns from storage event:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  /**
   * Agregar nueva columna
   */
  const addColumn = useCallback(async (newColumnData: NewColumnForm): Promise<boolean> => {
    if (!newColumnData.name.trim()) {
      setError('El nombre de la columna es requerido');
      return false;
    }

    if (columns.length >= 10) {
      setError('Has alcanzado el límite máximo de 10 columnas');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // Simular operación async (futuro API call)
      await new Promise(resolve => setTimeout(resolve, 300));

      const newId = generateColumnId(columns);
      const newOrder = getNextOrder(columns);

      const newColumn: Column = {
        id: newId,
        name: newColumnData.name.trim(),
        mode: newColumnData.mode,
        visible: newColumnData.visible,
        isBase: newColumnData.isBase && !columns.some(c => c.isBase),
        order: newOrder
      };

      setColumns([...columns, newColumn]);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al agregar columna';
      console.error('[useColumns] Error adding column:', err);
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [columns]);

  /**
   * Eliminar columna
   */
  const deleteColumn = useCallback((columnId: string): boolean => {
    const column = columns.find(c => c.id === columnId);

    if (!column) {
      setError('Columna no encontrada');
      return false;
    }

    if (column.isBase) {
      setError('No se puede eliminar la columna base');
      return false;
    }

    try {
      setColumns(columns.filter(c => c.id !== columnId));
      setError(null);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar columna';
      console.error('[useColumns] Error deleting column:', err);
      setError(errorMessage);
      return false;
    }
  }, [columns]);

  /**
   * Alternar visibilidad de columna
   */
  const toggleColumnVisibility = useCallback((columnId: string): void => {
    setColumns(columns.map(col =>
      col.id === columnId ? { ...col, visible: !col.visible } : col
    ));
  }, [columns]);

  /**
   * Establecer columna base
   */
  const setBaseColumn = useCallback((columnId: string): void => {
    setColumns(columns.map(col => ({
      ...col,
      isBase: col.id === columnId
    })));
  }, [columns]);

  /**
   * Actualizar columna
   */
  const updateColumn = useCallback((columnId: string, updates: Partial<Column>): void => {
    setColumns(columns.map(col =>
      col.id === columnId ? { ...col, ...updates } : col
    ));
  }, [columns]);

  /**
   * Limpiar error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    columns,
    loading,
    error,
    addColumn,
    deleteColumn,
    toggleColumnVisibility,
    setBaseColumn,
    updateColumn,
    clearError
  };
};
