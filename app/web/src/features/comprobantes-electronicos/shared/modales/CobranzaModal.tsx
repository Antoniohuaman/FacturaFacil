import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CreditCard,
  Plus,
  Smartphone,
  Trash2,
  User,
  Wallet,
  X,
} from 'lucide-react';
import type {
  CartItem,
  ClientData,
  ComprobanteCreditInstallment,
  ComprobanteCreditTerms,
  CreditInstallmentAllocation,
  Currency,
  CurrencyInfo,
  PaymentCollectionMode,
  PaymentCollectionPayload,
  PaymentLineInput,
  PaymentTotals,
  TipoComprobante,
} from '../../models/comprobante.types';
import { useCurrency } from '../form-core/hooks/useCurrency';
import { useConfigurationContext } from '../../../configuracion-sistema/context/ConfigurationContext';
import { useCaja } from '../../../control-caja/context/CajaContext';
import { useCurrentEstablishmentId } from '../../../../contexts/UserSessionContext';
import { filterCollectionSeries, getNextCollectionDocument } from '../../../../shared/series/collectionSeries';
import { useSeriesCommands } from '../../../configuracion-sistema/hooks/useSeriesCommands';
import { CreditInstallmentsTable, type CreditInstallmentAllocationInput } from '../payments/CreditInstallmentsTable';

const DEFAULT_PAYMENT_OPTIONS = [
  { id: 'efectivo', label: 'Efectivo', badge: 'bg-green-100 text-green-700', icon: Wallet },
  { id: 'yape', label: 'Yape', badge: 'bg-purple-100 text-purple-700', icon: Smartphone },
  { id: 'plin', label: 'Plin', badge: 'bg-indigo-100 text-indigo-700', icon: Smartphone },
  { id: 'transferencia', label: 'Transferencia', badge: 'bg-blue-100 text-blue-700', icon: Building2 },
  { id: 'tarjeta_credito', label: 'Tarjeta crédito', badge: 'bg-orange-100 text-orange-700', icon: CreditCard },
  { id: 'tarjeta_debito', label: 'Tarjeta débito', badge: 'bg-cyan-100 text-cyan-700', icon: CreditCard },
  { id: 'deposito', label: 'Depósito', badge: 'bg-teal-100 text-teal-700', icon: Building2 },
];

const DEFAULT_CAJAS = ['Caja general', 'Caja chica', 'BCP', 'BBVA', 'Interbank'];
const tolerance = 0.01;

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
  modeIntent?: PaymentCollectionMode;
}

interface PaymentLineForm extends PaymentLineInput {
  bank?: string;
  reference?: string;
  operationNumber?: string;
}

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

const sanitizeInstallment = (installment: ComprobanteCreditInstallment) => {
  const pagado = Number(installment.pagado ?? 0);
  const importe = Number(installment.importe ?? 0);
  const saldoBase = typeof installment.saldo === 'number' ? installment.saldo : importe - pagado;
  const saldo = Number(Math.max(0, saldoBase).toFixed(2));
  return {
    ...installment,
    pagado,
    importe,
    saldo,
  };
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
  modeIntent,
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
    [state.series, effectiveEstablishmentId],
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
    return cobranzasSeries.find((seriesItem) => seriesItem.id === collectionSeriesId) || null;
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

  const normalizedInstallments = useMemo(
    () => (creditTerms?.schedule ?? []).map(sanitizeInstallment),
    [creditTerms],
  );
  const hasCreditSchedule = normalizedInstallments.length > 0;
  const creditScheduleLabel = creditPaymentMethodLabel || (hasCreditSchedule ? 'Pago a crédito' : 'Sin cronograma definido');

  const resolveInitialMode = useCallback(() => {
    if (esBoleta || !hasCreditSchedule) {
      return 'contado';
    }

    if (!isCajaOpen) {
      return 'credito';
    }

    if (modeIntent === 'credito') {
      return 'credito';
    }

    return 'contado';
  }, [esBoleta, hasCreditSchedule, isCajaOpen, modeIntent]);

  const [mode, setMode] = useState<PaymentCollectionMode>('contado');
  const [paymentLines, setPaymentLines] = useState<PaymentLineForm[]>([]);
  const [fechaCobranza, setFechaCobranza] = useState(() => fechaEmision || new Date().toISOString().split('T')[0]);
  const [cajaDestino, setCajaDestino] = useState(defaultCajaDestino);
  const [notas, setNotas] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [allocationDrafts, setAllocationDrafts] = useState<CreditInstallmentAllocationInput[]>([]);
  const [hasManualAllocations, setHasManualAllocations] = useState(false);

  const currencyCode = typeof moneda === 'string' ? moneda : moneda?.code ?? 'PEN';
  const normalizedCurrencyCode = (currencyCode || 'PEN').toUpperCase();
  const currencyForFormat: Currency = ['PEN', 'USD'].includes(normalizedCurrencyCode) ? (normalizedCurrencyCode as Currency) : 'PEN';
  const formatCurrency = useCallback((amount?: number) => formatPrice(Number(amount ?? 0), currencyForFormat), [currencyForFormat, formatPrice]);

  const productsSummary = useMemo(() => {
    const highlighted = cartItems.slice(0, 3);
    const remaining = cartItems.length - highlighted.length;
    return { highlighted, remaining };
  }, [cartItems]);

  const totalRecibido = useMemo(() => paymentLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0), [paymentLines]);
  const diferencia = useMemo(() => totals.total - totalRecibido, [totals.total, totalRecibido]);
  const formattedDifference = formatCurrency(Math.abs(diferencia));
  const differenceStatus = diferencia > tolerance ? 'faltante' : diferencia < -tolerance ? 'vuelto' : 'ajustado';
  const differenceChipClass =
    differenceStatus === 'ajustado'
      ? 'bg-emerald-100 text-emerald-700'
      : differenceStatus === 'faltante'
      ? 'bg-amber-100 text-amber-800'
      : 'bg-sky-100 text-sky-700';

  const showAllocationSection = mode === 'contado' && hasCreditSchedule && totalRecibido > tolerance;

  const autoDistributeAllocations = useCallback(
    (amount: number) => {
      if (!hasCreditSchedule) {
        return [];
      }
      let remaining = Math.max(0, Number(amount) || 0);
      const plan: CreditInstallmentAllocationInput[] = [];
      normalizedInstallments.forEach((installment) => {
        if (remaining <= tolerance) {
          return;
        }
        const saldo = Number(installment.saldo ?? 0);
        const toApply = Math.min(saldo, remaining);
        if (toApply > tolerance) {
          plan.push({ installmentNumber: installment.numeroCuota, amount: Number(toApply.toFixed(2)) });
          remaining = Math.max(0, Number((remaining - toApply).toFixed(2)));
        }
      });
      return plan;
    },
    [hasCreditSchedule, normalizedInstallments],
  );

  const handleAutoDistributeAllocations = useCallback(() => {
    setHasManualAllocations(false);
    setAllocationDrafts(autoDistributeAllocations(totalRecibido));
  }, [autoDistributeAllocations, totalRecibido]);

  const handleResetAllocations = useCallback(() => {
    setHasManualAllocations(false);
    setAllocationDrafts([]);
  }, []);

  const handleAllocationChange = useCallback((allocations: CreditInstallmentAllocationInput[]) => {
    setHasManualAllocations(true);
    setAllocationDrafts(allocations);
  }, []);

  const totalAllocationAmount = useMemo(
    () => allocationDrafts.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0),
    [allocationDrafts],
  );
  const allocationDelta = useMemo(
    () => Number((totalRecibido - totalAllocationAmount).toFixed(2)),
    [totalAllocationAmount, totalRecibido],
  );
  const allocationRequiresDistribution = showAllocationSection && totalRecibido > tolerance && allocationDrafts.length === 0;
  const allocationMismatch = showAllocationSection && totalRecibido > tolerance && Math.abs(allocationDelta) > tolerance;
  const allocationBlocksSubmission = allocationRequiresDistribution || allocationMismatch;

  const allocationStatus = useMemo(() => {
    if (!showAllocationSection) {
      return null;
    }
    if (allocationRequiresDistribution) {
      return { tone: 'warn', text: 'Distribuye el adelanto entre las cuotas para registrar el movimiento en caja.' } as const;
    }
    if (allocationMismatch) {
      return { tone: 'warn', text: 'El monto distribuido debe coincidir con el monto recibido.' } as const;
    }
    if (allocationDrafts.length > 0) {
      return { tone: 'ok', text: 'El adelanto se aplicará a las cuotas seleccionadas.' } as const;
    }
    return null;
  }, [allocationDrafts.length, allocationMismatch, allocationRequiresDistribution, showAllocationSection]);

  useEffect(() => {
    if (!isOpen) return;

    const initialMethodId = resolveInitialMethod();
    const initialMode = resolveInitialMode();

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
    setAllocationDrafts([]);
    setHasManualAllocations(false);
    setErrorMessage(null);
  }, [defaultCajaDestino, fechaEmision, isOpen, resolveInitialMethod, resolveInitialMode, totals.total]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (cobranzasSeries.length === 0) {
      setCollectionSeriesId('');
      return;
    }

    setCollectionSeriesId((current) => {
      if (current && cobranzasSeries.some((seriesItem) => seriesItem.id === current)) {
        return current;
      }
      return cobranzasSeries[0]?.id || '';
    });
  }, [cobranzasSeries, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    if (esBoleta && mode !== 'contado') {
      setMode('contado');
      return;
    }
    if (!esBoleta && !isCajaOpen && mode === 'contado') {
      setMode('credito');
    }
  }, [esBoleta, isCajaOpen, isOpen, mode]);

  useEffect(() => {
    if (!isOpen || !showAllocationSection || hasManualAllocations) {
      return;
    }
    setAllocationDrafts(autoDistributeAllocations(totalRecibido));
  }, [autoDistributeAllocations, hasManualAllocations, isOpen, showAllocationSection, totalRecibido]);

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

  const handleRemoveLine = useCallback((id: string) => {
    setPaymentLines((prev) => (prev.length === 1 ? prev : prev.filter((line) => line.id !== id)));
  }, []);

  const updateLine = useCallback((id: string, field: keyof PaymentLineForm, value: string | number) => {
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
  }, []);

  const validatePayment = useCallback(
    (targetMode: PaymentCollectionMode = mode) => {
      if (targetMode === 'credito') {
        return true;
      }

      if (paymentLines.length === 0) {
        setErrorMessage('Agrega al menos un método de pago.');
        return false;
      }

      const invalidLine = paymentLines.find((line) => !line.method || !line.amount || line.amount <= 0);
      if (invalidLine) {
        setErrorMessage('Cada método necesita un monto mayor a 0.');
        return false;
      }

      if (Math.abs(diferencia) > tolerance) {
        setErrorMessage('La suma de los montos debe coincidir con el total.');
        return false;
      }

      if (showAllocationSection) {
        if (!allocationDrafts.length) {
          setErrorMessage('Distribuye el monto recibido entre las cuotas.');
          return false;
        }

        if (Math.abs(totalAllocationAmount - totalRecibido) > tolerance) {
          setErrorMessage('La distribución debe coincidir con el monto recibido.');
          return false;
        }
      }

      setErrorMessage(null);
      return true;
    },
    [allocationDrafts.length, diferencia, mode, paymentLines, showAllocationSection, totalAllocationAmount, totalRecibido],
  );

  const handleModeChange = useCallback(
    (target: PaymentCollectionMode) => {
      if (target === mode) {
        return;
      }

      if (target === 'credito') {
        if (!hasCreditSchedule || esBoleta) {
          setErrorMessage('Esta venta solo puede emitirse al contado.');
          setMode('contado');
          return;
        }
        setMode('credito');
        setErrorMessage(null);
        return;
      }

      if (!isCajaOpen) {
        setErrorMessage('Abre una caja para registrar cobros al contado.');
        return;
      }

      setErrorMessage(null);
      setMode('contado');
    },
    [esBoleta, hasCreditSchedule, isCajaOpen, mode],
  );

  const buildAllocationPayload = useCallback((): CreditInstallmentAllocation[] => {
    if (!allocationDrafts.length) {
      return [];
    }

    return allocationDrafts
      .map((entry) => {
        const installment = normalizedInstallments.find((item) => item.numeroCuota === entry.installmentNumber);
        if (!installment) {
          return null;
        }
        const saldo = Number(installment.saldo ?? 0);
        const remaining = Number(Math.max(0, saldo - entry.amount).toFixed(2));
        const status: CreditInstallmentAllocation['status'] = remaining <= tolerance ? 'cancelado' : 'parcial';
        return {
          installmentNumber: entry.installmentNumber,
          amount: Number(entry.amount.toFixed(2)),
          remaining,
          status,
        };
      })
      .filter(Boolean) as CreditInstallmentAllocation[];
  }, [allocationDrafts, normalizedInstallments]);

  const handleSubmit = useCallback(
    async (targetMode: PaymentCollectionMode) => {
      setErrorMessage(null);

      const enforcedMode: PaymentCollectionMode = esBoleta ? 'contado' : targetMode;

      if (enforcedMode === 'contado' && !isCajaOpen) {
        setErrorMessage('Abre una caja para registrar el cobro.');
        setMode('credito');
        return;
      }

      if (enforcedMode === 'contado' && !validatePayment(enforcedMode)) {
        return;
      }

      const requiresCollectionDocument = enforcedMode === 'contado';
      if (requiresCollectionDocument && !collectionDocumentPreview) {
        setErrorMessage('Configura una serie de cobranza activa antes de registrar pagos.');
        return;
      }

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
        allocations: enforcedMode === 'contado' ? buildAllocationPayload() : undefined,
      };

      try {
        setSubmitting(true);
        const result = await Promise.resolve(onComplete(payload));
        if (!result) {
          setErrorMessage('No se pudo completar la operación. Intenta nuevamente.');
          return;
        }

        if (payload.collectionDocument) {
          incrementSeriesCorrelative(payload.collectionDocument.seriesId, payload.collectionDocument.correlative);
        }
      } catch (submitError) {
        console.error('Error al registrar cobranza:', submitError);
        setErrorMessage('Ocurrió un error al registrar el pago. Intenta nuevamente.');
      } finally {
        setSubmitting(false);
      }
    },
    [buildAllocationPayload, cajaDestino, collectionDocumentPreview, esBoleta, fechaCobranza, incrementSeriesCorrelative, isCajaOpen, notas, onComplete, paymentLines, validatePayment],
  );

  const supportMessage =
    mode === 'contado'
      ? 'Registra el cobro ahora para actualizar el saldo pendiente.'
      : 'Emitirás la venta a crédito sin mover caja por ahora.';
  const confirmLabel = mode === 'contado' ? 'Registrar pago y emitir' : 'Emitir a crédito';
  const confirmDisabled =
    isProcessing ||
    submitting ||
    (mode === 'contado' && (!isCajaOpen || !collectionDocumentPreview)) ||
    (mode === 'credito' && !hasCreditSchedule) ||
    allocationBlocksSubmission;
  const disableBackdropClose = isProcessing || submitting;

  const handleConfirm = useCallback(() => {
    void handleSubmit(mode);
  }, [handleSubmit, mode]);

  if (!isOpen) return null;

  const canShowModeSelector = !esBoleta && hasCreditSchedule;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={disableBackdropClose ? undefined : onClose} />

      <div className="relative mx-4 flex max-h-[94vh] w-full max-w-6xl flex-col rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Cobranza de {tipoComprobante === 'factura' ? 'Factura' : 'Boleta'}
            </p>
            <h2 className="text-xl font-semibold text-slate-900">Revisa el cronograma antes de emitir</h2>
          </div>
          <button type="button" className="rounded-full p-2 text-slate-500 hover:bg-slate-100" onClick={onClose} disabled={disableBackdropClose} aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </header>

        {errorMessage && (
          <div className="mx-6 mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{errorMessage}</div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            <section className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Documento</p>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {tipoComprobante === 'factura' ? 'Factura' : 'Boleta'} · Serie {serie}
                      {numeroTemporal && <span className="ml-1 text-sm text-slate-500">({numeroTemporal})</span>}
                    </h3>
                  </div>
                  <div className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-700 shadow">Total {formatCurrency(totals.total)}</div>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
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
                    <p className="flex items-center gap-1 font-medium text-slate-900">
                      <User className="h-4 w-4 text-slate-400" />
                      {cliente?.nombre || 'Sin cliente'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Documento del cliente</p>
                    <p className="font-medium">{cliente?.documento || '—'}</p>
                  </div>
                </div>
                {productsSummary.highlighted.length > 0 && (
                  <div className="mt-4 space-y-1 text-sm text-slate-600">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Productos recientes</p>
                    {productsSummary.highlighted.map((item) => (
                      <p key={item.id} className="truncate">
                        {item.quantity} × {item.name}
                      </p>
                    ))}
                    {productsSummary.remaining > 0 && (
                      <p className="text-xs text-slate-500">+ {productsSummary.remaining} ítem(s) adicionales</p>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">{creditScheduleLabel}</p>
                    <h3 className="text-base font-semibold text-slate-900">
                      {hasCreditSchedule
                        ? `${normalizedInstallments.length} cuota${normalizedInstallments.length === 1 ? '' : 's'} programada${normalizedInstallments.length === 1 ? '' : 's'}`
                        : 'Sin cronograma definido'}
                    </h3>
                    {creditTerms?.fechaVencimientoGlobal && <p className="text-sm text-slate-500">Vence: {creditTerms.fechaVencimientoGlobal}</p>}
                  </div>
                </div>
                {hasCreditSchedule ? (
                  <CreditInstallmentsTable
                    installments={normalizedInstallments}
                    currency={currencyForFormat}
                    mode="readonly"
                    scrollMaxHeight={320}
                    showDaysOverdue
                    compact
                  />
                ) : (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Configura un cronograma de crédito para poder distribuir adelantos entre las cuotas.
                  </p>
                )}
              </div>
            </section>

            <section className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Gestión de cobranza</p>
                    <h3 className="text-base font-semibold text-slate-900">{mode === 'contado' ? 'Registrar pago' : 'Emitir sin cobro'}</h3>
                  </div>
                  {canShowModeSelector && (
                    <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 p-1 text-xs font-semibold text-slate-600">
                      {(['contado', 'credito'] as PaymentCollectionMode[]).map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => handleModeChange(option)}
                          disabled={option === 'contado' && !isCajaOpen}
                          className={`rounded-full px-3 py-1 transition ${
                            mode === option ? 'bg-white text-slate-900 shadow' : 'hover:text-slate-900'
                          } ${option === 'contado' && !isCajaOpen ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {option === 'contado' ? 'Pago al contado' : 'Pago a crédito'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-sm text-slate-600">{supportMessage}</p>
              </div>

              {mode === 'contado' ? (
                <>
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-800">Documento de cobranza</h4>
                      {!isCajaOpen && <span className="text-xs font-semibold uppercase tracking-wide text-amber-600">Caja cerrada</span>}
                    </div>
                    {cobranzasSeries.length === 0 ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        Configura una serie de cobranza activa antes de registrar pagos.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Serie
                            <select
                              value={collectionSeriesId}
                              onChange={(event) => setCollectionSeriesId(event.target.value)}
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                            >
                              {cobranzasSeries.map((seriesOption) => (
                                <option key={seriesOption.id} value={seriesOption.id}>
                                  {seriesOption.series}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Próximo número
                            <input
                              value={collectionDocumentPreview?.fullNumber ?? '—'}
                              readOnly
                              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                            />
                          </label>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Moneda
                            <input
                              value={currencyCode}
                              readOnly
                              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                            />
                          </label>
                          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Fecha de cobranza
                            <input
                              type="date"
                              value={fechaCobranza}
                              onChange={(event) => setFechaCobranza(event.target.value)}
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                            />
                          </label>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Caja destino / banco
                            <select
                              value={cajaDestino}
                              onChange={(event) => setCajaDestino(event.target.value)}
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                            >
                              {cajaOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Concepto
                            <input
                              type="text"
                              placeholder="Cobranza de venta"
                              value={notas}
                              onChange={(event) => setNotas(event.target.value)}
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-800">Métodos de pago</h4>
                      <button
                        type="button"
                        onClick={handleAddLine}
                        className="inline-flex items-center gap-2 rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
                        disabled={isProcessing}
                      >
                        <Plus className="h-4 w-4" /> Nuevo método
                      </button>
                    </div>

                    <div className="space-y-3">
                      {paymentLines.map((line, index) => {
                        const optionMeta = availablePaymentOptions.find((option) => option.id === line.method) ?? availablePaymentOptions[0];
                        const LineIcon = optionMeta?.icon ?? CreditCard;
                        return (
                          <div key={line.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                            <div className="mb-2 flex items-center justify-between text-sm text-slate-700">
                              <div className="flex items-center gap-2 font-semibold text-slate-900">
                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-600 shadow">
                                  <LineIcon className="h-4 w-4" />
                                </span>
                                Método #{index + 1}
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
                            <div className="space-y-3 text-[13px] text-slate-600">
                              <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
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
                              <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
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
                              <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                Destino / banco
                                <input
                                  type="text"
                                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none"
                                  value={line.bank ?? ''}
                                  onChange={(event) => updateLine(line.id, 'bank', event.target.value)}
                                  placeholder="Caja o banco"
                                />
                              </label>
                              <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                N° operación
                                <input
                                  type="text"
                                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none"
                                  value={line.operationNumber ?? ''}
                                  onChange={(event) => updateLine(line.id, 'operationNumber', event.target.value)}
                                  placeholder="Referencia opcional"
                                />
                              </label>
                              <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                Referencia
                                <input
                                  type="text"
                                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none"
                                  value={line.reference ?? ''}
                                  onChange={(event) => updateLine(line.id, 'reference', event.target.value)}
                                  placeholder="Voucher o comentario"
                                />
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {showAllocationSection && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Aplicar adelanto a cuotas</p>
                          <p className="text-sm text-emerald-900">Selecciona las cuotas a cancelar y distribuye el monto recibido.</p>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs font-semibold">
                          <button
                            type="button"
                            onClick={handleAutoDistributeAllocations}
                            className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-emerald-700 hover:border-emerald-300 hover:text-emerald-900"
                          >
                            Recalcular
                          </button>
                          <button
                            type="button"
                            onClick={handleResetAllocations}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600 hover:border-slate-300 hover:text-slate-800"
                          >
                            Limpiar
                          </button>
                        </div>
                      </div>
                      <CreditInstallmentsTable
                        installments={normalizedInstallments}
                        currency={currencyForFormat}
                        mode="allocation"
                        allocations={allocationDrafts}
                        onChangeAllocations={handleAllocationChange}
                        disabled={submitting || isProcessing}
                        showDaysOverdue
                        showRemainingResult
                        compact
                        scrollMaxHeight={260}
                      />
                      <div className="flex flex-wrap gap-3 text-xs font-semibold text-emerald-900">
                        <span className="rounded-full bg-white/80 px-3 py-1">Recibido: {formatCurrency(totalRecibido)}</span>
                        <span className="rounded-full bg-white/80 px-3 py-1">Distribuido: {formatCurrency(totalAllocationAmount)}</span>
                        <span className={`rounded-full px-3 py-1 ${allocationMismatch ? 'bg-amber-100 text-amber-700' : 'bg-white/80'}`}>
                          Diferencia: {formatCurrency(Math.abs(allocationDelta))}
                        </span>
                      </div>
                      {allocationStatus && (
                        <div
                          className={`rounded-xl px-3 py-2 text-xs font-medium ${
                            allocationStatus.tone === 'ok'
                              ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                              : 'border border-amber-200 bg-amber-50 text-amber-800'
                          }`}
                        >
                          {allocationStatus.text}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 p-5 text-sm text-indigo-900">
                  <p className="font-semibold">Esta venta se emitirá completamente a crédito.</p>
                  <p className="mt-2 text-indigo-900/80">
                    No se generará ningún recibo de cobranza ahora. Podrás registrar pagos desde el módulo de cobranzas cuando recibas abonos del cliente.
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>

        <footer className="border-t border-slate-200 bg-white px-6 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-3 text-sm font-semibold text-slate-700">
              <span className="rounded-full bg-slate-100 px-3 py-1">Total: {formatCurrency(totals.total)}</span>
              {mode === 'contado' && (
                <>
                  <span className="rounded-full bg-slate-100 px-3 py-1">Recibido: {formatCurrency(totalRecibido)}</span>
                  <span className={`rounded-full px-3 py-1 ${differenceChipClass}`}>
                    Diferencia: {formattedDifference}
                  </span>
                </>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={disableBackdropClose}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={confirmDisabled}
                className={`rounded-full px-5 py-2 text-sm font-semibold text-white transition ${
                  confirmDisabled
                    ? 'bg-slate-300 cursor-not-allowed'
                    : mode === 'contado'
                    ? 'bg-indigo-600 hover:bg-indigo-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
