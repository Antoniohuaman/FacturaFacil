// src/features/gestion-inventario/api/inventory.facade.ts
import { useMemo } from 'react';
import { InventoryService } from '../services/inventory.service';
import { StockRepository } from '../repositories/stock.repository';
import type { MovimientoMotivo, MovimientoTipo, MovimientoStock } from '../models';
import { useConfigurationContext } from '../../configuracion-sistema/context/ConfigurationContext';
import { useProductStore } from '../../catalogo-articulos/hooks/useProductStore';
import { useUserSession } from '../../../contexts/UserSessionContext';

/**
 * Fachada de inventario para mantener la separación de responsabilidades.
 * Expone una API de compatibilidad (addMovimiento) para módulos legados
 * sin que el módulo de catálogo mutile el stock directamente.
 */
export function useInventoryFacade() {
  const { state: { warehouses } } = useConfigurationContext();
  const { allProducts } = useProductStore();
  const { session } = useUserSession();

  const findMainWarehouse = useMemo(() => (
    (establishmentId?: string) => {
      if (!warehouses || warehouses.length === 0) return undefined;
      if (establishmentId) {
        const byEst = warehouses.filter(w => w.establishmentId === establishmentId);
        return byEst.find(w => w.isMainWarehouse) || byEst[0];
      }
      return warehouses.find(w => w.isMainWarehouse) || warehouses[0];
    }
  ), [warehouses]);

  /**
   * API de compatibilidad: registra un movimiento de stock en el repositorio
   * sin actualizar el estado del catálogo (no muta Product.cantidad).
   */
  const addMovimiento = (
    productId: string,
    tipo: MovimientoTipo,
    motivo: MovimientoMotivo,
    cantidad: number,
    observaciones?: string,
    documentoReferencia?: string,
    ubicacion?: string,
    establecimientoId?: string,
    establecimientoCodigo?: string,
    establecimientoNombre?: string
  ) => {
    const product = allProducts.find(p => p.id === productId);
    if (!product) {
      console.warn('[InventoryFacade] Producto no encontrado para movimiento', { productId });
      return;
    }

    // Resolver almacén: principal del establecimiento o el primero disponible
    const wh = findMainWarehouse(establecimientoId);

    // Stock actual desde el producto (por almacén si existe; si no, 0)
    const warehouseId = wh?.id || 'N/A';
    const warehouseCode = wh?.code || 'N/A';
    const warehouseName = wh?.name || 'Sin almacén';
    const stockActual = InventoryService.getStock(product, warehouseId);

    const isEntrada = tipo === 'ENTRADA' || tipo === 'AJUSTE_POSITIVO' || tipo === 'DEVOLUCION';
    const cantidadNuevaRaw = isEntrada ? stockActual + cantidad : stockActual - cantidad;
    const cantidadNueva = Math.max(0, cantidadNuevaRaw);

    const mov: MovimientoStock = {
      id: `MOV-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      productoId: product.id,
      productoCodigo: product.codigo,
      productoNombre: product.nombre,
      tipo,
      motivo,
      cantidad,
      cantidadAnterior: stockActual,
      cantidadNueva,
      usuario: session?.userName || 'Sistema',
      observaciones,
      documentoReferencia,
      fecha: new Date(),
      ubicacion,
      warehouseId,
      warehouseCodigo: warehouseCode,
      warehouseNombre: warehouseName,
      establishmentId: establecimientoId || wh?.establishmentId || '',
      establishmentCodigo: establecimientoCodigo || wh?.establishmentCode || '',
      establishmentNombre: establecimientoNombre || wh?.establishmentName || ''
    };

    StockRepository.addMovement(mov);
  };

  return {
    addMovimiento,
  };
}
