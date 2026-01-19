// src/features/inventario/hooks/useInventory.ts

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useProductStore } from '../../catalogo-articulos/hooks/useProductStore';
import { useAuth } from '../../autenticacion/hooks';
import { useConfigurationContext } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
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
import { InventoryService } from '../services/inventory.service';
import { StockRepository } from '../repositories/stock.repository';
import { useUserSession } from '../../../../../contexts/UserSessionContext';

/**
 * Hook personalizado para gestión de inventario
 * Centraliza toda la lógica de negocio relacionada con stock
 */
export const useInventory = () => {
  const { user } = useAuth();
  // Estado de la aplicación
  const { allProducts, updateProduct } = useProductStore();
  const { session } = useUserSession();
  const { state: configState } = useConfigurationContext();

  // Estados locales para movimientos de stock (cargados desde repositorio)
  const [movimientos, setMovimientos] = useState<MovimientoStock[]>([]);

  // Estados locales del módulo inventario
  const [selectedView, setSelectedView] = useState<InventoryView>('situacion');
  const [filterPeriodo, setFilterPeriodo] = useState<FilterPeriod>('semana');
  const [warehouseFiltro, setWarehouseFiltro] = useState<string>('todos');
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showMassUpdateModal, setShowMassUpdateModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [suggestedQuantity, setSuggestedQuantity] = useState<number>(0);

  // Cargar movimientos desde localStorage al inicio
  useEffect(() => {
    const loadedMovements = StockRepository.getMovements();
    setMovimientos(loadedMovements);
  }, []);

  // Obtener almacenes activos
  const warehouses = useMemo(
    () => configState.warehouses.filter(w => w.isActive),
    [configState.warehouses]
  );

  /**
   * Generar alertas de stock por producto y almacén
   */
  const stockAlerts = useMemo<StockAlert[]>(() => {
    const alerts = InventoryService.generateAlerts(allProducts, warehouses);

    // Filtrar por almacén si es necesario
    if (warehouseFiltro && warehouseFiltro !== 'todos') {
      return alerts.filter(alert => alert.warehouseId === warehouseFiltro);
    }

    return alerts;
  }, [allProducts, warehouses, warehouseFiltro]);

  /**
   * Movimientos filtrados por período y almacén
   */
  const filteredMovements = useMemo<MovimientoStock[]>(() => {
    let filtered = filterByPeriod(movimientos, filterPeriodo);

    // Filtrar por almacén si es necesario
    if (warehouseFiltro !== 'todos') {
      filtered = filtered.filter(
        mov => mov.warehouseId === warehouseFiltro ||
               mov.warehouseOrigenId === warehouseFiltro ||
               mov.warehouseDestinoId === warehouseFiltro
      );
    }

    return sortByDateDesc(filtered);
  }, [movimientos, filterPeriodo, warehouseFiltro]);

  /**
   * Resumen del inventario
   */
  const stockSummary = useMemo<StockSummary>(() => {
    let totalStock = 0;
    let valorTotalStock = 0;
    let productosSinStock = 0;
    let productosStockBajo = 0;
    let productosStockCritico = 0;

    allProducts.forEach(product => {
      if (warehouseFiltro && warehouseFiltro !== 'todos') {
        // Stock de un almacén específico
        const stock = InventoryService.getStock(product, warehouseFiltro);
        const stockMin = product.stockMinimoPorAlmacen?.[warehouseFiltro] || 0;

        totalStock += stock;
        valorTotalStock += stock * product.precio;

        if (stock === 0) {
          productosSinStock++;
          if (stockMin > 0) productosStockCritico++;
        } else if (stock < stockMin * 0.5) {
          productosStockCritico++;
        } else if (stock < stockMin) {
          productosStockBajo++;
        }
      } else {
        // Stock total de todos los almacenes
        const stockTotal = InventoryService.getTotalStock(product);
        totalStock += stockTotal;
        valorTotalStock += stockTotal * product.precio;

        // Verificar si tiene stock en al menos un almacén
        if (stockTotal === 0) {
          productosSinStock++;
        }
      }
    });

    return {
      totalProductos: allProducts.length,
      totalStock,
      valorTotalStock,
      productosSinStock,
      productosStockBajo,
      productosStockCritico,
      ultimaActualizacion: new Date()
    };
  }, [allProducts, warehouseFiltro]);

  /**
   * Maneja el ajuste de stock
   */
  const handleStockAdjustment = useCallback((data: StockAdjustmentData) => {
    try {
      const product = allProducts.find(p => p.id === data.productoId);
      const warehouse = warehouses.find(w => w.id === data.warehouseId);

      if (!product || !warehouse) {
        alert('Producto o almacén no encontrado');
        return;
      }

      // Registrar ajuste usando el servicio
      const result = InventoryService.registerAdjustment(
        product,
        warehouse,
        data,
        session?.userName || user?.nombre || 'Usuario'
      );

      // Actualizar producto en el store
      updateProduct(result.product.id, result.product);

      // Actualizar lista de movimientos
      setMovimientos(prev => [result.movement, ...prev]);

      // Mostrar notificación de éxito
      alert(`✅ Ajuste registrado exitosamente\n\n${data.tipo}: ${data.cantidad} unidades\nNuevo stock: ${result.movement.cantidadNueva}`);

      setShowAdjustmentModal(false);
    } catch (error) {
      console.error('Error al registrar ajuste:', error);
      alert(`❌ Error: ${error instanceof Error ? error.message : 'No se pudo registrar el ajuste'}`);
    }
  }, [allProducts, warehouses, updateProduct, session?.userName, user?.nombre]);

  /**
   * Maneja la transferencia de stock
   */
  const handleStockTransfer = useCallback((data: StockTransferData) => {
    try {
      const product = allProducts.find(p => p.id === data.productoId);
      const warehouseOrigen = warehouses.find(w => w.id === data.warehouseOrigenId);
      const warehouseDestino = warehouses.find(w => w.id === data.warehouseDestinoId);

      if (!product || !warehouseOrigen || !warehouseDestino) {
        alert('Producto o almacenes no encontrados');
        return;
      }

      // Registrar transferencia usando el servicio
      const result = InventoryService.registerTransfer(
        product,
        warehouseOrigen,
        warehouseDestino,
        data,
        session?.userName || user?.nombre || 'Usuario'
      );

      // Actualizar producto en el store
      updateProduct(result.product.id, result.product);

      // Actualizar lista de movimientos
      setMovimientos(prev => [...result.movements, ...prev]);

      // Mostrar notificación de éxito
      alert(`✅ Transferencia realizada exitosamente\n\n${data.cantidad} unidades transferidas\nDesde: ${warehouseOrigen.name}\nHacia: ${warehouseDestino.name}`);

      setShowTransferModal(false);
    } catch (error) {
      console.error('Error al registrar transferencia:', error);
      alert(`❌ Error: ${error instanceof Error ? error.message : 'No se pudo realizar la transferencia'}`);
    }
  }, [allProducts, warehouses, updateProduct, session?.userName, user?.nombre]);

  /**
   * Maneja actualización masiva de stock
   */
  const handleMassStockUpdate = useCallback((data: MassStockUpdateData) => {
    try {
      const result = InventoryService.processMassUpdate(
        allProducts,
        warehouses,
        data,
        session?.userName || user?.nombre || 'Usuario'
      );

      // Actualizar productos en el store
      result.updatedProducts.forEach(product => {
        updateProduct(product.id, product);
      });

      // Actualizar lista de movimientos
      setMovimientos(prev => [...result.movements, ...prev]);

      // Mostrar notificación de éxito
      alert(`✅ Actualización masiva completada\n\n${result.movements.length} movimientos registrados`);

      setShowMassUpdateModal(false);
    } catch (error) {
      console.error('Error en actualización masiva:', error);
      alert(`❌ Error: ${error instanceof Error ? error.message : 'No se pudo completar la actualización masiva'}`);
    }
  }, [allProducts, warehouses, updateProduct, session?.userName, user?.nombre]);

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
    warehouseFiltro,
    showAdjustmentModal,
    showMassUpdateModal,
    showTransferModal,
    selectedProductId,
    suggestedQuantity,
    warehouses,
    stockAlerts,
    filteredMovements,
    stockSummary,
    allProducts,

    // Setters
    setSelectedView,
    setFilterPeriodo,
    setWarehouseFiltro,
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
