/**
 * ListHeader - Header completo con controles de fecha, filtros y acciones
 * Diseño: Coincide EXACTAMENTE con el diseño actual de ListaComprobantes.tsx
 */

import { useNavigate } from 'react-router-dom';
import {
  Filter, RefreshCw, Download, Plus, MoreHorizontal, XCircle, Calendar, ChevronDown
} from 'lucide-react';

interface ColumnConfig {
  id: string;
  key: string;
  label: string;
  visible: boolean;
}

interface DatePreset {
  label: string;
  value: string;
}

interface ListHeaderProps {
  // Date picker state
  dateFrom: string;
  dateTo: string;
  tempDateFrom: string;
  tempDateTo: string;
  showDateRangePicker: boolean;
  formatDateShort: (date: string) => string;
  onTempDateFromChange: (date: string) => void;
  onTempDateToChange: (date: string) => void;
  onToggleDatePicker: () => void;
  onApplyDatePreset: (preset: string) => void;
  onApplyDateRange: () => void;
  onCancelDatePicker: () => void;

  // Filter state
  activeFiltersCount: number;
  onOpenFilters: () => void;

  // Column manager
  showColumnManager: boolean;
  columnsConfig: ColumnConfig[];
  density: 'comfortable' | 'intermediate' | 'compact';
  onToggleColumnManager: () => void;
  onToggleColumn: (id: string) => void;
  onDensityChange: (density: 'comfortable' | 'intermediate' | 'compact') => void;

  // Export
  onExport: () => Promise<void>;

  // Optional: Hide action buttons (for Borradores)
  hideActionButtons?: boolean;
}

const DATE_PRESETS: DatePreset[] = [
  { label: 'Hoy', value: 'today' },
  { label: 'Ayer', value: 'yesterday' },
  { label: 'Últimos 7 días', value: 'last7days' },
  { label: 'Este mes', value: 'thisMonth' },
  { label: 'Mes pasado', value: 'lastMonth' },
  { label: 'Últimos 30 días', value: 'last30days' }
];

export const ListHeader: React.FC<ListHeaderProps> = ({
  dateFrom,
  dateTo,
  tempDateFrom,
  tempDateTo,
  showDateRangePicker,
  formatDateShort,
  onTempDateFromChange,
  onTempDateToChange,
  onToggleDatePicker,
  onApplyDatePreset,
  onApplyDateRange,
  onCancelDatePicker,
  activeFiltersCount,
  onOpenFilters,
  showColumnManager,
  columnsConfig,
  density,
  onToggleColumnManager,
  onToggleColumn,
  onDensityChange,
  onExport,
  hideActionButtons = false
}) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4">
        {/* Fila principal: Date Range → Acciones → Botones */}
        <div className="flex items-center gap-3">
          {/* Date Range Picker (Single Input) */}
          <div className="relative">
            <button
              onClick={onToggleDatePicker}
              className="h-[44px] px-4 flex items-center gap-2 text-sm border border-gray-300 dark:border-gray-600 rounded-[12px] hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Seleccionar rango de fechas"
              aria-haspopup="dialog"
              aria-expanded={showDateRangePicker}
            >
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="font-medium">
                {formatDateShort(dateFrom)} — {formatDateShort(dateTo)}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {/* Date Range Popover */}
            {showDateRangePicker && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={onCancelDatePicker}
                />

                <div className="absolute left-0 top-full mt-2 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 w-[420px]">
                  {/* Presets */}
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                      Preajuste
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {DATE_PRESETS.map((preset) => (
                        <button
                          key={preset.value}
                          onClick={() => onApplyDatePreset(preset.value)}
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
                          onChange={(e) => onTempDateFromChange(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Hasta</label>
                        <input
                          type="date"
                          value={tempDateTo}
                          onChange={(e) => onTempDateToChange(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={onCancelDatePicker}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={onApplyDateRange}
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
            aria-label="Abrir filtros"
            className={`relative p-2.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              activeFiltersCount > 0
                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            onClick={onOpenFilters}
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
            aria-label="Refrescar comprobantes"
            className="p-2.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          <button
            title="Exportar (Atajo: E)"
            aria-label="Exportar comprobantes"
            className="px-3 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={onExport}
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>

          {/* Gestor de Columnas con Presentación */}
          <div className="relative">
            <button
              title="Columnas y Vista"
              aria-label="Gestionar columnas y presentación"
              className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
              onClick={onToggleColumnManager}
            >
              <MoreHorizontal className="w-4 h-4" />
              Columnas
            </button>

            {showColumnManager && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={onToggleColumnManager}
                />

                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50">
                  {/* Sección Presentación */}
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Presentación</h3>
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                      <button
                        onClick={() => onDensityChange('comfortable')}
                        className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          density === 'comfortable'
                            ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        Cómodo
                      </button>
                      <button
                        onClick={() => onDensityChange('intermediate')}
                        className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          density === 'intermediate'
                            ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        Intermedio
                      </button>
                      <button
                        onClick={() => onDensityChange('compact')}
                        className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          density === 'compact'
                            ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        Compacto
                      </button>
                    </div>
                  </div>

                  {/* Sección Columnas */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Columnas visibles</h3>
                      <button
                        onClick={onToggleColumnManager}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        aria-label="Cerrar panel"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto space-y-1">
                      {columnsConfig.map(c => (
                        c.id !== 'actions' && c.id !== 'documentNumber' && (
                          <label
                            key={c.id}
                            className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                          >
                            <span className="text-sm text-gray-700 dark:text-gray-300">{c.label}</span>
                            <input
                              type="checkbox"
                              checked={c.visible}
                              onChange={() => onToggleColumn(c.id)}
                              className="rounded text-blue-600 focus:ring-2 focus:ring-blue-500"
                            />
                          </label>
                        )
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Separador */}
          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 ml-auto"></div>

          {/* Botones de Acción - Solo en Lista Comprobantes */}
          {!hideActionButtons && (
            <>
              <button
                onClick={() => navigate('/comprobantes/emision?tipo=factura')}
                className="h-[44px] px-5 border-2 border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 rounded-[12px] font-semibold text-sm hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Crear nueva factura"
              >
                Nueva factura
              </button>

              <button
                onClick={() => navigate('/comprobantes/emision?tipo=boleta')}
                className="h-[44px] px-5 bg-blue-600 dark:bg-blue-600 text-white rounded-[12px] font-semibold text-sm hover:bg-blue-700 dark:hover:bg-blue-700 transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm"
                aria-label="Crear nueva boleta"
              >
                Nueva boleta
              </button>

              <button
                title="Más tipos de comprobantes"
                aria-label="Más opciones de comprobantes"
                className="h-[44px] w-[44px] flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-[12px] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={() => {/* TODO: Implementar menú de más tipos */}}
              >
                <Plus className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
