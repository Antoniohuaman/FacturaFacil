// gestion-inventario/models/consumoCapaCostoInventario.types.ts
//
// Modelo aprobado en §9.3 del diseño técnico (docs/diseno-tecnico-kardex-valorizado-integracion-compras.md).
// Etapa 1A: solo el tipo de datos — sin consumidor productivo todavía (ver §34, Etapa 1A). No
// implementa aquí la función que consume capas FIFO (`consumirCapasFIFO`, Etapa 1D en adelante).

/** Motivo del consumo (Etapa 1E) — ausente en filas creadas antes de esta etapa. */
export type MotivoConsumoCapaCosto = 'salida' | 'transferencia';

export interface ConsumoCapaCostoInventario {
  id: string;
  /** Aislamiento multiempresa explícito — mismo criterio que `CapaCostoInventario.empresaId`. */
  empresaId: string;

  /** FK al MovimientoStock (tipo SALIDA o el leg SALIDA de una TRANSFERENCIA) que generó este consumo. Varias filas pueden compartir el mismo movimientoSalidaId. */
  movimientoSalidaId: string;
  /** Línea del documento de salida (venta, NS, NC) que originó este consumo, cuando aplica. */
  lineaDocumentoSalidaId?: string;
  /** 'transferencia' cuando el consumo proviene de `transferirStockValorizado` (Etapa 1E) — ausente/'salida' para el resto. */
  motivo?: MotivoConsumoCapaCosto;

  capaId: string;
  /** Unidad mínima, > 0. */
  cantidadConsumida: number;

  /** Snapshot del costo de la capa al momento del consumo (inmutable aunque la capa cambie de estado luego). */
  costoUnitarioBaseMonedaBase: number;
  /** Redondeado a decimalPlaces de monedaBase (ver política de reconciliación, gestion-inventario/utils/precisionInventario.ts). */
  valorConsumidoMonedaBase: number;
  monedaBase: string;

  fecha: string;
  estado: 'confirmado' | 'revertido';
  /** Si esta fila es la reversión de otra, referencia a la fila revertida. */
  consumoReversoDeId?: string;
}
