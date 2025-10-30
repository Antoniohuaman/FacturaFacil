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
import { filterByPeriod, sortByDateDesc, sortAlertsByPriority } from '../utils/inventory.helpers';

/**
 * Hook personalizado para gestión de inventario
 * Centraliza toda la lógica de negocio relacionada con stock
 */
export const useInventory = () => {
  // Estado de la aplicación
  const { allProducts, movimientos, addMovimiento, transferirStock } = useProductStore();
  const { state: configState } = useConfigurationContext();

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
   */
  const stockAlerts = useMemo<StockAlert[]>(() => {
    const alerts: StockAlert[] = [];

    allProducts.forEach(producto => {
      // Si tiene stockPorEstablecimiento, generar alertas por cada establecimiento
      if (producto.stockPorEstablecimiento) {
        Object.entries(producto.stockPorEstablecimiento).forEach(([estId, stock]) => {
          const establecimiento = establishments.find(e => e.id === estId);
          if (!establecimiento) return;

          // Obtener configuración de stock para este establecimiento (o usar defaults)
          const config = producto.stockConfigPorEstablecimiento?.[estId];
          const stockMinimo = config?.stockMinimo ?? 10;
          const stockMaximo = config?.stockMaximo ?? 100;

          // Determinar estado
          let estado: StockAlert['estado'];
          if (stock === 0) {
            estado = 'CRITICO';
          } else if (stock <= stockMinimo) {
            estado = 'BAJO';
          } else if (stock >= stockMaximo) {
            estado = 'EXCESO';
          } else {
            return; // No generar alerta si está en rango normal
          }

          // Filtrar por establecimiento si hay uno seleccionado
          if (establecimientoFiltro !== 'todos' && estId !== establecimientoFiltro) {
            return;
          }

          alerts.push({
            productoId: producto.id,
            productoCodigo: producto.codigo,
            productoNombre: producto.nombre,
            cantidadActual: stock,
            stockMinimo,
            stockMaximo,
            estado,
            establecimientoId: estId,
            establecimientoCodigo: establecimiento.code,
            establecimientoNombre: establecimiento.name,
            faltante: estado === 'CRITICO' || estado === 'BAJO' ? Math.max(0, stockMinimo - stock) : undefined,
            excedente: estado === 'EXCESO' ? Math.max(0, stock - stockMaximo) : undefined
          });
        });
      } else {
        // Fallback: alertas basadas en stock global (retrocompatibilidad)
        if (producto.cantidad <= 10) {
          const stockMinimo = 10;
          alerts.push({
            productoId: producto.id,
            productoCodigo: producto.codigo,
            productoNombre: producto.nombre,
            cantidadActual: producto.cantidad,
            stockMinimo,
            estado: producto.cantidad === 0 ? 'CRITICO' : 'BAJO',
            establecimientoId: 'global',
            establecimientoCodigo: 'GLOBAL',
            establecimientoNombre: 'Stock Global',
            faltante: Math.max(0, stockMinimo - producto.cantidad)
          });
        }
      }
    });

    return sortAlertsByPriority(alerts);
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
   */
  const stockSummary = useMemo<StockSummary>(() => {
    let totalStock = 0;
    let valorTotalStock = 0;
    let productosSinStock = 0;
    let productosStockBajo = 0;
    let productosStockCritico = 0;

    allProducts.forEach(producto => {
      if (producto.stockPorEstablecimiento) {
        // Sumar stock de todos los establecimientos
        Object.entries(producto.stockPorEstablecimiento).forEach(([estId, stock]) => {
          if (establecimientoFiltro === 'todos' || estId === establecimientoFiltro) {
            totalStock += stock;
            valorTotalStock += stock * producto.precio;

            const config = producto.stockConfigPorEstablecimiento?.[estId];
            const stockMinimo = config?.stockMinimo ?? 10;

            if (stock === 0) {
              productosSinStock++;
              productosStockCritico++;
            } else if (stock <= stockMinimo) {
              productosStockBajo++;
            }
          }
        });
      } else {
        // Fallback para productos sin multi-establecimiento
        totalStock += producto.cantidad;
        valorTotalStock += producto.cantidad * producto.precio;

        if (producto.cantidad === 0) {
          productosSinStock++;
          productosStockCritico++;
        } else if (producto.cantidad <= 10) {
          productosStockBajo++;
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
  }, [allProducts, establecimientoFiltro]);

  /**
   * Maneja el ajuste de stock
   */
  const handleStockAdjustment = useCallback((data: StockAdjustmentData) => {
    addMovimiento(
      data.productoId,
      data.tipo,
      data.motivo,
      data.cantidad,
      data.observaciones,
      data.documentoReferencia,
      undefined, // ubicacion - deprecated
      data.establecimientoId,
      data.establecimientoCodigo,
      data.establecimientoNombre
    );
    setShowAdjustmentModal(false);
  }, [addMovimiento]);

  /**
   * Maneja la transferencia de stock
   */
  const handleStockTransfer = useCallback((data: StockTransferData) => {
    transferirStock(
      data.productoId,
      data.establecimientoOrigenId,
      data.establecimientoDestinoId,
      data.cantidad,
      data.observaciones,
      data.documentoReferencia
    );
    setShowTransferModal(false);
  }, [transferirStock]);

  /**
   * Maneja actualización masiva de stock
   */
  const handleMassStockUpdate = useCallback((data: MassStockUpdateData) => {
    data.updates.forEach(update => {
      addMovimiento(
        update.productoId,
        data.tipo,
        data.motivo,
        update.cantidad,
        data.observaciones,
        undefined,
        update.establecimientoId
      );
    });
    setShowMassUpdateModal(false);
  }, [addMovimiento]);

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
