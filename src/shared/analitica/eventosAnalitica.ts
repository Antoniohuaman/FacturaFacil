export const EVENTOS_ANALITICA = {
  INICIO_SESION_EXITOSO: 'inicio_sesion_exitoso',
  VENTA_INICIADA: 'venta_iniciada',
  VENTA_COMPLETADA: 'venta_completada',
  PRIMERA_VENTA_COMPLETADA: 'primera_venta_completada',
  RUC_ACTUALIZADO_EXITOSO: 'ruc_actualizado_exitoso',
  PASE_A_PRODUCCION_INICIADO: 'pase_a_produccion_iniciado',
  PASE_A_PRODUCCION_COMPLETADO: 'pase_a_produccion_completado',
  CERTIFICADO_DIGITAL_ACTIVADO: 'certificado_digital_activado',
  PRODUCTO_CREADO_EXITOSO: 'producto_creado_exitoso',
  CLIENTE_CREADO_EXITOSO: 'cliente_creado_exitoso',
  IMPORTACION_COMPLETADA: 'importacion_completada',
  CAJA_ABIERTA_EXITOSO: 'caja_abierta_exitoso',
  CAJA_CERRADA_EXITOSO: 'caja_cerrada_exitoso',
  MODULO_VISITADO: 'modulo_visitado',
  BLOQUEO_MOSTRADO: 'bloqueo_mostrado',
  ERROR_CRITICO: 'error_critico',
} as const;

export type EntornoAnalitica = 'demo' | 'produccion';

export type OrigenVenta = 'emision' | 'pos';

export type OrigenProducto = 'emision_inline' | 'catalogo';

export type OrigenCliente = 'emision_inline' | 'clientes';

export type DisparadorProduccion = 'panel' | 'empresa' | 'banner' | 'otro';

export type ModuloPrincipal =
  | 'comprobantes'
  | 'pos'
  | 'productos'
  | 'clientes'
  | 'inventario'
  | 'precios'
  | 'caja'
  | 'cobranzas'
  | 'documentos'
  | 'indicadores'
  | 'configuracion'
  | 'notificaciones'
  | 'admin_empresas';

export type FlujoBloqueo = 'venta' | 'caja' | 'configuracion' | 'importacion';

export type MotivoBloqueo =
  | 'caja_cerrada'
  | 'sin_items'
  | 'sin_cliente'
  | 'sin_serie'
  | 'monto_pago_invalido'
  | 'cronograma_credito_invalido'
  | 'boleta_requiere_cliente'
  | 'sin_permiso'
  | 'no_implementado'
  | 'error_desconocido';
