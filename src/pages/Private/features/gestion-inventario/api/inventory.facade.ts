// src/features/gestion-inventario/api/inventory.facade.ts
import { InventoryService } from '../services/inventory.service';
import { StockRepository } from '../repositories/stock.repository';
import type { MovimientoMotivo, MovimientoTipo, MovimientoStock } from '../models';
import { useConfigurationContext } from '../../configuracion-sistema/context/ConfigurationContext';
import { useProductStore } from '../../catalogo-articulos/hooks/useProductStore';
import { useUserSession } from '../../../../../contexts/UserSessionContext';
import { resolveWarehouseForSale } from '../../../../../shared/inventory/stockGateway';

/**
 * Fachada de inventario para mantener la separación de responsabilidades.
 * Expone una API de compatibilidad (addMovimiento) para módulos legados
 * sin que el módulo de catálogo mutile el stock directamente.
 */
export function useInventoryFacade() {
  const { state: { warehouses } } = useConfigurationContext();
  const { allProducts, updateProduct } = useProductStore();
  const { session } = useUserSession();

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
    establecimientoNombre?: string,
    options?: {
      warehouseId?: string;
      allowNegativeStock?: boolean;
    }
  ) => {
    const product = allProducts.find(p => p.id === productId);
    if (!product) {
      console.warn('[InventoryFacade] Producto no encontrado para movimiento', { productId });
      return;
    }

    const resolvedWarehouse = resolveWarehouseForSale({
      warehouses,
      establishmentId: establecimientoId,
      preferredWarehouseId: options?.warehouseId,
    });
    const explicitWarehouse = !resolvedWarehouse && options?.warehouseId
      ? warehouses.find(w => w.id === options.warehouseId && w.isActive !== false)
      : undefined;
    const warehouse = resolvedWarehouse || explicitWarehouse;

    if (!warehouse) {
      throw new Error(
        `[InventoryFacade] No se pudo resolver un almacén válido para el establecimiento ${establecimientoId || '(sin establecimiento)'}; se cancela el movimiento para evitar corrupción de stock.`
      );
    }

    const warehouseId = warehouse.id;
    const warehouseCode = warehouse?.code || 'N/A';
    const warehouseName = warehouse?.name || 'Sin almacén';
    const stockActual = InventoryService.getStock(product, warehouseId);
    const allowNegativeStock = Boolean(options?.allowNegativeStock);

    const isEntrada = tipo === 'ENTRADA' || tipo === 'AJUSTE_POSITIVO' || tipo === 'DEVOLUCION';
    const cantidadNuevaRaw = isEntrada ? stockActual + cantidad : stockActual - cantidad;
    const cantidadNueva = allowNegativeStock ? cantidadNuevaRaw : Math.max(0, cantidadNuevaRaw);
    const delta = cantidadNueva - stockActual;

    const updatedProductSnapshot = InventoryService.updateStock(product, warehouseId, cantidadNueva, { allowNegativeStock });
    const totalStock = InventoryService.getTotalStock(updatedProductSnapshot);

    const movementEstablishmentId = establecimientoId || warehouse?.establishmentId || '';
    let nextStockPorEstablecimiento = product.stockPorEstablecimiento;
    if (movementEstablishmentId) {
      const prevValue = product.stockPorEstablecimiento?.[movementEstablishmentId];
      let nextValue: number | undefined;
      if (typeof prevValue === 'number') {
        nextValue = allowNegativeStock ? prevValue + delta : Math.max(0, prevValue + delta);
      } else if (warehouses && warehouses.length) {
        nextValue = warehouses
          .filter(w => w.establishmentId === movementEstablishmentId)
          .reduce((sum, w) => sum + (updatedProductSnapshot.stockPorAlmacen?.[w.id] ?? 0), 0);
      } else {
        nextValue = allowNegativeStock ? totalStock : Math.max(0, totalStock);
      }

      nextStockPorEstablecimiento = {
        ...(product.stockPorEstablecimiento ?? {}),
        [movementEstablishmentId]: nextValue,
      };
    }

    const productUpdate: Partial<typeof product> = {
      stockPorAlmacen: updatedProductSnapshot.stockPorAlmacen,
      cantidad: totalStock,
      fechaActualizacion: updatedProductSnapshot.fechaActualizacion,
    };

    if (nextStockPorEstablecimiento) {
      productUpdate.stockPorEstablecimiento = nextStockPorEstablecimiento;
    }

    updateProduct(product.id, productUpdate);

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
      establishmentId: movementEstablishmentId,
      establishmentCodigo: establecimientoCodigo || warehouse?.establishmentCode || '',
      establishmentNombre: establecimientoNombre || warehouse?.establishmentName || ''
    };

    StockRepository.addMovement(mov);
  };

  return {
    addMovimiento,
  };
}
