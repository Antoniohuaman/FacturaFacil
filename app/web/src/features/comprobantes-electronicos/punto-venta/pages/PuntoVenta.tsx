// ===================================================================
// PUNTO DE VENTA - PÁGINA INDEPENDIENTE
// Preserva toda la funcionalidad original con mejor UX
// ===================================================================

import { useEffect } from 'react';

// Hooks POS orquestadores
import { usePosCartAndTotals } from '../hooks/usePosCartAndTotals';
import { usePosComprobanteFlow } from '../hooks/usePosComprobanteFlow';

// Importar componentes POS
import { ProductGrid } from '../components/products/ProductGrid';
import { CartCheckoutPanel } from '../components/cart/CartCheckoutPanel';

// Importar componentes compartidos
import { ToastContainer } from '../../shared/ui/Toast/ToastContainer';
import { ErrorBoundary } from '../../shared/ui/ErrorBoundary';
import { SuccessModal } from '../../shared/modales/SuccessModal';
import { CobranzaModal } from '../../shared/modales/CobranzaModal';
import { CreditScheduleModal } from '../../shared/payments/CreditScheduleModal';

import { LayoutDashboard, ShoppingCart } from 'lucide-react';

const PuntoVenta = () => {
  const {
    cartItems,
    totals,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    setCartItemQuantity,
    updateCartItemPrice,
    clearCart,
    priceListOptions,
    selectedPriceListId,
    setSelectedPriceListId,
    registerPricingNotifier,
    getUnitOptionsForProduct,
    formatUnitLabel,
    getPreferredUnitForSku,
    getPriceForProduct,
    onCartItemUnitChange,
    activePriceListLabel,
  } = usePosCartAndTotals();

  const {
    navigate,
    currentCurrency,
    tipoComprobante,
    setTipoComprobante,
    serieSeleccionada,
    formaPago,
    observaciones,
    setObservaciones,
    notaInterna,
    setNotaInterna,
    isProcessing,
    cajaStatus,
    toasts,
    removeToast,
    availableProducts,
    selectedPaymentMethod,
    isCreditMethod,
    creditTemplates,
    setCreditTemplates,
    creditTemplateErrors,
    creditTerms,
    restoreCreditTemplates,
    showSuccessModal,
    setShowSuccessModal,
    lastComprobante,
    showCobranzaModal,
    setShowCobranzaModal,
    showCreditScheduleModal,
    fechaEmision,
    clienteSeleccionado,
    setClienteSeleccionado,
    clienteDraftData,
    handleOpenCreditScheduleModal,
    handleCancelCreditScheduleModal,
    handleSaveCreditScheduleModal,
    handleConfirmSale,
    handleEmitirSinCobranza,
    handleCobranzaComplete,
    handlePrint,
    handleNewSale,
    paymentMethods,
    warning,
  } = usePosComprobanteFlow({ cartItems, totals });

  useEffect(() => {
    registerPricingNotifier(warning);
    return () => registerPricingNotifier(undefined);
  }, [registerPricingNotifier, warning]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/20 to-gray-50 flex flex-col">

        {/* Header Mejorado con mejor diseño */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Left side */}
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                  <ShoppingCart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    Punto de Venta
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                      POS
                    </span>
                  </h1>
                </div>
              </div>

              {/* Right side - Estado de caja mejorado */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => navigate('/punto-venta/dashboard')}
                  className="rounded-full border border-gray-200 p-2 text-gray-500 transition-colors hover:border-teal-200 hover:text-teal-600 focus-visible:ring-2 focus-visible:ring-teal-100"
                  title="Ir al dashboard de Punto de Venta"
                >
                  <LayoutDashboard className="h-4 w-4" />
                </button>
                {/* Status of cash box is now shown in the global Header; keep an accessible live region */}
                <span className="sr-only" aria-live="polite">Caja {cajaStatus === 'abierta' ? 'abierta' : 'cerrada'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Layout EXACTAMENTE igual que antes */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full min-h-0 flex flex-col gap-6 xl:flex-row xl:gap-0">

            {/* POS View - PRESERVADO COMPLETAMENTE */}
            <div className="flex h-full min-h-0 flex-1 flex-col">
              {/* Products Grid - SIN CAMBIOS */}
              <ProductGrid
                products={availableProducts}
                cartItems={cartItems}
                onAddToCart={addToCart}
                currency={currentCurrency}
                priceListOptions={priceListOptions}
                selectedPriceListId={selectedPriceListId}
                onPriceListChange={setSelectedPriceListId}
                getUnitOptionsForProduct={getUnitOptionsForProduct}
                formatUnitLabel={formatUnitLabel}
                getPreferredUnitForSku={getPreferredUnitForSku}
                getPriceForProduct={getPriceForProduct}
                activePriceListLabel={activePriceListLabel}
              />
            </div>

            {/* Cart Checkout Panel - NUEVO COMPONENTE UNIFICADO */}
            <div className="flex h-full min-h-0 flex-col xl:w-[520px] xl:flex-shrink-0">
              <CartCheckoutPanel
                cartItems={cartItems}
                totals={totals}
                onRemoveItem={removeFromCart}
                onUpdateQuantity={updateCartQuantity}
                onSetQuantity={setCartItemQuantity}
                onUpdatePrice={updateCartItemPrice}
                onCartItemUnitChange={onCartItemUnitChange}
                getUnitOptionsForProduct={getUnitOptionsForProduct}
                formatUnitLabel={formatUnitLabel}
                onConfirmSale={handleConfirmSale}
                onClearCart={clearCart}
                onViewFullForm={() => navigate('/comprobantes/emision')}
                onAddProduct={addToCart}
                currency={currentCurrency}
                tipoComprobante={tipoComprobante}
                setTipoComprobante={setTipoComprobante}
                onCurrencyChange={undefined}
                clienteSeleccionado={clienteSeleccionado}
                setClienteSeleccionado={setClienteSeleccionado}
                cashBoxStatus={cajaStatus === 'abierta' ? 'open' : cajaStatus === 'cerrada' ? 'closed' : 'unknown'}
                isProcessing={isProcessing}
                paymentMethods={paymentMethods}
                formaPagoId={formaPago}
                isCreditMethod={isCreditMethod}
                onConfigureCreditSchedule={handleOpenCreditScheduleModal}
                creditTerms={creditTerms}
                creditScheduleErrors={creditTemplateErrors}
                creditPaymentMethodName={selectedPaymentMethod?.name}
                onEmitWithoutPayment={() => {
                  void handleEmitirSinCobranza();
                }}
                observaciones={observaciones}
                notaInterna={notaInterna}
                onObservacionesChange={setObservaciones}
                onNotaInternaChange={setNotaInterna}
              />
            </div>
          </div>
        </div>

        {/* Toast Container - Sin cambios */}
        <ToastContainer
          toasts={toasts}
          onRemove={removeToast}
        />

        <CobranzaModal
          isOpen={showCobranzaModal}
          onClose={() => {
            if (!isProcessing) {
              setShowCobranzaModal(false);
            }
          }}
          cartItems={cartItems}
          totals={totals}
          cliente={clienteDraftData}
          tipoComprobante={tipoComprobante}
          serie={serieSeleccionada}
          fechaEmision={fechaEmision}
          moneda={currentCurrency}
          formaPago={formaPago}
          onComplete={handleCobranzaComplete}
          isProcessing={isProcessing}
          creditTerms={creditTerms}
          creditPaymentMethodLabel={selectedPaymentMethod?.name}
          onIssueWithoutPayment={handleEmitirSinCobranza}
        />

        <CreditScheduleModal
          isOpen={showCreditScheduleModal}
          templates={creditTemplates}
          onChange={setCreditTemplates}
          onSave={handleSaveCreditScheduleModal}
          onCancel={handleCancelCreditScheduleModal}
          onRestoreDefaults={restoreCreditTemplates}
          errors={creditTemplateErrors}
          paymentMethodName={selectedPaymentMethod?.name}
        />

        {/* Modal de éxito con acciones de compartir */}
        {lastComprobante && (
          <SuccessModal
            isOpen={showSuccessModal}
            onClose={() => setShowSuccessModal(false)}
            comprobante={lastComprobante}
            onPrint={handlePrint}
            onNewSale={() => handleNewSale(clearCart)}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default PuntoVenta;
