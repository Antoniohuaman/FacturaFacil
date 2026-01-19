import type { Product as CatalogProduct } from '../../pages/Private/features/catalogo-articulos/models/types';
import type { Almacen } from '../../pages/Private/features/configuracion-sistema/modelos/Almacen';
import {
  convertFromUnidadMinima,
  convertToUnidadMinima,
  describeUnitConversion,
  ensureUnitCode,
  resolveUnidadMinima,
} from './unitConversion';

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

const clampZero = (value: number): number => (value < 0 ? 0 : value);

const buildalmacenMap = (almacenes?: Almacen[]) => {
  const map = new Map<string, Almacen>();
  almacenes?.forEach(almacen => {
    map.set(almacen.id, almacen);
  });
  return map;
};

const filteralmacenIds = (almacenes: Almacen[] | undefined, establishmentId?: string) => {
  if (!almacenes || almacenes.length === 0) {
    return undefined;
  }
  if (!establishmentId) {
    return undefined;
  }
  const matches = almacenes.filter(wh => wh.establishmentId === establishmentId && wh.isActive !== false);
  if (!matches.length) {
    return undefined;
  }
  return new Set(matches.map(wh => wh.id));
};

const pickFallbackStock = (
  product: CatalogProduct | undefined | null,
  establishmentId?: string
): number => {
  if (!product) {
    return 0;
  }
  if (establishmentId && product.stockPorEstablecimiento) {
    const candidate = product.stockPorEstablecimiento[establishmentId];
    if (candidate !== undefined) {
      return clampZero(toNumber(candidate));
    }
  }
  if (product.cantidad !== undefined) {
    return clampZero(toNumber(product.cantidad));
  }
  return 0;
};

export interface almacenestockRecord {
  almacenId: string;
  almacenCode?: string;
  nombreAlmacen?: string;
  establishmentId?: string;
  stock: number;
  reserved: number;
  available: number;
  isFallback?: boolean;
}

export interface ProductStockSummary {
  unidadMinima: string;
  totalStock: number;
  totalReserved: number;
  totalAvailable: number;
  breakdown: almacenestockRecord[];
}

export interface ProductStockInput {
  product?: CatalogProduct | null;
  almacenes?: Almacen[];
  establishmentId?: string;
  respectReservations?: boolean;
}

export const summarizeProductStock = (
  options: ProductStockInput
): ProductStockSummary => {
  const { product, almacenes, establishmentId } = options;
  const respectReservations = options.respectReservations !== false;
  const almacenMap = buildalmacenMap(almacenes);
  const filteredIds = filteralmacenIds(almacenes, establishmentId);
  const unidadMinima = resolveUnidadMinima(product);
  const breakdown: almacenestockRecord[] = [];

  if (product?.stockPorAlmacen) {
    const reservedMap = product.stockReservadoPorAlmacen || {};
    Object.entries(product.stockPorAlmacen).forEach(([almacenId, stockValue]) => {
      if (filteredIds && !filteredIds.has(almacenId)) {
        return;
      }
      const stock = clampZero(toNumber(stockValue));
      const reservedRaw = respectReservations ? reservedMap[almacenId] : 0;
      const reserved = clampZero(toNumber(reservedRaw));
      const available = stock <= reserved ? 0 : stock - reserved;
      const meta = almacenMap.get(almacenId);

      breakdown.push({
        almacenId,
        almacenCode: meta?.code,
        nombreAlmacen: meta?.name,
        establishmentId: meta?.establishmentId,
        stock,
        reserved,
        available,
      });
    });
  }

  if (breakdown.length === 0) {
    const fallbackStock = pickFallbackStock(product, establishmentId);
    if (fallbackStock > 0 || product) {
      breakdown.push({
        almacenId: establishmentId || 'general',
        almacenCode: undefined,
        nombreAlmacen: undefined,
        establishmentId,
        stock: fallbackStock,
        reserved: 0,
        available: fallbackStock,
        isFallback: true,
      });
    }
  }

  const totals = breakdown.reduce(
    (acc, record) => {
      acc.stock += record.stock;
      acc.reserved += record.reserved;
      acc.available += record.available;
      return acc;
    },
    { stock: 0, reserved: 0, available: 0 }
  );

  return {
    unidadMinima,
    totalStock: totals.stock,
    totalReserved: totals.reserved,
    totalAvailable: totals.available,
    breakdown,
  };
};

export interface StockByUnitResult extends ProductStockSummary {
  unidadSeleccionada: string;
  factorToUnidadMinima: number;
  availableInUnidadSeleccionada: number;
}

export const getAvailableStockForUnit = (
  options: ProductStockInput & { unitCode?: string | null }
): StockByUnitResult => {
  const summary = summarizeProductStock(options);
  const unitCode = ensureUnitCode(options.unitCode, summary.unidadMinima);
  const descriptor = describeUnitConversion(options.product, unitCode);
  const availableInUnidadSeleccionada = descriptor.factorToUnidadMinima === 0
    ? 0
    : convertFromUnidadMinima({
        product: options.product,
        quantity: summary.totalAvailable,
        unitCode,
      });

  return {
    ...summary,
    unidadSeleccionada: descriptor.unidadSeleccionada,
    factorToUnidadMinima: descriptor.factorToUnidadMinima,
    availableInUnidadSeleccionada,
  };
};

export interface almacenResolutionOptions {
  almacenes?: Almacen[];
  establishmentId?: string;
  preferredalmacenId?: string;
}

export interface almacenFIFOResolutionOptions {
  almacenes?: Almacen[];
  establishmentId?: string;
}

const normalizeSortValue = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().toLowerCase();
};

const comparealmacenesStable = (a: Almacen, b: Almacen): number => {
  const aCode = normalizeSortValue(a.code);
  const bCode = normalizeSortValue(b.code);
  if (aCode && bCode && aCode !== bCode) {
    return aCode.localeCompare(bCode);
  }
  if (aCode && !bCode) return -1;
  if (!aCode && bCode) return 1;

  const aName = normalizeSortValue(a.name);
  const bName = normalizeSortValue(b.name);
  if (aName && bName && aName !== bName) {
    return aName.localeCompare(bName);
  }
  if (aName && !bName) return -1;
  if (!aName && bName) return 1;

  return a.id.localeCompare(b.id);
};

/**
 * Devuelve la lista ordenada FIFO de almacenes activos del establecimiento:
 * 1) almacén principal (isMainalmacen) si existe
 * 2) resto de almacenes activos en orden estable
 */
export const resolvealmacenesForSaleFIFO = (
  options: almacenFIFOResolutionOptions
): Almacen[] => {
  const { almacenes = [], establishmentId } = options;
  if (!establishmentId || !almacenes.length) {
    return [];
  }

  const matches = almacenes
    .filter(wh => wh.establishmentId === establishmentId && wh.isActive !== false)
    .slice();

  if (!matches.length) {
    return [];
  }

  const mains = matches.filter(wh => Boolean(wh.isMainalmacen)).sort(comparealmacenesStable);
  const rest = matches.filter(wh => !wh.isMainalmacen).sort(comparealmacenesStable);
  return [...mains, ...rest];
};

export interface almacenDiscountAllocation {
  almacenId: string;
  qtyUnidadMinima: number;
}

export interface AllocateSaleAcrossalmacenesOptions {
  product: CatalogProduct;
  almacenesOrdered: Almacen[];
  qtyUnidadMinima: number;
  respectReservations?: boolean;
}

/**
 * Distribuye una venta en unidad mínima a través de almacenes (FIFO),
 * respetando el stock disponible por almacén (stock - reservado).
 * No inventa stock: si no alcanza, retorna una asignación parcial.
 */
export const allocateSaleAcrossalmacenes = (
  options: AllocateSaleAcrossalmacenesOptions
): almacenDiscountAllocation[] => {
  const { product, almacenesOrdered } = options;
  const respectReservations = options.respectReservations !== false;
  const requested = toNumber(options.qtyUnidadMinima);
  if (!product || !almacenesOrdered.length || requested <= 0) {
    return [];
  }

  const stockMap = product.stockPorAlmacen ?? {};
  const reservedMap = respectReservations ? (product.stockReservadoPorAlmacen ?? {}) : {};

  let remaining = requested;
  const allocations: almacenDiscountAllocation[] = [];

  for (const almacen of almacenesOrdered) {
    if (remaining <= 0) break;
    const stock = toNumber(stockMap[almacen.id]);
    const reserved = toNumber(reservedMap[almacen.id]);
    const available = stock <= reserved ? 0 : stock - reserved;
    if (available <= 0) {
      continue;
    }
    const take = remaining <= available ? remaining : available;
    if (take > 0) {
      allocations.push({ almacenId: almacen.id, qtyUnidadMinima: take });
      remaining -= take;
    }
  }

  return allocations;
};

export const resolvealmacenForSale = (
  options: almacenResolutionOptions
): Almacen | undefined => {
  const { almacenes = [], establishmentId, preferredalmacenId } = options;
  if (!almacenes.length) {
    return undefined;
  }
  if (preferredalmacenId) {
    const preferred = almacenes.find(wh => wh.id === preferredalmacenId);
    if (preferred) {
      return preferred;
    }
  }
  if (establishmentId) {
    const matches = almacenes.filter(wh => wh.establishmentId === establishmentId && wh.isActive !== false);
    const main = matches.find(wh => wh.isMainalmacen);
    if (main) {
      return main;
    }
    if (matches.length) {
      return matches[0];
    }
  }
  const main = almacenes.find(wh => wh.isMainalmacen);
  return main || almacenes[0];
};

export const getalmacenAvailability = (
  summary: ProductStockSummary,
  almacenId?: string
): almacenestockRecord | undefined => {
  if (!summary.breakdown.length) {
    return undefined;
  }
  if (!almacenId) {
    return summary.breakdown[0];
  }
  return summary.breakdown.find(record => record.almacenId === almacenId);
};

export const hasSufficientStock = (
  summary: ProductStockSummary,
  requiredCantidadUnidadMinima: number
): boolean => {
  if (requiredCantidadUnidadMinima <= 0) {
    return true;
  }
  return summary.totalAvailable >= requiredCantidadUnidadMinima;
};

export const projectAvailableAfterMovement = (
  summary: ProductStockSummary,
  almacenId: string | undefined,
  movementCantidadUnidadMinima: number
): ProductStockSummary => {
  if (movementCantidadUnidadMinima <= 0) {
    return summary;
  }
  const targetalmacenId = almacenId || summary.breakdown[0]?.almacenId;
  if (!targetalmacenId) {
    return summary;
  }

  const nextBreakdown = summary.breakdown.map(record => {
    if (record.almacenId !== targetalmacenId) {
      return record;
    }
    const nextAvailable = clampZero(record.available - movementCantidadUnidadMinima);
    const delta = record.available - nextAvailable;
    return {
      ...record,
      available: nextAvailable,
      stock: clampZero(record.stock - delta),
    };
  });

  const totals = nextBreakdown.reduce(
    (acc, record) => {
      acc.stock += record.stock;
      acc.reserved += record.reserved;
      acc.available += record.available;
      return acc;
    },
    { stock: 0, reserved: 0, available: 0 }
  );

  return {
    unidadMinima: summary.unidadMinima,
    totalStock: totals.stock,
    totalReserved: totals.reserved,
    totalAvailable: totals.available,
    breakdown: nextBreakdown,
  };
};

export const calculateRequiredUnidadMinima = (
  options: {
    product?: CatalogProduct | null;
    quantity: number | null | undefined;
    unitCode?: string | null;
  }
): number => {
  return convertToUnidadMinima({
    product: options.product,
    quantity: options.quantity,
    unitCode: options.unitCode,
  });
};
