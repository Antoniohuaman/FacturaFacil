// ===================================================================
// DOCUMENT INFO CARD - VERSIÓN MODERNIZADA PREMIUM
// Preserva 100% la funcionalidad, mejora UX y apariencia
// ===================================================================

import React, { useMemo } from 'react';
import { FileText, ChevronDown, Calendar, Hash, DollarSign, CreditCard, User, Settings } from 'lucide-react';
import { ConfigurationCard } from './ConfigurationCard';
import { useConfigurationContext } from '../../../../configuracion-sistema/context/ConfigurationContext';
import { useFieldsConfiguration } from '../contexts/FieldsConfigurationContext';

interface DocumentInfoCardProps {
  serieSeleccionada: string;
  setSerieSeleccionada: (value: string) => void;
  seriesFiltradas: string[];
  showOptionalFields?: boolean; // Deprecated - se usa fieldsConfig internamente
  setShowOptionalFields?: (value: boolean | ((prev: boolean) => boolean)) => void; // Deprecated
  // ✅ Props adicionales para Moneda y Forma de Pago
  moneda?: string;
  setMoneda?: (value: string) => void;
  formaPago?: string;
  setFormaPago?: (value: string) => void;
  onNuevaFormaPago?: () => void;
  // ✅ Props para modal de configuración
  onOpenFieldsConfig?: () => void;
}

const DocumentInfoCard: React.FC<DocumentInfoCardProps> = ({
  serieSeleccionada,
  setSerieSeleccionada,
  seriesFiltradas,
  // showOptionalFields y setShowOptionalFields - deprecated, ahora se usa fieldsConfig
  moneda = "PEN",
  setMoneda,
  formaPago = "contado",
  setFormaPago,
  onNuevaFormaPago,
  onOpenFieldsConfig,
}) => {
  const { state } = useConfigurationContext();
  const { paymentMethods } = state;
  const { config } = useFieldsConfiguration();

  // Calcular si hay algún campo opcional visible
  const hasVisibleOptionalFields = useMemo(() => {
    return Object.values(config.optionalFields).some(field => field.visible);
  }, [config.optionalFields]);
  
  return (
    <ConfigurationCard
      title="Información del Documento"
      description="Serie, establecimiento y fechas del comprobante electrónico"
      icon={FileText}
      helpText="La serie determina el tipo de comprobante (Boleta o Factura) y está asociada a un establecimiento específico. Es asignada por SUNAT."
      actions={
        onOpenFieldsConfig && (
          <button
            className="inline-flex items-center px-3 py-1.5 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md text-sm"
            onClick={onOpenFieldsConfig}
            title="Configurar campos visibles y obligatorios"
          >
            <Settings className="w-4 h-4 mr-1.5" />
            Configuración Campos
          </button>
        )
      }
    >
      {/* Campos principales - Grid responsive */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

        {/* Serie del comprobante */}
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
            <Hash className="w-4 h-4 mr-1.5 text-blue-600" />
            Serie
            <span className="ml-1 text-red-500">*</span>
          </label>
          <div className="relative">
            {seriesFiltradas.length > 0 ? (
              <>
                <select
                  className="w-full pl-4 pr-10 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium text-gray-900 transition-all duration-200 hover:border-gray-400 bg-white appearance-none cursor-pointer"
                  value={serieSeleccionada}
                  onChange={e => setSerieSeleccionada(e.target.value)}
                >
                  {seriesFiltradas.map(serie => (
                    <option key={serie} value={serie}>{serie}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </div>
              </>
            ) : (
              <div className="w-full px-4 py-3 border-2 border-amber-300 rounded-lg bg-amber-50 text-sm font-medium text-amber-700 flex items-center">
                <span>⚠️ Selecciona un establecimiento en el header</span>
              </div>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {seriesFiltradas.length > 0 ? 'Asignada por SUNAT' : 'Las series se filtran según el establecimiento seleccionado'}
          </p>
        </div>

        {/* Fecha de emisión */}
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4 mr-1.5 text-blue-600" />
            Fecha de Emisión
            <span className="ml-1 text-red-500">*</span>
          </label>
          <input
            type="date"
            value={new Date().toISOString().split('T')[0]}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium text-gray-900 transition-all duration-200 hover:border-gray-400"
          />
          <p className="mt-1 text-xs text-gray-500">
            Fecha actual del sistema
          </p>
        </div>
      </div>

      {/* ✅ NUEVA SECCIÓN: Moneda y Forma de Pago */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-gray-200">
        {/* Moneda */}
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
            <DollarSign className="w-4 h-4 mr-1.5 text-green-600" />
            Moneda
          </label>
          <select
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium text-gray-900 transition-all duration-200 hover:border-gray-400 bg-white appearance-none cursor-pointer"
            value={moneda}
            onChange={e => setMoneda?.(e.target.value)}
          >
            <option value="PEN">Soles (PEN)</option>
            <option value="USD">Dólares (USD)</option>
          </select>
        </div>

        {/* Forma de Pago */}
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
            <CreditCard className="w-4 h-4 mr-1.5 text-purple-600" />
            Forma de Pago
          </label>
          <select
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium text-gray-900 transition-all duration-200 hover:border-gray-400 bg-white appearance-none cursor-pointer"
            value={formaPago}
            onChange={e => setFormaPago?.(e.target.value)}
          >
            {paymentMethods.length > 0 ? (
              paymentMethods
                .filter(pm => pm.isActive)
                .sort((a, b) => (a.display?.displayOrder || 999) - (b.display?.displayOrder || 999))
                .map(pm => (
                  <option key={pm.id} value={pm.id}>
                    {pm.name}
                  </option>
                ))
            ) : (
              <option value="contado">Contado (por defecto)</option>
            )}
          </select>
          {onNuevaFormaPago && (
            <button
              type="button"
              className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium hover:underline"
              onClick={onNuevaFormaPago}
            >
              + Nueva Forma de Pago
            </button>
          )}
        </div>
      </div>

      {/* ✅ NUEVA SECCIÓN: Vendedor */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
              <User className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Vendedor</p>
              <p className="text-base font-bold text-gray-900">Javier Masías Loza</p>
              <p className="text-xs text-gray-500 font-medium">ID: 001</p>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Campos opcionales - Renderizados según configuración */}
      {hasVisibleOptionalFields && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
              <h4 className="text-sm font-semibold text-gray-900">
                Información Adicional del Comprobante
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Dirección */}
              {config.optionalFields.direccion.visible && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dirección
                    {config.optionalFields.direccion.required && <span className="ml-1 text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    required={config.optionalFields.direccion.required}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white transition-all duration-200"
                    placeholder="Ingrese dirección del cliente"
                  />
                </div>
              )}

              {/* Fecha de vencimiento */}
              {config.optionalFields.fechaVencimiento.visible && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Vencimiento
                    {config.optionalFields.fechaVencimiento.required && <span className="ml-1 text-red-500">*</span>}
                  </label>
                  <input
                    type="date"
                    required={config.optionalFields.fechaVencimiento.required}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white transition-all duration-200"
                    defaultValue={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Por defecto: 30 días desde emisión
                  </p>
                </div>
              )}

              {/* Dirección de envío */}
              {config.optionalFields.direccionEnvio.visible && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dirección de Envío
                    {config.optionalFields.direccionEnvio.required && <span className="ml-1 text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    required={config.optionalFields.direccionEnvio.required}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white transition-all duration-200"
                    placeholder="Ej: Av. Principal 123, Lima"
                  />
                </div>
              )}

              {/* Orden de compra */}
              {config.optionalFields.ordenCompra.visible && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Orden de Compra
                    {config.optionalFields.ordenCompra.required && <span className="ml-1 text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    required={config.optionalFields.ordenCompra.required}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white transition-all duration-200"
                    placeholder="Ej: OC01-0000236"
                  />
                </div>
              )}

              {/* Número de guía */}
              {config.optionalFields.guiaRemision.visible && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    N° de Guía de Remisión
                    {config.optionalFields.guiaRemision.required && <span className="ml-1 text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    required={config.optionalFields.guiaRemision.required}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white transition-all duration-200"
                    placeholder="Ej: T001-00000256"
                  />
                </div>
              )}

              {/* Correo electrónico */}
              {config.optionalFields.correo.visible && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Correo Electrónico
                    {config.optionalFields.correo.required && <span className="ml-1 text-red-500">*</span>}
                  </label>
                  <input
                    type="email"
                    required={config.optionalFields.correo.required}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white transition-all duration-200"
                    placeholder="cliente@empresa.com"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Para envío automático del PDF
                  </p>
                </div>
              )}

              {/* Centro de costo */}
              {config.optionalFields.centroCosto.visible && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Centro de Costo
                    {config.optionalFields.centroCosto.required && <span className="ml-1 text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    required={config.optionalFields.centroCosto.required}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white transition-all duration-200"
                    placeholder="Ingrese centro de costos"
                  />
                </div>
              )}
            </div>

            {/* Info helper */}
            <div className="mt-4 p-3 bg-blue-100/50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-800 flex items-start">
                <FileText className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                <span>
                  Estos campos son <strong>opcionales</strong> y aparecerán en el comprobante electrónico solo si los completas.
                  Son útiles para facturación empresarial (B2B) o cuando requieres documentación detallada.
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
    </ConfigurationCard>
  );
};

export default DocumentInfoCard;
