import { CATALOGO_PERMISOS } from './catalogoPermisos';
import type { IdPermiso, RolDelSistema } from './tiposRolesPermisos';

export const ID_ROL_ADMINISTRADOR = 'rol-administrador';
export const ID_ROL_VENDEDOR = 'rol-vendedor';
export const ID_ROL_CONTADOR = 'rol-contador';

const permisosAdministrador: IdPermiso[] = CATALOGO_PERMISOS.map((permiso) => permiso.id);

const permisosVendedor: IdPermiso[] = [
  'ventas.comprobantes.ver',
  'ventas.comprobantes.emitir',
  'ventas.comprobantes.borradores.ver',
  'ventas.comprobantes.borradores.duplicar',
  'ventas.comprobantes.borradores.eliminar',
  'ventas.pos.ver',
  'ventas.pos.vender',
  'ventas.pos.imprimir',
  'ventas.documentos.crear',
  'ventas.documentos.editar',
  'clientes.ver',
  'clientes.crear',
  'clientes.editar',
  'clientes.importar',
  'cobranzas.ver',
  'cobranzas.registrar',
  'caja.ver',
  'caja.abrir',
  'caja.cerrar',
  'caja.movimientos.registrar',
  'catalogo.ver',
  'precios.ver',
];

const permisosContador: IdPermiso[] = [
  'ventas.comprobantes.ver',
  'indicadores.ver',
  'cobranzas.ver',
  'caja.ver',
];

export const ROLES_DEL_SISTEMA: RolDelSistema[] = [
  {
    id: ID_ROL_ADMINISTRADOR,
    nombre: 'Administrador',
    descripcion: 'Acceso completo al sistema, incluyendo configuracion y gestion.',
    permisos: permisosAdministrador,
  },
  {
    id: ID_ROL_VENDEDOR,
    nombre: 'Vendedor',
    descripcion: 'Venta completa, cobranzas y caja, con gestion basica de clientes.',
    permisos: permisosVendedor,
  },
  {
    id: ID_ROL_CONTADOR,
    nombre: 'Contador',
    descripcion: 'Consulta de comprobantes e indicadores con acceso de lectura a cobranzas y caja.',
    permisos: permisosContador,
  },
];

export const MAPA_ROLES_DEL_SISTEMA: Record<string, RolDelSistema> =
  ROLES_DEL_SISTEMA.reduce<Record<string, RolDelSistema>>((acc, rol) => {
    acc[rol.id] = rol;
    return acc;
  }, {});

export const obtenerRolesDelSistema = (ids: string[]): RolDelSistema[] => {
  const vistos = new Set<string>();
  return ids
    .map((id) => MAPA_ROLES_DEL_SISTEMA[id])
    .filter((rol): rol is RolDelSistema => Boolean(rol))
    .filter((rol) => {
      if (vistos.has(rol.id)) return false;
      vistos.add(rol.id);
      return true;
    });
};
