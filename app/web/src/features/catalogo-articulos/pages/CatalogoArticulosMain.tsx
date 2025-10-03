// src/features/catalogo-articulos/pages/CatalogoArticulosMain.tsx

import React, { useState } from 'react';
import type { TabKey } from '../models/types';
import { PageHeader } from '../../../components/PageHeader';
import TabNavigation from '../components/TabNavigation';
import ProductsPage from './ProductsPage';
import PackagesPage from './PackagesPage';
import CategoriesPage from './CategoriesPage';
import ImportPage from './ImportPage';
import ControlStockPage from './ControlStockPage';
import { useProductStore } from '../hooks/useProductStore';

const CatalogoArticulosMain: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('productos');
  const { allProducts, categories } = useProductStore();

  const tabs = [
    {
      key: 'productos' as TabKey,
      label: 'Productos',
      count: allProducts.length
    },
    {
      key: 'paquetes' as TabKey,
      label: 'Paquetes',
      count: 0 // Se actualizará cuando implementes el estado de paquetes
    },
    {
      key: 'categorias' as TabKey,
      label: 'Categorías',
      count: categories.length
    },
    {
      key: 'importar' as TabKey,
      label: 'Importar productos'
    },
    {
      key: 'control-stock' as TabKey,
      label: 'Control de Stock',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      )
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'productos':
        return <ProductsPage />;
      case 'paquetes':
        return <PackagesPage />;
      case 'categorias':
        return <CategoriesPage />;
      case 'importar':
        return <ImportPage />;
      case 'control-stock':
        return <ControlStockPage />;
      default:
        return <ProductsPage />;
    }
  };

  return (
    <div className="flex-1 bg-gray-50">
      {/* Header - Solo título */}
      <PageHeader 
        title="Catálogo de Artículos"
        icon={
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4-8-4m16 0v10l-8 4-8-4V7" />
          </svg>
        }
      />
      
      {/* Toolbar - Navegación por tabs */}
      <div className="bg-white border-b border-slate-300 shadow-sm" style={{ height: '72px', display: 'flex', alignItems: 'center' }}>
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