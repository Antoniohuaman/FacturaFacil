import React, { useCallback, useMemo } from 'react';
import { CheckSquare, Square } from 'lucide-react';
import type { CreditInstallment } from '../../../../shared/payments/paymentTerms';
import type { Currency } from '../../models/comprobante.types';
import { useCurrency } from '../form-core/hooks/useCurrency';

export type CreditInstallmentAllocationInput = {
  installmentNumber: number;
  amount: number;
};

type TableMode = 'readonly' | 'allocation';

interface CreditInstallmentsTableProps {
  installments: CreditInstallment[];
  currency: Currency;
  mode?: TableMode;
  allocations?: CreditInstallmentAllocationInput[];
  onChangeAllocations?: (allocations: CreditInstallmentAllocationInput[]) => void;
  className?: string;
  scrollMaxHeight?: number;
  disabled?: boolean;
  showDaysOverdue?: boolean;
  showRemainingResult?: boolean;
  compact?: boolean;
  emptyState?: string;
}

const TOLERANCE = 0.01;

const getSaldo = (installment: CreditInstallment): number => {
  const pagado = Number(installment.pagado ?? 0);
  const saldo = installment.saldo ?? installment.importe - pagado;
  return Number(Math.max(0, saldo).toFixed(2));
};

const getDaysOverdue = (installment: CreditInstallment): number => {
  if (!installment.fechaVencimiento) return 0;
  const now = new Date();
  const due = new Date(`${installment.fechaVencimiento}T00:00:00`);
  const diff = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
};

export const CreditInstallmentsTable: React.FC<CreditInstallmentsTableProps> = ({
  installments,
  currency,
  mode = 'readonly',
  allocations = [],
  onChangeAllocations,
  className,
  scrollMaxHeight = 240,
  disabled = false,
  showDaysOverdue = false,
  showRemainingResult = true,
  compact = true,
  emptyState = 'No hay cuotas registradas para esta venta.',
}) => {
  const { formatPrice } = useCurrency();

  const allocationMap = useMemo(() => {
    const map = new Map<number, number>();
    allocations.forEach((entry) => {
      if (entry.amount > 0) {
        map.set(entry.installmentNumber, entry.amount);
      }
    });
    return map;
  }, [allocations]);

  const handleToggle = useCallback((installment: CreditInstallment) => {
    if (disabled) return;
    const current = allocationMap.get(installment.numeroCuota) ?? 0;
    const alreadySelected = current > TOLERANCE;
    if (!onChangeAllocations) return;

    if (alreadySelected) {
      onChangeAllocations(
        allocations.filter((entry) => entry.installmentNumber !== installment.numeroCuota),
      );
      return;
    }

    const saldo = getSaldo(installment);
    if (saldo <= TOLERANCE) {
      return;
    }
    onChangeAllocations([
      ...allocations.filter((entry) => entry.installmentNumber !== installment.numeroCuota),
      {
        installmentNumber: installment.numeroCuota,
        amount: saldo,
      },
    ]);
  }, [allocationMap, allocations, disabled, onChangeAllocations]);

  const handleAmountChange = useCallback((installment: CreditInstallment, value: number) => {
    if (!onChangeAllocations || disabled) return;
    const safeValue = Math.max(0, Math.min(getSaldo(installment), Number(value) || 0));
    const exists = allocations.some((entry) => entry.installmentNumber === installment.numeroCuota);
    const next: CreditInstallmentAllocationInput[] = exists
      ? allocations.map((entry) =>
          entry.installmentNumber === installment.numeroCuota ? { ...entry, amount: safeValue } : entry,
        )
      : [...allocations, { installmentNumber: installment.numeroCuota, amount: safeValue }];

    const sanitized = next.filter((entry) => entry.amount > TOLERANCE);
    onChangeAllocations(sanitized);
  }, [allocations, disabled, onChangeAllocations]);

  if (!installments.length) {
    return (
      <div className={`rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500 ${className ?? ''}`}>
        {emptyState}
      </div>
    );
  }

  const cellPadding = compact ? 'px-3 py-2' : 'px-4 py-3';
  const textSize = compact ? 'text-[12px]' : 'text-sm';

  return (
    <div className={`rounded-xl border border-slate-200 bg-white ${className ?? ''}`}>
      <div className="rounded-xl">
        <div className="overflow-x-auto">
          <div
            className="overflow-y-auto"
            style={scrollMaxHeight ? { maxHeight: scrollMaxHeight } : undefined}
          >
            <table className={`min-w-full ${textSize} text-slate-600`}>
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                {mode === 'allocation' && <th className={`${cellPadding} text-left w-12`}>Cobrar</th>}
                <th className={`${cellPadding} text-left w-14`}>N°</th>
                <th className={`${cellPadding} text-left w-20`}>Días</th>
                {showDaysOverdue && <th className={`${cellPadding} text-left w-24`}>Vencidos</th>}
                <th className={`${cellPadding} text-left w-32`}>Fecha venc.</th>
                <th className={`${cellPadding} text-right w-16`}>%</th>
                <th className={`${cellPadding} text-right w-28`}>Importe</th>
                <th className={`${cellPadding} text-right w-28`}>Saldo actual</th>
                <th className={`${cellPadding} text-center w-28`}>Estado</th>
                {mode === 'allocation' && <th className={`${cellPadding} text-right w-32`}>Monto a aplicar</th>}
                {mode === 'allocation' && showRemainingResult && <th className={`${cellPadding} text-right w-32`}>Saldo resultante</th>}
              </tr>
            </thead>
            <tbody>
              {installments.map((installment) => {
                const saldo = getSaldo(installment);
                const estado = saldo <= TOLERANCE ? 'CANCELADO' : (installment.estado || 'pendiente').toUpperCase();
                const allocatedAmount = allocationMap.get(installment.numeroCuota) ?? 0;
                const isSelected = allocatedAmount > TOLERANCE;
                const remainingAfterAllocation = Number(Math.max(0, saldo - allocatedAmount).toFixed(2));
                const overdueDays = showDaysOverdue ? getDaysOverdue(installment) : 0;
                return (
                  <tr
                    key={installment.numeroCuota}
                    className="border-b border-slate-100 last:border-0"
                  >
                    {mode === 'allocation' && (
                      <td className={`${cellPadding}`}>
                        <button
                          type="button"
                          onClick={() => handleToggle(installment)}
                          disabled={disabled || saldo <= TOLERANCE}
                          className={`text-slate-500 transition ${saldo <= TOLERANCE ? 'opacity-40 cursor-not-allowed' : 'hover:text-slate-900'}`}
                        >
                          {isSelected ? <CheckSquare className="h-4 w-4 text-emerald-600" /> : <Square className="h-4 w-4" />}
                        </button>
                      </td>
                    )}
                    <td className={`${cellPadding} font-semibold text-slate-900`}>{installment.numeroCuota}</td>
                    <td className={`${cellPadding}`}>{installment.diasCredito}</td>
                    {showDaysOverdue && (
                      <td className={`${cellPadding} text-slate-900`}>{overdueDays > 0 ? `${overdueDays} días` : '—'}</td>
                    )}
                    <td className={`${cellPadding}`}>{installment.fechaVencimiento}</td>
                    <td className={`${cellPadding} text-right`}>{installment.porcentaje}%</td>
                    <td className={`${cellPadding} text-right font-semibold text-slate-900`}>
                      {formatPrice(installment.importe, currency)}
                    </td>
                    <td className={`${cellPadding} text-right text-slate-900`}>
                      {formatPrice(saldo, currency)}
                    </td>
                    <td className={`${cellPadding} text-center`}>
                      <span
                        className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          estado === 'CANCELADO'
                            ? 'bg-emerald-100 text-emerald-700'
                            : estado === 'PARCIAL'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {estado}
                      </span>
                    </td>
                    {mode === 'allocation' && (
                      <td className={`${cellPadding} text-right`}>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          disabled={disabled || !isSelected}
                          value={isSelected ? allocatedAmount : ''}
                          onChange={(event) => handleAmountChange(installment, Number(event.target.value))}
                          className="w-28 rounded border border-slate-200 px-2 py-1 text-right text-[12px] focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200 disabled:bg-slate-50"
                        />
                      </td>
                    )}
                    {mode === 'allocation' && showRemainingResult && (
                      <td className={`${cellPadding} text-right font-semibold ${remainingAfterAllocation <= TOLERANCE ? 'text-emerald-600' : 'text-slate-900'}`}>
                        {formatPrice(remainingAfterAllocation, currency)}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditInstallmentsTable;
