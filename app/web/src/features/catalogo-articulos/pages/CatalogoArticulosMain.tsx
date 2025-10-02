// src/features/catalogo-articulos/pages/CatalogoArticulosMain.tsx

import React, { useState } from 'react';
import type { TabKey } from '../models/types';
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1478D4' }}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4-8-4m16 0v10l-8 4-8-4V7" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Catálogo de Artículos</h1>
                <p className="text-sm text-gray-600">
                  Gestiona tu catálogo completo de productos y servicios
                </p>
              </div>
            </div>

            {/* User actions */}
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-6a1 1 0 00-1-1H5a1 1 0 00-1 1v12a1 1 0 001 1h4" />
                </svg>
              </button>
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <TabNavigation
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tabs={tabs}
          />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="transition-all duration-300 ease-in-out">
          {renderTabContent()}
        </div>
      </div>

      {/* Footer/Status */}
      <div className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-6">
              <span>
                Total productos: <span className="font-medium text-gray-900">{allProducts.length}</span>
              </span>
              <span>
                Categorías: <span className="font-medium text-gray-900">{categories.length}</span>
              </span>
              <span>
                Productos con stock: <span className="font-medium text-green-600">
                  {allProducts.filter(p => p.cantidad > 0).length}
                </span>
              </span>
              <span>
                Sin stock: <span className="font-medium text-red-600">
                  {allProducts.filter(p => p.cantidad <= 0).length}
                </span>
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Sistema actualizado</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions - Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <div className="relative group">
          <button className="w-14 h-14 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center hover:opacity-90" style={{ backgroundColor: '#1478D4' }}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          
          {/* Tooltip */}
          <div className="absolute bottom-16 right-0 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
            Crear producto rápido
          </div>
        </div>
      </div>

      {/* ...Atajos de teclado eliminados... */}

      {/* Background pattern */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
  <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-50 rounded-full opacity-20"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-50 rounded-full opacity-20"></div>
      </div>
    </div>
  );
};

export default CatalogoArticulosMain;