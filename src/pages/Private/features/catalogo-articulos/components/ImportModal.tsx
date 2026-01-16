// src/features/catalogo-articulos/components/ImportModal.tsx

import React, { useState, useRef } from 'react';
import { useConfigurationContext } from '../../configuracion-sistema/context/ConfigurationContext';
import { generateExcelTemplate } from '../utils/excelHelpers';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelected: (file: File) => void;
  tipo: 'basica' | 'completa';
}

const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onFileSelected,
  tipo
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [showHeaders, setShowHeaders] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { state: configState } = useConfigurationContext();
  const establishments = configState.establishments.filter(e => e.isActive);
  const units = configState.units.filter(u => u.isActive && u.isVisible !== false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
          file.type === "application/vnd.ms-excel" ||
          file.name.endsWith('.xlsx') ||
          file.name.endsWith('.xls')) {
        setArchivo(file);
      } else {
        alert('Por favor selecciona un archivo Excel válido (.xlsx o .xls)');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setArchivo(file);
      } else {
        alert('Por favor selecciona un archivo Excel válido (.xlsx o .xls)');
        e.target.value = '';
      }
    }
  };

  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  const removeFile = () => {
    setArchivo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleContinue = () => {
    if (archivo) {
      onFileSelected(archivo);
      onClose();
    }
  };

  const downloadTemplate = () => {
    try {
      generateExcelTemplate(tipo, units, establishments);
    } catch (error) {
      console.error('Error al generar plantilla:', error);
      alert('Error al generar la plantilla. Por favor intenta de nuevo.');
    }
  };

  if (!isOpen) return null;

  const getModalTitle = () => {
    return tipo === 'basica' ? 'Importación básica' : 'Importación completa';
  };

  const getModalDescription = () => {
    return tipo === 'basica'
      ? 'Importa productos con los campos esenciales'
      : 'Importa productos con todos los campos disponibles';
  };

  const requiredFields = [
    'Tipo de producto (Bien/Servicio)',
    'Nombre',
    'Código',
    'Unidad',
    'Impuesto',
    'Establecimientos'
  ];

  const optionalFieldsBasic = [
    'Categoría'
  ];

  const optionalFieldsComplete = [
    ...optionalFieldsBasic,
    'Descripción',
    'Alias',
    'Código de barras',
    'Código de fábrica',
    'Código SUNAT',
    'Marca',
    'Modelo',
    'Peso (KG)',
    'Precio de compra',
    'Porcentaje de ganancia (%)',
    'Descuento (%)',
    'Tipo de existencia'
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative inline-block w-full max-w-2xl my-8 overflow-hidden rounded-lg bg-white text-left align-middle shadow-xl transition-all transform">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {getModalTitle()}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {getModalDescription()}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={downloadTemplate}
                className="inline-flex items-center px-3 py-1.5 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors"
                title="Descargar plantilla Excel"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Descargar plantilla
              </button>
              <button
                onClick={onClose}
                className="rounded-md text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Cerrar modal"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            {/* Upload Area */}
            <div
              className={`
                relative border-2 border-dashed rounded-lg p-12 text-center transition-colors
                ${dragActive
                  ? 'border-violet-400 bg-violet-50'
                  : archivo
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400'
                }
              `}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />

              {archivo ? (
                <div className="space-y-4">
                  <div className="mx-auto h-16 w-16 text-green-500">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{archivo.name}</p>
                    <p className="text-sm text-gray-500">
                      {(archivo.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <button
                    onClick={removeFile}
                    className="inline-flex items-center px-3 py-1 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Eliminar archivo
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="mx-auto h-16 w-16 text-gray-400">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      Selecciona tu archivo Excel
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Arrastra y suelta tu archivo aquí, o
                      <button
                        onClick={openFileSelector}
                        className="text-violet-600 hover:text-violet-700 underline ml-1"
                      >
                        busca en tu computadora
                      </button>
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      Formatos soportados: .xlsx, .xls
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Options */}
            <div className="mt-6 space-y-4">
              <button
                onClick={() => setShowHeaders(!showHeaders)}
                className="flex items-center text-sm text-violet-600 hover:text-violet-700 transition-colors"
              >
                <svg
                  className={`mr-2 h-4 w-4 transform transition-transform ${showHeaders ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Ver campos de la plantilla
              </button>

              {showHeaders && (
                <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">
                      Campos obligatorios:
                    </h4>
                    <div className="grid grid-cols-2 gap-1 text-sm text-gray-700">
                      {requiredFields.map(field => (
                        <div key={field} className="flex items-center">
                          <span className="text-red-500 mr-1">*</span>
                          {field}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">
                      Campos opcionales:
                    </h4>
                    <div className="grid grid-cols-2 gap-1 text-sm text-gray-600">
                      {(tipo === 'basica' ? optionalFieldsBasic : optionalFieldsComplete).map(field => (
                        <div key={field}>• {field}</div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Reminder */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Importante
                  </h3>
                  <ul className="mt-1 text-sm text-blue-700 space-y-1 list-disc list-inside">
                    <li>Los nombres de las columnas son sensibles a mayúsculas y tildes</li>
                    <li>El <strong>Código</strong> es la clave única: si existe se actualizará, si no se creará</li>
                    <li>Descarga siempre la plantilla para asegurar el formato correcto</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleContinue}
              disabled={!archivo}
              className="px-4 py-2 text-sm font-medium text-white bg-violet-600 border border-transparent rounded-md hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Continuar con previsualización
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
