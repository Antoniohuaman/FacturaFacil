import { X } from 'lucide-react';
import type { CobranzaDocumento, CobranzaInstallmentState, CuentaPorCobrarSummary } from '../models/cobranzas.types';
import { normalizeCreditTermsToInstallments } from '../utils/installments';

interface HistorialCobranzaModalProps {
  cuenta: CuentaPorCobrarSummary | null;
  cobranzas: CobranzaDocumento[];
  isOpen: boolean;
  onClose: () => void;
  formatMoney: (value: number, currency?: string) => string;
  onVerConstancia?: (cobranza: CobranzaDocumento) => void;
}

const INSTALLMENT_TOLERANCE = 0.01;
const clampCurrency = (value: number) => Number(Number(value ?? 0).toFixed(2));

const resolveInstallmentStatus = (amountOriginal: number, amountPaid: number, remaining: number): CobranzaInstallmentState['status'] => {
  if (Math.abs(remaining) <= INSTALLMENT_TOLERANCE || amountPaid >= amountOriginal - INSTALLMENT_TOLERANCE) {
    return 'CANCELADA';
  }

  if (amountPaid > INSTALLMENT_TOLERANCE && remaining > INSTALLMENT_TOLERANCE) {
    return 'PARCIAL';
  }

  return 'PENDIENTE';
};

const normalizeInstallmentsForDisplay = (installments: CobranzaInstallmentState[]) =>
  installments.map((installment) => {
    const amountOriginal = clampCurrency(installment.amountOriginal);
    const amountPaid = clampCurrency(installment.amountPaid);
    const remaining = Math.max(0, clampCurrency(installment.remaining));
    return {
      ...installment,
      amountOriginal,
      amountPaid,
      remaining,
      status: resolveInstallmentStatus(amountOriginal, amountPaid, remaining),
    };
  });

export const HistorialCobranzaModal = ({ cuenta, cobranzas, isOpen, onClose, formatMoney, onVerConstancia }: HistorialCobranzaModalProps) => {
  if (!isOpen || !cuenta) return null;

  const related = cobranzas.filter((item) => item.comprobanteId === cuenta.comprobanteId);
  const baseInstallments = cuenta.installments?.length ? cuenta.installments : normalizeCreditTermsToInstallments(cuenta.creditTerms);
  const installments = normalizeInstallmentsForDisplay(baseInstallments);
  const totalInstallments = installments.length;
  const pendingInstallments = installments.filter((installment) => installment.remaining > INSTALLMENT_TOLERANCE).length;
  const partialInstallments = installments.filter((installment) => installment.status === 'PARCIAL').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
      <div className="w-full max-w-3xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-gray-700">
        <header className="flex items-start justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-800">
          <div>
            <p className="text-xs uppercase text-slate-500 dark:text-gray-400 font-semibold tracking-wide">Historial de cobranzas</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">{cuenta.clienteNombre}</p>
            <p className="text-xs text-slate-500 dark:text-gray-400">{cuenta.comprobanteSerie}-{cuenta.comprobanteNumero}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </header>
        <div className="px-6 py-5 text-sm space-y-5">
          {totalInstallments > 0 && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-800">
                <p className="font-semibold">
                  {totalInstallments} cuota{totalInstallments === 1 ? '' : 's'} registradas
                </p>
                <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
                  <span className="rounded-full bg-white/80 px-2 py-0.5 text-emerald-700">
                    Pendientes {pendingInstallments}/{totalInstallments}
                  </span>
                  {partialInstallments > 0 && (
                    <span className="rounded-full bg-amber-100/80 px-2 py-0.5 text-amber-700">
                      {partialInstallments} en parcial
                    </span>
                  )}
                  {cuenta.creditTerms?.fechaVencimientoGlobal && (
                    <span className="rounded-full bg-white/60 px-2 py-0.5 text-emerald-700">
                      Vence: {cuenta.creditTerms.fechaVencimientoGlobal}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-3 max-h-56 overflow-y-auto rounded-xl border border-emerald-100 bg-white">
                <table className="w-full text-xs text-emerald-900">
                  <thead className="bg-emerald-50 text-emerald-700">
                    <tr>
                      <th className="px-3 py-1 text-left">#</th>
                      <th className="px-3 py-1 text-left">Vence</th>
                      <th className="px-3 py-1 text-right">Importe</th>
                      <th className="px-3 py-1 text-right">Pagado</th>
                      <th className="px-3 py-1 text-right">Saldo</th>
                      <th className="px-3 py-1 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {installments.map((cuota) => (
                      <tr key={cuota.installmentNumber} className="border-t border-emerald-50">
                        <td className="px-3 py-1 font-semibold">{cuota.installmentNumber}</td>
                        <td className="px-3 py-1">{cuota.dueDate || '—'}</td>
                        <td className="px-3 py-1 text-right font-semibold">{formatMoney(cuota.amountOriginal, cuenta.moneda)}</td>
                        <td className="px-3 py-1 text-right">{formatMoney(cuota.amountPaid, cuenta.moneda)}</td>
                        <td className="px-3 py-1 text-right font-semibold">{formatMoney(cuota.remaining, cuenta.moneda)}</td>
                        <td className="px-3 py-1 text-center">
                          <span
                            className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              cuota.status === 'CANCELADA'
                                ? 'bg-emerald-100 text-emerald-700'
                                : cuota.status === 'PARCIAL'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {cuota.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {related.length === 0 ? (
            <div className="text-center text-slate-500 dark:text-gray-400 py-10">
              Aún no existen cobranzas registradas para este comprobante.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 dark:divide-gray-800 text-sm">
                <thead className="bg-slate-50 dark:bg-gray-900/50 text-xs uppercase tracking-wide text-slate-500 dark:text-gray-400">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Documento</th>
                    <th className="px-3 py-2 text-left font-semibold">Fecha</th>
                    <th className="px-3 py-2 text-left font-semibold">Medio</th>
                    <th className="px-3 py-2 text-left font-semibold">Caja</th>
                    <th className="px-3 py-2 text-right font-semibold">Importe</th>
                    <th className="px-3 py-2 text-center font-semibold">Constancia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-800 text-slate-700 dark:text-gray-100">
                  {related.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2 font-semibold">{item.numero}</td>
                      <td className="px-3 py-2">{item.fechaCobranza}</td>
                      <td className="px-3 py-2 capitalize">{item.medioPago}</td>
                      <td className="px-3 py-2">{item.cajaDestino}</td>
                      <td className="px-3 py-2 text-right font-semibold">{formatMoney(item.monto, item.moneda)}</td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => onVerConstancia?.(item)}
                          className="text-xs font-semibold text-blue-600 hover:underline"
                        >
                          Ver constancia
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <footer className="px-6 py-4 border-t border-slate-100 dark:border-gray-800 text-right text-xs text-slate-500">
          Saldo actual: <span className="font-semibold text-slate-900 dark:text-white">{formatMoney(cuenta.saldo, cuenta.moneda)}</span>
        </footer>
      </div>
    </div>
  );
};
