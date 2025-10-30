/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
// src/features/configuration/components/establishments/EstablishmentForm.tsx
import { useState, useEffect } from 'react';
import { MapPin, Building2, Hash, ToggleLeft, ToggleRight, X } from 'lucide-react';
import type { Establishment } from '../../models/Establishment';

interface EstablishmentFormData {
  code: string;
  name: string;
  address: string;
  ubigeo: string;
  isEnabled: boolean;
}

interface EstablishmentFormProps {
  establishment?: Establishment;
  onSubmit: (data: EstablishmentFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  existingCodes?: string[];
}

export function EstablishmentForm({ 
  establishment, 
  onSubmit, 
  onCancel, 
  isLoading = false,
  existingCodes = []
}: EstablishmentFormProps) {
  const [formData, setFormData] = useState<EstablishmentFormData>({
    code: '',
    name: '',
    address: '',
    ubigeo: '',
    isEnabled: true
  });

  const [errors, setErrors] = useState<Partial<EstablishmentFormData>>({});
  const [touchedFields, setTouchedFields] = useState<Set<keyof EstablishmentFormData>>(new Set());

  // Load existing establishment data
  useEffect(() => {
    if (establishment) {
      setFormData({
        code: establishment.code,
        name: establishment.name,
        address: establishment.address,
        ubigeo: establishment.postalCode || '',
        isEnabled: establishment.isActive
      });
    } else {
      // Generate next code for new establishment
      const nextCode = generateNextCode();
      setFormData(prev => ({ ...prev, code: nextCode }));
    }
  }, [establishment, existingCodes]);

  const generateNextCode = (): string => {
    let nextNumber = 1;
    while (existingCodes.includes(`EST${nextNumber.toString().padStart(3, '0')}`)) {
      nextNumber++;
    }
    return `EST${nextNumber.toString().padStart(3, '0')}`;
  };

  const validateField = (field: keyof EstablishmentFormData, value: any): string | undefined => {
    switch (field) {
      case 'code':
        if (!value || value.trim() === '') {
          return 'El código es obligatorio';
        }
        if (value.length < 3) {
          return 'El código debe tener al menos 3 caracteres';
        }
        if (existingCodes.includes(value) && value !== establishment?.code) {
          return 'Ya existe un establecimiento con este código';
        }
        break;
      
      case 'name':
        if (!value || value.trim() === '') {
          return 'El nombre es obligatorio';
        }
        if (value.length < 3) {
          return 'El nombre debe tener al menos 3 caracteres';
        }
        break;
      
      case 'address':
        if (!value || value.trim() === '') {
          return 'La dirección es obligatoria';
        }
        if (value.length < 10) {
          return 'La dirección debe ser más específica';
        }
        break;
      
      case 'ubigeo':
        if (value && value.length !== 6) {
          return 'El ubigeo debe tener 6 dígitos';
        }
        if (value && !/^\d+$/.test(value)) {
          return 'El ubigeo solo debe contener números';
        }
        break;
    }
  };

  const handleFieldChange = (field: keyof EstablishmentFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Mark field as touched
    setTouchedFields(prev => new Set(prev).add(field));
    
    // Validate field
    const error = validateField(field, value);
    setErrors(prev => ({
      ...prev,
      [field]: error
    }));
  };

  const handleBlur = (field: keyof EstablishmentFormData) => {
    setTouchedFields(prev => new Set(prev).add(field));
    const error = validateField(field, formData[field]);
    setErrors(prev => ({
      ...prev,
      [field]: error
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    (Object.keys(formData) as Array<keyof EstablishmentFormData>).forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
      }
    });

    setErrors(newErrors);
    setTouchedFields(new Set(Object.keys(formData) as Array<keyof EstablishmentFormData>));
    
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    await onSubmit(formData);
  };

  const isFormValid = Object.keys(errors).length === 0 && 
                     formData.code.trim() !== '' && 
                     formData.name.trim() !== '' && 
                     formData.address.trim() !== '';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <Building2 className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {establishment ? 'Editar Establecimiento' : 'Nuevo Establecimiento'}
                </h3>
                <p className="text-sm text-gray-500">
                  {establishment ? 'Modifica los datos del establecimiento' : 'Crea un nuevo punto de venta'}
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código *
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => handleFieldChange('code', e.target.value.toUpperCase())}
                  onBlur={() => handleBlur('code')}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.code && touchedFields.has('code')
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300'
                  }`}
                  placeholder="EST001"
                  maxLength={10}
                />
              </div>
              {errors.code && touchedFields.has('code') && (
                <p className="text-sm text-red-600 mt-1">{errors.code}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Código único para identificar el establecimiento
              </p>
            </div>

            {/* Status Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleFieldChange('isEnabled', !formData.isEnabled)}
                  className="flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                >
                  {formData.isEnabled ? (
                    <ToggleRight className="w-8 h-8 text-green-600" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-gray-400" />
                  )}
                  <span className={`font-medium ${formData.isEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                    {formData.isEnabled ? 'Habilitado' : 'Inhabilitado'}
                  </span>
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Solo los establecimientos habilitados pueden generar comprobantes
              </p>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del Establecimiento *
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                onBlur={() => handleBlur('name')}
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.name && touchedFields.has('name')
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300'
                }`}
                placeholder="Sucursal Principal, Local Centro, Tienda Norte..."
              />
            </div>
            {errors.name && touchedFields.has('name') && (
              <p className="text-sm text-red-600 mt-1">{errors.name}</p>
            )}
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dirección Completa *
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <textarea
                value={formData.address}
                onChange={(e) => handleFieldChange('address', e.target.value)}
                onBlur={() => handleBlur('address')}
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                  errors.address && touchedFields.has('address')
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300'
                }`}
                rows={3}
                placeholder="Jr. Los Tulipanes 123, Urb. Las Flores, San Juan de Lurigancho, Lima"
              />
            </div>
            {errors.address && touchedFields.has('address') && (
              <p className="text-sm text-red-600 mt-1">{errors.address}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Incluye calle, número, urbanización, distrito y provincia
            </p>
          </div>

          {/* Ubigeo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Código de Ubigeo
            </label>
            <input
              type="text"
              value={formData.ubigeo}
              onChange={(e) => handleFieldChange('ubigeo', e.target.value.replace(/\D/g, '').slice(0, 6))}
              onBlur={() => handleBlur('ubigeo')}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.ubigeo && touchedFields.has('ubigeo')
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-300'
              }`}
              placeholder="150101"
              maxLength={6}
            />
            {errors.ubigeo && touchedFields.has('ubigeo') && (
              <p className="text-sm text-red-600 mt-1">{errors.ubigeo}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Código de ubicación geográfica según INEI (opcional, 6 dígitos)
            </p>
          </div>

          {/* Form Summary */}
          {formData.code && formData.name && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Resumen del Establecimiento</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p><span className="font-medium">Código:</span> {formData.code}</p>
                <p><span className="font-medium">Nombre:</span> {formData.name}</p>
                <p><span className="font-medium">Estado:</span> {formData.isEnabled ? 'Habilitado' : 'Inhabilitado'}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isFormValid || isLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Guardando...</span>
                </>
              ) : (
                <span>{establishment ? 'Actualizar' : 'Crear'} Establecimiento</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}