// ===================================================================
// HOOK PARA MANEJO DEL CARRITO DE COMPRAS CON VALIDACIÓN DE STOCK
// ===================================================================

import { useState, useCallback, useMemo } from 'react';
import type { CartItem, Product, IgvType } from '../../models/comprobante.types';
import { SYSTEM_CONFIG } from '../../models/constants';

export interface UseCartReturn {
  // Estado del carrito
  cartItems: CartItem[];

  // Funciones básicas del carrito
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (id: string) => void;
  updateCartQuantity: (id: string, change: number) => void;
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
    // ✅ VALIDACIÓN DE STOCK
    if (product.requiresStockControl) {
      const existing = cartItems.find(item => item.id === product.id);
      const currentQuantityInCart = existing?.quantity || 0;
      const totalQuantity = currentQuantityInCart + quantity;

      // Si el control de stock es estricto (allowNegativeStock = false)
      if (!allowNegativeStock) {
        if (product.stock <= 0) {
          alert(`⚠️ Sin stock disponible\n\nProducto: ${product.name}\nStock actual: ${product.stock}\n\nNo se puede agregar al carrito.`);
          return;
        }
        
        if (totalQuantity > product.stock) {
          alert(`⚠️ Stock insuficiente\n\nProducto: ${product.name}\nStock disponible: ${product.stock}\nCantidad en carrito: ${currentQuantityInCart}\nIntentando agregar: ${quantity}\n\nSolo hay ${product.stock} unidades disponibles.`);
          return;
        }
      }
      
      // Si permite stock negativo pero queremos advertir al usuario
      if (allowNegativeStock && totalQuantity > product.stock) {
        const confirmed = confirm(
          `⚠️ Advertencia de stock\n\nProducto: ${product.name}\nStock disponible: ${product.stock}\nCantidad total en carrito: ${totalQuantity}\n\nEstás agregando más cantidad del stock disponible.\n¿Deseas continuar?`
        );
        if (!confirmed) return;
      }
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
  }, [cartItems, allowNegativeStock, createCartItem]);

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

      const newQuantity = Math.max(SYSTEM_CONFIG.MIN_CART_QUANTITY, item.quantity + change);

      // ✅ VALIDACIÓN DE STOCK al incrementar
      if (change > 0 && item.requiresStockControl && !allowNegativeStock) {
        if (newQuantity > item.stock) {
          alert(`⚠️ Stock insuficiente\n\nProducto: ${item.name}\nStock disponible: ${item.stock}\nCantidad actual en carrito: ${item.quantity}\n\nNo puedes agregar más unidades.`);
          return prev;
        }
      }

      return prev.map(i => 
        i.id === id 
          ? { ...i, quantity: newQuantity }
          : i
      );
    });
  }, [allowNegativeStock]);

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
          if (idx !== -1) {
            // Si ya existe, incrementar cantidad
            updated[idx] = {
              ...updated[idx],
              quantity: updated[idx].quantity + quantity
            };
          } else {
            // Si no existe, agregar nuevo
            updated.push(createCartItem(product, quantity));
          }
        });
        return updated;
      });
    }
  }, [createCartItem]);

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