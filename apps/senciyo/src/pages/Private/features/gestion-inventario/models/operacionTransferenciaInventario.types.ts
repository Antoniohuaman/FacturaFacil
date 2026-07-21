// gestion-inventario/models/operacionTransferenciaInventario.types.ts
//
// Contrato de la operación de TRANSFERENCIA entre almacenes (Etapa 1E). A diferencia del
// contrato cuantitativo compartido por entrada/salida (`operacionEntradaInventario.types.ts`,
// líneas con un único `almacenId`), una transferencia necesita origen Y destino en la MISMA
// operación — por eso es un contrato hermano, no una reutilización forzada del mismo tipo.
//
// Documento de UN producto (mantiene el diseño actual de `Transferencia` — no se amplía a
// múltiples productos por transferencia). `modoOperacion` se mantiene en `'cuantitativo'` como
// única variante ACEPTADA por el llamador: la variante valorizada (consumo FIFO de capas en
// origen + creación de capas en destino) se activa automáticamente, dentro del motor, cuando el
// almacén origen tiene capas de costo disponibles para este producto — nunca por un flag que el
// consumidor deba fijar ni activar. Mientras ninguna empresa tenga capas (situación de HOY, ya
// que la valorización no está activada en ningún flujo productivo), el motor opera exactamente
// en modo cuantitativo, de forma transparente.

import type {
  ReferenciaDocumentoTipoOperacionIdempotente,
  TipoOperacionIdempotenteInventario,
} from './operacionIdempotenteInventario.types';
import type { MovimientoMotivo } from './inventory.types';

/**
 * Unidad transaccional e idempotente de una transferencia: origen y destino se mueven en la
 * MISMA operación — nunca confirmar primero la salida y después la entrada (§2/§3 del encargo
 * de Etapa 1E).
 */
export interface DatosTransferenciaInventario {
  modoOperacion: 'cuantitativo';
  empresaId: string;
  /** Identidad real del documento Transferencia — debe existir ANTES de mutar stock (UUID técnico o mecanismo ya aprobado, nunca un timestamp por segundo). */
  transferenciaId: string;
  /** Siempre `TRANSFER-${transferenciaId}` — nunca fabricada de otra forma por el consumidor. */
  claveIdempotencia: string;
  tipoOperacion: TipoOperacionIdempotenteInventario;
  tipoDocumento: ReferenciaDocumentoTipoOperacionIdempotente;

  productoId: string;

  establecimientoOrigenId: string;
  almacenOrigenId: string;
  establecimientoDestinoId: string;
  almacenDestinoId: string;

  /** Ya ajustada a `PRECISION_CANTIDAD_UNIDAD_MINIMA` por el llamador — el motor valida, nunca redondea en silencio. */
  cantidadUnidadMinima: number;

  usuario: string;
  /** ISO 8601 — inyectada por el llamador (nunca `new Date()` directo dentro del motor). */
  fecha: string;
  motivo: MovimientoMotivo;
  observaciones?: string;
  documentoReferencia?: string;
}
