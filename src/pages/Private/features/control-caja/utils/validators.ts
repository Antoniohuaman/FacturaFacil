/**
 * Validadores para el módulo de Control de Caja
 */

/**
 * Valida si un descuadre está dentro del margen permitido
 */
export const isDescuadreValid = (descuadre: number, margen: number): boolean => {
  return Math.abs(descuadre) <= margen;
};

/**
 * Valida si hay un descuadre significativo (mayor a 0.01)
 */
export const hasDescuadre = (descuadre: number): boolean => {
  return Math.abs(descuadre) > 0.01;
};

/**
 * Valida que un monto sea válido (número positivo)
 */
export const isMontoValid = (monto: number): boolean => {
  return !isNaN(monto) && monto >= 0;
};

/**
 * Valida que el total de montos iniciales sea mayor a 0
 */
export const isMontosInicialesValid = (
  efectivo: number,
  tarjeta: number,
  yape: number,
  otros: number = 0
): boolean => {
  const total = efectivo + tarjeta + yape + otros;
  return total > 0;
};

/**
 * Valida que una fecha sea válida
 */
export const isFechaValid = (fecha: string | Date): boolean => {
  const date = new Date(fecha);
  return date instanceof Date && !isNaN(date.getTime());
};

/**
 * Valida que un string no esté vacío después de trim
 */
export const isNotEmpty = (value: string): boolean => {
  return value.trim().length > 0;
};
