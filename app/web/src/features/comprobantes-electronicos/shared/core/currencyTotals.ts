import type { CurrencyCode } from '@/shared/currency';
import type { CartItem } from '../../models/comprobante.types';
import type { Product as CatalogProduct } from '../../../catalogo-articulos/models/types';
import { buildLinePricingInputFromCartItem, calculateLineaComprobante } from './comprobantePricing';

export interface CurrencyTotalsOptions {
  items: CartItem[];
  catalogLookup: Map<string, CatalogProduct>;
  baseCurrencyCode: CurrencyCode;
  documentCurrencyCode: CurrencyCode;
  convert: (amount: number, from: CurrencyCode, to: CurrencyCode) => number;
}

export interface CurrencyTotalsResult {
  subtotal: number;
  igv: number;
  total: number;
  currency: CurrencyCode;
}

export const calculateCurrencyAwareTotals = ({
  items,
  catalogLookup,
  baseCurrencyCode,
  documentCurrencyCode,
  convert,
}: CurrencyTotalsOptions): CurrencyTotalsResult => {
  if (!items?.length) {
    return {
      subtotal: 0,
      igv: 0,
      total: 0,
      currency: documentCurrencyCode,
    };
  }

  const lineResults = items.map((item) => {
    const catalogProduct = catalogLookup.get(item.id) || catalogLookup.get(item.code || '');
    return calculateLineaComprobante(buildLinePricingInputFromCartItem(item, catalogProduct));
  });

  const subtotalBase = lineResults.reduce((sum, line) => sum + line.subtotal, 0);
  const igvBase = lineResults.reduce((sum, line) => sum + line.igv, 0);
  const totalBase = lineResults.reduce((sum, line) => sum + line.total, 0);

  return {
    subtotal: convert(subtotalBase, baseCurrencyCode, documentCurrencyCode),
    igv: convert(igvBase, baseCurrencyCode, documentCurrencyCode),
    total: convert(totalBase, baseCurrencyCode, documentCurrencyCode),
    currency: documentCurrencyCode,
  };
};
