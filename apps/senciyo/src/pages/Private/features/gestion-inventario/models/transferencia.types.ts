// src/features/gestion-inventario/models/transferencia.types.ts

export type EstadoTransferencia =
  | 'PENDIENTE'
  | 'EN_TRANSITO'
  | 'CONFIRMADA'
  | 'RECIBIDA'
  | 'CANCELADA'
  | 'ANULADA';

/**
 * Entidad que agrupa una operación de transferencia entre almacenes.
 * Puede representar una transferencia intra o inter establecimiento.
 * Los movimientos Kardex (SALIDA + ENTRADA) están vinculados por esta entidad.
 */
export interface Transferencia {
  id: string; // TRF-YYYYMMDD-HHmmss
  fecha: Date;
  fechaDespacho?: Date;
  fechaRecepcion?: Date;
  fechaAnulacion?: Date;

  productoId: string;
  productoCodigo: string;
  productoNombre: string;

  almacenOrigenId: string;
  almacenOrigenNombre: string;
  establecimientoOrigenId: string;
  establecimientoOrigenNombre: string;

  almacenDestinoId: string;
  almacenDestinoNombre: string;
  establecimientoDestinoId: string;
  establecimientoDestinoNombre: string;

  cantidad: number;
  tipoTransferencia: 'INTRA_ESTABLECIMIENTO' | 'INTER_ESTABLECIMIENTO';
  estado: EstadoTransferencia;

  documentoReferencia?: string;
  observaciones?: string;
  usuario: string;

  movimientoSalidaId?: string;
  movimientoEntradaId?: string;
}
