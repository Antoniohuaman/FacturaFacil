// src/features/lista-precios/hooks/usePriceCalculator.ts
import { useMemo } from 'react';
import type { Product, Price, PriceCalculation } from '../models/PriceTypes';
import { calculatePrice } from '../utils/priceHelpers';
import { lsKey } from '../utils/tenantHelpers';

/**
 * Utilidad para cargar productos con precios desde localStorage
 */
const loadPriceProducts = (): Product[] => {
  try {
    const stored = localStorage.getItem(lsKey('price_list_products'));
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('[usePriceCalculator] Error loading price products:', error);
    return [];
  }
};

/**
 * Utilidad para cargar columnas desde localStorage
 */
const loadColumns = () => {
  try {
    const stored = localStorage.getItem(lsKey('price_list_columns'));
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('[usePriceCalculator] Error loading columns:', error);
    return [];
  }
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
  const getPriceForColumn = (sku: string, columnId: string): Price | undefined => {
    const product = getProductBySKU(sku);
    if (!product) return undefined;
    return product.prices[columnId];
  };

  /**
   * Obtener precio base del producto (columna marcada como base)
   */
  const getBasePrice = (sku: string): Price | undefined => {
    if (!baseColumn) return undefined;
    return getPriceForColumn(sku, baseColumn.id);
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
    columnId?: string
  ): PriceCalculation | null => {
    const targetColumnId = columnId || baseColumn?.id;

    if (!targetColumnId) {
      console.warn('[usePriceCalculator] No se encontró columna base ni se especificó columnId');
      return null;
    }

    const price = getPriceForColumn(sku, targetColumnId);

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
  const getUnitPrice = (sku: string, columnId?: string): number | null => {
    const targetColumnId = columnId || baseColumn?.id;

    if (!targetColumnId) return null;

    const price = getPriceForColumn(sku, targetColumnId);

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
  const hasPrice = (sku: string, columnId?: string): boolean => {
    if (columnId) {
      return getPriceForColumn(sku, columnId) !== undefined;
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
  const getPriceValidity = (sku: string, columnId?: string): { validFrom: string; validUntil: string } | null => {
    const targetColumnId = columnId || baseColumn?.id;
    if (!targetColumnId) return null;

    const price = getPriceForColumn(sku, targetColumnId);
    if (!price) return null;

    return {
      validFrom: price.validFrom,
      validUntil: price.validUntil
    };
  };

  /**
   * Verificar si un precio está vigente en una fecha específica
   */
  const isPriceValid = (sku: string, date: Date = new Date(), columnId?: string): boolean => {
    const validity = getPriceValidity(sku, columnId);
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
