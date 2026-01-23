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
import { useFeedback } from '../../../../../shared/feedback';

type AdjustmentModalOptions = {
  almacenId?: string | null;
  mode?: 'manual' | 'prefilled';
};

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
  const [prefilledAlmacenId, setPrefilledAlmacenId] = useState<string | null>(null);
  const [adjustmentMode, setAdjustmentMode] = useState<'manual' | 'prefilled'>('manual');

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
  const { success, error, warning } = useFeedback();

  const handleStockAdjustment = useCallback((data: StockAdjustmentData) => {
    try {
      const product = allProducts.find(p => p.id === data.productoId);
      const almacen = almacenesActivos.find(almacen => almacen.id === data.almacenId);

      if (!product || !almacen) {
        warning('Producto o almacén no encontrado', 'Advertencia');
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
      success(`${data.tipo}: ${data.cantidad} u · Nuevo stock: ${result.movement.cantidadNueva}`, 'Ajuste registrado');

      setShowAdjustmentModal(false);
    } catch (err) {
      console.error('Error al registrar ajuste:', err);
      error(err instanceof Error ? err.message : 'No se pudo registrar el ajuste', 'Error');
    }
  }, [allProducts, almacenesActivos, updateProduct, session?.userName, user?.nombre, success, error, warning]);

  /**
   * Maneja la transferencia de stock
   */
  const handleStockTransfer = useCallback((data: StockTransferData) => {
    try {
      const product = allProducts.find(p => p.id === data.productoId);
      const almacenOrigen = almacenesActivos.find(almacen => almacen.id === data.almacenOrigenId);
      const almacenDestino = almacenesActivos.find(almacen => almacen.id === data.almacenDestinoId);

      if (!product || !almacenOrigen || !almacenDestino) {
        warning('Producto o almacenes no encontrados', 'Advertencia');
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
      success(`${data.cantidad} u · De: ${almacenOrigen.nombreAlmacen} → ${almacenDestino.nombreAlmacen}`, 'Transferencia realizada');

      setShowTransferModal(false);
    } catch (err) {
      console.error('Error al registrar transferencia:', err);
      error(err instanceof Error ? err.message : 'No se pudo realizar la transferencia', 'Error');
    }
  }, [allProducts, almacenesActivos, updateProduct, session?.userName, user?.nombre, success, error, warning]);

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
      success(`${result.movements.length} movimientos registrados`, 'Actualización masiva completada');

      setShowMassUpdateModal(false);
    } catch (err) {
      console.error('Error en actualización masiva:', err);
      error(err instanceof Error ? err.message : 'No se pudo completar la actualización masiva', 'Error');
    }
  }, [allProducts, almacenesActivos, updateProduct, session?.userName, user?.nombre, success, error]);

  /**
   * Abre modal de ajuste para un producto específico
   */
  const openAdjustmentModal = useCallback((
    productId: string,
    suggestedQty: number = 0,
    options?: AdjustmentModalOptions
  ) => {
    setSelectedProductId(productId || null);
    setSuggestedQuantity(suggestedQty);
    setPrefilledAlmacenId(options?.almacenId ?? null);
    setAdjustmentMode(options?.mode ?? (productId ? 'prefilled' : 'manual'));
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
    prefilledAlmacenId,
    adjustmentMode,
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
