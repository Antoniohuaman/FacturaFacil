export const EVENTOS_ANALITICA = {
  REGISTRO_USUARIO_COMPLETADO: 'registro_usuario_completado',
  VENTA_COMPLETADA: 'venta_completada',
  PRIMERA_VENTA_COMPLETADA: 'primera_venta_completada',
  PRODUCTO_CREADO_EXITOSO: 'producto_creado_exitoso',
  CLIENTE_CREADO_EXITOSO: 'cliente_creado_exitoso',
  IMPORTACION_COMPLETADA: 'importacion_completada',
  RUC_ACTUALIZADO_EXITOSO: 'ruc_actualizado_exitoso',
} as const;

export type EntornoAnalitica = 'demo' | 'produccion';

export type OrigenVenta = 'emision' | 'pos';

export type OrigenProducto = 'emision_inline' | 'catalogo';

export type OrigenCliente = 'emision_inline' | 'clientes';

export type EntidadImportacion = 'productos' | 'clientes' | 'precios' | 'stock';

export type ResultadoImportacion = 'exito' | 'con_errores';

export type ErroresRangoImportacion = '0' | '1-5' | '6-20' | '21+';
