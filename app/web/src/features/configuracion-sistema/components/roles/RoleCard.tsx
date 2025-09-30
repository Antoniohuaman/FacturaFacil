import { Shield, Users, ChevronDown, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { useState } from 'react';
import type { Role } from '../../models/Role';
import { ROLE_LEVELS } from '../../models/Role';

interface RoleCardProps {
  role: Partial<Role>;
  employeeCount?: number;
}

export function RoleCard({ role, employeeCount = 0 }: RoleCardProps) {
  const [showPermissions, setShowPermissions] = useState(false);

  const getLevelColor = (level?: Role['level']) => {
    if (!level) return 'gray';
    const levelConfig = ROLE_LEVELS.find(l => l.value === level);
    return levelConfig?.color || 'gray';
  };

  const getLevelColorClasses = (level?: Role['level']) => {
    const color = getLevelColor(level);
    switch (color) {
      case 'red':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'orange':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'yellow':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'blue':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPermissionCount = () => {
    if (!role.permissions) return 0;
    let count = 0;
    Object.values(role.permissions).forEach(modulePermissions => {
      Object.values(modulePermissions).forEach(permission => {
        if (permission === true) count++;
      });
    });
    return count;
  };

  const renderPermissionModule = (moduleName: string, permissions: any) => {
    const permissionEntries = Object.entries(permissions).filter(([key, value]) => {
      // Exclude special properties that are not boolean permissions
      if (key === 'maxDiscountPercentage' || key === 'establishmentIds') return false;
      return typeof value === 'boolean';
    });

    if (permissionEntries.length === 0) return null;

    const enabledCount = permissionEntries.filter(([, value]) => value === true).length;
    const totalCount = permissionEntries.length;
    const hasAnyEnabled = enabledCount > 0;

    return (
      <div key={moduleName} className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h5 className="text-sm font-medium text-gray-700 capitalize">
            {moduleName === 'sales' && '🛒 Ventas'}
            {moduleName === 'inventory' && '📦 Inventario'}
            {moduleName === 'customers' && '👥 Clientes'}
            {moduleName === 'reports' && '📊 Reportes'}
            {moduleName === 'configuration' && '⚙️ Configuración'}
            {moduleName === 'cash' && '💰 Caja'}
            {moduleName === 'admin' && '🔐 Administración'}
          </h5>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            hasAnyEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {enabledCount}/{totalCount}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-1">
          {permissionEntries.map(([key, value]) => (
            <div
              key={key}
              className={`flex items-center space-x-2 text-xs px-2 py-1.5 rounded ${
                value ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'
              }`}
            >
              {value ? (
                <CheckCircle className="w-3 h-3 text-green-600" />
              ) : (
                <XCircle className="w-3 h-3 text-gray-400" />
              )}
              <span className="flex-1">
                {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
              </span>
            </div>
          ))}
        </div>

        {/* Special properties */}
        {permissions.maxDiscountPercentage !== undefined && (
          <div className="mt-2 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
            💵 Descuento máximo: {permissions.maxDiscountPercentage}%
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
      {/* Header */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-3 flex-1">
            <div className={`
              flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center
              ${role.level === 'ADMIN' ? 'bg-gradient-to-br from-red-500 to-red-600' :
                role.level === 'MANAGER' ? 'bg-gradient-to-br from-orange-500 to-orange-600' :
                role.level === 'SUPERVISOR' ? 'bg-gradient-to-br from-yellow-500 to-yellow-600' :
                role.level === 'EMPLOYEE' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                'bg-gradient-to-br from-gray-500 to-gray-600'
              }
            `}>
              <Shield className="w-6 h-6 text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {role.name}
                </h3>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getLevelColorClasses(role.level)}`}>
                  {ROLE_LEVELS.find(l => l.value === role.level)?.label}
                </span>
                {role.type === 'SYSTEM' && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full border border-purple-200">
                    Sistema
                  </span>
                )}
              </div>

              <p className="text-sm text-gray-600 mb-3">
                {role.description}
              </p>

              {/* Stats */}
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-1 text-gray-600">
                  <Shield className="w-4 h-4" />
                  <span>{getPermissionCount()} permisos activos</span>
                </div>
                <div className="flex items-center space-x-1 text-gray-600">
                  <Users className="w-4 h-4" />
                  <span>{employeeCount} empleado{employeeCount !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Toggle Permissions Button */}
        <button
          onClick={() => setShowPermissions(!showPermissions)}
          className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium text-gray-700"
        >
          <span>Ver permisos detallados</span>
          {showPermissions ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Permissions Details */}
      {showPermissions && role.permissions && (
        <div className="px-6 pb-6 pt-0 border-t border-gray-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4">
            {Object.entries(role.permissions).map(([moduleName, permissions]) =>
              renderPermissionModule(moduleName, permissions)
            )}
          </div>
        </div>
      )}
    </div>
  );
}
