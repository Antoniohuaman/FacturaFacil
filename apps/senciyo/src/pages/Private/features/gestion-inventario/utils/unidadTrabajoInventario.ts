// gestion-inventario/utils/unidadTrabajoInventario.ts
//
// Unidad de trabajo recuperable (§11 del encargo de Etapa 1B). Ejecuta un `PlanUnidadTrabajoInventario`
// YA CALCULADO por un llamador futuro (Etapa 1C en adelante) — no calcula movimientos, capas ni
// consumos, no recalcula reglas de negocio, no decide qué escribir. Su única responsabilidad es
// aplicar ese plan de forma determinista y recuperable: reserva del bloqueo cooperativo por
// empresa, recuperación de trabajo pendiente, verificación de versión/estado base, escritura
// determinista y cierre coherente de las tres entidades (OperacionIdempotenteInventario,
// TransaccionInventario, EstadoVersionInventario).
//
// No hay "atomicidad real" — la garantía es: diario previo, escrituras deterministas, comparación
// anterior/propuesto, reproducción (replay), control de versión y detección explícita de
// inconsistencias (nunca reparación automática).

import type { PlanUnidadTrabajoInventario } from '../models/planUnidadTrabajoInventario.types';
import type { TransaccionInventario } from '../models/transaccionInventario.types';
import {
  enlazarOperacionConTransaccionActiva,
  marcarOperacionConfirmada,
  marcarOperacionFallida,
  obtenerOperacionIdempotentePorId,
} from '../repositories/operacionIdempotenteInventario.repository';
import {
  calcularSiguienteNumeroIntento,
  guardarTransaccionInventario,
  marcarTransaccionConfirmada,
  marcarTransaccionFallida,
  pasarTransaccionAConfirmando,
} from '../repositories/transaccionInventario.repository';
import {
  actualizarEstadoVersionInventario,
  obtenerVersionInventarioActual,
} from '../repositories/estadoVersionInventario.repository';
import { ConflictoIdempotencia, ConflictoVersionInventario, InconsistenciaDiarioInventario } from './erroresInventario';
import { aplicarEscrituraPlanificada, detectarDriftEscritura, verificarEscrituraAplicada } from './escrituraLocalStorageInventario';
import { crearEjecutorBloqueoInventario, type EjecutorBloqueoInventario } from './bloqueoInventario';
import { recuperarTransaccionesInterrumpidas } from './recuperacionInventario';

export interface ParametrosUnidadTrabajoInventario {
  plan: PlanUnidadTrabajoInventario;
  /** Fecha actual inyectable — nunca `new Date()` directo, para mantener la ejecución determinista y testeable. */
  fechaActual: () => string;
  /** Ejecutor de bloqueo inyectable (tests) — por defecto, el seleccionado automáticamente según el entorno. */
  ejecutarConBloqueo?: EjecutorBloqueoInventario;
}

export interface ResultadoUnidadTrabajoInventario {
  resultadoIds: string[];
  transaccionId: string;
}

function validarPlan(plan: PlanUnidadTrabajoInventario): void {
  if (!plan.empresaId.trim()) {
    throw new Error('unidadTrabajoInventario: el plan no trae empresaId.');
  }
  if (!plan.operacionIdempotenteId.trim()) {
    throw new Error('unidadTrabajoInventario: el plan no trae operacionIdempotenteId.');
  }
  if (!plan.claveIdempotencia.trim()) {
    throw new Error('unidadTrabajoInventario: el plan no trae claveIdempotencia.');
  }
  if (!plan.hashEntrada.trim()) {
    throw new Error('unidadTrabajoInventario: el plan no trae hashEntrada.');
  }
  if (!Number.isSafeInteger(plan.versionEsperada) || plan.versionEsperada < 0) {
    throw new Error(`unidadTrabajoInventario: versionEsperada inválida (${plan.versionEsperada}) — debe ser un entero seguro ≥ 0.`);
  }
  if (plan.versionEsperada >= Number.MAX_SAFE_INTEGER) {
    throw new Error(
      `unidadTrabajoInventario: versionEsperada (${plan.versionEsperada}) ya está en el límite de Number.MAX_SAFE_INTEGER — el incremento a versionResultante desbordaría. Se rechaza antes de crear la transacción.`
    );
  }

  const prefijoTenant = `${plan.empresaId}:`;
  const clavesVistas = new Set<string>();
  for (const escritura of plan.escrituras) {
    if (clavesVistas.has(escritura.clave)) {
      throw new Error(`unidadTrabajoInventario: la clave "${escritura.clave}" está duplicada dentro del plan — cada clave debe aparecer una sola vez.`);
    }
    clavesVistas.add(escritura.clave);
    if (!escritura.clave.startsWith(prefijoTenant)) {
      throw new Error(`unidadTrabajoInventario: la clave "${escritura.clave}" no pertenece al ámbito tenantizado de la empresa "${plan.empresaId}".`);
    }
  }
}

/**
 * Ejecuta el plan completo (§11, pasos 1-21). El bloqueo (paso 3) envuelve toda la secuencia y se
 * libera automáticamente al terminar, con éxito o con error (§9) — ver `bloqueoInventario.ts`.
 */
export async function ejecutarUnidadTrabajoInventario(
  params: ParametrosUnidadTrabajoInventario
): Promise<ResultadoUnidadTrabajoInventario> {
  const { plan, fechaActual } = params;
  validarPlan(plan);
  const ejecutarConBloqueo = params.ejecutarConBloqueo ?? crearEjecutorBloqueoInventario();
  return ejecutarConBloqueo(plan.empresaId, () => ejecutarPasosBajoBloqueo(plan, fechaActual));
}

async function ejecutarPasosBajoBloqueo(
  plan: PlanUnidadTrabajoInventario,
  fechaActual: () => string
): Promise<ResultadoUnidadTrabajoInventario> {
  // Paso 4: recuperación de trabajo pendiente de ESTA empresa, PRIMERO. Ya no necesita excluir la
  // propia operación del plan: el caso A (preparada sin ningún intento) nunca se resuelve
  // automáticamente en ningún llamador (Bloqueante 1 de la revisión) — recovery la deja intacta,
  // solo la diagnostica.
  recuperarTransaccionesInterrumpidas(plan.empresaId, fechaActual);

  // Paso 5: re-chequeo de la operación idempotente tras la recuperación.
  const operacion = obtenerOperacionIdempotentePorId(plan.operacionIdempotenteId, plan.empresaId);
  if (!operacion) {
    throw new Error(`unidadTrabajoInventario: la operación idempotente "${plan.operacionIdempotenteId}" no existe para la empresa "${plan.empresaId}".`);
  }

  if (operacion.estado === 'confirmada') {
    if (operacion.hashEntrada === plan.hashEntrada) {
      // Paso 6: reintento legítimo — cero escrituras nuevas, se devuelven los resultados previos.
      return { resultadoIds: operacion.resultadoIds, transaccionId: operacion.transaccionInventarioId as string };
    }
    // Paso 7: conflicto real de idempotencia.
    throw new ConflictoIdempotencia({
      empresaId: plan.empresaId,
      clave: plan.claveIdempotencia,
      hashExistente: operacion.hashEntrada,
      hashRecibido: plan.hashEntrada,
    });
  }

  if (operacion.estado !== 'preparada') {
    throw new Error(
      `unidadTrabajoInventario: la operación "${operacion.id}" ya no está en estado 'preparada' (estado actual="${operacion.estado}") — este plan quedó obsoleto, debe reservarse de nuevo antes de reintentar.`
    );
  }
  if (operacion.hashEntrada !== plan.hashEntrada) {
    throw new Error(
      `unidadTrabajoInventario: el hash de la operación "${operacion.id}" ("${operacion.hashEntrada}") no coincide con el del plan ("${plan.hashEntrada}") — el plan no corresponde a esta reserva.`
    );
  }

  // Paso 8: crear el intento en 'preparada', enlazado con operacionIdempotenteId. `numeroIntento`
  // se calcula como máximo histórico + 1 (nunca por posición en el arreglo, Bloqueante 2), y
  // `versionEsperada`/`versionResultante` se persisten desde ya (Bloqueante 3) — son inmutables.
  const numeroIntento = calcularSiguienteNumeroIntento(plan.empresaId, plan.operacionIdempotenteId);
  const datosAnteriores: Record<string, string | null> = {};
  const datosPropuestos: Record<string, string | null> = {};
  for (const escritura of plan.escrituras) {
    datosAnteriores[escritura.clave] = escritura.valorAnterior;
    datosPropuestos[escritura.clave] = escritura.valorPropuesto;
  }
  const transaccionPreparada: TransaccionInventario = {
    id: plan.id,
    empresaId: plan.empresaId,
    operacionIdempotenteId: plan.operacionIdempotenteId,
    numeroIntento,
    tipoOperacion: plan.tipoOperacion,
    claveIdempotencia: plan.claveIdempotencia,
    estado: 'preparada',
    hashEntrada: plan.hashEntrada,
    clavesAfectadas: plan.escrituras.map((escritura) => escritura.clave),
    datosAnteriores,
    datosPropuestos,
    versionEsperada: plan.versionEsperada,
    versionResultante: plan.versionEsperada + 1,
    resultadoIds: plan.resultadoIds,
    fechaPreparacion: fechaActual(),
    usuario: plan.usuario,
  };
  guardarTransaccionInventario(transaccionPreparada, plan.empresaId);

  // Paso 9: enlazar la operación con el intento recién creado.
  enlazarOperacionConTransaccionActiva(plan.empresaId, operacion.id, transaccionPreparada.id);

  // Pasos 10-11: releer versión vigente y verificar que cada clave preserve su estado base ANTES
  // de escribir cualquier dato de dominio.
  const versionVigente = obtenerVersionInventarioActual(plan.empresaId);
  const hayDriftDeVersion = versionVigente !== plan.versionEsperada;
  const clavesConDrift = plan.escrituras.filter((escritura) => detectarDriftEscritura(escritura)).map((e) => e.clave);

  if (hayDriftDeVersion || clavesConDrift.length > 0) {
    // Paso 11: no pasa por 'confirmando'; cero escrituras de dominio; cero incremento de versión.
    marcarTransaccionFallida(plan.empresaId, transaccionPreparada.id);
    marcarOperacionFallida(plan.empresaId, operacion.id);
    if (hayDriftDeVersion) {
      throw new ConflictoVersionInventario({ empresaId: plan.empresaId, versionEsperada: plan.versionEsperada, versionVigente });
    }
    throw new InconsistenciaDiarioInventario({
      empresaId: plan.empresaId,
      mensaje: `unidadTrabajoInventario: el estado base de una o más claves cambió antes de iniciar la confirmación de la transacción "${transaccionPreparada.id}".`,
      transaccionId: transaccionPreparada.id,
      operacionIdempotenteId: operacion.id,
      clavesInconsistentes: clavesConDrift,
    });
  }

  // Paso 12: transición a 'confirmando'.
  pasarTransaccionAConfirmando(plan.empresaId, transaccionPreparada.id);

  // Pasos 13-14: aplicar cada escritura en el orden determinista del plan. Si `localStorage`
  // falla o se detecta drift a mitad de lote, el error se propaga tal cual y la transacción queda
  // en 'confirmando' — nunca se marca falsamente 'fallida' sin posibilidad de recuperación (§11
  // paso 15); la próxima recuperación completará únicamente lo pendiente (ver recuperacionInventario.ts).
  const contexto = { empresaId: plan.empresaId, transaccionId: transaccionPreparada.id, operacionIdempotenteId: operacion.id };
  for (const escritura of plan.escrituras) {
    aplicarEscrituraPlanificada(contexto, escritura);
  }

  // Paso 16: releer y confirmar que TODAS las claves quedaron exactamente en el valor propuesto.
  const claveNoAplicada = plan.escrituras.find((escritura) => !verificarEscrituraAplicada(escritura));
  if (claveNoAplicada) {
    throw new InconsistenciaDiarioInventario({
      empresaId: plan.empresaId,
      mensaje: `unidadTrabajoInventario: la clave "${claveNoAplicada.clave}" no refleja el valor propuesto tras aplicar la transacción "${transaccionPreparada.id}".`,
      transaccionId: transaccionPreparada.id,
      operacionIdempotenteId: operacion.id,
      clavesInconsistentes: [claveNoAplicada.clave],
    });
  }

  // Paso 17: actualizar la versión de Inventario de forma segura (compare-and-set).
  actualizarEstadoVersionInventario({
    empresaId: plan.empresaId,
    versionEsperada: versionVigente,
    nuevaVersion: versionVigente + 1,
    ultimaTransaccionId: transaccionPreparada.id,
    fechaActualizacion: fechaActual(),
  });

  // Paso 18: confirmar la operación idempotente.
  const fechaConfirmacion = fechaActual();
  marcarOperacionConfirmada(plan.empresaId, operacion.id, {
    transaccionId: transaccionPreparada.id,
    resultadoIds: plan.resultadoIds,
    fechaConfirmacion,
  });

  // Paso 19: confirmar la transacción.
  marcarTransaccionConfirmada(plan.empresaId, transaccionPreparada.id, { fechaConfirmacion });

  // Paso 20 (liberar el bloqueo): lo hace el ejecutor de bloqueo que envuelve esta función.
  // Paso 21: resultado estructurado.
  return { resultadoIds: plan.resultadoIds, transaccionId: transaccionPreparada.id };
}
