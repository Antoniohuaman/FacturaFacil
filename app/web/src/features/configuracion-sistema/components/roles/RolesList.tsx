import { Shield, AlertCircle, Info } from 'lucide-react';
import type { Role } from '../../models/Role';
import type { User } from '../../models/User';
import { RoleCard } from './RoleCard';

interface RolesListProps {
  roles: Partial<Role>[];
  employees?: User[];
  isLoading?: boolean;
}

export function RolesList({ roles, employees = [], isLoading = false }: RolesListProps) {

  // Count employees per role
  const getEmployeeCountForRole = (roleIndex: number): number => {
    const roleId = `role-${roleIndex + 1}`;
    return employees.filter(emp =>
      emp.systemAccess.roleIds.includes(roleId) &&
      emp.status === 'ACTIVE'
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
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-blue-900 mb-1">
              Roles del Sistema
            </h4>
            <p className="text-sm text-blue-800">
              Los roles definen los permisos y accesos que tienen los usuarios en el sistema.
              Cada usuario puede tener uno o más roles asignados según sus responsabilidades.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total de Roles</p>
              <p className="text-2xl font-bold text-gray-900">{roles.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Roles del Sistema</p>
              <p className="text-2xl font-bold text-gray-900">
                {roles.filter(r => r.type === 'SYSTEM').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Roles Personalizados</p>
              <p className="text-2xl font-bold text-gray-900">
                {roles.filter(r => r.type === 'CUSTOM').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Warning for Custom Roles */}
      {roles.filter(r => r.type === 'CUSTOM').length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-yellow-900 mb-1">
                Roles Personalizados
              </h4>
              <p className="text-sm text-yellow-800">
                Actualmente solo están disponibles los roles predefinidos del sistema.
                La funcionalidad para crear roles personalizados estará disponible próximamente.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Roles Grid */}
      <div className="grid grid-cols-1 gap-6">
        {roles.map((role, index) => (
          <RoleCard
            key={index}
            role={role}
            employeeCount={getEmployeeCountForRole(index)}
          />
        ))}
      </div>

      {/* Help Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Información sobre permisos
            </h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• <strong>Super Administrador:</strong> Acceso completo a todas las funcionalidades sin restricciones</li>
              <li>• <strong>Gerente:</strong> Gestión de ventas, inventario y reportes, sin acceso a configuración del sistema</li>
              <li>• <strong>Vendedor:</strong> Acceso básico a ventas y consulta de inventario, ideal para personal de mostrador</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
