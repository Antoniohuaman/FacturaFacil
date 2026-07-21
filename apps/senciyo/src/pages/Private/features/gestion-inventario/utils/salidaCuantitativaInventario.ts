// gestion-inventario/utils/salidaCuantitativaInventario.ts
//
// Motor de SALIDAS cuantitativas (Etapa 1D, §5-§14 del encargo). Todo lo que es independiente de
// la dirección (orden canónico, DTO/hash, validación de contrato, verificación de reserva, lectura
// de snapshots, consolidación de mutaciones, liberación de reserva de OV) vive en
// `operacionCuantitativaInventarioComun.ts`. Este archivo solo aporta lo específico de una
// salida: el signo (siempre negativo — Etapa 1D no implementa reversos/anulaciones de salida), la
// traducción a `MovimientoTipo`, y la defensa universal de clasificación inventariable (una
// invocación directa del servicio no puede evadir el filtro de ningún consumidor, §7).
//
// Solo existe la variante 'cuantitativo' (sin costo, sin capas, sin FIFO, sin consumo). No
// implementa anulación de salidas, transferencias ni devoluciones — quedan fuera del alcance de
// Etapa 1D.

import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';
import type { Product } from '../../catalogo-articulos/models/types';
import type { DatosOperacionSalidaCuantitativa } from '../models/operacionEntradaInventario.types';
import type { OperacionIdempotenteInventario, TipoOperacionIdempotenteInventario } from '../models/operacionIdempotenteInventario.types';
import type { PlanUnidadTrabajoInventario } from '../models/planUnidadTrabajoInventario.types';
import type { MovimientoStock, MovimientoTipo } from '../models/inventory.types';
import { esProductoInventariable } from '@/shared/inventory/clasificacionInventario';
import { ejecutarUnidadTrabajoInventario } from './unidadTrabajoInventario';
import {
  calcularHashOperacionCuantitativa,
  calcularMutacionesCuantitativas,
  validarContrato as validarContratoComun,
  validarReservaCoincide,
  type ResultadoMutacionesCuantitativas,
} from './operacionCuantitativaInventarioComun';

/** Validación PURA del contrato (§10) — reexporta la validación común: segura de ejecutar ANTES de reservar. */
export const validarContrato = validarContratoComun;

/** Hash de idempotencia de una operación de salida cuantitativa (§8) — nunca fabricado a mano por el consumidor. */
export function calcularHashSalidaCuantitativa(datos: DatosOperacionSalidaCuantitativa): Promise<string> {
  return calcularHashOperacionCuantitativa(datos);
}

function tipoMovimientoParaOperacionSalida(tipoOperacion: TipoOperacionIdempotenteInventario): MovimientoTipo {
  switch (tipoOperacion) {
    case 'nota_salida':
    case 'venta_salida':
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
 * Preparación pura del documento completo de salida (§11): valida que la reserva recibida
 * corresponda a esta operación, calcula todas las mutaciones (`calcularMutacionesSalida`) y
 * construye el plan exacto para la unidad de trabajo de Etapa 1B. Nunca toca `localStorage`.
 */
export function prepararOperacionSalidaInventario(
  params: ParametrosPrepararOperacionSalidaCuantitativa
): ResultadoPreparacionOperacionSalida {
  const { datos, operacionReservada, hashEntrada, versionEsperada, productosRaw, movimientosRaw, almacenes, generarId, permitirStockNegativo } = params;

  validarReservaCoincide(datos, operacionReservada, hashEntrada);

  const { movimientosGenerados, productosActualizados, productosFinales, movimientosFinales, claveProductos, claveMovimientos } =
    calcularMutacionesSalida(datos, productosRaw, movimientosRaw, almacenes, generarId, permitirStockNegativo);

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
