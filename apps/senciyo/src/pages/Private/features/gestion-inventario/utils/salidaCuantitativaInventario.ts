// gestion-inventario/utils/salidaCuantitativaInventario.ts
//
// Motor de SALIDAS (Etapa 1D, §5-§14 del encargo original; ampliado en Etapa 4A a la variante
// valorizada). Todo lo que es independiente de la dirección (orden canónico, DTO/hash, validación
// de contrato, verificación de reserva, lectura de snapshots, consolidación de mutaciones,
// liberación de reserva de OV, consumo FIFO de capas) vive en
// `operacionCuantitativaInventarioComun.ts`. Este archivo solo aporta lo específico de una
// salida: el signo (siempre negativo), la traducción a `MovimientoTipo`, la defensa universal de
// clasificación inventariable, y — Etapa 4A — qué `tipoOperacion` de salida admite costo y cómo
// construir sus `ConsumoCapaCostoInventario`.
//
// Modo cuantitativo (todo tipoOperacion): sin costo, sin capas, sin consumo — comportamiento
// intacto byte a byte respecto a Etapa 1D/2. Modo valorizado (Etapa 4A): SOLO para
// `venta_salida`/`nota_salida`/`ajuste_negativo` — consume capas FIFO existentes (nunca las crea,
// nunca revaloriza); cualquier otro tipoOperacion de salida en modo valorizado se rechaza
// explícitamente. No implementa anulación de salidas — eso vive en `reversoCuantitativoInventario.ts`.

import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';
import type { Product } from '../../catalogo-articulos/models/types';
import type { DatosOperacionSalidaCuantitativa } from '../models/operacionEntradaInventario.types';
import type { OperacionIdempotenteInventario, TipoOperacionIdempotenteInventario } from '../models/operacionIdempotenteInventario.types';
import type { PlanUnidadTrabajoInventario } from '../models/planUnidadTrabajoInventario.types';
import type { MovimientoStock, MovimientoTipo } from '../models/inventory.types';
import type { CapaCostoInventario } from '../models/capaCostoInventario.types';
import type { ConsumoCapaCostoInventario } from '../models/consumoCapaCostoInventario.types';
import { esProductoInventariable } from '@/shared/inventory/clasificacionInventario';
import { ejecutarUnidadTrabajoInventario } from './unidadTrabajoInventario';
import { CLAVE_COLECCION_CAPAS_COSTO_INVENTARIO } from '../repositories/capaCostoInventario.repository';
import { CLAVE_COLECCION_CONSUMOS_CAPA_COSTO_INVENTARIO } from '../repositories/consumoCapaCostoInventario.repository';
import { lsKey } from '../../../../../shared/tenant';
import {
  calcularHashOperacionCuantitativa,
  calcularMutacionesCuantitativas,
  ordenarLineasCanonicamente,
  parsearColeccion,
  consumirCapasFIFO,
  validarContrato as validarContratoComun,
  validarReservaCoincide,
  type ResultadoMutacionesCuantitativas,
} from './operacionCuantitativaInventarioComun';

/**
 * Variantes de salida que aceptan `modoOperacion:'valorizado'` (Etapa 4A) — venta (Factura/Boleta,
 * POS, Nota de Venta comparten `tipoOperacion:'venta_salida'`), Nota de Salida (incluida merma, que
 * es solo un `motivo`/`tipoSalida` de NS, nunca un tipoOperacion distinto) y ajuste negativo
 * manual. Cualquier otro `tipoOperacion` de salida sigue siendo exclusivamente cuantitativo.
 */
export const TIPOS_OPERACION_SALIDA_VALORIZABLES = new Set<TipoOperacionIdempotenteInventario>([
  'venta_salida',
  'nota_salida',
  'ajuste_negativo',
  // Cierre de brecha (transferencia inter-establecimiento por etapas): el leg de DESPACHO
  // (PENDIENTE→EN_TRANSITO) consume capas FIFO en el almacén origen exactamente igual que
  // cualquier otra salida valorizada — reutiliza este motor en vez de crear uno nuevo. Nunca
  // usado por `transferenciaCuantitativaInventario.ts` (la variante ATÓMICA intra-establecimiento
  // sigue construyendo sus propios movimientos directamente, sin pasar por aquí).
  'transferencia',
]);

/**
 * Validación PURA del contrato (§10 de Etapa 1D; Etapa 4A): delega la validación estructural común
 * y, cuando `modoOperacion==='valorizado'`, exige que `tipoOperacion` sea una de las variantes
 * soportadas (`TIPOS_OPERACION_SALIDA_VALORIZABLES`) — nunca un fallback que acepte cualquier
 * tipoOperacion. A diferencia del motor de entradas, la salida NUNCA exige costo por línea (el
 * costo lo aporta la capa consumida, no el llamador) — solo la cantidad, ya validada por el
 * contrato común. Segura de ejecutar ANTES de reservar.
 */
export function validarContrato(datos: DatosOperacionSalidaCuantitativa): void {
  if (datos.modoOperacion === 'valorizado' && !TIPOS_OPERACION_SALIDA_VALORIZABLES.has(datos.tipoOperacion)) {
    throw new Error(
      `salidaCuantitativaInventario: modoOperacion "valorizado" no está soportado para tipoOperacion "${datos.tipoOperacion}" (solo: ${Array.from(TIPOS_OPERACION_SALIDA_VALORIZABLES).join(', ')}).`
    );
  }
  validarContratoComun(datos);
}

/** Hash de idempotencia de una operación de salida cuantitativa (§8) — nunca fabricado a mano por el consumidor. */
export function calcularHashSalidaCuantitativa(datos: DatosOperacionSalidaCuantitativa): Promise<string> {
  return calcularHashOperacionCuantitativa(datos);
}

function tipoMovimientoParaOperacionSalida(tipoOperacion: TipoOperacionIdempotenteInventario): MovimientoTipo {
  switch (tipoOperacion) {
    case 'nota_salida':
    case 'venta_salida':
    case 'transferencia':
      return 'SALIDA';
    case 'ajuste_negativo':
      return 'AJUSTE_NEGATIVO';
    default:
      throw new Error(
        `salidaCuantitativaInventario: tipoOperacion "${tipoOperacion}" no está soportado por el motor de salidas cuantitativas de Etapa 1D.`
      );
  }
}

export type ResultadoMutacionesSalida = ResultadoMutacionesCuantitativas;

/**
 * Cálculo puro y completo de un documento de salida cuantitativa: resuelve el signo (siempre
 * negativo) y el `MovimientoTipo` propio de una salida, y delega el cálculo real (contrato,
 * snapshots, consolidación, `MovimientoStock`, liberación de reserva de OV) al núcleo común.
 *
 * Defensa universal (§7, §20): una invocación directa del servicio nunca puede afectar un
 * producto no controlado por stock, sin importar qué consumidor la origine (NS, venta, ajuste
 * negativo) — a diferencia del motor de entradas, aquí se aplica a TODO `tipoOperacion` de salida,
 * porque Etapa 1D introduce varios consumidores nuevos y ninguno debe poder evadirla confiando
 * solo en su propio filtro de UI/adaptador.
 */
export function calcularMutacionesSalida(
  datos: DatosOperacionSalidaCuantitativa,
  productosRaw: string | null,
  movimientosRaw: string | null,
  almacenes: ReadonlyMap<string, Almacen>,
  generarId: () => string,
  permitirStockNegativo?: boolean
): ResultadoMutacionesSalida {
  // Defensa del servicio (corrección post-1D, §4): `permitirStockNegativo` SOLO puede aplicarse a
  // `venta_salida` — un llamador que lo pase accidentalmente (o intencionalmente) para
  // `nota_salida`/`ajuste_negativo` nunca lo obtiene, sin importar qué consumidor invoque el motor
  // directamente. Vive aquí (no solo en el consumidor) para que ninguna invocación pueda evadirla.
  const permitirStockNegativoEfectivo = datos.tipoOperacion === 'venta_salida' ? permitirStockNegativo : false;

  return calcularMutacionesCuantitativas({
    datos,
    productosRaw,
    movimientosRaw,
    almacenes,
    generarId,
    signo: -1,
    tipoMovimiento: tipoMovimientoParaOperacionSalida(datos.tipoOperacion),
    permitirStockNegativo: permitirStockNegativoEfectivo,
    validarLinea: ({ producto }) => {
      if (!esProductoInventariable(producto)) {
        throw new Error(
          `salidaCuantitativaInventario: el producto "${producto.nombre}" no está controlado por stock (tipoExistencia no inventariable) — una salida no puede afectarlo.`
        );
      }
    },
  });
}

/** Exportado (Etapa 4A): reutilizado también por `importacionCuantitativaInventario.ts` para las líneas de salida de un lote de importación en modo reemplazo — nunca duplicado. */
export function esCapaAlmacenable(valor: unknown): valor is CapaCostoInventario {
  return typeof valor === 'object' && valor !== null && typeof (valor as { id?: unknown }).id === 'string';
}

/** Exportado (Etapa 4A): ver `esCapaAlmacenable`. */
export function esConsumoAlmacenable(valor: unknown): valor is ConsumoCapaCostoInventario {
  return typeof valor === 'object' && valor !== null && typeof (valor as { id?: unknown }).id === 'string';
}

/**
 * Consume capas FIFO para CADA línea del documento de salida (Etapa 4A) — nunca crea capas nuevas,
 * nunca revaloriza. Empareja cada línea con su `MovimientoStock` ya generado por `lineaOrigenId`
 * (mismo criterio que `construirCapasEntradaValorizada`). Mantiene un mapa de trabajo en memoria
 * (`capasPorId`) para que varias líneas del MISMO producto+almacén dentro del mismo documento
 * consuman de forma secuencial correcta (la segunda línea continúa exactamente donde dejó la
 * primera, nunca relee un saldo obsoleto). Rechaza TODA la operación (lanza, no un resultado
 * parcial) si alguna línea no cubre exactamente su cantidad con las capas disponibles.
 */
/** Exportado (Etapa 4A): reutilizado también por `importacionCuantitativaInventario.ts` — ver `esCapaAlmacenable`. */
export function construirConsumosSalidaValorizada(
  datos: DatosOperacionSalidaCuantitativa,
  movimientosGenerados: readonly MovimientoStock[],
  almacenes: ReadonlyMap<string, Almacen>,
  capasDisponiblesTodas: readonly CapaCostoInventario[],
  generarId: () => string
): { consumosNuevos: ConsumoCapaCostoInventario[]; capasFinales: CapaCostoInventario[] } {
  const movimientosPorLinea = new Map(movimientosGenerados.map((m) => [m.lineaOrigenId, m] as const));
  const capasPorId = new Map(capasDisponiblesTodas.map((c) => [c.id, c] as const));
  const candidatosPorGrupo = new Map<string, CapaCostoInventario[]>();
  const consumosNuevos: ConsumoCapaCostoInventario[] = [];

  for (const linea of ordenarLineasCanonicamente(datos.lineas)) {
    const movimiento = movimientosPorLinea.get(linea.lineaId);
    if (!movimiento) {
      throw new Error(`salidaCuantitativaInventario: no se generó un movimiento para la línea "${linea.lineaId}" — no se pueden consumir capas de costo.`);
    }
    const almacen = almacenes.get(linea.almacenId);
    if (!almacen) {
      throw new Error(`salidaCuantitativaInventario: el almacén "${linea.almacenId}" no existe — no se pueden consumir capas de costo de la línea "${linea.lineaId}".`);
    }

    const claveGrupo = `${linea.productoId}:${linea.almacenId}`;
    if (!candidatosPorGrupo.has(claveGrupo)) {
      candidatosPorGrupo.set(
        claveGrupo,
        capasDisponiblesTodas.filter(
          (c) => c.establecimientoId === almacen.establecimientoId && c.productoId === linea.productoId && c.almacenId === linea.almacenId
        )
      );
    }
    const candidatas = (candidatosPorGrupo.get(claveGrupo) as CapaCostoInventario[])
      .map((c) => capasPorId.get(c.id) as CapaCostoInventario)
      .filter((c) => c.estado === 'disponible' && c.cantidadDisponible > 0);

    const { detalle } = consumirCapasFIFO({
      capasDisponibles: candidatas,
      cantidadRequerida: linea.cantidadUnidadMinima,
      empresaId: datos.empresaId,
      movimientoSalidaId: movimiento.id,
      lineaDocumentoSalidaId: linea.lineaId,
      lineaComercialId: linea.lineaComercialId,
      motivo: 'salida',
      fecha: datos.fecha,
      generarId,
      nombreParaError: `"${movimiento.productoNombre}" en "${almacen.nombreAlmacen}"`,
    });

    for (const d of detalle) {
      capasPorId.set(d.capaActualizada.id, d.capaActualizada);
      consumosNuevos.push(d.consumo);
    }
  }

  return {
    consumosNuevos,
    capasFinales: capasDisponiblesTodas.map((c) => capasPorId.get(c.id) as CapaCostoInventario),
  };
}

export interface ParametrosPrepararOperacionSalidaCuantitativa {
  datos: DatosOperacionSalidaCuantitativa;
  operacionReservada: OperacionIdempotenteInventario;
  hashEntrada: string;
  versionEsperada: number;
  productosRaw: string | null;
  movimientosRaw: string | null;
  almacenes: ReadonlyMap<string, Almacen>;
  generarId: () => string;
  /** Configuración de tenant, no de documento (§21) — ver `ParametrosCalcularMutacionesCuantitativas.permitirStockNegativo`. */
  permitirStockNegativo?: boolean;
}

export interface ResultadoPreparacionOperacionSalida {
  plan: PlanUnidadTrabajoInventario;
  movimientosGenerados: MovimientoStock[];
  productosActualizados: Product[];
}

/**
 * Preparación pura del documento completo de salida (§11 de Etapa 1D; Etapa 4A añade el consumo
 * FIFO): valida que la reserva recibida corresponda a esta operación, calcula todas las mutaciones
 * (`calcularMutacionesSalida`) y, en modo valorizado, consume capas FIFO para cada línea — todo en
 * el MISMO plan que la unidad de trabajo confirma atómicamente. La colección de capas/consumos,
 * cuando aplica, se lee mediante `localStorage` directamente aquí, igual que ya hace el motor de
 * entradas — ninguna llega precargada porque solo el modo valorizado la necesita.
 */
export function prepararOperacionSalidaInventario(
  params: ParametrosPrepararOperacionSalidaCuantitativa
): ResultadoPreparacionOperacionSalida {
  const { datos, operacionReservada, hashEntrada, versionEsperada, productosRaw, movimientosRaw, almacenes, generarId, permitirStockNegativo } = params;

  validarReservaCoincide(datos, operacionReservada, hashEntrada);

  const { movimientosGenerados, productosActualizados, productosFinales, movimientosFinales, claveProductos, claveMovimientos } =
    calcularMutacionesSalida(datos, productosRaw, movimientosRaw, almacenes, generarId, permitirStockNegativo);

  const escrituras: PlanUnidadTrabajoInventario['escrituras'] = [
    { clave: claveProductos, valorAnterior: productosRaw, valorPropuesto: JSON.stringify(productosFinales) },
    { clave: claveMovimientos, valorAnterior: movimientosRaw, valorPropuesto: JSON.stringify(movimientosFinales) },
  ];

  if (datos.modoOperacion === 'valorizado') {
    const claveCapas = lsKey(CLAVE_COLECCION_CAPAS_COSTO_INVENTARIO, datos.empresaId);
    const claveConsumos = lsKey(CLAVE_COLECCION_CONSUMOS_CAPA_COSTO_INVENTARIO, datos.empresaId);

    const capasRawAnterior = localStorage.getItem(claveCapas);
    const capasTodas = parsearColeccion(capasRawAnterior, `la colección de capas de costo ("${claveCapas}")`).map((elemento, indice) => {
      if (!esCapaAlmacenable(elemento)) {
        throw new Error(`salidaCuantitativaInventario: el elemento en el índice ${indice} de "${claveCapas}" no tiene la forma esperada de una capa de costo.`);
      }
      return elemento;
    });

    const { consumosNuevos, capasFinales } = construirConsumosSalidaValorizada(datos, movimientosGenerados, almacenes, capasTodas, generarId);

    const capasFinalesPorId = new Map(capasFinales.map((c) => [c.id, c] as const));
    const capasParaEscribir = capasTodas.map((c) => capasFinalesPorId.get(c.id) ?? c);

    const consumosRawAnterior = localStorage.getItem(claveConsumos);
    const consumosAnteriores = parsearColeccion(consumosRawAnterior, `la colección de consumos de capas ("${claveConsumos}")`).map((elemento, indice) => {
      if (!esConsumoAlmacenable(elemento)) {
        throw new Error(`salidaCuantitativaInventario: el elemento en el índice ${indice} de "${claveConsumos}" no tiene la forma esperada de un consumo de capa.`);
      }
      return elemento;
    });

    escrituras.push(
      { clave: claveCapas, valorAnterior: capasRawAnterior, valorPropuesto: JSON.stringify(capasParaEscribir) },
      { clave: claveConsumos, valorAnterior: consumosRawAnterior, valorPropuesto: JSON.stringify([...consumosAnteriores, ...consumosNuevos]) },
    );
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
    resultadoIds: movimientosGenerados.map((movimiento) => movimiento.id),
    usuario: datos.usuario,
  };

  return { plan, movimientosGenerados, productosActualizados };
}

export interface ResultadoConfirmacionOperacionSalida {
  documentoId: string;
  resultadoIds: string[];
  transaccionId: string;
}

/**
 * Capa delgada sobre `ejecutarUnidadTrabajoInventario` (§15): no recalcula movimientos, no relee
 * catálogo, no genera nuevos IDs ni un hash nuevo, no escribe mediante `StockRepository` por fuera
 * del plan. Solo ejecuta el plan ya calculado y reformatea el resultado con el `documentoId`.
 */
export async function confirmarOperacionSalidaInventario(
  documentoId: string,
  plan: PlanUnidadTrabajoInventario,
  fechaActual: () => string
): Promise<ResultadoConfirmacionOperacionSalida> {
  const resultado = await ejecutarUnidadTrabajoInventario({ plan, fechaActual });
  return {
    documentoId,
    resultadoIds: resultado.resultadoIds,
    transaccionId: resultado.transaccionId,
  };
}
