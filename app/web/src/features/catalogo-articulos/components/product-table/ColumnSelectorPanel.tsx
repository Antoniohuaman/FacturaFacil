import React from 'react';
import {
  type ColumnKey,
  type ColumnConfig,
  COLUMN_GROUP_LABELS
} from './columnConfig';

interface ColumnSelectorPanelProps {
  show: boolean;
  onTogglePanel: () => void;
  visibleColumns: Set<ColumnKey>;
  columnsByGroup: Record<string, ColumnConfig[]>;
  groupLabels?: typeof COLUMN_GROUP_LABELS;
  onToggleColumn: (columnKey: ColumnKey) => void;
  onShowAll: () => void;
  onHideAll: () => void;
  onReset: () => void;
}

export const ColumnSelectorPanel: React.FC<ColumnSelectorPanelProps> = ({
  show,
  onTogglePanel,
  visibleColumns,
  columnsByGroup,
  groupLabels = COLUMN_GROUP_LABELS,
  onToggleColumn,
  onShowAll,
  onHideAll,
  onReset
}) => {
  if (!show) return null;

  // `onTogglePanel` is intentionally unused inside this panel because
  // the trigger was moved to the parent toolbar; keep a reference
  // so linters don't report it as unused and the prop signature stays stable.
  void onTogglePanel;

  return (
    <div className="mb-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 p-4">
      {/* Panel content (render only when open). Trigger moved to toolbar. */}
      <div className="space-y-4 pt-0 border-t-0">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onShowAll}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
            >
              Mostrar todas
            </button>
            <button
              onClick={onHideAll}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
            >
              Ocultar todas
            </button>
            <button
              onClick={onReset}
              className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md transition-colors"
            >
              Restaurar por defecto
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(columnsByGroup).map(([groupKey, columns]) => (
              <div key={groupKey} className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  {groupLabels[groupKey as keyof typeof groupLabels]}
                </h4>
                <div className="space-y-1.5">
                  {columns.map(column => (
                    <label
                      key={column.key}
                      className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1.5 rounded transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={visibleColumns.has(column.key)}
                        onChange={() => onToggleColumn(column.key)}
                        className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 dark:border-gray-600 rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{column.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
            <div className="flex">
              <svg className="h-5 w-5 text-blue-400 dark:text-blue-300 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="ml-3">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Personaliza las columnas según tus necesidades. Por defecto se muestran: Código, Nombre, Establecimiento, Categoría y Unidad. Tus preferencias se guardan automáticamente.
                </p>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
};
