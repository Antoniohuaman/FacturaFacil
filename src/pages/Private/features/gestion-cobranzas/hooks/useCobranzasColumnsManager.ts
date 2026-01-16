import { useCallback, useEffect, useMemo, useState } from 'react';
import { lsKey } from '@/shared/tenant';
import { useTenantStore } from '../../../features/autenticacion/store/TenantStore';
import type { TableColumnDefinition, TableColumnState } from '../columns/types';
import {
  COBRANZAS_COLUMNS,
  CUENTAS_POR_COBRAR_COLUMNS,
  type CobranzasColumnKey,
  type CuentasPorCobrarColumnKey
} from '../columns/columnConfig';

const STORAGE_VERSION = 'v1';
const CUENTAS_STORAGE_KEY = 'cobranzas_cuentas_por_cobrar_columns';
const CUENTAS_VERSION_KEY = 'cobranzas_cuentas_por_cobrar_columns_version';
const COBRANZAS_STORAGE_KEY = 'cobranzas_cobranza_columns';
const COBRANZAS_VERSION_KEY = 'cobranzas_cobranza_columns_version';

type StoredColumnEntry<K extends string> = { key: K; visible?: boolean };

type ColumnsManagerResult<K extends string> = {
  columns: TableColumnState<K>[];
  visibleColumns: TableColumnState<K>[];
  visibleColumnKeys: K[];
  toggleColumn: (columnKey: K) => void;
  reorderColumns: (sourceKey: K, targetKey: K) => void;
  resetColumns: () => void;
  selectAllColumns: () => void;
};

const createDefaultState = <K extends string>(definitions: TableColumnDefinition<K>[]): TableColumnState<K>[] =>
  definitions.map((definition) => ({
    key: definition.key,
    label: definition.label,
    headerClassName: definition.headerClassName,
    cellClassName: definition.cellClassName,
    fixed: definition.fixed,
    visible: definition.fixed ? true : definition.defaultVisible
  }));

const mergeWithDefaults = <K extends string>(
  stored: StoredColumnEntry<K>[] | null,
  definitions: TableColumnDefinition<K>[]
): TableColumnState<K>[] => {
  const defaults = createDefaultState(definitions);
  if (!stored || stored.length === 0) {
    return defaults;
  }

  const defaultMap = new Map(defaults.map((column) => [column.key, column]));
  const ordered: TableColumnState<K>[] = [];

  stored.forEach((entry) => {
    const match = defaultMap.get(entry.key);
    if (!match) {
      return;
    }

    ordered.push({
      ...match,
      visible: match.fixed ? true : entry.visible ?? match.visible
    });
    defaultMap.delete(entry.key);
  });

  defaultMap.forEach((column) => {
    ordered.push(column);
  });

  return ordered;
};

const parseStoredColumns = <K extends string>(raw: string | null): StoredColumnEntry<K>[] | null => {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as StoredColumnEntry<K>[];
    if (!Array.isArray(parsed)) {
      return null;
    }

    return parsed.filter((entry) => entry && typeof entry.key === 'string');
  } catch {
    return null;
  }
};

const serializeColumns = <K extends string>(columns: TableColumnState<K>[]) =>
  JSON.stringify(columns.map((column) => ({ key: column.key, visible: column.visible })));

const loadFromStorage = <K extends string>(
  definitions: TableColumnDefinition<K>[],
  storageKey: string,
  versionKey: string,
  empresaId: string
): TableColumnState<K>[] => {
  if (typeof window === 'undefined') {
    return createDefaultState(definitions);
  }

  try {
    const scopedStorageKey = lsKey(storageKey, empresaId);
    const scopedVersionKey = lsKey(versionKey, empresaId);
    const storedVersion = window.localStorage.getItem(scopedVersionKey);

    if (storedVersion !== STORAGE_VERSION) {
      const defaults = createDefaultState(definitions);
      window.localStorage.setItem(scopedVersionKey, STORAGE_VERSION);
      window.localStorage.setItem(scopedStorageKey, serializeColumns(defaults));
      return defaults;
    }

    const raw = window.localStorage.getItem(scopedStorageKey);
    const parsed = parseStoredColumns<K>(raw);
    return mergeWithDefaults(parsed, definitions);
  } catch (error) {
    console.warn('[cobranzas] No se pudieron cargar las columnas personalizadas:', error);
    return createDefaultState(definitions);
  }
};

const persistColumns = <K extends string>(
  columns: TableColumnState<K>[],
  storageKey: string,
  versionKey: string,
  empresaId: string
) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const scopedStorageKey = lsKey(storageKey, empresaId);
    const scopedVersionKey = lsKey(versionKey, empresaId);
    window.localStorage.setItem(scopedVersionKey, STORAGE_VERSION);
    window.localStorage.setItem(scopedStorageKey, serializeColumns(columns));
  } catch (error) {
    console.warn('[cobranzas] No se pudieron guardar las columnas personalizadas:', error);
  }
};

const usePersistedColumnsManager = <K extends string>(
  definitions: TableColumnDefinition<K>[],
  storageKey: string,
  versionKey: string
): ColumnsManagerResult<K> => {
  const empresaId = useTenantStore((state) => state.contextoActual?.empresaId ?? null);
  const [columns, setColumns] = useState<TableColumnState<K>[]>(() => createDefaultState(definitions));

  useEffect(() => {
    if (!empresaId) {
      setColumns(createDefaultState(definitions));
      return;
    }

    setColumns(loadFromStorage(definitions, storageKey, versionKey, empresaId));
  }, [definitions, empresaId, storageKey, versionKey]);

  useEffect(() => {
    if (!empresaId) {
      return;
    }

    persistColumns(columns, storageKey, versionKey, empresaId);
  }, [columns, empresaId, storageKey, versionKey]);

  const toggleColumn = useCallback((columnKey: K) => {
    setColumns((prev) =>
      prev.map((column) => {
        if (column.key !== columnKey || column.fixed) {
          return column;
        }
        return { ...column, visible: !column.visible };
      })
    );
  }, []);

  const reorderColumns = useCallback((sourceKey: K, targetKey: K) => {
    if (sourceKey === targetKey) {
      return;
    }

    setColumns((prev) => {
      const sourceIndex = prev.findIndex((column) => column.key === sourceKey);
      const targetIndex = prev.findIndex((column) => column.key === targetKey);

      if (sourceIndex === -1 || targetIndex === -1) {
        return prev;
      }

      if (prev[sourceIndex]?.fixed) {
        return prev;
      }

      const updated = [...prev];
      const [moved] = updated.splice(sourceIndex, 1);
      updated.splice(targetIndex, 0, moved);
      return updated;
    });
  }, []);

  const resetColumns = useCallback(() => {
    setColumns(createDefaultState(definitions));
  }, [definitions]);

  const selectAllColumns = useCallback(() => {
    setColumns((prev) => prev.map((column) => ({ ...column, visible: true })));
  }, []);

  const visibleColumns = useMemo(() => columns.filter((column) => column.visible), [columns]);
  const visibleColumnKeys = useMemo(() => visibleColumns.map((column) => column.key), [visibleColumns]);

  return {
    columns,
    visibleColumns,
    visibleColumnKeys,
    toggleColumn,
    reorderColumns,
    resetColumns,
    selectAllColumns
  };
};

export const useCuentasPorCobrarColumnsManager = () =>
  usePersistedColumnsManager<CuentasPorCobrarColumnKey>(
    CUENTAS_POR_COBRAR_COLUMNS,
    CUENTAS_STORAGE_KEY,
    CUENTAS_VERSION_KEY
  );

export const useCobranzaColumnsManager = () =>
  usePersistedColumnsManager<CobranzasColumnKey>(COBRANZAS_COLUMNS, COBRANZAS_STORAGE_KEY, COBRANZAS_VERSION_KEY);
