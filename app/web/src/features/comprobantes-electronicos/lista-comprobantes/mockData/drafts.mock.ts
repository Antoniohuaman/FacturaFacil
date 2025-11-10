/**
 * Tipos para borradores de comprobantes
 * Los datos reales se gestionan mediante localStorage.
 * Este archivo mantiene solo las definiciones de tipos.
 */

export interface Draft {
  id: string;
  type: string;
  clientDoc: string;
  client: string;
  createdDate: string;
  expiryDate: string;
  vendor: string;
  total: number;
  status: 'Vigente' | 'Por vencer' | 'Vencido';
  daysLeft: number;
  statusColor: 'green' | 'orange' | 'red';
}

/**
 * Array vacío - Los borradores reales se gestionan en localStorage
 * Clave: 'borradores' (ver SYSTEM_CONFIG.DRAFTS_STORAGE_KEY en constants.ts)
 */
export const MOCK_DRAFTS: Draft[] = [];
