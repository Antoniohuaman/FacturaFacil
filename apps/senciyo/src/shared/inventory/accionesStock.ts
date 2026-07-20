import type { Product } from '../../pages/Private/features/catalogo-articulos/models/types';
import type { Almacen } from '../../pages/Private/features/configuracion-sistema/modelos/Almacen';
import type { MovimientoStock, StockAdjustmentData } from '../../pages/Private/features/gestion-inventario/models';
import { InventoryService } from '../../pages/Private/features/gestion-inventario/services/inventory.service';
import { useProductStore } from '../../pages/Private/features/catalogo-articulos/hooks/useProductStore';
import { STOCK_MOVEMENTS_CHANGED_EVENT } from '../../pages/Private/features/gestion-inventario/repositories/stock.repository';

export type ResultadoAjusteDeStock = {
  productoActualizado: Product;
  movimiento: MovimientoStock;
};

export type ParametrosAjusteDeStock = {
  producto: Product;
  almacen: Almacen;
  datosAjuste: StockAdjustmentData;
  usuario: string;
};

/**
 * Registra un ajuste de stock y aplica el cambio al catálogo local.
 *
 * Nota: este es el punto único donde hoy se muta/persiste en frontend.
 * Mañana puede reemplazarse por una llamada a API sin tocar POS/Tradicional.
 *
 * @deprecated Persiste directamente sin reserva idempotente ni unidad de trabajo recuperable
 * (vía `InventoryService.registerAdjustment`, también deprecado). Se mantiene como wrapper
 * temporal para los consumidores que todavía no migraron al motor de Etapa 1C (POS, formularios
 * de comprobantes) — la ruta de ajustes positivos del módulo de Inventario ya no lo usa, ver
 * `hooks/useInventory.ts::handleStockAdjustment`.
 */
export const registrarAjusteDeStock = (params: ParametrosAjusteDeStock): ResultadoAjusteDeStock => {
  const { producto, almacen, datosAjuste, usuario } = params;

  // TODO: reemplazar por API cuando el backend esté disponible.
  const resultado = InventoryService.registerAdjustment(producto, almacen, datosAjuste, usuario);

  // Aplicar al catálogo (zustand) para refrescar el UI inmediatamente.
  useProductStore.getState().updateProduct(resultado.product.id, resultado.product);

  return {
    productoActualizado: resultado.product,
    movimiento: resultado.movement,
  };
};

/**
 * Mecanismo oficial de sincronización de UI tras una confirmación del motor de Etapa 1C
 * (`ServicioKardexValorizado.registrarEntradaValorizada`, `notaIngreso.service.ts`). La unidad de
 * trabajo (Etapa 1B) ya escribió `catalog_products`/`facturafacil_stock_movements` — este helper
 * NUNCA vuelve a escribir esas colecciones, solo rehidrata el store de productos desde el
 * localStorage ya actualizado (`rehydrateFromStorage`, sin persistir) y reutiliza el mismo evento
 * ya existente (`STOCK_MOVEMENTS_CHANGED_EVENT`) para que la tabla de movimientos del Kardex se
 * refresque — el mismo evento que ya disparaba `StockRepository.addMovement`, nunca uno nuevo.
 * Segura de llamar también cuando la operación fue 'repetida' (nada cambió, pero deja la UI
 * consistente con el estado real ya confirmado).
 */
export const sincronizarInventarioTrasConfirmacion = (): void => {
  useProductStore.getState().rehydrateFromStorage();
  window.dispatchEvent(new Event(STOCK_MOVEMENTS_CHANGED_EVENT));
};
