// src/features/gestion-inventario/models/transferencia.types.ts

export type EstadoTransferencia =
  | 'PENDIENTE'
  | 'EN_TRANSITO'
  | 'CONFIRMADA'
  | 'RECIBIDA'
  | 'CANCELADA'
  | 'ANULADA'
  | 'REVERTIDA';

/**
 * Entidad que agrupa una operación de transferencia entre almacenes.
 * Puede representar una transferencia intra o inter establecimiento.
 * Los movimientos Kardex (SALIDA + ENTRADA) están vinculados por esta entidad.
 *
 * Campos añadidos en Etapa 1E (motor `transferirStockValorizado` /
 * `revertirMovimientoValorizado` de ServicioKardexValorizado): `empresaId` (aislamiento por
 * tenant, requerido para toda transferencia creada por el motor nuevo — las filas legacy
 * anteriores a 1E pueden no tenerlo), `capasOrigenIds`/`capasDestinoIds` (linaje de capas de
 * costo cuando la transferencia corrió en modo valorizado — ausentes en modo cuantitativo, nunca
 * inventados), `movimientoReversoSalidaId`/`movimientoReversoEntradaId` (los DOS movimientos de
 * reverso creados al revertir la transferencia — nunca se edita `movimientoSalidaId`/
 * `movimientoEntradaId` originales).
 */
export interface Transferencia {
  id: string; // TRF-YYYYMMDD-HHmmss
  /** Requerido para toda transferencia creada por el motor de Etapa 1E — ausente en filas legacy previas. */
  empresaId?: string;
  fecha: Date;
  fechaDespacho?: Date;
  fechaRecepcion?: Date;
  fechaAnulacion?: Date;
  fechaReversion?: Date;

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

  /** Linaje de capas de costo consumidas en el almacén origen — solo presente en modo valorizado (Etapa 1E). */
  capasOrigenIds?: string[];
  /** Linaje de capas de costo creadas en el almacén destino — solo presente en modo valorizado (Etapa 1E). */
  capasDestinoIds?: string[];
  /** Movimiento de reverso de la SALIDA original, creado al revertir la transferencia (Etapa 1E). */
  movimientoReversoSalidaId?: string;
  /** Movimiento de reverso de la ENTRADA original, creado al revertir la transferencia (Etapa 1E). */
  movimientoReversoEntradaId?: string;
}
