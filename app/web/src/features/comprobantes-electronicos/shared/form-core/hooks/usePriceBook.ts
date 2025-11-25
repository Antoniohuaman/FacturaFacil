import { useMemo, useCallback } from 'react';
import type { Column, Product as PriceBookProduct, ProductUnitPrices, Price } from '../../../../lista-precios/models/PriceTypes';
import { usePriceCalculator } from '../../../../lista-precios/hooks/usePriceCalculator';
import { DEFAULT_UNIT_CODE } from '../../../../lista-precios/utils/price-helpers/pricing';
import { isMinAllowedColumn } from '../../../../lista-precios/utils/price-helpers/columns';

export interface PriceColumnOption {
  columnId: string;
  label: string;
  price: number;
  isBase: boolean;
}

const selectUnitPrice = (
  unitPrices: ProductUnitPrices | undefined,
  preferredUnit?: string,
  fallbackUnit?: string
): Price | undefined => {
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

const resolvePriceValue = (price: Price | undefined): number | undefined => {
  if (!price) return undefined;
  if (price.type === 'fixed') {
    return price.value;
  }
  if (!price.ranges || price.ranges.length === 0) {
    return undefined;
  }
  const sortedRanges = [...price.ranges].sort((a, b) => a.minQuantity - b.minQuantity);
  return sortedRanges[0]?.price;
};

const salesColumnPredicate = (column: Column): boolean => {
  if (!column.visible) return false;
  return column.kind === 'base' || column.kind === 'manual';
};

export const usePriceBook = () => {
  const { columns, products } = usePriceCalculator();

  const selectableColumns = useMemo<Column[]>(() => {
    return columns
      .filter((column: Column) => salesColumnPredicate(column))
      .sort((a: Column, b: Column) => a.order - b.order);
  }, [columns]);

  const minPriceColumn = useMemo<Column | undefined>(() => columns.find((column: Column) => isMinAllowedColumn(column)), [columns]);
  const globalDiscountColumn = useMemo<Column | undefined>(() => columns.find((column: Column) => column.kind === 'global-discount'), [columns]);
  const globalIncreaseColumn = useMemo<Column | undefined>(() => columns.find((column: Column) => column.kind === 'global-increase'), [columns]);
  const baseColumnId = useMemo(() => selectableColumns.find((column: Column) => column.isBase)?.id, [selectableColumns]);

  const productPriceMap = useMemo(() => {
    const map = new Map<string, PriceBookProduct>();
    products.forEach((product: PriceBookProduct) => map.set(product.sku, product));
    return map;
  }, [products]);

  const getColumnPriceForSku = useCallback((sku: string, columnId: string, unitCode?: string): number | undefined => {
    if (!sku) return undefined;
    const product = productPriceMap.get(sku);
    if (!product) return undefined;
    const columnPrices = product.prices[columnId];
    if (!columnPrices) return undefined;
    const resolvedUnit = selectUnitPrice(columnPrices, unitCode, product.activeUnitCode || DEFAULT_UNIT_CODE);
    return resolvePriceValue(resolvedUnit);
  }, [productPriceMap]);

  const getPriceOptionsFor = useCallback((sku: string, unitCode?: string): PriceColumnOption[] => {
    if (!sku) return [];
    const options: PriceColumnOption[] = [];
    selectableColumns.forEach((column: Column) => {
      const price = getColumnPriceForSku(sku, column.id, unitCode);
      if (typeof price === 'number') {
        options.push({
          columnId: column.id,
          label: column.name,
          price,
          isBase: column.isBase
        });
      }
    });
    return options;
  }, [getColumnPriceForSku, selectableColumns]);

  const resolveMinPrice = useCallback((sku: string, unitCode?: string): number | undefined => {
    if (!minPriceColumn) return undefined;
    return getColumnPriceForSku(sku, minPriceColumn.id, unitCode);
  }, [getColumnPriceForSku, minPriceColumn]);

  return {
    hasSelectableColumns: selectableColumns.length > 0,
    baseColumnId,
    globalDiscountColumn,
    globalIncreaseColumn,
    getPriceOptionsFor,
    resolveMinPrice
  };
};
