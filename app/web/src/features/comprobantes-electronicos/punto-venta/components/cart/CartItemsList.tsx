import React, { useEffect, useState } from 'react';
import { Plus, Minus, Trash2 } from 'lucide-react';
import type { CartItem, Currency } from '../../../models/comprobante.types';
import { useCurrency } from '../../../shared/form-core/hooks/useCurrency';
import type { ProductUnitOption } from '../../../../lista-precios/models/PriceTypes';
import { SYSTEM_CONFIG } from '../../../models/constants';

interface CartItemsListProps {
  cartItems: CartItem[];
  currency: Currency;
  isProcessing: boolean;
  onUpdateQuantity: (id: string, change: number) => void;
  onUpdatePrice?: (id: string, newPrice: number) => void;
  onSetQuantity?: (id: string, quantity: number) => void;
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
  onSetQuantity,
  onRemoveItem,
  onUpdateUnit,
  getUnitOptionsForProduct,
  formatUnitLabel,
}) => {
  const { formatPrice } = useCurrency();
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});

  const pruneDraftsByIds = (drafts: Record<string, string>, validIds: Set<string>) => {
    const next = { ...drafts };
    let changed = false;
    Object.keys(next).forEach(key => {
      if (!validIds.has(key)) {
        delete next[key];
        changed = true;
      }
    });
    return changed ? next : drafts;
  };

  useEffect(() => {
    const validIds = new Set(cartItems.map(item => String(item.id)));
    setQuantityDrafts(prev => pruneDraftsByIds(prev, validIds));
    setPriceDrafts(prev => pruneDraftsByIds(prev, validIds));
  }, [cartItems]);

  const clearQuantityDraft = (id: string) => {
    setQuantityDrafts(prev => {
      if (!(id in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const clearPriceDraft = (id: string) => {
    setPriceDrafts(prev => {
      if (!(id in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const commitQuantityChange = (itemId: string, fallbackQuantity: number) => {
    if (!onSetQuantity) {
      clearQuantityDraft(itemId);
      return;
    }
    const raw = quantityDrafts[itemId];
    const normalized = raw?.replace(',', '.');
    const parsed = normalized !== undefined && normalized !== '' ? parseFloat(normalized) : NaN;
    const safeQuantity = Number.isFinite(parsed) ? parsed : fallbackQuantity;
    onSetQuantity(itemId, safeQuantity);
    clearQuantityDraft(itemId);
  };

  const commitPriceChange = (itemId: string, fallbackPrice: number) => {
    if (!onUpdatePrice) {
      clearPriceDraft(itemId);
      return;
    }

    const raw = priceDrafts[itemId];
    if (raw === undefined) {
      return;
    }

    const normalized = raw.replace(',', '.');
    const parsed = normalized !== '' ? parseFloat(normalized) : NaN;
    const safePrice = Number.isFinite(parsed) ? parsed : fallbackPrice;
    onUpdatePrice(itemId, safePrice);
    clearPriceDraft(itemId);
  };

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
          const currentUnitCode = fallbackUnit || normalizedOptions[0]?.code || '';
          const optionsWithSelection = currentUnitCode && normalizedOptions.every(option => option.code !== currentUnitCode)
            ? [
                {
                  code: currentUnitCode,
                  label: formatUnitLabel(currentUnitCode) || currentUnitCode,
                  isBase: true,
                },
                ...normalizedOptions,
              ]
            : normalizedOptions;
          const itemId = String(item.id);
          const draftQuantity = quantityDrafts[itemId];
          const quantityDisplayValue = draftQuantity ?? (Number.isFinite(item.quantity) ? item.quantity.toString() : '');
          const draftPrice = priceDrafts[itemId];
          const priceDisplayValue = draftPrice ?? (Number.isFinite(item.price) ? item.price.toString() : '');
          const fallbackPriceValue = Number.isFinite(item.price) ? item.price : 0;
          const minQuantity = SYSTEM_CONFIG.MIN_CART_QUANTITY;
          const maxQuantity = SYSTEM_CONFIG.MAX_CART_QUANTITY;
          const isAtMinQuantity = item.quantity <= minQuantity;
          const isAtMaxQuantity = item.quantity >= maxQuantity;

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
                      onClick={() => {
                        clearQuantityDraft(itemId);
                        onUpdateQuantity(item.id, -1);
                      }}
                      className="flex-1 h-full flex items-center justify-center hover:bg-gray-200 active:bg-gray-300 transition-colors disabled:opacity-30 border-r border-gray-200"
                      disabled={isAtMinQuantity || isProcessing}
                      aria-label="Disminuir cantidad"
                      title="Disminuir"
                    >
                      <Minus className="h-2.5 w-2.5 text-gray-600" />
                    </button>

                    <div className="flex-1 h-full flex items-center justify-center bg-white">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min={minQuantity}
                        max={maxQuantity}
                        value={quantityDisplayValue}
                        onChange={(event) => {
                          const value = event.target.value;
                          setQuantityDrafts(prev => ({ ...prev, [itemId]: value }));
                        }}
                        onBlur={() => commitQuantityChange(item.id, item.quantity)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            commitQuantityChange(item.id, item.quantity);
                          }
                        }}
                        onFocus={(event) => event.target.select()}
                        disabled={isProcessing || !onSetQuantity}
                        className="w-full h-full text-center text-xs font-bold text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-300 no-number-spinner"
                        aria-label="Editar cantidad"
                      />
                    </div>

                    <button
                      onClick={() => {
                        clearQuantityDraft(itemId);
                        onUpdateQuantity(item.id, 1);
                      }}
                      className="flex-1 h-full flex items-center justify-center hover:bg-gray-200 active:bg-gray-300 transition-colors border-l border-gray-200"
                      disabled={isProcessing || isAtMaxQuantity}
                      aria-label="Aumentar cantidad"
                      title="Aumentar"
                    >
                      <Plus className="h-2.5 w-2.5 text-gray-600" />
                    </button>
                  </div>
                </div>

                <div>
                  <select
                    className="w-full h-7 border border-gray-200 rounded bg-white text-[11px] font-semibold text-gray-900 px-1.5 focus:outline-none focus:border-blue-500"
                    value={currentUnitCode}
                    onChange={(event) => onUpdateUnit(item.id, event.target.value)}
                    disabled={isProcessing || optionsWithSelection.length === 0}
                    aria-label="Unidad"
                  >
                    {optionsWithSelection.length === 0 ? (
                      <option value="">Sin unidades</option>
                    ) : (
                      optionsWithSelection.map(option => (
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
                        inputMode="decimal"
                        value={priceDisplayValue}
                        onChange={(event) => {
                          const value = event.target.value;
                          setPriceDrafts(prev => ({ ...prev, [itemId]: value }));
                        }}
                        onBlur={() => commitPriceChange(item.id, fallbackPriceValue)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            commitPriceChange(item.id, fallbackPriceValue);
                          }
                        }}
                        onFocus={(event) => event.target.select()}
                        step="0.01"
                        min="0"
                        className="w-full h-full pl-6 pr-1 text-[11px] font-semibold text-right bg-white border border-gray-200 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none transition-all no-number-spinner"
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
