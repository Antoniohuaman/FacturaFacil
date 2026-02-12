// src/features/configuration/components/usuarios/UserCard.tsx
import { useMemo, useState } from 'react';
import {
  FileText,
  Shield,
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
  AlertCircle
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { User } from '../../modelos/User';
import { IndicadorEstado } from '../comunes/IndicadorEstado';
import { useUserSession } from '@/contexts/UserSessionContext';
import { useTenantStore } from '../../../autenticacion/store/TenantStore';
import { SYSTEM_ROLES } from '../../modelos/Role';
import {
  construirNombreCompleto,
  construirResumenEmpresas,
  construirResumenEstablecimientos,
  construirResumenRoles,
  obtenerAsignacionEmpresa,
  obtenerAsignacionesUsuario,
  obtenerEstadoUsuarioPorAsignaciones,
  obtenerEstablecimientosIdsAsignacion,
  obtenerMapaEstablecimientos,
} from '../../utilidades/usuariosAsignaciones';

// Type helper for user status
type UserStatus = User['status'];

interface PropsTarjetaUsuario {
  usuario: User;
  alEditar: () => void;
  alEliminar: () => void;
  alCambiarEstado: (estado: UserStatus, motivo?: string) => void;
  alAsignarRol: () => void;
  alQuitarAcceso: (establecimientoId: string) => void;
  mostrarAcciones?: boolean;
  compacto?: boolean;
}

export function TarjetaUsuario({
  usuario,
  alEditar,
  alEliminar,
  alCambiarEstado,
  alAsignarRol,
  alQuitarAcceso,
  mostrarAcciones = true,
  compacto = false
}: PropsTarjetaUsuario) {
  const { session } = useUserSession();
  const empresas = useTenantStore((store) => store.empresas);
  const contextoActual = useTenantStore((store) => store.contextoActual);
  const isCurrentUser = session?.userId === usuario.id;
  const [mostrarMenu, setMostrarMenu] = useState(false);
  const [mostrarModalEstado, setMostrarModalEstado] = useState(false);
  const [motivoEstado, setMotivoEstado] = useState('');
  const [cambiandoEstado, setCambiandoEstado] = useState(false);

  const empresaActual = useMemo(() => {
    if (!contextoActual?.empresaId) return null;
    return empresas.find((empresa) => empresa.id === contextoActual.empresaId) ?? null;
  }, [contextoActual?.empresaId, empresas]);

  const asignaciones = useMemo(
    () => obtenerAsignacionesUsuario(
      usuario,
      empresaActual?.id,
      empresaActual?.razonSocial ?? empresaActual?.nombreComercial,
    ),
    [empresaActual?.id, empresaActual?.nombreComercial, empresaActual?.razonSocial, usuario],
  );

  const mapaEstablecimientos = useMemo(
    () => obtenerMapaEstablecimientos(empresas),
    [empresas],
  );

  const asignacionEmpresaActual = empresaActual?.id
    ? obtenerAsignacionEmpresa(asignaciones, empresaActual.id)
    : undefined;
  const establecimientosEmpresaActual = asignacionEmpresaActual
    ? obtenerEstablecimientosIdsAsignacion(asignacionEmpresaActual)
    : [];

  const resumenRoles = construirResumenRoles(asignaciones, SYSTEM_ROLES);
  const resumenEmpresas = construirResumenEmpresas(asignaciones);
  const resumenEstablecimientos = construirResumenEstablecimientos(asignaciones, mapaEstablecimientos);
  const estadoUsuario = obtenerEstadoUsuarioPorAsignaciones(asignaciones, usuario.status);
  const nombreCompleto = construirNombreCompleto(usuario.personalInfo.firstName, usuario.personalInfo.lastName);

  const obtenerConfigEstado = (status: UserStatus) => {
    const configs: Record<UserStatus, {
      label: string;
      color: 'success' | 'warning' | 'error';
      icon: LucideIcon;
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

  const formatearFecha = (date: Date) => {
    return date.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const obtenerIniciales = (nombre: string) => {
    return nombre
      .split(' ')
      .map(name => name[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const manejarCambioEstado = async (newStatus: UserStatus) => {
    if (isCurrentUser && newStatus === 'INACTIVE') {
      return;
    }
    if (newStatus === 'INACTIVE' && !motivoEstado.trim()) {
      setMostrarModalEstado(true);
      return;
    }

    setCambiandoEstado(true);
    try {
      await alCambiarEstado(newStatus, motivoEstado || undefined);
      setMostrarModalEstado(false);
      setMotivoEstado('');
    } finally {
      setCambiandoEstado(false);
    }
  };

  const configEstado = obtenerConfigEstado(estadoUsuario);
  const StatusIcon = configEstado.icon;

  return (
    <>
      <div
        data-focus={`configuracion:usuarios:${usuario.id}`}
        className={`
        bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200
        ${!compacto ? 'p-6' : 'p-4'}
      `}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            {/* Avatar */}
            <div className={`
              flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-semibold text-white
              ${estadoUsuario === 'ACTIVE' 
                ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
                : estadoUsuario === 'INACTIVE'
                  ? 'bg-gradient-to-br from-yellow-500 to-yellow-600'
                  : 'bg-gradient-to-br from-gray-500 to-gray-600'
              }
            `}>
              {obtenerIniciales(nombreCompleto)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-semibold text-gray-900 truncate">
                  {nombreCompleto}
                </h3>
                <IndicadorEstado
                  status={configEstado.color}
                  label={configEstado.label}
                  size="xs"
                />
              </div>
              
              <p className="text-sm text-gray-600 truncate mb-1">
                {usuario.personalInfo.email}
              </p>
              
              {usuario.personalInfo.phone && (
                <p className="text-xs text-gray-500">
                  📱 {usuario.personalInfo.phone}
                </p>
              )}
            </div>
          </div>

          {mostrarAcciones && (
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setMostrarMenu(!mostrarMenu)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {/* Dropdown Menu */}
              {mostrarMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setMostrarMenu(false)}
                  />
                  
                  <div className="absolute right-0 top-10 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                    <button
                      onClick={() => {
                        alEditar();
                        setMostrarMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Editar Usuario</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        alAsignarRol();
                        setMostrarMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <Shield className="w-4 h-4" />
                      <span>Asignar Rol</span>
                    </button>
                    
                    {estadoUsuario === 'INACTIVE' && (
                      <button
                        onClick={() => {
                          manejarCambioEstado('ACTIVE');
                          setMostrarMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-50 flex items-center space-x-2"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Activar</span>
                      </button>
                    )}
                    
                    {estadoUsuario === 'ACTIVE' && (
                      !isCurrentUser && (
                        <button
                          onClick={() => {
                            setMostrarModalEstado(true);
                            setMostrarMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center space-x-2"
                        >
                          <UserX className="w-4 h-4" />
                          <span>Desactivar</span>
                        </button>
                      )
                    )}

                    {/* Delete - Only show if user has no transactions */}
                    {!isCurrentUser && !usuario.hasTransactions && (
                      <>
                        <div className="border-t border-gray-100 my-1"></div>
                        <button
                          onClick={() => {
                            alEliminar();
                            setMostrarMenu(false);
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
        {usuario.personalInfo.documentType && usuario.personalInfo.documentNumber && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                {usuario.personalInfo.documentType}: {usuario.personalInfo.documentNumber}
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
          {estadoUsuario === 'INACTIVE' && usuario.createdAt && (
            <p className="text-xs text-gray-600 mt-2">
              <Clock className="w-3 h-3 inline mr-1" />
              Creado {formatearFecha(usuario.createdAt)}
            </p>
          )}
          
          {estadoUsuario === 'ACTIVE' && usuario.assignment.hireDate && (
            <p className="text-xs text-gray-600 mt-2">
              <CheckCircle className="w-3 h-3 inline mr-1" />
              Contratado {formatearFecha(usuario.assignment.hireDate)}
            </p>
          )}
          
          {estadoUsuario === 'INACTIVE' && usuario.notes && (
            <p className="text-xs text-gray-600 mt-2">
              <AlertCircle className="w-3 h-3 inline mr-1" />
              Notas: {usuario.notes}
            </p>
          )}
        </div>

        <div className="mb-4 space-y-2">
          <div className="text-sm text-gray-700">
            <span className="font-medium">Empresas:</span> {resumenEmpresas.resumen}
          </div>
          <div className="text-sm text-gray-700">
            <span className="font-medium">Roles:</span> {resumenRoles.resumen}
          </div>
          <div className="text-sm text-gray-700">
            <span className="font-medium">Establecimientos:</span> {resumenEstablecimientos.resumen}
          </div>

          {establecimientosEmpresaActual.length > 0 && (
            <div className="mt-3 space-y-2">
              {establecimientosEmpresaActual.map((establecimientoId) => (
                <div key={establecimientoId} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-md">
                  <div className="text-sm text-gray-700">
                    {mapaEstablecimientos.get(establecimientoId)?.nombre ?? establecimientoId}
                  </div>
                  <button
                    onClick={() => alQuitarAcceso(establecimientoId)}
                    className="p-1 text-red-500 hover:bg-red-100 rounded transition-colors"
                    title="Quitar acceso"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        {mostrarAcciones && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <button
                onClick={alAsignarRol}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>Asignar Rol</span>
              </button>
              
              {estadoUsuario === 'INACTIVE' && (
                <button
                  onClick={() => manejarCambioEstado('ACTIVE')}
                  className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 transition-colors"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Activar</span>
                </button>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={alEditar}
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
            <span>Creado {formatearFecha(usuario.createdAt)}</span>
          </div>
          
          {usuario.updatedAt && usuario.updatedAt !== usuario.createdAt && (
            <div className="flex items-center space-x-1">
              <Edit3 className="w-3 h-3" />
              <span>Editado {formatearFecha(usuario.updatedAt)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Status Change Modal */}
      {mostrarModalEstado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Desactivar Usuario
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {nombreCompleto}
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo de desactivación *
                </label>
                <textarea
                  value={motivoEstado}
                  onChange={(e) => setMotivoEstado(e.target.value)}
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
                    setMostrarModalEstado(false);
                    setMotivoEstado('');
                  }}
                  disabled={cambiandoEstado}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => manejarCambioEstado('INACTIVE')}
                  disabled={!motivoEstado.trim() || cambiandoEstado}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  {cambiandoEstado && (
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
