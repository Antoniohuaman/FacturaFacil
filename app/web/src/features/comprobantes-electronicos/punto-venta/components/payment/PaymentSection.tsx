import React from 'react';
import { CreditCard as CreditCardIcon, CalendarClock } from 'lucide-react';
import type { PaymentMethod } from '../../../../configuracion-sistema/models/PaymentMethod';

interface PaymentSectionProps {
  availablePaymentMethods: PaymentMethod[];
  selectedPaymentMethod?: PaymentMethod;
  onFormaPagoChange: (paymentMethodId: string) => void;
  onNuevaFormaPago?: () => void;
  isCreditMethod?: boolean;
  onConfigureCreditSchedule?: () => void;
}

export const PaymentSection: React.FC<PaymentSectionProps> = ({
  availablePaymentMethods,
  selectedPaymentMethod,
  onFormaPagoChange,
  onNuevaFormaPago,
  isCreditMethod,
  onConfigureCreditSchedule,
}) => {
  const paymentMethodBadge = selectedPaymentMethod?.type === 'CREDIT'
    ? 'bg-emerald-100 text-emerald-700'
    : 'bg-slate-100 text-slate-600';

  return (
    <div className="p-2.5 bg-white border-b border-gray-200">
      <div className="space-y-1.5">
        <label
          className="flex items-center gap-1 text-[9px] font-bold text-gray-500 uppercase tracking-wide"
          htmlFor="pos-payment-method"
        >
          <CreditCardIcon className="h-3 w-3" />
          Forma de pago
        </label>
        <div className="flex items-center gap-2">
          <select
            id="pos-payment-method"
            value={selectedPaymentMethod?.id || ''}
            onChange={(event) => onFormaPagoChange(event.target.value)}
            className="flex-1 px-2 py-1.5 bg-white border border-gray-300 rounded text-[11px] font-semibold text-gray-900 hover:border-blue-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {availablePaymentMethods.length === 0 && (
              <option value="">Sin métodos disponibles</option>
            )}
            {availablePaymentMethods.map((method) => (
              <option key={method.id} value={method.id}>
                {method.name}
              </option>
            ))}
          </select>
          {onNuevaFormaPago && (
            <button
              type="button"
              onClick={onNuevaFormaPago}
              className="px-2 py-1 text-[10px] font-semibold text-blue-600 border border-blue-200 rounded hover:bg-blue-50"
            >
              + Nueva
            </button>
          )}
        </div>
        <div className="flex items-center justify-between text-[10px] text-gray-500">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${paymentMethodBadge}`}>
            {selectedPaymentMethod?.name || 'Sin selección'}
          </span>
          {isCreditMethod && onConfigureCreditSchedule && (
            <button
              type="button"
              onClick={onConfigureCreditSchedule}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200"
            >
              <CalendarClock className="h-3 w-3" />
              Cronograma
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between px-2 py-1 bg-gray-50 rounded border border-gray-200 mt-2">
        <span className="text-[10px] text-gray-600 font-semibold">IGV:</span>
        <span className="text-[11px] font-bold text-gray-900">18%</span>
      </div>
    </div>
  );
};
