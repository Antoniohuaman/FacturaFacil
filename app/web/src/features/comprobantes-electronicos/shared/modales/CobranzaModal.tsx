import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  X,
  CreditCard,
  Wallet,
  User,
  FileText,
  ChevronRight,
  Layers,
  AlertTriangle,
  Plus,
  Trash2,
  Calendar,
  Building2,
  NotebookPen,
  Smartphone,
} from 'lucide-react';
import type {
  CartItem,
  ClientData,
  Currency,
  CurrencyInfo,
  PaymentCollectionMode,
  PaymentCollectionPayload,
  PaymentLineInput,
  PaymentTotals,
  ComprobanteCreditTerms,
  TipoComprobante,
} from '../../models/comprobante.types';
import { useCurrency } from '../form-core/hooks/useCurrency';
import { useConfigurationContext } from '../../../configuracion-sistema/context/ConfigurationContext';
import { useCaja } from '../../../control-caja/context/CajaContext';
import { useCurrentEstablishmentId } from '../../../../contexts/UserSessionContext';
import { filterCollectionSeries, getNextCollectionDocument } from '../../../../shared/series/collectionSeries';
import { useSeriesCommands } from '../../../configuracion-sistema/hooks/useSeriesCommands';

type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

interface PaymentOptionMeta {
  id: string;
  label: string;
  badge: string;
  icon: IconComponent;
}

interface CobranzaModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  totals: PaymentTotals;
  cliente?: ClientData | null;
  tipoComprobante: TipoComprobante;
  serie: string;
  numeroTemporal?: string;
  fechaEmision: string;
  moneda: Currency | CurrencyInfo | string;
  formaPago?: string;
  onComplete: (payload: PaymentCollectionPayload) => Promise<boolean> | boolean;
  isProcessing?: boolean;
  establishmentId?: string;
  creditTerms?: ComprobanteCreditTerms;
  creditPaymentMethodLabel?: string;
}

interface PaymentLineForm extends PaymentLineInput {
  id: string;
  method: string;
  amount: number;
  bank?: string;
  reference?: string;
  operationNumber?: string;
}

const DEFAULT_PAYMENT_OPTIONS: PaymentOptionMeta[] = [
  { id: 'efectivo', label: 'Efectivo', badge: 'bg-green-100 text-green-700', icon: Wallet },
  { id: 'yape', label: 'Yape', badge: 'bg-purple-100 text-purple-700', icon: Smartphone },
  { id: 'plin', label: 'Plin', badge: 'bg-indigo-100 text-indigo-700', icon: Smartphone },
  { id: 'transferencia', label: 'Transferencia', badge: 'bg-blue-100 text-blue-700', icon: Building2 },
  { id: 'tarjeta_credito', label: 'Tarjeta crédito', badge: 'bg-orange-100 text-orange-700', icon: CreditCard },
  { id: 'tarjeta_debito', label: 'Tarjeta débito', badge: 'bg-cyan-100 text-cyan-700', icon: CreditCard },
  { id: 'deposito', label: 'Depósito', badge: 'bg-teal-100 text-teal-700', icon: Building2 },
];

const DEFAULT_CAJAS = [
  'Caja general',
  'Caja chica',
  'BCP',
  'BBVA',
  'Interbank',
  'Scotiabank',
  'Banco de la Nación',
];

const tolerance = 0.01;

const normalizeFormaPagoId = (value?: string) => value?.replace(/^pm-/, '').toLowerCase() ?? '';

const getBadgeByType = (type?: string, label?: string) => {
  if (label) {
    const lower = label.toLowerCase();
    if (lower.includes('yape') || lower.includes('plin')) return 'bg-purple-100 text-purple-700';
    if (lower.includes('efectivo')) return 'bg-green-100 text-green-700';
    if (lower.includes('tarjeta')) return 'bg-blue-100 text-blue-700';
    if (lower.includes('transfer') || lower.includes('banco')) return 'bg-sky-100 text-sky-700';
    if (lower.includes('depósito') || lower.includes('deposito')) return 'bg-teal-100 text-teal-700';
  }

  switch (type) {
    case 'CASH':
      return 'bg-green-100 text-green-700';
    case 'CARD':
      return 'bg-blue-100 text-blue-700';
    case 'DIGITAL_WALLET':
      return 'bg-purple-100 text-purple-700';
    case 'TRANSFER':
      return 'bg-sky-100 text-sky-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
};

const getIconByType = (type?: string, label?: string): IconComponent => {
  if (label) {
    const lower = label.toLowerCase();
    if (lower.includes('yape') || lower.includes('plin')) return Smartphone;
    if (lower.includes('efectivo')) return Wallet;
  }

  switch (type) {
    case 'CASH':
      return Wallet;
    case 'CARD':
      return CreditCard;
    case 'DIGITAL_WALLET':
      return Smartphone;
    case 'TRANSFER':
      return Building2;
    default:
      return CreditCard;
  }
};

export const CobranzaModal: React.FC<CobranzaModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  totals,
  cliente,
  tipoComprobante,
  serie,
  numeroTemporal,
  fechaEmision,
  moneda,
  formaPago,
  onComplete,
  isProcessing = false,
  establishmentId,
  creditTerms,
  creditPaymentMethodLabel,
}) => {
  const { formatPrice } = useCurrency();
  const { state } = useConfigurationContext();
  const { paymentMethods, cajas } = state;
  const { status: cajaStatus, aperturaActual } = useCaja();
  const isCajaOpen = cajaStatus === 'abierta';
  const { incrementSeriesCorrelative } = useSeriesCommands();
  const currentEstablishmentId = useCurrentEstablishmentId();
  const effectiveEstablishmentId = establishmentId || currentEstablishmentId;
  const esBoleta = tipoComprobante === 'boleta';
  const cobranzasSeries = useMemo(
    () => filterCollectionSeries(state.series, effectiveEstablishmentId || undefined),
    [state.series, effectiveEstablishmentId]
  );
  const [collectionSeriesId, setCollectionSeriesId] = useState('');

  const availablePaymentOptions = useMemo<PaymentOptionMeta[]>(() => {
    const active = paymentMethods
      .filter((pm) => pm.isActive && (pm.display?.showInInvoicing ?? true))
      .sort((a, b) => (a.display?.displayOrder ?? 0) - (b.display?.displayOrder ?? 0))
      .map((pm) => ({
        id: pm.id,
        label: pm.name,
        badge: getBadgeByType(pm.type, pm.name),
        icon: getIconByType(pm.type, pm.name),
      }));

    return active.length ? active : DEFAULT_PAYMENT_OPTIONS;
  }, [paymentMethods]);

  const cajaOptions = useMemo(() => {
    const enabled = cajas.filter((caja) => caja.habilitada);
    if (enabled.length) {
      return enabled.map((caja) => caja.nombre);
    }
    return DEFAULT_CAJAS;
  }, [cajas]);

  const cajaAbiertaNombre = useMemo(() => {
    if (!aperturaActual) return undefined;
    const found = cajas.find((caja) => caja.id === aperturaActual.cajaId);
    return found?.nombre;
  }, [aperturaActual, cajas]);

  const defaultCajaDestino = useMemo(
    () => cajaAbiertaNombre || cajaOptions[0] || DEFAULT_CAJAS[0],
    [cajaAbiertaNombre, cajaOptions],
  );

  const selectedCollectionSeries = useMemo(() => {
    if (!collectionSeriesId) {
      return null;
    }
    return cobranzasSeries.find((series) => series.id === collectionSeriesId) || null;
  }, [collectionSeriesId, cobranzasSeries]);

  const collectionDocumentPreview = useMemo(() => {
    if (!selectedCollectionSeries) {
      return null;
    }
    return getNextCollectionDocument(selectedCollectionSeries);
  }, [selectedCollectionSeries]);

  const resolveInitialMethod = useCallback(() => {
    if (!availablePaymentOptions.length) {
      return 'efectivo';
    }

    if (formaPago) {
      const exactMatch = availablePaymentOptions.find((option) => option.id === formaPago);
      if (exactMatch) {
        return exactMatch.id;
      }

      const normalizedFormaPago = normalizeFormaPagoId(formaPago);
      const normalizedMatch = availablePaymentOptions.find(
        (option) => normalizeFormaPagoId(option.id) === normalizedFormaPago || option.label.toLowerCase() === normalizedFormaPago,
      );
      if (normalizedMatch) {
        return normalizedMatch.id;
      }
    }

    return availablePaymentOptions[0].id;
  }, [availablePaymentOptions, formaPago]);

  const [mode, setMode] = useState<PaymentCollectionMode>('contado');
  const [paymentLines, setPaymentLines] = useState<PaymentLineForm[]>([]);
  const [fechaCobranza, setFechaCobranza] = useState(() => new Date().toISOString().split('T')[0]);
  const [cajaDestino, setCajaDestino] = useState(defaultCajaDestino);
  const [notas, setNotas] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const currencyCode = typeof moneda === 'string' ? moneda : moneda?.code ?? 'PEN';
  const normalizedCurrencyCode = (currencyCode || 'PEN').toUpperCase();
  const currencyForFormat: Currency = ['PEN', 'USD'].includes(normalizedCurrencyCode) ? (normalizedCurrencyCode as Currency) : 'PEN';
  const formatCurrency = useCallback((amount?: number) => formatPrice(Number(amount ?? 0), currencyForFormat), [currencyForFormat, formatPrice]);

  const resumenProductos = useMemo(() => {
    const slice = cartItems.slice(0, 3);
    const restantes = cartItems.length - slice.length;
    return { slice, restantes };
  }, [cartItems]);

  const creditInstallments = creditTerms?.schedule ?? [];
  const creditScheduleLabel = creditPaymentMethodLabel || 'Pago a crédito';

  const totalRecibido = useMemo(() => paymentLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0), [paymentLines]);
  const diferencia = useMemo(() => totals.total - totalRecibido, [totals.total, totalRecibido]);

  useEffect(() => {
    if (!isOpen) return;

    const initialMethodId = resolveInitialMethod();
    const initialMode: PaymentCollectionMode = esBoleta
      ? 'contado'
      : (isCajaOpen ? 'contado' : 'credito');

    setMode(initialMode);
    setPaymentLines([
      {
        id: 'line-1',
        method: initialMethodId,
        amount: Number(totals.total.toFixed(2)),
        bank: defaultCajaDestino,
      },
    ]);
    setFechaCobranza(fechaEmision || new Date().toISOString().split('T')[0]);
    setCajaDestino(defaultCajaDestino);
    setNotas('');
    setErrorMessage(null);
  }, [defaultCajaDestino, esBoleta, fechaEmision, isCajaOpen, isOpen, resolveInitialMethod, totals.total]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (cobranzasSeries.length === 0) {
      setCollectionSeriesId('');
      return;
    }

    setCollectionSeriesId((current) => {
      if (current && cobranzasSeries.some((series) => series.id === current)) {
        return current;
      }
      return cobranzasSeries[0]?.id || '';
    });
  }, [cobranzasSeries, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (esBoleta) return;
    if (!isCajaOpen && mode === 'contado') {
      setMode('credito');
    }
  }, [esBoleta, isCajaOpen, isOpen, mode]);

  useEffect(() => {
    if (!isOpen || !esBoleta) {
      return;
    }
    if (mode !== 'contado') {
      setMode('contado');
    }
  }, [esBoleta, isOpen, mode]);

  const handleAddLine = useCallback(() => {
    setPaymentLines((prev) => {
      const alreadyAssigned = prev.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);
      const remaining = totals.total - alreadyAssigned;

      return [
        ...prev,
        {
          id: `line-${Date.now()}`,
          method: resolveInitialMethod(),
          amount: remaining > 0 ? Number(remaining.toFixed(2)) : 0,
          bank: defaultCajaDestino,
        },
      ];
    });
  }, [defaultCajaDestino, resolveInitialMethod, totals.total]);

  const handleRemoveLine = (id: string) => {
    setPaymentLines((prev) => (prev.length === 1 ? prev : prev.filter((line) => line.id !== id)));
  };

  const updateLine = (id: string, field: keyof PaymentLineForm, value: string | number) => {
    setPaymentLines((prev) =>
      prev.map((line) =>
        line.id === id
          ? {
              ...line,
              [field]: field === 'amount' ? Number(value) : value,
            }
          : line,
      ),
    );
  };

  const validatePayment = (targetMode: PaymentCollectionMode = mode) => {
    if (targetMode === 'credito') {
      return true;
    }

    if (paymentLines.length === 0) {
      setErrorMessage('Agregar al menos un método de pago.');
      return false;
    }

    const invalidLine = paymentLines.find((line) => !line.method || !line.amount || line.amount <= 0);
    if (invalidLine) {
      setErrorMessage('Cada método necesita un monto mayor a 0.');
      return false;
    }

    if (Math.abs(diferencia) > tolerance) {
      setErrorMessage('La suma de los montos debe ser igual al total a cobrar.');
      return false;
    }

    setErrorMessage(null);
    return true;
  };

  const handleModeChange = useCallback(
    (target: PaymentCollectionMode) => {
      if (esBoleta && target === 'credito') {
        setMode('contado');
        setErrorMessage('Las boletas solo se pueden emitir al contado.');
        return;
      }

      if (target === 'contado' && !isCajaOpen) {
        if (esBoleta) {
          setMode('contado');
          setErrorMessage('Abre una caja para registrar boletas al contado.');
        } else {
          setMode('credito');
          setErrorMessage('No hay caja abierta. Selecciona Crédito o abre una caja para registrar el cobro.');
        }
        return;
      }

      setErrorMessage(null);
      setMode(target);
    },
    [esBoleta, isCajaOpen],
  );

  const handleSubmit = async (targetMode: PaymentCollectionMode) => {
    setErrorMessage(null);

    const enforcedMode: PaymentCollectionMode = esBoleta ? 'contado' : targetMode;

    if (esBoleta && targetMode === 'credito') {
      setMode('contado');
      setErrorMessage('Las boletas solo se pueden emitir al contado.');
    }

    if (enforcedMode === 'contado' && !isCajaOpen) {
      if (esBoleta) {
        setMode('contado');
        setErrorMessage('Abre una caja para registrar boletas al contado.');
      } else {
        setMode('credito');
        setErrorMessage('No hay caja abierta. Selecciona Crédito o abre una caja para registrar el cobro.');
      }
      return;
    }

    if (enforcedMode === 'contado' && !validatePayment(enforcedMode)) {
      return;
    }

    const requiresCollectionDocument = enforcedMode === 'contado';
    if (requiresCollectionDocument && !collectionDocumentPreview) {
      setErrorMessage('Configura una serie de cobranza activa para este establecimiento antes de registrar pagos.');
      return;
    }

    setMode(enforcedMode);

    const payload: PaymentCollectionPayload = {
      mode: enforcedMode,
      lines:
        enforcedMode === 'contado'
          ? paymentLines.map((line) => ({
              id: line.id,
              method: line.method,
              amount: Number(line.amount),
              bank: line.bank,
              reference: line.reference,
              operationNumber: line.operationNumber,
            }))
          : [],
      cajaDestino: enforcedMode === 'contado' ? cajaDestino || undefined : undefined,
      fechaCobranza: enforcedMode === 'contado' ? fechaCobranza || undefined : undefined,
      notes: notas || undefined,
      collectionDocument:
        enforcedMode === 'contado' && collectionDocumentPreview
          ? {
              ...collectionDocumentPreview,
              issuedAt: fechaCobranza || new Date().toISOString().split('T')[0],
            }
          : undefined,
    };

    try {
      setSubmitting(true);
      const result = await Promise.resolve(onComplete(payload));
      if (!result) {
        setErrorMessage('No se pudo completar la operación. Intenta nuevamente.');
        return;
      }

      if (enforcedMode === 'contado' && payload.collectionDocument) {
        incrementSeriesCorrelative(
          payload.collectionDocument.seriesId,
          payload.collectionDocument.correlative
        );
      }
    } catch (submitError) {
      console.error('Error al registrar cobranza:', submitError);
      setErrorMessage('Ocurrió un error al registrar el pago. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const formattedDifference = formatCurrency(Math.abs(diferencia));
  const differenceStatus = diferencia > tolerance ? 'faltante' : diferencia < -tolerance ? 'vuelto' : 'ajustado';
  const confirmLabel = mode === 'contado' ? 'Registrar pago y emitir' : 'Emitir a crédito';
  const confirmDisabled =
    isProcessing ||
    submitting ||
    (mode === 'contado' && (!isCajaOpen || !collectionDocumentPreview)) ||
    (mode === 'credito' && creditInstallments.length === 0);
  const handleConfirm = () => {
    void handleSubmit(mode);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={isProcessing || submitting ? undefined : onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl mx-4 max-h-[92vh] flex flex-col">
        <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Cobranza de {tipoComprobante === 'factura' ? 'Factura' : 'Boleta'}</p>
            <h2 className="text-xl font-semibold text-slate-900">Confirma el pago antes de emitir</h2>
          </div>
          <button
            type="button"
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500"
            onClick={onClose}
            disabled={isProcessing || submitting}
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4 grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1fr]">
          <section className="space-y-4">
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/60">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Documento</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {tipoComprobante === 'factura' ? 'Factura' : 'Boleta'} • Serie {serie}{' '}
                    {numeroTemporal && <span className="text-slate-500">({numeroTemporal})</span>}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm text-slate-700">
                <div>
                  <p className="text-xs text-slate-500">Fecha emisión</p>
                  <p className="font-medium">{fechaEmision}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Moneda</p>
                  <p className="font-medium">{currencyCode}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Cliente</p>
                  <p className="font-medium flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    {cliente?.nombre || 'Sin cliente'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Documento cliente</p>
                  <p className="font-medium">{cliente?.documento || '—'}</p>
                </div>
              </div>

              <div className="mt-4 border-t border-dashed border-slate-200 pt-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Detalle rápido</span>
                </div>
                {resumenProductos.slice.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {resumenProductos.slice.map((item) => {
                      const itemTotal = item.total ?? item.subtotal ?? item.price * item.quantity;
                      return (
                        <li key={item.id} className="flex items-center justify-between rounded-lg bg-white/70 px-3 py-2 text-sm">
                          <div>
                            <p className="font-semibold text-slate-900">{item.name}</p>
                            <p className="text-xs text-slate-500">
                              Cant. {item.quantity} • {formatCurrency(item.price)} c/u
                            </p>
                          </div>
                          <span className="text-sm font-semibold text-slate-900">{formatCurrency(itemTotal)}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">No hay productos en el carrito.</p>
                )}
                {resumenProductos.restantes > 0 && (
                  <p className="mt-2 text-xs text-slate-500">
                    +{resumenProductos.restantes} productos adicionales en esta venta
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(totals.subtotal ?? totals.total)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>IGV</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(totals.igv ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-3 text-base font-semibold text-slate-900">
                  <span>Total a cobrar</span>
                  <span>{formatCurrency(totals.total)}</span>
                </div>
              </div>
            </div>

            {creditInstallments.length > 0 && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{creditScheduleLabel}</p>
                    <h3 className="text-base font-semibold text-emerald-900">
                      {creditInstallments.length} cuota{creditInstallments.length === 1 ? '' : 's'} programada{creditInstallments.length === 1 ? '' : 's'}
                    </h3>
                  </div>
                  <div className="text-right text-xs text-emerald-700">
                    <p className="font-semibold">Vence:</p>
                    <p>{creditTerms?.fechaVencimientoGlobal}</p>
                  </div>
                </div>
                <ul className="space-y-2">
                  {creditInstallments.slice(0, 3).map((cuota) => (
                    <li key={cuota.numeroCuota} className="flex items-center justify-between rounded-lg bg-white/70 px-3 py-2 text-sm text-emerald-900">
                      <div>
                        <p className="font-semibold">Cuota {cuota.numeroCuota}</p>
                        <p className="text-xs text-emerald-700">{cuota.fechaVencimiento} • {cuota.porcentaje}%</p>
                      </div>
                      <span className="text-sm font-semibold">{formatCurrency(cuota.importe)}</span>
                    </li>
                  ))}
                </ul>
                {creditInstallments.length > 3 && (
                  <p className="text-xs text-emerald-700">+{creditInstallments.length - 3} cuota{creditInstallments.length - 3 === 1 ? '' : 's'} adicionales</p>
                )}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Serie de cobranza</p>
                  <h3 className="text-base font-semibold text-slate-900">Elige la serie que emitirá el recibo</h3>
                </div>
              </div>
              {cobranzasSeries.length === 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  Necesitas configurar una serie de cobranza activa para este establecimiento antes de registrar pagos.
                  Ve a Configuración &gt; Series y crea una con prefijo "C".
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Serie</label>
                    <select
                      value={collectionSeriesId}
                      onChange={(event) => setCollectionSeriesId(event.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    >
                      {cobranzasSeries.map((seriesOption) => (
                        <option key={seriesOption.id} value={seriesOption.id}>
                          {seriesOption.series}
                        </option>
                      ))}
                    </select>
                  </div>
                  {collectionDocumentPreview && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Próximo recibo</p>
                      <p className="text-lg font-semibold text-slate-900">{collectionDocumentPreview.fullNumber}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Modalidad</p>
                  <h3 className="text-base font-semibold text-slate-900">Selecciona cómo registrarás este cobro</h3>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <ChevronRight className="w-3 h-3" />
                  <span>Paso 1</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleModeChange('contado')}
                  disabled={!isCajaOpen && mode !== 'contado'}
                  className={`rounded-xl border px-4 py-3 text-left text-sm transition focus:outline-none ${
                    mode === 'contado' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-200 hover:border-slate-300'
                  } ${!isCajaOpen ? 'disabled:cursor-not-allowed disabled:opacity-60' : ''}`}
                >
                  <p className="font-semibold">Pago al contado</p>
                  <p className="text-xs text-slate-500">Registra métodos y montos ahora</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('credito')}
                  disabled={esBoleta}
                  className={`rounded-xl border px-4 py-3 text-left text-sm transition focus:outline-none ${
                    mode === 'credito' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-slate-200 hover:border-slate-300'
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <p className="font-semibold">Pago a crédito</p>
                  <p className="text-xs text-slate-500">Registra la cobranza después</p>
                </button>
              </div>

              {!isCajaOpen && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-amber-800">
                  <AlertTriangle className="mt-0.5 h-5 w-5" />
                  <div>
                    <p className="text-sm font-semibold">Caja cerrada</p>
                    <p className="text-xs text-amber-900/80">Abre una caja para registrar pagos al contado o selecciona la modalidad crédito.</p>
                  </div>
                </div>
              )}

              {mode === 'contado' ? (
                <>
                  <div className="space-y-4">
                    {paymentLines.map((line, index) => {
                      const optionMeta = availablePaymentOptions.find((option) => option.id === line.method) ?? availablePaymentOptions[0];
                      const LineIcon = optionMeta?.icon ?? CreditCard;
                      return (
                        <div key={line.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                          <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-600 shadow">
                                <LineIcon className="h-4 w-4" />
                              </span>
                              <div>
                                <p className="text-sm font-semibold text-slate-900">Método #{index + 1}</p>
                                <span className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${optionMeta?.badge ?? 'bg-slate-100 text-slate-600'}`}>
                                  {optionMeta?.label ?? 'Método personalizado'}
                                </span>
                              </div>
                            </div>
                            {paymentLines.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveLine(line.id)}
                                className="rounded-full p-2 text-slate-400 transition hover:bg-white hover:text-slate-600"
                                aria-label="Eliminar método"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Forma de pago
                              <select
                                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none"
                                value={line.method}
                                onChange={(event) => updateLine(line.id, 'method', event.target.value)}
                              >
                                {availablePaymentOptions.map((option) => (
                                  <option key={option.id} value={option.id}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Monto
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none"
                                value={Number.isNaN(line.amount) ? '' : line.amount}
                                onChange={(event) => updateLine(line.id, 'amount', Number(event.target.value))}
                              />
                            </label>
                            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Destino / banco
                              <input
                                type="text"
                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none"
                                value={line.bank ?? ''}
                                onChange={(event) => updateLine(line.id, 'bank', event.target.value)}
                                placeholder="Caja o banco"
                              />
                            </label>
                            <div className="grid gap-3 sm:grid-cols-2 sm:col-span-2">
                              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Referencia
                                <input
                                  type="text"
                                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none"
                                  value={line.reference ?? ''}
                                  onChange={(event) => updateLine(line.id, 'reference', event.target.value)}
                                  placeholder="Voucher, número de operación, etc"
                                />
                              </label>
                              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                N° operación
                                <input
                                  type="text"
                                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none"
                                  value={line.operationNumber ?? ''}
                                  onChange={(event) => updateLine(line.id, 'operationNumber', event.target.value)}
                                  placeholder="Código opcional"
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="inline-flex items-center gap-2 rounded-full border border-dashed border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600"
                    disabled={isProcessing}
                  >
                    <Plus className="h-4 w-4" /> Añadir método de pago
                  </button>
                </>
              ) : (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/80 px-4 py-3 text-sm text-indigo-900">
                  <p className="font-semibold">Se emitirá a crédito</p>
                  <p className="text-xs text-indigo-900/80">No registraremos movimientos de caja ahora. Podrás registrar el pago cuando se realice la cobranza.</p>
                  {creditInstallments.length > 0 && (
                    <p className="mt-1 text-xs text-indigo-900/80">
                      Cronograma: {creditInstallments.length} cuota{creditInstallments.length === 1 ? '' : 's'} hasta {creditTerms?.fechaVencimientoGlobal}
                    </p>
                  )}
                </div>
              )}

              {mode === 'contado' && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Total del documento</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(totals.total)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Monto recibido</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(totalRecibido)}</span>
                  </div>
                  <div
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                      differenceStatus === 'faltante'
                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                        : differenceStatus === 'vuelto'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    {differenceStatus === 'faltante' && `Faltan ${formattedDifference} para completar el cobro.`}
                    {differenceStatus === 'vuelto' && `Se devolverá ${formattedDifference} de vuelto al cliente.`}
                    {differenceStatus === 'ajustado' && 'Montos equilibrados. Puedes continuar.'}
                  </div>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Caja / destino</label>
                  <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 focus-within:border-indigo-400">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <select
                      className="w-full bg-transparent text-sm text-slate-700 focus:outline-none"
                      value={cajaDestino}
                      onChange={(event) => setCajaDestino(event.target.value)}
                    >
                      {cajaOptions.map((caja) => (
                        <option key={caja} value={caja}>
                          {caja}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha de cobranza</label>
                  <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 focus-within:border-indigo-400">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <input
                      type="date"
                      className="w-full bg-transparent text-sm text-slate-700 focus:outline-none"
                      value={fechaCobranza}
                      onChange={(event) => setFechaCobranza(event.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notas internas</label>
                <div className="mt-1 flex gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 focus-within:border-indigo-400">
                  <NotebookPen className="mt-1 h-4 w-4 text-slate-400" />
                  <textarea
                    className="min-h-[72px] w-full resize-none border-0 bg-transparent text-sm text-slate-700 outline-none"
                    placeholder="Agregar instrucciones o recordatorios para la caja"
                    value={notas}
                    onChange={(event) => setNotas(event.target.value)}
                  />
                </div>
              </div>

              {errorMessage && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>
          </section>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60"
            onClick={handleConfirm}
            disabled={confirmDisabled}
          >
            {isProcessing ? 'Procesando...' : confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
};
