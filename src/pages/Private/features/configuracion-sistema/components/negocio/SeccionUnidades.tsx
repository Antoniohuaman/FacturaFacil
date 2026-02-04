// src/features/configuration/components/negocio/UnitsSection.tsx
import { useState, useMemo } from 'react';
import {
  Scale,
  Plus,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  Search,
  Heart
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

type FilterMode = 'all' | 'favorites' | 'visible' | 'hidden' | 'system' | 'custom';

export function UnitsSection({
  units,
  onUpdate,
  isLoading = false
}: UnitsSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [datosFormulario, setFormData] = useState({ code: '', name: '', category: 'OTHER' as Unit['category'] });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ code?: string; name?: string }>({});

  // Estados para UX mejorada
  const [defaultUnitId, setDefaultUnitId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedCategory, setSelectedCategory] = useState<Unit['category'] | 'all'>('all');

  // Ya no es necesario inicializar aquí - las unidades se cargan desde ConfigurationContext
  // useEffect removido para evitar conflictos de inicialización

  // Funciones helper
  const isSystemUnit = (unit: Unit) => unit.isSystem || SUNAT_UNITS.some(s => s.code === unit.code);
  const isDefaultUnit = (unit: Unit) => defaultUnitId === unit.id;
  const isFavoriteUnit = (unit: Unit) => unit.isFavorite || false;
  const isVisibleUnit = (unit: Unit) => unit.isVisible !== false; // Por defecto visible

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
        case 'favorites':
          return unit.isFavorite || false;
        case 'visible':
          return unit.isVisible !== false;
        case 'hidden':
          return unit.isVisible === false;
        case 'system':
          return unit.isSystem || SUNAT_UNITS.some(s => s.code === unit.code);
        case 'custom':
          return !unit.isSystem && !SUNAT_UNITS.some(s => s.code === unit.code);
        default:
          return true;
      }
    });

    // Ordenar: favoritos primero, luego por nombre
    return filtered.sort((a, b) => {
      const aFav = a.isFavorite || false;
      const bFav = b.isFavorite || false;

      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      if (aFav && bFav) {
        return (a.displayOrder || 0) - (b.displayOrder || 0);
      }
      return a.name.localeCompare(b.name);
    });
  }, [units, searchTerm, selectedCategory, filterMode]);

  const favoriteUnits = units.filter(isFavoriteUnit).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));


  const resetForm = () => {
    setFormData({ code: '', name: '', category: 'OTHER' });
    setEditingId(null);
    setShowForm(false);
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: { code?: string; name?: string } = {};

    if (!datosFormulario.code.trim()) {
      newErrors.code = 'El código es obligatorio';
    } else if (datosFormulario.code.length > 6) {
      newErrors.code = 'El código no puede tener más de 6 caracteres';
    } else if (!/^[A-Z0-9]+$/.test(datosFormulario.code)) {
      newErrors.code = 'El código solo puede contener letras y números';
    } else if (units.some(u => u.code === datosFormulario.code && u.id !== editingId)) {
      newErrors.code = 'Ya existe una unidad con este código';
    }

    if (!datosFormulario.name.trim()) {
      newErrors.name = 'El nombre es obligatorio';
    } else if (datosFormulario.name.length < 3) {
      newErrors.name = 'El nombre debe tener al menos 3 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEdit = (unit: Unit) => {
    setFormData({ code: unit.code, name: unit.name, category: unit.category });
    setEditingId(unit.id);
    setShowForm(true);
  };

  const manejarEnvio = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      let updatedUnits: Unit[];

      if (editingId) {
        // Update existing
        updatedUnits = units.map(u =>
          u.id === editingId
            ? {
              ...u,
              name: datosFormulario.name,
              code: datosFormulario.code.toUpperCase(),
              category: datosFormulario.category,
              updatedAt: new Date()
            }
            : u
        );
      } else {
        // Create new
        const newUnit: Unit = {
          id: `custom-${Date.now()}`,
          code: datosFormulario.code.toUpperCase(),
          name: datosFormulario.name,
          symbol: datosFormulario.code.toUpperCase(),
          description: datosFormulario.name,
          category: datosFormulario.category,
          decimalPlaces: 0,
          isActive: true,
          isSystem: false,
          isFavorite: false,
          isVisible: true,
          usageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        updatedUnits = [...units, newUnit];
      }

      await onUpdate(updatedUnits);
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const setDefaultUnit = async (unitId: string) => {
    // Actualiza el estado temporal para mantener la UX
    setDefaultUnitId(unitId);
    // En el futuro, esto actualizará la configuración real
    // Por ahora solo mantenemos el estado local para la interfaz
  };

  const toggleFavorite = async (unitId: string) => {
    const updatedUnits = units.map(u =>
      u.id === unitId
        ? {
          ...u,
          isFavorite: !u.isFavorite,
          displayOrder: !u.isFavorite ? Math.max(...units.filter(x => x.isFavorite).map(x => x.displayOrder || 0), 0) + 1 : undefined,
          updatedAt: new Date()
        }
        : u
    );
    await onUpdate(updatedUnits);
  };

  const toggleVisibility = async (unitId: string) => {
    const unit = units.find(u => u.id === unitId);
    if (isDefaultUnit(unit!)) return; // Can't hide default unit

    const updatedUnits = units.map(u =>
      u.id === unitId
        ? { ...u, isVisible: !u.isVisible, updatedAt: new Date() }
        : u
    );
    await onUpdate(updatedUnits);
  };

  const deleteUnit = async (unitId: string) => {
    const unit = units.find(u => u.id === unitId);
    if (isDefaultUnit(unit!)) {
      alert('No se puede eliminar la unidad por defecto');
      return;
    }
    if (isSystemUnit(unit!)) {
      alert('No se pueden eliminar las unidades del sistema SUNAT');
      return;
    }

    if (confirm('¿Estás seguro de que deseas eliminar esta unidad?')) {
      const updatedUnits = units.filter(u => u.id !== unitId);
      await onUpdate(updatedUnits);
    }
  };

  const handleCodeChange = (value: string) => {
    const upperValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setFormData(prev => ({ ...prev, code: upperValue }));
    if (errors.code) {
      setErrors(prev => ({ ...prev, code: undefined }));
    }
  };

  const handleNameChange = (value: string) => {
    setFormData(prev => ({ ...prev, name: value }));
    if (errors.name) {
      setErrors(prev => ({ ...prev, name: undefined }));
    }
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
            {favoriteUnits.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 text-red-500" />
                <span>{favoriteUnits.length} favorita{favoriteUnits.length !== 1 ? 's' : ''}</span>
              </span>
            )}
          </div>
        </div>
        <Button
          onClick={() => setShowForm(true)}
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
                { value: 'favorites', label: 'Favoritas' },
                { value: 'visible', label: 'Visibles' },
                { value: 'hidden', label: 'Ocultas' },
                { value: 'system', label: 'Sistema' },
                { value: 'custom', label: 'Personalizadas' }
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

      {/* Formulario (panel compacto) */}
      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-gray-900">
                {editingId ? 'Editar unidad' : 'Nueva unidad'}
              </div>
              <div className="text-xs text-gray-600">
                {editingId ? 'Modifica los datos de la unidad seleccionada.' : 'Crea una unidad personalizada para tus productos.'}
              </div>
            </div>
            <Button
              type="button"
              onClick={resetForm}
              disabled={isSubmitting}
              variant="secondary"
              size="sm"
            >
              Cerrar
            </Button>
          </div>

          <form onSubmit={manejarEnvio} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <Input
                label="Código SUNAT"
                type="text"
                value={datosFormulario.code}
                onChange={(e) => handleCodeChange(e.target.value)}
                error={errors.code}
                helperText={errors.code || 'Máx. 6 (A-Z, 0-9)'}
                placeholder="PCE"
                maxLength={6}
                required
              />

              <Input
                label="Nombre"
                type="text"
                value={datosFormulario.name}
                onChange={(e) => handleNameChange(e.target.value)}
                error={errors.name}
                placeholder="Piezas"
                required
              />

              <Select
                label="Categoría"
                value={datosFormulario.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as Unit['category'] }))}
                options={UNIT_CATEGORIES.map((cat) => ({
                  value: cat.value,
                  label: cat.label
                }))}
                required
              />
            </div>

            {!editingId && (
              <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                <div className="text-xs font-semibold text-gray-800">Plantillas SUNAT (clic para rellenar)</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SUNAT_UNITS.slice(0, 12).map((unit) => (
                    <button
                      key={unit.code}
                      type="button"
                      onClick={() => {
                        setFormData({ code: unit.code, name: unit.name, category: unit.category });
                        setErrors({});
                      }}
                      className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-700 hover:border-blue-300 hover:bg-blue-50"
                      title={`${unit.name} (${unit.code})`}
                    >
                      <span className="font-mono text-[11px] font-bold text-gray-900">{unit.code}</span>
                      <span className="max-w-[14rem] truncate">{unit.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                onClick={resetForm}
                disabled={isSubmitting}
                variant="secondary"
                size="sm"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || Object.keys(errors).length > 0}
                variant="primary"
                size="sm"
              >
                {isSubmitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                <span>{editingId ? 'Actualizar' : 'Crear'}</span>
              </Button>
            </div>
          </form>
        </div>
      )}

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
                  <th className="px-4 py-2 text-left">Código</th>
                  <th className="px-4 py-2 text-left">Nombre</th>
                  <th className="px-4 py-2 text-left">Categoría</th>
                  <th className="px-4 py-2 text-center">Visible</th>
                  <th className="px-4 py-2 text-center">Fav</th>
                  <th className="px-4 py-2 text-right">Usos</th>
                  <th className="px-4 py-2 text-left">Tipo</th>
                  <th className="px-4 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUnits.map((unit) => {
                  const categoryLabel = UNIT_CATEGORIES.find(c => c.value === unit.category)?.label ?? unit.category;
                  const system = isSystemUnit(unit);
                  const visible = isVisibleUnit(unit);
                  const favorite = isFavoriteUnit(unit);
                  const isDefault = isDefaultUnit(unit);

                  return (
                    <tr
                      key={unit.id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-2.5 align-middle">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-gray-900">{unit.code}</span>
                          {isDefault && (
                            <span className="inline-flex items-center rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-[11px] font-semibold">
                              DEF
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-2.5 align-middle min-w-[14rem]">
                        <div className="text-gray-900 font-medium leading-tight">{unit.name}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[34rem]">{unit.description}</div>
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

                      <td className="px-4 py-2.5 align-middle text-center">
                        <Button
                          onClick={() => toggleFavorite(unit.id)}
                          variant="tertiary"
                          iconOnly
                          size="sm"
                          icon={<Heart className={favorite ? 'text-red-500 fill-current' : 'text-gray-400'} />}
                          title={favorite ? 'Quitar de favoritas' : 'Marcar como favorita'}
                        />
                      </td>

                      <td className="px-4 py-2.5 align-middle text-right text-gray-700">
                        {unit.usageCount && unit.usageCount > 0 ? unit.usageCount : '—'}
                      </td>

                      <td className="px-4 py-2.5 align-middle">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${system
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-700'
                            }`}
                        >
                          {system ? 'SUNAT' : 'Personalizada'}
                        </span>
                      </td>

                      <td className="px-4 py-2.5 align-middle">
                        <div className="flex items-center justify-end gap-1.5">
                          <SelectorPredeterminado
                            isDefault={isDefault}
                            onSetDefault={() => setDefaultUnit(unit.id)}
                            size="sm"
                          />

                          {!system && (
                            <>
                              <Button
                                onClick={() => handleEdit(unit)}
                                variant="tertiary"
                                iconOnly
                                size="sm"
                                icon={<Edit3 />}
                                title="Editar"
                              />
                              <Button
                                onClick={() => deleteUnit(unit.id)}
                                disabled={isDefault}
                                variant="tertiary"
                                iconOnly
                                size="sm"
                                icon={<Trash2 className="text-red-600" />}
                                title="Eliminar"
                              />
                            </>
                          )}
                        </div>
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
                  onClick={() => setShowForm(true)}
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
    </div>
  );
}

