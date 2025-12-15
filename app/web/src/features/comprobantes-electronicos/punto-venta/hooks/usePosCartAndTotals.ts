import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CartItem } from '../../models/comprobante.types';
import type { ProductUnitOption } from '../../../lista-precios/models/PriceTypes';
import { roundCurrency } from '../../../lista-precios/utils/price-helpers/pricing';
import { useCart } from '../hooks/useCart';
import { usePriceBook } from '../../shared/form-core/hooks/usePriceBook';
import { useCurrency } from '../../shared/form-core/hooks/useCurrency';
import { calculateCurrencyAwareTotals } from '../../shared/core/currencyTotals';
import { useProductStore } from '../../../catalogo-articulos/hooks/useProductStore';
import type { Product as CatalogProduct } from '../../../catalogo-articulos/models/types';

export interface PosPriceListOption {
  id: string;
  label: string;
  isBase: boolean;
}

type PricingNotifier = (title: string, message: string) => void;

const PRICE_COLUMN_STORAGE_KEY = 'pos_price_column';

type CatalogUnit = { code: string; isBase: boolean; label?: string };


const buildCatalogUnitOptions = (
  products: CatalogProduct[],
  sku: string,
  formatUnitLabel: (code?: string) => string,
) => {
  const product = products.find((p: CatalogProduct) => p.codigo === sku);
  if (!product) return [] as CatalogUnit[];

  const options: CatalogUnit[] = [];
  const baseCode = product.unidad || '';
  if (baseCode) {
    options.push({ code: baseCode, isBase: true });
  }

  product.unidadesMedidaAdicionales?.forEach((u: NonNullable<CatalogProduct['unidadesMedidaAdicionales']>[number]) => {
    if (u?.unidadCodigo) {
      options.push({ code: u.unidadCodigo, isBase: false });
    }
  });

  const dedup = new Map<string, CatalogUnit>();
  options.forEach((opt) => {
    const existing = dedup.get(opt.code);
    if (!existing) {
      dedup.set(opt.code, opt);
    } else if (opt.isBase && !existing.isBase) {
      dedup.set(opt.code, opt);
    }
  });

  return Array.from(dedup.values()).map((opt) => ({ ...opt, label: formatUnitLabel(opt.code) || opt.code }));
};

const mergeUnitOptions = (
  catalogProducts: CatalogProduct[],
  sku: string,
  formatUnitLabel: (code?: string) => string,
  priceBookUnits: (sku: string) => ProductUnitOption[],
): ProductUnitOption[] => {
  const catalog = buildCatalogUnitOptions(catalogProducts, sku, formatUnitLabel).map((opt: CatalogUnit) => ({
    code: opt.code,
    label: opt.label || formatUnitLabel(opt.code) || opt.code,
    isBase: opt.isBase,
  }));
  const priceUnits = priceBookUnits(sku);

  const registry = new Map<string, ProductUnitOption>();
  [...catalog, ...priceUnits].forEach((opt: ProductUnitOption) => {
    if (!opt.code) return;
    const existing = registry.get(opt.code);
    if (!existing) {
      registry.set(opt.code, { ...opt });
      return;
    }
    if (!existing.isBase && opt.isBase) {
      registry.set(opt.code, { ...existing, isBase: true });
    }
    if (!existing.label && opt.label) {
      registry.set(opt.code, { ...existing, label: opt.label });
    }
  });

  return Array.from(registry.values());
};

const readStoredPriceColumn = (validIds: string[], fallbackId?: string): string => {
  try {
    const stored = localStorage.getItem(PRICE_COLUMN_STORAGE_KEY);
    if (stored && validIds.includes(stored)) {
      return stored;
    }
  } catch (error) {
    console.warn('[POS] No se pudo leer la lista de precios guardada', error);
  }
  return fallbackId || validIds[0] || '';
};

export const usePosCartAndTotals = () => {
  const {
    cartItems,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    setCartItemQuantity,
    updateCartItem,
    updateCartItemPrice,
    clearCart,
  } = useCart();

  const { baseCurrency, documentCurrency, convertPrice } = useCurrency();

  const { allProducts: catalogProducts } = useProductStore();
  const catalogLookup = useMemo(() => {
    const map = new Map<string, CatalogProduct>();
    catalogProducts.forEach(product => {
      map.set(product.id, product);
      if (product.codigo) {
        map.set(product.codigo, product);
      }
    });
    return map;
  }, [catalogProducts]);
  const {
    priceColumns,
    baseColumnId,
    getUnitOptionsForSku,
    getPreferredUnitForSku,
    formatUnitLabel,
    getUnitPriceWithFallback,
  } = usePriceBook();

  const priceListOptions: PosPriceListOption[] = useMemo(() => (
    priceColumns.map((column) => ({
      id: column.id,
      label: column.name,
      isBase: column.isBase,
    }))
  ), [priceColumns]);
  const columnLabelById = useMemo(() => {
    const map = new Map<string, string>();
    priceListOptions.forEach((option) => map.set(option.id, option.label));
    return map;
  }, [priceListOptions]);

  const [selectedPriceListId, setSelectedPriceListId] = useState('');
  const hasHydratedSelectionRef = useRef(false);

  useEffect(() => {
    if (!priceListOptions.length || hasHydratedSelectionRef.current) {
      return;
    }
    const initial = readStoredPriceColumn(priceListOptions.map(option => option.id), baseColumnId);
    setSelectedPriceListId(initial);
    hasHydratedSelectionRef.current = true;
  }, [priceListOptions, baseColumnId]);

  useEffect(() => {
    if (!selectedPriceListId) {
      return;
    }
    try {
      localStorage.setItem(PRICE_COLUMN_STORAGE_KEY, selectedPriceListId);
    } catch (error) {
      console.warn('[POS] No se pudo guardar la lista de precios seleccionada', error);
    }
  }, [selectedPriceListId]);

  const pricingNotifierRef = useRef<PricingNotifier | null>(null);
  const missingPriceWarningsRef = useRef<Set<string>>(new Set());

  const registerPricingNotifier = useCallback((notifier?: PricingNotifier) => {
    pricingNotifierRef.current = notifier ?? null;
  }, []);

  const getUnitOptionsForProduct = useCallback(
    (sku: string): ProductUnitOption[] => {
      if (!sku) return [];
      return mergeUnitOptions(catalogProducts, sku, formatUnitLabel, getUnitOptionsForSku);
    },
    [catalogProducts, formatUnitLabel, getUnitOptionsForSku],
  );

  const activePriceListLabel = columnLabelById.get(selectedPriceListId) || columnLabelById.get(baseColumnId || '') || '';

  const resolveSku = useCallback((item: Pick<CartItem, 'code' | 'id'>) => {
    return item.code || String(item.id);
  }, []);

  const getPriceForProduct = useCallback((sku: string, unitCode?: string, columnId?: string): number | undefined => {
    if (!sku) return undefined;
    const targetColumn = columnId || selectedPriceListId || baseColumnId;
    const result = getUnitPriceWithFallback({ sku, selectedUnitCode: unitCode, priceListId: targetColumn });
    return result.hasPrice ? result.price : undefined;
  }, [baseColumnId, getUnitPriceWithFallback, selectedPriceListId]);

  const applyPriceToItem = useCallback((item: CartItem, unitCode?: string, options?: { forceReprice?: boolean }) => {
    const sku = resolveSku(item);
    if (!sku) {
      return;
    }
    const normalizedUnit = getPreferredUnitForSku(sku, unitCode || item.unidadMedida || item.unit);
    const updates: Partial<CartItem> = {};
    if (normalizedUnit && normalizedUnit !== item.unidadMedida) {
      updates.unidadMedida = normalizedUnit;
      updates.unit = normalizedUnit;
    }

    const shouldSkipPricing = item.isManualPrice && !options?.forceReprice;
    if (shouldSkipPricing) {
      if (Object.keys(updates).length > 0) {
        updateCartItem(item.id, updates);
      }
      return;
    }

    const targetColumn = selectedPriceListId || baseColumnId;
    const priceResult = getUnitPriceWithFallback({
      sku,
      selectedUnitCode: normalizedUnit,
      priceListId: targetColumn,
    });

    const resolvedColumnId = priceResult.usedColumnId || targetColumn;

    if (priceResult.hasPrice) {
      const rounded = roundCurrency(priceResult.price);
      if (rounded !== item.price) {
        updates.price = rounded;
        updates.basePrice = rounded;
        if (item.isManualPrice) {
          updates.isManualPrice = false;
        }
      }
      if (item.priceColumnId !== resolvedColumnId) {
        updates.priceColumnId = resolvedColumnId;
        updates.priceColumnLabel = activePriceListLabel;
      }
    } else {
      if (resolvedColumnId) {
        const warningKey = `${sku}:${normalizedUnit || 'default'}:${resolvedColumnId}`;
        if (!missingPriceWarningsRef.current.has(warningKey)) {
          pricingNotifierRef.current?.(
            'Precio no configurado',
            `El producto ${item.name || sku} no tiene precio para ${activePriceListLabel}.`
          );
          missingPriceWarningsRef.current.add(warningKey);
        }
      }
      updates.price = 0;
      updates.basePrice = 0;
      updates.isManualPrice = true;
      updates.priceColumnId = resolvedColumnId;
      updates.priceColumnLabel = activePriceListLabel;
    }

    if (Object.keys(updates).length > 0) {
      updateCartItem(item.id, updates);
    }
  }, [activePriceListLabel, baseColumnId, getPreferredUnitForSku, getUnitPriceWithFallback, resolveSku, selectedPriceListId, updateCartItem]);

  useEffect(() => {
    missingPriceWarningsRef.current.clear();
  }, [selectedPriceListId]);

  useEffect(() => {
    if (!selectedPriceListId) {
      return;
    }
    cartItems.forEach(item => {
      const shouldForce = item.isManualPrice && (!item.price || item.price === 0);
      applyPriceToItem(item, undefined, { forceReprice: shouldForce });
    });
  }, [applyPriceToItem, cartItems, selectedPriceListId]);

  const handleItemUnitChange = useCallback((itemId: string, nextUnit: string) => {
    const target = cartItems.find(item => item.id === itemId);
    if (!target) {
      return;
    }
    applyPriceToItem(target, nextUnit, { forceReprice: true });
  }, [applyPriceToItem, cartItems]);

  const totals = useMemo(
    () =>
      calculateCurrencyAwareTotals({
        items: cartItems,
        catalogLookup,
        baseCurrencyCode: baseCurrency.code,
        documentCurrencyCode: documentCurrency.code,
        convert: convertPrice,
      }),
    [baseCurrency.code, cartItems, catalogLookup, convertPrice, documentCurrency.code],
  );

  const cartActions = useMemo(
    () => ({ addToCart, removeFromCart, updateCartQuantity, setCartItemQuantity, updateCartItemPrice, clearCart }),
    [addToCart, removeFromCart, setCartItemQuantity, updateCartQuantity, updateCartItemPrice, clearCart],
  );

  return {
    cartItems,
    totals,
    priceListOptions,
    selectedPriceListId,
    setSelectedPriceListId,
    registerPricingNotifier,
    getUnitOptionsForProduct,
    formatUnitLabel,
    getPreferredUnitForSku,
    getPriceForProduct,
    onCartItemUnitChange: handleItemUnitChange,
    activePriceListLabel,
    ...cartActions,
  };
};
