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
import {
  type CargaReutilizacionDocumentoComercial,
  esCargaReutilizacionDocumentoComercial,
} from '../models/instantaneaDocumentoComercial';

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
import { derivarEntornoAnaliticoEmpresa } from '@/shared/empresas/entornoEmpresa';
import { ErrorBoundary } from '../shared/ui/ErrorBoundary';
import { SuccessModal } from '../shared/modales/SuccessModal';
import { PostIssueOptionsModal } from '../shared/modales/PostIssueOptionsModal';
import { PreviewDocument } from '../shared/ui/PreviewDocument';

import { useLocation, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getBusinessTodayISODate } from '@/shared/time/businessTime';
import { useCurrentEstablecimientoId, useUserSession } from '../../../../../contexts/UserSessionContext';
import { useConfigurationContext } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import { buildCompanyData } from '@/shared/company/companyDataAdapter';
import type {
  ClientData,
  DraftAction,
  PaymentCollectionMode,
  PaymentCollectionPayload,
  ContextoOrigenNotaCredito,
  Currency,
  PreviewData,
  PaymentTotals,
  DiscountInput,
  DiscountMode,
  CartItem,
  TipoComprobante,
  DatosNotaCredito,
  TipoComprobanteBase,
} from '../models/comprobante.types';
import { useClientes } from '../../gestion-clientes/hooks/useClientes';
import { clientesClient } from '../../gestion-clientes/api';
import {
  buildCreateClientePayloadFromLookup,
  clienteToSaleSnapshot,
  isExactDocumentoMatch,
  type SaleDocumentType,
} from '../../gestion-clientes/utils/saleClienteMapping';
import { onlyDigits } from '../../gestion-clientes/utils/documents';
import { useProductStore } from '../../catalogo-articulos/hooks/useProductStore';
import type { Product as CatalogProduct } from '../../catalogo-articulos/models/types';
import {
  resolveBoletaClienteRequirement,
  validateComprobanteNormativa,
  validateComprobanteReadyForCobranza,
} from '../shared/core/comprobanteValidation';
import { CobranzaModal } from '../shared/modales/CobranzaModal';
import { useCreditTermsConfigurator } from '../hooks/useCreditTermsConfigurator';
import { CreditScheduleSummaryCard } from '../shared/payments/CreditScheduleSummaryCard';
import { CreditScheduleModal } from '../shared/payments/CreditScheduleModal';
import type { CreditInstallment, CreditInstallmentDefinition } from '../../../../../shared/payments/paymentTerms';
import { calculateCurrencyAwareTotals } from '../shared/core/currencyTotals';
import { BloqueoCajaCerrada } from '../shared/ui/BloqueoCajaCerrada';
import { useRetornoAperturaCaja } from '@/shared/caja/useRetornoAperturaCaja';
import { AccesoGuiaContextual } from '@/shared/tour';
import { tourPrimeraVenta } from '../tour/tourPrimeraVenta';
import { FORMA_PAGO_CREDITO_MANUAL, obtenerEtiquetaTipoComprobante } from '../models/constants';
import {
  crearClaveBorradorEnProgreso,
} from '@/shared/borradores/almacenamientoBorradorEnProgreso';
import { useBorradorEnProgreso } from '@/shared/borradores/useBorradorEnProgreso';
import {
  construirCreditTermsManual,
  normalizarCuotasManual,
  sumarImportes,
  validarFechasManual,
} from '../shared/payments/creditoManualTransaccion';
import {
  registrarFlujoVentaAbandonado,
  registrarPrimeraVentaCompletada,
  registrarVentaCompletada,
} from '@/shared/analitica/analitica';
import type { MotivoAbandonoVenta } from '@/shared/analitica/eventosAnalitica';

const cloneCreditTemplates = (items: CreditInstallmentDefinition[]): CreditInstallmentDefinition[] =>
  items.map((item) => ({ ...item }));

const CREDIT_SCHEDULE_TOLERANCE = 0.01;
const TOLERANCIA_CREDITO_MANUAL = 0.01;
const LLAVE_PRIMERA_VENTA_COMPLETADA_SESION_BASE = 'analitica_primera_venta_completada';

type ClienteSeleccionadoEmision = {
  clienteId?: number | string;
  nombre: string;
  dni: string;
  direccion: string;
  email?: string;
  tipoDocumento?: SaleDocumentType;
  priceProfileId?: string;
} | null;

type EstadoBorradorEmisionTradicional = {
  tipoComprobante: TipoComprobante;
  serieSeleccionada: string;
  modoProductos: 'catalogo' | 'libre';
  fechaEmision: string;
  clienteSeleccionadoGlobal: ClienteSeleccionadoEmision;
  formaPago: string;
  moneda: Currency;
  observaciones: string;
  notaInterna: string;
  optionalFields: Record<string, unknown>;
  appliedGlobalDiscount: DiscountInput | null;
  creditTemplates: CreditInstallmentDefinition[];
  cuotasManual: CreditInstallment[];
  creditoManualConfirmado: boolean;
  cartItems: CartItem[];
};

type EstadoBorradorEmisionDefaults = {
  tipoComprobante: TipoComprobante;
  serieSeleccionada: string;
  fechaEmision: string;
  formaPago: string;
  moneda: Currency;
};


const EmisionTradicional = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const abrirCajaButtonRef = useRef<HTMLButtonElement>(null);
  const { iniciarAperturaCaja } = useRetornoAperturaCaja();

  const noteCreditState = useMemo(() => {
    const state = location.state as any;
    const candidate = state?.noteCredit;
    return esCargaReutilizacionDocumentoComercial(candidate)
      ? (candidate as CargaReutilizacionDocumentoComercial)
      : undefined;
  }, [location.state]);
  const isNoteCreditFlow = Boolean(noteCreditState);

  /**
   * Contexto del documento origen para validaciones normativas de NC.
   * Se extrae del state de navegación; undefined en flujos que no son NC.
   */
  const contextoOrigenNC = useMemo<ContextoOrigenNotaCredito | null>(
    () => noteCreditState?.contextoOrigen ?? null,
    [noteCreditState],
  );

  const noteCreditTipoOrigen = useMemo<TipoComprobanteBase | null>(() => {
    const tipoRelacionado = noteCreditState?.datosNotaCredito?.documentoRelacionado?.tipoComprobanteOrigen;
    if (tipoRelacionado === 'factura' || tipoRelacionado === 'boleta') {
      return tipoRelacionado;
    }

    const tipoOrigen = String(noteCreditState?.instantaneaDocumentoComercial.identidad.tipoComprobante ?? '').toLowerCase();
    if (tipoOrigen.includes('boleta')) {
      return 'boleta';
    }
    if (tipoOrigen.includes('factura')) {
      return 'factura';
    }
    return null;
  }, [noteCreditState]);

  const isDuplicateFlow = useMemo(() => {
    const state = location.state as any;
    return Boolean(state?.duplicate || (state?.fromConversion === true && state?.conversionData));
  }, [location.state]);

  const tipoFromQuery = useMemo<TipoComprobante | null>(() => {
    const tipo = new URLSearchParams(location.search).get('tipo');
    if (tipo === 'factura' || tipo === 'boleta') {
      return tipo;
    }
    return null;
  }, [location.search]);

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
  const llavePrimeraVentaCompletadaSesion = useMemo(
    () => [
      LLAVE_PRIMERA_VENTA_COMPLETADA_SESION_BASE,
      session?.currentCompanyId ?? 'sin_empresa',
      currentEstablecimientoId || 'sin_establecimiento',
      'emision',
    ].join(':'),
    [currentEstablecimientoId, session?.currentCompanyId],
  );
  const entornoAnalitica = derivarEntornoAnaliticoEmpresa(session?.currentCompany) ?? 'demo';
  const {
    cartItems,
    removeFromCart,
    updateCartItem,
    addProductsFromSelector,
    clearCart,
    setCartItemsFromDraft,
    agregarItemLibre,
    actualizarItemCarrito,
    eliminarItemCarrito,
  } = useCart();
  const [modoProductos, setModoProductos] = useState<'catalogo' | 'libre'>('catalogo');
  const itemsCatalogo = useMemo(
    () => cartItems.filter((item) => item.tipoDetalle !== 'libre'),
    [cartItems],
  );
  const itemsLibres = useMemo(
    () => cartItems.filter((item) => item.tipoDetalle === 'libre'),
    [cartItems],
  );
  const itemsActivos = useMemo(
    () => (modoProductos === 'libre' ? itemsLibres : itemsCatalogo),
    [itemsCatalogo, itemsLibres, modoProductos],
  );
  const cartItemsForDocument = useMemo(
    () => (isNoteCreditFlow ? cartItems : itemsActivos),
    [cartItems, isNoteCreditFlow, itemsActivos],
  );
  const hasDocumentItems = cartItemsForDocument.length > 0;
  const {
    currentCurrency,
    currencyInfo,
    changeCurrency,
    availableCurrencies,
    baseCurrency,
    documentCurrency,
    convertPrice,
  } = useCurrency();
  const abandonoVentaRegistradoRef = useRef(false);
  const ventaActualCompletadaRef = useRef(false);
  const salidaControladaRef = useRef(false);
  const handleDraftSavedSuccessfully = useCallback((action: DraftAction) => {
    abandonoVentaRegistradoRef.current = false;
    ventaActualCompletadaRef.current = false;
    salidaControladaRef.current = action !== 'continuar';
  }, []);
  const { showDraftModal, setShowDraftModal, showDraftToast, setShowDraftToast, handleDraftModalSave, draftAction, setDraftAction, draftExpiryDate, setDraftExpiryDate } = useDrafts({
    onDraftSavedSuccessfully: handleDraftSavedSuccessfully,
  });
  const { tipoComprobante, setTipoComprobante: setTipoComprobanteCore, serieSeleccionada, setSerieSeleccionada, seriesFiltradas } = useDocumentType({
    forcedTipoComprobante: isNoteCreditFlow ? 'nota_credito' : null,
    notaCreditoTipoOrigen: noteCreditTipoOrigen,
  });

  const tipoFromQueryAppliedRef = useRef(false);
  const [tipoFromQueryResolved, setTipoFromQueryResolved] = useState(false);
  useEffect(() => {
    // Prioridad: Duplicación > ?tipo=... > Borrador/Defaults; se aplica 1 vez para evitar loops.
    if (tipoFromQueryResolved) return;
    if (isDuplicateFlow) {
      setTipoFromQueryResolved(true);
      return;
    }
    if (!tipoFromQuery) {
      setTipoFromQueryResolved(true);
      return;
    }
    if (tipoFromQueryAppliedRef.current) {
      setTipoFromQueryResolved(true);
      return;
    }

    // Solo forzar si es distinto (setTipoComprobante también resetea la serie).
    if (tipoComprobante !== tipoFromQuery) {
      setTipoComprobanteCore(tipoFromQuery);
    }
    tipoFromQueryAppliedRef.current = true;
    setTipoFromQueryResolved(true);
  }, [isDuplicateFlow, setTipoComprobanteCore, tipoComprobante, tipoFromQuery, tipoFromQueryResolved]);

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
  const [clienteSeleccionadoGlobal, setClienteSeleccionadoGlobal] = useState<ClienteSeleccionadoEmision>(null);
  const [fechaEmision, setFechaEmision] = useState<string>(getBusinessTodayISODate());
  const [optionalFields, setOptionalFields] = useState<Record<string, any>>({});
  const [cuotasManual, setCuotasManual] = useState<CreditInstallment[]>([]);
  const [creditoManualConfirmado, setCreditoManualConfirmado] = useState(false);
  const [datosNotaCredito, setDatosNotaCredito] = useState<DatosNotaCredito | null>(noteCreditState?.datosNotaCredito ?? null);

  useEffect(() => {
    if (!noteCreditState?.datosNotaCredito) {
      return;
    }

    setDatosNotaCredito(noteCreditState.datosNotaCredito);
  }, [noteCreditState]);

  // Inicializar y bloquear la moneda desde el documento origen en flujo NC.
  // Ref para ejecutar solo una vez por instancia del formulario.
  const monedaOrigenInicializada = useRef(false);
  useEffect(() => {
    if (!isNoteCreditFlow || monedaOrigenInicializada.current) return;
    const monedaOrigen = contextoOrigenNC?.monedaOrigen;
    if (monedaOrigen) {
      changeCurrency(monedaOrigen);
      monedaOrigenInicializada.current = true;
    }
  }, [isNoteCreditFlow, contextoOrigenNC, changeCurrency]);

  const clienteSeleccionadoGlobalRef = useRef<ClienteSeleccionadoEmision>(null);
  useEffect(() => {
    clienteSeleccionadoGlobalRef.current = clienteSeleccionadoGlobal;
  }, [clienteSeleccionadoGlobal]);

  const setTipoComprobanteFromUI = useCallback((nextTipo: TipoComprobante) => {
    if (nextTipo === tipoComprobante) {
      return;
    }

    setTipoComprobanteCore(nextTipo);

    const cliente = clienteSeleccionadoGlobalRef.current;
    if (!cliente) {
      return;
    }

    const tipoDoc = String(cliente.tipoDocumento ?? '').trim().toUpperCase();
    const numeroDoc = onlyDigits(cliente.dni ?? '');
    const esRuc = tipoDoc === 'RUC' || numeroDoc.length === 11;
    const esCompatible = nextTipo === 'factura' ? esRuc : !esRuc;

    if (esCompatible) {
      return;
    }

    setClienteSeleccionadoGlobal(null);
    setOptionalFields((prev) => {
      const next = { ...prev };
      if (typeof next.direccion === 'string' && next.direccion === cliente.direccion) {
        delete next.direccion;
      }
      if (typeof next.correo === 'string' && next.correo === cliente.email) {
        delete next.correo;
      }
      return next;
    });

    error(
      'Cliente incompatible',
      nextTipo === 'factura'
        ? 'Para Factura selecciona un cliente con RUC.'
        : 'Para Boleta selecciona un cliente con DNI o Sin documento.',
    );
  }, [error, setTipoComprobanteCore, tipoComprobante]);

  // ✅ Hook para cargar datos de duplicación (refactorizado)
  useDuplicateDataLoader({
    setClienteSeleccionadoGlobal,
    addProductsFromSelector,
    setCartItemsFromDraft,
    setModoProductos,
    setObservaciones,
    setNotaInterna,
    setFormaPago,
    changeCurrency,
    setTipoComprobante: setTipoComprobanteCore,
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
        items: itemsActivos,
        catalogLookup,
        baseCurrencyCode: baseCurrency.code,
        documentCurrencyCode: documentCurrency.code,
        convert: convertPrice,
      }),
    [baseCurrency.code, itemsActivos, catalogLookup, convertPrice, documentCurrency.code],
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

  const esCreditoManual = formaPago === FORMA_PAGO_CREDITO_MANUAL;

  const cuotasManualNormalizadas = useMemo(
    () => normalizarCuotasManual(cuotasManual, totals.total, fechaEmision),
    [cuotasManual, fechaEmision, totals.total],
  );

  const totalCuotasManual = useMemo(
    () => sumarImportes(cuotasManualNormalizadas),
    [cuotasManualNormalizadas],
  );

  const faltaManualCruda = totals.total - totalCuotasManual;
  const faltaManual = Math.max(0, faltaManualCruda);
  const fechasManualValidas = useMemo(
    () => validarFechasManual(cuotasManualNormalizadas, fechaEmision),
    [cuotasManualNormalizadas, fechaEmision],
  );
  const importesManualCompletos = useMemo(
    () => cuotasManualNormalizadas.every((cuota) => Number.isFinite(cuota.importe) && cuota.importe > 0),
    [cuotasManualNormalizadas],
  );

  const puedeConfirmarManual = cuotasManualNormalizadas.length > 0
    && Math.abs(faltaManualCruda) <= TOLERANCIA_CREDITO_MANUAL
    && fechasManualValidas
    && importesManualCompletos
    && totals.total > 0;

  const creditTermsManual = useMemo(
    () => construirCreditTermsManual(cuotasManualNormalizadas, totals.total, fechaEmision),
    [cuotasManualNormalizadas, fechaEmision, totals.total],
  );

  const creditTermsForView = esCreditoManual ? creditTermsManual : creditTerms;
  const creditTermsForSubmit = esCreditoManual
    ? (creditoManualConfirmado ? creditTermsManual : undefined)
    : creditTerms;

  const shouldShowCreditSchedule = (isCreditMethod && totals.total > CREDIT_SCHEDULE_TOLERANCE)
    || (esCreditoManual && totals.total > 0);

  const establecimientoIdBorrador = currentEstablecimientoId
    ?? session?.currentEstablecimientoId
    ?? null;

  const borradorHabilitado = Boolean(
    session?.currentCompanyId &&
    establecimientoIdBorrador &&
    // Evita restaurar/guardar mientras se resuelve el tipo inicial desde query param.
    tipoFromQueryResolved &&
    // Duplicación/conversión no debe restaurar ni sobreescribir el borrador en progreso.
    !isDuplicateFlow &&
    // Nota de Crédito carga sus datos desde location.state; el borrador contaminaría la carga.
    !isNoteCreditFlow,
  );

  const borradorDefaultsRef = useRef<EstadoBorradorEmisionDefaults | null>(null);
  if (!borradorDefaultsRef.current && tipoFromQueryResolved && !isDuplicateFlow && !isNoteCreditFlow) {
    borradorDefaultsRef.current = {
      tipoComprobante,
      serieSeleccionada,
      fechaEmision,
      formaPago,
      moneda: currentCurrency,
    };
  }

  const claveBorradorEnProgreso = useMemo(() => crearClaveBorradorEnProgreso({
    app: 'facturafacil',
    tenantId: session?.currentCompanyId ?? null,
    establecimientoId: establecimientoIdBorrador,
    tipoDocumento: 'comprobante_emision_tradicional',
    modo: tipoComprobante,
  }), [establecimientoIdBorrador, session?.currentCompanyId, tipoComprobante]);

  const {
    limpiar: limpiarBorradorEnProgreso,
    forzarGuardado: forzarGuardadoBorrador,
  } = useBorradorEnProgreso<EstadoBorradorEmisionTradicional, EstadoBorradorEmisionTradicional>({
    habilitado: borradorHabilitado,
    clave: claveBorradorEnProgreso,
    version: 1,
    ttlDias: 7,
    debounceMs: 400,
    limpiarSiNoDebePersistir: false,
    extraerEstado: () => ({
      tipoComprobante,
      serieSeleccionada,
      modoProductos,
      fechaEmision,
      clienteSeleccionadoGlobal,
      formaPago,
      moneda: currentCurrency,
      observaciones,
      notaInterna,
      optionalFields: optionalFields as Record<string, unknown>,
      appliedGlobalDiscount,
      creditTemplates,
      cuotasManual,
      creditoManualConfirmado,
      cartItems,
    }),
    convertirAStorage: (estado) => estado,
    aplicarDesdeStorage: (borrador) => {
      const permitirTipoDesdeBorrador = !isDuplicateFlow && !tipoFromQuery;
      if (borrador.tipoComprobante && permitirTipoDesdeBorrador) {
        setTipoComprobanteCore(borrador.tipoComprobante);
      }
      if (borrador.serieSeleccionada) {
        setSerieSeleccionada(borrador.serieSeleccionada);
      }
      if (borrador.fechaEmision) {
        setFechaEmision(borrador.fechaEmision);
      }
      if (borrador.formaPago) {
        setFormaPago(borrador.formaPago);
      }
      if (borrador.moneda) {
        changeCurrency(borrador.moneda);
      }
      setClienteSeleccionadoGlobal(borrador.clienteSeleccionadoGlobal ?? null);
      setObservaciones(borrador.observaciones ?? '');
      setNotaInterna(borrador.notaInterna ?? '');
      setOptionalFields((borrador.optionalFields ?? {}) as Record<string, unknown>);
      setAppliedGlobalDiscount(borrador.appliedGlobalDiscount ?? null);
      const templatesToRestore = borrador.creditTemplates ?? [];
      // Restaurar templates después de que el hook de crédito procese el cambio de forma de pago.
      queueMicrotask(() => setCreditTemplates(templatesToRestore));
      setCuotasManual(borrador.cuotasManual ?? []);
      setCreditoManualConfirmado(Boolean(borrador.creditoManualConfirmado));
      setModoProductos(borrador.modoProductos === 'libre' ? 'libre' : 'catalogo');
      if (Array.isArray(borrador.cartItems)) {
        setCartItemsFromDraft(borrador.cartItems);
      }
    },
    debePersistir: (estado) => {
      const defaults = borradorDefaultsRef.current;

      const tieneOptionalFieldsReales = Object.values(estado.optionalFields || {}).some((value) => {
        if (typeof value === 'string') return value.trim().length > 0;
        if (typeof value === 'number') return Number.isFinite(value) && value !== 0;
        if (typeof value === 'boolean') return value;
        return value !== null && value !== undefined;
      });

      const tieneDatosReales = Boolean(
        estado.cartItems.length > 0 ||
        estado.clienteSeleccionadoGlobal ||
        estado.observaciones.trim() ||
        estado.notaInterna.trim() ||
        tieneOptionalFieldsReales ||
        estado.appliedGlobalDiscount ||
        estado.creditTemplates.length > 0 ||
        estado.cuotasManual.length > 0 ||
        estado.creditoManualConfirmado
      );

      const cambioEnDefaults = Boolean(defaults && (
        estado.tipoComprobante !== defaults.tipoComprobante ||
        estado.serieSeleccionada !== defaults.serieSeleccionada ||
        estado.fechaEmision !== defaults.fechaEmision ||
        estado.formaPago !== defaults.formaPago ||
        estado.moneda !== defaults.moneda
      ));

      return tieneDatosReales || cambioEnDefaults;
    },
  });

  const handleAbrirCaja = useCallback(() => {
    forzarGuardadoBorrador();
    iniciarAperturaCaja();
  }, [forzarGuardadoBorrador, iniciarAperturaCaja]);

  const tieneOptionalFieldsReales = useMemo(() => {
    return Object.values(optionalFields || {}).some((value) => {
      if (typeof value === 'string') return value.trim().length > 0;
      if (typeof value === 'number') return Number.isFinite(value) && value !== 0;
      if (typeof value === 'boolean') return value;
      return value !== null && value !== undefined;
    });
  }, [optionalFields]);

  const tieneActividadFlujoVenta = useMemo(() => {
    const defaults = borradorDefaultsRef.current;
    const cambioEnDefaults = Boolean(defaults && (
      tipoComprobante !== defaults.tipoComprobante ||
      serieSeleccionada !== defaults.serieSeleccionada ||
      fechaEmision !== defaults.fechaEmision ||
      formaPago !== defaults.formaPago ||
      currentCurrency !== defaults.moneda
    ));

    return Boolean(
      hasDocumentItems ||
      clienteSeleccionadoGlobal ||
      observaciones.trim() ||
      notaInterna.trim() ||
      tieneOptionalFieldsReales ||
      appliedGlobalDiscount ||
      creditTemplates.length > 0 ||
      cuotasManual.length > 0 ||
      creditoManualConfirmado ||
      cambioEnDefaults
    );
  }, [
    appliedGlobalDiscount,
    creditTemplates.length,
    creditoManualConfirmado,
    currentCurrency,
    cuotasManual.length,
    clienteSeleccionadoGlobal,
    fechaEmision,
    formaPago,
    hasDocumentItems,
    notaInterna,
    observaciones,
    serieSeleccionada,
    tieneOptionalFieldsReales,
    tipoComprobante,
  ]);

  const registrarAbandonoVentaSiCorresponde = useCallback((motivoAbandono: MotivoAbandonoVenta) => {
    if (
      abandonoVentaRegistradoRef.current
      || ventaActualCompletadaRef.current
      || salidaControladaRef.current
      || !tieneActividadFlujoVenta
    ) {
      return;
    }

    abandonoVentaRegistradoRef.current = true;
    registrarFlujoVentaAbandonado({
      origenVenta: 'emision',
      motivoAbandono,
    });
  }, [tieneActividadFlujoVenta]);

  useEffect(() => {
    return () => {
      registrarAbandonoVentaSiCorresponde('navegacion_fuera');
    };
  }, [registrarAbandonoVentaSiCorresponde]);

  // Resumen: snapshot de defaults en el primer render; persistencia solo con cambios reales o datos; habilitación por tenant+establecimiento.


  // ✅ View model para side preview
  const sidePreviewViewModel = ENABLE_SIDE_PREVIEW_EMISION ? {
    tipoComprobante,
    serieSeleccionada,
    cartItems: isNoteCreditFlow ? cartItems : itemsActivos,
    totals,
    observaciones,
    notaInterna,
    formaPago,
    currency: currentCurrency,
    client: clienteSeleccionadoGlobal?.nombre,
    clientDoc: clienteSeleccionadoGlobal?.dni,
    clientDocType: clienteSeleccionadoGlobal?.tipoDocumento,
    fechaEmision,
    optionalFields,
    creditTerms: creditTermsForSubmit,
    noteCreditData: datosNotaCredito,
  } : null;

  const hasMinimumDataForPreview = ENABLE_SIDE_PREVIEW_EMISION &&
    clienteSeleccionadoGlobal !== null &&
    serieSeleccionada !== '' &&
    hasDocumentItems;

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
      tipoDocumentoCodigo: rawType,
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
    notaCredito: datosNotaCredito,
    cartItems: cartItemsForDocument,
    totals,
    contextoOrigenNC: isNoteCreditFlow ? contextoOrigenNC : null,
  }), [cartItemsForDocument, contextoOrigenNC, currentCurrency, datosNotaCredito, draftClientData, fechaEmision, formaPago, isNoteCreditFlow, serieSeleccionada, tipoComprobante, totals]);

  const noteCreditRequiredFieldsPending = useMemo(() => {
    if (!isNoteCreditFlow) {
      return false;
    }

    return validateComprobanteNormativa(buildCobranzaValidationInput()).errors.some(
      (validationError) => validationError.field === 'codigoNotaCredito' || validationError.field === 'motivoNotaCredito',
    );
  }, [buildCobranzaValidationInput, isNoteCreditFlow]);

  const ensureClienteGeneralParaBoleta = useCallback(async (): Promise<boolean> => {
    const requirement = resolveBoletaClienteRequirement(buildCobranzaValidationInput());

    if (!requirement.allowsMissingClient || clienteSeleccionadoGlobal) {
      return true;
    }

    const clienteGeneral = await clientesClient.getClienteGeneral();
    if (!clienteGeneral) {
      error('Cliente requerido', 'No se encontró el Cliente General para continuar con la boleta.');
      return false;
    }

    const snap = clienteToSaleSnapshot(clienteGeneral);
    setClienteSeleccionadoGlobal({
      clienteId: snap.clienteId,
      nombre: snap.nombre,
      dni: snap.dni,
      direccion: snap.direccion,
      email: snap.email,
      tipoDocumento: snap.tipoDocumento,
      priceProfileId: snap.priceProfileId,
    });

    return true;
  }, [buildCobranzaValidationInput, clienteSeleccionadoGlobal, error, setClienteSeleccionadoGlobal]);

  useEffect(() => {
    if (!isCreditMethod && showCreditScheduleModal) {
      setShowCreditScheduleModal(false);
      creditTemplatesBackupRef.current = null;
    }
  }, [isCreditMethod, showCreditScheduleModal]);

  useEffect(() => {
    if (!esCreditoManual) {
      setCuotasManual([]);
      setCreditoManualConfirmado(false);
    }
  }, [esCreditoManual]);

  useEffect(() => {
    if (!esCreditoManual) {
      return;
    }
    if (creditoManualConfirmado && !puedeConfirmarManual) {
      setCreditoManualConfirmado(false);
    }
  }, [esCreditoManual, creditoManualConfirmado, puedeConfirmarManual]);

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

  const handleCambiarCuotasManual = useCallback((next: CreditInstallment[]) => {
    setCuotasManual(normalizarCuotasManual(next, totals.total, fechaEmision));
    setCreditoManualConfirmado(false);
  }, [fechaEmision, totals.total]);

  const handleAgregarCuotaManual = useCallback(() => {
    setCuotasManual((prev) => {
      const normalizadas = normalizarCuotasManual(prev, totals.total, fechaEmision);
      return [
        ...normalizadas,
        {
          numeroCuota: normalizadas.length + 1,
          diasCredito: 0,
          porcentaje: 0,
          fechaVencimiento: '',
          importe: Number.NaN,
          pagado: 0,
          saldo: 0,
          estado: 'pendiente',
          pagos: [],
        },
      ];
    });
    setCreditoManualConfirmado(false);
  }, [fechaEmision, totals.total]);

  const handleEliminarCuotaManual = useCallback((numeroCuota: number) => {
    setCuotasManual((prev) => {
      const filtradas = prev.filter((_, index) => index !== numeroCuota - 1);
      return normalizarCuotasManual(filtradas, totals.total, fechaEmision);
    });
    setCreditoManualConfirmado(false);
  }, [fechaEmision, totals.total]);

  const handleConfirmarCreditoManual = useCallback(() => {
    if (puedeConfirmarManual) {
      setCreditoManualConfirmado(true);
    }
  }, [puedeConfirmarManual]);

  const handleEditarCreditoManual = useCallback(() => {
    setCreditoManualConfirmado(false);
  }, []);


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
  const isCreditPaymentSelection = !isNoteCreditFlow && (esCreditoManual || paymentMethodCode === 'CREDITO');
  const creditDueDateForForm = isCreditPaymentSelection
    ? (creditTermsForSubmit?.fechaVencimientoGlobal ?? optionalFields?.fechaVencimiento ?? '')
    : '';

  useEffect(() => {
    if (!showSuccessModal) {
      return;
    }

    registrarVentaCompletada({
      entorno: entornoAnalitica,
      origenVenta: 'emision',
      formaPago: isCreditPaymentSelection ? 'credito' : 'contado',
    });

    if (typeof window === 'undefined') {
      return;
    }

    if (window.sessionStorage.getItem(llavePrimeraVentaCompletadaSesion) === '1') {
      return;
    }

    registrarPrimeraVentaCompletada({
      entorno: entornoAnalitica,
      origenVenta: 'emision',
      formaPago: isCreditPaymentSelection ? 'credito' : 'contado',
    });
    window.sessionStorage.setItem(llavePrimeraVentaCompletadaSesion, '1');
  }, [entornoAnalitica, isCreditPaymentSelection, llavePrimeraVentaCompletadaSesion, showSuccessModal]);

  const issueButtonLabel = useMemo(() => {
    if (tipoComprobante === 'nota_credito') {
      return 'EMITIR NOTA DE CRÉDITO';
    }

    if (!isCreditPaymentSelection) {
      return 'IR A COBRANZA';
    }

    switch (tipoComprobante) {
      case 'factura':
        return 'EMITIR FACTURA';
      case 'boleta':
        return 'EMITIR BOLETA';
      default:
        return 'EMITIR DOCUMENTO';
    }
  }, [isCreditPaymentSelection, tipoComprobante]);

  const paymentMethodLabel = esCreditoManual ? 'CRÉDITO' : getPaymentMethodLabel(formaPago);

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
      dueDate: creditTermsForSubmit?.fechaVencimientoGlobal ?? optionalFields?.fechaVencimiento,
      currency: currentCurrency,
      paymentMethod: paymentMethodLabel || 'CONTADO',
      cartItems: cartItemsForDocument,
      totals: totalsWithCurrency,
      observations: observaciones,
      internalNotes: notaInterna,
      creditTerms: creditTermsForSubmit,
      notaCredito: datosNotaCredito ?? undefined,
    };
  }, [
    creditTermsForSubmit,
    currentCurrency,
    datosNotaCredito,
    draftClientData,
    fechaEmision,
    lastComprobante,
    notaInterna,
    observaciones,
    optionalFields,
    paymentMethodLabel,
    serieSeleccionada,
    tipoComprobante,
    cartItemsForDocument,
    totals,
    configState.company,
  ]);

  const validarCreditoManual = () => {
    if (!cuotasManualNormalizadas.length) {
      error('Cronograma no definido', 'Agrega al menos una cuota para este crédito.');
      return false;
    }
    if (!fechasManualValidas) {
      error('Fechas inválidas', 'La primera cuota debe ser posterior a la fecha de emisión y todas deben tener fecha válida.');
      return false;
    }
    if (!creditoManualConfirmado || !puedeConfirmarManual) {
      error('Cronograma incompleto', 'Confirma las cuotas para continuar con el crédito.');
      return false;
    }
    return true;
  };

  const ensureDataBeforeCobranza = async (paymentMode?: PaymentCollectionMode) => {
    const ensuredCliente = await ensureClienteGeneralParaBoleta();
    if (!ensuredCliente) {
      return false;
    }

    const validation = validateComprobanteReadyForCobranza(buildCobranzaValidationInput(), {
      onError: (validationError) => error('Faltan datos para continuar', validationError.message),
      paymentMode,
    });

    return validation.isValid;
  };

  const handleOpenCobranzaModal = async () => {
    const paymentModeForValidation: PaymentCollectionMode | undefined = isCreditPaymentSelection ? 'credito' : undefined;
    if (!await ensureDataBeforeCobranza(paymentModeForValidation)) {
      return;
    }

    if (isCreditPaymentSelection) {
      if (esCreditoManual) {
        if (!validarCreditoManual()) {
          return;
        }
      } else {
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
    }

    if (!isCajaOpen) {
      error('Caja cerrada', 'Abre una caja para registrar cobranzas al contado o emite a crédito.');
      queueMicrotask(() => abrirCajaButtonRef.current?.focus());
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

    if (!await ensureDataBeforeCobranza('credito')) {
      return false;
    }

    if (esCreditoManual) {
      if (!validarCreditoManual()) {
        return false;
      }
    } else {
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

  const handleIssue = async () => {
    if (tipoComprobante === 'nota_credito') {
      await handleCrearComprobante(undefined, { suppressSuccessModal: false });
      return;
    }

    if (isCreditPaymentSelection) {
      void handleEmitirCredito();
      return;
    }
    await handleOpenCobranzaModal();
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
      if (esCreditoManual) {
        if (!validarCreditoManual()) {
          return false;
        }
      } else {
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
    }

    const validation = tipoComprobante === 'nota_credito'
      ? validateComprobanteNormativa(buildCobranzaValidationInput())
      : validateComprobanteReadyForCobranza(buildCobranzaValidationInput(), {
          onError: (validationError) => error('No se puede procesar', validationError.message),
          paymentMode: isCreditSale ? 'credito' : paymentPayload?.mode,
        });

    if (!validation.isValid) {
      if (tipoComprobante === 'nota_credito') {
        validation.errors.forEach((validationError) => error('No se puede procesar', validationError.message));
      }
      return false;
    }

    setIsProcessing(true);

    try {
      const success = await createComprobante({
        tipoComprobante,
        serieSeleccionada,
        cartItems: cartItemsForDocument,
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
        clientDocType: clienteSeleccionadoGlobal?.tipoDocumento,
        clientId: clienteSeleccionadoGlobal?.clienteId != null ? String(clienteSeleccionadoGlobal.clienteId) : undefined,
        clientPriceProfileId: clienteSeleccionadoGlobal?.priceProfileId,
        paymentDetails: isRegisteringCobro ? paymentPayload : undefined,
        creditTerms: isCreditSale ? creditTermsForSubmit : undefined,
        registrarPago: Boolean(isRegisteringCobro && paymentPayload?.lines.length),
        noteCreditData: tipoComprobante === 'nota_credito' ? (datosNotaCredito ?? undefined) : undefined,
      });

      if (success) {
        ventaActualCompletadaRef.current = true;
        abandonoVentaRegistradoRef.current = false;
        salidaControladaRef.current = false;
        limpiarBorradorEnProgreso();
        setShowCobranzaModal(false);
        if (lookupClient && !(clienteSeleccionadoGlobal?.clienteId !== undefined && clienteSeleccionadoGlobal?.clienteId !== null)) {
          const { data } = lookupClient;
          const lookupResolved = buildCreateClientePayloadFromLookup(data);

          if (lookupResolved) {
            const { documentType, documentNumber, payload } = lookupResolved;
            const searchResponse = await clientesClient.getClientes({ search: documentNumber, limit: 25, page: 1 });
            const existing = searchResponse.data.find((candidate) => {
              return isExactDocumentoMatch(candidate, documentType, documentNumber);
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
              const created = await createCliente(payload, { origen: 'emision_inline' });

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
          tipo: obtenerEtiquetaTipoComprobante(tipoComprobante),
          serie: serieSeleccionada,
          numero: '001-00001', // TODO: Obtener el número real del backend
          total: totals.total,
          cliente: clienteSeleccionadoGlobal?.nombre || 'Cliente',
          vuelto: received > totals.total ? received - totals.total : 0,
          mode: isCreditSale ? 'credito' : 'contado',
          creditDueDate: isCreditSale ? creditTermsForSubmit?.fechaVencimientoGlobal ?? null : null,
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
    abandonoVentaRegistradoRef.current = false;
    ventaActualCompletadaRef.current = false;
    salidaControladaRef.current = false;
    limpiarBorradorEnProgreso();
    clearCart();
    setModoProductos('catalogo');
    resetForm();
    // Limpiar estado que resetForm() no cubre, para que el nuevo documento
    // no herede cliente, opcionales, descuentos ni cuotas del documento anterior.
    setClienteSeleccionadoGlobal(null);
    setLookupClient(null);
    setOptionalFields({});
    setAppliedGlobalDiscount(null);
    setCuotasManual([]);
    setCreditoManualConfirmado(false);
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
              <div className="max-w-7xl mx-auto p-3 md:p-4 space-y-3">

            {!isCajaOpen && (
              <div data-tour="primera-venta-caja">
                <BloqueoCajaCerrada
                  ref={abrirCajaButtonRef}
                  onAbrirCaja={handleAbrirCaja}
                />
              </div>
            )}

            <div className="relative">
              <div className="space-y-3">
                {/* ✅ Formulario Compacto - Todos los campos organizados */}
                <CompactDocumentForm
                  tipoComprobante={tipoComprobante}
                  setTipoComprobante={setTipoComprobanteFromUI}
                  tiposHabilitados={isNoteCreditFlow ? ['nota_credito'] : ['factura', 'boleta']}
                  serieSeleccionada={serieSeleccionada}
                  setSerieSeleccionada={setSerieSeleccionada}
                  seriesFiltradas={seriesFiltradas}
                  moneda={currentCurrency}
                  setMoneda={changeCurrency}
                  readOnlyMoneda={isNoteCreditFlow}
                  currencyOptions={availableCurrencies}
                  baseCurrencyCode={baseCurrency.code as Currency}
                  formaPago={formaPago}
                  setFormaPago={setFormaPago}
                  isCreditMethod={isCreditPaymentSelection}
                  creditDueDate={creditDueDateForForm || null}
                  onOpenFieldsConfig={() => setShowFieldsConfigModal(true)}
                  accionContextual={(
                    <AccesoGuiaContextual
                      tourId={tourPrimeraVenta.id}
                      className="border-transparent bg-transparent px-2 py-1 text-[12px] font-medium text-slate-600 shadow-none hover:bg-slate-100"
                    />
                  )}
                  onVistaPrevia={sidePreview?.togglePane}
                  clienteSeleccionado={clienteSeleccionadoGlobal ?? undefined}
                  onClienteChange={setClienteSeleccionadoGlobal}
                  onLookupClientSelected={setLookupClient}
                  datosNotaCredito={datosNotaCredito}
                  onDatosNotaCreditoChange={setDatosNotaCredito}
                  tipoComprobanteBaseNotaCredito={noteCreditTipoOrigen}
                  fechaEmision={fechaEmision}
                  onFechaEmisionChange={setFechaEmision}
                  onOptionalFieldsChange={(fields: Record<string, any>) => setOptionalFields(prev => ({ ...prev, ...fields }))}
                  valoresIniciales={{
                    fechaEmision,
                    fechaVencimiento: typeof optionalFields.fechaVencimiento === 'string' ? optionalFields.fechaVencimiento : undefined,
                    direccion: typeof optionalFields.direccion === 'string' ? optionalFields.direccion : undefined,
                    direccionEnvio: typeof optionalFields.direccionEnvio === 'string' ? optionalFields.direccionEnvio : undefined,
                    correo: typeof optionalFields.correo === 'string' ? optionalFields.correo : undefined,
                    ordenCompra: typeof optionalFields.ordenCompra === 'string' ? optionalFields.ordenCompra : undefined,
                    guiaRemision: typeof optionalFields.guiaRemision === 'string' ? optionalFields.guiaRemision : undefined,
                    centroCosto: typeof optionalFields.centroCosto === 'string' ? optionalFields.centroCosto : undefined,
                  }}
                />

                {/* Products Section - Sin cambios */}
                <ProductsSection
                  cartItems={cartItems}
                  addProductsFromSelector={addProductsFromSelector}
                  updateCartItem={updateCartItem}
                  removeFromCart={removeFromCart}
                  agregarItemLibre={agregarItemLibre}
                  actualizarItemCarrito={actualizarItemCarrito}
                  eliminarItemCarrito={eliminarItemCarrito}
                  modoProductosActual={modoProductos}
                  onModoProductosChange={setModoProductos}
                  totals={totals}
                  totalsBeforeDiscount={totalsBeforeDiscount}
                  globalDiscount={appliedGlobalDiscount}
                  onApplyGlobalDiscount={handleApplyGlobalDiscount}
                  onClearGlobalDiscount={handleClearGlobalDiscount}
                  getGlobalDiscountPreviewTotals={getDiscountPreviewTotals}
                  refreshKey={productSelectorKey}
                  selectedEstablecimientoId={currentEstablecimientoId}
                  preferredPriceColumnId={preferredPriceColumnId}
                  mostrarDetalleCompleto={isNoteCreditFlow}
                />

                {shouldShowCreditSchedule && (
                  <div className="mt-4">
                    <CreditScheduleSummaryCard
                      creditTerms={creditTermsForView}
                      currency={currentCurrency}
                      total={totals.total}
                      onConfigure={handleOpenCreditScheduleModal}
                      errors={esCreditoManual ? undefined : creditTemplateErrors}
                      paymentMethodName={esCreditoManual ? 'Crédito' : selectedPaymentMethod?.name}
                      context="emision"
                      creditoManual={esCreditoManual ? {
                        cuotas: cuotasManualNormalizadas,
                        estaEditando: !creditoManualConfirmado,
                        falta: faltaManual,
                        puedeConfirmar: puedeConfirmarManual,
                        fechaEmision,
                        onAgregar: handleAgregarCuotaManual,
                        onConfirmar: handleConfirmarCreditoManual,
                        onEditar: handleEditarCreditoManual,
                        onCambiar: handleCambiarCuotasManual,
                        onEliminar: handleEliminarCuotaManual,
                      } : undefined}
                    />
                  </div>
                )}

                {/* Action Buttons Section - ahora con acciones dinámicas */}
                <div data-tour="primera-venta-emitir">
                  <ActionButtonsSection
                    onVistaPrevia={fieldsConfig.actionButtons.vistaPrevia ? handleVistaPrevia : undefined}
                    onCancelar={() => {
                      registrarAbandonoVentaSiCorresponde('cancelacion_usuario');
                      limpiarBorradorEnProgreso();
                      clearCart();
                      resetForm();
                      // Limpiar estado que resetForm() no cubre, para evitar que el
                      // cleanup de unmount de useBorradorEnProgreso guarde basura.
                      setClienteSeleccionadoGlobal(null);
                      setLookupClient(null);
                      setOptionalFields({});
                      setAppliedGlobalDiscount(null);
                      setCuotasManual([]);
                      setCreditoManualConfirmado(false);
                      setShowDraftModal(false);
                      setShowObservacionesPanel(false);
                      setProductSelectorKey(prev => prev + 1);
                      goToComprobantes();
                    }}
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
                    isCartEmpty={!hasDocumentItems}
                    primaryAction={fieldsConfig.actionButtons.crearComprobante ? {
                      label: issueButtonLabel,
                      onClick: handleIssue,
                      disabled: isProcessing || !hasDocumentItems || noteCreditRequiredFieldsPending,
                      title: isCreditPaymentSelection
                        ? 'Emitir y generar la cuenta por cobrar'
                        : isNoteCreditFlow && noteCreditRequiredFieldsPending
                          ? 'Completa el código y motivo de la Nota de Crédito para emitir'
                          : 'Abrir el modal de cobranza para registrar este pago',
                    } : undefined}
                  />
                </div>
              </div>
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
              formaPago,
              fechaEmision,
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
          creditTerms={creditTermsForSubmit}
          creditPaymentMethodLabel={esCreditoManual ? 'Crédito' : selectedPaymentMethod?.name}
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
          creditTerms={creditTermsForSubmit}
          dueDate={creditTermsForSubmit?.fechaVencimientoGlobal ?? optionalFields?.fechaVencimiento}
          notaCredito={datosNotaCredito ?? undefined}
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

