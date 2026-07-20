// gestion-inventario/models/operacionIdempotenteInventario.types.ts
//
// Modelo aprobado en §9.5 del diseño técnico (docs/diseno-tecnico-kardex-valorizado-integracion-compras.md).
//
// La unicidad lógica real es SIEMPRE la combinación (empresaId, clave), nunca `clave` sola — ver
// gestion-inventario/repositories/operacionIdempotenteInventario.repository.ts.
//
// Invariantes por estado (Etapa 1B, corrección estructural respecto a la Etapa 1A —
// `transaccionInventarioId` deja de ser obligatorio desde la reserva inicial, ver §4.1 del
// encargo de Etapa 1B), validadas por el repositorio antes de escribir:
// - 'preparada': puede no tener todavía `transaccionInventarioId` (la reserva es la primera
//   escritura real, ocurre ANTES de crear la TransaccionInventario que la enlaza después).
// - 'confirmada': debe tener `transaccionInventarioId` Y `fechaConfirmacion` — nunca queda
//   "confirmada" sin ambos datos.
// - 'fallida': nunca debe conservar `resultadoIds` no vacíos (fingiría resultados que nunca se
//   aplicaron realmente).
// - 'revertida': solo alcanzable desde 'confirmada' (una operación nunca confirmada no puede
//   "revertirse" — no hay nada que revertir), en una etapa futura con reverso real.

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

  /**
   * FK al INTENTO ACTIVO (o al último confirmado) del diario — nunca "la" transacción de esta
   * operación en singular, porque una operación puede tener varios intentos históricos
   * (`TransaccionInventario.numeroIntento`, Bloqueante 2 de la revisión de Etapa 1B). Semántica
   * exacta por estado:
   * - 'preparada' sin intento activo todavía: `undefined` (la reserva es anterior a crear la
   *   transacción — exigirlo desde el inicio sería una contradicción estructural).
   * - 'preparada' con un intento activo en curso: apunta a ESE intento (`preparada`/`confirmando`).
   * - 'confirmada': apunta al intento que se confirmó (obligatorio, validado por el repositorio).
   * - 'fallida': conserva el id del último intento fallido (valor de auditoría, no de trabajo
   *   pendiente) hasta que `marcarOperacionParaReintento` lo limpia explícitamente al preparar un
   *   reintento seguro.
   * El historial COMPLETO de intentos nunca vive aquí — se consulta siempre desde
   * `transaccionInventario.repository.ts` por `operacionIdempotenteId`, la fuente de verdad.
   */
  transaccionInventarioId?: string;

  fechaCreacion: string;
  fechaConfirmacion?: string;
  error?: string;
}
