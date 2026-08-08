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
import type { DatosImportacionCuantitativa } from '../models/operacionImportacionInventario.types';
import type {
  OperacionIdempotenteInventario,
  ReferenciaDocumentoTipoOperacionIdempotente,
  TipoOperacionIdempotenteInventario,
} from '../models/operacionIdempotenteInventario.types';
import type { PlanUnidadTrabajoInventario } from '../models/planUnidadTrabajoInventario.types';
import { reservarOperacionIdempotente } from '../utils/idempotenciaInventario';
import {
  validarContrato as validarContratoEntrada,
  calcularHashEntradaCuantitativa,
  prepararOperacionInventario,
  confirmarOperacionInventario,
} from '../utils/entradaCuantitativaInventario';
import {
  validarContrato as validarContratoSalida,
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
import {
  validarContratoImportacion,
  calcularHashImportacion,
  prepararOperacionImportacion,
  confirmarOperacionImportacion,
} from '../utils/importacionCuantitativaInventario';
import { marcarOperacionFallida } from '../repositories/operacionIdempotenteInventario.repository';
import { obtenerVersionInventarioActual } from '../repositories/estadoVersionInventario.repository';
import { PRODUCT_STORAGE_KEY } from '../../catalogo-articulos/utils/catalogStorage';
import { STORAGE_KEY_MOVEMENTS } from '../repositories/stock.repository';
import { lsKey } from '../../../../../shared/tenant';
import type { EstadoActivacionValorizacion } from '../models/estadoActivacionValorizacion.types';
import { resolverModoOperacion, resolverModoInventario } from '../utils/estadoActivacionValorizacionInventario';
import {
  invalidarLoteValorizacionInicialSiAfectado,
  drenarInvalidacionesPendientes,
} from '../utils/invalidacionValorizacionInicial';
import { encolarInvalidacionPendiente } from '../repositories/invalidacionPendienteValorizacionInicial.repository';

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
  /**
   * Estado de activación de valorización de la EMPRESA (Etapa 2, §24.1ter) — dependencia de
   * TENANT, nunca de documento. OBLIGATORIO desde el cierre de Etapa 2 (bloqueante 1 de la
   * revisión): ningún consumidor productivo puede omitirlo — TypeScript rechaza la llamada en
   * tiempo de compilación, y `ejecutarOperacionInventario` lo resuelve con
   * `resolverModoOperacion` ANTES de reservar para decidir si la mutación se permite. Ya no existe
   * un fallback silencioso a `'no_iniciada'`: la fuente real de configuración
   * (`PreferenciasInventario.estadoValorizacion`, ContextoConfiguracion.tsx) debe leerse y pasarse
   * explícitamente en cada llamada. Se usa para: (a) bloquear TODA mutación cuando el modo resuelto
   * es `'bloqueado_snapshot_aprobado'`/`'bloqueado_activacion_en_curso'`/`'bloqueado_suspension'`;
   * (b) exigir el contrato valorizado cuando el modo resuelto es `'valorizado_exclusivo'`
   * (inalcanzable en Etapa 2, solo ejercido por tests); (c) invalidar el detalle del lote de
   * valorización inicial afectado por esta operación cuando el modo resuelto es
   * `'cuantitativo_invalida_snapshot'` (`en_preparacion`/`pendiente_costos`).
   */
  estadoValorizacion: EstadoActivacionValorizacion;
  /**
   * Switch maestro de control de existencias (`SalesPreferences.controlStockActivo`) — dependencia
   * de TENANT, OBLIGATORIA igual que `estadoValorizacion` desde la centralización del modo de
   * inventario. Antes de este campo el motor solo conocía el estado de valorización: Compras/NI
   * podían mover stock con el Inventario apagado porque `resolverModoOperacion('no_iniciada')`
   * siempre resolvía `'cuantitativo_libre'`, sin importar el switch maestro (H-1,
   * docs/AUDITORIA_FLUJO_ACTIVACION_VALORIZACION_INVENTARIO_2026-08-05.md).
   * `ejecutarOperacionInventario` resuelve `resolverModoInventario(controlStockActivo,
   * estadoValorizacion)` ANTES de reservar y bloquea toda mutación cuando el modo es `'inactivo'`.
   */
  controlStockActivo: boolean;
  /**
   * Moneda base de la empresa (Etapa 2) — requerida únicamente cuando se registra una entrada en
   * modo `'valorizado'` (crea `CapaCostoInventario`). Ausente en todo consumidor cuantitativo.
   */
  monedaBase?: string;
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
  monedaBase?: string;
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

  // Modo de inventario centralizado (fix H-1): se resuelve ANTES que la máquina de estados de
  // valorización porque el switch maestro manda sobre CUALQUIER estado de valorización — con el
  // Inventario apagado no se mueve stock ni se crean capas, sin excepción.
  const modoInventario = resolverModoInventario(dependencias.controlStockActivo, dependencias.estadoValorizacion);
  if (modoInventario === 'inactivo') {
    throw new Error(
      `ServicioKardexValorizado.${funciones.nombreMetodo}: el Inventario está inactivo para la empresa "${datos.empresaId}" (controlStockActivo=false) — ninguna mutación de stock puede ejecutarse mientras el modo de inventario resuelto sea "inactivo".`
    );
  }

  // Máquina de estados de activación de valorización (Etapa 2, cierre de bloqueante 1 de la
  // revisión): se resuelve SIEMPRE, ANTES de reservar — ninguna llamada directa al motor puede
  // evadir esta puerta. `dependencias.estadoValorizacion` ya es obligatorio en el tipo (sin
  // fallback silencioso), así que este `resolverModoOperacion` es la ÚNICA fuente de la decisión de
  // permitir o rechazar la mutación.
  const modoResuelto = resolverModoOperacion(dependencias.estadoValorizacion);
  if (
    modoResuelto === 'bloqueado_snapshot_aprobado' ||
    modoResuelto === 'bloqueado_activacion_en_curso' ||
    modoResuelto === 'bloqueado_suspension'
  ) {
    throw new Error(
      `ServicioKardexValorizado.${funciones.nombreMetodo}: el estado de activación de valorización de la empresa "${datos.empresaId}" ("${dependencias.estadoValorizacion}") bloquea toda mutación de inventario (modo resuelto: "${modoResuelto}") — la operación se rechaza antes de reservar.`
    );
  }
  if (modoResuelto === 'valorizado_exclusivo') {
    const contratoYaValorizado = 'modoOperacion' in datos && (datos as unknown as { modoOperacion?: unknown }).modoOperacion === 'valorizado';
    if (!contratoYaValorizado && !dependencias.valorizacionHabilitada) {
      throw new Error(
        `ServicioKardexValorizado.${funciones.nombreMetodo}: la empresa "${datos.empresaId}" está en modo "valorizado_exclusivo" — esta operación exige el contrato valorizado correspondiente, nunca el cuantitativo.`
      );
    }
  }

  // Reintenta cualquier invalidación de valorización inicial que quedó pendiente de un intento
  // previo fallido de ESTA empresa (bloqueante 1: "nunca best-effort silencioso") — idempotente, así
  // que ejecutarlo en cada operación nunca duplica efectos.
  drenarInvalidacionesPendientes(datos.empresaId, dependencias.fechaActual);

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
      monedaBase: dependencias.monedaBase,
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

  // Invalidación del lote de valorización inicial (Etapa 2, §8): centralizada aquí — el ÚNICO
  // choke point que ya atraviesan entrada/salida/transferencia/reverso/anulación — nunca llamada
  // manualmente desde cada pantalla. Solo se ejecuta tras una confirmación NUEVA real (nunca en un
  // replay idempotente, que retorna antes de este punto, ni tras una preparación fallida). La
  // mutación de stock YA se confirmó con éxito en este punto y nunca se revierte por un fallo de
  // invalidación — pero ese fallo tampoco se pierde en un `console.error` silencioso (bloqueante 1
  // de la revisión): se encola de forma durable e idempotente para reintentarse en la próxima
  // operación de esta empresa (`drenarInvalidacionesPendientes`, arriba) o al validar la
  // preparación, garantizando que nunca quede stock modificado con un detalle todavía confirmado.
  if (movimientosGenerados.length > 0) {
    const afectados = movimientosGenerados.map((m) => ({ productoId: m.productoId, almacenId: m.almacenId }));
    try {
      invalidarLoteValorizacionInicialSiAfectado(
        datos.empresaId,
        dependencias.estadoValorizacion,
        afectados,
        dependencias.fechaActual()
      );
    } catch (causaInvalidacion) {
      console.error(
        `ServicioKardexValorizado.${funciones.nombreMetodo}: no se pudo invalidar el lote de valorización inicial tras confirmar "${documentoId}" — se encola para reintento.`,
        causaInvalidacion
      );
      encolarInvalidacionPendiente({
        id: dependencias.generarId(),
        empresaId: datos.empresaId,
        afectados,
        fecha: dependencias.fechaActual(),
      });
    }
  }

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
      validarContrato: validarContratoEntrada,
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
      validarContrato: validarContratoSalida,
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

  /**
   * Importa un lote de stock desde archivo (Etapa 2, cierre de bloqueante 2 de la revisión): cada
   * línea trae su propia diferencia firmada (mixta entrada+salida) y se reserva/prepara/confirma
   * como UNA sola unidad de trabajo — nunca una confirmación por línea ni por dirección. Único
   * punto de entrada productivo para `PanelImportacionStock.tsx` — nunca un segundo importador.
   */
  importarStockValorizado(
    datos: DatosImportacionCuantitativa,
    dependencias: DependenciasOperacionCuantitativa
  ): Promise<ResultadoOperacionCuantitativa> {
    return ejecutarOperacionInventario(datos, dependencias, {
      nombreMetodo: 'importarStockValorizado',
      obtenerIdentidad: (d) => ({ documentoId: d.loteId, tipoDocumento: 'importacion' }),
      validarContrato: validarContratoImportacion,
      calcularHash: calcularHashImportacion,
      preparar: prepararOperacionImportacion,
      confirmar: confirmarOperacionImportacion,
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
