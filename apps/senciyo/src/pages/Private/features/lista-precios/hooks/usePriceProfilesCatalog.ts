import { useMemo, useCallback } from 'react';
import { usePriceCalculator } from './usePriceCalculator';
import type { Column } from '../models/PriceTypes';

export interface PriceProfileOption {
  id: string;
  label: string;
}

const isVendibleColumn = (column: Column): boolean => {
  return column.visible && column.kind === 'manual';
};

const sortColumns = (columns: Column[]): Column[] => {
  return [...columns].sort((a, b) => a.order - b.order);
};

/**
 * Expone los perfiles de precio vendibles configurados en Lista de Precios.
 * Devuelve tanto las opciones visibles como utilidades para resolver labels.
 */
export const usePriceProfilesCatalog = () => {
  const { columns } = usePriceCalculator();

  const orderedColumns = useMemo(() => sortColumns(columns), [columns]);

  const profiles = useMemo<PriceProfileOption[]>(() => (
    orderedColumns
      .filter(isVendibleColumn)
      .map((column) => ({
        id: column.id,
        label: column.name,
      }))
  ), [orderedColumns]);

  const labelById = useMemo(() => {
    const map = new Map<string, string>();
    orderedColumns.forEach((column) => {
      map.set(column.id, column.name);
    });
    return map;
  }, [orderedColumns]);

  const resolveProfileId = useCallback((candidate?: string | null) => {
    if (!candidate) return undefined;
    const trimmed = candidate.trim();
    if (!trimmed) return undefined;

    const byId = orderedColumns.find((column) => column.id === trimmed);
    if (byId) {
      return byId.id;
    }

    const normalized = trimmed.toLowerCase();
    const byLabel = orderedColumns.find((column) => column.name.trim().toLowerCase() === normalized);
    return byLabel?.id;
  }, [orderedColumns]);

  const resolveProfileLabel = useCallback((candidate?: string | null) => {
    const resolvedId = resolveProfileId(candidate);
    if (resolvedId) {
      return labelById.get(resolvedId) ?? '';
    }
    return candidate?.trim() ?? '';
  }, [labelById, resolveProfileId]);

  return {
    profiles,
    labelById,
    resolveProfileId,
    resolveProfileLabel,
  };
};
