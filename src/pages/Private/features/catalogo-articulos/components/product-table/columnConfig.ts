export type ColumnKey =
  | 'favorito'
  | 'codigo'
  | 'nombre'
  | 'establecimiento'
  | 'categoria'
  | 'imagen'
  | 'unidad'
  | 'descripcion'
  | 'alias'
  | 'impuesto'
  | 'precioCompra'
  | 'porcentajeGanancia'
  | 'codigoBarras'
  | 'codigoFabrica'
  | 'codigoSunat'
  | 'descuentoProducto'
  | 'marca'
  | 'modelo'
  | 'peso'
  | 'tipoExistencia'
  | 'fechaCreacion'
  | 'fechaActualizacion';

export interface ColumnConfig {
  key: ColumnKey;
  label: string;
  defaultVisible: boolean;
  filterable: boolean;
  group: 'basicas' | 'codigos' | 'financieras' | 'caracteristicas' | 'visuales' | 'sistema';
}

export const AVAILABLE_COLUMNS: ColumnConfig[] = [
  { key: 'favorito', label: 'Fav', defaultVisible: true, filterable: false, group: 'basicas' },
  { key: 'codigo', label: 'Código', defaultVisible: true, filterable: false, group: 'basicas' },
  { key: 'nombre', label: 'Nombre', defaultVisible: true, filterable: false, group: 'basicas' },
  { key: 'establecimiento', label: 'Disponibilidad', defaultVisible: true, filterable: false, group: 'basicas' },
  { key: 'categoria', label: 'Categoría', defaultVisible: true, filterable: true, group: 'basicas' },
  { key: 'unidad', label: 'Unidad', defaultVisible: true, filterable: true, group: 'basicas' },
  { key: 'descripcion', label: 'Descripción', defaultVisible: false, filterable: false, group: 'basicas' },
  { key: 'alias', label: 'Alias', defaultVisible: false, filterable: true, group: 'basicas' },
  { key: 'impuesto', label: 'Impuesto', defaultVisible: false, filterable: true, group: 'basicas' },
  { key: 'imagen', label: 'Imagen', defaultVisible: false, filterable: false, group: 'visuales' },
  { key: 'codigoBarras', label: 'Código Barras', defaultVisible: false, filterable: true, group: 'codigos' },
  { key: 'codigoFabrica', label: 'Código Fábrica', defaultVisible: false, filterable: true, group: 'codigos' },
  { key: 'codigoSunat', label: 'Código SUNAT', defaultVisible: false, filterable: true, group: 'codigos' },
  { key: 'precioCompra', label: 'Precio Compra', defaultVisible: false, filterable: false, group: 'financieras' },
  { key: 'porcentajeGanancia', label: '% Ganancia', defaultVisible: false, filterable: false, group: 'financieras' },
  { key: 'descuentoProducto', label: '% Descuento', defaultVisible: false, filterable: false, group: 'financieras' },
  { key: 'marca', label: 'Marca', defaultVisible: false, filterable: true, group: 'caracteristicas' },
  { key: 'modelo', label: 'Modelo', defaultVisible: false, filterable: true, group: 'caracteristicas' },
  { key: 'peso', label: 'Peso (kg)', defaultVisible: false, filterable: false, group: 'caracteristicas' },
  { key: 'tipoExistencia', label: 'Tipo de Existencia', defaultVisible: false, filterable: true, group: 'caracteristicas' },
  { key: 'fechaCreacion', label: 'Fecha Creación', defaultVisible: false, filterable: false, group: 'sistema' },
  { key: 'fechaActualizacion', label: 'Última Actualización', defaultVisible: false, filterable: false, group: 'sistema' }
];

export const COLUMN_GROUP_LABELS = {
  visuales: 'Elementos Visuales',
  basicas: 'Información Básica',
  codigos: 'Códigos',
  financieras: 'Información Financiera',
  caracteristicas: 'Características del Producto',
  sistema: 'Información del Sistema'
} as const;

export const COLUMN_CONFIG_VERSION = '2.3';
