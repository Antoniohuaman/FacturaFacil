// src/features/gestion-inventario/api/inventory.facade.ts
import { InventoryService } from '../services/inventory.service';
import { StockRepository } from '../repositories/stock.repository';
import type { MovimientoMotivo, MovimientoTipo, MovimientoStock } from '../models';
import { useConfigurationContext } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import { useProductStore } from '../../catalogo-articulos/hooks/useProductStore';
import { useUserSession } from '../../../../../contexts/UserSessionContext';
import { resolvealmacenForSale } from '../../../../../shared/inventory/stockGateway';

/**
 * Fachada de inventario para mantener la separación de responsabilidades.
 * Expone una API de compatibilidad (addMovimiento) para módulos legados
 * sin que el módulo de catálogo mutile el stock directamente.
 */
export function useInventoryFacade() {
  const { state: { almacenes } } = useConfigurationContext();
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
      almacenId?: string;
      allowNegativeStock?: boolean;
    }
  ) => {
    const product = allProducts.find(p => p.id === productId);
    if (!product) {
      console.warn('[InventoryFacade] Producto no encontrado para movimiento', { productId });
      return;
    }

    const resolvedalmacen = resolvealmacenForSale({
      almacenes,
      EstablecimientoId: establecimientoId,
      preferredalmacenId: options?.almacenId,
    });
    const explicitalmacen = !resolvedalmacen && options?.almacenId
      ? almacenes.find(w => w.id === options.almacenId && w.isActive !== false)
      : undefined;
    const almacen = resolvedalmacen || explicitalmacen;

    if (!almacen) {
      throw new Error(
        `[InventoryFacade] No se pudo resolver un almacén válido para el establecimiento ${establecimientoId || '(sin establecimiento)'}; se cancela el movimiento para evitar corrupción de stock.`
      );
    }

    const almacenId = almacen.id;
    const almacenCode = almacen?.code || 'N/A';
    const nombreAlmacen = almacen?.name || 'Sin almacén';
    const stockActual = InventoryService.getStock(product, almacenId);
    const allowNegativeStock = Boolean(options?.allowNegativeStock);

    const isEntrada = tipo === 'ENTRADA' || tipo === 'AJUSTE_POSITIVO' || tipo === 'DEVOLUCION';
    const cantidadNuevaRaw = isEntrada ? stockActual + cantidad : stockActual - cantidad;
    const cantidadNueva = allowNegativeStock ? cantidadNuevaRaw : Math.max(0, cantidadNuevaRaw);
    const delta = cantidadNueva - stockActual;

    const updatedProductSnapshot = InventoryService.updateStock(product, almacenId, cantidadNueva, { allowNegativeStock });
    const totalStock = InventoryService.getTotalStock(updatedProductSnapshot);

    const movementEstablecimientoId = establecimientoId || almacen?.EstablecimientoId || '';
    let nextStockPorEstablecimiento = product.stockPorEstablecimiento;
    if (movementEstablecimientoId) {
      const prevValue = product.stockPorEstablecimiento?.[movementEstablecimientoId];
      let nextValue: number | undefined;
      if (typeof prevValue === 'number') {
        nextValue = allowNegativeStock ? prevValue + delta : Math.max(0, prevValue + delta);
      } else if (almacenes && almacenes.length) {
        nextValue = almacenes
          .filter(w => w.EstablecimientoId === movementEstablecimientoId)
          .reduce((sum, w) => sum + (updatedProductSnapshot.stockPorAlmacen?.[w.id] ?? 0), 0);
      } else {
        nextValue = allowNegativeStock ? totalStock : Math.max(0, totalStock);
      }

      nextStockPorEstablecimiento = {
        ...(product.stockPorEstablecimiento ?? {}),
        [movementEstablecimientoId]: nextValue,
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
      almacenId,
      almacenCodigo: almacenCode,
      almacenNombre: nombreAlmacen,
      EstablecimientoId: movementEstablecimientoId,
      EstablecimientoCodigo: establecimientoCodigo || almacen?.EstablecimientoCode || '',
      EstablecimientoNombre: establecimientoNombre || almacen?.EstablecimientoName || ''
    };

    StockRepository.addMovement(mov);
  };

  return {
    addMovimiento,
  };
}
