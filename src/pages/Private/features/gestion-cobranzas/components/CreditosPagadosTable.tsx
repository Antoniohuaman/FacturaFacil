import { Eye } from 'lucide-react';
import type { CreditoPagadoResumen } from '../models/cobranzas.types';

interface CreditosPagadosTableProps {
  data: CreditoPagadoResumen[];
  formatMoney: (value: number, currency?: string) => string;
  onVerDetalle: (credito: CreditoPagadoResumen) => void;
  onVerComprobante: (comprobanteId: string) => void;
}

export const CreditosPagadosTable = ({ data, formatMoney, onVerDetalle, onVerComprobante }: CreditosPagadosTableProps) => {
  const hasData = data.length > 0;
  const columnCount = 8;

  return (
    <div className="mt-6 overflow-x-auto bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl shadow-sm">
      <table className="min-w-full divide-y divide-slate-100 dark:divide-gray-700 text-sm">
        <thead className="bg-slate-50 dark:bg-gray-900/50 text-xs uppercase tracking-wide text-slate-500 dark:text-gray-400">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Comprobante</th>
            <th className="px-4 py-3 text-left font-semibold">Emisión</th>
            <th className="px-4 py-3 text-left font-semibold">Cliente</th>
            <th className="px-4 py-3 text-left font-semibold">Cuotas</th>
            <th className="px-4 py-3 text-left font-semibold">Total</th>
            <th className="px-4 py-3 text-left font-semibold">Cancelación</th>
            <th className="px-4 py-3 text-left font-semibold">Cobros</th>
            <th className="px-4 py-3 text-center font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-gray-800 text-slate-700 dark:text-gray-100">
          {hasData ? (
            data.map((item) => (
              <tr key={item.cuenta.id} className="hover:bg-slate-50/70 dark:hover:bg-gray-900/40 transition-colors">
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onVerComprobante(item.cuenta.comprobanteId)}
                    className="text-sm font-semibold text-blue-600 hover:underline"
                  >
                    {item.cuenta.comprobanteSerie}-{item.cuenta.comprobanteNumero}
                  </button>
                  <p className="text-[11px] text-slate-500">{item.cuenta.tipoComprobante}</p>
                </td>
                <td className="px-4 py-3 text-xs font-medium">{item.cuenta.fechaEmision}</td>
                <td className="px-4 py-3">
                  <p className="font-medium">{item.cuenta.clienteNombre}</p>
                  <p className="text-[11px] text-slate-500">{item.cuenta.clienteDocumento}</p>
                </td>
                <td className="px-4 py-3 text-sm font-semibold">{item.cuotasLabel}</td>
                <td className="px-4 py-3 text-sm font-semibold">{formatMoney(item.cuenta.total, item.cuenta.moneda)}</td>
                <td className="px-4 py-3 text-xs">{item.cancelacion || '—'}</td>
                <td className="px-4 py-3 text-xs font-semibold">{item.cobrosCount}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    type="button"
                    onClick={() => onVerDetalle(item)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
                  >
                    <Eye className="w-3.5 h-3.5" /> Ver
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columnCount} className="px-4 py-10 text-center text-sm text-slate-500">
                No hay créditos pagados en el período seleccionado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
