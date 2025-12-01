// ===================================================================
// VOUCHER DESIGN CONFIGURATION - Rediseñado
// Configuración moderna y compacta con vista previa en tiempo real
// ===================================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Receipt,
  Image as ImageIcon,
  Droplet,
  FileSignature,
  FileCheck,
  Package,
  Download,
  Upload,
  RotateCcw
} from 'lucide-react';
import { useVoucherDesignConfig } from '../hooks/useVoucherDesignConfig';
import { VoucherPreview } from '../components/voucher-design/VoucherPreview';
import { LogoConfigPanel } from '../components/voucher-design/LogoConfigPanel';
import { WatermarkConfigPanel } from '../components/voucher-design/WatermarkConfigPanel';
import { FooterConfigPanel } from '../components/voucher-design/FooterConfigPanel';
import { DocumentFieldsConfigPanel } from '../components/voucher-design/DocumentFieldsConfigPanel';
import { ProductFieldsConfigPanel } from '../components/voucher-design/ProductFieldsConfigPanel';
import { NotificationProvider, useNotifications } from '../components/shared/NotificationSystem';
import type { DesignType } from '../models/VoucherDesignUnified';

type ActiveTab = 'logo' | 'watermark' | 'footer' | 'documentFields' | 'productFields' | 'general';

function VoucherDesignConfigurationContent() {
  const navigate = useNavigate();
  const [activeDesign, setActiveDesign] = useState<DesignType>('A4');
  const [activeTab, setActiveTab] = useState<ActiveTab>('logo');
  const { showSuccess, showError } = useNotifications();

  const {
    config,
    updateLogo,
    updateWatermark,
    updateFooter,
    updateDocumentFields,
    updateProductFields,
    resetToDefault,
    exportConfig,
    importConfig
  } = useVoucherDesignConfig(activeDesign);

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        await importConfig(file);
        showSuccess('Configuración importada', 'El diseño se ha cargado correctamente');
      } catch (error) {
        showError('Error al importar', error instanceof Error ? error.message : 'Archivo inválido');
      }
    }
    event.target.value = '';
  };

  const handleExport = async () => {
    try {
      await exportConfig();
      showSuccess('Configuración exportada', 'El archivo se ha descargado correctamente');
    } catch (error) {
      showError('Error al exportar', 'No se pudo exportar la configuración');
    }
  };

  const handleReset = () => {
    resetToDefault();
    showSuccess('Configuración restaurada', 'Se han restaurado los valores predeterminados');
  };

  const tabs = [
    { id: 'logo' as ActiveTab, label: 'Logo', icon: ImageIcon, color: 'blue' },
    { id: 'watermark' as ActiveTab, label: 'Marca de Agua', icon: Droplet, color: 'purple' },
    { id: 'footer' as ActiveTab, label: 'Pie de Página', icon: FileSignature, color: 'green' },
    { id: 'documentFields' as ActiveTab, label: 'Campos Doc.', icon: FileCheck, color: 'orange' },
    { id: 'productFields' as ActiveTab, label: 'Columnas', icon: Package, color: 'emerald' },
  ];

  const colorClasses = {
    blue: 'border-blue-500 bg-blue-50 text-blue-700',
    purple: 'border-purple-500 bg-purple-50 text-purple-700',
    green: 'border-green-500 bg-green-50 text-green-700',
    orange: 'border-orange-500 bg-orange-50 text-orange-700',
    emerald: 'border-emerald-500 bg-emerald-50 text-emerald-700',
    gray: 'border-gray-500 bg-gray-50 text-gray-700'
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/configuracion')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Diseño de Comprobantes
                </h1>
                <p className="text-sm text-gray-500">
                  Personaliza el aspecto de tus facturas y boletas
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
              >
                <Download className="w-4 h-4" />
                Exportar
              </button>

              <label className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer">
                <Upload className="w-4 h-4" />
                Importar
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="sr-only"
                />
              </label>

              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-50 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Restaurar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Design Type Selector */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex gap-3">
            <button
              onClick={() => setActiveDesign('A4')}
              className={`flex items-center gap-3 px-6 py-3 rounded-lg border-2 transition-all ${
                activeDesign === 'A4'
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                activeDesign === 'A4' ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
                <FileText className={`w-5 h-5 ${activeDesign === 'A4' ? 'text-blue-600' : 'text-gray-600'}`} />
              </div>
              <div className="text-left">
                <div className="font-semibold text-sm text-gray-900">Diseño A4</div>
                <div className="text-xs text-gray-500">Formato carta o A4</div>
              </div>
            </button>

            <button
              onClick={() => setActiveDesign('TICKET')}
              className={`flex items-center gap-3 px-6 py-3 rounded-lg border-2 transition-all ${
                activeDesign === 'TICKET'
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                activeDesign === 'TICKET' ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
                <Receipt className={`w-5 h-5 ${activeDesign === 'TICKET' ? 'text-blue-600' : 'text-gray-600'}`} />
              </div>
              <div className="text-left">
                <div className="font-semibold text-sm text-gray-900">Diseño Ticket</div>
                <div className="text-xs text-gray-500">58mm o 80mm</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configuration Panel */}
          <div className="space-y-4">
            {/* Tabs */}
            <div className="bg-white rounded-lg border border-gray-200 p-2">
              <div className="grid grid-cols-5 gap-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex flex-col items-center gap-2 px-3 py-3 rounded-lg border-2 transition-all ${
                        isActive
                          ? colorClasses[tab.color as keyof typeof colorClasses]
                          : 'border-transparent hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content Panel */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="max-h-[calc(100vh-400px)] overflow-y-auto pr-2">
                {activeTab === 'logo' && (
                  <LogoConfigPanel config={config.logo} onChange={updateLogo} />
                )}
                {activeTab === 'watermark' && (
                  <WatermarkConfigPanel config={config.watermark} onChange={updateWatermark} />
                )}
                {activeTab === 'footer' && (
                  <FooterConfigPanel config={config.footer} onChange={updateFooter} />
                )}
                {activeTab === 'documentFields' && (
                  <DocumentFieldsConfigPanel config={config.documentFields} onChange={updateDocumentFields} />
                )}
                {activeTab === 'productFields' && (
                  <ProductFieldsConfigPanel config={config.productFields as any} onChange={updateProductFields} />
                )}
              </div>
            </div>
          </div>

          {/* Preview Panel - Sticky */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <VoucherPreview config={config} designType={activeDesign} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function VoucherDesignConfigurationNew() {
  return (
    <NotificationProvider>
      <VoucherDesignConfigurationContent />
    </NotificationProvider>
  );
}
