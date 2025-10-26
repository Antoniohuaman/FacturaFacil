import React, { useState } from 'react';
import { useConsultasExternas } from '../hooks';
import type { ClienteFormData } from '../models';

type ClienteFormProps = {
  formData: ClienteFormData;
  documentType: string;
  clientType: string;
  documentTypes: { value: string; label: string }[];
  clientTypes: { value: string; label: string }[];
  onInputChange: (field: keyof ClienteFormData, value: string) => void;
  onDocumentTypeChange: (type: string) => void;
  onClientTypeChange: (type: string) => void;
  onCancel: () => void;
  onSave: () => void;
  isEditing?: boolean;
};

const PRIMARY_COLOR = '#1478D4';

const ClienteForm: React.FC<ClienteFormProps> = ({
  formData,
  documentType,
  clientType,
  documentTypes,
  clientTypes,
  onInputChange,
  onDocumentTypeChange,
  onClientTypeChange,
  onCancel,
  onSave,
  isEditing = false,
}) => {
  const [showMoreDocTypes, setShowMoreDocTypes] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { consultingReniec, consultingSunat, consultarReniec, consultarSunat } = useConsultasExternas();

  const mainDocTypes = documentTypes.slice(0, 3);
  const isConsulting = consultingReniec || consultingSunat;

  const handleConsultarReniec = async () => {
    if (!formData.documentNumber || formData.documentNumber.length !== 8) {
      return;
    }

    const response = await consultarReniec(formData.documentNumber);

    if (response?.success && response.data) {
      onInputChange('legalName', response.data.nombreCompleto);
    }
  };

  const handleConsultarSunat = async () => {
    if (!formData.documentNumber || formData.documentNumber.length !== 11) {
      return;
    }

    const response = await consultarSunat(formData.documentNumber);

    if (response?.success && response.data) {
      onInputChange('legalName', response.data.razonSocial);
      if (response.data.direccion) {
        onInputChange('address', response.data.direccion);
      }
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-xl w-full max-h-[80vh] h-auto min-h-[400px] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 pb-3 border-b border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {isEditing ? 'Editar cliente' : 'Nuevo cliente'}
        </h2>
        <button
          onClick={onCancel}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
        >
          <span className="h-5 w-5 text-gray-400 dark:text-gray-300">✕</span>
        </button>
      </div>

      {/* Body */}
      <div
        className="px-6 pt-3 pb-4 overflow-y-auto flex-1 min-h-0"
        style={{ maxHeight: 'calc(80vh - 140px)' }}
      >
        {/* Document Type Selector */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2 items-center">
            {mainDocTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => onDocumentTypeChange(type.value)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium mr-2 mb-2 ${
                  documentType === type.value
                    ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600 text-blue-900 dark:text-blue-300'
                    : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                {type.label}
              </button>
            ))}
            <button
              type="button"
              className={`px-4 py-2 rounded-lg border text-sm font-medium mr-2 mb-2 flex items-center ${
                !mainDocTypes.some(type => type.value === documentType) && documentTypes.some(type => type.value === documentType)
                  ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600 text-blue-900 dark:text-blue-300'
                  : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
              onClick={() => setShowMoreDocTypes((prev) => !prev)}
            >
              {!mainDocTypes.some(type => type.value === documentType) && documentTypes.some(type => type.value === documentType)
                ? documentTypes.find(type => type.value === documentType)?.label
                : 'MÁS OPCIONES'
              }
              <span className="ml-2">{showMoreDocTypes ? '▴' : '▾'}</span>
            </button>
          </div>
        </div>

        {/* Extra Document Types */}
        {showMoreDocTypes && (
          <div className="mb-4 relative">
            <div className="absolute top-0 left-0 right-0 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
              {documentTypes.slice(3).map((type) => (
                <button
                  key={type.value}
                  type="button"
                  className="w-full text-left px-4 py-3 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors text-gray-700 dark:text-gray-300"
                  onClick={() => {
                    onDocumentTypeChange(type.value);
                    setShowMoreDocTypes(false);
                  }}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Document Number */}
        {documentType !== 'SIN_DOCUMENTO' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              N° de Documento <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={formData.documentNumber}
                onChange={(e) => onInputChange('documentNumber', e.target.value)}
                maxLength={documentType === 'DNI' ? 8 : documentType === 'RUC' ? 11 : undefined}
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                placeholder={
                  documentType === 'DNI'
                    ? 'Ingresa 8 dígitos'
                    : documentType === 'RUC'
                    ? 'Ingresa 11 dígitos'
                    : 'Ingresa el número de documento'
                }
              />
              {(documentType === 'RUC' || documentType === 'DNI') && (
                <button
                  type="button"
                  onClick={documentType === 'RUC' ? handleConsultarSunat : handleConsultarReniec}
                  disabled={
                    isConsulting ||
                    !formData.documentNumber ||
                    (documentType === 'DNI' && formData.documentNumber.length !== 8) ||
                    (documentType === 'RUC' && formData.documentNumber.length !== 11)
                  }
                  className={`px-8 py-2 min-w-[100px] rounded-lg font-semibold text-sm shadow transition-colors ${
                    isConsulting ||
                    !formData.documentNumber ||
                    (documentType === 'DNI' && formData.documentNumber.length !== 8) ||
                    (documentType === 'RUC' && formData.documentNumber.length !== 11)
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'text-white hover:opacity-90'
                  }`}
                  style={!(isConsulting || !formData.documentNumber ||
                    (documentType === 'DNI' && formData.documentNumber.length !== 8) ||
                    (documentType === 'RUC' && formData.documentNumber.length !== 11))
                    ? { backgroundColor: PRIMARY_COLOR } : {}}
                >
                  {isConsulting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Consultando...
                    </div>
                  ) : (
                    documentType === 'RUC' ? 'Sunat' : 'Reniec'
                  )}
                </button>
              )}
            </div>
            {documentType === 'DNI' && formData.documentNumber && formData.documentNumber.length !== 8 && (
              <p className="text-xs text-red-500 mt-1">El DNI debe tener exactamente 8 dígitos</p>
            )}
            {documentType === 'RUC' && formData.documentNumber && formData.documentNumber.length !== 11 && (
              <p className="text-xs text-red-500 mt-1">El RUC debe tener exactamente 11 dígitos</p>
            )}
          </div>
        )}

        {/* Legal Name */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nombre legal <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.legalName}
            onChange={(e) => onInputChange('legalName', e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            placeholder="Ingresa el nombre legal"
          />
        </div>

        {/* Address */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Dirección
          </label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => onInputChange('address', e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            placeholder="Ingresa la dirección"
          />
        </div>

        {/* Client Type */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tipo
          </label>
          <select
            value={clientType}
            onChange={(e) => onClientTypeChange(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {clientTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Botón Opciones Avanzadas */}
        <div className="mb-4">
          <button
            type="button"
            className="text-blue-600 dark:text-blue-400 font-medium underline cursor-pointer text-sm"
            onClick={() => setShowAdvanced((prev) => !prev)}
          >
            {showAdvanced
              ? 'Ocultar opciones avanzadas'
              : 'Opciones avanzadas'}
          </button>
        </div>

        {/* Campos Avanzados */}
        {showAdvanced && (
          <>
            {/* Género */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Género
              </label>
              <select
                value={formData.gender}
                onChange={(e) => onInputChange('gender', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Selecciona género</option>
                <option value="Femenino">Femenino</option>
                <option value="Masculino">Masculino</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            {/* Phone */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Teléfono
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => onInputChange('phone', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="Ingresa el teléfono"
              />
            </div>

            {/* Email */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => onInputChange('email', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="Ingresa el email"
              />
            </div>

            {/* Additional Data */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Información adicional
              </label>
              <textarea
                value={formData.additionalData}
                onChange={(e) => onInputChange('additionalData', e.target.value)}
                rows={3}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="Información adicional del cliente"
              />
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-full hover:bg-gray-200 dark:hover:bg-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={onSave}
          className="px-4 py-2 text-sm font-medium text-white border rounded-full hover:opacity-90 transition-opacity"
          style={{ backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR }}
        >
          {isEditing ? 'Actualizar' : 'Guardar'}
        </button>
      </div>
    </div>
  );
};

export default ClienteForm;
