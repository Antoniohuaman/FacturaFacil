// src/features/inventario/models/inventory.types.ts

/**
 * Tipos de movimientos de inventario
 */
export type MovimientoTipo =
  | 'ENTRADA'
  | 'SALIDA'
  | 'AJUSTE_POSITIVO'
  | 'AJUSTE_NEGATIVO'
  | 'DEVOLUCION'
  | 'MERMA'
  | 'TRANSFERENCIA';

/**
 * Motivos de los movimientos de inventario
 */
export type MovimientoMotivo =
  | 'COMPRA'
  | 'VENTA'
  | 'AJUSTE_INVENTARIO'
  | 'DEVOLUCION_CLIENTE'
  | 'DEVOLUCION_PROVEEDOR'
  | 'PRODUCTO_DAÑADO'
  | 'PRODUCTO_VENCIDO'
  | 'ROBO_PERDIDA'
  | 'TRANSFERENCIA_ALMACEN'
  | 'PRODUCCION'
  | 'MERMA'
  | 'OTRO';

/**
 * Movimiento de stock
 */
export interface MovimientoStock {
  id: string;
  productoId: string;
  productoCodigo: string;
  productoNombre: string;
  tipo: MovimientoTipo;
  motivo: MovimientoMotivo;
  cantidad: number;
  cantidadAnterior: number;
  cantidadNueva: number;
  usuario: string;
  observaciones?: string;
  documentoReferencia?: string;
  fecha: Date;
  ubicacion?: string;
  // Almacén donde se realizó el movimiento
  warehouseId: string;
  warehouseCodigo: string;
  warehouseNombre: string;
  // Datos del establecimiento (desnormalizados para referencia)
  establishmentId: string;
  establishmentCodigo: string;
  establishmentNombre: string;
  // Campos para transferencias entre almacenes
  esTransferencia?: boolean;
  transferenciaId?: string; // ID único que vincula origen y destino
  warehouseOrigenId?: string;
  warehouseOrigenNombre?: string;
  warehouseDestinoId?: string;
  warehouseDestinoNombre?: string;
  movimientoRelacionadoId?: string; // ID del movimiento complementario
}

/**
 * Estados de alerta de stock
 */
export type EstadoAlerta = 'CRITICO' | 'BAJO' | 'NORMAL' | 'EXCESO';

/**
 * Alerta de stock
 */
export interface StockAlert {
  productoId: string;
  productoCodigo: string;
  productoNombre: string;
  cantidadActual: number;
  stockMinimo: number;
  stockMaximo?: number;
  estado: EstadoAlerta;
  warehouseId: string;
  warehouseCodigo: string;
  warehouseNombre: string;
  // Datos del establecimiento (desnormalizados para referencia)
  establishmentId: string;
  establishmentCodigo: string;
  establishmentNombre: string;
  faltante?: number; // Cantidad que falta para llegar al mínimo
  excedente?: number; // Cantidad que sobra del máximo
}

/**
 * Resumen de stock
 */
export interface StockSummary {
  totalProductos: number;
  totalStock: number;
  valorTotalStock: number;
  productosSinStock: number;
  productosStockBajo: number;
  productosStockCritico: number;
  ultimaActualizacion: Date;
}

/**
 * Filtros para movimientos de stock
 */
export interface StockFilters {
  warehouseId?: string;
  fechaDesde?: Date;
  fechaHasta?: Date;
  tipoMovimiento?: MovimientoTipo | 'todos';
  busqueda?: string;
}

/**
 * Configuración de paginación
 */
export interface PaginationConfig {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
}

/**
 * Vista de inventario
 */
export type InventoryView = 'movimientos' | 'alertas' | 'resumen';

/**
 * Período de filtro
 */
export type FilterPeriod = 'hoy' | 'semana' | 'mes' | 'todo';

/**
 * Datos para ajuste de stock
 */
export interface StockAdjustmentData {
  productoId: string;
  warehouseId: string;
  tipo: MovimientoTipo;
  motivo: MovimientoMotivo;
  cantidad: number;
  observaciones: string;
  documentoReferencia: string;
}

/**
 * Datos para transferencia de stock
 */
export interface StockTransferData {
  productoId: string;
  warehouseOrigenId: string;
  warehouseDestinoId: string;
  cantidad: number;
  observaciones?: string;
  documentoReferencia?: string;
}

/**
 * Datos para actualización masiva de stock
 */
export interface MassStockUpdateData {
  updates: Array<{
    productoId: string;
    warehouseId: string;
    cantidad: number;
  }>;
  tipo: 'AJUSTE_POSITIVO' | 'AJUSTE_NEGATIVO';
  motivo: MovimientoMotivo;
  observaciones?: string;
}
