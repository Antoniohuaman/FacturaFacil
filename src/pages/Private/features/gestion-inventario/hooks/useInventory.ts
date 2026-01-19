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
  const [almacenFiltro, setalmacenFiltro] = useState<string>('todos');
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
  const almacenesActivos = useMemo(
    () => configState.almacenes.filter(almacen => almacen.estaActivoAlmacen),
    [configState.almacenes]
  );

  /**
   * Generar alertas de stock por producto y almacén
   */
  const stockAlerts = useMemo<StockAlert[]>(() => {
    const alerts = InventoryService.generateAlerts(allProducts, almacenesActivos);

    // Filtrar por almacén si es necesario
    if (almacenFiltro && almacenFiltro !== 'todos') {
      return alerts.filter(alert => alert.almacenId === almacenFiltro);
    }

    return alerts;
  }, [allProducts, almacenesActivos, almacenFiltro]);

  /**
   * Movimientos filtrados por período y almacén
   */
  const filteredMovements = useMemo<MovimientoStock[]>(() => {
    let filtered = filterByPeriod(movimientos, filterPeriodo);

    // Filtrar por almacén si es necesario
    if (almacenFiltro !== 'todos') {
      filtered = filtered.filter(
        mov => mov.almacenId === almacenFiltro ||
               mov.almacenOrigenId === almacenFiltro ||
               mov.almacenDestinoId === almacenFiltro
      );
    }

    return sortByDateDesc(filtered);
  }, [movimientos, filterPeriodo, almacenFiltro]);

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
      if (almacenFiltro && almacenFiltro !== 'todos') {
        // Stock de un almacén específico
        const stock = InventoryService.getStock(product, almacenFiltro);
        const stockMin = product.stockMinimoPorAlmacen?.[almacenFiltro] || 0;

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
  }, [allProducts, almacenFiltro]);

  /**
   * Maneja el ajuste de stock
   */
  const handleStockAdjustment = useCallback((data: StockAdjustmentData) => {
    try {
      const product = allProducts.find(p => p.id === data.productoId);
      const almacen = almacenesActivos.find(almacen => almacen.id === data.almacenId);

      if (!product || !almacen) {
        alert('Producto o almacén no encontrado');
        return;
      }

      // Registrar ajuste usando el servicio
      const result = InventoryService.registerAdjustment(
        product,
        almacen,
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
  }, [allProducts, almacenesActivos, updateProduct, session?.userName, user?.nombre]);

  /**
   * Maneja la transferencia de stock
   */
  const handleStockTransfer = useCallback((data: StockTransferData) => {
    try {
      const product = allProducts.find(p => p.id === data.productoId);
      const almacenOrigen = almacenesActivos.find(almacen => almacen.id === data.almacenOrigenId);
      const almacenDestino = almacenesActivos.find(almacen => almacen.id === data.almacenDestinoId);

      if (!product || !almacenOrigen || !almacenDestino) {
        alert('Producto o almacenes no encontrados');
        return;
      }

      // Registrar transferencia usando el servicio
      const result = InventoryService.registerTransfer(
        product,
        almacenOrigen,
        almacenDestino,
        data,
        session?.userName || user?.nombre || 'Usuario'
      );

      // Actualizar producto en el store
      updateProduct(result.product.id, result.product);

      // Actualizar lista de movimientos
      setMovimientos(prev => [...result.movements, ...prev]);

      // Mostrar notificación de éxito
      alert(`✅ Transferencia realizada exitosamente\n\n${data.cantidad} unidades transferidas\nDesde: ${almacenOrigen.nombreAlmacen}\nHacia: ${almacenDestino.nombreAlmacen}`);

      setShowTransferModal(false);
    } catch (error) {
      console.error('Error al registrar transferencia:', error);
      alert(`❌ Error: ${error instanceof Error ? error.message : 'No se pudo realizar la transferencia'}`);
    }
  }, [allProducts, almacenesActivos, updateProduct, session?.userName, user?.nombre]);

  /**
   * Maneja actualización masiva de stock
   */
  const handleMassStockUpdate = useCallback((data: MassStockUpdateData) => {
    try {
      const result = InventoryService.processMassUpdate(
        allProducts,
        almacenesActivos,
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
  }, [allProducts, almacenesActivos, updateProduct, session?.userName, user?.nombre]);

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
    almacenFiltro,
    showAdjustmentModal,
    showMassUpdateModal,
    showTransferModal,
    selectedProductId,
    suggestedQuantity,
    almacenesActivos,
    almacenes: almacenesActivos,
    stockAlerts,
    filteredMovements,
    stockSummary,
    allProducts,

    // Setters
    setSelectedView,
    setFilterPeriodo,
    setalmacenFiltro,
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
