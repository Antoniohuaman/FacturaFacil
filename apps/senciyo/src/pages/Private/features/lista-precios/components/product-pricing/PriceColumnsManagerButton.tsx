import React, { useMemo } from 'react';
import { ColumnsManager, type ColumnsManagerColumn } from '@/shared/columns/ColumnsManager';
import type { Column } from '../../models/PriceTypes';
import { getColumnDisplayName, isGlobalColumn } from '../../utils/priceHelpers';

interface PriceColumnsManagerButtonProps {
  columns: Column[];
  onToggleColumnVisibility: (columnId: string) => void;
  onReorderColumns: (sourceId: string, targetId: string) => void;
  onResetColumns: () => void;
  onSelectAllColumns: () => void;
}

export const PriceColumnsManagerButton: React.FC<PriceColumnsManagerButtonProps> = ({
  columns,
  onToggleColumnVisibility,
  onReorderColumns,
  onResetColumns,
  onSelectAllColumns
}) => {
  const manageableColumns: ColumnsManagerColumn[] = useMemo(() => (
    columns
      .filter(column => !isGlobalColumn(column) && column.visible !== false)
      .sort((a, b) => a.order - b.order)
      .map(column => ({
        id: column.id,
        label: getColumnDisplayName(column),
        visible: column.isVisibleInTable !== false,
        fixed: false
      }))
  ), [columns]);

  const visibleCount = useMemo(() => (
    columns.filter(column => !isGlobalColumn(column) && column.visible !== false && column.isVisibleInTable !== false).length
  ), [columns]);

  return (
    <ColumnsManager
      columns={manageableColumns}
      onToggleColumn={onToggleColumnVisibility}
      onResetColumns={onResetColumns}
      onSelectAllColumns={onSelectAllColumns}
      onReorderColumns={onReorderColumns}
      title={`${visibleCount} columnas`}
      buttonLabel="+ Precios"
    />
  );
};
