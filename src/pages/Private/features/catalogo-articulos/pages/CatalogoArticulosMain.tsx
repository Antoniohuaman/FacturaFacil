// src/features/catalogo-articulos/pages/CatalogoArticulosMain.tsx

import React, { useState } from 'react';
import type { TabKey } from '../models/types';
import { PageHeader } from '../../../../../components/PageHeader';
import TabNavigation from '../components/TabNavigation';
import ProductsPage from './ProductsPage';
import ImportPage from './ImportPage';
import { useProductStore } from '../hooks/useProductStore';
import { useFocusFromQuery } from '../../../../../hooks/useFocusFromQuery';

const CatalogoArticulosMain: React.FC = () => {
  useFocusFromQuery();
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
    <div className="flex h-full min-h-0 flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header - Solo título */}
      <PageHeader 
        title="Gestión de Productos y Servicios"
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
      <div className="flex-1 min-h-0 overflow-hidden transition-all duration-300 ease-in-out">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default CatalogoArticulosMain;