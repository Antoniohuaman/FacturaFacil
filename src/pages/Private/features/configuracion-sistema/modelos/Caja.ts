// Model for cash register (Caja) configuration within System Configuration
// Scoped by empresaId and establecimientoId
import type { MedioPago as SharedMedioPago } from '../../../../../shared/payments/medioPago';

export type MedioPago = SharedMedioPago;

export interface DispositivosCaja {
  impresoraPorDefecto?: string;
  posDispositivo?: string;
}

export interface Caja {
  id: string;
  empresaId: string;
  establecimientoIdCaja: string;
  nombreCaja: string;
  monedaIdCaja: string; // References Currency.id from the system's currency catalog
  mediosPagoPermitidos: MedioPago[];
  limiteMaximoCaja: number; // Maximum cash limit (≥ 0)
  margenDescuadreCaja: number; // Allowed discrepancy margin (0-50)
  habilitadaCaja: boolean;
  usuariosAutorizadosCaja: string[]; // User/Role IDs authorized to operate this cash register
  dispositivosCaja?: DispositivosCaja;
  observacionesCaja?: string;
  tieneHistorialMovimientos: boolean; // Indicates if this caja has been used in any session (prevents deletion)
  tieneSesionAbierta: boolean; // Indicates if this caja has an active session (prevents editing/deletion)
  creadoElCaja: Date;
  actualizadoElCaja: Date;
}

export interface CreateCajaInput {
  establecimientoIdCaja: string; // Required: Establecimiento where this caja will be created
  nombreCaja: string;
  monedaIdCaja: string;
  mediosPagoPermitidos: MedioPago[];
  limiteMaximoCaja: number;
  margenDescuadreCaja: number;
  habilitadaCaja: boolean;
  usuariosAutorizadosCaja?: string[];
  dispositivosCaja?: DispositivosCaja;
  observacionesCaja?: string;
}

export interface UpdateCajaInput extends Partial<CreateCajaInput> {
  id?: string; // Optional since id is passed as parameter to update method
  tieneHistorialMovimientos?: boolean; // Can be updated when operations occur
  tieneSesionAbierta?: boolean; // Can be updated when sessions open/close
}

// Validation constraints
export const CAJA_CONSTRAINTS = {
  maxLongitudNombreCaja: 60,
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
