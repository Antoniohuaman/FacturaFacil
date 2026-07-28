// gestion-inventario/services/consultaKardexValorizado.service.ts
//
// Etapa 5: proyección de LECTURA del Kardex valorizado. Responsabilidad única — unir
// MovimientoStock + CapaCostoInventario + ConsumoCapaCostoInventario (ya persistidos por los
// motores de escritura cerrados en Etapas 1-4B) en filas denormalizadas de costo, y calcular el
// valor de stock vigente por producto+almacén. NUNCA escribe, NUNCA crea capas/consumos, NUNCA
// recalcula FIFO — solo lee los vínculos ya confirmados (`movimientoEntradaId`, `movimientoSalidaId`,
// `capaId`, `documentoOrigenId`) y los proyecta. Reutilizable por la tabla de Movimientos, el modal
// de detalle, Stock Actual y la exportación Excel — una única función, nunca un cálculo duplicado
// por consumidor.
//
// Fuente de verdad exclusiva: los propios registros de CapaCostoInventario/ConsumoCapaCostoInventario
// (costoUnitarioBaseMonedaBase / valorConsumidoMonedaBase ya congelados en el momento de la
// operación original) — nunca Product.precioCompra, precio de venta, costo promedio ni un valor
// estimado en esta capa de lectura.

import type { MovimientoStock } from '../models/inventory.types';
import type { CapaCostoInventario, TipoDocumentoOrigenCapa } from '../models/capaCostoInventario.types';
import type { ConsumoCapaCostoInventario } from '../models/consumoCapaCostoInventario.types';
import { listarCapasCostoInventarioPorEmpresa } from '../repositories/capaCostoInventario.repository';
import { listarConsumosCapaCostoInventarioPorEmpresa } from '../repositories/consumoCapaCostoInventario.repository';

/** Un origen de costo consumido por una salida (o el leg de salida de una transferencia) — nunca expone `capaId`/`consumoId` técnicos. */
export interface OrigenCostoMovimiento {
  documentoOrigenId: string;
  tipoDocumentoOrigen: TipoDocumentoOrigenCapa;
  fecha: string;
  cantidad: number;
  costoUnitario: number;
  valor: number;
}

/** Fila valorizada de un único MovimientoStock — nunca incluye capaId/consumoId/movimientoEntradaId como dato mostrable. */
export interface FilaKardexValorizado {
  movimientoId: string;
  productoId: string;
  almacenId: string;
  tipo: MovimientoStock['tipo'];
  /** Cantidad sin signo, igual que `MovimientoStock.cantidad` — la dirección la determina `valorMovimiento`. */
  cantidad: number;
  /** `undefined` cuando el movimiento no tiene valorización histórica registrada — nunca 0 inventado. */
  costoUnitario: number | undefined;
  /** Con dirección: positivo en entradas (y en el leg destino de una transferencia), negativo en salidas (y en el leg origen de una transferencia). */
  valorMovimiento: number | undefined;
  monedaBase: string | undefined;
  tieneValorizacion: boolean;
  estadoMovimiento: 'confirmado' | 'revertido';
  /** Detalle de orígenes consumidos — solo poblado para movimientos de salida con consumos reales; vacío en entradas y en movimientos sin valorización. */
  origenes: OrigenCostoMovimiento[];
}

export interface ParametrosProyeccionKardexValorizado {
  empresaId: string;
  movimientos: readonly MovimientoStock[];
}

/**
 * Agrupa una colección por una clave derivada — construida UNA sola vez por invocación (§7 del
 * encargo: nunca `find`/filter repetido por fila).
 */
function agruparPor<T>(items: readonly T[], obtenerClave: (item: T) => string): Map<string, T[]> {
  const mapa = new Map<string, T[]>();
  for (const item of items) {
    const clave = obtenerClave(item);
    const lista = mapa.get(clave);
    if (lista) {
      lista.push(item);
    } else {
      mapa.set(clave, [item]);
    }
  }
  return mapa;
}

function construirOrigenes(consumos: readonly ConsumoCapaCostoInventario[], capasPorId: ReadonlyMap<string, CapaCostoInventario>): OrigenCostoMovimiento[] {
  return consumos.map((consumo) => {
    const capa = capasPorId.get(consumo.capaId);
    return {
      documentoOrigenId: capa?.documentoOrigenId ?? consumo.capaId,
      tipoDocumentoOrigen: capa?.tipoDocumentoOrigen ?? 'ajuste',
      fecha: capa?.fechaEntrada ?? consumo.fecha,
      cantidad: consumo.cantidadConsumida,
      costoUnitario: consumo.costoUnitarioBaseMonedaBase,
      valor: consumo.valorConsumidoMonedaBase,
    };
  });
}

/**
 * Proyecta la fila valorizada de cada `MovimientoStock` recibido. Lee las colecciones de capas y
 * consumos UNA sola vez (nunca por fila) y las agrupa por `movimientoEntradaId`/`movimientoSalidaId`
 * antes de recorrer `movimientos` — O(capas + consumos + movimientos), nunca O(n²).
 *
 * Regla de clasificación (§5 del encargo): un movimiento es "entrada" si existe al menos una
 * `CapaCostoInventario` con `movimientoEntradaId === movimiento.id` (su propio costo = suma de
 * `cantidadInicial × costoUnitarioBaseMonedaBase` de esas capas); es "salida" si existen
 * `ConsumoCapaCostoInventario` con `movimientoSalidaId === movimiento.id` (su costo = suma de
 * `valorConsumidoMonedaBase`). Esta regla es la MISMA para ambos legs de una transferencia (el leg
 * origen consume capas como cualquier salida; el leg destino crea una capa como cualquier entrada)
 * — nunca requiere una rama especial para `tipo:'TRANSFERENCIA'`, y por construcción del motor de
 * transferencias (Etapa 1E) ambos legs conservan la misma magnitud valorizada con dirección
 * opuesta. Un movimiento revertido conserva sus propios consumos/capas (el motor de reversos muta
 * el `estado` en el mismo registro, nunca crea uno paralelo) — por eso su valor histórico se
 * proyecta igual, nunca recalculado contra el inventario presente.
 */
export function proyectarKardexValorizado(
  params: ParametrosProyeccionKardexValorizado
): Map<string, FilaKardexValorizado> {
  const { empresaId, movimientos } = params;

  const capas = listarCapasCostoInventarioPorEmpresa(empresaId);
  const consumos = listarConsumosCapaCostoInventarioPorEmpresa(empresaId);

  const capasPorMovimientoEntradaId = agruparPor(capas, (capa) => capa.movimientoEntradaId);
  const consumosPorMovimientoSalidaId = agruparPor(consumos, (consumo) => consumo.movimientoSalidaId);
  const capasPorId = new Map(capas.map((capa) => [capa.id, capa] as const));

  const filas = new Map<string, FilaKardexValorizado>();

  for (const movimiento of movimientos) {
    const capasDeEntrada = capasPorMovimientoEntradaId.get(movimiento.id);
    const consumosDeSalida = consumosPorMovimientoSalidaId.get(movimiento.id);

    let costoUnitario: number | undefined;
    let valorMovimiento: number | undefined;
    let monedaBase: string | undefined;
    let origenes: OrigenCostoMovimiento[] = [];
    let tieneValorizacion = false;

    if (capasDeEntrada && capasDeEntrada.length > 0) {
      tieneValorizacion = true;
      const valorTotal = capasDeEntrada.reduce(
        (suma, capa) => suma + capa.cantidadInicial * capa.costoUnitarioBaseMonedaBase,
        0
      );
      valorMovimiento = valorTotal;
      costoUnitario = movimiento.cantidad > 0 ? valorTotal / movimiento.cantidad : undefined;
      monedaBase = capasDeEntrada[0].monedaBase;
    } else if (consumosDeSalida && consumosDeSalida.length > 0) {
      tieneValorizacion = true;
      const valorTotal = consumosDeSalida.reduce((suma, consumo) => suma + consumo.valorConsumidoMonedaBase, 0);
      valorMovimiento = -valorTotal;
      costoUnitario = movimiento.cantidad > 0 ? valorTotal / movimiento.cantidad : undefined;
      monedaBase = consumosDeSalida[0].monedaBase;
      origenes = construirOrigenes(consumosDeSalida, capasPorId);
    }

    filas.set(movimiento.id, {
      movimientoId: movimiento.id,
      productoId: movimiento.productoId,
      almacenId: movimiento.almacenId,
      tipo: movimiento.tipo,
      cantidad: movimiento.cantidad,
      costoUnitario,
      valorMovimiento,
      monedaBase,
      tieneValorizacion,
      estadoMovimiento: movimiento.estado ?? 'confirmado',
      origenes,
    });
  }

  return filas;
}

/** Valor de stock vigente (nunca precio de venta, nunca costo promedio) de un producto+almacén. */
export interface ValorStockProductoAlmacen {
  productoId: string;
  almacenId: string;
  valorStock: number;
  monedaBase: string;
}

/**
 * Suma `cantidadDisponible × costoUnitarioBaseMonedaBase` de las capas VIGENTES (excluye
 * `estado:'revertida'` y capas ya agotadas) agrupadas por producto+almacén — una sola lectura de
 * la colección de capas, resultado indexable en O(1) por clave `productoId:almacenId` mediante
 * `claveValorStock`. Nunca usa `Product.precioCompra` ni precio de venta.
 */
export function calcularValorStockPorProductoAlmacen(empresaId: string): Map<string, ValorStockProductoAlmacen> {
  const capas = listarCapasCostoInventarioPorEmpresa(empresaId);
  const acumulado = new Map<string, ValorStockProductoAlmacen>();

  for (const capa of capas) {
    if (capa.estado === 'revertida' || capa.cantidadDisponible <= 0) {
      continue;
    }
    const clave = claveValorStock(capa.productoId, capa.almacenId);
    const valorCapa = capa.cantidadDisponible * capa.costoUnitarioBaseMonedaBase;
    const existente = acumulado.get(clave);
    if (existente) {
      existente.valorStock += valorCapa;
    } else {
      acumulado.set(clave, {
        productoId: capa.productoId,
        almacenId: capa.almacenId,
        valorStock: valorCapa,
        monedaBase: capa.monedaBase,
      });
    }
  }

  return acumulado;
}

export function claveValorStock(productoId: string, almacenId: string): string {
  return `${productoId}:${almacenId}`;
}

/** Suma el valor de stock de un producto sobre un conjunto de almacenes (el alcance actualmente mostrado) — O(almacenIds), nunca una búsqueda sobre todas las capas. */
export function obtenerValorStockProducto(
  valoresPorProductoAlmacen: ReadonlyMap<string, ValorStockProductoAlmacen>,
  productoId: string,
  almacenIds: readonly string[]
): number {
  let total = 0;
  for (const almacenId of almacenIds) {
    const entrada = valoresPorProductoAlmacen.get(claveValorStock(productoId, almacenId));
    if (entrada) {
      total += entrada.valorStock;
    }
  }
  return total;
}
