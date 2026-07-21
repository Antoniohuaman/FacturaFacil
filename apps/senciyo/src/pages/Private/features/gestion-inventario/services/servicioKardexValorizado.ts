// gestion-inventario/services/servicioKardexValorizado.ts
//
// API pública del motor central de Kardex Valorizado, para operaciones de ENTRADA (Etapa 1C,
// `registrarEntradaValorizada`) y de SALIDA (Etapa 1D, `registrarSalidaValorizada`). Único punto
// de entrada productivo para ambas direcciones: encapsula reserva idempotente (Etapa 1B), lectura
// de snapshots, preparación pura (utils/entradaCuantitativaInventario.ts /
// utils/salidaCuantitativaInventario.ts) y confirmación mediante la unidad de trabajo recuperable
// (Etapa 1B). No expone primitivas de escritura directa — nada aquí permite insertar el ledger,
// escribir movimientos o modificar stock por fuera de esta función.
//
// Ambas etapas son exclusivamente cuantitativas: no crean CapaCostoInventario ni
// ConsumoCapaCostoInventario, no calculan costo de venta, no hacen consumo FIFO.
// `registrarEntradaValorizada`/`registrarSalidaValorizada` son los nombres aprobados para la API
// pública, pero por ahora solo aceptan `modoOperacion: 'cuantitativo'` — una variante 'valorizado'
// se rechaza explícitamente.
//
// La orquestación (validar → hash → reservar → resolver repetida/ambigua → preparar → confirmar,
// con `marcarOperacionFallida` si la preparación falla tras reservar) es IDÉNTICA para ambas
// direcciones — vive una sola vez en `ejecutarOperacionCuantitativa` (Etapa 1D, §10: "no dupliques
// esta política en cada consumidor"). Cada dirección solo aporta su propio `calcularHash`/
// `preparar`/`confirmar` (utils/entradaCuantitativaInventario.ts o
// utils/salidaCuantitativaInventario.ts).
//
// Corrección de la revisión final de Etapa 1C (causa raíz de reservas 'preparada' huérfanas): toda
// la validación funcional que no depende de la reserva (producto/almacén existen, cantidad válida,
// stock resultante no negativo) se ejecuta DESPUÉS de reservar — adelantarla rechazaría
// incorrectamente un reintento legítimo ('repetida') que ya no coincide con el estado actual, YA
// mutado por el intento anterior. Solo la validación PURA del contrato (independiente del estado)
// se ejecuta antes de reservar. Si la preparación falla DESPUÉS de reservar, la operación recién
// reservada por ESTA misma llamada se cierra con `marcarOperacionFallida` — nunca queda ambigua —
// porque en ese punto se puede demostrar con certeza que `confirmar` (la única función que crea una
// `TransaccionInventario` o escribe dominio) todavía no se invocó.

import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';
import type { MovimientoStock } from '../models/inventory.types';
import type { Product } from '../../catalogo-articulos/models/types';
import type { DatosOperacionCuantitativa, DatosOperacionEntradaCuantitativa, DatosOperacionSalidaCuantitativa } from '../models/operacionEntradaInventario.types';
import type { OperacionIdempotenteInventario } from '../models/operacionIdempotenteInventario.types';
import type { PlanUnidadTrabajoInventario } from '../models/planUnidadTrabajoInventario.types';
import { reservarOperacionIdempotente } from '../utils/idempotenciaInventario';
import { validarContrato } from '../utils/operacionCuantitativaInventarioComun';
import {
  calcularHashEntradaCuantitativa,
  prepararOperacionInventario,
  confirmarOperacionInventario,
} from '../utils/entradaCuantitativaInventario';
import {
  calcularHashSalidaCuantitativa,
  prepararOperacionSalidaInventario,
  confirmarOperacionSalidaInventario,
} from '../utils/salidaCuantitativaInventario';
import { marcarOperacionFallida } from '../repositories/operacionIdempotenteInventario.repository';
import { obtenerVersionInventarioActual } from '../repositories/estadoVersionInventario.repository';
import { PRODUCT_STORAGE_KEY } from '../../catalogo-articulos/utils/catalogStorage';
import { STORAGE_KEY_MOVEMENTS } from '../repositories/stock.repository';
import { lsKey } from '../../../../../shared/tenant';

export interface DependenciasOperacionCuantitativa {
  almacenes: ReadonlyMap<string, Almacen>;
  generarId: () => string;
  fechaActual: () => string;
  /**
   * Configuración de TENANT, no de documento — por eso vive aquí junto a `almacenes` y nunca en
   * `datos` (nunca forma parte del hash de idempotencia). Solo `venta_salida` la usa hoy
   * (Etapa 1D, §21: venta con `allowNegativeStock` configurado); ausente/`false` en el resto de
   * consumidores preserva exactamente el rechazo de stock negativo ya aprobado.
   */
  permitirStockNegativo?: boolean;
}

export type DependenciasRegistrarEntradaValorizada = DependenciasOperacionCuantitativa;
export type DependenciasRegistrarSalidaValorizada = DependenciasOperacionCuantitativa;

export interface ResultadoOperacionCuantitativa {
  documentoId: string;
  estado: 'nueva' | 'repetida' | 'reactivada';
  resultadoIds: string[];
  movimientos: MovimientoStock[];
  productosActualizados: Product[];
}

export type ResultadoRegistrarEntradaValorizada = ResultadoOperacionCuantitativa;
export type ResultadoRegistrarSalidaValorizada = ResultadoOperacionCuantitativa;

function leerSnapshots(empresaId: string): { productosRaw: string | null; movimientosRaw: string | null } {
  const claveProductos = lsKey(PRODUCT_STORAGE_KEY, empresaId);
  const claveMovimientos = lsKey(STORAGE_KEY_MOVEMENTS, empresaId);
  return {
    productosRaw: localStorage.getItem(claveProductos),
    movimientosRaw: localStorage.getItem(claveMovimientos),
  };
}

interface ParametrosPreparar {
  datos: DatosOperacionCuantitativa;
  operacionReservada: OperacionIdempotenteInventario;
  hashEntrada: string;
  versionEsperada: number;
  productosRaw: string | null;
  movimientosRaw: string | null;
  almacenes: ReadonlyMap<string, Almacen>;
  generarId: () => string;
  permitirStockNegativo?: boolean;
}

interface ResultadoPreparar {
  plan: PlanUnidadTrabajoInventario;
  movimientosGenerados: MovimientoStock[];
  productosActualizados: Product[];
}

interface FuncionesMotorCuantitativo {
  nombreMetodo: string;
  calcularHash: (datos: DatosOperacionCuantitativa) => Promise<string>;
  preparar: (params: ParametrosPreparar) => ResultadoPreparar;
  confirmar: (documentoId: string, plan: PlanUnidadTrabajoInventario, fechaActual: () => string) => Promise<{ documentoId: string; resultadoIds: string[]; transaccionId: string }>;
}

/**
 * Orquestación única (Etapa 1D, §10) para cualquier operación cuantitativa — entrada o salida:
 * validar contrato → hash → reservar → resolver ambigua/repetida → preparar (protegida por
 * `marcarOperacionFallida`) → confirmar. Nunca se duplica en cada consumidor ni en cada dirección.
 */
async function ejecutarOperacionCuantitativa(
  datos: DatosOperacionCuantitativa,
  dependencias: DependenciasOperacionCuantitativa,
  funciones: FuncionesMotorCuantitativo
): Promise<ResultadoOperacionCuantitativa> {
  if (datos.modoOperacion !== 'cuantitativo') {
    throw new Error(
      `ServicioKardexValorizado.${funciones.nombreMetodo}: modoOperacion "${String(datos.modoOperacion)}" no está soportado — solo se acepta la variante cuantitativa.`
    );
  }

  // Validación PURA del contrato: no depende de ningún snapshot, así que es segura de ejecutar
  // antes de reservar. La validación FUNCIONAL (producto/almacén existen, stock resultante) sí
  // depende del estado externo y por eso NO se adelanta aquí.
  validarContrato(datos);

  const hashEntrada = await funciones.calcularHash(datos);

  const resultadoReserva = await reservarOperacionIdempotente({
    empresaId: datos.empresaId,
    clave: datos.claveIdempotencia,
    tipoOperacion: datos.tipoOperacion,
    hashEntrada,
    referenciaDocumentoId: datos.documentoId,
    referenciaDocumentoTipo: datos.tipoDocumento,
    generarId: dependencias.generarId,
    fechaActual: dependencias.fechaActual,
  });

  if (resultadoReserva.tipo === 'ambigua') {
    throw new Error(
      `ServicioKardexValorizado.${funciones.nombreMetodo}: la operación "${datos.claveIdempotencia}" de la empresa "${datos.empresaId}" quedó en un estado ambiguo (reserva 'preparada' sin resolución) — no se puede continuar automáticamente ni mutar stock.`
    );
  }

  if (resultadoReserva.tipo === 'repetida') {
    return {
      documentoId: datos.documentoId,
      estado: 'repetida',
      resultadoIds: resultadoReserva.resultadoIds,
      movimientos: [],
      productosActualizados: [],
    };
  }

  const { productosRaw, movimientosRaw } = leerSnapshots(datos.empresaId);
  const versionEsperada = obtenerVersionInventarioActual(datos.empresaId);

  let plan: PlanUnidadTrabajoInventario;
  let movimientosGenerados: MovimientoStock[];
  let productosActualizados: Product[];
  try {
    const preparado = funciones.preparar({
      datos,
      operacionReservada: resultadoReserva.operacion,
      hashEntrada,
      versionEsperada,
      productosRaw,
      movimientosRaw,
      almacenes: dependencias.almacenes,
      generarId: dependencias.generarId,
      permitirStockNegativo: dependencias.permitirStockNegativo,
    });
    plan = preparado.plan;
    movimientosGenerados = preparado.movimientosGenerados;
    productosActualizados = preparado.productosActualizados;
  } catch (causaPreparacion) {
    // En este punto NUNCA se invocó `confirmar` (no existe transacción ni escritura de dominio
    // para esta operación) — cerrar con la transición segura ya aprobada en vez de dejar la
    // reserva 'preparada' huérfana (ambigua para siempre).
    marcarOperacionFallida(datos.empresaId, resultadoReserva.operacion.id);
    throw causaPreparacion;
  }

  const resultadoConfirmacion = await funciones.confirmar(datos.documentoId, plan, dependencias.fechaActual);

  return {
    documentoId: datos.documentoId,
    estado: resultadoReserva.tipo,
    resultadoIds: resultadoConfirmacion.resultadoIds,
    movimientos: movimientosGenerados,
    productosActualizados,
  };
}

export const ServicioKardexValorizado = {
  /**
   * Registra una operación de entrada de inventario (nota de ingreso, ajuste positivo, o su
   * anulación cuantitativa) mediante reserva idempotente + preparación pura + confirmación por la
   * unidad de trabajo recuperable de Etapa 1B. Solo acepta `modoOperacion: 'cuantitativo'` en esta
   * etapa — cualquier otro valor se rechaza en tiempo de ejecución, sin reservar ni mutar nada.
   */
  registrarEntradaValorizada(
    datos: DatosOperacionEntradaCuantitativa,
    dependencias: DependenciasRegistrarEntradaValorizada
  ): Promise<ResultadoRegistrarEntradaValorizada> {
    return ejecutarOperacionCuantitativa(datos, dependencias, {
      nombreMetodo: 'registrarEntradaValorizada',
      calcularHash: calcularHashEntradaCuantitativa,
      preparar: prepararOperacionInventario,
      confirmar: confirmarOperacionInventario,
    });
  },

  /**
   * Registra una operación de salida de inventario (Nota de Salida, venta con salida automática,
   * o ajuste negativo) mediante reserva idempotente + preparación pura + confirmación por la
   * unidad de trabajo recuperable de Etapa 1B. Solo acepta `modoOperacion: 'cuantitativo'` en esta
   * etapa (Etapa 1D) — cualquier otro valor se rechaza en tiempo de ejecución, sin reservar ni
   * mutar nada. No implementa FIFO, consumo de capas, costo de venta ni reversos/anulaciones.
   */
  registrarSalidaValorizada(
    datos: DatosOperacionSalidaCuantitativa,
    dependencias: DependenciasRegistrarSalidaValorizada
  ): Promise<ResultadoRegistrarSalidaValorizada> {
    return ejecutarOperacionCuantitativa(datos, dependencias, {
      nombreMetodo: 'registrarSalidaValorizada',
      calcularHash: calcularHashSalidaCuantitativa,
      preparar: prepararOperacionSalidaInventario,
      confirmar: confirmarOperacionSalidaInventario,
    });
  },
};
