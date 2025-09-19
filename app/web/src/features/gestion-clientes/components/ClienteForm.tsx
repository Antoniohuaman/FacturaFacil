import React, { useState } from 'react';

type DocumentType = {
  value: string;
  label: string;
};

type ClientType = {
  value: string;
  label: string;
};

type ClienteFormData = {
  documentNumber: string;
  legalName: string;
  address: string;
  gender: string;
  phone: string;
  email: string;
  additionalData: string;
};

type ClienteFormProps = {
  formData: ClienteFormData;
  documentType: string;
  clientType: string;
  documentTypes: DocumentType[];
  clientTypes: ClientType[];
  onInputChange: (field: keyof ClienteFormData, value: string) => void;
  onDocumentTypeChange: (type: string) => void;
  onClientTypeChange: (type: string) => void;
  onCancel: () => void;
  onSave: () => void;
};

const PRIMARY_COLOR = '#0040A2';

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
}) => {
  const [showMoreDocTypes, setShowMoreDocTypes] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const mainDocTypes = documentTypes.slice(0, 3);

  return (
    <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[80vh] h-auto min-h-[400px] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 pb-3 border-b border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900">Nuevo cliente</h2>
        <button
          onClick={onCancel}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <span className="h-5 w-5 text-gray-400">✕</span>
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
                    ? 'bg-blue-100 border-blue-400 text-blue-900'
                    : 'bg-white border-gray-300 text-gray-700'
                }`}
              >
                {type.label}
              </button>
            ))}
            <button
              type="button"
              className="px-4 py-2 rounded-lg border text-sm font-medium mr-2 mb-2 bg-white border-gray-300 text-gray-700 flex items-center"
              onClick={() => setShowMoreDocTypes((prev) => !prev)}
            >
              MÁS OPCIONES
              <span className="ml-2">{showMoreDocTypes ? '▴' : '▾'}</span>
            </button>
          </div>
        </div>

        {/* Extra Document Types */}
        {showMoreDocTypes && (
          <div className="mb-4">
            {documentTypes.slice(3).map((type) => (
              <button
                key={type.value}
                type="button"
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                onClick={() => {
                  onDocumentTypeChange(type.value);
                  setShowMoreDocTypes(false);
                }}
              >
                {type.label}
              </button>
            ))}
          </div>
        )}

        {/* Document Number */}
        {documentType !== 'SIN_DOCUMENTO' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              N° de Documento
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={formData.documentNumber}
                onChange={(e) => onInputChange('documentNumber', e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ingresa el número de documento"
              />
              {(documentType === 'RUC' || documentType === 'DNI') && (
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold text-sm shadow hover:bg-blue-700 transition-colors"
                >
                  {documentType === 'RUC' ? 'Sunat' : 'Reniec'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Legal Name */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre legal <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.legalName}
            onChange={(e) => onInputChange('legalName', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ingresa el nombre legal"
          />
        </div>

        {/* Address */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Dirección
          </label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => onInputChange('address', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ingresa la dirección"
          />
        </div>

        {/* Client Type */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo
          </label>
          <select
            value={clientType}
            onChange={(e) => onClientTypeChange(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
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
            className="text-blue-600 font-medium underline cursor-pointer text-sm"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Género
              </label>
              <select
                value={formData.gender}
                onChange={(e) => onInputChange('gender', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">Selecciona género</option>
                <option value="Femenino">Femenino</option>
                <option value="Masculino">Masculino</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            {/* Phone */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => onInputChange('phone', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ingresa el teléfono"
              />
            </div>

            {/* Email */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => onInputChange('email', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ingresa el email"
              />
            </div>

            {/* Additional Data */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Información adicional
              </label>
              <textarea
                value={formData.additionalData}
                onChange={(e) => onInputChange('additionalData', e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Información adicional del cliente"
              />
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-full hover:bg-gray-200 hover:text-gray-800 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={onSave}
          className="px-4 py-2 text-sm font-medium text-white border rounded-full hover:opacity-90 transition-opacity"
          style={{ backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR }}
        >
          Guardar
        </button>
      </div>
    </div>
  );
};

export default ClienteForm;
