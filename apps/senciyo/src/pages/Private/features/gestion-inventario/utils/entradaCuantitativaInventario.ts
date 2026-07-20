// gestion-inventario/utils/entradaCuantitativaInventario.ts
//
// Motor central de entradas cuantitativas (Etapa 1C, §5-§12 del encargo). Construye el DTO
// canónico y el hash de idempotencia de una operación de entrada, y calcula — de forma PURA
// respecto de la persistencia — todas las mutaciones del documento completo (todas sus líneas
// juntas: una sola reserva, un solo plan, una sola confirmación, §8 regla fundamental). Nunca lee
// ni escribe `localStorage`: recibe los snapshots ya leídos por el llamador
// (services/servicioKardexValorizado.ts) como cadenas crudas, y devuelve datos nuevos sin
// persistirlos — la única escritura real ocurre después, vía `ejecutarUnidadTrabajoInventario`
// (Etapa 1B).
//
// Solo existe la variante 'cuantitativo' (sin costo, sin capas, sin FIFO) — 'valorizado' está
// reservado para una etapa futura y se rechaza explícitamente en tiempo de ejecución.
//
// Corrección de la revisión final: `calcularMutacionesEntrada` se expone por separado de
// `prepararOperacionInventario` para que `servicioKardexValorizado.ts` pueda ejecutar la MISMA
// validación funcional (producto/almacén/cantidad/stock) ANTES de reservar la operación
// idempotente — una validación fallida nunca debe dejar una reserva 'preparada' huérfana. Ambas
// pasadas (previa y real) llaman a la misma función: nunca se duplica la lógica de cálculo.
//
// Reutiliza `InventoryService.recalcularTotalesStock` (services/inventory.service.ts) para no
// duplicar el cálculo de los campos derivados `cantidad`/`stockPorEstablecimiento` — es la única
// dependencia de este archivo hacia la capa de servicios, y es una función pura (sin I/O).

import type { Product } from '../../catalogo-articulos/models/types';
import { PRODUCT_STORAGE_KEY } from '../../catalogo-articulos/utils/catalogStorage';
import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';
import { lsKey } from '../../../../../shared/tenant';
import type {
  DatosLineaOperacionCuantitativa,
  DatosOperacionEntradaCuantitativa,
} from '../models/operacionEntradaInventario.types';
import type { OperacionIdempotenteInventario, TipoOperacionIdempotenteInventario } from '../models/operacionIdempotenteInventario.types';
import type { PlanUnidadTrabajoInventario } from '../models/planUnidadTrabajoInventario.types';
import type { MovimientoStock, MovimientoTipo, TipoDocumentoOrigenMovimiento } from '../models/inventory.types';
import { esProductoInventariable } from '@/shared/inventory/clasificacionInventario';
import { STORAGE_KEY_MOVEMENTS } from '../repositories/stock.repository';
import { serializarCanonicamente } from './serializacionCanonicaInventario';
import { calcularHashInventario } from './hashInventario';
import { redondearAPrecision, PRECISION_CANTIDAD_UNIDAD_MINIMA } from './precisionInventario';
import { InventoryService } from '../services/inventory.service';
import { ejecutarUnidadTrabajoInventario } from './unidadTrabajoInventario';

/**
 * Orden canónico y determinista de las líneas: el mismo conjunto de líneas en cualquier orden de
 * entrada produce siempre esta misma secuencia. Usado tanto para el hash de idempotencia
 * (`construirDtoCanonicoEntrada`) como para el cálculo real de mutaciones
 * (`calcularMutacionesEntrada`) — la MISMA normalización en ambos sitios es lo que garantiza que
 * `cantidadAnterior`/`cantidadNueva` por línea sean deterministas sin importar el orden accidental
 * de construcción en memoria del llamador.
 */
function ordenarLineasCanonicamente(
  lineas: readonly DatosLineaOperacionCuantitativa[]
): DatosLineaOperacionCuantitativa[] {
  return [...lineas].sort((a, b) => (a.lineaId < b.lineaId ? -1 : a.lineaId > b.lineaId ? 1 : 0));
}

/**
 * Construye el DTO de negocio canónico que se hashea (§7): solo datos que cambian el significado
 * de la operación — incluye `motivo` (un mismo conjunto de líneas con un motivo distinto es una
 * operación distinta) — y excluye IDs de movimientos (todavía no existen), fechas técnicas, y
 * cualquier dato de UI (`observaciones`/`documentoReferencia` son etiquetas de trazabilidad, no
 * cambian el efecto de stock ni la clasificación contable del movimiento).
 */
function construirDtoCanonicoEntrada(datos: DatosOperacionEntradaCuantitativa): Record<string, unknown> {
  const lineas = ordenarLineasCanonicamente(datos.lineas).map((linea) => ({
    lineaId: linea.lineaId,
    productoId: linea.productoId,
    almacenId: linea.almacenId,
    cantidadUnidadMinima: linea.cantidadUnidadMinima,
  }));

  return {
    modoOperacion: datos.modoOperacion,
    empresaId: datos.empresaId,
    documentoId: datos.documentoId,
    tipoDocumento: datos.tipoDocumento,
    tipoOperacion: datos.tipoOperacion,
    motivo: datos.motivo,
    // Normalizados (trim + '' por ausencia): son datos de negocio ya persistidos tal cual en
    // MovimientoStock — cambiarlos bajo la misma clave es una operación distinta, nunca un
    // reintento legítimo. `serializarCanonicamente` rechaza `undefined`, así que la ausencia se
    // representa explícitamente como cadena vacía, nunca se omite el campo.
    observaciones: (datos.observaciones ?? '').trim(),
    documentoReferencia: (datos.documentoReferencia ?? '').trim(),
    lineas,
  };
}

/** Hash de idempotencia de una operación de entrada cuantitativa (§7) — nunca fabricado a mano por el consumidor. */
export function calcularHashEntradaCuantitativa(datos: DatosOperacionEntradaCuantitativa): Promise<string> {
  return calcularHashInventario(serializarCanonicamente(construirDtoCanonicoEntrada(datos)));
}

function tipoMovimientoParaOperacion(tipoOperacion: TipoOperacionIdempotenteInventario): MovimientoTipo {
  switch (tipoOperacion) {
    case 'ni_automatica':
      return 'ENTRADA';
    case 'ajuste_positivo':
      return 'AJUSTE_POSITIVO';
    case 'anulacion':
      return 'AJUSTE_NEGATIVO';
    default:
      throw new Error(
        `entradaCuantitativaInventario: tipoOperacion "${tipoOperacion}" no está soportado por el motor de entradas cuantitativas de Etapa 1C.`
      );
  }
}

/** `-1` para anulación (reversa una entrada previa), `1` para toda entrada real. */
function signoParaTipoOperacion(tipoOperacion: TipoOperacionIdempotenteInventario): 1 | -1 {
  return tipoOperacion === 'anulacion' ? -1 : 1;
}

const TIPOS_DOCUMENTO_ORIGEN_MOVIMIENTO: readonly TipoDocumentoOrigenMovimiento[] = [
  'comprobante_compra', 'nota_ingreso', 'nota_salida', 'ajuste', 'importacion', 'transferencia', 'venta', 'nota_credito', 'migracion',
];

/** `ReferenciaDocumentoTipoOperacionIdempotente` (Etapa 1B) y `TipoDocumentoOrigenMovimiento` (MovimientoStock) son dos enums distintos con miembros solapados — este guard evita un cast al construir `documentoOrigenId`/`tipoDocumentoOrigen`. */
function esTipoDocumentoOrigenMovimiento(valor: string): valor is TipoDocumentoOrigenMovimiento {
  return (TIPOS_DOCUMENTO_ORIGEN_MOVIMIENTO as readonly string[]).includes(valor);
}

/**
 * Validación PURA del contrato (§2 de la corrección final): depende únicamente de `datos`, nunca
 * de un snapshot de productos/movimientos ni de la reserva. Por eso es segura de ejecutar ANTES
 * de reservar (`servicioKardexValorizado.ts`) — a diferencia de la validación funcional
 * (producto/almacén existen, stock resultante), que sí depende del estado externo y por lo tanto
 * puede dar una respuesta distinta según el momento en que se ejecute (p. ej. una operación
 * 'repetida' ya aplicada no debe volver a validarse contra el estado YA mutado). Nunca duplica la
 * comprobación: `calcularMutacionesEntrada` reutiliza esta misma función.
 */
export function validarContrato(datos: DatosOperacionEntradaCuantitativa): void {
  if (datos.modoOperacion !== 'cuantitativo') {
    throw new Error(
      `entradaCuantitativaInventario: modoOperacion "${String(datos.modoOperacion)}" no está soportado — Etapa 1C solo acepta la variante cuantitativa.`
    );
  }
  if (!datos.empresaId.trim()) throw new Error('entradaCuantitativaInventario: empresaId no puede estar vacío.');
  if (!datos.documentoId.trim()) throw new Error('entradaCuantitativaInventario: documentoId no puede estar vacío.');
  if (!datos.claveIdempotencia.trim()) throw new Error('entradaCuantitativaInventario: claveIdempotencia no puede estar vacía.');
  if (!datos.usuario.trim()) throw new Error('entradaCuantitativaInventario: usuario no puede estar vacío.');
  if (!datos.fecha.trim()) throw new Error('entradaCuantitativaInventario: fecha no puede estar vacía.');
  if (datos.lineas.length === 0) {
    throw new Error('entradaCuantitativaInventario: la operación debe tener al menos una línea.');
  }

  const idsVistos = new Set<string>();
  for (const linea of datos.lineas) {
    if (!linea.lineaId.trim()) throw new Error('entradaCuantitativaInventario: lineaId no puede estar vacío.');
    if (idsVistos.has(linea.lineaId)) {
      throw new Error(`entradaCuantitativaInventario: la línea "${linea.lineaId}" está duplicada en la misma operación.`);
    }
    idsVistos.add(linea.lineaId);
    if (!linea.productoId.trim()) throw new Error(`entradaCuantitativaInventario: la línea "${linea.lineaId}" no tiene productoId.`);
    if (!linea.almacenId.trim()) throw new Error(`entradaCuantitativaInventario: la línea "${linea.lineaId}" no tiene almacenId.`);
    if (!Number.isFinite(linea.cantidadUnidadMinima) || linea.cantidadUnidadMinima <= 0) {
      throw new Error(
        `entradaCuantitativaInventario: la línea "${linea.lineaId}" tiene una cantidad inválida (${linea.cantidadUnidadMinima}) — debe ser finita y mayor a cero.`
      );
    }
    const redondeada = redondearAPrecision(linea.cantidadUnidadMinima, PRECISION_CANTIDAD_UNIDAD_MINIMA);
    if (redondeada !== linea.cantidadUnidadMinima) {
      throw new Error(
        `entradaCuantitativaInventario: la línea "${linea.lineaId}" tiene una cantidad (${linea.cantidadUnidadMinima}) con más precisión que la permitida (${PRECISION_CANTIDAD_UNIDAD_MINIMA} decimales).`
      );
    }
  }
}

function validarReservaCoincide(
  datos: DatosOperacionEntradaCuantitativa,
  operacionReservada: OperacionIdempotenteInventario,
  hashEntrada: string
): void {
  if (operacionReservada.empresaId !== datos.empresaId) {
    throw new Error('entradaCuantitativaInventario: la operación reservada pertenece a otra empresa.');
  }
  if (operacionReservada.clave !== datos.claveIdempotencia) {
    throw new Error('entradaCuantitativaInventario: la operación reservada no corresponde a la clave de idempotencia de esta operación.');
  }
  if (operacionReservada.hashEntrada !== hashEntrada) {
    throw new Error('entradaCuantitativaInventario: la operación reservada no corresponde al hash de esta operación.');
  }
  if (operacionReservada.tipoOperacion !== datos.tipoOperacion) {
    throw new Error('entradaCuantitativaInventario: la operación reservada no corresponde al tipo de operación de esta entrada.');
  }
}

function parsearColeccion(raw: string | null, nombreRecurso: string): unknown[] {
  if (raw === null) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`entradaCuantitativaInventario: ${nombreRecurso} no es un arreglo — no se puede interpretar como colección.`);
  }
  return parsed;
}

function esProductoAlmacenable(valor: unknown): valor is Product {
  return typeof valor === 'object' && valor !== null && typeof (valor as { id?: unknown }).id === 'string';
}

export interface ResultadoMutacionesEntrada {
  movimientosGenerados: MovimientoStock[];
  /** Solo los productos tocados por esta operación, ya con `recalcularTotalesStock` aplicado. */
  productosActualizados: Product[];
  /** Colección completa de productos, con las actualizaciones ya fusionadas — lista para serializar. */
  productosFinales: Product[];
  /** Colección completa de movimientos (anteriores + nuevos) — lista para serializar. */
  movimientosFinales: unknown[];
  claveProductos: string;
  claveMovimientos: string;
}

/**
 * Cálculo puro y completo de un documento de entrada cuantitativa (§8): valida el contrato,
 * valida que cada línea referencie un producto y un almacén reales, calcula todas las mutaciones
 * en memoria consolidando líneas repetidas del mismo producto+almacén de forma secuencial (en el
 * orden canónico, no en el orden de entrada), y devuelve las colecciones finales listas para
 * escribir. Nunca toca `localStorage`. No depende de que exista una reserva — se puede invocar
 * ANTES de reservar (validación temprana) y de nuevo antes de confirmar (con el snapshot más
 * reciente), sin duplicar la lógica de cálculo.
 */
export function calcularMutacionesEntrada(
  datos: DatosOperacionEntradaCuantitativa,
  productosRaw: string | null,
  movimientosRaw: string | null,
  almacenes: ReadonlyMap<string, Almacen>,
  generarId: () => string
): ResultadoMutacionesEntrada {
  validarContrato(datos);

  if (!esTipoDocumentoOrigenMovimiento(datos.tipoDocumento)) {
    throw new Error(`entradaCuantitativaInventario: tipoDocumento "${datos.tipoDocumento}" no es válido como origen de un movimiento de stock.`);
  }
  const tipoDocumentoOrigen = datos.tipoDocumento;

  const claveProductos = lsKey(PRODUCT_STORAGE_KEY, datos.empresaId);
  const claveMovimientos = lsKey(STORAGE_KEY_MOVEMENTS, datos.empresaId);

  const productosCrudos = parsearColeccion(productosRaw, `la colección de productos ("${claveProductos}")`);
  const productos: Product[] = [];
  productosCrudos.forEach((elemento, indice) => {
    if (!esProductoAlmacenable(elemento)) {
      throw new Error(`entradaCuantitativaInventario: el elemento en el índice ${indice} de "${claveProductos}" no tiene la forma esperada de un producto.`);
    }
    productos.push(elemento);
  });
  const productosPorId = new Map(productos.map((producto) => [producto.id, producto] as const));

  const movimientosAnteriores = parsearColeccion(movimientosRaw, `la colección de movimientos ("${claveMovimientos}")`);

  const signo = signoParaTipoOperacion(datos.tipoOperacion);
  const tipoMovimiento = tipoMovimientoParaOperacion(datos.tipoOperacion);
  const fechaOperacion = new Date(datos.fecha);

  const stockTrabajo = new Map<string, number>(); // clave: `${productoId}:${almacenId}`
  const productosTocadosIds: string[] = [];
  const movimientosGenerados: MovimientoStock[] = [];

  for (const linea of ordenarLineasCanonicamente(datos.lineas)) {
    const producto = productosPorId.get(linea.productoId);
    if (!producto) {
      throw new Error(`entradaCuantitativaInventario: la línea "${linea.lineaId}" referencia un producto ("${linea.productoId}") que no existe en el catálogo.`);
    }
    const almacen = almacenes.get(linea.almacenId);
    if (!almacen) {
      throw new Error(`entradaCuantitativaInventario: la línea "${linea.lineaId}" referencia un almacén ("${linea.almacenId}") que no existe.`);
    }

    // Defensa del motor central: un ajuste positivo nunca puede afectar un producto no
    // controlado por stock, sin importar si el consumidor (p. ej. un llamador directo del
    // servicio que evada el filtro de NI) ya debió filtrarlo. La anulación NO pasa por aquí —
    // revierte por movimientos históricos reales, nunca por la clasificación vigente (§1).
    if (datos.tipoOperacion === 'ajuste_positivo' && !esProductoInventariable(producto)) {
      throw new Error(
        `entradaCuantitativaInventario: el producto "${producto.nombre}" no está controlado por stock (tipoExistencia no inventariable) — un ajuste positivo no puede afectarlo.`
      );
    }

    const claveStock = `${linea.productoId}:${linea.almacenId}`;
    const cantidadAnterior = stockTrabajo.has(claveStock)
      ? (stockTrabajo.get(claveStock) as number)
      : (producto.stockPorAlmacen?.[linea.almacenId] ?? 0);
    const cantidadNueva = redondearAPrecision(cantidadAnterior + signo * linea.cantidadUnidadMinima, PRECISION_CANTIDAD_UNIDAD_MINIMA);

    if (cantidadNueva < 0) {
      throw new Error(
        `entradaCuantitativaInventario: la línea "${linea.lineaId}" dejaría el stock de "${producto.nombre}" en "${almacen.nombreAlmacen}" en ${cantidadNueva} (negativo) — operación rechazada completa.`
      );
    }

    stockTrabajo.set(claveStock, cantidadNueva);
    if (!productosTocadosIds.includes(linea.productoId)) {
      productosTocadosIds.push(linea.productoId);
    }

    movimientosGenerados.push({
      id: generarId(),
      productoId: producto.id,
      productoCodigo: producto.codigo,
      productoNombre: producto.nombre,
      tipo: tipoMovimiento,
      motivo: datos.motivo,
      cantidad: linea.cantidadUnidadMinima,
      cantidadAnterior,
      cantidadNueva,
      usuario: datos.usuario,
      observaciones: datos.observaciones,
      documentoReferencia: datos.documentoReferencia,
      fecha: fechaOperacion,
      almacenId: almacen.id,
      almacenCodigo: almacen.codigoAlmacen,
      almacenNombre: almacen.nombreAlmacen,
      EstablecimientoId: almacen.establecimientoId,
      EstablecimientoCodigo: almacen.codigoEstablecimientoDesnormalizado || '',
      EstablecimientoNombre: almacen.nombreEstablecimientoDesnormalizado || '',
      esTransferencia: false,
      empresaId: datos.empresaId,
      documentoOrigenId: datos.documentoId,
      tipoDocumentoOrigen,
      lineaOrigenId: linea.lineaId,
      estado: 'confirmado',
      claveIdempotencia: datos.claveIdempotencia,
    });
  }

  const almacenesArray = Array.from(almacenes.values());
  const productosActualizados: Product[] = productosTocadosIds.map((productoId) => {
    const producto = productosPorId.get(productoId) as Product;
    const stockPorAlmacenActualizado = { ...(producto.stockPorAlmacen ?? {}) };
    stockTrabajo.forEach((cantidad, clave) => {
      const separadorIndice = clave.indexOf(':');
      const pid = clave.slice(0, separadorIndice);
      const almacenId = clave.slice(separadorIndice + 1);
      if (pid === productoId) {
        stockPorAlmacenActualizado[almacenId] = cantidad;
      }
    });
    const productoConStockNuevo: Product = {
      ...producto,
      stockPorAlmacen: stockPorAlmacenActualizado,
      fechaActualizacion: fechaOperacion,
    };
    return InventoryService.recalcularTotalesStock(productoConStockNuevo, almacenesArray);
  });

  const productosActualizadosPorId = new Map(productosActualizados.map((producto) => [producto.id, producto] as const));
  const productosFinales = productos.map((producto) => productosActualizadosPorId.get(producto.id) ?? producto);

  return {
    movimientosGenerados,
    productosActualizados,
    productosFinales,
    movimientosFinales: [...movimientosAnteriores, ...movimientosGenerados],
    claveProductos,
    claveMovimientos,
  };
}

export interface ParametrosPrepararOperacionEntradaCuantitativa {
  datos: DatosOperacionEntradaCuantitativa;
  operacionReservada: OperacionIdempotenteInventario;
  hashEntrada: string;
  versionEsperada: number;
  productosRaw: string | null;
  movimientosRaw: string | null;
  almacenes: ReadonlyMap<string, Almacen>;
  generarId: () => string;
}

export interface ResultadoPreparacionOperacionEntrada {
  plan: PlanUnidadTrabajoInventario;
  movimientosGenerados: MovimientoStock[];
  productosActualizados: Product[];
}

/**
 * Preparación pura del documento completo (§8): valida que la reserva recibida corresponda a esta
 * operación, calcula todas las mutaciones (`calcularMutacionesEntrada`) y construye el plan exacto
 * para la unidad de trabajo de Etapa 1B. Nunca toca `localStorage` — todos los snapshots llegan ya
 * leídos como parámetros.
 */
export function prepararOperacionInventario(
  params: ParametrosPrepararOperacionEntradaCuantitativa
): ResultadoPreparacionOperacionEntrada {
  const { datos, operacionReservada, hashEntrada, versionEsperada, productosRaw, movimientosRaw, almacenes, generarId } = params;

  validarReservaCoincide(datos, operacionReservada, hashEntrada);

  const { movimientosGenerados, productosActualizados, productosFinales, movimientosFinales, claveProductos, claveMovimientos } =
    calcularMutacionesEntrada(datos, productosRaw, movimientosRaw, almacenes, generarId);

  const plan: PlanUnidadTrabajoInventario = {
    id: generarId(),
    empresaId: datos.empresaId,
    operacionIdempotenteId: operacionReservada.id,
    claveIdempotencia: datos.claveIdempotencia,
    tipoOperacion: datos.tipoOperacion,
    hashEntrada,
    versionEsperada,
    escrituras: [
      {
        clave: claveProductos,
        valorAnterior: productosRaw,
        valorPropuesto: JSON.stringify(productosFinales),
      },
      {
        clave: claveMovimientos,
        valorAnterior: movimientosRaw,
        valorPropuesto: JSON.stringify(movimientosFinales),
      },
    ],
    resultadoIds: movimientosGenerados.map((movimiento) => movimiento.id),
    usuario: datos.usuario,
  };

  return { plan, movimientosGenerados, productosActualizados };
}

export interface ResultadoConfirmacionOperacionEntrada {
  documentoId: string;
  resultadoIds: string[];
  transaccionId: string;
}

/**
 * Capa delgada sobre `ejecutarUnidadTrabajoInventario` (§12): no recalcula movimientos, no relee
 * catálogo, no genera nuevos IDs ni un hash nuevo, no vuelve a decidir qué líneas afectan
 * inventario, no escribe mediante `StockRepository` por fuera del plan. Solo ejecuta el plan ya
 * calculado y reformatea el resultado con el `documentoId` de origen.
 */
export async function confirmarOperacionInventario(
  documentoId: string,
  plan: PlanUnidadTrabajoInventario,
  fechaActual: () => string
): Promise<ResultadoConfirmacionOperacionEntrada> {
  const resultado = await ejecutarUnidadTrabajoInventario({ plan, fechaActual });
  return {
    documentoId,
    resultadoIds: resultado.resultadoIds,
    transaccionId: resultado.transaccionId,
  };
}
