// src/features/catalogo-articulos/models/types.ts

export interface Product {
  id: string;
  codigo: string;
  nombre: string;
  unidad: 'DOCENA' | 'UNIDAD' | 'KILOGRAMO' | 'LITRO' | 'METRO';
  precio: number;
  cantidad: number;
  categoria: string;
  imagen?: string;
  conImpuestos: boolean;
  impuesto?: string;
  descripcion?: string;
  fechaCreacion: Date;
  fechaActualizacion: Date;
}

export interface Category {
  id: string;
  nombre: string;
  descripcion?: string;
  color?: string;
  productCount: number;
  fechaCreacion: Date;
}

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
  conImpuestos?: boolean;
  rangoPrecios: {
    min: number;
    max: number;
  };
  ordenarPor: 'nombre' | 'precio' | 'cantidad' | 'fechaCreacion';
  direccion: 'asc' | 'desc';
}

export interface ProductFormData {
  nombre: string;
  codigo: string;
  precio: number;
  unidad: 'DOCENA' | 'UNIDAD' | 'KILOGRAMO' | 'LITRO' | 'METRO';
  categoria: string;
  cantidad: number;
  conImpuestos: boolean;
  impuesto?: string;
  descripcion?: string;
  imagen?: File | string;
}

export interface TableColumn {
  key: string;
  label: string;
  sortable: boolean;
  filterable: boolean;
  type: 'text' | 'number' | 'currency' | 'select' | 'date';
}

export type TabKey = 'productos' | 'paquetes' | 'categorias' | 'importar';

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