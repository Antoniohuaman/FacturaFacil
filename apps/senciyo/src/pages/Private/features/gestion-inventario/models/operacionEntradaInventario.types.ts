// gestion-inventario/models/operacionEntradaInventario.types.ts
//
// Contrato cuantitativo compartido por los motores de ENTRADA (Etapa 1C, §6) y SALIDA (Etapa 1D,
// §7). Única variante implementada: 'cuantitativo' (sin costo, sin capas) — 'valorizado' queda
// reservado como nombre para una etapa futura y se rechaza en tiempo de ejecución (ver
// `validarContrato` en utils/operacionCuantitativaInventarioComun.ts) para que ningún consumidor
// productivo lo use por error antes de que exista una implementación real.
//
// `DatosOperacionEntradaCuantitativa`/`DatosOperacionSalidaCuantitativa` son alias del mismo
// contrato base (§7 de la Etapa 1D: "evita duplicar tipos de 1C... solo crea un tipo nuevo cuando
// exista una diferencia real de dominio") — la única diferencia entre una entrada y una salida es
// el signo que el motor deriva de `tipoOperacion`, nunca la forma del contrato. Mantener dos
// nombres (en vez de uno solo) es puramente para que cada dominio importe el nombre que describe
// su intención en el código que lo usa.

import type {
  ReferenciaDocumentoTipoOperacionIdempotente,
  TipoOperacionIdempotenteInventario,
} from './operacionIdempotenteInventario.types';
import type { MovimientoMotivo } from './inventory.types';

export type ModoOperacionEntradaInventario = 'cuantitativo' | 'valorizado';

/**
 * Contexto de liberación de una reserva de Orden de Venta (Etapa 1D, §13.C) — presente ÚNICAMENTE
 * en líneas de salida que despachan una reserva ya existente (p. ej. una Nota de Salida vinculada
 * a una OV). Ausente en cualquier otra línea (entradas, ventas sin reserva, ajustes): el motor
 * nunca inventa ni asume una reserva que la línea no declara explícitamente.
 */
export interface LiberacionReservaOV {
  establecimientoId: string;
  /** Cantidad de la reserva a liberar — el motor rechaza el documento completo si excede la reserva vigente o el total despachado del producto en la misma operación (corrección post-1D, §2: nunca se corrige en silencio con `Math.max(0, ...)`). */
  cantidad: number;
}

/**
 * Liberación de reserva OV legacy (arquitectura previa, por almacén — `stockReservadoPorAlmacen`,
 * sin `establecimientoId`). Reutiliza siempre el `almacenId` de la MISMA línea (el almacén físico
 * de despacho): una liberación legacy nunca declara un almacén distinto al que la línea descuenta.
 * Corrección post-1D, §2: antes se aplicaba en una escritura Zustand separada
 * (`liberarReservasDeOV`) después de confirmar — ahora vive en el mismo plan atómico.
 */
export interface LiberacionReservaLegacyOV {
  /** Cantidad de la reserva legacy a liberar — mismas reglas de rechazo que `LiberacionReservaOV`. */
  cantidad: number;
}

/** Línea sin costo — solo modifica cantidad (§6/§7). */
export interface DatosLineaOperacionCuantitativa {
  lineaId: string;
  productoId: string;
  almacenId: string;
  /** Ya ajustada a `PRECISION_CANTIDAD_UNIDAD_MINIMA` por el llamador — el motor valida, nunca redondea en silencio. */
  cantidadUnidadMinima: number;
  /** Solo cuando esta línea de SALIDA despacha una reserva nueva (por establecimiento) de Orden de Venta existente (§13.C). */
  liberarReservaOV?: LiberacionReservaOV;
  /** Solo cuando esta línea de SALIDA despacha una reserva LEGACY (por almacén) de Orden de Venta existente (corrección post-1D, §2). */
  liberarReservaLegacyOV?: LiberacionReservaLegacyOV;
}

/**
 * Unidad transaccional e idempotente: el DOCUMENTO completo. Todas sus líneas se reservan,
 * preparan y confirman juntas — nunca una reserva/confirmación por línea (§8/§11, regla
 * fundamental de 1C y 1D).
 *
 * `tipoOperacion` y `tipoDocumento` cubren dos dimensiones distintas ya existentes en
 * `OperacionIdempotenteInventario` (Etapa 1A/1B): `tipoOperacion` identifica QUÉ clase de
 * operación idempotente es (p. ej. 'ni_automatica' vs 'venta_salida' vs 'ajuste_negativo'),
 * mientras `tipoDocumento` identifica el documento de origen real. Reutilizar ambos tipos
 * existentes evita crear un segundo contrato equivalente.
 */
export interface DatosOperacionCuantitativa {
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

/** Alias de dominio (Etapa 1C) — misma forma que `DatosOperacionCuantitativa`, nunca duplicada. */
export type DatosOperacionEntradaCuantitativa = DatosOperacionCuantitativa;

/** Alias de dominio (Etapa 1D) — misma forma que `DatosOperacionCuantitativa`, nunca duplicada. */
export type DatosOperacionSalidaCuantitativa = DatosOperacionCuantitativa;
