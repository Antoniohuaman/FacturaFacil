// ===================================================================
// HOOK PARA MANEJO DEL CARRITO DE COMPRAS
// ===================================================================

import { useState, useCallback, useMemo } from 'react';
import type { CartItem, Product } from '../models/comprobante.types';
import { SYSTEM_CONFIG } from '../models/constants';

export interface UseCartReturn {
  // Estado del carrito
  cartItems: CartItem[];
  
  // Funciones básicas del carrito
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (id: string) => void;
  updateCartQuantity: (id: string, change: number) => void;
  updateCartItem: (id: string, updates: Partial<CartItem>) => void;
  clearCart: () => void;
  
  // Funciones especiales
  addProductsFromSelector: (products: { product: Product; quantity: number }[]) => void;
  
  // Datos calculados
  totalItems: number;
  isEmpty: boolean;
  existingProductIds: string[];
}

export const useCart = (): UseCartReturn => {
  // ===================================================================
  // ESTADO DEL CARRITO
  // ===================================================================
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // ===================================================================
  // FUNCIONES BÁSICAS DEL CARRITO
  // ===================================================================

  /**
   * Agregar producto al carrito (modo POS)
   * Mantiene exactamente la misma lógica del archivo original
   */
  const addToCart = useCallback((product: Product, quantity: number = 1) => {
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
      return [...prev, {
        ...product,
        quantity,
        subtotal: product.price / 1.18, // Calcular subtotal sin IGV
        total: product.price
      }];
    });
  }, []);

  /**
   * Remover producto del carrito
   * Mantiene exactamente la misma lógica del archivo original
   */
  const removeFromCart = useCallback((id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  }, []);

  /**
   * Actualizar cantidad de producto en carrito
   * Mantiene exactamente la misma lógica del archivo original
   */
  const updateCartQuantity = useCallback((id: string, change: number) => {
    setCartItems(prev => 
      prev.map(item => 
        item.id === id 
          ? { 
              ...item, 
              quantity: Math.max(SYSTEM_CONFIG.MIN_CART_QUANTITY, item.quantity + change) 
            }
          : item
      )
    );
  }, []);

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
        let updated = [...prev];
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
            updated.push({
              ...product,
              quantity,
              subtotal: product.price / 1.18, // Calcular subtotal sin IGV
              total: product.price
            });
          }
        });
        return updated;
      });
    }
  }, []);

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
    clearCart,
    
    // Funciones especiales
    addProductsFromSelector,
    
    // Datos calculados
    totalItems,
    isEmpty,
    existingProductIds,
  };
};