// src/features/configuration/components/business/UnitsSection.tsx
import { useState } from 'react';
import { Scale, Plus, Edit3, Trash2, Star, Eye, EyeOff } from 'lucide-react';
import type { Unit } from '../../models/Unit';
import { DefaultSelector } from '../common/DefaultSelector';
import { ConfigurationCard } from '../common/ConfigurationCard';

interface UnitsSectionProps {
  units: Unit[];
  onUpdate: (units: Unit[]) => Promise<void>;
  isLoading?: boolean;
}

export function UnitsSection({ 
  units, 
  onUpdate, 
  isLoading = false 
}: UnitsSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ code: '', name: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ code?: string; name?: string }>({});
  
  // Estados temporales para simular funcionalidades UX hasta que se agreguen a la interface
  const [defaultUnitId, setDefaultUnitId] = useState<string | null>(null);
  const [mostUsedUnitIds, setMostUsedUnitIds] = useState<Set<string>>(new Set());
  const [hiddenUnitIds, setHiddenUnitIds] = useState<Set<string>>(new Set());

  // Funciones helper para simular propiedades que no están en la interface
  const isSystemUnit = (unit: Unit) => {
    // Determina si es unidad del sistema basado en códigos SUNAT comunes
    const sunatCodes = ['NIU', 'ZZ', 'KGM', 'GRM', 'LTR', 'MTR', 'CMT', 'MTK', 'MTQ', 'KWH', 'HUR', 'TNE', 'GLI', 'BX', 'PK'];
    return sunatCodes.includes(unit.code);
  };
  
  const isDefaultUnit = (unit: Unit) => defaultUnitId === unit.id;
  const isMostUsedUnit = (unit: Unit) => mostUsedUnitIds.has(unit.id);
  const isVisibleUnit = (unit: Unit) => !hiddenUnitIds.has(unit.id);
  
  const systemUnits = units.filter(u => isSystemUnit(u));
  const customUnits = units.filter(u => !isSystemUnit(u));

  // SUNAT standard units for reference
  const sunatUnits = [
    { code: 'NIU', name: 'Unidad (bienes)' },
    { code: 'ZZ', name: 'Unidad (servicios)' },
    { code: 'KGM', name: 'Kilogramo' },
    { code: 'GRM', name: 'Gramo' },
    { code: 'LTR', name: 'Litro' },
    { code: 'MTR', name: 'Metro' },
    { code: 'CMT', name: 'Centímetro' },
    { code: 'MTK', name: 'Metro cuadrado' },
    { code: 'MTQ', name: 'Metro cúbico' },
    { code: 'KWH', name: 'Kilovatio hora' },
    { code: 'HUR', name: 'Hora' },
    { code: 'TNE', name: 'Tonelada' },
    { code: 'GLI', name: 'Galón imperial' },
    { code: 'BX', name: 'Caja' },
    { code: 'PK', name: 'Paquete' }
  ];

  const resetForm = () => {
    setFormData({ code: '', name: '' });
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
    setFormData({ code: unit.code, name: unit.name });
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
            ? { ...u, name: formData.name, code: formData.code.toUpperCase() }
            : u
        );
      } else {
        // Create new
        const newUnit: Unit = {
          id: Date.now().toString(),
          code: formData.code.toUpperCase(),
          name: formData.name,
          symbol: formData.name.slice(0, 3), // Usar primeras letras como símbolo por defecto
          description: formData.name,
          category: 'OTHER', // Categoría por defecto para unidades personalizadas
          decimalPlaces: 0, // Sin decimales por defecto
          isActive: true,
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

  const toggleMostUsed = async (unitId: string) => {
    // Actualiza el estado temporal para mantener la UX
    setMostUsedUnitIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(unitId)) {
        newSet.delete(unitId);
      } else {
        newSet.add(unitId);
      }
      return newSet;
    });
  };

  const toggleVisibility = async (unitId: string) => {
    const unit = units.find(u => u.id === unitId);
    if (isDefaultUnit(unit!)) return; // Can't hide default unit

    // Actualiza el estado temporal para mantener la UX
    setHiddenUnitIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(unitId)) {
        newSet.delete(unitId);
      } else {
        newSet.add(unitId);
      }
      return newSet;
    });
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

  const getMostUsedUnits = () => {
    return units
      .filter(u => isMostUsedUnit(u))
      .sort((a, b) => a.name.localeCompare(b.name)); // Ordenar alfabéticamente ya que no hay property 'order'
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Unidades de Medida</h3>
        <button
          onClick={() => setShowForm(true)}
          disabled={isSubmitting}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Unidad</span>
        </button>
      </div>

      {/* Most Used Units Quick Access */}
      {getMostUsedUnits().length > 0 && (
        <ConfigurationCard
          title="Unidades Más Usadas"
          description="Acceso rápido a las unidades que más utilizas"
        >
          <div className="flex flex-wrap gap-2">
            {getMostUsedUnits().map((unit) => (
              <div
                key={unit.id}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg"
              >
                <Scale className="w-4 h-4 text-blue-600" />
                <span className="font-mono text-sm font-medium text-blue-900">
                  {unit.code}
                </span>
                <span className="text-sm text-blue-700">{unit.name}</span>
                {isDefaultUnit(unit) && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                    Por defecto
                  </span>
                )}
              </div>
            ))}
          </div>
        </ConfigurationCard>
      )}

      {/* Form */}
      {showForm && (
        <ConfigurationCard
          title={editingId ? 'Editar Unidad de Medida' : 'Nueva Unidad de Medida'}
          description="Crea una unidad personalizada para tus productos"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código SUNAT *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono ${
                    errors.code ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="PCE"
                  maxLength={6}
                />
                {errors.code && (
                  <p className="text-sm text-red-600 mt-1">{errors.code}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Máximo 6 caracteres. Usa códigos SUNAT estándar cuando sea posible.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Piezas"
                />
                {errors.name && (
                  <p className="text-sm text-red-600 mt-1">{errors.name}</p>
                )}
              </div>
            </div>

            {/* SUNAT Units Reference */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Códigos SUNAT Comunes</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                {sunatUnits.slice(0, 9).map((unit) => (
                  <button
                    key={unit.code}
                    type="button"
                    onClick={() => {
                      setFormData({ code: unit.code, name: unit.name });
                      setErrors({});
                    }}
                    className="text-left p-2 hover:bg-white hover:border hover:border-blue-200 rounded transition-colors"
                  >
                    <span className="font-mono font-medium text-gray-900">{unit.code}</span>
                    <span className="text-gray-600 ml-2">{unit.name}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Haz clic en cualquier código para usarlo como base
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={resetForm}
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || Object.keys(errors).length > 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
              >
                {isSubmitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                <span>{editingId ? 'Actualizar' : 'Crear'}</span>
              </button>
            </div>
          </form>
        </ConfigurationCard>
      )}

      {/* System Units */}
      <div>
        <h4 className="text-md font-medium text-gray-700 mb-3 flex items-center space-x-2">
          <Scale className="w-4 h-4" />
          <span>Unidades SUNAT ({systemUnits.length})</span>
        </h4>
        <div className="space-y-2">
          {systemUnits.map((unit) => (
            <div key={unit.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Scale className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="flex items-center space-x-3">
                    <span className="font-mono font-medium text-gray-900">{unit.code}</span>
                    <span className="text-gray-700">{unit.name}</span>
                    {isMostUsedUnit(unit) && (
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-xs rounded-full">
                        Más usada
                      </span>
                    )}
                    {!isVisibleUnit(unit) && <EyeOff className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <DefaultSelector
                  isDefault={isDefaultUnit(unit)}
                  onSetDefault={() => setDefaultUnit(unit.id)}
                  size="sm"
                />
                
                <button
                  onClick={() => toggleMostUsed(unit.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    isMostUsedUnit(unit) 
                      ? 'text-orange-600 bg-orange-50 hover:bg-orange-100' 
                      : 'text-gray-400 hover:bg-gray-100 hover:text-orange-500'
                  }`}
                  title={isMostUsedUnit(unit) ? 'Quitar de más usadas' : 'Marcar como más usada'}
                >
                  <Star className={`w-4 h-4 ${isMostUsedUnit(unit) ? 'fill-current' : ''}`} />
                </button>
                
                <button
                  onClick={() => toggleVisibility(unit.id)}
                  disabled={isDefaultUnit(unit)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={isVisibleUnit(unit) ? 'Ocultar' : 'Mostrar'}
                >
                  {isVisibleUnit(unit) ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Units */}
      {customUnits.length > 0 && (
        <div>
          <h4 className="text-md font-medium text-gray-700 mb-3 flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Unidades Personalizadas ({customUnits.length})</span>
          </h4>
          <div className="space-y-2">
            {customUnits.map((unit) => (
              <div key={unit.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <Scale className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-3">
                      <span className="font-mono font-medium text-gray-900">{unit.code}</span>
                      <span className="text-gray-700">{unit.name}</span>
                      {isMostUsedUnit(unit) && (
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-xs rounded-full">
                          Más usada
                        </span>
                      )}
                      {!isVisibleUnit(unit) && <EyeOff className="w-4 h-4 text-gray-400" />}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <DefaultSelector
                    isDefault={isDefaultUnit(unit)}
                    onSetDefault={() => setDefaultUnit(unit.id)}
                    size="sm"
                  />
                  
                  <button
                    onClick={() => toggleMostUsed(unit.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      isMostUsedUnit(unit) 
                        ? 'text-orange-600 bg-orange-50 hover:bg-orange-100' 
                        : 'text-gray-400 hover:bg-gray-100 hover:text-orange-500'
                    }`}
                    title={isMostUsedUnit(unit) ? 'Quitar de más usadas' : 'Marcar como más usada'}
                  >
                    <Star className={`w-4 h-4 ${isMostUsedUnit(unit) ? 'fill-current' : ''}`} />
                  </button>
                  
                  <button
                    onClick={() => toggleVisibility(unit.id)}
                    disabled={isDefaultUnit(unit)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={isVisibleUnit(unit) ? 'Ocultar' : 'Mostrar'}
                  >
                    {isVisibleUnit(unit) ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  
                  <button
                    onClick={() => handleEdit(unit)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => deleteUnit(unit.id)}
                    disabled={isDefaultUnit(unit)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">💡 Consejos sobre Unidades</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Usa siempre códigos SUNAT oficiales para evitar problemas con la facturación electrónica</li>
          <li>• Las unidades más usadas aparecen como acceso rápido en el registro de productos</li>
          <li>• La unidad por defecto se selecciona automáticamente al crear nuevos productos</li>
          <li>• No se pueden eliminar unidades del sistema, solo ocultarlas si no las necesitas</li>
        </ul>
      </div>
    </div>
  );
}