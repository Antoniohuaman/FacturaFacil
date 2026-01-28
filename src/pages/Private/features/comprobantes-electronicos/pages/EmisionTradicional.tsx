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
import { FileText } from 'lucide-react';

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
import { useCallback, useEffect, useMemo, useRef, useState, type FocusEvent } from 'react';
import { getBusinessTodayISODate } from '@/shared/time/businessTime';
import { useCurrentEstablecimientoId, useUserSession } from '../../../../../contexts/UserSessionContext';
import { useConfigurationContext } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import { buildCompanyData } from '@/shared/company/companyDataAdapter';
import type { ClientData, PaymentCollectionMode, PaymentCollectionPayload, Currency, PreviewData, PaymentTotals, DiscountInput, DiscountMode } from '../models/comprobante.types';
import { useClientes } from '../../gestion-clientes/hooks/useClientes';
import { clientesClient } from '../../gestion-clientes/api';
import { clienteToSaleSnapshot, type SaleDocumentType } from '../../gestion-clientes/utils/saleClienteMapping';
import { onlyDigits } from '../../gestion-clientes/utils/documents';
import { useProductStore } from '../../catalogo-articulos/hooks/useProductStore';
import type { Product as CatalogProduct } from '../../catalogo-articulos/models/types';
import { validateComprobanteNormativa, validateComprobanteReadyForCobranza } from '../shared/core/comprobanteValidation';
import { CobranzaModal } from '../shared/modales/CobranzaModal';
import { useCreditTermsConfigurator } from '../hooks/useCreditTermsConfigurator';
import { CreditScheduleSummaryCard } from '../shared/payments/CreditScheduleSummaryCard';
import { CreditScheduleModal } from '../shared/payments/CreditScheduleModal';
import type { CreditInstallmentDefinition } from '../../../../../shared/payments/paymentTerms';
import { calculateCurrencyAwareTotals } from '../shared/core/currencyTotals';
import { useCaja } from '../../control-caja/context/CajaContext';
import { BloqueoCajaCerrada } from '../shared/ui/BloqueoCajaCerrada';
import { useRetornoAperturaCaja } from '@/shared/caja/useRetornoAperturaCaja';

const cloneCreditTemplates = (items: CreditInstallmentDefinition[]): CreditInstallmentDefinition[] =>
  items.map((item) => ({ ...item }));


const EmisionTradicional = () => {
  const navigate = useNavigate();
  const { status: cajaStatus } = useCaja();
  const gateCajaCerradaActivo = cajaStatus !== 'abierta';
  const abrirCajaButtonRef = useRef<HTMLButtonElement>(null);
  const { iniciarAperturaCaja } = useRetornoAperturaCaja();

  const handleGateFocusCapture = useCallback(
    (event: FocusEvent) => {
      if (!gateCajaCerradaActivo) return;
      event.stopPropagation();
      const target = event.target as HTMLElement | null;
      target?.blur?.();
      queueMicrotask(() => abrirCajaButtonRef.current?.focus());
    },
    [gateCajaCerradaActivo],
  );

  // ✅ Hook para side preview (solo si flag habilitado)
  const sidePreview = ENABLE_SIDE_PREVIEW_EMISION ? useSidePreviewPane() : null;

  // ✅ Estado para forzar refresh del ProductSelector
  const [productSelectorKey, setProductSelectorKey] = useState(0);

  const currentEstablecimientoId = useCurrentEstablecimientoId();

  // Refrescar selector cuando cambie el establecimiento del header.
  useEffect(() => {
    if (!currentEstablecimientoId) {
      return;
    }
    setProductSelectorKey(prev => prev + 1);
  }, [currentEstablecimientoId]);

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
  const { state: configState } = useConfigurationContext();

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
    clienteId?: number | string;
    nombre: string;
    dni: string;
    direccion: string;
    email?: string;
    tipoDocumento?: SaleDocumentType;
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

  useEffect(() => {
    if (!fieldsConfig.notesSection) {
      setShowObservacionesPanel(false);
    }
  }, [fieldsConfig.notesSection]);

  // Estado para el modal de éxito
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastComprobante, setLastComprobante] = useState<any>(null);
  const [showCobranzaModal, setShowCobranzaModal] = useState(false);
  const [showPostIssueOptionsModal, setShowPostIssueOptionsModal] = useState(false);
  const [cobranzaMode, setCobranzaMode] = useState<PaymentCollectionMode>('contado');
  const [lookupClient, setLookupClient] = useState<{ data: { nombre: string; documento: string; tipoDocumento: string; direccion?: string; email?: string }; origen: 'RENIEC' | 'SUNAT' } | null>(null);
  const [showCreditScheduleModal, setShowCreditScheduleModal] = useState(false);
  const [pendingReceivableHighlightId, setPendingReceivableHighlightId] = useState<string | undefined>(undefined);
  const [showObservacionesPanel, setShowObservacionesPanel] = useState(false);
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

  // Calculate totals sincronizados con la moneda del documento (antes de descuento global)
  const baseTotals = useMemo(
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

  // Descuento global manual aplicado sobre los totales
  const [appliedGlobalDiscount, setAppliedGlobalDiscount] = useState<DiscountInput | null>(null);

  const totalsBeforeDiscount: PaymentTotals = useMemo(
    () => ({
      subtotal: baseTotals.subtotal,
      igv: baseTotals.igv,
      total: baseTotals.total,
      currency: (baseTotals.currency as Currency) || currentCurrency,
      taxBreakdown: baseTotals.taxBreakdown,
    }),
    [baseTotals.igv, baseTotals.subtotal, baseTotals.total, baseTotals.currency, baseTotals.taxBreakdown, currentCurrency],
  );

  const normalizeGlobalDiscount = useCallback(
    (input: DiscountInput | null): {
      mode: DiscountMode;
      percent: number;
      amount: number;
      target: 'subtotal' | 'total';
    } | null => {
      if (!input) return null;

      const pricesIncludeTax = true;
      const target: 'subtotal' | 'total' = pricesIncludeTax ? 'total' : 'subtotal';
      const referenceBase = target === 'total' ? totalsBeforeDiscount.total : totalsBeforeDiscount.subtotal;

      if (!Number.isFinite(referenceBase) || referenceBase <= 0) {
        return null;
      }

      if (input.mode === 'percent') {
        const rawPercent = Number.isFinite(input.value) ? input.value : 0;
        const percent = Math.min(100, Math.max(0, rawPercent));
        if (percent <= 0) return null;
        const amount = (referenceBase * percent) / 100;
        return { mode: 'percent', percent, amount, target };
      }

      const rawAmount = Number.isFinite(input.value) ? input.value : 0;
      const safeAmount = Math.min(Math.max(rawAmount, 0), referenceBase);
      if (safeAmount <= 0) return null;
      const percent = referenceBase > 0 ? (safeAmount / referenceBase) * 100 : 0;
      return { mode: 'amount', percent, amount: safeAmount, target };
    },
    [totalsBeforeDiscount.subtotal, totalsBeforeDiscount.total],
  );

  const applyGlobalDiscountToTotals = useCallback(
    (discount: DiscountInput | null): PaymentTotals => {
      const normalized = normalizeGlobalDiscount(discount);

      const base: PaymentTotals = {
        ...totalsBeforeDiscount,
        breakdown: {
          subtotalBeforeDiscount: totalsBeforeDiscount.subtotal,
          igvBeforeDiscount: totalsBeforeDiscount.igv,
          totalBeforeDiscount: totalsBeforeDiscount.total,
        },
      };

      if (!normalized) {
        return {
          ...base,
          discount: undefined,
        };
      }

      const { amount, target, mode, percent } = normalized;

      let newSubtotal = totalsBeforeDiscount.subtotal;
      let newIgv = totalsBeforeDiscount.igv;
      let newTotal = totalsBeforeDiscount.total;

      if (target === 'subtotal') {
        const updatedSubtotal = Math.max(totalsBeforeDiscount.subtotal - amount, 0);
        const factorSubtotal = totalsBeforeDiscount.subtotal > 0 ? updatedSubtotal / totalsBeforeDiscount.subtotal : 1;
        const updatedIgv = totalsBeforeDiscount.igv * factorSubtotal;
        newSubtotal = updatedSubtotal;
        newIgv = updatedIgv;
        newTotal = newSubtotal + newIgv;
      } else {
        const updatedTotal = Math.max(totalsBeforeDiscount.total - amount, 0);
        const factorTotal = totalsBeforeDiscount.total > 0 ? updatedTotal / totalsBeforeDiscount.total : 1;
        const updatedSubtotal = totalsBeforeDiscount.subtotal * factorTotal;
        const updatedIgv = totalsBeforeDiscount.igv * factorTotal;
        newSubtotal = updatedSubtotal;
        newIgv = updatedIgv;
        newTotal = updatedTotal;
      }

      const factorSubtotal = totalsBeforeDiscount.subtotal > 0 ? newSubtotal / totalsBeforeDiscount.subtotal : 1;
      const factorIgv = totalsBeforeDiscount.igv > 0 ? newIgv / totalsBeforeDiscount.igv : factorSubtotal;
      const factorTotal = totalsBeforeDiscount.total > 0 ? newTotal / totalsBeforeDiscount.total : factorSubtotal;

      const scaledTaxBreakdown = totalsBeforeDiscount.taxBreakdown?.map((row) => ({
        ...row,
        taxableBase: row.taxableBase * factorSubtotal,
        taxAmount: row.taxAmount * factorIgv,
        totalAmount: row.totalAmount * factorTotal,
      }));

      return {
        ...base,
        subtotal: newSubtotal,
        igv: newIgv,
        total: newTotal,
        discount: {
          mode,
          percent,
          amount,
        },
        taxBreakdown: scaledTaxBreakdown ?? totalsBeforeDiscount.taxBreakdown,
      };
    },
    [normalizeGlobalDiscount, totalsBeforeDiscount],
  );

  const totals: PaymentTotals = useMemo(
    () => applyGlobalDiscountToTotals(appliedGlobalDiscount),
    [appliedGlobalDiscount, applyGlobalDiscountToTotals],
  );

  const getDiscountPreviewTotals = useCallback(
    (draft: DiscountInput | null): PaymentTotals => applyGlobalDiscountToTotals(draft),
    [applyGlobalDiscountToTotals],
  );

  const handleApplyGlobalDiscount = useCallback((draft: DiscountInput | null) => {
    setAppliedGlobalDiscount(draft);
  }, []);

  const handleClearGlobalDiscount = useCallback(() => {
    setAppliedGlobalDiscount(null);
  }, []);

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

    const rawType = clienteSeleccionadoGlobal.tipoDocumento;
    const rawNumber = clienteSeleccionadoGlobal.dni || '';
    const hasNumber = Boolean(rawNumber.trim());

    let normalizedType: 'RUC' | 'DNI' | 'SIN_DOCUMENTO' | 'OTROS';
    if (rawType === 'RUC' || rawType === 'DNI' || rawType === 'SIN_DOCUMENTO' || rawType === 'OTROS') {
      normalizedType = rawType;
    } else if (!hasNumber) {
      normalizedType = 'SIN_DOCUMENTO';
    } else {
      normalizedType = 'OTROS';
    }

    const normalizedNumber =
      normalizedType === 'RUC' || normalizedType === 'DNI'
        ? onlyDigits(rawNumber)
        : rawNumber;

    return {
      nombre: clienteSeleccionadoGlobal.nombre,
      tipoDocumento: normalizedType === 'RUC' ? 'ruc' : 'dni',
      documento: normalizedNumber,
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


  // Crear nuevo método de pago se gestiona ahora desde el dropdown de Forma de Pago (modal reutilizado).

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
    const companyData = buildCompanyData(configState.company);

    return {
      companyData,
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
    configState.company,
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

    const success = await handleCrearComprobante();
    if (success) {
      setShowCobranzaModal(false);
      setShowPostIssueOptionsModal(false);
      const highlightedCuentaId = typeof window !== 'undefined'
        ? window.sessionStorage.getItem('lastCreatedReceivableId') || undefined
        : undefined;
      setPendingReceivableHighlightId(highlightedCuentaId);
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
        if (lookupClient && !(clienteSeleccionadoGlobal?.clienteId !== undefined && clienteSeleccionadoGlobal?.clienteId !== null)) {
          const { data } = lookupClient;
          const rawTipo = (data.tipoDocumento || '').toString().trim().toUpperCase();
          const documentType = rawTipo === 'RUC' ? 'RUC' : 'DNI';
          const documentNumber = onlyDigits(data.documento || '');

          if (documentNumber) {
            const searchResponse = await clientesClient.getClientes({ search: documentNumber, limit: 25, page: 1 });
            const existing = searchResponse.data.find((candidate) => {
              const snap = clienteToSaleSnapshot(candidate);
              return (snap.tipoDocumento === 'RUC' || snap.tipoDocumento === 'DNI') && snap.dni === documentNumber;
            });

            if (existing) {
              const snap = clienteToSaleSnapshot(existing);
              setClienteSeleccionadoGlobal((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  clienteId: snap.clienteId,
                  tipoDocumento: snap.tipoDocumento,
                  dni: snap.dni,
                  direccion: snap.direccion,
                  email: snap.email,
                  priceProfileId: snap.priceProfileId,
                };
              });
            } else {
              const created = await createCliente({
                documentType,
                documentNumber,
                name: data.nombre,
                type: 'Cliente',
                direccion: data.direccion,
                email: data.email,
                tipoDocumento: documentType,
                numeroDocumento: documentNumber,
                razonSocial: rawTipo === 'RUC' ? data.nombre : undefined,
                nombreCompleto: rawTipo === 'DNI' ? data.nombre : undefined,
                tipoCuenta: 'Cliente'
              });

              if (created) {
                const snap = clienteToSaleSnapshot(created);
                setClienteSeleccionadoGlobal((prev) => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    clienteId: snap.clienteId,
                    tipoDocumento: snap.tipoDocumento,
                    dni: snap.dni,
                    direccion: snap.direccion,
                    email: snap.email,
                    priceProfileId: snap.priceProfileId,
                  };
                });
              }
            }
          }

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
          vuelto: received > totals.total ? received - totals.total : 0,
          mode: isCreditSale ? 'credito' : 'contado',
          creditDueDate: isCreditSale ? creditTerms?.fechaVencimientoGlobal ?? null : null,
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
    setPendingReceivableHighlightId(undefined);
    setProductSelectorKey(prev => prev + 1); // ✅ Incrementar para remontar ProductSelector
  };

  const handleViewCuentaPorCobrar = useCallback(() => {
    setShowSuccessModal(false);
    const highlightedCuentaId = pendingReceivableHighlightId ?? (typeof window !== 'undefined'
      ? window.sessionStorage.getItem('lastCreatedReceivableId') || undefined
      : undefined);
    navigate('/cobranzas', {
      state: {
        defaultTab: 'cuentas',
        highlightCuentaId: highlightedCuentaId,
      },
    });
    setPendingReceivableHighlightId(undefined);
  }, [navigate, pendingReceivableHighlightId]);

  const handleClosePostIssueOptions = () => {
    setShowPostIssueOptionsModal(false);
  };

  return (
    <ErrorBoundary>
      <div className="print:hidden">
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-gray-50 flex flex-col">

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
              <div className="max-w-7xl mx-auto p-4 space-y-4">

            {gateCajaCerradaActivo && (
              <BloqueoCajaCerrada
                ref={abrirCajaButtonRef}
                onAbrirCaja={iniciarAperturaCaja}
              />
            )}

            <div className="relative">
              <div
                className={
                  gateCajaCerradaActivo
                    ? 'space-y-4 select-none blur-[1px] pointer-events-none transition-[filter]'
                    : 'space-y-4'
                }
                onFocusCapture={gateCajaCerradaActivo ? handleGateFocusCapture : undefined}
              >
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
                  isCreditMethod={isCreditMethod}
                  creditDueDate={creditTerms?.fechaVencimientoGlobal ?? null}
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
                  totalsBeforeDiscount={totalsBeforeDiscount}
                  globalDiscount={appliedGlobalDiscount}
                  onApplyGlobalDiscount={handleApplyGlobalDiscount}
                  onClearGlobalDiscount={handleClearGlobalDiscount}
                  getGlobalDiscountPreviewTotals={getDiscountPreviewTotals}
                  refreshKey={productSelectorKey}
                  selectedEstablecimientoId={currentEstablecimientoId}
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

                {/* Action Buttons Section - ahora con acciones dinámicas */}
                <ActionButtonsSection
                  onVistaPrevia={fieldsConfig.actionButtons.vistaPrevia ? handleVistaPrevia : undefined}
                  onCancelar={goToComprobantes}
                  onGuardarBorrador={fieldsConfig.actionButtons.guardarBorrador ? () => setShowDraftModal(true) : undefined}
                  secondaryAction={
                    fieldsConfig.notesSection
                      ? {
                          label: 'Observaciones',
                          onClick: () => setShowObservacionesPanel(true),
                          icon: <FileText className="h-4 w-4" />,
                          title: 'Agregar observaciones visibles para el cliente u observación interna',
                        }
                      : undefined
                  }
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

              {gateCajaCerradaActivo && (
                <div
                  className="absolute inset-0 z-10 bg-white/0"
                  aria-hidden="true"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    abrirCajaButtonRef.current?.focus();
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    abrirCajaButtonRef.current?.focus();
                  }}
                />
              )}
            </div>
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
          EstablecimientoId={session?.currentEstablecimientoId}
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
            onViewReceivable={lastComprobante?.mode === 'credito' ? handleViewCuentaPorCobrar : undefined}
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

        {/* El modal de creación de métodos de pago no se instancia aquí */}

        {fieldsConfig.notesSection && showObservacionesPanel && (
          <div
            className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm px-4 py-6 flex items-end sm:items-center justify-center"
            role="dialog"
            aria-modal="true"
            onClick={() => setShowObservacionesPanel(false)}
          >
            <div
              className="relative w-full max-w-3xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="relative rounded-2xl bg-white shadow-2xl">
                <button
                  type="button"
                  className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
                  onClick={() => setShowObservacionesPanel(false)}
                  aria-label="Cerrar panel de observaciones"
                >
                  ×
                </button>
                <div className="max-h-[70vh] overflow-y-auto p-4 sm:p-6">
                  <NotesSection
                    observaciones={observaciones}
                    setObservaciones={setObservaciones}
                    notaInterna={notaInterna}
                    setNotaInterna={setNotaInterna}
                    collapsible={false}
                    defaultExpanded
                  />
                </div>
                <div className="flex justify-end border-t border-slate-100 px-4 py-3">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() => setShowObservacionesPanel(false)}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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

