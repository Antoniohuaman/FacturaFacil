/* eslint-disable no-case-declarations -- switch con declaraciones; refactor diferido */
/* eslint-disable no-useless-escape -- regex literal heredado; limpieza diferida */
/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
// src/features/configuration/components/users/UserForm.tsx
import { useState, useEffect } from 'react';
import { X, User, Mail, Phone, FileText, AlertCircle, Building2, Lock, Eye, EyeOff, RefreshCw, Copy, Check, Shield } from 'lucide-react';
import { Button, Select, Input, Checkbox } from '@/contasis';
import type { User as UserModel } from '../../models/User';
import type { Establishment } from '../../models/Establishment';

interface UserFormData {
  fullName: string;
  email: string;
  phone: string;
  documentType: 'DNI' | 'CE' | 'PASSPORT' | '';
  documentNumber: string;
  establishmentIds: string[];
  password: string;
  requirePasswordChange: boolean;
}

interface UserFormProps {
  user?: UserModel;
  establishments: Establishment[];
  existingEmails: string[];
  onSubmit: (data: UserFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const documentTypes = [
  { value: 'DNI' as const, label: 'DNI', placeholder: '12345678', maxLength: 8 },
  { value: 'CE' as const, label: 'Carnet de Extranjería', placeholder: '123456789', maxLength: 9 },
  { value: 'PASSPORT' as const, label: 'Pasaporte', placeholder: 'A1234567', maxLength: 12 }
];

// Password generator utility
const generateSecurePassword = (): string => {
  const length = 12;
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%&*';

  const allChars = uppercase + lowercase + numbers + symbols;
  let password = '';

  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Fill the rest
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

// Password strength calculator
const calculatePasswordStrength = (password: string): { score: number; label: string; color: string } => {
  if (!password) return { score: 0, label: 'Sin contraseña', color: 'gray' };

  let score = 0;

  // Length
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;

  // Complexity
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;

  if (score <= 2) return { score, label: 'Débil', color: 'red' };
  if (score <= 4) return { score, label: 'Media', color: 'yellow' };
  return { score, label: 'Fuerte', color: 'green' };
};

export function UserForm({
  user,
  establishments,
  existingEmails,
  onSubmit,
  onCancel,
  isLoading = false
}: UserFormProps) {
  const [formData, setFormData] = useState<UserFormData>({
    fullName: '',
    email: '',
    phone: '',
    documentType: '',
    documentNumber: '',
    establishmentIds: [],
    password: generateSecurePassword(),
    requirePasswordChange: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [showPassword, setShowPassword] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);


  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.personalInfo.fullName,
        email: user.personalInfo.email,
        phone: user.personalInfo.phone || '',
        documentType: user.personalInfo.documentType || '',
        documentNumber: user.personalInfo.documentNumber || '',
        establishmentIds: user.assignment.establishmentIds,
        password: '', // Don't show password when editing
        requirePasswordChange: false
      });
    }
  }, [user]);

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
        if (existingEmails.includes(value.toLowerCase()) && value.toLowerCase() !== user?.personalInfo.email?.toLowerCase()) {
          return 'Ya existe un usuario con este email';
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

      case 'establishmentIds':
        if (!value || value.length === 0) {
          return 'Debes seleccionar al menos un establecimiento';
        }
        break;

      case 'password':
        if (!user && (!value || value.trim() === '')) {
          return 'La contraseña es obligatoria';
        }
        if (value && value.length < 8) {
          return 'La contraseña debe tener al menos 8 caracteres';
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
    const error = validateField(field, formData[field as keyof UserFormData]);
    setErrors(prev => ({
      ...prev,
      [field]: error || ''
    }));
  };

  const isFormValid = () => {
    const requiredFields = user
      ? ['fullName', 'email', 'establishmentIds']
      : ['fullName', 'email', 'establishmentIds', 'password'];

    // Check required fields
    for (const field of requiredFields) {
      const error = validateField(field, formData[field as keyof UserFormData]);
      if (error) return false;
    }

    // Check optional fields if they have values
    const optionalFields = ['phone', 'documentNumber'];
    for (const field of optionalFields) {
      if (formData[field as keyof UserFormData]) {
        const error = validateField(field, formData[field as keyof UserFormData]);
        if (error) return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const newErrors: Record<string, string> = {};
    const fieldsToValidate = user
      ? ['fullName', 'email', 'phone', 'documentNumber', 'establishmentIds']
      : ['fullName', 'email', 'phone', 'documentNumber', 'establishmentIds', 'password'];

    fieldsToValidate.forEach(field => {
      const error = validateField(field, formData[field as keyof UserFormData]);
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

  const handleEstablishmentToggle = (establishmentId: string) => {
    const currentIds = formData.establishmentIds;
    const newIds = currentIds.includes(establishmentId)
      ? currentIds.filter(id => id !== establishmentId)
      : [...currentIds, establishmentId];

    handleFieldChange('establishmentIds', newIds);
  };

  const handleGeneratePassword = () => {
    const newPassword = generateSecurePassword();
    handleFieldChange('password', newPassword);
    setPasswordCopied(false);
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(formData.password);
      setPasswordCopied(true);
      setTimeout(() => setPasswordCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy password:', err);
    }
  };

  const passwordStrength = calculatePasswordStrength(formData.password);

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
                  {user ? 'Editar Usuario' : 'Invitar Nuevo Usuario'}
                </h3>
                <p className="text-sm text-gray-500">
                  {user ? 'Modifica los datos del usuario' : 'Completa la información para enviar una invitación'}
                </p>
              </div>
            </div>
            <Button
              variant="tertiary"
              size="sm"
              icon={<X />}
              iconOnly
              onClick={onCancel}
              disabled={isLoading}
            />
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
            <Input
              label="Nombre Completo"
              type="text"
              value={formData.fullName}
              onChange={(e) => handleFieldChange('fullName', e.target.value)}
              onBlur={() => handleBlur('fullName')}
              error={errors.fullName && touchedFields.has('fullName') ? errors.fullName : undefined}
              placeholder="Juan Pérez García"
              disabled={isLoading}
              required
            />

            {/* Email */}
            <Input
              label="Correo Electrónico"
              type="email"
              value={formData.email}
              onChange={(e) => handleFieldChange('email', e.target.value.toLowerCase())}
              onBlur={() => handleBlur('email')}
              error={errors.email && touchedFields.has('email') ? errors.email : undefined}
              placeholder="juan@empresa.com"
              leftIcon={<Mail />}
              disabled={isLoading}
              required
            />

            {/* Phone */}
            <Input
              label="Teléfono"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleFieldChange('phone', e.target.value)}
              onBlur={() => handleBlur('phone')}
              error={errors.phone && touchedFields.has('phone') ? errors.phone : undefined}
              placeholder="+51 987 654 321"
              leftIcon={<Phone />}
              disabled={isLoading}
            />
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
              <Select
                label="Tipo de Documento"
                value={formData.documentType}
                onChange={(e) => handleFieldChange('documentType', e.target.value)}
                options={[
                  { value: '', label: 'Seleccionar tipo' },
                  ...documentTypes.map(docType => ({
                    value: docType.value,
                    label: docType.label
                  }))
                ]}
                disabled={isLoading}
              />

              {/* Document Number */}
              <Input
                label="Número de Documento"
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
                error={errors.documentNumber}
              />
            </div>
          </div>

          {/* Establishments */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900 flex items-center space-x-2">
              <Building2 className="w-4 h-4" />
              <span>Establecimientos</span>
              <span className="text-sm font-normal text-red-500">*</span>
            </h4>
            <p className="text-sm text-gray-600">
              Selecciona los establecimientos a los que el usuario tendrá acceso
            </p>

            <div className="space-y-2">
              {establishments.length > 0 ? (
                establishments.map((establishment) => (
                  <label
                    key={establishment.id}
                    className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.establishmentIds.includes(establishment.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.establishmentIds.includes(establishment.id)}
                      onChange={() => handleEstablishmentToggle(establishment.id)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      disabled={isLoading}
                    />
                    <div className="ml-3 flex-1">
                      <div className="font-medium text-gray-900">
                        {establishment.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {establishment.address}
                      </div>
                    </div>
                  </label>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Building2 className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>No hay establecimientos disponibles</p>
                </div>
              )}
            </div>

            {errors.establishmentIds && touchedFields.has('establishmentIds') && (
              <p className="text-sm text-red-600 mt-2 flex items-center space-x-1">
                <AlertCircle className="w-4 h-4" />
                <span>{errors.establishmentIds}</span>
              </p>
            )}
          </div>

          {/* Password Section - Only for new users */}
          {!user && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-md font-medium text-gray-900 flex items-center space-x-2">
                  <Lock className="w-4 h-4" />
                  <span>Acceso al Sistema</span>
                  <span className="text-sm font-normal text-red-500">*</span>
                </h4>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 space-y-4">
                {/* Username Display */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de Usuario
                  </label>
                  <div className="flex items-center space-x-2 px-4 py-3 bg-white border border-gray-300 rounded-lg">
                    <User className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-900 font-medium">
                      {formData.email.split('@')[0] || 'usuario'}
                    </span>
                    <span className="text-xs text-gray-500 ml-auto">
                      (basado en el email)
                    </span>
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleFieldChange('password', e.target.value)}
                      onBlur={() => handleBlur('password')}
                      className={`w-full pl-10 pr-32 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm ${
                        errors.password && touchedFields.has('password')
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-300 bg-white'
                      }`}
                      placeholder="Ingresa una contraseña segura"
                      disabled={isLoading}
                    />

                    {/* Action Buttons */}
                    <div className="absolute right-2 top-2 flex items-center space-x-1">
                      <Button
                        variant="tertiary"
                        size="sm"
                        icon={showPassword ? <EyeOff /> : <Eye />}
                        iconOnly
                        onClick={() => setShowPassword(!showPassword)}
                      />

                      <Button
                        variant="tertiary"
                        size="sm"
                        icon={passwordCopied ? <Check /> : <Copy />}
                        iconOnly
                        onClick={handleCopyPassword}
                      />

                      <Button
                        variant="tertiary"
                        size="sm"
                        icon={<RefreshCw />}
                        iconOnly
                        onClick={handleGeneratePassword}
                      />
                    </div>
                  </div>

                  {/* Password Strength Indicator */}
                  {formData.password && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Fortaleza de la contraseña:</span>
                        <span className={`font-semibold ${
                          passwordStrength.color === 'green' ? 'text-green-600' :
                          passwordStrength.color === 'yellow' ? 'text-yellow-600' :
                          passwordStrength.color === 'red' ? 'text-red-600' :
                          'text-gray-600'
                        }`}>
                          {passwordStrength.label}
                        </span>
                      </div>

                      {/* Strength Bar */}
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 rounded-full ${
                            passwordStrength.color === 'green' ? 'bg-green-500' :
                            passwordStrength.color === 'yellow' ? 'bg-yellow-500' :
                            passwordStrength.color === 'red' ? 'bg-red-500' :
                            'bg-gray-400'
                          }`}
                          style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                        />
                      </div>

                      {/* Password Requirements */}
                      <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                        <div className={`flex items-center space-x-1 ${formData.password.length >= 8 ? 'text-green-600' : 'text-gray-500'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${formData.password.length >= 8 ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <span>Mín. 8 caracteres</span>
                        </div>
                        <div className={`flex items-center space-x-1 ${/[A-Z]/.test(formData.password) ? 'text-green-600' : 'text-gray-500'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${/[A-Z]/.test(formData.password) ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <span>Mayúsculas</span>
                        </div>
                        <div className={`flex items-center space-x-1 ${/[a-z]/.test(formData.password) ? 'text-green-600' : 'text-gray-500'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${/[a-z]/.test(formData.password) ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <span>Minúsculas</span>
                        </div>
                        <div className={`flex items-center space-x-1 ${/[0-9]/.test(formData.password) ? 'text-green-600' : 'text-gray-500'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${/[0-9]/.test(formData.password) ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <span>Números</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {errors.password && touchedFields.has('password') && (
                    <p className="text-sm text-red-600 mt-2 flex items-center space-x-1">
                      <AlertCircle className="w-4 h-4" />
                      <span>{errors.password}</span>
                    </p>
                  )}
                </div>

                {/* Require Password Change Option */}
                <div className="flex items-start space-x-3 p-4 bg-white rounded-lg border border-gray-200">
                  <Checkbox
                    id="requirePasswordChange"
                    checked={formData.requirePasswordChange}
                    onChange={(e) => handleFieldChange('requirePasswordChange', e.target.checked)}
                    disabled={isLoading}
                  />
                  <label htmlFor="requirePasswordChange" className="flex-1 cursor-pointer">
                    <div className="flex items-center space-x-2">
                      <Shield className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-900">
                        Solicitar cambio de contraseña en el primer inicio de sesión
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Por seguridad, el usuario deberá cambiar su contraseña la primera vez que inicie sesión
                    </p>
                  </label>
                </div>

                {/* Info Box */}
                <div className="flex items-start space-x-2 p-3 bg-blue-100 border border-blue-300 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">💡 Tip de seguridad</p>
                    <p className="mt-1">
                      Comparte estas credenciales de forma segura con el usuario.
                      Puedes copiar la contraseña usando el botón <Copy className="w-3 h-3 inline" />.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <Button
              variant="secondary"
              size="md"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              disabled={isLoading || !isFormValid()}
            >
              {isLoading ? 'Guardando...' : (user ? 'Actualizar' : 'Invitar')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};