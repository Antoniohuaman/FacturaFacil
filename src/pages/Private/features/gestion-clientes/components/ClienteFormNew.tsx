import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useConsultasExternas } from '../hooks';
import type { ClienteFormData } from '../models';
import { onlyDigits, getDocLabelFromCode } from '../utils/documents';
import TelefonosInput from './TelefonosInput';
import EmailsInput from './EmailsInput';
import ArchivosInput from './ArchivosInput';
import ClienteAvatar from './ClienteAvatar';
import ClienteFormFieldSelector from './ClienteFormFieldSelector';
import DatosSunatCliente from './DatosSunatCliente';
import { useClienteFormConfig } from '../hooks/useClienteFormConfig';
import type { ClienteFieldId } from './clienteFormConfig';
import { formatBusinessDateTimeForTicket } from '@/shared/time/businessTime';
import { usePriceProfilesCatalog } from '../../lista-precios/hooks/usePriceProfilesCatalog';

type ClienteFormProps = {
  formData: ClienteFormData;
  onInputChange: (field: keyof ClienteFormData, value: ClienteFormData[keyof ClienteFormData]) => void;
  onCancel: () => void;
  onSave: () => void;
  isEditing?: boolean;
  modoPresentacion?: 'modal' | 'drawer';
  alCambiarAccionesEncabezado?: (acciones: React.ReactNode | null) => void;
};

const PRIMARY_COLOR = '#1478D4';

type IdentificadorPestanaCliente = 'datosPrincipales' | 'direcciones' | 'contactos' | 'configuracionComercial' | 'datosSunat';

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

const DNI_CODE = '1';
const RUC_CODE = '6';
const DNI_REGEX = /^\d{8}$/;
const RUC_REGEX = /^[12]\d{10}$/;
const DNI_ERROR_MESSAGE = 'El DNI debe tener 8 dígitos numéricos';
const RUC_ERROR_MESSAGE = 'El RUC debe tener 11 dígitos numéricos y comenzar con 1 o 2';

const sanitizeNumeroDocumentoValue = (value: string, tipoDocumento: string): string => {
  if (tipoDocumento === RUC_CODE) {
    return onlyDigits(value).slice(0, 11);
  }
  if (tipoDocumento === DNI_CODE) {
    return onlyDigits(value).slice(0, 8);
  }
  return value.slice(0, 20);
};

const getDocumentoValidationErrorMessage = (
  tipoDocumento: string,
  numeroDocumento: string
): string | undefined => {
  if (tipoDocumento === DNI_CODE) {
    return DNI_REGEX.test(onlyDigits(numeroDocumento)) ? undefined : DNI_ERROR_MESSAGE;
  }
  if (tipoDocumento === RUC_CODE) {
    return RUC_REGEX.test(onlyDigits(numeroDocumento)) ? undefined : RUC_ERROR_MESSAGE;
  }
  return undefined;
};

const ClienteFormNew: React.FC<ClienteFormProps> = ({
  formData,
  onInputChange,
  onCancel,
  onSave,
  isEditing = false,
  modoPresentacion = 'modal',
  alCambiarAccionesEncabezado,
}) => {
  const { consultingReniec, consultingSunat, consultarReniec, consultarSunat } = useConsultasExternas();
  const { profiles: priceProfiles } = usePriceProfilesCatalog();
  const [showOtrosDocTypes, setShowOtrosDocTypes] = useState(false);
  const [pestanaActiva, setPestanaActiva] = useState<IdentificadorPestanaCliente>('datosPrincipales');
  
  const isConsulting = consultingReniec || consultingSunat;
  const {
    fieldConfigs,
    visibleFieldIds,
    requiredFieldIds,
    isFieldVisible,
    isFieldRequired,
    toggleFieldVisible,
    toggleFieldRequired,
    selectAllFields,
    resetDefaults,
  } = useClienteFormConfig();
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ClienteFieldId, string>>>({});
  const fieldLabelMap = useMemo(() => new Map(fieldConfigs.map((field) => [field.id, field.label])), [fieldConfigs]);
  const esModoDrawer = modoPresentacion === 'drawer';

  const clearFieldError = useCallback((fieldId: ClienteFieldId) => {
    setFieldErrors((prev) => {
      if (!prev[fieldId]) return prev;
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  }, []);

  const handleFieldChange = useCallback(
    <K extends keyof ClienteFormData>(field: K, value: ClienteFormData[K], relatedFieldId?: ClienteFieldId) => {
      if (relatedFieldId) {
        clearFieldError(relatedFieldId);
      }
      onInputChange(field, value);
    },
    [clearFieldError, onInputChange]
  );

  const getFieldLabel = useCallback((fieldId: ClienteFieldId) => fieldLabelMap.get(fieldId) ?? 'Campo', [fieldLabelMap]);
  const getFieldError = useCallback((fieldId: ClienteFieldId) => fieldErrors[fieldId], [fieldErrors]);
  const getFieldInputClass = useCallback(
    (fieldId: ClienteFieldId, baseClass: string) =>
      `${baseClass} ${getFieldError(fieldId) ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`,
    [getFieldError]
  );
  const renderFieldError = useCallback(
    (fieldId: ClienteFieldId) => {
      const error = getFieldError(fieldId);
      if (!error) return null;
      return <p className="mt-1 text-xs text-red-500">{error}</p>;
    },
    [getFieldError]
  );

  const handleNumeroDocumentoChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const sanitizedValue = sanitizeNumeroDocumentoValue(event.target.value, formData.tipoDocumento);
      handleFieldChange('numeroDocumento', sanitizedValue, 'numeroDocumento');
    },
    [formData.tipoDocumento, handleFieldChange]
  );

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
        handleFieldChange('nombreCompleto', nombreCompleto, 'nombreCompleto');
      }
    } else if (formData.razonSocial && formData.razonSocial !== formData.nombreCompleto) {
      // Para RUC, nombreCompleto = razonSocial
      handleFieldChange('nombreCompleto', formData.razonSocial, 'nombreCompleto');
    }
  }, [
    formData.primerNombre,
    formData.segundoNombre,
    formData.apellidoPaterno,
    formData.apellidoMaterno,
    formData.razonSocial,
    formData.tipoDocumento,
    formData.nombreCompleto,
    handleFieldChange,
  ]);

  // Auto-ajustar tipoPersona según tipoDocumento
  useEffect(() => {
    if (formData.tipoDocumento === '6') {
      // RUC -> Persona Jurídica
      if (formData.tipoPersona !== 'Juridica') {
        handleFieldChange('tipoPersona', 'Juridica', 'tipoPersona');
      }
    } else if (formData.tipoPersona !== 'Natural') {
      // Otros -> Persona Natural
      handleFieldChange('tipoPersona', 'Natural', 'tipoPersona');
    }
  }, [formData.tipoDocumento, formData.tipoPersona, handleFieldChange]);

  useEffect(() => {
    if (formData.tipoDocumento !== RUC_CODE && formData.tipoDocumento !== DNI_CODE) {
      return;
    }

    const sanitized = sanitizeNumeroDocumentoValue(formData.numeroDocumento, formData.tipoDocumento);
    if (sanitized !== formData.numeroDocumento) {
      handleFieldChange('numeroDocumento', sanitized, 'numeroDocumento');
    }
  }, [formData.tipoDocumento, formData.numeroDocumento, handleFieldChange]);

  useEffect(() => {
    clearFieldError('numeroDocumento');
  }, [formData.tipoDocumento, clearFieldError]);

  const handleConsultarReniec = async () => {
    if (!formData.numeroDocumento || formData.numeroDocumento.length !== 8) {
      return;
    }

    const response = await consultarReniec(formData.numeroDocumento);

    if (response?.success && response.data) {
      handleFieldChange('primerNombre', response.data.nombres?.split(' ')[0] || '', 'primerNombre');
      handleFieldChange('segundoNombre', response.data.nombres?.split(' ').slice(1).join(' ') || '', 'segundoNombre');
      handleFieldChange('apellidoPaterno', response.data.apellidoPaterno || '', 'apellidoPaterno');
      handleFieldChange('apellidoMaterno', response.data.apellidoMaterno || '', 'apellidoMaterno');
    }
  };

  const handleConsultarSunat = async () => {
    if (!formData.numeroDocumento || formData.numeroDocumento.length !== 11) {
      return;
    }

    const response = await consultarSunat(formData.numeroDocumento);

    if (response?.success && response.data) {
      // Datos básicos
      handleFieldChange('razonSocial', response.data.razonSocial || '', 'razonSocial');
      handleFieldChange('nombreComercial', response.data.nombreComercial || '', 'nombreComercial');
      handleFieldChange('direccion', response.data.direccion || '', 'direccion');
      
      // Datos SUNAT (readonly)
      handleFieldChange('tipoContribuyente', response.data.tipo || '', 'tipoContribuyente');
      handleFieldChange('estadoContribuyente', response.data.estado || '', 'estadoContribuyente');
      handleFieldChange(
        'condicionDomicilio',
        (response.data.condicion || '') as ClienteFormData['condicionDomicilio'],
        'condicionDomicilio'
      );
      handleFieldChange('fechaInscripcion', response.data.fechaInscripcion || '', 'fechaInscripcion');
      handleFieldChange(
        'sistemaEmision',
        (response.data.sistEmsion || response.data.sistemaEmision || '') as ClienteFormData['sistemaEmision'],
        'sistemaEmision'
      );
      
      // Flags SUNAT (readonly)
      handleFieldChange('esAgenteRetencion', response.data.esAgenteRetencion || false, 'esAgenteRetencion');
      handleFieldChange('esAgentePercepcion', response.data.esAgentePercepcion || false, 'esAgentePercepcion');
      handleFieldChange('esBuenContribuyente', response.data.esBuenContribuyente || false, 'esBuenContribuyente');
      handleFieldChange('esEmisorElectronico', response.data.esEmisorElectronico || false, 'esEmisorElectronico');
      handleFieldChange('exceptuadaPercepcion', response.data.exceptuadaPercepcion || false, 'exceptuadaPercepcion');
      
      // Actividades económicas (readonly)
      if (response.data.actEconomicas && Array.isArray(response.data.actEconomicas)) {
        const actividades = response.data.actEconomicas.map((act: string) => {
          // Formato: "Principal - 6920 - ACTIVIDADES DE CONTABILIDAD"
          const partes = act.split(' - ');
          return {
            codigo: partes[1] || '',
            descripcion: partes[2] || act,
            esPrincipal: act.toLowerCase().includes('principal')
          };
        });
        handleFieldChange('actividadesEconomicas', actividades, 'actividadesEconomicas');
      }
      
      // Ubicación geográfica
      if (response.data.departamento) handleFieldChange('departamento', response.data.departamento, 'departamento');
      if (response.data.provincia) handleFieldChange('provincia', response.data.provincia, 'provincia');
      if (response.data.distrito) handleFieldChange('distrito', response.data.distrito, 'distrito');
    }
  };

  const esRUC = formData.tipoDocumento === '6';
  const esDNI = formData.tipoDocumento === '1';
  const documentoMaxLength = esDNI ? 8 : esRUC ? 11 : 20;

  const mostrarPestanaDatosSunat = true;

  const getDocumentoValidationError = useCallback(() => {
    if (!esDNI && !esRUC) {
      return undefined;
    }
    return getDocumentoValidationErrorMessage(formData.tipoDocumento, formData.numeroDocumento);
  }, [esDNI, esRUC, formData.tipoDocumento, formData.numeroDocumento]);

  const handleNumeroDocumentoBlur = useCallback(() => {
    if (!esDNI && !esRUC) {
      return;
    }

    const documentError = getDocumentoValidationError();
    if (documentError) {
      setFieldErrors((prev) => ({ ...prev, numeroDocumento: documentError }));
    } else {
      clearFieldError('numeroDocumento');
    }
  }, [esDNI, esRUC, getDocumentoValidationError, clearFieldError]);

  const isFieldBusinessEnabled = useCallback(
    (fieldId: ClienteFieldId) => {
      if (
        [
          'razonSocial',
          'nombreComercial',
          'tipoContribuyente',
          'estadoContribuyente',
          'condicionDomicilio',
          'fechaInscripcion',
          'actividadesEconomicas',
          'sistemaEmision',
          'esEmisorElectronico',
          'esAgenteRetencion',
          'esAgentePercepcion',
          'esBuenContribuyente',
          'exceptuadaPercepcion',
        ].includes(fieldId)
      ) {
        return esRUC;
      }
      if (fieldId === 'cpeHabilitado') {
        return esRUC && formData.esEmisorElectronico;
      }
      if (
        ['primerNombre', 'segundoNombre', 'apellidoPaterno', 'apellidoMaterno', 'nombreCompleto'].includes(fieldId)
      ) {
        return !esRUC;
      }
      if (fieldId === 'motivoDeshabilitacion') {
        return formData.estadoCliente === 'Deshabilitado';
      }
      return true;
    },
    [esRUC, formData.esEmisorElectronico, formData.estadoCliente]
  );

  const isFieldRenderable = useCallback(
    (fieldId: ClienteFieldId) => isFieldVisible(fieldId) && isFieldBusinessEnabled(fieldId),
    [isFieldVisible, isFieldBusinessEnabled]
  );

  const shouldShowRequiredIndicator = useCallback(
    (fieldId: ClienteFieldId, extra = true) => extra && isFieldRequired(fieldId),
    [isFieldRequired]
  );

  const hasValue = useCallback(
    (fieldId: ClienteFieldId) => {
      switch (fieldId) {
        case 'tipoDocumento':
          return Boolean(formData.tipoDocumento?.trim());
        case 'numeroDocumento':
          return Boolean(formData.numeroDocumento?.trim());
        case 'tipoCuenta':
          return Boolean(formData.tipoCuenta?.trim());
        case 'tipoPersona':
          return Boolean(formData.tipoPersona?.trim());
        case 'razonSocial':
          return Boolean(formData.razonSocial?.trim());
        case 'nombreComercial':
          return Boolean(formData.nombreComercial?.trim());
        case 'primerNombre':
          return Boolean(formData.primerNombre?.trim());
        case 'segundoNombre':
          return Boolean(formData.segundoNombre?.trim());
        case 'apellidoPaterno':
          return Boolean(formData.apellidoPaterno?.trim());
        case 'apellidoMaterno':
          return Boolean(formData.apellidoMaterno?.trim());
        case 'nombreCompleto':
          return Boolean(formData.nombreCompleto?.trim());
        case 'emails':
          return (formData.emails?.some((email) => email.trim())) ?? false;
        case 'telefonos':
          return (formData.telefonos?.some((telefono) => telefono.numero.trim())) ?? false;
        case 'paginaWeb':
          return Boolean(formData.paginaWeb?.trim());
        case 'pais':
          return Boolean(formData.pais?.trim());
        case 'departamento':
          return Boolean(formData.departamento?.trim());
        case 'provincia':
          return Boolean(formData.provincia?.trim());
        case 'distrito':
          return Boolean(formData.distrito?.trim());
        case 'ubigeo':
          return Boolean(formData.ubigeo?.trim());
        case 'direccion':
          return Boolean(formData.direccion?.trim());
        case 'referenciaDireccion':
          return Boolean(formData.referenciaDireccion?.trim());
        case 'motivoDeshabilitacion':
          return Boolean(formData.motivoDeshabilitacion?.trim());
        case 'formaPago':
          return Boolean(formData.formaPago?.trim());
        case 'monedaPreferida':
          return Boolean(formData.monedaPreferida?.trim());
        case 'listaPrecio':
          return Boolean(formData.listaPrecio?.trim());
        case 'usuarioAsignado':
          return Boolean(formData.usuarioAsignado?.trim());
        case 'avatar':
          return (formData.imagenes?.length ?? 0) > 0;
        case 'observaciones':
          return Boolean(formData.observaciones?.trim());
        case 'cpeHabilitado':
          return (formData.cpeHabilitado?.length ?? 0) > 0;
        case 'archivos':
          return (formData.adjuntos?.length ?? 0) > 0 || (formData.imagenes?.length ?? 0) > 0;
        default:
          return true;
      }
    },
    [formData]
  );

  const validateCustomFields = useCallback(() => {
    if (!requiredFieldIds.length) {
      setFieldErrors({});
      return true;
    }

    const nextErrors: Partial<Record<ClienteFieldId, string>> = {};
    requiredFieldIds.forEach((fieldId) => {
      if (!isFieldRenderable(fieldId)) {
        return;
      }
      if (!hasValue(fieldId)) {
        nextErrors[fieldId] = `${getFieldLabel(fieldId)} es obligatorio`;
      }
    });
    const documentError = getDocumentoValidationError();
    if (documentError) {
      nextErrors.numeroDocumento = documentError;
    }
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [requiredFieldIds, isFieldRenderable, hasValue, getFieldLabel, getDocumentoValidationError]);

  const handleSaveClick = useCallback(() => {
    if (!validateCustomFields()) {
      return;
    }
    onSave();
  }, [validateCustomFields, onSave]);

  const accionesPersonalizacion = useMemo(
    () => (
      <ClienteFormFieldSelector
        fieldConfigs={fieldConfigs}
        visibleFieldIds={visibleFieldIds}
        requiredFieldIds={requiredFieldIds}
        onToggleVisible={toggleFieldVisible}
        onToggleRequired={toggleFieldRequired}
        onSelectAll={selectAllFields}
        onReset={resetDefaults}
      />
    ),
    [
      fieldConfigs,
      visibleFieldIds,
      requiredFieldIds,
      toggleFieldVisible,
      toggleFieldRequired,
      selectAllFields,
      resetDefaults,
    ]
  );

  useEffect(() => {
    if (!alCambiarAccionesEncabezado) {
      return;
    }

    if (esModoDrawer) {
      alCambiarAccionesEncabezado(accionesPersonalizacion);
    } else {
      alCambiarAccionesEncabezado(null);
    }

    return () => {
      alCambiarAccionesEncabezado(null);
    };
  }, [alCambiarAccionesEncabezado, esModoDrawer, accionesPersonalizacion]);

  return (
    <div
      className={
        esModoDrawer
          ? 'h-full w-full bg-white dark:bg-gray-800 overflow-hidden flex flex-col'
          : 'bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-[1100px] max-h-[85vh] overflow-hidden flex flex-col'
      }
    >
      {!esModoDrawer && (
        <div className="shrink-0 flex items-center justify-between px-6 py-3 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
            </h2>
            {isEditing && (formData.fechaRegistro || formData.fechaUltimaModificacion) && (
              <div className="flex items-center gap-3 mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                {formData.fechaRegistro && (
                  <span>
                    <strong className="font-medium">Creado:</strong> {formatBusinessDateTimeForTicket(formData.fechaRegistro)}
                  </span>
                )}
                {formData.fechaUltimaModificacion && (
                  <span>
                    <strong className="font-medium">Modificado:</strong> {formatBusinessDateTimeForTicket(formData.fechaUltimaModificacion)}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {accionesPersonalizacion}
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <span className="h-5 w-5 text-gray-400 dark:text-gray-300">✕</span>
            </button>
          </div>
        </div>
      )}

      {/* Body con scroll */}
      <div className={`min-h-0 flex-1 overflow-y-auto ${esModoDrawer ? 'px-5 py-4' : 'px-6 py-3'}`}>
        <div className="mb-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-end gap-5" role="tablist" aria-label="Pestañas del formulario de cliente">
            <button
              type="button"
              role="tab"
              aria-selected={pestanaActiva === 'datosPrincipales'}
              onClick={() => setPestanaActiva('datosPrincipales')}
              className={`-mb-px border-b-2 px-0.5 py-1 text-xs font-medium transition-colors ${
                pestanaActiva === 'datosPrincipales'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Datos principales
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={pestanaActiva === 'direcciones'}
              onClick={() => setPestanaActiva('direcciones')}
              className={`-mb-px border-b-2 px-0.5 py-1 text-xs font-medium transition-colors ${
                pestanaActiva === 'direcciones'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Direcciones
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={pestanaActiva === 'contactos'}
              onClick={() => setPestanaActiva('contactos')}
              className={`-mb-px border-b-2 px-0.5 py-1 text-xs font-medium transition-colors ${
                pestanaActiva === 'contactos'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Contactos
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={pestanaActiva === 'configuracionComercial'}
              onClick={() => setPestanaActiva('configuracionComercial')}
              className={`-mb-px border-b-2 px-0.5 py-1 text-xs font-medium transition-colors ${
                pestanaActiva === 'configuracionComercial'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Configuración comercial
            </button>
            {mostrarPestanaDatosSunat && (
              <button
                type="button"
                role="tab"
                aria-selected={pestanaActiva === 'datosSunat'}
                onClick={() => setPestanaActiva('datosSunat')}
                className={`-mb-px border-b-2 px-0.5 py-1 text-xs font-medium transition-colors ${
                  pestanaActiva === 'datosSunat'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                Datos SUNAT
              </button>
            )}
          </div>
        </div>

        {pestanaActiva === 'datosPrincipales' && (
          <>
        {/* SECCIÓN: IDENTIFICACIÓN */}
        <div className="mb-4">

          {/* Tipo de Documento - Pills: RUC | DNI | OTROS */}
          {isFieldRenderable('tipoDocumento') && (
            <div className="mb-2">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Tipo de documento{' '}
                {shouldShowRequiredIndicator('tipoDocumento') && <span className="text-red-500">*</span>}
              </label>
              <div className="flex gap-1.5 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    handleFieldChange('tipoDocumento', '6', 'tipoDocumento');
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
                    handleFieldChange('tipoDocumento', '1', 'tipoDocumento');
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
                  className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-colors flex items-center gap-1 ${
                    formData.tipoDocumento !== '6' && formData.tipoDocumento !== '1'
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                      : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  {formData.tipoDocumento !== '6' && formData.tipoDocumento !== '1' ? getDocLabelFromCode(formData.tipoDocumento) : 'Más'}
                  <span className="text-xs">{showOtrosDocTypes ? '▴' : '▾'}</span>
                </button>
              </div>
              
              {/* Dropdown de otros documentos */}
              {showOtrosDocTypes && (
                <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {tiposDocumento.filter((t) => t.value !== '6' && t.value !== '1').map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 dark:hover:bg-blue-900/30 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors ${
                        formData.tipoDocumento === type.value
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                      onClick={() => {
                        handleFieldChange('tipoDocumento', type.value as ClienteFormData['tipoDocumento'], 'tipoDocumento');
                        setShowOtrosDocTypes(false);
                      }}
                    >
                      <span className="text-xs">{type.label}</span>
                    </button>
                  ))}
                </div>
              )}
              {renderFieldError('tipoDocumento')}
            </div>
          )}

          {/* Número de Documento + Botón RENIEC/SUNAT */}
          {isFieldRenderable('numeroDocumento') && (
            <div className="grid grid-cols-[1fr,auto] gap-2 mb-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Número de documento{' '}
                  {shouldShowRequiredIndicator('numeroDocumento') && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  inputMode={esDNI || esRUC ? 'numeric' : 'text'}
                  value={formData.numeroDocumento}
                  onChange={handleNumeroDocumentoChange}
                  onBlur={handleNumeroDocumentoBlur}
                  maxLength={documentoMaxLength}
                  className={getFieldInputClass(
                    'numeroDocumento',
                    'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 h-9 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                  )}
                  placeholder={esDNI ? '8 dígitos' : esRUC ? '11 dígitos' : 'Documento'}
                />
                {renderFieldError('numeroDocumento')}
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
          )}

          {/* Tipo de Cuenta - Segmented Control */}
          {isFieldRenderable('tipoCuenta') && (
            <div className="mb-2">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Tipo de cuenta {shouldShowRequiredIndicator('tipoCuenta') && <span className="text-red-500">*</span>}
              </label>
              <div className={`inline-flex rounded-md border ${getFieldError('tipoCuenta') ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} overflow-hidden`}>
                {['Cliente', 'Proveedor', 'Cliente-Proveedor'].map((tipo, idx) => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => handleFieldChange('tipoCuenta', tipo as ClienteFormData['tipoCuenta'], 'tipoCuenta')}
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
              {renderFieldError('tipoCuenta')}
            </div>
          )}

          {/* Tipo de Persona - Segmented Control */}
          {isFieldRenderable('tipoPersona') && (
            <div className="mb-2">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Tipo de persona {shouldShowRequiredIndicator('tipoPersona') && <span className="text-red-500">*</span>}
              </label>
              <div className={`inline-flex rounded-md border ${getFieldError('tipoPersona') ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} overflow-hidden`}>
                {['Natural', 'Juridica'].map((tipo, idx) => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => handleFieldChange('tipoPersona', tipo as ClienteFormData['tipoPersona'], 'tipoPersona')}
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
              {renderFieldError('tipoPersona')}
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                Se ajusta automáticamente según el tipo de documento
              </p>
            </div>
          )}
        </div>

        {/* LAYOUT DE DOS COLUMNAS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-5 gap-y-3">
          {/* COLUMNA IZQUIERDA */}
          <div className="space-y-2">
            {/* Razón Social (solo RUC) */}
            {esRUC && (isFieldRenderable('avatar') || isFieldRenderable('razonSocial') || isFieldRenderable('nombreComercial')) && (
              <div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2 pb-1.5 border-b">
                  🏢 Datos de la Empresa
                </h3>
                
                {/* Grid con avatar y campos */}
                <div
                  className={`grid gap-3 mb-2 ${
                    isFieldRenderable('avatar') ? 'grid-cols-[auto,1fr]' : 'grid-cols-1'
                  }`}
                >
                  {/* Avatar del cliente */}
                  {isFieldRenderable('avatar') && (
                    <div className="pt-0.5">
                      <ClienteAvatar
                        imagenes={formData.imagenes || []}
                        onChange={(imagenes: File[]) => {
                          clearFieldError('avatar');
                          onInputChange('imagenes', imagenes);
                        }}
                      />
                      {renderFieldError('avatar')}
                    </div>
                  )}

                  {/* Campos de empresa */}
                  <div className="space-y-2">
                    {isFieldRenderable('razonSocial') && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Razón social{' '}
                          {shouldShowRequiredIndicator('razonSocial') && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="text"
                          value={formData.razonSocial}
                          onChange={(e) => handleFieldChange('razonSocial', e.target.value, 'razonSocial')}
                          className={getFieldInputClass(
                            'razonSocial',
                            'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 h-9 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                          )}
                        />
                        {renderFieldError('razonSocial')}
                      </div>
                    )}
                    {isFieldRenderable('nombreComercial') && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Nombre comercial {shouldShowRequiredIndicator('nombreComercial') && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="text"
                          value={formData.nombreComercial}
                          onChange={(e) => handleFieldChange('nombreComercial', e.target.value, 'nombreComercial')}
                          className={getFieldInputClass(
                            'nombreComercial',
                            'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 h-9 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                          )}
                        />
                        {renderFieldError('nombreComercial')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Nombres (solo Persona Natural) */}
            {!esRUC && (isFieldRenderable('avatar') || isFieldRenderable('primerNombre') || isFieldRenderable('segundoNombre') || isFieldRenderable('apellidoPaterno') || isFieldRenderable('apellidoMaterno') || isFieldRenderable('nombreCompleto')) && (
              <div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2 pb-1.5 border-b">
                  👤 Datos Personales
                </h3>
                
                {/* Grid con avatar y campos */}
                <div
                  className={`grid gap-3 mb-2 ${
                    isFieldRenderable('avatar') ? 'grid-cols-[auto,1fr]' : 'grid-cols-1'
                  }`}
                >
                  {/* Avatar del cliente */}
                  {isFieldRenderable('avatar') && (
                    <div className="pt-0.5">
                      <ClienteAvatar
                        imagenes={formData.imagenes || []}
                        onChange={(imagenes: File[]) => {
                          clearFieldError('avatar');
                          onInputChange('imagenes', imagenes);
                        }}
                      />
                      {renderFieldError('avatar')}
                    </div>
                  )}

                  {/* Campos de persona */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {isFieldRenderable('primerNombre') && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Primer nombre{' '}
                            {shouldShowRequiredIndicator('primerNombre') && <span className="text-red-500">*</span>}
                          </label>
                          <input
                            type="text"
                            value={formData.primerNombre}
                            onChange={(e) => handleFieldChange('primerNombre', e.target.value, 'primerNombre')}
                            className={getFieldInputClass(
                              'primerNombre',
                              'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 h-9 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                            )}
                          />
                          {renderFieldError('primerNombre')}
                        </div>
                      )}
                      {isFieldRenderable('segundoNombre') && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Segundo nombre {shouldShowRequiredIndicator('segundoNombre') && <span className="text-red-500">*</span>}
                          </label>
                          <input
                            type="text"
                            value={formData.segundoNombre}
                            onChange={(e) => handleFieldChange('segundoNombre', e.target.value, 'segundoNombre')}
                            className={getFieldInputClass(
                              'segundoNombre',
                              'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 h-9 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                            )}
                          />
                          {renderFieldError('segundoNombre')}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {isFieldRenderable('apellidoPaterno') && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Apellido paterno{' '}
                            {shouldShowRequiredIndicator('apellidoPaterno') && <span className="text-red-500">*</span>}
                          </label>
                          <input
                            type="text"
                            value={formData.apellidoPaterno}
                            onChange={(e) => handleFieldChange('apellidoPaterno', e.target.value, 'apellidoPaterno')}
                            className={getFieldInputClass(
                              'apellidoPaterno',
                              'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 h-9 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                            )}
                          />
                          {renderFieldError('apellidoPaterno')}
                        </div>
                      )}
                      {isFieldRenderable('apellidoMaterno') && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Apellido materno{' '}
                            {shouldShowRequiredIndicator('apellidoMaterno') && <span className="text-red-500">*</span>}
                          </label>
                          <input
                            type="text"
                            value={formData.apellidoMaterno}
                            onChange={(e) => handleFieldChange('apellidoMaterno', e.target.value, 'apellidoMaterno')}
                            className={getFieldInputClass(
                              'apellidoMaterno',
                              'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 h-9 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                            )}
                          />
                          {renderFieldError('apellidoMaterno')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {isFieldRenderable('nombreCompleto') && (
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
                )}
              </div>
            )}

          </div>

          {/* COLUMNA DERECHA */}
          <div className="space-y-3">
            {/* Estado y Configuración */}
            {(isFieldRenderable('estadoCliente') || isFieldRenderable('motivoDeshabilitacion')) && (
              <div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2 pb-1.5 border-b">
                  ⚙️ Estado y Configuración
                </h3>
                {isFieldRenderable('estadoCliente') && (
                  <div className="mb-2">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Estado de la cuenta{' '}
                      {shouldShowRequiredIndicator('estadoCliente') && <span className="text-red-500">*</span>}
                    </label>
                    <select
                      value={formData.estadoCliente}
                      onChange={(e) =>
                        handleFieldChange(
                          'estadoCliente',
                          e.target.value as ClienteFormData['estadoCliente'],
                          'estadoCliente'
                        )
                      }
                      className={getFieldInputClass(
                        'estadoCliente',
                        'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 h-9 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                      )}
                    >
                      <option value="Habilitado">Habilitado</option>
                      <option value="Deshabilitado">Deshabilitado</option>
                    </select>
                    {renderFieldError('estadoCliente')}
                  </div>
                )}
                {isFieldRenderable('motivoDeshabilitacion') && formData.estadoCliente === 'Deshabilitado' && (
                  <div className="mb-2">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Motivo deshabilitación{' '}
                      {shouldShowRequiredIndicator('motivoDeshabilitacion') && <span className="text-red-500">*</span>}
                    </label>
                    <textarea
                      value={formData.motivoDeshabilitacion}
                      onChange={(e) => handleFieldChange('motivoDeshabilitacion', e.target.value, 'motivoDeshabilitacion')}
                      rows={2}
                      className={getFieldInputClass(
                        'motivoDeshabilitacion',
                        'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none'
                      )}
                    />
                    {renderFieldError('motivoDeshabilitacion')}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
          </>
        )}

        {pestanaActiva === 'configuracionComercial' && (
          <>
            {(isFieldRenderable('formaPago') ||
              isFieldRenderable('monedaPreferida') ||
              isFieldRenderable('listaPrecio') ||
              isFieldRenderable('usuarioAsignado') ||
              isFieldRenderable('observaciones') ||
              isFieldRenderable('archivos')) && (
              <div className="space-y-3">
                {(isFieldRenderable('formaPago') || isFieldRenderable('monedaPreferida') || isFieldRenderable('listaPrecio')) && (
                  <div className="mb-3">
                    <div className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-2 pb-1 border-b border-gray-200 dark:border-gray-700">
                      Preferencias de venta
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {isFieldRenderable('formaPago') && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Forma de pago {shouldShowRequiredIndicator('formaPago') && <span className="text-red-500">*</span>}
                          </label>
                          <select
                            value={formData.formaPago}
                            onChange={(e) =>
                              handleFieldChange('formaPago', e.target.value as ClienteFormData['formaPago'], 'formaPago')
                            }
                            className={getFieldInputClass(
                              'formaPago',
                              'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 h-9 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                            )}
                          >
                            <option value="Contado">Contado</option>
                            <option value="Credito">Crédito</option>
                          </select>
                          {renderFieldError('formaPago')}
                        </div>
                      )}
                      {isFieldRenderable('monedaPreferida') && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Moneda preferida {shouldShowRequiredIndicator('monedaPreferida') && <span className="text-red-500">*</span>}
                          </label>
                          <select
                            value={formData.monedaPreferida}
                            onChange={(e) =>
                              handleFieldChange(
                                'monedaPreferida',
                                e.target.value as ClienteFormData['monedaPreferida'],
                                'monedaPreferida'
                              )
                            }
                            className={getFieldInputClass(
                              'monedaPreferida',
                              'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 h-9 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                            )}
                          >
                            <option value="PEN">Soles (PEN)</option>
                            <option value="USD">Dólares (USD)</option>
                            <option value="EUR">Euros (EUR)</option>
                          </select>
                          {renderFieldError('monedaPreferida')}
                        </div>
                      )}
                      {isFieldRenderable('listaPrecio') && (
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Perfil de precio
                            <span className="ml-1 text-[11px] font-normal text-gray-400 dark:text-gray-500">(Opcional)</span>
                          </label>
                          <select
                            value={formData.listaPrecio}
                            onChange={(e) => handleFieldChange('listaPrecio', e.target.value, 'listaPrecio')}
                            disabled={priceProfiles.length === 0}
                            className={getFieldInputClass(
                              'listaPrecio',
                              'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 h-9 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-800'
                            )}
                          >
                            <option value="">Sin perfil (Precio Base)</option>
                            {priceProfiles.map((profile) => (
                              <option key={profile.id} value={profile.id}>
                                {profile.label}
                              </option>
                            ))}
                          </select>
                          {priceProfiles.length === 0 && (
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              Configura columnas vendibles en Lista de Precios para habilitar perfiles.
                            </p>
                          )}
                          {renderFieldError('listaPrecio')}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {isFieldRenderable('usuarioAsignado') && (
                  <div className="mb-3">
                    <div className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-2 pb-1 border-b border-gray-200 dark:border-gray-700">
                      Gestión interna
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Usuario asignado {shouldShowRequiredIndicator('usuarioAsignado') && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="text"
                        value={formData.usuarioAsignado}
                        onChange={(e) => handleFieldChange('usuarioAsignado', e.target.value, 'usuarioAsignado')}
                        className={getFieldInputClass(
                          'usuarioAsignado',
                          'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 h-9 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                        )}
                        placeholder="Buscar usuario"
                      />
                      {renderFieldError('usuarioAsignado')}
                    </div>
                  </div>
                )}

                {(isFieldRenderable('observaciones') || isFieldRenderable('archivos')) && (
                  <div className="mb-3">
                    <div className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-2 pb-1 border-b border-gray-200 dark:border-gray-700">
                      Notas y archivos
                    </div>
                    {isFieldRenderable('observaciones') && (
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Observaciones {shouldShowRequiredIndicator('observaciones') && <span className="text-red-500">*</span>}
                        </label>
                        <textarea
                          value={formData.observaciones}
                          onChange={(e) => handleFieldChange('observaciones', e.target.value, 'observaciones')}
                          rows={3}
                          className={getFieldInputClass(
                            'observaciones',
                            'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400'
                          )}
                          placeholder="Notas adicionales sobre el cliente"
                        />
                        {renderFieldError('observaciones')}
                      </div>
                    )}

                    {isFieldRenderable('archivos') && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Archivos del cliente
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                          Sube documentos, imágenes u otros archivos relacionados
                        </p>
                        <ArchivosInput
                          archivos={[...(formData.adjuntos || []), ...(formData.imagenes?.slice(1) || [])]}
                          onChange={(archivos) => {
                            clearFieldError('archivos');
                            const imagenes: File[] = [];
                            const documentos: File[] = [];

                            archivos.forEach((file) => {
                              const ext = file.name.split('.').pop()?.toLowerCase();
                              if (ext && ['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
                                imagenes.push(file);
                              } else {
                                documentos.push(file);
                              }
                            });

                            const primeraImagen = formData.imagenes?.[0];
                            onInputChange('imagenes', primeraImagen ? [primeraImagen, ...imagenes] : imagenes);
                            onInputChange('adjuntos', documentos);
                          }}
                          maxArchivos={15}
                        />
                        {renderFieldError('archivos')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {pestanaActiva === 'datosSunat' && (
          <DatosSunatCliente
            tipoContribuyente={formData.tipoContribuyente || ''}
            estadoContribuyente={formData.estadoContribuyente || ''}
            condicionDomicilio={formData.condicionDomicilio || ''}
            fechaInscripcion={formData.fechaInscripcion || ''}
            actividadesEconomicas={formData.actividadesEconomicas || []}
            sistemaEmision={formData.sistemaEmision || ''}
            esEmisorElectronico={formData.esEmisorElectronico}
            cpeHabilitado={formData.cpeHabilitado || []}
            esAgenteRetencion={formData.esAgenteRetencion}
            esAgentePercepcion={formData.esAgentePercepcion}
            esBuenContribuyente={formData.esBuenContribuyente}
            exceptuadaPercepcion={formData.exceptuadaPercepcion}
            onCambioCpeHabilitado={(cpeHabilitado) => handleFieldChange('cpeHabilitado', cpeHabilitado, 'cpeHabilitado')}
            errorCpeHabilitado={getFieldError('cpeHabilitado')}
          />
        )}

        {pestanaActiva === 'contactos' && (
          <>
            {(isFieldRenderable('emails') || isFieldRenderable('telefonos') || isFieldRenderable('paginaWeb')) && (
              <div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2 pb-1.5 border-b">
                  📞 Contactos
                </h3>
                {isFieldRenderable('emails') && (
                  <div className="mb-2">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Correos electrónicos (hasta 3){' '}
                      {shouldShowRequiredIndicator('emails') && <span className="text-red-500">*</span>}
                    </label>
                    <EmailsInput
                      emails={formData.emails || []}
                      onChange={(emails) => handleFieldChange('emails', emails, 'emails')}
                    />
                    {renderFieldError('emails')}
                  </div>
                )}
                {isFieldRenderable('telefonos') && (
                  <div className="mb-2">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Teléfonos (hasta 3){' '}
                      {shouldShowRequiredIndicator('telefonos') && <span className="text-red-500">*</span>}
                    </label>
                    <TelefonosInput
                      telefonos={formData.telefonos || []}
                      onChange={(telefonos) => handleFieldChange('telefonos', telefonos, 'telefonos')}
                    />
                    {renderFieldError('telefonos')}
                  </div>
                )}
                {isFieldRenderable('paginaWeb') && (
                  <div className="mb-2">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Página web {shouldShowRequiredIndicator('paginaWeb') && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="url"
                      value={formData.paginaWeb}
                      onChange={(e) => handleFieldChange('paginaWeb', e.target.value, 'paginaWeb')}
                      className={getFieldInputClass(
                        'paginaWeb',
                        'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 h-9 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                      )}
                      placeholder="https://ejemplo.com"
                    />
                    {renderFieldError('paginaWeb')}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {pestanaActiva === 'direcciones' && (
          <>
            {(isFieldRenderable('pais') ||
              isFieldRenderable('departamento') ||
              isFieldRenderable('provincia') ||
              isFieldRenderable('distrito') ||
              isFieldRenderable('ubigeo') ||
              isFieldRenderable('direccion') ||
              isFieldRenderable('referenciaDireccion')) && (
              <div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2 pb-1.5 border-b">
                  📍 Direcciones
                </h3>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {isFieldRenderable('pais') && (
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        País {shouldShowRequiredIndicator('pais') && <span className="text-red-500">*</span>}
                      </label>
                      <select
                        value={formData.pais}
                        onChange={(e) => handleFieldChange('pais', e.target.value, 'pais')}
                        className={getFieldInputClass(
                          'pais',
                          'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 h-9 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                        )}
                      >
                        <option value="PE">Perú</option>
                        <option value="US">Estados Unidos</option>
                        <option value="ES">España</option>
                      </select>
                      {renderFieldError('pais')}
                    </div>
                  )}
                  {isFieldRenderable('departamento') && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Departamento {shouldShowRequiredIndicator('departamento') && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="text"
                        value={formData.departamento}
                        onChange={(e) => handleFieldChange('departamento', e.target.value, 'departamento')}
                        className={getFieldInputClass(
                          'departamento',
                          'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 h-9 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                        )}
                      />
                      {renderFieldError('departamento')}
                    </div>
                  )}
                  {isFieldRenderable('provincia') && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Provincia {shouldShowRequiredIndicator('provincia') && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="text"
                        value={formData.provincia}
                        onChange={(e) => handleFieldChange('provincia', e.target.value, 'provincia')}
                        className={getFieldInputClass(
                          'provincia',
                          'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 h-9 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                        )}
                      />
                      {renderFieldError('provincia')}
                    </div>
                  )}
                  {isFieldRenderable('distrito') && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Distrito {shouldShowRequiredIndicator('distrito') && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="text"
                        value={formData.distrito}
                        onChange={(e) => handleFieldChange('distrito', e.target.value, 'distrito')}
                        className={getFieldInputClass(
                          'distrito',
                          'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 h-9 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                        )}
                      />
                      {renderFieldError('distrito')}
                    </div>
                  )}
                  {isFieldRenderable('ubigeo') && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Ubigeo {shouldShowRequiredIndicator('ubigeo') && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="text"
                        value={formData.ubigeo}
                        onChange={(e) => handleFieldChange('ubigeo', e.target.value, 'ubigeo')}
                        maxLength={6}
                        className={getFieldInputClass(
                          'ubigeo',
                          'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 h-9 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                        )}
                        placeholder="6 dígitos"
                      />
                      {renderFieldError('ubigeo')}
                    </div>
                  )}
                </div>
                {isFieldRenderable('direccion') && (
                  <div className="mb-2">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Dirección {shouldShowRequiredIndicator('direccion') && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      value={formData.direccion}
                      onChange={(e) => handleFieldChange('direccion', e.target.value, 'direccion')}
                      className={getFieldInputClass(
                        'direccion',
                        'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 h-9 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                      )}
                    />
                    {renderFieldError('direccion')}
                  </div>
                )}
                {isFieldRenderable('referenciaDireccion') && (
                  <div className="mb-2">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Referencia {shouldShowRequiredIndicator('referenciaDireccion') && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      value={formData.referenciaDireccion}
                      onChange={(e) => handleFieldChange('referenciaDireccion', e.target.value, 'referenciaDireccion')}
                      className={getFieldInputClass(
                        'referenciaDireccion',
                        'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 h-9 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                      )}
                      placeholder="Ej: Al costado del mercado"
                    />
                    {renderFieldError('referenciaDireccion')}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
        <button
          onClick={onCancel}
          className="px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-full hover:bg-gray-200 dark:hover:bg-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSaveClick}
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
