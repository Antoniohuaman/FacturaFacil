import type { AsignacionEmpresaUsuario, AsignacionEstablecimientoUsuario, User } from '../modelos/User';
import type {
  RolConfiguracion,
  RolDelSistema,
  RolPersonalizado,
  TipoRolConfiguracion,
} from '../roles/tiposRolesPermisos';
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

export const tienePermiso = ({
  usuario,
  permisoId,
  rolesDisponibles,
  establecimientoId,
}: ParametrosPermiso): boolean => {
  if (!usuario) return false;
  if (!permisoId) return false;

  const ids = new Set<string>(usuario.systemAccess.roleIds ?? []);
  obtenerRoleIdsPorEstablecimiento(usuario, establecimientoId).forEach((id) => ids.add(id));

  const rolesAsignados = obtenerRolesPorIds(Array.from(ids), rolesDisponibles);
  return rolesAsignados.some((rol) => rol.permisos.includes(permisoId));
};

export const tieneAlgunoDePermisos = (
  params: Omit<ParametrosPermiso, 'permisoId'> & { permisos: string[] },
): boolean => params.permisos.some((permisoId) => tienePermiso({ ...params, permisoId }));
