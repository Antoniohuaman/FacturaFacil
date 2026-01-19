// src/features/configuration/components/establecimientos/EstablishmentsList.tsx
import { useState } from 'react';
import { Search, Filter, Plus } from 'lucide-react';
import type { Establishment } from '../../modelos/Establishment';
import { EstablishmentCard } from './TarjetaEstablecimiento';
import { StatusIndicator } from '../comunes/IndicadorEstado';

type ViewMode = 'grid' | 'table';
type FilterStatus = 'all' | 'enabled' | 'disabled';

interface EstablishmentsListProps {
  establishments: Establishment[];
  onEdit: (establishment: Establishment) => void;
  onDelete: (establishment: Establishment) => void;
  onToggleStatus: (establishment: Establishment) => void;
  onCreate: () => void;
  isLoading?: boolean;
}

export function EstablishmentsList({
  establishments,
  onEdit,
  onDelete,
  onToggleStatus,
  onCreate,
  isLoading = false
}: EstablishmentsListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'code' | 'created'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Filter and search establishments
  const filteredEstablishments = establishments
    .filter(establishment => {
      const matchesSearch = establishment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           establishment.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           establishment.address.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || 
                           (filterStatus === 'enabled' && establishment.isActive) ||
                           (filterStatus === 'disabled' && !establishment.isActive);
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'code':
          comparison = a.code.localeCompare(b.code);
          break;
        case 'created':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });

  const handleSort = (field: 'name' | 'code' | 'created') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const stats = {
    total: establishments.length,
    enabled: establishments.filter(e => e.isActive).length,
    disabled: establishments.filter(e => !e.isActive).length
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton for filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 h-12 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="w-48 h-12 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
        
        {/* Loading skeleton for cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total</p>
              <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
            </div>
            <div className="text-blue-400">📍</div>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Habilitados</p>
              <p className="text-2xl font-bold text-green-900">{stats.enabled}</p>
            </div>
            <div className="text-green-400">✅</div>
          </div>
        </div>

        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Inhabilitados</p>
              <p className="text-2xl font-bold text-red-900">{stats.disabled}</p>
            </div>
            <div className="text-red-400">❌</div>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, código o dirección..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
          
          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
              className="pl-10 pr-8 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white min-w-48"
            >
              <option value="all">Todos los estados</option>
              <option value="enabled">Solo habilitados</option>
              <option value="disabled">Solo inhabilitados</option>
            </select>
          </div>
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
              Tabla
            </button>
          </div>

          {/* Create Button */}
          <button
            onClick={onCreate}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Nuevo Establecimiento</span>
            <span className="sm:hidden">Nuevo</span>
          </button>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          {filteredEstablishments.length} de {establishments.length} establecimiento{establishments.length !== 1 ? 's' : ''}
          {(searchTerm || filterStatus !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('all');
              }}
              className="ml-2 text-blue-600 hover:text-blue-700 underline"
            >
              Limpiar filtros
            </button>
          )}
        </span>
        
        {/* Sort Dropdown */}
        <div className="relative">
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field as 'name' | 'code' | 'created');
              setSortOrder(order as 'asc' | 'desc');
            }}
            className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="name-asc">Nombre A-Z</option>
            <option value="name-desc">Nombre Z-A</option>
            <option value="code-asc">Código A-Z</option>
            <option value="code-desc">Código Z-A</option>
            <option value="created-desc">Más reciente</option>
            <option value="created-asc">Más antiguo</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {filteredEstablishments.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏪</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || filterStatus !== 'all' 
              ? 'No se encontraron establecimientos'
              : 'No hay establecimientos'
            }
          </h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || filterStatus !== 'all'
              ? 'Intenta ajustar los filtros de búsqueda'
              : 'Crea tu primer establecimiento para comenzar'
            }
          </p>
          {(!searchTerm && filterStatus === 'all') && (
            <button
              onClick={onCreate}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Crear Primer Establecimiento
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEstablishments.map((establishment) => (
            <EstablishmentCard
              key={establishment.id}
              establishment={establishment}
              onEdit={() => onEdit(establishment)}
              onDelete={() => onDelete(establishment)}
              onToggleStatus={() => onToggleStatus(establishment)}
            />
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th 
                    className="text-left py-3 px-4 font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('code')}
                  >
                    Código {sortBy === 'code' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="text-left py-3 px-4 font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('name')}
                  >
                    Nombre {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Dirección</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Estado</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredEstablishments.map((establishment) => (
                  <tr key={establishment.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <span className="font-mono text-sm font-medium text-gray-900">
                        {establishment.code}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-medium text-gray-900">
                        {establishment.name}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-gray-600 max-w-xs truncate">
                      {establishment.address}
                    </td>
                    <td className="py-4 px-4">
                      <StatusIndicator
                        status={establishment.isActive ? 'success' : 'error'}
                        label={establishment.isActive ? 'Habilitado' : 'Inhabilitado'}
                        size="sm"
                      />
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => onToggleStatus(establishment)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title={establishment.isActive ? 'Inhabilitar' : 'Habilitar'}
                        >
                          {establishment.isActive ? '🟢' : '🔴'}
                        </button>
                        
                        <button
                          onClick={() => onEdit(establishment)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Editar"
                        >
                          ✏️
                        </button>
                        
                        <button
                          onClick={() => onDelete(establishment)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}