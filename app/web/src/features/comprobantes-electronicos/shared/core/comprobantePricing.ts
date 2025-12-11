// features/comprobantes-electronicos/shared/core/comprobantePricing.ts
import type { CartItem } from '../../models/comprobante.types';
import type { Product as CatalogProduct } from '../../../catalogo-articulos/models/types';
import { describeUnitConversion } from '../../../../shared/inventory/unitConversion';

/**
 * Datos de entrada para calcular el precio de una línea de comprobante.
 *
 * Esta función es agnóstica al UI (sirve tanto para Emisión Tradicional
 * como para Punto de Venta) y solo se encarga de la parte numérica.
 */
export interface LinePricingInput {
  /**
   * Código de la unidad mínima del producto (ej. "KGM", "UND", "LTR").
   * Se usa solo para trazabilidad / debugging.
   */
  unidadMinimaCode: string;

  /**
   * Código de la unidad seleccionada en la venta (ej. "GRM", "CAJA", "PAQUETE").
   */
  unidadSeleccionadaCode: string;

  /**
   * Cuántas unidades mínimas contiene 1 unidad seleccionada.
   *
   * Ejemplos:
   *  - unidadMinima = KGM, unidadSeleccionada = GRM -> factor = 0.001
   *  - unidadMinima = UND, unidadSeleccionada = CAJA (10 und) -> factor = 10
   *  - unidadMinima = LTR, unidadSeleccionada = ML -> factor = 0.001
   */
  factorToUnidadMinima: number;

  /**
   * Cantidad en la unidad seleccionada.
   *
   * Ejemplos:
   *  - 350 (gramos)
   *  - 2 (cajas)
   *  - 0.5 (litros)
   */
  cantidad: number;

  /**
   * Precio base para 1 unidad mínima (sin importar cómo se venda).
   *
   * Ejemplos:
   *  - S/ 5.80 por 1 KGM
   *  - S/ 2.00 por 1 UND
   */
  precioBaseUnidadMinima: number;

  /**
   * Precio definido específicamente para esta presentación/unidad,
   * si el usuario decidió romper la proporcionalidad.
   *
   * Si viene undefined/null, se calcula en base a precioBaseUnidadMinima * factorToUnidadMinima.
   */
  precioPresentacionOpcional?: number | null;

  /**
   * Tasa de IGV. Para Perú suele ser 0.18 (18%).
   */
  igvRate: number;

  /**
   * Indica si el precio unitario que se manejará en la UI incluye IGV
   * o está en valor neto.
   *
   * true  -> el precio unitario se interpreta como "precio con IGV".
   * false -> el precio unitario se interpreta como "precio sin IGV".
   */
  precioIncluyeIgv: boolean;

  /**
   * Precisión de moneda para redondeos (por defecto 2 decimales).
   */
  currencyPrecision?: number;
}

/**
 * Resultado del cálculo de una línea de comprobante.
 */
export interface LinePricingResult {
  /**
   * Precio unitario en la unidad seleccionada.
   * (por 1 gramo, 1 caja, 1 paquete, etc.)
   */
  precioUnitario: number;

  /**
   * Importe en función de cantidad * precioUnitario.
   * Si precioIncluyeIgv = true -> corresponde al TOTAL bruto.
   * Si precioIncluyeIgv = false -> corresponde al SUBTOTAL neto.
   */
  importe: number;

  /** Subtotal sin IGV (siempre neto). */
  subtotal: number;

  /** Monto de IGV. */
  igv: number;

  /** Total con IGV. */
  total: number;

  /**
   * Cantidad expresada en unidad mínima (para stock).
   *
   * Ejemplos:
   *  - 350 GRM con factor 0.001 -> 0.35 KGM
   *  - 2 CAJAS con factor 10 -> 20 UND
   */
  cantidadEnUnidadMinima: number;

  /**
   * Bandera para saber si se usó un precio específico de presentación
   * o una conversión desde la unidad mínima.
   */
  usoPrecioPresentacion: boolean;
}

/**
 * Redondea un número a la cantidad de decimales indicada.
 */
function roundTo(value: number, decimals: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Resuelve el precio unitario en la unidad seleccionada.
 *
 * Si existe precio de presentación, lo usa.
 * En caso contrario, convierte desde la unidad mínima
 * usando el factorToUnidadMinima.
 */
function resolveUnitPrice(
  input: LinePricingInput,
  precision: number
): { precioUnitario: number; usoPrecioPresentacion: boolean } {
  const { precioBaseUnidadMinima, factorToUnidadMinima, precioPresentacionOpcional } = input;

  const hasPrecioPresentacion =
    precioPresentacionOpcional !== null && precioPresentacionOpcional !== undefined;

  if (hasPrecioPresentacion) {
    return {
      precioUnitario: roundTo(precioPresentacionOpcional as number, precision),
      usoPrecioPresentacion: true,
    };
  }

  const calculated = precioBaseUnidadMinima * factorToUnidadMinima;

  return {
    precioUnitario: roundTo(calculated, precision),
    usoPrecioPresentacion: false,
  };
}

/**
 * Calcula los importes de una línea de comprobante (subtotal, IGV, total)
 * para una combinación producto + unidad + cantidad + precio.
 *
 * Esta función no conoce nada de React ni del UI. Solo números.
 */
export function calculateLineaComprobante(input: LinePricingInput): LinePricingResult {
  const precision = input.currencyPrecision ?? 2;

  const safeCantidad = Number.isFinite(input.cantidad) && input.cantidad > 0 ? input.cantidad : 0;
  const safeFactor =
    Number.isFinite(input.factorToUnidadMinima) && input.factorToUnidadMinima > 0
      ? input.factorToUnidadMinima
      : 0;

  const { precioUnitario, usoPrecioPresentacion } = resolveUnitPrice(input, precision);

  // Importe = cantidad * precioUnitario
  const rawImporte = safeCantidad * precioUnitario;
  const importe = roundTo(rawImporte, precision);

  let subtotal: number;
  let igv: number;
  let total: number;

  if (input.precioIncluyeIgv) {
    // El precio unitario (y por ende el importe) YA incluyen IGV.
    // Descomponemos:
    const divisor = 1 + input.igvRate;

    total = importe;
    subtotal = roundTo(total / divisor, precision);
    igv = roundTo(total - subtotal, precision);
  } else {
    // El precio unitario es neto (sin IGV).
    subtotal = importe;
    igv = roundTo(subtotal * input.igvRate, precision);
    total = roundTo(subtotal + igv, precision);
  }

  const cantidadEnUnidadMinima = roundTo(safeCantidad * safeFactor, 6); // más precisión para stock

  return {
    precioUnitario,
    importe,
    subtotal,
    igv,
    total,
    cantidadEnUnidadMinima,
    usoPrecioPresentacion,
  };
}

const IGV_RATE_BY_TYPE: Record<string, number> = {
  igv18: 0.18,
  igv10: 0.10,
  exonerado: 0,
  inafecto: 0,
};

const deriveIgvRate = (item: CartItem): number => {
  if (item.igvType && item.igvType in IGV_RATE_BY_TYPE) {
    return IGV_RATE_BY_TYPE[item.igvType];
  }
  if (typeof item.igv === 'number' && Number.isFinite(item.igv)) {
    return item.igv / 100;
  }
  return IGV_RATE_BY_TYPE.igv18;
};

export const buildLinePricingInputFromCartItem = (
  item: CartItem,
  catalogProduct?: CatalogProduct,
): LinePricingInput => {
  const unitCode = item.unidadMedida || item.unit || '';
  const descriptor = describeUnitConversion(catalogProduct, unitCode);
  const factor = descriptor.factorToUnidadMinima > 0 ? descriptor.factorToUnidadMinima : 1;
  const selectedUnitPrice = Number.isFinite(item.price)
    ? (item.price as number)
    : Number.isFinite(item.basePrice)
      ? (item.basePrice as number)
      : 0;
  const precioBaseUnidadMinima = factor > 0 ? selectedUnitPrice / factor : selectedUnitPrice;

  return {
    unidadMinimaCode: descriptor.unidadMinima,
    unidadSeleccionadaCode: descriptor.unidadSeleccionada,
    factorToUnidadMinima: factor,
    cantidad: Number.isFinite(item.quantity) ? (item.quantity as number) : 0,
    precioBaseUnidadMinima,
    precioPresentacionOpcional: selectedUnitPrice,
    igvRate: deriveIgvRate(item),
    precioIncluyeIgv: true,
    currencyPrecision: 2,
  };
};
