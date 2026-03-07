import React, { useMemo } from 'react';
import { ColumnsManager, type ColumnsManagerColumn } from '@/shared/columns/ColumnsManager';
import type { Column } from '../../models/PriceTypes';
import { getColumnDisplayName } from '../../utils/priceHelpers';

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
      .filter(column => column.visible !== false)
      .sort((a, b) => a.order - b.order)
      .map(column => ({
        id: column.id,
        label: getColumnDisplayName(column),
        visible: column.isVisibleInTable !== false,
        fixed: false
      }))
  ), [columns]);

  const visibleCount = useMemo(() => (
    columns.filter(column => column.visible !== false && column.isVisibleInTable !== false).length
  ), [columns]);

  return (
    <div className="flex items-center gap-2">
      <ColumnsManager
        columns={manageableColumns}
        onToggleColumn={onToggleColumnVisibility}
        onResetColumns={onResetColumns}
        onSelectAllColumns={onSelectAllColumns}
        onReorderColumns={onReorderColumns}
        title={`${visibleCount} columnas`}
      />
      <span className="text-[11px] text-gray-500 whitespace-nowrap">
        {visibleCount} columna{visibleCount === 1 ? '' : 's'} visibles en tabla
      </span>
    </div>
  );
};
