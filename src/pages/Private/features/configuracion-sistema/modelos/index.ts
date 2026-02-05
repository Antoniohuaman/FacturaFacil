// Configuration models index
export type { Company } from './Company';
export type { User, Permission } from './User';
export type { Establecimiento } from './Establecimiento';
export type { Role } from './Role';
export type { Series } from './Series';
export type { PaymentMethod } from './PaymentMethod';
export type { Currency } from './Currency';
export type UnitCategory =
	| 'OTHER'
	| 'TIME'
	| 'WEIGHT'
	| 'VOLUME'
	| 'LENGTH'
	| 'AREA'
	| 'ENERGY'
	| 'QUANTITY'
	| 'PACKAGING';

export interface Unit {
	id: string;
	code: string;
	name: string;
	symbol?: string;
	description?: string;
	category: UnitCategory;
	baseUnit?: string;
	conversionFactor?: number;
	decimalPlaces: number;
	isActive: boolean;
	isSystem?: boolean;
	isFavorite?: boolean;
	isVisible?: boolean;
	displayOrder?: number;
	usageCount?: number;
	createdAt: Date;
	updatedAt: Date;
}

export interface SunatUnitCatalogItem {
	code: string;
	name: string;
	symbol?: string;
	description: string;
	category: UnitCategory;
	decimalPlaces: number;
	baseUnit?: string;
	conversionFactor?: number;
}

// Catálogo SUNAT actualizado (dataset exacto provisto)
export const SUNAT_UNITS: SunatUnitCatalogItem[] = [
	// 1) Servicios
	{ code: 'ZZ', name: 'Servicio', description: 'Servicio', category: 'OTHER', decimalPlaces: 0 },

	// 2) Tiempos
	{ code: 'HUR', name: 'Hora', description: 'Hora', category: 'TIME', decimalPlaces: 2, baseUnit: 'HUR', conversionFactor: 1 },
	{ code: 'HT', name: 'Media hora', description: 'Media hora', category: 'TIME', decimalPlaces: 2, baseUnit: 'HUR', conversionFactor: 0.5 },
	{ code: 'SEC', name: 'Segundo', description: 'Segundo', category: 'TIME', decimalPlaces: 6, baseUnit: 'HUR', conversionFactor: 1 / 3600 },

	// 3) Pesos
	{ code: 'KGM', name: 'Kilogramo', description: 'Kilogramo', category: 'WEIGHT', decimalPlaces: 3, baseUnit: 'KGM', conversionFactor: 1 },
	{ code: 'GRM', name: 'Gramos', description: 'Gramos', category: 'WEIGHT', decimalPlaces: 3, baseUnit: 'KGM', conversionFactor: 0.001 },
	{ code: 'MGM', name: 'Miligramos', description: 'Miligramos', category: 'WEIGHT', decimalPlaces: 3, baseUnit: 'KGM', conversionFactor: 0.000001 },
	{ code: 'TNE', name: 'Toneladas', description: 'Toneladas', category: 'WEIGHT', decimalPlaces: 3, baseUnit: 'KGM', conversionFactor: 1000 },
	{ code: 'ONZ', name: 'Onzas', description: 'Onzas', category: 'WEIGHT', decimalPlaces: 3, baseUnit: 'KGM', conversionFactor: 0.028349523125 },
	{ code: 'LBR', name: 'Libras', description: 'Libras', category: 'WEIGHT', decimalPlaces: 3, baseUnit: 'KGM', conversionFactor: 0.45359237 },

	// 4) Volúmenes
	{ code: 'LTR', name: 'Litro', description: 'Litro', category: 'VOLUME', decimalPlaces: 2, baseUnit: 'LTR', conversionFactor: 1 },
	{ code: 'MLT', name: 'Mililitro', description: 'Mililitro', category: 'VOLUME', decimalPlaces: 2, baseUnit: 'LTR', conversionFactor: 0.001 },
	{ code: 'GLL', name: 'Galón', description: 'Galón', category: 'VOLUME', decimalPlaces: 2, baseUnit: 'LTR', conversionFactor: 3.78541 },
	{ code: 'GLI', name: 'Galón inglés', description: 'Galón inglés', category: 'VOLUME', decimalPlaces: 2, baseUnit: 'LTR', conversionFactor: 4.54609 },
	{ code: 'MTQ', name: 'Metro cúbico', description: 'Metro cúbico', category: 'VOLUME', decimalPlaces: 3, baseUnit: 'MTQ', conversionFactor: 1 },
	{ code: 'CMQ', name: 'Centímetro cúbico', description: 'Centímetro cúbico', category: 'VOLUME', decimalPlaces: 3, baseUnit: 'MTQ', conversionFactor: 0.000001 },
	{ code: 'MMQ', name: 'Milímetro cúbico', description: 'Milímetro cúbico', category: 'VOLUME', decimalPlaces: 3, baseUnit: 'MTQ', conversionFactor: 0.000000001 },
	{ code: 'FTQ', name: 'Pies cúbicos', description: 'Pies cúbicos', category: 'VOLUME', decimalPlaces: 3, baseUnit: 'MTQ', conversionFactor: 0.028316846592 },

	// 5) Longitudes
	{ code: 'MTR', name: 'Metro', description: 'Metro', category: 'LENGTH', decimalPlaces: 2, baseUnit: 'MTR', conversionFactor: 1 },
	{ code: 'CMT', name: 'Centímetro', description: 'Centímetro', category: 'LENGTH', decimalPlaces: 2, baseUnit: 'MTR', conversionFactor: 0.01 },
	{ code: 'MMT', name: 'Milímetro', description: 'Milímetro', category: 'LENGTH', decimalPlaces: 2, baseUnit: 'MTR', conversionFactor: 0.001 },
	{ code: 'KTM', name: 'Kilómetro', description: 'Kilómetro', category: 'LENGTH', decimalPlaces: 2, baseUnit: 'MTR', conversionFactor: 1000 },
	{ code: 'INH', name: 'Pulgadas', description: 'Pulgadas', category: 'LENGTH', decimalPlaces: 2, baseUnit: 'MTR', conversionFactor: 0.0254 },
	{ code: 'YRD', name: 'Yarda', description: 'Yarda', category: 'LENGTH', decimalPlaces: 2, baseUnit: 'MTR', conversionFactor: 0.9144 },
	{ code: 'FOT', name: 'Pies', description: 'Pies', category: 'LENGTH', decimalPlaces: 2, baseUnit: 'MTR', conversionFactor: 0.3048 },

	// 6) Áreas
	{ code: 'CMK', name: 'Centímetro cuadrado', description: 'Centímetro cuadrado', category: 'AREA', decimalPlaces: 2, baseUnit: 'MTK', conversionFactor: 0.0001 },
	{ code: 'MMK', name: 'Milímetro cuadrado', description: 'Milímetro cuadrado', category: 'AREA', decimalPlaces: 2, baseUnit: 'MTK', conversionFactor: 0.000001 },
	{ code: 'MTK', name: 'Metro cuadrado', description: 'Metro cuadrado', category: 'AREA', decimalPlaces: 2, baseUnit: 'MTK', conversionFactor: 1 },
	{ code: 'FTK', name: 'Pies cuadrados', description: 'Pies cuadrados', category: 'AREA', decimalPlaces: 2, baseUnit: 'MTK', conversionFactor: 0.09290304 },

	// 7) Energías
	{ code: 'KWH', name: 'Kilovatio hora', description: 'Kilovatio hora', category: 'ENERGY', decimalPlaces: 3, baseUnit: 'KWH', conversionFactor: 1 },
	{ code: 'MWH', name: 'Megavatio hora', description: 'Megavatio hora', category: 'ENERGY', decimalPlaces: 3, baseUnit: 'KWH', conversionFactor: 1000 },

	// 8) Cantidades
	{ code: 'NIU', name: 'Unidad', description: 'Unidad', category: 'QUANTITY', decimalPlaces: 0 },
	{ code: 'C62', name: 'Piezas', description: 'Piezas', category: 'QUANTITY', decimalPlaces: 0 },
	{ code: 'CEN', name: 'Ciento de unidades', description: 'Ciento de unidades', category: 'QUANTITY', decimalPlaces: 0 },
	{ code: 'MIL', name: 'Millar', description: 'Millar', category: 'QUANTITY', decimalPlaces: 0 },
	{ code: 'UM', name: 'Millón', description: 'Millón', category: 'QUANTITY', decimalPlaces: 0 },
	{ code: 'DZN', name: 'Docena', description: 'Docena', category: 'QUANTITY', decimalPlaces: 0 },
	{ code: 'QD', name: 'Cuarto de docena', description: 'Cuarto de docena', category: 'QUANTITY', decimalPlaces: 0 },
	{ code: 'HD', name: 'Media docena', description: 'Media docena', category: 'QUANTITY', decimalPlaces: 0 },
	{ code: 'DZP', name: 'Docena de paquetes', description: 'Docena de paquetes', category: 'QUANTITY', decimalPlaces: 0 },
	{ code: 'PR', name: 'Par', description: 'Par', category: 'QUANTITY', decimalPlaces: 0 },
	{ code: 'SET', name: 'Juego', description: 'Juego', category: 'QUANTITY', decimalPlaces: 0 },
	{ code: 'KT', name: 'Kit', description: 'Kit', category: 'QUANTITY', decimalPlaces: 0 },

	// 9) Empaques
	{ code: 'BX', name: 'Caja', description: 'Caja', category: 'PACKAGING', decimalPlaces: 0 },
	{ code: 'BG', name: 'Bolsa', description: 'Bolsa', category: 'PACKAGING', decimalPlaces: 0 },
	{ code: 'BO', name: 'Botellas', description: 'Botellas', category: 'PACKAGING', decimalPlaces: 0 },
	{ code: 'BJ', name: 'Balde', description: 'Balde', category: 'PACKAGING', decimalPlaces: 0 },
	{ code: 'BLL', name: 'Barril', description: 'Barril', category: 'PACKAGING', decimalPlaces: 0 },
	{ code: 'SA', name: 'Saco', description: 'Saco', category: 'PACKAGING', decimalPlaces: 0 },
	{ code: 'PK', name: 'Paquete', description: 'Paquete', category: 'PACKAGING', decimalPlaces: 0 },
	{ code: 'CH', name: 'Envase', description: 'Envase', category: 'PACKAGING', decimalPlaces: 0 },
	{ code: 'JR', name: 'Frasco', description: 'Frasco', category: 'PACKAGING', decimalPlaces: 0 },
	{ code: 'JG', name: 'Jarra', description: 'Jarra', category: 'PACKAGING', decimalPlaces: 0 },
	{ code: 'AV', name: 'Cápsula', description: 'Cápsula', category: 'PACKAGING', decimalPlaces: 0 },
	{ code: 'CT', name: 'Cartón', description: 'Cartón', category: 'PACKAGING', decimalPlaces: 0 },
	{ code: 'CA', name: 'Latas', description: 'Latas', category: 'PACKAGING', decimalPlaces: 0 },
	{ code: 'BE', name: 'Fardo', description: 'Fardo', category: 'PACKAGING', decimalPlaces: 0 },
	{ code: 'CY', name: 'Cilindro', description: 'Cilindro', category: 'PACKAGING', decimalPlaces: 0 },
	{ code: 'U2', name: 'Blister', description: 'Blister', category: 'PACKAGING', decimalPlaces: 0 },
	{ code: 'LEF', name: 'Hoja', description: 'Hoja', category: 'PACKAGING', decimalPlaces: 0 },
	{ code: 'ST', name: 'Pliego', description: 'Pliego', category: 'PACKAGING', decimalPlaces: 0 },
	{ code: 'TU', name: 'Tubos', description: 'Tubos', category: 'PACKAGING', decimalPlaces: 0 },
	{ code: 'RL', name: 'Carrete', description: 'Carrete', category: 'PACKAGING', decimalPlaces: 0 },
	{ code: 'RD', name: 'Varilla', description: 'Varilla', category: 'PACKAGING', decimalPlaces: 0 },
	{ code: 'PG', name: 'Placas', description: 'Placas', category: 'PACKAGING', decimalPlaces: 0 },
	{ code: 'PF', name: 'Paletas', description: 'Paletas', category: 'PACKAGING', decimalPlaces: 0 },
	{ code: 'BT', name: 'Tornillo', description: 'Tornillo', category: 'PACKAGING', decimalPlaces: 0 },
	{ code: 'RM', name: 'Resma', description: 'Resma', category: 'PACKAGING', decimalPlaces: 0 },
];
export type { Tax as TaxConfiguration } from './Tax';
export type { Configuration, ConfigurationModule, ConfigurationStep } from './Configuration';
export type { Caja, CreateCajaInput, UpdateCajaInput, MedioPago, DispositivosCaja } from './Caja';
export { CAJA_CONSTRAINTS, MEDIOS_PAGO_DISPONIBLES } from './Caja';

// Re-export common types
export type DocumentType = 'DNI' | 'RUC' | 'PASSPORT' | 'FOREIGN_CARD' | 'OTHER';