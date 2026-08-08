import { describe, expect, it } from 'vitest';
import { CATALOGO_PERMISOS } from './catalogoPermisos';
import { ROLES_DEL_SISTEMA, ID_ROL_ADMINISTRADOR, ID_ROL_VENDEDOR, ID_ROL_CONTADOR } from './rolesDelSistema';

// CFG-29..32 (encargo de centralización 2026-08-05, §15): `inventario.configurar` es el permiso
// real que gatea activar/desactivar el control de existencias y editar reglas de documento en la
// nueva página central — nunca un chequeo por nombre de rol.
describe('catálogo de permisos — inventario.configurar', () => {
  it('CFG-29: existe exactamente una vez en el catálogo, con modulo="inventario"', () => {
    const coincidencias = CATALOGO_PERMISOS.filter((p) => p.id === 'inventario.configurar');
    expect(coincidencias).toHaveLength(1);
    expect(coincidencias[0].modulo).toBe('inventario');
  });

  it('nunca duplica un permiso equivalente ya existente del catálogo (ids únicos)', () => {
    const ids = CATALOGO_PERMISOS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('roles del sistema — inventario.configurar', () => {
  const rol = (id: string) => ROLES_DEL_SISTEMA.find((r) => r.id === id)!;

  it('CFG-30: Administrador incluye inventario.configurar (hereda el catálogo completo)', () => {
    expect(rol(ID_ROL_ADMINISTRADOR).permisos).toContain('inventario.configurar');
  });

  it('CFG-31: Vendedor y Contador NO incluyen inventario.configurar por defecto (acción de configuración, no operativa)', () => {
    expect(rol(ID_ROL_VENDEDOR).permisos).not.toContain('inventario.configurar');
    expect(rol(ID_ROL_CONTADOR).permisos).not.toContain('inventario.configurar');
  });

  it('CFG-32: Administrador también incluye los permisos ya existentes de valorización y costos (ningún regreso al catálogo previo)', () => {
    const permisos = rol(ID_ROL_ADMINISTRADOR).permisos;
    expect(permisos).toContain('inventario.valorizacion.configurar');
    expect(permisos).toContain('inventario.valorizacion.confirmar_costos');
    expect(permisos).toContain('inventario.valorizacion.activar');
    expect(permisos).toContain('inventario.costos.ver');
    expect(permisos).toContain('inventario.ver');
  });
});
