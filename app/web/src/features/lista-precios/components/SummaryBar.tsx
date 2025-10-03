import React from 'react';
import { Check, AlertCircle } from 'lucide-react';
import type { Column } from '../models/PriceTypes';
import { 
  filterVisibleColumns, 
  findBaseColumn, 
  countColumnsByMode,
  validateColumnConfiguration 
} from '../utils/priceHelpers';

interface SummaryBarProps {
  columns: Column[];
}

export const SummaryBar: React.FC<SummaryBarProps> = ({ columns }) => {
  const visibleColumns = filterVisibleColumns(columns);
  const baseColumn = findBaseColumn(columns);
  const fixedCount = countColumnsByMode(columns, 'fixed');
  const volumeCount = countColumnsByMode(columns, 'volume');
  const { isValid } = validateColumnConfiguration(columns);

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
        
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {fixedCount} Precio fijo | {volumeCount} Precio por cantidad
        </div>
      </div>
    </div>
  );
};