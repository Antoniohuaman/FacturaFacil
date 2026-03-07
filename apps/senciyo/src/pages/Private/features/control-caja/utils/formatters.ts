/**
 * Utilidades de formateo para el módulo de Control de Caja
 */

/**
 * Formatea un número como moneda peruana
 */
export const formatCurrency = (value: number): string => {
  return `S/ ${value.toFixed(2)}`;
};

/**
 * Formatea una fecha en formato corto (DD/MM/YYYY)
 */
export const formatDate = (date: Date): string => {
  return new Date(date).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Formatea una fecha con hora (DD/MM/YYYY HH:mm)
 */
export const formatDateTime = (date: Date): string => {
  return new Date(date).toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Formatea solo la hora (HH:mm)
 */
export const formatTime = (date: Date): string => {
  return new Date(date).toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Parsea un string a número decimal seguro
 */
export const parseDecimal = (value: string): number => {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Formatea un input de texto como decimal con 2 decimales
 */
export const formatDecimalInput = (value: string): string => {
  const num = parseDecimal(value);
  return num.toFixed(2);
};
