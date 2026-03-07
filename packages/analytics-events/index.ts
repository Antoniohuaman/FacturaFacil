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
  VENTA_COMPLETADA: 'venta_completada',
  PRIMERA_VENTA_COMPLETADA: 'primera_venta_completada',
  PRODUCTO_CREADO_EXITOSO: 'producto_creado_exitoso',
  CLIENTE_CREADO_EXITOSO: 'cliente_creado_exitoso',
  IMPORTACION_COMPLETADA: 'importacion_completada',
  RUC_ACTUALIZADO_EXITOSO: 'ruc_actualizado_exitoso',
} as const

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS]
