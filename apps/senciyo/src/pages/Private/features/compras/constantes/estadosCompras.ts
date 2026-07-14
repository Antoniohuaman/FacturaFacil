import type {
  EstadoRecepcionOC,
  EstadoFacturacionOC,
  EstadoInventarioOC,
  EstadoPrincipalOC,
} from '../modelos/OrdenCompra';
import type {
  EstadoDocumentoCC,
  EstadoPagoCC,
  EstadoInventarioCC,
  EstadoPrincipalCC,
} from '../modelos/ComprobanteCompra';
import type { EstadoPagoCxP, EstadoVencimientoCxP } from '../modelos/CuentaPorPagar';
import type { EstadoDocumentoPago } from '../modelos/PagoCompra';

/**
 * Etiqueta visual del estado principal de la OC. El valor interno persistido
 * (EstadoPrincipalOC) sigue siendo 'Pendiente de aprobación' — solo cambia el
 * texto mostrado ("Por aprobar"), sin migrar documentos ni tocar
 * calcularEstadoPrincipalOC/transiciones. Única fuente para badge (listado y
 * drawer), filtro de estados e impresión/PDF.
 */
export const ETIQUETA_ESTADO_PRINCIPAL_OC: Record<EstadoPrincipalOC, string> = {
  Borrador: 'Borrador',
  Registrada: 'Registrada',
  'Pendiente de aprobación': 'Por aprobar',
  Aprobada: 'Aprobada',
  'No Aprobada': 'No Aprobada',
  Anulada: 'Anulada',
  Convertida: 'Convertida',
};

/** Badge del estado principal único de la OC (ver EstadoPrincipalOC / calcularEstadoPrincipalOC). */
export const BADGE_ESTADO_PRINCIPAL_OC: Record<EstadoPrincipalOC, string> = {
  Borrador: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  Registrada: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'Pendiente de aprobación': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  Aprobada: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  'No Aprobada': 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',
  Anulada: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',
  Convertida: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
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

/**
 * Etiqueta visual del estado principal único del CC (ver EstadoPrincipalCC /
 * calcularEstadoPrincipalCC). Única fuente para badge (listado y drawer),
 * filtro de estados e impresión/PDF — no mezclar con estadoPago/estadoInventario.
 */
export const ETIQUETA_ESTADO_PRINCIPAL_CC: Record<EstadoPrincipalCC, string> = {
  Borrador: 'Borrador',
  Registrado: 'Registrado',
  Anulado: 'Anulado',
  Convertido: 'Convertido',
};

/** Badge del estado principal único del CC (ver EstadoPrincipalCC / calcularEstadoPrincipalCC). */
export const BADGE_ESTADO_PRINCIPAL_CC: Record<EstadoPrincipalCC, string> = {
  Borrador: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  Registrado: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  Anulado: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',
  Convertido: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
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
  vence_hoy: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  vencida: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',
};

export const BADGE_ESTADO_DOCUMENTO_PAGO: Record<EstadoDocumentoPago, string> = {
  registrado: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  anulado: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',
};
