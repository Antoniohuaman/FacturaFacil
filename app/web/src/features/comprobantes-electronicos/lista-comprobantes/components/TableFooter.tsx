/**
 * TableFooter - Footer de la tabla con paginación y controles
 * Maneja la paginación y selector de registros por página
 */

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TABLE_CONFIG } from '../../models/constants';

interface TableFooterProps {
  showTotals: boolean;
  onToggleTotals: () => void;
  recordsPerPage: number;
  onRecordsPerPageChange: (value: number) => void;
  currentPage: number;
  totalPages: number;
  startRecord: number;
  endRecord: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
}

export const TableFooter: React.FC<TableFooterProps> = ({
  showTotals,
  onToggleTotals,
  recordsPerPage,
  onRecordsPerPageChange,
  currentPage,
  totalPages,
  startRecord,
  endRecord,
  totalRecords,
  onPageChange
}) => {
  return (
    <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleTotals}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            {showTotals ? 'Ocultar totales' : 'Mostrar totales'}
          </button>

          {/* Selector de registros por página */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700 dark:text-gray-300">Mostrar:</span>
            <select
              value={recordsPerPage}
              onChange={(e) => onRecordsPerPageChange(Number(e.target.value))}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {TABLE_CONFIG.RECORDS_PER_PAGE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
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
              aria-label="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Números de página */}
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;

                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={i}
                    onClick={() => onPageChange(pageNum)}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Página siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
