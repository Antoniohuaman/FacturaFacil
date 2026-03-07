/**
 * TableFooter - Footer de tabla con paginación y controles
 * Diseño: Coincide EXACTAMENTE con el diseño actual de ListaComprobantes.tsx
 */

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TableFooterProps {
  recordsPerPage: number;
  currentPage: number;
  totalPages: number;
  startRecord: number;
  endRecord: number;
  totalRecords: number;
  onToggleTotals: () => void;
  onRecordsPerPageChange: (value: number) => void;
  onPageChange: (page: number) => void;
}

export const TableFooter: React.FC<TableFooterProps> = ({
  recordsPerPage,
  currentPage,
  totalPages,
  startRecord,
  endRecord,
  totalRecords,
  onToggleTotals,
  onRecordsPerPageChange,
  onPageChange
}) => {
  return (
    <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-t border-gray-200 dark:border-gray-600">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleTotals}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Mostrar totales
          </button>

          {/* Selector de registros por página */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700 dark:text-gray-300">Mostrar:</span>
            <select
              value={recordsPerPage}
              onChange={(e) => onRecordsPerPageChange(Number(e.target.value))}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-gray-700 dark:text-gray-300">por página</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {startRecord} – {endRecord} de {totalRecords}
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
