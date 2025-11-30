import { Eye, FileText, Receipt } from 'lucide-react';
import type { CobranzaDocumento } from '../models/cobranzas.types';

interface CobranzasTableProps {
  data: CobranzaDocumento[];
  formatMoney: (value: number, currency?: string) => string;
  onVerDetalle: (cobranza: CobranzaDocumento) => void;
  onVerComprobante: (cobranza: CobranzaDocumento) => void;
}

const estadoBadge = (estado: CobranzaDocumento['estado']) => {
  switch (estado) {
    case 'cancelado':
      return 'bg-emerald-100 text-emerald-700';
    case 'parcial':
      return 'bg-amber-100 text-amber-700';
    case 'anulado':
      return 'bg-slate-200 text-slate-600';
    default:
      return 'bg-slate-100 text-slate-700';
  }
};

const renderInstallmentsSnapshot = (cobranza: CobranzaDocumento) => {
  const info = cobranza.installmentsInfo;
  if (!info || info.total === 0) {
    return <span className="text-slate-400">—</span>;
  }

  const paid = Math.max(0, info.total - info.pending);
  const ratio = cobranza.estado === 'cancelado'
    ? `${info.total}/${info.total}`
    : `${paid}/${info.total}`;
  const caption = cobranza.estado === 'cancelado' ? 'Cuotas totales' : 'Cuotas pagadas';

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="font-semibold text-slate-900 dark:text-white">{ratio}</span>
      <span className="text-[11px] text-slate-500">{caption}</span>
    </div>
  );
};

export const CobranzasTable = ({ data, formatMoney, onVerDetalle, onVerComprobante }: CobranzasTableProps) => {
  const hasData = data.length > 0;

  return (
    <div className="mt-6 overflow-x-auto bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl shadow-sm">
      <table className="min-w-full divide-y divide-slate-100 dark:divide-gray-700 text-sm">
        <thead className="bg-slate-50 dark:bg-gray-900/50 text-xs uppercase tracking-wide text-slate-500 dark:text-gray-400">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Documento</th>
            <th className="px-4 py-3 text-left font-semibold">Fecha</th>
            <th className="px-4 py-3 text-left font-semibold">Comprobante relacionado</th>
            <th className="px-4 py-3 text-left font-semibold">Cliente</th>
            <th className="px-4 py-3 text-left font-semibold">Medio de pago</th>
            <th className="px-4 py-3 text-left font-semibold">Caja</th>
            <th className="px-4 py-3 text-center font-semibold">Cuotas</th>
            <th className="px-4 py-3 text-right font-semibold">Importe</th>
            <th className="px-4 py-3 text-center font-semibold">Estado</th>
            <th className="px-4 py-3 text-center font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-gray-800 text-slate-700 dark:text-gray-100">
          {hasData ? data.map((cobranza) => (
            <tr key={cobranza.id} className="hover:bg-slate-50/70 dark:hover:bg-gray-900/40 transition-colors">
              <td className="px-4 py-3">
                <div className="flex flex-col">
                  <span className="font-semibold">{cobranza.numero}</span>
                  <span className="text-xs text-slate-500">{cobranza.tipo}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-xs font-medium">{cobranza.fechaCobranza}</td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => onVerComprobante(cobranza)}
                  className="text-sm font-semibold text-blue-600 hover:underline"
                >
                  {cobranza.comprobanteSerie}-{cobranza.comprobanteNumero}
                </button>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-col">
                  <span className="font-medium">{cobranza.clienteNombre}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-xs font-medium">{cobranza.medioPago}</td>
              <td className="px-4 py-3 text-xs">{cobranza.cajaDestino}</td>
              <td className="px-4 py-3 text-center text-xs">{renderInstallmentsSnapshot(cobranza)}</td>
              <td className="px-4 py-3 text-right font-semibold">{formatMoney(cobranza.monto)}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${estadoBadge(cobranza.estado)}`}>
                  {cobranza.estado}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => onVerDetalle(cobranza)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900"
                  >
                    <Eye className="w-3.5 h-3.5" /> Detalle
                  </button>
                  <button
                    type="button"
                    onClick={() => onVerComprobante(cobranza)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900"
                  >
                    <FileText className="w-3.5 h-3.5" /> Ver
                  </button>
                </div>
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan={10} className="px-4 py-10 text-center text-sm text-slate-500">
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
