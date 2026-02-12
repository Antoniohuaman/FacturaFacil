import { useMemo, useState } from 'react';
import {
  Users,
  Search,
  UserCheck,
  X,
  AlertCircle,
  LayoutGrid,
  List
} from 'lucide-react';
import { Select, Input, Button } from '@/contasis';
import { useUserSession } from '@/contexts/UserSessionContext';
import { useEmpresasConfiguradas } from '../../contexto/ContextoConfiguracion';
import type { User } from '../../modelos/User';
import { SYSTEM_ROLES } from '../../modelos/Role';
import { TarjetaUsuario } from './TarjetaUsuario';
import { IndicadorEstado } from '../comunes/IndicadorEstado';
import {
  construirNombreCompleto,
  construirResumenEmpresas,
  construirResumenEstablecimientos,
  construirResumenRoles,
  obtenerAsignacionesUsuarioGlobal,
  obtenerEstadoUsuarioPorAsignaciones,
  obtenerIdsRolesUnicos,
  obtenerMapaEstablecimientos,
} from '../../utilidades/usuariosAsignaciones';

type EstadoUsuario = User['status'];

type FiltroEstado = EstadoUsuario | 'TODOS';
type FiltroEmpresa = string | 'TODAS';
type FiltroRol = string | 'TODOS';
type ModoVista = 'tarjetas' | 'tabla';
type CampoOrden = 'nombre' | 'correo' | 'estado' | 'empresas' | 'roles' | 'creado';
type Orden = 'asc' | 'desc';

interface PropsListaUsuarios {
  usuarios: User[];
  alEditar: (usuario: User) => void;
  alEliminar: (usuario: User) => void;
  alCambiarEstado: (usuario: User, estado: EstadoUsuario, motivo?: string) => void;
  alAsignarRol: (usuario: User) => void;
  alQuitarAcceso: (usuario: User, establecimientoId: string) => void;
  alCrear: () => void;
  cargando?: boolean;
}

export function ListaUsuarios({
  usuarios,
  alEditar,
  alEliminar,
  alCambiarEstado,
  alAsignarRol,
  alQuitarAcceso,
  alCrear,
  cargando = false,
}: PropsListaUsuarios) {
  const { session } = useUserSession();
  const empresas = useEmpresasConfiguradas();
  const usuarioActualId = session?.userId ?? '';

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('TODOS');
  const [filtroEmpresa, setFiltroEmpresa] = useState<FiltroEmpresa>('TODAS');
  const [filtroRol, setFiltroRol] = useState<FiltroRol>('TODOS');
  const [modoVista, setModoVista] = useState<ModoVista>('tarjetas');
  const [campoOrden, setCampoOrden] = useState<CampoOrden>('nombre');
  const [orden, setOrden] = useState<Orden>('asc');
  const [modalEstado, setModalEstado] = useState<{ abierto: boolean; usuario?: User }>({ abierto: false });
  const [motivoEstado, setMotivoEstado] = useState('');
  const [cambiandoEstado, setCambiandoEstado] = useState(false);

  const mapaEstablecimientos = useMemo(
    () => obtenerMapaEstablecimientos(empresas),
    [empresas],
  );

  const usuariosProcesados = useMemo(() => {
    return usuarios.map((usuario) => {
      const asignaciones = obtenerAsignacionesUsuarioGlobal(usuario, empresas);
      const estado = obtenerEstadoUsuarioPorAsignaciones(asignaciones, usuario.status);
      const resumenEmpresas = construirResumenEmpresas(asignaciones);
      const resumenRoles = construirResumenRoles(asignaciones, SYSTEM_ROLES);
      const resumenEstablecimientos = construirResumenEstablecimientos(asignaciones, mapaEstablecimientos);
      const nombre = usuario.personalInfo.fullName || construirNombreCompleto(
        usuario.personalInfo.firstName,
        usuario.personalInfo.lastName,
      );

      return {
        usuario,
        asignaciones,
        estado,
        resumenEmpresas,
        resumenRoles,
        resumenEstablecimientos,
        roleIds: obtenerIdsRolesUnicos(asignaciones),
        nombre,
      };
    });
  }, [empresas, mapaEstablecimientos, usuarios]);

  const usuariosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return usuariosProcesados
      .filter(({ usuario, asignaciones, estado, resumenRoles, resumenEmpresas, roleIds }) => {
        if (filtroEstado !== 'TODOS' && estado !== filtroEstado) {
          return false;
        }

        if (filtroEmpresa !== 'TODAS' && !asignaciones.some((item) => item.empresaId === filtroEmpresa)) {
          return false;
        }

        if (filtroRol !== 'TODOS' && !roleIds.includes(filtroRol)) {
          return false;
        }

        if (!texto) return true;

        const nombre = usuario.personalInfo.fullName.toLowerCase();
        const correo = usuario.personalInfo.email.toLowerCase();
        const documento = usuario.personalInfo.documentNumber?.toLowerCase() ?? '';
        const roles = resumenRoles.detalle.toLowerCase();
        const empresasTexto = resumenEmpresas.detalle.toLowerCase();

        return [nombre, correo, documento, roles, empresasTexto].some((valor) => valor.includes(texto));
      })
      .sort((a, b) => {
        let comparacion = 0;
        switch (campoOrden) {
          case 'nombre':
            comparacion = a.nombre.localeCompare(b.nombre);
            break;
          case 'correo':
            comparacion = a.usuario.personalInfo.email.localeCompare(b.usuario.personalInfo.email);
            break;
          case 'estado':
            comparacion = a.estado.localeCompare(b.estado);
            break;
          case 'empresas':
            comparacion = a.resumenEmpresas.resumen.localeCompare(b.resumenEmpresas.resumen);
            break;
          case 'roles':
            comparacion = a.resumenRoles.resumen.localeCompare(b.resumenRoles.resumen);
            break;
          case 'creado':
            comparacion = new Date(a.usuario.createdAt).getTime() - new Date(b.usuario.createdAt).getTime();
            break;
        }
        return orden === 'desc' ? -comparacion : comparacion;
      });
  }, [busqueda, campoOrden, filtroEmpresa, filtroEstado, filtroRol, orden, usuariosProcesados]);

  const estadisticas = useMemo(() => {
    const total = usuariosProcesados.length;
    const activos = usuariosProcesados.filter((item) => item.estado === 'ACTIVE').length;
    const inactivos = usuariosProcesados.filter((item) => item.estado === 'INACTIVE').length;
    return { total, activos, inactivos };
  }, [usuariosProcesados]);

  const obtenerConfigEstado = (estado: EstadoUsuario) => {
    switch (estado) {
      case 'ACTIVE':
        return { etiqueta: 'Activo', color: 'success' as const };
      case 'INACTIVE':
        return { etiqueta: 'Inactivo', color: 'warning' as const };
      default:
        return { etiqueta: 'Inactivo', color: 'warning' as const };
    }
  };

  const manejarOrden = (campo: CampoOrden) => {
    if (campoOrden === campo) {
      setOrden(orden === 'asc' ? 'desc' : 'asc');
      return;
    }
    setCampoOrden(campo);
    setOrden('asc');
  };

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroEstado('TODOS');
    setFiltroEmpresa('TODAS');
    setFiltroRol('TODOS');
  };

  const abrirModalEstado = (usuario: User) => {
    if (usuarioActualId && usuario.id === usuarioActualId) return;
    setModalEstado({ abierto: true, usuario });
    setMotivoEstado('');
  };

  const confirmarCambioEstado = async () => {
    if (!modalEstado.usuario) return;
    if (usuarioActualId && modalEstado.usuario.id === usuarioActualId) return;

    setCambiandoEstado(true);
    try {
      await alCambiarEstado(modalEstado.usuario, 'INACTIVE', motivoEstado.trim());
      setModalEstado({ abierto: false });
      setMotivoEstado('');
    } finally {
      setCambiandoEstado(false);
    }
  };

  if (cargando) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 h-12 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="w-48 h-12 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="w-48 h-12 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Usuarios</p>
              <p className="text-2xl font-bold text-blue-900">{estadisticas.total}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Activos</p>
              <p className="text-2xl font-bold text-green-900">{estadisticas.activos}</p>
            </div>
            <UserCheck className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Inactivos</p>
              <p className="text-2xl font-bold text-red-900">{estadisticas.inactivos}</p>
            </div>
            <X className="w-8 h-8 text-red-600" />
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between">
        <div className="flex flex-col lg:flex-row gap-4 flex-1">
          <div className="flex-1 max-w-md relative">
            <Input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, correo, rol o empresa..."
              leftIcon={<Search />}
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="w-full sm:w-48">
            <Select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as FiltroEstado)}
              options={[
                { value: 'TODOS', label: 'Todos los estados' },
                { value: 'ACTIVE', label: 'Activos' },
                { value: 'INACTIVE', label: 'Inactivos' },
              ]}
            />
          </div>

          <div className="w-full sm:w-56">
            <Select
              value={filtroEmpresa}
              onChange={(e) => setFiltroEmpresa(e.target.value as FiltroEmpresa)}
              options={[
                { value: 'TODAS', label: 'Todas las empresas' },
                ...empresas.map((empresa) => ({
                  value: empresa.id,
                  label: empresa.razonSocial ?? empresa.nombreComercial,
                })),
              ]}
            />
          </div>

          <div className="w-full sm:w-56">
            <Select
              value={filtroRol}
              onChange={(e) => setFiltroRol(e.target.value as FiltroRol)}
              options={[
                { value: 'TODOS', label: 'Todos los roles' },
                ...SYSTEM_ROLES.map((rol) => ({
                  value: rol.id ?? '',
                  label: rol.name ?? 'Rol sin nombre',
                })),
              ]}
            />
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {(busqueda || filtroEstado !== 'TODOS' || filtroEmpresa !== 'TODAS' || filtroRol !== 'TODOS') && (
            <Button
              variant="secondary"
              size="sm"
              onClick={limpiarFiltros}
            >
              Limpiar filtros
            </Button>
          )}

          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setModoVista('tarjetas')}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                modoVista === 'tarjetas'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setModoVista('tabla')}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                modoVista === 'tabla'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {usuariosFiltrados.length === 0 ? (
        <div className="text-center py-12">
          <AlertCircle className="mx-auto w-12 h-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No se encontraron usuarios
          </h3>
          <p className="text-gray-500 mb-4">
            {busqueda || filtroEstado !== 'TODOS' || filtroEmpresa !== 'TODAS' || filtroRol !== 'TODOS'
              ? 'Intenta ajustar los filtros de busqueda'
              : 'Aun no hay usuarios registrados en el sistema'
            }
          </p>
          <Button onClick={alCrear} variant="primary">
            Crear primer usuario
          </Button>
        </div>
      ) : modoVista === 'tarjetas' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {usuariosFiltrados.map(({ usuario }) => (
            <TarjetaUsuario
              key={usuario.id}
              usuario={usuario}
              alEditar={() => alEditar(usuario)}
              alEliminar={() => alEliminar(usuario)}
              alCambiarEstado={(estado, motivo) => alCambiarEstado(usuario, estado, motivo)}
              alAsignarRol={() => alAsignarRol(usuario)}
              alQuitarAcceso={(establecimientoId) => alQuitarAcceso(usuario, establecimientoId)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">
                Lista de usuarios ({usuariosFiltrados.length})
              </h3>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => manejarOrden('nombre')}
                      className="flex items-center space-x-1 hover:text-gray-700"
                    >
                      <span>Usuario</span>
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => manejarOrden('correo')}
                      className="flex items-center space-x-1 hover:text-gray-700"
                    >
                      <span>Correo</span>
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => manejarOrden('empresas')}
                      className="flex items-center space-x-1 hover:text-gray-700"
                    >
                      <span>Empresas</span>
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <span>Establecimientos</span>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => manejarOrden('roles')}
                      className="flex items-center space-x-1 hover:text-gray-700"
                    >
                      <span>Roles</span>
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => manejarOrden('estado')}
                      className="flex items-center space-x-1 hover:text-gray-700"
                    >
                      <span>Estado</span>
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {usuariosFiltrados.map(({ usuario, estado, resumenEmpresas, resumenRoles, resumenEstablecimientos }) => {
                  const configEstado = obtenerConfigEstado(estado);
                  const esUsuarioActual = usuarioActualId && usuario.id === usuarioActualId;
                  return (
                    <tr key={usuario.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {usuario.personalInfo.fullName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {usuario.personalInfo.documentType ? `${usuario.personalInfo.documentType} ` : ''}
                            {usuario.personalInfo.documentNumber ?? ''}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{usuario.personalInfo.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700" title={resumenEmpresas.detalle}>
                          {resumenEmpresas.resumen}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700" title={resumenEstablecimientos.detalle}>
                          {resumenEstablecimientos.resumen}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700" title={resumenRoles.detalle}>
                          {resumenRoles.resumen}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <IndicadorEstado
                          status={configEstado.color}
                          label={configEstado.etiqueta}
                          size="sm"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => alEditar(usuario)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Editar
                          </button>
                          {estado === 'ACTIVE' && !esUsuarioActual && (
                            <button
                              onClick={() => abrirModalEstado(usuario)}
                              className="text-yellow-600 hover:text-yellow-900"
                            >
                              Desactivar
                            </button>
                          )}
                          {estado === 'INACTIVE' && (
                            <button
                              onClick={() => alCambiarEstado(usuario, 'ACTIVE')}
                              className="text-green-600 hover:text-green-900"
                            >
                              Activar
                            </button>
                          )}
                          {!esUsuarioActual && !usuario.hasTransactions && (
                            <button
                              onClick={() => alEliminar(usuario)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalEstado.abierto && modalEstado.usuario && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Desactivar usuario
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {modalEstado.usuario.personalInfo.fullName}
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo de desactivacion *
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
                    <h4 className="font-medium text-red-900">Atencion</h4>
                    <p className="text-sm text-red-800 mt-1">
                      El usuario perdera inmediatamente el acceso al sistema y no podra realizar operaciones.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3">
                <Button
                  variant="secondary"
                  onClick={() => setModalEstado({ abierto: false })}
                  disabled={cambiandoEstado}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  onClick={confirmarCambioEstado}
                  disabled={!motivoEstado.trim() || cambiandoEstado}
                  className="bg-red-600 hover:bg-red-700 focus-visible:ring-red-500"
                  icon={cambiandoEstado ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : undefined}
                >
                  Desactivar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
