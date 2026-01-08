import { Eye, FileText, Receipt } from 'lucide-react';
import type { ReactNode } from 'react';
import type { TableColumnState } from '../columns/types';
import type { CobranzasColumnKey } from '../columns/columnConfig';
import type { CobranzaDocumento, CuentaPorCobrarSummary } from '../models/cobranzas.types';
import {
  getCobranzaEstadoDocumentoLabel,
  getCobranzaInstallmentSnapshot,
  getCobranzaMedioPagoLabel,
  getCobranzaOperacionLabel,
  getCobranzaTipoCobroLabel,
} from '../utils/reporting';


interface CobranzasTableProps {
  data: Array<CobranzaDocumento & { displayAmount?: number; relatedCuenta?: CuentaPorCobrarSummary }>;
  formatMoney: (value: number, currency?: string) => string;
  onVerDetalle: (cobranza: CobranzaDocumento) => void;
  onVerComprobante: (cobranza: CobranzaDocumento) => void;
  visibleColumns: TableColumnState<CobranzasColumnKey>[];
}

const estadoBadge = (estado: CobranzaDocumento['estado']) => {
  switch (estado) {
    case 'anulado':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-emerald-100 text-emerald-700';
  }
};

const renderInstallmentsSnapshot = (cobranza: CobranzaDocumento) => {
  const snapshot = getCobranzaInstallmentSnapshot(cobranza);
  if (!snapshot) {
    return <span className="text-slate-400">—</span>;
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="font-semibold text-slate-900 dark:text-white">{snapshot.ratio}</span>
      <span className="text-[11px] text-slate-500">{snapshot.caption}</span>
    </div>
  );
};

type RenderHelpers = {
  formatMoney: (value: number, currency?: string) => string;
  onVerDetalle: (cobranza: CobranzaDocumento) => void;
  onVerComprobante: (cobranza: CobranzaDocumento) => void;
};

type CobranzasCellRenderer = (
  cobranza: CobranzaDocumento & { displayAmount?: number; relatedCuenta?: CuentaPorCobrarSummary },
  helpers: RenderHelpers
) => ReactNode;

const cobranzasColumnRenderers: Record<CobranzasColumnKey, CobranzasCellRenderer> = {
  documento: (cobranza) => (
    <div className="flex flex-col">
      <span className="font-semibold">{cobranza.numero}</span>
      <span className="text-xs text-slate-500">{cobranza.tipo}</span>
    </div>
  ),
  fecha: (cobranza) => <span className="text-xs font-medium">{cobranza.fechaCobranza}</span>,
  comprobante: (cobranza, { onVerComprobante }) => (
    <button
      type="button"
      onClick={() => onVerComprobante(cobranza)}
      className="text-sm font-semibold text-blue-600 hover:underline"
    >
      {cobranza.comprobanteSerie}-{cobranza.comprobanteNumero}
    </button>
  ),
  cliente: (cobranza) => (
    <div className="flex flex-col">
      <span className="font-medium">{cobranza.clienteNombre}</span>
    </div>
  ),
  medioPago: (cobranza) => <span className="text-xs font-medium">{getCobranzaMedioPagoLabel(cobranza)}</span>,
  caja: (cobranza) => <span className="text-xs">{cobranza.cajaDestino}</span>,
  tipoCobro: (cobranza) => (
    <span className="text-xs font-medium">{getCobranzaTipoCobroLabel(cobranza, cobranza.relatedCuenta)}</span>
  ),
  operacion: (cobranza) => (
    <span className="text-xs font-medium" title={cobranza.referencia || undefined}>
      {getCobranzaOperacionLabel(cobranza)}
    </span>
  ),
  cuotas: (cobranza) => renderInstallmentsSnapshot(cobranza),
  importe: (cobranza, { formatMoney }) => (
    <span className="font-semibold">
      {formatMoney(cobranza.displayAmount ?? cobranza.monto, cobranza.moneda)}
    </span>
  ),
  estado: (cobranza) => (
    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${estadoBadge(cobranza.estado)}`}>
      {getCobranzaEstadoDocumentoLabel(cobranza)}
    </span>
  ),
  acciones: (cobranza, { onVerDetalle, onVerComprobante }) => (
    <div className="flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onVerDetalle(cobranza)}
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900"
      >
        <Eye className="w-3.5 h-3.5" /> Constancia
      </button>
      <button
        type="button"
        onClick={() => onVerComprobante(cobranza)}
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900"
      >
        <FileText className="w-3.5 h-3.5" /> Ver
      </button>
    </div>
  )
};

export const CobranzasTable = ({
  data,
  formatMoney,
  onVerDetalle,
  onVerComprobante,
  visibleColumns
}: CobranzasTableProps) => {
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
            data.map((cobranza) => (
              <tr key={cobranza.id} className="hover:bg-slate-50/70 dark:hover:bg-gray-900/40 transition-colors">
                {visibleColumns.map((column) => (
                  <td key={column.key} className={column.cellClassName ?? 'px-4 py-3'}>
                    {cobranzasColumnRenderers[column.key](cobranza, {
                      formatMoney,
                      onVerDetalle,
                      onVerComprobante
                    })}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columnCount} className="px-4 py-10 text-center text-sm text-slate-500">
                No se registraron cobranzas en el período seleccionado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <footer className="px-4 py-3 text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 dark:border-gray-700">
        <span>{data.length} cobranzas registradas</span>
        <span className="inline-flex items-center gap-1 text-slate-400">
          <Receipt className="w-3.5 h-3.5" /> Resumen mensual
        </span>
      </footer>
    </div>
  );
};
