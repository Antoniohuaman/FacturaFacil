// src/features/catalogo-articulos/pages/CatalogoArticulosMain.tsx

import React, { useState } from 'react';
import type { TabKey } from '../models/types';
import { PageHeader } from '../../../components/PageHeader';
import TabNavigation from '../components/TabNavigation';
import ProductsPage from './ProductsPage';
import ImportPage from './ImportPage';
import { useProductStore } from '../hooks/useProductStore';

const CatalogoArticulosMain: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('productos');
  const { allProducts } = useProductStore();

  const tabs = [
    {
      key: 'productos' as TabKey,
      label: 'Productos',
      count: allProducts.length
    },
    {
      key: 'importar' as TabKey,
      label: 'Importar productos'
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'productos':
        return <ProductsPage />;
      case 'importar':
        return <ImportPage />;
      default:
        return <ProductsPage />;
    }
  };

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header - Solo título */}
      <PageHeader 
        title="Gestión de Productos y Servicios"
        icon={
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4-8-4m16 0v10l-8 4-8-4V7" />
          </svg>
        }
      />
      
      {/* Toolbar - Navegación por tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-slate-300 dark:border-gray-700 shadow-sm" style={{ height: '72px', display: 'flex', alignItems: 'center' }}>
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <TabNavigation
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tabs={tabs}
          />
        </div>
      </div>

      {/* Contenido */}
      <div className="transition-all duration-300 ease-in-out">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default CatalogoArticulosMain;