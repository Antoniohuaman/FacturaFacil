import React, { useCallback, useMemo } from 'react';
import { CheckSquare, Square, Trash2 } from 'lucide-react';
import type { CreditInstallment } from './paymentTerms';
import type { CurrencyCode } from '@/shared/currency';
import { formatMoney, currencyManager } from '@/shared/currency';
import { obtenerFechaMinimaPrimeraCuota, sanitizarImporteTexto } from './creditoManualTransaccion';

export type CreditInstallmentAllocationInput = {
  installmentNumber: number;
  amount: number;
};

type TableMode = 'readonly' | 'allocation' | 'manual';

interface CreditInstallmentsTableProps {
  installments: CreditInstallment[];
  currency: CurrencyCode;
  mode?: TableMode;
  manualReadOnly?: boolean;
  onManualChange?: (installments: CreditInstallment[]) => void;
  onManualRemove?: (installmentNumber: number) => void;
  manualTotal?: number;
  manualFechaEmision?: string;
  allocations?: CreditInstallmentAllocationInput[];
  onChangeAllocations?: (allocations: CreditInstallmentAllocationInput[]) => void;
  className?: string;
  scrollMaxHeight?: number;
  disabled?: boolean;
  showDaysOverdue?: boolean;
  showRemainingResult?: boolean;
  compact?: boolean;
  emptyState?: string;
  /** Oculta la columna "Estado" (cuotas que aún son solo una programación, no pagos gestionados). Default true. */
  showStatusColumn?: boolean;
  /** Encabezado de la columna de selección en modo `allocation` (ej. "Cobrar" en Cobranzas, "Pagar" en Cuentas por Pagar). El componente es neutral: por defecto usa una palabra genérica y cada consumidor puede pedir la suya. */
  selectionColumnLabel?: string;
}

/**
 * Redondea un importe a la precisión real configurada para la moneda
 * (fuente oficial: currencyManager.getCurrency(...).decimalPlaces — nunca 2
 * decimales fijos a ciegas). Esta es la única normalización monetaria del
 * componente: todo importe se compara ya redondeado a su precisión real
 * contra cero exacto, nunca contra un margen de tolerancia de un céntimo —
 * así un saldo real de S/ 0.01 nunca se confunde con saldo cero.
 */
function normalizarImporte(valor: number, currency: CurrencyCode): number {
  const decimales = currencyManager.getCurrency(currency)?.decimalPlaces ?? 2;
  const factor = 10 ** decimales;
  return Math.round((valor + Number.EPSILON) * factor) / factor;
}

const getSaldo = (installment: CreditInstallment, currency: CurrencyCode): number => {
  const pagado = Number(installment.pagado ?? 0);
  const saldo = installment.saldo ?? installment.importe - pagado;
  return Math.max(0, normalizarImporte(saldo, currency));
};

/** 0 si la cuota ya no tiene saldo pendiente — una cuota saldada nunca sigue contando como vencida. */
const getDaysOverdue = (installment: CreditInstallment, currency: CurrencyCode): number => {
  if (!installment.fechaVencimiento) return 0;
  if (getSaldo(installment, currency) <= 0) return 0;
  const now = new Date();
  const due = new Date(`${installment.fechaVencimiento}T00:00:00`);
  const diff = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
};

export const CreditInstallmentsTable: React.FC<CreditInstallmentsTableProps> = ({
  installments,
  currency,
  mode = 'readonly',
  manualReadOnly = false,
  onManualChange,
  onManualRemove,
  manualTotal,
  manualFechaEmision,
  allocations = [],
  onChangeAllocations,
  className,
  scrollMaxHeight = 240,
  disabled = false,
  showDaysOverdue = false,
  showRemainingResult = true,
  compact = true,
  emptyState = 'No hay cuotas registradas.',
  showStatusColumn = true,
  selectionColumnLabel = 'Seleccionar',
}) => {
  const formatPrice = useCallback(
    (price: number, moneda?: CurrencyCode) => formatMoney(price, moneda ?? currency, { showSymbol: true }),
    [currency],
  );

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
    const alreadySelected = current > 0;
    if (!onChangeAllocations) return;

    if (alreadySelected) {
      onChangeAllocations(
        allocations.filter((entry) => entry.installmentNumber !== installment.numeroCuota),
      );
      return;
    }

    const saldo = getSaldo(installment, currency);
    if (saldo <= 0) {
      return;
    }
    onChangeAllocations([
      ...allocations.filter((entry) => entry.installmentNumber !== installment.numeroCuota),
      {
        installmentNumber: installment.numeroCuota,
        amount: saldo,
      },
    ]);
  }, [allocationMap, allocations, currency, disabled, onChangeAllocations]);

  const handleAmountChange = useCallback((installment: CreditInstallment, value: number) => {
    if (!onChangeAllocations || disabled) return;
    const saldo = getSaldo(installment, currency);
    const safeValue = normalizarImporte(Math.max(0, Math.min(saldo, Number(value) || 0)), currency);
    const exists = allocations.some((entry) => entry.installmentNumber === installment.numeroCuota);
    const next: CreditInstallmentAllocationInput[] = exists
      ? allocations.map((entry) =>
          entry.installmentNumber === installment.numeroCuota ? { ...entry, amount: safeValue } : entry,
        )
      : [...allocations, { installmentNumber: installment.numeroCuota, amount: safeValue }];

    const sanitized = next.filter((entry) => entry.amount > 0);
    onChangeAllocations(sanitized);
  }, [allocations, currency, disabled, onChangeAllocations]);

  const isManualMode = mode === 'manual';
  const canEditManual = isManualMode && !manualReadOnly;
  const cellPadding = compact ? 'px-3 py-2' : 'px-4 py-3';
  const textSize = compact ? 'text-[12px]' : 'text-sm';
  const minPrimeraCuota = manualFechaEmision
    ? obtenerFechaMinimaPrimeraCuota(manualFechaEmision)
    : undefined;

  if (!installments.length) {
    if (isManualMode) {
      return (
        <div className={`rounded-xl border border-slate-200 bg-white ${className ?? ''}`}>
          <div className="overflow-x-auto">
            <table className={`min-w-full ${textSize} text-slate-600`}>
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className={`${cellPadding} text-left w-14`}>N°</th>
                  <th className={`${cellPadding} text-left w-20`}>Días</th>
                  {showDaysOverdue && <th className={`${cellPadding} text-left w-24`}>Vencidos</th>}
                  <th className={`${cellPadding} text-left w-32`}>Fecha venc.</th>
                  <th className={`${cellPadding} text-right w-16`}>%</th>
                  <th className={`${cellPadding} text-right w-28`}>Importe</th>
                  <th className={`${cellPadding} text-right w-28`}>Saldo actual</th>
                  {showStatusColumn && <th className={`${cellPadding} text-center w-28`}>Estado</th>}
                  <th className={`${cellPadding} text-center w-12`} aria-hidden="true" />
                </tr>
              </thead>
              <tbody />
            </table>
          </div>
        </div>
      );
    }
    return (
      <div className={`rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500 ${className ?? ''}`}>
        {emptyState}
      </div>
    );
  }

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
                {mode === 'allocation' && <th className={`${cellPadding} text-left w-12`}>{selectionColumnLabel}</th>}
                <th className={`${cellPadding} text-left w-14`}>N°</th>
                <th className={`${cellPadding} text-left w-20`}>Días</th>
                {showDaysOverdue && <th className={`${cellPadding} text-left w-24`}>Vencidos</th>}
                <th className={`${cellPadding} text-left w-32`}>Fecha venc.</th>
                <th className={`${cellPadding} text-right w-16`}>%</th>
                <th className={`${cellPadding} text-right w-28`}>Importe</th>
                <th className={`${cellPadding} text-right w-28`}>Saldo actual</th>
                {showStatusColumn && <th className={`${cellPadding} text-center w-28`}>Estado</th>}
                {isManualMode && <th className={`${cellPadding} text-center w-12`} aria-hidden="true" />}
                {mode === 'allocation' && <th className={`${cellPadding} text-right w-32`}>Monto a aplicar</th>}
                {mode === 'allocation' && showRemainingResult && <th className={`${cellPadding} text-right w-32`}>Saldo resultante</th>}
              </tr>
            </thead>
            <tbody>
              {installments.map((installment) => {
                const saldo = getSaldo(installment, currency);
                // El componente no decide semántica de dominio: solo muestra la
                // etiqueta que el consumidor ya resolvió (installment.estado) y
                // colorea según el saldo real (dato numérico, no texto) — nunca
                // inventa "Pagado"/"Cobrado"/"Cancelado" por sí mismo.
                const estadoLabel = (installment.estado ?? '').toUpperCase();
                const saldado = saldo <= 0;
                const conAvance = !saldado && Number(installment.pagado ?? 0) > 0;
                const allocatedAmount = allocationMap.get(installment.numeroCuota) ?? 0;
                const isSelected = allocatedAmount > 0;
                const remainingAfterAllocation = normalizarImporte(Math.max(0, saldo - allocatedAmount), currency);
                const overdueDays = showDaysOverdue ? getDaysOverdue(installment, currency) : 0;
                const accionSeleccion = isSelected
                  ? `Deseleccionar cuota ${installment.numeroCuota}`
                  : `Seleccionar cuota ${installment.numeroCuota}`;
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
                          disabled={disabled || saldo <= 0}
                          aria-label={accionSeleccion}
                          aria-pressed={isSelected}
                          title={accionSeleccion}
                          className={`text-slate-500 transition ${saldo <= 0 ? 'opacity-40 cursor-not-allowed' : 'hover:text-slate-900'}`}
                        >
                          {isSelected ? <CheckSquare className="h-4 w-4 text-emerald-600" /> : <Square className="h-4 w-4" />}
                        </button>
                      </td>
                    )}
                    <td className={`${cellPadding} font-semibold text-slate-900`}>{installment.numeroCuota}</td>
                    <td className={`${cellPadding}`}>
                      {isManualMode && !installment.fechaVencimiento ? '—' : installment.diasCredito}
                    </td>
                    {showDaysOverdue && (
                      <td className={`${cellPadding} text-slate-900`}>{overdueDays > 0 ? `${overdueDays} días` : '—'}</td>
                    )}
                    <td className={`${cellPadding}`}>
                      {isManualMode ? (
                        <input
                          type="date"
                          value={installment.fechaVencimiento || ''}
                          min={
                            isManualMode
                              ? (installment.numeroCuota === 1
                                ? minPrimeraCuota
                                : (installments.find((entry) => entry.numeroCuota === installment.numeroCuota - 1)?.fechaVencimiento
                                  || minPrimeraCuota))
                              : undefined
                          }
                          disabled={!canEditManual}
                          onChange={(event) => {
                            if (!onManualChange) return;
                            const rawValue = event.target.value;
                            if (!rawValue) {
                              const next = installments.map((entry) =>
                                entry.numeroCuota === installment.numeroCuota
                                  ? { ...entry, fechaVencimiento: '' }
                                  : entry,
                              );
                              onManualChange(next);
                              return;
                            }

                            const minimo = installment.numeroCuota === 1
                              ? minPrimeraCuota
                              : (installments.find((entry) => entry.numeroCuota === installment.numeroCuota - 1)?.fechaVencimiento
                                || minPrimeraCuota);
                            const valorFinal = minimo && rawValue < minimo ? minimo : rawValue;

                            const next = installments.map((entry) =>
                              entry.numeroCuota === installment.numeroCuota
                                ? { ...entry, fechaVencimiento: valorFinal }
                                : entry,
                            );
                            onManualChange(next);
                          }}
                          className="h-7 w-full rounded border border-slate-200 bg-white px-2 text-[12px] text-slate-700 focus:border-indigo-300 focus:outline-none disabled:bg-slate-50"
                        />
                      ) : (
                        installment.fechaVencimiento
                      )}
                    </td>
                    <td className={`${cellPadding} text-right`}>
                      {isManualMode ? `${installment.porcentaje.toFixed(2)}%` : `${installment.porcentaje}%`}
                    </td>
                    <td className={`${cellPadding} text-right font-semibold text-slate-900`}>
                      {isManualMode ? (
                        <input
                          type="text"
                          inputMode="decimal"
                          value={Number.isFinite(installment.importe) ? String(installment.importe) : ''}
                          disabled={!canEditManual}
                          onChange={(event) => {
                            if (!onManualChange) return;
                            if (!event.target.value) {
                              const next = installments.map((entry) =>
                                entry.numeroCuota === installment.numeroCuota
                                  ? { ...entry, importe: Number.NaN }
                                  : entry,
                              );
                              onManualChange(next);
                              return;
                            }

                            const parsed = sanitizarImporteTexto(event.target.value);
                            if (parsed === null) {
                              const next = installments.map((entry) =>
                                entry.numeroCuota === installment.numeroCuota
                                  ? { ...entry, importe: Number.NaN }
                                  : entry,
                              );
                              onManualChange(next);
                              return;
                            }

                            const total = Number(manualTotal ?? 0);
                            const sumaOtros = installments.reduce((sum, entry) => {
                              if (entry.numeroCuota === installment.numeroCuota) {
                                return sum;
                              }
                              return Number.isFinite(entry.importe) ? sum + Number(entry.importe) : sum;
                            }, 0);
                            const maxPermitido = Math.max(0, total - sumaOtros);
                            const nextValue = Math.min(parsed, maxPermitido);

                            const next = installments.map((entry) =>
                              entry.numeroCuota === installment.numeroCuota
                                ? { ...entry, importe: nextValue }
                                : entry,
                            );
                            onManualChange(next);
                          }}
                          className="h-7 w-full rounded border border-slate-200 bg-white px-2 text-right text-[12px] text-slate-700 focus:border-indigo-300 focus:outline-none disabled:bg-slate-50"
                        />
                      ) : (
                        formatPrice(installment.importe, currency)
                      )}
                    </td>
                    <td className={`${cellPadding} text-right text-slate-900`}>
                      {formatPrice(saldo, currency)}
                    </td>
                    {showStatusColumn && (
                      <td className={`${cellPadding} text-center`}>
                        <span
                          className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            saldado
                              ? 'bg-emerald-100 text-emerald-700'
                              : conAvance
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {estadoLabel || '—'}
                        </span>
                      </td>
                    )}
                    {isManualMode && (
                      <td className={`${cellPadding} text-center`}>
                        <button
                          type="button"
                          onClick={() => onManualRemove?.(installment.numeroCuota)}
                          disabled={!canEditManual}
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-full transition ${
                            canEditManual
                              ? 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                              : 'text-slate-300 cursor-not-allowed'
                          }`}
                          aria-label="Eliminar cuota"
                          title="Eliminar cuota"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
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
                      <td className={`${cellPadding} text-right font-semibold ${remainingAfterAllocation <= 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
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
