import type { MedioPago } from '../../features/control-caja/models/Caja';

/**
 * Normaliza cualquier identificador de forma de pago (pm-*, etiquetas, etc.)
 * y lo mapea a los medios aceptados por el módulo de Caja.
 */
export const mapPaymentMethodToMedioPago = (formaPagoRaw?: string): MedioPago => {
  const normalized = formaPagoRaw
    ? formaPagoRaw.toLowerCase().replace(/^pm-/, '')
    : 'efectivo';

  if (normalized.includes('yape')) return 'Yape';
  if (normalized.includes('plin')) return 'Plin';
  if (normalized.includes('tarjeta') || normalized.includes('visa') || normalized.includes('master')) return 'Tarjeta';
  if (normalized.includes('transfer')) return 'Transferencia';
  if (normalized.includes('deposit')) return 'Deposito';
  if (normalized.includes('contado') || normalized.includes('cash') || normalized.includes('efectivo')) return 'Efectivo';

  return 'Efectivo';
};
