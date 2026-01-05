/* eslint-disable react-hooks/rules-of-hooks -- requiere refactor; se abordará luego */
/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
// ===================================================================
// EMISIÓN TRADICIONAL - PÁGINA INDEPENDIENTE
// Preserva toda la funcionalidad original con mejor UX
// ===================================================================

// ✅ FEATURE FLAG - Side Preview
const ENABLE_SIDE_PREVIEW_EMISION = true; // ✅ ACTIVADO para ver el panel
const BLANK_QR_DATA_URL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

// Importar hooks del form-core y hooks específicos
import { useCart } from '../punto-venta/hooks/useCart';
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
import { PostIssueOptionsModal } from '../shared/modales/PostIssueOptionsModal';
import { PreviewDocument } from '../shared/ui/PreviewDocument';

import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getBusinessTodayISODate } from '@/shared/time/businessTime';
import { useUserSession } from '../../../contexts/UserSessionContext';
import { useConfigurationContext } from '../../configuracion-sistema/context/ConfigurationContext';
import { PaymentMethodFormModal } from '../../configuracion-sistema/components/business/PaymentMethodFormModal';
import type { ClientData, PaymentCollectionMode, PaymentCollectionPayload, Currency, PreviewData } from '../models/comprobante.types';
import { useClientes } from '../../gestion-clientes/hooks/useClientes';
import { useProductStore } from '../../catalogo-articulos/hooks/useProductStore';
import type { Product as CatalogProduct } from '../../catalogo-articulos/models/types';
import { validateComprobanteNormativa, validateComprobanteReadyForCobranza } from '../shared/core/comprobanteValidation';
import { CobranzaModal } from '../shared/modales/CobranzaModal';
import { useCreditTermsConfigurator } from '../hooks/useCreditTermsConfigurator';
import { CreditScheduleSummaryCard } from '../shared/payments/CreditScheduleSummaryCard';
import { CreditScheduleModal } from '../shared/payments/CreditScheduleModal';
import type { CreditInstallmentDefinition } from '../../../shared/payments/paymentTerms';
import { calculateCurrencyAwareTotals } from '../shared/core/currencyTotals';

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
  const {
    currentCurrency,
    currencyInfo,
    changeCurrency,
    availableCurrencies,
    baseCurrency,
    documentCurrency,
    convertPrice,
  } = useCurrency();
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
  const [clienteSeleccionadoGlobal, setClienteSeleccionadoGlobal] = useState<{
    nombre: string;
    dni: string;
    direccion: string;
    email?: string;
    priceProfileId?: string;
  } | null>(null);
  const [fechaEmision, setFechaEmision] = useState<string>(getBusinessTodayISODate());
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
  const [showPostIssueOptionsModal, setShowPostIssueOptionsModal] = useState(false);
  const [cobranzaMode, setCobranzaMode] = useState<PaymentCollectionMode>('contado');
  const [lookupClient, setLookupClient] = useState<{ data: { nombre: string; documento: string; tipoDocumento: string; direccion?: string; email?: string }; origen: 'RENIEC' | 'SUNAT' } | null>(null);
  const [showCreditScheduleModal, setShowCreditScheduleModal] = useState(false);
  const creditTemplatesBackupRef = useRef<CreditInstallmentDefinition[] | null>(null);
  const { createCliente } = useClientes();
  const { allProducts: catalogProducts } = useProductStore();
  const catalogLookup = useMemo(() => {
    const map = new Map<string, CatalogProduct>();
    catalogProducts.forEach(product => {
      map.set(product.id, product);
      if (product.codigo) {
        map.set(product.codigo, product);
      }
    });
    return map;
  }, [catalogProducts]);

  // Calculate totals sincronizados con la moneda del documento
  const totals = useMemo(
    () =>
      calculateCurrencyAwareTotals({
        items: cartItems,
        catalogLookup,
        baseCurrencyCode: baseCurrency.code,
        documentCurrencyCode: documentCurrency.code,
        convert: convertPrice,
      }),
    [baseCurrency.code, cartItems, catalogLookup, convertPrice, documentCurrency.code],
  );

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

  const preferredPriceColumnId = clienteSeleccionadoGlobal?.priceProfileId;

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
  const issueButtonLabel = useMemo(() => {
    switch (tipoComprobante) {
      case 'factura':
        return 'EMITIR FACTURA';
      case 'boleta':
        return 'EMITIR BOLETA';
      default:
        return 'EMITIR DOCUMENTO';
    }
  }, [tipoComprobante]);

  const paymentMethodLabel = getPaymentMethodLabel(formaPago);

  const printPreviewData = useMemo<PreviewData>(() => {
    const resolvedClient: ClientData = draftClientData ?? {
      nombre: 'Cliente',
      tipoDocumento: 'dni',
      documento: '----------',
      direccion: undefined,
      email: undefined,
    };

    const totalsWithCurrency = totals.currency ? totals : { ...totals, currency: currentCurrency };

    return {
      companyData: {
        name: 'FacturaFácil',
        businessName: 'FacturaFácil',
        ruc: '00000000000',
        address: 'TODO: Reemplazar con la dirección real de la empresa',
        phone: '---',
        email: '---',
      },
      clientData: resolvedClient,
      documentType: tipoComprobante,
      series: serieSeleccionada || 'SERIE',
      number: lastComprobante?.numero ?? null,
      issueDate: fechaEmision,
      dueDate: optionalFields?.fechaVencimiento,
      currency: currentCurrency,
      paymentMethod: paymentMethodLabel || 'CONTADO',
      cartItems,
      totals: totalsWithCurrency,
      observations: observaciones,
      internalNotes: notaInterna,
      creditTerms,
    };
  }, [
    cartItems,
    creditTerms,
    currentCurrency,
    draftClientData,
    fechaEmision,
    lastComprobante,
    notaInterna,
    observaciones,
    optionalFields,
    paymentMethodLabel,
    serieSeleccionada,
    tipoComprobante,
    totals,
  ]);

  const ensureDataBeforeCobranza = (paymentMode?: PaymentCollectionMode) => {
    const validation = validateComprobanteReadyForCobranza(buildCobranzaValidationInput(), {
      onError: (validationError) => error('Faltan datos para continuar', validationError.message),
      paymentMode,
    });

    return validation.isValid;
  };

  const handleOpenCobranzaModal = () => {
    const paymentModeForValidation: PaymentCollectionMode | undefined = isCreditPaymentSelection ? 'credito' : undefined;
    if (!ensureDataBeforeCobranza(paymentModeForValidation)) {
      return;
    }

    if (isCreditPaymentSelection) {
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

    if (!isCajaOpen) {
      error('Caja cerrada', 'Abre una caja para registrar cobranzas al contado o emite a crédito.');
      return;
    }

    setCobranzaMode('contado');
    setShowCobranzaModal(true);
  };

  const handleEmitirCredito = async (): Promise<boolean> => {
    if (!isCreditPaymentSelection) {
      error('Forma de pago incompatible', 'Selecciona una forma de pago configurada como crédito para postergar el cobro.');
      return false;
    }

    if (!ensureDataBeforeCobranza('credito')) {
      return false;
    }

    if (!isCreditMethod) {
      error('Forma de pago incompatible', 'Selecciona una forma de pago configurada como crédito.');
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

    const success = await handleCrearComprobante(undefined, { suppressSuccessModal: true });
    if (success) {
      setShowCobranzaModal(false);
      setShowPostIssueOptionsModal(false);
      const highlightedCuentaId = typeof window !== 'undefined'
        ? window.sessionStorage.getItem('lastCreatedReceivableId') || undefined
        : undefined;
      navigate('/cobranzas', {
        state: {
          defaultTab: 'cuentas',
          highlightCuentaId: highlightedCuentaId,
        },
      });
    }
    return Boolean(success);
  };

  const handleIssue = () => {
    if (isCreditPaymentSelection) {
      void handleEmitirCredito();
      return;
    }
    handleOpenCobranzaModal();
  };

  const handleCrearComprobante = async (
    paymentPayload?: PaymentCollectionPayload,
    options?: { suppressSuccessModal?: boolean }
  ): Promise<boolean> => {
    const isCreditSale = isCreditPaymentSelection || paymentPayload?.mode === 'credito';
    const isRegisteringCobro = paymentPayload?.mode === 'contado';

    if (isProcessing) {
      error('Proceso en ejecución', 'Espera a que termine la operación anterior antes de continuar');
      return false;
    }

    if (isRegisteringCobro && !isCajaOpen) {
      error('Caja cerrada', 'Abre una caja para registrar cobranzas al contado o cambia la venta a crédito.');
      return false;
    }

    if (isCreditSale) {
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
        paymentDetails: isRegisteringCobro ? paymentPayload : undefined,
        creditTerms: isCreditSale ? creditTerms : undefined,
        registrarPago: Boolean(isRegisteringCobro && paymentPayload?.lines.length)
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
        if (!options?.suppressSuccessModal) {
          setShowSuccessModal(true);
        }
        
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

  const handleDownloadPdf = () => {
    if (!lastComprobante) {
      return;
    }
    const simulatedContent = [
      `Comprobante: ${lastComprobante.tipo} ${lastComprobante.serie}-${lastComprobante.numero}`,
      `Cliente: ${lastComprobante.cliente ?? 'Sin especificar'}`,
      `Total: S/ ${Number(lastComprobante.total || 0).toFixed(2)}`,
    ].join('\n');
    const blob = new Blob([simulatedContent], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${lastComprobante.serie}-${lastComprobante.numero}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleNewSale = () => {
    clearCart();
    resetForm();
    if (currentCurrency !== baseCurrency.code) {
      changeCurrency(baseCurrency.code as Currency);
    }
    setShowSuccessModal(false);
    setShowPostIssueOptionsModal(false);
    setProductSelectorKey(prev => prev + 1); // ✅ Incrementar para remontar ProductSelector
  };

  const handleClosePostIssueOptions = () => {
    setShowPostIssueOptionsModal(false);
  };

  return (
    <ErrorBoundary>
      <div className="print:hidden">
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
                      Nueva Emision
                    </h1>
                    
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
              setMoneda={changeCurrency}
              currencyOptions={availableCurrencies}
              baseCurrencyCode={baseCurrency.code as Currency}
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
              preferredPriceColumnId={preferredPriceColumnId}
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
              primaryAction={fieldsConfig.actionButtons.crearComprobante ? {
                label: issueButtonLabel,
                onClick: handleIssue,
                disabled: isProcessing || cartItems.length === 0,
                title: isCreditPaymentSelection
                  ? 'Emitir y generar la cuenta por cobrar'
                  : 'Abrir el modal de cobranza para registrar este pago',
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
              onConfirm={handleIssue}
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
          paymentMethod={paymentMethodLabel}
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

        <PostIssueOptionsModal
          isOpen={showPostIssueOptionsModal}
          onClose={handleClosePostIssueOptions}
          comprobante={lastComprobante}
          onContinue={handleNewSale}
          onPrint={handlePrint}
          onDownload={handleDownloadPdf}
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
      </div>

      <div className="hidden print:block bg-white text-gray-900">
        <div className="max-w-3xl mx-auto p-10 print:p-6">
          <PreviewDocument data={printPreviewData} qrUrl={BLANK_QR_DATA_URL} />
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default EmisionTradicional;

