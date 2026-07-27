// gestion-inventario/utils/importacionCuantitativaInventario.ts
//
// Motor de IMPORTACIÓN de stock desde archivo (Etapa 2, cierre de bloqueante 2 de la revisión).
// Reutiliza exactamente la misma cadena aprobada de entrada/salida/transferencia (validar → hash →
// reservar → preparar → confirmar, vía `ServicioKardexValorizado.importarStockValorizado` →
// `ejecutarOperacionInventario`) — este archivo solo aporta lo específico de una importación: cada
// línea trae su propia `diferencia` firmada (mixta entrada+salida en el MISMO lote), nunca un signo
// único para todo el documento como entrada/salida.
//
// Reutiliza `calcularMutacionesCuantitativas` (operacionCuantitativaInventarioComun.ts) DOS veces
// como mucho — una para las líneas con diferencia positiva (signo=1, ENTRADA) y otra para las
// negativas (signo=-1, SALIDA) — nunca una tercera vez, nunca reimplementa la consolidación de
// stock. Es seguro encadenarlas (la segunda recibe como "productosRaw" el resultado YA actualizado
// de la primera) porque cada fila del archivo pertenece a EXACTAMENTE un producto+almacén (el
// parseo ya deduplica códigos) — entrada y salida nunca compiten por la misma clave producto+almacén
// dentro del mismo lote. El resultado de ambas pasadas se funde en UN solo
// `PlanUnidadTrabajoInventario` — una sola escritura de productos, una sola de movimientos, una sola
// confirmación (nunca una por dirección).
//
// Etapa 4A (cierre): en modo valorizado, la línea de ENTRADA (diferencia>0) crea su
// `CapaCostoInventario` reutilizando `entradaCuantitativaInventario.ts` (`validarContrato` exige
// costo por línea; `construirCapasEntradaValorizada` construye la capa) y la línea de SALIDA
// (diferencia<0) consume capas FIFO existentes reutilizando `salidaCuantitativaInventario.ts`
// (`construirConsumosSalidaValorizada`) — ningún algoritmo se reimplementa aquí. Ambas colecciones
// de capas/consumos se funden en el MISMO plan que productos/movimientos.

import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';
import type { Product } from '../../catalogo-articulos/models/types';
import type { MovimientoStock } from '../models/inventory.types';
import type { DatosImportacionCuantitativa, DatosLineaImportacionCuantitativa } from '../models/operacionImportacionInventario.types';
import type { OperacionIdempotenteInventario } from '../models/operacionIdempotenteInventario.types';
import type { PlanUnidadTrabajoInventario } from '../models/planUnidadTrabajoInventario.types';
import { ejecutarUnidadTrabajoInventario } from './unidadTrabajoInventario';
import { serializarCanonicamente } from './serializacionCanonicaInventario';
import { calcularHashInventario } from './hashInventario';
import { redondearAPrecision, PRECISION_CANTIDAD_UNIDAD_MINIMA } from './precisionInventario';
import { calcularMutacionesCuantitativas, parsearColeccion } from './operacionCuantitativaInventarioComun';
import type { DatosLineaOperacionCuantitativa, DatosOperacionCuantitativa } from '../models/operacionEntradaInventario.types';
import { lsKey } from '../../../../../shared/tenant';
import { CLAVE_COLECCION_CAPAS_COSTO_INVENTARIO } from '../repositories/capaCostoInventario.repository';
import { CLAVE_COLECCION_CONSUMOS_CAPA_COSTO_INVENTARIO } from '../repositories/consumoCapaCostoInventario.repository';
import {
  construirConsumosSalidaValorizada,
  esCapaAlmacenable,
  esConsumoAlmacenable,
} from './salidaCuantitativaInventario';
import {
  validarContrato as validarContratoEntrada,
  construirCapasEntradaValorizada,
} from './entradaCuantitativaInventario';
import type { CapaCostoInventario } from '../models/capaCostoInventario.types';

/** Validación PURA del contrato (no depende de ningún snapshot) — segura de ejecutar ANTES de reservar. */
export function validarContratoImportacion(datos: DatosImportacionCuantitativa): void {
  if (datos.modoOperacion !== 'cuantitativo' && datos.modoOperacion !== 'valorizado') {
    throw new Error(`importacionCuantitativaInventario: modoOperacion "${String(datos.modoOperacion)}" no está soportado — solo se aceptan "cuantitativo"/"valorizado".`);
  }
  if (!datos.empresaId.trim()) throw new Error('importacionCuantitativaInventario: empresaId no puede estar vacío.');
  if (!datos.loteId.trim()) throw new Error('importacionCuantitativaInventario: loteId no puede estar vacío.');
  if (!datos.claveIdempotencia.trim()) throw new Error('importacionCuantitativaInventario: claveIdempotencia no puede estar vacía.');
  if (!datos.usuario.trim()) throw new Error('importacionCuantitativaInventario: usuario no puede estar vacío.');
  if (!datos.fecha.trim()) throw new Error('importacionCuantitativaInventario: fecha no puede estar vacía.');
  if (datos.lineas.length === 0) {
    throw new Error('importacionCuantitativaInventario: el lote de importación debe tener al menos una línea.');
  }

  const idsVistos = new Set<string>();
  const clavesProductoAlmacenVistas = new Set<string>();
  for (const linea of datos.lineas) {
    if (!linea.lineaId.trim()) throw new Error('importacionCuantitativaInventario: lineaId no puede estar vacío.');
    if (idsVistos.has(linea.lineaId)) {
      throw new Error(`importacionCuantitativaInventario: la línea "${linea.lineaId}" está duplicada en el mismo lote.`);
    }
    idsVistos.add(linea.lineaId);
    if (!linea.productoId.trim()) throw new Error(`importacionCuantitativaInventario: la línea "${linea.lineaId}" no tiene productoId.`);
    if (!linea.almacenId.trim()) throw new Error(`importacionCuantitativaInventario: la línea "${linea.lineaId}" no tiene almacenId.`);

    const claveProductoAlmacen = `${linea.productoId}:${linea.almacenId}`;
    if (clavesProductoAlmacenVistas.has(claveProductoAlmacen)) {
      throw new Error(`importacionCuantitativaInventario: el producto+almacén "${claveProductoAlmacen}" aparece más de una vez en el mismo lote.`);
    }
    clavesProductoAlmacenVistas.add(claveProductoAlmacen);

    if (!Number.isFinite(linea.diferencia) || linea.diferencia === 0) {
      throw new Error(`importacionCuantitativaInventario: la línea "${linea.lineaId}" tiene una diferencia inválida (${linea.diferencia}) — debe ser finita y distinta de cero.`);
    }
    const redondeada = redondearAPrecision(Math.abs(linea.diferencia), PRECISION_CANTIDAD_UNIDAD_MINIMA);
    if (redondeada !== Math.abs(linea.diferencia)) {
      throw new Error(`importacionCuantitativaInventario: la línea "${linea.lineaId}" tiene una diferencia (${linea.diferencia}) con más precisión que la permitida (${PRECISION_CANTIDAD_UNIDAD_MINIMA} decimales).`);
    }
  }
}

function construirDtoCanonicoImportacion(datos: DatosImportacionCuantitativa): Record<string, unknown> {
  const lineas = [...datos.lineas]
    .sort((a, b) => (a.lineaId < b.lineaId ? -1 : a.lineaId > b.lineaId ? 1 : 0))
    .map((linea) => ({
      lineaId: linea.lineaId,
      productoId: linea.productoId,
      almacenId: linea.almacenId,
      diferencia: linea.diferencia,
      // Un reintento con el mismo lote pero un costo DISTINTO es una operación distinta, nunca un
      // reintento legítimo — debe formar parte del hash (mismo criterio que entrada/salida, §10).
      costoUnitarioBaseMonedaBase: linea.costoUnitarioBaseMonedaBase ?? null,
    }));

  return {
    modoOperacion: datos.modoOperacion,
    empresaId: datos.empresaId,
    loteId: datos.loteId,
    tipoDocumento: datos.tipoDocumento,
    tipoOperacion: datos.tipoOperacion,
    motivo: datos.motivo,
    observaciones: (datos.observaciones ?? '').trim(),
    documentoReferencia: (datos.documentoReferencia ?? '').trim(),
    lineas,
  };
}

/** Hash de idempotencia de un lote de importación — nunca fabricado a mano por el consumidor. */
export function calcularHashImportacion(datos: DatosImportacionCuantitativa): Promise<string> {
  return calcularHashInventario(serializarCanonicamente(construirDtoCanonicoImportacion(datos)));
}

function validarReservaCoincideImportacion(
  datos: DatosImportacionCuantitativa,
  operacionReservada: OperacionIdempotenteInventario,
  hashEntrada: string
): void {
  if (operacionReservada.empresaId !== datos.empresaId) {
    throw new Error('importacionCuantitativaInventario: la operación reservada pertenece a otra empresa.');
  }
  if (operacionReservada.clave !== datos.claveIdempotencia) {
    throw new Error('importacionCuantitativaInventario: la operación reservada no corresponde a la clave de idempotencia de este lote.');
  }
  if (operacionReservada.hashEntrada !== hashEntrada) {
    throw new Error('importacionCuantitativaInventario: la operación reservada no corresponde al hash de este lote.');
  }
  if (operacionReservada.tipoOperacion !== datos.tipoOperacion) {
    throw new Error('importacionCuantitativaInventario: la operación reservada no corresponde al tipo de operación de este lote.');
  }
}

/**
 * Adapta una línea de importación (con signo) a una línea cuantitativa común (siempre positiva)
 * para reutilizar `calcularMutacionesCuantitativas`. `costoUnitarioBaseMonedaBase` se conserva
 * (Etapa 4A, cierre): solo lo usan las líneas de ENTRADA en modo valorizado (crea su
 * `CapaCostoInventario`) — irrelevante y sin efecto para las líneas de SALIDA, que nunca declaran
 * costo propio (consumen capas existentes).
 */
function aLineaComun(linea: DatosLineaImportacionCuantitativa): DatosLineaOperacionCuantitativa {
  return {
    lineaId: linea.lineaId,
    productoId: linea.productoId,
    almacenId: linea.almacenId,
    cantidadUnidadMinima: Math.abs(linea.diferencia),
    ...(linea.costoUnitarioBaseMonedaBase !== undefined ? { costoUnitarioBaseMonedaBase: linea.costoUnitarioBaseMonedaBase } : {}),
  };
}

function construirDatosComunes(
  datos: DatosImportacionCuantitativa,
  lineas: DatosLineaOperacionCuantitativa[],
  modoOperacion: 'cuantitativo' | 'valorizado' = 'cuantitativo'
): DatosOperacionCuantitativa {
  return {
    modoOperacion,
    empresaId: datos.empresaId,
    documentoId: datos.loteId,
    tipoDocumento: datos.tipoDocumento,
    tipoOperacion: datos.tipoOperacion,
    claveIdempotencia: datos.claveIdempotencia,
    usuario: datos.usuario,
    fecha: datos.fecha,
    motivo: datos.motivo,
    observaciones: datos.observaciones,
    documentoReferencia: datos.documentoReferencia,
    lineas,
  };
}

export interface ParametrosPrepararOperacionImportacion {
  datos: DatosImportacionCuantitativa;
  operacionReservada: OperacionIdempotenteInventario;
  hashEntrada: string;
  versionEsperada: number;
  productosRaw: string | null;
  movimientosRaw: string | null;
  almacenes: ReadonlyMap<string, Almacen>;
  generarId: () => string;
  /** Requerida únicamente cuando `datos.modoOperacion==='valorizado'` Y el lote trae líneas de entrada (crea `CapaCostoInventario`). */
  monedaBase?: string;
}

export interface ResultadoPreparacionOperacionImportacion {
  plan: PlanUnidadTrabajoInventario;
  movimientosGenerados: MovimientoStock[];
  productosActualizados: Product[];
}

/**
 * Preparación pura y completa de un lote de importación mixto: separa las líneas por signo,
 * calcula las mutaciones de ENTRADA y de SALIDA reutilizando `calcularMutacionesCuantitativas` (sin
 * duplicar su lógica), encadena la segunda pasada sobre el resultado de la primera (mismo
 * empresaId, nunca se pierden cambios), y funde ambos resultados en el MISMO
 * `PlanUnidadTrabajoInventario` — una sola escritura de productos, una sola de movimientos.
 * Cualquier línea inválida (producto/almacén inexistente, stock resultante negativo) rechaza el
 * LOTE COMPLETO — ninguna escritura ocurre hasta que ambas pasadas terminan sin error.
 */
export function prepararOperacionImportacion(
  params: ParametrosPrepararOperacionImportacion
): ResultadoPreparacionOperacionImportacion {
  const { datos, operacionReservada, hashEntrada, versionEsperada, productosRaw, movimientosRaw, almacenes, generarId, monedaBase } = params;

  validarReservaCoincideImportacion(datos, operacionReservada, hashEntrada);

  const lineasOrdenadas = [...datos.lineas].sort((a, b) => (a.lineaId < b.lineaId ? -1 : a.lineaId > b.lineaId ? 1 : 0));
  const lineasEntrada = lineasOrdenadas.filter((l) => l.diferencia > 0).map(aLineaComun);
  const lineasSalida = lineasOrdenadas.filter((l) => l.diferencia < 0).map(aLineaComun);

  let productosRawTrabajo = productosRaw;
  let movimientosRawTrabajo = movimientosRaw;
  let claveProductos = '';
  let claveMovimientos = '';
  let productosFinales: Product[] = [];
  let movimientosFinales: unknown[] = [];
  const movimientosGenerados: MovimientoStock[] = [];
  const productosActualizadosPorId = new Map<string, Product>();

  // Etapa 4A, cierre: la línea de ENTRADA (diferencia>0) crea una CapaCostoInventario cuando el lote
  // es valorizado — reutilizando exactamente `entradaCuantitativaInventario.ts` (`validarContrato`
  // exige costo por línea; `construirCapasEntradaValorizada` construye la capa), nunca reimplementado
  // aquí. `validarContratoEntrada` corre ANTES de mutar nada: una línea de entrada sin costo válido
  // rechaza el LOTE COMPLETO (incluida cualquier línea de salida del mismo lote).
  let datosOperacionEntrada: DatosOperacionCuantitativa | null = null;
  let movimientosEntradaGenerados: MovimientoStock[] = [];

  if (lineasEntrada.length > 0) {
    datosOperacionEntrada = construirDatosComunes(datos, lineasEntrada, datos.modoOperacion);
    if (datosOperacionEntrada.modoOperacion === 'valorizado') {
      validarContratoEntrada(datosOperacionEntrada);
    }
    const resultado = calcularMutacionesCuantitativas({
      datos: datosOperacionEntrada,
      productosRaw: productosRawTrabajo,
      movimientosRaw: movimientosRawTrabajo,
      almacenes,
      generarId,
      signo: 1,
      tipoMovimiento: 'ENTRADA',
    });
    claveProductos = resultado.claveProductos;
    claveMovimientos = resultado.claveMovimientos;
    productosFinales = resultado.productosFinales;
    movimientosFinales = resultado.movimientosFinales;
    movimientosEntradaGenerados = resultado.movimientosGenerados;
    movimientosGenerados.push(...resultado.movimientosGenerados);
    resultado.productosActualizados.forEach((p) => productosActualizadosPorId.set(p.id, p));
    productosRawTrabajo = JSON.stringify(resultado.productosFinales);
    movimientosRawTrabajo = JSON.stringify(resultado.movimientosFinales);
  }

  let datosOperacionSalida: DatosOperacionCuantitativa | null = null;
  let movimientosSalidaGenerados: MovimientoStock[] = [];

  if (lineasSalida.length > 0) {
    datosOperacionSalida = construirDatosComunes(datos, lineasSalida, datos.modoOperacion);
    const resultado = calcularMutacionesCuantitativas({
      datos: datosOperacionSalida,
      productosRaw: productosRawTrabajo,
      movimientosRaw: movimientosRawTrabajo,
      almacenes,
      generarId,
      signo: -1,
      tipoMovimiento: 'SALIDA',
    });
    claveProductos = resultado.claveProductos;
    claveMovimientos = resultado.claveMovimientos;
    productosFinales = resultado.productosFinales;
    movimientosFinales = resultado.movimientosFinales;
    movimientosSalidaGenerados = resultado.movimientosGenerados;
    movimientosGenerados.push(...resultado.movimientosGenerados);
    resultado.productosActualizados.forEach((p) => productosActualizadosPorId.set(p.id, p));
  }

  const escrituras: PlanUnidadTrabajoInventario['escrituras'] = [
    { clave: claveProductos, valorAnterior: productosRaw, valorPropuesto: JSON.stringify(productosFinales) },
    { clave: claveMovimientos, valorAnterior: movimientosRaw, valorPropuesto: JSON.stringify(movimientosFinales) },
  ];

  // Etapa 4A: en modo valorizado, la reducción real de stock (diferencia<0) consume capas FIFO
  // existentes — nunca las crea, nunca revaloriza — reutilizando exactamente la misma construcción
  // de consumos que el motor de salidas (`construirConsumosSalidaValorizada`); el aumento real
  // (diferencia>0) crea su propia capa — reutilizando exactamente `construirCapasEntradaValorizada`
  // del motor de entradas. Ambos efectos se funden en UNA sola escritura de la colección de capas
  // (nunca dos escrituras separadas a la misma clave).
  const entradaValorizada = datosOperacionEntrada?.modoOperacion === 'valorizado';
  const salidaValorizada = datosOperacionSalida?.modoOperacion === 'valorizado';

  if (entradaValorizada || salidaValorizada) {
    const claveCapas = lsKey(CLAVE_COLECCION_CAPAS_COSTO_INVENTARIO, datos.empresaId);
    const capasRawAnterior = localStorage.getItem(claveCapas);
    const capasTodas = parsearColeccion(capasRawAnterior, `la colección de capas de costo ("${claveCapas}")`).map((elemento, indice) => {
      if (!esCapaAlmacenable(elemento)) {
        throw new Error(`importacionCuantitativaInventario: el elemento en el índice ${indice} de "${claveCapas}" no tiene la forma esperada de una capa de costo.`);
      }
      return elemento;
    });

    let capasParaEscribir: CapaCostoInventario[] = capasTodas;
    let consumosNuevos: ReturnType<typeof construirConsumosSalidaValorizada>['consumosNuevos'] = [];

    if (salidaValorizada && datosOperacionSalida) {
      const resultadoConsumo = construirConsumosSalidaValorizada(
        datosOperacionSalida,
        movimientosSalidaGenerados,
        almacenes,
        capasTodas,
        generarId
      );
      consumosNuevos = resultadoConsumo.consumosNuevos;
      const capasFinalesPorId = new Map(resultadoConsumo.capasFinales.map((c) => [c.id, c] as const));
      capasParaEscribir = capasTodas.map((c) => capasFinalesPorId.get(c.id) ?? c);
    }

    if (entradaValorizada && datosOperacionEntrada) {
      if (!monedaBase || !monedaBase.trim()) {
        throw new Error('importacionCuantitativaInventario: se requiere monedaBase para preparar las líneas de entrada de un lote de importación valorizado.');
      }
      const capasNuevasEntrada = construirCapasEntradaValorizada(datosOperacionEntrada, movimientosEntradaGenerados, almacenes, generarId, monedaBase);
      capasParaEscribir = [...capasParaEscribir, ...capasNuevasEntrada];
    }

    escrituras.push({ clave: claveCapas, valorAnterior: capasRawAnterior, valorPropuesto: JSON.stringify(capasParaEscribir) });

    if (consumosNuevos.length > 0) {
      const claveConsumos = lsKey(CLAVE_COLECCION_CONSUMOS_CAPA_COSTO_INVENTARIO, datos.empresaId);
      const consumosRawAnterior = localStorage.getItem(claveConsumos);
      const consumosAnteriores = parsearColeccion(consumosRawAnterior, `la colección de consumos de capas ("${claveConsumos}")`).map((elemento, indice) => {
        if (!esConsumoAlmacenable(elemento)) {
          throw new Error(`importacionCuantitativaInventario: el elemento en el índice ${indice} de "${claveConsumos}" no tiene la forma esperada de un consumo de capa.`);
        }
        return elemento;
      });
      escrituras.push({ clave: claveConsumos, valorAnterior: consumosRawAnterior, valorPropuesto: JSON.stringify([...consumosAnteriores, ...consumosNuevos]) });
    }
  }

  const plan: PlanUnidadTrabajoInventario = {
    id: generarId(),
    empresaId: datos.empresaId,
    operacionIdempotenteId: operacionReservada.id,
    claveIdempotencia: datos.claveIdempotencia,
    tipoOperacion: datos.tipoOperacion,
    hashEntrada,
    versionEsperada,
    escrituras,
    resultadoIds: movimientosGenerados.map((m) => m.id),
    usuario: datos.usuario,
  };

  return {
    plan,
    movimientosGenerados,
    productosActualizados: Array.from(productosActualizadosPorId.values()),
  };
}

export interface ResultadoConfirmacionOperacionImportacion {
  documentoId: string;
  resultadoIds: string[];
  transaccionId: string;
}

/** Capa delgada sobre `ejecutarUnidadTrabajoInventario` — no recalcula nada, solo ejecuta el plan ya calculado. */
export async function confirmarOperacionImportacion(
  documentoId: string,
  plan: PlanUnidadTrabajoInventario,
  fechaActual: () => string
): Promise<ResultadoConfirmacionOperacionImportacion> {
  const resultado = await ejecutarUnidadTrabajoInventario({ plan, fechaActual });
  return {
    documentoId,
    resultadoIds: resultado.resultadoIds,
    transaccionId: resultado.transaccionId,
  };
}
