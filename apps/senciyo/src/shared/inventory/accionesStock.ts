import type { Product } from '../../pages/Private/features/catalogo-articulos/models/types';
import type { Almacen } from '../../pages/Private/features/configuracion-sistema/modelos/Almacen';
import type { MovimientoStock, StockAdjustmentData } from '../../pages/Private/features/gestion-inventario/models';
import { InventoryService } from '../../pages/Private/features/gestion-inventario/services/inventory.service';
import { useProductStore } from '../../pages/Private/features/catalogo-articulos/hooks/useProductStore';
import { STOCK_MOVEMENTS_CHANGED_EVENT } from '../../pages/Private/features/gestion-inventario/repositories/stock.repository';
import { resolverModoOperacion, resolverModoInventario } from '../../pages/Private/features/gestion-inventario/utils/estadoActivacionValorizacionInventario';
import type { EstadoActivacionValorizacion } from '../../pages/Private/features/gestion-inventario/models/estadoActivacionValorizacion.types';

export type ResultadoAjusteDeStock = {
  productoActualizado: Product;
  movimiento: MovimientoStock;
};

export type ParametrosAjusteDeStock = {
  producto: Product;
  almacen: Almacen;
  datosAjuste: StockAdjustmentData;
  usuario: string;
  estadoValorizacion: EstadoActivacionValorizacion;
  /** Switch maestro de control de existencias — obligatorio, igual que `estadoValorizacion`: con el Inventario inactivo, ninguna mutación directa de stock puede ejecutarse. */
  controlStockActivo: boolean;
};

/**
 * Etapa 4A, §10: esta mutación es directa (nunca pasa por capas/consumos) — en cualquier estado
 * de valorización distinto de los dos modos cuantitativos libres, permitirla desincronizaría el
 * stock respecto de las capas de costo. Se bloquea aquí, en el propio servicio, para que ningún
 * consumidor (presente o futuro) pueda evadir la protección quedándose solo en la interfaz.
 * Modo de inventario centralizado (fix H-1): con el Inventario inactivo se bloquea antes de mirar
 * el estado de valorización — nunca decide por un chequeo ad-hoc local a un componente.
 */
function verificarMutacionDirectaPermitida(controlStockActivo: boolean, estadoValorizacion: EstadoActivacionValorizacion): void {
  if (resolverModoInventario(controlStockActivo, estadoValorizacion) === 'inactivo') {
    throw new Error('Este ajuste no está disponible: el Inventario está inactivo para esta empresa.');
  }
  const modo = resolverModoOperacion(estadoValorizacion);
  if (modo !== 'cuantitativo_libre' && modo !== 'cuantitativo_invalida_snapshot') {
    throw new Error(
      'Este ajuste no está disponible: la empresa está en un estado de valorización de inventario que no permite mutaciones directas de stock.'
    );
  }
}

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
  const { producto, almacen, datosAjuste, usuario, estadoValorizacion, controlStockActivo } = params;

  verificarMutacionDirectaPermitida(controlStockActivo, estadoValorizacion);

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
