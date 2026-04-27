/**
 * Contrato compartido de eventos analíticos — fuente de verdad única.
 *
 * Este archivo es importado por:
 *   - SenciYo:    src/shared/analitica/eventosAnalitica.ts
 *   - PM Portal:  apps/pm-portal/functions/api/eventos-posthog-kpi.ts
 *
 * NUNCA dupliques estos strings en otro archivo del repo.
 * Cualquier cambio aquí se propaga a ambas apps en compilación.
 */

export const ANALYTICS_EVENTS = {
  REGISTRO_USUARIO_COMPLETADO: 'registro_usuario_completado',
  REGISTRO_EMPRESA_EXITOSO: 'registro_empresa_exitoso',
  INICIO_SESION_EXITOSO: 'inicio_sesion_exitoso',
  CAJA_ABIERTA_EXITOSO: 'caja_abierta_exitoso',
  MOVIMIENTO_CAJA_REGISTRADO: 'movimiento_caja_registrado',
  CAJA_CERRADA_EXITOSO: 'caja_cerrada_exitoso',
  VENTA_COMPLETADA: 'venta_completada',
  PRIMERA_VENTA_COMPLETADA: 'primera_venta_completada',
  PRODUCTO_CREADO_EXITOSO: 'producto_creado_exitoso',
  CLIENTE_CREADO_EXITOSO: 'cliente_creado_exitoso',
  IMPORTACION_COMPLETADA: 'importacion_completada',
} as const

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS]
