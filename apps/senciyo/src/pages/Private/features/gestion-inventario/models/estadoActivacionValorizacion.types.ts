// gestion-inventario/models/estadoActivacionValorizacion.types.ts
//
// Máquina de estados de activación de la valorización de inventario (Etapa 2, §31.5 del diseño
// técnico aprobado: docs/diseno-tecnico-kardex-valorizado-integracion-compras.md). Vive en
// `PreferenciasInventario` (configuracion-sistema/contexto/ContextoConfiguracion.tsx) — la única
// configuración de inventario real y consumida hoy (`Configuration.inventory` es huérfana, ver
// comentario en `configuracion-sistema/modelos/Configuration.ts`), nunca en una segunda
// configuración paralela.
//
// Recorrido productivo hasta 'validada':
//   no_iniciada → en_preparacion → pendiente_costos → validada
//   en_preparacion/pendiente_costos/validada → no_iniciada (cancelar la preparación siempre
//   regresa al punto de partida — cierre de la corrección UX-INV-P0-001, 2026-08-07: no existe un
//   estado "cancelada" de compañía distinto de 'no_iniciada', porque antes de 'activa' nunca existe
//   ninguna capa ni movimiento que una cancelación pueda poner en riesgo. El lote de preparación
//   conserva su propio historial — `EstadoLoteValorizacionInicial` en
//   valorizacionInicialInventario.types.ts — así que la auditoría de "hubo una preparación
//   cancelada" no depende de este enum de compañía).
// Las transiciones 'validada' → 'activando' → 'activa' quedan gateadas por
// `verificarCondicionesActivacion`.

export type EstadoActivacionValorizacion =
  | 'no_iniciada'
  | 'en_preparacion'
  | 'pendiente_costos'
  | 'validada'
  | 'activando'
  | 'activa'
  | 'fallida_recuperable'
  | 'suspendida_por_inconsistencia';

export const ESTADOS_ACTIVACION_VALORIZACION: readonly EstadoActivacionValorizacion[] = [
  'no_iniciada',
  'en_preparacion',
  'pendiente_costos',
  'validada',
  'activando',
  'activa',
  'fallida_recuperable',
  'suspendida_por_inconsistencia',
];

export function esEstadoActivacionValorizacionValido(valor: unknown): valor is EstadoActivacionValorizacion {
  return typeof valor === 'string' && (ESTADOS_ACTIVACION_VALORIZACION as readonly string[]).includes(valor);
}

/**
 * Capacidad de mutación de inventario resuelta a partir del estado de activación (§24.1ter) — nunca
 * un booleano plano. `resolverModoOperacion` (utils/estadoActivacionValorizacionInventario.ts) es la
 * única función que produce estos valores.
 */
export type ModoOperacionInventario =
  /** Sin ninguna preparación de valorización en curso — inventario cuantitativo normal, sin snapshot que invalidar. */
  | 'cuantitativo_libre'
  /** Preparación en curso (`en_preparacion`/`pendiente_costos`) — inventario cuantitativo permitido, pero cada mutación confirmada invalida el detalle de snapshot afectado. */
  | 'cuantitativo_invalida_snapshot'
  /** Snapshot aprobado e inmutable (`validada`) — bloquea nuevas mutaciones de inventario y edición de costos. */
  | 'bloqueado_snapshot_aprobado'
  /** Activación en curso (`activando`) — bloqueado, fuera de alcance de esta etapa (inalcanzable en Etapa 2). */
  | 'bloqueado_activacion_en_curso'
  /** Empresa activada (`activa`) — exige costo en toda entrada positiva, sin camino cuantitativo directo (inalcanzable en Etapa 2). */
  | 'valorizado_exclusivo'
  /** Suspensión por inconsistencia detectada tras activar — bloqueado (inalcanzable en Etapa 2). */
  | 'bloqueado_suspension';
