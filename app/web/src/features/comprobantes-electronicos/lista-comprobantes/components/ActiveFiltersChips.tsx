/**
 * ActiveFiltersChips - Chips de filtros activos
 * Muestra los filtros aplicados actualmente con opción de eliminarlos
 */

import { X } from 'lucide-react';
import { formatDateShortSpanish, getTodayISO } from '../../utils/dateUtils';

interface ActiveFiltersChipsProps {
  globalSearch: string;
  columnFilters: Record<string, string>;
  dateFrom: string;
  dateTo: string;
  onClearGlobalSearch: () => void;
  onClearColumnFilter: (columnKey: string) => void;
  onClearDateFilter: () => void;
  onClearAllFilters: () => void;
}

export const ActiveFiltersChips: React.FC<ActiveFiltersChipsProps> = ({
  globalSearch,
  columnFilters,
  dateFrom,
  dateTo,
  onClearGlobalSearch,
  onClearColumnFilter,
  onClearDateFilter,
  onClearAllFilters
}) => {
  const hasAnyFilter =
    globalSearch ||
    Object.keys(columnFilters).length > 0 ||
    dateFrom !== getTodayISO() ||
    dateTo !== getTodayISO();

  if (!hasAnyFilter) return null;

  // Mapeo de nombres de columnas a labels legibles
  const columnLabels: Record<string, string> = {
    id: 'N° Comprobante',
    type: 'Tipo',
    client: 'Cliente',
    clientDoc: 'N° Doc Cliente',
    vendor: 'Vendedor',
    status: 'Estado'
  };

  return (
    <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Chip de búsqueda global */}
        {globalSearch && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium border border-blue-200 dark:border-blue-800">
            <span>Búsqueda: {globalSearch}</span>
            <button
              onClick={onClearGlobalSearch}
              className="hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-full p-0.5 transition-colors"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Chips de filtros por columna */}
        {Object.entries(columnFilters).map(([key, value]) => (
          <div
            key={key}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg text-xs font-medium border border-green-200 dark:border-green-800"
          >
            <span>
              {columnLabels[key] || key}: {value}
            </span>
            <button
              onClick={() => onClearColumnFilter(key)}
              className="hover:bg-green-100 dark:hover:bg-green-900/40 rounded-full p-0.5 transition-colors"
              aria-label={`Limpiar filtro de ${columnLabels[key] || key}`}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        {/* Chip de filtro de fecha */}
        {(dateFrom !== getTodayISO() || dateTo !== getTodayISO()) && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-medium border border-purple-200 dark:border-purple-800">
            <span>
              Fecha: {formatDateShortSpanish(dateFrom)} — {formatDateShortSpanish(dateTo)}
            </span>
            <button
              onClick={onClearDateFilter}
              className="hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-full p-0.5 transition-colors"
              aria-label="Limpiar filtro de fecha"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Botón Limpiar todo */}
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
    </div>
  );
};
