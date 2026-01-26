import type { Product } from '../../pages/Private/features/catalogo-articulos/models/types';
import type { Almacen } from '../../pages/Private/features/configuracion-sistema/modelos/Almacen';
import type { MovimientoStock, StockAdjustmentData } from '../../pages/Private/features/gestion-inventario/models';
import { InventoryService } from '../../pages/Private/features/gestion-inventario/services/inventory.service';
import { useProductStore } from '../../pages/Private/features/catalogo-articulos/hooks/useProductStore';

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
