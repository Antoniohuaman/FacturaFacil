// ===================================================================
// PUNTO DE VENTA - PÁGINA INDEPENDIENTE
// Preserva toda la funcionalidad original con mejor UX
// ===================================================================

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useConfigurationContext } from '../../../configuracion-sistema/contexto/ContextoConfiguracion';
import { useCurrentCompanyId, useCurrentEstablecimientoId } from '../../../../../../contexts/UserSessionContext';
import { crearClaveBorradorEnProgreso } from '@/shared/borradores/almacenamientoBorradorEnProgreso';
import { useBorradorEnProgreso } from '@/shared/borradores/useBorradorEnProgreso';
import { useRetornoAperturaCaja } from '@/shared/caja/useRetornoAperturaCaja';

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
import { PreviewTicket } from '../../shared/ui/PreviewTicket';
import type { PreviewData } from '../../models/comprobante.types';
import { buildCompanyData } from '@/shared/company/companyDataAdapter';
import {
  registrarFlujoVentaAbandonado,
  registrarPrimeraVentaCompletada,
  registrarVentaCompletada,
} from '@/shared/analitica/analitica';
import { derivarEntornoAnaliticoEmpresa } from '@/shared/empresas/entornoEmpresa';

const BLANK_QR_DATA_URL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
const LLAVE_PRIMERA_VENTA_COMPLETADA_SESION_BASE = 'analitica_primera_venta_completada';

const PuntoVenta = () => {
  const { state: configState } = useConfigurationContext();
  const {
    cartItems,
    totals,
    totalsBeforeDiscount,
    pricesIncludeTax,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    setCartItemQuantity,
    updateCartItemPrice,
    clearCart,
    setCartItemsFromDraft,
    priceListOptions,
    selectedPriceListId,
    setSelectedPriceListId,
    getUnitOptionsForProduct,
    getUnitLabelForSku,
    getPreferredUnitForSku,
    getPriceForProduct,
    onCartItemUnitChange,
    activePriceListLabel,
    discount,
    applyDiscount,
    clearDiscount,
    getDiscountPreviewTotals,
  } = usePosCartAndTotals();

  const {
    navigate,
    currentCurrency,
    changeCurrency,
    tipoComprobante,
    setTipoComprobante,
    serieSeleccionada,
    setSerieSeleccionada,
    formaPago,
    setFormaPago,
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
    onLookupClientSelected,
    clienteDraftData,
    handleOpenCreditScheduleModal,
    handleCancelCreditScheduleModal,
    handleSaveCreditScheduleModal,
    handleConfirmSale,
    handleEmitirCredito,
    handleCobranzaComplete,
    handlePrint,
    handleNewSale,
    paymentMethods,
  } = usePosComprobanteFlow({ cartItems, totals });

  type EstadoBorradorPos = {
    tipoComprobante: typeof tipoComprobante;
    serieSeleccionada: string;
    formaPago: string;
    moneda: typeof currentCurrency;
    observaciones: string;
    notaInterna: string;
    clienteSeleccionado: typeof clienteSeleccionado;
    cartItems: typeof cartItems;
  };

  const currentCompanyId = useCurrentCompanyId();
  const currentEstablecimientoId = useCurrentEstablecimientoId();
  const llavePrimeraVentaCompletadaSesion = useMemo(
    () => [
      LLAVE_PRIMERA_VENTA_COMPLETADA_SESION_BASE,
      currentCompanyId || 'sin_empresa',
      currentEstablecimientoId || 'sin_establecimiento',
      'pos',
    ].join(':'),
    [currentCompanyId, currentEstablecimientoId],
  );
  const borradorHabilitado = Boolean(currentCompanyId && currentEstablecimientoId);
  const claveBorradorEnProgreso = useMemo(() => crearClaveBorradorEnProgreso({
    app: 'facturafacil',
    tenantId: currentCompanyId ?? null,
    establecimientoId: currentEstablecimientoId ?? null,
    tipoDocumento: 'comprobante_pos',
    modo: tipoComprobante,
  }), [currentCompanyId, currentEstablecimientoId, tipoComprobante]);

  const {
    limpiar: limpiarBorradorEnProgreso,
    forzarGuardado: forzarGuardadoBorrador,
  } = useBorradorEnProgreso<EstadoBorradorPos, EstadoBorradorPos>({
    habilitado: borradorHabilitado,
    clave: claveBorradorEnProgreso,
    version: 1,
    ttlDias: 7,
    debounceMs: 400,
    limpiarSiNoDebePersistir: false,
    extraerEstado: () => ({
      tipoComprobante,
      serieSeleccionada,
      formaPago,
      moneda: currentCurrency,
      observaciones,
      notaInterna,
      clienteSeleccionado,
      cartItems,
    }),
    convertirAStorage: (estado) => estado,
    aplicarDesdeStorage: (borrador) => {
      if (borrador.tipoComprobante) {
        setTipoComprobante(borrador.tipoComprobante);
      }
      if (borrador.serieSeleccionada) {
        setSerieSeleccionada(borrador.serieSeleccionada);
      }
      if (borrador.formaPago) {
        setFormaPago(borrador.formaPago);
      }
      if (borrador.moneda) {
        changeCurrency(borrador.moneda);
      }
      setObservaciones(borrador.observaciones ?? '');
      setNotaInterna(borrador.notaInterna ?? '');
      setClienteSeleccionado(borrador.clienteSeleccionado ?? null);
      if (Array.isArray(borrador.cartItems)) {
        setCartItemsFromDraft(borrador.cartItems);
      }
    },
    debePersistir: (estado) => Boolean(
      estado.cartItems.length > 0
      || estado.clienteSeleccionado
      || estado.observaciones.trim()
      || estado.notaInterna.trim()
      || estado.formaPago
      || estado.moneda
      || estado.serieSeleccionada
    ),
  });

  const tieneActividadVentaPos = useMemo(() => Boolean(
    cartItems.length > 0
    || clienteSeleccionado
    || observaciones.trim()
    || notaInterna.trim()
  ), [cartItems.length, clienteSeleccionado, notaInterna, observaciones]);

  const { iniciarAperturaCaja } = useRetornoAperturaCaja();
  const handleAbrirCaja = useCallback(() => {
    forzarGuardadoBorrador();
    iniciarAperturaCaja();
  }, [forzarGuardadoBorrador, iniciarAperturaCaja]);

  useEffect(() => {
    if (!showSuccessModal) {
      return;
    }
    limpiarBorradorEnProgreso();
  }, [limpiarBorradorEnProgreso, showSuccessModal]);

  const entornoAnalitica = derivarEntornoAnaliticoEmpresa(configState.company) ?? 'demo';

  useEffect(() => {
    if (!showSuccessModal) {
      return;
    }

    registrarVentaCompletada({
      entorno: entornoAnalitica,
      origenVenta: 'pos',
      formaPago: isCreditMethod ? 'credito' : 'contado',
    });

    if (typeof window === 'undefined') {
      return;
    }

    if (window.sessionStorage.getItem(llavePrimeraVentaCompletadaSesion) === '1') {
      return;
    }

    registrarPrimeraVentaCompletada({
      entorno: entornoAnalitica,
      origenVenta: 'pos',
      formaPago: isCreditMethod ? 'credito' : 'contado',
    });
    window.sessionStorage.setItem(llavePrimeraVentaCompletadaSesion, '1');
  }, [entornoAnalitica, isCreditMethod, llavePrimeraVentaCompletadaSesion, showSuccessModal]);

  const selectedPaymentLabel = selectedPaymentMethod?.name ?? 'CONTADO';

  const previewData = useMemo<PreviewData>(() => {
    const resolvedClient =
      clienteDraftData ??
      (lastComprobante
        ? {
            nombre: lastComprobante.cliente ?? 'Cliente',
            tipoDocumento: 'dni',
            documento: '----------',
            direccion: undefined,
            email: undefined,
          }
        : {
            nombre: 'Cliente',
            tipoDocumento: 'dni',
            documento: '----------',
            direccion: undefined,
            email: undefined,
          });

    const companyData = buildCompanyData(configState.company);

    return {
      companyData,
      clientData: resolvedClient,
      documentType: tipoComprobante,
      series: serieSeleccionada || 'SERIE',
      number: lastComprobante?.numero ?? null,
      issueDate: fechaEmision,
      dueDate: creditTerms?.fechaVencimientoGlobal,
      currency: totals.currency ?? currentCurrency,
      paymentMethod: selectedPaymentLabel,
      cartItems,
      totals,
      observations: observaciones,
      internalNotes: notaInterna,
      creditTerms,
    };
  }, [
    cartItems,
    clienteDraftData,
    creditTerms,
    currentCurrency,
    fechaEmision,
    lastComprobante,
    notaInterna,
    observaciones,
    selectedPaymentLabel,
    serieSeleccionada,
    tipoComprobante,
    totals,
    configState.company,
  ]);

  const basePriceListId = useMemo(() => {
    const baseOption = priceListOptions.find((option) => option.isBase);
    return baseOption?.id || priceListOptions[0]?.id || '';
  }, [priceListOptions]);

  const lastAutoClientIdRef = useRef<string | number | null>(null);
  const lastAutoProfileRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!priceListOptions.length) {
      return;
    }
    const clientId = clienteSeleccionado?.id ?? null;
    const preferredProfileId = clienteSeleccionado?.priceProfileId;

    if (
      clientId === lastAutoClientIdRef.current &&
      preferredProfileId === lastAutoProfileRef.current
    ) {
      return;
    }

    lastAutoClientIdRef.current = clientId;
    lastAutoProfileRef.current = preferredProfileId;

    if (clientId === null) {
      return;
    }

    const resolvedProfileId = preferredProfileId && priceListOptions.some((option) => option.id === preferredProfileId)
      ? preferredProfileId
      : basePriceListId;

    if (!resolvedProfileId || resolvedProfileId === selectedPriceListId) {
      return;
    }

    setSelectedPriceListId(resolvedProfileId);
  }, [basePriceListId, clienteSeleccionado, priceListOptions, selectedPriceListId, setSelectedPriceListId]);

  return (
    <ErrorBoundary>
      <div className="print:hidden h-full flex flex-col min-h-0">
        <div className="flex-1 min-h-0 bg-gradient-to-br from-gray-50 via-[#2ccdb0]/10 to-gray-50 flex flex-col overflow-hidden">

        {/* Header Mejorado con mejor diseño */}
        <div className="bg-white border-b border-gray-200 shadow-sm shrink-0">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Left side */}
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-[#2f70b4] to-[#2ccdb0] rounded-xl flex items-center justify-center shadow-lg">
                  <ShoppingCart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    Punto de Venta
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#2ccdb0]/15 text-[#2f70b4]">
                      POS
                    </span>
                  </h1>
                </div>
              </div>

              {/* Right side - Estado de caja mejorado */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    if (tieneActividadVentaPos && !showSuccessModal) {
                      registrarFlujoVentaAbandonado({
                        origenVenta: 'pos',
                        motivoAbandono: 'salida_flujo',
                      });
                    }
                    navigate('/punto-venta/dashboard');
                  }}
                  className="rounded-full border border-gray-200 p-2 text-gray-500 transition-colors hover:border-[#2ccdb0] hover:text-[#2f70b4] focus-visible:ring-2 focus-visible:ring-[#2f70b4]/20"
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

        {/* Main Content - ocupa el alto disponible del shell sin forzar scroll global */}
        <div className="flex-1 min-h-0 overflow-hidden px-0 py-0">
          <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_520px] lg:gap-0">

            {/* POS View - columna izquierda */}
            <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white lg:border-r lg:border-slate-200">
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
                getUnitLabelForSku={getUnitLabelForSku}
                getPreferredUnitForSku={getPreferredUnitForSku}
                getPriceForProduct={getPriceForProduct}
                activePriceListLabel={activePriceListLabel}
              />
            </div>

            {/* Cart Checkout Panel - columna derecha */}
            <div className="flex h-full min-h-0 flex-col overflow-hidden">
              <div className="flex-1 min-h-0 overflow-hidden">
                <CartCheckoutPanel
                  cartItems={cartItems}
                  totals={totals}
                  totalsBeforeDiscount={totalsBeforeDiscount}
                  pricesIncludeTax={pricesIncludeTax}
                  onRemoveItem={removeFromCart}
                  onUpdateQuantity={updateCartQuantity}
                  onSetQuantity={setCartItemQuantity}
                  onUpdatePrice={updateCartItemPrice}
                  onCartItemUnitChange={onCartItemUnitChange}
                  getUnitOptionsForProduct={getUnitOptionsForProduct}
                  discount={discount}
                  onApplyDiscount={applyDiscount}
                  onClearDiscount={clearDiscount}
                  getDiscountPreviewTotals={getDiscountPreviewTotals}
                  onConfirmSale={handleConfirmSale}
                  onClearCart={clearCart}
                  onViewFullForm={() => navigate('/comprobantes/emision')}
                  onAddProduct={addToCart}
                  currency={currentCurrency}
                  tipoComprobante={tipoComprobante === 'factura' ? 'factura' : 'boleta'}
                  setTipoComprobante={setTipoComprobante}
                  onCurrencyChange={undefined}
                  clienteSeleccionado={clienteSeleccionado}
                  setClienteSeleccionado={setClienteSeleccionado}
                  onLookupClientSelected={onLookupClientSelected}
                  cashBoxStatus={cajaStatus === 'abierta' ? 'open' : cajaStatus === 'cerrada' ? 'closed' : 'unknown'}
                  isProcessing={isProcessing}
                  paymentMethods={paymentMethods}
                  formaPagoId={formaPago}
                  isCreditMethod={isCreditMethod}
                  onConfigureCreditSchedule={handleOpenCreditScheduleModal}
                  creditTerms={creditTerms}
                  creditScheduleErrors={creditTemplateErrors}
                  creditPaymentMethodName={selectedPaymentMethod?.name}
                  onEmitCredit={() => {
                    void handleEmitirCredito();
                  }}
                  observaciones={observaciones}
                  notaInterna={notaInterna}
                  onObservacionesChange={setObservaciones}
                  onNotaInternaChange={setNotaInterna}
                  onAbrirCaja={handleAbrirCaja}
                />
              </div>
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
      </div>
      <div className="hidden print:block bg-white text-gray-900 print:m-0 print:p-0">
        <div className="max-w-2xl mx-auto p-6 print:p-4">
          <PreviewTicket data={previewData} qrUrl={BLANK_QR_DATA_URL} />
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default PuntoVenta;
