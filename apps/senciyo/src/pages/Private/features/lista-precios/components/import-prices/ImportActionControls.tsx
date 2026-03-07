import React from 'react';
import { Download, FileSpreadsheet, RefreshCcw, Upload } from 'lucide-react';

interface ImportActionControlsProps {
  tableColumnsCount: number;
  selectedFileName: string | null;
  hasRows: boolean;
  isParsing: boolean;
  onDownloadTemplate: () => void;
  onExportPrices: () => void;
  onResetSelection: () => void;
  onFileSelected: (file: File) => void;
}

export const ImportActionControls: React.FC<ImportActionControlsProps> = ({
  tableColumnsCount,
  selectedFileName,
  hasRows,
  isParsing,
  onDownloadTemplate,
  onExportPrices,
  onResetSelection,
  onFileSelected
}) => {
  const disabledMessage = tableColumnsCount === 0
    ? 'Activa al menos una columna visible para continuar.'
    : undefined;

  const handleFileInput: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelected(file);
    }
    event.target.value = '';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="w-10 h-10 text-blue-600" aria-hidden />
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Importar precios desde Excel</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Descarga la plantilla con las columnas visibles en "Precios por producto", completa los valores y súbela nuevamente para actualizar la lista.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onDownloadTemplate}
            disabled={tableColumnsCount === 0 || isParsing}
            className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${tableColumnsCount === 0 || isParsing
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'text-white bg-blue-600 hover:bg-blue-700'}`}
            title={disabledMessage}
          >
            <Download className="w-4 h-4 mr-2" aria-hidden />
            Descargar plantilla
          </button>
          <button
            type="button"
            onClick={onExportPrices}
            disabled={tableColumnsCount === 0 || isParsing}
            className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${tableColumnsCount === 0 || isParsing
              ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
              : 'text-blue-600 border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'}`}
            title={disabledMessage}
          >
            <RefreshCcw className="w-4 h-4 mr-2" aria-hidden />
            Exportar precios actuales
          </button>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <p className="font-semibold mb-1">Recomendaciones:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Descarga una nueva plantilla cuando cambies las columnas visibles.</li>
            <li>Usa una fila por cada SKU y unidad de medida.</li>
            <li>No reordenes ni agregues columnas adicionales.</li>
            <li>La columna VIGENCIA acepta formatos dd/mm/aaaa o números de Excel.</li>
            <li>El PRECIO MÍNIMO debe ser menor o igual al PRECIO BASE.</li>
          </ul>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-4">
        <div className="text-sm text-gray-500 dark:text-gray-400">Estado del archivo</div>
        <div className="text-2xl font-semibold text-gray-900 dark:text-white break-words">
          {selectedFileName ? selectedFileName : 'Ningún archivo seleccionado'}
        </div>
        <label className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 transition-colors">
          <Upload className="w-4 h-4 mr-2" aria-hidden />
          Seleccionar archivo
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileInput}
            disabled={isParsing}
          />
        </label>
        {hasRows && (
          <button
            type="button"
            onClick={onResetSelection}
            className="inline-flex items-center px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Limpiar selección
          </button>
        )}
      </div>
    </div>
  );
};
