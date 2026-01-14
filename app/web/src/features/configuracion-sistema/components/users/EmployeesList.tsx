// src/features/configuration/components/employees/EmployeesList.tsx
import { useState } from 'react';
import {
  Users,
  Search,
  UserCheck,
  Mail,
  X,
  Shield,
  Power,
  PowerOff
} from 'lucide-react';
import type { User } from '../../models/User';
import type { Role } from '../../models/Role';
import type { Establishment } from '../../models/Establishment';
import { EmployeeCard } from './EmployeeCard';
import { StatusIndicator } from '../common/StatusIndicator';

type UserStatus = User['status'];

type FilterStatus = UserStatus | 'ALL';
type ViewMode = 'grid' | 'table';
type SortField = 'name' | 'email' | 'status' | 'created' | 'roles';
type SortOrder = 'asc' | 'desc';

interface EmployeesListProps {
  employees: User[];
  roles: Role[];
  establishments: Establishment[];
  onEdit: (employee: User) => void;
  onDelete: (employee: User) => void;
  onChangeStatus: (employee: User, status: UserStatus, reason?: string) => void;
  onAssignRole: (employee: User) => void;
  onRemoveRole: (employee: User, establishmentId: string) => void;
  onCreate: () => void;
  isLoading?: boolean;
}

export function EmployeesList({
  employees,
  roles,
  establishments,
  onEdit,
  onDelete,
  onChangeStatus,
  onAssignRole,
  onRemoveRole,
  onCreate,
  isLoading = false
}: EmployeesListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  const [filterEstablishment, setFilterEstablishment] = useState('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');


  // Filter employees
  const filteredEmployees = employees
    .filter(employee => {
      const matchesSearch = employee.personalInfo.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           employee.personalInfo.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (employee.personalInfo.documentNumber && employee.personalInfo.documentNumber.includes(searchTerm));
      
      const matchesStatus = filterStatus === 'ALL' || employee.status === filterStatus;
      
      const matchesEstablishment = filterEstablishment === 'ALL' || 
                                   employee.employment.establishmentIds.includes(filterEstablishment);
      
      return matchesSearch && matchesStatus && matchesEstablishment;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = a.personalInfo.fullName.localeCompare(b.personalInfo.fullName);
          break;
        case 'email':
          comparison = a.personalInfo.email.localeCompare(b.personalInfo.email);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'created':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'roles':
          comparison = a.employment.establishmentIds.length - b.employment.establishmentIds.length;
          break;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });

  const getEmployeeStats = () => {
    return {
      total: employees.length,
      active: employees.filter(e => e.status === 'ACTIVE').length,
      invited: employees.filter(e => e.status === 'INACTIVE').length,
      inactive: employees.filter(e => e.status === 'INACTIVE').length
    };
  };

  const getStatusConfig = (status: UserStatus) => {
    const configs = {
      ACTIVE: { 
        label: 'Activo', 
        color: 'success' as const, 
        icon: UserCheck,
        description: 'Usuario activo con acceso al sistema'
      },
      INACTIVE: { 
        label: 'Inactivo', 
        color: 'warning' as const, 
        icon: X,
        description: 'Usuario deshabilitado sin acceso'
      },
      SUSPENDED: { 
        label: 'Suspendido', 
        color: 'error' as const, 
        icon: X,
        description: 'Usuario temporalmente suspendido'
      },
      TERMINATED: { 
        label: 'Desvinculado', 
        color: 'error' as const, 
        icon: X,
        description: 'Usuario desvinculado de la empresa'
      }
    };
    return configs[status];
  };



  const getEstablishmentName = (establishmentId: string) => {
    return establishments.find(est => est.id === establishmentId)?.name || 'Establecimiento no encontrado';
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('ALL');
    setFilterEstablishment('ALL');
  };

  const stats = getEmployeeStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton for stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
        
        {/* Loading skeleton for filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 h-12 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="w-48 h-12 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
        
        {/* Loading skeleton for cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Usuarios</p>
              <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Activos</p>
              <p className="text-2xl font-bold text-green-900">{stats.active}</p>
            </div>
            <UserCheck className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">Invitados</p>
              <p className="text-2xl font-bold text-yellow-900">{stats.invited}</p>
            </div>
            <Mail className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Inactivos</p>
              <p className="text-2xl font-bold text-red-900">{stats.inactive}</p>
            </div>
            <X className="w-8 h-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, email o documento..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="ALL">Todos los estados</option>
            <option value="ACTIVE">Solo activos</option>
            <option value="INVITED">Solo invitados</option>
            <option value="INACTIVE">Solo inactivos</option>
          </select>
          
          {/* Establishment Filter */}
          <select
            value={filterEstablishment}
            onChange={(e) => setFilterEstablishment(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="ALL">Todos los establecimientos</option>
            {establishments.map(est => (
              <option key={est.id} value={est.id}>
                {est.code} - {est.name}
              </option>
            ))}
          </select>
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
        </div>
      </div>

      {/* Active Filters */}
      {(searchTerm || filterStatus !== 'ALL' || filterEstablishment !== 'ALL') && (
        <div className="flex items-center space-x-2 text-sm">
          <span className="text-gray-600">Filtros activos:</span>
          {searchTerm && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
              Búsqueda: "{searchTerm}"
            </span>
          )}
          {filterStatus !== 'ALL' && (
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
              Estado: {getStatusConfig(filterStatus).label}
            </span>
          )}
          {filterEstablishment !== 'ALL' && (
            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">
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
          {filteredEmployees.length} de {employees.length} usuario{employees.length !== 1 ? 's' : ''}
        </span>
        
        {/* Sort Dropdown */}
        <div className="relative">
          <select
            value={`${sortField}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortField(field as SortField);
              setSortOrder(order as SortOrder);
            }}
            className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="name-asc">Nombre A-Z</option>
            <option value="name-desc">Nombre Z-A</option>
            <option value="email-asc">Email A-Z</option>
            <option value="email-desc">Email Z-A</option>
            <option value="status-asc">Estado A-Z</option>
            <option value="status-desc">Estado Z-A</option>
            <option value="created-desc">Más reciente</option>
            <option value="created-asc">Más antiguo</option>
            <option value="roles-desc">Más roles</option>
            <option value="roles-asc">Menos roles</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {filteredEmployees.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
              {(searchTerm || filterStatus !== 'ALL' || filterEstablishment !== 'ALL')
                ? 'No se encontraron usuarios'
                : 'No hay usuarios'
            }
          </h3>
          <p className="text-gray-500 mb-6">
              {(searchTerm || filterStatus !== 'ALL' || filterEstablishment !== 'ALL')
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Invita a tu primer usuario para comenzar'
            }
          </p>
          {(!searchTerm && filterStatus === 'ALL' && filterEstablishment === 'ALL') && (
            <button
              onClick={onCreate}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Nuevo Usuario
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredEmployees.map((employee) => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              roles={roles}
              establishments={establishments}
              onEdit={() => onEdit(employee)}
              onDelete={() => onDelete(employee)}
              onChangeStatus={(status, reason) => onChangeStatus(employee, status, reason)}
              onAssignRole={() => onAssignRole(employee)}
              onRemoveRole={(establishmentId) => onRemoveRole(employee, establishmentId)}
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
                    onClick={() => handleSort('name')}
                  >
                    Usuario {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="text-left py-3 px-4 font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('email')}
                  >
                    Email {sortField === 'email' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="text-left py-3 px-4 font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('status')}
                  >
                    Estado {sortField === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="text-left py-3 px-4 font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('roles')}
                  >
                    Roles {sortField === 'roles' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee) => {
                  const statusConfig = getStatusConfig(employee.status);
                  
                  return (
                    <tr
                      key={employee.id}
                      data-focus={`configuracion:empleados:${employee.id}`}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-semibold text-gray-600">
                              {employee.personalInfo.fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{employee.personalInfo.fullName}</div>
                            {employee.personalInfo.documentType && employee.personalInfo.documentNumber && (
                              <div className="text-sm text-gray-500">
                                {employee.personalInfo.documentType}: {employee.personalInfo.documentNumber}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-600">
                        {employee.personalInfo.email}
                        {employee.personalInfo.phone && (
                          <div className="text-sm text-gray-500">{employee.personalInfo.phone}</div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <StatusIndicator
                          status={statusConfig.color}
                          label={statusConfig.label}
                          size="sm"
                        />
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          {employee.employment.establishmentIds.length === 0 ? (
                            <span className="text-sm text-gray-500 italic">Sin roles</span>
                          ) : (
                            employee.employment.establishmentIds.map((establishmentId: string, index: number) => (
                              <div key={index} className="text-xs">
                                <span className="font-medium">{getEstablishmentName(establishmentId)}</span>
                                <span className="text-gray-500"> → </span>
                                <span className="text-blue-600">{employee.systemAccess.roles[0]?.name || 'Sin rol'}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => onAssignRole(employee)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Asignar rol"
                          >
                            <Shield className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onEdit(employee)}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            title="Editar"
                          >
                            ✏️
                          </button>

                          {/* Enable/Disable Toggle */}
                          {employee.status === 'ACTIVE' ? (
                            <button
                              onClick={() => onChangeStatus(employee, 'INACTIVE')}
                              className="p-1.5 text-orange-600 hover:bg-orange-50 rounded transition-colors"
                              title="Inhabilitar"
                            >
                              <PowerOff className="w-4 h-4" />
                            </button>
                          ) : employee.status === 'INACTIVE' ? (
                            <button
                              onClick={() => onChangeStatus(employee, 'ACTIVE')}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Habilitar"
                            >
                              <Power className="w-4 h-4" />
                            </button>
                          ) : null}

                          {/* Delete - Only show if employee has no transactions */}
                          {!employee.hasTransactions && (
                            <button
                              onClick={() => onDelete(employee)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Eliminar"
                            >
                              🗑️
                            </button>
                          )}
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