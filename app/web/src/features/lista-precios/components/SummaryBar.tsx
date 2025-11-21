import React from 'react';
import { Check, AlertCircle, Plus } from 'lucide-react';
import type { Column } from '../models/PriceTypes';
import {
  filterVisibleColumns,
  findBaseColumn,
  countColumnsByMode,
  validateColumnConfiguration,
  countManualColumns,
  MANUAL_COLUMN_LIMIT
} from '../utils/priceHelpers';

interface SummaryBarProps {
  columns: Column[];
  onAssignPrice?: () => void;
  viewMode?: 'products' | 'columns' | 'packages' | 'import';
}

export const SummaryBar = React.memo<SummaryBarProps>(({ columns, onAssignPrice, viewMode = 'products' }) => {
  const visibleColumns = filterVisibleColumns(columns);
  const baseColumn = findBaseColumn(columns);
  const fixedCount = countColumnsByMode(columns, 'fixed');
  const volumeCount = countColumnsByMode(columns, 'volume');
  const { isValid } = validateColumnConfiguration(columns);
  const manualCount = countManualColumns(columns);
  const isProductView = viewMode === 'products';

  if (isProductView) {
    return (
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {baseColumn ? `Columna base: ${baseColumn.name}` : 'Define una columna base en Plantilla de columnas'}
          </div>
          {onAssignPrice && (
            <button
              onClick={onAssignPrice}
              className="flex items-center px-3 py-2 text-white rounded-md text-sm hover:opacity-90 transition-colors whitespace-nowrap"
              style={{ backgroundColor: '#1478D4' }}
            >
              <Plus size={16} className="mr-2" />
              Asignar precio
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <div className="flex items-center">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 mr-3">Columna base:</span>
            {baseColumn ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300">
                <Check size={12} className="mr-1" />
                {baseColumn.id} - {baseColumn.name}
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300">
                <AlertCircle size={12} className="mr-1" />
                No definida
              </span>
            )}
          </div>

          <div className="flex items-center">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 mr-3">Visibles:</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300">
              {visibleColumns.length} de {columns.length}
            </span>
          </div>

          <div className="flex items-center">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 mr-3">Total:</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
              {columns.length} / 10
            </span>
          </div>

          <div className="flex items-center">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 mr-3">Manuales:</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
              {manualCount} / {MANUAL_COLUMN_LIMIT}
            </span>
          </div>

          <div className="flex items-center">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 mr-3">Estado:</span>
            {isValid ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300">
                <Check size={12} className="mr-1" />
                Configuración válida
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300">
                <AlertCircle size={12} className="mr-1" />
                Requiere configuración
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {fixedCount} Precio fijo · {volumeCount} Precio por cantidad
          </div>
          {onAssignPrice && (
            <button
              onClick={onAssignPrice}
              className="flex items-center px-3 py-2 text-white rounded-md text-sm hover:opacity-90 transition-colors whitespace-nowrap"
              style={{ backgroundColor: '#1478D4' }}
            >
              <Plus size={16} className="mr-2" />
              Asignar precio
            </button>
          )}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: solo re-renderizar si cambia la lista de columnas o el handler
  return (
    prevProps.onAssignPrice === nextProps.onAssignPrice &&
    prevProps.viewMode === nextProps.viewMode &&
    JSON.stringify(prevProps.columns) === JSON.stringify(nextProps.columns)
  );
});

SummaryBar.displayName = 'SummaryBar';
