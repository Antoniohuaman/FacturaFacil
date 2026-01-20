import DateRangePicker from './DateRangePicker';
import { useConfigurationContext } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import { useIndicadoresFilters } from '../hooks/useIndicadoresFilters';
import type { DateRange } from '../models/dateRange';

// COMPONENTE DE TOOLBAR
export default function Toolbar() {
  const { state: configState } = useConfigurationContext();
  const {
    dateRange,
    EstablecimientoId,
    setDateRange,
    setEstablecimientoId
  } = useIndicadoresFilters();

  // Obtener establecimientos activos desde la configuración
  const Establecimientos = configState.Establecimientos.filter(e => e.isActive);
  const EstablecimientoOptions = [
    { id: 'Todos', name: 'Todos los establecimientos' },
    ...Establecimientos.map(est => ({ id: est.id, name: `${est.code} - ${est.name}` }))
  ];

  const handleEstablecimientoChange = (Establecimiento: string) => {
    setEstablecimientoId(Establecimiento);
  };

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
  };
  return (
    <div className="bg-white dark:bg-gray-800 border-b border-slate-300 dark:border-gray-700 shadow-sm -mx-10 px-16 py-4" style={{ minHeight: '72px', display: 'flex', alignItems: 'center' }}>
      {/* TOOLBAR HORIZONTAL */}
      <div className="flex items-center justify-start w-full">
        {/* GRUPO IZQUIERDO: Filtros */}
        <div className="flex items-center space-x-8">
          {/* DateRangePicker */}
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-slate-700 dark:text-gray-300 min-w-[50px]">Período:</label>
            <DateRangePicker
              value={dateRange}
              onChange={handleDateRangeChange}
            />
          </div>

          {/* Selector de Establecimiento */}
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-slate-700 dark:text-gray-300 min-w-[90px]">Establecimiento:</label>
            <select
              value={EstablecimientoId}
              onChange={(e) => handleEstablecimientoChange(e.target.value)}
              className="h-10 px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-white min-w-[150px]"
            >
              {EstablecimientoOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}