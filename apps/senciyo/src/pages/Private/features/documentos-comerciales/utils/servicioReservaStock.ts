import type { CartItem } from '../models/documentoComercial.types';
import type { ReservaStockItem } from '../models/documentoComercial.types';
import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';
import { useProductStore } from '../../catalogo-articulos/hooks/useProductStore';
import { InventoryService } from '../../gestion-inventario/services/inventory.service';
import {
  summarizeProductStock,
  resolvealmacenesForSaleFIFO,
  allocateSaleAcrossalmacenes,
  calculateRequiredUnidadMinima,
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
 * Consolida los ítems de un documento en cantidades por SKU en unidad mínima.
 * Solo incluye bienes de catálogo que requieran control de stock.
 * En modo 'validar' retorna error ante producto ausente o sin datos de stock;
 * en modo 'reservar' omite silenciosamente esos ítems.
 */
function prepararCantidadesReservaOV(
  items: CartItem[],
  modo: 'validar' | 'reservar',
): { cantidades: Map<string, { nombre: string; qtyEnUnidadMinima: number }>; error?: string } {
  const productos = useProductStore.getState().allProducts;
  const cantidades = new Map<string, { nombre: string; qtyEnUnidadMinima: number }>();

  for (const item of items) {
    if (!debeControlarStock(item)) continue;

    const producto = productos.find((p) => p.codigo === item.code);
    if (!producto) {
      if (modo === 'validar') {
        return {
          cantidades,
          error: `No se puede generar la orden de venta. El producto "${item.name}" no se encontró en el inventario. Solo los ítems del catálogo pueden incluirse en una Orden de Venta con reserva de stock.`,
        };
      }
      continue;
    }

    if (modo === 'validar' && !tieneStockDataRegistrado(producto)) {
      return {
        cantidades,
        error: `No se puede generar la orden de venta. El producto "${item.name}" no tiene stock registrado. Configure el stock del producto antes de incluirlo en una Orden de Venta.`,
      };
    }

    const qtyEnUnidadMinima = calculateRequiredUnidadMinima({
      product: producto,
      quantity: item.quantity,
      unitCode: item.presentacionId || item.unidadMedida || item.unit,
    });
    if (qtyEnUnidadMinima <= 0) continue;

    const existente = cantidades.get(item.code);
    if (existente) {
      existente.qtyEnUnidadMinima += qtyEnUnidadMinima;
    } else {
      cantidades.set(item.code, { nombre: item.name, qtyEnUnidadMinima });
    }
  }

  return { cantidades };
}

/**
 * Valida que todos los bienes de la orden tengan stock disponible suficiente.
 * Usa summarizeProductStock().totalAvailable que ya incluye la reserva global de OVs
 * (stockReservadoOVPorEstablecimiento) además de stockReservadoPorAlmacen.
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
  const { cantidades, error } = prepararCantidadesReservaOV(items, 'validar');
  if (error) return { valido: false, error };

  const productos = useProductStore.getState().allProducts;
  for (const [sku, { nombre, qtyEnUnidadMinima }] of cantidades) {
    const producto = productos.find((p) => p.codigo === sku);
    if (!producto) continue;

    const resumen = summarizeProductStock({
      product: producto,
      almacenes,
      EstablecimientoId: establecimientoId,
    });
    if (resumen.totalAvailable < qtyEnUnidadMinima) {
      return {
        valido: false,
        error: `No se puede generar la orden de venta. El producto "${nombre}" no tiene stock disponible suficiente (disponible: ${resumen.totalAvailable}, solicitado: ${qtyEnUnidadMinima}).`,
      };
    }
  }

  return { valido: true };
}

/**
 * Reserva stock GLOBALMENTE para cada bien de la orden después de que la validación pasó.
 * Incrementa stockReservadoOVPorEstablecimiento en el producto del catálogo (NO por almacén).
 * No ejecuta FIFO. No modifica el stock real.
 * Consolida ítems duplicados del mismo SKU.
 * Retorna el detalle de cada reserva realizada con establecimientoId pero SIN almacenId.
 *
 * INVARIANTE: disponible = real - (stockReservadoPorAlmacen total) - (stockReservadoOVPorEstablecimiento)
 * El stock disponible disminuye al crear la OV y NO vuelve a disminuir al despachar.
 *
 * Solo se llama si validarStockParaOrden retornó { valido: true }.
 */
export function reservarStockOrden(
  items: CartItem[],
  _almacenes: Almacen[],
  establecimientoId: string,
): ReservaStockItem[] {
  const { cantidades } = prepararCantidadesReservaOV(items, 'reservar');

  const reservas: ReservaStockItem[] = [];

  for (const [sku, { nombre, qtyEnUnidadMinima: cantidad }] of cantidades) {
    // Leer estado fresco para no pisar actualizaciones previas en el mismo lote
    const productoCurrent = useProductStore.getState().allProducts.find((p) => p.codigo === sku);
    if (!productoCurrent) continue;

    const reservadoActual = toNum(
      (productoCurrent.stockReservadoOVPorEstablecimiento ?? {})[establecimientoId],
    );

    useProductStore.getState().updateProduct(productoCurrent.id, {
      stockReservadoOVPorEstablecimiento: {
        ...(productoCurrent.stockReservadoOVPorEstablecimiento ?? {}),
        [establecimientoId]: reservadoActual + cantidad,
      },
    });

    reservas.push({
      sku,
      nombre,
      cantidad,
      establecimientoId,
      // almacenId intencionalmente ausente — reserva global, no por almacén
    });
  }

  return reservas;
}

/**
 * Descuenta stock real para documentos comerciales en modo automático (ej: Nota de Venta).
 * Usa FIFO para determinar qué almacén descontar.
 * Decrece stockPorAlmacen, recalcula stockPorEstablecimiento/cantidad y genera movimiento
 * Kardex de salida cuando se proporcionan documentoReferencia y usuario.
 * No toca stockReservadoPorAlmacen.
 * Retorna el detalle de lo descontado para poder revertirlo al anular el documento.
 *
 * Solo se llama si validarStockParaOrden retornó { valido: true }.
 */
export function descontarStockParaDocumento(
  items: CartItem[],
  almacenes: Almacen[],
  establecimientoId: string,
  documentoReferencia?: string,
  usuario?: string,
): ReservaStockItem[] {
  const almacenesOrdered = resolvealmacenesForSaleFIFO({
    almacenes,
    EstablecimientoId: establecimientoId,
  });
  const almacenMap = new Map(almacenesOrdered.map((a) => [a.id, a]));
  const descuentos: ReservaStockItem[] = [];

  for (const item of items) {
    if (!debeControlarStock(item)) continue;

    const producto = useProductStore.getState().allProducts.find((p) => p.codigo === item.code);
    if (!producto) continue;

    const qtyEnUnidadMinima = calculateRequiredUnidadMinima({
      product: producto,
      quantity: item.quantity,
      unitCode: item.presentacionId || item.unidadMedida || item.unit,
    });
    const allocations = allocateSaleAcrossalmacenes({
      product: producto,
      almacenesOrdered,
      qtyUnidadMinima: qtyEnUnidadMinima,
      respectReservations: true,
    });

    for (const alloc of allocations) {
      // Leer estado fresco antes de cada actualización para no pisar descuentos anteriores
      const productoCurrent =
        useProductStore.getState().allProducts.find((p) => p.codigo === item.code) ?? producto;
      const almacenObj = almacenMap.get(alloc.almacenId);

      if (!almacenObj) {
        throw new Error(
          `No se encontró el almacén "${alloc.almacenId}" al descontar stock para el documento.`,
        );
      }
      if (!documentoReferencia) {
        throw new Error(
          'Se requiere el número de documento para registrar el movimiento de inventario.',
        );
      }
      if (!usuario) {
        throw new Error(
          'Se requiere el usuario para registrar el movimiento de inventario.',
        );
      }
      const { product: productoActualizado } = InventoryService.registerAdjustment(
        productoCurrent,
        almacenObj,
        {
          productoId: productoCurrent.id,
          almacenId: alloc.almacenId,
          tipo: 'SALIDA',
          motivo: 'VENTA',
          cantidad: alloc.qtyUnidadMinima,
          observaciones: `Nota de Venta ${documentoReferencia}`,
          documentoReferencia,
        },
        usuario,
      );
      const productoConTotales = InventoryService.recalcularTotalesStock(productoActualizado, almacenes);
      useProductStore.getState().updateProduct(productoCurrent.id, productoConTotales);

      descuentos.push({
        sku: producto.codigo,
        nombre: item.name,
        cantidad: alloc.qtyUnidadMinima,
        almacenId: alloc.almacenId,
        almacenNombre: almacenMap.get(alloc.almacenId)?.nombreAlmacen,
      });
    }
  }

  return descuentos;
}

/**
 * Revierte un descuento de stock realizado por descontarStockParaDocumento.
 * Incrementa stockPorAlmacen de vuelta a su valor anterior.
 * Genera movimiento Kardex inverso de AJUSTE_POSITIVO cuando se proporcionan
 * almacenes, documentoReferencia y usuario.
 * Se llama al anular un documento comercial con modoDescuentoStock 'automatico'.
 */
export function revertirDescuentoStockDocumento(
  descuentos: ReservaStockItem[],
  almacenes?: Almacen[],
  documentoReferencia?: string,
  usuario?: string,
): void {
  for (const descuento of descuentos) {
    const producto = useProductStore.getState().allProducts.find((p) => p.codigo === descuento.sku);
    if (!producto) continue;

    const almacenObj = descuento.almacenId ? almacenes?.find((a) => a.id === descuento.almacenId) : undefined;

    if (almacenObj && descuento.almacenId && documentoReferencia && usuario) {
      // Usar registerAdjustment: repone stock + registra movimiento Kardex inverso
      const { product: productoActualizado } = InventoryService.registerAdjustment(
        producto,
        almacenObj,
        {
          productoId: producto.id,
          almacenId: descuento.almacenId,
          tipo: 'AJUSTE_POSITIVO',
          motivo: 'VENTA',
          cantidad: descuento.cantidad,
          observaciones: `Anulación Nota de Venta ${documentoReferencia}`,
          documentoReferencia,
        },
        usuario,
      );
      // Recalcular stockPorEstablecimiento y cantidad
      const productoConTotales = InventoryService.recalcularTotalesStock(productoActualizado, almacenes ?? []);
      useProductStore.getState().updateProduct(producto.id, productoConTotales);
    } else if (descuento.almacenId) {
      // Sin parámetros de Kardex: solo actualizar stockPorAlmacen directamente
      const stockActual = toNum((producto.stockPorAlmacen ?? {})[descuento.almacenId]);
      useProductStore.getState().updateProduct(producto.id, {
        stockPorAlmacen: {
          ...(producto.stockPorAlmacen ?? {}),
          [descuento.almacenId]: stockActual + descuento.cantidad,
        },
      });
    }
  }
}

/**
 * Libera la reserva global de stock al anular una Orden de Venta.
 * Maneja tanto reservas nuevas (con establecimientoId) como reservas legacy (con almacenId).
 * - Nueva: decrementa stockReservadoOVPorEstablecimiento[establecimientoId].
 * - Legacy (almacenId): decrementa stockReservadoPorAlmacen[almacenId].
 * Nunca permite stock reservado negativo.
 */
export function liberarReservaOrden(reservas: ReservaStockItem[]): void {
  for (const reserva of reservas) {
    const producto = useProductStore.getState().allProducts.find((p) => p.codigo === reserva.sku);
    if (!producto) continue;

    if (reserva.establecimientoId) {
      // Nueva reserva global por establecimiento
      const reservadoActual = toNum(
        (producto.stockReservadoOVPorEstablecimiento ?? {})[reserva.establecimientoId],
      );
      const nuevoReservado = Math.max(0, reservadoActual - reserva.cantidad);
      useProductStore.getState().updateProduct(producto.id, {
        stockReservadoOVPorEstablecimiento: {
          ...(producto.stockReservadoOVPorEstablecimiento ?? {}),
          [reserva.establecimientoId]: nuevoReservado,
        },
      });
    } else if (reserva.almacenId) {
      // Reserva legacy por almacén (compatibilidad con OVs creadas antes de esta versión)
      const reservadoActual = toNum(
        (producto.stockReservadoPorAlmacen ?? {})[reserva.almacenId],
      );
      const nuevoReservado = Math.max(0, reservadoActual - reserva.cantidad);
      useProductStore.getState().updateProduct(producto.id, {
        stockReservadoPorAlmacen: {
          ...(producto.stockReservadoPorAlmacen ?? {}),
          [reserva.almacenId]: nuevoReservado,
        },
      });
    }
  }
}
