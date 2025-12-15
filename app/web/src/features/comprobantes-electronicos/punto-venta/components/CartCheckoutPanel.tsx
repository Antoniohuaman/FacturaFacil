// ===================================================================
// COMPONENTE UNIFICADO: CARRITO + CONFIGURACIÓN DE DOCUMENTO
// Fusiona CartSidebar con selección de Boleta/Factura y Cliente
// ===================================================================

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ChevronDown, FileText, Percent, Printer, Wallet2, SlidersHorizontal, ShoppingCart } from 'lucide-react';
import type { CartSidebarProps, Product, ComprobanteCreditTerms, Currency } from '../../models/comprobante.types';
import { useCurrency } from '../../shared/form-core/hooks/useCurrency';
import { UI_MESSAGES } from '../../models/constants';
import type { PaymentMethod } from '../../../configuracion-sistema/models/PaymentMethod';
import { CreditScheduleSummaryCard } from '../../shared/payments/CreditScheduleSummaryCard';
import { CartItemsList } from './cart/CartItemsList';
import { ClientSection } from './client/ClientSection';
import { DiscountSection } from './discount/DiscountSection';
import type { ProductUnitOption } from '../../../lista-precios/models/PriceTypes';

export interface CartCheckoutPanelProps extends CartSidebarProps {
  onAddProduct?: (product: Product) => void;
  onUpdatePrice?: (id: string, newPrice: number) => void;
  onSetQuantity?: (id: string, quantity: number) => void;
  currency?: Currency;
  tipoComprobante: 'boleta' | 'factura';
  setTipoComprobante: (tipo: 'boleta' | 'factura') => void;
  onCurrencyChange?: (currency: Currency) => void;
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

const CART_LIST_MIN_HEIGHT = 260;
const CART_LIST_BOTTOM_OFFSET = 32;

export const CartCheckoutPanel: React.FC<CartCheckoutPanelProps> = ({
  cartItems,
  totals,
  onUpdateQuantity,
  onUpdatePrice,
  onSetQuantity,
  onRemoveItem,
  onClearCart,
  onConfirmSale,
  cashBoxStatus = 'unknown',
  isProcessing = false,
  currency = 'PEN' as Currency,
  tipoComprobante,
  setTipoComprobante,
  onCurrencyChange,
  clienteSeleccionado,
  setClienteSeleccionado,
  paymentMethods,
  formaPagoId,
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
  const { formatPrice, changeCurrency, availableCurrencies } = useCurrency();
  const [showNotes, setShowNotes] = useState(false);
  const [isDocMenuOpen, setIsDocMenuOpen] = useState(false);
  const docMenuRef = useRef<HTMLDivElement>(null);
  const itemsScrollRef = useRef<HTMLDivElement>(null);
  const [cartItemsMaxHeight, setCartItemsMaxHeight] = useState<string>('auto');
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
  const hasItems = cartItems.length > 0;
  const canProcessSale = !isProcessing && hasItems;
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
  const docOptions = [
    { value: 'boleta', label: 'Boleta' },
    { value: 'factura', label: 'Factura' },
  ] as const;
  const handleCurrencyChange = (newCurrency: Currency) => {
    changeCurrency(newCurrency);
    if (onCurrencyChange) {
      onCurrencyChange(newCurrency);
    }
  };

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

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!docMenuRef.current) {
        return;
      }
      if (!docMenuRef.current.contains(event.target as Node)) {
        setIsDocMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const currentDocLabel = docOptions.find(option => option.value === tipoComprobante)?.label || 'Documento';

  const recalcCartItemsHeight = useCallback(() => {
    if (!itemsScrollRef.current) {
      return;
    }
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const { top } = itemsScrollRef.current.getBoundingClientRect();
    const available = viewportHeight - top - CART_LIST_BOTTOM_OFFSET;
    setCartItemsMaxHeight(`${Math.max(available, CART_LIST_MIN_HEIGHT)}px`);
  }, []);

  useLayoutEffect(() => {
    recalcCartItemsHeight();
    const handleResize = () => recalcCartItemsHeight();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize);
    };
  }, [recalcCartItemsHeight]);

  useEffect(() => {
    recalcCartItemsHeight();
  }, [recalcCartItemsHeight, cashBoxStatus, clienteSeleccionado, hasItems]);

  return (
    <div className="bg-white flex h-full w-full flex-col">
      <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center justify-between" ref={docMenuRef}>
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDocMenuOpen(prev => !prev)}
            className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-900 hover:bg-slate-100 transition"
            aria-haspopup="listbox"
            aria-expanded={isDocMenuOpen}
          >
            <span>{currentDocLabel}</span>
            <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isDocMenuOpen ? 'rotate-180' : ''}`} />
            </span>
          </button>
          {isDocMenuOpen && (
            <div className="absolute left-0 mt-2 w-40 rounded-2xl border border-slate-100 bg-white shadow-xl z-10 overflow-hidden">
              {docOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setTipoComprobante(option.value);
                    setIsDocMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm font-medium transition ${
                    option.value === tipoComprobante
                      ? 'bg-slate-50 text-slate-900'
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

      <div className="flex items-center gap-1.5 text-slate-400">
          <div className="relative">
            <select
              value={currency}
              onChange={(event) => handleCurrencyChange(event.target.value as Currency)}
              className="appearance-none rounded-full border border-slate-200 bg-white px-4 py-1.5 pr-7 text-sm font-semibold text-slate-700 focus:border-slate-400 focus:outline-none"
            >
              {availableCurrencies.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.symbol} • {option.code}
                </option>
              ))}
            </select>
            <Wallet2 className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          </div>
          {[
            { icon: Percent, label: 'Aplicar descuento' },
            { icon: Printer, label: 'Imprimir' },
            { icon: SlidersHorizontal, label: 'Configuración' },
          ].map(({ icon: Icon, label }) => (
            <button
              key={label}
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-slate-400 hover:text-slate-700 hover:border-slate-200 transition"
              title={label}
              aria-label={label}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
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

      {/* Contenido estructurado: header + lista scrollable + acciones */}
      <div className="flex-1 min-h-0 bg-gray-50">
        <div className="flex h-full min-h-0 flex-col">
          <div className="shrink-0">
            <ClientSection
              clienteSeleccionado={clienteSeleccionado}
              setClienteSeleccionado={setClienteSeleccionado}
            />
          </div>

          <div className="flex-1 min-h-0 px-3 pb-3">
            {hasItems ? (
              <div
                ref={itemsScrollRef}
                className="h-full overflow-hidden rounded-2xl border border-gray-100 bg-white"
                style={{ maxHeight: cartItemsMaxHeight }}
              >
                <div className="h-full min-h-0 overflow-y-auto thin-scrollbar pr-1">
                  <CartItemsList
                    cartItems={cartItems}
                    currency={currency}
                    isProcessing={isProcessing}
                    onUpdateQuantity={onUpdateQuantity}
                    onUpdatePrice={onUpdatePrice}
                    onSetQuantity={onSetQuantity}
                    onRemoveItem={onRemoveItem}
                    onUpdateUnit={onCartItemUnitChange}
                    getUnitOptionsForProduct={getUnitOptionsForProduct}
                    formatUnitLabel={formatUnitLabel}
                  />
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white text-center text-sm text-gray-500">
                <div className="mb-3 rounded-full bg-gray-100 p-3">
                  <ShoppingCart className="h-6 w-6 text-gray-400" />
                </div>
                <p className="font-semibold text-gray-700">Tu carrito está vacío</p>
                <p className="text-xs text-gray-500">Agrega productos desde el catálogo para verlos aquí</p>
              </div>
            )}
          </div>

          <div className="shrink-0 space-y-3 px-3 pb-3">
            {isCreditMethod && (
              <CreditScheduleSummaryCard
                creditTerms={creditTerms}
                currency={currency}
                total={totals.total}
                onConfigure={onConfigureCreditSchedule}
                errors={creditScheduleErrors}
                paymentMethodName={creditPaymentMethodName || selectedPaymentMethod?.name}
              />
            )}

            <DiscountSection
              currency={currency}
              totals={totals}
              discountTypeState={discountState}
              discountValueState={discountValueState}
            />

            <div>
              <button
                type="button"
                onClick={() => setShowNotes((prev) => !prev)}
                className="w-full flex items-center justify-between px-1 py-1.5 bg-transparent hover:text-[#2f70b4] transition"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <FileText className="h-4 w-4 text-[#2f70b4]" />
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
        </div>
      </div>

      {/* Footer Totals fijo */}
      <div
        className={`shrink-0 border-t border-gray-200 bg-white shadow-[0_-8px_24px_rgba(15,23,42,0.08)] transition-opacity ${
          hasItems ? 'opacity-100' : 'opacity-70'
        }`}
      >
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
                  ? 'bg-[#2ccdb0] text-white hover:bg-[#26b79c] active:bg-[#1f9a83]'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-sm">{UI_MESSAGES.CART_LOADING}</span>
                </span>
              ) : (
                <div className="flex w-full items-center justify-center gap-3 px-2">
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
                  !secondaryDisabled ? 'text-[#2f70b4] hover:text-[#265a91]' : 'text-gray-400'
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
                className={`text-[#2ccdb0] hover:text-[#26b79c] ${!hasItems ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isProcessing || !hasItems}
              >
                Borrar todo
              </button>
            </div>
        </div>
      </div>
    </div>
  );
};
