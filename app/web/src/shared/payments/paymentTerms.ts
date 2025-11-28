export type PaymentCondition = 'CONTADO' | 'CREDITO';

export interface CreditInstallmentDefinition {
  diasCredito: number;
  porcentaje: number;
}

export interface CreditInstallment extends CreditInstallmentDefinition {
  numeroCuota: number;
  fechaVencimiento: string;
  importe: number;
}

export interface PaymentTermsPayload {
  condition: PaymentCondition;
  installments?: CreditInstallment[];
}

const DEFAULT_DEFINITION: CreditInstallmentDefinition = { diasCredito: 30, porcentaje: 100 };
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

export const ensureCreditDefinitions = (
  definitions?: CreditInstallmentDefinition[]
): CreditInstallmentDefinition[] => {
  if (!definitions || definitions.length === 0) {
    return [DEFAULT_DEFINITION];
  }
  return definitions.map((definition) => ({
    diasCredito: Math.max(0, Math.trunc(definition.diasCredito)),
    porcentaje: Number(definition.porcentaje) || 0,
  }));
};

export const validateCreditDefinitionSchedule = (
  definitions: CreditInstallmentDefinition[]
): string[] => {
  const errors: string[] = [];
  if (!definitions.length) {
    return errors;
  }
  const totalPercent = definitions.reduce((sum, item) => sum + item.porcentaje, 0);
  if (Math.abs(totalPercent - PERCENT_TOTAL) > AMOUNT_EPSILON) {
    errors.push('La suma de porcentajes debe ser exactamente 100%.');
  }
  definitions.forEach((item, index) => {
    if (item.diasCredito < 0) {
      errors.push(`La cuota ${index + 1} debe tener dias de credito mayores o iguales a 0.`);
    }
    if (item.porcentaje <= 0) {
      errors.push(`La cuota ${index + 1} debe tener un porcentaje mayor a 0.`);
    }
  });
  return errors;
};

interface BuildInstallmentsInput {
  total: number;
  issueDate?: string;
  definitions?: CreditInstallmentDefinition[];
}

export const buildCreditInstallments = ({
  total,
  issueDate,
  definitions,
}: BuildInstallmentsInput): CreditInstallment[] => {
  const safeTotal = Math.max(0, Number(total) || 0);
  const baseDate = createDate(issueDate);
  const schedule = ensureCreditDefinitions(definitions);

  let allocated = 0;
  return schedule.map((definition, index) => {
    const isLast = index === schedule.length - 1;
    const rawAmount = roundTwo((safeTotal * definition.porcentaje) / PERCENT_TOTAL);
    const amount = isLast ? roundTwo(safeTotal - allocated) : rawAmount;
    allocated += amount;

    const dueDate = toIsoDate(addDays(baseDate, definition.diasCredito));

    return {
      numeroCuota: index + 1,
      diasCredito: definition.diasCredito,
      porcentaje: definition.porcentaje,
      fechaVencimiento: dueDate,
      importe: amount,
    };
  });
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
  definitions?: CreditInstallmentDefinition[]
): string => {
  if (!definitions || definitions.length === 0) {
    return 'Crédito';
  }

  const orderedDays = Array.from(
    new Set(
      definitions
        .map((item) =>
          Number.isFinite(item?.diasCredito) ? Math.max(0, Math.trunc(item.diasCredito)) : undefined
        )
        .filter((value): value is number => typeof value === 'number')
    )
  ).sort((a, b) => a - b);

  if (!orderedDays.length) {
    return 'Crédito';
  }

  if (orderedDays.length === 1) {
    return `Crédito ${orderedDays[0]} días`;
  }

  return `Crédito ${orderedDays.join('-')} días`;
};

