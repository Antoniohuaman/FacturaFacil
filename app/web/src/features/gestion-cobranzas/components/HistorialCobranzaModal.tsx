import { X } from 'lucide-react';
import type { CobranzaDocumento, CuentaPorCobrarSummary } from '../models/cobranzas.types';

interface HistorialCobranzaModalProps {
  cuenta: CuentaPorCobrarSummary | null;
  cobranzas: CobranzaDocumento[];
  isOpen: boolean;
  onClose: () => void;
  formatMoney: (value: number, currency?: string) => string;
}

export const HistorialCobranzaModal = ({ cuenta, cobranzas, isOpen, onClose, formatMoney }: HistorialCobranzaModalProps) => {
  if (!isOpen || !cuenta) return null;

  const related = cobranzas.filter((item) => item.comprobanteId === cuenta.comprobanteId);

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
          {cuenta.creditTerms && cuenta.creditTerms.schedule.length > 0 && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-800">
                <p className="font-semibold">
                  {cuenta.creditTerms.schedule.length} cuota{cuenta.creditTerms.schedule.length === 1 ? '' : 's'} programada{cuenta.creditTerms.schedule.length === 1 ? '' : 's'}
                </p>
                <span>Vencimiento global: {cuenta.creditTerms.fechaVencimientoGlobal}</span>
              </div>
              <div className="mt-3 max-h-48 overflow-y-auto rounded-xl border border-emerald-100 bg-white">
                <table className="w-full text-xs text-emerald-900">
                  <thead className="bg-emerald-50 text-emerald-700">
                    <tr>
                      <th className="px-3 py-1 text-left">#</th>
                      <th className="px-3 py-1 text-left">Vence</th>
                      <th className="px-3 py-1 text-left">% total</th>
                      <th className="px-3 py-1 text-right">Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cuenta.creditTerms.schedule.map((cuota) => (
                      <tr key={cuota.numeroCuota} className="border-t border-emerald-50">
                        <td className="px-3 py-1 font-semibold">{cuota.numeroCuota}</td>
                        <td className="px-3 py-1">{cuota.fechaVencimiento}</td>
                        <td className="px-3 py-1">{cuota.porcentaje}%</td>
                        <td className="px-3 py-1 text-right font-semibold">{formatMoney(cuota.importe, cuenta.moneda)}</td>
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
