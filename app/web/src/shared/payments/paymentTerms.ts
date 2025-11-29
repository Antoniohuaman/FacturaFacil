export type PaymentCondition = 'CONTADO' | 'CREDITO';

export interface CreditInstallmentTemplate {
  diasCredito: number;
  porcentaje: number;
}

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

const toIsoDate = (date: Date): string => date.toISOString().split('T')[0];
const createDate = (iso?: string): Date => {
  if (!iso) return new Date();
  const parsed = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }
  return parsed;
};

const addDays = (base: Date, days: number): Date => {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
};

const roundTwo = (value: number): number => Math.round(value * ROUNDING_FACTOR) / ROUNDING_FACTOR;

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

export const validateCreditScheduleTemplate = (
  templates: CreditInstallmentTemplate[],
): string[] => {
  const errors: string[] = [];
  if (!templates.length) {
    errors.push('Agrega al menos una cuota para configurar el crédito.');
    return errors;
  }

  const totalPercent = templates.reduce((sum, item) => sum + item.porcentaje, 0);
  if (Math.abs(totalPercent - PERCENT_TOTAL) > AMOUNT_EPSILON) {
    errors.push('La suma de porcentajes debe ser exactamente 100%.');
  }

  templates.forEach((item, index) => {
    if (item.diasCredito < 0) {
      errors.push(`La cuota ${index + 1} debe tener dias de credito mayores o iguales a 0.`);
    }
    if (item.porcentaje <= 0) {
      errors.push(`La cuota ${index + 1} debe tener un porcentaje mayor a 0.`);
    }
  });

  return errors;
};

export const validateCreditDefinitionSchedule = validateCreditScheduleTemplate;

interface BuildScheduleInput {
  total: number;
  issueDate?: string;
  templates?: CreditInstallmentTemplate[];
}

const sortByDays = (templates: CreditInstallmentTemplate[]): CreditInstallmentTemplate[] =>
  [...templates].sort((a, b) => a.diasCredito - b.diasCredito);

export const buildCreditScheduleFromTemplate = ({
  total,
  issueDate,
  templates,
}: BuildScheduleInput): CreditSchedule => {
  const safeTotal = Math.max(0, Number(total) || 0);
  const baseDate = createDate(issueDate);
  const schedule = sortByDays(normalizeCreditTemplates(templates));

  let allocated = 0;
  const cuotas: CreditInstallment[] = schedule.map((template, index): CreditInstallment => {
    const isLast = index === schedule.length - 1;
    const rawAmount = roundTwo((safeTotal * template.porcentaje) / PERCENT_TOTAL);
    const amount = isLast ? roundTwo(safeTotal - allocated) : rawAmount;
    allocated += amount;

    const dueDate = toIsoDate(addDays(baseDate, template.diasCredito));

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

  return {
    cuotas,
    totalPorcentaje: cuotas.reduce((sum, cuota) => sum + cuota.porcentaje, 0),
    fechaVencimientoGlobal: computeGlobalDueDate(cuotas),
  };
};

export const buildCreditInstallments = (input: BuildScheduleInput): CreditInstallment[] =>
  buildCreditScheduleFromTemplate(input).cuotas;

export const computeGlobalDueDate = (installments: CreditInstallment[]): string => {
  if (!installments.length) {
    return toIsoDate(new Date());
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
