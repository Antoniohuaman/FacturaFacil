// src/features/configuration/pages/VoucherDesignConfiguration.tsx
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Printer,
  FileText,
  Receipt,
  Eye,
  Download,
  Upload,
  Image,
  Monitor,
  Smartphone,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { ConfigurationCard } from '../components/common/ConfigurationCard';
import { SettingsToggle } from '../components/common/SettingsToggle';
import { useConfigurationContext } from '../context/ConfigurationContext';
import type { VoucherDesign, VoucherDesignSettings } from '../models/VoucherDesign';
import type {
  VoucherDesignConfigurationExtended,
  LogoConfiguration,
  WatermarkConfiguration,
  FooterConfiguration,
  DocumentFieldsConfiguration,
  ProductFieldsConfiguration
} from '../models/VoucherDesignExtended';
import { LogoConfigPanel } from '../components/voucher-design/LogoConfigPanel';
import { WatermarkConfigPanel } from '../components/voucher-design/WatermarkConfigPanel';
import { FooterConfigPanel } from '../components/voucher-design/FooterConfigPanel';
import { DocumentFieldsConfigPanel } from '../components/voucher-design/DocumentFieldsConfigPanel';
import { ProductFieldsConfigPanel } from '../components/voucher-design/ProductFieldsConfigPanel';
import {
  DEFAULT_LOGO_CONFIG,
  DEFAULT_WATERMARK_CONFIG,
  DEFAULT_FOOTER_CONFIG,
  DEFAULT_DOCUMENT_FIELDS_CONFIG,
  DEFAULT_PRODUCT_FIELDS_CONFIG
} from '../models/VoucherDesignExtended';

type DesignType = 'A4' | 'TICKET';
type PreviewMode = 'desktop' | 'mobile';
type ConfigSection = 'logo' | 'watermark' | 'footer' | 'documentFields' | 'productFields' | 'general';

export function VoucherDesignConfiguration() {
  const navigate = useNavigate();
  const { state, dispatch } = useConfigurationContext();

  const [activeDesign, setActiveDesign] = useState<DesignType>('A4');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');
  const [expandedSections, setExpandedSections] = useState<ConfigSection[]>(['logo']);

  // Extended configuration state (stored in localStorage)
  const [extendedConfig, setExtendedConfig] = useState<VoucherDesignConfigurationExtended>(() => {
    const saved = localStorage.getItem(`voucher_design_extended_${activeDesign.toLowerCase()}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return {
          logo: DEFAULT_LOGO_CONFIG,
          watermark: DEFAULT_WATERMARK_CONFIG,
          footer: DEFAULT_FOOTER_CONFIG,
          documentFields: DEFAULT_DOCUMENT_FIELDS_CONFIG,
          productFields: DEFAULT_PRODUCT_FIELDS_CONFIG
        };
      }
    }
    return {
      logo: DEFAULT_LOGO_CONFIG,
      watermark: DEFAULT_WATERMARK_CONFIG,
      footer: DEFAULT_FOOTER_CONFIG,
      documentFields: DEFAULT_DOCUMENT_FIELDS_CONFIG,
      productFields: DEFAULT_PRODUCT_FIELDS_CONFIG
    };
  });
  
  // Get current design from context
  const currentDesign = useMemo(() => {
    return state.voucherDesigns.find(d => d.type === activeDesign && d.isDefault);
  }, [state.voucherDesigns, activeDesign]);

  const currentSettings = currentDesign?.settings;

  const updateSetting = (key: keyof VoucherDesignSettings, value: any) => {
    if (!currentDesign) return;
    
    const updatedDesign: VoucherDesign = {
      ...currentDesign,
      settings: {
        ...currentDesign.settings,
        [key]: value
      },
      updatedAt: new Date()
    };
    
    dispatch({
      type: 'UPDATE_VOUCHER_DESIGN',
      payload: updatedDesign
    });
  };

  // Save extended config to localStorage
  const saveExtendedConfig = (config: VoucherDesignConfigurationExtended) => {
    setExtendedConfig(config);
    localStorage.setItem(`voucher_design_extended_${activeDesign.toLowerCase()}`, JSON.stringify(config));
  };

  // Update handlers for extended config
  const updateLogoConfig = (logo: LogoConfiguration) => {
    saveExtendedConfig({ ...extendedConfig, logo });
  };

  const updateWatermarkConfig = (watermark: WatermarkConfiguration) => {
    saveExtendedConfig({ ...extendedConfig, watermark });
  };

  const updateFooterConfig = (footer: FooterConfiguration) => {
    saveExtendedConfig({ ...extendedConfig, footer });
  };

  const updateDocumentFieldsConfig = (documentFields: DocumentFieldsConfiguration) => {
    saveExtendedConfig({ ...extendedConfig, documentFields });
  };

  const updateProductFieldsConfig = (productFields: ProductFieldsConfiguration) => {
    saveExtendedConfig({ ...extendedConfig, productFields });
  };

  const toggleSection = (section: ConfigSection) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const resetToDefault = () => {
    if (!currentDesign) return;

    // Import default settings based on type
    const { DEFAULT_A4_DESIGN_SETTINGS, DEFAULT_TICKET_DESIGN_SETTINGS } =
      require('../models/VoucherDesign');

    const defaultSettings = activeDesign === 'A4'
      ? DEFAULT_A4_DESIGN_SETTINGS
      : DEFAULT_TICKET_DESIGN_SETTINGS;

    const updatedDesign: VoucherDesign = {
      ...currentDesign,
      settings: defaultSettings,
      updatedAt: new Date()
    };

    dispatch({
      type: 'UPDATE_VOUCHER_DESIGN',
      payload: updatedDesign
    });

    // Also reset extended config
    const defaultExtended: VoucherDesignConfigurationExtended = {
      logo: DEFAULT_LOGO_CONFIG,
      watermark: DEFAULT_WATERMARK_CONFIG,
      footer: DEFAULT_FOOTER_CONFIG,
      documentFields: DEFAULT_DOCUMENT_FIELDS_CONFIG,
      productFields: DEFAULT_PRODUCT_FIELDS_CONFIG
    };
    saveExtendedConfig(defaultExtended);
  };

  const exportTemplate = () => {
    if (!currentDesign) return;
    
    const templateData = {
      type: activeDesign,
      settings: currentSettings,
      timestamp: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(templateData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `template-${activeDesign.toLowerCase()}-${Date.now()}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  const importTemplate = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentDesign) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result as string;
        const templateData = JSON.parse(result);
        
        if (templateData.type === activeDesign) {
          const updatedDesign: VoucherDesign = {
            ...currentDesign,
            settings: templateData.settings,
            updatedAt: new Date()
          };
          
          dispatch({
            type: 'UPDATE_VOUCHER_DESIGN',
            payload: updatedDesign
          });
        } else {
          alert('El archivo no corresponde al tipo de diseño seleccionado');
        }
      } catch (error) {
        alert('Error al importar el archivo. Verifica que sea un archivo válido.');
      }
    };
    reader.readAsText(file);
    
    // Reset input
    event.target.value = '';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button 
          onClick={() => navigate('/configuracion')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Diseño de Comprobantes
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Personaliza el diseño de tus facturas y boletas para A4 y tickets
          </p>
        </div>
      </div>

      {!currentSettings ? (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200">
            No se encontró configuración de diseño. Por favor, recarga la página.
          </p>
        </div>
      ) : (
        <>
          {/* Design Type Selector */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Tipo de Diseño</h3>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPreviewMode('desktop')}
              className={`p-2 rounded-lg transition-colors ${
                previewMode === 'desktop' 
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="Vista escritorio"
            >
              <Monitor className="w-5 h-5" />
            </button>
            <button
              onClick={() => setPreviewMode('mobile')}
              className={`p-2 rounded-lg transition-colors ${
                previewMode === 'mobile' 
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="Vista móvil"
            >
              <Smartphone className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            onClick={() => setActiveDesign('A4')}
            className={`
              p-6 rounded-lg border-2 cursor-pointer transition-all
              ${activeDesign === 'A4' 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600' 
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }
            `}
          >
            <div className="flex items-center space-x-4">
              <div className={`
                w-12 h-12 rounded-lg flex items-center justify-center
                ${activeDesign === 'A4' ? 'bg-blue-100 dark:bg-blue-800/30' : 'bg-gray-100 dark:bg-gray-700'}
              `}>
                <FileText className={`w-6 h-6 ${
                  activeDesign === 'A4' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
                }`} />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">Diseño A4</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Para impresión en hojas tamaño carta o A4
                </p>
              </div>
            </div>
          </div>

          <div
            onClick={() => setActiveDesign('TICKET')}
            className={`
              p-6 rounded-lg border-2 cursor-pointer transition-all
              ${activeDesign === 'TICKET' 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600' 
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }
            `}
          >
            <div className="flex items-center space-x-4">
              <div className={`
                w-12 h-12 rounded-lg flex items-center justify-center
                ${activeDesign === 'TICKET' ? 'bg-blue-100 dark:bg-blue-800/30' : 'bg-gray-100 dark:bg-gray-700'}
              `}>
                <Receipt className={`w-6 h-6 ${
                  activeDesign === 'TICKET' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
                }`} />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">Diseño Ticket</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Para impresoras térmicas de 58mm o 80mm
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`grid gap-8 ${previewMode === 'desktop' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Configuration Panel */}
        <div className="space-y-4">
          {/* Logo Configuration */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => toggleSection('logo')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Image className="w-5 h-5 text-blue-600" />
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Configuración de Logo</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Tamaño, orientación y posición</p>
                </div>
              </div>
              {expandedSections.includes('logo') ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            {expandedSections.includes('logo') && (
              <div className="px-6 pb-6 border-t border-gray-200 dark:border-gray-700">
                <div className="pt-4">
                  <LogoConfigPanel config={extendedConfig.logo} onChange={updateLogoConfig} />
                </div>
              </div>
            )}
          </div>

          {/* Watermark Configuration */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => toggleSection('watermark')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-purple-600" />
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Marca de Agua</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Texto o imagen de fondo</p>
                </div>
              </div>
              {expandedSections.includes('watermark') ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            {expandedSections.includes('watermark') && (
              <div className="px-6 pb-6 border-t border-gray-200 dark:border-gray-700">
                <div className="pt-4">
                  <WatermarkConfigPanel config={extendedConfig.watermark} onChange={updateWatermarkConfig} />
                </div>
              </div>
            )}
          </div>

          {/* Footer Configuration */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => toggleSection('footer')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-green-600" />
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Pie de Página</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Texto personalizado al final</p>
                </div>
              </div>
              {expandedSections.includes('footer') ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            {expandedSections.includes('footer') && (
              <div className="px-6 pb-6 border-t border-gray-200 dark:border-gray-700">
                <div className="pt-4">
                  <FooterConfigPanel config={extendedConfig.footer} onChange={updateFooterConfig} />
                </div>
              </div>
            )}
          </div>

          {/* Document Fields Configuration */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => toggleSection('documentFields')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Receipt className="w-5 h-5 text-orange-600" />
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Campos del Documento</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Información adicional del comprobante</p>
                </div>
              </div>
              {expandedSections.includes('documentFields') ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            {expandedSections.includes('documentFields') && (
              <div className="px-6 pb-6 border-t border-gray-200 dark:border-gray-700">
                <div className="pt-4">
                  <DocumentFieldsConfigPanel config={extendedConfig.documentFields} onChange={updateDocumentFieldsConfig} />
                </div>
              </div>
            )}
          </div>

          {/* Product Fields Configuration */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => toggleSection('productFields')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Printer className="w-5 h-5 text-emerald-600" />
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Columnas de Productos</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Campos de la tabla de productos</p>
                </div>
              </div>
              {expandedSections.includes('productFields') ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            {expandedSections.includes('productFields') && (
              <div className="px-6 pb-6 border-t border-gray-200 dark:border-gray-700">
                <div className="pt-4">
                  <ProductFieldsConfigPanel config={extendedConfig.productFields} onChange={updateProductFieldsConfig} />
                </div>
              </div>
            )}
          </div>

          {/* General Settings (Collapsed) */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => toggleSection('general')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Monitor className="w-5 h-5 text-gray-600" />
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Configuración General</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Tipografía, colores y plantillas</p>
                </div>
              </div>
              {expandedSections.includes('general') ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            {expandedSections.includes('general') && (
              <div className="px-6 pb-6 border-t border-gray-200 dark:border-gray-700 space-y-6">
                <div className="pt-4">
                  <div className="space-y-4">
                    <SettingsToggle
                      enabled={currentSettings.showCompanyInfo}
                      onToggle={(enabled) => updateSetting('showCompanyInfo', enabled)}
                      label="Mostrar Información de Empresa"
                      description="RUC, dirección y datos de contacto"
                    />

                    {activeDesign === 'A4' && (
                      <SettingsToggle
                        enabled={currentSettings.showBorder}
                        onToggle={(enabled) => updateSetting('showBorder', enabled)}
                        label="Mostrar Bordes"
                        description="Agregar bordes decorativos al comprobante"
                      />
                    )}
                  </div>
                </div>

                {/* Typography Section */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Tipografía</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Familia de Fuente
                      </label>
                      <select
                        value={currentSettings.fontFamily}
                        onChange={(e) => updateSetting('fontFamily', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      >
                        <option value="Arial">Arial</option>
                        <option value="Helvetica">Helvetica</option>
                        <option value="Times">Times New Roman</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Tamaño de Fuente
                      </label>
                      <select
                        value={currentSettings.fontSize}
                        onChange={(e) => updateSetting('fontSize', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      >
                        <option value="small">Pequeño</option>
                        <option value="medium">Mediano</option>
                        <option value="large">Grande</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Colors Section */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Colores</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Color de Encabezado
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          value={currentSettings.headerColor}
                          onChange={(e) => updateSetting('headerColor', e.target.value)}
                          className="w-12 h-10 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer"
                        />
                        <input
                          type="text"
                          value={currentSettings.headerColor}
                          onChange={(e) => updateSetting('headerColor', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                          placeholder="#2563eb"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Color de Texto
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          value={currentSettings.textColor}
                          onChange={(e) => updateSetting('textColor', e.target.value)}
                          className="w-12 h-10 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer"
                        />
                        <input
                          type="text"
                          value={currentSettings.textColor}
                          onChange={(e) => updateSetting('textColor', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                          placeholder="#374151"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Color de Bordes
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          value={currentSettings.borderColor}
                          onChange={(e) => updateSetting('borderColor', e.target.value)}
                          className="w-12 h-10 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer"
                        />
                        <input
                          type="text"
                          value={currentSettings.borderColor}
                          onChange={(e) => updateSetting('borderColor', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                          placeholder="#e5e7eb"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Template Actions Section */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Plantillas</h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={exportTemplate}
                        className="flex items-center justify-center space-x-2 px-4 py-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                      >
                        <Download className="w-5 h-5" />
                        <span>Exportar</span>
                      </button>

                      <label className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors cursor-pointer">
                        <Upload className="w-5 h-5" />
                        <span>Importar</span>
                        <input
                          type="file"
                          accept=".json"
                          onChange={importTemplate}
                          className="sr-only"
                        />
                      </label>
                    </div>

                    <button
                      onClick={resetToDefault}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      Restaurar por Defecto
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Preview Panel */}
        {(previewMode === 'desktop' || previewMode === 'mobile') && (
          <div className="space-y-6">
            <ConfigurationCard
              title="Vista Previa"
              description={`Previsualización del diseño ${activeDesign}`}
            >
              <div className="space-y-4">
                {/* Preview Actions */}
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    {activeDesign === 'A4' ? 'Factura Electrónica' : 'Boleta de Venta'}
                  </h4>
                  <button className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                    <Eye className="w-4 h-4" />
                    <span>Vista Completa</span>
                  </button>
                </div>

                {/* Mock Preview */}
                <div 
                  className={`border rounded-lg overflow-hidden ${
                    activeDesign === 'A4' ? 'aspect-[210/297]' : 'w-full'
                  }`}
                  style={{
                    fontFamily: currentSettings.fontFamily,
                    fontSize: currentSettings.fontSize === 'small' ? '12px' : 
                             currentSettings.fontSize === 'medium' ? '14px' : '16px',
                    color: currentSettings.textColor,
                    borderColor: currentSettings.showBorder ? currentSettings.borderColor : 'transparent'
                  }}
                >
                  {/* Header */}
                  <div 
                    className="p-4 text-white"
                    style={{ backgroundColor: currentSettings.headerColor }}
                  >
                    <div className="flex items-center justify-between">
                      {currentSettings.showLogo && (
                        <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                          <Image className="w-6 h-6 text-white" />
                        </div>
                      )}
                      <div className="text-right">
                        <h1 className="text-lg font-bold">
                          {activeDesign === 'A4' ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA'}
                        </h1>
                        <p className="text-sm opacity-90">F001-00000123</p>
                      </div>
                    </div>
                  </div>

                  {/* Company Info */}
                  {currentSettings.showCompanyInfo && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800">
                      <div className="text-sm space-y-1">
                        <p className="font-semibold">MI EMPRESA S.A.C.</p>
                        <p>RUC: 20123456789</p>
                        <p>Jr. Los Ejemplos 123, Lima, Lima</p>
                        <p>Teléfono: +51 987 654 321</p>
                      </div>
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-semibold">Cliente:</p>
                        <p>Juan Pérez García</p>
                        <p>DNI: 12345678</p>
                      </div>
                      <div className="text-right">
                        <p>Fecha: 25/09/2025</p>
                        <p>Hora: 14:30</p>
                      </div>
                    </div>

                    {/* Items Table */}
                    <div className="border border-gray-200 dark:border-gray-600 rounded">
                      <div className="bg-gray-50 dark:bg-gray-700 p-2 font-semibold text-sm grid grid-cols-4 gap-2">
                        <span>Descripción</span>
                        <span className="text-center">Cant.</span>
                        <span className="text-right">P.Unit</span>
                        <span className="text-right">Total</span>
                      </div>
                      
                      <div className="p-2 text-sm border-t border-gray-200 dark:border-gray-600 grid grid-cols-4 gap-2">
                        <span>Producto Ejemplo</span>
                        <span className="text-center">2</span>
                        <span className="text-right">S/ 50.00</span>
                        <span className="text-right">S/ 100.00</span>
                      </div>
                      
                      <div className="p-2 text-sm border-t border-gray-200 dark:border-gray-600 grid grid-cols-4 gap-2 bg-gray-50 dark:bg-gray-700">
                        <span className="col-span-3 text-right font-semibold">Total:</span>
                        <span className="text-right font-bold">S/ 100.00</span>
                      </div>
                    </div>

                    {currentSettings.showWatermark && (
                      <div className="text-center text-6xl font-bold text-gray-100 opacity-10 absolute inset-0 flex items-center justify-center pointer-events-none">
                        MI EMPRESA
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  {currentSettings.showFooter && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-600 text-center text-sm">
                      <p>Gracias por su preferencia</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Representación impresa de comprobante electrónico
                      </p>
                    </div>
                  )}
                </div>

                {/* Preview Info */}
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <Eye className="w-4 h-4 inline mr-1" />
                    Esta es una vista previa aproximada. El resultado final puede variar según la impresora utilizada.
                  </p>
                </div>
              </div>
            </ConfigurationCard>
          </div>
        )}
      </div>

      {/* Save Actions */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Los cambios se guardan automáticamente
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/configuracion')}
            className="px-6 py-3 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
          >
            Volver a Configuración
          </button>
          
          <button
            className="px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 font-medium flex items-center space-x-2"
          >
            <Printer className="w-5 h-5" />
            <span>Imprimir Prueba</span>
          </button>
        </div>
      </div>
        </>
      )}
    </div>
  );
}