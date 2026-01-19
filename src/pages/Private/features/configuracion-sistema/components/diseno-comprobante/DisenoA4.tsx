/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
import { useState, useEffect } from 'react';
import { Palette, Image, Type, AlignLeft, AlignRight, Eye } from 'lucide-react';

interface A4DesignProps {
  onDesignChange: (design: A4VoucherDesign) => void;
  initialDesign?: A4VoucherDesign;
}

export interface A4VoucherDesign {
  id: string;
  name: string;
  
  // Page settings
  pageSettings: {
    marginTop: number;
    marginBottom: number;
    marginLeft: number;
    marginRight: number;
    backgroundColor: string;
    watermark?: {
      enabled: boolean;
      text: string;
      opacity: number;
      color: string;
      fontSize: number;
      rotation: number;
    };
  };
  
  // Header section
  header: {
    enabled: boolean;
    height: number;
    backgroundColor: string;
    
    // Company logo
    logo: {
      enabled: boolean;
      position: 'left' | 'center' | 'right';
      width: number;
      height: number;
      url?: string;
    };
    
    // Company info
    companyInfo: {
      enabled: boolean;
      position: 'left' | 'center' | 'right';
      fontSize: number;
      fontWeight: 'normal' | 'bold';
      color: string;
      alignment: 'left' | 'center' | 'right';
      showBusinessName: boolean;
      showAddress: boolean;
      showPhone: boolean;
      showEmail: boolean;
      showRuc: boolean;
    };
    
    // Document info
    documentInfo: {
      enabled: boolean;
      position: 'left' | 'center' | 'right';
      fontSize: number;
      fontWeight: 'normal' | 'bold';
      color: string;
      backgroundColor: string;
      borderColor: string;
      borderWidth: number;
      padding: number;
    };
  };
  
  // Customer section
  customer: {
    enabled: boolean;
    title: string;
    fontSize: number;
    fontWeight: 'normal' | 'bold';
    color: string;
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
    padding: number;
    showDocumentType: boolean;
    showDocumentNumber: boolean;
    showName: boolean;
    showAddress: boolean;
    showPhone: boolean;
    showEmail: boolean;
  };
  
  // Items table
  itemsTable: {
    enabled: boolean;
    
    // Header
    headerBackgroundColor: string;
    headerTextColor: string;
    headerFontSize: number;
    headerFontWeight: 'normal' | 'bold';
    headerBorderColor: string;
    headerBorderWidth: number;
    
    // Rows
    rowBackgroundColor: string;
    rowAlternateBackgroundColor: string;
    rowTextColor: string;
    rowFontSize: number;
    rowBorderColor: string;
    rowBorderWidth: number;
    rowPadding: number;
    
    // Columns
    columns: {
      item: { enabled: boolean; width: number; title: string; };
      quantity: { enabled: boolean; width: number; title: string; };
      unitPrice: { enabled: boolean; width: number; title: string; };
      discount: { enabled: boolean; width: number; title: string; };
      total: { enabled: boolean; width: number; title: string; };
      code: { enabled: boolean; width: number; title: string; };
      unit: { enabled: boolean; width: number; title: string; };
    };
  };
  
  // Totals section
  totals: {
    enabled: boolean;
    position: 'left' | 'center' | 'right';
    width: number;
    fontSize: number;
    fontWeight: 'normal' | 'bold';
    color: string;
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
    padding: number;
    
    showSubtotal: boolean;
    showDiscount: boolean;
    showTax: boolean;
    showTotal: boolean;
    showTotalInWords: boolean;
  };
  
  // Footer section
  footer: {
    enabled: boolean;
    height: number;
    backgroundColor: string;
    
    // Payment info
    paymentInfo: {
      enabled: boolean;
      title: string;
      fontSize: number;
      color: string;
      showPaymentMethod: boolean;
      showAmount: boolean;
      showReference: boolean;
    };
    
    // Additional notes
    notes: {
      enabled: boolean;
      title: string;
      fontSize: number;
      color: string;
      defaultText: string;
    };
    
    // QR Code
    qrCode: {
      enabled: boolean;
      position: 'left' | 'center' | 'right';
      size: number;
    };
    
    // Signatures
    signatures: {
      enabled: boolean;
      showCustomerSignature: boolean;
      showCompanySignature: boolean;
      fontSize: number;
      color: string;
    };
  };
}

const DISENO_A4_BASE: A4VoucherDesign = {
  id: 'default-a4',
  name: 'Diseño A4 Estándar',
  
  pageSettings: {
    marginTop: 20,
    marginBottom: 20,
    marginLeft: 20,
    marginRight: 20,
    backgroundColor: '#ffffff',
    watermark: {
      enabled: false,
      text: 'COPIA',
      opacity: 0.1,
      color: '#000000',
      fontSize: 48,
      rotation: -45,
    },
  },
  
  header: {
    enabled: true,
    height: 120,
    backgroundColor: '#ffffff',
    
    logo: {
      enabled: true,
      position: 'left',
      width: 80,
      height: 80,
    },
    
    companyInfo: {
      enabled: true,
      position: 'center',
      fontSize: 12,
      fontWeight: 'normal',
      color: '#000000',
      alignment: 'center',
      showBusinessName: true,
      showAddress: true,
      showPhone: true,
      showEmail: true,
      showRuc: true,
    },
    
    documentInfo: {
      enabled: true,
      position: 'right',
      fontSize: 14,
      fontWeight: 'bold',
      color: '#000000',
      backgroundColor: '#f8f9fa',
      borderColor: '#dee2e6',
      borderWidth: 1,
      padding: 10,
    },
  },
  
  customer: {
    enabled: true,
    title: 'DATOS DEL CLIENTE',
    fontSize: 11,
    fontWeight: 'normal',
    color: '#000000',
    backgroundColor: '#f8f9fa',
    borderColor: '#dee2e6',
    borderWidth: 1,
    padding: 8,
    showDocumentType: true,
    showDocumentNumber: true,
    showName: true,
    showAddress: true,
    showPhone: false,
    showEmail: false,
  },
  
  itemsTable: {
    enabled: true,
    
    headerBackgroundColor: '#343a40',
    headerTextColor: '#ffffff',
    headerFontSize: 11,
    headerFontWeight: 'bold',
    headerBorderColor: '#dee2e6',
    headerBorderWidth: 1,
    
    rowBackgroundColor: '#ffffff',
    rowAlternateBackgroundColor: '#f8f9fa',
    rowTextColor: '#000000',
    rowFontSize: 10,
    rowBorderColor: '#dee2e6',
    rowBorderWidth: 1,
    rowPadding: 6,
    
    columns: {
      item: { enabled: true, width: 40, title: 'DESCRIPCIÓN' },
      quantity: { enabled: true, width: 10, title: 'CANT.' },
      unitPrice: { enabled: true, width: 15, title: 'P. UNIT.' },
      discount: { enabled: false, width: 10, title: 'DESC.' },
      total: { enabled: true, width: 15, title: 'TOTAL' },
      code: { enabled: false, width: 10, title: 'CÓDIGO' },
      unit: { enabled: false, width: 10, title: 'UNIDAD' },
    },
  },
  
  totals: {
    enabled: true,
    position: 'right',
    width: 300,
    fontSize: 11,
    fontWeight: 'normal',
    color: '#000000',
    backgroundColor: '#ffffff',
    borderColor: '#dee2e6',
    borderWidth: 1,
    padding: 8,
    
    showSubtotal: true,
    showDiscount: false,
    showTax: true,
    showTotal: true,
    showTotalInWords: true,
  },
  
  footer: {
    enabled: true,
    height: 100,
    backgroundColor: '#ffffff',
    
    paymentInfo: {
      enabled: true,
      title: 'INFORMACIÓN DE PAGO',
      fontSize: 10,
      color: '#000000',
      showPaymentMethod: true,
      showAmount: true,
      showReference: false,
    },
    
    notes: {
      enabled: true,
      title: 'OBSERVACIONES',
      fontSize: 9,
      color: '#666666',
      defaultText: 'Gracias por su preferencia',
    },
    
    qrCode: {
      enabled: true,
      position: 'right',
      size: 80,
    },
    
    signatures: {
      enabled: false,
      showCustomerSignature: true,
      showCompanySignature: true,
      fontSize: 9,
      color: '#000000',
    },
  },
};

export default function A4Design({ onDesignChange, initialDesign }: A4DesignProps) {
  const [design, setDesign] = useState<A4VoucherDesign>(initialDesign || DISENO_A4_BASE);
  const [activeSection, setActiveSection] = useState<string>('page');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    onDesignChange(design);
  }, [design, onDesignChange]);

  const updateDesign = (path: string, value: any) => {
    setDesign(prev => {
      const newDesign = { ...prev };
      const keys = path.split('.');
      let current = newDesign as any;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newDesign;
    });
  };

  const sections = [
    { id: 'page', label: 'Página', icon: Palette },
    { id: 'header', label: 'Encabezado', icon: AlignLeft },
    { id: 'customer', label: 'Cliente', icon: AlignLeft },
    { id: 'items', label: 'Productos', icon: AlignLeft },
    { id: 'totals', label: 'Totales', icon: AlignRight },
    { id: 'footer', label: 'Pie de Página', icon: AlignLeft },
  ];

  const renderPageSettings = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Configuración de Página</h3>
      
      {/* Margins */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Márgenes (mm)
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Superior</label>
            <input
              type="number"
              value={design.pageSettings.marginTop}
              onChange={(e) => updateDesign('pageSettings.marginTop', parseInt(e.target.value))}
              className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Inferior</label>
            <input
              type="number"
              value={design.pageSettings.marginBottom}
              onChange={(e) => updateDesign('pageSettings.marginBottom', parseInt(e.target.value))}
              className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Izquierdo</label>
            <input
              type="number"
              value={design.pageSettings.marginLeft}
              onChange={(e) => updateDesign('pageSettings.marginLeft', parseInt(e.target.value))}
              className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Derecho</label>
            <input
              type="number"
              value={design.pageSettings.marginRight}
              onChange={(e) => updateDesign('pageSettings.marginRight', parseInt(e.target.value))}
              className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Background Color */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Color de Fondo
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={design.pageSettings.backgroundColor}
            onChange={(e) => updateDesign('pageSettings.backgroundColor', e.target.value)}
            className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
          />
          <input
            type="text"
            value={design.pageSettings.backgroundColor}
            onChange={(e) => updateDesign('pageSettings.backgroundColor', e.target.value)}
            className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Watermark */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-700">Marca de Agua</label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={design.pageSettings.watermark?.enabled || false}
              onChange={(e) => updateDesign('pageSettings.watermark.enabled', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">Activar</span>
          </label>
        </div>
        
        {design.pageSettings.watermark?.enabled && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Texto</label>
              <input
                type="text"
                value={design.pageSettings.watermark.text}
                onChange={(e) => updateDesign('pageSettings.watermark.text', e.target.value)}
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Opacidad</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={design.pageSettings.watermark.opacity}
                  onChange={(e) => updateDesign('pageSettings.watermark.opacity', parseFloat(e.target.value))}
                  className="w-full"
                />
                <span className="text-xs text-gray-500">{Math.round(design.pageSettings.watermark.opacity * 100)}%</span>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Rotación</label>
                <input
                  type="range"
                  min="-90"
                  max="90"
                  value={design.pageSettings.watermark.rotation}
                  onChange={(e) => updateDesign('pageSettings.watermark.rotation', parseInt(e.target.value))}
                  className="w-full"
                />
                <span className="text-xs text-gray-500">{design.pageSettings.watermark.rotation}°</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderHeaderSettings = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Encabezado</h3>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={design.header.enabled}
            onChange={(e) => updateDesign('header.enabled', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600">Activar</span>
        </label>
      </div>

      {design.header.enabled && (
        <>
          {/* Height */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Altura (px)
            </label>
            <input
              type="number"
              value={design.header.height}
              onChange={(e) => updateDesign('header.height', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Background Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color de Fondo
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={design.header.backgroundColor}
                onChange={(e) => updateDesign('header.backgroundColor', e.target.value)}
                className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={design.header.backgroundColor}
                onChange={(e) => updateDesign('header.backgroundColor', e.target.value)}
                className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Logo Settings */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">Logo de la Empresa</label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={design.header.logo.enabled}
                  onChange={(e) => updateDesign('header.logo.enabled', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">Mostrar</span>
              </label>
            </div>
            
            {design.header.logo.enabled && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Posición</label>
                  <select
                    value={design.header.logo.position}
                    onChange={(e) => updateDesign('header.logo.position', e.target.value)}
                    className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="left">Izquierda</option>
                    <option value="center">Centro</option>
                    <option value="right">Derecha</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Ancho (px)</label>
                    <input
                      type="number"
                      value={design.header.logo.width}
                      onChange={(e) => updateDesign('header.logo.width', parseInt(e.target.value))}
                      className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Alto (px)</label>
                    <input
                      type="number"
                      value={design.header.logo.height}
                      onChange={(e) => updateDesign('header.logo.height', parseInt(e.target.value))}
                      className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Company Info Settings */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">Información de la Empresa</label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={design.header.companyInfo.enabled}
                  onChange={(e) => updateDesign('header.companyInfo.enabled', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">Mostrar</span>
              </label>
            </div>
            
            {design.header.companyInfo.enabled && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Posición</label>
                    <select
                      value={design.header.companyInfo.position}
                      onChange={(e) => updateDesign('header.companyInfo.position', e.target.value)}
                      className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="left">Izquierda</option>
                      <option value="center">Centro</option>
                      <option value="right">Derecha</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Alineación</label>
                    <select
                      value={design.header.companyInfo.alignment}
                      onChange={(e) => updateDesign('header.companyInfo.alignment', e.target.value)}
                      className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="left">Izquierda</option>
                      <option value="center">Centro</option>
                      <option value="right">Derecha</option>
                    </select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-xs text-gray-500">Datos a mostrar:</label>
                  <div className="space-y-1">
                    {[
                      { key: 'showBusinessName', label: 'Razón Social' },
                      { key: 'showAddress', label: 'Dirección' },
                      { key: 'showPhone', label: 'Teléfono' },
                      { key: 'showEmail', label: 'Email' },
                      { key: 'showRuc', label: 'RUC' },
                    ].map(item => (
                      <label key={item.key} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={design.header.companyInfo[item.key as keyof typeof design.header.companyInfo] as boolean}
                          onChange={(e) => updateDesign(`header.companyInfo.${item.key}`, e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-xs text-gray-600">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Diseño A4</h2>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              <Eye className="h-4 w-4" />
              {showPreview ? 'Ocultar' : 'Vista Previa'}
            </button>
          </div>

          {/* Section Tabs */}
          <div className="space-y-1 mb-6">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                    activeSection === section.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {section.label}
                </button>
              );
            })}
          </div>

          {/* Section Content */}
          <div>
            {activeSection === 'page' && renderPageSettings()}
            {activeSection === 'header' && renderHeaderSettings()}
            {/* Add other sections here */}
          </div>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 bg-gray-100 p-6">
        {showPreview ? (
          <div className="bg-white shadow-lg mx-auto" style={{ width: '210mm', minHeight: '297mm' }}>
            <div 
              className="p-4"
              style={{ 
                margin: `${design.pageSettings.marginTop}mm ${design.pageSettings.marginRight}mm ${design.pageSettings.marginBottom}mm ${design.pageSettings.marginLeft}mm`,
                backgroundColor: design.pageSettings.backgroundColor 
              }}
            >
              {/* Header Preview */}
              {design.header.enabled && (
                <div 
                  className="mb-6 flex items-start justify-between"
                  style={{ 
                    height: `${design.header.height}px`,
                    backgroundColor: design.header.backgroundColor 
                  }}
                >
                  {/* Logo */}
                  {design.header.logo.enabled && (
                    <div className={`flex ${design.header.logo.position === 'center' ? 'justify-center' : design.header.logo.position === 'right' ? 'justify-end' : 'justify-start'}`}>
                      <div 
                        className="bg-gray-200 border-2 border-dashed border-gray-400 flex items-center justify-center"
                        style={{ 
                          width: `${design.header.logo.width}px`,
                          height: `${design.header.logo.height}px` 
                        }}
                      >
                        <Image className="h-6 w-6 text-gray-400" />
                      </div>
                    </div>
                  )}

                  {/* Company Info */}
                  {design.header.companyInfo.enabled && (
                    <div className={`text-${design.header.companyInfo.alignment}`}>
                      <div 
                        style={{ 
                          fontSize: `${design.header.companyInfo.fontSize}px`,
                          fontWeight: design.header.companyInfo.fontWeight,
                          color: design.header.companyInfo.color 
                        }}
                      >
                        {design.header.companyInfo.showBusinessName && <div className="font-bold">EMPRESA DEMO S.A.C.</div>}
                        {design.header.companyInfo.showRuc && <div>RUC: 20123456789</div>}
                        {design.header.companyInfo.showAddress && <div>Av. Demo 123, Lima, Perú</div>}
                        {design.header.companyInfo.showPhone && <div>Tel: (01) 123-4567</div>}
                        {design.header.companyInfo.showEmail && <div>info@empresademo.com</div>}
                      </div>
                    </div>
                  )}

                  {/* Document Info */}
                  {design.header.documentInfo.enabled && (
                    <div 
                      className="p-2 border"
                      style={{ 
                        fontSize: `${design.header.documentInfo.fontSize}px`,
                        fontWeight: design.header.documentInfo.fontWeight,
                        color: design.header.documentInfo.color,
                        backgroundColor: design.header.documentInfo.backgroundColor,
                        borderColor: design.header.documentInfo.borderColor,
                        borderWidth: `${design.header.documentInfo.borderWidth}px`,
                        padding: `${design.header.documentInfo.padding}px` 
                      }}
                    >
                      <div className="text-center">
                        <div>FACTURA ELECTRÓNICA</div>
                        <div>F001-00000123</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <div className="text-center text-gray-500 mt-20">
                <Type className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Vista previa del comprobante</p>
                <p className="text-sm">Configure las opciones en el panel lateral</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <Eye className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Haga clic en "Vista Previa" para ver el diseño</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}