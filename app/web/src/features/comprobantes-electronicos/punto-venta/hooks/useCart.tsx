// ===================================================================
// HOOK PARA MANEJO DEL CARRITO DE COMPRAS CON VALIDACIÓN DE STOCK
// ===================================================================

import { useState, useCallback, useMemo } from 'react';
import type { CartItem, Product, IgvType } from '../../models/comprobante.types';
import { SYSTEM_CONFIG } from '../../models/constants';
import { useConfigurationContext } from '../../../configuracion-sistema/context/ConfigurationContext';
import { useUserSession } from '../../../../contexts/UserSessionContext';
import { useProductStore } from '../../../catalogo-articulos/hooks/useProductStore';
import type { Product as CatalogProduct } from '../../../catalogo-articulos/models/types';
import { summarizeProductStock, calculateRequiredUnidadMinima } from '../../../../shared/inventory/stockGateway';
import { convertFromUnidadMinima } from '../../../../shared/inventory/unitConversion';

export interface UseCartReturn {
  // Estado del carrito
  cartItems: CartItem[];

  // Funciones básicas del carrito
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (id: string) => void;
  updateCartQuantity: (id: string, change: number) => void;
  setCartItemQuantity: (id: string, quantity: number) => void;
  updateCartItem: (id: string, updates: Partial<CartItem>) => void;
  updateCartItemPrice: (id: string, newPrice: number) => void;
  clearCart: () => void;

  // Funciones especiales
  addProductsFromSelector: (products: { product: Product; quantity: number }[]) => void;

  // Datos calculados
  totalItems: number;
  isEmpty: boolean;
  existingProductIds: string[];
}

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

const resolveIgvConfigFromLabel = (label?: string): IgvConfig => {
  if (!label) {
    return DEFAULT_IGV_CONFIG;
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

  return { ...DEFAULT_IGV_CONFIG, impuestoLabel: label };
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

const formatUnitLabel = (unit?: string): string => {
  if (!unit) {
    return 'UND';
  }
  const trimmed = unit.trim();
  return trimmed || 'UND';
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
  // Obtener configuración de stock desde localStorage o usar valor por defecto
  const allowNegativeStock = (() => {
    try {
      const config = localStorage.getItem('facturaFacilConfig');
      if (config) {
        const parsed = JSON.parse(config);
        return parsed.sales?.allowNegativeStock ?? false;
      }
    } catch (e) {
      console.error('Error reading stock configuration:', e);
    }
    return false; // Por defecto, stock estricto (no permite negativo)
  })();
  
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const { state: { warehouses } } = useConfigurationContext();
  const { session } = useUserSession();
  const { allProducts: catalogProducts } = useProductStore();
  const establishmentId = session?.currentEstablishmentId;

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
      warehouses,
      establishmentId,
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

    const unitLabel = formatUnitLabel(product.unidadMedida || product.unit);
    const message = `Producto: ${product.name}\nStock disponible: ${formatQuantityDisplay(availableInUnit)} ${unitLabel}\nCantidad solicitada: ${formatQuantityDisplay(nextQuantity)} ${unitLabel}`;

    if (!allowNegativeStock) {
      alert(`⚠️ Stock insuficiente\n\n${message}`);
      return false;
    }

    return confirm(`⚠️ Advertencia de stock\n\n${message}\n\n¿Deseas continuar?`);
  }, [allowNegativeStock, establishmentId, findCatalogProduct, warehouses]);

  const createCartItem = useCallback((product: Product, quantity: number): CartItem => {
    const price = Number.isFinite(product.price) ? product.price : 0;
    const resolvedUnit = product.unidadMedida || product.unit;
    const igvConfig = resolveIgvConfigFromLabel(product.impuesto);
    return {
      ...product,
      unidadMedida: resolvedUnit,
      unit: resolvedUnit ?? product.unit,
      quantity,
      subtotal: stripTaxFromPrice(price, igvConfig.igvPercent),
      total: price,
      basePrice: Number.isFinite(product.basePrice) ? Number(product.basePrice) : price,
      igv: igvConfig.igvPercent,
      igvType: igvConfig.igvType,
      impuesto: igvConfig.impuestoLabel
    };
  }, []);

  // ===================================================================
  // FUNCIONES BÁSICAS DEL CARRITO
  // ===================================================================

  /**
   * Agregar producto al carrito con validación de stock
   */
  const addToCart = useCallback((product: Product, quantity: number = 1) => {
    const existing = cartItems.find(item => item.id === product.id);
    const nextQuantity = (existing?.quantity || 0) + quantity;

    if (!validateStockAvailability(product, nextQuantity)) {
      return;
    }

    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        // Si ya existe, incrementar cantidad
        return prev.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      // Si no existe, agregar nuevo con cálculos
      return [...prev, createCartItem(product, quantity)];
    });
  }, [cartItems, createCartItem, validateStockAvailability]);

  /**
   * Remover producto del carrito
   * Mantiene exactamente la misma lógica del archivo original
   */
  const removeFromCart = useCallback((id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  }, []);

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
  const updateCartItem = useCallback((id: string, updates: Partial<CartItem>) => {
    setCartItems(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, ...updates }
          : item
      )
    );
  }, []);

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

    setCartItems(prev =>
      prev.map(item =>
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
      )
    );
  }, []);

  /**
   * Limpiar todo el carrito
   */
  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

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
          const referenceProduct = idx !== -1 ? updated[idx] : product;
          const nextQuantity = (idx !== -1 ? updated[idx].quantity : 0) + quantity;

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

    // Funciones básicas
    addToCart,
    removeFromCart,
    updateCartQuantity,
    setCartItemQuantity,
    updateCartItem,
    updateCartItemPrice,
    clearCart,

    // Funciones especiales
    addProductsFromSelector,

    // Datos calculados
    totalItems,
    isEmpty,
    existingProductIds,
  };
};