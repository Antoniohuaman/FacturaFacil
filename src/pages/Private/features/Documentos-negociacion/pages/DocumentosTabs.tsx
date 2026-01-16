import React, { useState } from 'react';
import ListaCotizaciones from '../lista-cotizaciones/pages/ListaCotizaciones';
import ListaNotasVenta from '../lista-notas-venta/pages/ListaNotasVenta';
import { PageHeader } from '../../../../../components/PageHeader';

const DocumentosTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'cotizaciones' | 'notas-venta'>('cotizaciones');

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <PageHeader 
        title="Documentos Comerciales"
        icon={
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
      />

      {/* Toolbar - Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-slate-300 dark:border-gray-600 shadow-sm" style={{ height: '72px' }}>
        <div className="h-full flex items-center px-6">
          <div className="flex space-x-1">
            <button
              className={`px-6 py-2 font-semibold text-sm focus:outline-none transition-colors rounded-md ${
                activeTab === 'cotizaciones' 
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              onClick={() => setActiveTab('cotizaciones')}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Cotizaciones
                {activeTab === 'cotizaciones' && (
                  <span className="ml-1 px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 rounded-full">
                    2
                  </span>
                )}
              </span>
            </button>
            <button
              className={`px-6 py-2 font-semibold text-sm focus:outline-none transition-colors rounded-md ${
                activeTab === 'notas-venta' 
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              onClick={() => setActiveTab('notas-venta')}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Notas de Venta
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'cotizaciones' ? (
          <ListaCotizaciones />
        ) : (
          <ListaNotasVenta />
        )}
      </div>
    </div>
  );
};

export default DocumentosTabs;
