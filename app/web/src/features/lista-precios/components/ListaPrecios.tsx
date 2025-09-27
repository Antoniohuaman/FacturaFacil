import React from 'react';
import { usePriceList } from '../hooks/usePriceList';
import { SummaryBar } from './SummaryBar';
import { ColumnManagement } from './ColumnManagement';
import { ProductPricing } from './ProductPricing';
import { ColumnModal } from './modals/ColumnModal';
import { PriceModal } from './modals/PriceModal';
import { findBaseColumn } from '../utils/priceHelpers';

export const ListaPrecios: React.FC = () => {
  const {
    // State
    columns,
    products,
    filteredProducts,
    activeTab,
    showColumnModal,
    showProductPriceModal,
    editingColumn,
    selectedProduct,
    searchSKU,

    // Actions
    setActiveTab,
    setSearchSKU,
    addColumn,
    deleteColumn,
    toggleColumnVisibility,
    setBaseColumn,
    addOrUpdateProductPrice,
    openColumnModal,
    closeColumnModal,
    openPriceModal,
    closePriceModal
  } = usePriceList();

  const baseColumn = findBaseColumn(columns);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lista de Precios</h1>
            <p className="text-gray-600 mt-1">
              Módulo unificado para configurar columnas y definir precios por producto (SKU)
            </p>
          </div>
          <div className="text-sm text-gray-500 text-right">
            <div>Última actualización: {new Date().toLocaleString()}</div>
            <div>Usuario: usuario.demo</div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('columns')}
            className={`py-4 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'columns'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Plantilla de columnas
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`py-4 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'products'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Precios por producto
          </button>
        </div>
      </div>

      {/* Summary Bar */}
      <SummaryBar columns={columns} />

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-gray-50">
        {activeTab === 'columns' ? (
          <ColumnManagement
            columns={columns}
            onAddColumn={() => openColumnModal()}
            onEditColumn={(column) => openColumnModal(column)}
            onDeleteColumn={deleteColumn}
            onToggleVisibility={toggleColumnVisibility}
            onSetBaseColumn={setBaseColumn}
          />
        ) : (
          <ProductPricing
            columns={columns}
            products={products}
            filteredProducts={filteredProducts}
            searchSKU={searchSKU}
            onSearchChange={setSearchSKU}
            onAddPrice={() => openPriceModal()}
            onEditProduct={(product) => openPriceModal(product)}
          />
        )}
      </div>

      {/* Modals */}
      <ColumnModal
        isOpen={showColumnModal}
        onClose={closeColumnModal}
        onSave={addColumn}
        editingColumn={editingColumn}
        hasBaseColumn={!!baseColumn}
      />

      <PriceModal
        isOpen={showProductPriceModal}
        onClose={closePriceModal}
        onSave={addOrUpdateProductPrice}
        columns={columns}
        selectedProduct={selectedProduct}
      />
    </div>
  );
};