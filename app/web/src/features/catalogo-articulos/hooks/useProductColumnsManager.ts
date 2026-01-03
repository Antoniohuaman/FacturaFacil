import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AVAILABLE_COLUMNS,
  COLUMN_CONFIG_VERSION,
  type ColumnConfig,
  type ColumnKey
} from '../components/product-table/columnConfig';
import { ensureEmpresaId, lsKey } from '@/shared/tenant';

export interface ProductTableColumnState {
  key: ColumnKey;
  label: string;
  group: ColumnConfig['group'];
  visible: boolean;
  fixed?: boolean;
}

const STORAGE_KEY = 'productTableColumns';
const STORAGE_VERSION_KEY = 'productTableColumnsVersion';

type StoredColumnsPayload = Array<{ key: ColumnKey; visible?: boolean }>;

type LegacyStoredPayload = ColumnKey[];

const createDefaultState = (): ProductTableColumnState[] =>
  AVAILABLE_COLUMNS.map(column => ({
    key: column.key,
    label: column.label,
    group: column.group,
    visible: column.defaultVisible,
    fixed: undefined
  }));

const migrateLegacyToNamespaced = () => {
  try {
    const empresaId = ensureEmpresaId();
    const markerKey = `${empresaId}:catalog_migrated`;
    const migrated = localStorage.getItem(markerKey);
    if (migrated === 'v1') return;

    const legacyKeys = [
      'catalog_products',
      'catalog_categories',
      'catalog_packages',
      'productTableColumns',
      'productTableColumnsVersion',
      'productFieldsConfig'
    ];

    for (const key of legacyKeys) {
      const namespaced = `${empresaId}:${key}`;
      const hasNamespaced = localStorage.getItem(namespaced) !== null;
      const legacyValue = localStorage.getItem(key);
      if (!hasNamespaced && legacyValue !== null) {
        localStorage.setItem(namespaced, legacyValue);
        localStorage.removeItem(key);
      }
    }

    localStorage.setItem(markerKey, 'v1');
  } catch (error) {
    console.warn('Migración legacy->namespaced (ProductColumns) omitida:', error);
  }
};

const mergeWithDefaults = (entries: StoredColumnsPayload): ProductTableColumnState[] => {
  const defaults = createDefaultState();
  const defaultMap = new Map(defaults.map(column => [column.key, column]));
  const ordered: ProductTableColumnState[] = [];

  entries.forEach(entry => {
    const definition = defaultMap.get(entry.key);
    if (!definition) {
      return;
    }

    ordered.push({
      ...definition,
      visible: definition.fixed ? true : entry.visible ?? definition.visible
    });
    defaultMap.delete(entry.key);
  });

  defaultMap.forEach(column => {
    ordered.push({ ...column });
  });

  return ordered;
};

const parseStoredColumns = (raw: string | null): ProductTableColumnState[] | null => {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as StoredColumnsPayload | LegacyStoredPayload;
    if (!Array.isArray(parsed)) {
      return null;
    }

    if (parsed.length === 0) {
      return createDefaultState();
    }

    const looksLikeLegacy = typeof parsed[0] === 'string';
    if (looksLikeLegacy) {
      const mapped = (parsed as LegacyStoredPayload).map(key => ({ key, visible: true })) as StoredColumnsPayload;
      return mergeWithDefaults(mapped);
    }

    const sanitized: StoredColumnsPayload = (parsed as StoredColumnsPayload).filter(
      entry => entry && typeof entry === 'object' && 'key' in entry && typeof entry.key === 'string'
    ) as StoredColumnsPayload;

    if (sanitized.length === 0) {
      return null;
    }

    return mergeWithDefaults(sanitized);
  } catch {
    return null;
  }
};

const loadInitialState = (): ProductTableColumnState[] => {
  try {
    migrateLegacyToNamespaced();
  } catch {
    // noop
  }

  let saved: string | null = null;
  let savedVersion: string | null = null;

  try {
    saved = localStorage.getItem(lsKey(STORAGE_KEY));
    savedVersion = localStorage.getItem(lsKey(STORAGE_VERSION_KEY));
  } catch {
    return createDefaultState();
  }

  if (savedVersion !== COLUMN_CONFIG_VERSION) {
    const defaults = createDefaultState();
    try {
      localStorage.setItem(lsKey(STORAGE_VERSION_KEY), COLUMN_CONFIG_VERSION);
      localStorage.setItem(
        lsKey(STORAGE_KEY),
        JSON.stringify(defaults.map(column => ({ key: column.key, visible: column.visible })))
      );
    } catch {
      // noop
    }
    return defaults;
  }

  const parsed = parseStoredColumns(saved);
  return parsed ?? createDefaultState();
};

export const useProductColumnsManager = () => {
  const [columns, setColumns] = useState<ProductTableColumnState[]>(() => loadInitialState());

  useEffect(() => {
    try {
      localStorage.setItem(
        lsKey(STORAGE_KEY),
        JSON.stringify(columns.map(column => ({ key: column.key, visible: column.visible })))
      );
      localStorage.setItem(lsKey(STORAGE_VERSION_KEY), COLUMN_CONFIG_VERSION);
    } catch (error) {
      console.warn('No se pudo persistir preferencias de columnas (empresaId inválido?):', error);
    }
  }, [columns]);

  const toggleColumn = useCallback((columnKey: ColumnKey) => {
    setColumns(prev => {
      return prev.map(column => {
        if (column.key !== columnKey || column.fixed) {
          return column;
        }
        return { ...column, visible: !column.visible };
      });
    });
  }, []);

  const reorderColumns = useCallback((sourceKey: ColumnKey, targetKey: ColumnKey) => {
    if (sourceKey === targetKey) {
      return;
    }

    setColumns(prev => {
      const sourceIndex = prev.findIndex(column => column.key === sourceKey);
      const targetIndex = prev.findIndex(column => column.key === targetKey);

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
    setColumns(createDefaultState());
  }, []);

  const selectAllColumns = useCallback(() => {
    setColumns(prev => prev.map(column => ({ ...column, visible: true })));
  }, []);

  const visibleColumns = useMemo(() => columns.filter(column => column.visible), [columns]);
  const visibleColumnKeys = useMemo(() => visibleColumns.map(column => column.key), [visibleColumns]);

  return {
    columns,
    visibleColumns,
    visibleColumnKeys,
    visibleColumnCount: visibleColumns.length,
    toggleColumn,
    reorderColumns,
    resetColumns,
    selectAllColumns
  };
};
