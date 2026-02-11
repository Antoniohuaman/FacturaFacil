export const obtenerSimboloMoneda = (moneda?: string): string => {
  const codigo = moneda?.toUpperCase();
  if (codigo === 'USD') return '$';
  if (codigo === 'EUR') return '€';
  if (codigo === 'CLP') return '$';
  if (codigo === 'MXN') return '$';
  return 'S/';
};

export const formatearMoneda = (valor: number, moneda?: string): string =>
  `${obtenerSimboloMoneda(moneda)} ${valor.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatearFechaCorta = (valor: string): string =>
  new Date(valor).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

export const formatearEtiquetaEstado = (valor?: string): string => {
  if (!valor) return '—';
  return valor.charAt(0).toUpperCase() + valor.slice(1);
};

export const obtenerClaseBadgeEstadoComprobanteHistorial = (color?: string): string => {
  switch (color) {
    case 'green':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'orange':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
    case 'red':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'blue':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
  }
};

export const obtenerClaseBadgeCobroHistorial = (estado?: string): string => {
  switch (estado?.toLowerCase()) {
    case 'cancelado':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'pendiente':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'parcial':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'vencido':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
    case 'anulado':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
  }
};

export const obtenerClaseTipoComprobanteHistorial = (tipo: string): string => {
  const normalizado = tipo.toLowerCase();
  if (normalizado.includes('fact')) {
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
  }
  if (normalizado.includes('boleta')) {
    return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
  }
  return 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300';
};

export const obtenerClaseBadgeEstadoComprobanteModal = (color?: string): string => {
  switch (color) {
    case 'green':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'orange':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'red':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'blue':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const obtenerClaseBadgeCobroModal = (estado?: string): string => {
  switch (estado?.toLowerCase()) {
    case 'cancelado':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'pendiente':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'parcial':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'vencido':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'anulado':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const obtenerClaseTipoComprobanteModal = (tipo: string): string =>
  tipo.toLowerCase().includes('fact')
    ? 'bg-blue-100 text-blue-800 border-blue-200'
    : 'bg-purple-100 text-purple-800 border-purple-200';
