// Validador de RUC - Perú
// =======================

/**
 * Valida el formato y dígito verificador del RUC peruano
 * @param ruc - Número de RUC a validar
 * @returns boolean - true si el RUC es válido
 */
export function validateRUC(ruc: string): boolean {
  if (!ruc || typeof ruc !== 'string') {
    return false;
  }

  // Eliminar espacios y convertir a string
  const cleanRuc = ruc.trim();

  // Verificar longitud (11 dígitos)
  if (cleanRuc.length !== 11) {
    return false;
  }

  // Verificar que solo contenga números
  if (!/^\d{11}$/.test(cleanRuc)) {
    return false;
  }

  // Verificar que el primer dígito sea válido (1, 2 o válidos para RUC)
  const firstDigit = cleanRuc.charAt(0);
  if (!['1', '2'].includes(firstDigit)) {
    return false;
  }

  // Calcular dígito verificador
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;

  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanRuc.charAt(i)) * weights[i];
  }

  const remainder = sum % 11;
  const checkDigit = remainder < 2 ? remainder : 11 - remainder;

  return checkDigit === parseInt(cleanRuc.charAt(10));
}

/**
 * Formatea un RUC para mostrar
 * @param ruc - Número de RUC
 * @returns string - RUC formateado
 */
export function formatRUC(ruc: string): string {
  if (!ruc) return '';
  
  const cleanRuc = ruc.trim();
  if (cleanRuc.length === 11) {
    return `${cleanRuc.substring(0, 2)}-${cleanRuc.substring(2, 10)}-${cleanRuc.substring(10)}`;
  }
  
  return cleanRuc;
}