/* eslint-disable react-hooks/rules-of-hooks -- requiere refactor; se abordará luego */
/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
// ===================================================================
// EMISIÓN TRADICIONAL - PÁGINA INDEPENDIENTE
// Preserva toda la funcionalidad original con mejor UX
// ===================================================================

// ✅ FEATURE FLAG - Side Preview
const ENABLE_SIDE_PREVIEW_EMISION = true; // ✅ ACTIVADO para ver el panel

// Importar hooks del form-core y hooks específicos
import { useCart } from '../punto-venta/hooks/useCart';
import { usePayment } from '../shared/form-core/hooks/usePayment';
import { useCurrency } from '../shared/form-core/hooks/useCurrency';
import { useDrafts } from '../hooks/useDrafts';
import { useDocumentType } from '../shared/form-core/hooks/useDocumentType';
import { usePreview } from '../hooks/usePreview';
import { useComprobanteState } from '../hooks/useComprobanteState';
import { useComprobanteActions } from '../hooks/useComprobanteActions';
import { useFieldsConfiguration } from '../shared/form-core/contexts/FieldsConfigurationContext';
import { useDuplicateDataLoader } from '../hooks/useDuplicateDataLoader';

// ✅ Importar side-preview (condicional por flag)
import { SidePreviewPane, useSidePreviewPane } from '../shared/side-preview';

// Importar componentes del form-core
import ProductsSection from '../shared/form-core/components/ProductsSection';
import CompactDocumentForm from '../shared/form-core/components/CompactDocumentForm';
import NotesSection from '../shared/form-core/components/NotesSection';
import ActionButtonsSection from '../shared/form-core/components/ActionButtonsSection';
import FieldsConfigModal from '../shared/form-core/components/FieldsConfigModal';
import { Toast } from '../shared/ui/Toast/Toast';
import { ToastContainer } from '../shared/ui/Toast/ToastContainer';
import { DraftModal } from '../shared/modales/DraftModal';
import { PreviewModal } from '../shared/modales/PreviewModal';
import { ErrorBoundary } from '../shared/ui/ErrorBoundary';
import { SuccessModal } from '../shared/modales/SuccessModal';

import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUserSession } from '../../../contexts/UserSessionContext';
import { useConfigurationContext } from '../../configuracion-sistema/context/ConfigurationContext';
import { PaymentMethodFormModal } from '../../configuracion-sistema/components/business/PaymentMethodFormModal';
import type { ClientData, PaymentCollectionMode, PaymentCollectionPayload } from '../models/comprobante.types';
import { useClientes } from '../../gestion-clientes/hooks/useClientes';
import { validateComprobanteNormativa, validateComprobanteReadyForCobranza } from '../shared/core/comprobanteValidation';
import { CobranzaModal } from '../shared/modales/CobranzaModal';
import { useCreditTermsConfigurator } from '../hooks/useCreditTermsConfigurator';
import { CreditScheduleSummaryCard } from '../shared/payments/CreditScheduleSummaryCard';
import { CreditScheduleModal } from '../shared/payments/CreditScheduleModal';
import type { CreditInstallmentDefinition } from '../../../shared/payments/paymentTerms';

const cloneCreditTemplates = (items: CreditInstallmentDefinition[]): CreditInstallmentDefinition[] =>
  items.map((item) => ({ ...item }));

const EmisionTradicional = () => {
  const navigate = useNavigate();
  const { state, dispatch } = useConfigurationContext();

  // ✅ Hook para side preview (solo si flag habilitado)
  const sidePreview = ENABLE_SIDE_PREVIEW_EMISION ? useSidePreviewPane() : null;

  // ✅ Estado para forzar refresh del ProductSelector
  const [productSelectorKey, setProductSelectorKey] = useState(0);

  // ✅ Estado para modal de configuración de campos
  const [showFieldsConfigModal, setShowFieldsConfigModal] = useState(false);

  // Use custom hooks (SIN CAMBIOS - exactamente igual)
  const { session } = useUserSession();
  const { cartItems, removeFromCart, updateCartItem, addProductsFromSelector, clearCart } = useCart();
  const { calculateTotals } = usePayment();
  const { currentCurrency, currencyInfo, changeCurrency } = useCurrency();
  const { showDraftModal, setShowDraftModal, showDraftToast, setShowDraftToast, handleDraftModalSave, draftAction, setDraftAction, draftExpiryDate, setDraftExpiryDate } = useDrafts();
  const { tipoComprobante, setTipoComprobante, serieSeleccionada, setSerieSeleccionada, seriesFiltradas } = useDocumentType();
  const { openPreview, showPreview, closePreview } = usePreview();

  // ✅ Hook para configuración de visibilidad de campos
  const {
    config: fieldsConfig,
    toggleNotesSection,
    toggleActionButton,
    toggleOptionalField,
    toggleOptionalFieldRequired,
    resetToDefaults: resetFieldsConfig,
  } = useFieldsConfiguration();

  // Estado consolidado (SIN CAMBIOS)
  const {
    observaciones, setObservaciones,
    notaInterna, setNotaInterna,
    formaPago, setFormaPago,
    isProcessing,
    setIsProcessing,
    isCajaOpen,
    getPaymentMethodLabel,
    resetForm,
    goToComprobantes
  } = useComprobanteState();

  // Acciones del comprobante (SIN CAMBIOS)
  const {
    createComprobante,
    toasts,
    removeToast,
    error
  } = useComprobanteActions();
  // ----- Lifted data from CompactDocumentForm (cliente y campos opcionales) -----
  const [clienteSeleccionadoGlobal, setClienteSeleccionadoGlobal] = useState<{ nombre: string; dni: string; direccion: string; email?: string } | null>(null);
  const [fechaEmision, setFechaEmision] = useState<string>(new Date().toISOString().split('T')[0]);
  const [optionalFields, setOptionalFields] = useState<Record<string, any>>({});

  // ✅ Hook para cargar datos de duplicación (refactorizado)
  useDuplicateDataLoader({
    setClienteSeleccionadoGlobal,
    addProductsFromSelector,
    setObservaciones,
    setNotaInterna,
    setFormaPago,
    changeCurrency,
    setTipoComprobante,
    setOptionalFields
  });

  // Estado para el modal de éxito
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastComprobante, setLastComprobante] = useState<any>(null);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [showCobranzaModal, setShowCobranzaModal] = useState(false);
  const [cobranzaMode, setCobranzaMode] = useState<PaymentCollectionMode>('contado');
  const [lookupClient, setLookupClient] = useState<{ data: { nombre: string; documento: string; tipoDocumento: string; direccion?: string; email?: string }; origen: 'RENIEC' | 'SUNAT' } | null>(null);
  const [showCreditScheduleModal, setShowCreditScheduleModal] = useState(false);
  const creditTemplatesBackupRef = useRef<CreditInstallmentDefinition[] | null>(null);
  const { createCliente } = useClientes();

  // Calculate totals
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

  // ✅ View model para side preview
  const sidePreviewViewModel = ENABLE_SIDE_PREVIEW_EMISION ? {
    tipoComprobante,
    serieSeleccionada,
    cartItems,
    totals,
    observaciones,
    notaInterna,
    formaPago,
    currency: currentCurrency,
    client: clienteSeleccionadoGlobal?.nombre,
    clientDoc: clienteSeleccionadoGlobal?.dni,
    fechaEmision,
    optionalFields,
    creditTerms,
  } : null;

  const hasMinimumDataForPreview = ENABLE_SIDE_PREVIEW_EMISION &&
    clienteSeleccionadoGlobal !== null &&
    serieSeleccionada !== '' &&
    cartItems.length > 0;

  const draftClientData: ClientData | undefined = useMemo(() => {
    if (!clienteSeleccionadoGlobal) return undefined;
    return {
      nombre: clienteSeleccionadoGlobal.nombre,
      tipoDocumento: clienteSeleccionadoGlobal.dni && clienteSeleccionadoGlobal.dni.length === 11 ? 'ruc' : 'dni',
      documento: clienteSeleccionadoGlobal.dni,
      direccion: clienteSeleccionadoGlobal.direccion,
      email: clienteSeleccionadoGlobal.email,
    };
  }, [clienteSeleccionadoGlobal]);

  const buildCobranzaValidationInput = useCallback(() => ({
    tipoComprobante,
    serieSeleccionada,
    cliente: draftClientData,
    formaPago,
    fechaEmision,
    moneda: currentCurrency,
    cartItems,
    totals,
  }), [cartItems, currentCurrency, draftClientData, fechaEmision, formaPago, serieSeleccionada, tipoComprobante, totals]);

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


  // Handler para abrir modal de nueva forma de pago
  const handleNuevaFormaPago = () => {
    setShowPaymentMethodModal(true);
  };

  // Handler para actualizar payment methods
  const handleUpdatePaymentMethods = async (updatedMethods: any[]) => {
    dispatch({ type: 'SET_PAYMENT_METHODS', payload: updatedMethods });
  };

  // Handlers (SIN CAMBIOS - exactamente igual que antes)
  const handleVistaPrevia = () => {
    const validation = validateComprobanteNormativa(buildCobranzaValidationInput());

    if (!validation.isValid) {
      validation.errors.forEach((e) => {
        error('Faltan datos para vista previa', e.message);
      });
      return;
    }
    openPreview();
  };

  const paymentMethodCode = selectedPaymentMethod?.code?.toUpperCase() ?? '';
  const isCreditPaymentSelection = paymentMethodCode === 'CREDITO';

  const ensureDataBeforeCobranza = (paymentMode?: PaymentCollectionMode) => {
    const validation = validateComprobanteReadyForCobranza(buildCobranzaValidationInput(), {
      onError: (validationError) => error('Faltan datos para continuar', validationError.message),
      paymentMode,
    });

    return validation.isValid;
  };

  const handleOpenCobranzaModal = (targetMode: PaymentCollectionMode) => {
    if (!ensureDataBeforeCobranza(targetMode)) {
      return;
    }

    if (targetMode === 'credito') {
      if (!isCreditMethod) {
        error('Forma de pago incompatible', 'Selecciona una forma de pago configurada como crédito.');
        return;
      }
      if (creditTemplateErrors.length > 0) {
        creditTemplateErrors.forEach((validationError) =>
          error('Cronograma de crédito incompleto', validationError),
        );
        return;
      }
      if (!creditTerms) {
        error('Cronograma no disponible', 'No se pudo generar el cronograma de crédito. Intenta configurarlo nuevamente.');
        return;
      }
    }

    if (targetMode === 'contado' && !isCajaOpen) {
      error('Caja cerrada', 'Abre una caja para registrar cobranzas al contado o emite a crédito.');
      return;
    }

    setCobranzaMode(targetMode === 'credito' ? 'credito' : 'contado');
    setShowCobranzaModal(true);
  };

  const handleEmitirSinCobrar = async () => {
    if (!ensureDataBeforeCobranza()) {
      return;
    }
    await handleCrearComprobante();
  };

  const handlePrimaryAction = () => {
    if (isCreditPaymentSelection) {
      handleOpenCobranzaModal('credito');
      return;
    }
    handleOpenCobranzaModal('contado');
  };

  const handleSecondaryAction = () => {
    if (isCreditPaymentSelection) {
      handleOpenCobranzaModal('contado');
      return;
    }
    void handleEmitirSinCobrar();
  };

  const handleCrearComprobante = async (paymentPayload?: PaymentCollectionPayload): Promise<boolean> => {
    const isCredito = paymentPayload?.mode === 'credito';

    if (isProcessing) {
      error('Proceso en ejecución', 'Espera a que termine la operación anterior antes de continuar');
      return false;
    }

    if (!isCredito && !isCajaOpen) {
      error('Caja cerrada', 'Abre una caja para registrar cobranzas al contado. También puedes emitir a crédito.');
      return false;
    }

    if (isCredito) {
      if (!isCreditMethod) {
        error('Forma de pago incompatible', 'Selecciona una forma de pago configurada como crédito para emitir en cuotas.');
        return false;
      }
      if (creditTemplateErrors.length > 0) {
        creditTemplateErrors.forEach((validationError) =>
          error('Cronograma de crédito incompleto', validationError),
        );
        return false;
      }
      if (!creditTerms) {
        error('Cronograma no disponible', 'No se pudo generar el cronograma de crédito. Intenta configurarlo nuevamente.');
        return false;
      }
    }

    const validation = validateComprobanteReadyForCobranza(buildCobranzaValidationInput(), {
      onError: (validationError) => error('No se puede procesar', validationError.message),
      paymentMode: paymentPayload?.mode,
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
        observaciones,
        notaInterna,
        formaPago,
        currency: currentCurrency,
        client: clienteSeleccionadoGlobal?.nombre,
        clientDoc: clienteSeleccionadoGlobal?.dni,
        fechaEmision: fechaEmision,
        fechaVencimiento: optionalFields.fechaVencimiento,
        email: optionalFields.correo || clienteSeleccionadoGlobal?.email,
        address: optionalFields.direccion || clienteSeleccionadoGlobal?.direccion,
        shippingAddress: optionalFields.direccionEnvio,
        exchangeRate: currencyInfo?.rate,
        source: 'emision',
        purchaseOrder: optionalFields.ordenCompra,
        costCenter: optionalFields.centroCosto,
        waybill: optionalFields.guiaRemision,
        paymentDetails: paymentPayload,
        creditTerms: isCredito ? creditTerms : undefined,
        registrarPago: paymentPayload?.mode !== 'credito'
      });

      if (success) {
        setShowCobranzaModal(false);
        if (lookupClient) {
          const { data } = lookupClient;
          await createCliente({
            documentType: data.tipoDocumento.toUpperCase() === 'RUC' ? 'RUC' : 'DNI',
            documentNumber: data.documento,
            name: data.nombre,
            type: 'Cliente',
            direccion: data.direccion,
            email: data.email,
            tipoDocumento: data.tipoDocumento.toUpperCase(),
            numeroDocumento: data.documento,
            razonSocial: data.tipoDocumento.toLowerCase() === 'ruc' ? data.nombre : undefined,
            nombreCompleto: data.tipoDocumento.toLowerCase() === 'dni' ? data.nombre : undefined,
            tipoCuenta: 'Cliente'
          });
          setLookupClient(null);
        }

        const received = paymentPayload?.mode === 'contado'
          ? paymentPayload.lines.reduce((sum, line) => sum + line.amount, 0)
          : 0;
        setLastComprobante({
          tipo: tipoComprobante === 'factura' ? 'Factura' : tipoComprobante === 'boleta' ? 'Boleta' : 'Nota de Venta',
          serie: serieSeleccionada,
          numero: '001-00001', // TODO: Obtener el número real del backend
          total: totals.total,
          cliente: clienteSeleccionadoGlobal?.nombre || 'Cliente',
          vuelto: received > totals.total ? received - totals.total : 0
        });
        
        // Mostrar modal de éxito
        setShowSuccessModal(true);
        
        // NO limpiar el carrito todavía - se hará cuando el usuario haga clic en "Nueva venta"
      }
      return success;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCobranzaComplete = (payload: PaymentCollectionPayload) => {
    return handleCrearComprobante(payload);
  };

  const handlePrint = () => {
    console.log('Imprimiendo comprobante...', lastComprobante);
    // TODO: Implementar lógica de impresión
    window.print();
  };

  const handleNewSale = () => {
    clearCart();
    resetForm();
    setShowSuccessModal(false);
    setProductSelectorKey(prev => prev + 1); // ✅ Incrementar para remontar ProductSelector
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-gray-50 flex flex-col">

        {/* Header Mejorado con mejor diseño */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Left side */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/comprobantes')}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Volver a comprobantes"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      Emisión Tradicional
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        Formulario
                      </span>
                    </h1>
                    <p className="text-sm text-gray-500">
                      Comprobante detallado con todas las opciones
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ✅ Main Content - Layout Flex con Splitter cuando panel está abierto */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full flex">
            {/* Form View - Columna izquierda con scroll propio */}
            <div 
              className="overflow-y-auto"
              style={{
                flex: ENABLE_SIDE_PREVIEW_EMISION && sidePreview?.isOpen 
                  ? '1 1 auto'
                  : '1 1 100%',
                minWidth: '640px',
                height: '100%'
              }}
            >
              <div className="max-w-7xl mx-auto p-6 space-y-6">

            {/* ✅ Formulario Compacto - Todos los campos organizados */}
            <CompactDocumentForm
              tipoComprobante={tipoComprobante}
              setTipoComprobante={setTipoComprobante}
              serieSeleccionada={serieSeleccionada}
              setSerieSeleccionada={setSerieSeleccionada}
              seriesFiltradas={seriesFiltradas}
              moneda={currentCurrency}
              setMoneda={(value: string) => changeCurrency(value as any)}
              formaPago={formaPago}
              setFormaPago={setFormaPago}
              onNuevaFormaPago={handleNuevaFormaPago}
              onOpenFieldsConfig={() => setShowFieldsConfigModal(true)}
              onVistaPrevia={sidePreview?.togglePane}
              onClienteChange={setClienteSeleccionadoGlobal}
              onLookupClientSelected={setLookupClient}
              fechaEmision={fechaEmision}
              onFechaEmisionChange={setFechaEmision}
              onOptionalFieldsChange={(fields: Record<string, any>) => setOptionalFields(prev => ({ ...prev, ...fields }))}
            />

            {/* Products Section - Sin cambios */}
            <ProductsSection
              cartItems={cartItems}
              addProductsFromSelector={addProductsFromSelector}
              updateCartItem={updateCartItem}
              removeFromCart={removeFromCart}
              totals={totals}
              refreshKey={productSelectorKey}
            />

            {isCreditMethod && (
              <div className="mt-6">
                <CreditScheduleSummaryCard
                  creditTerms={creditTerms}
                  currency={currentCurrency}
                  total={totals.total}
                  onConfigure={handleOpenCreditScheduleModal}
                  errors={creditTemplateErrors}
                  paymentMethodName={selectedPaymentMethod?.name}
                />
              </div>
            )}

            {/* Notes Section - ✅ Renderizado condicional según configuración */}
            {fieldsConfig.notesSection && (
              <NotesSection
                observaciones={observaciones}
                setObservaciones={setObservaciones}
                notaInterna={notaInterna}
                setNotaInterna={setNotaInterna}
              />
            )}

            {/* Action Buttons Section - ahora con acciones dinámicas */}
            <ActionButtonsSection
              onVistaPrevia={fieldsConfig.actionButtons.vistaPrevia ? handleVistaPrevia : undefined}
              onCancelar={goToComprobantes}
              onGuardarBorrador={fieldsConfig.actionButtons.guardarBorrador ? () => setShowDraftModal(true) : undefined}
              isCartEmpty={cartItems.length === 0}
              productsCount={cartItems.length}
              primaryAction={fieldsConfig.actionButtons.crearComprobante ? {
                label: isCreditPaymentSelection ? 'Emitir a crédito' : 'Registrar pago y emitir',
                onClick: handlePrimaryAction,
                disabled: isProcessing || cartItems.length === 0,
                title: isCreditPaymentSelection ? 'Generar el comprobante sin registrar cobro' : 'Ir al cobro para registrar el pago',
              } : undefined}
              secondaryAction={fieldsConfig.actionButtons.crearComprobante ? {
                label: isCreditPaymentSelection ? 'Emitir y registrar abono' : 'Emitir sin cobrar',
                onClick: handleSecondaryAction,
                disabled: isProcessing || cartItems.length === 0,
                title: isCreditPaymentSelection ? 'Registrar un abono inicial antes de cerrar la venta' : 'Emitir el comprobante dejando el cobro pendiente',
              } : undefined}
            />
            </div>
          </div>

          {/* ✅ Side Preview Panel (como hermano del formulario en el flex) */}
          {ENABLE_SIDE_PREVIEW_EMISION && sidePreview && sidePreviewViewModel && sidePreview.isOpen && (
            <SidePreviewPane
              isOpen={sidePreview.isOpen}
              onClose={sidePreview.closePane}
              width={sidePreview.width}
              onWidthChange={sidePreview.setWidth}
              viewModel={sidePreviewViewModel}
              hasMinimumData={hasMinimumDataForPreview}
              validationErrors={[]} // TODO: Agregar validaciones reales si es necesario
              onConfirm={handlePrimaryAction}
              onSaveDraft={() => setShowDraftModal(true)}
              isProcessing={false}
            />
          )}
          </div>
        </div>

        {/* Toast Container - Sin cambios */}
        <ToastContainer
          toasts={toasts}
          onRemove={removeToast}
        />

        {/* Toast legacy - Sin cambios */}
        <Toast
          show={showDraftToast}
          message="Borrador guardado exitosamente"
          onClose={() => setShowDraftToast(false)}
        />

        {/* Modals - TODOS preservados */}
        <DraftModal
          show={showDraftModal}
          onClose={() => setShowDraftModal(false)}
          onSave={() => {
            handleDraftModalSave({
              tipoComprobante,
              serieSeleccionada,
              cartItems,
              onClearCart: clearCart,
              cliente: draftClientData,
              totals,
              currency: currentCurrency,
              observaciones,
              notaInterna,
              vendedor: session?.userName || undefined
            });
          }}
          draftExpiryDate={draftExpiryDate}
          onDraftExpiryDateChange={setDraftExpiryDate}
          draftAction={draftAction}
          onDraftActionChange={setDraftAction}
        />

        <CobranzaModal
          isOpen={showCobranzaModal}
          onClose={() => setShowCobranzaModal(false)}
          cartItems={cartItems}
          totals={totals}
          cliente={draftClientData}
          tipoComprobante={tipoComprobante}
          serie={serieSeleccionada}
          fechaEmision={fechaEmision}
          moneda={currentCurrency}
          formaPago={formaPago}
          onComplete={handleCobranzaComplete}
          isProcessing={isProcessing}
          establishmentId={session?.currentEstablishmentId}
          creditTerms={creditTerms}
          creditPaymentMethodLabel={selectedPaymentMethod?.name}
          modeIntent={cobranzaMode}
        />

        <PreviewModal
          isOpen={showPreview}
          onClose={closePreview}
          cartItems={cartItems}
          documentType={tipoComprobante}
          series={serieSeleccionada}
          totals={totals}
          paymentMethod={getPaymentMethodLabel(formaPago)}
          currency={currentCurrency}
          observations={observaciones}
          internalNotes={notaInterna}
          creditTerms={creditTerms}
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

        {/* Modal para crear nueva forma de pago */}
        <PaymentMethodFormModal
          isOpen={showPaymentMethodModal}
          onClose={() => setShowPaymentMethodModal(false)}
          paymentMethods={state.paymentMethods}
          onUpdate={handleUpdatePaymentMethods}
        />

        {/* ✅ Modal de configuración de campos */}
        <FieldsConfigModal
          isOpen={showFieldsConfigModal}
          onClose={() => setShowFieldsConfigModal(false)}
          config={fieldsConfig}
          onToggleNotesSection={toggleNotesSection}
          onToggleActionButton={toggleActionButton}
          onToggleOptionalField={toggleOptionalField}
          onToggleOptionalFieldRequired={toggleOptionalFieldRequired}
          onResetToDefaults={resetFieldsConfig}
        />
      </div>
    </ErrorBoundary>
  );
};

export default EmisionTradicional;
