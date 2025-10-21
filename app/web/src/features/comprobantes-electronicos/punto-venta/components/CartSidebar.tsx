// ===================================================================
// COMPONENTE SIDEBAR DEL CARRITO PARA MODO POS
// ===================================================================

import React from 'react';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  AlertTriangle,
  Package
} from 'lucide-react';
import type { CartSidebarProps, Product } from '../../models/comprobante.types';
import { useCurrency } from '../../shared/form-core/hooks/useCurrency';
import { UI_MESSAGES } from '../../models/constants';

interface UpdatedCartSidebarProps extends CartSidebarProps {
  onAddProduct?: (product: Product) => void;
  onUpdatePrice?: (id: string, newPrice: number) => void;
  currency?: 'PEN' | 'USD';
}

export const CartSidebar: React.FC<UpdatedCartSidebarProps> = ({
  cartItems,
  totals,
  onUpdateQuantity,
  onUpdatePrice,
  onRemoveItem,
  onClearCart,
  onConfirmSale,
  onViewFullForm,
  cashBoxStatus = 'unknown',
  isProcessing = false,
  currency = 'PEN'
}) => {
  const { formatPrice } = useCurrency();

  // Estado de la caja
  const isCashBoxClosed = cashBoxStatus === 'closed';
  const canProcessSale = !isProcessing && cartItems.length > 0 && !isCashBoxClosed;

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Header con búsqueda */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">
              Carrito ({cartItems.length})
            </h3>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Botón limpiar carrito */}
            {cartItems.length > 0 && (
              <button
                onClick={onClearCart}
                className="text-red-600 hover:text-red-700 text-sm font-medium"
                disabled={isProcessing}
              >
                Vaciar
              </button>
            )}
          </div>
        </div>


      </div>

      {/* Warning de caja cerrada */}
      {isCashBoxClosed && (
        <div className="mx-4 mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">
                Caja cerrada
              </p>
              <p className="text-xs text-yellow-600">
                {UI_MESSAGES.CAJA_CLOSED_WARNING}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Lista de productos en carrito */}
      <div className="flex-1 overflow-y-auto">
        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Package className="h-12 w-12 mb-3 text-gray-300" />
            <p className="text-sm font-medium">{UI_MESSAGES.EMPTY_CART}</p>
            <p className="text-xs text-center px-4 mt-1">
              Usa el buscador principal para agregar productos
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {cartItems.map((item) => (
              <div key={item.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-gray-900 truncate">
                      {item.name}
                    </h4>
                    <p className="text-xs text-gray-500">{item.code}</p>
                  </div>
                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="ml-2 text-red-500 hover:text-red-700 transition-colors"
                    disabled={isProcessing}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                
                {/* Precio editable */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">Precio unitario:</span>
                  {onUpdatePrice ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">{currency === 'PEN' ? 'S/' : '$'}</span>
                      <input
                        type="number"
                        value={item.price || ''}
                        onChange={(e) => {
                          const newPrice = parseFloat(e.target.value) || 0;
                          onUpdatePrice(item.id, newPrice);
                        }}
                        onFocus={(e) => e.target.select()}
                        step="1"
                        min="0"
                        className="w-20 px-2 py-1 text-sm text-right border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                        disabled={isProcessing}
                        placeholder="0.00"
                      />
                    </div>
                  ) : (
                    <span className="text-sm font-medium">{formatPrice(item.price, currency)}</span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onUpdateQuantity(item.id, -1)}
                      className="w-7 h-7 flex items-center justify-center bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      disabled={item.quantity <= 1 || isProcessing}
                    >
                      <Minus className="h-3 w-3" />
                    </button>

                    <span className="w-8 text-center text-sm font-medium">
                      {item.quantity}
                    </span>

                    <button
                      onClick={() => onUpdateQuantity(item.id, 1)}
                      className="w-7 h-7 flex items-center justify-center bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      disabled={isProcessing}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-gray-500 mb-0.5">Total:</div>
                    <div className="text-sm font-bold text-blue-600">
                      {formatPrice(item.price * item.quantity, currency)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Totales */}
      {cartItems.length > 0 && (
        <div className="border-t border-gray-200 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span>{formatPrice(totals.subtotal, currency)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">IGV (18%)</span>
            <span>{formatPrice(totals.igv, currency)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
            <span>Total</span>
            <span>{formatPrice(totals.total, currency)}</span>
          </div>
        </div>
      )}

      {/* Botones de acción */}
      <div className="border-t border-gray-200 p-4 space-y-2">
        <button
          onClick={onConfirmSale}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            canProcessSale
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
          disabled={!canProcessSale}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {UI_MESSAGES.CART_LOADING}
            </span>
          ) : (
            'Confirmar Venta'
          )}
        </button>
        
        <button
          onClick={onViewFullForm}
          className="w-full py-2 px-4 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
          disabled={isProcessing}
        >
          Ver Formulario Completo
        </button>
      </div>


    </div>
  );
};