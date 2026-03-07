import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { CuentaPorCobrarSummary } from '../models/cobranzas.types';

interface SeleccionarCuentaModalProps {
  cuentas: CuentaPorCobrarSummary[];
  isOpen: boolean;
  onClose: () => void;
  onSelect: (cuenta: CuentaPorCobrarSummary) => void;
}

export const SeleccionarCuentaModal = ({ cuentas, isOpen, onClose, onSelect }: SeleccionarCuentaModalProps) => {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    if (!search.trim()) return cuentas;
    return cuentas.filter((cuenta) =>
      `${cuenta.clienteNombre} ${cuenta.comprobanteSerie}-${cuenta.comprobanteNumero}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
  }, [cuentas, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-gray-700">
        <header className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-gray-800">
          <div>
            <p className="text-xs uppercase text-slate-500 dark:text-gray-400 font-semibold tracking-wide">Seleccionar comprobante</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">Cuentas por cobrar</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </header>
        <div className="px-5 py-4 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar cliente o comprobante"
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-slate-700 dark:text-gray-100"
            />
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-gray-800">
            {filtered.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-gray-400 py-4 text-center">Sin coincidencias</p>
            ) : (
              filtered.map((cuenta) => (
                <button
                  key={cuenta.id}
                  type="button"
                  onClick={() => {
                    onSelect(cuenta);
                    onClose();
                  }}
                  className="w-full text-left px-3 py-3 hover:bg-slate-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{cuenta.clienteNombre}</p>
                      <p className="text-xs text-slate-500">{cuenta.comprobanteSerie}-{cuenta.comprobanteNumero}</p>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <p>Saldo: <span className="font-semibold text-slate-900 dark:text-white">{cuenta.saldo.toFixed(2)}</span></p>
                      <p className="capitalize">{cuenta.estado}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
        <footer className="px-5 py-4 border-t border-slate-100 dark:border-gray-800 text-right text-xs text-slate-500">
          {filtered.length} resultados
        </footer>
      </div>
    </div>
  );
};
