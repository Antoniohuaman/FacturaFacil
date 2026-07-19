// gestion-inventario/models/capaCostoInventario.types.ts
//
// Modelo aprobado en §9.2 del diseño técnico (docs/diseno-tecnico-kardex-valorizado-integracion-compras.md).
// Etapa 1A: solo el tipo de datos — sin consumidor productivo todavía (ver §34, Etapa 1A).
//
// `MovimientoStock` (gestion-inventario/models/inventory.types.ts) se mantiene puramente
// cuantitativo (decisión de la Alternativa B, §9.1): el valor económico de una entrada de stock
// vive exclusivamente aquí, nunca como campos monetarios agregados al movimiento.

export type EstadoCapaCosto = 'disponible' | 'agotada' | 'revertida';

export type ProcedenciaCapaCosto =
  | 'compra'             // vía NotaIngreso ligada a ComprobanteCompra
  | 'ajuste'             // ajuste positivo manual
  | 'importacion'        // importación de stock (sumatoria o inicial)
  | 'devolucion_cliente' // NC con retorno físico
  | 'transferencia'      // capa creada en almacén destino por una transferencia
  | 'migracion_inicial'; // valorización inicial de stock preexistente

export type TipoDocumentoOrigenCapa =
  | 'nota_ingreso'
  | 'ajuste'
  | 'importacion'
  | 'devolucion_cliente'
  | 'transferencia'
  | 'migracion';

export interface CapaCostoInventario {
  id: string;
  /** Aislamiento multiempresa explícito en el dato — nunca se infiere solo del namespace de localStorage. */
  empresaId: string;
  establecimientoId: string;
  productoId: string;
  almacenId: string;

  /** FK al MovimientoStock (tipo ENTRADA) que originó esta capa. 1:1. */
  movimientoEntradaId: string;

  tipoDocumentoOrigen: TipoDocumentoOrigenCapa;
  /** Id estructurado: NotaIngreso.id, id de ajuste, id de lote de importación, etc. */
  documentoOrigenId: string;
  /** Id de LineaNotaIngreso / línea de ajuste, cuando aplica. */
  lineaOrigenId?: string;

  /** Si esta capa nació de una transferencia, referencia a la capa de origen (conserva procedencia, nunca revaloriza). */
  capaOrigenId?: string;

  // --- Nivel comercial: snapshot de la presentación tal como se compró (ausente si la entrada ya nació en unidad mínima, ej. un ajuste manual) ---
  /** Cantidad en la presentación comprada (ej. 2 cajas). */
  cantidadComercialOriginal?: number;
  /** Costo por unidad de presentación, en moneda original (ej. 120 por caja). */
  costoUnitarioComercialOriginal?: number;
  /** Snapshot histórico del factor usado — nunca reconsultado. */
  factorConversionAplicado?: number;

  // --- Nivel unidad mínima: lo que efectivamente gestiona el Kardex ---
  /** Cantidad en unidad mínima con la que nació la capa. */
  cantidadInicial: number;
  /** Remanente en unidad mínima — nunca negativo. */
  cantidadDisponible: number;
  /** Costo por unidad mínima, en moneda original (= costoUnitarioComercialOriginal / factorConversionAplicado, cuando aplica). */
  costoUnitarioBaseOriginal: number;

  // --- Nivel moneda base: lo que efectivamente valoriza el Kardex ---
  /** Nunca redondeado a decimalPlaces de la moneda (ver política de precisión, gestion-inventario/utils/precisionInventario.ts). */
  costoUnitarioBaseMonedaBase: number;
  /** Fuente de verdad del valor total de la capa en moneda original — no se deriva multiplicando en cada lectura. */
  valorValorizableOriginal: number;
  /** Fuente de verdad del valor total de la capa en moneda base — no se deriva multiplicando en cada lectura. */
  valorValorizableMonedaBase: number;

  /** Código de la moneda base de la empresa al momento de crear la capa. */
  monedaBase: string;
  /** Moneda del documento de origen. */
  monedaOriginal: string;
  /** Snapshot histórico — nunca recalculado. */
  tipoCambioAplicado: number;
  /** Fecha/referencia del TC usado. */
  fechaTipoCambio: string;

  /** Determina el orden FIFO dentro del almacén. */
  fechaEntrada: string;
  estado: EstadoCapaCosto;
  procedencia: ProcedenciaCapaCosto;

  usuario: string;
  fechaCreacion: string;
}
