// gestion-inventario/models/operacionIdempotenteInventario.types.ts
//
// Modelo aprobado en §9.5 del diseño técnico (docs/diseno-tecnico-kardex-valorizado-integracion-compras.md).
// Etapa 1A: solo almacenamiento y consulta del ledger — NO implementa todavía generación
// criptográfica del hash, comparación de hash, `ConflictoIdempotencia`, reserva previa,
// reintentos, recuperación ni ejecución end-to-end (eso corresponde a la Etapa 1B en adelante).
//
// La unicidad lógica real es SIEMPRE la combinación (empresaId, clave), nunca `clave` sola — ver
// gestion-inventario/repositories/operacionIdempotenteInventario.repository.ts.

export type TipoOperacionIdempotenteInventario =
  | 'ni_automatica' | 'ni_confirmacion'
  | 'ajuste_positivo' | 'ajuste_negativo'
  | 'nota_salida' | 'venta_salida'
  | 'importacion' | 'transferencia'
  | 'anulacion' | 'reverso'
  | 'devolucion_cliente' | 'devolucion_proveedor'
  | 'valorizacion_inicial';

export type EstadoOperacionIdempotenteInventario = 'preparada' | 'confirmada' | 'fallida' | 'revertida';

export type ReferenciaDocumentoTipoOperacionIdempotente =
  | 'comprobante_compra' | 'nota_ingreso' | 'nota_salida' | 'venta' | 'ajuste' | 'importacion' | 'transferencia' | 'valorizacion_inicial';

export interface OperacionIdempotenteInventario {
  id: string;
  empresaId: string;
  /** Fórmula determinística por tipo de operación. La unicidad real, consultada y persistida, es SIEMPRE (empresaId, clave), nunca `clave` sola. */
  clave: string;
  tipoOperacion: TipoOperacionIdempotenteInventario;
  estado: EstadoOperacionIdempotenteInventario;

  /**
   * Hash determinístico (ej. SHA-256 sobre una serialización canónica) de los datos de entrada
   * que originaron esta operación. Permite distinguir un reintento legítimo (mismo hash →
   * devolver el resultado previo) de un conflicto de idempotencia (hash distinto bajo la misma
   * clave → error, nunca se reprocesa en silencio). Etapa 1A: solo se persiste/consulta — la
   * generación y comparación real del hash es Etapa 1B en adelante.
   */
  hashEntrada: string;

  referenciaDocumentoId: string;
  referenciaDocumentoTipo: ReferenciaDocumentoTipoOperacionIdempotente;

  /** Todo lo que esta operación generó — nunca un único id escalar (una entrada puede producir 1 movimiento + 1 capa; una salida, 1 movimiento + N consumos). */
  resultadoIds: string[];

  /** FK a la transacción del diario que ejecutó esta operación — permite auditar/recuperar el detalle completo de las escrituras. */
  transaccionInventarioId: string;

  fechaCreacion: string;
  fechaConfirmacion?: string;
  error?: string;
}
