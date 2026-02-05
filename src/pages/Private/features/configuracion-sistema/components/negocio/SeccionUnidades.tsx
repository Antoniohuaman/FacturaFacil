// src/features/configuration/components/negocio/UnitsSection.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
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
import type { Unit } from '../../modelos';
import { SUNAT_UNITS } from '../../modelos';
import { SelectorPredeterminado } from '../comunes/SelectorPredeterminado';

type Family = Unit['category'];

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

const sanitizeCommercialSymbol = (value: string): string => {
  // Permitir espacios tal cual (no colapsar), pero evitar saltos de línea/tabs.
  return value.replace(/[\r\n\t]+/g, ' ').trim();
};

const formatDefaultCommercialSymbol = (code: string, sunatName: string): string => {
  const normalizedCode = normalizeCode(code).toUpperCase();
  const normalizedName = (sunatName ?? '').trim();
  return `(${normalizedCode}) ${normalizedName}`;
};

const ensureCommercialSymbolForCatalogUnit = (args: {
  code: string;
  sunatName: string;
  existingSymbol?: string;
}): string => {
  const defaultSymbol = formatDefaultCommercialSymbol(args.code, args.sunatName);
  const candidate = sanitizeCommercialSymbol(args.existingSymbol ?? '');
  if (!candidate) return defaultSymbol;
  if (!isValidCommercialSymbol(candidate)) return defaultSymbol;
  return candidate;
};

const isValidCommercialSymbol = (value: string): boolean => {
  if (!value) return false;
  if (value.length > 60) return false;
  // Letras/números/espacios y . _ - / ( )
  return /^[\p{L}\p{N} ._()/-]+$/u.test(value);
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
      const commercialSymbol = ensureCommercialSymbolForCatalogUnit({
        code: catalog.code,
        sunatName: catalog.name,
        existingSymbol: existing?.symbol,
      });

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

  const autoSanitizedOnceRef = useRef(false);

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

  useEffect(() => {
    if (isLoading) return;
    if (isSubmitting) return;
    if (autoSanitizedOnceRef.current) return;

    // Si existen símbolos legacy (o ausentes), persistimos el catálogo ya saneado una sola vez.
    const existingByCode = new Map<string, Unit>();
    for (const unit of units) {
      existingByCode.set(normalizeCode(unit.code), unit);
    }

    const needsSanitization = SUNAT_UNITS.some((catalog) => {
      const existing = existingByCode.get(normalizeCode(catalog.code));
      const rawSymbol = String(existing?.symbol ?? '');
      const rawTrimmed = rawSymbol.trim();
      const existingSymbol = sanitizeCommercialSymbol(rawSymbol);
      if (!existingSymbol) return true;
      // Persistir solo si está vacío o inválido (no por no tener prefijo "(CODE)").
      if (rawTrimmed && !isValidCommercialSymbol(rawTrimmed)) return true;
      return !isValidCommercialSymbol(existingSymbol);
    });

    if (!needsSanitization) return;

    autoSanitizedOnceRef.current = true;
    void (async () => {
      try {
        await onUpdate(effectiveUnits);
      } catch {
        // No bloquear UI si falla la persistencia automática.
      }
    })();
  }, [effectiveUnits, isLoading, isSubmitting, onUpdate, units]);

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
          unit.symbol!.toLowerCase().includes(searchLower) ||
          unit.description!.toLowerCase().includes(searchLower);
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
      commercialSymbol: formatDefaultCommercialSymbol(firstSunat?.code ?? '', firstSunat?.name ?? ''),
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
      commercialSymbol: unit.symbol || formatDefaultCommercialSymbol(unit.code, sunatName),
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
      commercialSymbol: (() => {
        const prevSunat = SUNAT_UNITS.find(u => normalizeCode(u.code) === normalizeCode(prev.code));
        const prevDefault = formatDefaultCommercialSymbol(prev.code, prevSunat?.name ?? '');
        const nextDefault = formatDefaultCommercialSymbol(normalized, sunat?.name ?? '');

        // Si no tocó el símbolo (sigue igual al default anterior), mantenerlo sincronizado con el código.
        if (!sanitizeCommercialSymbol(prev.commercialSymbol) || sanitizeCommercialSymbol(prev.commercialSymbol) === sanitizeCommercialSymbol(prevDefault)) {
          return nextDefault;
        }
        return prev.commercialSymbol;
      })(),
    }));
    setErrors(prev => ({ ...prev, code: undefined }));
  };

  const handleModalCommercialSymbolChange = (value: string) => {
    setModalForm(prev => ({ ...prev, commercialSymbol: value }));
    setErrors(prev => ({ ...prev, commercialSymbol: undefined }));
  };

  const handleModalSubmit = async () => {
    const newErrors: { code?: string; commercialSymbol?: string } = {};
    const code = normalizeCode(modalForm.code);
    const sunat = SUNAT_UNITS.find(unit => normalizeCode(unit.code) === code);
    const sunatName = sunat?.name ?? '';
    const defaultSymbol = formatDefaultCommercialSymbol(code, sunatName);

    const rawInput = modalForm.commercialSymbol;
    const cleanedInput = sanitizeCommercialSymbol(rawInput);
    const symbol = cleanedInput || defaultSymbol;

    if (!code) {
      newErrors.code = 'Selecciona un código SUNAT';
    } else {
      const existsInSunat = SUNAT_UNITS.some(unit => normalizeCode(unit.code) === code);
      if (!existsInSunat) {
        newErrors.code = 'El código debe existir en el catálogo SUNAT';
      }
    }

    if (!isValidCommercialSymbol(symbol)) {
      newErrors.commercialSymbol = 'Símbolo inválido (máx 60; letras/números, espacios y . _ - / ( ))';
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
        if (!sunat) {
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
                  const commercialSymbol = unit.symbol || formatDefaultCommercialSymbol(unit.code, sunatName);

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
                          className="font-mono text-gray-900"
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
                        helperText={errors.commercialSymbol || 'Máx. 60 (letras/números, espacios y . _ - / ( ))'}
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

