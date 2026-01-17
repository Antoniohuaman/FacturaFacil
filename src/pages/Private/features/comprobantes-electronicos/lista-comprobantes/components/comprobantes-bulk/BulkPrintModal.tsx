import { useState, useEffect } from 'react';
import { X, FileText, File } from 'lucide-react';

type PrintFormat = 'ticket' | 'a4';
type PrintOutput = 'combined' | 'separate';

interface PrintPreferences {
  format: PrintFormat;
  output: PrintOutput;
}

interface BulkPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (format: PrintFormat, output: PrintOutput) => void;
  selectedCount: number;
}

const STORAGE_KEY = 'comprobantes_print_preferences';

export const BulkPrintModal = ({ isOpen, onClose, onConfirm, selectedCount }: BulkPrintModalProps) => {
  const [preferences, setPreferences] = useState<PrintPreferences>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : { format: 'a4', output: 'combined' };
    } catch {
      return { format: 'a4', output: 'combined' };
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Ignorar errores de localStorage
    }
  }, [preferences]);

  const handleConfirm = () => {
    onConfirm(preferences.format, preferences.output);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700"
          role="dialog"
          aria-modal="true"
          aria-labelledby="print-modal-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 id="print-modal-title" className="text-lg font-semibold text-gray-900 dark:text-white">
              Imprimir comprobantes
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            {/* Info */}
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Se imprimirán <span className="font-semibold text-gray-900 dark:text-white">{selectedCount}</span> comprobante{selectedCount !== 1 ? 's' : ''}.
            </p>

            {/* Formato */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Formato de impresión
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPreferences(p => ({ ...p, format: 'ticket' }))}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                    preferences.format === 'ticket'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <FileText className={`w-5 h-5 ${preferences.format === 'ticket' ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${preferences.format === 'ticket' ? 'text-blue-600' : 'text-gray-700 dark:text-gray-300'}`}>
                    Ticket
                  </span>
                </button>

                <button
                  onClick={() => setPreferences(p => ({ ...p, format: 'a4' }))}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                    preferences.format === 'a4'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <File className={`w-5 h-5 ${preferences.format === 'a4' ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${preferences.format === 'a4' ? 'text-blue-600' : 'text-gray-700 dark:text-gray-300'}`}>
                    A4
                  </span>
                </button>
              </div>
            </div>

            {/* Salida */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Tipo de salida
              </label>
              <div className="space-y-2">
                <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <input
                    type="radio"
                    name="output"
                    checked={preferences.output === 'combined'}
                    onChange={() => setPreferences(p => ({ ...p, output: 'combined' }))}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      PDF combinado
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Un solo archivo con todos los comprobantes
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <input
                    type="radio"
                    name="output"
                    checked={preferences.output === 'separate'}
                    onChange={() => setPreferences(p => ({ ...p, output: 'separate' }))}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      Un PDF por comprobante (ZIP)
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Archivo ZIP con PDFs individuales
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Imprimir
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
