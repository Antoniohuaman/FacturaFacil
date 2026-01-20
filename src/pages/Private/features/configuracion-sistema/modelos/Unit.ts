// Unidades de Medida - Catálogo SUNAT
// ==================================

export interface Unit {
  id: string;
  code: string; // Código SUNAT (ej: NIU, KGM, MTR)
  name: string;
  symbol: string;
  description: string;
  category: 'WEIGHT' | 'LENGTH' | 'AREA' | 'VOLUME' | 'TIME' | 'QUANTITY' | 'ENERGY' | 'PACKAGING' | 'OTHER';
  baseUnit?: string; // Unidad base para conversiones
  conversionFactor?: number; // Factor de conversión a la unidad base
  decimalPlaces: number; // Número de decimales permitidos
  isActive: boolean;
  isSystem?: boolean; // Indica si es unidad del sistema SUNAT
  isFavorite?: boolean; // Marcada como favorita por el usuario
  isVisible?: boolean; // Visible en selectores
  displayOrder?: number; // Orden de visualización en favoritos
  usageCount?: number; // Contador de uso para sugerencias
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

// Catálogo completo de unidades de medida SUNAT
export const SUNAT_UNITS = [
  // CANTIDAD/UNIDADES BÁSICAS
  {
    code: 'NIU',
    name: 'Unidad',
    symbol: 'UND',
    description: 'Unidad de medida básica',
    category: 'QUANTITY' as const,
    decimalPlaces: 0,
  },
  {
    code: 'ZZ',
    name: 'Servicio',
    symbol: 'SERV',
    description: 'Unidad para servicios',
    category: 'QUANTITY' as const,
    decimalPlaces: 0,
  },

  // PESO/MASA
  {
    code: 'KGM',
    name: 'Kilogramo',
    symbol: 'KG',
    description: 'Kilogramo - unidad de masa',
    category: 'WEIGHT' as const,
    baseUnit: 'KGM',
    conversionFactor: 1,
    decimalPlaces: 3,
  },
  {
    code: 'GRM',
    name: 'Gramo',
    symbol: 'GR',
    description: 'Gramo - unidad de masa',
    category: 'WEIGHT' as const,
    baseUnit: 'KGM',
    conversionFactor: 0.001,
    decimalPlaces: 3,
  },
  {
    code: 'TNE',
    name: 'Tonelada métrica',
    symbol: 'TNL',
    description: 'Tonelada métrica - 1000 kg',
    category: 'WEIGHT' as const,
    baseUnit: 'KGM',
    conversionFactor: 1000,
    decimalPlaces: 3,
  },

  // LONGITUD
  {
    code: 'MTR',
    name: 'Metro',
    symbol: 'M',
    description: 'Metro - unidad de longitud',
    category: 'LENGTH' as const,
    baseUnit: 'MTR',
    conversionFactor: 1,
    decimalPlaces: 2,
  },
  {
    code: 'CMT',
    name: 'Centímetro',
    symbol: 'CM',
    description: 'Centímetro - unidad de longitud',
    category: 'LENGTH' as const,
    baseUnit: 'MTR',
    conversionFactor: 0.01,
    decimalPlaces: 2,
  },
  {
    code: 'INH',
    name: 'Pulgada',
    symbol: 'INCH',
    description: 'Pulgada - unidad de longitud',
    category: 'LENGTH' as const,
    baseUnit: 'MTR',
    conversionFactor: 0.0254,
    decimalPlaces: 2,
  },
  {
    code: 'FOT',
    name: 'Pie',
    symbol: 'PIE',
    description: 'Pie - unidad de longitud',
    category: 'LENGTH' as const,
    baseUnit: 'MTR',
    conversionFactor: 0.3048,
    decimalPlaces: 2,
  },
  {
    code: 'YRD',
    name: 'Yarda',
    symbol: 'YD',
    description: 'Yarda - unidad de longitud',
    category: 'LENGTH' as const,
    baseUnit: 'MTR',
    conversionFactor: 0.9144,
    decimalPlaces: 2,
  },

  // ÁREA
  {
    code: 'MTK',
    name: 'Metro cuadrado',
    symbol: 'M2',
    description: 'Metro cuadrado - unidad de área',
    category: 'AREA' as const,
    baseUnit: 'MTK',
    conversionFactor: 1,
    decimalPlaces: 2,
  },

  // VOLUMEN
  {
    code: 'LTR',
    name: 'Litro',
    symbol: 'LT',
    description: 'Litro - unidad de volumen',
    category: 'VOLUME' as const,
    baseUnit: 'LTR',
    conversionFactor: 1,
    decimalPlaces: 2,
  },
  {
    code: 'MLT',
    name: 'Mililitro',
    symbol: 'ML',
    description: 'Mililitro - unidad de volumen',
    category: 'VOLUME' as const,
    baseUnit: 'LTR',
    conversionFactor: 0.001,
    decimalPlaces: 2,
  },
  {
    code: 'MTQ',
    name: 'Metro cúbico',
    symbol: 'M3',
    description: 'Metro cúbico - unidad de volumen',
    category: 'VOLUME' as const,
    baseUnit: 'MTQ',
    conversionFactor: 1,
    decimalPlaces: 3,
  },
  {
    code: 'GLL',
    name: 'Galón',
    symbol: 'GL',
    description: 'Galón - unidad de volumen',
    category: 'VOLUME' as const,
    baseUnit: 'LTR',
    conversionFactor: 3.78541,
    decimalPlaces: 2,
  },

  // TIEMPO
  {
    code: 'HUR',
    name: 'Hora',
    symbol: 'HR',
    description: 'Hora - unidad de tiempo',
    category: 'TIME' as const,
    baseUnit: 'HUR',
    conversionFactor: 1,
    decimalPlaces: 2,
  },
  {
    code: 'SEC',
    name: 'Segundo',
    symbol: 'SEG',
    description: 'Segundo - unidad de tiempo',
    category: 'TIME' as const,
    baseUnit: 'HUR',
    conversionFactor: 0.000278,
    decimalPlaces: 6,
  },

  // ENERGÍA
  {
    code: 'KWH',
    name: 'Kilovatio hora',
    symbol: 'KWxH',
    description: 'Kilovatio hora - unidad de energía',
    category: 'ENERGY' as const,
    baseUnit: 'KWH',
    conversionFactor: 1,
    decimalPlaces: 3,
  },

  // EMPAQUE/AGRUPAMIENTO
  {
    code: 'BX',
    name: 'Caja',
    symbol: 'CAJ',
    description: 'Caja - unidad de empaque',
    category: 'PACKAGING' as const,
    decimalPlaces: 0,
  },
  {
    code: 'DZN',
    name: 'Docena',
    symbol: 'DOC',
    description: 'Docena - 12 unidades',
    category: 'PACKAGING' as const,
    baseUnit: 'NIU',
    conversionFactor: 12,
    decimalPlaces: 0,
  },
  {
    code: 'QD',
    name: 'Cuarto de docena',
    symbol: '1/4 DOC',
    description: 'Cuarto de docena - 3 unidades',
    category: 'PACKAGING' as const,
    baseUnit: 'NIU',
    conversionFactor: 3,
    decimalPlaces: 0,
  },
  {
    code: 'PK',
    name: 'Paquete',
    symbol: 'PQT',
    description: 'Paquete - unidad de empaque',
    category: 'PACKAGING' as const,
    decimalPlaces: 0,
  },
  {
    code: 'CEN',
    name: 'Centenar',
    symbol: 'CTO',
    description: 'Centenar - 100 unidades',
    category: 'PACKAGING' as const,
    baseUnit: 'NIU',
    conversionFactor: 100,
    decimalPlaces: 0,
  },
  {
    code: 'MIL',
    name: 'Millar',
    symbol: 'MIL',
    description: 'Millar - 1000 unidades',
    category: 'PACKAGING' as const,
    baseUnit: 'NIU',
    conversionFactor: 1000,
    decimalPlaces: 0,
  },
  {
    code: 'BG',
    name: 'Bolsa',
    symbol: 'BOLS',
    description: 'Bolsa - unidad de empaque',
    category: 'PACKAGING' as const,
    decimalPlaces: 0,
  },
  {
    code: 'SA',
    name: 'Saco',
    symbol: 'SCO',
    description: 'Saco - unidad de empaque',
    category: 'PACKAGING' as const,
    decimalPlaces: 0,
  },
  {
    code: 'CY',
    name: 'Cilindro',
    symbol: 'CIL',
    description: 'Cilindro - unidad de empaque',
    category: 'PACKAGING' as const,
    decimalPlaces: 0,
  },
  {
    code: 'JG',
    name: 'Jarra',
    symbol: 'JARR',
    description: 'Jarra - unidad de empaque',
    category: 'PACKAGING' as const,
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
  { value: 'ENERGY', label: 'Energía', icon: 'Zap' },
  { value: 'PACKAGING', label: 'Empaque', icon: 'Package' },
  { value: 'OTHER', label: 'Otros', icon: 'MoreHorizontal' },
] as const;