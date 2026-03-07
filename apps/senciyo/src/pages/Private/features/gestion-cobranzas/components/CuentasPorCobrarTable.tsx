import { AlertTriangle, Clock, FileText, Wallet } from 'lucide-react';
import type { ReactNode } from 'react';
import type { TableColumnState } from '../columns/types';
import type { CuentasPorCobrarColumnKey } from '../columns/columnConfig';
import type { CuentaPorCobrarSummary } from '../models/cobranzas.types';
import { formatCuentaCuotasLabel, formatCuentaFormaPago, getCuentaInstallmentStats } from '../utils/reporting';

interface CuentasPorCobrarTableProps {
  data: CuentaPorCobrarSummary[];
  formatMoney: (value: number, currency?: string) => string;
  onRegistrarCobranza: (cuenta: CuentaPorCobrarSummary) => void;
  onVerComprobante: (cuenta: CuentaPorCobrarSummary) => void;
  onVerHistorial: (cuenta: CuentaPorCobrarSummary) => void;
  highlightId?: string | null;
  visibleColumns: TableColumnState<CuentasPorCobrarColumnKey>[];
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

type CuentaRenderHelpers = {
  formatMoney: (value: number, currency?: string) => string;
  onRegistrarCobranza: (cuenta: CuentaPorCobrarSummary) => void;
  onVerComprobante: (cuenta: CuentaPorCobrarSummary) => void;
  onVerHistorial: (cuenta: CuentaPorCobrarSummary) => void;
};

type CuentaCellRenderer = (cuenta: CuentaPorCobrarSummary, helpers: CuentaRenderHelpers) => ReactNode;

const cuentasColumnRenderers: Record<CuentasPorCobrarColumnKey, CuentaCellRenderer> = {
  cliente: (cuenta) => (
    <div className="flex flex-col gap-0.5">
      <span className="font-medium text-slate-900 dark:text-white">{cuenta.clienteNombre}</span>
      <span className="text-xs text-slate-500">{cuenta.clienteDocumento}</span>
    </div>
  ),
  comprobante: (cuenta) => (
    <div className="flex flex-col">
      <span className="font-medium">{cuenta.comprobanteSerie}-{cuenta.comprobanteNumero}</span>
      <span className="text-xs text-slate-500">{cuenta.tipoComprobante}</span>
    </div>
  ),
  fechaEmision: (cuenta) => <span className="text-xs">{cuenta.fechaEmision}</span>,
  fechaVencimiento: (cuenta) => (
    <span className={cuenta.vencido ? 'text-red-600 font-semibold' : ''}>{cuenta.fechaVencimiento || '-'}</span>
  ),
  formaPago: (cuenta) => {
    const fullLabel = cuenta.formaPago === 'credito' && cuenta.creditTerms ? formatCuentaFormaPago(cuenta) : '';
    const planLabel = fullLabel ? fullLabel.replace(/\s*·\s*vence\s.+$/, '') : '';

    return (
      <div className="flex flex-col items-center gap-0.5">
        <span className="font-medium text-slate-900 dark:text-white">{cuenta.formaPago}</span>
        {planLabel && planLabel !== cuenta.formaPago && (
          <span
            className="max-w-[120px] truncate text-[11px] text-slate-500 whitespace-nowrap"
            title={planLabel}
          >
            {planLabel}
          </span>
        )}
      </div>
    );
  },
  cuotas: (cuenta) => {
    const installmentStats = getCuentaInstallmentStats(cuenta);
    if (installmentStats && installmentStats.total > 0) {
      return (
        <div className="flex flex-col items-center gap-1 text-slate-600">
          <span className="font-semibold text-slate-900 dark:text-white">
            {formatCuentaCuotasLabel(installmentStats)}
          </span>
          <div className="flex flex-wrap items-center justify-center gap-1">
            {installmentStats.partial > 0 && (
              <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-[2px] text-[11px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                {installmentStats.partial} en parcial
              </span>
            )}
            {installmentStats.canceled > 0 && (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-[2px] text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                {installmentStats.canceled} cancelada{installmentStats.canceled === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>
      );
    }
    return <span className="text-slate-400">—</span>;
  },
  total: (cuenta, { formatMoney }) => <span>{formatMoney(cuenta.total, cuenta.moneda)}</span>,
  cobrado: (cuenta, { formatMoney }) => <span>{formatMoney(cuenta.cobrado, cuenta.moneda)}</span>,
  saldo: (cuenta, { formatMoney }) => (
    <span className={cuenta.saldo > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}>
      {formatMoney(cuenta.saldo, cuenta.moneda)}
    </span>
  ),
  estado: (cuenta) => (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${statusBadgeClass(cuenta.estado)}`}>
      {cuenta.estado === 'vencido' && <AlertTriangle className="w-3.5 h-3.5" />}
      {cuenta.estado}
    </span>
  ),
  acciones: (cuenta, { onRegistrarCobranza, onVerComprobante, onVerHistorial }) => (
    <div className="flex items-center justify-center gap-1">
      <button
        type="button"
        onClick={() => onRegistrarCobranza(cuenta)}
        className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-md border border-blue-200 px-3 text-[11px] font-semibold text-blue-700 hover:bg-blue-50"
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
  )
};

export const CuentasPorCobrarTable = ({
  data,
  formatMoney,
  onRegistrarCobranza,
  onVerComprobante,
  onVerHistorial,
  highlightId,
  visibleColumns
}: CuentasPorCobrarTableProps) => {
  const hasData = data.length > 0;
  const columnCount = visibleColumns.length || 1;

  return (
    <div className="mt-6 overflow-x-auto bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl shadow-sm">
      <table className="min-w-full divide-y divide-slate-100 dark:divide-gray-700 text-sm">
        <thead className="bg-slate-50 dark:bg-gray-900/50 text-xs uppercase tracking-wide text-slate-500 dark:text-gray-400">
          <tr>
            {visibleColumns.map((column) => (
              <th
                key={column.key}
                className={`px-4 py-3 font-semibold ${column.headerClassName ?? 'text-left'}`.trim()}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-gray-800 text-slate-700 dark:text-gray-100">
          {hasData ? (
            data.map((cuenta) => {
              const isHighlighted = Boolean(highlightId && highlightId === cuenta.id);
              const focusId =
                cuenta.id || cuenta.comprobanteId || `${cuenta.comprobanteSerie}-${cuenta.comprobanteNumero}` || 'sin-id';

              return (
                <tr
                  key={cuenta.id}
                  data-focus={`cobranzas:${focusId}`}
                  className={`hover:bg-slate-50/70 dark:hover:bg-gray-900/40 transition-colors ${
                    isHighlighted ? 'bg-blue-50/80 dark:bg-blue-900/30 ring-2 ring-blue-200 dark:ring-blue-800' : ''
                  }`}
                >
                  {visibleColumns.map((column) => (
                    <td key={column.key} className={column.cellClassName ?? 'px-4 py-3'}>
                      {cuentasColumnRenderers[column.key](cuenta, {
                        formatMoney,
                        onRegistrarCobranza,
                        onVerComprobante,
                        onVerHistorial
                      })}
                    </td>
                  ))}
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={columnCount} className="px-4 py-10 text-center text-sm text-slate-500">
                No hay cuentas pendientes con los filtros seleccionados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
