import type { CatalogProduct, Column, Product } from '../../models/PriceTypes';
import type { EffectivePriceMatrix, EffectivePriceResult } from '../../models/EffectivePriceTypes';
import { DEFAULT_UNIT_CODE, getFixedPriceValue, roundCurrency } from './pricing';
import { applyGlobalRule, findBaseColumn, isGlobalColumn } from './columns';

export const getEffectivePriceFromBase = (
  column: Column,
  explicitPrice?: Product['prices'][string][string],
  baseValue?: number
): EffectivePriceResult => {
  const explicitValue = getFixedPriceValue(explicitPrice);
  if (typeof explicitValue === 'number') {
    return { value: explicitValue, source: 'explicit' };
  }

  if (!isGlobalColumn(column) || typeof baseValue !== 'number') {
    return { source: 'none' };
  }

  const computed = applyGlobalRule(column, baseValue);
  if (computed === null) {
    return { source: 'none' };
  }

  return { value: roundCurrency(computed), source: 'global-rule' };
};

type UnitMeta = {
  code: string;
  isBase: boolean;
  factor?: number;
};

const collectUnitMetas = (product: Product, catalogProduct?: CatalogProduct): UnitMeta[] => {
  const seen = new Set<string>();
  const metas: UnitMeta[] = [];

  const addUnit = (code?: string, isBase = false, factor?: number) => {
    if (!code || seen.has(code)) return;
    seen.add(code);
    metas.push({ code, isBase, factor: isBase ? 1 : factor });
  };

  addUnit(catalogProduct?.unidad, true, 1);
  catalogProduct?.unidadesMedidaAdicionales?.forEach(unit => addUnit(unit.unidadCodigo, false, unit.factorConversion));

  Object.values(product.prices).forEach(unitPrices => {
    Object.keys(unitPrices).forEach(code => addUnit(code));
  });

  if (metas.length === 0) {
    addUnit(product.activeUnitCode || catalogProduct?.unidad || DEFAULT_UNIT_CODE, true, 1);
  }

  return metas;
};

export const buildEffectivePriceMatrix = (
  products: Product[],
  columns: Column[],
  catalogProducts: CatalogProduct[]
): EffectivePriceMatrix => {
  if (products.length === 0 || columns.length === 0) {
    return {};
  }

  const baseColumn = findBaseColumn(columns);
  const catalogMap = new Map(catalogProducts.map(product => [product.codigo, product] as const));
  const matrix: EffectivePriceMatrix = {};

  products.forEach(product => {
    const catalogProduct = catalogMap.get(product.sku);
    const unitMetas = collectUnitMetas(product, catalogProduct);
    if (unitMetas.length === 0) return;

    const columnEntries: Record<string, Record<string, EffectivePriceResult>> = {};

    columns.forEach(column => {
      const unitEntries: Record<string, EffectivePriceResult> = {};

      unitMetas.forEach(unit => {
        const unitCode = unit.code;
        const explicitPrice = product.prices[column.id]?.[unitCode];
        const unitBaseValue = baseColumn
          ? getFixedPriceValue(product.prices[baseColumn.id]?.[unitCode])
          : undefined;

        const shouldApplyGlobalRule = isGlobalColumn(column);
        const baseValueForRule = shouldApplyGlobalRule ? unitBaseValue : undefined;

        unitEntries[unitCode] = getEffectivePriceFromBase(column, explicitPrice, baseValueForRule);
      });

      columnEntries[column.id] = unitEntries;
    });

    matrix[product.sku] = columnEntries;
  });

  return matrix;
};
