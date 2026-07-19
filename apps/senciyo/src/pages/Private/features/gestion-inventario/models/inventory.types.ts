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
 * Tipo de documento de origen estructurado de un MovimientoStock (§10.6 del diseño aprobado) —
 * en paralelo al `documentoReferencia` de texto existente, sin reemplazarlo.
 */
export type TipoDocumentoOrigenMovimiento =
  | 'comprobante_compra' | 'nota_ingreso' | 'nota_salida' | 'ajuste' | 'importacion'
  | 'transferencia' | 'venta' | 'nota_credito' | 'migracion';

/** Estado estructural del movimiento (§10.6) — 'confirmado' es el valor asumido para movimientos históricos que no tienen este campo. */
export type EstadoMovimientoStock = 'confirmado' | 'revertido';

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
  EstablecimientoId: string;
  EstablecimientoCodigo: string;
  EstablecimientoNombre: string;
  // Campos para transferencias entre almacenes
  esTransferencia?: boolean;
  transferenciaId?: string; // ID único que vincula origen y destino
  tipoTransferencia?: 'INTRA_ESTABLECIMIENTO' | 'INTER_ESTABLECIMIENTO';
  almacenOrigenId?: string;
  almacenOrigenNombre?: string;
  almacenDestinoId?: string;
  almacenDestinoNombre?: string;
  movimientoRelacionadoId?: string; // ID del movimiento complementario

  // --- Campos estructurales del Kardex Valorizado (§10.6, Etapa 1A) — puramente aditivos y
  // opcionales para compatibilidad con movimientos históricos; NINGÚN campo monetario (el valor
  // económico vive en CapaCostoInventario/ConsumoCapaCostoInventario, §9.1). Ausentes en todos
  // los movimientos existentes hasta que un consumidor real los complete (Etapa 1C en adelante) —
  // esta etapa no modifica ningún servicio que cree MovimientoStock. ---
  /** Aislamiento multiempresa explícito en el dato — ausente en movimientos históricos (su único aislamiento sigue siendo el namespace de `localStorage`, no reconstruible retroactivamente). */
  empresaId?: string;
  /** FK real, en paralelo al `documentoReferencia` de texto existente. */
  documentoOrigenId?: string;
  tipoDocumentoOrigen?: TipoDocumentoOrigenMovimiento;
  lineaOrigenId?: string;
  /** Para ENTRADA: referencia 1:1 a la CapaCostoInventario creada. Para SALIDA: no se usa (la relación es 1:N vía ConsumoCapaCostoInventario.movimientoSalidaId). */
  capaId?: string;
  /** Ausente equivale a 'confirmado' (compatibilidad con movimientos históricos). */
  estado?: EstadoMovimientoStock;
  movimientoReversoDeId?: string;
  claveIdempotencia?: string;
}

/**
 * Estados de alerta de stock
 */
export type EstadoAlerta = 'SIN_STOCK' | 'CRITICO' | 'BAJO' | 'NORMAL' | 'EXCESO';

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
  EstablecimientoId: string;
  EstablecimientoCodigo: string;
  EstablecimientoNombre: string;
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
export type InventoryView = 'situacion' | 'movimientos' | 'transferencias' | 'alertas' | 'importar' | 'notas-ingreso' | 'notas-salida';

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
  /** BRECHA-01: cuando el producto no está disponible en el establecimiento destino y el usuario confirmó habilitarlo */
  habilitarProductoEnDestino?: boolean;
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
