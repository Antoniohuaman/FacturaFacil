import React from 'react';
import { ChevronLeft, Printer, Send } from 'lucide-react';

interface DraftsBulkActionsBarProps {
  selectedCount: number;
  onEmitSelected: () => void;
  onDuplicateSelected?: () => void;
  onDeleteSelected?: () => void;
  onClearSelection: () => void;
  onOpenPrint: () => void;
}

export const DraftsBulkActionsBar: React.FC<DraftsBulkActionsBarProps> = ({
  selectedCount,
  onEmitSelected,
  onDuplicateSelected,
  onDeleteSelected,
  onClearSelection,
  onOpenPrint
}) => {
  if (selectedCount === 0) {
    return null;
  }

  const label = selectedCount === 1 ? 'borrador' : 'borradores';

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-6 py-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
          {selectedCount} {label} seleccionado{selectedCount > 1 ? 's' : ''}
        </span>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-3">
            <button
              className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
              onClick={onEmitSelected}
            >
              Emitir seleccionados
            </button>
            <button
              className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center space-x-2 border border-blue-300 dark:border-blue-500 rounded-md bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              onClick={onEmitSelected}
            >
              <Send className="w-4 h-4 mr-2" />
              <span>Emitir seleccionados</span>
            </button>
            <button
              className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
              onClick={onDuplicateSelected}
              disabled={!onDuplicateSelected}
            >
              Duplicar seleccionados
            </button>
            <button
              className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 font-medium"
              onClick={onDeleteSelected}
              disabled={!onDeleteSelected}
            >
              Eliminar seleccionados
            </button>
            <button
              onClick={onClearSelection}
              className="text-gray-400 hover:text-gray-600"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center ml-auto">
            <button
              className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-2 border border-blue-300 rounded-md bg-white hover:bg-blue-50 ml-4"
              onClick={onOpenPrint}
            >
              <Printer className="w-4 h-4 mr-2" />
              <span>Imprimir seleccionados</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
