import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CartItem, Currency, DiscountInput, TaxBreakdownRow } from '../../models/comprobante.types';
import type { ProductUnitOption } from '../../../lista-precios/models/PriceTypes';
import { roundCurrency } from '../../../lista-precios/utils/price-helpers/pricing';
import { useCart } from '../hooks/useCart';
import { usePriceBook } from '../../shared/form-core/hooks/usePriceBook';
import { useCurrency } from '../../shared/form-core/hooks/useCurrency';
import { calculateLineaComprobante, buildLinePricingInputFromCartItem } from '../../shared/core/comprobantePricing';
import { buildTaxBreakdownFromLineResults } from '../../shared/core/taxBreakdown';
import { useProductStore } from '../../../catalogo-articulos/hooks/useProductStore';
import { useConfigurationContext } from '../../../configuracion-sistema/contexto/ContextoConfiguracion';
import type { Product as CatalogProduct } from '../../../catalogo-articulos/models/types';

export interface PosPriceListOption {
  id: string;
  label: string;
  isBase: boolean;
}

type PricingNotifier = (title: string, message: string) => void;

const PRICE_COLUMN_STORAGE_KEY = 'pos_price_column';

type CatalogUnit = { code: string; isBase: boolean; label?: string };

const clamp = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
};


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
  const baseCurrencyCode = baseCurrency.code as Currency;
  const documentCurrencyCode = documentCurrency.code as Currency;

  const { state: { taxes } } = useConfigurationContext();

  const pricesIncludeTax = useMemo(() => {
    if (!taxes?.length) {
      return true;
    }
    const prioritized = taxes.find((tax) => tax.isDefault && tax.isActive && tax.category === 'SALES');
    const fallback = prioritized ?? taxes.find((tax) => tax.isActive);
    return fallback?.includeInPrice ?? true;
  }, [taxes]);

  const [appliedDiscount, setAppliedDiscount] = useState<DiscountInput | null>(null);

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

  useEffect(() => {
    if (!cartItems.length && appliedDiscount) {
      setAppliedDiscount(null);
    }
  }, [appliedDiscount, cartItems.length]);

  const linePricingResults = useMemo(() => (
    cartItems.map((item) => {
      const catalogProduct = catalogLookup.get(item.id) || catalogLookup.get(item.code || '');
      return calculateLineaComprobante(
        buildLinePricingInputFromCartItem(item, catalogProduct, { priceIncludesTax: pricesIncludeTax }),
      );
    })
  ), [cartItems, catalogLookup, pricesIncludeTax]);

  const baseSummary = useMemo(() => {
    const subtotal = linePricingResults.reduce((sum, line) => sum + line.subtotal, 0);
    const igv = linePricingResults.reduce((sum, line) => sum + line.igv, 0);
    return {
      subtotal,
      igv,
      total: subtotal + igv,
    };
  }, [linePricingResults]);

  const taxBreakdownBase: TaxBreakdownRow[] = useMemo(
    () => buildTaxBreakdownFromLineResults(cartItems, linePricingResults),
    [cartItems, linePricingResults],
  );

  const baseTotalsDoc = useMemo(() => ({
    subtotal: roundCurrency(convertPrice(baseSummary.subtotal, baseCurrencyCode, documentCurrencyCode)),
    igv: roundCurrency(convertPrice(baseSummary.igv, baseCurrencyCode, documentCurrencyCode)),
    total: roundCurrency(convertPrice(baseSummary.total, baseCurrencyCode, documentCurrencyCode)),
  }), [baseSummary, baseCurrencyCode, documentCurrencyCode, convertPrice]);

  const taxBreakdownDocBase: TaxBreakdownRow[] = useMemo(
    () => taxBreakdownBase.map((row) => ({
      ...row,
      taxableBase: roundCurrency(convertPrice(row.taxableBase, baseCurrencyCode, documentCurrencyCode)),
      taxAmount: roundCurrency(convertPrice(row.taxAmount, baseCurrencyCode, documentCurrencyCode)),
      totalAmount: roundCurrency(convertPrice(row.totalAmount, baseCurrencyCode, documentCurrencyCode)),
    })),
    [baseCurrencyCode, documentCurrencyCode, convertPrice, taxBreakdownBase],
  );

  type DiscountTarget = 'subtotal' | 'total';

  type NormalizedDiscount = {
    mode: DiscountInput['mode'];
    baseAmount: number;
    percent: number;
    amountInDocument: number;
    target: DiscountTarget;
  };

  const normalizeDiscountInput = useCallback((input: DiscountInput | null): NormalizedDiscount | null => {
    if (!input) {
      return null;
    }
    const discountTarget: DiscountTarget = pricesIncludeTax ? 'total' : 'subtotal';
    const referenceBase = discountTarget === 'total' ? baseSummary.total : baseSummary.subtotal;
    if (referenceBase <= 0) {
      return null;
    }

    if (input.mode === 'percent') {
      const percentValue = clamp(input.value, 0, 100);
      if (percentValue <= 0) {
        return null;
      }
      const baseAmount = (referenceBase * percentValue) / 100;
      const amountInDocument = convertPrice(baseAmount, baseCurrencyCode, documentCurrencyCode);
      return {
        mode: 'percent',
        baseAmount,
        percent: percentValue,
        amountInDocument,
        target: discountTarget,
      };
    }

    const sourceCurrency = (input.currency ?? documentCurrencyCode) as Currency;
    const safeValue = Math.max(Number.isFinite(input.value) ? input.value : 0, 0);
    if (safeValue <= 0) {
      return null;
    }
    const baseAmountRaw = convertPrice(safeValue, sourceCurrency, baseCurrencyCode);
    if (baseAmountRaw <= 0) {
      return null;
    }
    const baseAmount = Math.min(baseAmountRaw, referenceBase);
    if (baseAmount <= 0) {
      return null;
    }
    const amountInDocument = convertPrice(baseAmount, baseCurrencyCode, documentCurrencyCode);
    const percent = referenceBase > 0 ? (baseAmount / referenceBase) * 100 : 0;
    return {
      mode: 'amount',
      baseAmount,
      percent,
      amountInDocument,
      target: discountTarget,
    };
  }, [baseCurrencyCode, baseSummary.subtotal, baseSummary.total, convertPrice, documentCurrencyCode, pricesIncludeTax]);

  const recalcBaseTotalsWithDiscount = useCallback((discountBaseAmount: number, target: DiscountTarget) => {
    if (!discountBaseAmount || discountBaseAmount <= 0) {
      return baseSummary;
    }

    const eligibleEntries = linePricingResults.reduce<{ index: number; baseValue: number }[]>((entries, line, index) => {
      const baseValue = target === 'total' ? line.total : line.subtotal;
      if (baseValue > 0) {
        entries.push({ index, baseValue });
      }
      return entries;
    }, []);

    if (!eligibleEntries.length) {
      return baseSummary;
    }

    const eligibleSum = eligibleEntries.reduce((sum, entry) => sum + entry.baseValue, 0);
    if (eligibleSum <= 0) {
      return baseSummary;
    }

    const cappedDiscount = Math.min(discountBaseAmount, eligibleSum);
    let remaining = cappedDiscount;
    let subtotalAfter = 0;
    let igvAfter = 0;
    let totalAfter = 0;
    const lastEligibleIndex = eligibleEntries[eligibleEntries.length - 1]?.index ?? -1;

    linePricingResults.forEach((line, index) => {
      const baseValue = target === 'total' ? line.total : line.subtotal;
      if (baseValue > 0 && remaining > 0) {
        let lineDiscount = (baseValue / eligibleSum) * cappedDiscount;
        lineDiscount = Math.min(lineDiscount, baseValue, remaining);
        if (index === lastEligibleIndex) {
          lineDiscount = remaining;
        }

        if (target === 'subtotal') {
          const newSubtotal = line.subtotal - lineDiscount;
          const factor = line.subtotal > 0 ? newSubtotal / line.subtotal : 1;
          const newIgv = line.igv * factor;
          const newTotal = newSubtotal + newIgv;
          subtotalAfter += newSubtotal;
          igvAfter += newIgv;
          totalAfter += newTotal;
        } else {
          const newTotal = line.total - lineDiscount;
          const factor = line.total > 0 ? newTotal / line.total : 1;
          const newSubtotal = line.subtotal * factor;
          const newIgv = line.igv * factor;
          subtotalAfter += newSubtotal;
          igvAfter += newIgv;
          totalAfter += newTotal;
        }

        remaining -= lineDiscount;
      } else {
        subtotalAfter += line.subtotal;
        igvAfter += line.igv;
        totalAfter += line.total;
      }
    });

    return {
      subtotal: Math.max(subtotalAfter, 0),
      igv: Math.max(igvAfter, 0),
      total: Math.max(totalAfter, 0),
    };
  }, [baseSummary, linePricingResults]);

  const computeTotalsWithDiscount = useCallback((input: DiscountInput | null) => {
    const normalized = normalizeDiscountInput(input);
    const adjustedBase = normalized ? recalcBaseTotalsWithDiscount(normalized.baseAmount, normalized.target) : baseSummary;

    // Escalar el desglose de impuestos proporcionalmente al descuento aplicado
    const taxBreakdownDoc: TaxBreakdownRow[] = (() => {
      if (!taxBreakdownDocBase.length || !normalized) {
        return taxBreakdownDocBase;
      }

      const target = normalized.target;
      const factorSubtotal = baseSummary.subtotal > 0 ? adjustedBase.subtotal / baseSummary.subtotal : 1;
      const factorIgv = baseSummary.igv > 0 ? adjustedBase.igv / baseSummary.igv : factorSubtotal;
      const factorTotal = baseSummary.total > 0 ? adjustedBase.total / baseSummary.total : factorSubtotal;

      return taxBreakdownDocBase.map((row) => {
        if (target === 'subtotal') {
          return {
            ...row,
            taxableBase: roundCurrency(row.taxableBase * factorSubtotal),
            taxAmount: roundCurrency(row.taxAmount * factorIgv),
            totalAmount: roundCurrency(row.totalAmount * factorTotal),
          };
        }
        return {
          ...row,
          taxableBase: roundCurrency(row.taxableBase * factorSubtotal),
          taxAmount: roundCurrency(row.taxAmount * factorIgv),
          totalAmount: roundCurrency(row.totalAmount * factorTotal),
        };
      });
    })();

    const subtotalDoc = roundCurrency(convertPrice(adjustedBase.subtotal, baseCurrencyCode, documentCurrencyCode));
    const igvDoc = roundCurrency(convertPrice(adjustedBase.igv, baseCurrencyCode, documentCurrencyCode));
    const totalDoc = roundCurrency(convertPrice(adjustedBase.total, baseCurrencyCode, documentCurrencyCode));

    return {
      subtotal: subtotalDoc,
      igv: igvDoc,
      total: totalDoc,
      currency: documentCurrencyCode,
      discount: normalized
        ? {
            mode: normalized.mode,
            percent: normalized.percent,
            amount: roundCurrency(normalized.amountInDocument),
          }
        : undefined,
      breakdown: {
        subtotalBeforeDiscount: baseTotalsDoc.subtotal,
        igvBeforeDiscount: baseTotalsDoc.igv,
        totalBeforeDiscount: baseTotalsDoc.total,
      },
      taxBreakdown: taxBreakdownDoc,
    };
  }, [baseSummary, baseTotalsDoc, baseCurrencyCode, documentCurrencyCode, convertPrice, normalizeDiscountInput, recalcBaseTotalsWithDiscount, taxBreakdownDocBase]);

  const totalsBeforeDiscount = useMemo(() => computeTotalsWithDiscount(null), [computeTotalsWithDiscount]);

  const totals = useMemo(() => {
    if (!appliedDiscount) {
      return totalsBeforeDiscount;
    }
    const descriptor: DiscountInput = appliedDiscount.mode === 'amount'
      ? { ...appliedDiscount, currency: appliedDiscount.currency ?? baseCurrencyCode }
      : appliedDiscount;
    return computeTotalsWithDiscount(descriptor);
  }, [appliedDiscount, baseCurrencyCode, computeTotalsWithDiscount, totalsBeforeDiscount]);

  const getDiscountPreviewTotals = useCallback((draft: DiscountInput | null) => computeTotalsWithDiscount(draft), [computeTotalsWithDiscount]);

  const applyDiscountValue = useCallback((draft: DiscountInput | null) => {
    if (!draft) {
      setAppliedDiscount(null);
      return;
    }
    if (draft.mode === 'percent') {
      const percentValue = clamp(draft.value, 0, 100);
      if (percentValue <= 0) {
        setAppliedDiscount(null);
        return;
      }
      setAppliedDiscount({ mode: 'percent', value: percentValue });
      return;
    }
    const sourceCurrency = (draft.currency ?? documentCurrencyCode) as Currency;
    const safeValue = Math.max(Number.isFinite(draft.value) ? draft.value : 0, 0);
    if (safeValue <= 0) {
      setAppliedDiscount(null);
      return;
    }
    const baseAmount = convertPrice(safeValue, sourceCurrency, baseCurrencyCode);
    if (baseAmount <= 0) {
      setAppliedDiscount(null);
      return;
    }
    setAppliedDiscount({ mode: 'amount', value: baseAmount, currency: baseCurrencyCode });
  }, [baseCurrencyCode, convertPrice, documentCurrencyCode]);

  const clearDiscount = useCallback(() => {
    setAppliedDiscount(null);
  }, []);

  const displayDiscount = useMemo<DiscountInput | null>(() => {
    if (!appliedDiscount) {
      return null;
    }
    if (appliedDiscount.mode === 'percent') {
      return { mode: 'percent', value: appliedDiscount.value };
    }
    const docAmount = convertPrice(appliedDiscount.value, baseCurrencyCode, documentCurrencyCode);
    return {
      mode: 'amount',
      value: roundCurrency(docAmount),
      currency: documentCurrencyCode,
    };
  }, [appliedDiscount, baseCurrencyCode, convertPrice, documentCurrencyCode]);

  const cartActions = useMemo(
    () => ({ addToCart, removeFromCart, updateCartQuantity, setCartItemQuantity, updateCartItemPrice, clearCart }),
    [addToCart, removeFromCart, setCartItemQuantity, updateCartQuantity, updateCartItemPrice, clearCart],
  );

  return {
    cartItems,
    totals,
    totalsBeforeDiscount,
    discount: displayDiscount,
    pricesIncludeTax,
    priceListOptions,
    selectedPriceListId,
    setSelectedPriceListId,
    registerPricingNotifier,
    getUnitOptionsForProduct,
    formatUnitLabel,
    getPreferredUnitForSku,
    getPriceForProduct,
    onCartItemUnitChange: handleItemUnitChange,
    applyDiscount: applyDiscountValue,
    clearDiscount,
    getDiscountPreviewTotals,
    activePriceListLabel,
    ...cartActions,
  };
};
