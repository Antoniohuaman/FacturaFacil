/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { CartItem, DraftAction, TipoComprobante } from '../../../models/comprobante.types';
import { UNIDADES_MEDIDA } from '../../../models/constants';
import ProductSelector from '../../../lista-comprobantes/pages/ProductSelector';
import { CheckSquare, Square, Sliders, Settings2 } from 'lucide-react';
import { usePriceBook } from '../hooks/usePriceBook';
import type { PriceColumnOption } from '../hooks/usePriceBook';
import { roundCurrency } from '../../../../lista-precios/utils/price-helpers/pricing';

interface ProductsSectionProps {
  cartItems: CartItem[];
  addProductsFromSelector: (products: { product: any; quantity: number }[]) => void;
  updateCartItem: (id: string, updates: Partial<CartItem>) => void;
  removeFromCart: (id: string) => void;
  totals: {
    subtotal: number;
    igv: number;
    total: number;
  };
  showDraftModal: boolean;
  setShowDraftModal: (value: boolean) => void;
  showDraftToast: boolean;
  setShowDraftToast: (value: boolean) => void;
  draftExpiryDate: string;
  setDraftExpiryDate: (value: string) => void;
  draftAction: DraftAction;
  setDraftAction: (value: DraftAction) => void;
  handleDraftModalSave: (params: {
    tipoComprobante: TipoComprobante;
    serieSeleccionada: string;
    cartItems: CartItem[];
    onClearCart?: () => void;
  }) => void;
  tipoComprobante: TipoComprobante;
  serieSeleccionada: string;
  clearCart: () => void;
  refreshKey?: number;
  selectedEstablishmentId?: string;
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
  { id: 'imagen', label: 'Imagen', isFixed: false, isVisible: false, align: 'center', width: '80px', order: 10 },
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
  { id: 'stock', label: 'Stock', isFixed: false, isVisible: false, align: 'center', width: '90px', order: 21 },
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
  showDraftModal,
  setShowDraftModal,
  showDraftToast,
  setShowDraftToast,
  draftExpiryDate,
  setDraftExpiryDate,
  draftAction,
  setDraftAction,
  handleDraftModalSave,
  tipoComprobante,
  serieSeleccionada,
  clearCart,
  refreshKey = 0,
  // selectedEstablishmentId, // TODO: Usar para filtrar stock por establecimiento
}) => {
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
    getPriceOptionsFor,
    resolveMinPrice
  } = usePriceBook();

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

  const formatCurrency = useCallback((value: number) => `S/ ${Number(value || 0).toFixed(2)}`, []);

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

  const resolveUnitCode = useCallback((item: CartItem) => {
    return item.unidadMedida || item.unidad || 'NIU';
  }, []);

  const resolveSku = useCallback((item: CartItem) => {
    return item.code || String(item.id);
  }, []);

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

      let priceOptions: PriceColumnOption[] = [];
      if (hasSelectableColumns) {
        priceOptions = getPriceOptionsFor(sku, unitCode);
      }

      const currentOption = priceOptions.find(option => option.columnId === item.priceColumnId);
      const fallbackOption = priceOptions.length > 0
        ? (priceOptions.find(option => option.columnId === baseColumnId) || priceOptions[0])
        : undefined;
      const selectedOption = item.isManualPrice ? undefined : (currentOption || fallbackOption);

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
  }, [applyGlobalRuleValue, baseColumnId, cartItems, getPriceOptionsFor, hasSelectableColumns, resolveMinPrice, resolveSku, resolveUnitCode, stripGlobalRuleValue, updateCartItem]);

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
    let parsed = parseFloat(rawValue);
    if (Number.isNaN(parsed)) {
      parsed = item.price || 0;
    }

    let normalized = roundCurrency(parsed);
    let errorMessage: string | undefined;
    if (typeof item.minAllowedPrice === 'number' && normalized < item.minAllowedPrice) {
      normalized = item.minAllowedPrice;
      errorMessage = `El precio mínimo es ${formatCurrency(item.minAllowedPrice)}`;
    }

    const baseValue = stripGlobalRuleValue(normalized);

    updateCartItem(item.id, {
      basePrice: baseValue,
      price: normalized,
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
  }, [clearDraftForItem, formatCurrency, stripGlobalRuleValue, updateCartItem]);

  const handleGlobalModeChange = useCallback((mode: GlobalPricingMode) => {
    setGlobalPricing(prev => ({ ...prev, mode }));
  }, []);

  const handleGlobalPercentChange = useCallback((mode: 'discount' | 'increase', rawValue: string) => {
    const parsed = Math.abs(parseFloat(rawValue));
    const sanitized = Number.isNaN(parsed) ? 0 : parsed;
    setGlobalPricing(prev => {
      if (mode === 'discount') {
        return { ...prev, discountPercent: Math.min(sanitized, 99.99) };
      }
      return { ...prev, increasePercent: Math.min(sanitized, 999.99) };
    });
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
            {item.precioCompra ? `S/ ${item.precioCompra.toFixed(2)}` : '-'}
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

      case 'impuesto':
        return (
          <td className="px-4 py-4 text-center text-sm">
            <div className="inline-flex px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
              {item.impuesto || 'IGV 18%'}
            </div>
          </td>
        );

      case 'cantidad':
        return (
          <td className="px-3 py-2.5">
            <div className="flex items-center justify-center gap-1.5">
              <button
                className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 text-base font-bold rounded hover:bg-gray-100"
                onClick={() => updateCartItem(item.id, {
                  quantity: Math.max(0.01, parseFloat((item.quantity - 1).toFixed(2)))
                })}
                disabled={item.quantity <= 0.01}
              >
                −
              </button>
              <input
                type="number"
                min={0.01}
                step={0.01}
                value={item.quantity}
                className="w-12 h-8 px-1.5 py-0 border border-gray-400 rounded text-center font-semibold text-xs focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                onChange={e => {
                  const newQty = parseFloat(e.target.value) || 0.01;
                  updateCartItem(item.id, { quantity: newQty });
                }}
              />
              <button
                className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 text-base font-bold rounded hover:bg-gray-100"
                onClick={() => updateCartItem(item.id, {
                  quantity: parseFloat((item.quantity + 1).toFixed(2))
                })}
              >
                +
              </button>
            </div>
          </td>
        );

      case 'unidad':
        return (
          <td className="px-4 py-4">
            <div className="flex flex-col gap-1">
              {/* ✅ Nombre de la unidad del producto */}
              <div className="text-xs text-center text-gray-500 font-medium">
                {item.unidad || 'UNIDAD'}
              </div>
              {/* ✅ Selector para cambiar unidad */}
              <select
                value={item.unidadMedida || item.unidad || 'UNIDAD'}
                onChange={(e) => updateCartItem(item.id, { unidadMedida: e.target.value, isManualPrice: false })}
                className="w-full text-center text-xs text-gray-700 border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-gray-50"
              >
                {UNIDADES_MEDIDA.map(unidad => (
                  <option key={unidad.value} value={unidad.value}>
                    {unidad.label}
                  </option>
                ))}
              </select>
            </div>
          </td>
        );

      case 'precio': {
        const itemKey = String(item.id);
        const options = hasSelectableColumns ? getPriceOptionsFor(resolveSku(item), resolveUnitCode(item)) : [];
        const hasOptions = options.length > 0;
        const selectValue = hasOptions
          ? (options.some(option => option.columnId === item.priceColumnId)
              ? item.priceColumnId || options[0].columnId
              : options[0].columnId)
          : '';
        const inputValue = priceDrafts[itemKey] ?? (item.price ?? 0).toFixed(2);
        const minLabel = typeof item.minAllowedPrice === 'number' ? formatCurrency(item.minAllowedPrice) : null;
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
                  className={`w-full px-2 py-1 border rounded text-xs text-right focus:outline-none focus:ring-2 ${errorMessage ? 'border-red-500 focus:ring-red-500/30' : 'border-gray-300 focus:ring-violet-500/30 focus:border-violet-500'}`}
                />
                {minLabel && (
                  <p className="text-[11px] text-gray-400 mt-0.5">Precio mínimo: {minLabel}</p>
                )}
                {errorMessage && (
                  <p className="text-[11px] text-red-500 mt-0.5">{errorMessage}</p>
                )}
              </div>
            </div>
          </td>
        );
      }

      case 'subtotal':
        return (
          <td className="px-4 py-4 text-right text-sm text-gray-700">
            S/ {((item.price * item.quantity) / (1 + ((item.igv !== undefined ? item.igv : 18) / 100))).toFixed(2)}
          </td>
        );

      case 'total':
        return (
          <td className="px-4 py-4 text-right font-semibold text-sm text-gray-900">
            S/ {(item.price * item.quantity).toFixed(2)}
          </td>
        );

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
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      {/* Header compacto */}
      <div className="mb-3 pb-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Productos del Comprobante</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Agregue productos y personalice las columnas visibles.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Icono de sliders para configuración */}
            <button
              onClick={() => setShowColumnConfig(!showColumnConfig)}
              className="flex items-center justify-center w-9 h-9 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-violet-400 transition-all shadow-sm"
              title="Personalizar columnas"
              aria-label="Configurar columnas visibles"
            >
              <Sliders className="w-4 h-4" />
            </button>

            <div className="relative">
              <button
                ref={priceModeButtonRef}
                onClick={() => setShowGlobalPricing(prev => !prev)}
                className={`flex items-center justify-center w-9 h-9 border rounded-lg shadow-sm transition-all ${globalPricing.mode !== 'none' ? 'text-violet-700 border-violet-300 bg-violet-50 hover:bg-violet-100' : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50 hover:border-violet-400'}`}
                title="Modo de precios globales"
                aria-label="Configurar regla global de precios"
              >
                <Settings2 className="w-4 h-4" />
              </button>
              {showGlobalPricing && (
                <div
                  ref={priceModePopoverRef}
                  className="absolute right-0 mt-2 w-64 rounded-lg border border-gray-200 bg-white shadow-lg p-4 z-20"
                >
                  <p className="text-xs text-gray-500 mb-2">
                    Aplica un ajuste porcentual a todas las líneas del comprobante.
                  </p>
                  <div className="space-y-3 text-sm text-gray-700">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="price-mode"
                        className="text-violet-600 focus:ring-violet-500"
                        checked={globalPricing.mode === 'none'}
                        onChange={() => handleGlobalModeChange('none')}
                      />
                      Sin regla global
                    </label>
                    <div className="space-y-1">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="price-mode"
                          className="text-violet-600 focus:ring-violet-500"
                          checked={globalPricing.mode === 'discount'}
                          onChange={() => handleGlobalModeChange('discount')}
                        />
                        Descuento global (%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={99.99}
                        step={0.1}
                        disabled={globalPricing.mode !== 'discount'}
                        value={globalPricing.discountPercent}
                        onChange={e => handleGlobalPercentChange('discount', e.target.value)}
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 disabled:bg-gray-50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="price-mode"
                          className="text-violet-600 focus:ring-violet-500"
                          checked={globalPricing.mode === 'increase'}
                          onChange={() => handleGlobalModeChange('increase')}
                        />
                        Aumento global (%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={999.99}
                        step={0.1}
                        disabled={globalPricing.mode !== 'increase'}
                        value={globalPricing.increasePercent}
                        onChange={e => handleGlobalPercentChange('increase', e.target.value)}
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 disabled:bg-gray-50"
                      />
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
          onAddProducts={addProductsFromSelector}
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
              <tr key={item.id} className="border-b border-gray-100 hover:bg-violet-50/30 transition-colors duration-150">
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
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Descuentos</span>
                <span className="text-gray-700 font-medium">S/ 0.00</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900 font-semibold">S/ {totals.subtotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">I.G.V. (18%)</span>
                <span className="text-gray-900 font-semibold">S/ {totals.igv.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Redondeo</span>
                <span className="text-gray-700 font-medium">S/ 0.00</span>
              </div>

              <div className="pt-2.5 mt-2.5 border-t-2 border-dashed border-gray-300">
                <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-lg p-3 shadow-md">
                  <div className="flex justify-between items-center">
                    <span className="text-violet-100 font-semibold text-sm">TOTAL</span>
                    <span className="text-white font-bold text-xl">S/ {totals.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast de confirmación */}
      {showDraftToast && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-green-600 text-white px-6 py-3 rounded shadow-lg flex items-center space-x-2 animate-fade-in">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
            <span>Borrador guardado exitosamente</span>
            <button className="ml-4 text-white/80 hover:text-white" onClick={() => setShowDraftToast(false)}>&times;</button>
          </div>
        </div>
      )}

      {/* Modal para guardar borrador */}
      {showDraftModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Guardar borrador</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de vencimiento (opcional)</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                value={draftExpiryDate}
                onChange={e => setDraftExpiryDate(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">¿Qué deseas hacer después de guardar?</label>
              <div className="space-y-2">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="draftAction"
                    value="borradores"
                    checked={draftAction === 'borradores'}
                    onChange={() => setDraftAction('borradores')}
                    className="mr-2 w-4 h-4 text-blue-600"
                  />
                  Ir a lista de borradores
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="draftAction"
                    value="continuar"
                    checked={draftAction === 'continuar'}
                    onChange={() => setDraftAction('continuar')}
                    className="mr-2 w-4 h-4 text-blue-600"
                  />
                  Continuar editando
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="draftAction"
                    value="terminar"
                    checked={draftAction === 'terminar'}
                    onChange={() => setDraftAction('terminar')}
                    className="mr-2 w-4 h-4 text-blue-600"
                  />
                  Terminar y salir
                </label>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                onClick={() => setShowDraftModal(false)}
              >
                Cancelar
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                onClick={() => {
                  handleDraftModalSave({
                    tipoComprobante,
                    serieSeleccionada,
                    cartItems,
                    onClearCart: clearCart
                  });
                }}
              >
                Guardar borrador
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsSection;
