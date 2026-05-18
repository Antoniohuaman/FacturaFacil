// src/features/lista-precios/hooks/useColumns.ts
import { useState, useEffect, useCallback } from 'react';
import type { Column } from '../models/PriceTypes';
import {
  ensureRequiredColumns,
  isFixedColumn,
  getDefaultTableVisibility,
  getDefaultColumnOrder
} from '../utils/priceHelpers';
import { lsKey } from '../utils/tenantHelpers';
import { ensureTenantStorageMigration, readTenantJson, writeTenantJson } from '../utils/storage';

/**
 * Hook para gestión de columnas de precios
 */
export const useColumns = () => {
  const [columns, setColumns] = useState<Column[]>(() => {
    ensureTenantStorageMigration('price_list_columns');
    return ensureRequiredColumns(readTenantJson<Column[]>('price_list_columns', []));
  });
  const [error, setError] = useState<string | null>(null);

  const applyColumnsUpdate = useCallback((updater: (prev: Column[]) => Column[]) => {
    setColumns(prev => ensureRequiredColumns(updater(prev)));
  }, []);

  // Persistir columnas en localStorage cuando cambien
  useEffect(() => {
    writeTenantJson('price_list_columns', columns);
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

  const reorderColumns = useCallback((sourceId: string, targetId: string): void => {
    if (sourceId === targetId) {
      return;
    }
    applyColumnsUpdate(prev => {
      const sourceIndex = prev.findIndex(column => column.id === sourceId);
      const targetIndex = prev.findIndex(column => column.id === targetId);

      if (sourceIndex === -1 || targetIndex === -1) {
        return prev;
      }

      const next = [...prev];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next.map((column, index) => ({ ...column, order: index + 1 }));
    });
  }, [applyColumnsUpdate]);

  const resetTableColumns = useCallback(() => {
    applyColumnsUpdate(prev => prev.map(column => {
      const defaultOrder = getDefaultColumnOrder(column.id);
      const defaultVisible = isFixedColumn(column)
        ? getDefaultTableVisibility(column.id)
        : true;

      return {
        ...column,
        order: typeof defaultOrder === 'number' ? defaultOrder : column.order,
        isVisibleInTable: defaultVisible
      };
    }));
  }, [applyColumnsUpdate]);

  const selectAllTableColumns = useCallback(() => {
    applyColumnsUpdate(prev => prev.map(column => ({
      ...column,
      isVisibleInTable: true
    })));
  }, [applyColumnsUpdate]);

  /**
   * Actualizar columna
   */
  const updateColumn = useCallback((columnId: string, updates: Partial<Column>): void => {
    applyColumnsUpdate(prev => prev.map(col => {
      if (col.id !== columnId) return col;
      const next: Column = { ...col };

      // Nombre: siempre editable
      if (typeof updates.name === 'string' && updates.name.trim()) {
        next.name = updates.name.trim();
      }

      if (typeof updates.visible === 'boolean') {
        next.visible = updates.visible;
      }

      if (typeof updates.isVisibleInTable === 'boolean') {
        next.isVisibleInTable = updates.isVisibleInTable;
      }

      if (typeof updates.usarEnPuntoVenta === 'boolean') {
        next.usarEnPuntoVenta = updates.usarEnPuntoVenta;
      }
      if (typeof updates.usarEnComprobantes === 'boolean') {
        next.usarEnComprobantes = updates.usarEnComprobantes;
      }

      // Regla global (interno, para compatibilidad P8/P9)
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
    }));
  }, [applyColumnsUpdate]);

  /**
   * Alternar uso en Punto de Venta
   */
  const toggleColumnPOSUsage = useCallback((columnId: string): void => {
    applyColumnsUpdate(prev => prev.map(col => {
      if (col.id !== columnId) return col;
      return { ...col, usarEnPuntoVenta: !(col.usarEnPuntoVenta !== false) };
    }));
  }, [applyColumnsUpdate]);

  /**
   * Alternar uso en Comprobantes
   */
  const toggleColumnComprobantesUsage = useCallback((columnId: string): void => {
    applyColumnsUpdate(prev => prev.map(col => {
      if (col.id !== columnId) return col;
      return { ...col, usarEnComprobantes: !(col.usarEnComprobantes !== false) };
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
    error,
    toggleColumnVisibility,
    toggleColumnTableVisibility,
    reorderColumns,
    resetTableColumns,
    selectAllTableColumns,
    updateColumn,
    toggleColumnPOSUsage,
    toggleColumnComprobantesUsage,
    clearError
  };
};
