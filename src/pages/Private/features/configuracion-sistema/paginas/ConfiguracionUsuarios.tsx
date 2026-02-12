// src/features/configuration/pages/UsersConfiguration.tsx
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Plus,
  ArrowLeft,
  Shield
} from 'lucide-react';
import { useConfigurationContext, useEmpresasConfiguradas } from '../contexto/ContextoConfiguracion';
import { ModalConfirmacion } from '../components/comunes/ModalConfirmacion';
import { ListaUsuarios } from '../components/usuarios/ListaUsuarios.tsx';
import { FormularioUsuario } from '../components/usuarios/FormularioUsuario';
import { ListaRoles } from '../components/roles/ListaRoles';
import { ModalCredenciales } from '../components/usuarios/ModalCredenciales';
import { SYSTEM_ROLES } from '../modelos/Role';
import type { User } from '../modelos/User';
import { Button, PageHeader } from '@/contasis';
import { useTenantStore } from '../../autenticacion/store/TenantStore';
import {
  construirAsignacionesDesdeFormulario,
  construirNombreCompleto,
  construirRolesSistema,
  normalizarCorreo,
  obtenerAsignacionesActualizadas,
  obtenerAsignacionEmpresa,
  obtenerAsignacionesUsuario,
  obtenerEstadoUsuarioPorAsignaciones,
  obtenerEstablecimientosUnicos,
  obtenerIdsRolesUnicos,
  obtenerMapaEstablecimientos,
} from '../utilidades/usuariosAsignaciones';

type EstadoUsuario = 'ACTIVE' | 'INACTIVE';

type DatosFormularioUsuario = {
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  tipoDocumento: 'DNI' | 'CE' | 'PASSPORT' | '';
  numeroDocumento: string;
  contrasena: string;
  asignacionesPorEmpresa: User['asignacionesPorEmpresa'];
};

export function ConfiguracionUsuarios() {
  const navigate = useNavigate();
  const { state, dispatch } = useConfigurationContext();
  const { users: usuarios, Establecimientos: establecimientos } = state;
  const empresas = useEmpresasConfiguradas();
  const contextoActual = useTenantStore((store) => store.contextoActual);

  const [pestanaActiva, setPestanaActiva] = useState<'usuarios' | 'roles'>('usuarios');
  const [mostrarFormularioUsuario, setMostrarFormularioUsuario] = useState(false);
  const [usuarioEnEdicion, setUsuarioEnEdicion] = useState<User | null>(null);
  const [modalEliminar, setModalEliminar] = useState<{ show: boolean; user?: User }>({
    show: false
  });
  const [cargando, setCargando] = useState(false);
  const [modalCredenciales, setModalCredenciales] = useState<{
    show: boolean;
    user?: User;
    credentials?: {
      fullName: string;
      email: string;
      username: string;
      password: string;
    };
  }>({ show: false });

  const empresaActual = useMemo(() => {
    if (!contextoActual?.empresaId) return null;
    return empresas.find((empresa) => empresa.id === contextoActual.empresaId) ?? null;
  }, [contextoActual?.empresaId, empresas]);

  const correosExistentes = usuarios
    .filter(usuario => usuario.id !== usuarioEnEdicion?.id)
    .map(usuario => normalizarCorreo(usuario.personalInfo.email));

  const generarIdUsuarioLocal = () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `user-${Date.now()}`;
  };

  const generarCodigoUsuarioLocal = () => {
    const nextIndex = usuarios.length + 1;
    return `USR-${String(nextIndex).padStart(3, '0')}`;
  };

  const reiniciarFormularioUsuario = () => {
    setUsuarioEnEdicion(null);
    setMostrarFormularioUsuario(false);
  };

  const manejarEnvioUsuario = async (data: DatosFormularioUsuario) => {
    const asignacionesFormulario = data.asignacionesPorEmpresa ?? [];
    if (asignacionesFormulario.length === 0) {
      return;
    }

    setCargando(true);

    try {
      const asignacionesNormalizadas = construirAsignacionesDesdeFormulario(
        asignacionesFormulario ?? [],
        empresas,
      );
      const idsEstablecimientos = obtenerEstablecimientosUnicos(asignacionesNormalizadas);
      const idsRoles = obtenerIdsRolesUnicos(asignacionesNormalizadas);
      const rolesSistema = construirRolesSistema(idsRoles, SYSTEM_ROLES);
      const estadoPorAsignaciones = obtenerEstadoUsuarioPorAsignaciones(
        asignacionesNormalizadas,
        usuarioEnEdicion?.status ?? 'ACTIVE',
      );
      const nombreCompleto = construirNombreCompleto(data.nombres, data.apellidos);
      const establecimientoPrincipal = idsEstablecimientos.length === 1 ? idsEstablecimientos[0] : undefined;

      if (usuarioEnEdicion) {
        const correoInmutable = usuarioEnEdicion.personalInfo.email;
        const usernameInmutable = usuarioEnEdicion.systemAccess.username;
        const usuarioActualizado: User = {
          ...usuarioEnEdicion,
          personalInfo: {
            ...usuarioEnEdicion.personalInfo,
            firstName: data.nombres,
            lastName: data.apellidos,
            fullName: nombreCompleto,
            email: correoInmutable,
            phone: data.telefono,
            documentType: data.tipoDocumento || undefined,
            documentNumber: data.numeroDocumento || undefined,
          },
          assignment: {
            ...usuarioEnEdicion.assignment,
            EstablecimientoId: establecimientoPrincipal,
            EstablecimientoIds: idsEstablecimientos,
          },
          systemAccess: {
            ...usuarioEnEdicion.systemAccess,
            username: usernameInmutable,
            email: correoInmutable,
            roleIds: idsRoles,
            roles: rolesSistema,
          },
          asignacionesPorEmpresa: asignacionesNormalizadas,
          status: estadoPorAsignaciones,
          updatedAt: new Date(),
        };

        dispatch({ type: 'UPDATE_USER', payload: usuarioActualizado });
      } else {
        const nuevoUsuario: User = {
          id: generarIdUsuarioLocal(),
          code: generarCodigoUsuarioLocal(),
          personalInfo: {
            firstName: data.nombres,
            lastName: data.apellidos,
            fullName: nombreCompleto,
            documentType: data.tipoDocumento || undefined,
            documentNumber: data.numeroDocumento || undefined,
            email: data.correo,
            phone: data.telefono,
          },
          assignment: {
            EstablecimientoId: establecimientoPrincipal,
            EstablecimientoIds: idsEstablecimientos,
          },
          systemAccess: {
            username: data.correo.split('@')[0],
            email: data.correo,
            roleIds: idsRoles,
            roles: rolesSistema,
            permissions: [],
            loginAttempts: 0,
            isLocked: false,
          },
          asignacionesPorEmpresa: asignacionesNormalizadas,
          status: estadoPorAsignaciones,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        dispatch({ type: 'ADD_USER', payload: nuevoUsuario });

        setModalCredenciales({
          show: true,
          user: nuevoUsuario,
          credentials: {
            fullName: nombreCompleto,
            email: data.correo,
            username: data.correo.split('@')[0],
            password: data.contrasena,
          }
        });
      }

      reiniciarFormularioUsuario();
    } catch {
      return;
    } finally {
      setCargando(false);
    }
  };

  const manejarEditarUsuario = (usuario: User) => {
    setUsuarioEnEdicion(usuario);
    setMostrarFormularioUsuario(true);
  };

  const manejarEliminarUsuario = async (usuario: User) => {
    setCargando(true);

    try {
      dispatch({ type: 'DELETE_USER', payload: usuario.id });
      setModalEliminar({ show: false });
    } catch {
      return;
    } finally {
      setCargando(false);
    }
  };

  const manejarCambioEstado = async (usuario: User, nuevoEstado: EstadoUsuario, motivo?: string) => {
    setCargando(true);

    try {
      const empresaId = contextoActual?.empresaId ?? empresaActual?.id;
      const nombreEmpresa = empresaActual?.razonSocial ?? empresaActual?.nombreComercial;
      const asignaciones = obtenerAsignacionesUsuario(usuario, empresaId, nombreEmpresa);

      if (!empresaId) {
        const usuarioActualizado: User = {
          ...usuario,
          status: nuevoEstado,
          notes: motivo || usuario.notes,
          updatedAt: new Date(),
        };
        dispatch({ type: 'UPDATE_USER', payload: usuarioActualizado });
        return;
      }

      const asignacionesActualizadas = obtenerAsignacionesActualizadas(asignaciones, empresaId, {
        estado: nuevoEstado === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
        empresaNombre: nombreEmpresa,
      });
      const idsEstablecimientos = obtenerEstablecimientosUnicos(asignacionesActualizadas);
      const idsRoles = obtenerIdsRolesUnicos(asignacionesActualizadas);
      const rolesSistema = construirRolesSistema(idsRoles, SYSTEM_ROLES);
      const estadoGlobal = obtenerEstadoUsuarioPorAsignaciones(asignacionesActualizadas, usuario.status);

      const usuarioActualizado: User = {
        ...usuario,
        assignment: {
          ...usuario.assignment,
          EstablecimientoId: idsEstablecimientos.length === 1 ? idsEstablecimientos[0] : usuario.assignment.EstablecimientoId,
          EstablecimientoIds: idsEstablecimientos,
        },
        systemAccess: {
          ...usuario.systemAccess,
          roleIds: idsRoles,
          roles: rolesSistema,
        },
        asignacionesPorEmpresa: asignacionesActualizadas,
        status: estadoGlobal,
        notes: motivo || usuario.notes,
        updatedAt: new Date(),
      };

      dispatch({ type: 'UPDATE_USER', payload: usuarioActualizado });
    } catch {
      return;
    } finally {
      setCargando(false);
    }
  };
  const manejarAsignarRol = (usuario: User) => {
    manejarEditarUsuario(usuario);
  };

  const manejarQuitarAcceso = (usuario: User, establecimientoId: string) => {
    const mapaEstablecimientos = obtenerMapaEstablecimientos(empresas);
    const empresaId = mapaEstablecimientos.get(establecimientoId)?.empresaId
      ?? contextoActual?.empresaId
      ?? empresaActual?.id;

    if (!empresaId) {
      return;
    }

    const nombreEmpresa = empresaActual?.razonSocial ?? empresaActual?.nombreComercial;
    const asignaciones = obtenerAsignacionesUsuario(usuario, empresaId, nombreEmpresa);
    const asignacionEmpresa = obtenerAsignacionEmpresa(asignaciones, empresaId);

    if (!asignacionEmpresa) {
      return;
    }

    const nuevosEstablecimientos = asignacionEmpresa.establecimientos.filter(
      (item) => item.establecimientoId !== establecimientoId,
    );
    const asignacionesActualizadas = obtenerAsignacionesActualizadas(asignaciones, empresaId, {
      empresaNombre: nombreEmpresa,
      establecimientos: nuevosEstablecimientos,
    });
    const idsEstablecimientos = obtenerEstablecimientosUnicos(asignacionesActualizadas);
    const idsRoles = obtenerIdsRolesUnicos(asignacionesActualizadas);
    const rolesSistema = construirRolesSistema(idsRoles, SYSTEM_ROLES);
    const estadoGlobal = obtenerEstadoUsuarioPorAsignaciones(asignacionesActualizadas, usuario.status);

    const usuarioActualizado: User = {
      ...usuario,
      assignment: {
        ...usuario.assignment,
        EstablecimientoId: idsEstablecimientos.length === 1 ? idsEstablecimientos[0] : usuario.assignment.EstablecimientoId,
        EstablecimientoIds: idsEstablecimientos,
      },
      systemAccess: {
        ...usuario.systemAccess,
        roleIds: idsRoles,
        roles: rolesSistema,
      },
      asignacionesPorEmpresa: asignacionesActualizadas,
      status: estadoGlobal,
      updatedAt: new Date(),
    };

    dispatch({ type: 'UPDATE_USER', payload: usuarioActualizado });
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Configuración de Usuarios"
        actions={
          <div className="flex items-center gap-2">
            {pestanaActiva === 'usuarios' && (
              <Button
                onClick={() => setMostrarFormularioUsuario(true)}
                variant="primary"
                size="sm"
                icon={<Plus className="w-5 h-5" />}
                iconPosition="left"
              >
                Nuevo Usuario
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              icon={<ArrowLeft />}
              onClick={() => navigate('/configuracion')}
            >
              Volver
            </Button>
          </div>
        }
      />
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-4 space-y-4">

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6">
          <button
            onClick={() => setPestanaActiva('usuarios')}
            className={`py-2.5 px-1 border-b-2 font-medium text-sm transition-colors ${pestanaActiva === 'usuarios'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Usuarios ({usuarios.length})</span>
            </div>
          </button>

          <button
            onClick={() => setPestanaActiva('roles')}
            className={`py-2.5 px-1 border-b-2 font-medium text-sm transition-colors ${pestanaActiva === 'roles'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4" />
              <span>Roles ({SYSTEM_ROLES.length})</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Users Tab */}
      {pestanaActiva === 'usuarios' && (
        <ListaUsuarios
          usuarios={usuarios}
          alEditar={manejarEditarUsuario}
          alEliminar={(usuario) => setModalEliminar({ show: true, user: usuario })}
          alCambiarEstado={manejarCambioEstado}
          alAsignarRol={manejarAsignarRol}
          alQuitarAcceso={manejarQuitarAcceso}
          alCrear={() => setMostrarFormularioUsuario(true)}
          cargando={cargando}
        />
      )}

      {/* Roles Tab */}
      {pestanaActiva === 'roles' && (
        <ListaRoles
          roles={SYSTEM_ROLES}
          users={usuarios}
          isLoading={cargando}
        />
      )}

      {/* User Form Modal */}
      {mostrarFormularioUsuario && (
        <FormularioUsuario
          usuario={usuarioEnEdicion || undefined}
          empresasDisponibles={empresas}
          correosExistentes={correosExistentes}
          alEnviar={manejarEnvioUsuario}
          alCancelar={reiniciarFormularioUsuario}
          cargando={cargando}
        />
      )}

      {/* Credentials Modal */}
      {modalCredenciales.show && modalCredenciales.credentials && modalCredenciales.user && (
        <ModalCredenciales
          isOpen={modalCredenciales.show}
          onClose={() => setModalCredenciales({ show: false })}
          credentials={modalCredenciales.credentials}
          user={modalCredenciales.user}
          Establecimientos={establecimientos}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ModalConfirmacion
        isOpen={modalEliminar.show}
        onClose={() => setModalEliminar({ show: false })}
        onConfirm={() => modalEliminar.user && manejarEliminarUsuario(modalEliminar.user)}
        title="Eliminar Usuario"
        message={
          modalEliminar.user?.hasTransactions
            ? `No puedes eliminar a "${modalEliminar.user?.personalInfo.fullName}" porque tiene transacciones registradas en el sistema. En su lugar, puedes inhabilitarlo para bloquear su acceso.`
            : `¿Estás seguro de que deseas eliminar permanentemente a "${modalEliminar.user?.personalInfo.fullName}"? Esta acción no se puede deshacer y eliminará todos sus datos del sistema.`
        }
        type="danger"
        confirmText={modalEliminar.user?.hasTransactions ? "Entendido" : "Eliminar"}
        cancelText="Cancelar"
        isLoading={cargando}
      />
        </div>
      </div>
    </div>
  );
}
