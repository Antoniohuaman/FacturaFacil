// src/features/catalogo-articulos/models/types.ts

export interface Product {
  id: string;
  codigo: string;
  nombre: string;
  unidad: 'DOCENA' | 'UNIDAD' | 'KILOGRAMO' | 'LITRO' | 'METRO';
  precio: number;
  categoria: string;
  imagen?: string;
  impuesto?: string;
  descripcion?: string;
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
  unidad: 'DOCENA' | 'UNIDAD' | 'KILOGRAMO' | 'LITRO' | 'METRO';
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