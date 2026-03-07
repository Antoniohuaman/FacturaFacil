import React, { useCallback, useMemo } from 'react';
import { ColumnsManager, type ColumnsManagerColumn } from '@/shared/columns/ColumnsManager';
import { AVAILABLE_COLUMNS, type ColumnKey } from './columnConfig';
import type { ProductTableColumnState } from '../../hooks/useProductColumnsManager';

interface ProductColumnsManagerButtonProps {
  columns: ProductTableColumnState[];
  onToggleColumn: (columnKey: ColumnKey) => void;
  onResetColumns: () => void;
  onSelectAllColumns: () => void;
  onReorderColumns: (sourceKey: ColumnKey, targetKey: ColumnKey) => void;
}

const COLUMN_KEYS = new Set<ColumnKey>(AVAILABLE_COLUMNS.map(column => column.key));

const isColumnKey = (id: string): id is ColumnKey => COLUMN_KEYS.has(id as ColumnKey);

export const ProductColumnsManagerButton: React.FC<ProductColumnsManagerButtonProps> = ({
  columns,
  onToggleColumn,
  onResetColumns,
  onSelectAllColumns,
  onReorderColumns
}) => {
  const handleToggleColumn = useCallback(
    (columnId: string) => {
      if (!isColumnKey(columnId)) {
        return;
      }
      onToggleColumn(columnId);
    },
    [onToggleColumn]
  );

  const handleReorderColumns = useCallback(
    (sourceId: string, targetId: string) => {
      if (!isColumnKey(sourceId) || !isColumnKey(targetId)) {
        return;
      }
      onReorderColumns(sourceId, targetId);
    },
    [onReorderColumns]
  );

  const manageableColumns: ColumnsManagerColumn[] = useMemo(
    () =>
      columns.map(column => ({
        id: column.key,
        label: column.label,
        visible: column.visible,
        fixed: column.fixed
      })),
    [columns]
  );

  return (
    <ColumnsManager
      columns={manageableColumns}
      onToggleColumn={handleToggleColumn}
      onResetColumns={onResetColumns}
      onSelectAllColumns={onSelectAllColumns}
      onReorderColumns={handleReorderColumns}
      buttonLabel="+ Columnas"
    />
  );
};
