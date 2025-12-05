import React, { useMemo } from 'react';
import type { Currency, PaymentTotals } from '../../../models/comprobante.types';
import { useCurrency } from '../../../shared/form-core/hooks/useCurrency';

interface DiscountSectionProps {
  currency: Currency;
  totals: PaymentTotals;
  discountTypeState: ["amount" | "percentage", React.Dispatch<React.SetStateAction<"amount" | "percentage">>];
  discountValueState: [string, React.Dispatch<React.SetStateAction<string>>];
}

export const DiscountSection: React.FC<DiscountSectionProps> = ({
  currency,
  totals,
  discountTypeState,
  discountValueState,
}) => {
  const { formatPrice } = useCurrency();
  const [discountType, setDiscountType] = discountTypeState;
  const [discountValue, setDiscountValue] = discountValueState;

  const discountAmount = useMemo(() => {
    const discountNum = parseFloat(discountValue) || 0;
    if (discountNum <= 0) return 0;

    if (discountType === 'percentage') {
      const percentDiscount = (totals.total * discountNum) / 100;
      return discountNum > 100 ? totals.total : percentDiscount;
    }

    return discountNum > totals.total ? totals.total : discountNum;
  }, [discountType, discountValue, totals.total]);

  const finalTotal = totals.total - discountAmount;

  return (
    <>
      {totals.total > 0 && (
        <div className="px-3 pb-2">
          <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 p-2.5">
            <label className="flex items-center gap-1.5 text-[9px] font-bold text-gray-600 mb-2 uppercase tracking-wide">
              <div className="w-4 h-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded flex items-center justify-center">
                <span className="text-white text-[8px] font-bold">%</span>
              </div>
              Descuento
            </label>

            <div className="flex gap-1.5">
              <button
                onClick={() => setDiscountType('amount')}
                className={`px-2.5 py-1.5 rounded font-bold text-[10px] transition-all ${
                  discountType === 'amount'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm scale-105'
                    : 'bg-white border border-gray-300 text-gray-700 hover:border-blue-400'
                }`}
              >
                S/.
              </button>

              <button
                onClick={() => setDiscountType('percentage')}
                className={`px-2.5 py-1.5 rounded font-bold text-[10px] transition-all ${
                  discountType === 'percentage'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm scale-105'
                    : 'bg-white border border-gray-300 text-gray-700 hover:border-blue-400'
                }`}
              >
                %
              </button>

              <div className="flex-1 relative">
                <input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-full px-2 pr-6 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-[11px] font-semibold text-right outline-none transition-all"
                  step="0.01"
                  min="0"
                  max={discountType === 'percentage' ? '100' : undefined}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-400 pointer-events-none">
                  {discountType === 'percentage' ? '%' : currency === 'PEN' ? 'S/' : '$'}
                </span>
              </div>
            </div>

            {discountAmount > 0 && (
              <div className="mt-2 flex items-center gap-1.5 p-1.5 bg-green-50 border border-green-200 rounded">
                <div className="w-3.5 h-3.5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-[10px] font-bold text-green-700 flex-1">
                  -{formatPrice(discountAmount, currency)}
                  <span className="font-normal text-green-600 ml-1">
                    ({discountType === 'percentage' ? `${discountValue}%` : 'Importe'})
                  </span>
                </p>
              </div>
            )}

            <div className="mt-2 flex items-center justify-between text-xs font-semibold text-gray-700">
              <span>Total a pagar (visual):</span>
              <span className="text-blue-700">{formatPrice(finalTotal, currency)}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
