import { useState, useCallback } from 'react';
import type { Column, Product } from '../models/PriceTypes';
import { useColumns } from './useColumns';
import { useConfigCanales } from './useConfigCanales';
import { usePriceProducts } from './usePriceProducts';
import { useCatalogSync } from './useCatalogSync';

export const usePriceList = () => {
	const columnsHook = useColumns();
	const canalHook = useConfigCanales();
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

	// Devuelve si otro canal vendible (base|manual) existe para un canal al excluir una columna
	const otroVendiblePOS = useCallback((excluirId: string): Column | undefined =>
		columnsHook.columns.find(
			c => c.id !== excluirId && c.visible !== false &&
				c.usarEnPuntoVenta !== false &&
				(c.kind === 'base' || c.kind === 'manual')
		), [columnsHook.columns]);

	const otroVendibleComp = useCallback((excluirId: string): Column | undefined =>
		columnsHook.columns.find(
			c => c.id !== excluirId && c.visible !== false &&
				c.usarEnComprobantes !== false &&
				(c.kind === 'base' || c.kind === 'manual')
		), [columnsHook.columns]);

	// Compound: toggle Estado + cascada predeterminados al deshabilitar
	const toggleColumnVisible = useCallback((columnId: string) => {
		const col = columnsHook.columns.find(c => c.id === columnId);
		if (!col) return;
		const isCurrentlyVisible = col.visible !== false;
		if (isCurrentlyVisible) {
			// Impedir si no existe otra opción vendible para algún canal
			if (!otroVendiblePOS(columnId) || !otroVendibleComp(columnId)) return;
			// Cascada predeterminados al fallback más cercano
			if (canalHook.configCanales.predeterminadoPuntoVenta === columnId) {
				canalHook.setPredeterminadoPOS(otroVendiblePOS(columnId)?.id ?? 'P1');
			}
			if (canalHook.configCanales.predeterminadoComprobantes === columnId) {
				canalHook.setPredeterminadoComprobantes(otroVendibleComp(columnId)?.id ?? 'P1');
			}
		}
		columnsHook.toggleColumnVisibility(columnId);
	}, [columnsHook, canalHook, otroVendiblePOS, otroVendibleComp]);

	// Compound: toggle POS + resetea predeterminado POS si se deshabilita
	const toggleUsarEnPOS = useCallback((columnId: string) => {
		const col = columnsHook.columns.find(c => c.id === columnId);
		if (!col || col.visible === false) return;
		const isTurningOff = col.usarEnPuntoVenta !== false;
		if (isTurningOff) {
			// Impedir si quedaría sin opción vendible en POS
			const fallback = otroVendiblePOS(columnId);
			if (!fallback) return;
			if (canalHook.configCanales.predeterminadoPuntoVenta === columnId) {
				canalHook.setPredeterminadoPOS(fallback.id);
			}
		}
		columnsHook.toggleColumnPOSUsage(columnId);
	}, [columnsHook, canalHook, otroVendiblePOS]);

	// Compound: toggle Comprobantes + resetea predeterminado Comprobantes si se deshabilita
	const toggleUsarEnComprobantes = useCallback((columnId: string) => {
		const col = columnsHook.columns.find(c => c.id === columnId);
		if (!col || col.visible === false) return;
		const isTurningOff = col.usarEnComprobantes !== false;
		if (isTurningOff) {
			// Impedir si quedaría sin opción vendible en Comprobantes
			const fallback = otroVendibleComp(columnId);
			if (!fallback) return;
			if (canalHook.configCanales.predeterminadoComprobantes === columnId) {
				canalHook.setPredeterminadoComprobantes(fallback.id);
			}
		}
		columnsHook.toggleColumnComprobantesUsage(columnId);
	}, [columnsHook, canalHook, otroVendibleComp]);

	const error = columnsHook.error || productsHook.error;
	const loading = productsHook.loading;

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
		configCanales: canalHook.configCanales,
		setPredeterminadoPOS: canalHook.setPredeterminadoPOS,
		setPredeterminadoComprobantes: canalHook.setPredeterminadoComprobantes,
		toggleColumnVisible,
		toggleColumnTableVisibility: columnsHook.toggleColumnTableVisibility,
		toggleUsarEnPOS,
		toggleUsarEnComprobantes,
		reorderColumns: columnsHook.reorderColumns,
		resetTableColumns: columnsHook.resetTableColumns,
		selectAllTableColumns: columnsHook.selectAllTableColumns,
		updateColumn: columnsHook.updateColumn,
		addOrUpdateProductPrice: productsHook.addOrUpdateProductPrice,
		applyImportedFixedPrices: productsHook.applyImportedFixedPrices,
		setProductActiveUnit: productsHook.setProductActiveUnit,
		setSearchSKU: productsHook.setSearchSKU,
		filtrosPrecios: productsHook.filtrosPrecios,
		setFiltrosPrecios: productsHook.setFiltrosPrecios,
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
