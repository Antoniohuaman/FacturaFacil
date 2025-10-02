// src/features/catalogo-articulos/components/ImportModal.tsx

import React, { useState, useRef } from 'react';
import type { ImportConfig } from '../models/types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (config: ImportConfig) => void;
  tipo: 'basica' | 'completa';
}

const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  tipo
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [showHeaders, setShowHeaders] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          file.type === "application/vnd.ms-excel") {
        setArchivo(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setArchivo(e.target.files[0]);
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

  const handleImport = async () => {
    if (!archivo) return;
    
    setLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simular procesamiento
      
      const config: ImportConfig = {
        tipo,
        archivo,
        mapeoColumnas: {},
        validaciones: true
      };
      
      onImport(config);
      onClose();
    } catch (error) {
      console.error('Error importing file:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    // Simular descarga de plantilla
    const link = document.createElement('a');
    link.href = '#';
    link.download = `plantilla_${tipo}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  const getModalTitle = () => {
    return tipo === 'basica' ? 'Importación básica' : 'Importación completa';
  };

  const getModalDescription = () => {
    return tipo === 'basica' 
      ? 'Documento en excel con las columnas básicas.'
      : 'Documento en excel con las columnas completas.';
  };

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
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Descargar plantilla {tipo}
              </button>
              <button
                onClick={onClose}
                className="rounded-md text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            {/* Warning para importación completa */}
            {tipo === 'completa' && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      La columna impuestos ahora utiliza abreviaturas para la importación y exportación de productos.
                    </h3>
                    <p className="mt-1 text-sm text-yellow-700">
                      Puedes consultar la lista de abreviaturas 
                      <button className="underline hover:no-underline ml-1">aquí</button>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Upload Area */}
            <div
              className={`
                relative border-2 border-dashed rounded-lg p-12 text-center transition-colors
                ${dragActive 
                  ? 'border-red-400 bg-red-50' 
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
                      {(archivo.size / 1024 / 1024).toFixed(2)} MB
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
                      Selecciona tu archivo excel
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Arrastra y suelta tu archivo aquí, o
                      <button
                        onClick={openFileSelector}
                        className="text-red-600 hover:text-red-700 underline ml-1"
                      >
                        busca en tu computadora
                      </button>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Options */}
            <div className="mt-6 space-y-4">
              <button
                onClick={() => setShowHeaders(!showHeaders)}
                className="flex items-center text-sm text-red-600 hover:text-red-700 transition-colors"
              >
                <svg 
                  className={`mr-2 h-4 w-4 transform transition-transform ${showHeaders ? 'rotate-90' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Ver cabeceras de plantilla
              </button>

              {showHeaders && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Columnas requeridas para {tipo === 'basica' ? 'importación básica' : 'importación completa'}:
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                    <div className="space-y-1">
                      <div>• Código</div>
                      <div>• Nombre</div>
                      <div>• Precio</div>
                      <div>• Unidad</div>
                    </div>
                    <div className="space-y-1">
                      <div>• Categoría</div>
                      <div>• Cantidad</div>
                      {tipo === 'completa' && (
                        <>
                          <div>• Impuestos</div>
                          <div>• Descripción</div>
                          <div>• Alias</div>
                          <div>• Precio Compra</div>
                          <div>• Porcentaje Ganancia</div>
                          <div>• Código Barras</div>
                          <div>• Código Fábrica</div>
                          <div>• Código SUNAT</div>
                          <div>• Descuento Producto</div>
                          <div>• Marca</div>
                          <div>• Modelo</div>
                          <div>• Peso</div>
                          <div>• Tipo Existencia</div>
                        </>
                      )}
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
                    Recuerda
                  </h3>
                  <p className="mt-1 text-sm text-blue-700">
                    Todas las cabeceras son sensibles a mayúsculas y tildes.
                  </p>
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
              onClick={handleImport}
              disabled={!archivo || loading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Procesando archivo...
                </div>
              ) : (
                'Subir tu archivo excel'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;