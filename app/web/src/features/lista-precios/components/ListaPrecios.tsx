import React, { useState, useRef, useCallback } from 'react';
import type { NewColumnForm } from '../models/PriceTypes';
import { usePriceList } from '../hooks/usePriceList';
import { SummaryBar } from './SummaryBar';
import { ColumnManagement } from './ColumnManagement';
import { ProductPricing } from './ProductPricing';
import { PackagesTab } from './PackagesTab';
import { ColumnModal } from './modals/ColumnModal';
import { PriceModal } from './modals/PriceModal';

type TabType = 'columns' | 'products' | 'packages';

export const ListaPrecios: React.FC = () => {
  // Estado local solo para el tab de Paquetes (que no está en el hook)
  const [packagesTabActive, setPackagesTabActive] = useState(false);

  const {
    // State
    columns,
    products,
    filteredProducts,
    loading,
    error,
    activeTab,
    showColumnModal,
    showProductPriceModal,
    editingColumn,
    selectedProduct,
    searchSKU,
    catalogProducts,
    effectivePrices,

    // Actions
    setActiveTab,
    setSearchSKU,
    addColumn,
    deleteColumn,
    toggleColumnVisibility,
    setBaseColumn,
    updateColumn,
    addOrUpdateProductPrice,
    setProductActiveUnit,
    openColumnModal,
    closeColumnModal,
    closePriceModal
  } = usePriceList();

  const assignPriceHandlerRef = useRef<(() => void) | null>(null);

  const registerAssignPriceHandler = useCallback((handler: (() => void) | null) => {
    assignPriceHandlerRef.current = handler;
  }, []);

  const handleAssignPriceFromSummary = useCallback(() => {
    assignPriceHandlerRef.current?.();
  }, []);

  // Determinar tab activo (preferencia al tab del hook para columns/products)
  const currentTab: TabType = packagesTabActive ? 'packages' : activeTab;

  const handleTabChange = (tab: TabType) => {
    if (tab === 'packages') {
      setPackagesTabActive(true);
    } else {
      setPackagesTabActive(false);
      setActiveTab(tab);
    }
  };

  const handleSaveColumn = useCallback((data: NewColumnForm) => {
    const trimmedName = data.name.trim();
    if (!trimmedName) {
      return false;
    }

    if (editingColumn) {
      if (editingColumn.kind === 'base') {
        updateColumn(editingColumn.id, { name: trimmedName });
        return true;
      }

      if (editingColumn.kind === 'global-discount' || editingColumn.kind === 'global-increase') {
        updateColumn(editingColumn.id, {
          name: trimmedName,
          globalRuleType: data.globalRuleType,
          globalRuleValue: typeof data.globalRuleValue === 'number' ? Math.max(data.globalRuleValue, 0) : null
        });
        return true;
      }

      updateColumn(editingColumn.id, {
        name: trimmedName,
        mode: data.mode,
        visible: data.visible
      });
      return true;
    }

    return addColumn({
      name: trimmedName,
      mode: data.mode,
      visible: data.visible,
      kind: 'manual'
    });
  }, [addColumn, editingColumn, updateColumn]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lista de Precios</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Configura columnas de precios y asigna valores por producto (SKU)
            </p>
          </div>
          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              ⚠️ {error}
            </div>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6" role="tablist">
        <div className="flex space-x-8">
          <button
            onClick={() => handleTabChange('products')}
            role="tab"
            aria-selected={currentTab === 'products'}
            aria-controls="products-panel"
            className={`py-4 border-b-2 font-medium text-sm transition-colors ${
              currentTab === 'products'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Precios por producto
          </button>
          <button
            onClick={() => handleTabChange('packages')}
            role="tab"
            aria-selected={currentTab === 'packages'}
            aria-controls="packages-panel"
            className={`py-4 border-b-2 font-medium text-sm transition-colors ${
              currentTab === 'packages'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Paquetes
          </button>
          <button
            onClick={() => handleTabChange('columns')}
            role="tab"
            aria-selected={currentTab === 'columns'}
            aria-controls="columns-panel"
            className={`py-4 border-b-2 font-medium text-sm transition-colors ${
              currentTab === 'columns'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Plantilla de columnas
          </button>
        </div>
      </div>

      {/* Summary Bar */}
      <SummaryBar
        columns={columns}
        onAssignPrice={handleAssignPriceFromSummary}
        viewMode={currentTab}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-red-600 dark:text-red-400 mb-2">❌</div>
              <p className="text-gray-600 dark:text-gray-400">{error}</p>
            </div>
          </div>
        ) : currentTab === 'columns' ? (
          <ColumnManagement
            columns={columns}
            onAddColumn={() => openColumnModal()}
            onEditColumn={(column) => openColumnModal(column)}
            onDeleteColumn={deleteColumn}
            onToggleVisibility={toggleColumnVisibility}
            onSetBaseColumn={setBaseColumn}
          />
        ) : currentTab === 'products' ? (
          <ProductPricing
            columns={columns}
            products={products}
            filteredProducts={filteredProducts}
            searchSKU={searchSKU}
            onSearchChange={setSearchSKU}
            onSavePrice={addOrUpdateProductPrice}
            onUnitChange={setProductActiveUnit}
            catalogProducts={catalogProducts}
            effectivePrices={effectivePrices}
            registerAssignHandler={registerAssignPriceHandler}
          />
        ) : (
          <PackagesTab />
        )}
      </div>

      {/* Modals */}
      <ColumnModal
        isOpen={showColumnModal}
        onClose={closeColumnModal}
        onSave={handleSaveColumn}
        editingColumn={editingColumn}
      />

      <PriceModal
        isOpen={showProductPriceModal}
        onClose={closePriceModal}
        onSave={addOrUpdateProductPrice}
        columns={columns}
        selectedProduct={selectedProduct}
        selectedColumn={null}
        catalogProducts={catalogProducts}
        initialUnitCode={selectedProduct?.activeUnitCode}
        onSwitchToVolumeModal={({ columnId }) => {
          // Cerrar modal actual y mostrar mensaje informativo por ahora
          closePriceModal();
          const column = columns.find(col => col.id === columnId);
          if (column) {
            alert(`Esta columna (${column.name}) está configurada para precios por cantidad. Use el botón ⚙️ en la tabla para configurar los rangos.`);
          }
        }}
      />
    </div>
  );
};
