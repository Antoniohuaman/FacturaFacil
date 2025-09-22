// ===================================================================
// COMPONENTE SIDEBAR DEL CARRITO PARA MODO POS
// ===================================================================

import React from 'react';
import { ShoppingCart, Trash2, Minus, Plus } from 'lucide-react';
import type { CartItem, PaymentTotals } from '../models/comprobante.types';

export interface CartSidebarProps {
  // Items del carrito
  cartItems: CartItem[];
  
  // Totales calculados
  totals: PaymentTotals;
  
  // Funciones del carrito
  onRemoveFromCart: (id: string) => void;
  onUpdateQuantity: (id: string, change: number) => void;
  onClearCart: () => void;
  
  // Funciones de acción
  onConfirmSale: () => void;
  onGoToForm: () => void;
  
  // Estados
  isLoading?: boolean;
  isCashBoxClosed?: boolean;
  cashBoxStatus?: 'abierta' | 'cerrada';
  
  // Configuración
  currency?: string;
  showTotals?: boolean;
  showActions?: boolean;
}

export const CartSidebar: React.FC<CartSidebarProps> = ({
  cartItems,
  totals,
  onRemoveFromCart,
  onUpdateQuantity,
  onClearCart,
  onConfirmSale,
  onGoToForm,
  isLoading = false,
  isCashBoxClosed = false,
  cashBoxStatus = 'abierta',
  currency = 'S/',
  showTotals = true,
  showActions = true
}) => {

  // ===================================================================
  // CÁLCULOS Y UTILIDADES
  // ===================================================================

  /**
   * Calcular total de items en el carrito
   */
  const getTotalItems = (): number => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  };

  /**
   * Verificar si el carrito está vacío
   */
  const isCartEmpty = (): boolean => {
    return cartItems.length === 0;
  };

  /**
   * Determinar si los botones deben estar deshabilitados
   */
  const isDisabled = (): boolean => {
    return isLoading || isCashBoxClosed || cashBoxStatus === 'cerrada';
  };

  // ===================================================================
  // MANEJADORES DE EVENTOS
  // ===================================================================

  /**
   * Manejar actualización de cantidad
   */
  const handleQuantityChange = (id: string, change: number) => {
    if (!isDisabled()) {
      onUpdateQuantity(id, change);
    }
  };

  /**
   * Manejar eliminación de producto
   */
  const handleRemoveItem = (id: string) => {
    if (!isDisabled()) {
      onRemoveFromCart(id);
    }
  };

  /**
   * Manejar vaciado del carrito
   */
  const handleClearCart = () => {
    if (!isDisabled() && !isCartEmpty()) {
      onClearCart();
    }
  };

  /**
   * Manejar confirmación de venta
   */
  const handleConfirmSale = () => {
    if (!isDisabled() && !isCartEmpty()) {
      onConfirmSale();
    }
  };

  /**
   * Manejar ir al formulario
   */
  const handleGoToForm = () => {
    if (!isLoading) {
      onGoToForm();
    }
  };

  // ===================================================================
  // RENDERIZADO
  // ===================================================================

  return (
    <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
      {/* Cart Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <ShoppingCart className="w-5 h-5 mr-2" />
            Carrito ({getTotalItems()})
          </h2>
          {!isCartEmpty() && (
            <button 
              onClick={handleClearCart}
              className={`text-red-500 hover:text-red-700 text-sm transition-colors ${
                isDisabled() ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={isDisabled()}
            >
              Vaciar
            </button>
          )}
        </div>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto">
        {isCartEmpty() ? (
          <div className="p-8 text-center text-gray-500">
            <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No hay productos en el carrito</p>
            <p className="text-sm">Haz clic en los productos para agregar</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {cartItems.map((item) => (
              <div key={item.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm text-gray-900">{item.name}</h4>
                    <p className="text-xs text-gray-500">{item.code}</p>
                  </div>
                  <button 
                    onClick={() => handleRemoveItem(item.id)}
                    className={`text-red-500 hover:text-red-700 ml-2 transition-colors ${
                      isDisabled() ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    disabled={isDisabled()}
                    title="Eliminar producto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  {/* Quantity Controls */}
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => handleQuantityChange(item.id, -1)}
                      className={`w-7 h-7 flex items-center justify-center bg-gray-200 rounded hover:bg-gray-300 transition-colors ${
                        isDisabled() || item.quantity <= 1 ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      disabled={isDisabled() || item.quantity <= 1}
                      title="Disminuir cantidad"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    
                    <button 
                      onClick={() => handleQuantityChange(item.id, 1)}
                      className={`w-7 h-7 flex items-center justify-center bg-gray-200 rounded hover:bg-gray-300 transition-colors ${
                        isDisabled() ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      disabled={isDisabled()}
                      title="Aumentar cantidad"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  
                  {/* Price Information */}
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">
                      {currency} {(item.price * item.quantity).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {currency} {item.price.toFixed(2)} c/u
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart Footer */}
      {!isCartEmpty() && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          {/* Totals */}
          {showTotals && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900">{currency} {totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">IGV (18%)</span>
                <span className="text-gray-900">{currency} {totals.igv.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                <span className="text-gray-900">Total</span>
                <span className="text-gray-900">{currency} {totals.total.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {showActions && (
            <div className="space-y-2">
              <button 
                onClick={handleConfirmSale}
                className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
                  isDisabled() 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
                disabled={isDisabled()}
              >
                {isLoading 
                  ? 'Procesando...' 
                  : cashBoxStatus === 'cerrada' 
                    ? 'Caja cerrada' 
                    : 'Confirmar Venta'
                }
              </button>
              
              <button 
                onClick={handleGoToForm}
                className={`w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={isLoading}
              >
                Ver Formulario Completo
              </button>
            </div>
          )}

          {/* Cash Box Status Warning */}
          {isCashBoxClosed && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></div>
                <p className="text-sm text-yellow-800">
                  La caja está cerrada. No se pueden procesar ventas.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};