// src/features/catalogo-articulos/pages/ImportPage.tsx

import React, { useState } from 'react';
import ImportModal from '../components/ImportModal';
import { useProductStore } from '../hooks/useProductStore';
import { useConfigurationContext } from '../../configuracion-sistema/context/ConfigurationContext';
import { parseExcelFile, exportImportErrors, type ImportResult } from '../utils/excelHelpers';

type ImportStep = 'select' | 'preview' | 'result';

const ImportPage: React.FC = () => {
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState<'basica' | 'completa'>('basica');
  const [currentStep, setCurrentStep] = useState<ImportStep>('select');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [finalResult, setFinalResult] = useState<{ createdCount: number; updatedCount: number } | null>(null);

  const { importProducts, allProducts, categories } = useProductStore();
  const { state: configState } = useConfigurationContext();

  const handleFileSelected = async (file: File) => {
    setSelectedFile(file);
    setIsProcessing(true);
    setCurrentStep('preview');

    try {
      const result = await parseExcelFile(
        file,
        importType,
        allProducts,
        configState.units.filter(u => u.isActive && u.isVisible !== false),
        configState.establishments.filter(e => e.isActive),
        categories
      );

      setImportResult(result);
    } catch (error) {
      alert(`Error al procesar el archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      setCurrentStep('select');
      setSelectedFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = () => {
    if (!importResult || importResult.filasValidas.length === 0) {
      alert('No hay filas válidas para importar');
      return;
    }

    setIsProcessing(true);

    try {
      const result = importProducts(importResult.filasValidas as Parameters<typeof importProducts>[0]);
      setFinalResult(result);
      setCurrentStep('result');
    } catch (error) {
      alert(`Error al importar productos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelImport = () => {
    setCurrentStep('select');
    setSelectedFile(null);
    setImportResult(null);
  };

  const handleDownloadErrors = () => {
    if (importResult && importResult.filasInvalidas.length > 0) {
      try {
        exportImportErrors(importResult.filasInvalidas);
      } catch (error) {
        console.error('Error al exportar errores', error);
        alert('Error al exportar errores');
      }
    }
  };

  const handleNewImport = () => {
    setCurrentStep('select');
    setSelectedFile(null);
    setImportResult(null);
    setFinalResult(null);
  };

  const openImportModal = (type: 'basica' | 'completa') => {
    setImportType(type);
    setShowImportModal(true);
  };

  const downloadTemplate = (type: 'basica' | 'completa') => {
    setImportType(type);
    // El modal maneja la descarga
    setShowImportModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Importar productos desde Excel</h1>
        <p className="text-sm text-gray-600 mt-1">
          Carga múltiples productos desde un archivo Excel de forma rápida y sencilla
        </p>
      </div>

      {currentStep === 'select' && (
        <>
          {/* Import Options */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Importación básica */}
            <div className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
              <div className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Importación básica
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Campos esenciales para crear productos rápidamente
                    </p>

                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-700">
                        <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <strong>Tipo, Código, Nombre, Unidad</strong>
                      </div>
                      <div className="flex items-center text-sm text-gray-700">
                        <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <strong>Impuesto, Establecimientos</strong>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Categoría (opcional)
                      </div>
                    </div>

                    <div className="flex space-x-3 mt-6">
                      <button
                        onClick={() => openImportModal('basica')}
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                      >
                        Importar básico
                      </button>
                      <button
                        onClick={() => downloadTemplate('basica')}
                        className="px-4 py-2 text-blue-600 bg-blue-50 border border-blue-200 rounded-md text-sm font-medium hover:bg-blue-100 transition-colors"
                        title="Descargar plantilla"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Importación completa */}
            <div className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
              <div className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Importación completa
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Todos los campos incluyendo información avanzada
                    </p>

                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-700">
                        <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Todos los campos básicos
                      </div>
                      <div className="flex items-center text-sm text-gray-700">
                        <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Códigos adicionales (Barras, SUNAT, Fábrica)
                      </div>
                      <div className="flex items-center text-sm text-gray-700">
                        <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Costos, márgenes, tipo de existencia
                      </div>
                    </div>

                    <div className="flex space-x-3 mt-6">
                      <button
                        onClick={() => openImportModal('completa')}
                        className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-purple-700 transition-colors"
                      >
                        Importar completo
                      </button>
                      <button
                        onClick={() => downloadTemplate('completa')}
                        className="px-4 py-2 text-purple-600 bg-purple-50 border border-purple-200 rounded-md text-sm font-medium hover:bg-purple-100 transition-colors"
                        title="Descargar plantilla"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Consejos */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Consejos para una importación exitosa
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Descarga siempre la plantilla correspondiente antes de crear tu archivo</li>
                    <li>Respeta exactamente los nombres de las columnas (sensibles a mayúsculas y tildes)</li>
                    <li>El <strong>Código</strong> es la clave: si existe se actualizará, si no se creará (upsert)</li>
                    <li>Los campos obligatorios son: Tipo de producto, Nombre, Código, Unidad, Impuesto, Establecimientos</li>
                    <li>Verifica que las categorías y códigos de establecimientos existan antes de importar</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {currentStep === 'preview' && importResult && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Previsualización de importación</h2>
            <p className="text-sm text-gray-600 mt-1">
              Archivo: <strong>{selectedFile?.name}</strong>
            </p>
          </div>

          {/* Resumen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 font-medium">Total de filas</p>
                  <p className="text-3xl font-bold text-blue-900">{importResult.totalFilas}</p>
                </div>
                <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 font-medium">Filas válidas</p>
                  <p className="text-3xl font-bold text-green-900">{importResult.validas}</p>
                </div>
                <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-700 font-medium">Filas con errores</p>
                  <p className="text-3xl font-bold text-red-900">{importResult.invalidas}</p>
                </div>
                <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Errores */}
          {importResult.invalidas > 0 && (
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-yellow-800">Se encontraron {importResult.invalidas} filas con errores</h4>
                  <div className="mt-2 max-h-48 overflow-y-auto">
                    <div className="space-y-1">
                      {importResult.errores.slice(0, 10).map((error, idx) => (
                        <p key={idx} className="text-xs text-yellow-700">
                          <strong>Fila {error.fila}</strong> - {error.columna}: {error.mensaje}
                          {error.valorRecibido && ` (valor: "${error.valorRecibido}")`}
                        </p>
                      ))}
                      {importResult.errores.length > 10 && (
                        <p className="text-xs text-yellow-600 italic">
                          ... y {importResult.errores.length - 10} errores más
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleDownloadErrors}
                    className="mt-3 inline-flex items-center px-3 py-1.5 text-xs font-medium text-yellow-700 bg-yellow-100 border border-yellow-300 rounded-md hover:bg-yellow-200 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Descargar archivo de errores
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleCancelImport}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={importResult.validas === 0 || isProcessing}
              className="px-4 py-2 text-sm font-medium text-white bg-violet-600 border border-transparent rounded-md hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? 'Importando...' : `Confirmar importación (${importResult.validas} productos)`}
            </button>
          </div>
        </div>
      )}

      {currentStep === 'result' && finalResult && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              {importResult && importResult.conError === 0
                ? '¡Importación completada con éxito!'
                : 'Importación completada parcialmente'}
            </h2>
            <p className="text-sm text-gray-600 mt-2">
              Los productos han sido procesados correctamente
            </p>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-sm text-green-700 font-medium mb-1">Productos creados</p>
              <p className="text-4xl font-bold text-green-900">{finalResult.createdCount}</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <p className="text-sm text-blue-700 font-medium mb-1">Productos actualizados</p>
              <p className="text-4xl font-bold text-blue-900">{finalResult.updatedCount}</p>
            </div>
          </div>

          {importResult && importResult.conError > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>{importResult.conError} filas</strong> no pudieron procesarse.
                Puedes descargar el archivo de errores, corregirlas y volver a importar.
              </p>
              <button
                onClick={handleDownloadErrors}
                className="mt-3 inline-flex items-center px-3 py-1.5 text-xs font-medium text-yellow-700 bg-yellow-100 border border-yellow-300 rounded-md hover:bg-yellow-200 transition-colors"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Descargar archivo de errores
              </button>
            </div>
          )}

          {/* Acciones */}
          <div className="flex justify-center space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleNewImport}
              className="px-4 py-2 text-sm font-medium text-white bg-violet-600 border border-transparent rounded-md hover:bg-violet-700 transition-colors"
            >
              Realizar otra importación
            </button>
          </div>
        </div>
      )}

      {/* Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onFileSelected={handleFileSelected}
        tipo={importType}
      />
    </div>
  );
};

export default ImportPage;
