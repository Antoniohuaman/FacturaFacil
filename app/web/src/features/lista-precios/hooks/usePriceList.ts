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
	const columnsHook = useColumns();
	const { catalogProducts } = useCatalogSync();
	const productsHook = usePriceProducts(catalogProducts, columnsHook.columns);

	const [activeTab, setActiveTab] = useState<'columns' | 'products' | 'import'>('products');
	const [showColumnModal, setShowColumnModal] = useState(false);
	const [showProductPriceModal, setShowProductPriceModal] = useState(false);
	const [editingColumn, setEditingColumn] = useState<Column | null>(null);
	const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

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

	const deleteColumn = useCallback((columnId: string): boolean => {
		const result = columnsHook.deleteColumn(columnId);
		if (result) {
			productsHook.removeProductPricesForColumn(columnId);
		}
		return result;
	}, [columnsHook, productsHook]);

	const error = columnsHook.error || productsHook.error;
	const loading = columnsHook.loading || productsHook.loading;

	const clearError = useCallback(() => {
		columnsHook.clearError();
		productsHook.clearError();
	}, [columnsHook, productsHook]);

	return {
		columns: columnsHook.columns,
		products: productsHook.products,
		filteredProducts: productsHook.filteredProducts,
		searchSKU: productsHook.searchSKU,
		catalogProducts,
		effectivePrices: productsHook.effectivePrices,
		loading,
		error,
		activeTab,
		showColumnModal,
		showProductPriceModal,
		editingColumn,
		selectedProduct,
		addColumn: columnsHook.addColumn,
		deleteColumn,
		toggleColumnVisibility: columnsHook.toggleColumnVisibility,
		toggleColumnTableVisibility: columnsHook.toggleColumnTableVisibility,
		reorderColumns: columnsHook.reorderColumns,
		resetTableColumns: columnsHook.resetTableColumns,
		selectAllTableColumns: columnsHook.selectAllTableColumns,
		setBaseColumn: columnsHook.setBaseColumn,
		updateColumn: columnsHook.updateColumn,
		addOrUpdateProductPrice: productsHook.addOrUpdateProductPrice,
		applyImportedFixedPrices: productsHook.applyImportedFixedPrices,
		setProductActiveUnit: productsHook.setProductActiveUnit,
		setSearchSKU: productsHook.setSearchSKU,
		isSKUInCatalog: productsHook.isSKUInCatalog,
		getCatalogProductBySKU: productsHook.getCatalogProductBySKU,
		setActiveTab,
		openColumnModal,
		closeColumnModal,
		openPriceModal,
		closePriceModal,
		clearError,
		getCatalogProducts: () => catalogProducts
	};
};
