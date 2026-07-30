// features/comprobantes-electronicos/shared/core/desgloseFinancieroVenta.ts
//
// Cierre de brecha (auditoría de preparación para Rentabilidad): función ÚNICA y canónica de
// desglose financiero por línea de venta — reemplaza la lógica duplicada e inconsistente de
// `usePayment.calculateTotals` (ignora `descuentoItem` por completo) y
// `calcularDesgloseTributos` (sí aplica `descuentoItem`, pero agrega por tasa de impuesto, nunca
// por línea, y no conoce descuento global). Ningún canal debe seguir calculando su propia fórmula
// de venta neta — Factura, Boleta, POS y Nota de Venta deben converger en esta única fuente.
//
// Reutiliza, nunca reimplementa: `calculateLineaComprobante`/`deriveIgvRate` (separación
// base/impuesto — nunca un 0.18/0.10 hardcodeado aquí) y `currencyManager.normalizarImporte`
// (precisión monetaria única compartida).

import type { CartItem } from '../../models/comprobante.types';
import { calculateLineaComprobante, deriveIgvRate } from './comprobantePricing';
import { currencyManager, normalizarImporte } from '@/shared/currency';

/** Versión de la fórmula — se conserva en cada resultado para poder distinguir, en el futuro, un snapshot histórico calculado con una regla distinta. */
export const VERSION_DESGLOSE_FINANCIERO_VENTA = 'v1-descuento-proporcional-post-descuento-linea';

export interface DesgloseFinancieroLinea {
  lineaId: string;
  cantidad: number;
  precioUnitarioHistorico: number;
  importeBruto: number;
  descuentoLinea: number;
  descuentoGlobalAsignado: number;
  baseNetaAntesImpuesto: number;
  impuesto: number;
  ventaNetaSinImpuesto: number;
  total: number;
  moneda: string;
  precision: number;
  version: string;
}

export interface OpcionesDesgloseFinancieroVenta {
  /** Moneda del documento — usada cuando la línea no declara la suya propia. */
  monedaDocumento: string;
  /**
   * `true` si `item.price` ya incluye impuesto (convención vigente en Emisión Tradicional/POS,
   * `buildLinePricingInputFromCartItem` por defecto también asume `true`). Nunca se infiere aquí:
   * el llamador declara la convención real de su canal.
   */
  precioIncluyeImpuesto: boolean;
  /**
   * Importe TOTAL del descuento global del documento, en la misma moneda — 0/ausente si el
   * documento no tiene descuento global. Nunca un porcentaje: siempre un monto ya resuelto por el
   * llamador (evita una segunda fuente de verdad sobre cómo se originó ese monto).
   */
  descuentoGlobalMonto?: number;
}

function redondear(valor: number, moneda: string): number {
  return normalizarImporte(valor, moneda as Parameters<typeof normalizarImporte>[1]);
}

function precisionDe(moneda: string): number {
  return currencyManager.getCurrency(moneda as Parameters<typeof currencyManager.getCurrency>[0])?.decimalPlaces ?? 2;
}

/**
 * Distribuye `montoTotal` proporcionalmente sobre `bases` (una por línea elegible), preservando el
 * orden de entrada. Nunca reparte sobre líneas con base ausente. La suma de los montos asignados es
 * EXACTAMENTE `montoTotal` (nunca queda un residuo de redondeo suelto): la diferencia entre la suma
 * proporcional redondeada y el monto total se asigna, de forma determinística, a la ÚLTIMA línea
 * elegible. Nunca asigna un monto negativo. Si no hay ninguna base elegible (o su suma es 0),
 * devuelve todo en cero — nunca reparte sobre una base inexistente.
 */
function distribuirProporcionalmente(
  montoTotal: number,
  bases: ReadonlyArray<{ id: string; base: number }>,
  moneda: string
): Map<string, number> {
  const resultado = new Map<string, number>();
  const elegibles = bases.filter((b) => b.base > 0);
  const totalBase = elegibles.reduce((s, b) => s + b.base, 0);

  for (const b of bases) resultado.set(b.id, 0);
  if (montoTotal <= 0 || elegibles.length === 0 || totalBase <= 0) {
    return resultado;
  }

  let acumulado = 0;
  elegibles.forEach((b, indice) => {
    const esUltimo = indice === elegibles.length - 1;
    if (esUltimo) {
      resultado.set(b.id, Math.max(0, redondear(montoTotal - acumulado, moneda)));
      return;
    }
    const proporcion = redondear(montoTotal * (b.base / totalBase), moneda);
    resultado.set(b.id, Math.max(0, proporcion));
    acumulado = redondear(acumulado + proporcion, moneda);
  });

  return resultado;
}

/**
 * Función canónica ÚNICA de desglose financiero por línea de venta — la única fuente de verdad
 * para "venta neta" en todo el repositorio. Debe ser reutilizada por Factura, Boleta, POS y Nota
 * de Venta; ningún canal debe mantener su propia fórmula de descuento/impuesto por separado.
 *
 * Fórmula canónica, aplicada línea por línea:
 *   importe bruto        = cantidad × precio unitario histórico
 *   base tras desc. línea = importe bruto − (importe bruto × descuentoItem% / 100)
 *   descuento global      = proporción de esa base sobre las bases elegibles del documento
 *   base neta antes de impuesto = base tras desc. línea − descuento global asignado
 *   {impuesto, ventaNetaSinImpuesto, total} = separación real vía `calculateLineaComprobante`
 *     (nunca una división manual por 1.18/1.10 — la tasa viene de `deriveIgvRate`).
 *
 * Nunca depende del precio ACTUAL del producto ni de configuración tributaria actual para
 * reconstruir una venta histórica — opera exclusivamente sobre los valores ya persistidos en cada
 * `CartItem` (snapshot inmutable de la línea al momento de la venta).
 */
export function calcularDesgloseFinancieroVenta(
  items: readonly CartItem[],
  opciones: OpcionesDesgloseFinancieroVenta
): DesgloseFinancieroLinea[] {
  const basesTrasDescuentoLinea = items.map((item, indice) => {
    const cantidad = Number.isFinite(item.quantity) ? (item.quantity as number) : 0;
    const precioUnitarioHistorico = Number.isFinite(item.price) ? (item.price as number) : 0;
    const moneda = item.currency ?? opciones.monedaDocumento;
    const importeBruto = redondear(cantidad * precioUnitarioHistorico, moneda);
    const descuentoItemPct = Number.isFinite(item.descuentoItem) ? Math.max(0, item.descuentoItem as number) : 0;
    const descuentoLinea = redondear(importeBruto * (descuentoItemPct / 100), moneda);
    const baseTrasDescuentoLinea = Math.max(0, redondear(importeBruto - descuentoLinea, moneda));
    return {
      id: item.lineaId ?? `${indice}`,
      indice,
      cantidad,
      precioUnitarioHistorico,
      moneda,
      importeBruto,
      descuentoLinea,
      baseTrasDescuentoLinea,
    };
  });

  const descuentoGlobalPorLinea = distribuirProporcionalmente(
    opciones.descuentoGlobalMonto ?? 0,
    basesTrasDescuentoLinea.map((b) => ({ id: b.id, base: b.baseTrasDescuentoLinea })),
    opciones.monedaDocumento
  );

  return items.map((item, indice) => {
    const b = basesTrasDescuentoLinea[indice];
    const descuentoGlobalAsignado = descuentoGlobalPorLinea.get(b.id) ?? 0;
    const baseNetaAntesImpuesto = Math.max(0, redondear(b.baseTrasDescuentoLinea - descuentoGlobalAsignado, b.moneda));

    const igvRate = deriveIgvRate(item);
    const { subtotal, igv, total } = calculateLineaComprobante({
      unidadMinimaCode: '',
      unidadSeleccionadaCode: '',
      factorToUnidadMinima: 1,
      cantidad: 1,
      precioBaseUnidadMinima: baseNetaAntesImpuesto,
      igvRate,
      precioIncluyeIgv: opciones.precioIncluyeImpuesto,
      currencyPrecision: precisionDe(b.moneda),
    });

    return {
      lineaId: b.id,
      cantidad: b.cantidad,
      precioUnitarioHistorico: b.precioUnitarioHistorico,
      importeBruto: b.importeBruto,
      descuentoLinea: b.descuentoLinea,
      descuentoGlobalAsignado,
      baseNetaAntesImpuesto,
      impuesto: igv,
      ventaNetaSinImpuesto: subtotal,
      total,
      moneda: b.moneda,
      precision: precisionDe(b.moneda),
      version: VERSION_DESGLOSE_FINANCIERO_VENTA,
    };
  });
}
