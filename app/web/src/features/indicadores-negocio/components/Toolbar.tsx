import { useState, useEffect, useRef } from 'react';
import { Filter, Plus } from 'lucide-react';
import DateRangePicker from './DateRangePicker';
import { useConfigurationContext } from '../../configuracion-sistema/context/ConfigurationContext';
import type { DateRange } from '../models/dateRange';
import { createCurrentMonthRange } from '../models/dateRange';

interface ToolbarProps {
  onFilter?: () => void;
  onCreateDocument?: () => void;
  onEstablishmentChange?: (establishment: string) => void;
  onDateRangeChange?: (range: DateRange) => void;
}

// COMPONENTE DE TOOLBAR
export default function Toolbar({
  onFilter,
  onCreateDocument,
  onEstablishmentChange,
  onDateRangeChange
}: ToolbarProps) {
  const { state: configState } = useConfigurationContext();
  const [selectedEstablishment, setSelectedEstablishment] = useState('Todos');
  const initialRangeRef = useRef<DateRange>(createCurrentMonthRange());
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange>(initialRangeRef.current);
  const hasNotifiedInitialRange = useRef(false);

  // Obtener establecimientos activos desde la configuración
  const establishments = configState.establishments.filter(e => e.isActive);
  const establishmentOptions = [
    { id: 'Todos', name: 'Todos los establecimientos' },
    ...establishments.map(est => ({ id: est.id, name: `${est.code} - ${est.name}` }))
  ];

  const handleEstablishmentChange = (establishment: string) => {
    setSelectedEstablishment(establishment);
    onEstablishmentChange?.(establishment);
  };

  const handleDateRangeChange = (range: DateRange) => {
    setSelectedDateRange(range);
    onDateRangeChange?.(range);
  };

  useEffect(() => {
    if (!hasNotifiedInitialRange.current) {
      onDateRangeChange?.(selectedDateRange);
      hasNotifiedInitialRange.current = true;
    }
  }, [onDateRangeChange, selectedDateRange]);

  const handleFilter = () => {
    onFilter?.();
  };

  const handleCreateDocument = () => {
    onCreateDocument?.();
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-slate-300 dark:border-gray-700 shadow-sm -mx-10 px-16 py-4" style={{ minHeight: '72px', display: 'flex', alignItems: 'center' }}>
      {/* TOOLBAR HORIZONTAL */}
      <div className="flex items-center justify-between w-full">
        {/* GRUPO IZQUIERDO: Filtros */}
        <div className="flex items-center space-x-8">
          {/* DateRangePicker */}
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-slate-700 dark:text-gray-300 min-w-[50px]">Período:</label>
            <DateRangePicker
              value={selectedDateRange}
              onChange={handleDateRangeChange}
            />
          </div>

          {/* Selector de Establecimiento */}
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-slate-700 dark:text-gray-300 min-w-[90px]">Establecimiento:</label>
            <select
              value={selectedEstablishment}
              onChange={(e) => handleEstablishmentChange(e.target.value)}
              className="h-10 px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-white min-w-[150px]"
            >
              {establishmentOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>

          {/* Botón Filtrar */}
          <button
            onClick={handleFilter}
            className="h-10 flex items-center space-x-2 px-4 bg-slate-600 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-700 dark:hover:bg-slate-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filtrar</span>
          </button>
        </div>

        {/* GRUPO DERECHO: Acción Primaria */}
        <div className="flex items-center">
          <button
            onClick={handleCreateDocument}
            className="h-10 flex items-center space-x-2 px-4 text-white rounded-lg hover:opacity-90 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ backgroundColor: '#1478D4' }}
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Nuevo comprobante</span>
          </button>
        </div>
      </div>
    </div>
  );
}