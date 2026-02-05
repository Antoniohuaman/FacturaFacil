import type { Unit } from '../../configuracion-sistema/modelos/Unit';
import type { UnitMeasureType } from '../models/types';

export type UnitFamily = Unit['category'];

export interface UnitFamilyOption {
  value: UnitFamily;
  label: string;
}

// Familias UI exactas (9) - orden requerido
export const UNIT_FAMILY_OPTIONS: UnitFamilyOption[] = [
  { value: 'OTHER', label: 'Servicios' },
  { value: 'TIME', label: 'Tiempos' },
  { value: 'WEIGHT', label: 'Pesos' },
  { value: 'VOLUME', label: 'Volúmenes' },
  { value: 'LENGTH', label: 'Longitudes' },
  { value: 'AREA', label: 'Áreas' },
  { value: 'ENERGY', label: 'Energías' },
  { value: 'QUANTITY', label: 'Cantidades' },
  { value: 'PACKAGING', label: 'Empaques' },
];

export interface UnitMeasureTypeOption {
  value: UnitMeasureType;
  label: string;
  helper?: string;
}

export const UNIT_MEASURE_TYPE_OPTIONS: UnitMeasureTypeOption[] = [
  { value: 'UNIDADES', label: 'Por unidades' },
  { value: 'PESO', label: 'Por peso' },
  { value: 'VOLUMEN', label: 'Por volumen' },
  { value: 'LONGITUD_AREA', label: 'Por longitud' },
  { value: 'TIEMPO_SERVICIO', label: 'Por tiempo' }
];

const CATEGORY_TO_TYPE: Record<Unit['category'], UnitMeasureType> = {
  QUANTITY: 'UNIDADES',
  PACKAGING: 'UNIDADES',
  WEIGHT: 'PESO',
  VOLUME: 'VOLUMEN',
  LENGTH: 'LONGITUD_AREA',
  AREA: 'LONGITUD_AREA',
  TIME: 'TIEMPO_SERVICIO',
  ENERGY: 'UNIDADES',
  OTHER: 'UNIDADES'
};

const UNIT_CODE_OVERRIDES: Record<string, UnitMeasureType> = {
  ZZ: 'TIEMPO_SERVICIO',
  HUR: 'TIEMPO_SERVICIO',
  SEC: 'TIEMPO_SERVICIO',
  HT: 'TIEMPO_SERVICIO'
};

const FALLBACK_TYPE: UnitMeasureType = 'UNIDADES';

const FALLBACK_FAMILY: UnitFamily = 'QUANTITY';

const normalize = (value?: string): string => (value || '').trim().toUpperCase();

export const isUnitInFamily = (unit: Unit, family: UnitFamily): boolean => {
  // Regla crítica: ZZ siempre se considera Servicios en la UI, aunque su category sea distinta.
  if (family === 'OTHER') {
    return unit.category === 'OTHER' || normalize(unit.code) === 'ZZ';
  }
  return unit.category === family;
};

export const filterUnitsByFamily = (units: Unit[], family: UnitFamily): Unit[] => {
  if (!units.length) return units;
  return units.filter((unit) => isUnitInFamily(unit, family));
};

export const isUnitCodeInFamily = (
  unitCode: string,
  units: Unit[],
  family: UnitFamily
): boolean => {
  const normalized = normalize(unitCode);
  if (!normalized) return false;
  if (family === 'OTHER' && normalized === 'ZZ') {
    return true;
  }
  const unit = units.find(u => normalize(u.code) === normalized);
  if (!unit) {
    // Si no existe en catálogo activo, no bloquear.
    return true;
  }
  return isUnitInFamily(unit, family);
};

export const inferUnitFamilyFromCode = (
  unitCode?: string,
  units?: Unit[]
): UnitFamily => {
  const normalized = normalize(unitCode);
  if (!normalized) return FALLBACK_FAMILY;

  if (normalized === 'ZZ') {
    return 'OTHER';
  }

  const unit = units?.find(u => normalize(u.code) === normalized);
  if (unit) {
    return unit.category;
  }

  // Heurística por prefijo (misma idea que inferUnitMeasureType, pero a 9 familias)
  if (/^(KGM|GRM|MGM|TNE|ONZ|LBR)/.test(normalized)) return 'WEIGHT';
  if (/^(LTR|MLT|GLL|GLI|MTQ|CMQ|MMQ|FTQ)/.test(normalized)) return 'VOLUME';
  if (/^(MTR|CMT|MMT|KTM|INH|YRD|FOT)/.test(normalized)) return 'LENGTH';
  if (/^(MTK|CMK|MMK|FTK)/.test(normalized)) return 'AREA';
  if (/^(HUR|SEC|HT)/.test(normalized)) return 'TIME';

  return FALLBACK_FAMILY;
};

export const inferUnitMeasureType = (
  unitCode?: string,
  units?: Unit[]
): UnitMeasureType => {
  const normalized = normalize(unitCode);
  if (!normalized) return FALLBACK_TYPE;

  if (UNIT_CODE_OVERRIDES[normalized]) {
    return UNIT_CODE_OVERRIDES[normalized];
  }

  const unit = units?.find(u => normalize(u.code) === normalized);
  if (unit) {
    return CATEGORY_TO_TYPE[unit.category] || FALLBACK_TYPE;
  }

  // Heurística simple por prefijo
  if (/^(KGM|GRM|MGM|TNE)/.test(normalized)) return 'PESO';
  if (/^(LTR|MLT|GLL)/.test(normalized)) return 'VOLUMEN';
  if (/^(MTR|CMT|MTK|CMQ|MTQ)/.test(normalized)) return 'LONGITUD_AREA';

  return FALLBACK_TYPE;
};

export const filterUnitsByMeasureType = (
  units: Unit[],
  type: UnitMeasureType
): Unit[] => {
  if (!units.length) return units;
  return units.filter(unit => {
    const unitType = UNIT_CODE_OVERRIDES[normalize(unit.code)] || CATEGORY_TO_TYPE[unit.category];
    return unitType === type;
  });
};

export const isUnitAllowedForMeasureType = (
  unitCode: string,
  units: Unit[],
  type: UnitMeasureType
): boolean => {
  if (!unitCode) return false;
  const normalized = normalize(unitCode);
  if (UNIT_CODE_OVERRIDES[normalized]) {
    return UNIT_CODE_OVERRIDES[normalized] === type;
  }
  const unit = units.find(u => normalize(u.code) === normalized);
  if (!unit) return true; // Si no se encuentra en catálogo activo, no bloquear
  return (CATEGORY_TO_TYPE[unit.category] || FALLBACK_TYPE) === type;
};

export const sanitizeUnitListForMeasureType = (
  units: Unit[],
  unitCodes: string[],
  type: UnitMeasureType
): string[] => {
  return unitCodes.filter(code => isUnitAllowedForMeasureType(code, units, type));
};
