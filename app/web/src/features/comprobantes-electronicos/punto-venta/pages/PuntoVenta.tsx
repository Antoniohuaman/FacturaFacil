/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
/* eslint-disable @typescript-eslint/no-unused-vars -- variables temporales; limpieza diferida */
// ===================================================================
// PUNTO DE VENTA - PÁGINA INDEPENDIENTE
// Preserva toda la funcionalidad original con mejor UX
// ===================================================================

// Importar hooks customizados
import { useCart } from '../hooks/useCart';
import { usePayment } from '../../shared/form-core/hooks/usePayment';
import { useCurrency } from '../../shared/form-core/hooks/useCurrency';
import { useDocumentType } from '../../shared/form-core/hooks/useDocumentType';
import { useComprobanteState } from '../../hooks/useComprobanteState';
import { useComprobanteActions } from '../../hooks/useComprobanteActions';
import { useAvailableProducts } from '../../hooks/useAvailableProducts';
import { useCreditTermsConfigurator } from '../../hooks/useCreditTermsConfigurator';
import { useCurrentEstablishmentId, useCurrentCompanyId } from '../../../../contexts/UserSessionContext';
import { useConfigurationContext } from '../../../configuracion-sistema/context/ConfigurationContext';

// Importar componentes POS
import { ProductGrid } from '../components/ProductGrid';
import { CartCheckoutPanel } from '../components/CartCheckoutPanel';

// Importar componentes compartidos
import { ToastContainer } from '../../shared/ui/Toast/ToastContainer';
import { ErrorBoundary } from '../../shared/ui/ErrorBoundary';
import { SuccessModal } from '../../shared/modales/SuccessModal';
import { CobranzaModal } from '../../shared/modales/CobranzaModal';
import { validateComprobanteReadyForCobranza } from '../../shared/core/comprobanteValidation';
import type { ClientData, PaymentCollectionMode, PaymentCollectionPayload } from '../../models/comprobante.types';
import { CreditScheduleModal } from '../../shared/payments/CreditScheduleModal';
import type { CreditInstallmentDefinition } from '../../../../shared/payments/paymentTerms';

import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import { useCallback, useMemo, useRef, useState, useEffect } from 'react';

const cloneCreditTemplates = (items: CreditInstallmentDefinition[]): CreditInstallmentDefinition[] =>
  items.map((item) => ({ ...item }));

const PuntoVenta = () => {
  const navigate = useNavigate();

  // Obtener establecimiento y empresa del usuario actual
  const currentEstablishmentId = useCurrentEstablishmentId();
  const currentCompanyId = useCurrentCompanyId();
  const { state } = useConfigurationContext();

  // Use custom hooks (SIN CAMBIOS - exactamente igual)
  const { cartItems, addToCart, removeFromCart, updateCartQuantity, updateCartItemPrice, clearCart } = useCart();
  const { calculateTotals } = usePayment();
  const { currentCurrency, currencyInfo } = useCurrency();
  const { tipoComprobante, setTipoComprobante, serieSeleccionada } = useDocumentType();

  // Estado consolidado (SIN CAMBIOS)
  const {
    formaPago,
    setFormaPago,
    isProcessing, setIsProcessing,
    isCajaOpen, cajaStatus,
    resetForm
  } = useComprobanteState();

  // Acciones del comprobante (SIN CAMBIOS)
  const {
    createComprobante,
    toasts,
    removeToast,
    error,
    warning
  } = useComprobanteActions();

  // Estado para el modal de éxito
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastComprobante, setLastComprobante] = useState<any>(null);
  const [showCobranzaModal, setShowCobranzaModal] = useState(false);
  const [showCreditScheduleModal, setShowCreditScheduleModal] = useState(false);
  const [fechaEmision] = useState(() => new Date().toISOString().split('T')[0]);
  const creditTemplatesBackupRef = useRef<CreditInstallmentDefinition[] | null>(null);

  // Estado para cliente seleccionado (nuevo flujo)
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any>(null);

  const clienteDraftData: ClientData | undefined = useMemo(() => {
    if (!clienteSeleccionado) return undefined;
    const rawTipo = (clienteSeleccionado.tipoDocumento || '').toString().toLowerCase();
    const tipoDocumento: ClientData['tipoDocumento'] = rawTipo === 'ruc' ? 'ruc' : 'dni';
    return {
      nombre: clienteSeleccionado.nombre,
      tipoDocumento,
      documento: clienteSeleccionado.documento,
      direccion: clienteSeleccionado.direccion,
    };
  }, [clienteSeleccionado]);

  // Obtener productos disponibles del catálogo (filtrados por establecimiento)
  const availableProducts = useAvailableProducts({
    establecimientoId: currentEstablishmentId,
    soloConStock: false // Cambiar a true si solo se quieren mostrar productos con stock
  });

  // Calculate totals (SIN CAMBIOS)
  const totals = calculateTotals(cartItems);

  const {
    paymentMethod: selectedPaymentMethod,
    isCreditMethod,
    templates: creditTemplates,
    setTemplates: setCreditTemplates,
    errors: creditTemplateErrors,
    creditTerms,
    restoreDefaults: restoreCreditTemplates,
  } = useCreditTermsConfigurator({
    paymentMethodId: formaPago,
    total: totals.total,
    issueDate: fechaEmision,
  });
  const paymentMethodCode = selectedPaymentMethod?.code?.toUpperCase() ?? '';
  const isCreditPaymentSelection = paymentMethodCode === 'CREDITO';

  useEffect(() => {
    if (!isCreditMethod && showCreditScheduleModal) {
      setShowCreditScheduleModal(false);
      creditTemplatesBackupRef.current = null;
    }
  }, [isCreditMethod, showCreditScheduleModal]);

  const handleOpenCreditScheduleModal = () => {
    if (!isCreditMethod) {
      return;
    }
    creditTemplatesBackupRef.current = cloneCreditTemplates(creditTemplates);
    setShowCreditScheduleModal(true);
  };

  const handleCancelCreditScheduleModal = () => {
    if (creditTemplatesBackupRef.current) {
      setCreditTemplates(cloneCreditTemplates(creditTemplatesBackupRef.current));
    }
    creditTemplatesBackupRef.current = null;
    setShowCreditScheduleModal(false);
  };

  const handleSaveCreditScheduleModal = () => {
    creditTemplatesBackupRef.current = null;
    setShowCreditScheduleModal(false);
  };

  const buildCobranzaValidationInput = useCallback(() => ({
    tipoComprobante,
    serieSeleccionada,
    cliente: clienteDraftData,
    formaPago,
    fechaEmision,
    moneda: currentCurrency,
    cartItems,
    totals,
  }), [cartItems, clienteDraftData, currentCurrency, fechaEmision, formaPago, serieSeleccionada, tipoComprobante, totals]);

  const ensureDataBeforeCobranza = useCallback((toastTitle: string, paymentMode?: PaymentCollectionMode) => {
    const validation = validateComprobanteReadyForCobranza(buildCobranzaValidationInput(), {
      onError: (validationError) => warning(toastTitle, validationError.message),
      paymentMode,
    });
    return validation.isValid;
  }, [buildCobranzaValidationInput, warning]);

  // Handlers (SIN CAMBIOS - exactamente igual que antes)
  const validateCreditSchedule = (notify: (title: string, message: string) => void = warning) => {
    if (!isCreditMethod) {
      notify('Forma de pago incompatible', 'Selecciona una forma de pago configurada como crédito.');
      return false;
    }
    if (creditTemplateErrors.length > 0) {
      creditTemplateErrors.forEach((validationError) =>
        notify('Cronograma de crédito incompleto', validationError),
      );
      return false;
    }
    if (!creditTerms) {
      notify('Cronograma no disponible', 'No se pudo generar el cronograma de crédito para esta venta.');
      return false;
    }
    return true;
  };

  const handleConfirmSale = () => {
    if (!ensureDataBeforeCobranza('Faltan datos para procesar la venta', isCreditPaymentSelection ? 'credito' : undefined)) {
      return;
    }
    if (isCreditPaymentSelection && !validateCreditSchedule()) {
      return;
    }
    if (!isCajaOpen) {
      warning('Caja cerrada', 'Abre una caja para registrar el cobro o emite sin cobrar.');
      return;
    }
    setShowCobranzaModal(true);
  };

  const handleEmitirSinCobranza = async () => {
    const paymentModeForValidation: PaymentCollectionMode | undefined = isCreditPaymentSelection ? 'credito' : undefined;
    if (!ensureDataBeforeCobranza('Faltan datos para emitir sin cobrar', paymentModeForValidation)) {
      return false;
    }
    if (isCreditPaymentSelection && !validateCreditSchedule()) {
      return false;
    }
    const success = await handleCrearComprobante();
    if (success) {
      setShowCobranzaModal(false);
      const highlightedCuentaId = sessionStorage.getItem('lastCreatedReceivableId') || undefined;
      navigate('/cobranzas', {
        state: {
          defaultTab: 'cuentas',
          highlightCuentaId: highlightedCuentaId,
        },
      });
    }
    return success;
  };

  const handleCrearComprobante = async (paymentPayload?: PaymentCollectionPayload): Promise<boolean> => {
    const isCreditSale = isCreditPaymentSelection || paymentPayload?.mode === 'credito';
    const isRegisteringCobro = paymentPayload?.mode === 'contado';

    if (isProcessing) {
      error('Proceso en ejecución', 'Espera a que termine la operación anterior antes de continuar');
      return false;
    }

    if (isRegisteringCobro && !isCajaOpen) {
      error('Caja cerrada', 'Abre una caja para registrar pagos al contado. También puedes emitir sin cobrar.');
      return false;
    }

    if (isCreditSale && !validateCreditSchedule(error)) {
      return false;
    }

    const validation = validateComprobanteReadyForCobranza(buildCobranzaValidationInput(), {
      onError: (validationError) => error('No se puede procesar', validationError.message),
      paymentMode: isCreditSale ? 'credito' : paymentPayload?.mode,
    });

    if (!validation.isValid) {
      return false;
    }

    setIsProcessing(true);

    try {
      const success = await createComprobante({
        tipoComprobante,
        serieSeleccionada,
        cartItems,
        totals,
        formaPago,
        establishmentId: currentEstablishmentId,
        companyId: currentCompanyId,
        currency: currentCurrency,
        exchangeRate: currencyInfo?.rate,
        source: 'pos',
        client: clienteDraftData?.nombre,
        clientDoc: clienteDraftData?.documento,
        fechaEmision,
        paymentDetails: isRegisteringCobro ? paymentPayload : undefined,
        creditTerms: isCreditSale ? creditTerms : undefined,
        registrarPago: Boolean(isRegisteringCobro && paymentPayload?.lines.length)
      });

      if (success) {
        const received = paymentPayload?.mode === 'contado'
          ? paymentPayload.lines.reduce((sum, line) => sum + line.amount, 0)
          : 0;

        setLastComprobante({
          tipo: tipoComprobante === 'factura' ? 'Factura' : tipoComprobante === 'boleta' ? 'Boleta' : 'Nota de Venta',
          serie: serieSeleccionada,
          numero: '001-00001', // TODO: Obtener el número real del backend
          total: totals.total,
          cliente: clienteDraftData?.nombre || 'Cliente',
          vuelto: received > totals.total ? received - totals.total : 0
        });

        setShowCobranzaModal(false);
        setShowSuccessModal(true);
      }

      return success;
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    console.log('Imprimiendo comprobante...', lastComprobante);
    // TODO: Implementar lógica de impresión
    window.print();
  };

  const handleCobranzaComplete = async (payload: PaymentCollectionPayload) => {
    return handleCrearComprobante(payload);
  };

  const handleNewSale = () => {
    clearCart();
    resetForm();
    setShowSuccessModal(false);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/20 to-gray-50 flex flex-col">

        {/* Header Mejorado con mejor diseño */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Left side */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/punto-venta')}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Volver al punto de venta"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

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
                    <p className="text-sm text-gray-500">
                      Ventas ágiles y eficientes
                    </p>
                  </div>
                </div>
              </div>

              {/* Right side - Estado de caja mejorado */}
              <div className="flex items-center space-x-3">
                {/* Status of cash box is now shown in the global Header; keep an accessible live region */}
                <span className="sr-only" aria-live="polite">Caja {cajaStatus === 'abierta' ? 'abierta' : 'cerrada'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Layout EXACTAMENTE igual que antes */}
        <div className="flex-1 flex overflow-hidden">

          {/* POS View - PRESERVADO COMPLETAMENTE */}
          <div className="flex-1 overflow-hidden">
            {/* Products Grid - SIN CAMBIOS */}
            <ProductGrid
              products={availableProducts}
              cartItems={cartItems}
              onAddToCart={addToCart}
            />
          </div>

          {/* Cart Checkout Panel - NUEVO COMPONENTE UNIFICADO */}
          <CartCheckoutPanel
            cartItems={cartItems}
            totals={totals}
            onRemoveItem={removeFromCart}
            onUpdateQuantity={updateCartQuantity}
            onUpdatePrice={updateCartItemPrice}
            onConfirmSale={handleConfirmSale}
            onClearCart={clearCart}
            onViewFullForm={() => navigate('/comprobantes/emision')}
            onAddProduct={addToCart}
            currency={currentCurrency}
            tipoComprobante={tipoComprobante}
            setTipoComprobante={setTipoComprobante}
            onCurrencyChange={(_newCurrency) => {
              // Currency change is handled by useCurrency hook
            }}
            clienteSeleccionado={clienteSeleccionado}
            setClienteSeleccionado={setClienteSeleccionado}
            cashBoxStatus={cajaStatus === 'abierta' ? 'open' : cajaStatus === 'cerrada' ? 'closed' : 'unknown'}
            isProcessing={isProcessing}
            paymentMethods={state.paymentMethods}
            formaPagoId={formaPago}
            onFormaPagoChange={setFormaPago}
            isCreditMethod={isCreditMethod}
            onConfigureCreditSchedule={handleOpenCreditScheduleModal}
            creditTerms={creditTerms}
            creditScheduleErrors={creditTemplateErrors}
            creditPaymentMethodName={selectedPaymentMethod?.name}
            onEmitWithoutPayment={() => {
              void handleEmitirSinCobranza();
            }}
          />
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
            onNewSale={handleNewSale}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default PuntoVenta;
