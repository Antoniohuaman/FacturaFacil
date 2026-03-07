import { ANALYTICS_EVENTS } from '@facturafacil/analytics-events'

export { ANALYTICS_EVENTS as EVENTOS_ANALITICA }

export type EntornoAnalitica = 'demo' | 'produccion'

export type OrigenVenta = 'emision' | 'pos'

export type OrigenProducto = 'emision_inline' | 'catalogo'

export type OrigenCliente = 'emision_inline' | 'clientes'

export type EntidadImportacion = 'productos' | 'clientes' | 'precios' | 'stock'

export type ResultadoImportacion = 'exito' | 'con_errores'

export type ErroresRangoImportacion = '0' | '1-5' | '6-20' | '21+'
