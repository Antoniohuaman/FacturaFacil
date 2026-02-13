export type IdPermiso = string;

export type ModuloPermiso =
  | 'ventas'
  | 'clientes'
  | 'cobranzas'
  | 'caja'
  | 'inventario'
  | 'catalogo'
  | 'precios'
  | 'indicadores'
  | 'configuracion'
  | 'notificaciones';

export interface PermisoCatalogo {
  id: IdPermiso;
  nombre: string;
  descripcion: string;
  modulo: ModuloPermiso;
  rutas?: string[];
}

export interface RolDelSistema {
  id: string;
  nombre: string;
  descripcion: string;
  permisos: IdPermiso[];
}

export type TipoRolConfiguracion = 'SISTEMA' | 'PERSONALIZADO';

export interface RolConfiguracion {
  id: string;
  nombre: string;
  descripcion: string;
  permisos: IdPermiso[];
  tipo: TipoRolConfiguracion;
}

export type RolPersonalizado = RolConfiguracion & { tipo: 'PERSONALIZADO' };
