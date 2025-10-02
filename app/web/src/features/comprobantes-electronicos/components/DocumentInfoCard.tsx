// ===================================================================
// DOCUMENT INFO CARD - VERSIÓN MODERNIZADA PREMIUM
// Preserva 100% la funcionalidad, mejora UX y apariencia
// ===================================================================

import React from 'react';
import { FileText, ChevronDown, ChevronUp, Calendar, Building2, Hash } from 'lucide-react';
import { ConfigurationCard } from './shared/ConfigurationCard';

interface DocumentInfoCardProps {
  serieSeleccionada: string;
  setSerieSeleccionada: (value: string) => void;
  seriesFiltradas: string[];
  showOptionalFields: boolean;
  setShowOptionalFields: (value: boolean | ((prev: boolean) => boolean)) => void;
}

const DocumentInfoCard: React.FC<DocumentInfoCardProps> = ({
  serieSeleccionada,
  setSerieSeleccionada,
  seriesFiltradas,
  showOptionalFields,
  setShowOptionalFields,
}) => {
  return (
    <ConfigurationCard
      title="Información del Documento"
      description="Serie, establecimiento y fechas del comprobante electrónico"
      icon={FileText}
      helpText="La serie determina el tipo de comprobante (Boleta o Factura) y está asociada a un establecimiento específico. Es asignada por SUNAT."
    >
      {/* Campos principales - Grid responsive */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

        {/* Serie del comprobante */}
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
            <Hash className="w-4 h-4 mr-1.5 text-blue-600" />
            Serie
            <span className="ml-1 text-red-500">*</span>
          </label>
          <div className="relative">
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
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Asignada por SUNAT
          </p>
        </div>

        {/* Establecimiento */}
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
            <Building2 className="w-4 h-4 mr-1.5 text-blue-600" />
            Establecimiento
          </label>
          <div className="relative">
            <input
              type="text"
              value="Gamarra 2"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 cursor-not-allowed"
              readOnly
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Según serie seleccionada
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

      {/* Botón toggle de campos opcionales - Mejorado */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span className="font-medium">Campos opcionales</span>
          {showOptionalFields && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              7 campos adicionales
            </span>
          )}
        </div>

        <button
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
          onClick={() => setShowOptionalFields(v => !v)}
        >
          {showOptionalFields ? (
            <>
              <ChevronUp className="w-4 h-4 mr-2" />
              Ocultar campos
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-2" />
              Mostrar más campos
            </>
          )}
        </button>
      </div>

      {/* Campos opcionales - Con transición suave */}
      {showOptionalFields && (
        <div className="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
            <h4 className="text-sm font-semibold text-gray-900">
              Información Adicional del Comprobante
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Dirección */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dirección
              </label>
              <input
                type="text"
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white transition-all duration-200"
                placeholder="Ingrese dirección del cliente"
              />
            </div>

            {/* Fecha de vencimiento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Vencimiento
              </label>
              <input
                type="date"
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white transition-all duration-200"
                value={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
              />
              <p className="mt-1 text-xs text-gray-500">
                Por defecto: 30 días desde emisión
              </p>
            </div>

            {/* Dirección de envío */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dirección de Envío
              </label>
              <input
                type="text"
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white transition-all duration-200"
                placeholder="Ej: Av. Principal 123, Lima"
              />
            </div>

            {/* Orden de compra */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Orden de Compra
              </label>
              <input
                type="text"
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white transition-all duration-200"
                placeholder="Ej: OC01-0000236"
              />
            </div>

            {/* Número de guía */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                N° de Guía de Remisión
              </label>
              <input
                type="text"
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white transition-all duration-200"
                placeholder="Ej: T001-00000256"
              />
            </div>

            {/* Correo electrónico */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Correo Electrónico
              </label>
              <input
                type="email"
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white transition-all duration-200"
                placeholder="cliente@empresa.com"
              />
              <p className="mt-1 text-xs text-gray-500">
                Para envío automático del PDF
              </p>
            </div>

            {/* Centro de costo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Centro de Costo
              </label>
              <input
                type="text"
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white transition-all duration-200"
                placeholder="Ingrese centro de costos"
              />
            </div>
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
      )}
    </ConfigurationCard>
  );
};

export default DocumentInfoCard;
