import { Ban } from 'lucide-react';
import type { GuiaRemision } from '../../modelos/GuiaRemision';

interface Props {
  open: boolean;
  guia: GuiaRemision | null;
  motivo: string;
  onMotivoChange: (motivo: string) => void;
  onConfirmar: () => void;
  onCancelar: () => void;
  cargando?: boolean;
}

export default function ModalAnularGRE({
  open,
  guia,
  motivo,
  onMotivoChange,
  onConfirmar,
  onCancelar,
  cargando = false,
}: Props) {
  if (!open || !guia) return null;

  const numero =
    guia.serie && guia.correlativo
      ? `${guia.serie}-${guia.correlativo}`
      : guia.serie
        ? guia.serie
        : 'esta guía';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-2">
            <Ban className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Anular guía</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{numero}</p>
          </div>
        </div>

        <div className="px-6 py-4 space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            La guía pasará al estado <strong>Anulada</strong> y no podrá ser revertida. Esta acción no elimina el registro.
          </p>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Motivo de anulación
            </label>
            <textarea
              value={motivo}
              onChange={(e) => onMotivoChange(e.target.value)}
              rows={3}
              placeholder="Indique el motivo…"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-red-500 outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 pb-5">
          <button
            type="button"
            onClick={onCancelar}
            disabled={cargando}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={cargando}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50"
          >
            {cargando ? 'Anulando…' : 'Anular'}
          </button>
        </div>
      </div>
    </div>
  );
}
