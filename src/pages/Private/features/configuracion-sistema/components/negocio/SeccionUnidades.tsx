// src/features/configuration/components/negocio/UnitsSection.tsx
import { useEffect, useMemo, useState } from 'react';
import {
  Scale,
  Plus,
  Edit3,
  Eye,
  EyeOff,
  Search,
  X
} from 'lucide-react';
import { Button, Select, Input } from '@/contasis';
import type { Unit } from '../../modelos/Unit';
import { SelectorPredeterminado } from '../comunes/SelectorPredeterminado';

type Family = Unit['category'];

type UnitCatalogItem = {
  code: string;
  name: string; // Texto exacto mostrado como “Descripción SUNAT”
  description: string;
  category: Family;
  decimalPlaces: number;
  baseUnit?: string;
  conversionFactor?: number;
};

// Familias (antes “Categorías”) - exactamente 9
const UNIT_FAMILIES: Array<{ value: Family; label: string }> = [
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

// Catálogo SUNAT actualizado (dataset exacto provisto)
const SUNAT_UNITS: UnitCatalogItem[] = [
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

interface UnitsSectionProps {
  units: Unit[];
  onUpdate: (units: Unit[]) => Promise<void>;
  isLoading?: boolean;
}

type FilterMode = 'all' | 'visible' | 'hidden';

type UnitModalMode = 'create' | 'edit';

type UnitModalForm = {
  code: string;
  family: Family;
  commercialSymbol: string;
};

const normalizeCode = (value?: string): string => (value || '').trim().toUpperCase();

const createEmptyDefaultByFamily = (): Record<Family, string | null> => ({
  QUANTITY: null,
  WEIGHT: null,
  LENGTH: null,
  AREA: null,
  VOLUME: null,
  TIME: null,
  ENERGY: null,
  PACKAGING: null,
  OTHER: null,
});

const createDefaultFamilyVisibility = (): Record<Family, boolean> => ({
  QUANTITY: true,
  WEIGHT: true,
  LENGTH: true,
  AREA: true,
  VOLUME: true,
  TIME: true,
  ENERGY: true,
  PACKAGING: true,
  OTHER: true,
});

const sanitizeCommercialSymbol = (value: string): string => value.replace(/\s+/g, ' ').trim();

const isValidCommercialSymbol = (value: string): boolean => {
  if (!value) return false;
  // Debe permitir el valor por defecto = “Descripción SUNAT” (puede tener espacios y tildes)
  if (value.length > 60) return false;
  return /^[\p{L}\p{N} ._/-]+$/u.test(value);
};

export function UnitsSection({
  units,
  onUpdate,
  isLoading = false
}: UnitsSectionProps) {
  const effectiveUnits = useMemo<Unit[]>(() => {
    const now = new Date();
    const existingByCode = new Map<string, Unit>();
    for (const unit of units) {
      existingByCode.set(normalizeCode(unit.code), unit);
    }

    return SUNAT_UNITS.map((catalog) => {
      const existing = existingByCode.get(normalizeCode(catalog.code));
      const commercialSymbol = sanitizeCommercialSymbol(existing?.symbol ?? '') || catalog.name;

      return {
        id: existing?.id ?? `sunat-${catalog.code}`,
        code: catalog.code,
        name: catalog.name,
        symbol: commercialSymbol,
        description: catalog.description,
        category: catalog.category,
        baseUnit: catalog.baseUnit,
        conversionFactor: catalog.conversionFactor,
        decimalPlaces: catalog.decimalPlaces,
        isActive: existing?.isActive ?? true,
        isSystem: true,
        isFavorite: existing?.isFavorite,
        isVisible: existing?.isVisible ?? true,
        displayOrder: existing?.displayOrder,
        usageCount: existing?.usageCount,
        createdAt: existing?.createdAt ?? now,
        updatedAt: existing?.updatedAt ?? now,
      };
    });
  }, [units]);

  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [unitModalMode, setUnitModalMode] = useState<UnitModalMode>('create');
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [modalForm, setModalForm] = useState<UnitModalForm>({
    code: '',
    family: 'OTHER',
    commercialSymbol: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ code?: string; commercialSymbol?: string }>({});

  // Estados para UX mejorada
  const [defaultUnitIdByFamily, setDefaultUnitIdByFamily] = useState<Record<Family, string | null>>(
    () => createEmptyDefaultByFamily()
  );
  const [familyVisibility, setFamilyVisibility] = useState<Record<Family, boolean>>(
    () => createDefaultFamilyVisibility()
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedFamily, setSelectedFamily] = useState<Unit['category'] | 'all'>('all');

  // Ya no es necesario inicializar aquí - las unidades se cargan desde ConfigurationContext
  // useEffect removido para evitar conflictos de inicialización

  // Funciones helper
  const isDefaultInFamily = (unit: Unit) => defaultUnitIdByFamily[unit.category] === unit.id;
  const isVisibleUnit = (unit: Unit) => unit.isVisible !== false; // Por defecto visible

  useEffect(() => {
    // Infer UI state from current units: if all units of a category are invisible, treat the category as hidden.
    setFamilyVisibility(prev => {
      const next = { ...prev };
      (UNIT_FAMILIES.map(c => c.value) as Family[]).forEach((family) => {
        const unitsInFamily = effectiveUnits.filter(u => u.category === family);
        if (unitsInFamily.length === 0) {
          next[family] = prev[family] ?? true;
          return;
        }
        next[family] = unitsInFamily.some(u => u.isVisible !== false);
      });
      return next;
    });
  }, [effectiveUnits]);

  // Filtros y búsqueda
  const filteredUnits = useMemo(() => {
    const filtered = effectiveUnits.filter(unit => {
      // Filtro por búsqueda
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          unit.name.toLowerCase().includes(searchLower) ||
          unit.code.toLowerCase().includes(searchLower) ||
          unit.symbol.toLowerCase().includes(searchLower) ||
          unit.description.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Filtro por categoría
      if (selectedFamily !== 'all' && unit.category !== selectedFamily) {
        return false;
      }

      // Filtro por modo
      switch (filterMode) {
        case 'visible':
          return unit.isVisible !== false;
        case 'hidden':
          return unit.isVisible === false;
        default:
          return true;
      }
    });

    // Ordenar: por código, luego por nombre (estable y normativa)
    return filtered.sort((a, b) => {
      const byCode = a.code.localeCompare(b.code);
      if (byCode !== 0) return byCode;
      return a.name.localeCompare(b.name);
    });
  }, [effectiveUnits, searchTerm, selectedFamily, filterMode]);

  const closeUnitModal = () => {
    setIsUnitModalOpen(false);
    setUnitModalMode('create');
    setEditingUnitId(null);
    setModalForm({ code: '', family: 'OTHER', commercialSymbol: '' });
    setErrors({});
  };

  const openCreateUnitModal = () => {
    setUnitModalMode('create');
    setEditingUnitId(null);

    const firstSunat = SUNAT_UNITS[0];
    setModalForm({
      code: firstSunat?.code ?? '',
      family: (firstSunat?.category as Family) ?? 'OTHER',
      commercialSymbol: firstSunat?.name ?? '',
    });
    setErrors({});
    setIsUnitModalOpen(true);
  };

  const openEditUnitModal = (unit: Unit) => {
    setUnitModalMode('edit');
    setEditingUnitId(unit.id);
    const sunat = SUNAT_UNITS.find(s => normalizeCode(s.code) === normalizeCode(unit.code));
    const sunatName = sunat?.name ?? unit.name;
    setModalForm({
      code: unit.code,
      family: unit.category,
      commercialSymbol: unit.symbol || sunatName,
    });
    setErrors({});
    setIsUnitModalOpen(true);
  };

  const handleModalCodeChange = (nextCode: string) => {
    const normalized = normalizeCode(nextCode);
    const sunat = SUNAT_UNITS.find(u => normalizeCode(u.code) === normalized);
    setModalForm(prev => ({
      ...prev,
      code: normalized,
      family: (sunat?.category as Family) ?? prev.family,
      commercialSymbol: prev.commercialSymbol || sunat?.name || '',
    }));
    setErrors(prev => ({ ...prev, code: undefined }));
  };

  const handleModalCommercialSymbolChange = (value: string) => {
    const sanitized = sanitizeCommercialSymbol(value);
    setModalForm(prev => ({ ...prev, commercialSymbol: sanitized }));
    setErrors(prev => ({ ...prev, commercialSymbol: undefined }));
  };

  const handleModalSubmit = async () => {
    const newErrors: { code?: string; commercialSymbol?: string } = {};
    const code = normalizeCode(modalForm.code);
    const symbol = sanitizeCommercialSymbol(modalForm.commercialSymbol);

    if (!code) {
      newErrors.code = 'Selecciona un código SUNAT';
    } else {
      const existsInSunat = SUNAT_UNITS.some(unit => normalizeCode(unit.code) === code);
      if (!existsInSunat) {
        newErrors.code = 'El código debe existir en el catálogo SUNAT';
      }
    }

    if (!isValidCommercialSymbol(symbol)) {
      newErrors.commercialSymbol = 'Símbolo inválido (máx 10, letras/números y . _ - /)';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      let updatedUnits: Unit[];

      if (unitModalMode === 'edit') {
        const targetId = editingUnitId;
        if (!targetId) return;

        updatedUnits = effectiveUnits.map(u =>
          u.id === targetId
            ? {
              ...u,
              symbol: symbol,
              updatedAt: new Date(),
            }
            : u
        );
      } else {
        const sunatUnit = SUNAT_UNITS.find(unit => normalizeCode(unit.code) === code);
        if (!sunatUnit) {
          setErrors({ code: 'El código seleccionado no existe en SUNAT.' });
          return;
        }

        // Persistimos el catálogo efectivo (exacto) con el símbolo elegido.
        updatedUnits = effectiveUnits.map(u =>
          normalizeCode(u.code) === code
            ? { ...u, symbol, isVisible: true, isActive: true, updatedAt: new Date() }
            : u
        );
      }

      await onUpdate(updatedUnits);
      closeUnitModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  const setDefaultUnitForCategory = (unit: Unit) => {
    setDefaultUnitIdByFamily(prev => ({
      ...prev,
      [unit.category]: unit.id,
    }));
  };

  const toggleSelectedCategoryVisibility = async () => {
    if (selectedFamily === 'all') return;
    const cat = selectedFamily as Family;
    const nextVisible = !familyVisibility[cat];

    setIsSubmitting(true);
    try {
      const updatedUnits = effectiveUnits.map(u =>
        u.category === cat
          ? { ...u, isVisible: nextVisible, updatedAt: new Date() }
          : u
      );
      await onUpdate(updatedUnits);
      setFamilyVisibility(prev => ({ ...prev, [cat]: nextVisible }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleVisibility = async (unitId: string) => {
    const unit = effectiveUnits.find(u => u.id === unitId);
    if (unit && isDefaultInFamily(unit)) return; // Can't hide default unit in its family

    const updatedUnits = effectiveUnits.map(u =>
      u.id === unitId
        ? { ...u, isVisible: !u.isVisible, updatedAt: new Date() }
        : u
    );
    await onUpdate(updatedUnits);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-6 bg-gray-200 rounded w-40 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header compacto */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-gray-900 truncate">Unidades de Medida</h3>
          <div className="mt-0.5 text-xs text-gray-600 flex items-center gap-3">
            <span>
              {filteredUnits.length} unidad{filteredUnits.length !== 1 ? 'es' : ''}
              {filteredUnits.length !== effectiveUnits.length ? ` de ${effectiveUnits.length}` : ''}
            </span>
          </div>
        </div>
        <Button
          onClick={openCreateUnitModal}
          disabled={isSubmitting}
          variant="primary"
          icon={<Plus />}
        >
          Nueva Unidad
        </Button>
      </div>

      {/* Barra de búsqueda y filtros (compacta) */}
      <div className="bg-white rounded-lg border border-gray-200 p-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="flex-1 min-w-0">
            <Input
              type="text"
              placeholder="Buscar por código, nombre o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search />}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value as FilterMode)}
              size="medium"
              options={[
                { value: 'all', label: 'Todas' },
                { value: 'visible', label: 'Visibles' },
                { value: 'hidden', label: 'Ocultas' },
              ]}
            />

            <Select
              value={selectedFamily}
              onChange={(e) => setSelectedFamily(e.target.value as Unit['category'] | 'all')}
              size="medium"
              options={[
                { value: 'all', label: 'Familias' },
                ...UNIT_FAMILIES.map((family) => ({
                  value: family.value,
                  label: family.label
                }))
              ]}
            />

            {selectedFamily !== 'all' && (
              <Button
                onClick={toggleSelectedCategoryVisibility}
                disabled={isSubmitting}
                variant="tertiary"
                iconOnly
                size="sm"
                icon={familyVisibility[selectedFamily as Family] ? <Eye /> : <EyeOff />}
                title={familyVisibility[selectedFamily as Family] ? 'Ocultar familia' : 'Mostrar familia'}
              />
            )}

            {(searchTerm || filterMode !== 'all' || selectedFamily !== 'all') && (
              <Button
                onClick={() => {
                  setSearchTerm('');
                  setFilterMode('all');
                  setSelectedFamily('all');
                }}
                variant="tertiary"
                size="sm"
              >
                Limpiar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabla compacta (scroll interno) */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-900">Unidades</div>
          <div className="text-xs text-gray-500">{filteredUnits.length} resultado{filteredUnits.length !== 1 ? 's' : ''}</div>
        </div>

        {filteredUnits.length > 0 ? (
          <div className="max-h-[60vh] overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="text-xs font-semibold text-gray-600 border-b border-gray-200">
                  <th className="px-4 py-2 text-left">Código SUNAT</th>
                  <th className="px-4 py-2 text-left">Descripción SUNAT</th>
                  <th className="px-4 py-2 text-left">Familia</th>
                  <th className="px-4 py-2 text-center">Visible</th>
                  <th className="px-4 py-2 text-left">Símbolo comercial</th>
                  <th className="px-4 py-2 text-center">Por defecto</th>
                  <th className="px-4 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUnits.map((unit) => {
                  const sunat = SUNAT_UNITS.find(s => normalizeCode(s.code) === normalizeCode(unit.code));
                  const sunatName = sunat?.name ?? unit.name;
                  const familyLabel = UNIT_FAMILIES.find(c => c.value === unit.category)?.label ?? unit.category;
                  const visible = isVisibleUnit(unit);
                  const isDefault = isDefaultInFamily(unit);
                  const commercialSymbol = unit.symbol || sunatName;
                  const isDefaultCommercialSymbol = sanitizeCommercialSymbol(commercialSymbol) === sanitizeCommercialSymbol(sunatName);

                  return (
                    <tr
                      key={unit.id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-2.5 align-middle">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-gray-900">{unit.code}</span>
                        </div>
                      </td>

                      <td className="px-4 py-2.5 align-middle min-w-[18rem]">
                        <div className="text-gray-900 font-medium leading-tight">{sunatName}</div>
                      </td>

                      <td className="px-4 py-2.5 align-middle">
                        <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-700 px-2 py-0.5 text-[11px] font-medium">
                          {familyLabel}
                        </span>
                      </td>

                      <td className="px-4 py-2.5 align-middle text-center">
                        <Button
                          onClick={() => toggleVisibility(unit.id)}
                          disabled={isDefault}
                          variant="tertiary"
                          iconOnly
                          size="sm"
                          icon={visible ? <Eye /> : <EyeOff />}
                          title={visible ? 'Visible' : 'Oculta'}
                        />
                      </td>

                      <td className="px-4 py-2.5 align-middle">
                        <span
                          className={`font-mono ${isDefaultCommercialSymbol ? 'text-gray-500' : 'text-gray-900'}`}
                        >
                          {commercialSymbol}
                        </span>
                      </td>

                      <td className="px-4 py-2.5 align-middle text-center">
                        <SelectorPredeterminado
                          isDefault={isDefault}
                          onSetDefault={() => setDefaultUnitForCategory(unit)}
                          size="sm"
                        />
                      </td>

                      <td className="px-4 py-2.5 align-middle text-right">
                        <Button
                          onClick={() => openEditUnitModal(unit)}
                          variant="tertiary"
                          iconOnly
                          size="sm"
                          icon={<Edit3 />}
                          title="Editar símbolo comercial"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
              <Scale className="w-6 h-6 text-gray-400" />
            </div>
            <div className="mt-3 text-sm font-semibold text-gray-900">
              {searchTerm || filterMode !== 'all' || selectedFamily !== 'all'
                ? 'No se encontraron unidades'
                : 'No hay unidades configuradas'}
            </div>
            <div className="mt-1 text-xs text-gray-600">
              {searchTerm || filterMode !== 'all' || selectedFamily !== 'all'
                ? 'Ajusta filtros o búsqueda para ver resultados.'
                : 'Crea tu primera unidad para empezar.'}
            </div>
            {(!searchTerm && filterMode === 'all' && selectedFamily === 'all') && (
              <div className="mt-4">
                <Button
                  onClick={openCreateUnitModal}
                  variant="primary"
                  icon={<Plus />}
                >
                  Crear Primera Unidad
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Crear/Editar */}
      {isUnitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
          <div
            className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity"
            onClick={!isSubmitting ? closeUnitModal : undefined}
          />

          <div className="relative w-full max-w-[760px] max-h-[90vh] flex flex-col bg-white rounded-lg shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900">
                  {unitModalMode === 'edit' ? 'Editar unidad' : 'Nueva unidad'}
                </div>
                <div className="text-xs text-gray-600">
                  {unitModalMode === 'edit'
                    ? 'Solo puedes cambiar el símbolo comercial.'
                    : 'Selecciona un código SUNAT y personaliza el símbolo comercial.'}
                </div>
              </div>
              <Button
                onClick={closeUnitModal}
                disabled={isSubmitting}
                variant="tertiary"
                iconOnly
                size="sm"
                icon={<X />}
                title="Cerrar"
              />
            </div>

            <div className="px-5 py-4 overflow-auto">
              {(() => {
                const modalSunat = SUNAT_UNITS.find(u => normalizeCode(u.code) === normalizeCode(modalForm.code));
                const sunatLabel = modalSunat ? modalSunat.name : '';

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      <div>
                        <Select
                          label="Código SUNAT"
                          value={normalizeCode(modalForm.code)}
                          onChange={(e) => handleModalCodeChange(e.target.value)}
                          options={SUNAT_UNITS.map((u) => ({
                            value: u.code,
                            label: `(${u.code}) ${u.name}`
                          }))}
                          disabled={unitModalMode === 'edit'}
                          required
                        />
                        {errors.code && <div className="mt-1 text-xs text-red-600">{errors.code}</div>}
                      </div>

                      <Input
                        label="Descripción SUNAT"
                        type="text"
                        value={sunatLabel}
                        onChange={() => { /* read-only */ }}
                        disabled
                      />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      <Select
                        label="Familia"
                        value={modalForm.family}
                        onChange={(e) => setModalForm(prev => ({ ...prev, family: e.target.value as Family }))}
                        options={UNIT_FAMILIES.map((family) => ({
                          value: family.value,
                          label: family.label
                        }))}
                        disabled={unitModalMode === 'edit'}
                        required
                      />

                      <Input
                        label="Símbolo comercial"
                        type="text"
                        value={modalForm.commercialSymbol}
                        onChange={(e) => handleModalCommercialSymbolChange(e.target.value)}
                        error={errors.commercialSymbol}
                        helperText={errors.commercialSymbol || 'Máx. 60 (letras/números y . _ - /)'}
                        placeholder={sunatLabel || 'Símbolo'}
                        maxLength={60}
                        required
                      />
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200">
              <Button
                onClick={closeUnitModal}
                disabled={isSubmitting}
                variant="secondary"
                size="sm"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleModalSubmit}
                disabled={isSubmitting}
                variant="primary"
                size="sm"
              >
                {isSubmitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <span>{unitModalMode === 'edit' ? 'Guardar' : 'Crear'}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

