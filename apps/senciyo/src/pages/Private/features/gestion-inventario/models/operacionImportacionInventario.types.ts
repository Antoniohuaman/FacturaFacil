// gestion-inventario/models/operacionImportacionInventario.types.ts
//
// Contrato de la operación de IMPORTACIÓN de stock desde archivo (Etapa 2, cierre de bloqueante 2
// de la revisión). A diferencia de entrada/salida (un único signo para todo el documento, resuelto
// por `tipoOperacion`), un lote de importación es genuinamente MIXTO: cada línea trae su propia
// `diferencia` firmada (positiva = entrada, negativa = salida, nunca cero — una línea sin cambio
// simplemente no se incluye) y el motor decide el signo POR LÍNEA. Por eso es un contrato hermano
// de `DatosOperacionCuantitativa`, no una reutilización forzada del mismo tipo (mismo criterio que
// ya aplicó `operacionTransferenciaInventario.types.ts` para transferencias).

import type { MovimientoMotivo } from './inventory.types';

export interface DatosLineaImportacionCuantitativa {
  /** Estable dentro del lote — `IMPORT-${loteId}-${numeroFila}` (ver `construirDocumentoOrigenFilaImportacion`). */
  lineaId: string;
  productoId: string;
  almacenId: string;
  /**
   * Diferencia de cantidad YA calculada por el llamador (`calcularDiferenciaFilaImportacion`) —
   * nunca cero (una fila sin cambio no se incluye en `lineas`). Positiva = entrada real, negativa =
   * salida real (magnitud = |diferencia|). Ya ajustada a `PRECISION_CANTIDAD_UNIDAD_MINIMA`.
   */
  diferencia: number;
  /**
   * Costo por unidad mínima, en moneda base (Etapa 2, preparado para `valorizado_exclusivo` —
   * Etapa 4). OBLIGATORIO únicamente cuando el modo resuelto por el motor central es
   * `'valorizado_exclusivo'` Y `diferencia > 0` (una entrada declara costo; una salida consume
   * capas existentes, nunca declara uno nuevo). Ausente en todo consumidor cuantitativo — el motor
   * nunca asume un costo por defecto.
   */
  costoUnitarioBaseMonedaBase?: number;
}

export interface DatosImportacionCuantitativa {
  /**
   * Etapa 4A: `'valorizado'` habilita el consumo FIFO de capas SOLO para las líneas con
   * `diferencia<0` (reducción real de stock) del lote — nunca crea capas para las líneas con
   * `diferencia>0` (esa creación de capas queda fuera de alcance de esta etapa; la entrada
   * conserva exactamente su comportamiento cuantitativo actual, sin importar el modo del lote).
   */
  modoOperacion: 'cuantitativo' | 'valorizado';
  empresaId: string;
  /** Identidad real del lote — UUID técnico estable (`LoteImportacionValorizada.id`), nunca un timestamp por segundo. */
  loteId: string;
  /** Siempre `construirClaveIdempotenciaImportacion(loteId)` (`IMPORT-${loteId}`) — nunca fabricada de otra forma por el consumidor. */
  claveIdempotencia: string;
  tipoOperacion: 'importacion';
  tipoDocumento: 'importacion';
  usuario: string;
  /** ISO 8601 — inyectada por el llamador. */
  fecha: string;
  motivo: MovimientoMotivo;
  observaciones?: string;
  documentoReferencia?: string;
  /** Todas las líneas del lote se reservan, preparan y confirman JUNTAS en una sola unidad de trabajo — nunca una confirmación por línea ni una por dirección (entrada/salida). */
  lineas: DatosLineaImportacionCuantitativa[];
}
