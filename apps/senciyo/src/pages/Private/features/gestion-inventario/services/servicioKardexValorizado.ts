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
import type { DatosTransferenciaInventario } from '../models/operacionTransferenciaInventario.types';
import type { DatosReversoInventario, DatosAnulacionDocumentoInventario } from '../models/operacionReversoInventario.types';
import type {
  OperacionIdempotenteInventario,
  ReferenciaDocumentoTipoOperacionIdempotente,
  TipoOperacionIdempotenteInventario,
} from '../models/operacionIdempotenteInventario.types';
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
import {
  validarContratoTransferencia,
  calcularHashTransferencia,
  prepararOperacionTransferencia,
  confirmarOperacionTransferencia,
} from '../utils/transferenciaCuantitativaInventario';
import {
  validarContratoReverso,
  calcularHashReverso,
  prepararReverso,
  confirmarReverso,
  validarContratoAnulacion,
  calcularHashAnulacion,
  prepararAnulacion,
  confirmarAnulacion,
} from '../utils/reversoCuantitativoInventario';
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
  /**
   * Punto ÚNICO de activación de la variante valorizada de transferencias/reversos (Etapa 1E,
   * cierre final §1). Deliberadamente NO es un feature flag global ni se deriva de la presencia
   * de `CapaCostoInventario` — es una dependencia de TENANT explícita, igual que
   * `permitirStockNegativo`, que el llamador debe fijar a `true` a propósito. Ausente/`false` (el
   * default en todo consumidor productivo hoy) fuerza el camino cuantitativo puro, exactamente
   * igual que si no existiera ninguna capa — aunque la empresa ya tenga capas creadas por otra
   * vía, nunca cambian el comportamiento productivo por sí solas. Reservado para que la Etapa 2
   * conecte aquí la fuente de verdad real (configuración de la empresa) sin tocar el motor; los
   * tests de la variante valorizada son los ÚNICOS llamadores que hoy fijan `true`.
   */
  valorizacionHabilitada?: boolean;
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

/** Campos mínimos que CUALQUIER contrato de operación de Inventario debe tener para pasar por la orquestación genérica — entrada/salida, transferencia, reverso y anulación los satisfacen todos. */
interface ContratoOperacionInventarioBase {
  empresaId: string;
  claveIdempotencia: string;
  tipoOperacion: TipoOperacionIdempotenteInventario;
}

/** La identidad "de documento" no tiene el mismo nombre de campo en todos los contratos (`documentoId` en entrada/salida, `transferenciaId` en transferencia, `movimientoId` en reverso) — cada motor de dirección aporta su propio extractor en vez de forzar un nombre de campo común. */
interface IdentidadOperacionInventario {
  documentoId: string;
  tipoDocumento: ReferenciaDocumentoTipoOperacionIdempotente;
}

interface ParametrosPreparar<T extends ContratoOperacionInventarioBase> {
  datos: T;
  operacionReservada: OperacionIdempotenteInventario;
  hashEntrada: string;
  versionEsperada: number;
  productosRaw: string | null;
  movimientosRaw: string | null;
  almacenes: ReadonlyMap<string, Almacen>;
  generarId: () => string;
  permitirStockNegativo?: boolean;
  valorizacionHabilitada?: boolean;
}

interface ResultadoPreparar {
  plan: PlanUnidadTrabajoInventario;
  movimientosGenerados: MovimientoStock[];
  productosActualizados: Product[];
}

interface FuncionesMotorInventario<T extends ContratoOperacionInventarioBase> {
  nombreMetodo: string;
  obtenerIdentidad: (datos: T) => IdentidadOperacionInventario;
  validarContrato: (datos: T) => void;
  calcularHash: (datos: T) => Promise<string>;
  preparar: (params: ParametrosPreparar<T>) => ResultadoPreparar;
  confirmar: (documentoId: string, plan: PlanUnidadTrabajoInventario, fechaActual: () => string) => Promise<{ documentoId: string; resultadoIds: string[]; transaccionId: string }>;
}

/**
 * Orquestación única (Etapa 1D, §10; generalizada en Etapa 1E, §2/§5: "reutilizar exactamente la
 * cadena ya aprobada") para CUALQUIER operación de Inventario — entrada, salida, transferencia,
 * reverso o anulación: validar contrato → hash → reservar → resolver ambigua/repetida → preparar
 * (protegida por `marcarOperacionFallida`) → confirmar. Nunca se duplica en cada consumidor ni en
 * cada dirección/operación. Genérica sobre `T` (el contrato específico) — cada motor de
 * dirección aporta su propio `validarContrato`/`obtenerIdentidad`/`calcularHash`/`preparar`/
 * `confirmar`, nunca la orquestación misma.
 */
async function ejecutarOperacionInventario<T extends ContratoOperacionInventarioBase>(
  datos: T,
  dependencias: DependenciasOperacionCuantitativa,
  funciones: FuncionesMotorInventario<T>
): Promise<ResultadoOperacionCuantitativa> {
  // Validación PURA del contrato: no depende de ningún snapshot, así que es segura de ejecutar
  // antes de reservar. La validación FUNCIONAL (producto/almacén existen, stock resultante) sí
  // depende del estado externo y por eso NO se adelanta aquí.
  funciones.validarContrato(datos);

  const { documentoId, tipoDocumento } = funciones.obtenerIdentidad(datos);
  const hashEntrada = await funciones.calcularHash(datos);

  const resultadoReserva = await reservarOperacionIdempotente({
    empresaId: datos.empresaId,
    clave: datos.claveIdempotencia,
    tipoOperacion: datos.tipoOperacion,
    hashEntrada,
    referenciaDocumentoId: documentoId,
    referenciaDocumentoTipo: tipoDocumento,
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
      documentoId,
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
      valorizacionHabilitada: dependencias.valorizacionHabilitada,
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

  const resultadoConfirmacion = await funciones.confirmar(documentoId, plan, dependencias.fechaActual);

  return {
    documentoId,
    estado: resultadoReserva.tipo,
    resultadoIds: resultadoConfirmacion.resultadoIds,
    movimientos: movimientosGenerados,
    productosActualizados,
  };
}

function obtenerIdentidadOperacionCuantitativa(datos: DatosOperacionCuantitativa): IdentidadOperacionInventario {
  return { documentoId: datos.documentoId, tipoDocumento: datos.tipoDocumento };
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
    return ejecutarOperacionInventario(datos, dependencias, {
      nombreMetodo: 'registrarEntradaValorizada',
      obtenerIdentidad: obtenerIdentidadOperacionCuantitativa,
      validarContrato,
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
    return ejecutarOperacionInventario(datos, dependencias, {
      nombreMetodo: 'registrarSalidaValorizada',
      obtenerIdentidad: obtenerIdentidadOperacionCuantitativa,
      validarContrato,
      calcularHash: calcularHashSalidaCuantitativa,
      preparar: prepararOperacionSalidaInventario,
      confirmar: confirmarOperacionSalidaInventario,
    });
  },

  /**
   * Registra una transferencia de stock entre almacenes (Etapa 1E) como UNA sola operación:
   * disminución en origen + aumento en destino + movimiento SALIDA + movimiento ENTRADA +
   * (si el almacén origen tiene capas de costo disponibles para el producto) consumo FIFO de
   * capas en origen y creación de capas equivalentes en destino — todo en el MISMO
   * `PlanUnidadTrabajoInventario`. Nunca confirma primero la salida y después la entrada.
   */
  transferirStockValorizado(
    datos: DatosTransferenciaInventario,
    dependencias: DependenciasOperacionCuantitativa
  ): Promise<ResultadoOperacionCuantitativa> {
    return ejecutarOperacionInventario(datos, dependencias, {
      nombreMetodo: 'transferirStockValorizado',
      obtenerIdentidad: (d) => ({ documentoId: d.transferenciaId, tipoDocumento: d.tipoDocumento }),
      validarContrato: validarContratoTransferencia,
      calcularHash: calcularHashTransferencia,
      preparar: prepararOperacionTransferencia,
      confirmar: confirmarOperacionTransferencia,
    });
  },

  /**
   * Revierte UN movimiento original confirmado (entrada, salida, o — si el movimiento pertenece a
   * una transferencia — ambos legs atómicamente) mediante un movimiento NUEVO de reverso: nunca
   * edita ni elimina el original, nunca recalcula con catálogo/stock/costo actual. Rechaza toda la
   * operación si el movimiento no existe, es de otra empresa, ya fue revertido, o su historial de
   * capas/consumos no permite restaurarlo con seguridad (Etapa 1E, §5-§8).
   */
  revertirMovimientoValorizado(
    datos: DatosReversoInventario,
    dependencias: DependenciasOperacionCuantitativa
  ): Promise<ResultadoOperacionCuantitativa> {
    return ejecutarOperacionInventario(datos, dependencias, {
      nombreMetodo: 'revertirMovimientoValorizado',
      obtenerIdentidad: (d) => ({ documentoId: d.movimientoId, tipoDocumento: d.tipoDocumento }),
      validarContrato: validarContratoReverso,
      calcularHash: calcularHashReverso,
      preparar: prepararReverso,
      confirmar: confirmarReverso,
    });
  },

  /**
   * Anula un documento comercial completo (Etapa 1E, §9) revirtiendo TODOS sus movimientos
   * originales confirmados en un solo plan: se validan todos antes de escribir, se confirman una
   * sola vez — si una línea no puede revertirse, no se revierte ninguna. Nunca llama
   * `revertirMovimientoValorizado` repetidamente con persistencia por línea.
   */
  anularDocumentoValorizado(
    datos: DatosAnulacionDocumentoInventario,
    dependencias: DependenciasOperacionCuantitativa
  ): Promise<ResultadoOperacionCuantitativa> {
    return ejecutarOperacionInventario(datos, dependencias, {
      nombreMetodo: 'anularDocumentoValorizado',
      obtenerIdentidad: (d) => ({ documentoId: d.documentoId, tipoDocumento: mapearAReferenciaDocumento(d.tipoDocumentoOrigen) }),
      validarContrato: validarContratoAnulacion,
      calcularHash: calcularHashAnulacion,
      preparar: prepararAnulacion,
      confirmar: confirmarAnulacion,
    });
  },
};

/** `TipoDocumentoOrigenMovimiento` y `ReferenciaDocumentoTipoOperacionIdempotente` se solapan para todo origen realmente anulable por este motor (nota_ingreso, nota_salida, ajuste, venta, transferencia) — 'nota_credito'/'migracion' (los únicos valores no compartidos) nunca llegan aquí porque están fuera del alcance de Etapa 1E. */
function mapearAReferenciaDocumento(tipo: DatosAnulacionDocumentoInventario['tipoDocumentoOrigen']): ReferenciaDocumentoTipoOperacionIdempotente {
  if (tipo === 'nota_credito' || tipo === 'migracion') {
    throw new Error(`ServicioKardexValorizado.anularDocumentoValorizado: tipoDocumentoOrigen "${tipo}" no está soportado por el motor de anulación de Etapa 1E.`);
  }
  return tipo;
}
