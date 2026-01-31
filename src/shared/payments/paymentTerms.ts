import {
  ensureBusinessDateIso,
  getBusinessTodayISODate,
  shiftBusinessDate,
} from '@/shared/time/businessTime';

export type PaymentCondition = 'CONTADO' | 'CREDITO';

export interface CreditInstallmentTemplate {
  diasCredito: number;
  porcentaje: number;
}

export type ModoCronogramaCredito = 'plantilla' | 'calendario';

export interface CuotaCalendarioCredito {
  fechaVencimientoISO: string;
  monto: number;
}

export type DefinicionCronogramaCredito =
  | { modo: 'plantilla'; plantilla: CreditInstallmentDefinition[] }
  | { modo: 'calendario'; calendario: CuotaCalendarioCredito[] };

export type CreditInstallmentDefinition = CreditInstallmentTemplate;

export type CreditInstallmentStatus = 'pendiente' | 'parcial' | 'cancelado';

export interface CreditInstallmentPaymentTrace {
  id: string;
  amount: number;
  date: string;
  method?: string;
  reference?: string;
}

export interface CreditInstallment extends CreditInstallmentTemplate {
  numeroCuota: number;
  fechaVencimiento: string;
  importe: number;
  pagado?: number;
  saldo?: number;
  estado?: CreditInstallmentStatus;
  pagos?: CreditInstallmentPaymentTrace[];
}

export interface CreditSchedule {
  cuotas: CreditInstallment[];
  totalPorcentaje: number;
  fechaVencimientoGlobal: string;
}

export interface PaymentTermsPayload {
  condition: PaymentCondition;
  installments?: CreditInstallment[];
  creditSchedule?: CreditSchedule;
}

const DEFAULT_TEMPLATE: CreditInstallmentTemplate = { diasCredito: 30, porcentaje: 100 };
const ROUNDING_FACTOR = 100;
const PERCENT_TOTAL = 100;
const AMOUNT_EPSILON = 0.01;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const ERROR_MIN_CUOTAS = 'Agrega al menos una cuota para configurar el crédito.';

const roundTwo = (value: number): number => Math.round(value * ROUNDING_FACTOR) / ROUNDING_FACTOR;

const isValidIsoDate = (value: string): boolean => {
  if (!ISO_DATE_REGEX.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() === day;
};

const diffDays = (fromIso: string, toIso: string): number => {
  const from = new Date(`${fromIso}T00:00:00`);
  const to = new Date(`${toIso}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return 0;
  }
  const diff = Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
};

export const normalizeCreditTemplates = (
  templates?: CreditInstallmentTemplate[],
): CreditInstallmentTemplate[] => {
  if (!templates || templates.length === 0) {
    return [DEFAULT_TEMPLATE];
  }
  return templates.map((template) => ({
    diasCredito: Math.max(0, Math.trunc(Number(template.diasCredito) || 0)),
    porcentaje: Number(template.porcentaje) || 0,
  }));
};

export const ensureCreditDefinitions = normalizeCreditTemplates;

const normalizePlantillaCronograma = (
  templates: CreditInstallmentTemplate[],
): CreditInstallmentTemplate[] => {
  const sanitized = templates.map((template) => ({
    diasCredito: Number(template.diasCredito) || 0,
    porcentaje: roundTwo(Number(template.porcentaje) || 0),
  }));

  const filtered = sanitized.filter((item) => !(item.diasCredito === 0 && item.porcentaje === 0));
  return sortByDays(filtered);
};

const normalizeCalendarioCronograma = (
  cuotas: CuotaCalendarioCredito[],
): CuotaCalendarioCredito[] => {
  const sanitized = cuotas.map((cuota) => ({
    fechaVencimientoISO: (cuota.fechaVencimientoISO || '').trim(),
    monto: roundTwo(Number(cuota.monto) || 0),
  }));

  const filtered = sanitized.filter(
    (item) => !(item.fechaVencimientoISO === '' && item.monto === 0),
  );

  return [...filtered].sort((a, b) => a.fechaVencimientoISO.localeCompare(b.fechaVencimientoISO));
};

export const validatePlantillaCronograma = (
  templates: CreditInstallmentTemplate[],
): string[] => {
  const errors: string[] = [];
  const normalized = normalizePlantillaCronograma(templates);
  if (!normalized.length) {
    errors.push(ERROR_MIN_CUOTAS);
    return errors;
  }

  const totalPercent = normalized.reduce((sum, item) => sum + item.porcentaje, 0);
  if (Math.abs(totalPercent - PERCENT_TOTAL) > AMOUNT_EPSILON) {
    errors.push('La suma de porcentajes debe ser exactamente 100%.');
  }

  normalized.forEach((item, index) => {
    if (item.diasCredito < 0) {
      errors.push(`La cuota ${index + 1} debe tener dias de credito mayores o iguales a 0.`);
    }
    if (item.porcentaje <= 0) {
      errors.push(`La cuota ${index + 1} debe tener un porcentaje mayor a 0.`);
    }
  });

  return errors;
};

export const validateCalendarioCronograma = (
  cuotas: CuotaCalendarioCredito[],
  total?: number,
): string[] => {
  const errors: string[] = [];
  const normalized = normalizeCalendarioCronograma(cuotas);
  if (!normalized.length) {
    errors.push(ERROR_MIN_CUOTAS);
    return errors;
  }

  normalized.forEach((cuota, index) => {
    if (!isValidIsoDate(cuota.fechaVencimientoISO)) {
      errors.push(`La cuota ${index + 1} debe tener una fecha de vencimiento válida.`);
    }
    if (cuota.monto <= 0) {
      errors.push(`La cuota ${index + 1} debe tener un monto mayor a 0.`);
    }
  });

  if (Number.isFinite(total)) {
    const safeTotal = Math.max(0, Number(total) || 0);
    const totalMontos = normalized.reduce((sum, cuota) => sum + cuota.monto, 0);
    const residual = roundTwo(safeTotal - totalMontos);
    if (totalMontos - safeTotal > AMOUNT_EPSILON) {
      errors.push('La suma de montos no puede exceder el total del comprobante.');
      if (normalized.length) {
        const lastAmount = normalized[normalized.length - 1].monto;
        if (lastAmount + residual <= 0) {
          errors.push('La suma de montos excede el total y no se puede ajustar sin dejar una cuota en 0 o negativo.');
        }
      }
    } else if (safeTotal - totalMontos > AMOUNT_EPSILON) {
      errors.push('La suma de montos debe ser igual al total del comprobante.');
    }
  }

  return errors;
};

export const validateCreditSchedule = (
  definicion: DefinicionCronogramaCredito | CreditInstallmentDefinition[] | CuotaCalendarioCredito[] | undefined,
  modo: ModoCronogramaCredito = 'plantilla',
  total?: number,
): string[] => {
  if (!definicion) {
    return [ERROR_MIN_CUOTAS];
  }

  if (Array.isArray(definicion)) {
    return modo === 'calendario'
      ? validateCalendarioCronograma(definicion as CuotaCalendarioCredito[], total)
      : validatePlantillaCronograma(definicion as CreditInstallmentDefinition[]);
  }

  if (definicion.modo === 'calendario') {
    return validateCalendarioCronograma(definicion.calendario, total);
  }

  return validatePlantillaCronograma(definicion.plantilla);
};

export const validateCreditScheduleTemplate = (
  templates: CreditInstallmentTemplate[],
): string[] => {
  return validatePlantillaCronograma(templates);
};

export const validateCreditDefinitionSchedule = validateCreditScheduleTemplate;

interface BuildScheduleInput {
  total: number;
  issueDate?: string;
  templates?: CreditInstallmentTemplate[];
}

const sortByDays = (templates: CreditInstallmentTemplate[]): CreditInstallmentTemplate[] =>
  [...templates].sort((a, b) => a.diasCredito - b.diasCredito);

export const buildScheduleFromPlantilla = (
  templates: CreditInstallmentTemplate[] = [],
  issueDate?: string,
  total = 0,
): CreditInstallment[] => {
  const safeTotal = Math.max(0, Number(total) || 0);
  const baseIssueDate = ensureBusinessDateIso(issueDate);
  const schedule = sortByDays(normalizeCreditTemplates(templates));

  let allocated = 0;
  return schedule.map((template, index): CreditInstallment => {
    const isLast = index === schedule.length - 1;
    const rawAmount = roundTwo((safeTotal * template.porcentaje) / PERCENT_TOTAL);
    const amount = isLast ? roundTwo(safeTotal - allocated) : rawAmount;
    allocated += amount;

    const dueDate = shiftBusinessDate(baseIssueDate, template.diasCredito);

    return {
      numeroCuota: index + 1,
      diasCredito: template.diasCredito,
      porcentaje: template.porcentaje,
      fechaVencimiento: dueDate,
      importe: amount,
      pagado: 0,
      saldo: amount,
      estado: 'pendiente',
      pagos: [],
    };
  });
};

export const buildScheduleFromCalendario = (
  cuotas: CuotaCalendarioCredito[] = [],
  issueDate?: string,
  total?: number,
): CreditInstallment[] => {
  const normalized = normalizeCalendarioCronograma(cuotas);
  const baseIssueDate = ensureBusinessDateIso(issueDate);
  const totalProvided = Number.isFinite(total);
  const safeTotal = totalProvided ? Math.max(0, Number(total) || 0) : undefined;

  const rounded = normalized.map((cuota) => ({
    ...cuota,
    monto: roundTwo(cuota.monto),
  }));

  if (totalProvided && rounded.length) {
    const totalMontos = rounded.reduce((sum, cuota) => sum + cuota.monto, 0);
    const residual = roundTwo((safeTotal ?? 0) - totalMontos);
    if (Math.abs(residual) > AMOUNT_EPSILON) {
      const lastIndex = rounded.length - 1;
      const adjustedAmount = roundTwo(rounded[lastIndex].monto + residual);
      if (adjustedAmount > 0) {
        rounded[lastIndex] = {
          ...rounded[lastIndex],
          monto: adjustedAmount,
        };
      }
    }
  }

  const porcentajes = rounded.map((cuota) =>
    safeTotal && safeTotal > 0 ? roundTwo((cuota.monto / safeTotal) * PERCENT_TOTAL) : 0,
  );

  const totalMontosForPercent = rounded.reduce((sum, cuota) => sum + cuota.monto, 0);
  if (
    safeTotal &&
    safeTotal > 0 &&
    porcentajes.length > 0 &&
    Math.abs((safeTotal ?? 0) - totalMontosForPercent) <= AMOUNT_EPSILON
  ) {
    const sumPrev = porcentajes.slice(0, -1).reduce((sum, value) => sum + value, 0);
    const adjusted = roundTwo(PERCENT_TOTAL - sumPrev);
    if (adjusted > 0) {
      porcentajes[porcentajes.length - 1] = adjusted;
    }
  }

  return rounded.map((cuota, index): CreditInstallment => {
    const diasCredito = diffDays(baseIssueDate, cuota.fechaVencimientoISO);
    const porcentaje = porcentajes[index] ?? 0;

    return {
      numeroCuota: index + 1,
      diasCredito,
      porcentaje,
      fechaVencimiento: cuota.fechaVencimientoISO,
      importe: cuota.monto,
      pagado: 0,
      saldo: cuota.monto,
      estado: 'pendiente',
      pagos: [],
    };
  });
};

export const buildCreditScheduleFromDefinition = (params: {
  modo?: ModoCronogramaCredito;
  plantilla?: CreditInstallmentTemplate[];
  calendario?: CuotaCalendarioCredito[];
  issueDate?: string;
  total: number;
}): CreditSchedule => {
  const mode = params.modo ?? 'plantilla';
  const cuotas = mode === 'calendario'
    ? buildScheduleFromCalendario(params.calendario ?? [], params.issueDate, params.total)
    : buildScheduleFromPlantilla(params.plantilla ?? [], params.issueDate, params.total);

  return {
    cuotas,
    totalPorcentaje: cuotas.reduce((sum, cuota) => sum + cuota.porcentaje, 0),
    fechaVencimientoGlobal: computeGlobalDueDate(cuotas),
  };
};

export const buildCreditScheduleFromTemplate = ({
  total,
  issueDate,
  templates,
}: BuildScheduleInput): CreditSchedule => {
  return buildCreditScheduleFromDefinition({
    modo: 'plantilla',
    plantilla: templates,
    issueDate,
    total,
  });
};

export const buildCreditInstallments = (input: BuildScheduleInput): CreditInstallment[] =>
  buildCreditScheduleFromTemplate(input).cuotas;

export const computeGlobalDueDate = (installments: CreditInstallment[]): string => {
  if (!installments.length) {
    return getBusinessTodayISODate();
  }
  return installments.reduce((latest, installment) =>
    installment.fechaVencimiento > latest ? installment.fechaVencimiento : latest,
  installments[0].fechaVencimiento);
};

export const validateCreditInstallments = (installments: CreditInstallment[]): string[] => {
  const errors: string[] = [];
  if (!installments.length) {
    errors.push('Debe definir al menos una cuota.');
    return errors;
  }

  const totalPercent = installments.reduce((sum, installment) => sum + installment.porcentaje, 0);
  if (Math.abs(totalPercent - PERCENT_TOTAL) > AMOUNT_EPSILON) {
    errors.push('Las cuotas deben sumar 100% en total.');
  }

  installments.forEach((installment) => {
    if (installment.diasCredito < 0) {
      errors.push(`La cuota ${installment.numeroCuota} tiene dias de credito invalidos.`);
    }
    if (installment.importe <= 0) {
      errors.push(`La cuota ${installment.numeroCuota} debe tener un importe mayor a 0.`);
    }
    if (!installment.fechaVencimiento) {
      errors.push(`La cuota ${installment.numeroCuota} debe tener una fecha de vencimiento valida.`);
    }
  });

  return errors;
};

export const buildCreditPaymentMethodName = (
  definitions?: CreditInstallmentDefinition[],
): string => {
  if (!definitions || definitions.length === 0) {
    return 'Crédito';
  }

  const orderedDays = Array.from(
    new Set(
      definitions
        .map((item) =>
          Number.isFinite(item?.diasCredito) ? Math.max(0, Math.trunc(item.diasCredito)) : undefined,
        )
        .filter((value): value is number => typeof value === 'number'),
    ),
  ).sort((a, b) => a - b);

  if (!orderedDays.length) {
    return 'Crédito';
  }

  if (orderedDays.length === 1) {
    return `Crédito ${orderedDays[0]} días`;
  }

  return `Crédito ${orderedDays.join('-')} días`;
};

