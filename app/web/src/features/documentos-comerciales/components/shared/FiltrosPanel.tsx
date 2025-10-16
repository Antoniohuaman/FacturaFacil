// app/web/src/features/documentos-comerciales/components/shared/FiltrosPanel.tsx

import { useState } from 'react';
import { 
  X, 
  Calendar, 
  User, 
  Building, 
  DollarSign,
  Filter
} from 'lucide-react';
import type { FiltrosDocumentos, TipoDocumento, EstadoDocumento } from '../../models/types';

interface FiltrosPanelProps {
  filtros: FiltrosDocumentos;
  setFiltros: (filtros: FiltrosDocumentos) => void;
  tipo: TipoDocumento;
  className?: string;
}

export function FiltrosPanel({ filtros, setFiltros, tipo, className = '' }: FiltrosPanelProps) {
  const [filtrosTemp, setFiltrosTemp] = useState<FiltrosDocumentos>(filtros);

  const estados: { value: EstadoDocumento | 'TODOS'; label: string }[] = [
    { value: 'TODOS', label: 'Todos los estados' },
    { value: 'BORRADOR', label: 'Borrador' },
    { value: 'EMITIDO', label: 'Emitido' },
    { value: 'APROBADO', label: 'Aprobado' },
    { value: 'RECHAZADO', label: 'Rechazado' },
    { value: 'ANULADO', label: 'Anulado' },
    { value: 'CONVERTIDO', label: 'Convertido' }
  ];

  const handleAplicarFiltros = () => {
    // Limpiar valores vacíos
    const filtrosLimpios = Object.entries(filtrosTemp).reduce((acc, [key, value]) => {
      if (value && value !== 'TODOS') {
        acc[key as keyof FiltrosDocumentos] = value;
      }
      return acc;
    }, {} as FiltrosDocumentos);
    
    setFiltros(filtrosLimpios);
  };

  const handleLimpiarFiltros = () => {
    setFiltrosTemp({});
    setFiltros({});
  };

  const contarFiltrosActivos = () => {
    return Object.entries(filtrosTemp).filter(([_, value]) => 
      value && value !== 'TODOS'
    ).length;
  };

  return (
    <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filtros avanzados
          {contarFiltrosActivos() > 0 && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
              {contarFiltrosActivos()} activos
            </span>
          )}
        </h3>
        <button
          onClick={handleLimpiarFiltros}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <X className="h-4 w-4" />
          Limpiar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Estado */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Estado
          </label>
          <select
            value={filtrosTemp.estado || 'TODOS'}
            onChange={(e) => setFiltrosTemp({ ...filtrosTemp, estado: e.target.value as EstadoDocumento | 'TODOS' })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {estados.map(estado => (
              <option key={estado.value} value={estado.value}>
                {estado.label}
              </option>
            ))}
          </select>
        </div>

        {/* Fecha inicio */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            <Calendar className="inline h-3.5 w-3.5 mr-1" />
            Fecha desde
          </label>
          <input
            type="date"
            value={filtrosTemp.fechaInicio || ''}
            onChange={(e) => setFiltrosTemp({ ...filtrosTemp, fechaInicio: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Fecha fin */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            <Calendar className="inline h-3.5 w-3.5 mr-1" />
            Fecha hasta
          </label>
          <input
            type="date"
            value={filtrosTemp.fechaFin || ''}
            onChange={(e) => setFiltrosTemp({ ...filtrosTemp, fechaFin: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Moneda */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            <DollarSign className="inline h-3.5 w-3.5 mr-1" />
            Moneda
          </label>
          <select
            value={filtrosTemp.moneda || ''}
            onChange={(e) => setFiltrosTemp({ ...filtrosTemp, moneda: e.target.value as any })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Todas</option>
            <option value="PEN">Soles (PEN)</option>
            <option value="USD">Dólares (USD)</option>
            <option value="EUR">Euros (EUR)</option>
          </select>
        </div>

        {/* Vendedor */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            <User className="inline h-3.5 w-3.5 mr-1" />
            Vendedor
          </label>
          <select
            value={filtrosTemp.vendedorId || ''}
            onChange={(e) => setFiltrosTemp({ ...filtrosTemp, vendedorId: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Todos</option>
            <option value="VEN001">Carlos Mendoza</option>
            <option value="VEN002">Ana García</option>
            <option value="VEN003">Luis Torres</option>
          </select>
        </div>

        {/* Establecimiento */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            <Building className="inline h-3.5 w-3.5 mr-1" />
            Establecimiento
          </label>
          <select
            value={filtrosTemp.establecimientoId || ''}
            onChange={(e) => setFiltrosTemp({ ...filtrosTemp, establecimientoId: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Todos</option>
            <option value="EST001">Tienda Principal</option>
            <option value="EST002">Tienda Sur</option>
            <option value="EST003">Tienda Norte</option>
          </select>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-200">
        <button
          onClick={handleLimpiarFiltros}
          className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Limpiar filtros
        </button>
        <button
          onClick={handleAplicarFiltros}
          className={`
            px-4 py-2 text-sm text-white rounded-lg transition-colors
            ${tipo === 'COTIZACION' 
              ? 'bg-blue-600 hover:bg-blue-700' 
              : 'bg-purple-600 hover:bg-purple-700'
            }
          `}
        >
          Aplicar filtros
        </button>
      </div>
    </div>
  );
}