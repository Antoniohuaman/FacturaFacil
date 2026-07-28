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
import { redondearAPrecision, PRECISION_COSTO_UNITARIO_INTERNO, PRECISION_CANTIDAD_UNIDAD_MINIMA } from './precisionInventario';
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
 * Variantes de entrada que aceptan `modoOperacion:'valorizado'` (Etapa 2 §10 agregó
 * `ajuste_positivo`; Etapa 3 agrega `ni_automatica`/`ni_confirmacion` — la entrada real generada o
 * confirmada desde un Comprobante de Compra; Etapa 4A-cierre agrega `importacion` — el lado de
 * ENTRADA de un lote de importación en modo reemplazo/sumatoria, reutilizado por
 * `importacionCuantitativaInventario.ts` vía `construirCapasEntradaValorizada`, nunca duplicado).
 * Cualquier otro `tipoOperacion` de entrada (`anulacion`) sigue siendo exclusivamente cuantitativo.
 */
export const TIPOS_OPERACION_ENTRADA_VALORIZABLES = new Set<TipoOperacionIdempotenteInventario>([
  'ajuste_positivo',
  'ni_automatica',
  'ni_confirmacion',
  'importacion',
]);

/**
 * Validación PURA del contrato (§2 de la corrección final de Etapa 1C; Etapa 2 §10; ampliada en
 * Etapa 3 §10): delega la validación estructural común y, además, cuando
 * `modoOperacion==='valorizado'`, exige que `tipoOperacion` sea una de las variantes soportadas
 * (`TIPOS_OPERACION_ENTRADA_VALORIZABLES`) y que CADA línea traiga `costoUnitarioBaseMonedaBase`
 * finito y mayor a cero — nunca se asume ni se completa con un valor por defecto. Si la línea
 * declara el snapshot comercial (`costoUnitarioComercialOriginal`/`factorConversionAplicado`),
 * ambos deben estar presentes juntos y ser finitos/mayores a cero — nunca uno sin el otro, nunca
 * un factor implícito de 1. Segura de ejecutar ANTES de reservar.
 */
export function validarContrato(datos: DatosOperacionEntradaCuantitativa): void {
  validarContratoComun(datos);
  if (datos.modoOperacion === 'valorizado') {
    if (!TIPOS_OPERACION_ENTRADA_VALORIZABLES.has(datos.tipoOperacion)) {
      throw new Error(
        `entradaCuantitativaInventario: modoOperacion "valorizado" no está soportado para tipoOperacion "${datos.tipoOperacion}" (solo: ${Array.from(TIPOS_OPERACION_ENTRADA_VALORIZABLES).join(', ')}).`
      );
    }
    for (const linea of datos.lineas) {
      const costo = linea.costoUnitarioBaseMonedaBase;
      if (!Number.isFinite(costo) || (costo as number) <= 0) {
        throw new Error(
          `entradaCuantitativaInventario: la línea "${linea.lineaId}" requiere costoUnitarioBaseMonedaBase finito y mayor a cero en modo valorizado.`
        );
      }
      const tieneComercial = linea.costoUnitarioComercialOriginal !== undefined;
      const tieneFactor = linea.factorConversionAplicado !== undefined;
      if (tieneComercial !== tieneFactor) {
        throw new Error(
          `entradaCuantitativaInventario: la línea "${linea.lineaId}" declara solo uno de costoUnitarioComercialOriginal/factorConversionAplicado — ambos deben venir juntos o ninguno.`
        );
      }
      if (tieneComercial && (!Number.isFinite(linea.costoUnitarioComercialOriginal) || (linea.costoUnitarioComercialOriginal as number) <= 0)) {
        throw new Error(`entradaCuantitativaInventario: la línea "${linea.lineaId}" tiene costoUnitarioComercialOriginal inválido — debe ser finito y mayor a cero.`);
      }
      if (tieneFactor && (!Number.isFinite(linea.factorConversionAplicado) || (linea.factorConversionAplicado as number) <= 0)) {
        throw new Error(`entradaCuantitativaInventario: la línea "${linea.lineaId}" tiene factorConversionAplicado inválido — debe ser finito y mayor a cero.`);
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
    case 'ni_confirmacion':
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

/** Procedencia/tipoDocumentoOrigen de la capa según qué tipoOperacion de entrada la creó — nunca inferido del nombre del documento, siempre de este mapeo explícito y exhaustivo. */
function origenCapaParaTipoOperacion(
  tipoOperacion: TipoOperacionIdempotenteInventario
): Pick<CapaCostoInventario, 'procedencia' | 'tipoDocumentoOrigen'> {
  switch (tipoOperacion) {
    case 'ajuste_positivo':
      return { procedencia: 'ajuste', tipoDocumentoOrigen: 'ajuste' };
    case 'ni_automatica':
    case 'ni_confirmacion':
      return { procedencia: 'compra', tipoDocumentoOrigen: 'nota_ingreso' };
    case 'importacion':
      return { procedencia: 'importacion', tipoDocumentoOrigen: 'importacion' };
    default:
      throw new Error(`entradaCuantitativaInventario: tipoOperacion "${tipoOperacion}" no tiene una procedencia de capa de costo definida.`);
  }
}

/**
 * Construye una `CapaCostoInventario` por cada línea de una entrada valorizada (Etapa 2 §10:
 * ajuste positivo manual; Etapa 3 §10: entrada real/confirmada desde Comprobante de Compra) —
 * nunca revaloriza ni promedia: cada línea nace como una capa nueva, independiente. Empareja cada
 * línea con su `MovimientoStock` recién generado por `lineaOrigenId` (nunca por posición en el
 * arreglo — el orden canónico ya se aplicó en `calcularMutacionesEntrada`, pero emparejar por id
 * es siempre más seguro que por índice).
 *
 * Snapshot comercial (Etapa 3): cuando la línea trae `costoUnitarioComercialOriginal` +
 * `factorConversionAplicado` (una compra con presentación distinta a la unidad mínima),
 * `costoUnitarioBaseOriginal` se DERIVA dividiendo — nunca se multiplica, nunca se asume factor 1.
 * Cuando la línea nace ya en unidad mínima (ajuste manual, o una NI sin presentación comercial),
 * ambos campos están ausentes y `costoUnitarioBaseOriginal` es directamente
 * `costoUnitarioBaseMonedaBase` — el comportamiento cuantitativo/valorizado ya aprobado en Etapa 2
 * para `ajuste_positivo` queda intacto byte a byte.
 */
/** Exportado (Etapa 4A, cierre): reutilizado también por `importacionCuantitativaInventario.ts` para las líneas de ENTRADA de un lote de importación en modo valorizado — nunca duplicado. */
export function construirCapasEntradaValorizada(
  datos: DatosOperacionEntradaCuantitativa,
  movimientosGenerados: readonly MovimientoStock[],
  almacenes: ReadonlyMap<string, Almacen>,
  generarId: () => string,
  monedaBase: string
): CapaCostoInventario[] {
  const { procedencia, tipoDocumentoOrigen } = origenCapaParaTipoOperacion(datos.tipoOperacion);
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
    const costoUnitarioBaseMonedaBase = linea.costoUnitarioBaseMonedaBase as number; // ya validado > 0 y finito por validarContrato
    const tieneSnapshotComercial = linea.costoUnitarioComercialOriginal !== undefined && linea.factorConversionAplicado !== undefined;
    const costoUnitarioBaseOriginal = tieneSnapshotComercial
      ? redondearAPrecision(
          (linea.costoUnitarioComercialOriginal as number) / (linea.factorConversionAplicado as number),
          PRECISION_COSTO_UNITARIO_INTERNO
        )
      : costoUnitarioBaseMonedaBase;
    const valorValorizableOriginal = redondearAPrecision(costoUnitarioBaseOriginal * linea.cantidadUnidadMinima, PRECISION_COSTO_UNITARIO_INTERNO);
    const valorValorizableMonedaBase = redondearAPrecision(costoUnitarioBaseMonedaBase * linea.cantidadUnidadMinima, PRECISION_COSTO_UNITARIO_INTERNO);
    return {
      id: generarId(),
      empresaId: datos.empresaId,
      establecimientoId: almacen.establecimientoId,
      productoId: linea.productoId,
      almacenId: linea.almacenId,
      movimientoEntradaId: movimiento.id,
      tipoDocumentoOrigen,
      documentoOrigenId: datos.documentoId,
      lineaOrigenId: linea.lineaId,
      ...(tieneSnapshotComercial
        ? {
            cantidadComercialOriginal: redondearAPrecision(
              linea.cantidadUnidadMinima / (linea.factorConversionAplicado as number),
              PRECISION_CANTIDAD_UNIDAD_MINIMA
            ),
            costoUnitarioComercialOriginal: linea.costoUnitarioComercialOriginal,
            factorConversionAplicado: linea.factorConversionAplicado,
          }
        : {}),
      cantidadInicial: linea.cantidadUnidadMinima,
      cantidadDisponible: linea.cantidadUnidadMinima,
      costoUnitarioBaseOriginal,
      costoUnitarioBaseMonedaBase,
      valorValorizableOriginal,
      valorValorizableMonedaBase,
      monedaBase,
      monedaOriginal: linea.monedaOriginal ?? monedaBase,
      tipoCambioAplicado: linea.tipoCambioAplicado ?? 1,
      fechaTipoCambio: linea.fechaTipoCambio ?? datos.fecha,
      fechaEntrada: datos.fecha,
      estado: 'disponible',
      procedencia,
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
  // `resultadoIds` identifica exclusivamente los MOVIMIENTOS producidos — nunca se le mezclan ids
  // de otra colección (Etapa 3: un consumidor como `notaIngreso.service.ts` resuelve cada entrada
  // de `OperacionIdempotenteInventario.resultadoIds` contra la colección de movimientos; una capa
  // ahí rompería esa resolución). Las capas creadas son consultables por su propio
  // `movimientoEntradaId`, nunca por aparecer en `resultadoIds`.
  const resultadoIds = movimientosGenerados.map((movimiento) => movimiento.id);

  if (datos.modoOperacion === 'valorizado') {
    if (!monedaBase || !monedaBase.trim()) {
      throw new Error('entradaCuantitativaInventario: se requiere monedaBase para preparar una entrada valorizada.');
    }
    const capasNuevas = construirCapasEntradaValorizada(datos, movimientosGenerados, almacenes, generarId, monedaBase);
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
