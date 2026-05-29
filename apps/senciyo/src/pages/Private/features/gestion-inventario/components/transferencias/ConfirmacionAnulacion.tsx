// src/features/gestion-inventario/components/transferencias/ConfirmacionAnulacion.tsx

import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import type { Transferencia } from '../../models/transferencia.types';

interface ConfirmacionAnulacionProps {
  transferencia: Transferencia;
  onConfirmar: () => void;
  onCancelar: () => void;
}

const ConfirmacionAnulacion: React.FC<ConfirmacionAnulacionProps> = ({
  transferencia,
  onConfirmar,
  onCancelar,
}) => {
  const esEnTransito = transferencia.estado === 'EN_TRANSITO';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
        <div className="bg-gradient-to-r from-red-600 to-red-700 px-5 py-4 rounded-t-xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-white" />
            <h2 className="text-base font-bold text-white">Anular transferencia</h2>
          </div>
          <button
            onClick={onCancelar}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            ¿Confirmas la anulación de <strong className="font-mono">{transferencia.id}</strong>?
          </p>

          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Producto</span>
              <span className="font-medium text-gray-900 dark:text-gray-100 text-right max-w-[60%] truncate">
                {transferencia.productoNombre}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Cantidad</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{transferencia.cantidad}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Origen</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{transferencia.almacenOrigenNombre}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Destino</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{transferencia.almacenDestinoNombre}</span>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-300">
            {esEnTransito
              ? 'Se creará un movimiento de entrada al almacén origen para restituir el stock despachado.'
              : 'Se crearán movimientos inversos. El stock volverá al estado anterior a la transferencia.'}
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 px-5 py-3 flex justify-end space-x-3">
          <button
            onClick={onCancelar}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            Anular transferencia
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmacionAnulacion;
