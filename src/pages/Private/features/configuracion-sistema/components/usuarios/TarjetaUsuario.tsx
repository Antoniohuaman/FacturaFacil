/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
// src/features/configuration/components/usuarios/UserCard.tsx
import { useState } from 'react';
import {
  FileText,
  Shield,
  Building2,
  Calendar,
  MoreVertical,
  Edit3,
  Trash2,
  UserPlus,
  UserCheck,
  UserX,
  Clock,
  X,
  CheckCircle,
  AlertCircle,
  Power,
  PowerOff
} from 'lucide-react';
import type { User } from '../../modelos/User';
import type { Establecimiento } from '../../modelos/Establecimiento';
import { StatusIndicator } from '../comunes/IndicadorEstado';

// Type helper for user status
type UserStatus = User['status'];

interface UserCardProps {
  user: User;
  Establecimientos: Establecimiento[];
  onEdit: () => void;
  onDelete: () => void;
  onChangeStatus: (status: UserStatus, reason?: string) => void;
  onAssignRole: () => void;
  onRemoveRole: (EstablecimientoId: string) => void;
  showActions?: boolean;
  compact?: boolean;
}

export function UserCard({
  user,
  Establecimientos,
  onEdit,
  onDelete,
  onChangeStatus,
  onAssignRole,
  onRemoveRole,
  showActions = true,
  compact = false
}: UserCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusReason, setStatusReason] = useState('');
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  const getStatusConfig = (status: UserStatus) => {
    const configs: Record<UserStatus, {
      label: string;
      color: 'success' | 'warning' | 'error';
      icon: any;
      bgColor: string;
      textColor: string;
      description: string;
    }> = {
      ACTIVE: { 
        label: 'Activo', 
        color: 'success' as const, 
        icon: UserCheck,
        bgColor: 'bg-green-50 border-green-200',
        textColor: 'text-green-800',
        description: 'Usuario activo con acceso al sistema'
      },
      INACTIVE: { 
        label: 'Inactivo', 
        color: 'error' as const, 
        icon: UserX,
        bgColor: 'bg-red-50 border-red-200',
        textColor: 'text-red-800',
        description: 'Usuario deshabilitado sin acceso'
      },
      SUSPENDED: { 
        label: 'Suspendido', 
        color: 'warning' as const, 
        icon: Clock,
        bgColor: 'bg-yellow-50 border-yellow-200',
        textColor: 'text-yellow-800',
        description: 'Usuario suspendido temporalmente'
      },
      TERMINATED: { 
        label: 'Terminado', 
        color: 'error' as const, 
        icon: UserX,
        bgColor: 'bg-gray-50 border-gray-200',
        textColor: 'text-gray-800',
        description: 'Usuario terminado'
      }
    };
    return configs[status];
  };

  const getEstablecimientoName = (EstablecimientoId: string) => {
    return Establecimientos.find(est => est.id === EstablecimientoId)?.nombreEstablecimiento || 'Establecimiento no encontrado';
  };

  const getEstablecimientoCode = (EstablecimientoId: string) => {
    return Establecimientos.find(est => est.id === EstablecimientoId)?.codigoEstablecimiento || 'N/A';
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map(name => name[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const handleStatusChange = async (newStatus: UserStatus) => {
    if (newStatus === 'INACTIVE' && !statusReason.trim()) {
      alert('Debes proporcionar un motivo para inactivar al usuario');
      return;
    }

    setIsChangingStatus(true);
    try {
      await onChangeStatus(newStatus, statusReason || undefined);
      setShowStatusModal(false);
      setStatusReason('');
    } finally {
      setIsChangingStatus(false);
    }
  };

  const configEstado = getStatusConfig(user.status);
  const StatusIcon = configEstado.icon;

  return (
    <>
      <div
        data-focus={`configuracion:usuarios:${user.id}`}
        className={`
        bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200
        ${!compact ? 'p-6' : 'p-4'}
      `}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            {/* Avatar */}
            <div className={`
              flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-semibold text-white
              ${user.status === 'ACTIVE' 
                ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
                : user.status === 'INACTIVE'
                  ? 'bg-gradient-to-br from-yellow-500 to-yellow-600'
                  : 'bg-gradient-to-br from-gray-500 to-gray-600'
              }
            `}>
              {getInitials(user.personalInfo.fullName)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-semibold text-gray-900 truncate">
                  {user.personalInfo.fullName}
                </h3>
                <StatusIndicator
                  status={configEstado.color}
                  label={configEstado.label}
                  size="xs"
                />
              </div>
              
              <p className="text-sm text-gray-600 truncate mb-1">
                {user.personalInfo.email}
              </p>
              
              {user.personalInfo.phone && (
                <p className="text-xs text-gray-500">
                  📱 {user.personalInfo.phone}
                </p>
              )}
            </div>
          </div>

          {showActions && (
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {/* Dropdown Menu */}
              {showMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowMenu(false)}
                  />
                  
                  <div className="absolute right-0 top-10 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                    <button
                      onClick={() => {
                        onEdit();
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Editar Usuario</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        onAssignRole();
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <Shield className="w-4 h-4" />
                      <span>Asignar Rol</span>
                    </button>
                    
                    {user.status === 'INACTIVE' && (
                      <button
                        onClick={() => {
                          onChangeStatus('ACTIVE');
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-50 flex items-center space-x-2"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Activar</span>
                      </button>
                    )}
                    
                    {user.status === 'ACTIVE' && (
                      <button
                        onClick={() => {
                          setShowStatusModal(true);
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center space-x-2"
                      >
                        <UserX className="w-4 h-4" />
                        <span>Desactivar</span>
                      </button>
                    )}
                    
                    {user.status === 'INACTIVE' && (
                      <button
                        onClick={() => {
                          onChangeStatus('ACTIVE');
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-50 flex items-center space-x-2"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Reactivar</span>
                      </button>
                    )}

                    <div className="border-t border-gray-100 my-1"></div>

                    {/* Enable/Disable Toggle */}
                    {user.status === 'ACTIVE' ? (
                      <button
                        onClick={() => {
                          onChangeStatus('INACTIVE');
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 flex items-center space-x-2"
                      >
                        <PowerOff className="w-4 h-4" />
                        <span>Inhabilitar</span>
                      </button>
                    ) : user.status === 'INACTIVE' ? (
                      <button
                        onClick={() => {
                          onChangeStatus('ACTIVE');
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 flex items-center space-x-2"
                      >
                        <Power className="w-4 h-4" />
                        <span>Habilitar</span>
                      </button>
                    ) : null}

                    {/* Delete - Only show if user has no transactions */}
                    {!user.hasTransactions && (
                      <>
                        <div className="border-t border-gray-100 my-1"></div>
                        <button
                          onClick={() => {
                            onDelete();
                            setShowMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Eliminar</span>
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Document Info */}
        {user.personalInfo.documentType && user.personalInfo.documentNumber && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                {user.personalInfo.documentType}: {user.personalInfo.documentNumber}
              </span>
            </div>
          </div>
        )}

        {/* Status Information */}
        <div className={`mb-4 p-3 border rounded-lg ${configEstado.bgColor}`}>
          <div className="flex items-center space-x-2 mb-1">
            <StatusIcon className="w-4 h-4" />
            <span className={`font-medium ${configEstado.textColor}`}>
              {configEstado.label}
            </span>
          </div>
          <p className={`text-sm ${configEstado.textColor}`}>
            {configEstado.description}
          </p>
          
          {/* Additional status info */}
          {user.status === 'INACTIVE' && user.createdAt && (
            <p className="text-xs text-gray-600 mt-2">
              <Clock className="w-3 h-3 inline mr-1" />
              Creado {formatDate(user.createdAt)}
            </p>
          )}
          
          {user.status === 'ACTIVE' && user.assignment.hireDate && (
            <p className="text-xs text-gray-600 mt-2">
              <CheckCircle className="w-3 h-3 inline mr-1" />
              Contratado {formatDate(user.assignment.hireDate)}
            </p>
          )}
          
          {user.status === 'INACTIVE' && user.notes && (
            <p className="text-xs text-gray-600 mt-2">
              <AlertCircle className="w-3 h-3 inline mr-1" />
              Notas: {user.notes}
            </p>
          )}
        </div>

        {/* Roles by Establecimiento */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700 flex items-center space-x-2">
              <Building2 className="w-4 h-4" />
              <span>Roles por Establecimiento</span>
            </h4>
            <span className="text-xs text-gray-500">
              {user.assignment.EstablecimientoIds.length} asignado{user.assignment.EstablecimientoIds.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          {user.assignment.EstablecimientoIds.length === 0 ? (
            <div className="text-center py-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <Shield className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500 mb-2">Sin roles asignados</p>
              <button
                onClick={onAssignRole}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Asignar primer rol
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {user.assignment.EstablecimientoIds.map((EstablecimientoId: string, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-blue-900 text-sm">
                        {getEstablecimientoCode(EstablecimientoId)}
                      </span>
                      <span className="text-blue-700 text-sm">
                        {getEstablecimientoName(EstablecimientoId)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <Shield className="w-3 h-3 text-blue-600" />
                      <span className="text-sm text-blue-800 font-medium">
                        {user.systemAccess.roles[0]?.name || 'Sin rol'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveRole && onRemoveRole(EstablecimientoId)}
                    className="p-1 text-red-500 hover:bg-red-100 rounded transition-colors"
                    title="Quitar rol"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        {showActions && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <button
                onClick={onAssignRole}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>Asignar Rol</span>
              </button>
              
              {user.status === 'INACTIVE' && (
                <button
                  onClick={() => onChangeStatus('ACTIVE')}
                  className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 transition-colors"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Activar</span>
                </button>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={onEdit}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Editar usuario"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100 mt-4">
          <div className="flex items-center space-x-1">
            <Calendar className="w-3 h-3" />
            <span>Creado {formatDate(user.createdAt)}</span>
          </div>
          
          {user.updatedAt && user.updatedAt !== user.createdAt && (
            <div className="flex items-center space-x-1">
              <Edit3 className="w-3 h-3" />
              <span>Editado {formatDate(user.updatedAt)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Status Change Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Desactivar Usuario
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {user.personalInfo.fullName}
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo de desactivación *
                </label>
                <textarea
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Especifica el motivo por el cual se desactiva al usuario..."
                  required
                />
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-900">Atención</h4>
                    <p className="text-sm text-red-800 mt-1">
                      El usuario perderá inmediatamente el acceso al sistema y no podrá realizar operaciones.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowStatusModal(false);
                    setStatusReason('');
                  }}
                  disabled={isChangingStatus}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleStatusChange('INACTIVE')}
                  disabled={!statusReason.trim() || isChangingStatus}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  {isChangingStatus && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  <span>Desactivar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
