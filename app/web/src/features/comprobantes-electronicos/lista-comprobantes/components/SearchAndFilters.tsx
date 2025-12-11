/**
 * SearchAndFilters - Barra de búsqueda y filtros superior
 * Incluye búsqueda global, selector de fechas, y botones de acción
 */

import { Search, Calendar, Filter, RefreshCw, Download, ChevronDown, Plus } from 'lucide-react';
import { useState } from 'react';
import { DATE_PRESETS } from '../../utils/dateUtils';
import { formatBusinessDateShort } from '@/shared/time/businessTime';

interface SearchAndFiltersProps {
  globalSearch: string;
  onGlobalSearchChange: (value: string) => void;
  dateFrom: string;
  dateTo: string;
  onDateRangeChange: (from: string, to: string) => void;
  activeFiltersCount: number;
  onOpenFilterPanel: () => void;
  onRefresh: () => void;
  onExport: () => void;
  onNewInvoice: () => void;
}

export const SearchAndFilters: React.FC<SearchAndFiltersProps> = ({
  globalSearch,
  onGlobalSearchChange,
  dateFrom,
  dateTo,
  onDateRangeChange,
  activeFiltersCount,
  onOpenFilterPanel,
  onRefresh,
  onExport,
  onNewInvoice
}) => {
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [tempDateFrom, setTempDateFrom] = useState(dateFrom);
  const [tempDateTo, setTempDateTo] = useState(dateTo);

  const applyDatePreset = (preset: string) => {
    const presetKey = preset as keyof typeof DATE_PRESETS;
    if (DATE_PRESETS[presetKey]) {
      const { from, to } = DATE_PRESETS[presetKey]();
      setTempDateFrom(from);
      setTempDateTo(to);
    }
  };

  const applyDateRange = () => {
    onDateRangeChange(tempDateFrom, tempDateTo);
    setShowDateRangePicker(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4">
        <div className="flex items-center gap-3">
          {/* Búsqueda global */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por número, cliente, vendedor..."
              value={globalSearch}
              onChange={(e) => onGlobalSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-[10px] focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Date Range Picker */}
          <div className="relative">
            <button
              onClick={() => setShowDateRangePicker(!showDateRangePicker)}
              className="h-[44px] px-4 flex items-center gap-2 text-sm border border-gray-300 dark:border-gray-600 rounded-[12px] hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="font-medium">
                {formatBusinessDateShort(dateFrom)} — {formatBusinessDateShort(dateTo)}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {/* Date Range Popover */}
            {showDateRangePicker && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowDateRangePicker(false)}
                />

                <div className="absolute left-0 top-full mt-2 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 w-[420px]">
                  {/* Presets */}
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                      Preajuste
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Hoy', value: 'today' },
                        { label: 'Ayer', value: 'yesterday' },
                        { label: 'Últimos 7 días', value: 'last7days' },
                        { label: 'Este mes', value: 'thisMonth' },
                        { label: 'Mes pasado', value: 'lastMonth' },
                        { label: 'Últimos 30 días', value: 'last30days' }
                      ].map((preset) => (
                        <button
                          key={preset.value}
                          onClick={() => applyDatePreset(preset.value)}
                          className="px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors text-left"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Inputs personalizados */}
                  <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                      Personalizado
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Desde</label>
                        <input
                          type="date"
                          value={tempDateFrom}
                          onChange={(e) => setTempDateFrom(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Hasta</label>
                        <input
                          type="date"
                          value={tempDateTo}
                          onChange={(e) => setTempDateTo(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setTempDateFrom(dateFrom);
                        setTempDateTo(dateTo);
                        setShowDateRangePicker(false);
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={applyDateRange}
                      className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      Aplicar
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Separador */}
          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

          {/* Botones de acción */}
          <button
            title="Filtros (Atajo: F)"
            className={`relative p-2.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              activeFiltersCount > 0
                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            onClick={onOpenFilterPanel}
          >
            <Filter className="w-5 h-5" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          <button
            title="Refrescar lista"
            className="p-2.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={onRefresh}
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          <button
            title="Exportar (Atajo: E)"
            className="px-3 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={onExport}
          >
            <Download className="w-4 h-4" />
            <span>Exportar</span>
          </button>

          <button
            className="ml-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            onClick={onNewInvoice}
          >
            <Plus className="w-5 h-5" />
            <span>Nueva factura</span>
          </button>
        </div>
      </div>
    </div>
  );
};

