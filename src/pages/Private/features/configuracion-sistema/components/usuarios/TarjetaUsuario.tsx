// src/features/configuration/components/usuarios/UserCard.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FileText,
  Calendar,
  MoreVertical,
  Edit3,
  UserCheck,
  UserX,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { User } from '../../modelos/User';
import { IndicadorEstado } from '../comunes/IndicadorEstado';
import { Tooltip } from '@/shared/ui';
import { useUserSession } from '@/contexts/UserSessionContext';
import { useConfigurationContext, useEmpresasConfiguradas } from '../../contexto/ContextoConfiguracion';
import {
  construirNombreCompleto,
  construirResumenEmpresas,
  construirResumenRolesSinEmpresa,
  obtenerAsignacionesUsuarioGlobal,
  obtenerEstadoUsuarioPorAsignaciones,
  obtenerEstablecimientosIdsAsignacion,
  obtenerMapaEstablecimientos,
  normalizarCorreo,
} from '../../utilidades/usuariosAsignaciones';

// Type helper for user status
type UserStatus = User['status'];

interface PropsTarjetaUsuario {
  usuario: User;
  alEditar: () => void;
  alEliminar: () => void;
  alCambiarEstado: (estado: UserStatus, motivo?: string) => void;
  alQuitarAcceso: (establecimientoId: string) => void;
  mostrarAcciones?: boolean;
  compacto?: boolean;
}

export function TarjetaUsuario(props: PropsTarjetaUsuario) {
  const {
    usuario,
    alEditar,
    alEliminar,
    alCambiarEstado,
    mostrarAcciones = true,
    compacto = false
  } = props;
  const { session } = useUserSession();
  const { rolesConfigurados } = useConfigurationContext();
  const empresas = useEmpresasConfiguradas();
  const isCurrentUser = session?.userId === usuario.id;
  const [mostrarMenu, setMostrarMenu] = useState(false);
  const [mostrarModalEstado, setMostrarModalEstado] = useState(false);
  const [motivoEstado, setMotivoEstado] = useState('');
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [establecimientosDesborda, setEstablecimientosDesborda] = useState(false);
  const establecimientosContenedorRef = useRef<HTMLSpanElement | null>(null);
  const establecimientosMedicionRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!mostrarMenu) return;
    const manejarEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMostrarMenu(false);
      }
    };
    document.addEventListener('keydown', manejarEscape);
    return () => {
      document.removeEventListener('keydown', manejarEscape);
    };
  }, [mostrarMenu]);

  const asignaciones = useMemo(
    () => obtenerAsignacionesUsuarioGlobal(usuario, empresas),
    [empresas, usuario],
  );

  const mapaEstablecimientos = useMemo(
    () => obtenerMapaEstablecimientos(empresas),
    [empresas],
  );

  const establecimientosAsignados = useMemo(() => {
    const ids = asignaciones.flatMap((asignacion) => obtenerEstablecimientosIdsAsignacion(asignacion));
    return Array.from(new Set(ids));
  }, [asignaciones]);

  const resumenEmpresas = construirResumenEmpresas(asignaciones);
  const estadoUsuario = obtenerEstadoUsuarioPorAsignaciones(asignaciones, usuario.status);
  const nombreCompleto = construirNombreCompleto(usuario.personalInfo.firstName, usuario.personalInfo.lastName);
  const correoSesion = normalizarCorreo(session?.userEmail);
  const correoUsuario = normalizarCorreo(usuario.personalInfo.email);
  const esUsuarioSesion = Boolean(
    (session?.userId && session.userId === usuario.id) ||
    (correoSesion && correoUsuario && correoSesion === correoUsuario),
  );
  const esSuperadminSesion = Boolean(session?.permissions?.includes('*'));
  const resumenRoles = esUsuarioSesion && esSuperadminSesion
    ? { resumen: 'Superadmin', detalle: 'Superadmin', roles: ['Superadmin'] }
    : construirResumenRolesSinEmpresa(asignaciones, rolesConfigurados);
  const establecimientosNombres = useMemo(
    () => establecimientosAsignados.map(
      (id) => mapaEstablecimientos.get(id)?.nombre ?? id,
    ),
    [establecimientosAsignados, mapaEstablecimientos],
  );
  const establecimientosTextoCompleto = establecimientosNombres.join(', ');
  const establecimientosResumen = establecimientosNombres.length > 0
    ? establecimientosNombres.length === 1
      ? establecimientosNombres[0]
      : `${establecimientosNombres[0]} +${establecimientosNombres.length - 1}`
    : 'Sin datos';
  const resumenEmpresasTexto = esUsuarioSesion && esSuperadminSesion
    ? { resumen: 'Todas las empresas', detalle: 'Todas las empresas' }
    : resumenEmpresas;
  const establecimientosResumenTexto = esUsuarioSesion && esSuperadminSesion
    ? { resumen: 'Todos los establecimientos', detalle: 'Todos los establecimientos' }
    : { resumen: establecimientosResumen, detalle: establecimientosTextoCompleto || 'Sin datos' };

  useEffect(() => {
    const medir = () => {
      const contenedor = establecimientosContenedorRef.current;
      const medicion = establecimientosMedicionRef.current;
      if (!contenedor || !medicion) return;
      const anchoDisponible = contenedor.getBoundingClientRect().width;
      setEstablecimientosDesborda(medicion.scrollWidth > anchoDisponible);
    };

    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [establecimientosTextoCompleto]);

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
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Acciones"
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
                  
                  <div className="absolute right-0 top-10 min-w-[160px] bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1.5 flex flex-col whitespace-normal" role="menu">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        alEditar();
                        setMostrarMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                    >
                      Editar
                    </button>

                    {estadoUsuario === 'INACTIVE' && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          manejarCambioEstado('ACTIVE');
                          setMostrarMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-green-700 hover:bg-green-50 focus:outline-none focus:bg-green-50"
                      >
                        Activar
                      </button>
                    )}

                    {estadoUsuario === 'ACTIVE' && !isCurrentUser && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMostrarModalEstado(true);
                          setMostrarMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-yellow-700 hover:bg-yellow-50 focus:outline-none focus:bg-yellow-50"
                      >
                        Inactivar
                      </button>
                    )}

                    {!isCurrentUser && !usuario.hasTransactions && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          alEliminar();
                          setMostrarMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-red-700 hover:bg-red-50 focus:outline-none focus:bg-red-50"
                      >
                        Eliminar
                      </button>
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
            <span className="font-medium">Empresas:</span> {resumenEmpresasTexto.resumen}
          </div>
          <div className="text-sm text-gray-700">
            <span className="font-medium">Roles:</span>{' '}
            <Tooltip contenido={resumenRoles.detalle} ubicacion="arriba" multilinea>
              <span className="text-gray-700 cursor-help">
                {resumenRoles.resumen}
              </span>
            </Tooltip>
          </div>
          <div className="text-sm text-gray-700 flex items-start gap-1">
            <span className="font-medium shrink-0">Establecimientos:</span>
            <span className="relative flex-1 min-w-0" ref={establecimientosContenedorRef}>
              <span
                ref={establecimientosMedicionRef}
                className="absolute invisible whitespace-nowrap"
              >
                {establecimientosResumenTexto.detalle}
              </span>
              {esUsuarioSesion && esSuperadminSesion ? (
                <span className="block text-gray-700">
                  {establecimientosResumenTexto.resumen}
                </span>
              ) : establecimientosDesborda ? (
                <Tooltip contenido={establecimientosNombres.join('\n') || 'Sin datos'} ubicacion="arriba" multilinea>
                  <span className="block truncate text-gray-700 cursor-help">
                    {establecimientosResumen}
                  </span>
                </Tooltip>
              ) : (
                <span className="block text-gray-700">
                  {establecimientosTextoCompleto || 'Sin datos'}
                </span>
              )}
            </span>
          </div>
        </div>


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
