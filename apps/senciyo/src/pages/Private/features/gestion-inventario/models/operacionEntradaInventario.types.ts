// gestion-inventario/models/operacionEntradaInventario.types.ts
//
// Contrato de entrada cuantitativa del motor central de Etapa 1C (§6 del encargo). Única variante
// implementada: 'cuantitativo' (sin costo, sin capas) — 'valorizado' queda reservado como nombre
// para una etapa futura y se rechaza en tiempo de ejecución (ver `validarContrato` en
// utils/entradaCuantitativaInventario.ts) para que ningún consumidor productivo lo use por error
// antes de que exista una implementación real.

import type {
  ReferenciaDocumentoTipoOperacionIdempotente,
  TipoOperacionIdempotenteInventario,
} from './operacionIdempotenteInventario.types';
import type { MovimientoMotivo } from './inventory.types';

export type ModoOperacionEntradaInventario = 'cuantitativo' | 'valorizado';

/** Línea sin costo — solo modifica cantidad (§6). */
export interface DatosLineaOperacionCuantitativa {
  lineaId: string;
  productoId: string;
  almacenId: string;
  /** Ya ajustada a `PRECISION_CANTIDAD_UNIDAD_MINIMA` por el llamador — el motor valida, nunca redondea en silencio. */
  cantidadUnidadMinima: number;
}

/**
 * Unidad transaccional e idempotente: el DOCUMENTO completo. Todas sus líneas se reservan,
 * preparan y confirman juntas — nunca una reserva/confirmación por línea (§8, regla fundamental).
 *
 * `tipoOperacion` y `tipoDocumento` cubren dos dimensiones distintas ya existentes en
 * `OperacionIdempotenteInventario` (Etapa 1A/1B): `tipoOperacion` identifica QUÉ clase de
 * operación idempotente es (p. ej. 'ni_automatica' vs 'anulacion' para el mismo tipo de
 * documento), mientras `tipoDocumento` identifica el documento de origen real. Reutilizar ambos
 * tipos existentes evita crear un segundo contrato equivalente.
 */
export interface DatosOperacionEntradaCuantitativa {
  modoOperacion: 'cuantitativo';
  empresaId: string;
  documentoId: string;
  tipoDocumento: ReferenciaDocumentoTipoOperacionIdempotente;
  tipoOperacion: TipoOperacionIdempotenteInventario;
  claveIdempotencia: string;
  usuario: string;
  /** ISO 8601 — inyectada por el llamador (nunca `new Date()` directo dentro del motor). */
  fecha: string;
  motivo: MovimientoMotivo;
  observaciones?: string;
  documentoReferencia?: string;
  lineas: DatosLineaOperacionCuantitativa[];
}
