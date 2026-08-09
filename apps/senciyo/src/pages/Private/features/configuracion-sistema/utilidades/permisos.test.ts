// Pruebas de la única fuente de verdad de permisos reales — usada tanto por
// `PermisoGuard.tsx` (ruta) como por los comandos de dominio de Gastos
// (`ContextoGastos.tsx`, `useCategoriasGasto.ts`). No se reimplementa la
// lógica de resolución: se prueban las funciones reales de producción
// (`tienePermiso`, `tieneAlgunoDePermisos`, `tieneAccesoTotalCatalogo`,
// `resolverPermisosSesion`) contra fixtures realistas de usuario/rol, el
// mismo modelo (`User`, `RolConfiguracion`) que ya consume `permisos.ts`.

import { describe, it, expect } from 'vitest';
import {
  tienePermiso,
  tieneAlgunoDePermisos,
  tieneAccesoTotalCatalogo,
  resolverPermisosSesion,
  obtenerUsuarioDesdeSesion,
} from './permisos';
import { CATALOGO_PERMISOS } from '../roles/catalogoPermisos';
import { ROLES_DEL_SISTEMA, ID_ROL_ADMINISTRADOR, ID_ROL_VENDEDOR, ID_ROL_CONTADOR } from '../roles/rolesDelSistema';
import { listarRolesConfigurados } from './permisos';
import type { User } from '../modelos/User';
import type { RolConfiguracion } from '../roles/tiposRolesPermisos';

const ESTABLECIMIENTO_1 = 'est-1';

function crearRolFixture(overrides: Partial<RolConfiguracion> = {}): RolConfiguracion {
  return {
    id: 'rol-fixture',
    nombre: 'Rol de prueba',
    descripcion: '',
    permisos: [],
    tipo: 'PERSONALIZADO',
    ...overrides,
  };
}

function crearUsuarioFixture(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    code: 'U-001',
    personalInfo: {
      firstName: 'Ana',
      lastName: 'Torres',
      fullName: 'Ana Torres',
      email: 'ana@empresa.test',
    },
    assignment: {
      EstablecimientoIds: [ESTABLECIMIENTO_1],
    },
    systemAccess: {
      username: 'ana',
      email: 'ana@empresa.test',
      roleIds: [],
      roles: [],
      permissions: [],
    },
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('tienePermiso / tieneAlgunoDePermisos — resolución real por rol asignado', () => {
  it('un usuario sin roles asignados no tiene ningún permiso', () => {
    const usuario = crearUsuarioFixture();
    expect(tienePermiso({ usuario, permisoId: 'gastos.ver', rolesDisponibles: [] })).toBe(false);
  });

  it('un usuario null nunca tiene permiso, sin importar el rol solicitado', () => {
    expect(tienePermiso({ usuario: null, permisoId: 'gastos.ver', rolesDisponibles: [] })).toBe(false);
  });

  it('un usuario con un rol de "solo ver" puede ver pero no puede crear/anular/pagar/gestionar categorías', () => {
    const rolSoloVer = crearRolFixture({ id: 'rol-solo-ver', permisos: ['gastos.ver'] });
    const usuario = crearUsuarioFixture({ systemAccess: { username: 'ana', email: 'ana@empresa.test', roleIds: ['rol-solo-ver'], roles: [], permissions: [] } });

    const parametros = { usuario, rolesDisponibles: [rolSoloVer], establecimientoId: ESTABLECIMIENTO_1 };
    expect(tienePermiso({ ...parametros, permisoId: 'gastos.ver' })).toBe(true);
    expect(tienePermiso({ ...parametros, permisoId: 'gastos.crear' })).toBe(false);
    expect(tienePermiso({ ...parametros, permisoId: 'gastos.anular' })).toBe(false);
    expect(tienePermiso({ ...parametros, permisoId: 'gastos.pagar' })).toBe(false);
    expect(tienePermiso({ ...parametros, permisoId: 'gastos.categorias.gestionar' })).toBe(false);
  });

  it('un usuario con permiso de crear gastos puede crear pero sigue sin poder anular ni pagar', () => {
    const rolCrear = crearRolFixture({ id: 'rol-crea-gastos', permisos: ['gastos.ver', 'gastos.crear'] });
    const usuario = crearUsuarioFixture({ systemAccess: { username: 'ana', email: 'ana@empresa.test', roleIds: ['rol-crea-gastos'], roles: [], permissions: [] } });
    const parametros = { usuario, rolesDisponibles: [rolCrear], establecimientoId: ESTABLECIMIENTO_1 };

    expect(tienePermiso({ ...parametros, permisoId: 'gastos.crear' })).toBe(true);
    expect(tienePermiso({ ...parametros, permisoId: 'gastos.anular' })).toBe(false);
    expect(tienePermiso({ ...parametros, permisoId: 'gastos.pagar' })).toBe(false);
  });

  it('un usuario con permiso de anular puede anular pero no pagar ni gestionar categorías', () => {
    const rolAnular = crearRolFixture({ id: 'rol-anula-gastos', permisos: ['gastos.ver', 'gastos.anular'] });
    const usuario = crearUsuarioFixture({ systemAccess: { username: 'ana', email: 'ana@empresa.test', roleIds: ['rol-anula-gastos'], roles: [], permissions: [] } });
    const parametros = { usuario, rolesDisponibles: [rolAnular], establecimientoId: ESTABLECIMIENTO_1 };

    expect(tienePermiso({ ...parametros, permisoId: 'gastos.anular' })).toBe(true);
    expect(tienePermiso({ ...parametros, permisoId: 'gastos.pagar' })).toBe(false);
    expect(tienePermiso({ ...parametros, permisoId: 'gastos.categorias.gestionar' })).toBe(false);
  });

  it('un usuario con permiso de pagar puede pagar y anular pagos, pero no crear ni anular gastos', () => {
    const rolPagar = crearRolFixture({ id: 'rol-paga-gastos', permisos: ['gastos.ver', 'gastos.pagar'] });
    const usuario = crearUsuarioFixture({ systemAccess: { username: 'ana', email: 'ana@empresa.test', roleIds: ['rol-paga-gastos'], roles: [], permissions: [] } });
    const parametros = { usuario, rolesDisponibles: [rolPagar], establecimientoId: ESTABLECIMIENTO_1 };

    expect(tienePermiso({ ...parametros, permisoId: 'gastos.pagar' })).toBe(true);
    expect(tienePermiso({ ...parametros, permisoId: 'gastos.crear' })).toBe(false);
    expect(tienePermiso({ ...parametros, permisoId: 'gastos.anular' })).toBe(false);
  });

  it('un usuario con permiso de gestionar categorías puede gestionar categorías, pero eso no le da otros permisos de Gastos', () => {
    const rolCategorias = crearRolFixture({ id: 'rol-categorias-gasto', permisos: ['gastos.categorias.gestionar'] });
    const usuario = crearUsuarioFixture({ systemAccess: { username: 'ana', email: 'ana@empresa.test', roleIds: ['rol-categorias-gasto'], roles: [], permissions: [] } });
    const parametros = { usuario, rolesDisponibles: [rolCategorias], establecimientoId: ESTABLECIMIENTO_1 };

    expect(tienePermiso({ ...parametros, permisoId: 'gastos.categorias.gestionar' })).toBe(true);
    expect(tienePermiso({ ...parametros, permisoId: 'gastos.ver' })).toBe(false);
  });

  it('tieneAlgunoDePermisos (usado por PermisoGuard) autoriza si el usuario tiene AL MENOS UNO de los permisos pedidos por la ruta', () => {
    const rolSoloVer = crearRolFixture({ id: 'rol-solo-ver', permisos: ['gastos.ver'] });
    const usuario = crearUsuarioFixture({ systemAccess: { username: 'ana', email: 'ana@empresa.test', roleIds: ['rol-solo-ver'], roles: [], permissions: [] } });

    expect(tieneAlgunoDePermisos({ usuario, permisos: ['gastos.crear'], rolesDisponibles: [rolSoloVer], establecimientoId: ESTABLECIMIENTO_1 })).toBe(false);
    expect(tieneAlgunoDePermisos({ usuario, permisos: ['gastos.crear', 'gastos.ver'], rolesDisponibles: [rolSoloVer], establecimientoId: ESTABLECIMIENTO_1 })).toBe(true);
  });

  it('el permiso solo se resuelve para el establecimiento donde el rol está asignado', () => {
    const rolCrear = crearRolFixture({ id: 'rol-crea-gastos', permisos: ['gastos.crear'] });
    const usuario = crearUsuarioFixture({
      systemAccess: { username: 'ana', email: 'ana@empresa.test', roleIds: [], roles: [], permissions: [] },
      asignacionesPorEmpresa: [
        {
          empresaId: 'empresa-1',
          establecimientos: [{ establecimientoId: 'est-1', roleId: 'rol-crea-gastos' }],
          estado: 'ACTIVE',
        },
      ],
    });

    expect(tienePermiso({ usuario, permisoId: 'gastos.crear', rolesDisponibles: [rolCrear], establecimientoId: 'est-1' })).toBe(true);
    expect(tienePermiso({ usuario, permisoId: 'gastos.crear', rolesDisponibles: [rolCrear], establecimientoId: 'est-2' })).toBe(false);
  });
});

describe('tieneAccesoTotalCatalogo / resolverPermisosSesion — acceso total sin hardcodear ningún rol', () => {
  it('un rol que cubre el 100% del catálogo actual otorga acceso total (equivalente a "Administrador"), sin depender de su id/nombre', () => {
    const rolConTodo = crearRolFixture({
      id: 'cualquier-id-de-rol', // deliberadamente NO es 'rol-administrador'
      nombre: 'Rol con todos los permisos',
      permisos: CATALOGO_PERMISOS.map((p) => p.id),
    });
    const usuario = crearUsuarioFixture({ systemAccess: { username: 'ana', email: 'ana@empresa.test', roleIds: ['cualquier-id-de-rol'], roles: [], permissions: [] } });
    const parametros = { usuario, rolesDisponibles: [rolConTodo], establecimientoId: ESTABLECIMIENTO_1 };

    expect(tieneAccesoTotalCatalogo(parametros)).toBe(true);
    expect(resolverPermisosSesion(parametros)).toContain('*');
  });

  it('un rol con MUCHOS permisos pero sin cubrir el 100% del catálogo NO otorga acceso total', () => {
    const rolCasiTodo = crearRolFixture({
      id: 'rol-casi-todo',
      permisos: CATALOGO_PERMISOS.slice(0, -1).map((p) => p.id), // le falta exactamente uno
    });
    const usuario = crearUsuarioFixture({ systemAccess: { username: 'ana', email: 'ana@empresa.test', roleIds: ['rol-casi-todo'], roles: [], permissions: [] } });
    const parametros = { usuario, rolesDisponibles: [rolCasiTodo], establecimientoId: ESTABLECIMIENTO_1 };

    expect(tieneAccesoTotalCatalogo(parametros)).toBe(false);
    expect(resolverPermisosSesion(parametros)).not.toContain('*');
  });

  it('un usuario sin roles nunca tiene acceso total, y resolverPermisosSesion devuelve una lista vacía', () => {
    const usuario = crearUsuarioFixture();
    const parametros = { usuario, rolesDisponibles: [], establecimientoId: ESTABLECIMIENTO_1 };

    expect(tieneAccesoTotalCatalogo(parametros)).toBe(false);
    expect(resolverPermisosSesion(parametros)).toEqual([]);
  });

  it('resolverPermisosSesion de un usuario con permisos parciales nunca incluye "*"', () => {
    const rolSoloVer = crearRolFixture({ id: 'rol-solo-ver', permisos: ['gastos.ver'] });
    const usuario = crearUsuarioFixture({ systemAccess: { username: 'ana', email: 'ana@empresa.test', roleIds: ['rol-solo-ver'], roles: [], permissions: [] } });
    const permisos = resolverPermisosSesion({ usuario, rolesDisponibles: [rolSoloVer], establecimientoId: ESTABLECIMIENTO_1 });

    expect(permisos).toContain('gastos.ver');
    expect(permisos).not.toContain('*');
  });
});

describe('Acceso directo por URL (misma resolución que usa PermisoGuard.tsx)', () => {
  it('un usuario autenticado pero SIN el permiso exigido por la ruta es rechazado aunque intente acceder directamente por URL', () => {
    const rolSoloVer = crearRolFixture({ id: 'rol-solo-ver', permisos: ['gastos.ver'] });
    const usuario = crearUsuarioFixture({ systemAccess: { username: 'ana', email: 'ana@empresa.test', roleIds: ['rol-solo-ver'], roles: [], permissions: [] } });

    // Simula la ruta protegida "/gastos/nuevo" -> conPermisos(['gastos.crear'])
    const tieneAccesoARutaDeCreacion = tieneAlgunoDePermisos({
      usuario,
      permisos: ['gastos.crear'],
      rolesDisponibles: [rolSoloVer],
      establecimientoId: ESTABLECIMIENTO_1,
    });
    expect(tieneAccesoARutaDeCreacion).toBe(false);
  });

  it('obtenerUsuarioDesdeSesion no encuentra un usuario para una sesión que no corresponde a ningún registro de configuración (evita fugas por id/correo inventado)', () => {
    const usuarios = [crearUsuarioFixture({ id: 'user-1', personalInfo: { firstName: 'Ana', lastName: 'Torres', fullName: 'Ana Torres', email: 'ana@empresa.test' } })];
    const resultado = obtenerUsuarioDesdeSesion(usuarios, { userId: 'user-inexistente', userEmail: 'nadie@empresa.test' });
    expect(resultado).toBeNull();
  });
});

// VAL-P1-001: permisos granulares de valorización de inventario — mismo guard central
// (`tienePermiso`), mismo catálogo único (`CATALOGO_PERMISOS`), sin comparar nombres de rol.
describe('Permisos de valorización de inventario (VAL-P1-001)', () => {
  const PERMISOS_VALORIZACION = [
    'inventario.costos.ver',
    'inventario.valorizacion.configurar',
    'inventario.valorizacion.confirmar_costos',
    'inventario.valorizacion.activar',
  ] as const;

  it('los 4 permisos de valorización existen en el catálogo oficial, bajo el módulo "inventario"', () => {
    for (const id of PERMISOS_VALORIZACION) {
      const permiso = CATALOGO_PERMISOS.find((p) => p.id === id);
      expect(permiso, `falta "${id}" en CATALOGO_PERMISOS`).toBeDefined();
      expect(permiso?.modulo).toBe('inventario');
    }
  });

  it('PER-01: ver inventario (cantidades) no otorga ver costos — son permisos independientes', () => {
    const rolSoloInventario = crearRolFixture({ id: 'rol-solo-inventario', permisos: ['inventario.ver'] });
    const usuario = crearUsuarioFixture({ systemAccess: { username: 'ana', email: 'ana@empresa.test', roleIds: ['rol-solo-inventario'], roles: [], permissions: [] } });
    const parametros = { usuario, rolesDisponibles: [rolSoloInventario], establecimientoId: ESTABLECIMIENTO_1 };

    expect(tienePermiso({ ...parametros, permisoId: 'inventario.ver' })).toBe(true);
    expect(tienePermiso({ ...parametros, permisoId: 'inventario.costos.ver' })).toBe(false);
    expect(tienePermiso({ ...parametros, permisoId: 'inventario.valorizacion.configurar' })).toBe(false);
    expect(tienePermiso({ ...parametros, permisoId: 'inventario.valorizacion.confirmar_costos' })).toBe(false);
    expect(tienePermiso({ ...parametros, permisoId: 'inventario.valorizacion.activar' })).toBe(false);
  });

  it('PER-02/PER-04: configurar sin confirmar_costos no otorga confirmar ni activar', () => {
    const rolConfigura = crearRolFixture({ id: 'rol-configura-valorizacion', permisos: ['inventario.ver', 'inventario.valorizacion.configurar'] });
    const usuario = crearUsuarioFixture({ systemAccess: { username: 'ana', email: 'ana@empresa.test', roleIds: ['rol-configura-valorizacion'], roles: [], permissions: [] } });
    const parametros = { usuario, rolesDisponibles: [rolConfigura], establecimientoId: ESTABLECIMIENTO_1 };

    expect(tienePermiso({ ...parametros, permisoId: 'inventario.valorizacion.configurar' })).toBe(true);
    expect(tienePermiso({ ...parametros, permisoId: 'inventario.valorizacion.confirmar_costos' })).toBe(false);
    expect(tienePermiso({ ...parametros, permisoId: 'inventario.valorizacion.activar' })).toBe(false);
  });

  it('PER-05: confirmar_costos sin activar no otorga la activación definitiva', () => {
    const rolConfirma = crearRolFixture({
      id: 'rol-confirma-costos',
      permisos: ['inventario.ver', 'inventario.costos.ver', 'inventario.valorizacion.configurar', 'inventario.valorizacion.confirmar_costos'],
    });
    const usuario = crearUsuarioFixture({ systemAccess: { username: 'ana', email: 'ana@empresa.test', roleIds: ['rol-confirma-costos'], roles: [], permissions: [] } });
    const parametros = { usuario, rolesDisponibles: [rolConfirma], establecimientoId: ESTABLECIMIENTO_1 };

    expect(tienePermiso({ ...parametros, permisoId: 'inventario.valorizacion.confirmar_costos' })).toBe(true);
    expect(tienePermiso({ ...parametros, permisoId: 'inventario.valorizacion.activar' })).toBe(false);
  });

  it('PER-06: un rol con los 4 permisos de valorización los tiene todos disponibles', () => {
    const rolCompleto = crearRolFixture({ id: 'rol-valorizacion-completo', permisos: ['inventario.ver', ...PERMISOS_VALORIZACION] });
    const usuario = crearUsuarioFixture({ systemAccess: { username: 'ana', email: 'ana@empresa.test', roleIds: ['rol-valorizacion-completo'], roles: [], permissions: [] } });
    const parametros = { usuario, rolesDisponibles: [rolCompleto], establecimientoId: ESTABLECIMIENTO_1 };

    for (const id of PERMISOS_VALORIZACION) {
      expect(tienePermiso({ ...parametros, permisoId: id })).toBe(true);
    }
  });

  it('PER-07: el rol Administrador del sistema conserva acceso completo (incluye los 4 permisos nuevos) mediante el catálogo oficial, nunca por su nombre', () => {
    const rolesConfigurados = listarRolesConfigurados(ROLES_DEL_SISTEMA);
    const usuario = crearUsuarioFixture({ systemAccess: { username: 'admin', email: 'admin@empresa.test', roleIds: [ID_ROL_ADMINISTRADOR], roles: [], permissions: [] } });
    const parametros = { usuario, rolesDisponibles: rolesConfigurados, establecimientoId: ESTABLECIMIENTO_1 };

    for (const id of PERMISOS_VALORIZACION) {
      expect(tienePermiso({ ...parametros, permisoId: id })).toBe(true);
    }
    // El rol Administrador cubre el catálogo completo por construcción (CATALOGO_PERMISOS.map),
    // nunca por comparar `rol.nombre === 'Administrador'`.
    expect(tieneAccesoTotalCatalogo(parametros)).toBe(true);
  });

  it('PER-08: los roles predeterminados Vendedor y Contador NO reciben los permisos de valorización accidentalmente', () => {
    const rolesConfigurados = listarRolesConfigurados(ROLES_DEL_SISTEMA);
    const usuarioVendedor = crearUsuarioFixture({ systemAccess: { username: 'v', email: 'v@empresa.test', roleIds: [ID_ROL_VENDEDOR], roles: [], permissions: [] } });
    const usuarioContador = crearUsuarioFixture({ systemAccess: { username: 'c', email: 'c@empresa.test', roleIds: [ID_ROL_CONTADOR], roles: [], permissions: [] } });

    for (const id of PERMISOS_VALORIZACION) {
      expect(tienePermiso({ usuario: usuarioVendedor, permisoId: id, rolesDisponibles: rolesConfigurados, establecimientoId: ESTABLECIMIENTO_1 })).toBe(false);
      expect(tienePermiso({ usuario: usuarioContador, permisoId: id, rolesDisponibles: rolesConfigurados, establecimientoId: ESTABLECIMIENTO_1 })).toBe(false);
    }
  });

  it('PER-09: cambiar de rol no conserva permisos anteriores — la resolución siempre parte de los roles vigentes, nunca de un estado cacheado', () => {
    const rolCompleto = crearRolFixture({ id: 'rol-valorizacion-completo', permisos: [...PERMISOS_VALORIZACION] });
    const rolSinNada = crearRolFixture({ id: 'rol-sin-nada', permisos: [] });
    const usuario = crearUsuarioFixture({ systemAccess: { username: 'ana', email: 'ana@empresa.test', roleIds: ['rol-sin-nada'], roles: [], permissions: [] } });

    // Con el rol completo asignado, tiene el permiso.
    expect(tienePermiso({ usuario: { ...usuario, systemAccess: { ...usuario.systemAccess, roleIds: ['rol-valorizacion-completo'] } }, permisoId: 'inventario.valorizacion.activar', rolesDisponibles: [rolCompleto, rolSinNada], establecimientoId: ESTABLECIMIENTO_1 })).toBe(true);
    // El MISMO usuario, ahora con el rol sin permisos (simula reasignación), pierde el acceso de inmediato.
    expect(tienePermiso({ usuario, permisoId: 'inventario.valorizacion.activar', rolesDisponibles: [rolCompleto, rolSinNada], establecimientoId: ESTABLECIMIENTO_1 })).toBe(false);
  });

  it('PER-09 (empresa/establecimiento): el permiso asignado en un establecimiento no se conserva en otro', () => {
    const rolActiva = crearRolFixture({ id: 'rol-activa-valorizacion', permisos: ['inventario.valorizacion.activar'] });
    const usuario = crearUsuarioFixture({
      systemAccess: { username: 'ana', email: 'ana@empresa.test', roleIds: [], roles: [], permissions: [] },
      asignacionesPorEmpresa: [
        { empresaId: 'empresa-1', establecimientos: [{ establecimientoId: 'est-1', roleId: 'rol-activa-valorizacion' }], estado: 'ACTIVE' },
      ],
    });

    expect(tienePermiso({ usuario, permisoId: 'inventario.valorizacion.activar', rolesDisponibles: [rolActiva], establecimientoId: 'est-1' })).toBe(true);
    expect(tienePermiso({ usuario, permisoId: 'inventario.valorizacion.activar', rolesDisponibles: [rolActiva], establecimientoId: 'est-2' })).toBe(false);
  });

  it('PER-10: retirar un permiso del rol bloquea la acción correspondiente de inmediato', () => {
    const rolConPermiso = crearRolFixture({ id: 'rol-x', permisos: ['inventario.valorizacion.activar'] });
    const rolSinPermiso = crearRolFixture({ id: 'rol-x', permisos: [] }); // mismo id — "retirar" el permiso es reemplazar la definición del rol
    const usuario = crearUsuarioFixture({ systemAccess: { username: 'ana', email: 'ana@empresa.test', roleIds: ['rol-x'], roles: [], permissions: [] } });

    expect(tienePermiso({ usuario, permisoId: 'inventario.valorizacion.activar', rolesDisponibles: [rolConPermiso], establecimientoId: ESTABLECIMIENTO_1 })).toBe(true);
    expect(tienePermiso({ usuario, permisoId: 'inventario.valorizacion.activar', rolesDisponibles: [rolSinPermiso], establecimientoId: ESTABLECIMIENTO_1 })).toBe(false);
  });

  it('PER-12: los permisos ya existentes de inventario (ajustar/transferir/ver/actualización masiva) siguen resolviendo igual, sin interferencia de los permisos nuevos', () => {
    const rolOperativo = crearRolFixture({
      id: 'rol-operativo-inventario',
      permisos: ['inventario.ver', 'inventario.ajustar', 'inventario.transferir', 'inventario.actualizacion_masiva'],
    });
    const usuario = crearUsuarioFixture({ systemAccess: { username: 'ana', email: 'ana@empresa.test', roleIds: ['rol-operativo-inventario'], roles: [], permissions: [] } });
    const parametros = { usuario, rolesDisponibles: [rolOperativo], establecimientoId: ESTABLECIMIENTO_1 };

    expect(tienePermiso({ ...parametros, permisoId: 'inventario.ver' })).toBe(true);
    expect(tienePermiso({ ...parametros, permisoId: 'inventario.ajustar' })).toBe(true);
    expect(tienePermiso({ ...parametros, permisoId: 'inventario.transferir' })).toBe(true);
    expect(tienePermiso({ ...parametros, permisoId: 'inventario.actualizacion_masiva' })).toBe(true);
    // Ninguno de los 4 permisos operativos ya existentes otorga por sí solo los nuevos de valorización.
    for (const id of PERMISOS_VALORIZACION) {
      expect(tienePermiso({ ...parametros, permisoId: id })).toBe(false);
    }
  });
});

// GRE-P1-004: Anular/Eliminar borrador/Duplicar reutilizan `ventas.gre.emitir` (mismo permiso que
// crear/editar/emitir) — se prueba contra la función real `tienePermiso`, el mismo guard que
// `ContextoGuiasRemision.tsx` vuelve a exigir dentro de `agregarGuia`/`actualizarGuia`/
// `eliminarGuia`, no solo en el guard de rutas.
describe('Permisos de acciones internas de GRE (GRE-P1-004)', () => {
  it('un usuario con solo "ventas.gre.ver" puede ver el listado pero NO tiene el permiso que exigen anular/eliminar borrador/duplicar', () => {
    const rolSoloVer = crearRolFixture({ id: 'rol-gre-solo-ver', permisos: ['ventas.gre.ver'] });
    const usuario = crearUsuarioFixture({ systemAccess: { username: 'ana', email: 'ana@empresa.test', roleIds: ['rol-gre-solo-ver'], roles: [], permissions: [] } });
    const parametros = { usuario, rolesDisponibles: [rolSoloVer], establecimientoId: ESTABLECIMIENTO_1 };

    expect(tienePermiso({ ...parametros, permisoId: 'ventas.gre.ver' })).toBe(true);
    expect(tienePermiso({ ...parametros, permisoId: 'ventas.gre.emitir' })).toBe(false);
  });

  it('un usuario con "ventas.gre.emitir" tiene el permiso que habilita crear, editar, anular, eliminar borrador y duplicar', () => {
    const rolCompleto = crearRolFixture({ id: 'rol-gre-completo', permisos: ['ventas.gre.ver', 'ventas.gre.emitir'] });
    const usuario = crearUsuarioFixture({ systemAccess: { username: 'ana', email: 'ana@empresa.test', roleIds: ['rol-gre-completo'], roles: [], permissions: [] } });
    const parametros = { usuario, rolesDisponibles: [rolCompleto], establecimientoId: ESTABLECIMIENTO_1 };

    expect(tienePermiso({ ...parametros, permisoId: 'ventas.gre.emitir' })).toBe(true);
  });

  it('los roles predeterminados conservan el comportamiento actual: Vendedor autorizado, Contador sin acceso a GRE', () => {
    const rolesConfigurados = listarRolesConfigurados(ROLES_DEL_SISTEMA);
    const usuarioVendedor = crearUsuarioFixture({ systemAccess: { username: 'v', email: 'v@empresa.test', roleIds: [ID_ROL_VENDEDOR], roles: [], permissions: [] } });
    const usuarioContador = crearUsuarioFixture({ systemAccess: { username: 'c', email: 'c@empresa.test', roleIds: [ID_ROL_CONTADOR], roles: [], permissions: [] } });

    expect(tienePermiso({ usuario: usuarioVendedor, permisoId: 'ventas.gre.emitir', rolesDisponibles: rolesConfigurados, establecimientoId: ESTABLECIMIENTO_1 })).toBe(true);
    expect(tienePermiso({ usuario: usuarioContador, permisoId: 'ventas.gre.ver', rolesDisponibles: rolesConfigurados, establecimientoId: ESTABLECIMIENTO_1 })).toBe(false);
    expect(tienePermiso({ usuario: usuarioContador, permisoId: 'ventas.gre.emitir', rolesDisponibles: rolesConfigurados, establecimientoId: ESTABLECIMIENTO_1 })).toBe(false);
  });

  it('retirar "ventas.gre.emitir" de un rol personalizado bloquea de inmediato la posibilidad de anular/eliminar/duplicar, conservando solo lectura', () => {
    const rolConEmitir = crearRolFixture({ id: 'rol-gre-x', permisos: ['ventas.gre.ver', 'ventas.gre.emitir'] });
    const rolSinEmitir = crearRolFixture({ id: 'rol-gre-x', permisos: ['ventas.gre.ver'] }); // mismo id — reemplaza la definición del rol
    const usuario = crearUsuarioFixture({ systemAccess: { username: 'ana', email: 'ana@empresa.test', roleIds: ['rol-gre-x'], roles: [], permissions: [] } });

    expect(tienePermiso({ usuario, permisoId: 'ventas.gre.emitir', rolesDisponibles: [rolConEmitir], establecimientoId: ESTABLECIMIENTO_1 })).toBe(true);
    expect(tienePermiso({ usuario, permisoId: 'ventas.gre.emitir', rolesDisponibles: [rolSinEmitir], establecimientoId: ESTABLECIMIENTO_1 })).toBe(false);
    expect(tienePermiso({ usuario, permisoId: 'ventas.gre.ver', rolesDisponibles: [rolSinEmitir], establecimientoId: ESTABLECIMIENTO_1 })).toBe(true);
  });
});
