// ===================================================================
// COMPONENTE UNIFICADO: CARRITO + CONFIGURACIÓN DE DOCUMENTO
// Fusiona CartSidebar con selección de Boleta/Factura y Cliente
// ===================================================================

import React, { useMemo, useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import type { CartSidebarProps, Product, ComprobanteCreditTerms } from '../../models/comprobante.types';
import { useCurrency } from '../../shared/form-core/hooks/useCurrency';
import { UI_MESSAGES } from '../../models/constants';
import type { PaymentMethod } from '../../../configuracion-sistema/models/PaymentMethod';
import { CreditScheduleSummaryCard } from '../../shared/payments/CreditScheduleSummaryCard';
import { CartItemsList } from './cart/CartItemsList';
import { ClientSection } from './client/ClientSection';
import { PaymentSection } from './payment/PaymentSection';
import { DiscountSection } from './discount/DiscountSection';

export interface CartCheckoutPanelProps extends CartSidebarProps {
  onAddProduct?: (product: Product) => void;
  onUpdatePrice?: (id: string, newPrice: number) => void;
  currency?: 'PEN' | 'USD';
  tipoComprobante: 'boleta' | 'factura';
  setTipoComprobante: (tipo: 'boleta' | 'factura') => void;
  onCurrencyChange?: (currency: 'PEN' | 'USD') => void;
  clienteSeleccionado: {
    id: number;
    nombre: string;
    tipoDocumento: 'DNI' | 'RUC' | 'Sin documento';
    documento: string;
    direccion: string;
  } | null;
  setClienteSeleccionado: (cliente: {
    id: number;
    nombre: string;
    tipoDocumento: 'DNI' | 'RUC' | 'Sin documento';
    documento: string;
    direccion: string;
  } | null) => void;
  paymentMethods: PaymentMethod[];
  formaPagoId: string;
  onFormaPagoChange: (paymentMethodId: string) => void;
  onNuevaFormaPago?: () => void;
  isCreditMethod?: boolean;
  onConfigureCreditSchedule?: () => void;
  creditTerms?: ComprobanteCreditTerms;
  creditScheduleErrors?: string[];
  creditPaymentMethodName?: string;
  onEmitWithoutPayment?: () => void;
}

export const CartCheckoutPanel: React.FC<CartCheckoutPanelProps> = ({
  cartItems,
  totals,
  onUpdateQuantity,
  onUpdatePrice,
  onRemoveItem,
  onClearCart,
  onConfirmSale,
  cashBoxStatus = 'unknown',
  isProcessing = false,
  currency = 'PEN',
  tipoComprobante,
  setTipoComprobante,
  onCurrencyChange,
  clienteSeleccionado,
  setClienteSeleccionado,
  paymentMethods,
  formaPagoId,
  onFormaPagoChange,
  onNuevaFormaPago,
  isCreditMethod,
  onConfigureCreditSchedule,
  creditTerms,
  creditScheduleErrors,
  creditPaymentMethodName,
  onEmitWithoutPayment,
}) => {
  const { formatPrice, changeCurrency } = useCurrency();

  const availablePaymentMethods = useMemo(() => (
    paymentMethods
      .filter((method) => method.isActive && (method.display?.showInPos ?? true))
      .sort((a, b) => (a.display?.displayOrder ?? 0) - (b.display?.displayOrder ?? 0))
  ), [paymentMethods]);

  const selectedPaymentMethod = useMemo(() => (
    availablePaymentMethods.find((method) => method.id === formaPagoId) || availablePaymentMethods[0]
  ), [availablePaymentMethods, formaPagoId]);
  const selectedPaymentCode = (selectedPaymentMethod?.code || '').toUpperCase();
  const isCreditPaymentSelection = selectedPaymentCode === 'CREDITO';

  // Estado de la caja
  const isCashBoxClosed = cashBoxStatus === 'closed';
  const canProcessSale = !isProcessing && cartItems.length > 0;
  const primaryDisabled = !canProcessSale || !onConfirmSale;
  const secondaryDisabled = !canProcessSale || !onEmitWithoutPayment;
  const primaryLabel = 'Emitir y cobrar';
  const secondaryLabel = 'Emitir sin cobrar';

  const handlePrimaryAction = () => {
    if (primaryDisabled || !onConfirmSale) {
      return;
    }
    onConfirmSale();
  };

  const handleSecondaryAction = () => {
    if (secondaryDisabled || !onEmitWithoutPayment) {
      return;
    }
    onEmitWithoutPayment();
  };

  const discountState = useState<'amount' | 'percentage'>('amount');
  const discountValueState = useState<string>('');

  return (
    <div className="w-[480px] bg-white border-l border-gray-200 flex flex-col h-full shadow-lg">
      {/* Header Simplificado - Sin información redundante */}
      <div className="p-2.5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <h3 className="font-bold text-sm text-gray-900 text-center">Carrito de Venta</h3>
      </div>

      {/* Warning de caja cerrada */}
      {isCashBoxClosed && (
        <div className="mx-4 mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">Caja cerrada</p>
              <p className="text-xs text-yellow-600">{UI_MESSAGES.CAJA_CLOSED_WARNING}</p>
            </div>
          </div>
        </div>
      )}

      {/* Contenido scrollable */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <PaymentSection
          currency={currency}
          tipoComprobante={tipoComprobante}
          setTipoComprobante={setTipoComprobante}
          onCurrencyChange={onCurrencyChange}
          changeCurrency={changeCurrency}
          availablePaymentMethods={availablePaymentMethods}
          selectedPaymentMethod={selectedPaymentMethod}
          onFormaPagoChange={onFormaPagoChange}
          onNuevaFormaPago={onNuevaFormaPago}
          isCreditMethod={isCreditMethod}
          onConfigureCreditSchedule={onConfigureCreditSchedule}
        />

        <ClientSection
          clienteSeleccionado={clienteSeleccionado}
          setClienteSeleccionado={setClienteSeleccionado}
        />

        <CartItemsList
          cartItems={cartItems}
          currency={currency}
          isProcessing={isProcessing}
          onUpdateQuantity={onUpdateQuantity}
          onUpdatePrice={onUpdatePrice}
          onRemoveItem={onRemoveItem}
        />

        {isCreditMethod && (
          <div className="px-3 pb-3">
            <CreditScheduleSummaryCard
              creditTerms={creditTerms}
              currency={currency}
              total={totals.total}
              onConfigure={onConfigureCreditSchedule}
              errors={creditScheduleErrors}
              paymentMethodName={creditPaymentMethodName || selectedPaymentMethod?.name}
            />
          </div>
        )}

        <DiscountSection
          currency={currency}
          totals={totals}
          discountTypeState={discountState}
          discountValueState={discountValueState}
        />
      </div>

      {/* Sección de Total - Compacta y Profesional */}
      {cartItems.length > 0 && (
        <div className="border-t border-gray-300 bg-gradient-to-b from-white to-gray-50">
          <div className="p-3 space-y-2">
            
            {/* Botón Principal Compacto */}
            <button
              onClick={handlePrimaryAction}
              disabled={primaryDisabled}
              className={`w-full py-3 rounded-lg font-bold text-base shadow-md transition-all ${
                !primaryDisabled
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg transform hover:scale-[1.01] active:scale-[0.99]'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
              }`}
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-sm">{UI_MESSAGES.CART_LOADING}</span>
                </span>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xs font-semibold opacity-90">{primaryLabel}</span>
                  {!isCreditPaymentSelection && (
                    <span className="text-lg font-black">
                      {formatPrice(totals.total, currency)}
                    </span>
                  )}
                </div>
              )}
            </button>

            {onEmitWithoutPayment && (
              <button
                onClick={handleSecondaryAction}
                disabled={secondaryDisabled}
                className={`w-full py-2 rounded-lg text-sm font-semibold transition ${
                  !secondaryDisabled ? 'text-blue-700 hover:bg-blue-50' : 'text-gray-400 cursor-not-allowed'
                }`}
              >
                {secondaryLabel}
              </button>
            )}
            
            {/* Footer Compacto */}
            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                <span className="font-semibold text-gray-700">
                  {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              <button
                onClick={onClearCart}
                className="group flex items-center gap-1 px-2 py-1 text-red-600 hover:text-white bg-red-50 hover:bg-red-600 rounded font-semibold transition-all"
                disabled={isProcessing}
              >
                <Trash2 className="h-3 w-3" />
                <span className="text-[10px]">Vaciar</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
