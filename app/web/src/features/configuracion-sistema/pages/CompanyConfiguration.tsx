// src/features/configuration/pages/CompanyConfiguration.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Phone, 
  Mail, 
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Upload,
  X,
  Shield,
  ArrowLeft
} from 'lucide-react';
import { useConfigurationContext } from '../context/ConfigurationContext';
import { ConfigurationCard } from '../components/common/ConfigurationCard';
import { SettingsToggle } from '../components/common/SettingsToggle';
import { StatusIndicator } from '../components/common/StatusIndicator';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import type { Company } from '../models/Company';

interface CompanyFormData {
  ruc: string;
  businessName: string;
  tradeName: string;
  fiscalAddress: string;
  ubigeo: string;
  baseCurrency: 'PEN' | 'USD';
  environment: 'TEST' | 'PRODUCTION';
  phones: string[];
  emails: string[];
  footerText: string;
  logo?: {
    url: string;
    showInPrint: boolean;
  };
}

export function CompanyConfiguration() {
  const navigate = useNavigate();
  const { state, dispatch } = useConfigurationContext();
  const { company } = state;
  
  const [formData, setFormData] = useState<CompanyFormData>({
    ruc: '',
    businessName: '',
    tradeName: '',
    fiscalAddress: '',
    ubigeo: '',
    baseCurrency: 'PEN',
    environment: 'TEST',
    phones: [''],
    emails: [''],
    footerText: '',
    logo: undefined
  });
  
  const [isValidatingRuc, setIsValidatingRuc] = useState(false);
  const [rucValidation, setRucValidation] = useState<{
    isValid: boolean;
    message: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showProductionModal, setShowProductionModal] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Load existing company data
  useEffect(() => {
    if (company) {
      setFormData({
        ruc: company.ruc,
        businessName: company.businessName,
        tradeName: company.tradeName || '',
        fiscalAddress: company.address,
        ubigeo: company.postalCode || '',
        baseCurrency: 'PEN',  // Default value as it's not in Company interface
        environment: company.sunatConfiguration.environment === 'TESTING' ? 'TEST' : 'PRODUCTION',
        phones: company.phone ? [company.phone] : [''],
        emails: company.email ? [company.email] : [''],
        footerText: '', // Not in Company interface, default empty
        logo: company.logo ? { url: company.logo, showInPrint: true } : undefined
      });
      
      if (company.logo) {
        setLogoPreview(company.logo);
      }
    }
  }, [company]);

  // RUC Validation
  const validateRuc = async (ruc: string) => {
    if (ruc.length !== 11) {
      setRucValidation({ isValid: false, message: 'El RUC debe tener 11 dígitos' });
      return;
    }

    setIsValidatingRuc(true);
    setRucValidation(null);

    try {
      // Simulate SUNAT API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock successful validation
      const mockSunatData = {
        ruc: ruc,
        businessName: 'EJEMPLO EMPRESA S.A.C.',
        fiscalAddress: 'JR. EJEMPLO 123, LIMA, LIMA, LIMA',
        ubigeo: '150101'
      };
      
      setFormData(prev => ({
        ...prev,
        businessName: mockSunatData.businessName,
        fiscalAddress: mockSunatData.fiscalAddress,
        ubigeo: mockSunatData.ubigeo
      }));
      
      setRucValidation({ 
        isValid: true, 
        message: 'RUC válido. Datos completados automáticamente.' 
      });
    } catch (error) {
      setRucValidation({ 
        isValid: false, 
        message: 'Error al validar RUC con SUNAT. Intenta nuevamente.' 
      });
    } finally {
      setIsValidatingRuc(false);
    }
  };

  const handleRucChange = (value: string) => {
    const numericValue = value.replace(/\D/g, '').slice(0, 11);
    setFormData(prev => ({ ...prev, ruc: numericValue }));
    setRucValidation(null);
    
    if (numericValue.length === 11) {
      validateRuc(numericValue);
    }
  };

  const handleArrayFieldChange = (
    field: 'phones' | 'emails',
    index: number,
    value: string
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const addArrayField = (field: 'phones' | 'emails') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayField = (field: 'phones' | 'emails', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        setLogoPreview(url);
        setFormData(prev => ({
          ...prev,
          logo: {
            url,
            showInPrint: prev.logo?.showInPrint ?? true
          }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoPreview(null);
    setFormData(prev => ({ ...prev, logo: undefined }));
  };

  const handleEnvironmentChange = (environment: 'TEST' | 'PRODUCTION') => {
    if (environment === 'PRODUCTION') {
      setShowProductionModal(true);
    } else {
      setFormData(prev => ({ ...prev, environment }));
    }
  };

  const confirmProductionChange = () => {
    setFormData(prev => ({ ...prev, environment: 'PRODUCTION' }));
    setShowProductionModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const updatedCompany: Company = {
        id: company?.id || '1',
        ruc: formData.ruc,
        businessName: formData.businessName,
        tradeName: formData.tradeName || undefined,
        address: formData.fiscalAddress,
        district: company?.district || '',
        province: company?.province || '',
        department: company?.department || '',
        postalCode: formData.ubigeo,
        phone: formData.phones.filter(phone => phone.trim() !== '')[0] || undefined,
        email: formData.emails.filter(email => email.trim() !== '')[0] || undefined,
        website: company?.website,
        logo: formData.logo?.url || undefined,
        economicActivity: company?.economicActivity || '',
        taxRegime: company?.taxRegime || 'GENERAL',
        legalRepresentative: company?.legalRepresentative || {
          name: '',
          documentType: 'DNI',
          documentNumber: ''
        },
        digitalCertificate: company?.digitalCertificate,
        sunatConfiguration: {
          isConfigured: company?.sunatConfiguration?.isConfigured || false,
          username: company?.sunatConfiguration?.username,
          environment: formData.environment === 'TEST' ? 'TESTING' : 'PRODUCTION',
          lastSyncDate: company?.sunatConfiguration?.lastSyncDate
        },
        createdAt: company?.createdAt || new Date(),
        updatedAt: new Date(),
        isActive: company?.isActive ?? true
      };

      dispatch({ type: 'SET_COMPANY', payload: updatedCompany });
      
      // Show success and redirect
      setTimeout(() => {
        navigate('/configuracion');
      }, 1500);
    } catch (error) {
      console.error('Error saving company:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = formData.ruc.length === 11 && 
                    formData.businessName.trim() !== '' && 
                    formData.fiscalAddress.trim() !== '' &&
                    rucValidation?.isValid === true;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button 
          onClick={() => navigate('/configuracion')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Configuración de Empresa
          </h1>
          <p className="text-gray-600">
            Configura los datos legales y tributarios de tu empresa
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Company Legal Data */}
        <ConfigurationCard
          title="Datos Legales y Tributarios"
          description="Información oficial de tu empresa registrada en SUNAT"
          helpText="Estos datos se obtienen automáticamente al validar el RUC con SUNAT"
        >
          <div className="space-y-6">
            {/* RUC */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                RUC *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.ruc}
                  onChange={(e) => handleRucChange(e.target.value)}
                  placeholder="20123456789"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={11}
                />
                {isValidatingRuc && (
                  <div className="absolute right-3 top-3">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  </div>
                )}
              </div>
              
              {rucValidation && (
                <div className={`mt-2 flex items-center space-x-2 text-sm ${
                  rucValidation.isValid ? 'text-green-600' : 'text-red-600'
                }`}>
                  {rucValidation.isValid ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                  <span>{rucValidation.message}</span>
                </div>
              )}
            </div>

            {/* Business Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Razón Social *
              </label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                readOnly
                placeholder="Se completará automáticamente al validar el RUC"
              />
            </div>

            {/* Trade Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre Comercial
              </label>
              <input
                type="text"
                value={formData.tradeName}
                onChange={(e) => setFormData(prev => ({ ...prev, tradeName: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nombre con el que se conoce tu empresa"
              />
            </div>

            {/* Fiscal Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Domicilio Fiscal *
              </label>
              <textarea
                value={formData.fiscalAddress}
                onChange={(e) => setFormData(prev => ({ ...prev, fiscalAddress: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                rows={3}
                readOnly
                placeholder="Se completará automáticamente al validar el RUC"
              />
            </div>
          </div>
        </ConfigurationCard>

        {/* Global Parameters */}
        <ConfigurationCard
          title="Parámetros Globales"
          description="Configuración que afecta todo el sistema"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Base Currency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Moneda Base *
              </label>
              <select
                value={formData.baseCurrency}
                onChange={(e) => setFormData(prev => ({ ...prev, baseCurrency: e.target.value as 'PEN' | 'USD' }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="PEN">PEN - Soles Peruanos</option>
                <option value="USD">USD - Dólares Americanos</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Impacta catálogos de productos, emisión y POS
              </p>
            </div>

            {/* Environment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ambiente
              </label>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    id="test"
                    name="environment"
                    checked={formData.environment === 'TEST'}
                    onChange={() => handleEnvironmentChange('TEST')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor="test" className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">Prueba</span>
                    <StatusIndicator status="warning" label="Activo" size="sm" />
                  </label>
                </div>
                
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    id="production"
                    name="environment"
                    checked={formData.environment === 'PRODUCTION'}
                    onChange={() => handleEnvironmentChange('PRODUCTION')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor="production" className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">Producción</span>
                    {formData.environment === 'PRODUCTION' && (
                      <StatusIndicator status="success" label="Activo" size="sm" />
                    )}
                  </label>
                </div>
              </div>
              
              {formData.environment === 'TEST' && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <Shield className="w-4 h-4 inline mr-1" />
                    Los documentos emitidos en prueba no tienen validez legal
                  </p>
                </div>
              )}
            </div>
          </div>
        </ConfigurationCard>

        {/* Contact Information */}
        <ConfigurationCard
          title="Información de Contacto"
          description="Teléfonos y correos para comunicación con clientes"
        >
          <div className="space-y-6">
            {/* Phones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Teléfonos
              </label>
              <div className="space-y-2">
                {formData.phones.map((phone, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => handleArrayFieldChange('phones', index, e.target.value)}
                        placeholder="+51 987 654 321"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    {formData.phones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayField('phones', index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={() => addArrayField('phones')}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  + Agregar teléfono
                </button>
              </div>
            </div>

            {/* Emails */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Correos Electrónicos
              </label>
              <div className="space-y-2">
                {formData.emails.map((email, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => handleArrayFieldChange('emails', index, e.target.value)}
                        placeholder="contacto@miempresa.com"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    {formData.emails.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayField('emails', index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={() => addArrayField('emails')}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  + Agregar correo
                </button>
              </div>
            </div>
          </div>
        </ConfigurationCard>

        {/* Personalization */}
        <ConfigurationCard
          title="Personalización"
          description="Logo y textos personalizados para tus comprobantes"
        >
          <div className="space-y-6">
            {/* Footer Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pie de Página para Comprobantes
              </label>
              <textarea
                value={formData.footerText}
                onChange={(e) => setFormData(prev => ({ ...prev, footerText: e.target.value }))}
                placeholder="Gracias por su preferencia"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                maxLength={200}
              />
              <p className="text-xs text-gray-500 mt-1">
                Máximo 200 caracteres
              </p>
            </div>

            {/* Logo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Logo de la Empresa
              </label>
              
              {logoPreview ? (
                <div className="space-y-4">
                  <div className="relative inline-block">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-32 h-32 object-contain border border-gray-300 rounded-lg bg-white p-2"
                    />
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <SettingsToggle
                      enabled={formData.logo?.showInPrint ?? true}
                      onToggle={(enabled) => setFormData(prev => ({
                        ...prev,
                        logo: prev.logo ? { ...prev.logo, showInPrint: enabled } : { url: logoPreview!, showInPrint: enabled }
                      }))}
                      label="Mostrar en impresión"
                    />
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <label htmlFor="logo-upload" className="cursor-pointer">
                        <span className="mt-2 block text-sm font-medium text-gray-900">
                          Subir logo
                        </span>
                        <span className="mt-1 block text-sm text-gray-500">
                          PNG o JPG hasta 2MB
                        </span>
                      </label>
                      <input
                        id="logo-upload"
                        type="file"
                        accept=".png,.jpg,.jpeg"
                        onChange={handleLogoUpload}
                        className="sr-only"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ConfigurationCard>

        {/* Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/configuracion')}
            className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          >
            Cancelar
          </button>
          
          <button
            type="submit"
            disabled={!isFormValid || isLoading}
            className="px-6 py-3 text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center space-x-2"
            style={isFormValid && !isLoading ? { backgroundColor: '#1478D4' } : {}}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <span>Guardar Configuración</span>
            )}
          </button>
        </div>
      </form>

      {/* Production Confirmation Modal */}
      <ConfirmationModal
        isOpen={showProductionModal}
        onClose={() => setShowProductionModal(false)}
        onConfirm={confirmProductionChange}
        title="Cambiar a Ambiente de Producción"
        message="Al cambiar a producción, se eliminarán permanentemente todos los documentos de prueba y necesitarás un Certificado Digital. Esta acción no se puede deshacer."
        type="warning"
        confirmText="Cambiar a Producción"
        cancelText="Mantener en Prueba"
      />
    </div>
  );
}