import { useState } from 'react';
import { Filter, Plus, Calendar } from 'lucide-react';

interface PageHeaderProps {
  title: string;
}

interface ToolbarProps {
  onFilter?: () => void;
  onCreateDocument?: () => void;
  onPeriodChange?: (period: string) => void;
  onEstablishmentChange?: (establishment: string) => void;
  onDateRangeChange?: (startDate: string, endDate: string) => void;
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
  onPeriodChange,
  onEstablishmentChange,
  onDateRangeChange
}: ToolbarProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('Este mes');
  const [selectedEstablishment, setSelectedEstablishment] = useState('Todos');
  const [startDate, setStartDate] = useState('2025-09-01');
  const [endDate, setEndDate] = useState('2025-09-30');

  const periodOptions = [
    'Hoy',
    'Ayer', 
    'Esta semana',
    'Semana pasada',
    'Este mes',
    'Mes pasado',
    'Este año',
    'Año pasado',
    'Personalizado'
  ];

  const establishmentOptions = [
    'Todos',
    'Tienda Principal',
    'Tienda Norte',
    'Tienda Sur',
    'Almacén Central'
  ];

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    onPeriodChange?.(period);
    
    // Auto-calcular fechas según el período seleccionado
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (period) {
      case 'Hoy':
        start = end = today;
        break;
      case 'Ayer':
        start = end = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'Esta semana':
        start = new Date(today.setDate(today.getDate() - today.getDay()));
        end = new Date();
        break;
      case 'Este mes':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      // Agregar más casos según necesidad
    }

    if (period !== 'Personalizado') {
      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];
      setStartDate(startStr);
      setEndDate(endStr);
      onDateRangeChange?.(startStr, endStr);
    }
  };

  const handleEstablishmentChange = (establishment: string) => {
    setSelectedEstablishment(establishment);
    onEstablishmentChange?.(establishment);
  };

  const handleFilter = () => {
    onFilter?.();
  };

  const handleCreateDocument = () => {
    onCreateDocument?.();
  };

  const formatDateRange = () => {
    const startFormatted = new Date(startDate).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    const endFormatted = new Date(endDate).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    return `${startFormatted} - ${endFormatted}`;
  };

  return (
    <div className="bg-white border-b border-slate-200 shadow-sm -mx-10 px-10 py-4">
      {/* TOOLBAR HORIZONTAL */}
      <div className="flex items-center justify-between">
        {/* GRUPO IZQUIERDO: Filtros */}
        <div className="flex items-center space-x-4">
          {/* Selector de Período */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-slate-700 min-w-[50px]">Período:</label>
            <select
              value={selectedPeriod}
              onChange={(e) => handlePeriodChange(e.target.value)}
              className="h-10 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[130px]"
            >
              {periodOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
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

      {/* INFORMACIÓN DE RANGO DE FECHAS (solo visible si hay fechas que mostrar) */}
      {(selectedPeriod !== 'Personalizado') && (
        <div className="mt-3 flex items-center space-x-2 text-sm text-slate-600">
          <Calendar className="w-4 h-4" />
          <span className="font-medium">{formatDateRange()}</span>
        </div>
      )}

      {/* CAMPOS DE FECHA PERSONALIZADOS (solo si período es "Personalizado") */}
      {selectedPeriod === 'Personalizado' && (
        <div className="mt-3 flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">Rango personalizado:</span>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-slate-600">Desde:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                onDateRangeChange?.(e.target.value, endDate);
              }}
              className="h-9 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-slate-600">Hasta:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                onDateRangeChange?.(startDate, e.target.value);
              }}
              className="h-9 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
        </div>
      )}
    </div>
  );
}