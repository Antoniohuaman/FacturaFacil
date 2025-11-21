import React from 'react';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import type { ImportTableColumnConfig, PriceImportPreviewRow } from '../../models/PriceImportTypes';
import { formatDateLabel } from '../../utils/importProcessing';

interface ImportPreviewTableProps {
  rows: PriceImportPreviewRow[];
  tableColumns: ImportTableColumnConfig[];
  readyCount: number;
  isParsing: boolean;
  isApplying: boolean;
  loading: boolean;
  onApplyPrices: () => void;
}

export const ImportPreviewTable: React.FC<ImportPreviewTableProps> = ({
  rows,
  tableColumns,
  readyCount,
  isParsing,
  isApplying,
  loading,
  onApplyPrices
}) => (
  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      <div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Vista previa de la importación</h3>
        <p className="text-sm text-gray-500">Solo se mostrarán las filas que contienen datos.</p>
      </div>
      <button
        type="button"
        onClick={onApplyPrices}
        disabled={loading || isParsing || isApplying || readyCount === 0}
        className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${readyCount === 0 || loading || isParsing || isApplying
          ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-300 cursor-not-allowed'
          : 'bg-green-600 text-white hover:bg-green-700'}`}
      >
        Aplicar precios
      </button>
    </div>
    <div className="overflow-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
        <thead className="bg-gray-50 dark:bg-gray-900/30">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-gray-500">Fila</th>
            <th className="px-3 py-2 text-left font-medium text-gray-500">SKU</th>
            <th className="px-3 py-2 text-left font-medium text-gray-500">Unidad</th>
            {tableColumns.map(column => (
              <th key={column.columnId} className="px-3 py-2 text-left font-medium text-gray-500">
                {column.header}
              </th>
            ))}
            <th className="px-3 py-2 text-left font-medium text-gray-500">Vigencia</th>
            <th className="px-3 py-2 text-left font-medium text-gray-500">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {rows.length === 0 && (
            <tr>
              <td colSpan={tableColumns.length + 5} className="px-3 py-6 text-center text-gray-500">
                Carga un archivo XLSX para comenzar.
              </td>
            </tr>
          )}
          {rows.map(row => (
            <tr key={row.id} className="bg-white dark:bg-gray-900/20">
              <td className="px-3 py-2 text-gray-500">{row.rowNumber}</td>
              <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{row.sku}</td>
              <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{row.unitCode}</td>
              {tableColumns.map(column => {
                const cellPrice = row.prices[column.columnId];
                return (
                  <td key={`${row.id}-${column.columnId}`} className="px-3 py-2 text-gray-700 dark:text-gray-200">
                    {cellPrice === null && (
                      <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">Eliminar</span>
                    )}
                    {typeof cellPrice === 'number' && cellPrice.toFixed(2)}
                  </td>
                );
              })}
              <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{formatDateLabel(row.validUntil)}</td>
              <td className="px-3 py-2">
                {row.status === 'ready' && (
                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                    <CheckCircle2 className="w-3 h-3 mr-1" aria-hidden /> Lista
                  </span>
                )}
                {row.status === 'applied' && (
                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                    <Info className="w-3 h-3 mr-1" aria-hidden /> Aplicada
                  </span>
                )}
                {row.status === 'error' && (
                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-600">
                    <AlertTriangle className="w-3 h-3 mr-1" aria-hidden /> Revisar
                  </span>
                )}
                {row.errors.length > 0 && (
                  <ul className="mt-2 text-xs text-red-600 space-y-1">
                    {row.errors.map((message, index) => (
                      <li key={`${row.id}-err-${index}`}>{message}</li>
                    ))}
                  </ul>
                )}
                {row.warnings.length > 0 && row.errors.length === 0 && (
                  <ul className="mt-2 text-xs text-amber-600 space-y-1">
                    {row.warnings.map((message, index) => (
                      <li key={`${row.id}-warn-${index}`}>{message}</li>
                    ))}
                  </ul>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
