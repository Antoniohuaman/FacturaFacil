import { AlertTriangle, ArrowRightCircle, Clock, FileText, Wallet } from 'lucide-react';
import type { CuentaPorCobrarSummary } from '../models/cobranzas.types';

interface CuentasPorCobrarTableProps {
  data: CuentaPorCobrarSummary[];
  formatMoney: (value: number, currency?: string) => string;
  onRegistrarCobranza: (cuenta: CuentaPorCobrarSummary) => void;
  onVerComprobante: (cuenta: CuentaPorCobrarSummary) => void;
  onVerHistorial: (cuenta: CuentaPorCobrarSummary) => void;
  highlightId?: string | null;
}

const statusBadgeClass = (estado: CuentaPorCobrarSummary['estado']) => {
  switch (estado) {
    case 'cancelado':
      return 'bg-emerald-100 text-emerald-700';
    case 'parcial':
      return 'bg-amber-100 text-amber-700';
    case 'vencido':
      return 'bg-red-100 text-red-700';
    case 'pendiente':
    default:
      return 'bg-slate-100 text-slate-700';
  }
};

const resolveInstallmentStats = (cuenta: CuentaPorCobrarSummary) => {
  let total = cuenta.totalInstallments;
  let pending = cuenta.pendingInstallmentsCount;
  const partial = cuenta.partialInstallmentsCount ?? 0;

  if (typeof total !== 'number' && cuenta.creditTerms?.schedule?.length) {
    total = cuenta.creditTerms.schedule.length;
  }

  if (typeof pending !== 'number' && typeof total === 'number') {
    pending = total;
  }

  if (typeof total !== 'number' || typeof pending !== 'number') {
    return null;
  }

  return {
    total,
    pending,
    partial,
    canceled: Math.max(0, total - pending),
  };
};

export const CuentasPorCobrarTable = ({
  data,
  formatMoney,
  onRegistrarCobranza,
  onVerComprobante,
  onVerHistorial,
  highlightId,
}: CuentasPorCobrarTableProps) => {
  const hasData = data.length > 0;

  return (
    <div className="mt-6 overflow-x-auto bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl shadow-sm">
      <table className="min-w-full divide-y divide-slate-100 dark:divide-gray-700 text-sm">
        <thead className="bg-slate-50 dark:bg-gray-900/50 text-xs uppercase tracking-wide text-slate-500 dark:text-gray-400">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Cliente</th>
            <th className="px-4 py-3 text-left font-semibold">Comprobante</th>
            <th className="px-4 py-3 text-center font-semibold">F. emisión</th>
            <th className="px-4 py-3 text-center font-semibold">F. vencimiento</th>
            <th className="px-4 py-3 text-center font-semibold">Forma</th>
            <th className="px-4 py-3 text-center font-semibold">Cuotas</th>
            <th className="px-4 py-3 text-right font-semibold">Total</th>
            <th className="px-4 py-3 text-right font-semibold">Cobrado</th>
            <th className="px-4 py-3 text-right font-semibold">Saldo</th>
            <th className="px-4 py-3 text-center font-semibold">Estado</th>
            <th className="px-4 py-3 text-center font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-gray-800 text-slate-700 dark:text-gray-100">
          {hasData ? data.map((cuenta) => {
            const installmentStats = resolveInstallmentStats(cuenta);
            const isHighlighted = Boolean(highlightId && highlightId === cuenta.id);
            return (
              <tr
                key={cuenta.id}
                className={`hover:bg-slate-50/70 dark:hover:bg-gray-900/40 transition-colors ${
                  isHighlighted ? 'bg-blue-50/80 dark:bg-blue-900/30 ring-2 ring-blue-200 dark:ring-blue-800' : ''
                }`}
              >
              <td className="px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-slate-900 dark:text-white">{cuenta.clienteNombre}</span>
                  <span className="text-xs text-slate-500">{cuenta.clienteDocumento}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-col">
                  <span className="font-medium">{cuenta.comprobanteSerie}-{cuenta.comprobanteNumero}</span>
                  <span className="text-xs text-slate-500">{cuenta.tipoComprobante}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-center text-xs">{cuenta.fechaEmision}</td>
              <td className="px-4 py-3 text-center text-xs">
                <span className={cuenta.vencido ? 'text-red-600 font-semibold' : ''}>{cuenta.fechaVencimiento || '-'}</span>
              </td>
              <td className="px-4 py-3 text-center text-xs capitalize">
                <div className="flex flex-col items-center gap-0.5">
                  <span className="font-medium text-slate-900 dark:text-white">{cuenta.formaPago}</span>
                  {cuenta.creditTerms && (
                    <span className="text-[11px] text-slate-500">
                      {cuenta.creditTerms.schedule.length} cuota{cuenta.creditTerms.schedule.length === 1 ? '' : 's'} ·
                      vence {cuenta.creditTerms.fechaVencimientoGlobal}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-center text-xs">
                {installmentStats && installmentStats.total > 0 ? (
                  <div className="flex flex-col items-center gap-0.5 text-slate-600">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {installmentStats.pending}/{installmentStats.total}
                    </span>
                    <span className="text-[11px] text-slate-500">Cuotas pendientes</span>
                    {installmentStats.partial > 0 && (
                      <span className="text-[11px] text-amber-600">{installmentStats.partial} en parcial</span>
                    )}
                    {installmentStats.canceled > 0 && (
                      <span className="text-[11px] text-emerald-600">{installmentStats.canceled} cancelada{installmentStats.canceled === 1 ? '' : 's'}</span>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-right font-medium">{formatMoney(cuenta.total, cuenta.moneda)}</td>
              <td className="px-4 py-3 text-right text-slate-500">{formatMoney(cuenta.cobrado, cuenta.moneda)}</td>
              <td className={`px-4 py-3 text-right font-semibold ${cuenta.saldo > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                {formatMoney(cuenta.saldo, cuenta.moneda)}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${statusBadgeClass(cuenta.estado)}`}>
                  {cuenta.estado === 'vencido' && <AlertTriangle className="w-3.5 h-3.5" />}
                  {cuenta.estado}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-center gap-1">
                  <button
                    type="button"
                    onClick={() => onRegistrarCobranza(cuenta)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50"
                    title="Registrar Cobranza"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    Registrar Cobranza
                  </button>
                  <button
                    type="button"
                    onClick={() => onVerComprobante(cuenta)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-900"
                    title="Ver comprobante"
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onVerHistorial(cuenta)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-900"
                    title="Ver historial"
                  >
                    <Clock className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
              </tr>
            );
          }) : (
            <tr>
              <td colSpan={11} className="px-4 py-10 text-center text-sm text-slate-500">
                No hay cuentas pendientes con los filtros seleccionados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <footer className="px-4 py-3 text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 dark:border-gray-700">
        <span>Mostrando {data.length} registros</span>
        <span className="inline-flex items-center gap-1 text-slate-400">
          <ArrowRightCircle className="w-3.5 h-3.5" /> Actualizado al {new Date().toLocaleDateString('es-PE')}
        </span>
      </footer>
    </div>
  );
};
