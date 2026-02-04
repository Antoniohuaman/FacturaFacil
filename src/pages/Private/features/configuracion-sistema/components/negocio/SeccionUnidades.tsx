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
import { SUNAT_UNITS, UNIT_CATEGORIES } from '../../modelos/Unit';

interface UnitsSectionProps {
  units: Unit[];
  onUpdate: (units: Unit[]) => Promise<void>;
  isLoading?: boolean;
}

type FilterMode = 'all' | 'visible' | 'hidden';

type Category = Unit['category'];

type UnitModalMode = 'create' | 'edit';

type UnitModalForm = {
  code: string;
  category: Category;
  commercialSymbol: string;
};

const normalizeCode = (value?: string): string => (value || '').trim().toUpperCase();

const createEmptyDefaultByCategory = (): Record<Category, string | null> => ({
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

const createDefaultCategoryVisibility = (): Record<Category, boolean> => ({
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
  if (value.length > 10) return false;
  return /^[A-Za-z0-9 ._/-]+$/.test(value);
};

export function UnitsSection({
  units,
  onUpdate,
  isLoading = false
}: UnitsSectionProps) {
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [unitModalMode, setUnitModalMode] = useState<UnitModalMode>('create');
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [modalForm, setModalForm] = useState<UnitModalForm>({
    code: '',
    category: 'OTHER',
    commercialSymbol: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ code?: string; commercialSymbol?: string }>({});

  // Estados para UX mejorada
  const [defaultUnitIdByCategory, setDefaultUnitIdByCategory] = useState<Record<Category, string | null>>(
    () => createEmptyDefaultByCategory()
  );
  const [categoryVisibility, setCategoryVisibility] = useState<Record<Category, boolean>>(
    () => createDefaultCategoryVisibility()
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedCategory, setSelectedCategory] = useState<Unit['category'] | 'all'>('all');

  // Ya no es necesario inicializar aquí - las unidades se cargan desde ConfigurationContext
  // useEffect removido para evitar conflictos de inicialización

  // Funciones helper
  const isDefaultInCategory = (unit: Unit) => defaultUnitIdByCategory[unit.category] === unit.id;
  const isVisibleUnit = (unit: Unit) => unit.isVisible !== false; // Por defecto visible

  useEffect(() => {
    // Infer UI state from current units: if all units of a category are invisible, treat the category as hidden.
    setCategoryVisibility(prev => {
      const next = { ...prev };
      (UNIT_CATEGORIES.map(c => c.value) as Category[]).forEach((cat) => {
        const unitsInCategory = units.filter(u => u.category === cat);
        if (unitsInCategory.length === 0) {
          next[cat] = prev[cat] ?? true;
          return;
        }
        next[cat] = unitsInCategory.some(u => u.isVisible !== false);
      });
      return next;
    });
  }, [units]);

  // Filtros y búsqueda
  const filteredUnits = useMemo(() => {
    const filtered = units.filter(unit => {
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
      if (selectedCategory !== 'all' && unit.category !== selectedCategory) {
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
  }, [units, searchTerm, selectedCategory, filterMode]);

  const closeUnitModal = () => {
    setIsUnitModalOpen(false);
    setUnitModalMode('create');
    setEditingUnitId(null);
    setModalForm({ code: '', category: 'OTHER', commercialSymbol: '' });
    setErrors({});
  };

  const openCreateUnitModal = () => {
    setUnitModalMode('create');
    setEditingUnitId(null);

    const firstSunat = SUNAT_UNITS[0];
    setModalForm({
      code: firstSunat?.code ?? '',
      category: (firstSunat?.category as Category) ?? 'OTHER',
      commercialSymbol: firstSunat?.symbol ?? '',
    });
    setErrors({});
    setIsUnitModalOpen(true);
  };

  const openEditUnitModal = (unit: Unit) => {
    setUnitModalMode('edit');
    setEditingUnitId(unit.id);
    setModalForm({
      code: unit.code,
      category: unit.category,
      commercialSymbol: unit.symbol || '',
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
      category: (sunat?.category as Category) ?? prev.category,
      commercialSymbol: prev.commercialSymbol || sunat?.symbol || '',
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

        updatedUnits = units.map(u =>
          u.id === targetId
            ? {
              ...u,
              symbol: symbol,
              updatedAt: new Date(),
            }
            : u
        );
      } else {
        const existing = units.find(u => normalizeCode(u.code) === code);
        if (existing) {
          setErrors({ code: 'Este código ya existe. Usa Editar para personalizar el símbolo.' });
          return;
        }

        const sunatUnit = SUNAT_UNITS.find(unit => normalizeCode(unit.code) === code);
        if (!sunatUnit) {
          setErrors({ code: 'El código seleccionado no existe en SUNAT.' });
          return;
        }

        const now = new Date();
        const newUnit: Unit = {
          id: `sunat-${sunatUnit.code}`,
          code: sunatUnit.code,
          name: sunatUnit.name,
          symbol: symbol || sunatUnit.symbol,
          description: sunatUnit.description,
          category: (modalForm.category || sunatUnit.category) as Category,
          baseUnit: 'baseUnit' in sunatUnit ? (sunatUnit.baseUnit as string | undefined) : undefined,
          conversionFactor: 'conversionFactor' in sunatUnit ? (sunatUnit.conversionFactor as number | undefined) : undefined,
          decimalPlaces: sunatUnit.decimalPlaces,
          isActive: true,
          isSystem: true,
          isVisible: true,
          createdAt: now,
          updatedAt: now,
        };

        updatedUnits = [...units, newUnit];
      }

      await onUpdate(updatedUnits);
      closeUnitModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  const setDefaultUnitForCategory = (unit: Unit) => {
    setDefaultUnitIdByCategory(prev => ({
      ...prev,
      [unit.category]: unit.id,
    }));
  };

  const toggleSelectedCategoryVisibility = async () => {
    if (selectedCategory === 'all') return;
    const cat = selectedCategory as Category;
    const nextVisible = !categoryVisibility[cat];

    setIsSubmitting(true);
    try {
      const updatedUnits = units.map(u =>
        u.category === cat
          ? { ...u, isVisible: nextVisible, updatedAt: new Date() }
          : u
      );
      await onUpdate(updatedUnits);
      setCategoryVisibility(prev => ({ ...prev, [cat]: nextVisible }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleVisibility = async (unitId: string) => {
    const unit = units.find(u => u.id === unitId);
    if (unit && isDefaultInCategory(unit)) return; // Can't hide default unit in its category

    const updatedUnits = units.map(u =>
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
              {filteredUnits.length !== units.length ? ` de ${units.length}` : ''}
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
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as Unit['category'] | 'all')}
              size="medium"
              options={[
                { value: 'all', label: 'Categorías' },
                ...UNIT_CATEGORIES.map((cat) => ({
                  value: cat.value,
                  label: cat.label
                }))
              ]}
            />

            {selectedCategory !== 'all' && (
              <Button
                onClick={toggleSelectedCategoryVisibility}
                disabled={isSubmitting}
                variant="tertiary"
                iconOnly
                size="sm"
                icon={categoryVisibility[selectedCategory as Category] ? <Eye /> : <EyeOff />}
                title={categoryVisibility[selectedCategory as Category] ? 'Ocultar categoría' : 'Mostrar categoría'}
              />
            )}

            {(searchTerm || filterMode !== 'all' || selectedCategory !== 'all') && (
              <Button
                onClick={() => {
                  setSearchTerm('');
                  setFilterMode('all');
                  setSelectedCategory('all');
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
                  <th className="px-4 py-2 text-left">Categoría</th>
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
                  const sunatDescription = sunat?.description ?? unit.description;
                  const categoryLabel = UNIT_CATEGORIES.find(c => c.value === unit.category)?.label ?? unit.category;
                  const visible = isVisibleUnit(unit);
                  const isDefault = isDefaultInCategory(unit);

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
                        <div className="text-xs text-gray-500 truncate max-w-[34rem]">{sunatDescription}</div>
                      </td>

                      <td className="px-4 py-2.5 align-middle">
                        <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-700 px-2 py-0.5 text-[11px] font-medium">
                          {categoryLabel}
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
                        <span className="font-mono text-gray-900">{unit.symbol || '-'}</span>
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
              {searchTerm || filterMode !== 'all' || selectedCategory !== 'all'
                ? 'No se encontraron unidades'
                : 'No hay unidades configuradas'}
            </div>
            <div className="mt-1 text-xs text-gray-600">
              {searchTerm || filterMode !== 'all' || selectedCategory !== 'all'
                ? 'Ajusta filtros o búsqueda para ver resultados.'
                : 'Crea tu primera unidad para empezar.'}
            </div>
            {(!searchTerm && filterMode === 'all' && selectedCategory === 'all') && (
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
                const sunatLabel = modalSunat ? `${modalSunat.name} — ${modalSunat.description}` : '';

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
                        label="Categoría"
                        value={modalForm.category}
                        onChange={(e) => setModalForm(prev => ({ ...prev, category: e.target.value as Category }))}
                        options={UNIT_CATEGORIES.map((cat) => ({
                          value: cat.value,
                          label: cat.label
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
                        helperText={errors.commercialSymbol || 'Máx. 10 (A-Z, 0-9 y . _ - /)'}
                        placeholder="UND"
                        maxLength={10}
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

