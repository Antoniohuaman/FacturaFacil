import type { Product as CatalogProduct } from '../../features/catalogo-articulos/models/types';

const DEFAULT_UNIT_CODE = 'NIU';

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const isPositive = (value: number): boolean => Number.isFinite(value) && value > 0;

export const normalizeUnitCode = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.toUpperCase();
};

export const resolveUnidadMinima = (product?: CatalogProduct | null): string => {
  return normalizeUnitCode(product?.unidad) || DEFAULT_UNIT_CODE;
};

const findAdditionalUnit = (product: CatalogProduct | undefined | null, normalizedCode: string | undefined) => {
  if (!product || !normalizedCode) {
    return undefined;
  }
  return product.unidadesMedidaAdicionales?.find(unit => normalizeUnitCode(unit.unidadCodigo) === normalizedCode);
};

export const getFactorToUnidadMinima = (
  product?: CatalogProduct | null,
  unitCode?: string | null
): number => {
  const unidadMinima = resolveUnidadMinima(product);
  const normalizedRequested = normalizeUnitCode(unitCode) || unidadMinima;

  if (normalizedRequested === unidadMinima) {
    return 1;
  }

  const match = findAdditionalUnit(product, normalizedRequested);
  const factor = toNumber(match?.factorConversion);
  return isPositive(factor) ? factor : 1;
};

export interface ConvertQuantityInput {
  product?: CatalogProduct | null;
  quantity: number | null | undefined;
  unitCode?: string | null;
}

export const convertToUnidadMinima = (input: ConvertQuantityInput): number => {
  const quantity = toNumber(input.quantity);
  if (quantity === 0) {
    return 0;
  }
  const factor = getFactorToUnidadMinima(input.product, input.unitCode);
  return quantity * factor;
};

export const convertFromUnidadMinima = (input: ConvertQuantityInput): number => {
  const quantity = toNumber(input.quantity);
  if (quantity === 0) {
    return 0;
  }
  const factor = getFactorToUnidadMinima(input.product, input.unitCode);
  if (!isPositive(factor)) {
    return 0;
  }
  return quantity / factor;
};

export interface UnitConversionDescriptor {
  unidadMinima: string;
  unidadSeleccionada: string;
  factorToUnidadMinima: number;
}

export const describeUnitConversion = (
  product?: CatalogProduct | null,
  unitCode?: string | null
): UnitConversionDescriptor => {
  const unidadMinima = resolveUnidadMinima(product);
  const unidadSeleccionada = normalizeUnitCode(unitCode) || unidadMinima;
  const factorToUnidadMinima = getFactorToUnidadMinima(product, unidadSeleccionada);

  return {
    unidadMinima,
    unidadSeleccionada,
    factorToUnidadMinima,
  };
};

export const ensureUnitCode = (
  requested?: string | null,
  fallback?: string
): string => {
  return normalizeUnitCode(requested) || normalizeUnitCode(fallback) || DEFAULT_UNIT_CODE;
};
