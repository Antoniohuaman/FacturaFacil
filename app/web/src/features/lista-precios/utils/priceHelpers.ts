import type {
  CatalogProduct,
  Column,
  ColumnKind,
  GlobalRuleType,
  Product,
  Price,
  VolumePrice,
  VolumeRange,
  PriceCalculation
} from '../models/PriceTypes';

export type EffectivePriceSource = 'explicit' | 'global-rule' | 'none';

export interface EffectivePriceResult {
  value?: number;
  source: EffectivePriceSource;
}

export type EffectivePriceMatrix = Record<string, Record<string, Record<string, EffectivePriceResult>>>;

export const DEFAULT_UNIT_CODE = 'NIU';

const roundCurrency = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

export const getFixedPriceValue = (price?: Price): number | undefined => {
  if (!price || price.type !== 'fixed') return undefined;
  return price.value;
};

const MANUAL_COLUMN_ID_PATTERN = /^P(\d+)$/i;

export const generateColumnId = (columns: Column[]): string => {
  const numericSuffixes = columns
    .map(column => {
      const match = MANUAL_COLUMN_ID_PATTERN.exec(column.id || '');
      return match ? Number(match[1]) : null;
    })
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

  const nextValue = numericSuffixes.length > 0
    ? Math.max(...numericSuffixes) + 1
    : 1;

  return `P${nextValue}`;
};

export const getNextOrder = (columns: Column[]): number => {
  if (columns.length === 0) return 1;
  return Math.max(...columns.map(c => c.order)) + 1;
};

export const BASE_COLUMN_ID = 'P1';
export const BASE_COLUMN_NAME = 'Precio base';
export const GLOBAL_DISCOUNT_COLUMN_ID = 'PGD';
export const GLOBAL_INCREASE_COLUMN_ID = 'PGA';
export const PRODUCT_DISCOUNT_COLUMN_ID = 'PPD';
export const MANUAL_COLUMN_LIMIT = 10;
const GLOBAL_DISCOUNT_NAME = 'Descuento global';
const GLOBAL_INCREASE_NAME = 'Aumento global';
const PRODUCT_DISCOUNT_NAME = 'Precio con descuento';

const createBaseColumn = (): Column => ({
  id: BASE_COLUMN_ID,
  name: BASE_COLUMN_NAME,
  mode: 'fixed',
  visible: true,
  isBase: true,
  order: 1,
  kind: 'base'
});

const createGlobalColumn = (kind: Extract<ColumnKind, 'global-discount' | 'global-increase'>): Column => ({
  id: kind === 'global-discount' ? GLOBAL_DISCOUNT_COLUMN_ID : GLOBAL_INCREASE_COLUMN_ID,
  name: kind === 'global-discount' ? GLOBAL_DISCOUNT_NAME : GLOBAL_INCREASE_NAME,
  mode: 'fixed',
  visible: true,
  isBase: false,
  order: kind === 'global-discount' ? 2 : 3,
  kind,
  globalRuleType: 'percent',
  globalRuleValue: null
});

const createProductDiscountColumn = (): Column => ({
  id: PRODUCT_DISCOUNT_COLUMN_ID,
  name: PRODUCT_DISCOUNT_NAME,
  mode: 'fixed',
  visible: true,
  isBase: false,
  order: 4,
  kind: 'product-discount'
});

const normalizeColumnOrder = (column: Column, index: number): Column => ({
  ...column,
  order: typeof column.order === 'number' ? column.order : index + 1
});

const normalizeGlobalRuleValue = (value?: number | null): number | null => {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
    return null;
  }
  return value;
};

const sanitizeColumn = (column: Column, index: number): Column => {
  const derivedKind: ColumnKind = column.kind
    ?? (column.isBase ? 'base' : 'manual');

  const enforcedMode = (derivedKind === 'base' || derivedKind === 'global-discount' || derivedKind === 'global-increase' || derivedKind === 'product-discount')
    ? 'fixed'
    : column.mode ?? 'fixed';

  const normalized: Column = {
    ...column,
    order: typeof column.order === 'number' && Number.isFinite(column.order) ? column.order : index + 1,
    kind: derivedKind,
    isBase: derivedKind === 'base',
    mode: enforcedMode,
    visible: derivedKind === 'base' ? true : column.visible !== false
  };

  if (derivedKind === 'global-discount' || derivedKind === 'global-increase') {
    normalized.globalRuleType = column.globalRuleType ?? 'percent';
    normalized.globalRuleValue = normalizeGlobalRuleValue(column.globalRuleValue);
  } else {
    delete normalized.globalRuleType;
    delete normalized.globalRuleValue;
  }

  return normalized;
};

export const ensureRequiredColumns = (columns: Column[]): Column[] => {
  const normalized = columns
    .filter(Boolean)
    .map((column, index) => sanitizeColumn(normalizeColumnOrder(column, index), index))
    .sort((a, b) => a.order - b.order);

  let baseColumn: Column | undefined;
  let globalDiscount: Column | undefined;
  let globalIncrease: Column | undefined;
  let productDiscount: Column | undefined;
  const manualColumns: Column[] = [];

  normalized.forEach(column => {
    if (!baseColumn && column.kind === 'base') {
      baseColumn = column;
      return;
    }

    if (column.kind === 'global-discount') {
      globalDiscount = column;
      return;
    }

    if (column.kind === 'global-increase') {
      globalIncrease = column;
      return;
    }

    if (!productDiscount && column.kind === 'product-discount') {
      productDiscount = {
        ...column,
        kind: 'product-discount',
        isBase: false,
        mode: 'fixed'
      };
      return;
    }

    manualColumns.push({ ...column, kind: 'manual', isBase: false });
  });

  const result: Column[] = [];
  let nextOrder = 1;

  const pushColumn = (column: Column): void => {
    result.push({
      ...column,
      order: nextOrder++
    });
  };

  const normalizedBase: Column = baseColumn
    ? {
      ...baseColumn,
      kind: 'base',
      isBase: true,
      visible: true,
      mode: 'fixed'
    }
    : createBaseColumn();

  pushColumn(normalizedBase);

  const ensuredDiscount: Column = globalDiscount
    ? {
      ...globalDiscount,
      kind: 'global-discount',
      isBase: false,
      visible: true,
      mode: 'fixed',
      globalRuleType: globalDiscount.globalRuleType ?? 'percent',
      globalRuleValue: normalizeGlobalRuleValue(globalDiscount.globalRuleValue)
    }
    : createGlobalColumn('global-discount');

  pushColumn(ensuredDiscount);

  const ensuredIncrease: Column = globalIncrease
    ? {
      ...globalIncrease,
      kind: 'global-increase',
      isBase: false,
      visible: true,
      mode: 'fixed',
      globalRuleType: globalIncrease.globalRuleType ?? 'percent',
      globalRuleValue: normalizeGlobalRuleValue(globalIncrease.globalRuleValue)
    }
    : createGlobalColumn('global-increase');

  pushColumn(ensuredIncrease);

  const ensuredProductDiscount: Column = productDiscount
    ? {
      ...productDiscount,
      kind: 'product-discount',
      isBase: false,
      mode: 'fixed'
    }
    : createProductDiscountColumn();

  pushColumn(ensuredProductDiscount);

  manualColumns
    .sort((a, b) => a.order - b.order)
    .forEach(column => {
      pushColumn({
        ...column,
        kind: 'manual',
        isBase: false,
        visible: column.visible !== false,
        mode: column.mode ?? 'fixed'
      });
    });

  return result;
};

export const filterVisibleColumns = (columns: Column[]): Column[] => {
  return columns.filter(col => col.visible).sort((a, b) => a.order - b.order);
};

export const findBaseColumn = (columns: Column[]): Column | undefined => {
  return columns.find(col => col.kind === 'base');
};

export const isGlobalColumn = (column: Column): boolean => {
  return column.kind === 'global-discount' || column.kind === 'global-increase';
};

export const isProductDiscountColumn = (column: Column): boolean => column.kind === 'product-discount';

export const filterProducts = (products: Product[], searchTerm: string): Product[] => {
  if (!searchTerm.trim()) return products;
  
  const term = searchTerm.toLowerCase();
  return products.filter(product => 
    product.sku.toLowerCase().includes(term) ||
    product.name.toLowerCase().includes(term)
  );
};

export const countColumnsByMode = (columns: Column[], mode: 'fixed' | 'volume'): number => {
  return columns.filter(c => c.mode === mode).length;
};

export const countManualColumns = (columns: Column[]): number => {
  return columns.filter(column => column.kind === 'manual').length;
};

export const validateColumnConfiguration = (columns: Column[]): {
  hasBase: boolean;
  hasVisible: boolean;
  isValid: boolean;
} => {
  const hasBase = columns.some(c => c.kind === 'base');
  const hasVisible = columns.some(c => c.visible);
  const hasVisibleEditable = columns.some(c => c.visible && (c.kind === 'base' || c.kind === 'manual' || c.kind === 'product-discount'));
  const isValid = hasBase && hasVisible && hasVisibleEditable;
  
  return { hasBase, hasVisible, isValid };
};

export const formatPrice = (value: number): string => {
  return `S/ ${value.toFixed(2)}`;
};

interface EffectivePriceArgs {
  column: Column;
  explicitPrice?: Price;
  baseValue?: number;
}

export const getEffectivePriceFromBase = ({
  column,
  explicitPrice,
  baseValue
}: EffectivePriceArgs): EffectivePriceResult => {
  const explicitValue = getFixedPriceValue(explicitPrice);
  if (typeof explicitValue === 'number') {
    return { value: explicitValue, source: 'explicit' };
  }

  if (column.kind === 'global-discount' || column.kind === 'global-increase') {
    if (typeof baseValue !== 'number') {
      return { source: 'none' };
    }

    const ruleValue = typeof column.globalRuleValue === 'number' ? column.globalRuleValue : null;
    if (ruleValue === null) {
      return { source: 'none' };
    }

    const ruleType: GlobalRuleType = column.globalRuleType ?? 'percent';
    let computed: number;

    if (ruleType === 'percent') {
      const modifier = ruleValue / 100;
      computed = column.kind === 'global-discount'
        ? baseValue * (1 - modifier)
        : baseValue * (1 + modifier);
    } else {
      computed = column.kind === 'global-discount'
        ? baseValue - ruleValue
        : baseValue + ruleValue;
    }

    return { value: roundCurrency(Math.max(computed, 0)), source: 'global-rule' };
  }

  if (
    column.kind === 'manual' || column.kind === 'product-discount'
  ) {
    return { source: 'none' };
  }

  return { source: 'none' };
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

        const shouldApplyGlobalRule = column.kind === 'global-discount' || column.kind === 'global-increase';
        const baseValueForRule = shouldApplyGlobalRule ? unitBaseValue : undefined;

        unitEntries[unitCode] = getEffectivePriceFromBase({
          column,
          explicitPrice,
          baseValue: baseValueForRule
        });
      });

      columnEntries[column.id] = unitEntries;
    });

    matrix[product.sku] = columnEntries;
  });

  return matrix;
};

export const formatVolumeRanges = (ranges: VolumeRange[]): string => {
  if (ranges.length === 0) return 'Sin rangos';
  
  const sortedRanges = [...ranges].sort((a, b) => a.minQuantity - b.minQuantity);
  
  return sortedRanges.map(range => {
    const maxQty = range.maxQuantity === null ? '+' : `-${range.maxQuantity}`;
    const formattedPrice = formatPrice(range.price);
    return `${range.minQuantity}${maxQty}: ${formattedPrice}`;
  }).join(' • ');
};

export const getVolumePreview = (ranges: VolumeRange[], maxItems: number = 2): string => {
  if (ranges.length === 0) return 'Sin rangos configurados';
  
  const sortedRanges = [...ranges].sort((a, b) => a.minQuantity - b.minQuantity);
  const previewRanges = sortedRanges.slice(0, maxItems);
  
  const preview = previewRanges.map(range => {
    let rangeText = '';
    if (range.maxQuantity === null) {
      rangeText = `${range.minQuantity}+ und.`;
    } else if (range.minQuantity === range.maxQuantity) {
      rangeText = `${range.minQuantity} und.`;
    } else {
      rangeText = `${range.minQuantity}-${range.maxQuantity} und.`;
    }
    return `${rangeText} → ${formatPrice(range.price)}`;
  }).join(' | ');
  
  if (sortedRanges.length > maxItems) {
    return `${preview} | +${sortedRanges.length - maxItems} rango${sortedRanges.length - maxItems > 1 ? 's' : ''} más`;
  }
  
  return preview;
};

// Función para mostrar todos los rangos en el tooltip
export const getVolumeTooltip = (ranges: VolumeRange[]): string => {
  if (ranges.length === 0) return 'Sin rangos configurados';
  
  const sortedRanges = [...ranges].sort((a, b) => a.minQuantity - b.minQuantity);
  
  return sortedRanges.map((range, index) => {
    let rangeText = '';
    if (range.maxQuantity === null) {
      rangeText = `Desde ${range.minQuantity} unidades en adelante`;
    } else if (range.minQuantity === range.maxQuantity) {
      rangeText = `Exactamente ${range.minQuantity} unidad${range.minQuantity > 1 ? 'es' : ''}`;
    } else {
      rangeText = `De ${range.minQuantity} a ${range.maxQuantity} unidades`;
    }
    return `${index + 1}. ${rangeText}: ${formatPrice(range.price)} c/u`;
  }).join('\n');
};

// Función para obtener el rango de precios (min-max) de un precio por volumen
export const getPriceRange = (ranges: VolumeRange[]): string => {
  if (ranges.length === 0) return 'Sin precios';
  
  const prices = ranges.map(r => r.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  
  if (minPrice === maxPrice) {
    return formatPrice(minPrice);
  }
  
  return `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`;
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString();
};

export const calculatePriceForQuantity = (ranges: VolumeRange[], quantity: number): number | null => {
  if (ranges.length === 0) return null;
  
  const sortedRanges = [...ranges].sort((a, b) => a.minQuantity - b.minQuantity);
  
  for (const range of sortedRanges) {
    if (quantity >= range.minQuantity && 
        (range.maxQuantity === null || quantity <= range.maxQuantity)) {
      return range.price;
    }
  }
  
  return null;
};

export const getOptimalQuantityBreakdown = (ranges: VolumeRange[]): Array<{
  range: string;
  price: number;
  savings?: string;
}> => {
  if (ranges.length === 0) return [];
  
  const sortedRanges = [...ranges].sort((a, b) => a.minQuantity - b.minQuantity);
  const breakdown = [];
  
  for (let i = 0; i < sortedRanges.length; i++) {
    const range = sortedRanges[i];
    const rangeStr = range.maxQuantity === null 
      ? `${range.minQuantity}+` 
      : `${range.minQuantity}-${range.maxQuantity}`;
    
    let savings = '';
    if (i > 0) {
      const previousPrice = sortedRanges[0].price;
      const currentPrice = range.price;
      const savingsAmount = previousPrice - currentPrice;
      const savingsPercent = ((savingsAmount / previousPrice) * 100).toFixed(1);
      savings = `Ahorra ${formatPrice(savingsAmount)} (${savingsPercent}%)`;
    }
    
    breakdown.push({
      range: rangeStr,
      price: range.price,
      savings: savings || undefined
    });
  }
  
  return breakdown;
};

export const removeProductPricesForColumn = (products: Product[], columnId: string): Product[] => {
  return products
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
    .filter(product => Object.values(product.prices).some(unitPrices => Object.keys(unitPrices).length > 0));
};

// ====== FUNCIONES PARA MATRIZ POR VOLUMEN ======

/**
 * Calcula el precio unitario basado en la cantidad para una matriz por volumen
 */
export const calculateVolumePrice = (volumePrice: VolumePrice, quantity: number): PriceCalculation => {
  // Ordenar rangos por cantidad mínima
  const sortedRanges = [...volumePrice.ranges].sort((a, b) => a.minQuantity - b.minQuantity);
  
  // Encontrar el rango aplicable
  const applicableRange = sortedRanges.find(range => {
    const meetsMin = quantity >= range.minQuantity;
    const meetsMax = range.maxQuantity === null || quantity <= range.maxQuantity;
    return meetsMin && meetsMax;
  });

  if (!applicableRange) {
    // Si no encuentra rango, usar el primer rango como fallback
    const fallbackRange = sortedRanges[0];
    return {
      unitPrice: fallbackRange.price,
      totalPrice: fallbackRange.price * quantity,
      appliedRange: fallbackRange
    };
  }

  return {
    unitPrice: applicableRange.price,
    totalPrice: applicableRange.price * quantity,
    appliedRange: applicableRange
  };
};

/**
 * Obtiene el precio para cualquier tipo (fijo o volumen)
 */
export const calculatePrice = (price: Price, quantity: number = 1): PriceCalculation => {
  if (price.type === 'fixed') {
    return {
      unitPrice: price.value,
      totalPrice: price.value * quantity
    };
  } else {
    return calculateVolumePrice(price, quantity);
  }
};

/**
 * Valida si los rangos de volumen están bien configurados
 */
export const validateVolumeRanges = (ranges: VolumeRange[]): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  if (ranges.length === 0) {
    errors.push('Debe tener al menos un rango de cantidad');
    return { isValid: false, errors };
  }

  // Ordenar por cantidad mínima
  const sortedRanges = [...ranges].sort((a, b) => a.minQuantity - b.minQuantity);
  
  for (let i = 0; i < sortedRanges.length; i++) {
    const current = sortedRanges[i];
    
    // Validar que minQuantity sea positivo
    if (current.minQuantity <= 0) {
      errors.push(`El rango ${i + 1} debe tener cantidad mínima mayor a 0`);
    }
    
    // Validar que maxQuantity sea mayor que minQuantity (si no es null)
    if (current.maxQuantity !== null && current.maxQuantity <= current.minQuantity) {
      errors.push(`El rango ${i + 1}: cantidad máxima debe ser mayor a la mínima`);
    }
    
    // Validar precio positivo
    if (current.price <= 0) {
      errors.push(`El rango ${i + 1} debe tener precio mayor a 0`);
    }
    
    // Validar continuidad entre rangos
    if (i > 0) {
      const previous = sortedRanges[i - 1];
      if (previous.maxQuantity !== null && current.minQuantity !== previous.maxQuantity + 1) {
        errors.push(`Hay un vacío entre los rangos ${i} y ${i + 1}`);
      }
    }
  }
  
  // Validar que el último rango sea abierto (maxQuantity = null) o que cubra un rango específico
  const lastRange = sortedRanges[sortedRanges.length - 1];
  if (lastRange.maxQuantity === null && sortedRanges.length > 1) {
    // Está bien, el último rango es abierto
  } else if (lastRange.maxQuantity !== null) {
    // Todos los rangos son cerrados, también está bien
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Genera rangos de ejemplo para una nueva matriz por volumen
 */
export const generateDefaultVolumeRanges = (): VolumeRange[] => {
  return [
    {
      id: '1',
      minQuantity: 1,
      maxQuantity: 10,
      price: 0
    },
    {
      id: '2', 
      minQuantity: 11,
      maxQuantity: 50,
      price: 0
    },
    {
      id: '3',
      minQuantity: 51,
      maxQuantity: null, // "en adelante"
      price: 0
    }
  ];
};

/**
 * Formatea un rango de volumen para mostrar
 */
export const formatVolumeRange = (range: VolumeRange): string => {
  if (range.maxQuantity === null) {
    return `${range.minQuantity}+ unidades`;
  }
  return `${range.minQuantity} - ${range.maxQuantity} unidades`;
};

/**
 * Obtiene el precio más bajo de una matriz por volumen
 */
export const getLowestVolumePrice = (volumePrice: VolumePrice): number => {
  return Math.min(...volumePrice.ranges.map(r => r.price));
};

/**
 * Obtiene el precio más alto de una matriz por volumen  
 */
export const getHighestVolumePrice = (volumePrice: VolumePrice): number => {
  return Math.max(...volumePrice.ranges.map(r => r.price));
};