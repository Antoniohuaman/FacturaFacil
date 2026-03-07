import { useCallback, useMemo } from 'react';
import { ColumnsManager, type ColumnsManagerColumn } from '@/shared/columns/ColumnsManager';
import type { TableColumnState } from '../columns/types';

interface CobranzasColumnsManagerButtonProps<K extends string = string> {
  columns: TableColumnState<K>[];
  title: string;
  onToggleColumn: (columnKey: K) => void;
  onResetColumns: () => void;
  onSelectAllColumns: () => void;
  onReorderColumns: (sourceKey: K, targetKey: K) => void;
}

export const CobranzasColumnsManagerButton = <K extends string>({
  columns,
  title,
  onToggleColumn,
  onResetColumns,
  onSelectAllColumns,
  onReorderColumns
}: CobranzasColumnsManagerButtonProps<K>) => {
  const manageableColumns = useMemo<ColumnsManagerColumn[]>(
    () =>
      columns.map((column) => ({
        id: column.key,
        label: column.label,
        visible: column.visible,
        fixed: column.fixed
      })),
    [columns]
  );

  const handleToggleColumn = useCallback(
    (columnId: string) => {
      const target = columns.find((column) => column.key === columnId);
      if (!target) {
        return;
      }
      onToggleColumn(target.key);
    },
    [columns, onToggleColumn]
  );

  const handleReorderColumns = useCallback(
    (sourceId: string, targetId: string) => {
      const source = columns.find((column) => column.key === sourceId);
      const target = columns.find((column) => column.key === targetId);

      if (!source || !target) {
        return;
      }

      onReorderColumns(source.key, target.key);
    },
    [columns, onReorderColumns]
  );

  return (
    <ColumnsManager
      columns={manageableColumns}
      onToggleColumn={handleToggleColumn}
      onResetColumns={onResetColumns}
      onSelectAllColumns={onSelectAllColumns}
      onReorderColumns={handleReorderColumns}
      title={title}
      buttonLabel="Columnas"
    />
  );
};
