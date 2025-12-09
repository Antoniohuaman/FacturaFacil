// ===================================================================
// COMPONENTE UNIFICADO: CARRITO + CONFIGURACIÓN DE DOCUMENTO
// Fusiona CartSidebar con selección de Boleta/Factura y Cliente
// ===================================================================

import React, { useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, FileText } from 'lucide-react';
import type { CartSidebarProps, Product, ComprobanteCreditTerms } from '../../models/comprobante.types';
import { useCurrency } from '../../shared/form-core/hooks/useCurrency';
import { UI_MESSAGES } from '../../models/constants';
import type { PaymentMethod } from '../../../configuracion-sistema/models/PaymentMethod';
import { CreditScheduleSummaryCard } from '../../shared/payments/CreditScheduleSummaryCard';
import { CartItemsList } from './cart/CartItemsList';
import { ClientSection } from './client/ClientSection';
import { PaymentSection } from './payment/PaymentSection';
import { DiscountSection } from './discount/DiscountSection';
import type { ProductUnitOption } from '../../../lista-precios/models/PriceTypes';

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
  observaciones: string;
  notaInterna?: string;
  onObservacionesChange: (value: string) => void;
  onNotaInternaChange?: (value: string) => void;
  onCartItemUnitChange: (id: string, unitCode: string) => void;
  getUnitOptionsForProduct: (sku: string) => ProductUnitOption[];
  formatUnitLabel: (code?: string) => string;
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
  observaciones,
  notaInterna = '',
  onObservacionesChange,
  onNotaInternaChange,
  onCartItemUnitChange,
  getUnitOptionsForProduct,
  formatUnitLabel,
}) => {
  const { formatPrice, changeCurrency } = useCurrency();
  const [showNotes, setShowNotes] = useState(false);
  const MAX_NOTES_CHARS = 500;

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
  const igvPercentageLabel = useMemo(() => {
    if (!totals?.subtotal || totals.subtotal <= 0) {
      return null;
    }
    const rawValue = (totals.igv / totals.subtotal) * 100;
    if (!Number.isFinite(rawValue) || rawValue <= 0) {
      return null;
    }
    return `${rawValue.toFixed(2)}%`;
  }, [totals.igv, totals.subtotal]);

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
          onUpdateUnit={onCartItemUnitChange}
          getUnitOptionsForProduct={getUnitOptionsForProduct}
          formatUnitLabel={formatUnitLabel}
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

        <div className="px-2 pb-2">
          <button
            type="button"
            onClick={() => setShowNotes((prev) => !prev)}
            className="w-full flex items-center justify-between px-1 py-1.5 bg-transparent hover:text-blue-700 transition"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <FileText className="h-4 w-4 text-blue-600" />
              <span>Observaciones</span>
              <span className="text-[11px] font-normal text-gray-400">Opcional</span>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-gray-500 transition-transform ${showNotes ? 'rotate-180' : ''}`}
            />
          </button>

          {showNotes && (
            <div className="mt-2 space-y-3 rounded-2xl border border-gray-100 bg-white p-2.5 shadow-sm">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-700">Observaciones (se imprime)</label>
                  <span className="text-[11px] text-gray-500">{observaciones.length}/{MAX_NOTES_CHARS}</span>
                </div>
                <textarea
                  rows={3}
                  maxLength={MAX_NOTES_CHARS}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition resize-none"
                  placeholder="Ej: Entrega coordinada, indicar puerta lateral"
                  value={observaciones}
                  onChange={(e) => onObservacionesChange(e.target.value)}
                />
              </div>

              {onNotaInternaChange && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-700">Nota interna (no se imprime)</label>
                    <span className="text-[11px] text-gray-500">{notaInterna.length}/{MAX_NOTES_CHARS}</span>
                  </div>
                  <textarea
                    rows={2}
                    maxLength={MAX_NOTES_CHARS}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition resize-none"
                    placeholder="Ej: Cliente prefiere pagar el día 15"
                    value={notaInterna}
                    onChange={(e) => onNotaInternaChange(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Totals sticky */}
      {cartItems.length > 0 && (
        <div className="sticky bottom-0 border-t border-gray-200 bg-white shadow-[0_-8px_24px_rgba(15,23,42,0.08)]">
          <div className="p-3 space-y-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-inner">
              <div className="flex items-center justify-between text-[11px] text-gray-500">
                <span>Subtotal</span>
                <span className="font-semibold text-gray-900">{formatPrice(totals.subtotal, currency)}</span>
              </div>
              <div className="my-2 border-t border-dashed border-gray-200" />
              <div className="flex items-center justify-between text-[11px] text-gray-500">
                <span>{`IGV${igvPercentageLabel ? ` (${igvPercentageLabel})` : ''}`}</span>
                <span className="font-semibold text-gray-900">{formatPrice(totals.igv, currency)}</span>
              </div>
            </div>

            <button
              onClick={handlePrimaryAction}
              disabled={primaryDisabled}
              className={`w-full py-3 rounded-xl font-bold text-base shadow-lg transition-all ${
                !primaryDisabled
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600 active:bg-emerald-700'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-sm">{UI_MESSAGES.CART_LOADING}</span>
                </span>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{primaryLabel}</span>
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
                className={`w-full text-xs font-semibold tracking-wide ${
                  !secondaryDisabled ? 'text-indigo-600 hover:text-indigo-700' : 'text-gray-400'
                }`}
              >
                {secondaryLabel}
              </button>
            )}

            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-600">
              <span>
                {cartItems.length} {cartItems.length === 1 ? 'Producto' : 'Productos'}
              </span>
              <button
                onClick={onClearCart}
                className="text-teal-600 hover:text-teal-700"
                disabled={isProcessing}
              >
                Borrar todo
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
