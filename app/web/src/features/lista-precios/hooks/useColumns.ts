// src/features/lista-precios/hooks/useColumns.ts
import { useState, useEffect, useCallback } from 'react';
import type { Column, NewColumnForm } from '../models/PriceTypes';
import {
  generateColumnId,
  getNextOrder,
  ensureRequiredColumns,
  MANUAL_COLUMN_LIMIT,
  countManualColumns,
  isGlobalColumn,
  isProductDiscountColumn,
  isMinAllowedColumn,
  isFixedColumn,
  BASE_COLUMN_ID
} from '../utils/priceHelpers';
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
    ensureRequiredColumns(loadFromLocalStorage<Column[]>(lsKey('price_list_columns'), []))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyColumnsUpdate = useCallback((updater: (prev: Column[]) => Column[]) => {
    setColumns(prev => ensureRequiredColumns(updater(prev)));
  }, []);

  // Persistir columnas en localStorage cuando cambien
  useEffect(() => {
    saveToLocalStorage(lsKey('price_list_columns'), columns);
  }, [columns, applyColumnsUpdate]);

  // Sincronizar cambios de otras pestañas
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === lsKey('price_list_columns') && e.newValue) {
        try {
          const newColumns = JSON.parse(e.newValue);
          setColumns(ensureRequiredColumns(newColumns));
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

    const manualCount = countManualColumns(columns);
    if (manualCount >= MANUAL_COLUMN_LIMIT) {
      setError(`Has alcanzado el límite de ${MANUAL_COLUMN_LIMIT} columnas manuales`);
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
        isVisibleInTable: newColumnData.isVisibleInTable ?? true,
        isBase: false,
        order: newOrder,
        kind: 'manual'
      };

      applyColumnsUpdate(prev => [...prev, newColumn]);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al agregar columna';
      console.error('[useColumns] Error adding column:', err);
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [columns, applyColumnsUpdate]);

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

    if (isGlobalColumn(column)) {
      setError('Las columnas globales son obligatorias');
      return false;
    }

    if (isProductDiscountColumn(column) || isMinAllowedColumn(column) || isFixedColumn(column)) {
      setError('Esta columna fija es obligatoria');
      return false;
    }

    try {
      applyColumnsUpdate(prev => prev.filter(c => c.id !== columnId));
      setError(null);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar columna';
      console.error('[useColumns] Error deleting column:', err);
      setError(errorMessage);
      return false;
    }
  }, [columns, applyColumnsUpdate]);

  /**
   * Alternar visibilidad de columna
   */
  const toggleColumnVisibility = useCallback((columnId: string): void => {
    applyColumnsUpdate(prev => prev.map(col =>
      col.id === columnId ? { ...col, visible: !col.visible } : col
    ));
  }, [applyColumnsUpdate]);

  const toggleColumnTableVisibility = useCallback((columnId: string): void => {
    applyColumnsUpdate(prev => prev.map(col =>
      col.id === columnId
        ? { ...col, isVisibleInTable: !(col.isVisibleInTable !== false) }
        : col
    ));
  }, [applyColumnsUpdate]);

  /**
   * Establecer columna base
   */
  const setBaseColumn = useCallback((columnId: string): void => {
    if (columnId !== BASE_COLUMN_ID) {
      setError('La columna base es fija y no se puede reasignar');
    }
  }, [setError]);

  /**
   * Actualizar columna
   */
  const updateColumn = useCallback((columnId: string, updates: Partial<Column>): void => {
    applyColumnsUpdate(prev => prev.map(col => {
      if (col.id !== columnId) return col;

      if (isFixedColumn(col)) {
        const next: Column = { ...col };
        if (typeof updates.visible === 'boolean') {
          next.visible = updates.visible;
        }
        if (typeof updates.isVisibleInTable === 'boolean') {
          next.isVisibleInTable = updates.isVisibleInTable;
        }
        if (updates.globalRuleType) {
          next.globalRuleType = updates.globalRuleType;
        }
        if (updates.globalRuleValue !== undefined) {
          if (updates.globalRuleValue === null) {
            next.globalRuleValue = null;
          } else if (typeof updates.globalRuleValue === 'number' && Number.isFinite(updates.globalRuleValue)) {
            next.globalRuleValue = Math.max(updates.globalRuleValue, 0);
          }
        }
        return next;
      }

      const next: Column = { ...col };
      if (typeof updates.name === 'string') {
        next.name = updates.name;
      }
      if (updates.mode === 'fixed' || updates.mode === 'volume') {
        next.mode = updates.mode;
      }
      if (typeof updates.visible === 'boolean') {
        next.visible = updates.visible;
      }
      if (typeof updates.isVisibleInTable === 'boolean') {
        next.isVisibleInTable = updates.isVisibleInTable;
      }
      return next;
    }));
  }, [applyColumnsUpdate]);

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
    toggleColumnTableVisibility,
    setBaseColumn,
    updateColumn,
    clearError
  };
};
