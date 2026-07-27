// gestion-inventario/models/estadoActivacionValorizacion.types.ts
//
// Máquina de estados de activación de la valorización de inventario (Etapa 2, §31.5 del diseño
// técnico aprobado: docs/diseno-tecnico-kardex-valorizado-integracion-compras.md). Vive en
// `PreferenciasInventario` (configuracion-sistema/contexto/ContextoConfiguracion.tsx) — la única
// configuración de inventario real y consumida hoy (`Configuration.inventory` es huérfana, ver
// comentario en `configuracion-sistema/modelos/Configuration.ts`), nunca en una segunda
// configuración paralela.
//
// Etapa 2 construye y prueba el recorrido productivo hasta 'validada' únicamente:
//   no_iniciada → en_preparacion → pendiente_costos → validada
//   validada → cancelada_antes_activacion → en_preparacion
// Las transiciones 'validada' → 'activando' → 'activa' NO se implementan en esta etapa (quedan
// para el cierre de la Etapa 4, gateadas por `verificarCondicionesActivacion`) — ningún código de
// esta etapa las produce; `validarTransicionEstadoValorizacion`
// (utils/estadoActivacionValorizacionInventario.ts) las rechaza explícitamente si algo las invoca.

export type EstadoActivacionValorizacion =
  | 'no_iniciada'
  | 'en_preparacion'
  | 'pendiente_costos'
  | 'validada'
  | 'cancelada_antes_activacion'
  | 'activando'
  | 'activa'
  | 'fallida_recuperable'
  | 'suspendida_por_inconsistencia';

export const ESTADOS_ACTIVACION_VALORIZACION: readonly EstadoActivacionValorizacion[] = [
  'no_iniciada',
  'en_preparacion',
  'pendiente_costos',
  'validada',
  'cancelada_antes_activacion',
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
