export const EVENTOS_ANALITICA = {
  INICIO_SESION_EXITOSO: 'inicio_sesion_exitoso',
  VENTA_INICIADA: 'venta_iniciada',
  VENTA_COMPLETADA: 'venta_completada',
  PRIMERA_VENTA_COMPLETADA: 'primera_venta_completada',
} as const;

export type EntornoAnalitica = 'demo' | 'produccion';

export type OrigenVenta = 'emision' | 'pos';
