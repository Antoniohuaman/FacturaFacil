import { useMemo, useCallback } from 'react';
import type {
  Column,
  Product as PriceBookProduct,
  ProductUnitPrices,
  Price,
  ProductUnitOption
} from '../../../../lista-precios/models/PriceTypes';
import { usePriceCalculator } from '../../../../lista-precios/hooks/usePriceCalculator';
import { DEFAULT_UNIT_CODE } from '../../../../lista-precios/utils/price-helpers/pricing';
import { isMinAllowedColumn } from '../../../../lista-precios/utils/price-helpers/columns';
import { useConfigurationContext } from '../../../../configuracion-sistema/context/ConfigurationContext';
import { SUNAT_UNITS } from '../../../../configuracion-sistema/models/Unit';

export interface PriceColumnOption {
  columnId: string;
  label: string;
  price: number;
  isBase: boolean;
}

type UnitDictionaryEntry = {
  code: string;
  name?: string;
  symbol?: string;
};

const normalizeUnitCode = (value?: string): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.toUpperCase();
};

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
  const { state: configurationState } = useConfigurationContext();
  const configuredUnits = configurationState.units;

  const unitEntries = useMemo<UnitDictionaryEntry[]>(() => {
    const canonicalEntries: UnitDictionaryEntry[] = SUNAT_UNITS
      .map(unit => ({
        code: normalizeUnitCode(unit.code) ?? '',
        name: unit.name,
        symbol: unit.symbol
      }))
      .filter(entry => entry.code);
    const companyEntries: UnitDictionaryEntry[] = configuredUnits
      .map(unit => ({
        code: normalizeUnitCode(unit.code) ?? '',
        name: unit.name,
        symbol: unit.symbol
      }))
      .filter(entry => entry.code);

    const merged = new Map<string, UnitDictionaryEntry>();
    [...canonicalEntries, ...companyEntries].forEach(entry => {
      if (!entry.code) return;
      merged.set(entry.code, entry);
    });

    return Array.from(merged.values());
  }, [configuredUnits]);

  const unitCodeDictionary = useMemo(() => {
    const map = new Map<string, UnitDictionaryEntry>();
    unitEntries.forEach(entry => {
      map.set(entry.code, entry);
    });
    return map;
  }, [unitEntries]);

  const unitAliasDictionary = useMemo(() => {
    const map = new Map<string, string>();
    unitEntries.forEach(entry => {
      map.set(entry.code, entry.code);
      if (entry.name) {
        const normalizedName = normalizeUnitCode(entry.name);
        if (normalizedName) {
          map.set(normalizedName, entry.code);
        }
      }
      if (entry.symbol) {
        const normalizedSymbol = normalizeUnitCode(entry.symbol);
        if (normalizedSymbol) {
          map.set(normalizedSymbol, entry.code);
        }
      }
    });
    return map;
  }, [unitEntries]);

  const coerceUnitCode = useCallback((value?: string) => {
    const normalized = normalizeUnitCode(value);
    if (!normalized) return undefined;
    return unitAliasDictionary.get(normalized) || normalized;
  }, [unitAliasDictionary]);

  const formatUnitLabel = useCallback((value?: string) => {
    const code = coerceUnitCode(value);
    if (!code) return '';
    const entry = unitCodeDictionary.get(code);
    const descriptor = entry?.name || entry?.symbol;
    return descriptor ? `${code} ${descriptor}` : code;
  }, [coerceUnitCode, unitCodeDictionary]);

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

  const unitOptionsBySku = useMemo(() => {
    const map = new Map<string, ProductUnitOption[]>();

    const registerUnit = (
      registry: Map<string, ProductUnitOption>,
      code?: string,
      isBase = false
    ) => {
      const normalized = coerceUnitCode(code);
      if (!normalized) return;
      const existing = registry.get(normalized);
      if (existing) {
        if (isBase && !existing.isBase) {
          registry.set(normalized, { ...existing, isBase: true });
        }
        return;
      }
      registry.set(normalized, {
        code: normalized,
        label: formatUnitLabel(normalized),
        isBase
      });
    };

    products.forEach(product => {
      const registry = new Map<string, ProductUnitOption>();
      registerUnit(registry, product.activeUnitCode, true);
      Object.values(product.prices).forEach(unitPrices => {
        Object.keys(unitPrices || {}).forEach(unitCode => registerUnit(registry, unitCode));
      });
      if (registry.size === 0) {
        registerUnit(registry, DEFAULT_UNIT_CODE, true);
      }
      map.set(product.sku, Array.from(registry.values()));
    });

    return map;
  }, [coerceUnitCode, formatUnitLabel, products]);

  const getColumnPriceForSku = useCallback((sku: string, columnId: string, unitCode?: string): number | undefined => {
    if (!sku) return undefined;
    const product = productPriceMap.get(sku);
    if (!product) return undefined;
    const columnPrices = product.prices[columnId];
    if (!columnPrices) return undefined;
    const preferredUnit = coerceUnitCode(unitCode);
    const fallbackUnit = coerceUnitCode(product.activeUnitCode) || DEFAULT_UNIT_CODE;
    const resolvedUnit = selectUnitPrice(columnPrices, preferredUnit, fallbackUnit);
    return resolvePriceValue(resolvedUnit);
  }, [coerceUnitCode, productPriceMap]);

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

  const getUnitOptionsForSku = useCallback((sku: string): ProductUnitOption[] => {
    if (!sku) return [];
    return unitOptionsBySku.get(sku) ?? [];
  }, [unitOptionsBySku]);

  const getPreferredUnitForSku = useCallback((sku: string, requestedUnit?: string): string => {
    const options = unitOptionsBySku.get(sku);
    const candidate = coerceUnitCode(requestedUnit);
    if (!options || options.length === 0) {
      return candidate || DEFAULT_UNIT_CODE;
    }
    if (candidate && options.some(option => option.code === candidate)) {
      return candidate;
    }
    const baseOption = options.find(option => option.isBase);
    return baseOption?.code || options[0].code;
  }, [coerceUnitCode, unitOptionsBySku]);

  const resolveMinPrice = useCallback((sku: string, unitCode?: string): number | undefined => {
    if (!minPriceColumn) return undefined;
    return getColumnPriceForSku(sku, minPriceColumn.id, unitCode);
  }, [getColumnPriceForSku, minPriceColumn]);

  return {
    hasSelectableColumns: selectableColumns.length > 0,
    baseColumnId,
    priceColumns: selectableColumns,
    globalDiscountColumn,
    globalIncreaseColumn,
    getUnitOptionsForSku,
    getPreferredUnitForSku,
    formatUnitLabel,
    getPriceOptionsFor,
    resolveMinPrice
  };
};
