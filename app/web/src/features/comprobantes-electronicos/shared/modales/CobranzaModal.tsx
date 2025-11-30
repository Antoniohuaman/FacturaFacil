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
  CreditInstallmentStatus,
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
import type { CobranzaInstallmentState } from '../../../gestion-cobranzas/models/cobranzas.types';
import { normalizeCreditTermsToInstallments, updateInstallmentsWithAllocations } from '../../../gestion-cobranzas/utils/installments';

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
type CobranzaModalContextType = 'emision' | 'cobranzas';

const clampCurrency = (value: number) => Number(Number(value ?? 0).toFixed(2));

interface ValidateCollectedAmountInput {
  context: CobranzaModalContextType;
  totalRecibido: number;
  totalDocumento: number;
  tolerance: number;
}

const validateCollectedAmount = ({ context, totalRecibido, totalDocumento, tolerance: amountTolerance }: ValidateCollectedAmountInput): string | null => {
  const received = clampCurrency(totalRecibido);
  const documentTotal = clampCurrency(totalDocumento);

  if (context === 'cobranzas') {
    if (received <= amountTolerance) {
      return 'Ingresa un monto mayor a 0.';
    }
    if (received - documentTotal > amountTolerance) {
      return 'No puedes cobrar más que el saldo pendiente.';
    }
    return null;
  }

  if (Math.abs(documentTotal - received) > amountTolerance) {
    return 'La suma de los montos debe coincidir con el total.';
  }

  return null;
};

interface AllocationValidationInput {
  installments: CobranzaInstallmentState[];
  allocations: CreditInstallmentAllocationInput[];
}

const validateAllocationsLimits = ({ installments, allocations }: AllocationValidationInput): string | null => {
  if (!allocations.length) {
    return null;
  }

  if (!installments.length) {
    return 'Configura un cronograma de cuotas antes de distribuir el pago.';
  }

  const normalizedAllocations: CreditInstallmentAllocation[] = allocations.map((allocation) => ({
    installmentNumber: allocation.installmentNumber,
    amount: clampCurrency(allocation.amount),
  }));

  const beforeMap = new Map<number, number>(
    installments.map((installment) => [installment.installmentNumber, clampCurrency(installment.remaining)]),
  );
  const updatedInstallments = updateInstallmentsWithAllocations(
    installments.map((installment) => ({ ...installment })),
    normalizedAllocations,
  );
  const afterMap = new Map<number, number>(
    updatedInstallments.map((installment) => [installment.installmentNumber, clampCurrency(installment.remaining)]),
  );

  for (const allocation of normalizedAllocations) {
    const before = beforeMap.get(allocation.installmentNumber) ?? 0;
    const after = afterMap.get(allocation.installmentNumber) ?? before;
    const applied = clampCurrency(before - after);
    if (allocation.amount - applied > tolerance) {
      return `El monto aplicado a la cuota ${allocation.installmentNumber} supera el saldo disponible.`;
    }
  }

  return null;
};

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
  installmentsState?: CobranzaInstallmentState[];
  context?: CobranzaModalContextType;
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

const computeDiasCreditoFromDates = (issueDate: string, dueDate?: string) => {
  if (!issueDate || !dueDate) {
    return 0;
  }
  const issue = new Date(`${issueDate}T00:00:00`);
  const due = new Date(`${dueDate}T00:00:00`);
  if (Number.isNaN(issue.getTime()) || Number.isNaN(due.getTime())) {
    return 0;
  }
  const diff = Math.round((due.getTime() - issue.getTime()) / (1000 * 60 * 60 * 24));
  return diff < 0 ? 0 : diff;
};

const normalizeInstallmentStatus = (status?: CobranzaInstallmentState['status']): CreditInstallmentStatus => {
  switch (status) {
    case 'CANCELADA':
      return 'cancelado';
    case 'PARCIAL':
      return 'parcial';
    default:
      return 'pendiente';
  }
};

const mapCobranzaInstallmentToSchedule = (
  installment: CobranzaInstallmentState,
  options: {
    reference?: ComprobanteCreditInstallment;
    totalOriginalAmount: number;
    issueDate: string;
  },
): ComprobanteCreditInstallment => {
  const { reference, totalOriginalAmount, issueDate } = options;
  const importe = Number(installment.amountOriginal.toFixed(2));
  const porcentajeBase = reference?.porcentaje ?? (totalOriginalAmount > 0 ? Number(((importe / totalOriginalAmount) * 100).toFixed(2)) : 0);
  const fechaVencimiento = installment.dueDate || reference?.fechaVencimiento || '';
  const diasCredito = reference?.diasCredito ?? computeDiasCreditoFromDates(issueDate, fechaVencimiento);

  return {
    numeroCuota: installment.installmentNumber,
    diasCredito,
    porcentaje: porcentajeBase,
    fechaVencimiento,
    importe,
    pagado: Number(installment.amountPaid.toFixed(2)),
    saldo: Number(installment.remaining.toFixed(2)),
    estado: reference?.estado ?? normalizeInstallmentStatus(installment.status),
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
  installmentsState,
  context = 'emision',
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
  const isCobranzasContext = context === 'cobranzas';

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

  const cobranzaInstallmentsSnapshot = useMemo<CobranzaInstallmentState[]>(() => {
    if (installmentsState?.length) {
      return installmentsState.map((installment) => ({ ...installment }));
    }
    return normalizeCreditTermsToInstallments(creditTerms);
  }, [creditTerms, installmentsState]);

  const referenceInstallmentsMap = useMemo(() => {
    if (!creditTerms?.schedule?.length) {
      return new Map<number, ComprobanteCreditInstallment>();
    }
    return new Map(creditTerms.schedule.map((installment) => [installment.numeroCuota, sanitizeInstallment(installment)]));
  }, [creditTerms]);

  const normalizedInstallments = useMemo(() => {
    if (cobranzaInstallmentsSnapshot.length) {
      const totalFromState = cobranzaInstallmentsSnapshot.reduce((sum, installment) => sum + Number(installment.amountOriginal || 0), 0);
      const totalFromReference = referenceInstallmentsMap.size
        ? Array.from(referenceInstallmentsMap.values()).reduce((sum, installment) => sum + Number(installment.importe || 0), 0)
        : 0;
      const totalOriginalAmount = totalFromState || totalFromReference || totals.total || 1;

      return cobranzaInstallmentsSnapshot.map((installment) =>
        mapCobranzaInstallmentToSchedule(installment, {
          reference: referenceInstallmentsMap.get(installment.installmentNumber),
          totalOriginalAmount,
          issueDate: fechaEmision,
        }),
      );
    }

    return (creditTerms?.schedule ?? []).map(sanitizeInstallment);
  }, [cobranzaInstallmentsSnapshot, creditTerms?.schedule, fechaEmision, referenceInstallmentsMap, totals.total]);
  const hasCreditSchedule = normalizedInstallments.length > 0;
  const installmentsCounters = useMemo(() => {
    if (!cobranzaInstallmentsSnapshot.length) {
      return null;
    }
    const pending = cobranzaInstallmentsSnapshot.filter((installment) => installment.remaining > tolerance).length;
    const partial = cobranzaInstallmentsSnapshot.filter((installment) => installment.status === 'PARCIAL').length;
    return {
      pending,
      partial,
      total: cobranzaInstallmentsSnapshot.length,
      canceled: cobranzaInstallmentsSnapshot.length - pending,
    };
  }, [cobranzaInstallmentsSnapshot]);
  const creditScheduleLabel = installmentsCounters
    ? `${creditPaymentMethodLabel || 'Pago a crédito'} · Cuotas pendientes ${installmentsCounters.pending}/${installmentsCounters.total}`
    : creditPaymentMethodLabel || (hasCreditSchedule ? 'Pago a crédito' : 'Sin cronograma definido');

  const mode: PaymentCollectionMode = useMemo(() => {
    if (isCobranzasContext) {
      return 'contado';
    }
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
  }, [esBoleta, hasCreditSchedule, isCajaOpen, isCobranzasContext, modeIntent]);
  const [paymentLines, setPaymentLines] = useState<PaymentLineForm[]>([]);
  const [fechaCobranza, setFechaCobranza] = useState(() => fechaEmision || new Date().toISOString().split('T')[0]);
  const [cajaDestino, setCajaDestino] = useState(defaultCajaDestino);
  const [notas, setNotas] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [allocationDrafts, setAllocationDrafts] = useState<CreditInstallmentAllocationInput[]>([]);

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
  const differenceValue = isCobranzasContext ? Math.max(0, diferencia) : Math.abs(diferencia);
  const formattedDifference = formatCurrency(differenceValue);
  const differenceStatus = diferencia > tolerance ? 'faltante' : diferencia < -tolerance ? 'vuelto' : 'ajustado';
  const differenceChipClass = isCobranzasContext
    ? 'bg-slate-100 text-slate-700'
    : differenceStatus === 'ajustado'
    ? 'bg-emerald-100 text-emerald-700'
    : differenceStatus === 'faltante'
    ? 'bg-amber-100 text-amber-800'
    : 'bg-sky-100 text-sky-700';
  const differenceChipLabel = isCobranzasContext ? 'Saldo restante' : 'Diferencia';

  const allowAllocations = mode === 'contado' && hasCreditSchedule;

  const handleAllocationChange = useCallback((allocations: CreditInstallmentAllocationInput[]) => {
    setAllocationDrafts(allocations);
  }, []);

  const handleClearAllocations = useCallback(() => {
    setAllocationDrafts([]);
  }, []);

  const totalAllocationAmount = useMemo(
    () => allocationDrafts.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0),
    [allocationDrafts],
  );
  const allocationDelta = useMemo(
    () => clampCurrency(totalRecibido - totalAllocationAmount),
    [totalAllocationAmount, totalRecibido],
  );

  const allocationsReady = !allowAllocations || (allocationDrafts.length > 0 && Math.abs(allocationDelta) <= tolerance);

  const allocationStatus = useMemo(() => {
    if (!allowAllocations) {
      return null;
    }
    if (allocationDrafts.length === 0) {
      return totalRecibido > tolerance
        ? ({ tone: 'warn', text: 'Selecciona al menos una cuota para aplicar el cobro.' } as const)
        : null;
    }
    if (Math.abs(allocationDelta) > tolerance) {
      return { tone: 'warn', text: 'El monto distribuido debe coincidir con el monto recibido.' } as const;
    }
    return { tone: 'ok', text: 'El adelanto se aplicará a las cuotas seleccionadas.' } as const;
  }, [allowAllocations, allocationDelta, allocationDrafts.length, totalRecibido]);

  useEffect(() => {
    if (!isOpen) return;

    const initialMethodId = resolveInitialMethod();
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
    setErrorMessage(null);
  }, [defaultCajaDestino, fechaEmision, isOpen, resolveInitialMethod, totals.total]);

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
    if (!allowAllocations && allocationDrafts.length) {
      setAllocationDrafts([]);
    }
  }, [allowAllocations, allocationDrafts.length, isOpen]);

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

      const amountValidationError = validateCollectedAmount({
        context,
        totalRecibido,
        totalDocumento: totals.total,
        tolerance,
      });
      if (amountValidationError) {
        setErrorMessage(amountValidationError);
        return false;
      }

      if (allowAllocations) {
        if (!allocationDrafts.length) {
          setErrorMessage('Distribuye el monto recibido entre las cuotas.');
          return false;
        }

        if (Math.abs(totalAllocationAmount - totalRecibido) > tolerance) {
          setErrorMessage('La distribución debe coincidir con el monto recibido.');
          return false;
        }

        const allocationLimitError = validateAllocationsLimits({
          installments: cobranzaInstallmentsSnapshot,
          allocations: allocationDrafts,
        });
        if (allocationLimitError) {
          setErrorMessage(allocationLimitError);
          return false;
        }
      }

      setErrorMessage(null);
      return true;
    },
    [allowAllocations, allocationDrafts, cobranzaInstallmentsSnapshot, context, mode, paymentLines, totalAllocationAmount, totalRecibido, totals.total],
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
        const amountToApply = clampCurrency(Math.min(saldo, entry.amount));
        const remaining = clampCurrency(Math.max(0, saldo - amountToApply));
        const status: CreditInstallmentAllocation['status'] = remaining <= tolerance ? 'cancelado' : 'parcial';
        return {
          installmentNumber: entry.installmentNumber,
          amount: amountToApply,
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
    !allocationsReady;
  const disableBackdropClose = isProcessing || submitting;

  const handleConfirm = useCallback(() => {
    void handleSubmit(mode);
  }, [handleSubmit, mode]);

  if (!isOpen) return null;

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
                    {installmentsCounters && (
                      <p className="text-xs text-slate-500">
                        Pendientes {installmentsCounters.pending} · Parciales {installmentsCounters.partial} · Canceladas {installmentsCounters.canceled}
                      </p>
                    )}
                    {creditTerms?.fechaVencimientoGlobal && <p className="text-sm text-slate-500">Vence: {creditTerms.fechaVencimientoGlobal}</p>}
                  </div>
                </div>
                {hasCreditSchedule ? (
                  <>
                    <CreditInstallmentsTable
                      installments={normalizedInstallments}
                      currency={currencyForFormat}
                      mode={allowAllocations ? 'allocation' : 'readonly'}
                      allocations={allowAllocations ? allocationDrafts : undefined}
                      onChangeAllocations={allowAllocations ? handleAllocationChange : undefined}
                      disabled={!allowAllocations || submitting || isProcessing}
                      scrollMaxHeight={320}
                      showDaysOverdue
                      showRemainingResult={allowAllocations}
                      compact
                    />
                    {allowAllocations && (
                      <div className="mt-4 space-y-3">
                        <div className="flex flex-wrap gap-3 text-xs font-semibold text-emerald-900">
                          <span className="rounded-full bg-emerald-50 px-3 py-1">Recibido: {formatCurrency(totalRecibido)}</span>
                          <span className="rounded-full bg-emerald-50 px-3 py-1">Distribuido: {formatCurrency(totalAllocationAmount)}</span>
                          <span className="rounded-full bg-emerald-50 px-3 py-1">Diferencia: {formatCurrency(Math.abs(allocationDelta))}</span>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                          {allocationStatus && (
                            <div
                              className={`rounded-xl px-3 py-2 font-semibold ${
                                allocationStatus.tone === 'ok'
                                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : 'border border-amber-200 bg-amber-50 text-amber-700'
                              }`}
                            >
                              {allocationStatus.text}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={handleClearAllocations}
                            className="ml-auto text-xs font-semibold text-slate-500 hover:text-slate-900"
                            disabled={allocationDrafts.length === 0}
                          >
                            Limpiar selección
                          </button>
                        </div>
                      </div>
                    )}
                  </>
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
                    {differenceChipLabel}: {formattedDifference}
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
