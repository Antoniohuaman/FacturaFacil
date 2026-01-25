import { getBusinessTodayISODate } from '@/shared/time/businessTime';
import type { Price, Product } from '../models/PriceTypes';
import { BASE_COLUMN_ID, DEFAULT_UNIT_CODE, getCanonicalColumnId } from './priceHelpers';
import { ensureTenantStorageMigration, readTenantJson, writeTenantJson } from './storage';

type StoredProduct = Omit<Product, 'prices'> & {
  prices?: Record<string, unknown>;
};

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

const isPriceObject = (value: unknown): value is Price => {
  if (!value || typeof value !== 'object') return false;
  const maybe = value as { type?: unknown };
  return maybe.type === 'fixed' || maybe.type === 'volume';
};

const isValidNow = (validFrom: string, validUntil: string, now: Date): boolean => {
  const fromDate = new Date(validFrom);
  const untilDate = new Date(validUntil);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(untilDate.getTime())) {
    return false;
  }
  if (fromDate >= untilDate) {
    return false;
  }
  return now >= fromDate && now <= untilDate;
};

const hasValidConfiguredPrice = (price: Price | undefined, now: Date): boolean => {
  if (!price) return false;
  if (!isValidNow(price.validFrom, price.validUntil, now)) return false;

  if (price.type === 'fixed') {
    return Number.isFinite(price.value) && price.value > 0;
  }

  return Array.isArray(price.ranges) && price.ranges.some((range) => Number.isFinite(range.price) && range.price > 0);
};

export function learnBasePriceIfMissing(params: {
  sku: string;
  unitCode: string;
  value: number;
  productName?: string;
}): void {
  try {
    const sku = String(params.sku ?? '').trim();
    const unitCode = String(params.unitCode ?? '').trim().toUpperCase();
    const rawValue = params.value;

    if (!sku || !unitCode) return;
    if (!Number.isFinite(rawValue) || rawValue <= 0) return;

    ensureTenantStorageMigration('price_list_products');
    const products = readTenantJson<StoredProduct[]>('price_list_products', []);

    const canonicalBaseColumnId = getCanonicalColumnId(BASE_COLUMN_ID);
    const now = new Date();
    const normalizedValue = round2(rawValue);
    const validFrom = getBusinessTodayISODate();
    const validUntil = '9999-12-31';

    const productIndex = products.findIndex((p) => String(p?.sku ?? '') === sku);
    const existing = productIndex >= 0 ? products[productIndex] : undefined;

    const nextProduct: StoredProduct = existing
      ? { ...existing }
      : {
          sku,
          name: (params.productName ?? '').trim() || sku,
          prices: {},
          activeUnitCode: unitCode,
        };

    if (!nextProduct.name) {
      nextProduct.name = (params.productName ?? '').trim() || sku;
    }

    const activeUnit = (nextProduct.activeUnitCode || unitCode || DEFAULT_UNIT_CODE).toUpperCase();
    nextProduct.activeUnitCode = nextProduct.activeUnitCode || activeUnit;

    const rawPrices = (nextProduct.prices ?? {}) as Record<string, unknown>;
    const normalizedPrices: Record<string, Record<string, Price>> = {};

    Object.entries(rawPrices).forEach(([columnId, value]) => {
      const canonical = getCanonicalColumnId(columnId);
      if (!value) {
        normalizedPrices[canonical] = normalizedPrices[canonical] || {};
        return;
      }
      if (isPriceObject(value)) {
        normalizedPrices[canonical] = {
          ...(normalizedPrices[canonical] || {}),
          [activeUnit]: value,
        };
        return;
      }
      if (typeof value === 'object') {
        const unitEntries = value as Record<string, unknown>;
        const nextUnitPrices: Record<string, Price> = { ...(normalizedPrices[canonical] || {}) };
        Object.entries(unitEntries).forEach(([unit, unitPrice]) => {
          if (isPriceObject(unitPrice)) {
            nextUnitPrices[String(unit).toUpperCase()] = unitPrice;
          }
        });
        normalizedPrices[canonical] = nextUnitPrices;
        return;
      }

      normalizedPrices[canonical] = normalizedPrices[canonical] || {};
    });

    const baseUnitPrices = normalizedPrices[canonicalBaseColumnId] || {};
    const existingPrice = baseUnitPrices[unitCode];

    if (hasValidConfiguredPrice(existingPrice, now)) {
      // Ya existe un precio base vigente para esa unidad, no sobreescribir.
      return;
    }

    if (existingPrice?.type === 'fixed') {
      const existingRounded = round2(existingPrice.value);
      if (existingRounded === normalizedValue) {
        // Idempotente: mismo valor ya registrado.
        return;
      }
    }

    normalizedPrices[canonicalBaseColumnId] = {
      ...baseUnitPrices,
      [unitCode]: {
        type: 'fixed',
        value: normalizedValue,
        validFrom,
        validUntil,
      },
    };

    nextProduct.prices = normalizedPrices;

    const nextProducts = [...products];
    if (productIndex >= 0) {
      nextProducts[productIndex] = nextProduct;
    } else {
      nextProducts.push(nextProduct);
    }

    writeTenantJson('price_list_products', nextProducts);
  } catch (error) {
    console.error('[learnBasePriceIfMissing] Error aprendiendo precio base:', error);
  }
}
