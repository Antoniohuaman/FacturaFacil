import React from 'react';
import { Plus, Minus, Trash2 } from 'lucide-react';
import type { CartItem, Currency } from '../../../models/comprobante.types';
import { useCurrency } from '../../../shared/form-core/hooks/useCurrency';

interface CartItemsListProps {
  cartItems: CartItem[];
  currency: Currency;
  isProcessing: boolean;
  onUpdateQuantity: (id: string, change: number) => void;
  onUpdatePrice?: (id: string, newPrice: number) => void;
  onRemoveItem: (id: string) => void;
}

export const CartItemsList: React.FC<CartItemsListProps> = ({
  cartItems,
  currency,
  isProcessing,
  onUpdateQuantity,
  onUpdatePrice,
  onRemoveItem,
}) => {
  const { formatPrice } = useCurrency();

  if (cartItems.length === 0) {
    return null;
  }

  return (
    <div className="p-3">
      <div className="space-y-2">
        {cartItems.map((item, index) => (
          <div
            key={item.id}
            className="group bg-white rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow-sm transition-all duration-150 p-2.5 relative"
          >
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-l-lg" />

            <div className="flex items-center justify-between mb-2 gap-2 pl-1">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="flex-shrink-0 w-5 h-5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded flex items-center justify-center">
                  <span className="text-[9px] font-bold text-white">{index + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-[11px] text-gray-900 truncate leading-tight">
                    {item.name}
                  </h4>
                  <p className="text-[9px] text-gray-500">
                    {item.unidad ?? item.unit ?? 'Und.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onRemoveItem(item.id)}
                className="flex-shrink-0 p-1 text-red-400 hover:text-white hover:bg-red-500 rounded transition-all"
                disabled={isProcessing}
                title="Eliminar"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 items-end">
              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wide">
                  Cant.
                </label>
                <div className="flex items-center bg-gray-50 rounded border border-gray-200 overflow-hidden h-7">
                  <button
                    onClick={() => onUpdateQuantity(item.id, -1)}
                    className="flex-1 h-full flex items-center justify-center hover:bg-gray-200 active:bg-gray-300 transition-colors disabled:opacity-30 border-r border-gray-200"
                    disabled={item.quantity <= 1 || isProcessing}
                  >
                    <Minus className="h-2.5 w-2.5 text-gray-600" />
                  </button>

                  <div className="flex-1 h-full flex items-center justify-center bg-white">
                    <span className="text-xs font-bold text-gray-900">{item.quantity}</span>
                  </div>

                  <button
                    onClick={() => onUpdateQuantity(item.id, 1)}
                    className="flex-1 h-full flex items-center justify-center hover:bg-gray-200 active:bg-gray-300 transition-colors border-l border-gray-200"
                    disabled={isProcessing}
                  >
                    <Plus className="h-2.5 w-2.5 text-gray-600" />
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wide">
                  Precio
                </label>
                {onUpdatePrice ? (
                  <div className="relative h-7">
                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-gray-400 z-10">
                      {currency === 'PEN' ? 'S/' : '$'}
                    </span>
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
                      className="w-full h-full pl-6 pr-1 text-[11px] font-semibold text-right bg-white border border-gray-200 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none transition-all"
                      disabled={isProcessing}
                      placeholder="0.00"
                    />
                  </div>
                ) : (
                  <div className="h-7 px-1.5 flex items-center justify-end bg-gray-50 border border-gray-200 rounded">
                    <span className="text-[11px] font-bold text-gray-900">{formatPrice(item.price, currency)}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wide">
                  Total
                </label>
                <div className="h-7 px-1.5 flex items-center justify-end bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-300 rounded">
                  <span className="text-[11px] font-bold text-blue-900">
                    {formatPrice(item.price * item.quantity, currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
