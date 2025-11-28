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

export const CobranzasTable = ({ data, formatMoney, onVerDetalle, onVerComprobante }: CobranzasTableProps) => {
  if (!data.length) {
    return (
      <div className="mt-6 bg-white dark:bg-gray-800 border border-dashed border-slate-300 dark:border-gray-700 rounded-xl p-8 text-center text-sm text-slate-500 dark:text-gray-400">
        No se registraron cobranzas en el período seleccionado.
      </div>
    );
  }

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
            <th className="px-4 py-3 text-right font-semibold">Importe</th>
            <th className="px-4 py-3 text-center font-semibold">Estado</th>
            <th className="px-4 py-3 text-center font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-gray-800 text-slate-700 dark:text-gray-100">
          {data.map((cobranza) => (
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
          ))}
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
