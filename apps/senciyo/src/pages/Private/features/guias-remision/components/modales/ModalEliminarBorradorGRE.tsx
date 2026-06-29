import { Trash2 } from 'lucide-react';
import type { GuiaRemision } from '../../modelos/GuiaRemision';

interface Props {
  open: boolean;
  guia: GuiaRemision | null;
  onConfirmar: () => void;
  onCancelar: () => void;
  cargando?: boolean;
}

export default function ModalEliminarBorradorGRE({
  open,
  guia,
  onConfirmar,
  onCancelar,
  cargando = false,
}: Props) {
  if (!open || !guia) return null;

  const nombre = guia.serie ? guia.serie : 'sin serie';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-2">
            <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Eliminar borrador</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Serie: <span className="font-mono">{nombre}</span>
            </p>
          </div>
        </div>

        <div className="px-6 py-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            El borrador será eliminado permanentemente. Esta acción no se puede deshacer.
          </p>
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
            {cargando ? 'Eliminando…' : 'Eliminar borrador'}
          </button>
        </div>
      </div>
    </div>
  );
}
