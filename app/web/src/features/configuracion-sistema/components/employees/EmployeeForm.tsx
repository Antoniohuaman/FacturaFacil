// src/features/configuration/components/employees/EmployeeForm.tsx
import { useState, useEffect } from 'react';
import { X, User, Mail, Phone, FileText, AlertCircle } from 'lucide-react';
import type { Employee } from '../../models/Employee';
import type { Establishment } from '../../models/Establishment';

interface EmployeeFormData {
  fullName: string;
  email: string;
  phone: string;
  documentType: 'DNI' | 'CE' | 'PASSPORT' | '';
  documentNumber: string;
  establishmentIds: string[];
}

interface EmployeeFormProps {
  employee?: Employee;
  establishments: Establishment[];
  existingEmails: string[];
  onSubmit: (data: EmployeeFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const documentTypes = [
  { value: 'DNI' as const, label: 'DNI', placeholder: '12345678', maxLength: 8 },
  { value: 'CE' as const, label: 'Carnet de Extranjería', placeholder: '123456789', maxLength: 9 },
  { value: 'PASSPORT' as const, label: 'Pasaporte', placeholder: 'A1234567', maxLength: 12 }
];

export function EmployeeForm({
  employee,
  establishments: _establishments, // Disponible para funcionalidad futura
  existingEmails,
  onSubmit,
  onCancel,
  isLoading = false
}: EmployeeFormProps) {
  const [formData, setFormData] = useState<EmployeeFormData>({
    fullName: '',
    email: '',
    phone: '',
    documentType: '',
    documentNumber: '',
    establishmentIds: []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());


  useEffect(() => {
    if (employee) {
      setFormData({
        fullName: employee.personalInfo.fullName,
        email: employee.personalInfo.email,
        phone: employee.personalInfo.phone || '',
        documentType: employee.personalInfo.documentType || '',
        documentNumber: employee.personalInfo.documentNumber || '',
        establishmentIds: employee.employment.establishmentIds
      });
    }
  }, [employee]);

  const validateField = (field: string, value: any): string | null => {
    switch (field) {
      case 'fullName':
        if (!value || value.trim().length < 3) {
          return 'El nombre debe tener al menos 3 caracteres';
        }
        if (value.trim().length > 100) {
          return 'El nombre no puede tener más de 100 caracteres';
        }
        if (!/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s]+$/.test(value.trim())) {
          return 'El nombre solo puede contener letras y espacios';
        }
        break;

      case 'email':
        if (!value || value.trim() === '') {
          return 'El email es obligatorio';
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return 'Ingresa un email válido';
        }
        if (existingEmails.includes(value.toLowerCase()) && value.toLowerCase() !== employee?.personalInfo.email?.toLowerCase()) {
          return 'Ya existe un empleado con este email';
        }
        break;

      case 'phone':
        if (value && value.trim()) {
          const phoneRegex = /^[\+]?[0-9\s\-\(\)]{9,15}$/;
          if (!phoneRegex.test(value.replace(/\s/g, ''))) {
            return 'Ingresa un teléfono válido';
          }
        }
        break;

      case 'documentNumber':
        if (formData.documentType && value) {
          const docType = documentTypes.find(dt => dt.value === formData.documentType);
          if (docType) {
            if (formData.documentType === 'DNI') {
              if (!/^\d{8}$/.test(value)) {
                return 'El DNI debe tener 8 dígitos';
              }
            } else if (formData.documentType === 'CE') {
              if (!/^\d{9}$/.test(value)) {
                return 'El CE debe tener 9 dígitos';
              }
            } else if (formData.documentType === 'PASSPORT') {
              if (value.length < 6 || value.length > 12) {
                return 'El pasaporte debe tener entre 6 y 12 caracteres';
              }
            }
          }
        }
        break;
    }
    
    return null;
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setTouchedFields(prev => new Set(prev).add(field));
    
    // Validate field
    const error = validateField(field, value);
    setErrors(prev => ({
      ...prev,
      [field]: error || ''
    }));

    // Clear document number if document type changes
    if (field === 'documentType') {
      setFormData(prev => ({ ...prev, documentNumber: '' }));
      setErrors(prev => ({ ...prev, documentNumber: '' }));
    }
  };

  const handleBlur = (field: string) => {
    setTouchedFields(prev => new Set(prev).add(field));
    const error = validateField(field, formData[field as keyof EmployeeFormData]);
    setErrors(prev => ({
      ...prev,
      [field]: error || ''
    }));
  };

  const isFormValid = () => {
    const requiredFields = ['fullName', 'email'];
    
    // Check required fields
    for (const field of requiredFields) {
      const error = validateField(field, formData[field as keyof EmployeeFormData]);
      if (error) return false;
    }

    // Check optional fields if they have values
    const optionalFields = ['phone', 'documentNumber'];
    for (const field of optionalFields) {
      if (formData[field as keyof EmployeeFormData]) {
        const error = validateField(field, formData[field as keyof EmployeeFormData]);
        if (error) return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    const newErrors: Record<string, string> = {};
    const fieldsToValidate = ['fullName', 'email', 'phone', 'documentNumber'];
    
    fieldsToValidate.forEach(field => {
      const error = validateField(field, formData[field as keyof EmployeeFormData]);
      if (error) newErrors[field] = error;
    });
    
    setErrors(newErrors);
    setTouchedFields(new Set(fieldsToValidate));
    
    if (Object.keys(newErrors).some(key => newErrors[key])) {
      return;
    }

    await onSubmit(formData);
  };

  const getDocumentTypeConfig = () => {
    return documentTypes.find(dt => dt.value === formData.documentType);
  };



  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {employee ? 'Editar Empleado' : 'Invitar Nuevo Empleado'}
                </h3>
                <p className="text-sm text-gray-500">
                  {employee ? 'Modifica los datos del empleado' : 'Completa la información para enviar una invitación'}
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
          {/* Personal Information */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900 flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span>Información Personal</span>
            </h4>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre Completo *
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => handleFieldChange('fullName', e.target.value)}
                onBlur={() => handleBlur('fullName')}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.fullName && touchedFields.has('fullName')
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300'
                }`}
                placeholder="Juan Pérez García"
                disabled={isLoading}
              />
              
              {errors.fullName && touchedFields.has('fullName') && (
                <p className="text-sm text-red-600 mt-1 flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.fullName}</span>
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Correo Electrónico *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleFieldChange('email', e.target.value.toLowerCase())}
                  onBlur={() => handleBlur('email')}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.email && touchedFields.has('email')
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300'
                  }`}
                  placeholder="juan@empresa.com"
                  disabled={isLoading}
                />
              </div>
              
              {errors.email && touchedFields.has('email') && (
                <p className="text-sm text-red-600 mt-1 flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.email}</span>
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  onBlur={() => handleBlur('phone')}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.phone && touchedFields.has('phone')
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300'
                  }`}
                  placeholder="+51 987 654 321"
                  disabled={isLoading}
                />
              </div>
              
              {errors.phone && touchedFields.has('phone') && (
                <p className="text-sm text-red-600 mt-1 flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.phone}</span>
                </p>
              )}
            </div>
          </div>

          {/* Document Information */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900 flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Documento de Identidad</span>
              <span className="text-sm font-normal text-gray-500">(Opcional)</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Document Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Documento
                </label>
                <select
                  value={formData.documentType}
                  onChange={(e) => handleFieldChange('documentType', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                >
                  <option value="">Seleccionar tipo</option>
                  {documentTypes.map(docType => (
                    <option key={docType.value} value={docType.value}>
                      {docType.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Document Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de Documento
                </label>
                <input
                  type="text"
                  value={formData.documentNumber}
                  onChange={(e) => {
                    let value = e.target.value;
                    
                    // Format based on document type
                    if (formData.documentType === 'DNI') {
                      value = value.replace(/\D/g, '').slice(0, 8);
                    } else if (formData.documentType === 'CE') {
                      value = value.replace(/\D/g, '').slice(0, 9);
                    } else if (formData.documentType === 'PASSPORT') {
                      value = value.toUpperCase().slice(0, 12);
                    }
                    
                    setFormData({ ...formData, documentNumber: value });
                  }}
                  placeholder={getDocumentTypeConfig()?.placeholder}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.documentNumber ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.documentNumber && (
                  <p className="text-sm text-red-600 mt-1">{errors.documentNumber}</p>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !isFormValid()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Guardando...' : (employee ? 'Actualizar' : 'Invitar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};