// gestion-inventario/utils/entradaCuantitativaInventario.ts
//
// Motor de ENTRADAS cuantitativas (Etapa 1C, §5-§12 del encargo original; generalizado en Etapa
// 1D, §5: "no copies entradaCuantitativaInventario.ts para cambiar únicamente signos y nombres").
// Todo lo que es independiente de la dirección (orden canónico, DTO/hash, validación de contrato,
// verificación de reserva, lectura de snapshots, consolidación de mutaciones) vive en
// `operacionCuantitativaInventarioComun.ts`. Este archivo solo aporta lo que SÍ es específico de
// una entrada: qué signo corresponde a cada `tipoOperacion` de entrada, a qué `MovimientoTipo` se
// traduce, y la defensa de clasificación inventariable para `ajuste_positivo`.
//
// Solo existe la variante 'cuantitativo' (sin costo, sin capas, sin FIFO) — 'valorizado' está
// reservado para una etapa futura y se rechaza explícitamente en tiempo de ejecución.

import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';
import type { Product } from '../../catalogo-articulos/models/types';
import type {
  DatosOperacionEntradaCuantitativa,
} from '../models/operacionEntradaInventario.types';
import type { OperacionIdempotenteInventario, TipoOperacionIdempotenteInventario } from '../models/operacionIdempotenteInventario.types';
import type { PlanUnidadTrabajoInventario } from '../models/planUnidadTrabajoInventario.types';
import type { MovimientoStock, MovimientoTipo } from '../models/inventory.types';
import type { CapaCostoInventario } from '../models/capaCostoInventario.types';
import { esProductoInventariable } from '@/shared/inventory/clasificacionInventario';
import { ejecutarUnidadTrabajoInventario } from './unidadTrabajoInventario';
import { redondearAPrecision, PRECISION_COSTO_UNITARIO_INTERNO } from './precisionInventario';
import { parsearColeccion } from './operacionCuantitativaInventarioComun';
import { CLAVE_COLECCION_CAPAS_COSTO_INVENTARIO } from '../repositories/capaCostoInventario.repository';
import { lsKey } from '../../../../../shared/tenant';
import {
  calcularHashOperacionCuantitativa,
  calcularMutacionesCuantitativas,
  validarContrato as validarContratoComun,
  validarReservaCoincide,
  type ResultadoMutacionesCuantitativas,
} from './operacionCuantitativaInventarioComun';

/**
 * Validación PURA del contrato (§2 de la corrección final de Etapa 1C; Etapa 2 §10): delega la
 * validación estructural común y, además, cuando `modoOperacion==='valorizado'`, exige que
 * `tipoOperacion==='ajuste_positivo'` (única variante de entrada soportada con costo en esta
 * etapa) y que CADA línea traiga `costoUnitarioBaseMonedaBase` finito y mayor a cero — nunca se
 * asume ni se completa con un valor por defecto. Segura de ejecutar ANTES de reservar.
 */
export function validarContrato(datos: DatosOperacionEntradaCuantitativa): void {
  validarContratoComun(datos);
  if (datos.modoOperacion === 'valorizado') {
    if (datos.tipoOperacion !== 'ajuste_positivo') {
      throw new Error(
        `entradaCuantitativaInventario: modoOperacion "valorizado" solo está soportado para tipoOperacion "ajuste_positivo" en esta etapa (recibido "${datos.tipoOperacion}").`
      );
    }
    for (const linea of datos.lineas) {
      const costo = linea.costoUnitarioBaseMonedaBase;
      if (!Number.isFinite(costo) || (costo as number) <= 0) {
        throw new Error(
          `entradaCuantitativaInventario: la línea "${linea.lineaId}" requiere costoUnitarioBaseMonedaBase finito y mayor a cero en modo valorizado.`
        );
      }
    }
  }
}

/** Hash de idempotencia de una operación de entrada cuantitativa (§7) — nunca fabricado a mano por el consumidor. */
export function calcularHashEntradaCuantitativa(datos: DatosOperacionEntradaCuantitativa): Promise<string> {
  return calcularHashOperacionCuantitativa(datos);
}

function tipoMovimientoParaOperacionEntrada(tipoOperacion: TipoOperacionIdempotenteInventario): MovimientoTipo {
  switch (tipoOperacion) {
    case 'ni_automatica':
      return 'ENTRADA';
    case 'ajuste_positivo':
      return 'AJUSTE_POSITIVO';
    case 'anulacion':
      return 'AJUSTE_NEGATIVO';
    default:
      throw new Error(
        `entradaCuantitativaInventario: tipoOperacion "${tipoOperacion}" no está soportado por el motor de entradas cuantitativas.`
      );
  }
}

/** `-1` para anulación (reversa una entrada previa), `1` para toda entrada real. */
function signoParaTipoOperacionEntrada(tipoOperacion: TipoOperacionIdempotenteInventario): 1 | -1 {
  return tipoOperacion === 'anulacion' ? -1 : 1;
}

export type ResultadoMutacionesEntrada = ResultadoMutacionesCuantitativas;

/**
 * Cálculo puro y completo de un documento de entrada cuantitativa: resuelve el signo y el
 * `MovimientoTipo` propios de una entrada y delega el cálculo real (contrato, snapshots,
 * consolidación, `MovimientoStock`) al núcleo común. No depende de que exista una reserva — se
 * puede invocar ANTES de reservar (validación temprana) y de nuevo antes de confirmar.
 */
export function calcularMutacionesEntrada(
  datos: DatosOperacionEntradaCuantitativa,
  productosRaw: string | null,
  movimientosRaw: string | null,
  almacenes: ReadonlyMap<string, Almacen>,
  generarId: () => string
): ResultadoMutacionesEntrada {
  return calcularMutacionesCuantitativas({
    datos,
    productosRaw,
    movimientosRaw,
    almacenes,
    generarId,
    signo: signoParaTipoOperacionEntrada(datos.tipoOperacion),
    tipoMovimiento: tipoMovimientoParaOperacionEntrada(datos.tipoOperacion),
    // Defensa del motor central: un ajuste positivo nunca puede afectar un producto no
    // controlado por stock, sin importar si el consumidor (p. ej. un llamador directo del
    // servicio que evada el filtro de NI) ya debió filtrarlo. La anulación NO pasa por aquí —
    // revierte por movimientos históricos reales, nunca por la clasificación vigente.
    validarLinea: ({ producto }) => {
      if (datos.tipoOperacion === 'ajuste_positivo' && !esProductoInventariable(producto)) {
        throw new Error(
          `entradaCuantitativaInventario: el producto "${producto.nombre}" no está controlado por stock (tipoExistencia no inventariable) — un ajuste positivo no puede afectarlo.`
        );
      }
    },
  });
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
  /** Requerida únicamente cuando `datos.modoOperacion==='valorizado'` (crea `CapaCostoInventario`). */
  monedaBase?: string;
}

export interface ResultadoPreparacionOperacionEntrada {
  plan: PlanUnidadTrabajoInventario;
  movimientosGenerados: MovimientoStock[];
  productosActualizados: Product[];
}

function esCapaAlmacenable(valor: unknown): valor is CapaCostoInventario {
  return typeof valor === 'object' && valor !== null && typeof (valor as { id?: unknown }).id === 'string';
}

/**
 * Construye una `CapaCostoInventario` por cada línea de un ajuste positivo valorizado (Etapa 2,
 * §10) — nunca revaloriza ni promedia: cada línea nace como una capa nueva, independiente, con su
 * propio costo declarado por el usuario. Empareja cada línea con su `MovimientoStock` recién
 * generado por `lineaOrigenId` (nunca por posición en el arreglo — el orden canónico ya se aplicó
 * en `calcularMutacionesEntrada`, pero emparejar por id es siempre más seguro que por índice).
 */
function construirCapasAjustePositivoValorizado(
  datos: DatosOperacionEntradaCuantitativa,
  movimientosGenerados: readonly MovimientoStock[],
  almacenes: ReadonlyMap<string, Almacen>,
  generarId: () => string,
  monedaBase: string
): CapaCostoInventario[] {
  const movimientosPorLinea = new Map(movimientosGenerados.map((m) => [m.lineaOrigenId, m] as const));
  return datos.lineas.map((linea) => {
    const movimiento = movimientosPorLinea.get(linea.lineaId);
    if (!movimiento) {
      throw new Error(`entradaCuantitativaInventario: no se generó un movimiento para la línea "${linea.lineaId}" — no se puede crear su capa de costo.`);
    }
    const almacen = almacenes.get(linea.almacenId);
    if (!almacen) {
      throw new Error(`entradaCuantitativaInventario: el almacén "${linea.almacenId}" no existe — no se puede crear la capa de costo de la línea "${linea.lineaId}".`);
    }
    const costoUnitario = linea.costoUnitarioBaseMonedaBase as number; // ya validado > 0 y finito por validarContrato
    const valorValorizable = redondearAPrecision(costoUnitario * linea.cantidadUnidadMinima, PRECISION_COSTO_UNITARIO_INTERNO);
    return {
      id: generarId(),
      empresaId: datos.empresaId,
      establecimientoId: almacen.establecimientoId,
      productoId: linea.productoId,
      almacenId: linea.almacenId,
      movimientoEntradaId: movimiento.id,
      tipoDocumentoOrigen: 'ajuste',
      documentoOrigenId: datos.documentoId,
      lineaOrigenId: linea.lineaId,
      cantidadInicial: linea.cantidadUnidadMinima,
      cantidadDisponible: linea.cantidadUnidadMinima,
      costoUnitarioBaseOriginal: costoUnitario,
      costoUnitarioBaseMonedaBase: costoUnitario,
      valorValorizableOriginal: valorValorizable,
      valorValorizableMonedaBase: valorValorizable,
      monedaBase,
      monedaOriginal: monedaBase,
      tipoCambioAplicado: 1,
      fechaTipoCambio: datos.fecha,
      fechaEntrada: datos.fecha,
      estado: 'disponible',
      procedencia: 'ajuste',
      usuario: datos.usuario,
      fechaCreacion: datos.fecha,
    };
  });
}

/**
 * Preparación pura del documento completo: valida que la reserva recibida corresponda a esta
 * operación, calcula todas las mutaciones (`calcularMutacionesEntrada`) y construye el plan exacto
 * para la unidad de trabajo de Etapa 1B. Nunca toca `localStorage` — todos los snapshots llegan ya
 * leídos como parámetros (la colección de capas, cuando aplica, se lee mediante `localStorage`
 * directamente aquí, igual que ya hace `transferenciaCuantitativaInventario.ts` para su propia
 * colección de capas — ninguna llega precargada porque solo el modo valorizado la necesita).
 */
export function prepararOperacionInventario(
  params: ParametrosPrepararOperacionEntradaCuantitativa
): ResultadoPreparacionOperacionEntrada {
  const { datos, operacionReservada, hashEntrada, versionEsperada, productosRaw, movimientosRaw, almacenes, generarId, monedaBase } = params;

  validarReservaCoincide(datos, operacionReservada, hashEntrada);

  const { movimientosGenerados, productosActualizados, productosFinales, movimientosFinales, claveProductos, claveMovimientos } =
    calcularMutacionesEntrada(datos, productosRaw, movimientosRaw, almacenes, generarId);

  const escrituras: PlanUnidadTrabajoInventario['escrituras'] = [
    { clave: claveProductos, valorAnterior: productosRaw, valorPropuesto: JSON.stringify(productosFinales) },
    { clave: claveMovimientos, valorAnterior: movimientosRaw, valorPropuesto: JSON.stringify(movimientosFinales) },
  ];
  let resultadoIds = movimientosGenerados.map((movimiento) => movimiento.id);

  if (datos.modoOperacion === 'valorizado') {
    if (!monedaBase || !monedaBase.trim()) {
      throw new Error('entradaCuantitativaInventario: se requiere monedaBase para preparar una entrada valorizada.');
    }
    const capasNuevas = construirCapasAjustePositivoValorizado(datos, movimientosGenerados, almacenes, generarId, monedaBase);
    const claveCapas = lsKey(CLAVE_COLECCION_CAPAS_COSTO_INVENTARIO, datos.empresaId);
    const capasRawAnterior = localStorage.getItem(claveCapas);
    const capasAnteriores = parsearColeccion(capasRawAnterior, `la colección de capas de costo ("${claveCapas}")`).map((elemento, indice) => {
      if (!esCapaAlmacenable(elemento)) {
        throw new Error(`entradaCuantitativaInventario: el elemento en el índice ${indice} de "${claveCapas}" no tiene la forma esperada de una capa de costo.`);
      }
      return elemento;
    });
    escrituras.push({
      clave: claveCapas,
      valorAnterior: capasRawAnterior,
      valorPropuesto: JSON.stringify([...capasAnteriores, ...capasNuevas]),
    });
    resultadoIds = [...resultadoIds, ...capasNuevas.map((c) => c.id)];
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
    resultadoIds,
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
