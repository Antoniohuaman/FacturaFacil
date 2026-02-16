import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Users,
  Search,
  UserCheck,
  X,
  AlertCircle,
  LayoutGrid,
  List,
  MoreVertical
} from 'lucide-react';
import { Select, Input, Button } from '@/contasis';
import { Tooltip } from '@/shared/ui';
import { useUserSession } from '@/contexts/UserSessionContext';
import { useConfigurationContext, useEmpresasConfiguradas } from '../../contexto/ContextoConfiguracion';
import type { User } from '../../modelos/User';
import { TarjetaUsuario } from './TarjetaUsuario';
import { IndicadorEstado } from '../comunes/IndicadorEstado';
import {
  construirNombreCompletoSeguro,
  construirResumenEmpresas,
  construirResumenEstablecimientos,
  construirResumenRoles,
  construirResumenRolesSinEmpresa,
  obtenerAsignacionesUsuarioGlobal,
  obtenerEstadoUsuarioPorAsignaciones,
  obtenerIdsRolesUnicos,
  obtenerMapaEstablecimientos,
  normalizarCorreo,
} from '../../utilidades/usuariosAsignaciones';

type EstadoUsuario = User['status'];

type FiltroEstado = EstadoUsuario | 'TODOS';
type FiltroEmpresa = string | 'TODAS';
type FiltroRol = string | 'TODOS';
type ModoVista = 'tarjetas' | 'tabla';
type CampoOrden = 'nombre' | 'correo' | 'estado' | 'empresas' | 'roles' | 'creado';
type Orden = 'asc' | 'desc';

const construirStorageVistaKey = (userId?: string, companyId?: string) =>
  `configuracionUsuarios:viewMode:${userId ?? 'anon'}:${companyId ?? 'global'}`;

const leerModoVista = (storageKey: string): ModoVista => {
  if (typeof window === 'undefined') return 'tabla';
  try {
    const guardado = window.localStorage.getItem(storageKey);
    return guardado === 'tarjetas' || guardado === 'tabla' ? guardado : 'tabla';
  } catch {
    return 'tabla';
  }
};

interface PropsListaUsuarios {
  usuarios: User[];
  alEditar: (usuario: User) => void;
  alReenviar: (usuario: User) => void;
  alEliminar: (usuario: User) => void;
  alCambiarEstado: (usuario: User, estado: EstadoUsuario, motivo?: string) => void;
  alQuitarAcceso: (usuario: User, establecimientoId: string) => void;
  alCrear: () => void;
  cargando?: boolean;
}

export function ListaUsuarios({
  usuarios,
  alEditar,
  alReenviar,
  alEliminar,
  alCambiarEstado,
  alQuitarAcceso,
  alCrear,
  cargando = false,
}: PropsListaUsuarios) {
  const { session } = useUserSession();
  const { rolesConfigurados } = useConfigurationContext();
  const empresas = useEmpresasConfiguradas();
  const usuarioActualId = session?.userId ?? '';
  const correoSesion = normalizarCorreo(session?.userEmail);
  const esSuperadminSesion = Boolean(session?.permissions?.includes('*'));

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('TODOS');
  const [filtroEmpresa, setFiltroEmpresa] = useState<FiltroEmpresa>('TODAS');
  const [filtroRol, setFiltroRol] = useState<FiltroRol>('TODOS');
  const storageVistaKey = useMemo(
    () => construirStorageVistaKey(session?.userId, session?.currentCompanyId),
    [session?.currentCompanyId, session?.userId],
  );
  const [modoVista, setModoVista] = useState<ModoVista>(() => leerModoVista(storageVistaKey));
  const [campoOrden, setCampoOrden] = useState<CampoOrden>('nombre');
  const [orden, setOrden] = useState<Orden>('asc');
  const [modalEstado, setModalEstado] = useState<{ abierto: boolean; usuario?: User }>({ abierto: false });
  const [motivoEstado, setMotivoEstado] = useState('');
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [menuAbiertoId, setMenuAbiertoId] = useState<string | null>(null);
  const [menuCoords, setMenuCoords] = useState<{
    top: number;
    left: number;
    anchorRect: { top: number; bottom: number; left: number; right: number };
  } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const MENU_WIDTH = 160;

  useEffect(() => {
    setModoVista(leerModoVista(storageVistaKey));
  }, [storageVistaKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(storageVistaKey, modoVista);
    } catch {
      return;
    }
  }, [modoVista, storageVistaKey]);

  const mapaEstablecimientos = useMemo(
    () => obtenerMapaEstablecimientos(empresas),
    [empresas],
  );

  const usuariosProcesados = useMemo(() => {
    return usuarios.map((usuario) => {
      const asignaciones = obtenerAsignacionesUsuarioGlobal(usuario, empresas);
      const estado = obtenerEstadoUsuarioPorAsignaciones(asignaciones, usuario.status);
      const resumenEmpresas = construirResumenEmpresas(asignaciones);
      const resumenRoles = construirResumenRoles(asignaciones, rolesConfigurados);
      const resumenEstablecimientos = construirResumenEstablecimientos(asignaciones, mapaEstablecimientos);
      const nombre = construirNombreCompletoSeguro(
        usuario.personalInfo.firstName,
        usuario.personalInfo.lastName,
        usuario.personalInfo.fullName,
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
  }, [empresas, mapaEstablecimientos, rolesConfigurados, usuarios]);

  const usuariosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return usuariosProcesados
      .filter(({ usuario, asignaciones, estado, resumenRoles, resumenEmpresas, roleIds, nombre }) => {
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

        const nombreBase = (nombre || '').toLowerCase();
        const correo = usuario.personalInfo.email.toLowerCase();
        const documento = usuario.personalInfo.documentNumber?.toLowerCase() ?? '';
        const roles = resumenRoles.detalle.toLowerCase();
        const empresasTexto = resumenEmpresas.detalle.toLowerCase();

        return [nombreBase, correo, documento, roles, empresasTexto].some((valor) => valor.includes(texto));
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

  const obtenerIniciales = (nombre: string) => {
    return nombre
      .split(' ')
      .map((name) => name[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

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

  const cerrarMenu = useCallback(() => {
    setMenuAbiertoId(null);
    setMenuCoords(null);
  }, []);

  useEffect(() => {
    if (!menuAbiertoId) return;
    const manejarEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        cerrarMenu();
      }
    };
    document.addEventListener('keydown', manejarEscape);
    return () => {
      document.removeEventListener('keydown', manejarEscape);
    };
  }, [menuAbiertoId, cerrarMenu]);

  useEffect(() => {
    if (!menuAbiertoId) return;
    const manejarScrollResize = () => cerrarMenu();
    window.addEventListener('scroll', manejarScrollResize, true);
    window.addEventListener('resize', manejarScrollResize);
    return () => {
      window.removeEventListener('scroll', manejarScrollResize, true);
      window.removeEventListener('resize', manejarScrollResize);
    };
  }, [menuAbiertoId, cerrarMenu]);

  const abrirMenu = useCallback(
    (usuarioId: string, event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      if (menuAbiertoId === usuarioId) {
        cerrarMenu();
        return;
      }

      if (typeof window === 'undefined') {
        setMenuAbiertoId(usuarioId);
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const gap = 8;
      const scrollX = window.scrollX ?? window.pageXOffset;
      const scrollY = window.scrollY ?? window.pageYOffset;
      const minLeft = scrollX + gap;
      const maxLeft = Math.max(minLeft, scrollX + window.innerWidth - MENU_WIDTH - gap);
      const desiredLeft = scrollX + rect.right - MENU_WIDTH;
      const left = Math.min(Math.max(desiredLeft, minLeft), maxLeft);
      const top = scrollY + rect.bottom + gap;

      setMenuCoords({
        top,
        left,
        anchorRect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right },
      });
      setMenuAbiertoId(usuarioId);
    },
    [cerrarMenu, menuAbiertoId],
  );

  useLayoutEffect(() => {
    if (!menuCoords || !menuRef.current || typeof window === 'undefined') return;
    const menuRect = menuRef.current.getBoundingClientRect();
    const gap = 8;
    const scrollX = window.scrollX ?? window.pageXOffset;
    const scrollY = window.scrollY ?? window.pageYOffset;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const { top: anchorTop, bottom: anchorBottom, right: anchorRight } = menuCoords.anchorRect;

    const spaceBelow = viewportHeight - anchorBottom;
    const spaceAbove = anchorTop;
    let top = scrollY + anchorBottom + gap;

    if (spaceBelow < menuRect.height + gap && spaceAbove >= menuRect.height + gap) {
      top = scrollY + anchorTop - menuRect.height - gap;
    } else {
      const maxTop = scrollY + viewportHeight - menuRect.height - gap;
      top = Math.min(top, maxTop);
      top = Math.max(top, scrollY + gap);
    }

    const minLeft = scrollX + gap;
    const maxLeft = Math.max(minLeft, scrollX + viewportWidth - menuRect.width - gap);
    const desiredLeft = scrollX + anchorRight - menuRect.width;
    const left = Math.min(Math.max(desiredLeft, minLeft), maxLeft);

    if (top !== menuCoords.top || left !== menuCoords.left) {
      setMenuCoords((prev) => (prev ? { ...prev, top, left } : prev));
    }
  }, [menuCoords]);

  const menuContext = useMemo(() => {
    if (!menuAbiertoId) return null;
    const match = usuariosFiltrados.find((item) => item.usuario.id === menuAbiertoId);
    if (!match) return null;
    const esUsuarioActual = Boolean(usuarioActualId && match.usuario.id === usuarioActualId);
    return {
      usuario: match.usuario,
      estado: match.estado,
      esUsuarioActual,
    };
  }, [menuAbiertoId, usuarioActualId, usuariosFiltrados]);

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
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-600">Total Usuarios</p>
              <p className="text-xl font-bold text-blue-900">{estadisticas.total}</p>
            </div>
            <Users className="w-6 h-6 text-blue-600" />
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-green-600">Activos</p>
              <p className="text-xl font-bold text-green-900">{estadisticas.activos}</p>
            </div>
            <UserCheck className="w-6 h-6 text-green-600" />
          </div>
        </div>

        <div className="bg-red-50 rounded-lg p-3 border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-red-600">Inactivos</p>
              <p className="text-xl font-bold text-red-900">{estadisticas.inactivos}</p>
            </div>
            <X className="w-6 h-6 text-red-600" />
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-3 items-start xl:items-center justify-between">
        <div className="flex flex-col lg:flex-row gap-3 flex-1">
          <div className="flex-1 max-w-md relative">
            <Input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, correo, rol o empresa..."
              leftIcon={<Search />}
              size="small"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="w-full sm:w-44">
            <Select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as FiltroEstado)}
              size="small"
              options={[
                { value: 'TODOS', label: 'Todos los estados' },
                { value: 'ACTIVE', label: 'Activos' },
                { value: 'INACTIVE', label: 'Inactivos' },
              ]}
            />
          </div>

          <div className="w-full sm:w-52">
            <Select
              value={filtroEmpresa}
              onChange={(e) => setFiltroEmpresa(e.target.value as FiltroEmpresa)}
              size="small"
              options={[
                { value: 'TODAS', label: 'Todas las empresas' },
                ...empresas.map((empresa) => ({
                  value: empresa.id,
                  label: empresa.razonSocial ?? empresa.nombreComercial,
                })),
              ]}
            />
          </div>

          <div className="w-full sm:w-52">
            <Select
              value={filtroRol}
              onChange={(e) => setFiltroRol(e.target.value as FiltroRol)}
              size="small"
              options={[
                { value: 'TODOS', label: 'Todos los roles' },
                ...rolesConfigurados.map((rol) => ({
                  value: rol.id,
                  label: rol.nombre,
                })),
              ]}
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
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
              alReenviar={() => alReenviar(usuario)}
              alEliminar={() => alEliminar(usuario)}
              alCambiarEstado={(estado, motivo) => alCambiarEstado(usuario, estado, motivo)}
              alQuitarAcceso={(establecimientoId) => alQuitarAcceso(usuario, establecimientoId)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-visible">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">
                Lista de usuarios ({usuariosFiltrados.length})
              </h3>
            </div>
          </div>

          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Avatar
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => manejarOrden('nombre')}
                      className="flex items-center space-x-1 hover:text-gray-700"
                    >
                      <span>Nombre</span>
                    </button>
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => manejarOrden('correo')}
                      className="flex items-center space-x-1 hover:text-gray-700"
                    >
                      <span>Usuario</span>
                    </button>
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => manejarOrden('empresas')}
                      className="flex items-center space-x-1 hover:text-gray-700"
                    >
                      <span>Empresas</span>
                    </button>
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    <span>Establecimientos</span>
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => manejarOrden('roles')}
                      className="flex items-center space-x-1 hover:text-gray-700"
                    >
                      <span>Roles</span>
                    </button>
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => manejarOrden('estado')}
                      className="flex items-center space-x-1 hover:text-gray-700"
                    >
                      <span>Estado</span>
                    </button>
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {usuariosFiltrados.map(({ usuario, estado, resumenEmpresas, resumenEstablecimientos, asignaciones, nombre }) => {
                  const configEstado = obtenerConfigEstado(estado);
                  const correoUsuario = normalizarCorreo(usuario.personalInfo.email);
                  const esUsuarioSesion = Boolean(
                    (usuarioActualId && usuario.id === usuarioActualId) ||
                    (correoSesion && correoUsuario && correoSesion === correoUsuario),
                  );
                  const resumenRolesEstablecimiento = esSuperadminSesion && esUsuarioSesion
                    ? { resumen: 'Superadmin', detalle: 'Superadmin', roles: ['Superadmin'] }
                    : construirResumenRolesSinEmpresa(asignaciones, rolesConfigurados);
                  const resumenEmpresasTexto = esSuperadminSesion && esUsuarioSesion
                    ? { resumen: 'Todas las empresas', detalle: 'Todas las empresas' }
                    : resumenEmpresas;
                  const resumenEstablecimientosTexto = esSuperadminSesion && esUsuarioSesion
                    ? { resumen: 'Todos los establecimientos', detalle: 'Todos los establecimientos' }
                    : resumenEstablecimientos;
                  return (
                    <tr key={usuario.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-semibold flex items-center justify-center">
                          {obtenerIniciales(nombre)}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 truncate max-w-[180px]">
                          {nombre}
                        </div>
                        <div className="text-[11px] text-gray-500 truncate max-w-[180px]">
                          {usuario.personalInfo.documentType ? `${usuario.personalInfo.documentType} ` : ''}
                          {usuario.personalInfo.documentNumber ?? ''}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <Tooltip contenido={usuario.personalInfo.email} ubicacion="arriba">
                          <span className="text-sm text-gray-900 truncate max-w-[200px] inline-block">
                            {usuario.personalInfo.email}
                          </span>
                        </Tooltip>
                      </td>
                      <td className="px-4 py-2.5">
                        <Tooltip contenido={resumenEmpresasTexto.detalle} ubicacion="arriba" multilinea>
                          <span className="text-sm text-gray-700 truncate max-w-[200px] inline-block">
                            {resumenEmpresasTexto.resumen}
                          </span>
                        </Tooltip>
                      </td>
                      <td className="px-4 py-2.5">
                        <Tooltip contenido={resumenEstablecimientosTexto.detalle} ubicacion="arriba" multilinea>
                          <span className="text-sm text-gray-700 truncate max-w-[200px] inline-block">
                            {resumenEstablecimientosTexto.resumen}
                          </span>
                        </Tooltip>
                      </td>
                      <td className="px-4 py-2.5">
                        <Tooltip contenido={resumenRolesEstablecimiento.detalle} ubicacion="arriba" multilinea>
                          <span className="text-sm text-gray-700 truncate max-w-[180px] inline-block">
                            {resumenRolesEstablecimiento.resumen}
                          </span>
                        </Tooltip>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <IndicadorEstado
                          status={configEstado.color}
                          label={configEstado.etiqueta}
                          size="sm"
                        />
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-xs font-medium">
                        <div className="relative">
                          <button
                            type="button"
                            aria-label="Acciones"
                            aria-haspopup="menu"
                            aria-expanded={menuAbiertoId === usuario.id}
                            onClick={(event) => abrirMenu(usuario.id, event)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
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

      {(() => {
        const portalTarget = typeof window === 'undefined' ? null : document.body;
        if (!portalTarget || !menuContext || !menuCoords) return null;
        return createPortal(
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={cerrarMenu}
              aria-hidden="true"
            />
            <div
              ref={menuRef}
              className="absolute min-w-[160px] bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1.5 flex flex-col whitespace-normal"
              role="menu"
              style={{ top: menuCoords.top, left: menuCoords.left, width: MENU_WIDTH }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  alEditar(menuContext.usuario);
                  cerrarMenu();
                }}
                className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
              >
                Editar
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  alReenviar(menuContext.usuario);
                  cerrarMenu();
                }}
                className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
              >
                Reenviar credenciales
              </button>
              {menuContext.estado === 'ACTIVE' && !menuContext.esUsuarioActual && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    abrirModalEstado(menuContext.usuario);
                    cerrarMenu();
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-yellow-700 hover:bg-yellow-50 focus:outline-none focus:bg-yellow-50"
                >
                  Inactivar
                </button>
              )}
              {menuContext.estado === 'INACTIVE' && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    alCambiarEstado(menuContext.usuario, 'ACTIVE');
                    cerrarMenu();
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-green-700 hover:bg-green-50 focus:outline-none focus:bg-green-50"
                >
                  Activar
                </button>
              )}
              {!menuContext.esUsuarioActual && !menuContext.usuario.hasTransactions && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    alEliminar(menuContext.usuario);
                    cerrarMenu();
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-red-700 hover:bg-red-50 focus:outline-none focus:bg-red-50"
                >
                  Eliminar
                </button>
              )}
            </div>
          </>,
          portalTarget,
        );
      })()}

      {modalEstado.abierto && modalEstado.usuario && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Desactivar usuario
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {construirNombreCompletoSeguro(
                  modalEstado.usuario.personalInfo.firstName,
                  modalEstado.usuario.personalInfo.lastName,
                  modalEstado.usuario.personalInfo.fullName,
                )}
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
