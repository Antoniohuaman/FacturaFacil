import React, { useState, useEffect } from 'react';
import { useConsultasExternas } from '../hooks';
import type { ClienteFormData } from '../models';
import TelefonosInput from './TelefonosInput';
import EmailsInput from './EmailsInput';
import ActividadesEconomicasInput from './ActividadesEconomicasInput';
import CPEHabilitadoInput from './CPEHabilitadoInput';
import ArchivosInput from './ArchivosInput';
import ClienteAvatar from './ClienteAvatar';

type ClienteFormProps = {
  formData: ClienteFormData;
  onInputChange: (field: keyof ClienteFormData, value: any) => void;
  onCancel: () => void;
  onSave: () => void;
  isEditing?: boolean;
};

const PRIMARY_COLOR = '#1478D4';

const tiposDocumento = [
  { value: '0', label: 'DOC.TRIB.NO.DOM.SIN.RUC' },
  { value: '1', label: 'Documento Nacional de Identidad' },
  { value: '4', label: 'Carnet de extranjería' },
  { value: '6', label: 'Registro Único de Contribuyentes' },
  { value: '7', label: 'Pasaporte' },
  { value: 'A', label: 'Cédula Diplomática de identidad' },
  { value: 'B', label: 'DOC.IDENT.PAIS.RESIDENCIA-NO.D' },
  { value: 'C', label: 'Tax Identification Number - TIN - Doc Trib PP.NN' },
  { value: 'D', label: 'Identification Number - IN - Doc Trib PP.JJ' },
  { value: 'E', label: 'TAM - Tarjeta Andina de Migración' },
  { value: 'F', label: 'Permiso Temporal de Permanencia - PTP' },
  { value: 'G', label: 'Salvoconducto' },
  { value: 'H', label: 'Carné Permiso Temp.Perman. - CPP' },
];

const ClienteFormNew: React.FC<ClienteFormProps> = ({
  formData,
  onInputChange,
  onCancel,
  onSave,
  isEditing = false,
}) => {
  const { consultingReniec, consultingSunat, consultarReniec, consultarSunat } = useConsultasExternas();
  const [showOtrosDocTypes, setShowOtrosDocTypes] = useState(false);
  
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
    } else {
      // Para RUC, nombreCompleto = razonSocial
      if (formData.razonSocial && formData.razonSocial !== formData.nombreCompleto) {
        onInputChange('nombreCompleto', formData.razonSocial);
      }
    }
  }, [formData.primerNombre, formData.segundoNombre, formData.apellidoPaterno, formData.apellidoMaterno, formData.razonSocial, formData.tipoDocumento]);

  // Auto-ajustar tipoPersona según tipoDocumento
  useEffect(() => {
    if (formData.tipoDocumento === '6') {
      // RUC -> Persona Jurídica
      if (formData.tipoPersona !== 'Juridica') {
        onInputChange('tipoPersona', 'Juridica');
      }
    } else {
      // Otros -> Persona Natural
      if (formData.tipoPersona !== 'Natural') {
        onInputChange('tipoPersona', 'Natural');
      }
    }
  }, [formData.tipoDocumento]);

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

  const esRUC = formData.tipoDocumento === '6';
  const esDNI = formData.tipoDocumento === '1';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-[1100px] max-h-[85vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h2>
          {/* Fechas de auditoría (solo en modo edición) */}
          {isEditing && (formData.fechaRegistro || formData.fechaUltimaModificacion) && (
            <div className="flex items-center gap-3 mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
              {formData.fechaRegistro && (
                <span>
                  <strong className="font-medium">Creado:</strong> {new Date(formData.fechaRegistro).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              )}
              {formData.fechaUltimaModificacion && (
                <span>
                  <strong className="font-medium">Modificado:</strong> {new Date(formData.fechaUltimaModificacion).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={onCancel}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
        >
          <span className="h-5 w-5 text-gray-400 dark:text-gray-300">✕</span>
        </button>
      </div>

      {/* Body con scroll */}
      <div className="px-6 py-3 overflow-y-auto flex-1">
        {/* SECCIÓN: IDENTIFICACIÓN */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2 pb-1.5 border-b">
            📋 Identificación y Tipo de Cuenta
          </h3>

          {/* Tipo de Documento - Pills: RUC | DNI | OTROS */}
          <div className="mb-2">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Tipo de documento <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-1.5 mb-2">
              <button
                type="button"
                onClick={() => {
                  onInputChange('tipoDocumento', '6');
                  setShowOtrosDocTypes(false);
                }}
                className={`px-4 py-1.5 rounded-md border text-sm font-medium transition-colors ${
                  formData.tipoDocumento === '6'
                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                    : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                RUC
              </button>
              <button
                type="button"
                onClick={() => {
                  onInputChange('tipoDocumento', '1');
                  setShowOtrosDocTypes(false);
                }}
                className={`px-4 py-1.5 rounded-md border text-sm font-medium transition-colors ${
                  formData.tipoDocumento === '1'
                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                    : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                DNI
              </button>
              <button
                type="button"
                onClick={() => setShowOtrosDocTypes(!showOtrosDocTypes)}
                className={`px-4 py-1.5 rounded-md border text-sm font-medium transition-colors flex items-center gap-1 ${
                  formData.tipoDocumento !== '6' && formData.tipoDocumento !== '1'
                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                    : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                OTROS
                <span className="text-xs">{showOtrosDocTypes ? '▴' : '▾'}</span>
              </button>
            </div>
            
            {/* Dropdown de otros documentos */}
            {showOtrosDocTypes && (
              <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                {tiposDocumento.filter(t => t.value !== '6' && t.value !== '1').map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 dark:hover:bg-blue-900/30 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors ${
                      formData.tipoDocumento === type.value
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                    onClick={() => {
                      onInputChange('tipoDocumento', type.value);
                      setShowOtrosDocTypes(false);
                    }}
                  >
                    <span className="font-mono text-[10px] mr-2 text-gray-500 dark:text-gray-400">{type.value}</span>
                    <span className="text-xs">{type.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Número de Documento + Botón RENIEC/SUNAT */}
          <div className="grid grid-cols-[1fr,auto] gap-2 mb-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Número de documento <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.numeroDocumento}
                onChange={(e) => onInputChange('numeroDocumento', e.target.value)}
                maxLength={esDNI ? 8 : esRUC ? 11 : 20}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 h-9 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder={esDNI ? '8 dígitos' : esRUC ? '11 dígitos' : 'Documento'}
              />
            </div>
            {(esRUC || esDNI) && (
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 opacity-0">
                  .
                </label>
                <button
                  type="button"
                  onClick={esRUC ? handleConsultarSunat : handleConsultarReniec}
                  disabled={
                    isConsulting ||
                    !formData.numeroDocumento ||
                    (esDNI && formData.numeroDocumento.length !== 8) ||
                    (esRUC && formData.numeroDocumento.length !== 11)
                  }
                  className={`px-3 h-9 rounded-md font-semibold text-xs uppercase transition-colors ${
                    isConsulting ||
                    !formData.numeroDocumento ||
                    (esDNI && formData.numeroDocumento.length !== 8) ||
                    (esRUC && formData.numeroDocumento.length !== 11)
                      ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isConsulting ? (
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-[10px]">...</span>
                    </div>
                  ) : (
                    esRUC ? 'SUNAT' : 'RENIEC'
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Tipo de Cuenta - Segmented Control */}
          <div className="mb-2">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Tipo de cuenta <span className="text-red-500">*</span>
            </label>
            <div className="inline-flex rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden">
              {['Cliente', 'Proveedor', 'Cliente-Proveedor'].map((tipo, idx) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => onInputChange('tipoCuenta', tipo)}
                  className={`px-4 py-1.5 text-xs font-medium transition-colors ${
                    idx > 0 ? 'border-l border-gray-300 dark:border-gray-600' : ''
                  } ${
                    formData.tipoCuenta === tipo
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  {tipo}
                </button>
              ))}
            </div>
          </div>

          {/* Tipo de Persona - Segmented Control */}
          <div className="mb-2">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Tipo de persona
            </label>
            <div className="inline-flex rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden">
              {['Natural', 'Juridica'].map((tipo, idx) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => onInputChange('tipoPersona', tipo)}
                  className={`px-6 py-1.5 text-xs font-medium transition-colors ${
                    idx > 0 ? 'border-l border-gray-300 dark:border-gray-600' : ''
                  } ${
                    formData.tipoPersona === tipo
                      ? 'bg-gray-600 dark:bg-gray-500 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  {tipo === 'Juridica' ? 'Jurídica' : tipo}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
              Se ajusta automáticamente según el tipo de documento
            </p>
          </div>
        </div>

        {/* LAYOUT DE DOS COLUMNAS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-5 gap-y-3">
          {/* COLUMNA IZQUIERDA */}
          <div className="space-y-2">
            {/* Razón Social (solo RUC) */}
            {esRUC && (
              <div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2 pb-1.5 border-b">
                  🏢 Datos de la Empresa
                </h3>
                
                {/* Grid con avatar y campos */}
                <div className="grid grid-cols-[auto,1fr] gap-3 mb-2">
                  {/* Avatar del cliente */}
                  <div className="pt-0.5">
                    <ClienteAvatar
                      imagenes={formData.imagenes || []}
                      onChange={(imagenes: File[]) => onInputChange('imagenes', imagenes)}
                    />
                  </div>

                  {/* Campos de empresa */}
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Razón social <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.razonSocial}
                        onChange={(e) => onInputChange('razonSocial', e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 h-9 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nombre comercial
                      </label>
                      <input
                        type="text"
                        value={formData.nombreComercial}
                        onChange={(e) => onInputChange('nombreComercial', e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 h-9 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Nombres (solo Persona Natural) */}
            {!esRUC && (
              <div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2 pb-1.5 border-b">
                  👤 Datos Personales
                </h3>
                
                {/* Grid con avatar y campos */}
                <div className="grid grid-cols-[auto,1fr] gap-3 mb-2">
                  {/* Avatar del cliente */}
                  <div className="pt-0.5">
                    <ClienteAvatar
                      imagenes={formData.imagenes || []}
                      onChange={(imagenes: File[]) => onInputChange('imagenes', imagenes)}
                    />
                  </div>

                  {/* Campos de persona */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Primer nombre <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.primerNombre}
                          onChange={(e) => onInputChange('primerNombre', e.target.value)}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 h-9 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Segundo nombre
                        </label>
                        <input
                          type="text"
                          value={formData.segundoNombre}
                          onChange={(e) => onInputChange('segundoNombre', e.target.value)}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 h-9 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Apellido paterno <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.apellidoPaterno}
                          onChange={(e) => onInputChange('apellidoPaterno', e.target.value)}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 h-9 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Apellido materno <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.apellidoMaterno}
                          onChange={(e) => onInputChange('apellidoMaterno', e.target.value)}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 h-9 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mb-2">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    value={formData.nombreCompleto}
                    readOnly
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 h-9 text-sm bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 cursor-not-allowed"
                  />
                </div>
              </div>
            )}

            {/* Contacto */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2 pb-1.5 border-b">
                📞 Contacto
              </h3>
              <div className="mb-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Correos electrónicos (hasta 3)
                </label>
                <EmailsInput
                  emails={formData.emails || []}
                  onChange={(emails) => onInputChange('emails', emails)}
                />
              </div>
              <div className="mb-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Teléfonos (hasta 3)
                </label>
                <TelefonosInput
                  telefonos={formData.telefonos || []}
                  onChange={(telefonos) => onInputChange('telefonos', telefonos)}
                />
              </div>
              <div className="mb-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Página web
                </label>
                <input
                  type="url"
                  value={formData.paginaWeb}
                  onChange={(e) => onInputChange('paginaWeb', e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 h-9 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="https://ejemplo.com"
                />
              </div>
            </div>

            {/* Ubicación */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2 pb-1.5 border-b">
                📍 Ubicación
              </h3>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    País
                  </label>
                  <select
                    value={formData.pais}
                    onChange={(e) => onInputChange('pais', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 h-9 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="PE">Perú</option>
                    <option value="US">Estados Unidos</option>
                    <option value="ES">España</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Departamento
                  </label>
                  <input
                    type="text"
                    value={formData.departamento}
                    onChange={(e) => onInputChange('departamento', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 h-9 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Provincia
                  </label>
                  <input
                    type="text"
                    value={formData.provincia}
                    onChange={(e) => onInputChange('provincia', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 h-9 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Distrito
                  </label>
                  <input
                    type="text"
                    value={formData.distrito}
                    onChange={(e) => onInputChange('distrito', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 h-9 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Ubigeo
                  </label>
                  <input
                    type="text"
                    value={formData.ubigeo}
                    onChange={(e) => onInputChange('ubigeo', e.target.value)}
                    maxLength={6}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 h-9 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="6 dígitos"
                  />
                </div>
              </div>
              <div className="mb-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Dirección
                </label>
                <input
                  type="text"
                  value={formData.direccion}
                  onChange={(e) => onInputChange('direccion', e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 h-9 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="mb-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Referencia
                </label>
                <input
                  type="text"
                  value={formData.referenciaDireccion}
                  onChange={(e) => onInputChange('referenciaDireccion', e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 h-9 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Ej: Al costado del mercado"
                />
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA */}
          <div className="space-y-3">
            {/* Estado y Configuración */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2 pb-1.5 border-b">
                ⚙️ Estado y Configuración
              </h3>
              <div className="mb-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Estado de la cuenta
                </label>
                <select
                  value={formData.estadoCliente}
                  onChange={(e) => onInputChange('estadoCliente', e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 h-9 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="Habilitado">Habilitado</option>
                  <option value="Deshabilitado">Deshabilitado</option>
                </select>
              </div>
              {formData.estadoCliente === 'Deshabilitado' && (
                <div className="mb-2">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Motivo deshabilitación <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.motivoDeshabilitacion}
                    onChange={(e) => onInputChange('motivoDeshabilitacion', e.target.value)}
                    rows={2}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                  />
                </div>
              )}
            </div>

            {/* Datos SUNAT (solo RUC) */}
            {esRUC && (
              <div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2 pb-1.5 border-b">
                  🏛️ Información SUNAT
                </h3>
                
                {/* Readonly Info Card - Datos verificados de SUNAT */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-3">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400 font-medium">Tipo:</span>
                      <div className="text-gray-800 dark:text-gray-200 font-semibold">{formData.tipoContribuyente || '-'}</div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400 font-medium">Estado:</span>
                      <div className="text-gray-800 dark:text-gray-200 font-semibold">{formData.estadoContribuyente || '-'}</div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400 font-medium">Condición domicilio:</span>
                      <div className="text-gray-800 dark:text-gray-200 font-semibold">{formData.condicionDomicilio || '-'}</div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400 font-medium">Fecha inscripción:</span>
                      <div className="text-gray-800 dark:text-gray-200 font-semibold">{formData.fechaInscripcion || '-'}</div>
                    </div>
                  </div>
                </div>

                {/* Actividades económicas */}
                <div className="mb-2">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Actividades económicas
                  </label>
                  <ActividadesEconomicasInput
                    actividades={formData.actividadesEconomicas || []}
                    onChange={(actividades) => onInputChange('actividadesEconomicas', actividades)}
                  />
                </div>

                {/* Sistema de emisión y emisor electrónico */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Sistema de emisión
                    </label>
                    <select
                      value={formData.sistemaEmision}
                      onChange={(e) => onInputChange('sistemaEmision', e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 h-9 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Seleccionar</option>
                      <option value="Manual">Manual</option>
                      <option value="Computarizado">Computarizado</option>
                      <option value="Mixto">Mixto</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 h-9">
                      <input
                        type="checkbox"
                        checked={formData.esEmisorElectronico}
                        onChange={(e) => onInputChange('esEmisorElectronico', e.target.checked)}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                      Emisor electrónico
                    </label>
                  </div>
                </div>

                {/* CPE Habilitados - solo si es emisor electrónico */}
                {formData.esEmisorElectronico && (
                  <div className="mb-2">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      CPE Habilitados
                    </label>
                    <CPEHabilitadoInput
                      cpeHabilitados={formData.cpeHabilitado || []}
                      onChange={(cpeHabilitado) => onInputChange('cpeHabilitado', cpeHabilitado)}
                    />
                  </div>
                )}

                {/* Checkboxes de condiciones especiales */}
                <div className="space-y-1.5 mb-3">
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
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2 pb-1.5 border-b">
                💼 Configuración Comercial
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Forma de pago
                  </label>
                  <select
                    value={formData.formaPago}
                    onChange={(e) => onInputChange('formaPago', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 h-9 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="Contado">Contado</option>
                    <option value="Credito">Crédito</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Moneda preferida
                  </label>
                  <select
                    value={formData.monedaPreferida}
                    onChange={(e) => onInputChange('monedaPreferida', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 h-9 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="PEN">Soles (PEN)</option>
                    <option value="USD">Dólares (USD)</option>
                    <option value="EUR">Euros (EUR)</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Lista de precios
                  </label>
                  <input
                    type="text"
                    value={formData.listaPrecio}
                    onChange={(e) => onInputChange('listaPrecio', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 h-9 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Seleccionar lista"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Usuario asignado
                  </label>
                  <input
                    type="text"
                    value={formData.usuarioAsignado}
                    onChange={(e) => onInputChange('usuarioAsignado', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 h-9 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2 pb-1.5 border-b">
                📝 Información Adicional
              </h3>
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Observaciones
                </label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => onInputChange('observaciones', e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Notas adicionales sobre el cliente"
                />
              </div>

              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Archivos del cliente
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Sube documentos, imágenes u otros archivos relacionados
                </p>
                <ArchivosInput
                  archivos={[...(formData.adjuntos || []), ...(formData.imagenes?.slice(1) || [])]}
                  onChange={(archivos) => {
                    // Separar imágenes y documentos
                    const imagenes: File[] = [];
                    const documentos: File[] = [];
                    
                    archivos.forEach(file => {
                      const ext = file.name.split('.').pop()?.toLowerCase();
                      if (ext && ['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
                        imagenes.push(file);
                      } else {
                        documentos.push(file);
                      }
                    });
                    
                    // Mantener la primera imagen si existe
                    const primeraImagen = formData.imagenes?.[0];
                    onInputChange('imagenes', primeraImagen ? [primeraImagen, ...imagenes] : imagenes);
                    onInputChange('adjuntos', documentos);
                  }}
                  maxArchivos={15}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
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
