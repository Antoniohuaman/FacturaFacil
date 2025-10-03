import React, { useState } from 'react';
import DraftInvoicesModule from './ListaBorradores';
import InvoiceListDashboard from './ListaComprobantes';
import { PageHeader } from '../../../components/PageHeader';

const ComprobantesTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'comprobantes' | 'borradores'>('comprobantes');

  // Escuchar evento global para mostrar la pestaña de borradores
  React.useEffect(() => {
    const handler = () => setActiveTab('borradores');
    window.addEventListener('showBorradoresTab', handler);
    return () => window.removeEventListener('showBorradoresTab', handler);
  }, []);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50">
      {/* Header */}
      <PageHeader 
        title="Comprobantes Electrónicos"
        icon={
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
      />

      {/* Toolbar - Tabs */}
      <div className="bg-white border-b border-slate-300 shadow-sm" style={{ height: '72px' }}>
        <div className="h-full flex items-center px-6">
          <div className="flex space-x-1">
            <button
              className={`px-6 py-2 font-semibold text-sm focus:outline-none transition-colors rounded-md ${
                activeTab === 'comprobantes' 
                  ? 'bg-purple-50 text-purple-700 border border-purple-200' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('comprobantes')}
            >
              Lista Comprobantes
            </button>
            <button
              className={`px-6 py-2 font-semibold text-sm focus:outline-none transition-colors rounded-md ${
                activeTab === 'borradores' 
                  ? 'bg-purple-50 text-purple-700 border border-purple-200' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('borradores')}
            >
              Lista Borradores
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'comprobantes' ? (
          <InvoiceListDashboard />
        ) : (
          <DraftInvoicesModule hideSidebar />
        )}
      </div>
    </div>
  );
};

export default ComprobantesTabs;
