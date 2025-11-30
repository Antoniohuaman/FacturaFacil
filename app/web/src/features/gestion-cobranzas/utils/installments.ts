import type {
  ComprobanteCreditInstallment,
  ComprobanteCreditTerms,
  CreditInstallmentAllocation,
} from '../../comprobantes-electronicos/models/comprobante.types';
import type { CobranzaInstallmentState, CobranzaStatus } from '../models/cobranzas.types';

const TOLERANCE = 0.01;

const clampAmount = (value: number) => Number(Number(value || 0).toFixed(2));

export const normalizeCreditTermsToInstallments = (
  creditTerms?: ComprobanteCreditTerms,
): CobranzaInstallmentState[] => {
  if (!creditTerms?.schedule?.length) {
    return [];
  }

  return creditTerms.schedule.map((installment: ComprobanteCreditInstallment) => {
    const amountOriginal = clampAmount(installment.importe ?? 0);
    const amountPaid = clampAmount(installment.pagado ?? 0);
    const remaining = clampAmount(
      typeof installment.saldo === 'number'
        ? installment.saldo
        : amountOriginal - amountPaid,
    );

    return {
      installmentNumber: installment.numeroCuota,
      dueDate: installment.fechaVencimiento,
      amountOriginal,
      amountPaid,
      remaining: remaining < 0 ? 0 : remaining,
      status: resolveInstallmentStatus(amountOriginal, amountPaid, remaining),
    };
  });
};

const resolveInstallmentStatus = (
  amountOriginal: number,
  amountPaid: number,
  remaining: number,
): CobranzaInstallmentState['status'] => {
  if (Math.abs(remaining) <= TOLERANCE || amountPaid >= amountOriginal - TOLERANCE) {
    return 'CANCELADA';
  }
  if (amountPaid > TOLERANCE && remaining > TOLERANCE) {
    return 'PARCIAL';
  }
  return 'PENDIENTE';
};

export const updateInstallmentsWithAllocations = (
  installments: CobranzaInstallmentState[],
  allocations: CreditInstallmentAllocation[] = [],
): CobranzaInstallmentState[] => {
  if (!allocations.length) {
    return installments;
  }

  const allocationMap = allocations.reduce<Record<number, number>>((map, allocation) => {
    const current = map[allocation.installmentNumber] ?? 0;
    map[allocation.installmentNumber] = clampAmount(current + Number(allocation.amount || 0));
    return map;
  }, {});

  return installments.map((installment) => {
    const allocated = allocationMap[installment.installmentNumber];
    if (!allocated) {
      return installment;
    }

    const available = clampAmount(installment.amountOriginal - installment.amountPaid);
    const applied = clampAmount(Math.min(available, allocated));
    const amountPaid = clampAmount(installment.amountPaid + applied);
    const remaining = clampAmount(installment.amountOriginal - amountPaid);

    return {
      ...installment,
      amountPaid: amountPaid > installment.amountOriginal ? installment.amountOriginal : amountPaid,
      remaining: remaining < 0 ? 0 : remaining,
      status: resolveInstallmentStatus(installment.amountOriginal, amountPaid, remaining),
    };
  });
};

export const computeAccountStateFromInstallments = (
  installments: CobranzaInstallmentState[],
): {
  saldo: number;
  cobrado: number;
  totalInstallments: number;
  pendingInstallmentsCount: number;
  partialInstallmentsCount: number;
  accountStatus: CobranzaStatus;
} => {
  if (!installments.length) {
    return {
      saldo: 0,
      cobrado: 0,
      totalInstallments: 0,
      pendingInstallmentsCount: 0,
      partialInstallmentsCount: 0,
      accountStatus: 'cancelado',
    };
  }

  const saldo = clampAmount(installments.reduce((sum, installment) => sum + installment.remaining, 0));
  const cobrado = clampAmount(
    installments.reduce((sum, installment) => sum + (installment.amountOriginal - installment.remaining), 0),
  );

  const totalInstallments = installments.length;
  const pendingInstallmentsCount = installments.filter((installment) => installment.remaining > TOLERANCE).length;
  const partialInstallmentsCount = installments.filter((installment) => installment.status === 'PARCIAL').length;

  let accountStatus: CobranzaStatus = 'pendiente';
  if (pendingInstallmentsCount === 0 || saldo <= TOLERANCE) {
    accountStatus = 'cancelado';
  } else if (cobrado > TOLERANCE) {
    accountStatus = 'parcial';
  }

  return {
    saldo,
    cobrado,
    totalInstallments,
    pendingInstallmentsCount,
    partialInstallmentsCount,
    accountStatus,
  };
};
