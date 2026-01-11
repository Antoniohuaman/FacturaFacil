// ===================================================================
// COMPONENTE UNIFICADO: CARRITO + CONFIGURACIÓN DE DOCUMENTO
// Fusiona CartSidebar con selección de Boleta/Factura y Cliente
// ===================================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ChevronDown, FileText, Percent, Printer, Wallet2, SlidersHorizontal, ShoppingCart } from 'lucide-react';
import type { CartSidebarProps, Product, ComprobanteCreditTerms, Currency, DiscountInput, DiscountMode, PaymentTotals } from '../../models/comprobante.types';
import { useCurrency } from '../../shared/form-core/hooks/useCurrency';
import { UI_MESSAGES } from '../../models/constants';
import type { PaymentMethod } from '../../../configuracion-sistema/models/PaymentMethod';
import { CreditScheduleSummaryCard } from '../../shared/payments/CreditScheduleSummaryCard';
import { CartItemsList } from './cart/CartItemsList';
import { ClientSection } from './client/ClientSection';
import type { ProductUnitOption } from '../../../lista-precios/models/PriceTypes';
import type { NormalizedDocumentType } from '../../shared/form-core/utils/clientNormalization';
import { TaxBreakdownSummary } from '../../shared/ui/TaxBreakdownSummary';

export interface CartCheckoutPanelProps extends CartSidebarProps {
  onAddProduct?: (product: Product) => void;
  onUpdatePrice?: (id: string, newPrice: number) => void;
  onSetQuantity?: (id: string, quantity: number) => void;
  currency?: Currency;
  totalsBeforeDiscount: PaymentTotals;
  pricesIncludeTax: boolean;
  discount: DiscountInput | null;
  onApplyDiscount: (discount: DiscountInput | null) => void;
  onClearDiscount: () => void;
  getDiscountPreviewTotals: (discount: DiscountInput | null) => PaymentTotals;
  tipoComprobante: 'boleta' | 'factura';
  setTipoComprobante: (tipo: 'boleta' | 'factura') => void;
  onCurrencyChange?: (currency: Currency) => void;
  clienteSeleccionado: {
    id: string;
    nombre: string;
    tipoDocumento: NormalizedDocumentType;
    documento: string;
    direccion: string;
    email?: string;
    priceProfileId?: string;
  } | null;
  setClienteSeleccionado: (cliente: {
    id: string;
    nombre: string;
    tipoDocumento: NormalizedDocumentType;
    documento: string;
    direccion: string;
    email?: string;
    priceProfileId?: string;
  } | null) => void;
  paymentMethods: PaymentMethod[];
  formaPagoId: string;
  isCreditMethod?: boolean;
  onConfigureCreditSchedule?: () => void;
  creditTerms?: ComprobanteCreditTerms;
  creditScheduleErrors?: string[];
  creditPaymentMethodName?: string;
  onEmitCredit?: () => void;
  observaciones: string;
  notaInterna?: string;
  onObservacionesChange: (value: string) => void;
  onNotaInternaChange?: (value: string) => void;
  onCartItemUnitChange: (id: string, unitCode: string) => void;
  getUnitOptionsForProduct: (sku: string) => ProductUnitOption[];
  formatUnitLabel: (code?: string) => string;
}

const PERCENT_ERROR_MESSAGE = 'El descuento debe ser menor al 100%.';
const AMOUNT_ERROR_MESSAGE = 'El descuento debe ser menor al total.';

const sanitizeDecimalInput = (rawValue: string): string => rawValue.replace(/[^0-9.,]/g, '');

export const CartCheckoutPanel: React.FC<CartCheckoutPanelProps> = ({
  cartItems,
  totals,
  totalsBeforeDiscount,
  pricesIncludeTax,
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
  onEmitCredit,
  observaciones,
  notaInterna = '',
  onObservacionesChange,
  onNotaInternaChange,
  onCartItemUnitChange,
  getUnitOptionsForProduct,
  formatUnitLabel,
  discount,
  onApplyDiscount,
  onClearDiscount,
  getDiscountPreviewTotals,
}) => {
  const { formatPrice, changeCurrency, availableCurrencies } = useCurrency();
  const [showNotes, setShowNotes] = useState(false);
  const [isDocMenuOpen, setIsDocMenuOpen] = useState(false);
  const docMenuRef = useRef<HTMLDivElement>(null);
  const discountButtonRef = useRef<HTMLButtonElement>(null);
  const discountPopoverRef = useRef<HTMLDivElement>(null);
  const [isDiscountPopoverOpen, setIsDiscountPopoverOpen] = useState(false);
  const [discountInputMode, setDiscountInputMode] = useState<DiscountMode>('amount');
  const [discountInputValue, setDiscountInputValue] = useState('');
  const [discountInputError, setDiscountInputError] = useState<string | null>(null);
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
  const issueButtonLabel = 'IR A COBRAR';

  const issueDisabled = !canProcessSale || (!isCreditPaymentSelection ? !onConfirmSale : !onEmitCredit);

  const handleIssueAction = () => {
    if (issueDisabled) {
      return;
    }
    if (isCreditPaymentSelection) {
      onEmitCredit?.();
      return;
    }
    onConfirmSale?.();
  };

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

  const handleDiscountModeChange = useCallback((mode: DiscountMode) => {
    setDiscountInputMode(mode);
    setDiscountInputError(null);
  }, []);

  const syncDraftWithApplied = useCallback(() => {
    setDiscountInputError(null);
    if (discount?.mode === 'percent') {
      setDiscountInputMode('percent');
      setDiscountInputValue(Number.isFinite(discount.value) ? String(discount.value) : '');
      return;
    }
    if (discount?.mode === 'amount') {
      setDiscountInputMode('amount');
      setDiscountInputValue(Number.isFinite(discount.value) ? String(discount.value) : '');
      return;
    }
    setDiscountInputMode('amount');
    setDiscountInputValue('');
  }, [discount]);

  const draftNumericValue = useMemo(() => {
    if (!discountInputValue) {
      return 0;
    }
    const normalized = discountInputValue.replace(',', '.');
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [discountInputValue]);

  const draftDiscount = useMemo<DiscountInput | null>(() => {
    if (draftNumericValue <= 0) {
      return null;
    }
    if (discountInputMode === 'percent') {
      return {
        mode: 'percent',
        value: draftNumericValue,
      };
    }
    return {
      mode: 'amount',
      value: draftNumericValue,
      currency,
    };
  }, [currency, discountInputMode, draftNumericValue]);

  const previewTotals = useMemo(() => {
    if (!isDiscountPopoverOpen) {
      return totals;
    }
    return getDiscountPreviewTotals(draftDiscount);
  }, [draftDiscount, getDiscountPreviewTotals, isDiscountPopoverOpen, totals]);

  const displayedTotals = isDiscountPopoverOpen ? previewTotals : totals;
  const discountBaseDocValue = pricesIncludeTax ? totalsBeforeDiscount.total : totalsBeforeDiscount.subtotal;
  const isDiscountActive = Boolean(discount?.value && discount.value > 0);
  const canApplyDiscount = hasItems && (!!draftDiscount || !!discount) && !discountInputError;

  const handleDiscountInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeDecimalInput(event.target.value);
    if (!sanitized) {
      setDiscountInputValue('');
      setDiscountInputError(null);
      return;
    }

    const normalized = sanitized.replace(',', '.');
    const parsed = Number.parseFloat(normalized);

    if (!Number.isFinite(parsed)) {
      setDiscountInputValue(sanitized);
      setDiscountInputError(null);
      return;
    }

    if (discountInputMode === 'percent') {
      if (parsed >= 100) {
        setDiscountInputError(PERCENT_ERROR_MESSAGE);
        return;
      }
    } else if (discountBaseDocValue <= 0) {
      if (parsed > 0) {
        setDiscountInputError(AMOUNT_ERROR_MESSAGE);
        return;
      }
    } else if (parsed >= discountBaseDocValue) {
      setDiscountInputError(AMOUNT_ERROR_MESSAGE);
      return;
    }

    setDiscountInputValue(sanitized);
    setDiscountInputError(null);
  }, [discountBaseDocValue, discountInputMode]);

  const handleCancelDraft = useCallback(() => {
    syncDraftWithApplied();
    setIsDiscountPopoverOpen(false);
  }, [syncDraftWithApplied]);

  const handleClearDraft = useCallback(() => {
    onClearDiscount();
    setDiscountInputValue('');
    setDiscountInputError(null);
    setIsDiscountPopoverOpen(false);
  }, [onClearDiscount]);

  const handleApplyDraft = useCallback(() => {
    onApplyDiscount(draftDiscount);
    setDiscountInputError(null);
    setIsDiscountPopoverOpen(false);
  }, [draftDiscount, onApplyDiscount]);

  useEffect(() => {
    if (!isDiscountPopoverOpen) {
      return;
    }
    syncDraftWithApplied();
  }, [isDiscountPopoverOpen, syncDraftWithApplied]);

  useEffect(() => {
    if (!isDiscountPopoverOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleCancelDraft();
      }
    };
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        discountPopoverRef.current?.contains(target) ||
        discountButtonRef.current?.contains(target)
      ) {
        return;
      }
      handleCancelDraft();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleCancelDraft, isDiscountPopoverOpen]);

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

  return (
    <div className="bg-white flex h-full min-h-0 w-full flex-col overflow-hidden">
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
          <div className="relative">
            <button
              ref={discountButtonRef}
              type="button"
              onClick={() => {
                if (isDiscountPopoverOpen) {
                  handleCancelDraft();
                  return;
                }
                setIsDiscountPopoverOpen(true);
              }}
              className={`relative inline-flex h-8 w-8 items-center justify-center rounded-full border text-slate-500 transition ${
                isDiscountPopoverOpen || isDiscountActive
                  ? 'border-[#2ccdb0]/60 text-[#2f70b4]'
                  : 'border-transparent hover:border-slate-200 hover:text-slate-700'
              }`}
              title="Aplicar descuento"
              aria-haspopup="dialog"
              aria-expanded={isDiscountPopoverOpen}
            >
              <Percent className="h-4 w-4" />
              {isDiscountActive && (
                <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[#2ccdb0]" />
              )}
            </button>
            {isDiscountPopoverOpen && (
              <div
                ref={discountPopoverRef}
                className="absolute right-0 z-20 mt-2 w-64 rounded-2xl border border-slate-100 bg-white p-3 shadow-2xl"
              >
                <div className="mb-3 flex rounded-full bg-slate-100 p-0.5 text-[11px] font-semibold text-slate-500">
                  {(['amount', 'percent'] as DiscountMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => handleDiscountModeChange(mode)}
                      className={`flex-1 rounded-full px-2.5 py-1 transition ${
                        discountInputMode === mode
                          ? 'bg-white text-[#2f70b4] shadow'
                          : 'text-slate-500'
                      }`}
                    >
                      {mode === 'amount' ? 'Monto' : '%'}
                    </button>
                  ))}
                </div>
                <div className="mb-3">
                  <label className="sr-only">Valor de descuento</label>
                  <div className="relative">
                    {discountInputMode === 'amount' && (
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
                        {currency}
                      </span>
                    )}
                    <input
                      type="text"
                      inputMode="decimal"
                      value={discountInputValue}
                      onChange={handleDiscountInputChange}
                      className={`w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 focus:border-[#2ccdb0] focus:outline-none focus:ring-2 focus:ring-[#2ccdb0]/20 ${
                        discountInputMode === 'amount' ? 'pl-10' : ''
                      }`}
                      placeholder={discountInputMode === 'amount' ? '0.00' : '0'}
                      aria-label="Valor de descuento"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Máximo {formatPrice(discountBaseDocValue, currency)}
                  </p>
                  {discountInputError && (
                    <p className="mt-1 text-[11px] text-red-500">{discountInputError}</p>
                  )}
                </div>
                <div className="mb-3 space-y-1 rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Descuento</span>
                    <span className="font-semibold text-[#2f70b4]">
                      {previewTotals.discount?.amount
                        ? `-${formatPrice(previewTotals.discount.amount, currency)}`
                        : formatPrice(0, currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span>Total estimado</span>
                    <span className="text-sm font-bold text-slate-900">
                      {formatPrice(previewTotals.total, currency)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleApplyDraft}
                    disabled={!canApplyDiscount}
                    className={`flex-1 rounded-xl px-3 py-1.5 text-sm font-semibold text-white transition ${
                      canApplyDiscount ? 'bg-[#2ccdb0] hover:bg-[#28b59c]' : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    Aplicar
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelDraft}
                    className="rounded-xl px-3 py-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleClearDraft}
                    disabled={!discount}
                    className={`text-sm font-semibold ${discount ? 'text-red-500 hover:text-red-600' : 'text-slate-300 cursor-not-allowed'}`}
                  >
                    Borrar
                  </button>
                </div>
              </div>
            )}
          </div>
          {[{ icon: Printer, label: 'Imprimir' }, { icon: SlidersHorizontal, label: 'Configuración' }].map(({ icon: Icon, label }) => (
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
      <div className="flex-1 min-h-0 bg-gray-50 overflow-hidden">
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <div className="shrink-0">
            <ClientSection
              clienteSeleccionado={clienteSeleccionado}
              setClienteSeleccionado={setClienteSeleccionado}
            />
          </div>

          <div className="flex-1 min-h-0 px-3 pb-3 overflow-hidden">
            {hasItems ? (
              <div
                className="h-full min-h-0 overflow-hidden rounded-2xl border border-gray-100 bg-white"
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
            <TaxBreakdownSummary
              taxBreakdown={displayedTotals.taxBreakdown}
              currency={currency}
              variant="compact"
              subtotalFallback={displayedTotals.subtotal}
              igvFallback={displayedTotals.igv}
              totalFallback={displayedTotals.total}
              discountAmount={displayedTotals.discount?.amount}
            />
          </div>

          <button
              onClick={handleIssueAction}
              disabled={issueDisabled}
              className={`w-full py-3 rounded-xl font-bold text-base shadow-lg transition-all ${
                !issueDisabled
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
                  <span className="text-sm font-semibold">{issueButtonLabel}</span>
                  {!isCreditPaymentSelection && (
                    <span className="text-lg font-black">
                      {formatPrice(displayedTotals.total, currency)}
                    </span>
                  )}
                </div>
              )}
            </button>
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
