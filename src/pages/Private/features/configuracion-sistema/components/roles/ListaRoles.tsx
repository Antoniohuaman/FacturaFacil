import { Shield, Info } from 'lucide-react';
import type { User } from '../../modelos/User';
import type { RolDelSistema } from '../../roles/tiposRolesPermisos';
import { TarjetaRol } from './TarjetaRol';

interface PropsListaRoles {
  roles: RolDelSistema[];
  users?: User[];
  isLoading?: boolean;
}

export function ListaRoles({ roles, users = [], isLoading = false }: PropsListaRoles) {

  // Count users per role
  const getUserCountForRole = (roleId?: string): number => {
    if (!roleId) return 0;
    return users.filter(user =>
      user.systemAccess.roleIds.includes(roleId) &&
      user.status === 'ACTIVE'
    ).length;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton */}
        <div className="grid grid-cols-1 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (roles.length === 0) {
    return (
      <div className="text-center py-12">
        <Shield className="mx-auto w-12 h-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No hay roles disponibles
        </h3>
        <p className="text-gray-500">
          No se encontraron roles en el sistema
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-blue-900 mb-1">
              Roles del Sistema
            </h4>
            <p className="text-xs text-blue-800">
              Los roles definen los permisos y accesos que tienen los usuarios en el sistema.
              Cada usuario puede tener uno o más roles asignados según sus responsabilidades.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Total de Roles</p>
              <p className="text-xl font-bold text-gray-900">{roles.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Usuarios activos</p>
              <p className="text-xl font-bold text-gray-900">
                {users.filter(user => user.status === 'ACTIVE').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 gap-4">
        {roles.map((role, index) => (
          <TarjetaRol
            key={role.id ?? index}
            rol={role}
            cantidadUsuarios={getUserCountForRole(role.id)}
          />
        ))}
      </div>

      {/* Help Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Información sobre permisos
            </h4>
            <ul className="space-y-1 text-xs text-gray-600">
              <li>• <strong>Administrador:</strong> Acceso completo a modulos y configuracion</li>
              <li>• <strong>Vendedor:</strong> Venta completa, cobranzas y caja</li>
              <li>• <strong>Contador:</strong> Consulta de comprobantes e indicadores</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
