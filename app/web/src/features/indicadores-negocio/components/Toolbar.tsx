import { useState } from 'react';
import { Filter, Plus } from 'lucide-react';
import DateRangePicker from './DateRangePicker';
import type { DateRange } from './DateRangePicker';

interface PageHeaderProps {
  title: string;
}

interface ToolbarProps {
  onFilter?: () => void;
  onCreateDocument?: () => void;
  onEstablishmentChange?: (establishment: string) => void;
  onDateRangeChange?: (range: DateRange) => void;
}

// COMPONENTE DE TÍTULO DE PÁGINA
export function PageHeader({ title }: PageHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-100 -mx-10 px-10 py-4">
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
    </div>
  );
}

// COMPONENTE DE TOOLBAR
export default function Toolbar({
  onFilter,
  onCreateDocument,
  onEstablishmentChange,
  onDateRangeChange
}: ToolbarProps) {
  const [selectedEstablishment, setSelectedEstablishment] = useState('Todos');
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange>(() => {
    // Inicializar con "Este mes"
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { startDate: start, endDate: end, label: 'Este mes' };
  });

  const establishmentOptions = [
    'Todos',
    'Tienda Principal',
    'Tienda Norte',
    'Tienda Sur',
    'Almacén Central'
  ];

  const handleEstablishmentChange = (establishment: string) => {
    setSelectedEstablishment(establishment);
    onEstablishmentChange?.(establishment);
  };

  const handleDateRangeChange = (range: DateRange) => {
    setSelectedDateRange(range);
    onDateRangeChange?.(range);
  };

  const handleFilter = () => {
    onFilter?.();
  };

  const handleCreateDocument = () => {
    onCreateDocument?.();
  };

  return (
    <div className="bg-white border-b border-slate-200 shadow-sm -mx-10 px-10 py-4">
      {/* TOOLBAR HORIZONTAL */}
      <div className="flex items-center justify-between">
        {/* GRUPO IZQUIERDO: Filtros */}
        <div className="flex items-center space-x-6">
          {/* DateRangePicker */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-slate-700 min-w-[50px]">Período:</label>
            <DateRangePicker
              value={selectedDateRange}
              onChange={handleDateRangeChange}
            />
          </div>

          {/* Selector de Establecimiento */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-slate-700 min-w-[90px]">Establecimiento:</label>
            <select
              value={selectedEstablishment}
              onChange={(e) => handleEstablishmentChange(e.target.value)}
              className="h-10 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[150px]"
            >
              {establishmentOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {/* Botón Filtrar */}
          <button
            onClick={handleFilter}
            className="h-10 flex items-center space-x-2 px-4 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-500"
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