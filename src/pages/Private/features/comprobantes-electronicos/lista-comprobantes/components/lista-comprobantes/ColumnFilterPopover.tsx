import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ColumnFilterPopoverProps {
  columnKey: string | null;
  position: { top: number; left: number } | null;
  tempFilters: Record<string, string>;
  onTempFiltersChange: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
  onFilterChange: (columnKey: string, value: string) => void;
  onClearFilter: (columnKey: string) => void;
  onClose: () => void;
}

const COLUMN_LABELS: Record<string, string> = {
  id: 'N° Comprobante',
  type: 'Tipo',
  clientDoc: 'N° Doc Cliente',
  client: 'Cliente',
  vendor: 'Vendedor'
};

export const ColumnFilterPopover = ({
  columnKey,
  position,
  tempFilters,
  onTempFiltersChange,
  onFilterChange,
  onClearFilter,
  onClose
}: ColumnFilterPopoverProps) => {
  if (!columnKey || !position) {
    return null;
  }

  const isTextFilter = ['id', 'client', 'vendor'].includes(columnKey);
  const isDocumentFilter = columnKey === 'clientDoc';
  const isTypeFilter = columnKey === 'type';

  const handleTextChange = (value: string) => {
    onTempFiltersChange((prev) => ({ ...prev, [columnKey]: value }));
    onFilterChange(columnKey, value);
  };

  const handleCheckboxChange = (tipo: string, checked: boolean) => {
    const current = (tempFilters[columnKey] || '').split(',').filter(Boolean);
    const nextValue = checked ? [...current, tipo] : current.filter((item) => item !== tipo);
    const serialized = nextValue.join(',');
    onTempFiltersChange((prev) => ({ ...prev, [columnKey]: serialized }));
    onFilterChange(columnKey, serialized);
  };

  const handleClear = () => {
    onClearFilter(columnKey);
    onClose();
  };

  const content = (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 w-80"
        style={{ top: `${position.top + 8}px`, left: `${position.left - 320}px` }}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              Filtrar por {COLUMN_LABELS[columnKey] || columnKey}
            </h4>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" aria-label="Cerrar">
              <X className="w-4 h-4" />
            </button>
          </div>

          {isTextFilter && (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Buscar</label>
              <input
                type="text"
                placeholder="Escribir para filtrar..."
                value={tempFilters[columnKey] || ''}
                onChange={(event) => handleTextChange(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                autoFocus
              />
            </div>
          )}

          {isDocumentFilter && (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Número de documento</label>
              <input
                type="text"
                placeholder="Ej: 12345678"
                value={tempFilters[columnKey] || ''}
                onChange={(event) => handleTextChange(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                autoFocus
              />
            </div>
          )}

          {isTypeFilter && (
            <div className="space-y-2">
              {['Factura', 'Boleta', 'Nota de Crédito', 'Nota de Débito'].map((tipo) => {
                const checked = (tempFilters[columnKey] || '').split(',').includes(tipo);
                return (
                  <label key={tipo} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => handleCheckboxChange(tipo, event.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{tipo}</span>
                  </label>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-600">
            <button onClick={handleClear} className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium">
              Limpiar
            </button>
            <button onClick={onClose} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">
              Aplicar
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(content, document.body);
};
