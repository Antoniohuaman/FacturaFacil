// src/features/configuration/pages/VoucherDesignConfiguration.tsx
import { useState } from 'react';
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
  Smartphone
} from 'lucide-react';
import { ConfigurationCard } from '../components/common/ConfigurationCard';
import { SettingsToggle } from '../components/common/SettingsToggle';

type DesignType = 'A4' | 'TICKET';
type PreviewMode = 'desktop' | 'mobile';

interface DesignSettings {
  showLogo: boolean;
  showCompanyInfo: boolean;
  showFooter: boolean;
  headerColor: string;
  textColor: string;
  borderColor: string;
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: 'Arial' | 'Helvetica' | 'Times';
  showBorder: boolean;
  showWatermark: boolean;
}

export function VoucherDesignConfiguration() {
  const navigate = useNavigate();
  
  const [activeDesign, setActiveDesign] = useState<DesignType>('A4');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');
  const [a4Settings, setA4Settings] = useState<DesignSettings>({
    showLogo: true,
    showCompanyInfo: true,
    showFooter: true,
    headerColor: '#2563eb',
    textColor: '#374151',
    borderColor: '#e5e7eb',
    fontSize: 'medium',
    fontFamily: 'Arial',
    showBorder: true,
    showWatermark: false
  });
  
  const [ticketSettings, setTicketSettings] = useState<DesignSettings>({
    showLogo: true,
    showCompanyInfo: true,
    showFooter: true,
    headerColor: '#1f2937',
    textColor: '#000000',
    borderColor: '#000000',
    fontSize: 'small',
    fontFamily: 'Arial',
    showBorder: false,
    showWatermark: false
  });

  const currentSettings = activeDesign === 'A4' ? a4Settings : ticketSettings;
  const setCurrentSettings = activeDesign === 'A4' ? setA4Settings : setTicketSettings;

  const updateSetting = (key: keyof DesignSettings, value: any) => {
    setCurrentSettings(prev => ({ ...prev, [key]: value }));
  };

  const resetToDefault = () => {
    if (activeDesign === 'A4') {
      setA4Settings({
        showLogo: true,
        showCompanyInfo: true,
        showFooter: true,
        headerColor: '#2563eb',
        textColor: '#374151',
        borderColor: '#e5e7eb',
        fontSize: 'medium',
        fontFamily: 'Arial',
        showBorder: true,
        showWatermark: false
      });
    } else {
      setTicketSettings({
        showLogo: true,
        showCompanyInfo: true,
        showFooter: true,
        headerColor: '#1f2937',
        textColor: '#000000',
        borderColor: '#000000',
        fontSize: 'small',
        fontFamily: 'Arial',
        showBorder: false,
        showWatermark: false
      });
    }
  };

  const exportTemplate = () => {
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
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result as string;
        const templateData = JSON.parse(result);
        
        if (templateData.type === activeDesign) {
          setCurrentSettings(templateData.settings);
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
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Diseño de Comprobantes
          </h1>
          <p className="text-gray-600">
            Personaliza el diseño de tus facturas y boletas para A4 y tickets
          </p>
        </div>
      </div>

      {/* Design Type Selector */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Tipo de Diseño</h3>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPreviewMode('desktop')}
              className={`p-2 rounded-lg transition-colors ${
                previewMode === 'desktop' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Vista escritorio"
            >
              <Monitor className="w-5 h-5" />
            </button>
            <button
              onClick={() => setPreviewMode('mobile')}
              className={`p-2 rounded-lg transition-colors ${
                previewMode === 'mobile' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'text-gray-600 hover:bg-gray-100'
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
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
              }
            `}
          >
            <div className="flex items-center space-x-4">
              <div className={`
                w-12 h-12 rounded-lg flex items-center justify-center
                ${activeDesign === 'A4' ? 'bg-blue-100' : 'bg-gray-100'}
              `}>
                <FileText className={`w-6 h-6 ${
                  activeDesign === 'A4' ? 'text-blue-600' : 'text-gray-600'
                }`} />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Diseño A4</h4>
                <p className="text-sm text-gray-500">
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
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
              }
            `}
          >
            <div className="flex items-center space-x-4">
              <div className={`
                w-12 h-12 rounded-lg flex items-center justify-center
                ${activeDesign === 'TICKET' ? 'bg-blue-100' : 'bg-gray-100'}
              `}>
                <Receipt className={`w-6 h-6 ${
                  activeDesign === 'TICKET' ? 'text-blue-600' : 'text-gray-600'
                }`} />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Diseño Ticket</h4>
                <p className="text-sm text-gray-500">
                  Para impresoras térmicas de 58mm o 80mm
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`grid gap-8 ${previewMode === 'desktop' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Configuration Panel */}
        <div className="space-y-6">
          {/* General Settings */}
          <ConfigurationCard
            title="Configuración General"
            description="Elementos básicos del comprobante"
          >
            <div className="space-y-4">
              <SettingsToggle
                enabled={currentSettings.showLogo}
                onToggle={(enabled) => updateSetting('showLogo', enabled)}
                label="Mostrar Logo"
                description="Incluir el logo de la empresa en el comprobante"
              />
              
              <SettingsToggle
                enabled={currentSettings.showCompanyInfo}
                onToggle={(enabled) => updateSetting('showCompanyInfo', enabled)}
                label="Mostrar Información de Empresa"
                description="RUC, dirección y datos de contacto"
              />
              
              <SettingsToggle
                enabled={currentSettings.showFooter}
                onToggle={(enabled) => updateSetting('showFooter', enabled)}
                label="Mostrar Pie de Página"
                description="Texto personalizado al final del comprobante"
              />
              
              {activeDesign === 'A4' && (
                <SettingsToggle
                  enabled={currentSettings.showBorder}
                  onToggle={(enabled) => updateSetting('showBorder', enabled)}
                  label="Mostrar Bordes"
                  description="Agregar bordes decorativos al comprobante"
                />
              )}
              
              <SettingsToggle
                enabled={currentSettings.showWatermark}
                onToggle={(enabled) => updateSetting('showWatermark', enabled)}
                label="Marca de Agua"
                description="Mostrar marca de agua con el nombre de la empresa"
              />
            </div>
          </ConfigurationCard>

          {/* Typography */}
          <ConfigurationCard
            title="Tipografía"
            description="Configuración de fuentes y texto"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Familia de Fuente
                </label>
                <select
                  value={currentSettings.fontFamily}
                  onChange={(e) => updateSetting('fontFamily', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Arial">Arial</option>
                  <option value="Helvetica">Helvetica</option>
                  <option value="Times">Times New Roman</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tamaño de Fuente
                </label>
                <select
                  value={currentSettings.fontSize}
                  onChange={(e) => updateSetting('fontSize', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="small">Pequeño</option>
                  <option value="medium">Mediano</option>
                  <option value="large">Grande</option>
                </select>
              </div>
            </div>
          </ConfigurationCard>

          {/* Colors */}
          <ConfigurationCard
            title="Colores"
            description="Personaliza la paleta de colores"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color de Encabezado
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={currentSettings.headerColor}
                    onChange={(e) => updateSetting('headerColor', e.target.value)}
                    className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={currentSettings.headerColor}
                    onChange={(e) => updateSetting('headerColor', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                    placeholder="#2563eb"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color de Texto
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={currentSettings.textColor}
                    onChange={(e) => updateSetting('textColor', e.target.value)}
                    className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={currentSettings.textColor}
                    onChange={(e) => updateSetting('textColor', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                    placeholder="#374151"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color de Bordes
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={currentSettings.borderColor}
                    onChange={(e) => updateSetting('borderColor', e.target.value)}
                    className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={currentSettings.borderColor}
                    onChange={(e) => updateSetting('borderColor', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                    placeholder="#e5e7eb"
                  />
                </div>
              </div>
            </div>
          </ConfigurationCard>

          {/* Template Actions */}
          <ConfigurationCard
            title="Plantillas"
            description="Importar y exportar diseños personalizados"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={exportTemplate}
                  className="flex items-center justify-center space-x-2 px-4 py-3 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  <span>Exportar</span>
                </button>
                
                <label className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer">
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
                className="w-full px-4 py-3 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Restaurar por Defecto
              </button>
            </div>
          </ConfigurationCard>
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
                  <h4 className="font-medium text-gray-900">
                    {activeDesign === 'A4' ? 'Factura Electrónica' : 'Boleta de Venta'}
                  </h4>
                  <button className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors">
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
                    <div className="p-4 bg-gray-50">
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
                    <div className="border border-gray-200 rounded">
                      <div className="bg-gray-50 p-2 font-semibold text-sm grid grid-cols-4 gap-2">
                        <span>Descripción</span>
                        <span className="text-center">Cant.</span>
                        <span className="text-right">P.Unit</span>
                        <span className="text-right">Total</span>
                      </div>
                      
                      <div className="p-2 text-sm border-t grid grid-cols-4 gap-2">
                        <span>Producto Ejemplo</span>
                        <span className="text-center">2</span>
                        <span className="text-right">S/ 50.00</span>
                        <span className="text-right">S/ 100.00</span>
                      </div>
                      
                      <div className="p-2 text-sm border-t grid grid-cols-4 gap-2 bg-gray-50">
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
                    <div className="p-4 bg-gray-50 border-t text-center text-sm">
                      <p>Gracias por su preferencia</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Representación impresa de comprobante electrónico
                      </p>
                    </div>
                  )}
                </div>

                {/* Preview Info */}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
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
      <div className="flex items-center justify-between pt-6 border-t border-gray-200">
        <div className="text-sm text-gray-500">
          Los cambios se guardan automáticamente
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/configuracion')}
            className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          >
            Volver a Configuración
          </button>
          
          <button
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center space-x-2"
          >
            <Printer className="w-5 h-5" />
            <span>Imprimir Prueba</span>
          </button>
        </div>
      </div>
    </div>
  );
}