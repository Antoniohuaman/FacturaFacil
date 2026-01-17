/**
 * ActiveFiltersChips - Chips de filtros activos
 * Muestra los filtros aplicados con opción para limpiarlos individualmente
 * Diseño: Coincide EXACTAMENTE con el diseño actual de ListaComprobantes.tsx
 */

import { X } from 'lucide-react';

interface ColumnConfig {
  id: string;
  key: string;
  label: string;
}

interface ActiveFiltersChipsProps {
  columnFilters: Record<string, string>;
  dateFrom: string;
  dateTo: string;
  todayDate: string;
  columnsConfig: ColumnConfig[];
  formatDateShort: (date: string) => string;
  onClearColumnFilter: (columnKey: string) => void;
  onClearDateFilter: () => void;
  onClearAllFilters: () => void;
}

export const ActiveFiltersChips: React.FC<ActiveFiltersChipsProps> = ({
  columnFilters,
  dateFrom,
  dateTo,
  todayDate,
  columnsConfig,
  formatDateShort,
  onClearColumnFilter,
  onClearDateFilter,
  onClearAllFilters
}) => {
  const hasColumnFilters = Object.keys(columnFilters).length > 0;
  const hasDateFilter = dateFrom !== todayDate || dateTo !== todayDate;
  const hasAnyFilter = hasColumnFilters || hasDateFilter;

  if (!hasAnyFilter) return null;

  return (
    <div className="mt-3 flex items-center gap-2 flex-wrap">
      {/* Date filter chip */}
      {hasDateFilter && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-medium border border-purple-200 dark:border-purple-800">
          <span>Fecha: {formatDateShort(dateFrom)} — {formatDateShort(dateTo)}</span>
          <button
            onClick={onClearDateFilter}
            className="hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-full p-0.5 transition-colors"
            aria-label="Limpiar filtro de fecha"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Column filter chips */}
      {Object.entries(columnFilters).map(([columnKey, filterValue]) => {
        const column = columnsConfig.find(c => c.key === columnKey);
        return (
          <div
            key={columnKey}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg text-xs font-medium border border-green-200 dark:border-green-800"
          >
            <span>{column?.label || columnKey}: {filterValue}</span>
            <button
              onClick={() => onClearColumnFilter(columnKey)}
              className="hover:bg-green-100 dark:hover:bg-green-900/40 rounded-full p-0.5 transition-colors"
              aria-label={`Limpiar filtro de ${column?.label || columnKey}`}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}

      {/* Clear all button */}
      {hasAnyFilter && (
        <button
          onClick={onClearAllFilters}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-xs font-medium transition-colors"
          aria-label="Limpiar todos los filtros"
        >
          <X className="w-3 h-3" />
          Limpiar todo
        </button>
      )}
    </div>
  );
};
