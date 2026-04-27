/**
 * Tipos locales del frontend para analítica.
 *
 * - Los nombres de eventos salen del contrato compartido en packages/analytics-events.
 * - Los payloads wire se normalizan en snake_case dentro de analitica.ts.
 * - Algunas variantes se mantienen aunque hoy no tengan callsites activos,
 *   porque forman parte del rango soportado por el frontend (p. ej. estados
 *   futuros de comprobante o entidades de importación aún no disparadas).
 */
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
