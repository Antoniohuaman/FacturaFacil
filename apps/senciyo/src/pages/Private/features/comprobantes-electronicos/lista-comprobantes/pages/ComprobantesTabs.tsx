import React, { useState } from 'react';
import DraftInvoicesModule from './ListaBorradores';
import InvoiceListDashboard from './ListaComprobantes';
import { PageHeader } from '@/contasis';
import { useFocusFromQuery } from '../../../../../../hooks/useFocusFromQuery';

const ComprobantesTabs: React.FC = () => {
  useFocusFromQuery();
  const [activeTab, setActiveTab] = useState<'comprobantes' | 'borradores'>('comprobantes');

  // Escuchar evento global para mostrar la pestaña de borradores
  React.useEffect(() => {
    const handler = () => setActiveTab('borradores');
    window.addEventListener('showBorradoresTab', handler);
    return () => window.removeEventListener('showBorradoresTab', handler);
  }, []);

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <PageHeader 
        title="Comprobantes Electrónicos"
      />

      {/* Toolbar - Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-slate-300 dark:border-gray-600 shadow-sm" style={{ height: '72px' }}>
        <div className="h-full flex items-center px-6">
          <div className="flex space-x-1">
            <button
              className={`px-6 py-2 font-semibold text-sm focus:outline-none transition-colors rounded-md ${
                activeTab === 'comprobantes' 
                  ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              onClick={() => setActiveTab('comprobantes')}
            >
              Lista Comprobantes
            </button>
            <button
              className={`px-6 py-2 font-semibold text-sm focus:outline-none transition-colors rounded-md ${
                activeTab === 'borradores' 
                  ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              onClick={() => setActiveTab('borradores')}
            >
              Lista Borradores
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div>
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
