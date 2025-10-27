/**
 * TableHeader - Componente de encabezado de tabla de comprobantes
 * Maneja la visualización de columnas, filtros por columna y ordenamiento
 */

import { Search, Filter, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export interface ColumnConfig {
  id: string;
  key: string;
  label: string;
  visible: boolean;
  fixed: 'left' | 'right' | null;
  align: 'left' | 'center' | 'right';
  truncate?: boolean;
  minWidth?: string;
}

interface TableHeaderProps {
  visibleColumns: ColumnConfig[];
  columnFilters: Record<string, string>;
  onColumnFilterChange: (columnKey: string, value: string) => void;
  hasActiveFilter: (columnKey: string) => boolean;
  selectionCount: number;
  totalCount: number;
  onSelectAll: () => void;
}

export const TableHeader: React.FC<TableHeaderProps> = ({
  visibleColumns,
  columnFilters,
  onColumnFilterChange,
  hasActiveFilter,
  selectionCount,
  totalCount,
  onSelectAll
}) => {
  const [activeFilterColumn, setActiveFilterColumn] = useState<string | null>(null);
  const [tempColumnFilters, setTempColumnFilters] = useState<Record<string, string>>({});
  const filterInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Sincronizar tempColumnFilters con columnFilters cuando cambia el filtro activo
  useEffect(() => {
    if (activeFilterColumn) {
      setTempColumnFilters(columnFilters);
    }
  }, [activeFilterColumn, columnFilters]);

  // Auto-focus en input de filtro cuando se abre
  useEffect(() => {
    if (activeFilterColumn && filterInputRefs.current[activeFilterColumn]) {
      filterInputRefs.current[activeFilterColumn]?.focus();
    }
  }, [activeFilterColumn]);

  const handleFilterClick = (columnKey: string) => {
    if (activeFilterColumn === columnKey) {
      setActiveFilterColumn(null);
    } else {
      setActiveFilterColumn(columnKey);
    }
  };

  const renderColumnFilter = (column: ColumnConfig) => {
    if (column.key === 'actions') return null;

    // Columnas con búsqueda de texto
    if (['id', 'client', 'vendor', 'clientDoc'].includes(column.key)) {
      return (
        <div className="relative">
          <button
            onClick={() => handleFilterClick(column.key)}
            className={`p-1 rounded transition-colors ${
              hasActiveFilter(column.key)
                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
            aria-label={`Filtrar por ${column.label}`}
          >
            <Search className="w-4 h-4" />
          </button>

          {activeFilterColumn === column.key && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setActiveFilterColumn(null)}
              />
              <div className="absolute left-0 top-full mt-2 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-3 min-w-[250px]">
                <input
                  ref={(el) => (filterInputRefs.current[column.key] = el)}
                  type="text"
                  placeholder={`Buscar ${column.label.toLowerCase()}...`}
                  defaultValue={columnFilters[column.key] || ''}
                  onChange={(e) => onColumnFilterChange(column.key, e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </>
          )}
        </div>
      );
    }

    // Columnas con filtro de tipo (checkboxes)
    if (column.key === 'type') {
      return (
        <button
          onClick={() => handleFilterClick(column.key)}
          className={`p-1 rounded transition-colors ${
            hasActiveFilter(column.key)
              ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
              : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
          }`}
          aria-label={`Filtrar por ${column.label}`}
        >
          <Filter className="w-4 h-4" />
        </button>
      );
    }

    // Columnas con ordenamiento
    if (['date', 'total'].includes(column.key)) {
      return (
        <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors">
          <ChevronDown className="w-4 h-4" />
        </button>
      );
    }

    return null;
  };

  return (
    <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
      <tr>
        {/* Checkbox de selección */}
        <th className="px-6 py-3 text-left w-12">
          <input
            type="checkbox"
            checked={selectionCount === totalCount && totalCount > 0}
            onChange={onSelectAll}
            className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-600 border-gray-300 dark:border-gray-500 rounded focus:ring-blue-500"
            aria-label="Seleccionar todos"
          />
        </th>

        {/* Columnas dinámicas */}
        {visibleColumns.map((column) => (
          <th
            key={column.id}
            className={`px-6 py-3 text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider ${
              column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'
            }`}
            style={{ minWidth: column.minWidth }}
          >
            <div className="flex items-center space-x-2">
              <span>{column.label}</span>
              {renderColumnFilter(column)}
            </div>
          </th>
        ))}
      </tr>
    </thead>
  );
};
