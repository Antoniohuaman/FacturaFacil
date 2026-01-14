/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
import { useState, useEffect } from 'react';
import type { Role } from '../../models/Role';
import { ROLE_LEVELS, SYSTEM_ROLES } from '../../models/Role';
import { Shield, ChevronDown, ChevronRight, Info, AlertTriangle } from 'lucide-react';

interface RoleAssignmentProps {
  selectedRoleIds: string[];
  onChange: (roleIds: string[]) => void;
  error?: string;
}

export default function RoleAssignment({ selectedRoleIds, onChange, error }: RoleAssignmentProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [showPermissions, setShowPermissions] = useState<string | null>(null);

  // Mock roles data - in real app this would come from a hook
  useEffect(() => {
    const mockRoles: Role[] = SYSTEM_ROLES.map((role: Partial<Role>, index: number) => ({
      id: `role-${index + 1}`,
      name: role.name!,
      description: role.description!,
      type: role.type!,
      level: role.level!,
      permissions: role.permissions!,
      restrictions: {},
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'admin',
      updatedBy: 'admin',
    }));

    setRoles(mockRoles);
  }, []);

  const handleRoleToggle = (roleId: string) => {
    if (selectedRoleIds.includes(roleId)) {
      onChange(selectedRoleIds.filter(id => id !== roleId));
    } else {
      onChange([...selectedRoleIds, roleId]);
    }
  };

  const getLevelColor = (level: Role['level']) => {
    const levelConfig = ROLE_LEVELS.find((l: any) => l.value === level);
    return levelConfig?.color || 'gray';
  };

  const getLevelColorClasses = (level: Role['level']) => {
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

  const getPermissionCount = (role: Role) => {
    let count = 0;
    Object.values(role.permissions as Record<string, any>).forEach((modulePermissions: any) => {
      Object.values(modulePermissions as Record<string, any>).forEach((permission: any) => {
        if (permission === true) count++;
      });
    });
    return count;
  };

  const renderPermissionModule = (moduleName: string, permissions: any) => {
    const permissionEntries = Object.entries(permissions).filter(([, value]) => 
      typeof value === 'boolean' && value === true
    );

    if (permissionEntries.length === 0) return null;

    return (
      <div key={moduleName} className="mb-3">
        <h5 className="text-sm font-medium text-gray-700 mb-2 capitalize">
          {moduleName === 'sales' && 'Ventas'}
          {moduleName === 'inventory' && 'Inventario'}
          {moduleName === 'customers' && 'Clientes'}
          {moduleName === 'reports' && 'Reportes'}
          {moduleName === 'configuration' && 'Configuración'}
          {moduleName === 'cash' && 'Caja'}
          {moduleName === 'admin' && 'Administración'}
        </h5>
        <div className="grid grid-cols-2 gap-1">
          {permissionEntries.map(([key]) => (
            <div key={key} className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
              {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const hasConflictingRoles = () => {
    const selectedRoles = roles.filter(role => selectedRoleIds.includes(role.id));
    const levels = selectedRoles.map(role => role.level);
    
    // Check if there are both ADMIN and EMPLOYEE role levels selected
    return levels.includes('ADMIN') && levels.includes('EMPLOYEE');
  };

  const getSelectedRolesInfo = () => {
    const selectedRoles = roles.filter(role => selectedRoleIds.includes(role.id));
    if (selectedRoles.length === 0) return null;

    const highestLevel = selectedRoles.reduce((highest, role) => {
      const levelOrder = ['GUEST', 'EMPLOYEE', 'SUPERVISOR', 'MANAGER', 'ADMIN'];
      const currentIndex = levelOrder.indexOf(role.level);
      const highestIndex = levelOrder.indexOf(highest);
      return currentIndex > highestIndex ? role.level : highest;
    }, 'GUEST' as Role['level']);

    return {
      count: selectedRoles.length,
      highestLevel,
      roles: selectedRoles,
    };
  };

  const selectedInfo = getSelectedRolesInfo();

  return (
    <div className="space-y-4">
      {/* Selected Roles Summary */}
      {selectedInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              {selectedInfo.count} rol(es) seleccionado(s)
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedInfo.roles.map(role => (
              <span
                key={role.id}
                className={`px-2 py-1 text-xs font-medium rounded-full border ${getLevelColorClasses(role.level)}`}
              >
                {role.name}
              </span>
            ))}
          </div>
          {hasConflictingRoles() && (
            <div className="mt-2 flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs">
                Advertencia: Has seleccionado roles con niveles muy diferentes. Considera revisar los permisos.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Role Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Seleccionar Roles
          </label>
          <span className="text-xs text-gray-500">
            {selectedRoleIds.length} de {roles.length} seleccionados
          </span>
        </div>

        <div className="border border-gray-300 rounded-lg divide-y divide-gray-200 max-h-80 overflow-y-auto">
          {roles.map((role) => {
            const isSelected = selectedRoleIds.includes(role.id);
            const isExpanded = expandedRole === role.id;
            const showPerms = showPermissions === role.id;

            return (
              <div key={role.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleRoleToggle(role.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-gray-900">{role.name}</h4>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getLevelColorClasses(role.level)}`}>
                          {ROLE_LEVELS.find(l => l.value === role.level)?.label}
                        </span>
                        {role.type === 'SYSTEM' && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full border border-gray-200">
                            Sistema
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{role.description}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-gray-500">
                          {getPermissionCount(role)} permisos activos
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowPermissions(showPerms ? null : role.id)}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                      title="Ver permisos"
                    >
                      <Info className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedRole(isExpanded ? null : role.id)}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Role Details */}
                {isExpanded && (
                  <div className="mt-3 pl-6 border-l-2 border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="font-medium text-gray-700">Tipo:</span>
                        <span className="ml-2 text-gray-600">
                          {role.type === 'SYSTEM' ? 'Rol del Sistema' : 'Rol Personalizado'}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Estado:</span>
                        <span className="ml-2 text-gray-600">
                          {role.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Creado:</span>
                        <span className="ml-2 text-gray-600">
                          {role.createdAt.toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Modificado:</span>
                        <span className="ml-2 text-gray-600">
                          {role.updatedAt.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Permissions Details */}
                {showPerms && (
                  <div className="mt-3 pl-6 border-l-2 border-blue-200 bg-blue-50 p-3 rounded">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Permisos del Rol</h4>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {Object.entries(role.permissions).map(([moduleName, permissions]) =>
                        renderPermissionModule(moduleName, permissions)
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Quick Actions */}
      {roles.length > 0 && (
        <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            Deseleccionar todos
          </button>
          <span className="text-gray-300">|</span>
          <button
            type="button"
            onClick={() => onChange(roles.filter(r => r.type === 'SYSTEM').map(r => r.id))}
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            Solo roles del sistema
          </button>
          <span className="text-gray-300">|</span>
          <button
            type="button"
            onClick={() => {
              const sellerRole = roles.find(r => r.name === 'Vendedor');
              if (sellerRole) onChange([sellerRole.id]);
            }}
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            Solo vendedor
          </button>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-gray-600">
            <p className="mb-1">
              <strong>Recomendaciones:</strong>
            </p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Para vendedores nuevos, usa el rol "Vendedor" únicamente</li>
              <li>Los supervisores pueden tener múltiples roles para mayor flexibilidad</li>
              <li>Evita asignar roles de "Administrador" y "Usuario" al mismo tiempo</li>
              <li>Puedes asignar múltiples roles, los permisos se combinan automáticamente</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}