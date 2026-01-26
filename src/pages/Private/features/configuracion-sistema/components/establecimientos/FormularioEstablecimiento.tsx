/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
// src/features/configuration/components/establecimientos/EstablecimientoForm.tsx
import { useState, useEffect, useCallback } from 'react';
import { MapPin, Building2, Hash, ToggleLeft, ToggleRight, X, Loader2 } from 'lucide-react';
import { Input, Button } from '@/contasis';
import type { Establecimiento } from '../../modelos/Establecimiento';

interface EstablecimientoFormData {
  codigo: string;
  nombre: string;
  direccion: string;
  codigoPostal: string;
  principal: boolean;
}

interface EstablecimientoFormProps {
  Establecimiento?: Establecimiento;
  onSubmit: (data: EstablecimientoFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  existingCodes?: string[];
}

export function EstablecimientoForm({
  Establecimiento,
  onSubmit,
  onCancel,
  isLoading = false,
  existingCodes = []
}: EstablecimientoFormProps) {
  const [datosFormulario, setFormData] = useState<EstablecimientoFormData>({
    codigo: '',
    nombre: '',
    direccion: '',
    codigoPostal: '',
    principal: false
  });

  const [errors, setErrors] = useState<Partial<EstablecimientoFormData>>({});
  const [touchedFields, setTouchedFields] = useState<Set<keyof EstablecimientoFormData>>(new Set());

  const generateNextCode = useCallback((): string => {
    let nextNumber = 1;
    while (existingCodes.includes(`EST${nextNumber.toString().padStart(3, '0')}`)) {
      nextNumber++;
    }
    return `EST${nextNumber.toString().padStart(3, '0')}`;
  }, [existingCodes]);

  // Load existing Establecimiento data
  useEffect(() => {
    if (Establecimiento) {
      setFormData({
        codigo: Establecimiento.codigo,
        nombre: Establecimiento.nombre,
        direccion: Establecimiento.direccion,
        codigoPostal: Establecimiento.codigoPostal || '',
        principal: Establecimiento.principal
      });
    } else {
      // Generate next code for new Establecimiento
      const nextCode = generateNextCode();
      setFormData(prev => ({ ...prev, codigo: nextCode }));
    }
  }, [Establecimiento, generateNextCode]);

  const validateField = (field: keyof EstablecimientoFormData, value: any): string | undefined => {
    switch (field) {
      case 'codigo':
        if (!value || value.trim() === '') {
          return 'El código es obligatorio';
        }
        if (value.length < 3) {
          return 'El código debe tener al menos 3 caracteres';
        }
        if (existingCodes.includes(value) && value !== Establecimiento?.codigo) {
          return 'Ya existe un establecimiento con este código';
        }
        break;

      case 'nombre':
        if (!value || value.trim() === '') {
          return 'El nombre es obligatorio';
        }
        if (value.length < 3) {
          return 'El nombre debe tener al menos 3 caracteres';
        }
        break;

      case 'direccion':
        if (!value || value.trim() === '') {
          return 'La dirección es obligatoria';
        }
        if (value.length < 10) {
          return 'La dirección debe ser más específica';
        }
        break;

      case 'codigoPostal':
        if (value && value.length !== 6) {
          return 'El ubigeo debe tener 6 dígitos';
        }
        if (value && !/^\d+$/.test(value)) {
          return 'El ubigeo solo debe contener números';
        }
        break;
    }
  };

  const handleFieldChange = (field: keyof EstablecimientoFormData, value: any) => {
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

  const handleBlur = (field: keyof EstablecimientoFormData) => {
    setTouchedFields(prev => new Set(prev).add(field));
    const error = validateField(field, datosFormulario[field]);
    setErrors(prev => ({
      ...prev,
      [field]: error
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    (Object.keys(datosFormulario) as Array<keyof EstablecimientoFormData>).forEach(field => {
      const error = validateField(field, datosFormulario[field]);
      if (error) {
        newErrors[field] = error;
      }
    });

    setErrors(newErrors);
    setTouchedFields(new Set(Object.keys(datosFormulario) as Array<keyof EstablecimientoFormData>));

    return Object.keys(newErrors).length === 0;
  };

  const manejarEnvio = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    await onSubmit(datosFormulario);
  };

  const isFormValid = Object.keys(errors).length === 0 &&
    datosFormulario.codigo.trim() !== '' &&
    datosFormulario.nombre.trim() !== '' &&
    datosFormulario.direccion.trim() !== '';

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
                  {Establecimiento ? 'Editar Establecimiento' : 'Nuevo Establecimiento'}
                </h3>
                <p className="text-sm text-gray-500">
                  {Establecimiento ? 'Modifica los datos del establecimiento' : 'Crea un nuevo punto de venta'}
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

        <form onSubmit={manejarEnvio} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Code */}
            <Input
              label="Código *"
              type="text"
              value={datosFormulario.codigo}
              onChange={(e) => handleFieldChange('codigo', e.target.value.toUpperCase())}
              onBlur={() => handleBlur('codigo')}
              error={errors.codigo && touchedFields.has('codigo') ? errors.codigo : undefined}
              placeholder="EST001"
              maxLength={10}
              leftIcon={<Hash />}
              helperText="Código único para identificar el establecimiento"
            />

            {/* Status Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleFieldChange('principal', !datosFormulario.principal)}
                  className="flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                >
                  {datosFormulario.principal ? (
                    <ToggleRight className="w-8 h-8 text-green-600" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-gray-400" />
                  )}
                  <span className={`font-medium ${datosFormulario.principal ? 'text-green-600' : 'text-gray-500'}`}>
                    {datosFormulario.principal ? 'Principal' : 'Secundaria'}
                  </span>
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Solo los establecimientos habilitados pueden generar comprobantes
              </p>
            </div>
          </div>

          {/* Name */}
          <Input
            label="Nombre del Establecimiento *"
            type="text"
            value={datosFormulario.nombre}
            onChange={(e) => handleFieldChange('nombre', e.target.value)}
            onBlur={() => handleBlur('nombre')}
            error={errors.nombre && touchedFields.has('nombre') ? errors.nombre : undefined}
            placeholder="Sucursal Principal, Local Centro, Tienda Norte..."
            leftIcon={<Building2 />}
          />

          {/* Address */}
          <Input
            label="Dirección Completa *"
            type="text"
            value={datosFormulario.direccion}
            onChange={(e) => handleFieldChange('direccion', e.target.value)}
            onBlur={() => handleBlur('direccion')}
            error={errors.direccion && touchedFields.has('direccion') ? errors.direccion : undefined}
            placeholder="Jr. Los Tulipanes 123, Urb. Las Flores, San Juan de Lurigancho, Lima"
            leftIcon={<MapPin />}
            helperText="Incluye calle, número, urbanización, distrito y provincia"
          />

          {/* Ubigeo */}
          <Input
            label="Código de Ubigeo"
            type="text"
            value={datosFormulario.codigoPostal}
            onChange={(e) => handleFieldChange('codigoPostal', e.target.value.replace(/\D/g, '').slice(0, 6))}
            onBlur={() => handleBlur('codigoPostal')}
            error={errors.codigoPostal && touchedFields.has('codigoPostal') ? errors.codigoPostal : undefined}
            placeholder="150101"
            maxLength={6}
            leftIcon={<MapPin />}
            helperText="Código de 6 dígitos (DDPPDD)"
          />

          {/* Form Summary */}
          {datosFormulario.codigo && datosFormulario.nombre && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Resumen del Establecimiento</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p><span className="font-medium">Código:</span> {datosFormulario.codigo}</p>
                <p><span className="font-medium">Nombre:</span> {datosFormulario.nombre}</p>
                <p><span className="font-medium">Tipo:</span> {datosFormulario.principal ? 'Principal' : 'Secundaria'}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center gap-3 rounded-b-lg mb-4">
            <Button
              variant="secondary"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={!isFormValid || isLoading}
              icon={isLoading ? <Loader2 className="animate-spin" /> : undefined}
            >
              {isLoading ? 'Guardando...' : `${Establecimiento ? 'Actualizar' : 'Crear'} Establecimiento`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

