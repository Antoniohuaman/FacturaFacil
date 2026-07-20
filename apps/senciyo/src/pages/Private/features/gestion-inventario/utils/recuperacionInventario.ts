// gestion-inventario/utils/recuperacionInventario.ts
//
// Recuperación tras interrupción (§12 del encargo de Etapa 1B). Cruza SIEMPRE las tres entidades
// —OperacionIdempotenteInventario, TransaccionInventario, EstadoVersionInventario— y el estado
// real de las claves afectadas antes de decidir cualquier cosa; nunca evalúa la transacción sola.
//
// ALCANCE deliberado, documentado explícitamente (no un olvido):
//
// 1. Una operación `preparada` SIN ningún intento (caso A) NUNCA se marca `fallida`
//    automáticamente (Bloqueante 1 de la revisión de Etapa 1B): la reserva de idempotencia
//    (`idempotenciaInventario.ts`) y la creación del intento activo (`unidadTrabajoInventario.ts`)
//    ocurren en ciclos de bloqueo SEPARADOS — entre ambos, la operación está legítimamente
//    `preparada` sin transacción, y nada en el registro permite distinguir "abandonada" de
//    "reservada hace un instante, su unidad de trabajo llegará enseguida" sin recurrir a un
//    umbral de tiempo arbitrario (prohibido). Este caso se DIAGNOSTICA (acción
//    `reserva_sin_transaccion_diagnosticada`) y se conserva intacto — nunca se destruye una
//    reserva legítima. Una vez que existe un intento (transacción), la ambigüedad desaparece: la
//    transacción es evidencia objetiva de que algún ciclo de bloqueo anterior llegó a crearla y ya
//    liberó el bloqueo (con éxito o con una caída), así que los casos B/C/D/E SÍ se resuelven.
//
// 2. No vuelve a comparar `datosPropuestos` contra el contenido ACTUAL de sus claves para
//    operaciones `confirmada` ya estables (dentro de la verificación estructural del caso F/G):
//    esas claves legítimamente siguen cambiando por operaciones confirmadas posteriores (p. ej. el
//    stock de un producto cambia con cada venta futura), así que compararlas detectaría el paso
//    normal del tiempo, no una inconsistencia real. Sí se verifica la COHERENCIA ESTRUCTURAL entre
//    la operación y su último intento (FK, hash, resultadoIds, fechas, versión) — eso nunca
//    depende de mutaciones futuras de claves de dominio.
//
// 3. Los huérfanos (caso H) se auditan en CUALQUIER estado, no solo trabajo pendiente (Bloqueante
//    3, §4.6 de la revisión) — una transacción sin operación asociada es siempre una
//    inconsistencia real, sin importar cuán antigua sea.
//
// Es idempotente: una vez que una operación deja `preparada` con un intento resuelto, una segunda
// ejecución no encuentra nada pendiente que tocar; el incremento de versión se protege con
// `versionEsperada`/`versionResultante` persistidos en la propia transacción (Bloqueante 3).

import type { OperacionIdempotenteInventario } from '../models/operacionIdempotenteInventario.types';
import type { EscrituraPlanificadaInventario } from '../models/planUnidadTrabajoInventario.types';
import type { TransaccionInventario } from '../models/transaccionInventario.types';
import {
  enlazarOperacionConTransaccionActiva,
  listarOperacionesIdempotentesPorEmpresa,
  marcarOperacionConfirmada,
  marcarOperacionFallida,
} from '../repositories/operacionIdempotenteInventario.repository';
import {
  listarTransaccionesInventarioPorEmpresa,
  marcarTransaccionConfirmada,
  marcarTransaccionFallida,
  obtenerTransaccionActivaPorOperacionIdempotenteId,
  obtenerUltimoIntentoPorOperacionIdempotenteId,
} from '../repositories/transaccionInventario.repository';
import {
  actualizarEstadoVersionInventario,
  obtenerEstadoVersionInventario,
} from '../repositories/estadoVersionInventario.repository';
import { InconsistenciaDiarioInventario } from './erroresInventario';
import { aplicarEscrituraPlanificada } from './escrituraLocalStorageInventario';

export type AccionRecuperacionOperacion =
  | 'reserva_sin_transaccion_diagnosticada' // caso A — diagnóstico, nunca destructivo
  | 'transaccion_preparada_marcada_fallida' // caso B
  | 'escrituras_pendientes_completadas' // caso C
  | 'cierre_pendiente_completado' // caso D / ventana recuperable confirmada+confirmando
  | 'transaccion_fallida_cerrada'; // caso E

export interface ResultadoRecuperacionOperacion {
  operacionId: string;
  clave: string;
  accion: AccionRecuperacionOperacion;
}

export interface ResultadoRecuperacionInventario {
  empresaId: string;
  operacionesRecuperadas: ResultadoRecuperacionOperacion[];
}

function escriturasDeTransaccion(
  empresaId: string,
  transaccion: TransaccionInventario
): EscrituraPlanificadaInventario[] {
  return transaccion.clavesAfectadas.map((clave) => {
    if (!(clave in transaccion.datosAnteriores) || !(clave in transaccion.datosPropuestos)) {
      throw new InconsistenciaDiarioInventario({
        empresaId,
        mensaje: `recuperacionInventario: la clave "${clave}" está declarada en clavesAfectadas de la transacción "${transaccion.id}" pero falta en datosAnteriores o datosPropuestos.`,
        transaccionId: transaccion.id,
        operacionIdempotenteId: transaccion.operacionIdempotenteId,
        clavesInconsistentes: [clave],
      });
    }
    return {
      clave,
      valorAnterior: transaccion.datosAnteriores[clave],
      valorPropuesto: transaccion.datosPropuestos[clave],
    };
  });
}

/**
 * Incrementa EstadoVersionInventario usando `versionEsperada`/`versionResultante` PERSISTIDOS en
 * la propia transacción (Bloqueante 3) — nunca "vigente + 1" calculado a ciegas:
 * - vigente === versionResultante y la produjo ESTA transacción: ya aplicada, no se repite.
 * - vigente === versionEsperada: CAS hacia versionResultante.
 * - cualquier otro caso: no puede demostrarse que sea seguro incrementar — se detiene.
 */
function asegurarVersionReflejaTransaccion(empresaId: string, transaccion: TransaccionInventario, fechaActual: () => string): void {
  const estadoActual = obtenerEstadoVersionInventario(empresaId);
  const versionVigente = estadoActual?.versionInventario ?? 0;

  if (versionVigente === transaccion.versionResultante && estadoActual?.ultimaTransaccionId === transaccion.id) {
    return;
  }
  if (versionVigente === transaccion.versionEsperada) {
    actualizarEstadoVersionInventario({
      empresaId,
      versionEsperada: transaccion.versionEsperada,
      nuevaVersion: transaccion.versionResultante,
      ultimaTransaccionId: transaccion.id,
      fechaActualizacion: fechaActual(),
    });
    return;
  }
  throw new InconsistenciaDiarioInventario({
    empresaId,
    mensaje: `recuperacionInventario: la versión vigente de Inventario (${versionVigente}) no permite determinar de forma segura si la transacción "${transaccion.id}" (versionEsperada=${transaccion.versionEsperada}, versionResultante=${transaccion.versionResultante}) ya fue contabilizada — nunca se incrementa a ciegas.`,
    transaccionId: transaccion.id,
    operacionIdempotenteId: transaccion.operacionIdempotenteId,
  });
}

/** Aplica cada escritura pendiente de una transacción `confirmando` (o revisa que ya estén aplicadas), deteniéndose ante cualquier drift — nunca recalcula el plan. */
function completarEscriturasTransaccion(empresaId: string, transaccion: TransaccionInventario): void {
  const contexto = { empresaId, transaccionId: transaccion.id, operacionIdempotenteId: transaccion.operacionIdempotenteId };
  for (const escritura of escriturasDeTransaccion(empresaId, transaccion)) {
    aplicarEscrituraPlanificada(contexto, escritura);
  }
}

/** Cierra el par operación+transacción como `confirmada`, de forma idempotente (nunca repite una transición ya aplicada). */
function confirmarOperacionYTransaccionActiva(
  empresaId: string,
  operacion: OperacionIdempotenteInventario,
  transaccion: TransaccionInventario,
  fechaActual: () => string
): void {
  asegurarVersionReflejaTransaccion(empresaId, transaccion, fechaActual);

  if (operacion.estado !== 'confirmada') {
    if (operacion.transaccionInventarioId !== transaccion.id) {
      enlazarOperacionConTransaccionActiva(empresaId, operacion.id, transaccion.id);
    }
    marcarOperacionConfirmada(empresaId, operacion.id, {
      transaccionId: transaccion.id,
      resultadoIds: transaccion.resultadoIds,
      fechaConfirmacion: fechaActual(),
    });
  }
  if (transaccion.estado !== 'confirmada') {
    marcarTransaccionConfirmada(empresaId, transaccion.id, { fechaConfirmacion: fechaActual() });
  }
}

/**
 * Resuelve UNA operación `preparada` según la matriz A-E del encargo, usando el intento ACTIVO
 * (si existe) o, en su ausencia, el ÚLTIMO intento histórico.
 */
function resolverCombinacionOperacionPreparada(
  empresaId: string,
  operacion: OperacionIdempotenteInventario,
  fechaActual: () => string
): AccionRecuperacionOperacion {
  const activo = obtenerTransaccionActivaPorOperacionIdempotenteId(empresaId, operacion.id);

  if (activo) {
    if (activo.estado === 'preparada') {
      // Caso B: el dominio nunca empezó a escribirse.
      marcarTransaccionFallida(empresaId, activo.id);
      marcarOperacionFallida(empresaId, operacion.id);
      return 'transaccion_preparada_marcada_fallida';
    }
    // activo.estado === 'confirmando' — Caso C: revisa cada clave (ya aplicada / pendiente / drift) y completa el MISMO intento.
    completarEscriturasTransaccion(empresaId, activo);
    confirmarOperacionYTransaccionActiva(empresaId, operacion, activo, fechaActual);
    return 'escrituras_pendientes_completadas';
  }

  const ultimo = obtenerUltimoIntentoPorOperacionIdempotenteId(empresaId, operacion.id);
  if (!ultimo) {
    // Caso A: ver nota de alcance al inicio del archivo — nunca se resuelve automáticamente.
    return 'reserva_sin_transaccion_diagnosticada';
  }

  if (ultimo.estado === 'confirmada') {
    // Caso D: las escrituras ya se aplicaron — solo falta cerrar versión/operación.
    confirmarOperacionYTransaccionActiva(empresaId, operacion, ultimo, fechaActual);
    return 'cierre_pendiente_completado';
  }

  if (ultimo.estado === 'fallida') {
    // Caso E: por invariante de transición, una transacción `fallida` NUNCA aplicó escrituras de
    // dominio (el único camino a `fallida` es preparada→fallida, antes de `confirmando`) — la
    // operación quedó `preparada` porque el proceso murió entre marcar la transacción fallida y
    // marcar la operación fallida (§11 paso 11); solo falta cerrar la operación.
    if (ultimo.resultadoIds.length > 0) {
      throw new InconsistenciaDiarioInventario({
        empresaId,
        mensaje: `recuperacionInventario: la transacción "${ultimo.id}" está 'fallida' pero conserva resultadoIds no vacíos — viola el invariante de que una transacción fallida nunca aplicó escrituras.`,
        transaccionId: ultimo.id,
        operacionIdempotenteId: operacion.id,
      });
    }
    marcarOperacionFallida(empresaId, operacion.id);
    return 'transaccion_fallida_cerrada';
  }

  throw new InconsistenciaDiarioInventario({
    empresaId,
    mensaje: `recuperacionInventario: la operación "${operacion.id}" sigue 'preparada' pero su último intento "${ultimo.id}" ya está '${ultimo.estado}' — combinación de estados que no puede resolverse automáticamente.`,
    transaccionId: ultimo.id,
    operacionIdempotenteId: operacion.id,
  });
}

function mismosResultadoIdsEnOrden(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((valor, indice) => valor === b[indice]);
}

/**
 * Verifica la COHERENCIA ESTRUCTURAL entre una operación `confirmada` y su último intento (§4.5 de
 * la revisión de Etapa 1B) — nunca compara contra el contenido actual de las claves de dominio
 * (ver nota de alcance #2 al inicio del archivo). Sin acción si todo coincide (caso F, estable).
 */
function verificarOperacionConfirmadaEstable(
  empresaId: string,
  operacion: OperacionIdempotenteInventario,
  ultimo: TransaccionInventario | undefined
): void {
  if (!ultimo || ultimo.estado !== 'confirmada') {
    throw new InconsistenciaDiarioInventario({
      empresaId,
      mensaje: `recuperacionInventario: la operación "${operacion.id}" está 'confirmada' pero su último intento ${ultimo ? `está en estado "${ultimo.estado}"` : 'no existe'} — combinación de estados que no puede resolverse automáticamente.`,
      transaccionId: ultimo?.id,
      operacionIdempotenteId: operacion.id,
    });
  }

  const camposInconsistentes: string[] = [];
  if (operacion.transaccionInventarioId !== ultimo.id) camposInconsistentes.push('transaccionInventarioId');
  if (operacion.clave !== ultimo.claveIdempotencia) camposInconsistentes.push('clave/claveIdempotencia');
  if (operacion.tipoOperacion !== ultimo.tipoOperacion) camposInconsistentes.push('tipoOperacion');
  if (operacion.hashEntrada !== ultimo.hashEntrada) camposInconsistentes.push('hashEntrada');
  if (!mismosResultadoIdsEnOrden(operacion.resultadoIds, ultimo.resultadoIds)) camposInconsistentes.push('resultadoIds');
  if (!operacion.fechaConfirmacion) camposInconsistentes.push('operacion.fechaConfirmacion');
  if (!ultimo.fechaConfirmacion) camposInconsistentes.push('transaccion.fechaConfirmacion');

  const estadoVersion = obtenerEstadoVersionInventario(empresaId);
  const versionVigente = estadoVersion?.versionInventario ?? 0;
  if (versionVigente < ultimo.versionResultante) camposInconsistentes.push('EstadoVersionInventario por debajo de versionResultante');

  if (camposInconsistentes.length > 0) {
    throw new InconsistenciaDiarioInventario({
      empresaId,
      mensaje: `recuperacionInventario: la operación "${operacion.id}" y su transacción "${ultimo.id}" (ambas 'confirmada') tienen campos incoherentes: ${camposInconsistentes.join(', ')}.`,
      transaccionId: ultimo.id,
      operacionIdempotenteId: operacion.id,
      clavesInconsistentes: camposInconsistentes,
    });
  }
}

/**
 * Recupera todo el trabajo pendiente de una empresa (§12). Lanza `InconsistenciaDiarioInventario`
 * y NO modifica nada más ante cualquier combinación que no pueda resolver de forma determinista —
 * nunca "elige la primera" transacción ni oculta el problema reordenando datos.
 */
export function recuperarTransaccionesInterrumpidas(empresaId: string, fechaActual: () => string): ResultadoRecuperacionInventario {
  const operaciones = listarOperacionesIdempotentesPorEmpresa(empresaId);
  const transacciones = listarTransaccionesInventarioPorEmpresa(empresaId);

  // Caso H: una transacción que no corresponde a ninguna operación existente es una
  // inconsistencia real, sin importar su estado ni su antigüedad — nunca se inventa la operación
  // faltante ni se borra la transacción huérfana.
  const idsOperacionesConocidas = new Set(operaciones.map((o) => o.id));
  const idsOperacionesConTransaccion = new Set(transacciones.map((t) => t.operacionIdempotenteId));
  for (const operacionId of idsOperacionesConTransaccion) {
    if (!idsOperacionesConocidas.has(operacionId)) {
      const cantidad = transacciones.filter((t) => t.operacionIdempotenteId === operacionId).length;
      throw new InconsistenciaDiarioInventario({
        empresaId,
        mensaje: `recuperacionInventario: existe(n) ${cantidad} transacción(es) para la operación idempotente "${operacionId}", que no existe en la empresa "${empresaId}" — transacción huérfana, no se puede resolver automáticamente.`,
        operacionIdempotenteId: operacionId,
      });
    }
  }

  const resultados: ResultadoRecuperacionOperacion[] = [];

  for (const operacion of operaciones) {
    if (operacion.estado === 'preparada') {
      const accion = resolverCombinacionOperacionPreparada(empresaId, operacion, fechaActual);
      resultados.push({ operacionId: operacion.id, clave: operacion.clave, accion });
      continue;
    }

    if (operacion.estado === 'confirmada') {
      const activo = obtenerTransaccionActivaPorOperacionIdempotenteId(empresaId, operacion.id);
      if (activo?.estado === 'confirmando') {
        // Ventana recuperable, NO una inconsistencia: la unidad de trabajo confirma la operación
        // (paso 18) ANTES que la transacción (paso 19) — si el proceso muere justo entre ambos
        // pasos, esta es exactamente la combinación que queda.
        completarEscriturasTransaccion(empresaId, activo);
        confirmarOperacionYTransaccionActiva(empresaId, operacion, activo, fechaActual);
        resultados.push({ operacionId: operacion.id, clave: operacion.clave, accion: 'cierre_pendiente_completado' });
        continue;
      }
      if (activo) {
        // activo.estado === 'preparada' mientras la operación ya está 'confirmada': imposible en un flujo sano.
        throw new InconsistenciaDiarioInventario({
          empresaId,
          mensaje: `recuperacionInventario: la operación "${operacion.id}" está 'confirmada' pero tiene un intento "${activo.id}" todavía 'preparada' — combinación de estados que no puede resolverse automáticamente.`,
          transaccionId: activo.id,
          operacionIdempotenteId: operacion.id,
        });
      }
      const ultimo = obtenerUltimoIntentoPorOperacionIdempotenteId(empresaId, operacion.id);
      verificarOperacionConfirmadaEstable(empresaId, operacion, ultimo);
      // Caso F: estable — sin acción.
    }
  }

  return { empresaId, operacionesRecuperadas: resultados };
}
