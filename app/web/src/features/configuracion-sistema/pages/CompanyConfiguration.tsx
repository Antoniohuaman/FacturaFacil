// src/features/configuration/pages/CompanyConfiguration.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Phone,
  Mail,
  CheckCircle2,
  Loader2,
  X,
  Shield,
  ArrowLeft
} from 'lucide-react';
import { useConfigurationContext } from '../context/ConfigurationContext';
import { ConfigurationCard } from '../components/common/ConfigurationCard';
import { StatusIndicator } from '../components/common/StatusIndicator';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { RucValidator } from '../components/company/RucValidator';
import { LogoUploader } from '../components/company/LogoUploader';
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
  
  const [rucValidation, setRucValidation] = useState<{
    isValid: boolean;
    message: string;
    data?: any;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showProductionModal, setShowProductionModal] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalData, setOriginalData] = useState<CompanyFormData | null>(null);

  // Load existing company data
  useEffect(() => {
    if (company) {
      const loadedData = {
        ruc: company.ruc,
        businessName: company.businessName,
        tradeName: company.tradeName || '',
        fiscalAddress: company.address,
        ubigeo: company.postalCode || '',
        baseCurrency: company.baseCurrency || 'PEN',
        environment: (company.sunatConfiguration.environment === 'TESTING' ? 'TEST' : 'PRODUCTION') as 'TEST' | 'PRODUCTION',
        phones: company.phones?.length > 0 ? company.phones : [''],
        emails: company.emails?.length > 0 ? company.emails : [''],
        footerText: company.footerText || '',
        logo: company.logo ? { url: company.logo, showInPrint: true } : undefined
      };
      setFormData(loadedData);
      setOriginalData(loadedData); // Save original for comparison
      setHasChanges(false); // Reset changes flag
    }
  }, [company]);

  // Detect if form has changes compared to original data
  useEffect(() => {
    if (!originalData) {
      setHasChanges(true); // New company, always has changes
      return;
    }

    // Deep comparison of form data vs original data
    const hasFormChanges =
      formData.ruc !== originalData.ruc ||
      formData.businessName !== originalData.businessName ||
      formData.tradeName !== originalData.tradeName ||
      formData.fiscalAddress !== originalData.fiscalAddress ||
      formData.ubigeo !== originalData.ubigeo ||
      formData.baseCurrency !== originalData.baseCurrency ||
      formData.environment !== originalData.environment ||
      formData.footerText !== originalData.footerText ||
      JSON.stringify(formData.phones) !== JSON.stringify(originalData.phones) ||
      JSON.stringify(formData.emails) !== JSON.stringify(originalData.emails) ||
      JSON.stringify(formData.logo) !== JSON.stringify(originalData.logo);

    setHasChanges(hasFormChanges);
  }, [formData, originalData]);

  // Handle RUC validation callback from RucValidator component
  const handleRucValidation = (result: { isValid: boolean; message: string; data?: any }) => {
    setRucValidation(result);

    if (result.isValid && result.data) {
      setFormData(prev => ({
        ...prev,
        businessName: result.data.businessName,
        fiscalAddress: result.data.fiscalAddress,
        ubigeo: result.data.ubigeo
      }));
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


  const handleEnvironmentChange = (environment: 'TEST' | 'PRODUCTION') => {
    // Block changing back to TEST if already in PRODUCTION
    if (environment === 'TEST' && company?.sunatConfiguration?.environment === 'PRODUCTION') {
      return; // Do nothing - this change is not allowed
    }

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
      // Filter out empty phones and emails
      const cleanPhones = formData.phones.filter(phone => phone.trim() !== '');
      const cleanEmails = formData.emails.filter(email => email.trim() !== '');

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
        phones: cleanPhones.length > 0 ? cleanPhones : [],
        emails: cleanEmails.length > 0 ? cleanEmails : [],
        website: company?.website,
        logo: formData.logo?.url || undefined,
        footerText: formData.footerText || undefined,
        economicActivity: company?.economicActivity || '',
        taxRegime: company?.taxRegime || 'GENERAL',
        baseCurrency: formData.baseCurrency,
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

  // Form validation logic
  // For new company: require RUC validation + has changes
  // For existing company: allow updates without re-validating RUC but require changes
  const isFormValid = formData.ruc.length === 11 &&
                    formData.businessName.trim() !== '' &&
                    formData.fiscalAddress.trim() !== '' &&
                    (company?.id ? true : rucValidation?.isValid === true) &&
                    hasChanges; // Only enable if there are changes

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
            {/* RUC Validator Component */}
            <RucValidator
              value={formData.ruc}
              onChange={(ruc) => setFormData(prev => ({ ...prev, ruc }))}
              onValidation={handleRucValidation}
            />

            {/* Business Name */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Razón Social <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                  className={`
                    w-full px-4 py-3 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    bg-gray-50 transition-all duration-200
                    ${formData.businessName ? 'border-green-300 bg-green-50' : 'border-gray-300'}
                  `}
                  readOnly
                  placeholder="Se completará automáticamente al validar el RUC"
                />
                {formData.businessName && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                )}
              </div>
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
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Domicilio Fiscal <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <textarea
                  value={formData.fiscalAddress}
                  onChange={(e) => setFormData(prev => ({ ...prev, fiscalAddress: e.target.value }))}
                  className={`
                    w-full px-4 py-3 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    bg-gray-50 transition-all duration-200
                    ${formData.fiscalAddress ? 'border-green-300 bg-green-50' : 'border-gray-300'}
                  `}
                  rows={3}
                  readOnly
                  placeholder="Se completará automáticamente al validar el RUC"
                />
                {formData.fiscalAddress && (
                  <div className="absolute right-3 top-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                )}
              </div>
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
                    disabled={company?.sunatConfiguration?.environment === 'PRODUCTION'}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <label htmlFor="test" className={`flex items-center space-x-2 ${company?.sunatConfiguration?.environment === 'PRODUCTION' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <span className="text-sm font-medium text-gray-700">Prueba</span>
                    {formData.environment === 'TEST' && (
                      <StatusIndicator status="warning" label="Activo" size="sm" />
                    )}
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

              {/* Warning: Test Mode */}
              {formData.environment === 'TEST' && company?.sunatConfiguration?.environment !== 'PRODUCTION' && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <Shield className="w-4 h-4 inline mr-1" />
                    Los documentos emitidos en prueba no tienen validez legal
                  </p>
                </div>
              )}

              {/* Info: Production Mode Locked */}
              {company?.sunatConfiguration?.environment === 'PRODUCTION' && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">Ambiente de Producción Activado</p>
                      <p className="text-xs mt-1">Por seguridad, no es posible regresar al ambiente de prueba una vez activado producción.</p>
                    </div>
                  </div>
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
              <LogoUploader
                logo={formData.logo}
                onLogoChange={(logo) => setFormData(prev => ({ ...prev, logo }))}
              />
            </div>
          </div>
        </ConfigurationCard>

        {/* Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          {/* Form Status Indicator */}
          <div className="flex items-center gap-3">
            {isFormValid && hasChanges && (
              <div className="flex items-center gap-2 text-green-600 animate-in slide-in-from-left duration-300">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-medium">
                  {company?.id ? 'Listo para guardar cambios' : 'Formulario completo y listo para guardar'}
                </span>
              </div>
            )}
            {company?.id && !hasChanges && (
              <div className="flex items-center gap-2 text-gray-500">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-medium">Sin cambios pendientes</span>
              </div>
            )}
            {!isFormValid && formData.ruc.length === 11 && !rucValidation?.isValid && !company?.id && (
              <div className="flex items-center gap-2 text-amber-600">
                <Shield className="w-5 h-5" />
                <span className="text-sm font-medium">Valida el RUC para continuar</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/configuracion')}
              className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={!isFormValid || isLoading}
              className={`
                px-8 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2
                ${isFormValid && !isLoading
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:scale-105'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Guardar Configuración</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Production Confirmation Modal */}
      <ConfirmationModal
        isOpen={showProductionModal}
        onClose={() => setShowProductionModal(false)}
        onConfirm={confirmProductionChange}
        title="⚠️ Cambiar a Ambiente de Producción"
        message="Esta es una acción IRREVERSIBLE. Al activar producción:

• Se eliminarán todos los documentos de prueba
• Necesitarás un Certificado Digital válido
• Los documentos tendrán validez legal ante SUNAT
• NO podrás volver al ambiente de pruebas

¿Estás seguro de continuar?"
        type="warning"
        confirmText="Sí, Activar Producción"
        cancelText="No, Mantener en Prueba"
      />
    </div>
  );
}