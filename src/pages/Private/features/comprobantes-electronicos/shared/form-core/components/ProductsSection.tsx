/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { CartItem, Currency, PaymentTotals, DiscountInput, DiscountMode } from '../../../models/comprobante.types';
import ProductSelector from '../../../lista-comprobantes/pages/ProductSelector';
import { CheckSquare, Square, SlidersHorizontal, Percent, Wrench } from 'lucide-react';
import { RadioButton } from '@/contasis';
import { usePriceBook } from '../hooks/usePriceBook';
import type { PriceColumnOption } from '../hooks/usePriceBook';
import { roundCurrency } from '../../../../lista-precios/utils/price-helpers/pricing';
import { learnBasePriceIfMissing } from '../../../../lista-precios/utils/learnBasePrice';
import { useProductStore } from '../../../../catalogo-articulos/hooks/useProductStore';
import type { Product } from '../../../../catalogo-articulos/models/types';
import { useCurrency } from '../hooks/useCurrency';
import { TaxBreakdownSummary } from '../../ui/TaxBreakdownSummary';
import { useConfigurationContext } from '../../../../configuracion-sistema/contexto/ContextoConfiguracion';
import { useUserSession } from '@/contexts/UserSessionContext';
import type { Almacen } from '../../../../configuracion-sistema/modelos/Almacen';
import type { StockAdjustmentData } from '../../../../gestion-inventario/models';
import AdjustmentModal from '../../../../gestion-inventario/components/modals/AdjustmentModal';
import { registrarAjusteDeStock } from '../../../../../../../shared/inventory/accionesStock';
import { summarizeProductStock } from '../../../../../../../shared/inventory/stockGateway';

type UnitOption = {
  code: string;
  label: string;
  isBase?: boolean;
};

const buildCatalogUnitOptions = (
  products: Product[] | undefined,
  sku: string,
  formatUnitLabel: (unitCode: string, isBase?: boolean) => string
): UnitOption[] => {
  if (!products?.length) return [];

  const product = products.find((p) => p.codigo === sku);
  if (!product) return [];

  const options: UnitOption[] = [];

  if (product.unidad) {
    const code = product.unidad ?? '';
    if (code) {
      options.push({ code, label: formatUnitLabel(code, true), isBase: true });
    }
  }

  const presentationUnits = product?.unidadesMedidaAdicionales ?? [];
  presentationUnits.forEach((u) => {
    if (!u?.unidadCodigo) return;
    const code = u.unidadCodigo;
    const exists = options.some((opt) => opt.code === code);
    if (!exists) {
      options.push({ code, label: formatUnitLabel(code, false) });
    }
  });

  return options;
};

const mergeUnitOptions = (
  products: Product[] | undefined,
  sku: string,
  formatUnitLabel: (unitCode: string, isBase?: boolean) => string,
  priceBookUnitOptions: UnitOption[]
): UnitOption[] => {
  const catalogOptions = buildCatalogUnitOptions(products, sku, formatUnitLabel);
  const combined = [...catalogOptions];

  priceBookUnitOptions.forEach((pbUnit) => {
    if (combined.some((opt) => opt.code === pbUnit.code)) return;
    combined.push({ ...pbUnit, label: formatUnitLabel(pbUnit.code, pbUnit.isBase) });
  });

  return combined;
};

interface ProductsSectionProps {
  cartItems: CartItem[];
  addProductsFromSelector: (products: { product: any; quantity: number }[]) => void;
  updateCartItem: (id: string, updates: Partial<CartItem>) => void;
  removeFromCart: (id: string) => void;
  totals: PaymentTotals;
  totalsBeforeDiscount?: PaymentTotals;
  globalDiscount?: DiscountInput | null;
  onApplyGlobalDiscount?: (discount: DiscountInput | null) => void;
  onClearGlobalDiscount?: () => void;
  getGlobalDiscountPreviewTotals?: (discount: DiscountInput | null) => PaymentTotals;
  refreshKey?: number;
  selectedEstablecimientoId?: string;
  preferredPriceColumnId?: string;
}

// ===================================================================
// DEFINICIÓN DE COLUMNAS DISPONIBLES
// ===================================================================

export interface ColumnConfig {
  id: string;
  label: string;
  isFixed: boolean; // No se puede ocultar
  isFixedPosition?: 'end'; // Posición fija al final
  isVisible: boolean;
  width?: string;
  minWidth?: string;
  align?: 'left' | 'center' | 'right';
  order: number; // ✅ Orden de las columnas
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  // Columnas fijas del inicio
  { id: 'producto', label: 'Producto', isFixed: true, isVisible: true, align: 'left', minWidth: '200px', order: 1 },
  { id: 'codigo', label: 'Código', isFixed: true, isVisible: true, align: 'left', width: '120px', order: 2 },
  { id: 'cantidad', label: 'Cantidad', isFixed: true, isVisible: true, align: 'center', width: '140px', order: 3 },
  { id: 'unidad', label: 'Unidad', isFixed: true, isVisible: true, align: 'center', minWidth: '140px', order: 4 },

  // Columnas opcionales (configurables)
    { id: 'imagen', label: 'Imagen', isFixed: false, isVisible: true, align: 'center', width: '80px', order: 10 },
  { id: 'alias', label: 'Alias', isFixed: false, isVisible: false, align: 'left', minWidth: '140px', order: 11 },
  { id: 'descripcion', label: 'Descripción', isFixed: false, isVisible: false, align: 'left', minWidth: '200px', order: 12 },
  { id: 'categoria', label: 'Categoría', isFixed: false, isVisible: false, align: 'left', width: '130px', order: 13 },
  { id: 'marca', label: 'Marca', isFixed: false, isVisible: false, align: 'left', width: '120px', order: 14 },
  { id: 'modelo', label: 'Modelo', isFixed: false, isVisible: false, align: 'left', width: '120px', order: 15 },
  { id: 'tipoProducto', label: 'Tipo', isFixed: false, isVisible: false, align: 'center', width: '100px', order: 16 },
  { id: 'tipoExistencia', label: 'Tipo Existencia', isFixed: false, isVisible: false, align: 'left', minWidth: '140px', order: 17 },
  { id: 'codigoBarras', label: 'Cód. Barras', isFixed: false, isVisible: false, align: 'left', width: '130px', order: 18 },
  { id: 'codigoFabrica', label: 'Cód. Fábrica', isFixed: false, isVisible: false, align: 'left', width: '130px', order: 19 },
  { id: 'codigoSunat', label: 'Cód. SUNAT', isFixed: false, isVisible: false, align: 'left', width: '130px', order: 20 },
    { id: 'stock', label: 'Stock', isFixed: false, isVisible: true, align: 'center', width: '90px', order: 21 },
  { id: 'precioCompra', label: 'P. Compra', isFixed: false, isVisible: false, align: 'right', width: '110px', order: 22 },
  { id: 'descuento', label: 'Descuento %', isFixed: false, isVisible: false, align: 'right', width: '120px', order: 23 },
  { id: 'peso', label: 'Peso (kg)', isFixed: false, isVisible: false, align: 'right', width: '100px', order: 24 },
  { id: 'impuesto', label: 'Impuesto', isFixed: false, isVisible: false, align: 'center', minWidth: '140px', order: 25 },

  // ✅ Columnas fijas SIEMPRE al final (orden 900+)
  { id: 'precio', label: 'Precio U.', isFixed: true, isFixedPosition: 'end', isVisible: true, align: 'right', minWidth: '180px', order: 996 },
  { id: 'subtotal', label: 'Subtotal', isFixed: true, isFixedPosition: 'end', isVisible: true, align: 'right', width: '110px', order: 997 },
  { id: 'total', label: 'Total', isFixed: true, isFixedPosition: 'end', isVisible: true, align: 'right', width: '110px', order: 998 },
  { id: 'accion', label: 'Acción', isFixed: true, isFixedPosition: 'end', isVisible: true, align: 'center', width: '70px', order: 999 },
];

const STORAGE_KEY = 'comprobantes_table_columns_config';

// ===================================================================
// COMPONENTE PRINCIPAL
// ===================================================================

const ProductsSection: React.FC<ProductsSectionProps> = ({
  cartItems,
  addProductsFromSelector,
  updateCartItem,
  removeFromCart,
  totals,
   totalsBeforeDiscount,
   globalDiscount,
   onApplyGlobalDiscount,
   onClearGlobalDiscount,
   getGlobalDiscountPreviewTotals,
  refreshKey = 0,
  preferredPriceColumnId,
  selectedEstablecimientoId,
}) => {
  const { baseCurrency, documentCurrency, formatPrice, convertPrice } = useCurrency();
  const documentDecimals = documentCurrency.decimalPlaces ?? 2;

  const { session } = useUserSession();
  const { state: configState } = useConfigurationContext();

  const almacenesActivosDelEstablecimiento = useMemo<Almacen[]>(() => {
    if (!selectedEstablecimientoId) {
      return [];
    }
    return configState.almacenes.filter(
      (almacen) => almacen.estaActivoAlmacen && almacen.establecimientoId === selectedEstablecimientoId
    );
  }, [configState.almacenes, selectedEstablecimientoId]);

  const prefilledAlmacenIdParaAjuste = useMemo(() => {
    return almacenesActivosDelEstablecimiento.length === 1 ? almacenesActivosDelEstablecimiento[0].id : null;
  }, [almacenesActivosDelEstablecimiento]);

  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [lastAddedProductId, setLastAddedProductId] = useState<CartItem['id'] | null>(null);

  const convertBaseToDocument = useCallback(
    (amount: number) => convertPrice(amount ?? 0, baseCurrency.code as Currency, documentCurrency.code as Currency),
    [baseCurrency.code, convertPrice, documentCurrency.code],
  );

  const convertDocumentToBase = useCallback(
    (amount: number) => convertPrice(amount ?? 0, documentCurrency.code as Currency, baseCurrency.code as Currency),
    [baseCurrency.code, convertPrice, documentCurrency.code],
  );

  const formatDocumentValue = useCallback(
    (amount: number) => formatPrice(amount ?? 0, documentCurrency.code as Currency),
    [documentCurrency.code, formatPrice],
  );

  const formatBaseAsDocument = useCallback(
    (amount: number) => formatDocumentValue(convertBaseToDocument(amount ?? 0)),
    [convertBaseToDocument, formatDocumentValue],
  );

  const totalsCurrencyCode = (totals.currency ?? documentCurrency.code) as Currency;
  const globalDiscountAmount = totals.discount?.amount ?? 0;
  const canEditGlobalDiscount =
    Boolean(totalsBeforeDiscount && onApplyGlobalDiscount && onClearGlobalDiscount && getGlobalDiscountPreviewTotals);

  const handleAddProductsFromSelector = useCallback((products: Parameters<ProductsSectionProps['addProductsFromSelector']>[0]) => {
    addProductsFromSelector(products);
    if (products.length === 1) {
      setLastAddedProductId(products[0].product.id as CartItem['id']);
    }
  }, [addProductsFromSelector]);

  useEffect(() => {
    if (!lastAddedProductId) return;
    const timeoutId = window.setTimeout(() => {
      setLastAddedProductId(null);
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [lastAddedProductId]);
  // ===================================================================
  // ESTADO DE CONFIGURACIÓN DE COLUMNAS
  // ===================================================================

  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const savedConfig = JSON.parse(saved) as ColumnConfig[];
        // Merge with defaults to handle new columns
        return DEFAULT_COLUMNS.map(defaultCol => {
          const savedCol = savedConfig.find(sc => sc.id === defaultCol.id);
          return savedCol ? { ...defaultCol, isVisible: savedCol.isVisible } : defaultCol;
        });
      }
    } catch (e) {
      console.error('Error loading column configuration:', e);
    }
    return DEFAULT_COLUMNS;
  });

  const [showColumnConfig, setShowColumnConfig] = useState(false);

  const {
    hasSelectableColumns,
    baseColumnId,
    globalDiscountColumn,
    globalIncreaseColumn,
    getUnitOptionsForSku,
    getPreferredUnitForSku,
    formatUnitLabel,
    getPriceOptionsFor,
    resolveMinPrice,
    getUnitPriceWithFallback
  } = usePriceBook();

  const { allProducts: catalogProducts } = useProductStore();

  const refrescarStockEnCarrito = useCallback(() => {
    if (!selectedEstablecimientoId) {
      return;
    }

    cartItems.forEach((item) => {
      const catalogProduct = catalogProducts.find(
        (product) => product.id === item.id || (product.codigo && product.codigo === item.code)
      );

      if (!catalogProduct) {
        return;
      }

      const summary = summarizeProductStock({
        product: catalogProduct,
        almacenes: configState.almacenes,
        EstablecimientoId: selectedEstablecimientoId,
      });

      if (item.stock !== summary.totalAvailable) {
        updateCartItem(item.id, { stock: summary.totalAvailable });
      }
    });
  }, [cartItems, catalogProducts, configState.almacenes, selectedEstablecimientoId, updateCartItem]);

  const handleConfirmarAjusteDeStock = useCallback((data: StockAdjustmentData) => {
    const producto = catalogProducts.find((p) => p.id === data.productoId);
    const almacen = configState.almacenes.find((w) => w.id === data.almacenId);

    if (!producto || !almacen) {
      return;
    }

    registrarAjusteDeStock({
      producto,
      almacen,
      datosAjuste: data,
      usuario: session?.userName || 'Usuario',
    });

    setShowAdjustmentModal(false);
    refrescarStockEnCarrito();
  }, [catalogProducts, configState.almacenes, refrescarStockEnCarrito, session?.userName]);

  const getUnitOptionsForProduct = useCallback(
    (sku: string) => {
      const priceBookUnits = getUnitOptionsForSku(sku);
      return mergeUnitOptions(catalogProducts, sku, formatUnitLabel, priceBookUnits);
    },
    [catalogProducts, formatUnitLabel, getUnitOptionsForSku]
  );

  const normalizedDiscountDefault = useMemo(() => {
    if (globalDiscountColumn?.globalRuleType !== 'percent') return 0;
    return typeof globalDiscountColumn.globalRuleValue === 'number'
      ? globalDiscountColumn.globalRuleValue
      : 0;
  }, [globalDiscountColumn]);

  const normalizedIncreaseDefault = useMemo(() => {
    if (globalIncreaseColumn?.globalRuleType !== 'percent') return 0;
    return typeof globalIncreaseColumn.globalRuleValue === 'number'
      ? globalIncreaseColumn.globalRuleValue
      : 0;
  }, [globalIncreaseColumn]);

  type GlobalPricingMode = 'none' | 'discount' | 'increase';

  const [globalPricing, setGlobalPricing] = useState<{
    mode: GlobalPricingMode;
    discountPercent: number;
    increasePercent: number;
  }>(() => ({
    mode: 'none',
    discountPercent: normalizedDiscountDefault,
    increasePercent: normalizedIncreaseDefault
  }));

  useEffect(() => {
    setGlobalPricing(prev => {
      const nextDiscount = prev.mode === 'discount' ? prev.discountPercent : normalizedDiscountDefault;
      const nextIncrease = prev.mode === 'increase' ? prev.increasePercent : normalizedIncreaseDefault;
      if (nextDiscount === prev.discountPercent && nextIncrease === prev.increasePercent) {
        return prev;
      }
      return {
        ...prev,
        discountPercent: nextDiscount,
        increasePercent: nextIncrease
      };
    });
  }, [normalizedDiscountDefault, normalizedIncreaseDefault]);

  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});
  const [priceErrors, setPriceErrors] = useState<Record<string, string>>({});
  const [showGlobalPricing, setShowGlobalPricing] = useState(false);
  const priceModeButtonRef = useRef<HTMLButtonElement | null>(null);
  const priceModePopoverRef = useRef<HTMLDivElement | null>(null);

  const globalRuleLabel = useMemo(() => {
    if (globalPricing.mode === 'discount') {
      return `Descuento global ${Math.abs(globalPricing.discountPercent || 0)}%`;
    }
    if (globalPricing.mode === 'increase') {
      return `Aumento global ${Math.abs(globalPricing.increasePercent || 0)}%`;
    }
    return null;
  }, [globalPricing]);

  const hasGlobalDiscountRule = useMemo(() => {
    return globalDiscountColumn?.globalRuleType === 'percent' && typeof globalDiscountColumn.globalRuleValue === 'number';
  }, [globalDiscountColumn]);

  const hasGlobalIncreaseRule = useMemo(() => {
    return globalIncreaseColumn?.globalRuleType === 'percent' && typeof globalIncreaseColumn.globalRuleValue === 'number';
  }, [globalIncreaseColumn]);

  const discountValueLabel = useMemo(() => {
    return hasGlobalDiscountRule ? `${Math.abs(globalPricing.discountPercent || 0)}%` : 'No disponible';
  }, [globalPricing.discountPercent, hasGlobalDiscountRule]);

  const increaseValueLabel = useMemo(() => {
    return hasGlobalIncreaseRule ? `${Math.abs(globalPricing.increasePercent || 0)}%` : 'No disponible';
  }, [globalPricing.increasePercent, hasGlobalIncreaseRule]);

  // Guardar configuración en localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(columnConfig));
    } catch (e) {
      console.error('Error saving column configuration:', e);
    }
  }, [columnConfig]);

  useEffect(() => {
    if (!showGlobalPricing) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        priceModePopoverRef.current?.contains(target) ||
        priceModeButtonRef.current?.contains(target)
      ) {
        return;
      }
      setShowGlobalPricing(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showGlobalPricing]);

  const globalMultiplier = useMemo(() => {
    if (globalPricing.mode === 'discount') {
      const percent = Math.min(Math.abs(globalPricing.discountPercent || 0), 99.99);
      return Math.max(0.0001, 1 - percent / 100);
    }
    if (globalPricing.mode === 'increase') {
      const percent = Math.abs(globalPricing.increasePercent || 0);
      return 1 + percent / 100;
    }
    return 1;
  }, [globalPricing]);

  const applyGlobalRuleValue = useCallback((value: number) => {
    return roundCurrency(value * globalMultiplier);
  }, [globalMultiplier]);

  const stripGlobalRuleValue = useCallback((value: number) => {
    const safeMultiplier = globalMultiplier === 0 ? 1 : globalMultiplier;
    return roundCurrency(value / safeMultiplier);
  }, [globalMultiplier]);

  const getIgvPercent = useCallback((item: CartItem) => {
    if (typeof item.igv === 'number') {
      return item.igv;
    }
    if (item.igvType === 'igv10') {
      return 10;
    }
    if (item.igvType === 'igv18') {
      return 18;
    }
    return 0;
  }, []);

  const resolveSku = useCallback((item: CartItem) => {
    return item.code || String(item.id);
  }, []);

  const resolveUnitCode = useCallback((item: CartItem) => {
    const sku = resolveSku(item);
    const requestedUnit = item.unidadMedida || item.unidad;
    const unitOptions = getUnitOptionsForProduct(sku);

    if (requestedUnit && unitOptions.some(option => option.code === requestedUnit)) {
      return requestedUnit;
    }

    const baseOption = unitOptions.find(option => option.isBase);
    if (baseOption) return baseOption.code;

    if (unitOptions.length > 0) return unitOptions[0].code;

    return getPreferredUnitForSku(sku, requestedUnit);
  }, [getPreferredUnitForSku, getUnitOptionsForProduct, resolveSku]);

  useEffect(() => {
    const validIds = new Set(cartItems.map(item => String(item.id)));

    setPriceDrafts(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(key => {
        if (!validIds.has(key)) {
          delete next[key];
        }
      });
      return next;
    });

    setPriceErrors(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(key => {
        if (!validIds.has(key)) {
          delete next[key];
        }
      });
      return next;
    });

    setQuantityDrafts(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(key => {
        if (!validIds.has(key)) {
          delete next[key];
        }
      });
      return next;
    });
  }, [cartItems]);

  useEffect(() => {
    if (cartItems.length === 0) {
      return;
    }

    cartItems.forEach(item => {
      const sku = resolveSku(item);
      if (!sku) return;

      const unitCode = resolveUnitCode(item);
      const updates: Partial<CartItem> = {};

      if (item.unidadMedida !== unitCode) {
        updates.unidadMedida = unitCode;
      }

      let priceOptions: PriceColumnOption[] = [];
      if (hasSelectableColumns) {
        priceOptions = getPriceOptionsFor(sku, unitCode);
      }

      const currentOption = priceOptions.find(option => option.columnId === item.priceColumnId);
      const preferredOption = preferredPriceColumnId
        ? priceOptions.find(option => option.columnId === preferredPriceColumnId)
        : undefined;
      const fallbackOption = priceOptions.length > 0
        ? (priceOptions.find(option => option.columnId === baseColumnId) || priceOptions[0])
        : undefined;
      const selectedOption = item.isManualPrice ? undefined : (currentOption || preferredOption || fallbackOption);

      const minPrice = hasSelectableColumns ? resolveMinPrice(sku, unitCode) : undefined;
      const roundedMin = typeof minPrice === 'number' ? roundCurrency(minPrice) : undefined;

      if (typeof roundedMin === 'number') {
        if (item.minAllowedPrice !== roundedMin) {
          updates.minAllowedPrice = roundedMin;
        }
      } else if (typeof item.minAllowedPrice === 'number') {
        updates.minAllowedPrice = undefined;
      }

      if (!item.isManualPrice && selectedOption) {
        if (item.priceColumnId !== selectedOption.columnId) {
          updates.priceColumnId = selectedOption.columnId;
        }
        if (item.priceColumnLabel !== selectedOption.label) {
          updates.priceColumnLabel = selectedOption.label;
        }
        if (item.basePrice !== selectedOption.price) {
          updates.basePrice = roundCurrency(selectedOption.price);
        }
      }

      let baseValue: number | undefined;
      if (item.isManualPrice && typeof item.basePrice === 'number') {
        baseValue = item.basePrice;
      } else if (!item.isManualPrice && selectedOption) {
        baseValue = selectedOption.price;
      } else if (typeof item.basePrice === 'number') {
        baseValue = item.basePrice;
      } else {
        baseValue = stripGlobalRuleValue(item.price || 0);
      }

      if (typeof baseValue === 'number') {
        const computedPrice = applyGlobalRuleValue(baseValue);
        const guardedPrice = typeof roundedMin === 'number'
          ? Math.max(computedPrice, roundedMin)
          : computedPrice;
        if (!Number.isNaN(guardedPrice) && guardedPrice !== item.price) {
          updates.price = roundCurrency(guardedPrice);
        }
      }

      if (Object.keys(updates).length > 0) {
        updateCartItem(item.id, updates);
      }
    });
  }, [applyGlobalRuleValue, baseColumnId, cartItems, getPriceOptionsFor, hasSelectableColumns, preferredPriceColumnId, resolveMinPrice, resolveSku, resolveUnitCode, stripGlobalRuleValue, updateCartItem]);

  const lastPreferredAppliedRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!preferredPriceColumnId) {
      lastPreferredAppliedRef.current = undefined;
      return;
    }
    if (preferredPriceColumnId === lastPreferredAppliedRef.current) {
      return;
    }
    lastPreferredAppliedRef.current = preferredPriceColumnId;

    cartItems.forEach((item) => {
      if (item.isManualPrice) {
        return;
      }
      const sku = resolveSku(item);
      if (!sku) {
        return;
      }
      const unitCode = resolveUnitCode(item);
      const options = hasSelectableColumns ? getPriceOptionsFor(sku, unitCode) : [];
      if (options.length === 0) {
        return;
      }
      const targetOption = options.find((option) => option.columnId === preferredPriceColumnId)
        || options.find((option) => option.columnId === baseColumnId)
        || options[0];
      if (!targetOption) {
        return;
      }
      const updates: Partial<CartItem> = {};
      const roundedBase = roundCurrency(targetOption.price);
      const appliedPrice = applyGlobalRuleValue(targetOption.price);
      if (item.priceColumnId !== targetOption.columnId) {
        updates.priceColumnId = targetOption.columnId;
        updates.priceColumnLabel = targetOption.label;
      }
      if (item.basePrice !== roundedBase) {
        updates.basePrice = roundedBase;
      }
      if (item.price !== appliedPrice) {
        updates.price = appliedPrice;
      }
      if (Object.keys(updates).length > 0) {
        updateCartItem(item.id, updates);
      }
    });
  }, [applyGlobalRuleValue, baseColumnId, cartItems, getPriceOptionsFor, hasSelectableColumns, preferredPriceColumnId, resolveSku, resolveUnitCode, updateCartItem]);

  const clearDraftForItem = useCallback((itemId: string) => {
    setPriceDrafts(prev => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  }, []);

  const clearErrorForItem = useCallback((itemId: string) => {
    setPriceErrors(prev => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  }, []);

  const clearQuantityDraft = useCallback((itemId: string) => {
    setQuantityDrafts(prev => {
      if (!(itemId in prev)) return prev;
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  }, []);

  const formatQuantityDisplay = useCallback((value: number) => {
    if (!Number.isFinite(value)) return '0';
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }, []);

  const handleQuantityInputChange = useCallback((itemId: string, rawValue: string) => {
    const normalized = rawValue.replace(',', '.');
    if (normalized === '' || /^\d*(?:\.\d{0,4})?$/.test(normalized)) {
      setQuantityDrafts(prev => ({ ...prev, [itemId]: normalized }));
    }
  }, []);

  const handleQuantityInputBlur = useCallback((item: CartItem, rawValue: string) => {
    const normalized = rawValue.replace(',', '.');
    const parsed = parseFloat(normalized);
    const fallback = item.quantity && item.quantity > 0 ? item.quantity : 0.01;
    const nextQuantity = Number.isFinite(parsed) ? Math.max(0.01, parsed) : fallback;
    clearQuantityDraft(String(item.id));
    updateCartItem(item.id, { quantity: nextQuantity });
  }, [clearQuantityDraft, updateCartItem]);

  const handleUnitChange = useCallback((item: CartItem, unitCode: string) => {
    const itemKey = String(item.id);
    clearDraftForItem(itemKey);
    clearErrorForItem(itemKey);

    const sku = resolveSku(item);
    const targetColumnId = item.priceColumnId || baseColumnId;
    const priceResult = getUnitPriceWithFallback({
      sku,
      selectedUnitCode: unitCode,
      priceListId: targetColumnId
    });

    const updates: Partial<CartItem> = {
      unidadMedida: unitCode,
      unit: unitCode
    };

    if (priceResult.hasPrice) {
      const roundedBase = roundCurrency(priceResult.price);
      updates.basePrice = roundedBase;
      updates.price = applyGlobalRuleValue(roundedBase);
      updates.isManualPrice = false;
      if (!item.priceColumnId && targetColumnId) {
        updates.priceColumnId = targetColumnId;
      }
    } else {
      updates.basePrice = 0;
      updates.price = 0;
      updates.isManualPrice = true;
      updates.priceColumnId = undefined;
      updates.priceColumnLabel = undefined;
    }

    updateCartItem(item.id, updates);
  }, [applyGlobalRuleValue, baseColumnId, clearDraftForItem, clearErrorForItem, getUnitPriceWithFallback, resolveSku, updateCartItem]);

  const handlePriceOptionChange = useCallback((item: CartItem, columnId: string, options: PriceColumnOption[]) => {
    const option = options.find(entry => entry.columnId === columnId);
    if (!option) return;

    clearDraftForItem(String(item.id));
    clearErrorForItem(String(item.id));

    updateCartItem(item.id, {
      priceColumnId: option.columnId,
      priceColumnLabel: option.label,
      basePrice: roundCurrency(option.price),
      price: applyGlobalRuleValue(option.price),
      isManualPrice: false
    });
  }, [applyGlobalRuleValue, clearDraftForItem, clearErrorForItem, updateCartItem]);

  const handlePriceInputChange = useCallback((itemId: string, value: string) => {
    setPriceDrafts(prev => ({
      ...prev,
      [itemId]: value
    }));
  }, []);

  const handlePriceInputBlur = useCallback((item: CartItem, rawValue: string) => {
    const itemId = String(item.id);
    const normalizedInput = rawValue.replace(',', '.');
    let parsedDocumentValue = parseFloat(normalizedInput);
    const fallbackDocumentValue = convertBaseToDocument(item.price || 0);
    if (Number.isNaN(parsedDocumentValue)) {
      parsedDocumentValue = fallbackDocumentValue;
    }

    let normalizedBase = roundCurrency(convertDocumentToBase(parsedDocumentValue));
    let errorMessage: string | undefined;
    if (typeof item.minAllowedPrice === 'number' && normalizedBase < item.minAllowedPrice) {
      normalizedBase = item.minAllowedPrice;
      errorMessage = `El precio mínimo es ${formatBaseAsDocument(item.minAllowedPrice)}`;
    }

    const baseValue = stripGlobalRuleValue(normalizedBase);

    const sku = resolveSku(item);
    const unitCode = resolveUnitCode(item);
    learnBasePriceIfMissing({
      sku,
      unitCode,
      value: normalizedBase,
      productName: item.name
    });

    updateCartItem(item.id, {
      basePrice: baseValue,
      price: normalizedBase,
      isManualPrice: true
    });

    clearDraftForItem(itemId);

    setPriceErrors(prev => {
      const next = { ...prev };
      if (errorMessage) {
        next[itemId] = errorMessage;
      } else {
        delete next[itemId];
      }
      return next;
    });
  }, [clearDraftForItem, convertBaseToDocument, convertDocumentToBase, formatBaseAsDocument, resolveSku, resolveUnitCode, stripGlobalRuleValue, updateCartItem]);

  const handleGlobalModeChange = useCallback((mode: GlobalPricingMode) => {
    setGlobalPricing(prev => ({ ...prev, mode }));
  }, []);

  // ✅ Columnas visibles ordenadas correctamente
  const visibleColumns = useMemo(() =>
    columnConfig
      .filter(col => col.isVisible)
      .sort((a, b) => a.order - b.order),
    [columnConfig]
  );

  // ✅ Toggle columna
  const toggleColumn = (columnId: string) => {
    setColumnConfig(prev => prev.map(col =>
      col.id === columnId ? { ...col, isVisible: !col.isVisible } : col
    ));
  };

  // ✅ Seleccionar todas las columnas opcionales
  const selectAllOptional = () => {
    setColumnConfig(prev => prev.map(col =>
      col.isFixed ? col : { ...col, isVisible: true }
    ));
  };

  // ✅ Limpiar selección (solo opcionales)
  const clearAllOptional = () => {
    setColumnConfig(prev => prev.map(col =>
      col.isFixed ? col : { ...col, isVisible: false }
    ));
  };

  // ===================================================================
  // RENDERIZADO DE CELDAS
  // ===================================================================

  const renderCell = (columnId: string, item: CartItem) => {
    switch (columnId) {
      case 'producto':
        return (
          <td className="px-3 py-2.5 sticky left-0 bg-white">
            <div>
              <div className="font-medium text-gray-900 text-xs">{item.name}</div>
            </div>
          </td>
        );

      case 'codigo':
        return (
          <td className="px-3 py-2.5">
            <div className="text-[11px] text-gray-600 font-mono">{item.code}</div>
          </td>
        );

      case 'imagen':
        return (
          <td className="px-3 py-4 text-center">
            {item.imagen ? (
              <img src={item.imagen} alt={item.name} className="w-12 h-12 object-cover rounded border border-gray-200 mx-auto" />
            ) : (
              <div className="w-12 h-12 bg-gray-100 rounded border border-gray-200 flex items-center justify-center mx-auto">
                <span className="text-gray-400 text-xs">Sin img</span>
              </div>
            )}
          </td>
        );

      case 'alias':
        return (
          <td className="px-3 py-4 text-sm text-gray-700">
            <span className="italic text-gray-500">{item.alias || '-'}</span>
          </td>
        );

      case 'descripcion':
        return (
          <td className="px-3 py-4">
            <textarea
              value={item.descripcion || ''}
              onChange={(e) => updateCartItem(item.id, { descripcion: e.target.value })}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={2}
              placeholder="Descripción del producto..."
            />
          </td>
        );

      case 'categoria':
        return (
          <td className="px-3 py-4 text-sm text-gray-700">
            {item.category || '-'}
          </td>
        );

      case 'marca':
        return (
          <td className="px-3 py-4 text-sm text-gray-700">
            {item.marca || '-'}
          </td>
        );

      case 'modelo':
        return (
          <td className="px-3 py-4 text-sm text-gray-700">
            {item.modelo || '-'}
          </td>
        );

      case 'tipoProducto':
        return (
          <td className="px-3 py-4 text-center">
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              item.tipoProducto === 'SERVICIO'
                ? 'bg-purple-100 text-purple-800'
                : 'bg-blue-100 text-blue-800'
            }`}>
              {item.tipoProducto || 'BIEN'}
            </span>
          </td>
        );

      case 'tipoExistencia':
        return (
          <td className="px-3 py-4 text-sm text-gray-700">
            {item.tipoExistencia || '-'}
          </td>
        );

      case 'codigoBarras':
        return (
          <td className="px-3 py-4 text-xs text-gray-600 font-mono">
            {item.codigoBarras || '-'}
          </td>
        );

      case 'codigoFabrica':
        return (
          <td className="px-3 py-4 text-xs text-gray-600 font-mono">
            {item.codigoFabrica || '-'}
          </td>
        );

      case 'codigoSunat':
        return (
          <td className="px-3 py-4 text-xs text-gray-600 font-mono">
            {item.codigoSunat || '-'}
          </td>
        );

      case 'stock':
        return (
          <td className="px-3 py-4 text-center">
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              item.stock > 20 ? 'bg-green-100 text-green-800' :
              item.stock > 5 ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {item.stock}
            </span>
          </td>
        );

      case 'precioCompra':
        return (
          <td className="px-3 py-4 text-right text-sm text-gray-700">
            {typeof item.precioCompra === 'number' ? formatBaseAsDocument(item.precioCompra) : '-'}
          </td>
        );

      case 'descuento':
        return (
          <td className="px-3 py-4">
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={item.descuentoProducto || 0}
              onChange={(e) => updateCartItem(item.id, { descuentoProducto: parseFloat(e.target.value) || 0 })}
              className="w-full px-2 py-1 text-right text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </td>
        );

      case 'peso':
        return (
          <td className="px-3 py-4 text-right text-sm text-gray-700">
            {item.peso ? `${item.peso} kg` : '-'}
          </td>
        );

      case 'impuesto': {
        const igvPercent = getIgvPercent(item);
        const fallbackLabel = igvPercent > 0 ? `IGV (${igvPercent.toFixed(2)}%)` : item.igvType === 'inafecto' ? 'Inafecto (0.00%)' : 'Exonerado (0.00%)';
        const igvLabel = item.impuesto || fallbackLabel;
        const subtitle = `(${igvPercent.toFixed(2)}%)`;

        const shouldShowSubtitle = (() => {
          if (!subtitle || !subtitle.trim()) {
            return false;
          }

          if (!igvLabel) {
            return true;
          }

          const normalizedTitle = igvLabel.trim().toLowerCase();
          const normalizedSubtitle = subtitle.trim().toLowerCase();

          if (normalizedTitle === normalizedSubtitle) {
            return false;
          }

          if (normalizedTitle.includes(normalizedSubtitle)) {
            return false;
          }

          return true;
        })();
        return (
          <td className="px-4 py-4 text-center text-sm">
            <div className="inline-flex flex-col items-center px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full min-w-[120px] leading-tight">
              <span>{igvLabel}</span>
              {shouldShowSubtitle && <span className="text-[10px] text-gray-500">{subtitle}</span>}
            </div>
          </td>
        );
      }

      case 'cantidad':
        return (
          <td className="px-3 py-2.5">
            <div className="flex items-center justify-center gap-1.5">
              <button
                className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 text-base font-bold rounded hover:bg-gray-100"
                onClick={() => {
                  const itemKey = String(item.id);
                  clearQuantityDraft(itemKey);
                  updateCartItem(item.id, {
                    quantity: Math.max(0.01, parseFloat((item.quantity - 1).toFixed(2)))
                  });
                }}
                disabled={item.quantity <= 0.01}
              >
                −
              </button>
              <input
                type="number"
                min={0.01}
                step={0.01}
                value={quantityDrafts[String(item.id)] ?? formatQuantityDisplay(item.quantity)}
                className="w-12 h-8 px-1.5 py-0 border border-gray-400 rounded text-center font-semibold text-xs focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 no-number-spinner"
                onChange={e => handleQuantityInputChange(String(item.id), e.target.value)}
                onBlur={e => handleQuantityInputBlur(item, e.target.value)}
              />
              <button
                className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 text-base font-bold rounded hover:bg-gray-100"
                onClick={() => {
                  const itemKey = String(item.id);
                  clearQuantityDraft(itemKey);
                  updateCartItem(item.id, {
                    quantity: parseFloat((item.quantity + 1).toFixed(2))
                  });
                }}
              >
                +
              </button>
            </div>
          </td>
        );

      case 'unidad': {
        const sku = resolveSku(item);
        const resolvedUnit = resolveUnitCode(item);
        const unitOptions = getUnitOptionsForProduct(sku);
        const normalizedUnits = unitOptions.length > 0
          ? unitOptions
          : [{ code: resolvedUnit, label: formatUnitLabel(resolvedUnit) || (item.unidad ?? resolvedUnit), isBase: true }];

        const availableUnits = normalizedUnits.some(option => option.code === resolvedUnit)
          ? normalizedUnits
          : [...normalizedUnits, { code: resolvedUnit, label: formatUnitLabel(resolvedUnit) || resolvedUnit }];

        return (
          <td className="px-4 py-4">
            <select
              value={resolvedUnit}
              onChange={e => handleUnitChange(item, e.target.value)}
              className="w-full text-center text-xs text-gray-700 border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-gray-50"
            >
              {availableUnits.map(unit => (
                <option key={unit.code} value={unit.code}>
                  {unit.label}
                </option>
              ))}
            </select>
          </td>
        );
      }

      case 'precio': {
        const itemKey = String(item.id);
        const options = hasSelectableColumns ? getPriceOptionsFor(resolveSku(item), resolveUnitCode(item)) : [];
        const hasOptions = options.length > 0;
        const selectValue = hasOptions
          ? (options.some(option => option.columnId === item.priceColumnId)
              ? item.priceColumnId || options[0].columnId
              : options[0].columnId)
          : '';
        const displayPrice = convertBaseToDocument(item.price ?? 0);
        const inputValue = priceDrafts[itemKey] ?? displayPrice.toFixed(documentDecimals);
        const minLabel = typeof item.minAllowedPrice === 'number' ? formatBaseAsDocument(item.minAllowedPrice) : null;
        const errorMessage = priceErrors[itemKey];

        return (
          <td className="px-4 py-4 text-right text-sm">
            <div className="flex items-center space-x-1">
              <select
                value={selectValue || ''}
                disabled={!hasOptions}
                className="w-32 px-2 py-1 border rounded text-center text-xs disabled:bg-gray-50 disabled:text-gray-400"
                onChange={e => handlePriceOptionChange(item, e.target.value, options)}
              >
                {hasOptions ? (
                  options.map(option => (
                    <option key={option.columnId} value={option.columnId}>
                      {option.label}
                    </option>
                  ))
                ) : (
                  <option value="">Lista no configurada</option>
                )}
              </select>
              <div className="flex flex-col w-20 text-right">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={inputValue}
                  onChange={e => handlePriceInputChange(itemKey, e.target.value)}
                  onBlur={e => handlePriceInputBlur(item, e.target.value)}
                  className={`w-full px-2 py-1 border rounded text-xs text-right focus:outline-none focus:ring-2 no-number-spinner ${errorMessage ? 'border-red-500 focus:ring-red-500/30' : 'border-gray-300 focus:ring-violet-500/30 focus:border-violet-500'}`}
                />
                {minLabel && (
                  <div className="text-[11px] text-gray-400 mt-0.5 flex items-center justify-between gap-1 whitespace-nowrap">
                    <span>Precio mínimo</span>
                    <span className="font-medium text-gray-500">{minLabel}</span>
                  </div>
                )}
                {errorMessage && (
                  <p className="text-[11px] text-red-500 mt-0.5">{errorMessage}</p>
                )}
              </div>
            </div>
          </td>
        );
      }

      case 'subtotal': {
        const igvPercent = getIgvPercent(item);
        const divisor = igvPercent > 0 ? 1 + igvPercent / 100 : 1;
        const lineTotalBase = (item.price ?? 0) * item.quantity;
        const subtotalValue = divisor === 0 ? 0 : lineTotalBase / divisor;
        return (
          <td className="px-4 py-4 text-right text-sm text-gray-700">
            {formatBaseAsDocument(subtotalValue)}
          </td>
        );
      }

      case 'total': {
        const lineTotalBase = (item.price ?? 0) * item.quantity;
        return (
          <td className="px-4 py-4 text-right font-semibold text-sm text-gray-900">
            {formatBaseAsDocument(lineTotalBase)}
          </td>
        );
      }

      case 'accion':
        return (
          <td className="px-4 py-4 text-center">
            <button
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Eliminar producto"
              onClick={() => removeFromCart(item.id)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"/>
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
            </button>
          </td>
        );

      default:
        return <td className="px-3 py-4 text-sm text-gray-700">-</td>;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3">
      {/* Header compacto */}
      <div className="mb-2.5 pb-2.5 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-semibold text-slate-700 leading-tight">Productos del Comprobante</h3>
          </div>
          <div className="flex items-center gap-2">
            {/* Icono de sliders para configuración */}
            <button
              onClick={() => setShowColumnConfig(!showColumnConfig)}
              className="p-1 text-gray-600 hover:opacity-80 transition-opacity rounded-md"
              title="Personalizar columnas"
              aria-label="Configurar columnas visibles"
            >
              <SlidersHorizontal size={16} />
            </button>

            <button
              onClick={() => setShowAdjustmentModal(true)}
              className="p-1 text-gray-600 hover:opacity-80 transition-opacity rounded-md"
              title="Ajustar stock"
              aria-label="Ajustar stock"
            >
              <Wrench size={16} />
            </button>

            <div className="relative">
              <button
                ref={priceModeButtonRef}
                onClick={() => setShowGlobalPricing(prev => !prev)}
                className={`p-1 text-gray-600 hover:opacity-80 transition-opacity rounded-md ${globalPricing.mode !== 'none' ? 'text-violet-700' : ''}`}
                title="Modo de precios globales"
                aria-label="Configurar regla global de precios"
              >
                <Percent size={16} />
              </button>
              {showGlobalPricing && (
                <div
                  ref={priceModePopoverRef}
                  className="absolute right-0 mt-2 w-56 rounded-lg border border-gray-200 bg-white shadow-lg p-3 z-20"
                >
                  <p className="text-xs text-gray-500 mb-2">
                    Aplica un ajuste porcentual a todas las líneas del comprobante.
                  </p>
                  <div className="space-y-3 text-sm text-gray-700">
                    <RadioButton
                      name="price-mode"
                      value="none"
                      checked={globalPricing.mode === 'none'}
                      onChange={() => handleGlobalModeChange('none')}
                      label="Sin regla global"
                    />
                    <div className="space-y-1">
                      <RadioButton
                        name="price-mode"
                        value="discount"
                        checked={globalPricing.mode === 'discount'}
                        onChange={() => handleGlobalModeChange('discount')}
                        disabled={!hasGlobalDiscountRule}
                        label="Descuento global (%)"
                      />
                      <div className="pl-6">
                        <span className="inline-flex items-center justify-center rounded-md border border-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-700 bg-gray-50">
                          {discountValueLabel}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <RadioButton
                        name="price-mode"
                        value="increase"
                        checked={globalPricing.mode === 'increase'}
                        onChange={() => handleGlobalModeChange('increase')}
                        disabled={!hasGlobalIncreaseRule}
                        label="Aumento global (%)"
                      />
                      <div className="pl-6">
                        <span className="inline-flex items-center justify-center rounded-md border border-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-700 bg-gray-50">
                          {increaseValueLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {globalRuleLabel && (
              <span className="px-2 py-1 text-[11px] font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded">
                {globalRuleLabel}
              </span>
            )}

            {cartItems.length > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-violet-50 border border-violet-200 rounded-lg">
                <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-violet-700">
                  {cartItems.length} {cartItems.length === 1 ? 'producto' : 'productos'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <AdjustmentModal
        isOpen={showAdjustmentModal}
        onClose={() => setShowAdjustmentModal(false)}
        onAdjust={handleConfirmarAjusteDeStock}
        prefilledAlmacenId={prefilledAlmacenIdParaAjuste}
        mode="manual"
      />

      {/* ✅ Panel de configuración de columnas COMPACTO */}
      {showColumnConfig && (
        <div className="mb-3 p-4 bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg border border-violet-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-xs font-semibold text-gray-900">Personalizar columnas</h4>
              <p className="text-[11px] text-gray-600 mt-0.5">
                Selecciona las columnas visibles. Tu configuración se guarda automáticamente.
              </p>
            </div>
            <button
              onClick={() => setShowColumnConfig(false)}
              className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-white/50 transition-colors"
              aria-label="Cerrar panel"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* ✅ Botones de acción compactos */}
          <div className="flex items-center gap-1.5 mb-3">
            <button
              onClick={selectAllOptional}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-violet-700 bg-violet-100 border border-violet-300 rounded-lg hover:bg-violet-200 transition-colors"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              Todo
            </button>
            <button
              onClick={clearAllOptional}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Square className="w-3.5 h-3.5" />
              Limpiar
            </button>
            <div className="ml-auto text-[11px] text-gray-500">
              {columnConfig.filter(c => !c.isFixed && c.isVisible).length} de {columnConfig.filter(c => !c.isFixed).length} activas
            </div>
          </div>

          {/* Grid de columnas compacto */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
            {columnConfig.map(col => (
              <label
                key={col.id}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border transition-all text-[11px] ${
                  col.isFixed
                    ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-70'
                    : col.isVisible
                    ? 'bg-violet-100 border-violet-300 cursor-pointer hover:bg-violet-200'
                    : 'bg-white border-gray-200 cursor-pointer hover:bg-gray-50 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={col.isVisible}
                  disabled={col.isFixed}
                  onChange={() => !col.isFixed && toggleColumn(col.id)}
                  className="w-3.5 h-3.5 text-violet-600 rounded focus:ring-2 focus:ring-violet-500 disabled:opacity-50 cursor-pointer"
                />
                <span className={`${col.isFixed ? 'text-gray-500 font-medium' : col.isVisible ? 'text-violet-900 font-medium' : 'text-gray-700'}`}>
                  {col.label}
                  {col.isFixed && <span className="ml-0.5 text-[10px] text-gray-400">(fija)</span>}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Add Product Form compacto */}
      <div className="mb-4 p-3 bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg border border-violet-100">
        <ProductSelector
          key={`selector-${refreshKey}`}
          onAddProducts={handleAddProductsFromSelector}
          existingProducts={cartItems.map(item => String(item.id))}
        />
      </div>

      {/* ✅ Products Table compacta con inputs h-8 */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-violet-50 to-purple-50 border-b-2 border-violet-200">
            <tr>
              {visibleColumns.map(col => (
                <th
                  key={col.id}
                  className={`px-3 py-2.5 text-[11px] font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap ${
                    col.align === 'center' ? 'text-center' :
                    col.align === 'right' ? 'text-right' :
                    'text-left'
                  }`}
                  style={{
                    width: col.width,
                    minWidth: col.minWidth
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cartItems.map(item => (
              <tr
                key={item.id}
                className={`border-b border-gray-100 hover:bg-violet-50/30 transition-colors duration-150 ${
                  item.id === lastAddedProductId ? 'bg-blue-50' : ''
                }`}
              >
                {visibleColumns.map(col => (
                  <React.Fragment key={`${item.id}-${col.id}`}>
                    {renderCell(col.id, item)}
                  </React.Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totales Section - Tarjeta compacta sticky */}
      <div className="mt-4 border-t border-gray-200 pt-4">
        <div className="flex justify-end">
          <div className="w-80 bg-white rounded-lg border border-gray-200 p-4 shadow-sm md:sticky md:top-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Descuentos</span>
                  {canEditGlobalDiscount && (
                    <GlobalDiscountPopover
                      currency={totalsCurrencyCode}
                      totals={totals}
                      totalsBeforeDiscount={totalsBeforeDiscount!}
                      discount={globalDiscount ?? null}
                      onApplyDiscount={onApplyGlobalDiscount!}
                      onClearDiscount={onClearGlobalDiscount!}
                      getDiscountPreviewTotals={getGlobalDiscountPreviewTotals!}
                    />
                  )}
                </div>
                <span className="text-gray-700 font-medium">
                  {formatPrice(globalDiscountAmount || 0, totalsCurrencyCode)}
                </span>
              </div>

              <TaxBreakdownSummary
                taxBreakdown={totals.taxBreakdown}
                currency={totalsCurrencyCode}
                variant="default"
                subtotalFallback={totals.subtotal ?? 0}
                igvFallback={totals.igv ?? 0}
                totalFallback={totals.total ?? 0}
              />

              <div className="pt-2.5 mt-2.5 border-t-2 border-dashed border-gray-300">
                <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full bg-violet-600" />
                      <span className="text-xs font-semibold tracking-[0.16em] text-violet-700 uppercase">TOTAL</span>
                    </div>
                    <span className="text-2xl font-semibold text-gray-900">{formatPrice(totals.total ?? 0, totalsCurrencyCode)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ProductsSection;

interface GlobalDiscountPopoverProps {
  currency: Currency;
  totals: PaymentTotals;
  totalsBeforeDiscount: PaymentTotals;
  discount: DiscountInput | null;
  onApplyDiscount: (discount: DiscountInput | null) => void;
  onClearDiscount: () => void;
  getDiscountPreviewTotals: (draft: DiscountInput | null) => PaymentTotals;
}

const PERCENT_ERROR_MESSAGE = 'El descuento debe ser menor al 100%.';
const AMOUNT_ERROR_MESSAGE = 'El descuento debe ser menor al total.';

const sanitizeDecimalInput = (rawValue: string): string => rawValue.replace(/[^0-9.,]/g, '');

const GlobalDiscountPopover: React.FC<GlobalDiscountPopoverProps> = ({
  currency,
  totals,
  totalsBeforeDiscount,
  discount,
  onApplyDiscount,
  onClearDiscount,
  getDiscountPreviewTotals,
}) => {
  const { formatPrice } = useCurrency();
  const discountButtonRef = useRef<HTMLButtonElement | null>(null);
  const discountPopoverRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [discountInputMode, setDiscountInputMode] = useState<DiscountMode>('amount');
  const [discountInputValue, setDiscountInputValue] = useState('');
  const [discountInputError, setDiscountInputError] = useState<string | null>(null);

  const hasItems = totalsBeforeDiscount.total > 0;
  const discountBaseDocValue = totalsBeforeDiscount.total;
  const isDiscountActive = Boolean(discount?.value && discount.value > 0);

  const handleDiscountModeChange = useCallback((mode: DiscountMode) => {
    setDiscountInputMode(mode);
    setDiscountInputError(null);
  }, []);

  const syncDraftWithApplied = useCallback(() => {
    setDiscountInputError(null);
    if (discount?.mode === 'percent') {
      setDiscountInputMode('percent');
      setDiscountInputValue(Number.isFinite(discount.value) ? String(discount.value) : '');
      return;
    }
    if (discount?.mode === 'amount') {
      setDiscountInputMode('amount');
      setDiscountInputValue(Number.isFinite(discount.value) ? String(discount.value) : '');
      return;
    }
    setDiscountInputMode('amount');
    setDiscountInputValue('');
  }, [discount]);

  const draftNumericValue = useMemo(() => {
    if (!discountInputValue) {
      return 0;
    }
    const normalized = discountInputValue.replace(',', '.');
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [discountInputValue]);

  const draftDiscount = useMemo<DiscountInput | null>(() => {
    if (draftNumericValue <= 0) {
      return null;
    }
    if (discountInputMode === 'percent') {
      return {
        mode: 'percent',
        value: draftNumericValue,
      };
    }
    return {
      mode: 'amount',
      value: draftNumericValue,
      currency,
    };
  }, [currency, discountInputMode, draftNumericValue]);

  const previewTotals = useMemo(() => {
    if (!isOpen) {
      return totals;
    }
    return getDiscountPreviewTotals(draftDiscount);
  }, [draftDiscount, getDiscountPreviewTotals, isOpen, totals]);

  const canApplyDiscount = hasItems && (!!draftDiscount || !!discount) && !discountInputError;

  const handleDiscountInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeDecimalInput(event.target.value);
    if (!sanitized) {
      setDiscountInputValue('');
      setDiscountInputError(null);
      return;
    }

    const normalized = sanitized.replace(',', '.');
    const parsed = Number.parseFloat(normalized);

    if (!Number.isFinite(parsed)) {
      setDiscountInputValue(sanitized);
      setDiscountInputError(null);
      return;
    }

    if (discountInputMode === 'percent') {
      if (parsed >= 100) {
        setDiscountInputError(PERCENT_ERROR_MESSAGE);
        return;
      }
    } else if (discountBaseDocValue <= 0) {
      if (parsed > 0) {
        setDiscountInputError(AMOUNT_ERROR_MESSAGE);
        return;
      }
    } else if (parsed >= discountBaseDocValue) {
      setDiscountInputError(AMOUNT_ERROR_MESSAGE);
      return;
    }

    setDiscountInputValue(sanitized);
    setDiscountInputError(null);
  }, [discountBaseDocValue, discountInputMode]);

  const handleCancelDraft = useCallback(() => {
    syncDraftWithApplied();
    setIsOpen(false);
  }, [syncDraftWithApplied]);

  const handleClearDraft = useCallback(() => {
    onClearDiscount();
    setDiscountInputValue('');
    setDiscountInputError(null);
    setIsOpen(false);
  }, [onClearDiscount]);

  const handleApplyDraft = useCallback(() => {
    onApplyDiscount(draftDiscount);
    setDiscountInputError(null);
    setIsOpen(false);
  }, [draftDiscount, onApplyDiscount]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    syncDraftWithApplied();
  }, [isOpen, syncDraftWithApplied]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleCancelDraft();
      }
    };
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        discountPopoverRef.current?.contains(target) ||
        discountButtonRef.current?.contains(target)
      ) {
        return;
      }
      handleCancelDraft();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleCancelDraft, isOpen]);

  const currencySymbol = currency === 'USD' ? '$' : 'S/';

  return (
    <div className="relative inline-block">
      <button
        ref={discountButtonRef}
        type="button"
        onClick={() => {
          if (isOpen) {
            handleCancelDraft();
            return;
          }
          setIsOpen(true);
        }}
        className={`relative inline-flex h-6 w-6 items-center justify-center rounded-full border text-slate-500 transition text-[11px] ${
          isOpen || isDiscountActive
            ? 'border-[#2ccdb0]/60 text-[#2f70b4]'
            : 'border-transparent hover:border-slate-200 hover:text-slate-700'
        }`}
        title="Aplicar descuento global"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <Percent className="h-3 w-3" />
      </button>
      {isOpen && (
        <div
          ref={discountPopoverRef}
          className="absolute right-0 z-20 mt-2 w-64 rounded-2xl border border-slate-100 bg-white p-3 shadow-2xl"
        >
          <div className="mb-3 flex rounded-full bg-slate-100 p-0.5 text-[11px] font-semibold text-slate-500">
            {(['amount', 'percent'] as DiscountMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => handleDiscountModeChange(mode)}
                className={`flex-1 rounded-full px-2.5 py-1 transition ${
                  discountInputMode === mode
                    ? 'bg-white text-[#2f70b4] shadow'
                    : 'text-slate-500'
                }`}
              >
                {mode === 'amount' ? 'Monto' : '%'}
              </button>
            ))}
          </div>
          <div className="mb-3">
            <label className="sr-only">Valor de descuento</label>
            <div className="relative">
              {discountInputMode === 'amount' && (
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
                  {currencySymbol}
                </span>
              )}
              <input
                type="text"
                inputMode="decimal"
                value={discountInputValue}
                onChange={handleDiscountInputChange}
                className={`w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 focus:border-[#2ccdb0] focus:outline-none focus:ring-2 focus:ring-[#2ccdb0]/20 ${
                  discountInputMode === 'amount' ? 'pl-10' : ''
                }`}
                placeholder={discountInputMode === 'amount' ? '0.00' : '0'}
                aria-label="Valor de descuento"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Máximo {formatPrice(discountBaseDocValue, currency)}
            </p>
            {discountInputError && (
              <p className="mt-1 text-[11px] text-red-500">{discountInputError}</p>
            )}
          </div>
          <div className="mb-3 space-y-1 rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
            <div className="flex items-center justify-between">
              <span>Descuento</span>
              <span className="font-semibold text-[#2f70b4]">
                {previewTotals.discount?.amount
                  ? `-${formatPrice(previewTotals.discount.amount, currency)}`
                  : formatPrice(0, currency)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span>Total estimado</span>
              <span className="text-sm font-bold text-slate-900">
                {formatPrice(previewTotals.total, currency)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleApplyDraft}
              disabled={!canApplyDiscount}
              className={`flex-1 rounded-xl px-3 py-1.5 text-sm font-semibold text-white transition ${
                canApplyDiscount ? 'bg-[#2ccdb0] hover:bg-[#28b59c]' : 'bg-slate-200 text-slate-500 cursor-not-allowed'
              }`}
            >
              Aplicar
            </button>
            <button
              type="button"
              onClick={handleCancelDraft}
              className="rounded-xl px-3 py-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleClearDraft}
              disabled={!discount}
              className={`text-sm font-semibold ${discount ? 'text-red-500 hover:text-red-600' : 'text-slate-300 cursor-not-allowed'}`}
            >
              Borrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
