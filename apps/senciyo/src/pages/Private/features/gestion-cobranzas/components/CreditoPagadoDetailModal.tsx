import { X } from 'lucide-react';
import type { CreditInstallmentPaymentTrace, CreditInstallment } from '@/shared/payments/paymentTerms';
import type { CreditoPagadoResumen, CobranzaDocumento } from '../models/cobranzas.types';
import { getCobranzaOperacionLabel, getCobranzaTipoCobroLabel } from '../utils/reporting';
import { resolveCobranzaPaymentMeans } from '../utils/paymentMeans';

interface CreditoPagadoDetailModalProps {
  credito: CreditoPagadoResumen | null;
  isOpen: boolean;
  onClose: () => void;
  formatMoney: (value: number, currency?: string) => string;
  onVerConstancia: (cobranza: CobranzaDocumento) => void;
}

type PaymentMeta = { date?: string; methodLabel: string };

const buildMethodLabel = (payments?: CreditInstallmentPaymentTrace[]) => {
  if (!payments?.length) return '—';
  if (payments.length === 1) return payments[0].method || 'Pago';
  return `${payments[0].method || 'Mixto'} (+${payments.length - 1})`;
};

const buildPaymentDate = (payments?: CreditInstallmentPaymentTrace[]) => {
  if (!payments?.length) return undefined;
  return payments.reduce<string | undefined>((latest, current) => {
    if (!latest) return current.date;
    return current.date > latest ? current.date : latest;
  }, undefined);
};

const buildPaymentMetaByInstallment = (schedule?: CreditInstallment[]) => {
  const map = new Map<number, PaymentMeta>();
  schedule?.forEach((installment) => {
    map.set(installment.numeroCuota, {
      date: buildPaymentDate(installment.pagos),
      methodLabel: buildMethodLabel(installment.pagos),
    });
  });
  return map;
};

export const CreditoPagadoDetailModal = ({ credito, isOpen, onClose, formatMoney, onVerConstancia }: CreditoPagadoDetailModalProps) => {
  if (!isOpen || !credito) return null;

  const { cuenta, installments, cobranzas, cancelacion, cobrosCount, abonosParciales, cuotasLabel } = credito;
  const paymentMetaByInstallment = buildPaymentMetaByInstallment(cuenta.creditTerms?.schedule);
  const lastCobranzaNumero = cobranzas.length ? cobranzas[cobranzas.length - 1].numero : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
      <div className="w-full max-w-5xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-gray-700">
        <header className="flex items-start justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-800">
          <div>
            <p className="text-xs uppercase text-slate-500 dark:text-gray-400 font-semibold tracking-wide">Crédito pagado</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">{cuenta.comprobanteSerie}-{cuenta.comprobanteNumero}</p>
            <p className="text-xs text-slate-500 dark:text-gray-400">Cliente: {cuenta.clienteNombre}</p>
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

        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto space-y-6 text-sm text-slate-800 dark:text-gray-100">
          <section>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 dark:bg-gray-800/70 border border-slate-200 dark:border-gray-700 rounded-xl p-3">
                <p className="text-[11px] uppercase text-slate-500 dark:text-gray-400">Comprobante</p>
                <p className="font-semibold">{cuenta.tipoComprobante} · {cuenta.comprobanteSerie}-{cuenta.comprobanteNumero}</p>
              </div>
              <div className="bg-slate-50 dark:bg-gray-800/70 border border-slate-200 dark:border-gray-700 rounded-xl p-3">
                <p className="text-[11px] uppercase text-slate-500 dark:text-gray-400">Fecha emisión</p>
                <p className="font-semibold">{cuenta.fechaEmision}</p>
              </div>
              <div className="bg-slate-50 dark:bg-gray-800/70 border border-slate-200 dark:border-gray-700 rounded-xl p-3">
                <p className="text-[11px] uppercase text-slate-500 dark:text-gray-400">Total comprobante</p>
                <p className="font-semibold">{formatMoney(cuenta.total, cuenta.moneda)}</p>
              </div>
              <div className="bg-slate-50 dark:bg-gray-800/70 border border-slate-200 dark:border-gray-700 rounded-xl p-3">
                <p className="text-[11px] uppercase text-slate-500 dark:text-gray-400">Cuotas</p>
                <p className="font-semibold">{cuotasLabel}</p>
              </div>
              <div className="bg-slate-50 dark:bg-gray-800/70 border border-slate-200 dark:border-gray-700 rounded-xl p-3">
                <p className="text-[11px] uppercase text-slate-500 dark:text-gray-400">Fecha cancelación</p>
                <p className="font-semibold">{cancelacion || '—'}</p>
              </div>
              <div className="bg-slate-50 dark:bg-gray-800/70 border border-slate-200 dark:border-gray-700 rounded-xl p-3">
                <p className="text-[11px] uppercase text-slate-500 dark:text-gray-400">Cobros</p>
                <p className="font-semibold">{cobrosCount}</p>
              </div>
              <div className="bg-slate-50 dark:bg-gray-800/70 border border-slate-200 dark:border-gray-700 rounded-xl p-3">
                <p className="text-[11px] uppercase text-slate-500 dark:text-gray-400">Abonos parciales</p>
                <p className="font-semibold">{abonosParciales}</p>
              </div>
              <div className="bg-slate-50 dark:bg-gray-800/70 border border-slate-200 dark:border-gray-700 rounded-xl p-3">
                <p className="text-[11px] uppercase text-slate-500 dark:text-gray-400">Moneda</p>
                <p className="font-semibold">{cuenta.moneda}</p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase font-semibold text-slate-500 dark:text-gray-400">Cuotas</p>
              {lastCobranzaNumero && <span className="text-[11px] text-slate-500">Última cobranza: {lastCobranzaNumero}</span>}
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-gray-700">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 dark:bg-gray-900/60 text-slate-500 dark:text-gray-300">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">#</th>
                    <th className="px-3 py-2 text-left font-semibold">Vencimiento</th>
                    <th className="px-3 py-2 text-right font-semibold">Importe</th>
                    <th className="px-3 py-2 text-center font-semibold">Estado</th>
                    <th className="px-3 py-2 text-left font-semibold">Fecha pago</th>
                    <th className="px-3 py-2 text-left font-semibold">Pagado por</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                  {installments.map((cuota) => {
                    const paymentMeta = paymentMetaByInstallment.get(cuota.installmentNumber);
                    return (
                      <tr key={cuota.installmentNumber} className="text-slate-800 dark:text-gray-100">
                        <td className="px-3 py-2 font-semibold">{cuota.installmentNumber}</td>
                        <td className="px-3 py-2">{cuota.dueDate || '—'}</td>
                        <td className="px-3 py-2 text-right font-semibold">{formatMoney(cuota.amountOriginal, cuenta.moneda)}</td>
                        <td className="px-3 py-2 text-center">
                          <span className="inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                            {cuota.status}
                          </span>
                        </td>
                        <td className="px-3 py-2">{paymentMeta?.date || cancelacion || '—'}</td>
                        <td className="px-3 py-2">{paymentMeta?.methodLabel || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-xs uppercase font-semibold text-slate-500 dark:text-gray-400">Cobranzas asociadas</p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-gray-700">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 dark:bg-gray-900/60 text-slate-500 dark:text-gray-300">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Doc cobranza</th>
                    <th className="px-3 py-2 text-left font-semibold">Fecha</th>
                    <th className="px-3 py-2 text-left font-semibold">Caja</th>
                    <th className="px-3 py-2 text-right font-semibold">Importe</th>
                    <th className="px-3 py-2 text-left font-semibold">Medios</th>
                    <th className="px-3 py-2 text-left font-semibold">N° operación</th>
                    <th className="px-3 py-2 text-left font-semibold">Aplicación</th>
                    <th className="px-3 py-2 text-center font-semibold">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                  {cobranzas.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2 font-semibold">{item.numero}</td>
                      <td className="px-3 py-2">{item.fechaCobranza}</td>
                      <td className="px-3 py-2">{item.cajaDestino ?? '-'}</td>
                      <td className="px-3 py-2 text-right font-semibold">{formatMoney(item.monto, item.moneda)}</td>
                      <td className="px-3 py-2">{resolveCobranzaPaymentMeans(item).summaryLabel}</td>
                      <td className="px-3 py-2" title={item.referencia || undefined}>{getCobranzaOperacionLabel(item)}</td>
                      <td className="px-3 py-2">{getCobranzaTipoCobroLabel(item, cuenta)}</td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => onVerConstancia(item)}
                          className="text-[11px] font-semibold text-blue-600 hover:underline"
                        >
                          Constancia
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <footer className="px-6 py-4 border-t border-slate-100 dark:border-gray-800 text-right text-xs text-slate-500">
          Monto total cobrado: <span className="font-semibold text-slate-900 dark:text-white">{formatMoney(cuenta.total, cuenta.moneda)}</span>
        </footer>
      </div>
    </div>
  );
};
