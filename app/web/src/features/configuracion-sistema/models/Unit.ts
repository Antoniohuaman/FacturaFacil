// Unidades de Medida - Catálogo SUNAT
// ==================================

export interface Unit {
  id: string;
  code: string; // Código SUNAT (ej: NIU, KGM, MTR)
  name: string;
  symbol: string;
  description: string;
  category: 'WEIGHT' | 'LENGTH' | 'AREA' | 'VOLUME' | 'TIME' | 'QUANTITY' | 'OTHER';
  baseUnit?: string; // Unidad base para conversiones
  conversionFactor?: number; // Factor de conversión a la unidad base
  decimalPlaces: number; // Número de decimales permitidos
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUnitRequest {
  code: string;
  name: string;
  symbol: string;
  description: string;
  category: Unit['category'];
  baseUnit?: string;
  conversionFactor?: number;
  decimalPlaces: number;
}

export interface UpdateUnitRequest extends Partial<CreateUnitRequest> {
  id: string;
}

export interface UnitSummary {
  id: string;
  code: string;
  name: string;
  symbol: string;
  category: Unit['category'];
  isActive: boolean;
}

// Unidades de medida comunes según catálogo SUNAT
export const SUNAT_UNITS = [
  // Cantidad/Unidades
  {
    code: 'NIU',
    name: 'Unidad',
    symbol: 'Unid.',
    description: 'Unidad de medida básica',
    category: 'QUANTITY' as const,
    decimalPlaces: 0,
  },
  {
    code: 'ZZ',
    name: 'Unidad (servicios)',
    symbol: 'Serv.',
    description: 'Unidad para servicios',
    category: 'QUANTITY' as const,
    decimalPlaces: 0,
  },
  
  // Peso
  {
    code: 'KGM',
    name: 'Kilogramo',
    symbol: 'kg',
    description: 'Kilogramo - unidad de masa',
    category: 'WEIGHT' as const,
    baseUnit: 'KGM',
    conversionFactor: 1,
    decimalPlaces: 3,
  },
  {
    code: 'GRM',
    name: 'Gramo',
    symbol: 'g',
    description: 'Gramo - unidad de masa',
    category: 'WEIGHT' as const,
    baseUnit: 'KGM',
    conversionFactor: 0.001,
    decimalPlaces: 3,
  },
  {
    code: 'TNE',
    name: 'Tonelada',
    symbol: 't',
    description: 'Tonelada métrica',
    category: 'WEIGHT' as const,
    baseUnit: 'KGM',
    conversionFactor: 1000,
    decimalPlaces: 3,
  },
  
  // Longitud
  {
    code: 'MTR',
    name: 'Metro',
    symbol: 'm',
    description: 'Metro - unidad de longitud',
    category: 'LENGTH' as const,
    baseUnit: 'MTR',
    conversionFactor: 1,
    decimalPlaces: 2,
  },
  {
    code: 'CMT',
    name: 'Centímetro',
    symbol: 'cm',
    description: 'Centímetro - unidad de longitud',
    category: 'LENGTH' as const,
    baseUnit: 'MTR',
    conversionFactor: 0.01,
    decimalPlaces: 2,
  },
  {
    code: 'INH',
    name: 'Pulgada',
    symbol: 'in',
    description: 'Pulgada - unidad de longitud',
    category: 'LENGTH' as const,
    baseUnit: 'MTR',
    conversionFactor: 0.0254,
    decimalPlaces: 2,
  },
  
  // Área
  {
    code: 'MTK',
    name: 'Metro cuadrado',
    symbol: 'm²',
    description: 'Metro cuadrado - unidad de área',
    category: 'AREA' as const,
    baseUnit: 'MTK',
    conversionFactor: 1,
    decimalPlaces: 2,
  },
  
  // Volumen
  {
    code: 'LTR',
    name: 'Litro',
    symbol: 'L',
    description: 'Litro - unidad de volumen',
    category: 'VOLUME' as const,
    baseUnit: 'LTR',
    conversionFactor: 1,
    decimalPlaces: 2,
  },
  {
    code: 'MLT',
    name: 'Mililitro',
    symbol: 'ml',
    description: 'Mililitro - unidad de volumen',
    category: 'VOLUME' as const,
    baseUnit: 'LTR',
    conversionFactor: 0.001,
    decimalPlaces: 2,
  },
  {
    code: 'MTQ',
    name: 'Metro cúbico',
    symbol: 'm³',
    description: 'Metro cúbico - unidad de volumen',
    category: 'VOLUME' as const,
    baseUnit: 'MTQ',
    conversionFactor: 1,
    decimalPlaces: 3,
  },
  
  // Tiempo
  {
    code: 'HUR',
    name: 'Hora',
    symbol: 'h',
    description: 'Hora - unidad de tiempo',
    category: 'TIME' as const,
    baseUnit: 'HUR',
    conversionFactor: 1,
    decimalPlaces: 2,
  },
  {
    code: 'MIN',
    name: 'Minuto',
    symbol: 'min',
    description: 'Minuto - unidad de tiempo',
    category: 'TIME' as const,
    baseUnit: 'HUR',
    conversionFactor: 0.0167,
    decimalPlaces: 2,
  },
  {
    code: 'DAY',
    name: 'Día',
    symbol: 'día',
    description: 'Día - unidad de tiempo',
    category: 'TIME' as const,
    baseUnit: 'HUR',
    conversionFactor: 24,
    decimalPlaces: 0,
  },
] as const;

export const UNIT_CATEGORIES = [
  { value: 'QUANTITY', label: 'Cantidad', icon: 'Hash' },
  { value: 'WEIGHT', label: 'Peso', icon: 'Scale' },
  { value: 'LENGTH', label: 'Longitud', icon: 'Ruler' },
  { value: 'AREA', label: 'Área', icon: 'Square' },
  { value: 'VOLUME', label: 'Volumen', icon: 'Box' },
  { value: 'TIME', label: 'Tiempo', icon: 'Clock' },
  { value: 'OTHER', label: 'Otros', icon: 'MoreHorizontal' },
] as const;