// src/features/catalogo-articulos/models/types.ts

export interface AdditionalUnitMeasure {
  unidadCodigo: string;
  factorConversion: number;
}

export interface Product {
  id: string;
  codigo: string;
  nombre: string;
  unidad: string;
  precio: number;
  categoria: string;
  imagen?: string;
  impuesto?: string;
  descripcion?: string;
  unidadesMedidaAdicionales?: AdditionalUnitMeasure[];
  // Asignación de establecimientos
  establecimientoIds: string[]; // Array de IDs de establecimientos
  disponibleEnTodos: boolean; // Si está disponible en todos los establecimientos
  // Campos avanzados
  alias?: string;
  precioCompra?: number;
  porcentajeGanancia?: number;
  codigoBarras?: string;
  codigoFabrica?: string;
  codigoSunat?: string;
  descuentoProducto?: number;
  marca?: string;
  modelo?: string;
  peso?: number;
  tipoExistencia?: 'MERCADERIAS' | 'PRODUCTOS_TERMINADOS' | 'SERVICIOS' | 'MATERIAS_PRIMAS' | 'ENVASES' | 'MATERIALES_AUXILIARES' | 'SUMINISTROS' | 'REPUESTOS' | 'EMBALAJES' | 'OTROS';
  // Compatibilidad con módulos de inventario/ventas (no usada en UI de catálogo)
  cantidad?: number; // Stock general opcional
  stockPorEstablecimiento?: Record<string, number>; // Stock por establecimiento (compat)
  stockPorAlmacen?: Record<string, number>; // Stock por almacén (compat)
  stockMinimoPorAlmacen?: Record<string, number>; // Umbral mínimo por almacén (compat)
  stockMaximoPorAlmacen?: Record<string, number>; // Umbral máximo por almacén (compat)
  fechaCreacion: Date;
  fechaActualizacion: Date;
}

// Category moved to ConfigurationContext
// import type { Category } from '../../configuracion-sistema/context/ConfigurationContext';

export interface Package {
  id: string;
  nombre: string;
  descripcion?: string;
  productos: PackageProduct[];
  precio: number;
  descuento?: number;
  imagen?: string;
  fechaCreacion: Date;
}

export interface PackageProduct {
  productId: string;
  cantidad: number;
  precioUnitario: number;
}

export interface ImportConfig {
  tipo: 'basica' | 'completa';
  archivo?: File;
  mapeoColumnas: Record<string, string>;
  validaciones: boolean;
}

export interface FilterOptions {
  busqueda: string;
  categoria: string;
  unidad: string;
  rangoPrecios: {
    min: number;
    max: number;
  };
  // Nuevos filtros
  marca?: string;
  modelo?: string;
  impuesto?: string;
  ordenarPor: 'nombre' | 'precio' | 'fechaCreacion';
  direccion: 'asc' | 'desc';
}

export interface ProductFormData {
  nombre: string;
  codigo: string;
  precio: number;
  unidad: string;
  unidadesMedidaAdicionales: AdditionalUnitMeasure[];
  categoria: string;
  impuesto?: string;
  descripcion?: string;
  imagen?: File | string;
  // Asignación de establecimientos
  establecimientoIds: string[];
  disponibleEnTodos: boolean;
  // Campos avanzados
  alias?: string;
  precioCompra?: number;
  porcentajeGanancia?: number;
  codigoBarras?: string;
  codigoFabrica?: string;
  codigoSunat?: string;
  descuentoProducto?: number;
  marca?: string;
  modelo?: string;
  peso?: number;
  tipoExistencia?: 'MERCADERIAS' | 'PRODUCTOS_TERMINADOS' | 'SERVICIOS' | 'MATERIAS_PRIMAS' | 'ENVASES' | 'MATERIALES_AUXILIARES' | 'SUMINISTROS' | 'REPUESTOS' | 'EMBALAJES' | 'OTROS';
}

export interface TableColumn {
  key: string;
  label: string;
  sortable: boolean;
  filterable: boolean;
  type: 'text' | 'number' | 'currency' | 'select' | 'date';
}

export type TabKey = 'productos' | 'importar';

export interface TabConfig {
  key: TabKey;
  label: string;
  icon: string;
  component: React.ComponentType;
}

export interface PaginationConfig {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
}

// Configuración de columnas personalizables por empresa
export interface ProductColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  filterable: boolean;
  group: 'basicas' | 'codigos' | 'financieras' | 'caracteristicas' | 'visuales';
}

export interface ProductTableSettings {
  columns: ProductColumnConfig[];
  defaultFilters: Partial<FilterOptions>;
  defaultEstablishment: string;
  lastUpdated: Date;
}