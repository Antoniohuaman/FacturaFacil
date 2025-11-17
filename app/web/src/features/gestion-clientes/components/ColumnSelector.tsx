import React, { useEffect, useRef, useState } from 'react';
import { Layers } from 'lucide-react';
import type { ClienteColumnDefinition, ClienteColumnId } from '../hooks/useClientesColumns';

interface ColumnSelectorProps {
  columns: ClienteColumnDefinition[];
  visibleColumnIds: ClienteColumnId[];
  onToggleColumn: (columnId: ClienteColumnId) => void;
  onReset: () => void;
  onSelectAll: () => void;
}

const ColumnSelector: React.FC<ColumnSelectorProps> = ({ columns, visibleColumnIds, onToggleColumn, onReset, onSelectAll }) => {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;

    const handleClickOutside = (event: MouseEvent) => {
      if (!popoverRef.current) return;
      if (!popoverRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
      >
        <Layers className="h-4 w-4" />
        Columnas
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-64 rounded-lg border border-gray-200 bg-white p-3 shadow-2xl dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-3 flex items-center justify-between text-sm font-semibold text-gray-700 dark:text-gray-100">
            <span>Selecciona columnas</span>
            <div className="flex items-center gap-2 text-xs font-medium">
              <button
                type="button"
                onClick={() => onSelectAll()}
                className="text-blue-600 transition hover:text-blue-500 dark:text-blue-400"
              >
                Marcar todos
              </button>
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <button
                type="button"
                onClick={() => onReset()}
                className="text-blue-600 transition hover:text-blue-500 dark:text-blue-400"
              >
                Restablecer
              </button>
            </div>
          </div>

          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {columns.map((column) => (
              <label key={column.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-100">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={visibleColumnIds.includes(column.id)}
                  onChange={() => onToggleColumn(column.id)}
                  disabled={column.fixed}
                />
                <span className={column.fixed ? 'text-gray-400 dark:text-gray-500' : undefined}>{column.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ColumnSelector;
