import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useComprobanteState } from '../../hooks/useComprobanteState';
import { useComprobanteActions } from '../../hooks/useComprobanteActions';
import { useAvailableProducts } from '../../hooks/useAvailableProducts';
import { useCreditTermsConfigurator } from '../../hooks/useCreditTermsConfigurator';
import { useCurrency } from '../../shared/form-core/hooks/useCurrency';
import { useDocumentType } from '../../shared/form-core/hooks/useDocumentType';
import { validateComprobanteReadyForCobranza } from '../../shared/core/comprobanteValidation';
import type {
  CartItem,
  ClientData,
  PaymentCollectionMode,
  PaymentCollectionPayload,
  PaymentTotals,
} from '../../models/comprobante.types';
import type { CreditInstallmentDefinition } from '../../../../shared/payments/paymentTerms';
import { useCurrentCompanyId, useCurrentEstablishmentId } from '../../../../contexts/UserSessionContext';
import { useConfigurationContext } from '../../../configuracion-sistema/context/ConfigurationContext';
import { getBusinessTodayISODate } from '@/shared/time/businessTime';

interface UsePosComprobanteFlowParams {
  cartItems: CartItem[];
  totals: PaymentTotals;
}

export const usePosComprobanteFlow = ({ cartItems, totals }: UsePosComprobanteFlowParams) => {
  const navigate = useNavigate();
  const currentEstablishmentId = useCurrentEstablishmentId();
  const currentCompanyId = useCurrentCompanyId();
  useConfigurationContext();

  const { currentCurrency, currencyInfo } = useCurrency();
  const { tipoComprobante, setTipoComprobante, serieSeleccionada } = useDocumentType();

  const {
    formaPago,
    setFormaPago,
    isProcessing,
    setIsProcessing,
    isCajaOpen,
    cajaStatus,
    observaciones,
    setObservaciones,
    notaInterna,
    setNotaInterna,
    resetForm,
  } = useComprobanteState();

  const {
    createComprobante,
    toasts,
    removeToast,
    error,
    warning,
    paymentMethods,
  } = useComprobanteActions();

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastComprobante, setLastComprobante] = useState<{
    tipo: string;
    serie: string;
    numero: string;
    total: number;
    cliente?: string;
    vuelto?: number;
  } | null>(null);
  const [showCobranzaModal, setShowCobranzaModal] = useState(false);
  const [showCreditScheduleModal, setShowCreditScheduleModal] = useState(false);
  const [fechaEmision] = useState(() => getBusinessTodayISODate());
  const creditTemplatesBackupRef = useRef<CreditInstallmentDefinition[] | null>(null);

  const [clienteSeleccionado, setClienteSeleccionado] = useState<
    | {
        id: number;
        nombre: string;
        tipoDocumento: 'DNI' | 'RUC' | 'Sin documento';
        documento: string;
        direccion: string;
      }
    | null
  >(null);

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

  const availableProducts = useAvailableProducts({
    establecimientoId: currentEstablishmentId,
    soloConStock: false,
  });

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
    creditTemplatesBackupRef.current = creditTemplates.map((item) => ({ ...item }));
    setShowCreditScheduleModal(true);
  };

  const handleCancelCreditScheduleModal = () => {
    if (creditTemplatesBackupRef.current) {
      setCreditTemplates(creditTemplatesBackupRef.current.map((item) => ({ ...item })));
    }
    creditTemplatesBackupRef.current = null;
    setShowCreditScheduleModal(false);
  };

  const handleSaveCreditScheduleModal = () => {
    creditTemplatesBackupRef.current = null;
    setShowCreditScheduleModal(false);
  };

  const buildCobranzaValidationInput = useCallback(
    () => ({
      tipoComprobante,
      serieSeleccionada,
      cliente: clienteDraftData,
      formaPago,
      fechaEmision,
      moneda: currentCurrency,
      cartItems,
      totals,
    }),
    [cartItems, clienteDraftData, currentCurrency, fechaEmision, formaPago, serieSeleccionada, tipoComprobante, totals],
  );

  const ensureDataBeforeCobranza = useCallback(
    (toastTitle: string, paymentMode?: PaymentCollectionMode) => {
      const validation = validateComprobanteReadyForCobranza(buildCobranzaValidationInput(), {
        onError: (validationError) => warning(toastTitle, validationError.message),
        paymentMode,
      });
      return validation.isValid;
    },
    [buildCobranzaValidationInput, warning],
  );

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
        observaciones,
        notaInterna,
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
        registrarPago: Boolean(isRegisteringCobro && paymentPayload?.lines.length),
      });

      if (success) {
        const received = paymentPayload?.mode === 'contado'
          ? paymentPayload.lines.reduce((sum, line) => sum + line.amount, 0)
          : 0;

        setLastComprobante({
          tipo: tipoComprobante === 'factura' ? 'Factura' : tipoComprobante === 'boleta' ? 'Boleta' : 'Nota de Venta',
          serie: serieSeleccionada,
          numero: '001-00001',
          total: totals.total,
          cliente: clienteDraftData?.nombre || 'Cliente',
          vuelto: received > totals.total ? received - totals.total : 0,
        });

        setShowCobranzaModal(false);
        setShowSuccessModal(true);
      }

      return success;
    } finally {
      setIsProcessing(false);
    }
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

  const handleCobranzaComplete = async (payload: PaymentCollectionPayload) => {
    return handleCrearComprobante(payload);
  };

  const handlePrint = () => {
    console.log('Imprimiendo comprobante...', lastComprobante);
    window.print();
  };

  const handleNewSale = (clearCart: () => void) => {
    clearCart();
    resetForm();
    setShowSuccessModal(false);
  };

  return {
    navigate,
    currentCurrency,
    currencyInfo,
    tipoComprobante,
    setTipoComprobante,
    serieSeleccionada,
    formaPago,
    setFormaPago,
    observaciones,
    setObservaciones,
    notaInterna,
    setNotaInterna,
    isProcessing,
    isCajaOpen,
    cajaStatus,
    toasts,
    removeToast,
    paymentMethods,
    availableProducts,
    selectedPaymentMethod,
    isCreditMethod,
    creditTemplates,
    setCreditTemplates,
    creditTemplateErrors,
    creditTerms,
    restoreCreditTemplates,
    isCreditPaymentSelection,
    showSuccessModal,
    setShowSuccessModal,
    lastComprobante,
    showCobranzaModal,
    setShowCobranzaModal,
    showCreditScheduleModal,
    setShowCreditScheduleModal,
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
    warning,
  };
};

