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
    <div className="w-96 bg-white border-l border-gray-200 flex flex-col h-full shadow-lg">
      {/* Header compacto y elegante */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">
                Carrito de Venta
              </h3>
              <p className="text-xs text-gray-600">
                {cartItems.length} {cartItems.length === 1 ? 'producto' : 'productos'}
              </p>
            </div>
          </div>

          {/* Botón limpiar carrito */}
          {cartItems.length > 0 && (
            <button
              onClick={onClearCart}
              className="px-3 py-1.5 text-red-600 hover:bg-red-50 text-xs font-medium rounded-lg transition-colors"
              disabled={isProcessing}
              title="Vaciar carrito"
            >
              Limpiar
            </button>
          )}
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

      {/* Lista de productos en carrito - Diseño compacto */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-6">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Package className="h-10 w-10 text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-1">{UI_MESSAGES.EMPTY_CART}</p>
            <p className="text-xs text-center text-gray-500 px-4">
              Busca y selecciona productos para agregarlos al carrito
            </p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {cartItems.map((item, index) => (
              <div key={item.id} className="bg-white rounded-lg p-3 border border-gray-200 hover:border-blue-300 transition-colors shadow-sm">
                {/* Header del item con número y botón eliminar */}
                <div className="flex items-start gap-2 mb-2">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-blue-600">{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-gray-900 leading-tight">
                      {item.name}
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">{item.code}</p>
                  </div>
                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    disabled={isProcessing}
                    title="Eliminar producto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Precio unitario editable */}
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs text-gray-600 font-medium">Precio unit.:</span>
                  {onUpdatePrice ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500 font-medium">{currency === 'PEN' ? 'S/' : '$'}</span>
                      <input
                        type="number"
                        value={item.price || ''}
                        onChange={(e) => {
                          const newPrice = parseFloat(e.target.value) || 0;
                          onUpdatePrice(item.id, newPrice);
                        }}
                        onFocus={(e) => e.target.select()}
                        step="0.01"
                        min="0"
                        className="w-20 px-2 py-1 text-sm text-right border border-gray-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        disabled={isProcessing}
                        placeholder="0.00"
                      />
                    </div>
                  ) : (
                    <span className="text-sm font-semibold text-gray-900">{formatPrice(item.price, currency)}</span>
                  )}
                </div>

                {/* Controles de cantidad y total */}
                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onUpdateQuantity(item.id, -1)}
                      className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded-md hover:bg-gray-100 hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={item.quantity <= 1 || isProcessing}
                      title="Disminuir cantidad"
                    >
                      <Minus className="h-4 w-4 text-gray-600" />
                    </button>

                    <span className="w-10 text-center text-base font-bold text-gray-900">
                      {item.quantity}
                    </span>

                    <button
                      onClick={() => onUpdateQuantity(item.id, 1)}
                      className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded-md hover:bg-gray-100 hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isProcessing}
                      title="Aumentar cantidad"
                    >
                      <Plus className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-gray-500 font-medium">Subtotal</div>
                    <div className="text-base font-bold text-blue-600">
                      {formatPrice(item.price * item.quantity, currency)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Totales - Diseño mejorado */}
      {cartItems.length > 0 && (
        <div className="border-t-2 border-gray-200 bg-white">
          <div className="p-4 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600 font-medium">Gravado:</span>
              <span className="font-semibold text-gray-900">{formatPrice(totals.subtotal, currency)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600 font-medium">IGV (18%):</span>
              <span className="font-semibold text-gray-900">{formatPrice(totals.igv, currency)}</span>
            </div>
            <div className="border-t-2 border-gray-300 pt-3 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-base font-bold text-gray-900">Total a Pagar:</span>
                <span className="text-2xl font-bold text-blue-600">{formatPrice(totals.total, currency)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botones de acción - Diseño mejorado */}
      <div className="border-t-2 border-gray-200 p-4 bg-gray-50 space-y-2">
        <button
          onClick={onConfirmSale}
          className={`w-full py-4 px-4 rounded-xl font-bold text-base transition-all shadow-lg ${
            canProcessSale
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white transform hover:scale-[1.02]'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          disabled={!canProcessSale}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {UI_MESSAGES.CART_LOADING}
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Procesar Venta
            </span>
          )}
        </button>

        <button
          onClick={onViewFullForm}
          className="w-full py-2.5 px-4 text-blue-600 hover:bg-blue-50 text-sm font-semibold rounded-lg transition-colors border border-blue-200"
          disabled={isProcessing}
        >
          Usar Formulario Completo
        </button>
      </div>
    </div>
  );
};