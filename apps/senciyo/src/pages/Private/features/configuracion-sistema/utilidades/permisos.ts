import type { AsignacionEmpresaUsuario, AsignacionEstablecimientoUsuario, User } from '../modelos/User';
import type {
  RolConfiguracion,
  RolDelSistema,
  RolPersonalizado,
  TipoRolConfiguracion,
} from '../roles/tiposRolesPermisos';
import { CATALOGO_PERMISOS } from '../roles/catalogoPermisos';
import { normalizarCorreo } from './usuariosAsignaciones';

type SesionPermisosBasica = {
  userId?: string;
  userEmail?: string;
  currentEstablecimientoId?: string;
  permissions?: string[];
};

type ParametrosPermiso = {
  usuario: User | null | undefined;
  permisoId: string;
  rolesDisponibles: RolConfiguracion[];
  establecimientoId?: string;
};

const normalizarTipoRol = (tipo?: TipoRolConfiguracion): TipoRolConfiguracion =>
  tipo === 'SISTEMA' || tipo === 'PERSONALIZADO' ? tipo : 'PERSONALIZADO';

export const listarRolesConfigurados = (
  rolesSistema: RolDelSistema[],
  rolesPersonalizados: RolPersonalizado[] = [],
): RolConfiguracion[] => {
  const rolesSistemaConTipo: RolConfiguracion[] = rolesSistema.map((rol) => ({
    ...rol,
    tipo: 'SISTEMA',
  }));

  const personalizadosNormalizados: RolConfiguracion[] = rolesPersonalizados.map((rol) => ({
    ...rol,
    tipo: normalizarTipoRol(rol.tipo),
  }));

  const vistos = new Set<string>();
  return [...rolesSistemaConTipo, ...personalizadosNormalizados].filter((rol) => {
    if (vistos.has(rol.id)) {
      return false;
    }
    vistos.add(rol.id);
    return true;
  });
};

export const obtenerUsuarioDesdeSesion = (
  usuarios: User[],
  sesion?: SesionPermisosBasica | null,
): User | null => {
  if (!sesion) return null;
  const porId = usuarios.find((usuario) => usuario.id === sesion.userId);
  if (porId) return porId;
  if (!sesion.userEmail) return null;
  const correo = normalizarCorreo(sesion.userEmail);
  return usuarios.find((usuario) => normalizarCorreo(usuario.personalInfo.email) === correo) ?? null;
};

const normalizarEstablecimientosAsignacion = (
  asignacion: AsignacionEmpresaUsuario,
): AsignacionEstablecimientoUsuario[] => {
  if (asignacion.establecimientos?.length) {
    return asignacion.establecimientos;
  }

  const establecimientoIds = asignacion.establecimientoIds ?? [];
  const rolesPorEstablecimiento = asignacion.rolesPorEstablecimiento ?? {};
  const roleIds = asignacion.roleIds ?? [];

  if (Object.keys(rolesPorEstablecimiento).length > 0) {
    return establecimientoIds.map((establecimientoId) => ({
      establecimientoId,
      roleId: rolesPorEstablecimiento[establecimientoId] ?? '',
    }));
  }

  if (roleIds.length === 1) {
    return establecimientoIds.map((establecimientoId) => ({
      establecimientoId,
      roleId: roleIds[0],
    }));
  }

  if (roleIds.length > 1 && establecimientoIds.length === 1) {
    return [{ establecimientoId: establecimientoIds[0], roleId: roleIds[0] }];
  }

  return establecimientoIds.map((establecimientoId) => ({
    establecimientoId,
    roleId: '',
  }));
};

const obtenerRoleIdsPorEstablecimiento = (
  usuario: User,
  establecimientoId?: string,
): string[] => {
  if (!establecimientoId) return [];
  const asignaciones = usuario.asignacionesPorEmpresa ?? [];
  const ids = new Set<string>();

  asignaciones.forEach((asignacion) => {
    const establecimientos = normalizarEstablecimientosAsignacion(asignacion);
    establecimientos
      .filter((item) => item.establecimientoId === establecimientoId)
      .forEach((item) => {
        if (item.roleId) {
          ids.add(item.roleId);
        }
      });
  });

  return Array.from(ids);
};

export const obtenerRolesPorIds = (
  ids: string[],
  rolesDisponibles: RolConfiguracion[],
): RolConfiguracion[] => {
  const mapaRoles = new Map(rolesDisponibles.map((rol) => [rol.id, rol]));
  const vistos = new Set<string>();

  return ids
    .map((id) => mapaRoles.get(id))
    .filter((rol): rol is RolConfiguracion => Boolean(rol))
    .filter((rol) => {
      if (vistos.has(rol.id)) {
        return false;
      }
      vistos.add(rol.id);
      return true;
    });
};

type ParametrosResolucionPermisos = Omit<ParametrosPermiso, 'permisoId'>;

/**
 * Une los permisos de todos los roles asignados al usuario (globales + los
 * asignados específicamente para el establecimiento activo). Es la única
 * fuente de verdad para resolver "qué puede hacer realmente este usuario" —
 * tanto `tienePermiso` como el cálculo de acceso total se derivan de aquí.
 */
export const obtenerPermisosDeUsuario = ({
  usuario,
  rolesDisponibles,
  establecimientoId,
}: ParametrosResolucionPermisos): Set<string> => {
  if (!usuario) return new Set();

  const ids = new Set<string>(usuario.systemAccess.roleIds ?? []);
  obtenerRoleIdsPorEstablecimiento(usuario, establecimientoId).forEach((id) => ids.add(id));

  const rolesAsignados = obtenerRolesPorIds(Array.from(ids), rolesDisponibles);
  const permisos = new Set<string>();
  rolesAsignados.forEach((rol) => rol.permisos.forEach((permisoId) => permisos.add(permisoId)));
  return permisos;
};

export const tienePermiso = ({
  usuario,
  permisoId,
  rolesDisponibles,
  establecimientoId,
}: ParametrosPermiso): boolean => {
  if (!usuario) return false;
  if (!permisoId) return false;

  return obtenerPermisosDeUsuario({ usuario, rolesDisponibles, establecimientoId }).has(permisoId);
};

export const tieneAlgunoDePermisos = (
  params: Omit<ParametrosPermiso, 'permisoId'> & { permisos: string[] },
): boolean => params.permisos.some((permisoId) => tienePermiso({ ...params, permisoId }));

/**
 * Acceso total = el usuario tiene, a través de sus roles asignados, TODOS
 * los permisos definidos hoy en el catálogo (`CATALOGO_PERMISOS`). No depende
 * de ningún id de rol, correo o nombre de usuario específico: cualquier rol
 * (del sistema o personalizado) que cubra el 100% del catálogo otorga acceso
 * total, exactamente igual que hoy lo hace el rol "Administrador".
 */
export const tieneAccesoTotalCatalogo = (params: ParametrosResolucionPermisos): boolean => {
  if (!params.usuario) return false;
  const permisos = obtenerPermisosDeUsuario(params);
  if (permisos.size === 0) return false;
  return CATALOGO_PERMISOS.every((permiso) => permisos.has(permiso.id));
};

/**
 * Resuelve los permisos reales que debe llevar `UserSession.permissions`.
 * Devuelve la lista granular del usuario y, únicamente cuando esos permisos
 * cubren el catálogo completo, agrega también `'*'` (por compatibilidad con
 * las pantallas que hoy usan ese wildcard para identificar una sesión con
 * acceso total, p. ej. gestión de usuarios).
 */
export const resolverPermisosSesion = (params: ParametrosResolucionPermisos): string[] => {
  const permisos = obtenerPermisosDeUsuario(params);
  const listado = Array.from(permisos);
  return tieneAccesoTotalCatalogo(params) ? ['*', ...listado] : listado;
};
