// Model for cash register (Caja) configuration within System Configuration
// Scoped by empresaId and establecimientoId
import type { MedioPago as SharedMedioPago } from '../../../../../shared/payments/medioPago';

export type MedioPago = SharedMedioPago;

export interface DispositivosCaja {
  impresoraPorDefecto?: string;
  pos?: string;
}

export interface Caja {
  id: string;
  empresaId: string;
  establecimientoId: string;
  nombre: string;
  monedaId: string; // References Currency.id from the system's currency catalog
  mediosPagoPermitidos: MedioPago[];
  limiteMaximo: number; // Maximum cash limit (≥ 0)
  margenDescuadre: number; // Allowed discrepancy margin (0-50)
  habilitada: boolean;
  usuariosAutorizados: string[]; // User/Role IDs authorized to operate this cash register
  dispositivos?: DispositivosCaja;
  observaciones?: string;
  tieneHistorial: boolean; // Indicates if this caja has been used in any session (prevents deletion)
  tieneSesionAbierta: boolean; // Indicates if this caja has an active session (prevents editing/deletion)
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCajaInput {
  establecimientoId: string; // Required: Establecimiento where this caja will be created
  nombre: string;
  monedaId: string;
  mediosPagoPermitidos: MedioPago[];
  limiteMaximo: number;
  margenDescuadre: number;
  habilitada: boolean;
  usuariosAutorizados?: string[];
  dispositivos?: DispositivosCaja;
  observaciones?: string;
}

export interface UpdateCajaInput extends Partial<CreateCajaInput> {
  id?: string; // Optional since id is passed as parameter to update method
  tieneHistorial?: boolean; // Can be updated when operations occur
  tieneSesionAbierta?: boolean; // Can be updated when sessions open/close
}

// Validation constraints
export const CAJA_CONSTRAINTS = {
  NOMBRE_MAX_LENGTH: 60,
  MARGEN_MIN: 0,
  MARGEN_MAX: 50,
  LIMITE_MIN: 0
} as const;

// Available payment methods for the system
export const MEDIOS_PAGO_DISPONIBLES: MedioPago[] = [
  'Efectivo',
  'Tarjeta', 
  'Yape',
  'Plin',
  'Transferencia',
  'Deposito'
] as const;
