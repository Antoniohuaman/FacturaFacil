export interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  unidad: 'UNIDAD' | 'DOCENA' | 'KILOGRAMO' | 'LITRO' | 'METRO';
  precio: number;
  precioConIgv: number;
  igv: number;
  cantidad: number;
  categoria: string;
  stock: number;
  stockMinimo: number;
  descripcion?: string;
  imagen?: string;
  activo: boolean;
  fechaCreacion: Date;
  fechaActualizacion: Date;
  variantes?: ProductoVariante[];
}

export interface ProductoVariante {
  id: string;
  nombre: string;
  precio: number;
  stock: number;
  sku: string;
}

export interface MovimientoKardex {
  id: string;
  fecha: Date;
  tipoMovimiento: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
  documento: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
  saldoCantidad: number;
  saldoValor: number;
}

export interface ResumenStock {
  totalProductos: number;
  totalStock: number;
  valorInventario: number;
  productosStockBajo: number;
  productosAgotados: number;
}

export interface FiltrosProducto {
  busqueda: string;
  categoria: string;
  activo?: boolean;
}

export interface PaginacionState {
  pagina: number;
  totalPaginas: number;
  itemsPorPagina: number;
  totalItems: number;
}