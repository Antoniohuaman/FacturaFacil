// Formateadores para Configuración del Sistema
// ===========================================

/**
 * Formatea moneda peruana
 * @param amount - Cantidad a formatear
 * @param currency - Moneda (PEN, USD)
 * @returns string - Cantidad formateada
 */
export function formatCurrency(amount: number, currency: string = 'PEN'): string {
  if (isNaN(amount)) {
    return '0.00';
  }

  const symbol = currency === 'USD' ? '$' : 'S/';
  return `${symbol} ${amount.toFixed(2)}`;
}

/**
 * Formatea fecha para mostrar
 * @param date - Fecha a formatear
 * @returns string - Fecha formateada
 */
export function formatDate(date: string | Date): string {
  if (!date) {
    return '';
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return '';
  }

  return dateObj.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Formatea fecha y hora para mostrar
 * @param date - Fecha a formatear
 * @returns string - Fecha y hora formateada
 */
export function formatDateTime(date: string | Date): string {
  if (!date) {
    return '';
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return '';
  }

  return dateObj.toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formatea texto para mostrar como título
 * @param text - Texto a formatear
 * @returns string - Texto formateado
 */
export function formatTitle(text: string): string {
  if (!text) {
    return '';
  }

  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Formatea estado del sistema
 * @param status - Estado a formatear
 * @returns string - Estado formateado
 */
export function formatStatus(status: string): string {
  const statusMap: { [key: string]: string } = {
    'active': 'Activo',
    'inactive': 'Inactivo',
    'maintenance': 'Mantenimiento',
    'pending': 'Pendiente',
    'configured': 'Configurado',
    'error': 'Error'
  };

  return statusMap[status] || status;
}

/**
 * Trunca texto largo
 * @param text - Texto a truncar
 * @param maxLength - Longitud máxima
 * @returns string - Texto truncado
 */
export function truncateText(text: string, maxLength: number = 50): string {
  if (!text) {
    return '';
  }

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.substring(0, maxLength)}...`;
}