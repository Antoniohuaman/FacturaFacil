import type { Empresa } from '../../autenticacion/types/auth.types';
import type { Role, SystemRoleDefinition } from '../modelos/Role';
import type {
  User,
  AsignacionEmpresaUsuario,
  AsignacionEstablecimientoUsuario,
  EstadoAsignacionUsuario,
} from '../modelos/User';

type SesionUsuario = {
  userId: string;
  userName?: string;
  userEmail?: string;
  currentCompanyId?: string;
  currentEstablecimientoId?: string;
  currentEstablecimiento?: { id: string } | null;
};

type DatosContextoEmpresa = {
  empresaId?: string;
  empresaNombre?: string;
  establecimientoId?: string;
};

export const normalizarCorreo = (correo?: string) => (correo ?? '').trim().toLowerCase();

export const separarNombreCompleto = (nombreCompleto: string) => {
  const nombreLimpio = nombreCompleto.trim();
  const partes = nombreLimpio.split(/\s+/).filter(Boolean);
  const nombres = partes[0] || nombreLimpio;
  const apellidos = partes.slice(1).join(' ') || partes[0] || nombreLimpio;

  return {
    nombres: nombres || '',
    apellidos: apellidos || '',
    nombreCompleto: nombreLimpio || nombres || apellidos || '',
  };
};

export const construirNombreCompleto = (nombres: string, apellidos: string) =>
  `${nombres} ${apellidos}`.trim();

export const construirCodigoUsuarioDeterministico = (idUsuario: string) => {
  const normalizado = idUsuario.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
  const base = normalizado || idUsuario.slice(0, 8);
  return `USR-${base.toUpperCase()}`;
};

const normalizarEstablecimientos = (establecimientos: AsignacionEstablecimientoUsuario[]) => {
  const mapa = new Map<string, AsignacionEstablecimientoUsuario>();
  establecimientos.forEach((item) => {
    if (!item.establecimientoId) return;
    mapa.set(item.establecimientoId, { ...item });
  });
  return Array.from(mapa.values());
};

const construirEstablecimientosDesdeLegacy = (
  establecimientoIds: string[],
  rolesPorEstablecimiento?: Record<string, string>,
  roleIds?: string[],
): AsignacionEstablecimientoUsuario[] => {
  const ids = establecimientoIds ?? [];
  if (rolesPorEstablecimiento && Object.keys(rolesPorEstablecimiento).length > 0) {
    return ids.map((establecimientoId) => ({
      establecimientoId,
      roleId: rolesPorEstablecimiento[establecimientoId] ?? '',
    }));
  }

  const idsRoles = roleIds ?? [];
  if (idsRoles.length === 1 && ids.length > 0) {
    return ids.map((establecimientoId) => ({ establecimientoId, roleId: idsRoles[0] }));
  }

  if (idsRoles.length > 1 && ids.length === 1) {
    return [{ establecimientoId: ids[0], roleId: idsRoles[0] }];
  }

  return ids.map((establecimientoId) => ({ establecimientoId, roleId: '' }));
};

const obtenerRolesPorEstablecimientoDesdeEstablecimientos = (
  establecimientos: AsignacionEstablecimientoUsuario[],
) =>
  establecimientos.reduce<Record<string, string>>((acc, item) => {
    if (item.roleId) {
      acc[item.establecimientoId] = item.roleId;
    }
    return acc;
  }, {});

const obtenerRoleIdsDesdeEstablecimientos = (
  establecimientos: AsignacionEstablecimientoUsuario[],
  roleIdsLegacy?: string[],
) => {
  const ids = establecimientos.map((item) => item.roleId).filter(Boolean);
  const legacy = roleIdsLegacy ?? [];
  return Array.from(new Set([...ids, ...legacy]));
};

const obtenerEstablecimientoIdsDesdeEstablecimientos = (
  establecimientos: AsignacionEstablecimientoUsuario[],
) => Array.from(new Set(establecimientos.map((item) => item.establecimientoId).filter(Boolean)));

const normalizarAsignacionEmpresa = (asignacion: AsignacionEmpresaUsuario) => {
  const establecimientosBase = asignacion.establecimientos?.length
    ? asignacion.establecimientos
    : construirEstablecimientosDesdeLegacy(
        asignacion.establecimientoIds ?? [],
        asignacion.rolesPorEstablecimiento,
        asignacion.roleIds,
      );
  const establecimientos = normalizarEstablecimientos(establecimientosBase);
  return {
    ...asignacion,
    establecimientos,
    establecimientoIds: obtenerEstablecimientoIdsDesdeEstablecimientos(establecimientos),
    rolesPorEstablecimiento: obtenerRolesPorEstablecimientoDesdeEstablecimientos(establecimientos),
    roleIds: obtenerRoleIdsDesdeEstablecimientos(establecimientos, asignacion.roleIds),
  };
};

const resolverRolSistema = (
  idRol: string,
  rolesSistema: SystemRoleDefinition[],
): Role | null => {
  const rol = rolesSistema.find((item) => item.id === idRol);
  if (!rol || !rol.permissions) {
    return null;
  }

  const ahora = new Date();
  return {
    id: rol.id,
    name: rol.name ?? '',
    description: rol.description ?? '',
    type: rol.type ?? 'SYSTEM',
    level: rol.level ?? 'ADMIN',
    permissions: rol.permissions,
    restrictions: rol.restrictions ?? {},
    isActive: true,
    createdAt: ahora,
    updatedAt: ahora,
  };
};

export const construirRolesSistema = (
  idsRoles: string[],
  rolesSistema: SystemRoleDefinition[],
): Role[] => {
  const roles = idsRoles
    .map((idRol) => resolverRolSistema(idRol, rolesSistema))
    .filter((rol): rol is Role => Boolean(rol));
  const vistos = new Set<string>();

  return roles.filter((rol) => {
    if (vistos.has(rol.id)) return false;
    vistos.add(rol.id);
    return true;
  });
};

export const obtenerMapaEstablecimientos = (empresas: Empresa[]) => {
  const mapa = new Map<string, { nombre: string; empresaId: string }>();
  empresas.forEach((empresa) => {
    empresa.establecimientos.forEach((establecimiento) => {
      mapa.set(establecimiento.id, {
        nombre: establecimiento.nombre,
        empresaId: empresa.id,
      });
    });
  });
  return mapa;
};

export const normalizarUsuario = (
  usuario: User,
  empresaIdActual?: string,
  empresaNombreActual?: string,
): User => {
  if (usuario.asignacionesPorEmpresa?.length) {
    return usuario;
  }

  if (!empresaIdActual) {
    return usuario;
  }

  const establecimientos = usuario.assignment?.EstablecimientoIds ?? [];
  const roles = usuario.systemAccess?.roleIds ?? [];
  if (establecimientos.length === 0 && roles.length === 0) {
    return usuario;
  }

  const estadoAsignacion: EstadoAsignacionUsuario =
    usuario.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';

  const establecimientosAsignados = construirEstablecimientosDesdeLegacy(establecimientos, undefined, roles);

  const asignaciones: AsignacionEmpresaUsuario[] = [
    {
      empresaId: empresaIdActual,
      empresaNombre: empresaNombreActual,
      establecimientos: establecimientosAsignados,
      establecimientoIds: [...establecimientos],
      rolesPorEstablecimiento: obtenerRolesPorEstablecimientoDesdeEstablecimientos(establecimientosAsignados),
      roleIds: [...roles],
      estado: estadoAsignacion,
    },
  ];

  return {
    ...usuario,
    asignacionesPorEmpresa: asignaciones,
  };
};

export const obtenerAsignacionesUsuario = (
  usuario: User,
  empresaIdActual?: string,
  empresaNombreActual?: string,
) => {
  const normalizado = normalizarUsuario(usuario, empresaIdActual, empresaNombreActual);
  const asignaciones = normalizado.asignacionesPorEmpresa ?? [];
  return asignaciones.map((asignacion) => normalizarAsignacionEmpresa(asignacion));
};

export const obtenerAsignacionEmpresa = (
  asignaciones: AsignacionEmpresaUsuario[],
  empresaId: string,
) => asignaciones.find((asignacion) => asignacion.empresaId === empresaId);

export const unirIdsUnicos = (base: string[], extra: string[]) => {
  const vistos = new Set<string>(base);
  extra.forEach((id) => vistos.add(id));
  return Array.from(vistos);
};

export const construirResumenLista = (items: string[]) => {
  if (items.length === 0) {
    return { resumen: 'Sin datos', detalle: '' };
  }
  if (items.length === 1) {
    return { resumen: items[0], detalle: items[0] };
  }
  const [primero, ...resto] = items;
  return {
    resumen: `${primero} + ${resto.length} mas`,
    detalle: items.join(', '),
  };
};

export const obtenerEstadoUsuarioPorAsignaciones = (
  asignaciones: AsignacionEmpresaUsuario[],
  estadoActual: User['status'],
): User['status'] => {
  if (asignaciones.length === 0) {
    return estadoActual;
  }
  const tieneActivo = asignaciones.some((asignacion) => asignacion.estado === 'ACTIVE');
  return tieneActivo ? 'ACTIVE' : 'INACTIVE';
};

export const mapearSesionAUsuarioConfiguracion = (
  sesion: SesionUsuario,
  contextoEmpresa: DatosContextoEmpresa,
  rolesSistema: SystemRoleDefinition[],
  idRolSuperAdmin: string,
): User => {
  const { nombres, apellidos, nombreCompleto } = separarNombreCompleto(sesion.userName ?? '');
  const establecimientoActivo = contextoEmpresa.establecimientoId ??
    sesion.currentEstablecimientoId ??
    sesion.currentEstablecimiento?.id ??
    '';
  const idsRoles = [idRolSuperAdmin];
  const roles = construirRolesSistema(idsRoles, rolesSistema);

  const asignaciones: AsignacionEmpresaUsuario[] = contextoEmpresa.empresaId
    ? [
        {
          empresaId: contextoEmpresa.empresaId,
          empresaNombre: contextoEmpresa.empresaNombre,
          establecimientos: establecimientoActivo
            ? [{ establecimientoId: establecimientoActivo, roleId: idRolSuperAdmin }]
            : [],
          establecimientoIds: establecimientoActivo ? [establecimientoActivo] : [],
          rolesPorEstablecimiento: establecimientoActivo
            ? { [establecimientoActivo]: idRolSuperAdmin }
            : {},
          roleIds: idsRoles,
          estado: 'ACTIVE',
        },
      ]
    : [];

  return {
    id: sesion.userId,
    code: construirCodigoUsuarioDeterministico(sesion.userId),
    personalInfo: {
      firstName: nombres,
      lastName: apellidos,
      fullName: nombreCompleto,
      email: sesion.userEmail ?? '',
    },
    assignment: {
      EstablecimientoId: establecimientoActivo || undefined,
      EstablecimientoIds: establecimientoActivo ? [establecimientoActivo] : [],
    },
    systemAccess: {
      username: sesion.userEmail ? sesion.userEmail.split('@')[0] : sesion.userId,
      email: sesion.userEmail ?? '',
      roleIds: idsRoles,
      roles,
      permissions: [],
      loginAttempts: 0,
      isLocked: false,
    },
    asignacionesPorEmpresa: asignaciones,
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

export const construirResumenRoles = (
  asignaciones: AsignacionEmpresaUsuario[],
  rolesSistema: SystemRoleDefinition[],
) => {
  const nombres = asignaciones.flatMap((asignacion) => {
    const asignacionNormalizada = normalizarAsignacionEmpresa(asignacion);
    const idsRoles = obtenerRoleIdsDesdeEstablecimientos(asignacionNormalizada.establecimientos);
    const roles = construirRolesSistema(idsRoles, rolesSistema);
    return roles.map((rol) => {
      const etiquetaEmpresa = asignacionNormalizada.empresaNombre
        ? ` (${asignacionNormalizada.empresaNombre})`
        : '';
      return `${rol.name}${etiquetaEmpresa}`.trim();
    });
  });
  return construirResumenLista(nombres);
};

export const construirResumenEmpresas = (asignaciones: AsignacionEmpresaUsuario[]) => {
  const nombres = asignaciones.map((asignacion) => asignacion.empresaNombre ?? asignacion.empresaId);
  return construirResumenLista(nombres);
};

export const construirResumenEstablecimientos = (
  asignaciones: AsignacionEmpresaUsuario[],
  mapaEstablecimientos: Map<string, { nombre: string }>,
) => {
  const nombres = asignaciones.flatMap((asignacion) => {
    const asignacionNormalizada = normalizarAsignacionEmpresa(asignacion);
    return asignacionNormalizada.establecimientos.map(
      (item) => mapaEstablecimientos.get(item.establecimientoId)?.nombre ?? item.establecimientoId,
    );
  });
  return construirResumenLista(nombres);
};

export const construirAsignacionesDesdeFormulario = (
  asignaciones: AsignacionEmpresaUsuario[],
  empresas: Empresa[],
) => {
  const empresasPorId = new Map(empresas.map((empresa) => [empresa.id, empresa]));
  return asignaciones.map((asignacion) => {
    const establecimientosBase = asignacion.establecimientos?.length
      ? asignacion.establecimientos
      : construirEstablecimientosDesdeLegacy(
          asignacion.establecimientoIds ?? [],
          asignacion.rolesPorEstablecimiento,
          asignacion.roleIds,
        );
    const establecimientos = normalizarEstablecimientos(establecimientosBase);
    return {
      ...asignacion,
      empresaNombre: asignacion.empresaNombre ?? empresasPorId.get(asignacion.empresaId)?.razonSocial,
      establecimientos,
      establecimientoIds: obtenerEstablecimientoIdsDesdeEstablecimientos(establecimientos),
      rolesPorEstablecimiento: obtenerRolesPorEstablecimientoDesdeEstablecimientos(establecimientos),
      roleIds: obtenerRoleIdsDesdeEstablecimientos(establecimientos, asignacion.roleIds),
    };
  });
};

export const obtenerIdsRolesUnicos = (asignaciones: AsignacionEmpresaUsuario[]) => {
  const ids = asignaciones.flatMap((asignacion) => {
    const asignacionNormalizada = normalizarAsignacionEmpresa(asignacion);
    return obtenerRoleIdsDesdeEstablecimientos(asignacionNormalizada.establecimientos);
  });
  return Array.from(new Set(ids));
};

export const obtenerEstablecimientosUnicos = (asignaciones: AsignacionEmpresaUsuario[]) => {
  const ids = asignaciones.flatMap((asignacion) => {
    const asignacionNormalizada = normalizarAsignacionEmpresa(asignacion);
    return obtenerEstablecimientoIdsDesdeEstablecimientos(asignacionNormalizada.establecimientos);
  });
  return Array.from(new Set(ids));
};

export const obtenerAsignacionesActualizadas = (
  asignaciones: AsignacionEmpresaUsuario[],
  empresaId: string,
  actualizacion: Partial<AsignacionEmpresaUsuario>,
): AsignacionEmpresaUsuario[] => {
  const existentes = asignaciones.filter((asignacion) => asignacion.empresaId !== empresaId);
  const actual = asignaciones.find((asignacion) => asignacion.empresaId === empresaId);
  if (!actual) {
    const establecimientosBase = actualizacion.establecimientos?.length
      ? actualizacion.establecimientos
      : construirEstablecimientosDesdeLegacy(
          actualizacion.establecimientoIds ?? [],
          actualizacion.rolesPorEstablecimiento,
          actualizacion.roleIds,
        );
    const establecimientos = normalizarEstablecimientos(establecimientosBase);
    return [
      ...existentes,
      {
        empresaId,
        empresaNombre: actualizacion.empresaNombre,
        establecimientos,
        establecimientoIds: obtenerEstablecimientoIdsDesdeEstablecimientos(establecimientos),
        rolesPorEstablecimiento: obtenerRolesPorEstablecimientoDesdeEstablecimientos(establecimientos),
        roleIds: obtenerRoleIdsDesdeEstablecimientos(establecimientos, actualizacion.roleIds),
        estado: actualizacion.estado ?? 'ACTIVE',
      },
    ];
  }

  const establecimientosActualizados = actualizacion.establecimientos?.length
    ? normalizarEstablecimientos(actualizacion.establecimientos)
    : construirEstablecimientosDesdeLegacy(
        actualizacion.establecimientoIds ?? actual.establecimientoIds ?? [],
        actualizacion.rolesPorEstablecimiento ?? actual.rolesPorEstablecimiento,
        actualizacion.roleIds ?? actual.roleIds,
      );
  const establecimientosBase = actual.establecimientos?.length
    ? actual.establecimientos
    : construirEstablecimientosDesdeLegacy(
        actual.establecimientoIds ?? [],
        actual.rolesPorEstablecimiento,
        actual.roleIds,
      );
  const establecimientosNormalizados = normalizarEstablecimientos(
    establecimientosActualizados.length ? establecimientosActualizados : establecimientosBase,
  );

  return [
    ...existentes,
    {
      ...actual,
      ...actualizacion,
      establecimientos: establecimientosNormalizados,
      establecimientoIds: obtenerEstablecimientoIdsDesdeEstablecimientos(establecimientosNormalizados),
      rolesPorEstablecimiento: obtenerRolesPorEstablecimientoDesdeEstablecimientos(establecimientosNormalizados),
      roleIds: obtenerRoleIdsDesdeEstablecimientos(
        establecimientosNormalizados,
        actualizacion.roleIds ?? actual.roleIds,
      ),
      estado: actualizacion.estado ?? actual.estado,
    },
  ];
};

export const obtenerRolesPorEstablecimientoAsignacion = (
  asignacion: AsignacionEmpresaUsuario,
) => {
  const asignacionNormalizada = normalizarAsignacionEmpresa(asignacion);
  return obtenerRolesPorEstablecimientoDesdeEstablecimientos(asignacionNormalizada.establecimientos);
};

export const obtenerEstablecimientosIdsAsignacion = (asignacion: AsignacionEmpresaUsuario) => {
  const asignacionNormalizada = normalizarAsignacionEmpresa(asignacion);
  return obtenerEstablecimientoIdsDesdeEstablecimientos(asignacionNormalizada.establecimientos);
};
