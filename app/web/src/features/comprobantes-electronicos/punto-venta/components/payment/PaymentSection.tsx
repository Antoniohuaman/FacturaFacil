import React from 'react';
import { CreditCard as CreditCardIcon, CalendarClock, FileText, Receipt } from 'lucide-react';
import type { TipoComprobante } from '../../../models/comprobante.types';
import type { PaymentMethod } from '../../../../configuracion-sistema/models/PaymentMethod';

interface PaymentSectionProps {
  currency: 'PEN' | 'USD';
  tipoComprobante: TipoComprobante;
  setTipoComprobante: (tipo: TipoComprobante) => void;
  onCurrencyChange?: (currency: 'PEN' | 'USD') => void;
  changeCurrency: (currency: 'PEN' | 'USD') => void;
  availablePaymentMethods: PaymentMethod[];
  selectedPaymentMethod?: PaymentMethod;
  onFormaPagoChange: (paymentMethodId: string) => void;
  onNuevaFormaPago?: () => void;
  isCreditMethod?: boolean;
  onConfigureCreditSchedule?: () => void;
}

export const PaymentSection: React.FC<PaymentSectionProps> = ({
  currency,
  tipoComprobante,
  setTipoComprobante,
  onCurrencyChange,
  changeCurrency,
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

  const handleTipoComprobanteChange = (nuevoTipo: TipoComprobante) => {
    setTipoComprobante(nuevoTipo);
  };

  const handleCurrencyChange = (newCurrency: 'PEN' | 'USD') => {
    changeCurrency(newCurrency);
    if (onCurrencyChange) {
      onCurrencyChange(newCurrency);
    }
  };

  return (
    <div className="p-2.5 bg-white border-b border-gray-200">
      <div className="grid grid-cols-3 gap-2 mb-2">
        <div className="col-span-2">
          <label className="flex items-center gap-1 text-[9px] font-bold text-gray-500 mb-1 uppercase tracking-wide">
            <FileText className="h-2.5 w-2.5" />
            Comprobante
          </label>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => handleTipoComprobanteChange('factura')}
              className={`flex-1 px-2 py-1.5 rounded border text-[11px] font-semibold flex items-center gap-1.5 justify-center ${
                tipoComprobante === 'factura'
                  ? 'bg-purple-50 border-purple-300 text-purple-800'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-purple-400'
              }`}
            >
              <FileText className="h-2.5 w-2.5" />
              <span>Factura</span>
            </button>
            <button
              type="button"
              onClick={() => handleTipoComprobanteChange('boleta')}
              className={`flex-1 px-2 py-1.5 rounded border text-[11px] font-semibold flex items-center gap-1.5 justify-center ${
                tipoComprobante === 'boleta'
                  ? 'bg-blue-50 border-blue-300 text-blue-800'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400'
              }`}
            >
              <Receipt className="h-2.5 w-2.5" />
              <span>Boleta</span>
            </button>
          </div>
        </div>

        <div>
          <label className="flex items-center gap-1 text-[9px] font-bold text-gray-500 mb-1 uppercase tracking-wide">
            Moneda
          </label>
          <select
            value={currency}
            onChange={(e) => handleCurrencyChange(e.target.value as 'PEN' | 'USD')}
            className="w-full px-1.5 py-1.5 bg-white border border-gray-300 rounded text-[11px] font-semibold text-gray-900 hover:border-blue-400 transition-all focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="PEN">S/.</option>
            <option value="USD">$</option>
          </select>
        </div>
      </div>

      <div className="mt-2 space-y-1.5">
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

      <div className="flex items-center justify-between px-2 py-1 bg-gray-50 rounded border border-gray-200">
        <span className="text-[10px] text-gray-600 font-semibold">IGV:</span>
        <span className="text-[11px] font-bold text-gray-900">18%</span>
      </div>
    </div>
  );
};
