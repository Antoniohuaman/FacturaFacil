import { Package } from 'lucide-react';

interface Props {
  onConfigurar: () => void;
}

export default function CintilloControlStock({ onConfigurar }: Props) {
  return (
    <div className="mx-6 mt-3 flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
      <div className="flex items-start gap-3 flex-1">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-800/50 flex items-center justify-center mt-0.5">
          <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
            Configura tu inventario
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5 leading-relaxed">
            Antes de registrar stock, define cómo se descontará el inventario en tus documentos.
          </p>
        </div>
      </div>
      <div className="flex-shrink-0 sm:ml-4">
        <button
          onClick={onConfigurar}
          className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 whitespace-nowrap"
        >
          Configurar inventario
        </button>
      </div>
    </div>
  );
}
