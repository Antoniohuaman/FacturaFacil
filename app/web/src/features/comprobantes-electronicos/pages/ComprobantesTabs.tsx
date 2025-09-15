import React, { useState } from 'react';
import DraftInvoicesModule from './ListaBorradores';
import InvoiceListDashboard from './ListaComprobantes';

const ComprobantesTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'comprobantes' | 'borradores'>('comprobantes');

  return (
    <div className="w-full bg-white rounded-lg shadow border">
      {/* Tabs Header */}
      <div className="flex border-b">
        <button
          className={`px-6 py-3 font-semibold text-sm focus:outline-none transition-colors border-b-2 ${activeTab === 'comprobantes' ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-400'}`}
          onClick={() => setActiveTab('comprobantes')}
        >
          LISTA COMPROBANTES
        </button>
        <button
          className={`px-6 py-3 font-semibold text-sm focus:outline-none transition-colors border-b-2 ${activeTab === 'borradores' ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-400'}`}
          onClick={() => setActiveTab('borradores')}
        >
          LISTA BORRADORES
        </button>
      </div>
      {/* Tabs Content */}
      <div className="min-h-[400px]">
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
