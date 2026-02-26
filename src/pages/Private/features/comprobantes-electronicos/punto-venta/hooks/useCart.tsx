// ===================================================================
// HOOK PARA MANEJO DEL CARRITO DE COMPRAS CON VALIDACIÓN DE STOCK
// ===================================================================

import { useState, useCallback, useMemo } from 'react';
import type { CartItem, Product, IgvType } from '../../models/comprobante.types';
import { SYSTEM_CONFIG } from '../../models/constants';
import { useConfigurationContext } from '../../../configuracion-sistema/contexto/ContextoConfiguracion';
import { useUserSession } from '../../../../../../contexts/UserSessionContext';
import { useProductStore } from '../../../catalogo-articulos/hooks/useProductStore';
import type { Product as CatalogProduct } from '../../../catalogo-articulos/models/types';
import { summarizeProductStock, calculateRequiredUnidadMinima } from '../../../../../../shared/inventory/stockGateway';
import { convertFromUnidadMinima } from '../../../../../../shared/inventory/unitConversion';
import { learnBasePriceIfMissing } from '../../../lista-precios/utils/learnBasePrice';
import { getUnitDisplayForUI } from '@/shared/units/unitDisplay';

export interface UseCartReturn {
  // Estado del carrito
  cartItems: CartItem[];

  // Acciones nuevas para detalle libre
  agregarItemLibre: () => string;
  actualizarItemCarrito: (id: string, cambios: ActualizacionItemCarrito) => void;
  eliminarItemCarrito: (id: string) => void;

  // Funciones básicas del carrito
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (id: string) => void;
  updateCartQuantity: (id: string, change: number) => void;
  setCartItemQuantity: (id: string, quantity: number) => void;
  updateCartItem: (id: string, updates: Partial<CartItem>) => void;
  updateCartItemPrice: (id: string, newPrice: number) => void;
  clearCart: () => void;
  setCartItemsFromDraft: (items: CartItem[]) => void;

  // Funciones especiales
  addProductsFromSelector: (products: { product: Product; quantity: number }[]) => void;

  // Datos calculados
  totalItems: number;
  isEmpty: boolean;
  existingProductIds: string[];
}

export type ActualizacionItemCarrito = Partial<Omit<CartItem, 'id'>>;

type IgvConfig = {
  igvType: IgvType;
  igvPercent: number;
  impuestoLabel: string;
};

const DEFAULT_IGV_CONFIG: IgvConfig = {
  igvType: 'igv18',
  igvPercent: 18,
  impuestoLabel: 'IGV (18.00%)'
};

const IGV_PERCENT_BY_TYPE: Record<IgvType, number> = {
  igv18: 18,
  igv10: 10,
  exonerado: 0,
  inafecto: 0
};

const resolveIgvConfigFromLabel = (label: string | undefined, defaultConfig: IgvConfig = DEFAULT_IGV_CONFIG): IgvConfig => {
  if (!label) {
    return defaultConfig;
  }

  const normalized = label.toLowerCase();
  if (normalized.includes('exonerado')) {
    return { igvType: 'exonerado', igvPercent: 0, impuestoLabel: label };
  }
  if (normalized.includes('inafecto')) {
    return { igvType: 'inafecto', igvPercent: 0, impuestoLabel: label };
  }

  const numericMatch = label.match(/(\d+(?:\.\d+)?)/);
  if (numericMatch) {
    const percent = parseFloat(numericMatch[1]);
    if (!Number.isNaN(percent)) {
      if (percent >= 17 && percent <= 19) {
        return { igvType: 'igv18', igvPercent: percent, impuestoLabel: label };
      }
      if (percent >= 9 && percent <= 11) {
        return { igvType: 'igv10', igvPercent: percent, impuestoLabel: label };
      }
      if (percent === 0) {
        return { igvType: 'exonerado', igvPercent: 0, impuestoLabel: label };
      }
    }
  }

  if (normalized.includes('10')) {
    return { igvType: 'igv10', igvPercent: 10, impuestoLabel: label };
  }
  if (normalized.includes('18')) {
    return { igvType: 'igv18', igvPercent: 18, impuestoLabel: label };
  }

  return { ...defaultConfig, impuestoLabel: label };
};

const inferIgvPercent = (item: { igv?: number; igvType?: IgvType }): number => {
  if (typeof item.igv === 'number') {
    return item.igv;
  }
  if (item.igvType && item.igvType in IGV_PERCENT_BY_TYPE) {
    return IGV_PERCENT_BY_TYPE[item.igvType];
  }
  return DEFAULT_IGV_CONFIG.igvPercent;
};

const stripTaxFromPrice = (price: number, igvPercent: number): number => {
  const safePrice = Number.isFinite(price) ? price : 0;
  if (!igvPercent || igvPercent <= 0) {
    return safePrice;
  }
  return safePrice / (1 + igvPercent / 100);
};

const formatQuantityDisplay = (value: number): string => {
  if (!Number.isFinite(value)) {
    return '0';
  }
  return Number(value.toFixed(4)).toString();
};

export const useCart = (): UseCartReturn => {
  // ===================================================================
  // CONFIGURACIÓN Y ESTADO
  // ===================================================================
  const { state: { almacenes, salesPreferences, taxes, units } } = useConfigurationContext();
  const allowNegativeStock = useMemo(() => {
    return typeof salesPreferences?.allowNegativeStock === 'boolean'
      ? salesPreferences.allowNegativeStock
      : false;
  }, [salesPreferences]);
  
  const defaultIgvFromConfiguration: IgvConfig | null = useMemo(() => {
    if (!taxes || taxes.length === 0) {
      return null;
    }

    // Priorizar impuesto por defecto y activo
    const defaultTax =
      taxes.find(t => t.isDefault && t.isActive) ||
      taxes.find(t => t.isDefault) ||
      taxes.find(t => t.isActive && t.category === 'SALES' && t.sunatCode === '1000') ||
      null;

    if (!defaultTax) {
      return null;
    }

    const percent = typeof defaultTax.rate === 'number' ? defaultTax.rate : DEFAULT_IGV_CONFIG.igvPercent;

    let igvType: IgvType = 'igv18';
    if (defaultTax.category === 'EXEMPTION' || percent === 0) {
      igvType = 'exonerado';
    } else if (percent >= 9 && percent <= 11) {
      igvType = 'igv10';
    } else if (percent >= 17 && percent <= 19) {
      igvType = 'igv18';
    }

    const label = defaultTax.name || defaultTax.shortName || defaultTax.code;

    return {
      igvType,
      igvPercent: percent,
      impuestoLabel: label,
    };
  }, [taxes]);

  const effectiveDefaultIgvConfig = defaultIgvFromConfiguration ?? DEFAULT_IGV_CONFIG;

  const unidadMedidaPredeterminada = useMemo(() => {
    const unidadNiu = units.find((unidad) => unidad.code === 'NIU' && unidad.isActive !== false);
    if (unidadNiu) {
      return unidadNiu.code;
    }

    const primeraActiva = units.find((unidad) => unidad.isActive !== false);
    return primeraActiva?.code || 'NIU';
  }, [units]);

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const { session } = useUserSession();
  const { allProducts: catalogProducts } = useProductStore();
  const EstablecimientoId = session?.currentEstablecimientoId;

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

  const findCatalogProduct = useCallback((product: Product): CatalogProduct | undefined => {
    return catalogLookup.get(product.id) || catalogLookup.get(product.code);
  }, [catalogLookup]);

  const validateStockAvailability = useCallback((product: Product, nextQuantity: number): boolean => {
    if (!product.requiresStockControl) {
      return true;
    }
    const catalogProduct = findCatalogProduct(product);
    if (!catalogProduct) {
      return true;
    }

    const summary = summarizeProductStock({
      product: catalogProduct,
      almacenes,
      EstablecimientoId,
    });

    const requiredUnidadMinima = calculateRequiredUnidadMinima({
      product: catalogProduct,
      quantity: nextQuantity,
      unitCode: product.unidadMedida || product.unit,
    });

    if (requiredUnidadMinima <= summary.totalAvailable) {
      return true;
    }

    const availableInUnit = convertFromUnidadMinima({
      product: catalogProduct,
      quantity: summary.totalAvailable,
      unitCode: product.unidadMedida || product.unit,
    });

    const unitLabel =
      getUnitDisplayForUI({
        units,
        code: product.unidadMedida || product.unit,
        fallbackSymbol: product.unitSymbol,
      }) || '';
    const message = `Producto: ${product.name}\nStock disponible: ${formatQuantityDisplay(availableInUnit)} ${unitLabel}\nCantidad solicitada: ${formatQuantityDisplay(nextQuantity)} ${unitLabel}`;

    if (!allowNegativeStock) {
      alert(`⚠️ Stock insuficiente\n\n${message}`);
      return false;
    }

    return true;
  }, [allowNegativeStock, EstablecimientoId, findCatalogProduct, almacenes, units]);

  const createCartItem = useCallback((product: Product, quantity: number): CartItem => {
    const price = Number.isFinite(product.price) ? product.price : 0;
    const resolvedUnit = product.unidadMedida || product.unit;
    const igvConfig = resolveIgvConfigFromLabel(product.impuesto, effectiveDefaultIgvConfig);
    return {
      ...product,
      unidadMedida: resolvedUnit,
      unidadMedidaCodigo: resolvedUnit,
      unit: resolvedUnit ?? product.unit,
      unitSymbol: product.unitSymbol || undefined,
      quantity,
      subtotal: stripTaxFromPrice(price, igvConfig.igvPercent),
      total: price,
      basePrice: Number.isFinite(product.basePrice) ? Number(product.basePrice) : price,
      igv: igvConfig.igvPercent,
      igvType: igvConfig.igvType,
      impuesto: igvConfig.impuestoLabel,
      tipoDetalle: 'catalogo',
      tipoBienServicio: product.tipoProducto === 'SERVICIO' ? 'servicio' : 'bien',
      descuentoItem: product.descuentoProducto,
    };
  }, [effectiveDefaultIgvConfig]);

  const crearIdItemLibre = useCallback(() => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `libre-${crypto.randomUUID()}`;
    }
    return `libre-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }, []);

  const agregarItemLibre = useCallback(() => {
    const idItemLibre = crearIdItemLibre();
    const igvTypePredeterminado: IgvType = 'igv18';

    setCartItems((prev) => [
      ...prev,
      {
        id: idItemLibre,
        code: '',
        name: '',
        price: 0,
        quantity: 1,
        subtotal: 0,
        total: 0,
        igv: 18,
        igvType: igvTypePredeterminado,
        unidadMedida: unidadMedidaPredeterminada,
        unidadMedidaCodigo: unidadMedidaPredeterminada,
        unidad: unidadMedidaPredeterminada,
        unit: unidadMedidaPredeterminada,
        stock: 0,
        requiresStockControl: false,
        tipoDetalle: 'libre',
        tipoBienServicio: 'bien',
        tipoProducto: 'BIEN',
        impuesto: effectiveDefaultIgvConfig.impuestoLabel,
      },
    ]);

    return idItemLibre;
  }, [crearIdItemLibre, effectiveDefaultIgvConfig.impuestoLabel, unidadMedidaPredeterminada]);

  // ===================================================================
  // FUNCIONES BÁSICAS DEL CARRITO
  // ===================================================================

  /**
   * Agregar producto al carrito con validación de stock
   */
  const addToCart = useCallback((product: Product, quantity: number = 1) => {
    setCartItems(prev => {
      const existingItem = prev.find(item => item.id === product.id);
      const nextQuantity = (existingItem?.quantity ?? 0) + quantity;

      if (!validateStockAvailability(product, nextQuantity)) {
        return prev;
      }

      if (existingItem) {
        // Si ya existe, incrementar cantidad
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: nextQuantity }
            : item
        );
      }
      // Si no existe, agregar nuevo con cálculos
      return [...prev, createCartItem(product, quantity)];
    });
  }, [createCartItem, validateStockAvailability]);

  /**
   * Remover producto del carrito
   * Mantiene exactamente la misma lógica del archivo original
   */
  const eliminarItemCarrito = useCallback((id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const removeFromCart = useCallback((id: string) => {
    eliminarItemCarrito(id);
  }, [eliminarItemCarrito]);

  /**
   * Actualizar cantidad de producto en carrito con validación de stock
   */
  const updateCartQuantity = useCallback((id: string, change: number) => {
    setCartItems(prev => {
      const item = prev.find(i => i.id === id);
      if (!item) return prev;

      const newQuantity = Math.min(
        SYSTEM_CONFIG.MAX_CART_QUANTITY,
        Math.max(SYSTEM_CONFIG.MIN_CART_QUANTITY, item.quantity + change)
      );

      if (newQuantity === item.quantity) {
        return prev;
      }

      if (newQuantity > item.quantity && !validateStockAvailability(item, newQuantity)) {
        return prev;
      }

      return prev.map(i => 
        i.id === id 
          ? { ...i, quantity: newQuantity }
          : i
      );
    });
  }, [validateStockAvailability]);

  /**
   * Actualizar cualquier propiedad de un item del carrito
   * Para actualizaciones desde la tabla de productos del formulario
   */
  const actualizarItemCarrito = useCallback((id: string, cambios: ActualizacionItemCarrito) => {
    setCartItems(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, ...cambios }
          : item
      )
    );
  }, []);

  const updateCartItem = useCallback((id: string, updates: Partial<CartItem>) => {
    actualizarItemCarrito(id, updates);
  }, [actualizarItemCarrito]);

  /**
   * Actualizar el precio de un item del carrito
   * Útil para productos sin precio o con precio variable
   */
  const updateCartItemPrice = useCallback((id: string, newPrice: number) => {
    // Validar que el precio sea válido
    if (newPrice < 0 || isNaN(newPrice)) {
      console.warn('Precio inválido:', newPrice);
      return;
    }

    setCartItems(prev => {
      const existing = prev.find(item => item.id === id);
      if (existing && Number.isFinite(newPrice) && newPrice > 0) {
        const sku = (existing.code || String(existing.id)).trim();
        const unitCode = String(existing.unidadMedida || existing.unit || '').trim();
        learnBasePriceIfMissing({
          sku,
          unitCode,
          value: newPrice,
          productName: existing.name
        });
      }

      return prev.map(item =>
        item.id === id
          ? {
              ...item,
              price: newPrice,
              subtotal: stripTaxFromPrice(newPrice, inferIgvPercent(item)),
              total: newPrice,
              basePrice: newPrice, // Actualizar también el precio base
              isManualPrice: true
            }
          : item
      );
    });
  }, []);

  /**
   * Limpiar todo el carrito
   */
  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const setCartItemsFromDraft = useCallback((items: CartItem[]) => {
    if (!Array.isArray(items) || items.length === 0) {
      setCartItems([]);
      return;
    }

    const normalized = items.map((item) => {
      const tipoDetalleNormalizado = item.tipoDetalle === 'libre' ? 'libre' : 'catalogo';
      const rawQuantity = Number.isFinite(item.quantity) ? item.quantity : SYSTEM_CONFIG.MIN_CART_QUANTITY;
      const quantity = Math.min(
        SYSTEM_CONFIG.MAX_CART_QUANTITY,
        Math.max(SYSTEM_CONFIG.MIN_CART_QUANTITY, rawQuantity)
      );
      const price = Number.isFinite(item.price) ? item.price : 0;
      const igvPercent = inferIgvPercent(item);
      const subtotal = Number.isFinite(item.subtotal)
        ? item.subtotal
        : stripTaxFromPrice(price, igvPercent);
      const total = Number.isFinite(item.total) ? item.total : price;
      const resolvedUnit = item.unidadMedidaCodigo || item.unidadMedida || item.unit || unidadMedidaPredeterminada;
      const igvConfig = resolveIgvConfigFromLabel(item.impuesto, effectiveDefaultIgvConfig);
      const tipoIgvNormalizado = item.igvType ?? igvConfig.igvType;

      return {
        ...item,
        code: item.code ?? '',
        name: item.name || 'Ítem',
        tipoDetalle: tipoDetalleNormalizado,
        tipoBienServicio: item.tipoBienServicio ?? (item.tipoProducto === 'SERVICIO' ? 'servicio' : 'bien'),
        unidadMedida: resolvedUnit,
        unidadMedidaCodigo: resolvedUnit,
        unit: resolvedUnit ?? item.unit,
        unitSymbol: item.unitSymbol || undefined,
        quantity,
        price,
        subtotal,
        total,
        igv: Number.isFinite(item.igv) ? item.igv : igvPercent,
        igvType: tipoIgvNormalizado,
        impuesto: item.impuesto ?? igvConfig.impuestoLabel,
        requiresStockControl: tipoDetalleNormalizado === 'libre' ? false : item.requiresStockControl,
        stock: Number.isFinite(item.stock) ? item.stock : 0,
      };
    });

    setCartItems(normalized);
  }, [effectiveDefaultIgvConfig, unidadMedidaPredeterminada]);

  const setCartItemQuantity = useCallback((id: string, nextQuantity: number) => {
    setCartItems(prev => {
      const item = prev.find(i => i.id === id);
      if (!item) return prev;

      const sanitized = Number.isFinite(nextQuantity) ? nextQuantity : item.quantity;
      const bounded = Math.min(
        SYSTEM_CONFIG.MAX_CART_QUANTITY,
        Math.max(SYSTEM_CONFIG.MIN_CART_QUANTITY, sanitized)
      );

      if (bounded > item.quantity && !validateStockAvailability(item, bounded)) {
        return prev;
      }

      return prev.map(cartItem =>
        cartItem.id === id
          ? { ...cartItem, quantity: bounded }
          : cartItem
      );
    });
  }, [validateStockAvailability]);

  // ===================================================================
  // FUNCIONES ESPECIALES
  // ===================================================================

  /**
   * Agregar productos desde ProductSelector (modo formulario)
   * Mantiene exactamente la misma lógica del archivo original
   */
  const addProductsFromSelector = useCallback((products: { product: Product; quantity: number }[]) => {
    if (products.length > 0) {
      setCartItems(prev => {
        const updated = [...prev];
        products.forEach(({ product, quantity }) => {
          const idx = updated.findIndex(item => item.id === product.id);
          const existingItem = idx !== -1 ? updated[idx] : undefined;
          const referenceProduct = existingItem ?? product;
          const nextQuantity = (existingItem?.quantity ?? 0) + quantity;

          if (!validateStockAvailability(referenceProduct, nextQuantity)) {
            return;
          }

          if (idx !== -1) {
            updated[idx] = {
              ...updated[idx],
              quantity: nextQuantity
            };
          } else {
            updated.push(createCartItem(product, quantity));
          }
        });
        return updated;
      });
    }
  }, [createCartItem, validateStockAvailability]);

  // ===================================================================
  // DATOS CALCULADOS
  // ===================================================================

  /**
   * Total de items en el carrito
   */
  const totalItems = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  /**
   * Verificar si el carrito está vacío
   */
  const isEmpty = useMemo(() => {
    return cartItems.length === 0;
  }, [cartItems]);

  /**
   * IDs de productos existentes en el carrito
   * Para evitar duplicados en ProductSelector
   */
  const existingProductIds = useMemo(() => {
    return cartItems.map(item => String(item.id));
  }, [cartItems]);

  // ===================================================================
  // RETORNO DEL HOOK
  // ===================================================================
  return {
    // Estado
    cartItems,

    // Acciones nuevas
    agregarItemLibre,
    actualizarItemCarrito,
    eliminarItemCarrito,

    // Funciones básicas
    addToCart,
    removeFromCart,
    updateCartQuantity,
    setCartItemQuantity,
    updateCartItem,
    updateCartItemPrice,
    clearCart,
    setCartItemsFromDraft,

    // Funciones especiales
    addProductsFromSelector,

    // Datos calculados
    totalItems,
    isEmpty,
    existingProductIds,
  };
};