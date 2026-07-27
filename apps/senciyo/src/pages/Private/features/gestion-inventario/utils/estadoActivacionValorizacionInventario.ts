// gestion-inventario/utils/estadoActivacionValorizacionInventario.ts
//
// Helpers puros de la máquina de estados de activación de valorización (Etapa 2, §24.1ter/§31.5).
// Reemplaza cualquier chequeo plano tipo `estado !== 'suspendida_por_inconsistencia'` — toda ruta de
// mutación del motor central (gestion-inventario/services/servicioKardexValorizado.ts) resuelve el
// modo de operación a través de `resolverModoOperacion`, nunca comparando el estado directamente.

import type { EstadoActivacionValorizacion, ModoOperacionInventario } from '../models/estadoActivacionValorizacion.types';

/**
 * Matriz completa 9 estados × modo (§24.1quater) — sin rama "default" que oculte un estado nuevo:
 * un estado no contemplado aquí produce un error de tipos en compilación (switch exhaustivo).
 */
export function resolverModoOperacion(estado: EstadoActivacionValorizacion): ModoOperacionInventario {
  switch (estado) {
    case 'no_iniciada':
      return 'cuantitativo_libre';
    case 'en_preparacion':
    case 'pendiente_costos':
      return 'cuantitativo_invalida_snapshot';
    case 'validada':
      return 'bloqueado_snapshot_aprobado';
    // 'cancelada_antes_activacion' vuelve al comportamiento normal: la preparación cancelada deja
    // de existir como snapshot vigente — el inventario cuantitativo opera libremente hasta que se
    // reinicie una preparación nueva (en_preparacion).
    case 'cancelada_antes_activacion':
      return 'cuantitativo_libre';
    case 'activando':
      return 'bloqueado_activacion_en_curso';
    case 'activa':
      return 'valorizado_exclusivo';
    // Recuperable desde una interrupción de la activación (Etapa 4) — bloquea mutación igual que
    // 'activando' hasta que se resuelva; inalcanzable en Etapa 2.
    case 'fallida_recuperable':
      return 'bloqueado_activacion_en_curso';
    case 'suspendida_por_inconsistencia':
      return 'bloqueado_suspension';
    default: {
      const _exhaustivo: never = estado;
      throw new Error(`resolverModoOperacion: estado de activación de valorización no reconocido: "${String(_exhaustivo)}".`);
    }
  }
}

/** `true` únicamente cuando la empresa ya completó la activación (o quedó suspendida tras activar) — §24.1ter. Inalcanzable en Etapa 2, expuesta para consistencia con el diseño aprobado. */
export function esValorizacionActiva(estado: EstadoActivacionValorizacion): boolean {
  return estado === 'activa' || estado === 'suspendida_por_inconsistencia';
}

/** `true` cuando el inventario admite mutaciones cuantitativas normales (con o sin invalidación de snapshot) — usado por AdjustmentModal/PanelImportacionStock para decidir si el campo de costo es obligatorio. */
export function puedeOperarCuantitativamente(estado: EstadoActivacionValorizacion): boolean {
  const modo = resolverModoOperacion(estado);
  return modo === 'cuantitativo_libre' || modo === 'cuantitativo_invalida_snapshot';
}

/** `true` cuando el motor permite mutar inventario en ALGÚN modo (cuantitativo o valorizado) — `false` únicamente en los 3 modos bloqueados. */
export function puedeMutarInventario(estado: EstadoActivacionValorizacion): boolean {
  const modo = resolverModoOperacion(estado);
  return modo !== 'bloqueado_snapshot_aprobado' && modo !== 'bloqueado_activacion_en_curso' && modo !== 'bloqueado_suspension';
}

/**
 * Transiciones productivamente permitidas de la máquina central (Etapa 2 §4 + cierre de Etapa 4B).
 * `validada → activando` (inicio de activación), `activando → activa` (éxito) y
 * `activando → fallida_recuperable` / `fallida_recuperable → activando` (interrupción y reintento)
 * se agregan aquí — la ÚNICA extensión productiva de esta matriz, nunca una máquina paralela. Un
 * intento de invocar una transición ausente de este mapa se rechaza explícitamente (nunca se
 * "permite por omisión"). `activa` permanece sin salida (irreversible: ninguna acción de
 * desactivar ni retroceso a un estado anterior).
 */
const TRANSICIONES_PERMITIDAS: Readonly<Record<EstadoActivacionValorizacion, readonly EstadoActivacionValorizacion[]>> = {
  no_iniciada: ['en_preparacion'],
  en_preparacion: ['pendiente_costos', 'cancelada_antes_activacion'],
  pendiente_costos: ['validada', 'cancelada_antes_activacion'],
  validada: ['cancelada_antes_activacion', 'activando'],
  cancelada_antes_activacion: ['en_preparacion'],
  activando: ['activa', 'fallida_recuperable'],
  activa: [],
  fallida_recuperable: ['activando'],
  suspendida_por_inconsistencia: [],
};

/**
 * Valida que `actual → siguiente` sea una transición productivamente permitida — lanza si no lo
 * es. Es la única puerta de transición: ningún llamador construye el nuevo estado "a mano" sin
 * pasar por aquí primero.
 */
export function validarTransicionEstadoValorizacion(
  actual: EstadoActivacionValorizacion,
  siguiente: EstadoActivacionValorizacion
): void {
  const permitidas = TRANSICIONES_PERMITIDAS[actual] ?? [];
  if (!permitidas.includes(siguiente)) {
    throw new Error(
      `estadoActivacionValorizacionInventario: la transición "${actual}" → "${siguiente}" no está permitida ` +
      `(recorrido productivo: no_iniciada→en_preparacion→pendiente_costos→validada→activando→activa; ` +
      `validada/en_preparacion/pendiente_costos⇄cancelada_antes_activacion→en_preparacion; ` +
      `activando⇄fallida_recuperable para interrupción/reintento; "activa" nunca retrocede).`
    );
  }
}
