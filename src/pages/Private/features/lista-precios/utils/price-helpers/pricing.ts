import { currencyManager } from '@/shared/currency';
import type { Price, PriceCalculation, Product } from '../../models/PriceTypes';
import { calculateVolumePrice } from './volume';

export const DEFAULT_UNIT_CODE = 'NIU';

const getBaseCurrencyDecimals = () => currencyManager.getSnapshot().baseCurrency.decimalPlaces ?? 2;

export const roundCurrency = (value: number, decimals: number = getBaseCurrencyDecimals()): number => {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

export const getFixedPriceValue = (price?: Price): number | undefined => {
  if (!price || price.type !== 'fixed') return undefined;
  return price.value;
};

export const calculatePrice = (price: Price, quantity: number = 1): PriceCalculation => {
  if (price.type === 'fixed') {
    return {
      unitPrice: price.value,
      totalPrice: price.value * quantity
    };
  }
  return calculateVolumePrice(price, quantity);
};

export const removeProductPricesForColumn = (products: Product[], columnId: string): Product[] => (
  products
    .map(product => {
      if (!(columnId in product.prices)) {
        return product;
      }
      const rest = { ...product.prices };
      delete rest[columnId];
      return {
        ...product,
        prices: rest
      };
    })
    .filter(product => Object.values(product.prices).some(unitPrices => Object.keys(unitPrices).length > 0))
);
