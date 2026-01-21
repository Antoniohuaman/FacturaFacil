// src/features/configuration/components/establecimientos/EstablecimientosList.tsx
import { useState } from 'react';
import { Search, Filter, Plus } from 'lucide-react';
import { Select, Input, Button } from '@/contasis';
import type { Establecimiento } from '../../modelos/Establecimiento';
import { EstablecimientoCard } from './TarjetaEstablecimiento';
import { IndicadorEstado } from '../comunes/IndicadorEstado';

type ViewMode = 'grid' | 'table';
type filtroEstado = 'all' | 'enabled' | 'disabled';

interface EstablecimientosListProps {
  Establecimientos: Establecimiento[];
  onEdit: (Establecimiento: Establecimiento) => void;
  onDelete: (Establecimiento: Establecimiento) => void;
  onToggleStatus: (Establecimiento: Establecimiento) => void;
  onCreate: () => void;
  isLoading?: boolean;
}

export function EstablecimientosList({
  Establecimientos,
  onEdit,
  onDelete,
  onToggleStatus,
  onCreate,
  isLoading = false
}: EstablecimientosListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFilterStatus] = useState<filtroEstado>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'code' | 'created'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Filter and search Establecimientos
  const filteredEstablecimientos = Establecimientos
    .filter(Establecimiento => {
      const matchesSearch = Establecimiento.nombreEstablecimiento.toLowerCase().includes(searchTerm.toLowerCase()) ||
        Establecimiento.codigoEstablecimiento.toLowerCase().includes(searchTerm.toLowerCase()) ||
        Establecimiento.direccionEstablecimiento.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filtroEstado === 'all' ||
        (filtroEstado === 'enabled' && Establecimiento.estaActivoEstablecimiento) ||
        (filtroEstado === 'disabled' && !Establecimiento.estaActivoEstablecimiento);

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.nombreEstablecimiento.localeCompare(b.nombreEstablecimiento);
          break;
        case 'code':
          comparison = a.codigoEstablecimiento.localeCompare(b.codigoEstablecimiento);
          break;
        case 'created':
          comparison = new Date(a.creadoElEstablecimiento).getTime() - new Date(b.creadoElEstablecimiento).getTime();
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

  const manejarOrden = (field: 'name' | 'code' | 'created') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const stats = {
    total: Establecimientos.length,
    enabled: Establecimientos.filter(e => e.estaActivoEstablecimiento).length,
    disabled: Establecimientos.filter(e => !e.estaActivoEstablecimiento).length
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
          <div className="flex-1 max-w-md">
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, código o dirección..."
              leftIcon={<Search />}
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
            <Filter className="absolute left-3 top-3 w-5 h-5 text-gray-400 z-10" />
            <Select
              value={filtroEstado}
              onChange={(e) => setFilterStatus(e.target.value as filtroEstado)}
              size="medium"
              containerClassName="min-w-48"
              className="pl-10"
              options={[
                { value: 'all', label: 'Todos los estados' },
                { value: 'enabled', label: 'Solo habilitados' },
                { value: 'disabled', label: 'Solo inhabilitados' }
              ]}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-4">
          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${viewMode === 'grid'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Tarjetas
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${viewMode === 'table'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Tabla
            </button>
          </div>

          {/* Create Button */}
          <Button
            onClick={onCreate}
            variant="primary"
            icon={<Plus />}
          >
            <span className="hidden sm:inline">Nuevo Establecimiento</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          {filteredEstablecimientos.length} de {Establecimientos.length} establecimiento{Establecimientos.length !== 1 ? 's' : ''}
          {(searchTerm || filtroEstado !== 'all') && (
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
          <Select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field as 'name' | 'code' | 'created');
              setSortOrder(order as 'asc' | 'desc');
            }}
            size="small"
            options={[
              { value: 'name-asc', label: 'Nombre A-Z' },
              { value: 'name-desc', label: 'Nombre Z-A' },
              { value: 'code-asc', label: 'Código A-Z' },
              { value: 'code-desc', label: 'Código Z-A' },
              { value: 'created-desc', label: 'Más reciente' },
              { value: 'created-asc', label: 'Más antiguo' }
            ]}
          />
        </div>
      </div>

      {/* Content */}
      {filteredEstablecimientos.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏪</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || filtroEstado !== 'all'
              ? 'No se encontraron establecimientos'
              : 'No hay establecimientos'
            }
          </h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || filtroEstado !== 'all'
              ? 'Intenta ajustar los filtros de búsqueda'
              : 'Crea tu primer establecimiento para comenzar'
            }
          </p>
          {(!searchTerm && filtroEstado === 'all') && (
            <Button
              onClick={onCreate}
              variant="primary"
            >
              Crear Primer Establecimiento
            </Button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEstablecimientos.map((Establecimiento) => (
            <EstablecimientoCard
              key={Establecimiento.id}
              Establecimiento={Establecimiento}
              onEdit={() => onEdit(Establecimiento)}
              onDelete={() => onDelete(Establecimiento)}
              onToggleStatus={() => onToggleStatus(Establecimiento)}
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
                    onClick={() => manejarOrden('code')}
                  >
                    Código {sortBy === 'code' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="text-left py-3 px-4 font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                    onClick={() => manejarOrden('name')}
                  >
                    Nombre {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Dirección</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Estado</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredEstablecimientos.map((Establecimiento) => (
                  <tr key={Establecimiento.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <span className="font-mono text-sm font-medium text-gray-900">
                        {Establecimiento.codigoEstablecimiento}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-medium text-gray-900">
                        {Establecimiento.nombreEstablecimiento}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-gray-600 max-w-xs truncate">
                      {Establecimiento.direccionEstablecimiento}
                    </td>
                    <td className="py-4 px-4">
                      <IndicadorEstado
                        status={Establecimiento.estaActivoEstablecimiento ? 'success' : 'error'}
                        label={Establecimiento.estaActivoEstablecimiento ? 'Habilitado' : 'Inhabilitado'}
                        size="sm"
                      />
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => onToggleStatus(Establecimiento)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title={Establecimiento.estaActivoEstablecimiento ? 'Inhabilitar' : 'Habilitar'}
                        >
                          {Establecimiento.estaActivoEstablecimiento ? '🟢' : '🔴'}
                        </button>

                        <button
                          onClick={() => onEdit(Establecimiento)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Editar"
                        >
                          ✏️
                        </button>

                        <button
                          onClick={() => onDelete(Establecimiento)}
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

