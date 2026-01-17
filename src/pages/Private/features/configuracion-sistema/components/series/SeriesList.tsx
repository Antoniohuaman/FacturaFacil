// src/features/configuration/components/series/SeriesList.tsx
import { useState } from 'react';
import { FileText, Receipt, Clipboard, MessageSquare, Building2, Search, Plus, NotebookPen } from 'lucide-react';
import type { Series } from '../../models/Series';
import type { Establishment } from '../../models/Establishment';
import { Select } from '@/contasis';

type VoucherType = 'INVOICE' | 'RECEIPT' | 'SALE_NOTE' | 'QUOTE' | 'COLLECTION';
import { SeriesCard } from './SeriesCard';
import { StatusIndicator } from '../common/StatusIndicator';

type FilterType = VoucherType | 'ALL';
type FilterStatus = 'all' | 'active' | 'inactive';

interface SeriesListProps {
  series: Series[];
  establishments: Establishment[];
  onEdit: (series: Series) => void;
  onDelete: (series: Series) => void;
  onToggleStatus: (series: Series) => void;
  onSetDefault: (series: Series) => void;
  onAdjustCorrelative: (series: Series) => void;
  onCreate: () => void;
  isLoading?: boolean;
}

const voucherTypeConfig = {
  INVOICE: {
    label: 'Factura Electrónica',
    icon: FileText,
    color: 'blue',
    prefix: 'F'
  },
  RECEIPT: {
    label: 'Boleta Electrónica',
    icon: Receipt,
    color: 'green',
    prefix: 'B'
  },
  CREDIT_NOTE: {
    label: 'Nota de Crédito',
    icon: FileText,
    color: 'red',
    prefix: 'NC'
  },
  DEBIT_NOTE: {
    label: 'Nota de Débito',
    icon: FileText,
    color: 'orange',
    prefix: 'ND'
  },
  GUIDE: {
    label: 'Guía de Remisión',
    icon: Clipboard,
    color: 'purple',
    prefix: 'GR'
  },
  QUOTATION: {
    label: 'Cotización',
    icon: MessageSquare,
    color: 'purple',
    prefix: 'COT'
  },
  SALES_NOTE: {
    label: 'Nota de Venta',
    icon: Clipboard,
    color: 'orange',
    prefix: 'NV'
  },
  SALE_NOTE: {
    label: 'Nota de Venta',
    icon: Clipboard,
    color: 'orange',
    prefix: 'NV'
  },
  QUOTE: {
    label: 'Cotización',
    icon: MessageSquare,
    color: 'purple',
    prefix: 'COT'
  },
  COLLECTION: {
    label: 'Recibo de Cobranza',
    icon: NotebookPen,
    color: 'cyan',
    prefix: 'C'
  },
  OTHER: {
    label: 'Otro Documento',
    icon: MessageSquare,
    color: 'gray',
    prefix: ''
  }
};

export function SeriesList({
  series,
  establishments,
  onEdit,
  onDelete,
  onToggleStatus,
  onSetDefault,
  onAdjustCorrelative,
  onCreate,
  isLoading = false
}: SeriesListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterEstablishment, setFilterEstablishment] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Filter series
  const filteredSeries = series.filter(s => {
    const matchesSearch = s.series.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         getEstablishmentName(s.establishmentId).toLowerCase().includes(searchTerm.toLowerCase()) ||
                         voucherTypeConfig[s.documentType.category].label.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'ALL' || s.documentType.category === filterType;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && s.isActive) ||
                         (filterStatus === 'inactive' && !s.isActive);
    const matchesEstablishment = filterEstablishment === 'ALL' || s.establishmentId === filterEstablishment;
    
    return matchesSearch && matchesType && matchesStatus && matchesEstablishment;
  });

  // Group series by establishment
  const seriesByEstablishment = establishments.map(est => ({
    establishment: est,
    series: filteredSeries.filter(s => s.establishmentId === est.id)
  })).filter(group => group.series.length > 0);

  const getEstablishmentName = (establishmentId: string) => {
    return establishments.find(est => est.id === establishmentId)?.name || 'Desconocido';
  };

  const getTypeStats = () => {
    return Object.entries(voucherTypeConfig).map(([type, config]) => ({
      type: type as VoucherType,
      config,
      count: series.filter(s => s.documentType.category === type).length,
      activeCount: series.filter(s => s.documentType.category === type && s.isActive).length
    }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('ALL');
    setFilterStatus('all');
    setFilterEstablishment('ALL');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton for filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 h-12 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="w-32 h-12 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="w-48 h-12 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
        
        {/* Loading skeleton for cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {getTypeStats().map(({ type, config, count, activeCount }) => {
          const Icon = config.icon;
          const isSelected = filterType === type;
          
          return (
            <button
              key={type}
              onClick={() => setFilterType(isSelected ? 'ALL' : type)}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                isSelected
                  ? `border-${config.color}-500 bg-${config.color}-50`
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-6 h-6 ${
                  isSelected ? `text-${config.color}-600` : 'text-gray-600'
                }`} />
                <div className="text-right">
                  <div className={`text-2xl font-bold ${
                    isSelected ? `text-${config.color}-900` : 'text-gray-900'
                  }`}>
                    {count}
                  </div>
                </div>
              </div>
              <div>
                <h3 className={`font-medium text-sm ${
                  isSelected ? `text-${config.color}-900` : 'text-gray-900'
                }`}>
                  {config.label}
                </h3>
                <p className={`text-xs mt-1 ${
                  isSelected ? `text-${config.color}-700` : 'text-gray-500'
                }`}>
                  {activeCount} activa{activeCount !== 1 ? 's' : ''}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar series..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Status Filter */}
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            size="medium"
            options={[
              { value: 'all', label: 'Todos los estados' },
              { value: 'active', label: 'Solo activas' },
              { value: 'inactive', label: 'Solo inactivas' }
            ]}
          />
          
          {/* Establishment Filter */}
          <Select
            value={filterEstablishment}
            onChange={(e) => setFilterEstablishment(e.target.value)}
            size="medium"
            options={[
              { value: 'ALL', label: 'Todos los establecimientos' },
              ...establishments.map(est => ({
                value: est.id,
                label: `${est.code} - ${est.name}`
              }))
            ]}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-4">
          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Tarjetas
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Lista
            </button>
          </div>

          {/* Create Button */}
          <button
            onClick={onCreate}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Nueva Serie</span>
            <span className="sm:hidden">Nueva</span>
          </button>
        </div>
      </div>

      {/* Active Filters */}
      {(searchTerm || filterType !== 'ALL' || filterStatus !== 'all' || filterEstablishment !== 'ALL') && (
        <div className="flex items-center space-x-2 text-sm">
          <span className="text-gray-600">Filtros activos:</span>
          {searchTerm && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
              Búsqueda: "{searchTerm}"
            </span>
          )}
          {filterType !== 'ALL' && (
            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">
              Tipo: {voucherTypeConfig[filterType].label}
            </span>
          )}
          {filterStatus !== 'all' && (
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
              Estado: {filterStatus === 'active' ? 'Activas' : 'Inactivas'}
            </span>
          )}
          {filterEstablishment !== 'ALL' && (
            <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded">
              Establecimiento: {getEstablishmentName(filterEstablishment)}
            </span>
          )}
          <button
            onClick={clearFilters}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Limpiar filtros
          </button>
        </div>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          {filteredSeries.length} de {series.length} serie{series.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Content */}
      {filteredSeries.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📄</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {(searchTerm || filterType !== 'ALL' || filterStatus !== 'all' || filterEstablishment !== 'ALL')
              ? 'No se encontraron series'
              : 'No hay series configuradas'
            }
          </h3>
          <p className="text-gray-500 mb-6">
            {(searchTerm || filterType !== 'ALL' || filterStatus !== 'all' || filterEstablishment !== 'ALL')
              ? 'Intenta ajustar los filtros de búsqueda'
              : 'Crea tu primera serie para comenzar a emitir comprobantes'
            }
          </p>
          {(!searchTerm && filterType === 'ALL' && filterStatus === 'all' && filterEstablishment === 'ALL') && (
            <button
              onClick={onCreate}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Crear Primera Serie
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View - Grouped by Establishment */
        <div className="space-y-8">
          {seriesByEstablishment.map(({ establishment, series: establishmentSeries }) => (
            <div key={establishment.id} className="space-y-4">
              {/* Establishment Header */}
              <div className="flex items-center space-x-3 pb-2 border-b border-gray-200">
                <Building2 className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  {establishment.code} - {establishment.name}
                </h3>
                <StatusIndicator
                  status={establishment.isActive ? 'success' : 'error'}
                  label={establishment.isActive ? 'Activo' : 'Inactivo'}
                  size="sm"
                />
                <span className="text-sm text-gray-500">
                  ({establishmentSeries.length} serie{establishmentSeries.length !== 1 ? 's' : ''})
                </span>
              </div>

              {/* Series Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {establishmentSeries.map((seriesItem) => (
                  <SeriesCard
                    key={seriesItem.id}
                    series={seriesItem}
                    establishment={establishment}
                    onEdit={() => onEdit(seriesItem)}
                    onDelete={() => onDelete(seriesItem)}
                    onToggleStatus={() => onToggleStatus(seriesItem)}
                    onSetDefault={() => onSetDefault(seriesItem)}
                    onAdjustCorrelative={() => onAdjustCorrelative(seriesItem)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Serie</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Tipo</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Establecimiento</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Correlativo</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Estado</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredSeries.map((seriesItem) => {
                  const config = voucherTypeConfig[seriesItem.documentType.category];
                  const establishment = establishments.find(est => est.id === seriesItem.establishmentId);
                  
                  return (
                    <tr key={seriesItem.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-semibold text-gray-900">
                            {seriesItem.series}
                          </span>
                          {seriesItem.isDefault && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                              Por defecto
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          <config.icon className={`w-4 h-4 text-${config.color}-600`} />
                          <span className="text-sm">{config.label}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-600">
                        {establishment?.code} - {establishment?.name}
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-mono text-sm">
                          {seriesItem.correlativeNumber.toString().padStart(8, '0')}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <StatusIndicator
                          status={seriesItem.isActive ? 'success' : 'error'}
                          label={seriesItem.isActive ? 'Activa' : 'Inactiva'}
                          size="sm"
                        />
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => onEdit(seriesItem)}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => onAdjustCorrelative(seriesItem)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Ajustar correlativo"
                          >
                            📊
                          </button>
                          <button
                            onClick={() => onDelete(seriesItem)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Eliminar"
                            disabled={seriesItem.isDefault || seriesItem.statistics.documentsIssued > 0}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}