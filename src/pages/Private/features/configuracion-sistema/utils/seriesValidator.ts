// Validador de Series Documentarias - SUNAT
// ========================================

/**
 * Valida el formato de serie según SUNAT
 * @param series - Serie a validar (ej: F001, B001)
 * @param documentType - Tipo de documento
 * @returns boolean - true si la serie es válida
 */
export function validateSeries(series: string, documentType: string): boolean {
  if (!series || !documentType) {
    return false;
  }

  const cleanSeries = series.trim().toUpperCase();

  // Verificar longitud (4 caracteres)
  if (cleanSeries.length !== 4) {
    return false;
  }

  // Verificar formato según tipo de documento
  switch (documentType) {
    case '01': // Factura
      return /^F\d{3}$/.test(cleanSeries);
    
    case '03': // Boleta
      return /^B\d{3}$/.test(cleanSeries);
    
    case '07': // Nota de Crédito
    case '08': // Nota de Débito
      return /^[FB]\d{3}$/.test(cleanSeries);
    
    default:
      return false;
  }
}

/**
 * Genera la siguiente serie disponible
 * @param documentType - Tipo de documento
 * @param existingSeries - Series ya existentes
 * @returns string - Nueva serie sugerida
 */
export function generateNextSeries(documentType: string, existingSeries: string[] = []): string {
  let prefix = '';
  
  switch (documentType) {
    case '01': // Factura
      prefix = 'F';
      break;
    case '03': // Boleta
      prefix = 'B';
      break;
    default:
      prefix = 'F'; // Por defecto factura
  }

  // Buscar el siguiente número disponible
  let nextNumber = 1;
  let newSeries = '';

  do {
    newSeries = `${prefix}${nextNumber.toString().padStart(3, '0')}`;
    nextNumber++;
  } while (existingSeries.includes(newSeries) && nextNumber <= 999);

  return newSeries;
}

/**
 * Valida el número correlativo
 * @param correlative - Número correlativo
 * @returns boolean - true si es válido
 */
export function validateCorrelative(correlative: string | number): boolean {
  const num = typeof correlative === 'string' ? parseInt(correlative) : correlative;
  
  if (isNaN(num)) {
    return false;
  }

  // Debe ser entre 1 y 99999999 (según SUNAT)
  return num >= 1 && num <= 99999999;
}

/**
 * Formatea el número correlativo
 * @param correlative - Número a formatear
 * @returns string - Número formateado con ceros a la izquierda
 */
export function formatCorrelative(correlative: string | number): string {
  const num = typeof correlative === 'string' ? parseInt(correlative) : correlative;
  
  if (isNaN(num)) {
    return '00000001';
  }

  return num.toString().padStart(8, '0');
}