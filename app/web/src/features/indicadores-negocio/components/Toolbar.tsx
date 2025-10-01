import { useState } from 'react';
import { Filter, Plus, Calendar } from 'lucide-react';

interface ToolbarProps {
  onFilter?: () => void;
  onCreateDocument?: () => void;
  onPeriodChange?: (period: string) => void;
  onEstablishmentChange?: (establishment: string) => void;
  onDateRangeChange?: (startDate: string, endDate: string) => void;
}

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
    <div className="bg-white border-b border-slate-200 shadow-sm">
      <div className="py-5">
        {/* Header Principal */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-6">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Indicadores de Gestión</h1>
            
            {/* Selector de Período */}
            <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
              <label className="text-sm font-semibold text-slate-700">Período:</label>
              <select
                value={selectedPeriod}
                onChange={(e) => handlePeriodChange(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[120px]"
              >
                {periodOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector de Establecimiento */}
            <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
              <label className="text-sm font-semibold text-slate-700">Establecimiento:</label>
              <select
                value={selectedEstablishment}
                onChange={(e) => handleEstablishmentChange(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[140px]"
              >
                {establishmentOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleFilter}
              className="flex items-center space-x-2 px-5 py-2.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-500 shadow-md hover:shadow-lg"
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filtrar</span>
            </button>
            
            <button
              onClick={handleCreateDocument}
              className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-md hover:shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Nuevo comprobante</span>
            </button>
          </div>
        </div>

        {/* Rango de Fechas */}
        <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm inline-flex">
          <Calendar className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">{formatDateRange()}</span>
          
          {/* Campos de fecha personalizados (se muestran solo si período es "Personalizado") */}
          {selectedPeriod === 'Personalizado' && (
            <div className="flex items-center space-x-4 ml-4 pl-4 border-l border-slate-200">
              <div className="flex items-center space-x-2">
                <label className="text-xs font-semibold text-slate-600">Desde:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    onDateRangeChange?.(e.target.value, endDate);
                  }}
                  className="px-3 py-1.5 border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-xs font-semibold text-slate-600">Hasta:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    onDateRangeChange?.(startDate, e.target.value);
                  }}
                  className="px-3 py-1.5 border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}