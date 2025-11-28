import { X } from 'lucide-react';
import type { CobranzaDocumento } from '../models/cobranzas.types';

interface CobranzaDetailModalProps {
  cobranza: CobranzaDocumento | null;
  isOpen: boolean;
  onClose: () => void;
  formatMoney: (value: number, currency?: string) => string;
}

export const CobranzaDetailModal = ({ cobranza, isOpen, onClose, formatMoney }: CobranzaDetailModalProps) => {
  if (!isOpen || !cobranza) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-gray-700">
        <header className="flex items-start justify-between px-5 py-4 border-b border-slate-100 dark:border-gray-800">
          <div>
            <p className="text-xs uppercase text-slate-500 dark:text-gray-400 font-semibold tracking-wide">Detalle de cobranza</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">{cobranza.numero}</p>
            <p className="text-xs text-slate-500 dark:text-gray-400">Registrado el {cobranza.fechaCobranza}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </header>
        <div className="px-5 py-4 space-y-4 text-sm text-slate-700 dark:text-gray-100">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase text-slate-500 dark:text-gray-400">Comprobante</p>
              <p className="font-semibold">{cobranza.comprobanteSerie}-{cobranza.comprobanteNumero}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500 dark:text-gray-400">Cliente</p>
              <p className="font-semibold">{cobranza.clienteNombre}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500 dark:text-gray-400">Medio de pago</p>
              <p className="font-semibold capitalize">{cobranza.medioPago}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500 dark:text-gray-400">Caja destino</p>
              <p className="font-semibold">{cobranza.cajaDestino}</p>
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-800 rounded-xl p-4">
            <p className="text-xs uppercase text-slate-500 dark:text-gray-400 font-semibold">Importe cobrado</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{formatMoney(cobranza.monto)}</p>
            <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">Estado: <span className="font-semibold capitalize">{cobranza.estado}</span></p>
          </div>
          {cobranza.notas && (
            <div>
              <p className="text-xs uppercase text-slate-500 dark:text-gray-400">Notas</p>
              <p className="mt-1 text-sm leading-relaxed">{cobranza.notas}</p>
            </div>
          )}
        </div>
        <footer className="px-5 py-4 border-t border-slate-100 dark:border-gray-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            Cerrar
          </button>
        </footer>
      </div>
    </div>
  );
};
