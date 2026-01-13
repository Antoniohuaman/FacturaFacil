import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CreditCard, Plus, Trash2, X } from 'lucide-react';
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
import { useBankAccounts } from '../../../configuracion-sistema/hooks/useBankAccounts';
import { useCaja } from '../../../control-caja/context/CajaContext';
import { useCurrentEstablishmentId } from '../../../../contexts/UserSessionContext';
import { filterCollectionSeries, getNextCollectionDocument } from '../../../../shared/series/collectionSeries';
import { CreditInstallmentsTable, type CreditInstallmentAllocationInput } from '../payments/CreditInstallmentsTable';
import type { CobranzaInstallmentState } from '../../../gestion-cobranzas/models/cobranzas.types';
import { normalizeCreditTermsToInstallments, updateInstallmentsWithAllocations } from '../../../gestion-cobranzas/utils/installments';
import { getBusinessTodayISODate } from '@/shared/time/businessTime';
import { getRate } from '@/shared/currency';
import { getConfiguredPaymentMeans, type PaymentMeanOption } from '../../../../shared/payments/paymentMeans';
import { AttachmentsSection } from '../components/AttachmentsSection';
const tolerance = 0.01;
const UNSET_PAYMENT_AMOUNT = Number.NaN;
type CobranzaModalContextType = 'emision' | 'cobranzas';
const MAX_ATTACHMENT_FILES = 3;
const MAX_ATTACHMENT_SIZE_MB = 5;
const ALLOWED_ATTACHMENT_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'docx'];

const clampCurrency = (value: number) => Number(Number(value ?? 0).toFixed(2));
const buildAttachmentMetadata = (file: File) => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  return {
    name: file.name,
    size: file.size,
    type: file.type || extension || undefined,
  };
};

interface ValidateCollectedAmountInput {
  context: CobranzaModalContextType;
  totalRecibido: number;
  totalDocumento: number;
  tolerance: number;
  allowPartial?: boolean;
  targetAppliedAmount?: number;
}

const validateCollectedAmount = ({
  context,
  totalRecibido,
  totalDocumento,
  tolerance: amountTolerance,
  allowPartial = false,
  targetAppliedAmount,
}: ValidateCollectedAmountInput): string | null => {
  const received = clampCurrency(totalRecibido);
  const documentTotal = clampCurrency(totalDocumento);
  const requiredAmount = clampCurrency(typeof targetAppliedAmount === 'number' ? targetAppliedAmount : documentTotal);

  if (received <= amountTolerance) {
    return 'Ingresa un monto mayor a 0.';
  }

  if (received + amountTolerance < requiredAmount) {
    if (context === 'cobranzas' || allowPartial) {
      return 'Ingresa al menos el monto que vas a aplicar.';
    }
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

type PaymentLineForm = Omit<PaymentLineInput, 'bank' | 'reference'>;

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
  const { formatPrice, availableCurrencies } = useCurrency();
  const { state } = useConfigurationContext();
  const { cajas } = state;
  const { status: cajaStatus, aperturaActual } = useCaja();
  const isCajaOpen = cajaStatus === 'abierta';
  const currentEstablishmentId = useCurrentEstablishmentId();
  const effectiveEstablishmentId = establishmentId || currentEstablishmentId;
  const docTypeLabel = tipoComprobante === 'factura' ? 'Factura' : 'Boleta';
  const esBoleta = tipoComprobante === 'boleta';
  const isCobranzasContext = context === 'cobranzas';
  const { accounts: bankAccounts, loading: bankAccountsLoading } = useBankAccounts();
  const visibleBankAccounts = useMemo(() => bankAccounts.filter((account) => account.isVisible), [bankAccounts]);
  const bankAccountOptions = useMemo(
    () =>
      visibleBankAccounts.map((account) => {
        const currencyLabel = typeof account.currencyCode === 'string' ? account.currencyCode.toUpperCase() : account.currencyCode;
        return {
          id: account.id,
          label: `${account.bankName} - ${account.accountNumber} - ${currencyLabel}`,
        };
      }),
    [visibleBankAccounts],
  );
  const bankAccountOptionsMap = useMemo(() => new Map(bankAccountOptions.map((option) => [option.id, option])), [bankAccountOptions]);
  const hasVisibleBankAccounts = bankAccountOptions.length > 0;

  const paymentMeansOptions = useMemo<PaymentMeanOption[]>(
    () => getConfiguredPaymentMeans().filter((option) => option.isVisible),
    [],
  );

  const paymentMeansOptionsMap = useMemo(() => new Map(paymentMeansOptions.map((option) => [option.code, option])), [paymentMeansOptions]);

  const defaultPaymentMeanOption = useMemo<PaymentMeanOption | null>(() => {
    const explicitDefault = paymentMeansOptions.find((option) => option.isDefault);
    return explicitDefault ?? paymentMeansOptions[0] ?? null;
  }, [paymentMeansOptions]);

  const cobranzasSeries = useMemo(
    () => filterCollectionSeries(state.series, effectiveEstablishmentId || undefined),
    [state.series, effectiveEstablishmentId],
  );
  const [collectionSeriesId, setCollectionSeriesId] = useState('');

  const cajaOptions = useMemo(() => cajas.filter((caja) => caja.habilitada), [cajas]);

  const cajaAbierta = useMemo(() => {
    if (!aperturaActual) return undefined;
    return cajas.find((caja) => caja.id === aperturaActual.cajaId);
  }, [aperturaActual, cajas]);

  const cajaAbiertaNombre = cajaAbierta?.nombre ?? null;

  const defaultCajaDestino = useMemo(
    () => (cajaAbierta && cajaAbierta.habilitada ? cajaAbierta : cajaOptions[0] ?? null),
    [cajaAbierta, cajaOptions],
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
  const resolveInitialMethod = useCallback(() => defaultPaymentMeanOption, [defaultPaymentMeanOption]);

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
  const [fechaCobranza, setFechaCobranza] = useState(() => fechaEmision || getBusinessTodayISODate());
  const [cajaDestinoId, setCajaDestinoId] = useState<string | null>(defaultCajaDestino?.id ?? null);
  const [notas, setNotas] = useState('');
  const [bancoDocumento, setBancoDocumento] = useState('');
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string | null>(null);
  const [bankSelectionTouched, setBankSelectionTouched] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [allocationDrafts, setAllocationDrafts] = useState<CreditInstallmentAllocationInput[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentsError, setAttachmentsError] = useState<string | null>(null);

  const documentCurrencyCode = useMemo<Currency>(() => {
    const raw = (typeof moneda === 'string' ? moneda : moneda?.code) ?? 'PEN';
    return raw.toUpperCase() as Currency;
  }, [moneda]);
  const [collectionCurrencyCode, setCollectionCurrencyCode] = useState<Currency>(documentCurrencyCode);
  const [exchangeRateInput, setExchangeRateInput] = useState('1');
  const [exchangeRateValue, setExchangeRateValue] = useState(1);
  const formatCollectionCurrency = useCallback(
    (amount?: number) => formatPrice(Number(amount ?? 0), collectionCurrencyCode),
    [collectionCurrencyCode, formatPrice],
  );

  const convertCollectionToDocument = useCallback(
    (amount: number) => {
      if (!Number.isFinite(amount)) {
        return 0;
      }
      if (collectionCurrencyCode === documentCurrencyCode) {
        return clampCurrency(amount);
      }
      return clampCurrency(amount * exchangeRateValue);
    },
    [collectionCurrencyCode, documentCurrencyCode, exchangeRateValue],
  );

  const convertDocumentToCollection = useCallback(
    (amount: number) => {
      if (!Number.isFinite(amount)) {
        return 0;
      }
      if (collectionCurrencyCode === documentCurrencyCode || exchangeRateValue <= 0) {
        return clampCurrency(amount);
      }
      return clampCurrency(amount / exchangeRateValue);
    },
    [collectionCurrencyCode, documentCurrencyCode, exchangeRateValue],
  );

  const exchangeRateLocked = collectionCurrencyCode === documentCurrencyCode;
  const collectionExchangeRate = exchangeRateLocked ? 1 : exchangeRateValue;

  useEffect(() => {
    if (exchangeRateLocked) {
      setExchangeRateValue(1);
      setExchangeRateInput('1');
      return;
    }
    const referenceRate = getRate(collectionCurrencyCode, documentCurrencyCode);
    const normalizedRate = Number.isFinite(referenceRate) && referenceRate > 0 ? referenceRate : 1;
    const formattedRate = Number(normalizedRate.toFixed(6));
    setExchangeRateValue(formattedRate);
    setExchangeRateInput(formattedRate.toString());
  }, [collectionCurrencyCode, documentCurrencyCode, exchangeRateLocked]);

  const totalRecibido = useMemo(() => paymentLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0), [paymentLines]);
  const totalRecibidoDocument = useMemo(
    () => convertCollectionToDocument(totalRecibido),
    [convertCollectionToDocument, totalRecibido],
  );
  const allowAllocations = mode === 'contado' && hasCreditSchedule;
  const totalAllocationAmount = useMemo(
    () => clampCurrency(allocationDrafts.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0)),
    [allocationDrafts],
  );
  const amountToApply = useMemo(() => (allowAllocations ? totalAllocationAmount : clampCurrency(totals.total)), [allowAllocations, totalAllocationAmount, totals.total]);
  const amountToApplyInCollection = useMemo(
    () => convertDocumentToCollection(amountToApply),
    [amountToApply, convertDocumentToCollection],
  );

  const summaryDifferenceMeta = useMemo(() => {
    if (allowAllocations) {
      const deltaDocument = clampCurrency(totalRecibidoDocument - amountToApply);
      if (deltaDocument > tolerance) {
        return { label: 'Vuelto', className: 'bg-sky-100 text-sky-700', amountDocument: deltaDocument };
      }
      if (deltaDocument < -tolerance) {
        return { label: 'Falta', className: 'bg-amber-100 text-amber-800', amountDocument: Math.abs(deltaDocument) };
      }
      return { label: 'Exacto', className: 'bg-emerald-100 text-emerald-700', amountDocument: 0 };
    }

    const referenceAmountDocument = isCobranzasContext ? amountToApply : totalRecibidoDocument;
    const rawDifferenceDocument = totals.total - referenceAmountDocument;
    const differenceStatus = rawDifferenceDocument > tolerance ? 'faltante' : rawDifferenceDocument < -tolerance ? 'vuelto' : 'ajustado';
    const label = isCobranzasContext
      ? 'Saldo restante'
      : differenceStatus === 'faltante'
      ? 'Falta'
      : differenceStatus === 'vuelto'
      ? 'Vuelto'
      : 'Exacto';
    const amountDocument = clampCurrency(
      isCobranzasContext ? Math.max(0, rawDifferenceDocument) : Math.abs(rawDifferenceDocument),
    );
    const className = isCobranzasContext
      ? 'bg-slate-100 text-slate-700'
      : differenceStatus === 'ajustado'
      ? 'bg-emerald-100 text-emerald-700'
      : differenceStatus === 'faltante'
      ? 'bg-amber-100 text-amber-800'
      : 'bg-sky-100 text-sky-700';

    return { label, className, amountDocument };
  }, [allowAllocations, amountToApply, isCobranzasContext, totalRecibidoDocument, totals.total]);

  const differenceAmountForDisplay = useMemo(
    () => convertDocumentToCollection(summaryDifferenceMeta.amountDocument),
    [convertDocumentToCollection, summaryDifferenceMeta.amountDocument],
  );
  const formattedDifference = formatCollectionCurrency(differenceAmountForDisplay);
  const differenceChipClass = summaryDifferenceMeta.className;
  const differenceChipLabel = summaryDifferenceMeta.label;

  const documentSeriesMeta = useMemo(() => {
    if (!serie) {
      return null;
    }
    const normalizedSerie = serie.trim().toUpperCase();
    if (!normalizedSerie) {
      return null;
    }
    const matches = state.series.filter((seriesItem) => seriesItem.series?.toUpperCase() === normalizedSerie);
    if (!matches.length) {
      return null;
    }
    if (effectiveEstablishmentId) {
      const establishmentMatch = matches.find((match) => match.establishmentId === effectiveEstablishmentId);
      if (establishmentMatch) {
        return establishmentMatch;
      }
    }
    return matches[0];
  }, [effectiveEstablishmentId, serie, state.series]);
  const documentTypeInfo = documentSeriesMeta?.documentType;

  const formaPagoDisplay = useMemo(() => {
    if (creditPaymentMethodLabel) {
      return creditPaymentMethodLabel;
    }
    const normalized = formaPago?.trim();
    return normalized && normalized.length > 0 ? normalized : null;
  }, [creditPaymentMethodLabel, formaPago]);

  const fechaComprobanteDisplay = creditTerms?.fechaVencimientoGlobal?.trim() ? creditTerms.fechaVencimientoGlobal : null;

  const comprobanteDisplay = useMemo(() => {
    const code = documentTypeInfo?.code?.trim();
    const name = documentTypeInfo?.name?.trim();
    if (code && name) {
      return `${code} ${name}`;
    }
    if (name) {
      return name;
    }
    return docTypeLabel;
  }, [docTypeLabel, documentTypeInfo]);

  const comprobanteNumberDisplay = useMemo(() => {
    const normalizedSerie = serie?.trim().toUpperCase();
    const normalizedNumber = numeroTemporal?.trim();
    if (normalizedSerie && normalizedNumber) {
      const numberAlreadyIncludesSerie = normalizedNumber.toUpperCase().startsWith(normalizedSerie);
      if (numberAlreadyIncludesSerie) {
        return normalizedNumber;
      }
      const sanitizedNumber = normalizedNumber.replace(/^[-\s]+/, '');
      return `${normalizedSerie}-${sanitizedNumber}`;
    }
    if (normalizedSerie) {
      return normalizedSerie;
    }
    if (normalizedNumber) {
      return normalizedNumber;
    }
    return null;
  }, [numeroTemporal, serie]);

  const documentHeaderItems = useMemo(
    () => {
      const items: Array<{ key: string; label: string; value: React.ReactNode }> = [
        {
          key: 'comprobante',
          label: 'Comprobante',
          value: comprobanteDisplay,
        },
        {
          key: 'numero',
          label: 'N° Comprobante',
          value: comprobanteNumberDisplay,
        },
        {
          key: 'formaPago',
          label: 'Forma de pago',
          value: formaPagoDisplay || null,
        },
        {
          key: 'cliente',
          label: 'Cliente',
          value: cliente?.nombre || 'Sin cliente',
        },
        {
          key: 'documentoCliente',
          label: 'Documento cliente',
          value: cliente?.documento || '—',
        },
        {
          key: 'fechaEmision',
          label: 'Fecha emisión',
          value: fechaEmision,
        },
        {
          key: 'moneda',
          label: 'Moneda',
          value: documentCurrencyCode,
        },
      ];

      if (fechaComprobanteDisplay) {
        items.push({ key: 'fechaComprobante', label: 'Fecha comprobante', value: fechaComprobanteDisplay });
      }

      return items;
    }, [cliente, comprobanteDisplay, comprobanteNumberDisplay, documentCurrencyCode, fechaComprobanteDisplay, fechaEmision, formaPagoDisplay],
  );

  const handleAllocationChange = useCallback((allocations: CreditInstallmentAllocationInput[]) => {
    setAllocationDrafts(allocations);
  }, []);

  const handleClearAllocations = useCallback(() => {
    setAllocationDrafts([]);
  }, []);

  const handleAttachmentsChange = useCallback((nextFiles: File[]) => {
    setAttachments(nextFiles);
    setAttachmentsError(null);
  }, []);

  const handleAttachmentsError = useCallback((message: string | null) => {
    setAttachmentsError(message);
  }, []);

  const alignPaymentLinesWithTarget = useCallback((lines: PaymentLineForm[], targetAmount: number): PaymentLineForm[] => {
    if (!lines.length) {
      return lines;
    }

    const sanitizedTarget = clampCurrency(targetAmount);
    const baseTotal = lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);

    if (baseTotal <= tolerance) {
      return lines.map((line, index) => ({
        ...line,
        amount: index === 0 ? sanitizedTarget : 0,
      }));
    }

    let remaining = sanitizedTarget;
    const adjusted = lines.map((line, index) => {
      if (index === lines.length - 1) {
        const amount = clampCurrency(remaining);
        remaining = clampCurrency(remaining - amount);
        return { ...line, amount };
      }
      const proportion = (Number(line.amount) || 0) / baseTotal;
      const amount = clampCurrency(sanitizedTarget * proportion);
      remaining = clampCurrency(remaining - amount);
      return { ...line, amount };
    });

    if (Math.abs(remaining) > tolerance && adjusted.length) {
      const lastIndex = adjusted.length - 1;
      adjusted[lastIndex] = {
        ...adjusted[lastIndex],
        amount: clampCurrency(adjusted[lastIndex].amount + remaining),
      };
    }

    return adjusted;
  }, []);

  const buildPaymentLinesPayload = useCallback(
    (modeToSend: PaymentCollectionMode, targetAmountOverride?: number): PaymentLineInput[] => {
      if (modeToSend !== 'contado') {
        return [];
      }

      let workingLines = paymentLines.map((line) => ({
        ...line,
        amount: clampCurrency(Number(line.amount) || 0),
      }));

      const targetAmount = typeof targetAmountOverride === 'number' ? clampCurrency(targetAmountOverride) : undefined;
      const requiresAlignment =
        typeof targetAmount === 'number' &&
        Math.abs(workingLines.reduce((sum, line) => sum + (line.amount || 0), 0) - targetAmount) > tolerance;

      if (requiresAlignment && typeof targetAmount === 'number') {
        workingLines = alignPaymentLinesWithTarget(workingLines, targetAmount);
      }

      return workingLines.map((line) => ({
        id: line.id,
        method: line.method ?? '',
        methodLabel: line.methodLabel,
        amount: convertCollectionToDocument(line.amount),
        operationNumber: line.operationNumber,
      }));
    },
    [alignPaymentLinesWithTarget, convertCollectionToDocument, paymentLines],
  );

  const allocationMismatch = useMemo(() => {
    if (!allowAllocations) {
      return false;
    }
    return amountToApply - totalRecibidoDocument > tolerance;
  }, [allowAllocations, amountToApply, totalRecibidoDocument]);

  const allocationsReady = !allowAllocations || (allocationDrafts.length > 0 && !allocationMismatch);

  const allocationStatus = useMemo(() => {
    if (!allowAllocations) {
      return null;
    }
    if (allocationDrafts.length === 0) {
      return totalRecibidoDocument > tolerance
        ? ({ tone: 'warn', text: 'Selecciona al menos una cuota para aplicar el cobro.' } as const)
        : null;
    }
    if (allocationMismatch) {
      return { tone: 'warn', text: 'El monto recibido debe ser mayor o igual al monto distribuido.' } as const;
    }
    return {
      tone: 'ok',
      text: isCobranzasContext ? 'El cobro se aplicará a las cuotas seleccionadas.' : 'El adelanto se aplicará a las cuotas seleccionadas.',
    } as const;
  }, [allowAllocations, allocationDrafts.length, allocationMismatch, isCobranzasContext, totalRecibidoDocument]);

  useEffect(() => {
    if (!isOpen) return;

    const initialMethodOption = resolveInitialMethod();
    setPaymentLines([
      {
        id: 'line-1',
        method: initialMethodOption?.code ?? '',
        methodLabel: initialMethodOption?.label ?? '',
        amount: UNSET_PAYMENT_AMOUNT,
      },
    ]);
    setFechaCobranza(fechaEmision || getBusinessTodayISODate());
    setCajaDestinoId(defaultCajaDestino?.id ?? null);
    setNotas('');
    setBancoDocumento('');
    setSelectedBankAccountId(null);
    setBankSelectionTouched(false);
    setAllocationDrafts([]);
    setErrorMessage(null);
    setAttachments([]);
    setAttachmentsError(null);
    setCollectionCurrencyCode(documentCurrencyCode);
    setExchangeRateInput('1');
    setExchangeRateValue(1);
  }, [defaultCajaDestino, documentCurrencyCode, fechaEmision, isOpen, resolveInitialMethod, totals.total]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    if (selectedBankAccountId && !bankAccountOptionsMap.has(selectedBankAccountId)) {
      setSelectedBankAccountId(null);
    }
  }, [bankAccountOptionsMap, isOpen, selectedBankAccountId]);

  useEffect(() => {
    if (!isOpen || bankSelectionTouched || selectedBankAccountId) {
      return;
    }
    const preferredAccount = visibleBankAccounts.find((account) => account.isFavorite) ?? visibleBankAccounts[0];
    if (preferredAccount) {
      setSelectedBankAccountId(preferredAccount.id);
    }
  }, [bankSelectionTouched, isOpen, selectedBankAccountId, visibleBankAccounts]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    if (!selectedBankAccountId) {
      setBancoDocumento((current) => (current ? '' : current));
      return;
    }
    const selectedOption = bankAccountOptionsMap.get(selectedBankAccountId);
    const nextValue = selectedOption?.label ?? '';
    setBancoDocumento((current) => (current === nextValue ? current : nextValue));
  }, [bankAccountOptionsMap, isOpen, selectedBankAccountId]);

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

    setPaymentLines((prev) =>
      prev.map((line) => {
        const option = line.method ? paymentMeansOptionsMap.get(line.method) : null;
        if (!line.method && defaultPaymentMeanOption) {
          return {
            ...line,
            method: defaultPaymentMeanOption.code,
            methodLabel: defaultPaymentMeanOption.label,
          };
        }
        if (option && option.label !== line.methodLabel) {
          return {
            ...line,
            methodLabel: option.label,
          };
        }
        return line;
      }),
    );
  }, [defaultPaymentMeanOption, isOpen, paymentMeansOptionsMap]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    if (cajaAbierta && cajaAbierta.habilitada) {
      setCajaDestinoId(cajaAbierta.id);
    }
  }, [cajaAbierta, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    if (!allowAllocations && allocationDrafts.length) {
      setAllocationDrafts([]);
    }
  }, [allowAllocations, allocationDrafts.length, isOpen]);

  const handleAddLine = useCallback(() => {
    const defaultOption = resolveInitialMethod();
    setPaymentLines((prev) => [
      ...prev,
      {
        id: `line-${Date.now()}`,
        method: defaultOption?.code ?? '',
        methodLabel: defaultOption?.label ?? '',
        amount: UNSET_PAYMENT_AMOUNT,
      },
    ]);
  }, [resolveInitialMethod]);

  const handleRemoveLine = useCallback((id: string) => {
    setPaymentLines((prev) => (prev.length === 1 ? prev : prev.filter((line) => line.id !== id)));
  }, []);

  const updateLine = useCallback((id: string, field: keyof PaymentLineForm, value: string | number) => {
    setPaymentLines((prev) =>
      prev.map((line) => {
        if (line.id !== id) {
          return line;
        }

        if (field === 'amount') {
          return { ...line, amount: Number(value) };
        }

        if (field === 'method') {
          const nextMethod = typeof value === 'string' ? value : String(value);
          const option = nextMethod ? paymentMeansOptionsMap.get(nextMethod) : undefined;
          return {
            ...line,
            method: nextMethod,
            methodLabel: option?.label ?? '',
          };
        }

        return {
          ...line,
          [field]: value,
        };
      }),
    );
  }, [paymentMeansOptionsMap]);

  const validatePayment = useCallback(
    (targetMode: PaymentCollectionMode = mode) => {
      if (targetMode === 'credito') {
        return true;
      }

      if (paymentLines.length === 0) {
        setErrorMessage('Agrega al menos un método de pago.');
        return false;
      }

      const invalidLine = paymentLines.find((line) => !Number.isFinite(line.amount) || line.amount <= 0);
      if (invalidLine) {
        setErrorMessage('Cada método necesita un monto mayor a 0.');
        return false;
      }

      const amountValidationError = validateCollectedAmount({
        context,
        totalRecibido: totalRecibidoDocument,
        totalDocumento: totals.total,
        tolerance,
        allowPartial: allowAllocations && !isCobranzasContext,
        targetAppliedAmount: amountToApply,
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

        if (amountToApply - totalRecibidoDocument > tolerance) {
          setErrorMessage('El monto recibido debe ser mayor o igual al monto distribuido.');
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
    [allowAllocations, allocationDrafts, amountToApply, cobranzaInstallmentsSnapshot, context, isCobranzasContext, mode, paymentLines, totalRecibidoDocument, totals.total],
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

      const enforcedMode: PaymentCollectionMode = targetMode;

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

      const attachmentsPayload = attachments.length ? attachments.map((file) => buildAttachmentMetadata(file)) : undefined;

      const resolvedCajaDestinoId = enforcedMode === 'contado' ? cajaDestinoId ?? cajaAbierta?.id ?? null : null;
      const resolvedCajaDestinoLabel = (() => {
        if (enforcedMode !== 'contado') return undefined;
        const found = cajas.find((caja) => caja.id === resolvedCajaDestinoId);
        return found?.nombre ?? undefined;
      })();

      const payload: PaymentCollectionPayload = {
        mode: enforcedMode,
        lines:
          enforcedMode === 'contado'
            ? buildPaymentLinesPayload(enforcedMode, amountToApplyInCollection)
            : [],
        cajaDestino: resolvedCajaDestinoLabel,
        cajaDestinoId: resolvedCajaDestinoId ?? undefined,
        cajaDestinoLabel: resolvedCajaDestinoLabel,
        fechaCobranza: enforcedMode === 'contado' ? fechaCobranza || undefined : undefined,
        notes: notas || undefined,
        collectionDocument:
          enforcedMode === 'contado' && collectionDocumentPreview
            ? {
                ...collectionDocumentPreview,
                issuedAt: fechaCobranza || getBusinessTodayISODate(),
              }
            : undefined,
        allocations: enforcedMode === 'contado' ? buildAllocationPayload() : undefined,
        attachments: attachmentsPayload,
        collectionCurrency: collectionCurrencyCode,
        collectionExchangeRate,
      };

      try {
        setSubmitting(true);
        const result = await Promise.resolve(onComplete(payload));
        if (!result) {
          setErrorMessage('No se pudo completar la operación. Intenta nuevamente.');
          return;
        }

      } catch (submitError) {
        console.error('Error al registrar cobranza:', submitError);
        setErrorMessage('Ocurrió un error al registrar el pago. Intenta nuevamente.');
      } finally {
        setSubmitting(false);
      }
    },
    [amountToApplyInCollection, attachments, buildAllocationPayload, buildPaymentLinesPayload, cajaAbierta, cajaDestinoId, cajas, collectionCurrencyCode, collectionDocumentPreview, collectionExchangeRate, fechaCobranza, isCajaOpen, notas, onComplete, validatePayment],
  );

  const cobrarButtonLabel = 'COBRAR';
  const cobrarDisabled =
    isProcessing ||
    submitting ||
    mode !== 'contado' ||
    !isCajaOpen ||
    !collectionDocumentPreview ||
    !allocationsReady;
  const disableBackdropClose = isProcessing || submitting;

  const handleCobrar = useCallback(() => {
    void handleSubmit('contado');
  }, [handleSubmit]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={disableBackdropClose ? undefined : onClose} />

      <div className="relative mx-4 flex max-h-[94vh] w-full max-w-6xl flex-col rounded-xl border border-slate-100 bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
          <div className="leading-none">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Cobranza de {docTypeLabel}</p>
            <h2 className="text-[16px] font-semibold text-slate-900">{''}</h2>
          </div>
          <button type="button" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100" onClick={onClose} disabled={disableBackdropClose} aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </header>

        {errorMessage && (
          <div className="mx-4 mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</div>
        )}

        <div className="flex-1 min-h-0 px-4 py-3">
          <div className="flex h-full min-h-0 flex-col gap-3">
            <section className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex flex-col gap-4">
                <div className="flex min-w-0 flex-col gap-2 border-b border-slate-100 pb-3">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-600 sm:grid-cols-4">
                    {documentHeaderItems.map((item) => (
                      <div key={item.key} className="space-y-0.5">
                        <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</dt>
                        <dd className="font-medium text-slate-900">{item.value ?? '—'}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <div className="flex min-h-0 flex-col gap-2" aria-label={creditScheduleLabel || undefined}>
                  {hasCreditSchedule ? (
                    <>
                      <div className="min-h-0">
                        <CreditInstallmentsTable
                          installments={normalizedInstallments}
                          currency={documentCurrencyCode}
                          mode={allowAllocations ? 'allocation' : 'readonly'}
                          allocations={allowAllocations ? allocationDrafts : undefined}
                          onChangeAllocations={allowAllocations ? handleAllocationChange : undefined}
                          disabled={!allowAllocations || submitting || isProcessing}
                          scrollMaxHeight={220}
                          showDaysOverdue
                          showRemainingResult={allowAllocations}
                          compact
                        />
                      </div>
                      {allowAllocations && (
                        <div className="mt-1 text-[11px]">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {allocationStatus && (
                              <div
                                className={`rounded-md px-2.5 py-0.5 font-semibold leading-tight ${
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
                              className="ml-auto text-[11px] font-semibold text-slate-500 underline-offset-2 hover:text-slate-900"
                              disabled={allocationDrafts.length === 0}
                            >
                              Limpiar selección
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    mode === 'contado' ? null : (
                      <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                        Configura un cronograma de crédito para poder distribuir adelantos entre las cuotas.
                      </p>
                    )
                  )}
                </div>
              </div>
            </section>

            {mode === 'contado' ? (
              <div className="grid flex-1 min-h-0 grid-cols-1 gap-3 lg:grid-cols-2">
                <section className="flex min-h-0 flex-col rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-slate-800">Medios de pago</h4>
                    <button
                      type="button"
                      onClick={handleAddLine}
                      className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-slate-300 px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
                      disabled={isProcessing}
                    >
                      <Plus className="h-4 w-4" /> Agregar Medio
                    </button>
                  </div>
                  <div className="mt-2 flex min-h-0 flex-col">
                    <div className="flex-1 overflow-hidden">
                      <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                        {paymentLines.map((line, index) => {
                          const LineIcon = CreditCard;
                          const hasPaymentMeans = paymentMeansOptions.length > 0;
                          const methodSelectId = `payment-method-${line.id}`;
                          const amountInputId = `payment-amount-${line.id}`;
                          const operationInputId = `payment-operation-${line.id}`;
                          return (
                            <div key={line.id} className="rounded-md border border-slate-200 bg-slate-50 p-2">
                              <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
                                <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                  <LineIcon className="h-3.5 w-3.5 text-slate-500" />
                                  #{index + 1}
                                </span>
                                <div className="flex flex-1 flex-wrap items-center gap-2 md:flex-nowrap">
                                  <div className="min-w-[150px] flex-1">
                                    <label className="sr-only" htmlFor={methodSelectId}>
                                      Medio de pago
                                    </label>
                                    <select
                                      id={methodSelectId}
                                      className="h-9 w-full rounded border border-slate-200 bg-white px-2 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none"
                                      value={line.method ?? ''}
                                      onChange={(event) => updateLine(line.id, 'method', event.target.value)}
                                      disabled={!hasPaymentMeans}
                                      aria-label="Medio de pago"
                                    >
                                      {!hasPaymentMeans ? (
                                        <option value="">Sin opciones disponibles</option>
                                      ) : (
                                        paymentMeansOptions.map((option) => (
                                          <option key={option.code} value={option.code}>
                                            {option.label}
                                          </option>
                                        ))
                                      )}
                                    </select>
                                  </div>
                                  <div className="w-full min-w-[110px] md:w-28">
                                    <label className="sr-only" htmlFor={amountInputId}>
                                      Monto
                                    </label>
                                    <input
                                      id={amountInputId}
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      className="h-9 w-full rounded border border-slate-200 px-2 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none"
                                      value={Number.isNaN(line.amount) ? '' : line.amount}
                                      onChange={(event) => updateLine(line.id, 'amount', Number(event.target.value))}
                                      placeholder="Monto"
                                      aria-label="Monto"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-[150px]">
                                    <label className="sr-only" htmlFor={operationInputId}>
                                      N° operación
                                    </label>
                                    <input
                                      id={operationInputId}
                                      type="text"
                                      className="h-9 w-full rounded border border-slate-200 px-2 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none"
                                      value={line.operationNumber ?? ''}
                                      onChange={(event) => updateLine(line.id, 'operationNumber', event.target.value)}
                                      placeholder="Ingresa el número o referencia"
                                      aria-label="N° operación"
                                    />
                                  </div>
                                </div>
                                {paymentLines.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveLine(line.id)}
                                    className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-white hover:text-slate-600"
                                    aria-label="Eliminar medio"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="flex min-h-0 flex-col rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-slate-800">Documento de cobranza</h4>
                    {!isCajaOpen && <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Caja cerrada</span>}
                  </div>
                  <div className="mt-2 flex min-h-0 flex-col text-xs text-slate-700">
                    {cobranzasSeries.length === 0 ? (
                      <div className="flex-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        Configura una serie de cobranza activa antes de registrar pagos.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,120px)_minmax(0,1fr)_minmax(0,190px)]">
                          <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            Serie
                            <select
                              value={collectionSeriesId}
                              onChange={(event) => setCollectionSeriesId(event.target.value)}
                              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
                            >
                              {cobranzasSeries.map((seriesOption) => (
                                <option key={seriesOption.id} value={seriesOption.id}>
                                  {seriesOption.series}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            Próximo número
                            <input
                              value={collectionDocumentPreview?.fullNumber ?? '—'}
                              readOnly
                              className="mt-1 w-full rounded-md border border-slate-100 bg-slate-50 px-2 py-1.5 text-sm font-semibold text-slate-800"
                            />
                          </label>
                          <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            Caja Destino
                            {cajaAbiertaNombre ? (
                              <div className="mt-1 space-y-1">
                                <input
                                  value={cajaAbiertaNombre}
                                  readOnly
                                  className="w-full rounded-md border border-slate-100 bg-slate-50 px-2 py-1.5 text-sm font-semibold text-slate-800"
                                />
                                <span className="text-[10px] font-medium text-emerald-700">Este cobro irá a tu caja abierta.</span>
                              </div>
                            ) : (
                              <select
                                value={cajaDestinoId ?? ''}
                                onChange={(event) => setCajaDestinoId(event.target.value || null)}
                                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
                              >
                                {cajaOptions.map((option) => (
                                  <option key={option.id} value={option.id}>
                                    {option.nombre}
                                  </option>
                                ))}
                              </select>
                            )}
                          </label>
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,130px)_minmax(0,1fr)_minmax(0,170px)]">
                          <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            Moneda
                            {availableCurrencies.length <= 1 ? (
                              <input
                                value={collectionCurrencyCode}
                                readOnly
                                className="mt-1 w-full rounded-md border border-slate-100 bg-slate-50 px-2 py-1.5 text-sm font-semibold text-slate-800"
                              />
                            ) : (
                              <select
                                value={collectionCurrencyCode}
                                onChange={(event) => setCollectionCurrencyCode(event.target.value as Currency)}
                                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
                              >
                                {availableCurrencies.map((option) => (
                                  <option key={option.code} value={option.code}>
                                    {option.symbol} {option.code}
                                  </option>
                                ))}
                              </select>
                            )}
                          </label>
                          <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            Tipo de Cambio
                            <div className="mt-1 flex items-center gap-1">
                              <span className="text-[11px] text-slate-600">1 {collectionCurrencyCode}</span>
                              <span className="text-[11px] text-slate-600">=</span>
                              <input
                                type="text"
                                value={exchangeRateLocked ? '1' : exchangeRateInput}
                                onChange={(event) => {
                                  if (exchangeRateLocked) {
                                    return;
                                  }
                                  const rawValue = event.target.value;
                                  setExchangeRateInput(rawValue);
                                  const normalized = rawValue.replace(',', '.');
                                  const parsed = Number(normalized);
                                  if (Number.isFinite(parsed) && parsed > 0) {
                                    setExchangeRateValue(parsed);
                                  }
                                }}
                                disabled={exchangeRateLocked}
                                className={`w-full rounded-md border px-2 py-1.5 text-sm text-slate-900 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 appearance-none ${
                                  exchangeRateLocked ? 'border-slate-100 bg-slate-50' : 'border-slate-200'
                                }`}
                              />
                              <span className="text-[11px] text-slate-600">{documentCurrencyCode}</span>
                            </div>
                          </label>
                          <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            Fecha de cobranza
                            <input
                              type="date"
                              value={fechaCobranza}
                              onChange={(event) => setFechaCobranza(event.target.value)}
                              className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-900 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
                            />
                          </label>
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                          <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            Bancos
                            <select
                              value={selectedBankAccountId ?? ''}
                              onChange={(event) => {
                                const nextValue = event.target.value;
                                setSelectedBankAccountId(nextValue || null);
                                setBankSelectionTouched(true);
                              }}
                              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
                              disabled={!hasVisibleBankAccounts}
                              title={bancoDocumento || 'Sin banco'}
                            >
                              <option value="">Sin banco</option>
                              {bankAccountOptions.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            {!hasVisibleBankAccounts ? (
                              <span className="mt-1 block text-[10px] font-medium text-amber-700">
                                No hay cuentas bancarias visibles. Configuralas en Informacion bancaria.
                              </span>
                            ) : (
                              bankAccountsLoading && (
                                <span className="mt-1 block text-[10px] text-slate-500">Actualizando cuentas bancarias...</span>
                              )
                            )}
                          </label>
                          <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            Concepto
                            <textarea
                              rows={2}
                              placeholder="Cobranza de venta"
                              value={notas}
                              onChange={(event) => setNotas(event.target.value)}
                              className="mt-1 w-full resize-y rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-900 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 min-h-[44px] max-h-24"
                            ></textarea>
                          </label>
                        </div>
                        <div>
                          <AttachmentsSection
                            title="Adjuntos"
                            files={attachments}
                            onChange={handleAttachmentsChange}
                            onErrorChange={handleAttachmentsError}
                            errorMessage={attachmentsError}
                            maxFiles={MAX_ATTACHMENT_FILES}
                            maxFileSizeMb={MAX_ATTACHMENT_SIZE_MB}
                            allowedExtensions={ALLOWED_ATTACHMENT_EXTENSIONS}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            ) : (
              <div className="rounded-lg border border-indigo-200 bg-indigo-50/80 px-3 py-2.5 text-sm text-indigo-900">
                <p className="font-semibold">Esta venta se emitirá completamente a crédito.</p>
                <p className="mt-1 text-indigo-900/80">
                  No se generará ningún recibo de cobranza ahora. Podrás registrar pagos desde el módulo de cobranzas cuando recibas abonos del cliente.
                </p>
              </div>
            )}
          </div>
        </div>

        <footer className="border-t border-slate-200 bg-white px-4 py-2">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-700">
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-0.5">Total {formatCollectionCurrency(amountToApplyInCollection)}</span>
              {mode === 'contado' && (
                <>
                  <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-0.5">Recibido {formatCollectionCurrency(totalRecibido)}</span>
                  <span className={`rounded-md border px-2.5 py-0.5 ${differenceChipClass}`}>
                    {differenceChipLabel} {formattedDifference}
                  </span>
                </>
              )}
            </div>
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={disableBackdropClose}
                className="rounded-md border border-slate-200 px-3.5 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCobrar}
                disabled={cobrarDisabled}
                className={`rounded-md px-4 py-1.5 text-sm font-semibold text-white transition ${
                  cobrarDisabled ? 'bg-slate-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {cobrarButtonLabel}
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
