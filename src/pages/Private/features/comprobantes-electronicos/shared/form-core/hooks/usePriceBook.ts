import { useMemo, useCallback } from 'react';
import type {
  Column,
  Product as PriceBookProduct,
  ProductUnitPrices,
  Price,
  ProductUnitOption
} from '../../../../lista-precios/models/PriceTypes';
import type { Product as CatalogProduct } from '../../../../catalogo-articulos/models/types';
import { usePriceCalculator } from '../../../../lista-precios/hooks/usePriceCalculator';
import { useProductStore } from '../../../../catalogo-articulos/hooks/useProductStore';
import { DEFAULT_UNIT_CODE, roundCurrency } from '../../../../lista-precios/utils/price-helpers/pricing';
import { isMinAllowedColumn } from '../../../../lista-precios/utils/price-helpers/columns';
import { useConfigurationContext } from '../../../../configuracion-sistema/contexto/ContextoConfiguracion';
import { SUNAT_UNITS } from '../../../../configuracion-sistema/modelos/Unit';

export interface PriceColumnOption {
  columnId: string;
  label: string;
  price: number;
  isBase: boolean;
  hasExplicitPrice: boolean;
}

export interface DerivedUnitPriceInput {
  sku: string;
  selectedUnitCode?: string;
  priceListId?: string;
}

export interface UnitPriceResult {
  price: number;
  hasPrice: boolean;
  hasExplicitPrice: boolean;
  usedUnitCode?: string;
  usedColumnId?: string;
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

const isPositiveNumber = (value?: number): value is number => {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
};

const getUnitFactorFromCatalog = (product: CatalogProduct | undefined, targetUnit?: string): number | undefined => {
  if (!product || !targetUnit) return undefined;
  const normalizedTarget = normalizeUnitCode(targetUnit);
  if (!normalizedTarget) return undefined;
  const baseCode = normalizeUnitCode(product.unidad);
  if (normalizedTarget === baseCode) {
    return 1;
  }
  const match = product.unidadesMedidaAdicionales?.find(unit => normalizeUnitCode(unit.unidadCodigo) === normalizedTarget);
  const factor = match?.factorConversion;
  if (isPositiveNumber(factor)) {
    return factor;
  }
  return undefined;
};

export const usePriceBook = () => {
  const { columns, products } = usePriceCalculator();
  const { state: configurationState } = useConfigurationContext();
  const configuredUnits = configurationState.units;
  const { allProducts: catalogProducts } = useProductStore();

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

  const catalogProductMap = useMemo(() => {
    const map = new Map<string, CatalogProduct>();
    catalogProducts.forEach(product => {
      if (product?.codigo) {
        map.set(product.codigo, product);
      }
    });
    return map;
  }, [catalogProducts]);

  const getUnitPriceWithFallback = useCallback((input: DerivedUnitPriceInput): UnitPriceResult => {
    const sku = input.sku;
    if (!sku) {
      return {
        price: 0,
        hasPrice: false,
        hasExplicitPrice: false,
      };
    }

    const columnId = input.priceListId || baseColumnId;
    if (!columnId) {
      return {
        price: 0,
        hasPrice: false,
        hasExplicitPrice: false,
      };
    }

    const priceBookProduct = productPriceMap.get(sku);
    if (!priceBookProduct) {
      return {
        price: 0,
        hasPrice: false,
        hasExplicitPrice: false,
        usedColumnId: columnId,
      };
    }

    const columnPrices: ProductUnitPrices | undefined = priceBookProduct.prices[columnId];
    if (!columnPrices) {
      return {
        price: 0,
        hasPrice: false,
        hasExplicitPrice: false,
        usedColumnId: columnId,
      };
    }

    const catalogProduct = catalogProductMap.get(sku);
    const normalizedSelectedUnit = coerceUnitCode(input.selectedUnitCode)
      || coerceUnitCode(catalogProduct?.unidad)
      || coerceUnitCode(priceBookProduct.activeUnitCode)
      || DEFAULT_UNIT_CODE;

    const explicitPriceValue = resolvePriceValue(columnPrices[normalizedSelectedUnit]);
    if (typeof explicitPriceValue === 'number') {
      return {
        price: roundCurrency(explicitPriceValue),
        hasPrice: true,
        hasExplicitPrice: true,
        usedUnitCode: normalizedSelectedUnit,
        usedColumnId: columnId,
      };
    }

    const baseUnitCode = coerceUnitCode(catalogProduct?.unidad)
      || coerceUnitCode(priceBookProduct.activeUnitCode)
      || DEFAULT_UNIT_CODE;

    const baseUnitPriceValue = baseUnitCode ? resolvePriceValue(columnPrices[baseUnitCode]) : undefined;
    const factor = getUnitFactorFromCatalog(catalogProduct, normalizedSelectedUnit);

    if (typeof baseUnitPriceValue === 'number' && typeof factor === 'number') {
      return {
        price: roundCurrency(baseUnitPriceValue * factor),
        hasPrice: true,
        hasExplicitPrice: false,
        usedUnitCode: normalizedSelectedUnit,
        usedColumnId: columnId,
      };
    }

    return {
      price: 0,
      hasPrice: false,
      hasExplicitPrice: false,
      usedUnitCode: normalizedSelectedUnit,
      usedColumnId: columnId,
    };
  }, [baseColumnId, catalogProductMap, coerceUnitCode, productPriceMap]);

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
      const catalogProduct = catalogProductMap.get(product.sku);

      registerUnit(registry, catalogProduct?.unidad, true);
      catalogProduct?.unidadesMedidaAdicionales?.forEach(unit => registerUnit(registry, unit?.unidadCodigo));

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
  }, [catalogProductMap, coerceUnitCode, formatUnitLabel, products]);

  const getPriceOptionsFor = useCallback((sku: string, unitCode?: string): PriceColumnOption[] => {
    if (!sku) return [];
    const options: PriceColumnOption[] = [];
    selectableColumns.forEach((column: Column) => {
      const derived = getUnitPriceWithFallback({ sku, selectedUnitCode: unitCode, priceListId: column.id });
      if (derived.hasPrice) {
        options.push({
          columnId: column.id,
          label: column.name,
          price: derived.price,
          isBase: column.isBase,
          hasExplicitPrice: derived.hasExplicitPrice
        });
      }
    });
    return options;
  }, [getUnitPriceWithFallback, selectableColumns]);

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
    if (candidate) {
      if (options.some(option => option.code === candidate)) {
        return candidate;
      }
      return candidate;
    }
    const baseOption = options.find(option => option.isBase);
    return baseOption?.code || options[0].code;
  }, [coerceUnitCode, unitOptionsBySku]);

  const resolveMinPrice = useCallback((sku: string, unitCode?: string): number | undefined => {
    if (!minPriceColumn) return undefined;
    const result = getUnitPriceWithFallback({ sku, selectedUnitCode: unitCode, priceListId: minPriceColumn.id });
    return result.hasPrice ? result.price : undefined;
  }, [getUnitPriceWithFallback, minPriceColumn]);

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
    resolveMinPrice,
    getUnitPriceWithFallback
  };
};
