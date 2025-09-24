// ===================================================================
// COMPONENTE GRID DE PRODUCTOS PARA MODO POS
// ===================================================================

import React from 'react';
import type { Product, CartItem } from '../models/comprobante.types';

export interface ProductGridProps {
  // Lista de productos disponibles
  products: Product[];
  
  // Items del carrito (para mostrar badges)
  cartItems: CartItem[];
  
  // Función para agregar al carrito
  onAddToCart: (product: Product) => void;
  
  // Configuración del grid
  columns?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  
  // Configuración de apariencia
  showQuantityBadge?: boolean;
  showCategory?: boolean;
  
  // Estados
  isLoading?: boolean;
  emptyStateMessage?: string;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  cartItems,
  onAddToCart,
  columns = {
    sm: 2,
    md: 3,
    lg: 4,
    xl: 5
  },
  showQuantityBadge = true,
  showCategory = false,
  isLoading = false,
  emptyStateMessage = 'No hay productos disponibles'
}) => {

  // ===================================================================
  // FUNCIONES DE UTILIDAD
  // ===================================================================

  /**
   * Obtener cantidad de un producto en el carrito
   */
  const getProductQuantityInCart = (productId: string): number => {
    const cartItem = cartItems.find(item => item.id === productId);
    return cartItem?.quantity || 0;
  };

  /**
   * Verificar si un producto está en el carrito
   */
  const isProductInCart = (productId: string): boolean => {
    return cartItems.some(item => item.id === productId);
  };

  /**
   * Manejar clic en producto
   */
  const handleProductClick = (product: Product) => {
    if (!isLoading) {
      onAddToCart(product);
    }
  };

  /**
   * Generar clases del grid responsive
   */
  const getGridClasses = (): string => {
    const baseClasses = 'grid gap-4';
    const colClasses = [
      `grid-cols-${columns.sm || 2}`,
      `md:grid-cols-${columns.md || 3}`,
      `lg:grid-cols-${columns.lg || 4}`,
      `xl:grid-cols-${columns.xl || 5}`
    ].join(' ');
    
    return `${baseClasses} ${colClasses}`;
  };

  // ===================================================================
  // RENDERIZADO DE ESTADOS ESPECIALES
  // ===================================================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Cargando productos...</p>
        </div>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg 
              className="w-8 h-8 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" 
              />
            </svg>
          </div>
          <p className="text-gray-500">{emptyStateMessage}</p>
        </div>
      </div>
    );
  }

  // ===================================================================
  // RENDERIZADO PRINCIPAL
  // ===================================================================

  return (
    <div className={getGridClasses()}>
      {products.map((product) => {
        const quantityInCart = getProductQuantityInCart(product.id);
        const inCart = isProductInCart(product.id);

        return (
          <div 
            key={product.id}
            onClick={() => handleProductClick(product)}
            className={`bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all cursor-pointer hover:scale-105 relative ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {/* Imagen/Placeholder del producto */}
            <div className="aspect-square bg-blue-100 rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
              <div className="w-12 h-12 bg-blue-300 rounded-full flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white rounded-full"></div>
              </div>
              
              {/* Badge de cantidad en carrito */}
              {showQuantityBadge && inCart && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {quantityInCart}
                </div>
              )}
            </div>

            {/* Información del producto */}
            <div className="space-y-1">
              {/* Nombre del producto */}
              <h3 className="font-medium text-gray-900 text-sm mb-1 line-clamp-2">
                {product.name}
              </h3>
              
              {/* Precio */}
              <p className="text-lg font-bold text-blue-600">
                S/ {product.price.toFixed(2)}
              </p>
              
              {/* Código */}
              <p className="text-xs text-gray-500">
                {product.code}
              </p>
              
              {/* Categoría (opcional) */}
              {showCategory && product.category && (
                <p className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-md inline-block mt-1">
                  {product.category}
                </p>
              )}
            </div>

            {/* Indicador de selección */}
            {inCart && (
              <div className="absolute top-2 left-2 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
            )}
          </div>
        );
      })}
    </div>
  );
};