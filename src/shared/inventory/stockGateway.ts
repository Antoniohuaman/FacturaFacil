import type { Product as CatalogProduct } from '../../pages/Private/features/catalogo-articulos/models/types';
import type { Warehouse } from '../../pages/Private/features/configuracion-sistema/models/Warehouse';
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

const buildWarehouseMap = (warehouses?: Warehouse[]) => {
  const map = new Map<string, Warehouse>();
  warehouses?.forEach(warehouse => {
    map.set(warehouse.id, warehouse);
  });
  return map;
};

const filterWarehouseIds = (warehouses: Warehouse[] | undefined, establishmentId?: string) => {
  if (!warehouses || warehouses.length === 0) {
    return undefined;
  }
  if (!establishmentId) {
    return undefined;
  }
  const matches = warehouses.filter(wh => wh.establishmentId === establishmentId && wh.isActive !== false);
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

export interface WarehouseStockRecord {
  warehouseId: string;
  warehouseCode?: string;
  warehouseName?: string;
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
  breakdown: WarehouseStockRecord[];
}

export interface ProductStockInput {
  product?: CatalogProduct | null;
  warehouses?: Warehouse[];
  establishmentId?: string;
  respectReservations?: boolean;
}

export const summarizeProductStock = (
  options: ProductStockInput
): ProductStockSummary => {
  const { product, warehouses, establishmentId } = options;
  const respectReservations = options.respectReservations !== false;
  const warehouseMap = buildWarehouseMap(warehouses);
  const filteredIds = filterWarehouseIds(warehouses, establishmentId);
  const unidadMinima = resolveUnidadMinima(product);
  const breakdown: WarehouseStockRecord[] = [];

  if (product?.stockPorAlmacen) {
    const reservedMap = product.stockReservadoPorAlmacen || {};
    Object.entries(product.stockPorAlmacen).forEach(([warehouseId, stockValue]) => {
      if (filteredIds && !filteredIds.has(warehouseId)) {
        return;
      }
      const stock = clampZero(toNumber(stockValue));
      const reservedRaw = respectReservations ? reservedMap[warehouseId] : 0;
      const reserved = clampZero(toNumber(reservedRaw));
      const available = stock <= reserved ? 0 : stock - reserved;
      const meta = warehouseMap.get(warehouseId);

      breakdown.push({
        warehouseId,
        warehouseCode: meta?.code,
        warehouseName: meta?.name,
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
        warehouseId: establishmentId || 'general',
        warehouseCode: undefined,
        warehouseName: undefined,
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

export interface WarehouseResolutionOptions {
  warehouses?: Warehouse[];
  establishmentId?: string;
  preferredWarehouseId?: string;
}

export interface WarehouseFIFOResolutionOptions {
  warehouses?: Warehouse[];
  establishmentId?: string;
}

const normalizeSortValue = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().toLowerCase();
};

const compareWarehousesStable = (a: Warehouse, b: Warehouse): number => {
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
 * 1) almacén principal (isMainWarehouse) si existe
 * 2) resto de almacenes activos en orden estable
 */
export const resolveWarehousesForSaleFIFO = (
  options: WarehouseFIFOResolutionOptions
): Warehouse[] => {
  const { warehouses = [], establishmentId } = options;
  if (!establishmentId || !warehouses.length) {
    return [];
  }

  const matches = warehouses
    .filter(wh => wh.establishmentId === establishmentId && wh.isActive !== false)
    .slice();

  if (!matches.length) {
    return [];
  }

  const mains = matches.filter(wh => Boolean(wh.isMainWarehouse)).sort(compareWarehousesStable);
  const rest = matches.filter(wh => !wh.isMainWarehouse).sort(compareWarehousesStable);
  return [...mains, ...rest];
};

export interface WarehouseDiscountAllocation {
  warehouseId: string;
  qtyUnidadMinima: number;
}

export interface AllocateSaleAcrossWarehousesOptions {
  product: CatalogProduct;
  warehousesOrdered: Warehouse[];
  qtyUnidadMinima: number;
  respectReservations?: boolean;
}

/**
 * Distribuye una venta en unidad mínima a través de almacenes (FIFO),
 * respetando el stock disponible por almacén (stock - reservado).
 * No inventa stock: si no alcanza, retorna una asignación parcial.
 */
export const allocateSaleAcrossWarehouses = (
  options: AllocateSaleAcrossWarehousesOptions
): WarehouseDiscountAllocation[] => {
  const { product, warehousesOrdered } = options;
  const respectReservations = options.respectReservations !== false;
  const requested = toNumber(options.qtyUnidadMinima);
  if (!product || !warehousesOrdered.length || requested <= 0) {
    return [];
  }

  const stockMap = product.stockPorAlmacen ?? {};
  const reservedMap = respectReservations ? (product.stockReservadoPorAlmacen ?? {}) : {};

  let remaining = requested;
  const allocations: WarehouseDiscountAllocation[] = [];

  for (const warehouse of warehousesOrdered) {
    if (remaining <= 0) break;
    const stock = toNumber(stockMap[warehouse.id]);
    const reserved = toNumber(reservedMap[warehouse.id]);
    const available = stock <= reserved ? 0 : stock - reserved;
    if (available <= 0) {
      continue;
    }
    const take = remaining <= available ? remaining : available;
    if (take > 0) {
      allocations.push({ warehouseId: warehouse.id, qtyUnidadMinima: take });
      remaining -= take;
    }
  }

  return allocations;
};

export const resolveWarehouseForSale = (
  options: WarehouseResolutionOptions
): Warehouse | undefined => {
  const { warehouses = [], establishmentId, preferredWarehouseId } = options;
  if (!warehouses.length) {
    return undefined;
  }
  if (preferredWarehouseId) {
    const preferred = warehouses.find(wh => wh.id === preferredWarehouseId);
    if (preferred) {
      return preferred;
    }
  }
  if (establishmentId) {
    const matches = warehouses.filter(wh => wh.establishmentId === establishmentId && wh.isActive !== false);
    const main = matches.find(wh => wh.isMainWarehouse);
    if (main) {
      return main;
    }
    if (matches.length) {
      return matches[0];
    }
  }
  const main = warehouses.find(wh => wh.isMainWarehouse);
  return main || warehouses[0];
};

export const getWarehouseAvailability = (
  summary: ProductStockSummary,
  warehouseId?: string
): WarehouseStockRecord | undefined => {
  if (!summary.breakdown.length) {
    return undefined;
  }
  if (!warehouseId) {
    return summary.breakdown[0];
  }
  return summary.breakdown.find(record => record.warehouseId === warehouseId);
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
  warehouseId: string | undefined,
  movementCantidadUnidadMinima: number
): ProductStockSummary => {
  if (movementCantidadUnidadMinima <= 0) {
    return summary;
  }
  const targetWarehouseId = warehouseId || summary.breakdown[0]?.warehouseId;
  if (!targetWarehouseId) {
    return summary;
  }

  const nextBreakdown = summary.breakdown.map(record => {
    if (record.warehouseId !== targetWarehouseId) {
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
