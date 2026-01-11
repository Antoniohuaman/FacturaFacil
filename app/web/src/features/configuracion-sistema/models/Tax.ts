export interface Tax {
  id: string;
  code: string;
  name: string;
  shortName: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'COMPOUND';
  rate: number; // Percentage (0-100) or fixed amount
  
  // SUNAT configuration
  sunatCode: string;
  sunatName: string;
  sunatType: 'VAT' | 'EXCISE' | 'OTHER';
  /**
   * Opcional: esquema tributario SUNAT (por ejemplo IGV 1000 / VAT).
   * Mantiene compatibilidad con los campos sunatCode/sunatType existentes
   * pero ofrece un modelo más explícito para integraciones.
   */
  taxScheme?: {
    id: string; // e.g. '1000' para IGV
    name: string; // e.g. 'IGV'
    taxTypeCode: 'VAT' | 'EXCISE' | 'OTHER';
  };

  /**
   * Código de afectación del IGV (Catálogo N° 07 SUNAT), por ejemplo:
   *  - '10' Gravado - Operación Onerosa
   *  - '20' Exonerado
   *  - '30' Inafecto
   *  - '40' Exportación
   * Es opcional para no romper usos existentes, pero se utilizará como
   * fuente de verdad para los desplegables de impuesto.
   */
  affectationCode?: string;
  affectationName?: string;
  
  // Tax behavior
  category: 'SALES' | 'PURCHASE' | 'WITHHOLDING' | 'PERCEPTION' | 'EXEMPTION' | 'OTHER';
  includeInPrice: boolean; // If tax is included in product price
  isCompound: boolean; // If this tax is calculated on top of other taxes
  compoundTaxIds?: string[]; // Taxes this one compounds on
  
  // Applicability
  applicableTo: {
    products: boolean;
    services: boolean;
    both: boolean;
  };
  
  // Special rules
  rules: {
    minimumAmount?: number; // Minimum transaction amount to apply
    maximumAmount?: number; // Maximum transaction amount to apply
    exemptionThreshold?: number; // Amount threshold for exemption
    roundingMethod: 'ROUND' | 'ROUND_UP' | 'ROUND_DOWN' | 'TRUNCATE';
    roundingPrecision: number; // Decimal places for rounding
  };
  
  // Regional/jurisdictional info
  jurisdiction: {
    country: string;
    region?: string;
    municipality?: string;
  };
  
  // Validity period
  isDefault: boolean;
  isActive: boolean;
  validFrom: Date;
  validTo: Date | null;
  
  // Metadata
  description?: string;
  internalNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTaxRequest {
  code: string;
  name: string;
  shortName: string;
  type: Tax['type'];
  rate: number;
  sunatCode: string;
  category: Tax['category'];
  includeInPrice?: boolean;
  applicableTo?: Tax['applicableTo'];
  rules?: Partial<Tax['rules']>;
  validFrom?: Date;
  validTo?: Date;
  description?: string;
}

export interface UpdateTaxRequest extends Partial<CreateTaxRequest> {
  id: string;
}

export interface TaxCalculation {
  taxId: string;
  taxName: string;
  baseAmount: number;
  taxRate: number;
  taxAmount: number;
  includedInPrice: boolean;
}

export interface TaxSummary {
  id: string;
  code: string;
  name: string;
  rate: number;
  type: Tax['type'];
  category: Tax['category'];
  isDefault: boolean;
  isActive: boolean;
  applicableScope: string;
}

// Predefined tax types for Peru
export const PERU_TAX_TYPES: Omit<Tax, 'id' | 'createdAt' | 'updatedAt' | 'isDefault'>[] = [
  {
    code: 'IGV18',
    name: 'IGV 18%',
    shortName: 'IGV 18%',
    type: 'PERCENTAGE',
    rate: 18.0,
    sunatCode: '1000',
    sunatName: 'IGV - Impuesto General a las Ventas',
    sunatType: 'VAT',
    category: 'SALES',
    includeInPrice: false,
    isCompound: false,
    applicableTo: {
      products: true,
      services: true,
      both: true,
    },
    rules: {
      roundingMethod: 'ROUND',
      roundingPrecision: 2,
    },
    jurisdiction: {
      country: 'PE',
    },
    isActive: true,
    validFrom: new Date('2011-03-01'), // IGV rate change date
    validTo: null,
    description: 'Impuesto General a las Ventas del 18% aplicable a la mayoría de bienes y servicios',
    taxScheme: {
      id: '1000',
      name: 'IGV',
      taxTypeCode: 'VAT',
    },
    affectationCode: '10',
    affectationName: 'Gravado - Operación Onerosa',
  },
  {
    code: 'IGV10',
    name: 'IGV 10%',
    shortName: 'IGV 10%',
    type: 'PERCENTAGE',
    rate: 10.0,
    sunatCode: '1000',
    sunatName: 'IGV - Impuesto General a las Ventas',
    sunatType: 'VAT',
    category: 'SALES',
    includeInPrice: false,
    isCompound: false,
    applicableTo: {
      products: true,
      services: true,
      both: true,
    },
    rules: {
      roundingMethod: 'ROUND',
      roundingPrecision: 2,
    },
    jurisdiction: {
      country: 'PE',
    },
    isActive: true,
    validFrom: new Date('2021-07-01'),
    validTo: null,
    description: 'IGV 10% aplicable a restaurantes, hoteles y servicios turísticos',
    taxScheme: {
      id: '1000',
      name: 'IGV',
      taxTypeCode: 'VAT',
    },
    affectationCode: '10',
    affectationName: 'Gravado - Operación Onerosa',
  },
  {
    code: 'IGV_EXP',
    name: 'Exportación',
    shortName: 'EXP',
    type: 'PERCENTAGE',
    rate: 0.0,
    sunatCode: '9995',
    sunatName: 'EXP - Exportación',
    sunatType: 'VAT',
    category: 'EXEMPTION',
    includeInPrice: false,
    isCompound: false,
    applicableTo: {
      products: true,
      services: true,
      both: true,
    },
    rules: {
      roundingMethod: 'ROUND',
      roundingPrecision: 2,
    },
    jurisdiction: {
      country: 'PE',
    },
    isActive: true,
    validFrom: new Date('2000-01-01'),
    validTo: null,
    description: 'Operaciones de exportación gravadas con IGV a tasa 0%',
    taxScheme: {
      id: '9995',
      name: 'EXP',
      taxTypeCode: 'VAT',
    },
    affectationCode: '40',
    affectationName: 'Exportación',
  },
  {
    code: 'EXO',
    name: 'Exonerado',
    shortName: 'EXO',
    type: 'PERCENTAGE',
    rate: 0.0,
    sunatCode: '9997',
    sunatName: 'EXO - Exonerado',
    sunatType: 'VAT',
    category: 'EXEMPTION',
    includeInPrice: false,
    isCompound: false,
    applicableTo: {
      products: true,
      services: true,
      both: true,
    },
    rules: {
      roundingMethod: 'ROUND',
      roundingPrecision: 2,
    },
    jurisdiction: {
      country: 'PE',
    },
    isActive: true,
    validFrom: new Date('2000-01-01'),
    validTo: null,
    description: 'Productos y servicios exonerados del IGV',
    taxScheme: {
      id: '1000',
      name: 'IGV',
      taxTypeCode: 'VAT',
    },
    affectationCode: '20',
    affectationName: 'Exonerado',
  },
  {
    code: 'INA',
    name: 'Inafecto',
    shortName: 'INA',
    type: 'PERCENTAGE',
    rate: 0.0,
    sunatCode: '9998',
    sunatName: 'INA - Inafecto',
    sunatType: 'VAT',
    category: 'EXEMPTION',
    includeInPrice: false,
    isCompound: false,
    applicableTo: {
      products: true,
      services: true,
      both: true,
    },
    rules: {
      roundingMethod: 'ROUND',
      roundingPrecision: 2,
    },
    jurisdiction: {
      country: 'PE',
    },
    isActive: true,
    validFrom: new Date('2000-01-01'),
    validTo: null,
    description: 'Operaciones inafectas al IGV',
    taxScheme: {
      id: '1000',
      name: 'IGV',
      taxTypeCode: 'VAT',
    },
    affectationCode: '30',
    affectationName: 'Inafecto',
  },
  {
    code: 'ISC',
    name: 'Impuesto Selectivo al Consumo',
    shortName: 'ISC',
    type: 'PERCENTAGE',
    rate: 0.0, // Variable depending on product
    sunatCode: '2000',
    sunatName: 'ISC - Impuesto Selectivo al Consumo',
    sunatType: 'EXCISE',
    category: 'SALES',
    includeInPrice: false,
    isCompound: false,
    applicableTo: {
      products: true,
      services: false,
      both: false,
    },
    rules: {
      roundingMethod: 'ROUND',
      roundingPrecision: 2,
    },
    jurisdiction: {
      country: 'PE',
    },
    isActive: true,
    validFrom: new Date('2000-01-01'),
    validTo: null,
    description: 'Impuesto selectivo aplicable a productos específicos (combustibles, licores, etc.)',
  },
  {
    code: 'ICBPER',
    name: 'Impuesto a las Bolsas de Plástico',
    shortName: 'ICBPER',
    type: 'FIXED_AMOUNT',
    rate: 0.50, // S/ 0.50 per bag
    sunatCode: '7152',
    sunatName: 'ICBPER - Impuesto a las Bolsas de Plástico',
    sunatType: 'OTHER',
    category: 'OTHER',
    includeInPrice: false,
    isCompound: false,
    applicableTo: {
      products: true,
      services: false,
      both: false,
    },
    rules: {
      roundingMethod: 'ROUND',
      roundingPrecision: 2,
    },
    jurisdiction: {
      country: 'PE',
    },
    isActive: true,
    validFrom: new Date('2019-07-30'),
    validTo: null,
    description: 'Impuesto de S/ 0.50 por bolsa de plástico',
  },
];

export const TAX_CATEGORIES = [
  { value: 'SALES', label: 'Impuesto a las Ventas', description: 'IGV, impuestos sobre ventas' },
  { value: 'PURCHASE', label: 'Impuesto a las Compras', description: 'Impuestos aplicables a compras' },
  { value: 'WITHHOLDING', label: 'Retención', description: 'Impuestos retenidos' },
  { value: 'PERCEPTION', label: 'Percepción', description: 'Impuestos percibidos' },
  { value: 'EXEMPTION', label: 'Exención', description: 'Exonerado, inafecto, exportación' },
  { value: 'OTHER', label: 'Otros', description: 'Otros tipos de impuestos' },
] as const;

/**
 * Normaliza una lista de impuestos garantizando las invariantes de configuración:
 * - Siempre existe exactamente un impuesto marcado como por defecto (isDefault).
 * - El impuesto por defecto siempre está visible (isActive = true).
 * - Siempre hay al menos un impuesto visible; si no, se fuerza IGV 18 o el primero.
 */
export function normalizeTaxes(taxes: Tax[]): Tax[] {
  if (!taxes.length) {
    return taxes;
  }

  const cloned = taxes.map((tax) => ({ ...tax }));

  // Asegurar que haya al menos un impuesto visible (isActive = true)
  let visibleTaxes = cloned.filter((tax) => tax.isActive);
  if (visibleTaxes.length === 0) {
    const igv18Index = cloned.findIndex((tax) => tax.code === 'IGV18');
    const indexToActivate = igv18Index >= 0 ? igv18Index : 0;
    cloned[indexToActivate].isActive = true;
    visibleTaxes = [cloned[indexToActivate]];
  }

  // Asegurar exactamente un impuesto por defecto y que esté visible
  const defaultTaxes = cloned.filter((tax) => tax.isDefault);

  let chosenDefault: Tax | null = null;

  if (defaultTaxes.length === 0) {
    // No hay ninguno marcado: priorizar IGV18 visible, si no, el primero visible
    chosenDefault =
      cloned.find((tax) => tax.code === 'IGV18' && tax.isActive) ??
      visibleTaxes[0];
  } else if (defaultTaxes.length === 1) {
    chosenDefault = defaultTaxes[0];
  } else {
    // Hay más de uno: reducir a uno solo, priorizando IGV18 visible
    chosenDefault =
      defaultTaxes.find((tax) => tax.code === 'IGV18' && tax.isActive) ??
      defaultTaxes.find((tax) => tax.isActive) ??
      defaultTaxes[0];
  }

  if (chosenDefault) {
    // Forzar visibilidad del impuesto por defecto
    if (!chosenDefault.isActive) {
      chosenDefault.isActive = true;
    }

    // Aplicar exclusividad de por defecto
    cloned.forEach((tax) => {
      tax.isDefault = tax === chosenDefault;
    });
  }

  return cloned;
}

export const TAX_TYPES = [
  { value: 'PERCENTAGE', label: 'Porcentaje', description: 'Impuesto basado en porcentaje' },
  { value: 'FIXED_AMOUNT', label: 'Monto Fijo', description: 'Impuesto de monto fijo' },
  { value: 'COMPOUND', label: 'Compuesto', description: 'Impuesto calculado sobre otros impuestos' },
] as const;

export const SUNAT_TAX_TYPES = [
  { value: 'VAT', label: 'IGV', description: 'Impuesto General a las Ventas' },
  { value: 'EXCISE', label: 'Selectivo', description: 'Impuesto Selectivo al Consumo' },
  { value: 'OTHER', label: 'Otros', description: 'Otros impuestos' },
] as const;

export const ROUNDING_METHODS = [
  { value: 'ROUND', label: 'Redondeo Normal', description: '0.5 redondea hacia arriba' },
  { value: 'ROUND_UP', label: 'Redondeo Hacia Arriba', description: 'Siempre redondea hacia arriba' },
  { value: 'ROUND_DOWN', label: 'Redondeo Hacia Abajo', description: 'Siempre redondea hacia abajo' },
  { value: 'TRUNCATE', label: 'Truncar', description: 'Elimina decimales sin redondear' },
] as const;

// Utility functions for tax calculations
export class TaxCalculator {
  static calculateTax(baseAmount: number, tax: Tax): TaxCalculation {
    let taxAmount = 0;
    
    if (tax.type === 'PERCENTAGE') {
      taxAmount = (baseAmount * tax.rate) / 100;
    } else if (tax.type === 'FIXED_AMOUNT') {
      taxAmount = tax.rate;
    }
    
    // Apply rounding
    taxAmount = this.applyRounding(taxAmount, tax.rules.roundingMethod, tax.rules.roundingPrecision);
    
    return {
      taxId: tax.id,
      taxName: tax.name,
      baseAmount,
      taxRate: tax.rate,
      taxAmount,
      includedInPrice: tax.includeInPrice,
    };
  }
  
  static calculateMultipleTaxes(baseAmount: number, taxes: Tax[]): TaxCalculation[] {
    const calculations: TaxCalculation[] = [];
    let currentBase = baseAmount;
    
    // Sort taxes: non-compound first, then compound
    const sortedTaxes = [...taxes].sort((a, b) => {
      if (a.isCompound && !b.isCompound) return 1;
      if (!a.isCompound && b.isCompound) return -1;
      return 0;
    });
    
    for (const tax of sortedTaxes) {
      if (tax.isCompound) {
        // For compound taxes, calculate on base + previous taxes
        const previousTaxAmount = calculations.reduce((sum, calc) => sum + calc.taxAmount, 0);
        currentBase = baseAmount + previousTaxAmount;
      }
      
      const calculation = this.calculateTax(currentBase, tax);
      calculations.push(calculation);
    }
    
    return calculations;
  }
  
  static applyRounding(amount: number, method: Tax['rules']['roundingMethod'], precision: number): number {
    const factor = Math.pow(10, precision);
    
    switch (method) {
      case 'ROUND':
        return Math.round(amount * factor) / factor;
      case 'ROUND_UP':
        return Math.ceil(amount * factor) / factor;
      case 'ROUND_DOWN':
        return Math.floor(amount * factor) / factor;
      case 'TRUNCATE':
        return Math.trunc(amount * factor) / factor;
      default:
        return Math.round(amount * factor) / factor;
    }
  }
  
  static getTotalTaxAmount(calculations: TaxCalculation[]): number {
    return calculations.reduce((total, calc) => total + calc.taxAmount, 0);
  }
  
  static getNetAmount(grossAmount: number, calculations: TaxCalculation[]): number {
    const includedTaxes = calculations.filter(calc => calc.includedInPrice);
    const includedTaxAmount = includedTaxes.reduce((total, calc) => total + calc.taxAmount, 0);
    return grossAmount - includedTaxAmount;
  }
}