// src/features/catalogo-articulos/pages/ProductsPage.tsx

import React, { useState } from 'react';
import type { Product } from '../models/types';
import ProductTable from '../components/ProductTable';
import BulkDeleteToolbar from '../components/BulkDeleteToolbar';
import ProductModal from '../components/ProductModal';
import ExportProductsModal from '../components/ExportProductsModal';
import { useProductStore } from '../hooks/useProductStore';

const ProductsPage: React.FC = () => {
  const {
    products,
    allProducts,
    categories,
    filters,
    pagination,
    loading,
    addProduct,
    updateProduct,
    deleteProduct,
    deleteAllProducts,
    resetCatalog, // ✅ NUEVO: Importar resetCatalog
    updateFilters,
    resetFilters,
    changePage,
    changeItemsPerPage
  } = useProductStore();

  // Estado para selección de productos
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  // Estado para mostrar el modal de exportación
  const [showExportModal, setShowExportModal] = useState(false);

  // Eliminar productos seleccionados
  const handleBulkDeleteProducts = (productIds: string[]) => {
    productIds.forEach(id => deleteProduct(id));
  };

  // Eliminar todos los productos
  const handleDeleteAllProducts = () => {
    deleteAllProducts();
  };

  // Limpiar selección
  const handleClearSelection = () => {
    setSelectedProducts(new Set());
  };

  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();
  const [showFilters, setShowFilters] = useState(false);

  const handleCreateProduct = () => {
    setEditingProduct(undefined);
    setShowProductModal(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowProductModal(true);
  };

  const handleSaveProduct = (productData: Omit<Product, 'id' | 'fechaCreacion' | 'fechaActualizacion'>) => {
    if (editingProduct) {
      updateProduct(editingProduct.id, productData);
    } else {
      addProduct(productData);
    }
    setShowProductModal(false);
    setEditingProduct(undefined);
  };

  const handleSearch = (value: string) => {
    updateFilters({ busqueda: value });
  };

  const renderFilterBar = () => (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-4 transition-all duration-200 ${showFilters ? 'block' : 'hidden'}`}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Categoría */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Categoría
          </label>
          <select
            value={filters.categoria}
            onChange={(e) => updateFilters({ categoria: e.target.value })}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">Todas las categorías</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.nombre}>
                {cat.nombre} ({cat.productCount})
              </option>
            ))}
          </select>
        </div>

        {/* Unidad */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Unidad
          </label>
          <select
            value={filters.unidad}
            onChange={(e) => updateFilters({ unidad: e.target.value })}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">Todas las unidades</option>
            <option value="UNIDAD">UNIDAD</option>
            <option value="DOCENA">DOCENA</option>
          </select>
        </div>

        {/* Rango de precios */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Precio mínimo
          </label>
          <input
            type="number"
            min="0"
            step="0.10"
            value={filters.rangoPrecios.min.toFixed(2)}
            onChange={(e) => updateFilters({ 
              rangoPrecios: { ...filters.rangoPrecios, min: parseFloat(e.target.value) || 0 }
            })}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Precio máximo
          </label>
          <input
            type="number"
            min="0"
            step="0.10"
            value={filters.rangoPrecios.max.toFixed(2)}
            onChange={(e) => updateFilters({ 
              rangoPrecios: { ...filters.rangoPrecios, max: parseFloat(e.target.value) || 50000 }
            })}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="50000.00"
          />
        </div>

        {/* Reset filters */}
        <div className="flex items-end">
          <button
            onClick={resetFilters}
            className="w-full px-3 py-2 text-sm text-gray-600 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
          >
            Limpiar filtros
          </button>
        </div>
      </div>
    </div>
  );

  const renderPagination = () => {
    const startItem = (pagination.currentPage - 1) * pagination.itemsPerPage + 1;
    const endItem = Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems);

    return (
      <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
        <div className="flex-1 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <p className="text-sm text-gray-700">
              Mostrando <span className="font-medium">{startItem}</span> a{' '}
              <span className="font-medium">{endItem}</span> de{' '}
              <span className="font-medium">{pagination.totalItems}</span> productos
            </p>
            
            <select
              value={pagination.itemsPerPage}
              onChange={(e) => changeItemsPerPage(parseInt(e.target.value))}
              className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value={5}>5 por página</option>
              <option value={10}>10 por página</option>
              <option value={25}>25 por página</option>
              <option value={50}>50 por página</option>
            </select>
          </div>

          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            <button
              onClick={() => changePage(pagination.currentPage - 1)}
              disabled={pagination.currentPage <= 1}
              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Anterior</span>
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>

            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              let pageNum;
              if (pagination.totalPages <= 5) {
                pageNum = i + 1;
              } else if (pagination.currentPage <= 3) {
                pageNum = i + 1;
              } else if (pagination.currentPage >= pagination.totalPages - 2) {
                pageNum = pagination.totalPages - 4 + i;
              } else {
                pageNum = pagination.currentPage - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => changePage(pageNum)}
                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                    pagination.currentPage === pageNum
                      ? 'z-10 bg-red-50 dark:bg-red-900/30 border-red-500 dark:border-red-500 text-red-600 dark:text-red-400'
                      : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => changePage(pagination.currentPage + 1)}
              disabled={pagination.currentPage >= pagination.totalPages}
              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Siguiente</span>
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </nav>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pt-4">
      {/* Toolbar: Buscador + Botones de acción */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Buscar por nombre o código..."
            value={filters.busqueda}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>

        {/* Botones de acción */}
        <div className="flex items-center space-x-3">
          {/* ✅ NUEVO: Botón para resetear datos de prueba */}
          <button
            onClick={() => {
              if (confirm('⚠️ ¿Resetear catálogo completo?\n\nEsto eliminará:\n• Todos los productos (excepto genéricos)\n• Todas las categorías personalizadas\n• Todo el historial de movimientos\n\n¿Continuar?')) {
                resetCatalog();
                alert('✅ Catálogo reseteado. Los datos de prueba han sido eliminados.');
              }
            }}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors shadow-sm"
            title="Limpiar todos los datos de prueba"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Resetear datos
          </button>
          
          <button
            onClick={() => setShowExportModal(true)}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar productos
          </button>
          <button
            onClick={handleCreateProduct}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo producto / servicio
          </button>
        </div>
      </div>

      {/* Info eliminación masiva + Filter toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Info eliminación masiva */}
        {selectedProducts.size === 0 && (
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Selecciona productos para acceder a <span className="text-red-600 dark:text-red-400 font-semibold">eliminación masiva</span></span>
          </div>
        )}
        
        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium transition-colors ${
              showFilters 
                ? 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-500 text-red-700 dark:text-red-400' 
                : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filtros
          </button>
      </div>

      {/* Filters */}
      {renderFilterBar()}

      {/* Bulk Delete Toolbar */}
      <BulkDeleteToolbar
        selectedProducts={selectedProducts}
        currentPageProducts={products}
        totalProductsCount={allProducts.length}
        onDeleteProducts={handleBulkDeleteProducts}
        onDeleteAllProducts={handleDeleteAllProducts}
        onClearSelection={handleClearSelection}
      />

      {/* Table */}
      <ProductTable
        products={products}
        filters={filters}
        onFiltersChange={updateFilters}
        onEditProduct={handleEditProduct}
        onDeleteProduct={deleteProduct}
        loading={loading}
        selectedProducts={selectedProducts}
        onSelectedProductsChange={setSelectedProducts}
      />

      {/* Pagination */}
      {pagination.totalItems > 0 && renderPagination()}

      {/* Product Modal */}
      <ProductModal
        isOpen={showProductModal}
        onClose={() => {
          setShowProductModal(false);
          setEditingProduct(undefined);
        }}
        onSave={handleSaveProduct}
        product={editingProduct}
        categories={categories}
      />
    <ExportProductsModal
      isOpen={showExportModal}
      onClose={() => setShowExportModal(false)}
      products={products}
      totalProductsCount={allProducts.length}
      currentFilters={filters}
    />
  </div>
  );
};

export default ProductsPage;