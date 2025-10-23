import { Printer, Download, MoreVertical, X } from 'lucide-react';
import { useSelection } from './SelectionContext';

interface BulkBarProps {
  onPrint: () => void;
  onExport: () => void;
  onDownloadXml?: () => void;
  formatCurrency: (amount: number) => string;
}

export const BulkBar = ({ onPrint, onExport, onDownloadXml, formatCurrency }: BulkBarProps) => {
  const { selectedCount, selectedTotal, clearSelection } = useSelection();

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-blue-600 dark:bg-blue-700 border-t border-blue-700 dark:border-blue-800 shadow-2xl">
      <div className="max-w-[1920px] mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Información de selección */}
          <div className="flex items-center gap-4 text-white">
            <button
              onClick={clearSelection}
              className="p-1.5 hover:bg-blue-700 dark:hover:bg-blue-600 rounded-lg transition-colors"
              aria-label="Limpiar selección"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm font-medium">
              <span>{selectedCount} seleccionado{selectedCount !== 1 ? 's' : ''}</span>
              <span className="text-blue-200">•</span>
              <span>Total: {formatCurrency(selectedTotal)}</span>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2">
            <button
              onClick={onPrint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors font-medium text-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600"
              aria-label="Imprimir seleccionados"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>

            <button
              onClick={onExport}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors font-medium text-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600"
              aria-label="Exportar seleccionados"
            >
              <Download className="w-4 h-4" />
              <span>Exportar</span>
            </button>

            {onDownloadXml && (
              <div className="relative group">
                <button
                  onClick={onDownloadXml}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors font-medium text-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600"
                  aria-label="Más acciones"
                  title="Descargar XML"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  Descargar XML
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
