import type { Product as CatalogProduct } from '../../pages/Private/features/catalogo-articulos/models/types';
import {
  esCodigoPresentacion,
  extraerCodigoSunat,
  extraerPresentacionId
} from '../units/codigoPresentacion';

/** Subconjunto estructural mínimo de `AdditionalUnitMeasure` que estas utilidades leen — nunca exige `nombre`/`unidadName`/`unidadSymbol`, que son solo de presentación. */
export interface UnidadAdicionalConFactor {
  id?: string;
  unidadCodigo: string;
  factorConversion: number;
}

/**
 * Subconjunto estructural mínimo que estas utilidades realmente necesitan (`unidad` +
 * `unidadesMedidaAdicionales`) — cualquier `CatalogProduct` completo lo satisface, pero también
 * lo satisface una vista parcial de producto (ej. la usada en Compras, que no siempre trae el
 * `Product` completo del catálogo). Evita forzar un cast inseguro en consumidores que solo
 * conocen la unidad y las presentaciones de un producto, no el registro completo.
 */
export interface ProductoConUnidades {
  unidad?: string;
  unidadesMedidaAdicionales?: UnidadAdicionalConFactor[];
}

const DEFAULT_UNIT_CODE = '';

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

export const resolveUnidadMinima = (product?: ProductoConUnidades | null): string => {
  return normalizeUnitCode(product?.unidad) || DEFAULT_UNIT_CODE;
};

const findAdditionalUnit = (
  product: ProductoConUnidades | undefined | null,
  codeOrId: string | undefined
) => {
  if (!product || !codeOrId) return undefined;
  // Busca primero por id exacto (código compuesto extraído o presentacionId directo)
  const byId = product.unidadesMedidaAdicionales?.find(unit => unit.id === codeOrId);
  if (byId) return byId;
  // Luego por código SUNAT normalizado
  const normalizedCode = normalizeUnitCode(codeOrId);
  return product.unidadesMedidaAdicionales?.find(
    unit => normalizeUnitCode(unit.unidadCodigo) === normalizedCode
  );
};

export const getFactorToUnidadMinima = (
  product?: ProductoConUnidades | null,
  unitCode?: string | null
): number => {
  const unidadMinima = resolveUnidadMinima(product);
  const normalizedRequested = normalizeUnitCode(unitCode) || unidadMinima;

  if (normalizedRequested === unidadMinima) return 1;

  // Si es código compuesto (ej: "BX__pres-abc123"), extraer presentacionId para búsqueda exacta
  if (unitCode && esCodigoPresentacion(unitCode)) {
    const presId = extraerPresentacionId(unitCode);
    if (presId) {
      const byId = product?.unidadesMedidaAdicionales?.find(u => u.id === presId);
      if (byId) {
        const factor = toNumber(byId.factorConversion);
        return isPositive(factor) ? factor : 1;
      }
    }
    // Si no encontró por id, intentar por código SUNAT extraído
    const sunatCode = extraerCodigoSunat(unitCode);
    const match = findAdditionalUnit(product, sunatCode);
    const factor = toNumber(match?.factorConversion);
    return isPositive(factor) ? factor : 1;
  }

  const match = findAdditionalUnit(product, unitCode ?? undefined);
  const factor = toNumber(match?.factorConversion);
  return isPositive(factor) ? factor : 1;
};

export interface ConvertQuantityInput {
  product?: ProductoConUnidades | null;
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

// Dada una unidad (puede ser código SUNAT o código compuesto de presentación),
// devuelve el código SUNAT real que debe ir en el XML/comprobante.
export const resolveSunatUnitCode = (
  product: CatalogProduct | null | undefined,
  unitCode: string | null | undefined
): string => {
  if (!unitCode) return '';
  if (esCodigoPresentacion(unitCode)) {
    const presId = extraerPresentacionId(unitCode);
    if (presId) {
      const match = product?.unidadesMedidaAdicionales?.find(u => u.id === presId);
      if (match) return normalizeUnitCode(match.unidadCodigo) || extraerCodigoSunat(unitCode);
    }
    return extraerCodigoSunat(unitCode);
  }
  return unitCode;
};
