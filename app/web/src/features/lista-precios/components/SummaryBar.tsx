import React from 'react';
import { Check, AlertCircle, Plus, Search, X, Download } from 'lucide-react';
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
  searchSKU?: string;
  onSearchChange?: (value: string) => void;
  filteredProductsCount?: number;
  onExportPrices?: () => void;
  exportDisabled?: boolean;
  exportBusy?: boolean;
  exportErrorMessage?: string;
  exportDisabledReason?: string;
  columnsManagerTrigger?: React.ReactNode;
}

export const SummaryBar = React.memo<SummaryBarProps>(({
  columns,
  onAssignPrice,
  viewMode = 'products',
  searchSKU = '',
  onSearchChange,
  filteredProductsCount = 0,
  onExportPrices,
  exportDisabled,
  exportBusy,
  exportErrorMessage,
  exportDisabledReason,
  columnsManagerTrigger
}) => {
  const visibleColumns = filterVisibleColumns(columns);
  const baseColumn = findBaseColumn(columns);
  const fixedCount = countColumnsByMode(columns, 'fixed');
  const volumeCount = countColumnsByMode(columns, 'volume');
  const { isValid } = validateColumnConfiguration(columns);
  const manualCount = countManualColumns(columns);
  const isProductView = viewMode === 'products';
  const showSearchInput = isProductView && typeof onSearchChange === 'function';
  const trimmedSearch = searchSKU.trim();
  const hasSearch = showSearchInput && trimmedSearch.length > 0;
  const pluralSuffix = filteredProductsCount === 1 ? '' : 's';

  if (isProductView) {
    return (
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            {showSearchInput && (
              <div className="relative flex-1 min-w-[240px] max-w-xl">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
                <input
                  type="text"
                  value={searchSKU}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  placeholder="Buscar producto..."
                  className="w-full h-10 pl-10 pr-9 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-inner"
                />
                {hasSearch && (
                  <button
                    type="button"
                    onClick={() => onSearchChange?.('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    title="Limpiar búsqueda"
                    aria-label="Limpiar búsqueda"
                  >
                    <X size={14} aria-hidden />
                  </button>
                )}
              </div>
            )}

            <div className="flex-1" />

            <div className="flex items-center gap-3">
              {columnsManagerTrigger}
              {onExportPrices && (
                <button
                  type="button"
                  onClick={onExportPrices}
                  disabled={exportDisabled}
                  title={exportDisabledReason}
                  aria-label="Exportar precios visibles"
                  aria-busy={exportBusy}
                  className={`px-3 py-2.5 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${exportDisabled
                    ? 'text-gray-400 bg-gray-100 dark:bg-gray-800/50 cursor-not-allowed'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                  {exportBusy ? (
                    <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" aria-hidden />
                  ) : (
                    <Download size={16} aria-hidden />
                  )}
                  <span>{exportBusy ? 'Exportando...' : 'Exportar'}</span>
                </button>
              )}

              {onAssignPrice && (
                <button
                  onClick={onAssignPrice}
                  className="flex items-center px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-95 transition-colors whitespace-nowrap shadow"
                  style={{ backgroundColor: '#1478D4' }}
                >
                  <Plus size={16} className="mr-2" />
                  Asignar precio
                </button>
              )}
            </div>
          </div>

          {hasSearch && (
            <div className={filteredProductsCount > 0 ? 'text-xs text-green-600' : 'text-xs text-gray-500'}>
              {filteredProductsCount > 0
                ? `✓ ${filteredProductsCount} producto${pluralSuffix} encontrado${pluralSuffix} para "${trimmedSearch}"`
                : `No se encontraron productos que coincidan con "${trimmedSearch}". Intenta con términos más generales.`}
            </div>
          )}

          {exportErrorMessage && (
            <div className="text-xs text-red-600 dark:text-red-400">
              {exportErrorMessage}
            </div>
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
  return (
    prevProps.onAssignPrice === nextProps.onAssignPrice &&
    prevProps.onExportPrices === nextProps.onExportPrices &&
    prevProps.viewMode === nextProps.viewMode &&
    prevProps.onSearchChange === nextProps.onSearchChange &&
    prevProps.searchSKU === nextProps.searchSKU &&
    prevProps.filteredProductsCount === nextProps.filteredProductsCount &&
    prevProps.exportDisabled === nextProps.exportDisabled &&
    prevProps.exportBusy === nextProps.exportBusy &&
    prevProps.exportErrorMessage === nextProps.exportErrorMessage &&
    prevProps.exportDisabledReason === nextProps.exportDisabledReason &&
    prevProps.columnsManagerTrigger === nextProps.columnsManagerTrigger &&
    areColumnsEqual(prevProps.columns, nextProps.columns)
  );
});

SummaryBar.displayName = 'SummaryBar';

const areColumnsEqual = (prevColumns: Column[], nextColumns: Column[]): boolean => {
  if (prevColumns === nextColumns) {
    return true;
  }

  if (prevColumns.length !== nextColumns.length) {
    return false;
  }

  const nextMap = new Map(nextColumns.map(column => [column.id, column] as const));
  if (nextMap.size !== nextColumns.length) {
    return false;
  }

  return prevColumns.every((column) => {
    const candidate = nextMap.get(column.id);
    if (!candidate) {
      return false;
    }

    return (
      column.name === candidate.name &&
      column.mode === candidate.mode &&
      column.isBase === candidate.isBase &&
      column.visible === candidate.visible &&
      (column.isVisibleInTable ?? true) === (candidate.isVisibleInTable ?? true) &&
      column.kind === candidate.kind &&
      column.globalRuleType === candidate.globalRuleType &&
      (column.globalRuleValue ?? null) === (candidate.globalRuleValue ?? null)
    );
  });
};
