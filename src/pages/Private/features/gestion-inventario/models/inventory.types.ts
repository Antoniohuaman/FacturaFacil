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
  almacenId: string;
  almacenCodigo: string;
  almacenNombre: string;
  // Datos del establecimiento (desnormalizados para referencia)
  establishmentId: string;
  establishmentCodigo: string;
  establishmentNombre: string;
  // Campos para transferencias entre almacenes
  esTransferencia?: boolean;
  transferenciaId?: string; // ID único que vincula origen y destino
  almacenOrigenId?: string;
  almacenOrigenNombre?: string;
  almacenDestinoId?: string;
  almacenDestinoNombre?: string;
  movimientoRelacionadoId?: string; // ID del movimiento complementario
}

/**
 * Estados de alerta de stock
 */
export type EstadoAlerta = 'CRITICO' | 'BAJO' | 'NORMAL' | 'EXCESO';

/**
 * Categorías simplificadas para las alertas de stock
 */
export type StockAlertType = 'LOW' | 'OK' | 'OVER';

/**
 * Alerta de stock
 */
export interface StockAlert {
  productoId: string;
  productoCodigo: string;
  productoNombre: string;
  /** Stock disponible (real - reservado) en el alcance evaluado */
  cantidadActual: number;
  /** Stock real antes de reservar unidades */
  cantidadReal?: number;
  /** Stock reservado asociado al alcance */
  cantidadReservada?: number;
  stockMinimo: number;
  stockMaximo?: number;
  estado: EstadoAlerta;
  alertType: Exclude<StockAlertType, 'OK'>;
  isCritical: boolean;
  almacenId: string;
  almacenCodigo: string;
  almacenNombre: string;
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
  almacenId?: string;
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
export type InventoryView = 'situacion' | 'movimientos' | 'alertas' | 'resumen';

/**
 * Período de filtro
 */
export type FilterPeriod = 'hoy' | 'semana' | 'mes' | 'todo';

/**
 * Datos para ajuste de stock
 */
export interface StockAdjustmentData {
  productoId: string;
  almacenId: string;
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
  almacenOrigenId: string;
  almacenDestinoId: string;
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
    almacenId: string;
    cantidad: number;
  }>;
  tipo: 'AJUSTE_POSITIVO' | 'AJUSTE_NEGATIVO';
  motivo: MovimientoMotivo;
  observaciones?: string;
}
