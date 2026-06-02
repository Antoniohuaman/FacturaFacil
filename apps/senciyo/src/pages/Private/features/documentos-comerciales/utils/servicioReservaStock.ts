import type { CartItem } from '../models/documentoComercial.types';
import type { ReservaStockItem } from '../models/documentoComercial.types';
import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';
import { useProductStore } from '../../catalogo-articulos/hooks/useProductStore';
import {
  summarizeProductStock,
  resolvealmacenForSale,
} from '@/shared/inventory/stockGateway';

const toNum = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * Determina si un ítem requiere validación/reserva de stock en una Orden de Venta.
 *
 * Reglas:
 * - Servicios: nunca validan stock.
 * - Ítems de entrada libre (modo libre): no tienen respaldo en catálogo, no se validan.
 * - Bienes de catálogo: siempre validan, independientemente de requiresStockControl.
 *   (requiresStockControl solo indica si el producto tiene datos de stock configurados,
 *    no si debe saltarse la validación en una OV.)
 * - Tipo desconocido de catálogo: validar salvo que requiresStockControl sea explícitamente false.
 */
function debeControlarStock(item: CartItem): boolean {
  if (item.tipoBienServicio === 'servicio') return false;
  if (item.tipoDetalle === 'libre') return false;
  if (item.tipoBienServicio === 'bien') return true;
  // Tipo no determinado para ítem de catálogo: validar si no está marcado explícitamente como "sin control"
  return item.requiresStockControl !== false;
}

/**
 * Verifica si el producto tiene datos de stock registrados en alguna fuente.
 */
function tieneStockDataRegistrado(producto: ReturnType<typeof useProductStore.getState>['allProducts'][number]): boolean {
  return Boolean(
    producto.stockPorAlmacen ||
    typeof producto.cantidad === 'number' ||
    (producto.stockPorEstablecimiento && Object.keys(producto.stockPorEstablecimiento).length > 0),
  );
}

/**
 * Valida que todos los bienes de la orden tengan stock disponible suficiente.
 *
 * Si algún BIEN:
 *  - No se encuentra en el inventario (catálogo): bloquea.
 *  - No tiene stock registrado en ningún almacén: bloquea con mensaje específico.
 *  - Tiene stock registrado pero insuficiente: bloquea con cantidades.
 *
 * Servicios e ítems libres: nunca bloquean por stock.
 * Si la validación falla, no se modifica nada (sin correlativo, sin estado, sin reserva).
 */
export function validarStockParaOrden(
  items: CartItem[],
  almacenes: Almacen[],
  establecimientoId: string,
): { valido: boolean; error?: string } {
  const productos = useProductStore.getState().allProducts;
  const almacenPrincipal = resolvealmacenForSale({
    almacenes,
    EstablecimientoId: establecimientoId,
  });
  const labelAlmacen = almacenPrincipal?.nombreAlmacen ?? almacenPrincipal?.id ?? 'almacén principal';

  for (const item of items) {
    if (!debeControlarStock(item)) continue;

    // Buscar por SKU/código (item.code = product.codigo, no el ID del producto)
    const producto = productos.find((p) => p.codigo === item.code);

    if (!producto) {
      return {
        valido: false,
        error: `No se puede generar la orden de venta. El producto "${item.name}" no se encontró en el inventario. Solo los ítems del catálogo pueden incluirse en una Orden de Venta con reserva de stock.`,
      };
    }

    // Sin datos de stock registrados en ninguna fuente
    if (!tieneStockDataRegistrado(producto)) {
      return {
        valido: false,
        error: `No se puede generar la orden de venta. El producto "${item.name}" no tiene stock registrado en el almacén "${labelAlmacen}". Configure el stock del producto antes de incluirlo en una Orden de Venta.`,
      };
    }

    // Calcular disponible (real − reservado) usando la misma lógica de Control Stock
    const resumen = summarizeProductStock({
      product: producto,
      almacenes,
      EstablecimientoId: establecimientoId,
    });

    if (resumen.totalAvailable < item.quantity) {
      return {
        valido: false,
        error: `No se puede generar la orden de venta. El producto "${item.name}" no tiene stock disponible suficiente en el almacén "${labelAlmacen}" (disponible: ${resumen.totalAvailable}, solicitado: ${item.quantity}).`,
      };
    }
  }

  return { valido: true };
}

/**
 * Reserva stock para cada bien de la orden después de que la validación pasó.
 * Aumenta stockReservadoPorAlmacen en el producto del catálogo.
 * No modifica el stock real.
 * Retorna el detalle de cada reserva realizada.
 *
 * Solo se llama si validarStockParaOrden retornó { valido: true }.
 */
export function reservarStockOrden(
  items: CartItem[],
  almacenes: Almacen[],
  establecimientoId: string,
): ReservaStockItem[] {
  const store = useProductStore.getState();
  const almacenPrincipal = resolvealmacenForSale({
    almacenes,
    EstablecimientoId: establecimientoId,
  });
  const almacenId = almacenPrincipal?.id ?? establecimientoId ?? 'general';
  const reservas: ReservaStockItem[] = [];

  for (const item of items) {
    if (!debeControlarStock(item)) continue;

    // Buscar por SKU (mismo criterio que la validación)
    const producto = store.allProducts.find((p) => p.codigo === item.code);
    if (!producto) continue; // no debería ocurrir: la validación ya verificó esto

    const reservadoActual = toNum(
      (producto.stockReservadoPorAlmacen ?? {})[almacenId],
    );
    const nuevoReservado = reservadoActual + item.quantity;

    store.updateProduct(producto.id, {
      stockReservadoPorAlmacen: {
        ...(producto.stockReservadoPorAlmacen ?? {}),
        [almacenId]: nuevoReservado,
      },
    });

    reservas.push({
      sku: producto.codigo,
      nombre: item.name,
      cantidad: item.quantity,
      almacenId,
      almacenNombre: almacenPrincipal?.nombreAlmacen,
    });
  }

  return reservas;
}

/**
 * Libera la reserva de stock al anular una Orden de Venta.
 * Disminuye stockReservadoPorAlmacen sin tocar el stock real.
 * Nunca permite stock reservado negativo.
 */
export function liberarReservaOrden(reservas: ReservaStockItem[]): void {
  const store = useProductStore.getState();

  for (const reserva of reservas) {
    const producto = store.allProducts.find((p) => p.codigo === reserva.sku);
    if (!producto) continue;

    const reservadoActual = toNum(
      (producto.stockReservadoPorAlmacen ?? {})[reserva.almacenId],
    );
    const nuevoReservado = Math.max(0, reservadoActual - reserva.cantidad);

    store.updateProduct(producto.id, {
      stockReservadoPorAlmacen: {
        ...(producto.stockReservadoPorAlmacen ?? {}),
        [reserva.almacenId]: nuevoReservado,
      },
    });
  }
}
