import type { Unit } from '../../configuracion-sistema/modelos/Unit';

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

  // Heurística por prefijo para inferir familia (9 categorías)
  if (/^(KGM|GRM|MGM|TNE|ONZ|LBR)/.test(normalized)) return 'WEIGHT';
  if (/^(LTR|MLT|GLL|GLI|MTQ|CMQ|MMQ|FTQ)/.test(normalized)) return 'VOLUME';
  if (/^(MTR|CMT|MMT|KTM|INH|YRD|FOT)/.test(normalized)) return 'LENGTH';
  if (/^(MTK|CMK|MMK|FTK)/.test(normalized)) return 'AREA';
  if (/^(HUR|SEC|HT)/.test(normalized)) return 'TIME';

  return FALLBACK_FAMILY;
};
