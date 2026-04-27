import { ANALYTICS_EVENTS } from '@facturafacil/analytics-events'

export { ANALYTICS_EVENTS as EVENTOS_ANALITICA }

export type EntornoAnalitica = 'demo' | 'produccion'

export type OrigenVenta = 'emision' | 'pos'

export type MotivoAbandonoVenta = 'cancelacion_usuario' | 'salida_flujo' | 'cierre_modal' | 'otro'

export type EstadoComprobanteAnalitica = 'enviado' | 'aceptado' | 'rechazado' | 'por_corregir' | 'anulado'

export type TipoComprobanteAnalitica = 'factura' | 'boleta' | 'nota_credito' | 'nota_debito' | 'otro'

export type FormaPagoAnalitica = 'contado' | 'credito'

export type TipoAyudaAnalitica = 'centro_ayuda' | 'recurso' | 'soporte' | 'tour' | 'otro'

export type OrigenAyudaAnalitica = 'header' | 'modulo' | 'tour' | 'panel' | 'otro'

export type AccionBorradorAnalitica = 'guardado' | 'reanudado'

export type OrigenProducto = 'emision_inline' | 'catalogo'

export type OrigenCliente = 'emision_inline' | 'clientes'

export type EntidadImportacion = 'productos' | 'clientes' | 'precios' | 'stock'

export type ResultadoImportacion = 'exito' | 'con_errores'

export type ErroresRangoImportacion = '0' | '1-5' | '6-20' | '21+'
