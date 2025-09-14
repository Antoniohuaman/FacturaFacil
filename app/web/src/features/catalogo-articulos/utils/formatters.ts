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

export const obtenerColorStock = (stock: number, stockMinimo: number): string => {
  if (stock <= 0) return 'text-red-600 bg-red-50';
  if (stock <= stockMinimo) return 'text-amber-600 bg-amber-50';
  return 'text-green-600 bg-green-50';
};

export const obtenerEstadoStock = (stock: number, stockMinimo: number): string => {
  if (stock <= 0) return 'Agotado';
  if (stock <= stockMinimo) return 'Stock Bajo';
  return 'Disponible';
};