import type { EstadoGRE } from '../modelos/GuiaRemision';

/**
 * Label visual de un estado GRE.
 * 'Pendiente' (estado interno tras emisión local) se muestra como 'Enviado'.
 */
export function getEstadoGRELabel(estado: EstadoGRE): string {
  const LABELS: Record<EstadoGRE, string> = {
    Borrador:  'Borrador',
    Pendiente: 'Enviado',
    Emitida:   'Emitida',
    Aceptada:  'Aceptada',
    Observada: 'Observada',
    Rechazada: 'Rechazada',
    Anulada:   'Anulada',
  };
  return LABELS[estado] ?? estado;
}

/**
 * Clases Tailwind del badge de estado (bg + text + dark variants).
 */
export function getEstadoGREBadgeClass(estado: EstadoGRE): string {
  const CLASES: Record<EstadoGRE, string> = {
    Borrador:  'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    Pendiente: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    Emitida:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    Aceptada:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    Observada: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    Rechazada: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    Anulada:   'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
  };
  return CLASES[estado] ?? 'bg-gray-100 text-gray-700';
}

/** Estados visibles en el listado principal (no borradores). */
export const ESTADOS_GRE_LISTADO: EstadoGRE[] = [
  'Pendiente',
  'Emitida',
  'Aceptada',
  'Observada',
  'Rechazada',
  'Anulada',
];

export const puedeAnularGRE = (g: { esBorrador: boolean; estado: EstadoGRE }): boolean =>
  !g.esBorrador && g.estado !== 'Anulada';

export const puedeEditarGRE = (g: { esBorrador: boolean }): boolean => g.esBorrador;

export const puedeEliminarBorradorGRE = (g: { esBorrador: boolean }): boolean => g.esBorrador;
