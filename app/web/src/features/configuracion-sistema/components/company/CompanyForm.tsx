// src/features/configuration/components/company/CompanyForm.tsx
import { useState, useEffect } from 'react';
import { Phone, Mail, X, Shield } from 'lucide-react';
import type { Company } from '../../models/Company';
import { RucValidator } from './RucValidator';
import { LogoUploader } from './LogoUploader';
import { ConfigurationCard } from '../common/ConfigurationCard';
import { StatusIndicator } from '../common/StatusIndicator';
import { ConfirmationModal } from '../common/ConfirmationModal';

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

interface CompanyFormProps {
  company?: Company;
  onSubmit: (data: CompanyFormData) => Promise<void>;
  isLoading?: boolean;
}

export function CompanyForm({ company, onSubmit, isLoading = false }: CompanyFormProps) {
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
  
  const [showProductionModal, setShowProductionModal] = useState(false);
  const [rucValidation, setRucValidation] = useState<{
    isValid: boolean;
    message: string;
  } | null>(null);

  // Load existing company data
  useEffect(() => {
    if (company) {
      setFormData({
        ruc: company.ruc,
        businessName: company.businessName,
        tradeName: company.tradeName || '',
        fiscalAddress: company.address, // Mapear a address que sí existe
        ubigeo: `${company.department}-${company.province}-${company.district}`, // Construir ubigeo desde campos existentes
        baseCurrency: 'PEN', // Valor por defecto ya que no existe en interface
        environment: company.sunatConfiguration.environment === 'TESTING' ? 'TEST' : 'PRODUCTION', // Mapear desde sunatConfiguration
        phones: company.phone ? [company.phone] : [''], // Convertir phone string a array
        emails: company.email ? [company.email] : [''], // Convertir email string a array
        footerText: '', // Valor por defecto ya que no existe en interface
        logo: company.logo ? { url: company.logo, showInPrint: true } : undefined // Convertir string a objeto
      });
    }
  }, [company]);

  const handleRucValidation = (validation: { isValid: boolean; message: string; data?: any }) => {
    setRucValidation(validation);
    
    if (validation.isValid && validation.data) {
      setFormData(prev => ({
        ...prev,
        businessName: validation.data.businessName,
        fiscalAddress: validation.data.fiscalAddress,
        ubigeo: validation.data.ubigeo
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
    await onSubmit(formData);
  };

  const isFormValid = formData.ruc.length === 11 && 
                    formData.businessName.trim() !== '' && 
                    formData.fiscalAddress.trim() !== '' &&
                    rucValidation?.isValid === true;

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Company Legal Data */}
        <ConfigurationCard
          title="Datos Legales y Tributarios"
          description="Información oficial de tu empresa registrada en SUNAT"
          helpText="Estos datos se obtienen automáticamente al validar el RUC con SUNAT"
        >
          <div className="space-y-6">
            {/* RUC Validator */}
            <RucValidator
              value={formData.ruc}
              onChange={(ruc) => setFormData(prev => ({ ...prev, ruc }))}
              onValidation={handleRucValidation}
            />

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
                    <StatusIndicator status="warning" label="Activo" size="xs" />
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
                      <StatusIndicator status="success" label="Activo" size="xs" />
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
              <LogoUploader
                logo={formData.logo}
                onLogoChange={(logo) => setFormData(prev => ({ ...prev, logo }))}
              />
            </div>
          </div>
        </ConfigurationCard>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
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
    </>
  );
}