// src/features/inventario/hooks/useInventory.ts

import { useState, useMemo, useCallback } from 'react';
import { useProductStore } from '../../catalogo-articulos/hooks/useProductStore';
import { useConfigurationContext } from '../../configuracion-sistema/context/ConfigurationContext';
import type {
  StockAlert,
  MovimientoStock,
  InventoryView,
  FilterPeriod,
  StockSummary,
  StockAdjustmentData,
  StockTransferData,
  MassStockUpdateData
} from '../models';
import { filterByPeriod, sortByDateDesc } from '../utils/inventory.helpers';

/**
 * Hook personalizado para gestión de inventario
 * Centraliza toda la lógica de negocio relacionada con stock
 */
export const useInventory = () => {
  // Estado de la aplicación
  const { allProducts } = useProductStore();
  const { state: configState } = useConfigurationContext();

  // Estados locales para movimientos de stock (gestionados por el módulo inventario)
  const [movimientos] = useState<MovimientoStock[]>([]);

  // Estados locales del módulo inventario
  const [selectedView, setSelectedView] = useState<InventoryView>('movimientos');
  const [filterPeriodo, setFilterPeriodo] = useState<FilterPeriod>('semana');
  const [establecimientoFiltro, setEstablecimientoFiltro] = useState<string>('todos');
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showMassUpdateModal, setShowMassUpdateModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [suggestedQuantity, setSuggestedQuantity] = useState<number>(0);

  // Obtener establecimientos activos
  const establishments = useMemo(
    () => configState.establishments.filter(e => e.isActive),
    [configState.establishments]
  );

  /**
   * Generar alertas de stock por producto y establecimiento
   * NOTA: Esta funcionalidad requiere que los productos tengan campos de stock.
   * Por ahora retorna array vacío hasta que se implemente la gestión de stock en inventario.
   */
  const stockAlerts = useMemo<StockAlert[]>(() => {
    const alerts: StockAlert[] = [];
    // TODO: Implementar lógica de alertas cuando el inventario gestione su propio stock
    return alerts;
  }, [allProducts, establishments, establecimientoFiltro]);

  /**
   * Movimientos filtrados por período y establecimiento
   */
  const filteredMovements = useMemo<MovimientoStock[]>(() => {
    let filtered = filterByPeriod(movimientos, filterPeriodo);

    // Filtrar por establecimiento si es necesario
    if (establecimientoFiltro !== 'todos') {
      filtered = filtered.filter(
        mov => mov.establecimientoId === establecimientoFiltro ||
               mov.establecimientoOrigenId === establecimientoFiltro ||
               mov.establecimientoDestinoId === establecimientoFiltro
      );
    }

    return sortByDateDesc(filtered);
  }, [movimientos, filterPeriodo, establecimientoFiltro]);

  /**
   * Resumen del inventario
   * NOTA: Por ahora retorna valores por defecto hasta que se implemente gestión de stock
   */
  const stockSummary = useMemo<StockSummary>(() => {
    return {
      totalProductos: allProducts.length,
      totalStock: 0,
      valorTotalStock: 0,
      productosSinStock: 0,
      productosStockBajo: 0,
      productosStockCritico: 0,
      ultimaActualizacion: new Date()
    };
  }, [allProducts, establecimientoFiltro]);

  /**
   * Maneja el ajuste de stock
   * TODO: Implementar cuando se gestione stock en inventario
   */
  const handleStockAdjustment = useCallback((_data: StockAdjustmentData) => {
    console.warn('handleStockAdjustment no implementado - requiere gestión de stock en inventario');
    setShowAdjustmentModal(false);
  }, []);

  /**
   * Maneja la transferencia de stock
   * TODO: Implementar cuando se gestione stock en inventario
   */
  const handleStockTransfer = useCallback((_data: StockTransferData) => {
    console.warn('handleStockTransfer no implementado - requiere gestión de stock en inventario');
    setShowTransferModal(false);
  }, []);

  /**
   * Maneja actualización masiva de stock
   * TODO: Implementar cuando se gestione stock en inventario
   */
  const handleMassStockUpdate = useCallback((_data: MassStockUpdateData) => {
    console.warn('handleMassStockUpdate no implementado - requiere gestión de stock en inventario');
    setShowMassUpdateModal(false);
  }, []);

  /**
   * Abre modal de ajuste para un producto específico
   */
  const openAdjustmentModal = useCallback((productId: string, suggestedQty: number = 0) => {
    setSelectedProductId(productId);
    setSuggestedQuantity(suggestedQty);
    setShowAdjustmentModal(true);
  }, []);

  /**
   * Abre modal de transferencia
   */
  const openTransferModal = useCallback(() => {
    setShowTransferModal(true);
  }, []);

  /**
   * Abre modal de actualización masiva
   */
  const openMassUpdateModal = useCallback(() => {
    setShowMassUpdateModal(true);
  }, []);

  return {
    // Estados
    selectedView,
    filterPeriodo,
    establecimientoFiltro,
    showAdjustmentModal,
    showMassUpdateModal,
    showTransferModal,
    selectedProductId,
    suggestedQuantity,
    establishments,
    stockAlerts,
    filteredMovements,
    stockSummary,
    allProducts,

    // Setters
    setSelectedView,
    setFilterPeriodo,
    setEstablecimientoFiltro,
    setShowAdjustmentModal,
    setShowMassUpdateModal,
    setShowTransferModal,

    // Handlers
    handleStockAdjustment,
    handleStockTransfer,
    handleMassStockUpdate,
    openAdjustmentModal,
    openTransferModal,
    openMassUpdateModal
  };
};
