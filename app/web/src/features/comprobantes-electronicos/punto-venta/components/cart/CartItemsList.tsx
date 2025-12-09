import React from 'react';
import { Plus, Minus, Trash2 } from 'lucide-react';
import type { CartItem, Currency } from '../../../models/comprobante.types';
import { useCurrency } from '../../../shared/form-core/hooks/useCurrency';
import type { ProductUnitOption } from '../../../../lista-precios/models/PriceTypes';

interface CartItemsListProps {
  cartItems: CartItem[];
  currency: Currency;
  isProcessing: boolean;
  onUpdateQuantity: (id: string, change: number) => void;
  onUpdatePrice?: (id: string, newPrice: number) => void;
  onRemoveItem: (id: string) => void;
  onUpdateUnit: (id: string, unitCode: string) => void;
  getUnitOptionsForProduct: (sku: string) => ProductUnitOption[];
  formatUnitLabel: (code?: string) => string;
}

export const CartItemsList: React.FC<CartItemsListProps> = ({
  cartItems,
  currency,
  isProcessing,
  onUpdateQuantity,
  onUpdatePrice,
  onRemoveItem,
  onUpdateUnit,
  getUnitOptionsForProduct,
  formatUnitLabel,
}) => {
  const { formatPrice } = useCurrency();

  if (cartItems.length === 0) {
    return null;
  }

  return (
    <div className="p-3">
      <div className="space-y-1.5">
        {cartItems.map((item) => {
          const sku = item.code || String(item.id);
          const unitOptions = getUnitOptionsForProduct(sku);
          const fallbackUnit = item.unidadMedida || item.unit;
          const normalizedOptions = unitOptions.length > 0
            ? unitOptions
            : fallbackUnit
              ? [{ code: fallbackUnit, label: formatUnitLabel(fallbackUnit) || fallbackUnit, isBase: true }]
              : [];
          const currentUnit = normalizedOptions[0]?.code || '';

          return (
            <div
              key={item.id}
              className="group bg-white rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow-sm transition-all duration-150 p-2 relative"
            >
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-l-lg" />

              <div className="flex items-center justify-between mb-1.5 gap-1.5 pl-0">
                <div className="flex flex-1 min-w-0">
                  <h4 className="font-semibold text-[11px] text-gray-900 truncate leading-snug">
                    {item.name}
                  </h4>
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

              <div className="grid grid-cols-4 gap-1.5 items-center">
                <div>
                  <div
                    className="flex items-center bg-gray-50 rounded border border-gray-200 overflow-hidden h-7"
                    role="group"
                    aria-label="Cantidad"
                  >
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

                <div>
                  <select
                    className="w-full h-7 border border-gray-200 rounded bg-white text-[11px] font-semibold text-gray-900 px-1.5 focus:outline-none focus:border-blue-500"
                    value={currentUnit}
                    onChange={(event) => onUpdateUnit(item.id, event.target.value)}
                    disabled={isProcessing || normalizedOptions.length === 0}
                    aria-label="Unidad"
                  >
                    {normalizedOptions.length === 0 ? (
                      <option value="">Sin unidades</option>
                    ) : (
                      normalizedOptions.map(option => (
                        <option key={`${sku}-${option.code}`} value={option.code}>
                          {option.label}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
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
                        aria-label="Precio"
                      />
                    </div>
                  ) : (
                    <div className="h-7 px-1.5 flex items-center justify-end bg-gray-50 border border-gray-200 rounded">
                      <span className="text-[11px] font-bold text-gray-900">{formatPrice(item.price, currency)}</span>
                    </div>
                  )}
                </div>

                <div>
                  <div
                    className="h-7 px-1.5 flex items-center justify-end bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-300 rounded"
                    aria-label="Total"
                  >
                    <span className="text-[11px] font-bold text-blue-900">
                      {formatPrice(item.price * item.quantity, currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
