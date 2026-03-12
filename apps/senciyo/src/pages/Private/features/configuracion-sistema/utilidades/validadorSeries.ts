import {
  generateSeriesSuggestion,
  validateSeriesCodeForDocumentType,
} from './catalogoSeries';

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

  return validateSeriesCodeForDocumentType(documentType, series);
}

/**
 * Genera la siguiente serie disponible
 * @param documentType - Tipo de documento
 * @param existingSeries - Series ya existentes
 * @returns string - Nueva serie sugerida
 */
export function generateNextSeries(documentType: string, existingSeries: string[] = []): string {
  switch (documentType) {
    case '01': // Factura
      return generateSeriesSuggestion('INVOICE', existingSeries);
    case '03': // Boleta
      return generateSeriesSuggestion('RECEIPT', existingSeries);
    case '07': // Nota de Crédito
      return generateSeriesSuggestion('CREDIT_NOTE', existingSeries);
    case 'RC': // Recibo de Cobranza
      return generateSeriesSuggestion('COLLECTION', existingSeries);
    default:
      return generateSeriesSuggestion('INVOICE', existingSeries);
  }
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