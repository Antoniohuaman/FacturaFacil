// Configuration models index
export type { Company } from './Company';
export type { Employee, Permission } from './Employee';
export type { Establishment } from './Establishment';
export type { Role } from './Role';
export type { Series } from './Series';
export type { PaymentMethod } from './PaymentMethod';
export type { Currency } from './Currency';
export type { Unit } from './Unit';
export type { Tax as TaxConfiguration } from './Tax';
export type { Configuration, ConfigurationModule, ConfigurationStep } from './Configuration';

// Re-export common types
export type DocumentType = 'DNI' | 'RUC' | 'PASSPORT' | 'FOREIGN_CARD' | 'OTHER';