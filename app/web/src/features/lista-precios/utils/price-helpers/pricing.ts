import type { Price, PriceCalculation, Product } from '../../models/PriceTypes';
import { calculateVolumePrice } from './volume';

export const DEFAULT_UNIT_CODE = 'NIU';

export const roundCurrency = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

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
