import { Shield, Info, Plus } from 'lucide-react';
import type { User } from '../../modelos/User';
import type { RolConfiguracion } from '../../roles/tiposRolesPermisos';
import { TarjetaRol } from './TarjetaRol';

interface PropsListaRoles {
  roles: RolConfiguracion[];
  users?: User[];
  isLoading?: boolean;
  puedeGestionar?: boolean;
  alCrearRol?: () => void;
  alEditarRol?: (rol: RolConfiguracion) => void;
  alEliminarRol?: (rol: RolConfiguracion) => void;
}

export function ListaRoles({
  roles,
  users = [],
  isLoading = false,
  puedeGestionar = false,
  alCrearRol,
  alEditarRol,
  alEliminarRol,
}: PropsListaRoles) {
  const SUPERADMIN_INFO_ROLE_ID = '__superadmin_info__';
  const superadminInfoRole: RolConfiguracion = {
    id: SUPERADMIN_INFO_ROLE_ID,
    nombre: 'Superadmin',
    descripcion: 'Acceso total al sistema. Rol reservado (no asignable).',
    permisos: [],
    tipo: 'SISTEMA',
  };
  const rolesParaMostrar = [superadminInfoRole, ...roles];

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

  if (rolesParaMostrar.length === 0) {
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

  const cantidadPersonalizados = roles.filter((rol) => rol.tipo === 'PERSONALIZADO').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Roles disponibles</h3>
        {puedeGestionar && alCrearRol && (
          <button
            type="button"
            onClick={alCrearRol}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Crear rol
          </button>
        )}
      </div>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Total de Roles</p>
              <p className="text-xl font-bold text-gray-900">{rolesParaMostrar.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Roles personalizados</p>
              <p className="text-xl font-bold text-gray-900">{cantidadPersonalizados}</p>
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
        {rolesParaMostrar.map((role, index) => (
          <TarjetaRol
            key={role.id ?? index}
            rol={role}
            cantidadUsuarios={getUserCountForRole(role.id)}
            puedeGestionar={puedeGestionar}
            isSuperadminInfo={role.id === SUPERADMIN_INFO_ROLE_ID}
            onEditar={alEditarRol}
            onEliminar={alEliminarRol}
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
              <li>• <strong>Personalizados:</strong> Permisos definidos por empresa</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
