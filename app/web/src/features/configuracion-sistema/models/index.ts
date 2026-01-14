// Configuration models index
export type { Company } from './Company';
export type { User, Permission } from './User';
export type { Establishment } from './Establishment';
export type { Role } from './Role';
export type { Series } from './Series';
export type { PaymentMethod } from './PaymentMethod';
export type { Currency } from './Currency';
export type { Unit } from './Unit';
export type { Tax as TaxConfiguration } from './Tax';
export type { Configuration, ConfigurationModule, ConfigurationStep } from './Configuration';
export type { Caja, CreateCajaInput, UpdateCajaInput, MedioPago, DispositivosCaja } from './Caja';
export { CAJA_CONSTRAINTS, MEDIOS_PAGO_DISPONIBLES } from './Caja';

// Re-export common types
export type DocumentType = 'DNI' | 'RUC' | 'PASSPORT' | 'FOREIGN_CARD' | 'OTHER';