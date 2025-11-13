import React, { useState, useEffect } from 'react';
import { useConsultasExternas } from '../hooks';
import type { ClienteFormData } from '../models';
import TelefonosInput from './TelefonosInput';
import EmailsInput from './EmailsInput';
import ActividadesEconomicasInput from './ActividadesEconomicasInput';

type ClienteFormProps = {
  formData: ClienteFormData;
  onInputChange: (field: keyof ClienteFormData, value: any) => void;
  onCancel: () => void;
  onSave: () => void;
  isEditing?: boolean;
};

const PRIMARY_COLOR = '#1478D4';

const tiposDocumento = [
  { value: '0', label: '0 DOC.TRIB.NO.DOM.SIN.RUC' },
  { value: '1', label: '1 DNI' },
  { value: '4', label: '4 CE' },
  { value: '6', label: '6 RUC' },
  { value: '7', label: '7 Pasaporte' },
  { value: 'A', label: 'A Cédula Diplomática' },
  { value: 'B', label: 'B Doc.Pais.Residencia' },
  { value: 'C', label: 'C TIN' },
  { value: 'D', label: 'D IN' },
  { value: 'E', label: 'E TAM' },
  { value: 'F', label: 'F PTP' },
  { value: 'G', label: 'G Salvoconducto' },
  { value: 'H', label: 'H CPP' },
];

const ClienteFormNew: React.FC<ClienteFormProps> = ({
  formData,
  onInputChange,
  onCancel,
  onSave,
  isEditing = false,
}) => {
  const { consultingReniec, consultingSunat, consultarReniec, consultarSunat } = useConsultasExternas();
  const [showMoreDocTypes, setShowMoreDocTypes] = useState(false);
  
  const isConsulting = consultingReniec || consultingSunat;

  // Actualizar nombreCompleto automáticamente
  useEffect(() => {
    if (formData.tipoDocumento !== '6') {
      const nombreCompleto = [
        formData.primerNombre,
        formData.segundoNombre,
        formData.apellidoPaterno,
        formData.apellidoMaterno
      ].filter(Boolean).join(' ').trim();
      
      if (nombreCompleto !== formData.nombreCompleto) {
        onInputChange('nombreCompleto', nombreCompleto);
      }
    }
  }, [formData.primerNombre, formData.segundoNombre, formData.apellidoPaterno, formData.apellidoMaterno, formData.tipoDocumento]);

  const handleConsultarReniec = async () => {
    if (!formData.numeroDocumento || formData.numeroDocumento.length !== 8) {
      return;
    }

    const response = await consultarReniec(formData.numeroDocumento);

    if (response?.success && response.data) {
      onInputChange('primerNombre', response.data.nombres?.split(' ')[0] || '');
      onInputChange('segundoNombre', response.data.nombres?.split(' ').slice(1).join(' ') || '');
      onInputChange('apellidoPaterno', response.data.apellidoPaterno || '');
      onInputChange('apellidoMaterno', response.data.apellidoMaterno || '');
    }
  };

  const handleConsultarSunat = async () => {
    if (!formData.numeroDocumento || formData.numeroDocumento.length !== 11) {
      return;
    }

    const response = await consultarSunat(formData.numeroDocumento);

    if (response?.success && response.data) {
      onInputChange('razonSocial', response.data.razonSocial || '');
      onInputChange('nombreComercial', response.data.nombreComercial || '');
      onInputChange('direccion', response.data.direccion || '');
      onInputChange('estadoContribuyente', response.data.estado || '');
      onInputChange('condicionDomicilio', response.data.condicion || '');
    }
  };

  const mainDocTypes = tiposDocumento.slice(0, 3);
  const esRUC = formData.tipoDocumento === '6';
  const esDNI = formData.tipoDocumento === '1';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-[1100px] max-h-[85vh] overflow-hidden flex flex-col">
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

      {/* Body con scroll */}
      <div className="px-6 pt-4 pb-4 overflow-y-auto flex-1">
        {/* SECCIÓN: IDENTIFICACIÓN */}
        <div className="mb-6">
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3 border-b pb-2">
            📋 Identificación
          </h3>

          {/* Tipo de Documento - Selector visual */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo de documento <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {mainDocTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => onInputChange('tipoDocumento', type.value)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium ${
                    formData.tipoDocumento === type.value
                      ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600 text-blue-900 dark:text-blue-300'
                      : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  {type.label}
                </button>
              ))}
              <button
                type="button"
                className={`px-4 py-2 rounded-lg border text-sm font-medium flex items-center ${
                  !mainDocTypes.some(t => t.value === formData.tipoDocumento) && tiposDocumento.some(t => t.value === formData.tipoDocumento)
                    ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600 text-blue-900 dark:text-blue-300'
                    : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
                onClick={() => setShowMoreDocTypes(!showMoreDocTypes)}
              >
                {!mainDocTypes.some(t => t.value === formData.tipoDocumento) && tiposDocumento.some(t => t.value === formData.tipoDocumento)
                  ? tiposDocumento.find(t => t.value === formData.tipoDocumento)?.label
                  : 'MÁS OPCIONES'}
                <span className="ml-2">{showMoreDocTypes ? '▴' : '▾'}</span>
              </button>
            </div>
            
            {showMoreDocTypes && (
              <div className="mt-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {tiposDocumento.slice(3).map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    className="w-full text-left px-4 py-3 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors text-gray-700 dark:text-gray-300"
                    onClick={() => {
                      onInputChange('tipoDocumento', type.value);
                      setShowMoreDocTypes(false);
                    }}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Número de Documento */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Número de documento <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={formData.numeroDocumento}
                onChange={(e) => onInputChange('numeroDocumento', e.target.value)}
                maxLength={esDNI ? 8 : esRUC ? 11 : 20}
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                placeholder={esDNI ? 'Ingresa 8 dígitos' : esRUC ? 'Ingresa 11 dígitos' : 'Ingresa el número'}
              />
              {(esRUC || esDNI) && (
                <button
                  type="button"
                  onClick={esRUC ? handleConsultarSunat : handleConsultarReniec}
                  disabled={
                    isConsulting ||
                    !formData.numeroDocumento ||
                    (esDNI && formData.numeroDocumento.length !== 8) ||
                    (esRUC && formData.numeroDocumento.length !== 11)
                  }
                  className={`px-6 py-2 min-w-[100px] rounded-lg font-semibold text-sm shadow transition-colors ${
                    isConsulting ||
                    !formData.numeroDocumento ||
                    (esDNI && formData.numeroDocumento.length !== 8) ||
                    (esRUC && formData.numeroDocumento.length !== 11)
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'text-white hover:opacity-90'
                  }`}
                  style={!(isConsulting || !formData.numeroDocumento ||
                    (esDNI && formData.numeroDocumento.length !== 8) ||
                    (esRUC && formData.numeroDocumento.length !== 11))
                    ? { backgroundColor: PRIMARY_COLOR } : {}}
                >
                  {isConsulting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Consultando...
                    </div>
                  ) : (
                    esRUC ? 'Sunat' : 'Reniec'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* LAYOUT DE DOS COLUMNAS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4">
          {/* COLUMNA IZQUIERDA */}
          <div className="space-y-6">
            {/* Razón Social (solo RUC) */}
            {esRUC && (
              <div>
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3 border-b pb-2">
                  🏢 Datos de la Empresa
                </h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Razón social <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.razonSocial}
                    onChange={(e) => onInputChange('razonSocial', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre comercial
                  </label>
                  <input
                    type="text"
                    value={formData.nombreComercial}
                    onChange={(e) => onInputChange('nombreComercial', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            {/* Nombres (solo Persona Natural) */}
            {!esRUC && (
              <div>
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3 border-b pb-2">
                  👤 Datos Personales
                </h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Primer nombre <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.primerNombre}
                      onChange={(e) => onInputChange('primerNombre', e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Segundo nombre
                    </label>
                    <input
                      type="text"
                      value={formData.segundoNombre}
                      onChange={(e) => onInputChange('segundoNombre', e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Apellido paterno <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.apellidoPaterno}
                      onChange={(e) => onInputChange('apellidoPaterno', e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Apellido materno <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.apellidoMaterno}
                      onChange={(e) => onInputChange('apellidoMaterno', e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    value={formData.nombreCompleto}
                    readOnly
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 cursor-not-allowed"
                  />
                </div>
              </div>
            )}

            {/* Contacto */}
            <div>
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3 border-b pb-2">
                📞 Contacto
              </h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Correos electrónicos (hasta 3)
                </label>
                <EmailsInput
                  emails={formData.emails || []}
                  onChange={(emails) => onInputChange('emails', emails)}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Teléfonos (hasta 3)
                </label>
                <TelefonosInput
                  telefonos={formData.telefonos || []}
                  onChange={(telefonos) => onInputChange('telefonos', telefonos)}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Página web
                </label>
                <input
                  type="url"
                  value={formData.paginaWeb}
                  onChange={(e) => onInputChange('paginaWeb', e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="https://ejemplo.com"
                />
              </div>
            </div>

            {/* Ubicación */}
            <div>
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3 border-b pb-2">
                📍 Ubicación
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    País
                  </label>
                  <select
                    value={formData.pais}
                    onChange={(e) => onInputChange('pais', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="PE">Perú</option>
                    <option value="US">Estados Unidos</option>
                    <option value="ES">España</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Departamento
                  </label>
                  <input
                    type="text"
                    value={formData.departamento}
                    onChange={(e) => onInputChange('departamento', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Provincia
                  </label>
                  <input
                    type="text"
                    value={formData.provincia}
                    onChange={(e) => onInputChange('provincia', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Distrito
                  </label>
                  <input
                    type="text"
                    value={formData.distrito}
                    onChange={(e) => onInputChange('distrito', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Ubigeo
                  </label>
                  <input
                    type="text"
                    value={formData.ubigeo}
                    onChange={(e) => onInputChange('ubigeo', e.target.value)}
                    maxLength={6}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="6 dígitos"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Dirección
                </label>
                <input
                  type="text"
                  value={formData.direccion}
                  onChange={(e) => onInputChange('direccion', e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Referencia
                </label>
                <input
                  type="text"
                  value={formData.referenciaDireccion}
                  onChange={(e) => onInputChange('referenciaDireccion', e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Ej: Al costado del mercado"
                />
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA */}
          <div className="space-y-6">
            {/* Tipo y Estado */}
            <div>
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3 border-b pb-2">
                ⚙️ Configuración
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tipo de cliente
                  </label>
                  <select
                    value={formData.tipoCliente}
                    onChange={(e) => onInputChange('tipoCliente', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="Natural">Natural</option>
                    <option value="Juridica">Jurídica</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tipo de cuenta
                  </label>
                  <select
                    value={formData.tipoCuenta}
                    onChange={(e) => onInputChange('tipoCuenta', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="Cliente">Cliente</option>
                    <option value="Proveedor">Proveedor</option>
                    <option value="Cliente-Proveedor">Cliente-Proveedor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Estado
                  </label>
                  <select
                    value={formData.estadoCliente}
                    onChange={(e) => onInputChange('estadoCliente', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="Habilitado">Habilitado</option>
                    <option value="Deshabilitado">Deshabilitado</option>
                  </select>
                </div>
                {formData.estadoCliente === 'Deshabilitado' && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Motivo deshabilitación <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.motivoDeshabilitacion}
                      onChange={(e) => onInputChange('motivoDeshabilitacion', e.target.value)}
                      rows={2}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Datos SUNAT (solo RUC) */}
            {esRUC && (
              <div>
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3 border-b pb-2">
                  🏛️ Datos SUNAT
                </h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Estado contribuyente
                    </label>
                    <input
                      type="text"
                      value={formData.estadoContribuyente}
                      readOnly
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Condición domicilio
                    </label>
                    <input
                      type="text"
                      value={formData.condicionDomicilio}
                      readOnly
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 cursor-not-allowed"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Fecha de inscripción
                    </label>
                    <input
                      type="date"
                      value={formData.fechaInscripcion}
                      onChange={(e) => onInputChange('fechaInscripcion', e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Actividades económicas
                  </label>
                  <ActividadesEconomicasInput
                    actividades={formData.actividadesEconomicas || []}
                    onChange={(actividades) => onInputChange('actividadesEconomicas', actividades)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Sistema de emisión
                    </label>
                    <select
                      value={formData.sistemaEmision}
                      onChange={(e) => onInputChange('sistemaEmision', e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Seleccionar</option>
                      <option value="Manual">Manual</option>
                      <option value="Computarizado">Computarizado</option>
                      <option value="Mixto">Mixto</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={formData.esAgenteRetencion}
                      onChange={(e) => onInputChange('esAgenteRetencion', e.target.checked)}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                    Agente de retención
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={formData.esAgentePercepcion}
                      onChange={(e) => onInputChange('esAgentePercepcion', e.target.checked)}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                    Agente de percepción
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={formData.esBuenContribuyente}
                      onChange={(e) => onInputChange('esBuenContribuyente', e.target.checked)}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                    Buen contribuyente
                  </label>
                </div>
              </div>
            )}

            {/* Configuración Comercial */}
            <div>
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3 border-b pb-2">
                💼 Configuración Comercial
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Forma de pago
                  </label>
                  <select
                    value={formData.formaPago}
                    onChange={(e) => onInputChange('formaPago', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="Contado">Contado</option>
                    <option value="Credito">Crédito</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Moneda preferida
                  </label>
                  <select
                    value={formData.monedaPreferida}
                    onChange={(e) => onInputChange('monedaPreferida', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="PEN">Soles (PEN)</option>
                    <option value="USD">Dólares (USD)</option>
                    <option value="EUR">Euros (EUR)</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Lista de precios
                  </label>
                  <input
                    type="text"
                    value={formData.listaPrecio}
                    onChange={(e) => onInputChange('listaPrecio', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Seleccionar lista"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Usuario asignado
                  </label>
                  <input
                    type="text"
                    value={formData.usuarioAsignado}
                    onChange={(e) => onInputChange('usuarioAsignado', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Buscar usuario"
                  />
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={formData.clientePorDefecto}
                    onChange={(e) => onInputChange('clientePorDefecto', e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  Cliente por defecto
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={formData.exceptuadaPercepcion}
                    onChange={(e) => onInputChange('exceptuadaPercepcion', e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  Exceptuada de percepción
                </label>
              </div>
            </div>

            {/* Observaciones */}
            <div>
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3 border-b pb-2">
                📝 Información Adicional
              </h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Observaciones
                </label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => onInputChange('observaciones', e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Notas adicionales sobre el cliente"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
        <button
          onClick={onCancel}
          className="px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-full hover:bg-gray-200 dark:hover:bg-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={onSave}
          className="px-6 py-2 text-sm font-medium text-white border rounded-full hover:opacity-90 transition-opacity"
          style={{ backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR }}
        >
          {isEditing ? 'Actualizar' : 'Guardar'}
        </button>
      </div>
    </div>
  );
};

export default ClienteFormNew;
