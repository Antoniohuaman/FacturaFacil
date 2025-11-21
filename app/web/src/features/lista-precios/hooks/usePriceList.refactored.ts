// src/features/lista-precios/hooks/usePriceList.refactored.ts
import { useState, useCallback } from 'react';
import type { Column, Product } from '../models/PriceTypes';
import { useColumns } from './useColumns';
import { usePriceProducts } from './usePriceProducts';
import { useCatalogSync } from './useCatalogSync';

/**
 * Hook principal para gestión de lista de precios
 * Orquesta columnas, productos y sincronización con catálogo
 */
export const usePriceList = () => {
  // Sub-hooks especializados
  const columnsHook = useColumns();
  const { catalogProducts } = useCatalogSync();
  const productsHook = usePriceProducts(catalogProducts, columnsHook.columns);

  // Estado de modales
  const [activeTab, setActiveTab] = useState<'columns' | 'products' | 'import'>('products');
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showProductPriceModal, setShowProductPriceModal] = useState(false);
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Modal management
  const openColumnModal = useCallback((column?: Column) => {
    setEditingColumn(column || null);
    setShowColumnModal(true);
  }, []);

  const closeColumnModal = useCallback(() => {
    setShowColumnModal(false);
    setEditingColumn(null);
  }, []);

  const openPriceModal = useCallback((product?: Product) => {
    setSelectedProduct(product || null);
    setShowProductPriceModal(true);
  }, []);

  const closePriceModal = useCallback(() => {
    setShowProductPriceModal(false);
    setSelectedProduct(null);
  }, []);

  // Sobrescribir deleteColumn para también eliminar precios de productos
  const deleteColumn = useCallback((columnId: string): boolean => {
    const result = columnsHook.deleteColumn(columnId);
    if (result) {
      productsHook.removeProductPricesForColumn(columnId);
    }
    return result;
  }, [columnsHook, productsHook]);

  // Estado de error y loading combinados
  const error = columnsHook.error || productsHook.error;
  const loading = columnsHook.loading || productsHook.loading;

  const clearError = useCallback(() => {
    columnsHook.clearError();
    productsHook.clearError();
  }, [columnsHook, productsHook]);

  return {
    // Estado de columnas
    columns: columnsHook.columns,

    // Estado de productos
    products: productsHook.products,
    filteredProducts: productsHook.filteredProducts,
    searchSKU: productsHook.searchSKU,
    catalogProducts,
    effectivePrices: productsHook.effectivePrices,

    // Estado general
    loading,
    error,
    activeTab,

    // Estados de modales
    showColumnModal,
    showProductPriceModal,
    editingColumn,
    selectedProduct,

    // Acciones de columnas
    addColumn: columnsHook.addColumn,
    deleteColumn,
    toggleColumnVisibility: columnsHook.toggleColumnVisibility,
    toggleColumnTableVisibility: columnsHook.toggleColumnTableVisibility,
    setBaseColumn: columnsHook.setBaseColumn,
    updateColumn: columnsHook.updateColumn,

    // Acciones de productos
    addOrUpdateProductPrice: productsHook.addOrUpdateProductPrice,
    applyImportedFixedPrices: productsHook.applyImportedFixedPrices,
    setProductActiveUnit: productsHook.setProductActiveUnit,
    setSearchSKU: productsHook.setSearchSKU,
    isSKUInCatalog: productsHook.isSKUInCatalog,
    getCatalogProductBySKU: productsHook.getCatalogProductBySKU,

    // Acciones de UI
    setActiveTab,
    openColumnModal,
    closeColumnModal,
    openPriceModal,
    closePriceModal,
    clearError,

    // Funciones helper mantenidas para compatibilidad
    getCatalogProducts: () => catalogProducts,
  };
};
