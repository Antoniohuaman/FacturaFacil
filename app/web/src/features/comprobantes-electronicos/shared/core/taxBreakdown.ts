import type { CartItem, IgvType, TaxBreakdownRow, TaxBreakdownKind } from '../../models/comprobante.types';
import type { LinePricingResult } from './comprobantePricing';

const inferKindFromIgv = (igvType: IgvType | undefined, hasTax: boolean): TaxBreakdownKind => {
  if (hasTax) {
    return 'gravado';
  }
  if (igvType === 'exonerado') {
    return 'exonerado';
  }
  return 'inafecto';
};

/**
 * Construye un desglose de impuestos agrupado por tipo/tasa
 * a partir de los resultados de línea ya calculados por el core.
 */
export const buildTaxBreakdownFromLineResults = (
  items: CartItem[],
  lineResults: LinePricingResult[],
): TaxBreakdownRow[] => {
  if (!items?.length || !lineResults?.length) {
    return [];
  }

  const rowsByKey = new Map<string, TaxBreakdownRow>();

  items.forEach((item, index) => {
    const line = lineResults[index];
    if (!line) return;

    const igvType = item.igvType;
    const hasTax = line.igv > 0;
    const kind = inferKindFromIgv(igvType, hasTax);

    const key = igvType || (hasTax ? 'gravado' : 'inafecto');

    const baseAmount = line.subtotal;
    const taxAmount = line.igv;
    const totalAmount = line.total;

    const existing = rowsByKey.get(key);
    if (existing) {
      existing.taxableBase += baseAmount;
      existing.taxAmount += taxAmount;
      existing.totalAmount += totalAmount;
      return;
    }

    const effectiveRate = baseAmount > 0 ? taxAmount / baseAmount : 0;

    rowsByKey.set(key, {
      key,
      igvType,
      kind,
      igvRate: effectiveRate,
      taxableBase: baseAmount,
      taxAmount,
      totalAmount,
    });
  });

  return Array.from(rowsByKey.values()).filter((row) => (
    row.taxableBase !== 0 || row.taxAmount !== 0 || row.totalAmount !== 0
  ));
};
