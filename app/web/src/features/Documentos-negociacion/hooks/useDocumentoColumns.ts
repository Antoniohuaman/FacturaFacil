import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ColumnConfig } from '../../comprobantes-electronicos/lista-comprobantes/types/columnConfig';
import {
  loadColumnsConfig,
  persistColumnsConfig,
  resolveTenantColumnsKey
} from '../../comprobantes-electronicos/lista-comprobantes/utils/columnPersistence';

interface UseDocumentoColumnsOptions {
  storageKey: string;
  legacyKey?: string;
  defaultColumns: ColumnConfig[];
}

interface PreviousKeysRef {
  tenantKey: string | null;
  legacyKey: string | null | undefined;
}

export interface DocumentoColumnsHookResult {
  columnsConfig: ColumnConfig[];
  visibleColumns: ColumnConfig[];
  visibleColumnIds: string[];
  lockedColumnIds: string[];
  toggleColumn: (columnId: string) => void;
  reorderColumns: (sourceId: string, targetId: string) => void;
  resetColumns: () => void;
  selectAllColumns: () => void;
}

export const useDocumentoColumns = ({
  storageKey,
  legacyKey,
  defaultColumns
}: UseDocumentoColumnsOptions): DocumentoColumnsHookResult => {
  const tenantStorageKey = resolveTenantColumnsKey(storageKey);
  const legacyStorageKey = legacyKey ?? null;

  const computeInitialConfig = useCallback(
    () =>
      loadColumnsConfig({
        tenantKey: tenantStorageKey,
        legacyKey: legacyStorageKey,
        fallback: defaultColumns
      }),
    [tenantStorageKey, legacyStorageKey, defaultColumns]
  );

  const [columnsConfig, setColumnsConfig] = useState<ColumnConfig[]>(() => computeInitialConfig());
  const previousKeysRef = useRef<PreviousKeysRef>({ tenantKey: tenantStorageKey, legacyKey: legacyStorageKey });

  useEffect(() => {
    const previous = previousKeysRef.current;
    if (previous.tenantKey === tenantStorageKey && previous.legacyKey === legacyStorageKey) {
      return;
    }

    previousKeysRef.current = { tenantKey: tenantStorageKey, legacyKey: legacyStorageKey };
    setColumnsConfig(computeInitialConfig());
  }, [tenantStorageKey, legacyStorageKey, computeInitialConfig]);

  useEffect(() => {
    persistColumnsConfig({
      tenantKey: tenantStorageKey,
      legacyKey: legacyStorageKey ?? undefined,
      columns: columnsConfig
    });
  }, [columnsConfig, tenantStorageKey, legacyStorageKey]);

  const toggleColumn = useCallback((columnId: string) => {
    setColumnsConfig((prev) =>
      prev.map((column) => {
        if (column.id !== columnId || column.fixed) {
          return column;
        }
        return { ...column, visible: !column.visible };
      })
    );
  }, []);

  const reorderColumns = useCallback((sourceId: string, targetId: string) => {
    if (sourceId === targetId) {
      return;
    }

    setColumnsConfig((prev) => {
      const sourceIndex = prev.findIndex((column) => column.id === sourceId);
      const targetIndex = prev.findIndex((column) => column.id === targetId);

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
    setColumnsConfig(defaultColumns.map((column) => ({ ...column })));
  }, [defaultColumns]);

  const selectAllColumns = useCallback(() => {
    setColumnsConfig((prev) =>
      prev.map((column) => (column.fixed ? column : { ...column, visible: true }))
    );
  }, []);

  const visibleColumns = useMemo(
    () => columnsConfig.filter((column) => column.fixed || column.visible),
    [columnsConfig]
  );

  const visibleColumnIds = useMemo(() => visibleColumns.map((column) => column.id), [visibleColumns]);

  const lockedColumnIds = useMemo(
    () => columnsConfig.filter((column) => Boolean(column.fixed)).map((column) => column.id),
    [columnsConfig]
  );

  return {
    columnsConfig,
    visibleColumns,
    visibleColumnIds,
    lockedColumnIds,
    toggleColumn,
    reorderColumns,
    resetColumns,
    selectAllColumns
  };
};
