// src/features/catalogo-articulos/pages/ProductsPage.tsx

import React, { useState, useMemo, useEffect } from 'react';
import type { Product } from '../models/types';
import ProductTable from '../components/ProductTable';
import BulkDeleteToolbar from '../components/BulkDeleteToolbar';
import ProductModal from '../components/ProductModal';
import ExportProductsModal from '../components/ExportProductsModal';
import { useProductStore } from '../hooks/useProductStore';
import { useConfigurationContext } from '../../configuracion-sistema/context/ConfigurationContext';
import { useNavigate, useSearchParams } from 'react-router-dom';

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
    updateFilters,
    resetFilters,
    changePage,
    changeItemsPerPage
  } = useProductStore();

  // Configuración y establecimientos
  const { state: configState } = useConfigurationContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Estado del filtro de establecimiento desde URL
  const [establishmentScope, setEstablishmentScope] = useState<string>(() => {
    return searchParams.get('est') || 'ALL';
  });

  // Establecimientos activos
  const establishments = useMemo(
    () => configState.establishments.filter(e => e.isActive),
    [configState.establishments]
  );

  // Sincronizar filtro de establecimiento con URL
  useEffect(() => {
    const estParam = searchParams.get('est') || 'ALL';
    setEstablishmentScope(estParam);
  }, [searchParams]);

  // Cambiar filtro de establecimiento
  const handleEstablishmentChange = (newScope: string) => {
    setEstablishmentScope(newScope);
    const params = new URLSearchParams(searchParams);
    if (newScope === 'ALL') {
      params.delete('est');
    } else {
      params.set('est', newScope);
    }
    navigate({ search: params.toString() }, { replace: true });
  };

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

  // Obtener listas únicas de valores para filtros
  const uniqueMarcas = useMemo(() => {
    const marcas = new Set(allProducts.filter(p => p.marca).map(p => p.marca!));
    return Array.from(marcas).sort();
  }, [allProducts]);

  const uniqueModelos = useMemo(() => {
    const modelos = new Set(allProducts.filter(p => p.modelo).map(p => p.modelo!));
    return Array.from(modelos).sort();
  }, [allProducts]);

  const uniqueImpuestos = useMemo(() => {
    const impuestos = new Set(allProducts.filter(p => p.impuesto).map(p => p.impuesto!));
    return Array.from(impuestos).sort();
  }, [allProducts]);

  // Eliminado: tipos de existencia (inventario) para desacoplar del stock

  // Calcular número de filtros activos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (establishmentScope !== 'ALL') count++;
    if (filters.categoria) count++;
    if (filters.unidad) count++;
    if (filters.marca) count++;
    if (filters.modelo) count++;
  // tipoExistencia eliminado
    if (filters.impuesto) count++;
    if (filters.rangoPrecios.min > 0) count++;
    if (filters.rangoPrecios.max < 50000) count++;
    return count;
  }, [establishmentScope, filters]);

  const renderFilterBar = () => (
    <div className={`bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm transition-all duration-200 ${showFilters ? 'block' : 'hidden'}`}>
      <div className="p-5">
        {/* Título y acciones */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Filtros Avanzados</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Refina tu búsqueda de productos</p>
            </div>
          </div>
          <button
            onClick={() => {
              resetFilters();
              handleEstablishmentChange('ALL');
            }}
            className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Limpiar todo
          </button>
        </div>

        {/* Grid de filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Establecimiento - Destacado */}
          <div className="md:col-span-2 lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span>Establecimiento</span>
                {establishmentScope !== 'ALL' && (
                  <span className="ml-auto px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full font-medium">
                    Activo
                  </span>
                )}
              </span>
            </label>
            <select
              value={establishmentScope}
              onChange={(e) => handleEstablishmentChange(e.target.value)}
              className="w-full rounded-lg border-2 border-purple-200 dark:border-purple-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
            >
              <option value="ALL">📍 Todos los establecimientos</option>
              {establishments.map(est => (
                <option key={est.id} value={est.id}>
                  {est.code} - {est.name}
                </option>
              ))}
            </select>
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span>Categoría</span>
                {filters.categoria && (
                  <span className="ml-auto px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full font-medium">
                    Activo
                  </span>
                )}
              </span>
            </label>
            <select
              value={filters.categoria}
              onChange={(e) => updateFilters({ categoria: e.target.value })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
            >
              <option value="">🏷️ Todas las categorías</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.nombre}>
                  {cat.nombre} ({cat.productCount})
                </option>
              ))}
            </select>
          </div>

          {/* Unidad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span>Unidad de medida</span>
                {filters.unidad && (
                  <span className="ml-auto px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full font-medium">
                    Activo
                  </span>
                )}
              </span>
            </label>
            <select
              value={filters.unidad}
              onChange={(e) => updateFilters({ unidad: e.target.value })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
            >
              <option value="">📦 Todas las unidades</option>
              <option value="UNIDAD">UNIDAD</option>
              <option value="DOCENA">DOCENA</option>
            </select>
          </div>

          {/* Precio mínimo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Precio mínimo</span>
                {filters.rangoPrecios.min > 0 && (
                  <span className="ml-auto px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full font-medium">
                    Activo
                  </span>
                )}
              </span>
            </label>
            <input
              type="number"
              min="0"
              step="0.10"
              value={filters.rangoPrecios.min.toFixed(2)}
              onChange={(e) => updateFilters({
                rangoPrecios: { ...filters.rangoPrecios, min: parseFloat(e.target.value) || 0 }
              })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
              placeholder="S/ 0.00"
            />
          </div>

          {/* Precio máximo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Precio máximo</span>
                {filters.rangoPrecios.max < 50000 && (
                  <span className="ml-auto px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full font-medium">
                    Activo
                  </span>
                )}
              </span>
            </label>
            <input
              type="number"
              min="0"
              step="0.10"
              value={filters.rangoPrecios.max.toFixed(2)}
              onChange={(e) => updateFilters({
                rangoPrecios: { ...filters.rangoPrecios, max: parseFloat(e.target.value) || 50000 }
              })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
              placeholder="S/ 50,000.00"
            />
          </div>

          {/* Marca */}
          {uniqueMarcas.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  <span>Marca</span>
                  {filters.marca && (
                    <span className="ml-auto px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full font-medium">
                      Activo
                    </span>
                  )}
                </span>
              </label>
              <select
                value={filters.marca || ''}
                onChange={(e) => updateFilters({ marca: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
              >
                <option value="">🏭 Todas las marcas</option>
                {uniqueMarcas.map(marca => (
                  <option key={marca} value={marca}>{marca}</option>
                ))}
              </select>
            </div>
          )}

          {/* Modelo */}
          {uniqueModelos.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span>Modelo</span>
                  {filters.modelo && (
                    <span className="ml-auto px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full font-medium">
                      Activo
                    </span>
                  )}
                </span>
              </label>
              <select
                value={filters.modelo || ''}
                onChange={(e) => updateFilters({ modelo: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
              >
                <option value="">📱 Todos los modelos</option>
                {uniqueModelos.map(modelo => (
                  <option key={modelo} value={modelo}>{modelo}</option>
                ))}
              </select>
            </div>
          )}

          {/* Impuesto */}
          {uniqueImpuestos.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span>Impuesto</span>
                  {filters.impuesto && (
                    <span className="ml-auto px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full font-medium">
                      Activo
                    </span>
                  )}
                </span>
              </label>
              <select
                value={filters.impuesto || ''}
                onChange={(e) => updateFilters({ impuesto: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
              >
                <option value="">💰 Todos los impuestos</option>
                {uniqueImpuestos.map(impuesto => (
                  <option key={impuesto} value={impuesto}>{impuesto}</option>
                ))}
              </select>
            </div>
          )}

          {/* Filtro de Tipo de Existencia eliminado para evitar relación con inventario */}
        </div>

        {/* Info de filtros activos */}
        {activeFiltersCount > 0 && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-blue-700 dark:text-blue-300 font-medium">
                {activeFiltersCount} {activeFiltersCount === 1 ? 'filtro activo' : 'filtros activos'}
              </span>
            </div>
          </div>
        )}
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
      {/* Toolbar principal */}
      <div className="bg-white/95 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 shadow-sm rounded-2xl p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
          {/* Bloque de búsqueda */}
          <div className="flex-1 w-full">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                  Buscar productos
                </p>
              </div>
              {activeFiltersCount > 0 && (
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-violet-50 dark:bg-violet-900/30 px-3 py-1 text-xs font-semibold text-violet-700 dark:text-violet-200">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  {activeFiltersCount} activos
                </span>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Buscar productos..."
                value={filters.busqueda}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 text-sm rounded-xl border border-transparent bg-gray-50/80 dark:bg-gray-700/70 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/60 focus:bg-white dark:focus:bg-gray-800 placeholder-gray-500 dark:placeholder-gray-400 transition-all"
              />
            </div>
          </div>

          {/* Acciones rápidas */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full xl:w-auto">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                showFilters
                  ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-200 dark:border-violet-500 text-violet-700 dark:text-violet-200'
                  : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>Filtros</span>
              {activeFiltersCount > 0 && (
                <span className="inline-flex min-w-[1.5rem] justify-center rounded-full bg-violet-600 text-white text-xs px-2 py-0.5">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            <div className="hidden sm:block w-px h-10 bg-gray-200 dark:bg-gray-700" aria-hidden="true"></div>

            <button
              onClick={() => setShowExportModal(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-100 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-900/20 px-4 py-2.5 text-sm font-semibold text-emerald-700 dark:text-emerald-200 hover:bg-emerald-100 transition-colors"
              title="Exportar productos"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Exportar</span>
            </button>

            <button
              onClick={handleCreateProduct}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] shadow-sm hover:shadow-md transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Nuevo producto</span>
            </button>
          </div>
        </div>
      </div>

      {/* Info eliminación masiva - más compacta */}
      {selectedProducts.size === 0 && (
        <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 -mt-3">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Selecciona productos para opciones de eliminación</span>
        </div>
      )}

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
        establishmentScope={establishmentScope}
        establishments={establishments}
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