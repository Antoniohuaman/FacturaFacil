import React from 'react';
import { useConfigurationContext } from '../../contexto/ContextoConfiguracion';
import type { User } from '../../modelos/User';
import type { Role } from '../../modelos/Role';

interface UsuariosAutorizadosSelectorProps {
  value: string[]; // Array of user IDs
  onChange: (selectedIds: string[]) => void;
  filterByCashPermission?: boolean; // If true, only show usuario with cash.canOpenRegister permission
  disabled?: boolean;
  error?: string;
}

export const UsuariosAutorizadosSelector: React.FC<UsuariosAutorizadosSelectorProps> = ({
  value,
  onChange,
  filterByCashPermission = true,
  disabled = false,
  error,
}) => {
  const { state } = useConfigurationContext();

  // Filter users based on cash register permissions
  const availableUsers = React.useMemo(() => {
    let users = state.users.filter((user: User) => user.status === 'ACTIVE');

    if (filterByCashPermission) {
      users = users.filter((user: User) => {
        // Check if any of the user's roles have canOpenRegister permission
        return user.systemAccess.roles.some((role: Role) => 
          role.permissions?.cash?.canOpenRegister === true
        );
      });
    }

    return users.sort((a: User, b: User) => 
      a.personalInfo.fullName.localeCompare(b.personalInfo.fullName)
    );
  }, [state.users, filterByCashPermission]);

  const handleToggleUser = (userId: string) => {
    if (disabled) return;

    if (value.includes(userId)) {
      onChange(value.filter(id => id !== userId));
    } else {
      onChange([...value, userId]);
    }
  };

  const handleSelectAll = () => {
    if (disabled) return;
    onChange(availableUsers.map((user: User) => user.id));
  };

  const handleDeselectAll = () => {
    if (disabled) return;
    onChange([]);
  };

  const getUserName = (userId: string): string => {
    const user = state.users.find((user: User) => user.id === userId);
    return user?.personalInfo.fullName || 'Usuario desconocido';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Usuarios Autorizados
          {filterByCashPermission && (
            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
              (Solo usuarios con permiso para abrir caja)
            </span>
          )}
        </label>
        
        {availableUsers.length > 0 && (
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              onClick={handleSelectAll}
              disabled={disabled}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Seleccionar todos
            </button>
            <span className="text-gray-400">|</span>
            <button
              type="button"
              onClick={handleDeselectAll}
              disabled={disabled}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Limpiar
            </button>
          </div>
        )}
      </div>

      {availableUsers.length === 0 ? (
        <div className="text-sm text-gray-500 dark:text-gray-400 italic p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          {filterByCashPermission 
            ? 'No hay usuarios activos con permiso para abrir caja. Por favor, asigna roles con permisos de caja a los usuarios.'
            : 'No hay usuarios activos disponibles.'
          }
        </div>
      ) : (
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg max-h-60 overflow-y-auto bg-white dark:bg-gray-800">
          {availableUsers.map((user: User) => (
            <label
              key={user.id}
              className={`
                flex items-center px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 last:border-b-0
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <input
                type="checkbox"
                checked={value.includes(user.id)}
                onChange={() => handleToggleUser(user.id)}
                disabled={disabled}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:cursor-not-allowed"
              />
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {user.personalInfo.fullName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {user.assignment.position} • {user.code}
                  {user.systemAccess.roles.length > 0 && (
                    <span className="ml-2">
                      Roles: {user.systemAccess.roles.map((r: Role) => r.name).join(', ')}
                    </span>
                  )}
                </p>
              </div>
            </label>
          ))}
        </div>
      )}

      {/* Selected count */}
      <div className="text-xs text-gray-600 dark:text-gray-400">
        {value.length === 0 ? (
          'Ningún usuario seleccionado'
        ) : value.length === 1 ? (
          `1 usuario seleccionado: ${getUserName(value[0])}`
        ) : (
          `${value.length} usuarios seleccionados`
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};
