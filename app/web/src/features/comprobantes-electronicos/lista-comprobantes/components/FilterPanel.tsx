import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';

export interface FilterValues {
  estados: string[];
  vendedores: string[];
  formasPago: string[];
  tipos: string[];
  totalMin: string;
  totalMax: string;
}

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterValues) => void;
  currentFilters: FilterValues;
  availableOptions: {
    estados: string[];
    vendedores: string[];
    formasPago: string[];
    tipos: string[];
  };
}

export const FilterPanel = ({
  isOpen,
  onClose,
  onApply,
  currentFilters,
  availableOptions
}: FilterPanelProps) => {
  const [tempFilters, setTempFilters] = useState<FilterValues>(currentFilters);

  useEffect(() => {
    if (isOpen) {
      setTempFilters(currentFilters);
    }
  }, [isOpen, currentFilters]);

  const handleApply = () => {
    onApply(tempFilters);
    onClose();
  };

  const handleClear = () => {
    const emptyFilters: FilterValues = {
      estados: [],
      vendedores: [],
      formasPago: [],
      tipos: [],
      totalMin: '',
      totalMax: ''
    };
    setTempFilters(emptyFilters);
    // Aplicar automáticamente
    onApply(emptyFilters);
    onClose();
  };

  const toggleMultiSelect = (field: keyof Pick<FilterValues, 'estados' | 'vendedores' | 'formasPago' | 'tipos'>, value: string) => {
    setTempFilters(prev => {
      const current = prev[field];
      const newValues = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [field]: newValues };
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-30 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div 
        className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-800 shadow-2xl z-50 flex flex-col border-l border-gray-200 dark:border-gray-700"
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-panel-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 
            id="filter-panel-title"
            className="text-lg font-semibold text-gray-900 dark:text-white"
          >
            Filtros avanzados
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Cerrar panel de filtros"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Estado */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Estado
            </label>
            <div className="space-y-2">
              {availableOptions.estados.map(estado => (
                <label 
                  key={estado}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={tempFilters.estados.includes(estado)}
                    onChange={() => toggleMultiSelect('estados', estado)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{estado}</span>
                  {tempFilters.estados.includes(estado) && (
                    <Check className="w-4 h-4 ml-auto text-blue-600" />
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Vendedor */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Vendedor
            </label>
            <div className="space-y-2">
              {availableOptions.vendedores.map(vendedor => (
                <label 
                  key={vendedor}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={tempFilters.vendedores.includes(vendedor)}
                    onChange={() => toggleMultiSelect('vendedores', vendedor)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{vendedor}</span>
                  {tempFilters.vendedores.includes(vendedor) && (
                    <Check className="w-4 h-4 ml-auto text-blue-600" />
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Forma de pago */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Forma de pago
            </label>
            <div className="space-y-2">
              {availableOptions.formasPago.map(forma => (
                <label 
                  key={forma}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={tempFilters.formasPago.includes(forma)}
                    onChange={() => toggleMultiSelect('formasPago', forma)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{forma}</span>
                  {tempFilters.formasPago.includes(forma) && (
                    <Check className="w-4 h-4 ml-auto text-blue-600" />
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Tipo de comprobante */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Tipo
            </label>
            <div className="space-y-2">
              {availableOptions.tipos.map(tipo => (
                <label 
                  key={tipo}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={tempFilters.tipos.includes(tipo)}
                    onChange={() => toggleMultiSelect('tipos', tipo)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{tipo}</span>
                  {tempFilters.tipos.includes(tipo) && (
                    <Check className="w-4 h-4 ml-auto text-blue-600" />
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Rango de totales */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Rango de totales
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Mínimo
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={tempFilters.totalMin}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, totalMin: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Máximo
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={tempFilters.totalMax}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, totalMax: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <button
            onClick={handleClear}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Limpiar
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Aplicar filtros
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
