// DeleteCajaModal - Confirmation modal for deleting a caja with validation messages
import { AlertTriangle, X } from 'lucide-react';
import type { Caja } from '../../models/Caja';

interface DeleteCajaModalProps {
  isOpen: boolean;
  caja: Caja | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteCajaModal({ isOpen, caja, onConfirm, onCancel }: DeleteCajaModalProps) {
  if (!isOpen || !caja) return null;

  // Validation checks
  const canDelete = !caja.habilitada && !caja.tieneHistorial;
  const isEnabled = caja.habilitada;
  const hasHistory = caja.tieneHistorial;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 relative">
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="p-6 pt-8">
          <div className="flex items-start gap-4 mb-4">
            <div className={`
              p-3 rounded-full
              ${canDelete 
                ? 'bg-yellow-100 dark:bg-yellow-900/30' 
                : 'bg-red-100 dark:bg-red-900/30'}
            `}>
              <AlertTriangle className={`
                w-6 h-6
                ${canDelete 
                  ? 'text-yellow-600 dark:text-yellow-400' 
                  : 'text-red-600 dark:text-red-400'}
              `} />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Eliminar Caja: {caja.nombre}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Solo puedes eliminar una caja inhabilitada y sin historial de uso. 
                Esta acción no se puede deshacer.
              </p>
            </div>
          </div>

          {/* Validation errors */}
          {!canDelete && (
            <div className="mb-6 space-y-2">
              {isEnabled && (
                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <span className="text-red-600 dark:text-red-400 text-sm font-medium">
                    ✕ La caja está habilitada.
                  </span>
                </div>
              )}
              {hasHistory && (
                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <span className="text-red-600 dark:text-red-400 text-sm font-medium">
                    ✕ La caja ya tiene historial de uso.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={!canDelete}
              className={`
                px-6 py-2 text-sm font-medium rounded-lg transition-colors
                ${canDelete
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'}
              `}
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
