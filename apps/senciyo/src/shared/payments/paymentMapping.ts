import type { MedioPago } from './medioPago';

/**
 * TODO LEGACY: Este helper existe solo como compatibilidad para flujos antiguos
 * que mezclan códigos (pm-*) y etiquetas libres. Idealmente, los nuevos flujos
 * deberían pasar siempre un código estable y eliminar esta heurística.
 */
export const mapPaymentMethodToMedioPago = (
  codeOrLabelRaw?: string,
  fallbackLabelRaw?: string,
): MedioPago => {
  const primary = codeOrLabelRaw ? codeOrLabelRaw.toLowerCase().replace(/^pm-/, '') : undefined;
  const fallback = fallbackLabelRaw ? fallbackLabelRaw.toLowerCase() : undefined;

  const candidates = [primary, fallback].filter(Boolean) as string[];
  const normalized = candidates[0] ?? 'efectivo';

  if (normalized.includes('yape')) return 'Yape';
  if (normalized.includes('plin')) return 'Plin';
  if (normalized.includes('tarjeta') || normalized.includes('visa') || normalized.includes('master')) return 'Tarjeta';
  if (normalized.includes('transfer')) return 'Transferencia';
  if (normalized.includes('deposit')) return 'Deposito';
  if (normalized.includes('contado') || normalized.includes('cash') || normalized.includes('efectivo')) return 'Efectivo';

  return 'Efectivo';
};
