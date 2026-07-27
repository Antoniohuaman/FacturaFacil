// gestion-inventario/utils/deteccionValorizacionInicial.ts
//
// Detección del stock positivo existente por producto+almacén y propuesta de costo inicial
// (Etapa 2, §7 del encargo; §24.1 del diseño técnico). Funciones puras — no leen ni escriben
// `localStorage`, reciben los productos/almacenes ya resueltos por el llamador
// (servicios/valorizacionInicial.service.ts).
//
// Jerarquía de propuesta de costo (§7 del encargo): (1) último costo documental real — SOLO si ya
// existe una fuente documental verificable (ninguna existe todavía en el repositorio: Compras↔
// Inventario siguen desacoplados hasta la Etapa 3, ver docs/auditoria-integracion-compras-
// inventario-kardex-valorizado.md); (2) `Product.precioCompra` cuando es finito y > 0; (3) sin
// propuesta. Nunca precio de venta, margen, costo promedio ni costo de otro almacén/empresa.

import type { Product } from '../../catalogo-articulos/models/types';
import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';
import { esProductoInventariable } from '@/shared/inventory/clasificacionInventario';
import type { OrigenPropuestaCosto } from '../models/valorizacionInicialInventario.types';

export interface StockPositivoDetectado {
  productoId: string;
  almacenId: string;
  cantidadDetectada: number;
}

/**
 * Recorre los productos inventariables de la empresa y su `stockPorAlmacen`, devolviendo una fila
 * por cada combinación producto+almacén con cantidad estrictamente positiva. Excluye productos no
 * inventariables (servicios, "OTROS", sin `tipoExistencia`) y cualquier almacén con cantidad ≤ 0 —
 * nunca incluye stock cero o negativo (§6 del encargo).
 */
export function detectarStockPositivoPorProductoAlmacen(
  productos: readonly Product[],
  almacenes: ReadonlyMap<string, Almacen>
): StockPositivoDetectado[] {
  const detectados: StockPositivoDetectado[] = [];
  for (const producto of productos) {
    if (!esProductoInventariable(producto)) continue;
    const stockPorAlmacen = producto.stockPorAlmacen ?? {};
    for (const almacenId of Object.keys(stockPorAlmacen)) {
      if (!almacenes.has(almacenId)) continue;
      const cantidad = stockPorAlmacen[almacenId];
      if (typeof cantidad !== 'number' || !Number.isFinite(cantidad) || cantidad <= 0) continue;
      detectados.push({ productoId: producto.id, almacenId, cantidadDetectada: cantidad });
    }
  }
  return detectados;
}

export interface PropuestaCosto {
  costoPropuesto: number;
  origenPropuesta: OrigenPropuestaCosto;
}

/**
 * Resuelve la propuesta de costo de un producto siguiendo la jerarquía aprobada. `obtenerUltimoCostoDocumental`
 * es un hook opcional para una fuente real y verificable (reservado para cuando Compras↔Inventario
 * se conecten, Etapa 3) — ausente hoy, así que esta etapa cae siempre a `precioCompra`/`sin_propuesta`.
 * Nunca usa precio de venta, margen, costo promedio, ni el costo de otro almacén/empresa como costo
 * oficial.
 */
export function resolverPropuestaCosto(
  producto: Pick<Product, 'precioCompra'>,
  obtenerUltimoCostoDocumental?: () => number | undefined
): PropuestaCosto {
  const ultimoCostoDocumental = obtenerUltimoCostoDocumental?.();
  if (typeof ultimoCostoDocumental === 'number' && Number.isFinite(ultimoCostoDocumental) && ultimoCostoDocumental > 0) {
    return { costoPropuesto: ultimoCostoDocumental, origenPropuesta: 'ultimoCostoDocumental' };
  }
  if (typeof producto.precioCompra === 'number' && Number.isFinite(producto.precioCompra) && producto.precioCompra > 0) {
    return { costoPropuesto: producto.precioCompra, origenPropuesta: 'precioCompra' };
  }
  return { costoPropuesto: 0, origenPropuesta: 'sin_propuesta' };
}
