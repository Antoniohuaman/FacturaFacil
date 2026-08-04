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
