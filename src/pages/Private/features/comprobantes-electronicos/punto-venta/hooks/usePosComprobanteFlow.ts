import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useComprobanteState } from '../../hooks/useComprobanteState';
import { useComprobanteActions } from '../../hooks/useComprobanteActions';
import { useAvailableProducts } from '../../hooks/useAvailableProducts';
import { useCreditTermsConfigurator } from '../../hooks/useCreditTermsConfigurator';
import { useCurrency } from '../../shared/form-core/hooks/useCurrency';
import { useDocumentType } from '../../shared/form-core/hooks/useDocumentType';
import { onlyDigits } from '../../../../features/gestion-clientes/utils/documents';
import { clientesClient } from '../../../../features/gestion-clientes/api';
import { useClientes } from '../../../../features/gestion-clientes/hooks/useClientes';
import { clienteToSaleSnapshot, type SaleDocumentType } from '../../../../features/gestion-clientes/utils/saleClienteMapping';
import { validateComprobanteReadyForCobranza } from '../../shared/core/comprobanteValidation';
import type {
  CartItem,
  ClientData,
  Currency,
  PaymentCollectionMode,
  PaymentCollectionPayload,
  PaymentTotals,
} from '../../models/comprobante.types';
import type { CreditInstallmentDefinition } from '../../../../../../shared/payments/paymentTerms';
import { useCurrentCompanyId, useCurrentEstablishmentId } from '../../../../../../contexts/UserSessionContext';
import { useConfigurationContext } from '../../../configuracion-sistema/context/ConfigurationContext';
import { getBusinessTodayISODate } from '../../../../../../shared/time/businessTime';

interface UsePosComprobanteFlowParams {
  cartItems: CartItem[];
  totals: PaymentTotals;
}

export const usePosComprobanteFlow = ({ cartItems, totals }: UsePosComprobanteFlowParams) => {
  const navigate = useNavigate();
  const currentEstablishmentId = useCurrentEstablishmentId();
  const currentCompanyId = useCurrentCompanyId();
  useConfigurationContext();

  const { currentCurrency, currencyInfo, baseCurrency, changeCurrency } = useCurrency();
  const { tipoComprobante, setTipoComprobante, serieSeleccionada } = useDocumentType();
  const { createCliente } = useClientes();

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

  const [clienteSeleccionadoState, setClienteSeleccionadoState] = useState<
    | {
        id?: number | string;
        nombre: string;
        tipoDocumento: SaleDocumentType;
        documento: string;
        direccion: string;
        email?: string;
        priceProfileId?: string;
      }
    | null
  >(null);

  const [lookupClient, setLookupClient] = useState<
    | {
        data: { nombre: string; documento: string; tipoDocumento: string; direccion?: string; email?: string };
        origen: 'RENIEC' | 'SUNAT';
      }
    | null
  >(null);

  const setClienteSeleccionado = useCallback(
    (cliente: typeof clienteSeleccionadoState) => {
      setClienteSeleccionadoState(cliente);
      if (!cliente || (cliente.id !== undefined && cliente.id !== null)) {
        setLookupClient(null);
      }
    },
    [],
  );

  const clienteDraftData: ClientData | undefined = useMemo(() => {
    const clienteSeleccionado = clienteSeleccionadoState;
    if (!clienteSeleccionado) return undefined;

    const tipoDocumento: ClientData['tipoDocumento'] = clienteSeleccionado.tipoDocumento === 'RUC' ? 'ruc' : 'dni';
    const documentoNormalizado =
      clienteSeleccionado.tipoDocumento === 'RUC' || clienteSeleccionado.tipoDocumento === 'DNI'
        ? onlyDigits(clienteSeleccionado.documento)
        : clienteSeleccionado.documento;
    return {
      nombre: clienteSeleccionado.nombre,
      tipoDocumento,
      documento: documentoNormalizado,
      direccion: clienteSeleccionado.direccion,
      email: clienteSeleccionado.email,
    };
  }, [clienteSeleccionadoState]);

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
      warning('Caja cerrada', 'Abre una caja para registrar el cobro o cambia la venta a crédito.');
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
      error('Caja cerrada', 'Abre una caja para registrar pagos al contado o cambia la venta a crédito.');
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
        if (lookupClient && !(clienteSeleccionadoState?.id !== undefined && clienteSeleccionadoState?.id !== null)) {
          const rawTipo = (lookupClient.data.tipoDocumento || '').toString().trim().toUpperCase();
          const documentType = rawTipo === 'RUC' ? 'RUC' : 'DNI';
          const documentNumber = onlyDigits(lookupClient.data.documento || '');

          if (documentNumber) {
            const searchResponse = await clientesClient.getClientes({ search: documentNumber, limit: 25, page: 1 });
            const existing = searchResponse.data.find((candidate) => {
              const snap = clienteToSaleSnapshot(candidate);
              return (snap.tipoDocumento === 'RUC' || snap.tipoDocumento === 'DNI') && snap.dni === documentNumber;
            });

            if (existing) {
              const snap = clienteToSaleSnapshot(existing);
              setClienteSeleccionado({
                id: snap.clienteId,
                nombre: snap.nombre,
                tipoDocumento: snap.tipoDocumento,
                documento: snap.dni,
                direccion: snap.direccion,
                email: snap.email,
                priceProfileId: snap.priceProfileId,
              });
            } else {
              const created = await createCliente({
                documentType,
                documentNumber,
                name: lookupClient.data.nombre,
                type: 'Cliente',
                address: lookupClient.data.direccion,
                email: lookupClient.data.email,
                tipoDocumento: documentType,
                numeroDocumento: documentNumber,
                // Si es RUC, asegurar razonSocial consistente con name
                razonSocial: documentType === 'RUC' ? lookupClient.data.nombre : undefined,
                direccion: lookupClient.data.direccion,
                tipoCuenta: 'Cliente',
              });

              if (created) {
                const snap = clienteToSaleSnapshot(created);
                setClienteSeleccionado({
                  id: snap.clienteId,
                  nombre: snap.nombre,
                  tipoDocumento: snap.tipoDocumento,
                  documento: snap.dni,
                  direccion: snap.direccion,
                  email: snap.email,
                  priceProfileId: snap.priceProfileId,
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

  const handleEmitirCredito = async () => {
    if (!isCreditPaymentSelection) {
      warning('Forma de pago incompatible', 'Selecciona una forma de pago configurada como crédito para postergar el cobro.');
      return false;
    }
    if (!ensureDataBeforeCobranza('Faltan datos para emitir a crédito', 'credito')) {
      return false;
    }
    if (!validateCreditSchedule()) {
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
    if (currentCurrency !== baseCurrency.code) {
      changeCurrency(baseCurrency.code as Currency);
    }
    setClienteSeleccionado(null);
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
    clienteSeleccionado: clienteSeleccionadoState,
    setClienteSeleccionado,
    onLookupClientSelected: setLookupClient,
    clienteDraftData,
    handleOpenCreditScheduleModal,
    handleCancelCreditScheduleModal,
    handleSaveCreditScheduleModal,
    handleConfirmSale,
    handleEmitirCredito,
    handleCobranzaComplete,
    handlePrint,
    handleNewSale,
    warning,
  };
};

