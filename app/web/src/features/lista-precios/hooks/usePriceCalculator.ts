// src/features/lista-precios/hooks/usePriceCalculator.ts
import { useMemo } from 'react';
import type { Product, Price, PriceCalculation, ProductUnitPrices, Column } from '../models/PriceTypes';
import { calculatePrice } from '../utils/priceHelpers';
import { ensureTenantStorageMigration, readTenantJson } from '../utils/storage';

/**
 * Utilidad para cargar productos con precios desde localStorage
 */
const loadPriceProducts = (): Product[] => {
  ensureTenantStorageMigration('price_list_products');
  return readTenantJson<Product[]>('price_list_products', []);
};

/**
 * Utilidad para cargar columnas desde localStorage
 */
const loadColumns = () => {
  ensureTenantStorageMigration('price_list_columns');
  return readTenantJson<Column[]>('price_list_columns', []);
};

/**
 * Hook para calcular precios desde otros módulos (ej: facturación)
 *
 * Este hook permite consultar precios configurados sin necesidad de
 * cargar todo el estado del módulo de lista de precios.
 *
 * @example
 * ```tsx
 * const { calculatePriceBySKU, getBasePrice } = usePriceCalculator();
 *
 * // Obtener precio base para facturación
 * const basePrice = getBasePrice('PROD-001');
 *
 * // Calcular precio por cantidad
 * const priceCalc = calculatePriceBySKU('PROD-001', 50, 'P1');
 * console.log(priceCalc?.unitPrice); // Precio unitario según cantidad
 * ```
 */
export const usePriceCalculator = () => {
  // Cargar productos con precios (memoizados)
  const products = useMemo(() => loadPriceProducts(), []);
  const columns = useMemo(() => loadColumns(), []);

  /**
   * Obtener columna base
   */
  const baseColumn = useMemo(() => {
    return columns.find((col: { isBase: boolean }) => col.isBase);
  }, [columns]);

  /**
   * Obtener producto por SKU
   */
  const getProductBySKU = (sku: string): Product | undefined => {
    return products.find(p => p.sku === sku);
  };

  /**
   * Obtener precio de un producto en una columna específica
   */
  const resolvePriceByUnit = (unitPrices: ProductUnitPrices | undefined, preferredUnit?: string, fallbackUnit?: string): Price | undefined => {
    if (!unitPrices) return undefined;
    if (preferredUnit && unitPrices[preferredUnit]) {
      return unitPrices[preferredUnit];
    }
    if (fallbackUnit && unitPrices[fallbackUnit]) {
      return unitPrices[fallbackUnit];
    }
    const firstUnit = Object.keys(unitPrices)[0];
    return firstUnit ? unitPrices[firstUnit] : undefined;
  };

  const getPriceForColumn = (sku: string, columnId: string, unitCode?: string): Price | undefined => {
    const product = getProductBySKU(sku);
    if (!product) return undefined;
    const unitPrices = product.prices[columnId];
    return resolvePriceByUnit(unitPrices, unitCode || product.activeUnitCode);
  };

  /**
   * Obtener precio base del producto (columna marcada como base)
   */
  const getBasePrice = (sku: string, unitCode?: string): Price | undefined => {
    if (!baseColumn) return undefined;
    return getPriceForColumn(sku, baseColumn.id, unitCode);
  };

  /**
   * Calcular precio según cantidad para un SKU en una columna específica
   *
   * @param sku - SKU del producto
   * @param quantity - Cantidad a calcular
   * @param columnId - ID de la columna (opcional, usa columna base si no se especifica)
   * @returns PriceCalculation con precio unitario, total y rango aplicado (si es precio por volumen)
   */
  const calculatePriceBySKU = (
    sku: string,
    quantity: number = 1,
    columnId?: string,
    unitCode?: string
  ): PriceCalculation | null => {
    const targetColumnId = columnId || baseColumn?.id;

    if (!targetColumnId) {
      console.warn('[usePriceCalculator] No se encontró columna base ni se especificó columnId');
      return null;
    }

    const price = getPriceForColumn(sku, targetColumnId, unitCode);

    if (!price) {
      console.warn(`[usePriceCalculator] No se encontró precio para SKU "${sku}" en columna "${targetColumnId}"`);
      return null;
    }

    return calculatePrice(price, quantity);
  };

  /**
   * Obtener precio unitario simple (sin cálculos de volumen)
   * Útil para mostrar precio base en listados
   */
  const getUnitPrice = (sku: string, columnId?: string, unitCode?: string): number | null => {
    const targetColumnId = columnId || baseColumn?.id;

    if (!targetColumnId) return null;

    const price = getPriceForColumn(sku, targetColumnId, unitCode);

    if (!price) return null;

    if (price.type === 'fixed') {
      return price.value;
    } else {
      // Para precios por volumen, retornar el precio del primer rango
      if (price.ranges.length === 0) return null;
      const sortedRanges = [...price.ranges].sort((a, b) => a.minQuantity - b.minQuantity);
      return sortedRanges[0].price;
    }
  };

  /**
   * Verificar si un producto tiene precios configurados
   */
  const hasPrice = (sku: string, columnId?: string, unitCode?: string): boolean => {
    if (columnId) {
      return getPriceForColumn(sku, columnId, unitCode) !== undefined;
    }
    // Si no se especifica columna, verificar si tiene algún precio
    const product = getProductBySKU(sku);
    return product !== undefined && Object.keys(product.prices).length > 0;
  };

  /**
   * Obtener todas las columnas disponibles
   */
  const getAvailableColumns = () => {
    return columns;
  };

  /**
   * Obtener información de vigencia de un precio
   */
  const getPriceValidity = (sku: string, columnId?: string, unitCode?: string): { validFrom: string; validUntil: string } | null => {
    const targetColumnId = columnId || baseColumn?.id;
    if (!targetColumnId) return null;

    const price = getPriceForColumn(sku, targetColumnId, unitCode);
    if (!price) return null;

    return {
      validFrom: price.validFrom,
      validUntil: price.validUntil
    };
  };

  /**
   * Verificar si un precio está vigente en una fecha específica
   */
  const isPriceValid = (sku: string, date: Date = new Date(), columnId?: string, unitCode?: string): boolean => {
    const validity = getPriceValidity(sku, columnId, unitCode);
    if (!validity) return false;

    const from = new Date(validity.validFrom);
    const until = new Date(validity.validUntil);

    return date >= from && date <= until;
  };

  return {
    // Getters
    getProductBySKU,
    getPriceForColumn,
    getBasePrice,
    getUnitPrice,
    hasPrice,
    getAvailableColumns,
    getPriceValidity,
    isPriceValid,

    // Calculators
    calculatePriceBySKU,

    // Info
    baseColumn,
    products,
    columns,
  };
};
