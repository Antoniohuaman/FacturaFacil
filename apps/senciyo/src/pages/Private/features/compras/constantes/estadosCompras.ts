import type {
  EstadoDocumentoOC,
  EstadoAprobacionOC,
  EstadoRecepcionOC,
  EstadoFacturacionOC,
  EstadoInventarioOC,
} from '../modelos/OrdenCompra';
import type { EstadoDocumentoCC, EstadoPagoCC, EstadoInventarioCC } from '../modelos/ComprobanteCompra';
import type { EstadoPagoCxP, EstadoVencimientoCxP } from '../modelos/CuentaPorPagar';
import type { EstadoDocumentoPago } from '../modelos/PagoCompra';

export const BADGE_ESTADO_DOCUMENTO_OC: Record<EstadoDocumentoOC, string> = {
  borrador: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  registrado: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  cerrado: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
  anulado: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',
};

export const BADGE_ESTADO_APROBACION_OC: Record<EstadoAprobacionOC, string> = {
  no_requiere: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
  pendiente: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  aprobada: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  rechazada: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',
};

export const BADGE_ESTADO_RECEPCION_OC: Record<EstadoRecepcionOC, string> = {
  pendiente: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  parcial: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  completa: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  no_aplica: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
};

export const BADGE_ESTADO_FACTURACION_OC: Record<EstadoFacturacionOC, string> = {
  pendiente: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  parcial: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  completa: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  no_aplica: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
};

export const BADGE_ESTADO_INVENTARIO_OC: Record<EstadoInventarioOC, string> = {
  pendiente: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  parcial: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  completo: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  automatico: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  no_aplica: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
};

export const BADGE_ESTADO_DOCUMENTO_CC: Record<EstadoDocumentoCC, string> = {
  borrador: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  registrado: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  anulado: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',
};

export const BADGE_ESTADO_PAGO_CC: Record<EstadoPagoCC, string> = {
  pendiente: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  parcial: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  pagado: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

export const BADGE_ESTADO_INVENTARIO_CC: Record<EstadoInventarioCC, string> = {
  pendiente: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  parcial: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  completo: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  automatico: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  no_aplica: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
};

export const BADGE_ESTADO_PAGO_CXP: Record<EstadoPagoCxP, string> = {
  pendiente: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  parcial: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  pagada: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  anulada: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',
};

export const BADGE_ESTADO_VENCIMIENTO_CXP: Record<EstadoVencimientoCxP, string> = {
  vigente: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  por_vencer: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  vencida: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',
};

export const BADGE_ESTADO_DOCUMENTO_PAGO: Record<EstadoDocumentoPago, string> = {
  registrado: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  anulado: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',
};
