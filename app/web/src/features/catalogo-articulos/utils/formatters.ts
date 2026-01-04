export const formatearMoneda = (valor: number): string => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(valor);
};

export const formatearNumero = (valor: number): string => {
  return new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(valor);
};

export const formatearFecha = (fecha: Date): string => {
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(fecha);
};

export const formatearFechaHora = (fecha: Date): string => {
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(fecha);
};

export const BARCODE_MIN_LENGTH = 8;
export const BARCODE_MAX_LENGTH = 14;

export const normalizeBarcodeValue = (value?: string | null): string => {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  return trimmed.replace(/[-\s]+/g, '');
};

export const isBarcodeValueValid = (value?: string | null): boolean => {
  const normalized = normalizeBarcodeValue(value);
  if (!normalized) {
    return true;
  }
  if (!/^\d+$/.test(normalized)) {
    return false;
  }
  return normalized.length >= BARCODE_MIN_LENGTH && normalized.length <= BARCODE_MAX_LENGTH;
};
