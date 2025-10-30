/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
// src/features/catalogo-articulos/pages/ImportPage.tsx

import React, { useState } from 'react';
import type { ImportConfig } from '../models/types';
import ImportModal from '../components/ImportModal';

const ImportPage: React.FC = () => {
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState<'basica' | 'completa'>('basica');
  const [recentImports, setRecentImports] = useState<any[]>([]);

  const handleImport = (config: ImportConfig) => {
    // Simular importación exitosa
    const newImport = {
      id: Date.now().toString(),
      tipo: config.tipo,
      archivo: config.archivo?.name,
      fecha: new Date(),
      productos: Math.floor(Math.random() * 100) + 10,
      estado: 'completado'
    };
    
    setRecentImports(prev => [newImport, ...prev.slice(0, 4)]);
    console.log('Importing with config:', config);
  };

  const openImportModal = (type: 'basica' | 'completa') => {
    setImportType(type);
    setShowImportModal(true);
  };

  const downloadTemplate = (type: 'basica' | 'completa') => {
    // Simular descarga de plantilla
    const link = document.createElement('a');
    link.href = '#';
    link.download = `plantilla_${type}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Importar productos de excel</h1>
        <p className="text-sm text-gray-600 mt-1">
          Carga múltiples productos desde un archivo Excel de forma rápida y sencilla
        </p>
      </div>

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
                  Documento en excel con las columnas básicas.
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Código, nombre, precio, unidad
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Categoría y cantidad inicial
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Proceso rápido y simple
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
                  >
                    <svg className="w-4 h-4 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Descargar plantilla básica
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
                  Documento en excel con las columnas completas.
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Todas las columnas básicas
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Impuestos y descripciones
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Control total de datos
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
                  >
                    <svg className="w-4 h-4 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Descargar plantilla completa
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Historial de importaciones */}
      {recentImports.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Importaciones recientes
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Historial de tus últimas importaciones de productos
            </p>
          </div>
          
          <div className="divide-y divide-gray-200">
            {recentImports.map((importItem) => (
              <div key={importItem.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-2 h-2 rounded-full ${
                    importItem.estado === 'completado' ? 'bg-green-500' : 
                    importItem.estado === 'procesando' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {importItem.archivo}
                    </p>
                    <p className="text-sm text-gray-500">
                      {importItem.productos} productos • Importación {importItem.tipo}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <p className="text-sm text-gray-500">
                    {importItem.fecha.toLocaleDateString('es-PE', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    importItem.estado === 'completado' 
                      ? 'bg-green-100 text-green-800' 
                      : importItem.estado === 'procesando'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {importItem.estado}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                <li>Asegúrate de que los códigos de producto sean únicos</li>
                <li>Verifica que las categorías existan antes de importar</li>
                <li>Los precios deben ser números positivos</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
        tipo={importType}
      />
    </div>
  );
};

export default ImportPage;