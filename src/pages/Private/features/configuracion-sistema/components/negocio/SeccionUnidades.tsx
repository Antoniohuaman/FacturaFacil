// src/features/configuration/components/negocio/UnitsSection.tsx
import { useState, useMemo } from 'react';
import {
  Scale, Plus, Edit3, Trash2, Eye, EyeOff, Search,
  Grid3X3, List, Heart, Package, Zap, Clock,
  Hash, Ruler, Square, Box, MoreHorizontal
} from 'lucide-react';
import { Button, Select, Input } from '@/contasis';
import type { Unit } from '../../modelos/Unit';
import { DefaultSelector } from '../comunes/SelectorPredeterminado';
import { ConfigurationCard } from '../comunes/TarjetaConfiguracion';
import { SUNAT_UNITS, UNIT_CATEGORIES } from '../../modelos/Unit';

interface UnitsSectionProps {
  units: Unit[];
  onUpdate: (units: Unit[]) => Promise<void>;
  isLoading?: boolean;
}

type ViewMode = 'grid' | 'list';
type FilterMode = 'all' | 'favorites' | 'visible' | 'hidden' | 'system' | 'custom';

export function UnitsSection({
  units,
  onUpdate,
  isLoading = false
}: UnitsSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ code: '', name: '', category: 'OTHER' as Unit['category'] });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ code?: string; name?: string }>({});

  // Estados para UX mejorada
  const [defaultUnitId, setDefaultUnitId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
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

    if (!formData.code.trim()) {
      newErrors.code = 'El código es obligatorio';
    } else if (formData.code.length > 6) {
      newErrors.code = 'El código no puede tener más de 6 caracteres';
    } else if (!/^[A-Z0-9]+$/.test(formData.code)) {
      newErrors.code = 'El código solo puede contener letras y números';
    } else if (units.some(u => u.code === formData.code && u.id !== editingId)) {
      newErrors.code = 'Ya existe una unidad con este código';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es obligatorio';
    } else if (formData.name.length < 3) {
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

  const handleSubmit = async (e: React.FormEvent) => {
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
              name: formData.name,
              code: formData.code.toUpperCase(),
              category: formData.category,
              updatedAt: new Date()
            }
            : u
        );
      } else {
        // Create new
        const newUnit: Unit = {
          id: `custom-${Date.now()}`,
          code: formData.code.toUpperCase(),
          name: formData.name,
          symbol: formData.code.toUpperCase(),
          description: formData.name,
          category: formData.category,
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

  // Función para obtener el icono de categoría
  const getCategoryIcon = (category: Unit['category']) => {
    const iconMap = {
      QUANTITY: Hash,
      WEIGHT: Scale,
      LENGTH: Ruler,
      AREA: Square,
      VOLUME: Box,
      TIME: Clock,
      ENERGY: Zap,
      PACKAGING: Package,
      OTHER: MoreHorizontal,
    };
    return iconMap[category] || MoreHorizontal;
  };

  // Función para obtener clases de color de categoría
  const getCategoryColorClasses = (category: Unit['category']) => {
    const colorMap = {
      QUANTITY: {
        border: 'border-blue-200',
        bg: 'bg-blue-50',
        bgHover: 'hover:bg-blue-100',
        bgIcon: 'bg-blue-500',
        text: 'text-blue-900',
        textLight: 'text-blue-700',
        badge: 'bg-blue-100 text-blue-800',
        hoverBg: 'hover:bg-blue-200',
      },
      WEIGHT: {
        border: 'border-green-200',
        bg: 'bg-green-50',
        bgHover: 'hover:bg-green-100',
        bgIcon: 'bg-green-500',
        text: 'text-green-900',
        textLight: 'text-green-700',
        badge: 'bg-green-100 text-green-800',
        hoverBg: 'hover:bg-green-200',
      },
      LENGTH: {
        border: 'border-yellow-200',
        bg: 'bg-yellow-50',
        bgHover: 'hover:bg-yellow-100',
        bgIcon: 'bg-yellow-500',
        text: 'text-yellow-900',
        textLight: 'text-yellow-700',
        badge: 'bg-yellow-100 text-yellow-800',
        hoverBg: 'hover:bg-yellow-200',
      },
      AREA: {
        border: 'border-purple-200',
        bg: 'bg-purple-50',
        bgHover: 'hover:bg-purple-100',
        bgIcon: 'bg-purple-500',
        text: 'text-purple-900',
        textLight: 'text-purple-700',
        badge: 'bg-purple-100 text-purple-800',
        hoverBg: 'hover:bg-purple-200',
      },
      VOLUME: {
        border: 'border-indigo-200',
        bg: 'bg-indigo-50',
        bgHover: 'hover:bg-indigo-100',
        bgIcon: 'bg-indigo-500',
        text: 'text-indigo-900',
        textLight: 'text-indigo-700',
        badge: 'bg-indigo-100 text-indigo-800',
        hoverBg: 'hover:bg-indigo-200',
      },
      TIME: {
        border: 'border-red-200',
        bg: 'bg-red-50',
        bgHover: 'hover:bg-red-100',
        bgIcon: 'bg-red-500',
        text: 'text-red-900',
        textLight: 'text-red-700',
        badge: 'bg-red-100 text-red-800',
        hoverBg: 'hover:bg-red-200',
      },
      ENERGY: {
        border: 'border-orange-200',
        bg: 'bg-orange-50',
        bgHover: 'hover:bg-orange-100',
        bgIcon: 'bg-orange-500',
        text: 'text-orange-900',
        textLight: 'text-orange-700',
        badge: 'bg-orange-100 text-orange-800',
        hoverBg: 'hover:bg-orange-200',
      },
      PACKAGING: {
        border: 'border-pink-200',
        bg: 'bg-pink-50',
        bgHover: 'hover:bg-pink-100',
        bgIcon: 'bg-pink-500',
        text: 'text-pink-900',
        textLight: 'text-pink-700',
        badge: 'bg-pink-100 text-pink-800',
        hoverBg: 'hover:bg-pink-200',
      },
      OTHER: {
        border: 'border-gray-200',
        bg: 'bg-gray-50',
        bgHover: 'hover:bg-gray-100',
        bgIcon: 'bg-gray-500',
        text: 'text-gray-900',
        textLight: 'text-gray-700',
        badge: 'bg-gray-100 text-gray-800',
        hoverBg: 'hover:bg-gray-200',
      },
    };
    return colorMap[category] || colorMap.OTHER;
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
    <div className="space-y-6">
      {/* Header mejorado */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Unidades de Medida</h3>
          <p className="text-sm text-gray-600 mt-1">
            Gestiona las unidades SUNAT y crea unidades personalizadas
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            variant="secondary"
            icon={viewMode === 'grid' ? <List /> : <Grid3X3 />}
          >
            <span className="hidden sm:inline">{viewMode === 'grid' ? 'Lista' : 'Tarjetas'}</span>
          </Button>
          <Button
            onClick={() => setShowForm(true)}
            disabled={isSubmitting}
            variant="primary"
            icon={<Plus />}
          >
            Nueva Unidad
          </Button>
        </div>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:space-y-0 lg:space-x-4">
          {/* Búsqueda */}
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Buscar por código, nombre o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search />}
            />
          </div>

          {/* Filtros */}
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
                { value: 'all', label: 'Todas las categorías' },
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

        {/* Resumen de resultados */}
        <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
          <span>
            {filteredUnits.length} unidad{filteredUnits.length !== 1 ? 'es' : ''}
            {filteredUnits.length !== units.length && ` de ${units.length} total`}
          </span>
          {favoriteUnits.length > 0 && (
            <span className="flex items-center space-x-1">
              <Heart className="w-4 h-4 text-red-500" />
              <span>{favoriteUnits.length} favorita{favoriteUnits.length !== 1 ? 's' : ''}</span>
            </span>
          )}
        </div>
      </div>

      {/* Sección de Favoritos */}
      {favoriteUnits.length > 0 && (
        <ConfigurationCard
          title="⭐ Unidades Favoritas"
          description="Acceso rápido a tus unidades más utilizadas"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {favoriteUnits.map((unit) => {
              const CategoryIcon = getCategoryIcon(unit.category);
              const colors = getCategoryColorClasses(unit.category);

              return (
                <div
                  key={unit.id}
                  className={`relative p-3 rounded-lg border-2 ${colors.border} ${colors.bg} ${colors.bgHover} transition-colors group`}
                >
                  <div className="flex items-center space-x-2">
                    <div className={`w-8 h-8 ${colors.bgIcon} rounded-lg flex items-center justify-center`}>
                      <CategoryIcon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className={`font-mono text-sm font-bold ${colors.text}`}>
                          {unit.code}
                        </span>
                        {isDefaultUnit(unit) && (
                          <span className="px-1.5 py-0.5 bg-green-500 text-white text-xs rounded-full">
                            Def
                          </span>
                        )}
                      </div>
                      <p className={`text-xs ${colors.textLight} truncate`}>{unit.name}</p>
                    </div>
                  </div>

                  <Button
                    onClick={() => toggleFavorite(unit.id)}
                    variant="tertiary"
                    iconOnly
                    icon={<Heart className="text-red-500 fill-current" />}
                    size="sm"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </div>
              );
            })}
          </div>
        </ConfigurationCard>
      )}

      {/* Formulario Mejorado */}
      {showForm && (
        <ConfigurationCard
          title={editingId ? '✏️ Editar Unidad de Medida' : '➕ Nueva Unidad de Medida'}
          description={editingId ? 'Modifica los datos de la unidad seleccionada' : 'Crea una unidad personalizada para tus productos'}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Input
                label="Código SUNAT"
                type="text"
                value={formData.code}
                onChange={(e) => handleCodeChange(e.target.value)}
                error={errors.code}
                helperText={errors.code || "Máximo 6 caracteres en mayúsculas"}
                placeholder="PCE"
                maxLength={6}
                required
              />

              <Input
                label="Nombre"
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                error={errors.name}
                placeholder="Piezas"
                required
              />

              <Select
                label="Categoría"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as Unit['category'] }))}
                options={UNIT_CATEGORIES.map((cat) => ({
                  value: cat.value,
                  label: cat.label
                }))}
                required
              />
            </div>

            {/* SUNAT Units Reference - Mejorada */}
            {!editingId && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Scale className="w-4 h-4 text-white" />
                  </div>
                  <h4 className="font-semibold text-blue-900">Códigos SUNAT Recomendados</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                  {SUNAT_UNITS.slice(0, 12).map((unit) => {
                    const CategoryIcon = getCategoryIcon(unit.category);
                    const colors = getCategoryColorClasses(unit.category);

                    return (
                      <button
                        key={unit.code}
                        type="button"
                        onClick={() => {
                          setFormData({ code: unit.code, name: unit.name, category: unit.category });
                          setErrors({});
                        }}
                        className="flex items-center space-x-2 p-2 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg transition-all duration-200 hover:scale-105"
                      >
                        <div className={`w-6 h-6 ${colors.bgIcon} rounded flex items-center justify-center`}>
                          <CategoryIcon className="w-3 h-3 text-white" />
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <div className="font-mono font-bold text-gray-900">{unit.code}</div>
                          <div className="text-xs text-gray-600 truncate">{unit.name}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 p-2 bg-blue-100 rounded-lg">
                  <p className="text-xs text-blue-800 flex items-center space-x-1">
                    <span>💡</span>
                    <span>Haz clic en cualquier unidad para usarla como plantilla</span>
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
              <Button
                type="button"
                onClick={resetForm}
                disabled={isSubmitting}
                variant="secondary"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || Object.keys(errors).length > 0}
                variant="primary"
              >
                {isSubmitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                <span>{editingId ? '💾 Actualizar' : '✨ Crear'}</span>
              </Button>
            </div>
          </form>
        </ConfigurationCard>
      )}

      {/* Vista Principal de Unidades */}
      {filteredUnits.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900">
                📋 Unidades Configuradas
              </h4>
              <div className="text-sm text-gray-500">
                Vista: {viewMode === 'grid' ? 'Tarjetas' : 'Lista'}
              </div>
            </div>
          </div>

          <div className="p-4">
            {viewMode === 'grid' ? (
              /* Vista de Tarjetas */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredUnits.map((unit) => {
                  const CategoryIcon = getCategoryIcon(unit.category);
                  const colors = getCategoryColorClasses(unit.category);

                  return (
                    <div
                      key={unit.id}
                      className={`relative group p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${isFavoriteUnit(unit)
                          ? `${colors.border} ${colors.bg} ${colors.bgHover}`
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      {/* Indicadores superiores */}
                      <div className="absolute top-2 right-2 flex items-center space-x-1">
                        {isFavoriteUnit(unit) && (
                          <Heart className="w-4 h-4 text-red-500 fill-current" />
                        )}
                        {!isVisibleUnit(unit) && (
                          <EyeOff className="w-4 h-4 text-gray-400" />
                        )}
                        {isDefaultUnit(unit) && (
                          <div className="px-2 py-1 bg-green-500 text-white text-xs rounded-full font-medium">
                            DEF
                          </div>
                        )}
                      </div>

                      {/* Contenido principal */}
                      <div className="flex items-start space-x-3">
                        <div className={`w-12 h-12 ${colors.bgIcon} rounded-xl flex items-center justify-center flex-shrink-0`}>
                          <CategoryIcon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-mono text-lg font-bold text-gray-900">
                              {unit.code}
                            </span>
                            {isSystemUnit(unit) && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                                SUNAT
                              </span>
                            )}
                          </div>
                          <h5 className="font-medium text-gray-900 mb-1 truncate">
                            {unit.name}
                          </h5>
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {unit.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className={`px-2 py-1 ${colors.badge} text-xs rounded-full`}>
                              {UNIT_CATEGORIES.find(c => c.value === unit.category)?.label}
                            </span>
                            {unit.usageCount && unit.usageCount > 0 && (
                              <span className="text-xs text-gray-500">
                                {unit.usageCount} usos
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Acciones (aparecen al hover) */}
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                        <div className="flex items-center space-x-2">
                          <DefaultSelector
                            isDefault={isDefaultUnit(unit)}
                            onSetDefault={() => setDefaultUnit(unit.id)}
                            size="sm"
                          />
                          <Button
                            onClick={() => toggleFavorite(unit.id)}
                            variant="tertiary"
                            iconOnly
                            icon={<Heart className={isFavoriteUnit(unit) ? 'text-red-500 fill-current' : 'text-gray-600'} />}
                            size="sm"
                          />
                          <Button
                            onClick={() => toggleVisibility(unit.id)}
                            disabled={isDefaultUnit(unit)}
                            variant="tertiary"
                            iconOnly
                            icon={isVisibleUnit(unit) ? <Eye /> : <EyeOff />}
                            size="sm"
                          />
                          {!isSystemUnit(unit) && (
                            <>
                              <Button
                                onClick={() => handleEdit(unit)}
                                variant="tertiary"
                                iconOnly
                                icon={<Edit3 />}
                                size="sm"
                              />
                              <Button
                                onClick={() => deleteUnit(unit.id)}
                                disabled={isDefaultUnit(unit)}
                                variant="tertiary"
                                iconOnly
                                icon={<Trash2 className="text-red-600" />}
                                size="sm"
                              />
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Vista de Lista */
              <div className="space-y-2">
                {filteredUnits.map((unit) => {
                  const CategoryIcon = getCategoryIcon(unit.category);
                  const colors = getCategoryColorClasses(unit.category);

                  return (
                    <div
                      key={unit.id}
                      className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${isFavoriteUnit(unit)
                          ? `${colors.border} ${colors.bg}`
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                    >
                      <div className="flex items-center space-x-4 flex-1">
                        <div className={`w-10 h-10 ${colors.bgIcon} rounded-lg flex items-center justify-center`}>
                          <CategoryIcon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-1">
                            <span className="font-mono text-lg font-bold text-gray-900">
                              {unit.code}
                            </span>
                            <span className="font-medium text-gray-900">
                              {unit.name}
                            </span>
                            <div className="flex items-center space-x-2">
                              {isSystemUnit(unit) && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                                  SUNAT
                                </span>
                              )}
                              {isFavoriteUnit(unit) && (
                                <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full">
                                  ⭐ Favorita
                                </span>
                              )}
                              {isDefaultUnit(unit) && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                                  Por defecto
                                </span>
                              )}
                              {!isVisibleUnit(unit) && (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                                  Oculta
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className={`px-2 py-1 ${colors.badge} text-xs rounded-full`}>
                              {UNIT_CATEGORIES.find(c => c.value === unit.category)?.label}
                            </span>
                            <span>{unit.description}</span>
                            {unit.usageCount && unit.usageCount > 0 && (
                              <span className="text-xs text-gray-500">
                                {unit.usageCount} usos
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <DefaultSelector
                          isDefault={isDefaultUnit(unit)}
                          onSetDefault={() => setDefaultUnit(unit.id)}
                          size="sm"
                        />
                        <Button
                          onClick={() => toggleFavorite(unit.id)}
                          variant="tertiary"
                          iconOnly
                          icon={<Heart className={isFavoriteUnit(unit) ? 'text-red-500 fill-current' : 'text-gray-400'} />}
                          size="sm"
                        />
                        <Button
                          onClick={() => toggleVisibility(unit.id)}
                          disabled={isDefaultUnit(unit)}
                          variant="tertiary"
                          iconOnly
                          icon={isVisibleUnit(unit) ? <Eye /> : <EyeOff />}
                          size="sm"
                        />
                        {!isSystemUnit(unit) && (
                          <>
                            <Button
                              onClick={() => handleEdit(unit)}
                              variant="tertiary"
                              iconOnly
                              icon={<Edit3 />}
                              size="sm"
                            />
                            <Button
                              onClick={() => deleteUnit(unit.id)}
                              disabled={isDefaultUnit(unit)}
                              variant="tertiary"
                              iconOnly
                              icon={<Trash2 className="text-red-600" />}
                              size="sm"
                            />
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Estado vacío */
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Scale className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || filterMode !== 'all' || selectedCategory !== 'all'
              ? 'No se encontraron unidades'
              : 'No hay unidades configuradas'
            }
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || filterMode !== 'all' || selectedCategory !== 'all'
              ? 'Intenta ajustar los filtros de búsqueda'
              : 'Comienza agregando tu primera unidad de medida'
            }
          </p>
          {(!searchTerm && filterMode === 'all' && selectedCategory === 'all') && (
            <Button
              onClick={() => setShowForm(true)}
              variant="primary"
              icon={<Plus />}
            >
              Crear Primera Unidad
            </Button>
          )}
        </div>
      )}

      {/* Sección de Ayuda Mejorada */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <Scale className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-semibold text-blue-900 mb-3">
              💡 Guía Rápida de Unidades
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <span className="text-blue-600 font-bold">⚡</span>
                  <span className="text-blue-800">
                    <strong>Favoritos:</strong> Marca las unidades que más uses para acceso rápido
                  </span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-600 font-bold">👁️</span>
                  <span className="text-blue-800">
                    <strong>Visibilidad:</strong> Oculta unidades que no necesites en selectores
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <span className="text-blue-600 font-bold">🏆</span>
                  <span className="text-blue-800">
                    <strong>Por defecto:</strong> Se selecciona automáticamente en nuevos productos
                  </span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-600 font-bold">📋</span>
                  <span className="text-blue-800">
                    <strong>SUNAT:</strong> Usa códigos oficiales para facturación electrónica
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-100 rounded-lg">
              <p className="text-xs text-blue-700 flex items-center space-x-1">
                <span>ℹ️</span>
                <span>
                  Las unidades del sistema SUNAT no se pueden eliminar, pero sí ocultar.
                  Tus unidades personalizadas aparecen destacadas y son completamente editables.
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}