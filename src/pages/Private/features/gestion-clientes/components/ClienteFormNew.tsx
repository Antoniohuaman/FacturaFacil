import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useConsultasExternas } from '../hooks';
import type { ClienteFormData } from '../models';
import { onlyDigits, getDocLabelFromCode } from '../utils/documents';
import TelefonosInput from './TelefonosInput';
import EmailsInput from './EmailsInput';
import ArchivosInput from './ArchivosInput';
import ClienteAvatar from './ClienteAvatar';
import DatosSunatCliente from './DatosSunatCliente';
import {
  CAMPOS_REQUERIDOS_FORMULARIO,
  CLIENTE_FIELD_CONFIGS,
  type ClienteFieldId,
} from './clienteFormConfig';
import {
  listarDepartamentos,
  listarDistritos,
  listarProvincias,
  obtenerUbigeo,
} from '@/shared/catalogos/ubigeo.pe';
import { formatBusinessDateTimeForTicket } from '@/shared/time/businessTime';
import { usePriceProfilesCatalog } from '../../lista-precios/hooks/usePriceProfilesCatalog';

type ClienteFormProps = {
  formData: ClienteFormData;
  onInputChange: (field: keyof ClienteFormData, value: ClienteFormData[keyof ClienteFormData]) => void;
  onCancel: () => void;
  onSave: (options?: { crearOtro?: boolean }) => Promise<boolean | void> | boolean | void;
  isEditing?: boolean;
  modoPresentacion?: 'modal' | 'drawer';
};

const PRIMARY_COLOR = '#1478D4';

type IdentificadorPestanaCliente = 'datosPrincipales' | 'direcciones' | 'contactos' | 'configuracionComercial' | 'datosSunat';

type DireccionUI = {
  id: string;
  pais: string;
  departamento: string;
  provincia: string;
  distrito: string;
  ubigeo: string;
  direccion: string;
  referenciaDireccion: string;
};

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
}) => {
  const { consultingReniec, consultingSunat, consultarReniec, consultarSunat } = useConsultasExternas();
  const { profiles: priceProfiles } = usePriceProfilesCatalog();
  const [showOtrosDocTypes, setShowOtrosDocTypes] = useState(false);
  const [crearOtro, setCrearOtro] = useState(false);
  const selectorDocumentosRef = useRef<HTMLDivElement>(null);
  const modalDireccionRef = useRef<HTMLDivElement>(null);
  const firstDireccionInputRef = useRef<HTMLSelectElement | null>(null);
  const [pestanaActiva, setPestanaActiva] = useState<IdentificadorPestanaCliente>('datosPrincipales');
  const fieldConfigs = CLIENTE_FIELD_CONFIGS;
  const requiredFieldIds = CAMPOS_REQUERIDOS_FORMULARIO;
  const camposRequeridosSet = useMemo(
    () => new Set<ClienteFieldId>(requiredFieldIds),
    [requiredFieldIds]
  );
  
  const isConsulting = consultingReniec || consultingSunat;
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ClienteFieldId, string>>>({});
  const direccionesInicializadasRef = useRef(false);
  const [direccionesUI, setDireccionesUI] = useState<DireccionUI[]>([]);
  const [direccionPrincipalId, setDireccionPrincipalId] = useState<string | null>(null);
  const [direccionEditorAbierto, setDireccionEditorAbierto] = useState(false);
  const [direccionEditandoId, setDireccionEditandoId] = useState<string | null>(null);
  const [marcarDireccionComoPrincipal, setMarcarDireccionComoPrincipal] = useState(false);
  const [direccionDraft, setDireccionDraft] = useState<DireccionUI>({
    id: '',
    pais: 'PE',
    departamento: '',
    provincia: '',
    distrito: '',
    ubigeo: '',
    direccion: '',
    referenciaDireccion: '',
  });
  const fieldLabelMap = useMemo(() => new Map(fieldConfigs.map((field) => [field.id, field.label])), [fieldConfigs]);
  const esModoDrawer = modoPresentacion === 'drawer';
  const nombreClienteContexto =
    formData.razonSocial?.trim() || formData.nombreCompleto?.trim() || undefined;

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

  const buildDireccionPrincipalDesdeForm = useCallback(
    (): DireccionUI => ({
      id: 'direccion-main',
      pais: formData.pais || 'PE',
      departamento: formData.departamento || '',
      provincia: formData.provincia || '',
      distrito: formData.distrito || '',
      ubigeo: formData.ubigeo || '',
      direccion: formData.direccion || '',
      referenciaDireccion: formData.referenciaDireccion || '',
    }),
    [
      formData.pais,
      formData.departamento,
      formData.provincia,
      formData.distrito,
      formData.ubigeo,
      formData.direccion,
      formData.referenciaDireccion,
    ]
  );

  const syncLegacyFromDireccion = useCallback(
    (direccion: DireccionUI) => {
      handleFieldChange('pais', direccion.pais || 'PE', 'pais');
      handleFieldChange('departamento', direccion.departamento, 'departamento');
      handleFieldChange('provincia', direccion.provincia, 'provincia');
      handleFieldChange('distrito', direccion.distrito, 'distrito');
      handleFieldChange('ubigeo', direccion.ubigeo, 'ubigeo');
      handleFieldChange('direccion', direccion.direccion, 'direccion');
      handleFieldChange('referenciaDireccion', direccion.referenciaDireccion, 'referenciaDireccion');
    },
    [handleFieldChange]
  );

  const clearLegacyDireccion = useCallback(() => {
    handleFieldChange('pais', 'PE', 'pais');
    handleFieldChange('departamento', '', 'departamento');
    handleFieldChange('provincia', '', 'provincia');
    handleFieldChange('distrito', '', 'distrito');
    handleFieldChange('ubigeo', '', 'ubigeo');
    handleFieldChange('direccion', '', 'direccion');
    handleFieldChange('referenciaDireccion', '', 'referenciaDireccion');
  }, [handleFieldChange]);

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

  useEffect(() => {
    if (!showOtrosDocTypes) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!selectorDocumentosRef.current?.contains(event.target as Node)) {
        setShowOtrosDocTypes(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowOtrosDocTypes(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showOtrosDocTypes]);

  useEffect(() => {
    if (direccionesInicializadasRef.current) {
      return;
    }
    const principal = buildDireccionPrincipalDesdeForm();
    direccionesInicializadasRef.current = true;
    setDireccionesUI([principal]);
    setDireccionPrincipalId(principal.id);
  }, [buildDireccionPrincipalDesdeForm]);

  useEffect(() => {
    if (!direccionPrincipalId) {
      return;
    }
    const principalDesdeForm = buildDireccionPrincipalDesdeForm();
    setDireccionesUI((prev) => {
      const index = prev.findIndex((direccion) => direccion.id === direccionPrincipalId);
      if (index === -1) {
        return prev;
      }
      const actual = prev[index];
      const nextPrincipal: DireccionUI = {
        ...actual,
        pais: principalDesdeForm.pais,
        departamento: principalDesdeForm.departamento,
        provincia: principalDesdeForm.provincia,
        distrito: principalDesdeForm.distrito,
        ubigeo: principalDesdeForm.ubigeo,
        direccion: principalDesdeForm.direccion,
        referenciaDireccion: principalDesdeForm.referenciaDireccion,
      };
      const sinCambios =
        actual.pais === nextPrincipal.pais &&
        actual.departamento === nextPrincipal.departamento &&
        actual.provincia === nextPrincipal.provincia &&
        actual.distrito === nextPrincipal.distrito &&
        actual.ubigeo === nextPrincipal.ubigeo &&
        actual.direccion === nextPrincipal.direccion &&
        actual.referenciaDireccion === nextPrincipal.referenciaDireccion;

      if (sinCambios) {
        return prev;
      }

      const next = [...prev];
      next[index] = nextPrincipal;
      return next;
    });
  }, [
    direccionPrincipalId,
    buildDireccionPrincipalDesdeForm,
    formData.pais,
    formData.departamento,
    formData.provincia,
    formData.distrito,
    formData.ubigeo,
    formData.direccion,
    formData.referenciaDireccion,
  ]);

  useEffect(() => {
    if (!direccionEditorAbierto) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDireccionEditorAbierto(false);
        setDireccionEditandoId(null);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [direccionEditorAbierto]);

  useEffect(() => {
    if (!direccionEditorAbierto) {
      return;
    }
    firstDireccionInputRef.current?.focus();
  }, [direccionEditorAbierto]);

  const resetDireccionDraft = useCallback((direccion?: DireccionUI) => {
    setDireccionDraft(
      direccion ?? {
        id: `direccion-ui-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        pais: formData.pais || 'PE',
        departamento: '',
        provincia: '',
        distrito: '',
        ubigeo: '',
        direccion: '',
        referenciaDireccion: '',
      }
    );
  }, [formData.pais]);

  const abrirEditorDireccion = useCallback((direccion?: DireccionUI) => {
    if (direccion) {
      setDireccionEditandoId(direccion.id);
      resetDireccionDraft(direccion);
      setMarcarDireccionComoPrincipal(direccion.id === direccionPrincipalId);
    } else {
      setDireccionEditandoId(null);
      resetDireccionDraft();
      setMarcarDireccionComoPrincipal(!direccionPrincipalId);
    }
    setDireccionEditorAbierto(true);
  }, [resetDireccionDraft, direccionPrincipalId]);

  const ordenarConPrincipalPrimero = useCallback((items: DireccionUI[], principalId: string | null) => {
    if (!principalId) {
      return items;
    }
    const principal = items.find((item) => item.id === principalId);
    if (!principal) {
      return items;
    }
    return [principal, ...items.filter((item) => item.id !== principalId)];
  }, []);

  const seleccionarDireccionPrincipal = useCallback(
    (direccionId: string) => {
      setDireccionesUI((prev) => {
        const seleccionada = prev.find((direccion) => direccion.id === direccionId);
        if (!seleccionada) {
          return prev;
        }
        syncLegacyFromDireccion(seleccionada);
        return ordenarConPrincipalPrimero(prev, direccionId);
      });
      setDireccionPrincipalId(direccionId);
    },
    [ordenarConPrincipalPrimero, syncLegacyFromDireccion]
  );

  const guardarDireccionEditor = useCallback(() => {
    const draftFinal: DireccionUI = {
      ...direccionDraft,
      id: direccionDraft.id || `direccion-ui-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      pais: direccionDraft.pais || 'PE',
    };

    let principalIdFinal = direccionPrincipalId;
    if (marcarDireccionComoPrincipal) {
      principalIdFinal = direccionEditandoId ?? draftFinal.id;
      setDireccionPrincipalId(principalIdFinal);
      syncLegacyFromDireccion(draftFinal);
    }

    setDireccionesUI((prev) => {
      const actualizadas = direccionEditandoId
        ? prev.map((direccion) => (direccion.id === direccionEditandoId ? draftFinal : direccion))
        : [...prev, draftFinal];

      return ordenarConPrincipalPrimero(actualizadas, principalIdFinal);
    });

    setDireccionEditorAbierto(false);
    setDireccionEditandoId(null);
    setMarcarDireccionComoPrincipal(false);
  }, [
    direccionDraft,
    direccionEditandoId,
    direccionPrincipalId,
    marcarDireccionComoPrincipal,
    ordenarConPrincipalPrimero,
    syncLegacyFromDireccion,
  ]);

  const eliminarDireccion = useCallback(
    (direccionId: string) => {
      const eraPrincipal = direccionId === direccionPrincipalId;
      setDireccionesUI((prev) => prev.filter((direccion) => direccion.id !== direccionId));

      if (eraPrincipal) {
        setDireccionPrincipalId(null);
        clearLegacyDireccion();
      }
    },
    [clearLegacyDireccion, direccionPrincipalId]
  );

  const opcionesDepartamento = useMemo(() => listarDepartamentos(), []);

  const opcionesProvincia = useMemo(
    () => listarProvincias(direccionDraft.departamento),
    [direccionDraft.departamento]
  );

  const opcionesDistrito = useMemo(
    () => listarDistritos(direccionDraft.departamento, direccionDraft.provincia),
    [direccionDraft.departamento, direccionDraft.provincia]
  );

  const direccionSubtitulo = useCallback((direccion: DireccionUI) => {
    const base = [direccion.distrito, direccion.provincia, direccion.departamento, direccion.pais]
      .map((item) => item?.trim())
      .filter(Boolean)
      .join(' · ');

    return base || 'Sin ubicación';
  }, []);

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
    (fieldId: ClienteFieldId) => isFieldBusinessEnabled(fieldId),
    [isFieldBusinessEnabled]
  );

  const shouldShowRequiredIndicator = useCallback(
    (fieldId: ClienteFieldId, extra = true) => extra && camposRequeridosSet.has(fieldId),
    [camposRequeridosSet]
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
    const executeSave = async () => {
      if (!validateCustomFields()) {
        return;
      }

      const saveResult = await onSave({ crearOtro: !isEditing && crearOtro });

      if (!isEditing && crearOtro && saveResult === true) {
        setFieldErrors({});
        setPestanaActiva('datosPrincipales');
        setShowOtrosDocTypes(false);
      }
    };

    void executeSave();
  }, [validateCustomFields, onSave, isEditing, crearOtro]);

  return (
    <div
      className={
        esModoDrawer
          ? 'h-full w-full bg-white dark:bg-gray-800 overflow-hidden flex flex-col'
          : 'bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-[1100px] max-h-[85vh] overflow-hidden flex flex-col'
      }
    >
      {!esModoDrawer && (
        <div className="shrink-0 flex items-center justify-between px-5 py-2.5 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
            </h2>
            {isEditing && nombreClienteContexto && (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{nombreClienteContexto}</p>
            )}
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
            <button
              onClick={onCancel}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <span className="h-5 w-5 text-gray-400 dark:text-gray-300">✕</span>
            </button>
          </div>
        </div>
      )}

      {/* Body con scroll */}
      <div className={`min-h-0 flex-1 overflow-y-auto ${esModoDrawer ? 'px-4 py-3' : 'px-5 py-3'}`}>
        <div className="mb-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-end gap-4" role="tablist" aria-label="Pestañas del formulario de cliente">
            <button
              type="button"
              role="tab"
              aria-selected={pestanaActiva === 'datosPrincipales'}
              onClick={() => setPestanaActiva('datosPrincipales')}
              className={`-mb-px border-b-2 px-0.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
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
              className={`-mb-px border-b-2 px-0.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
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
              className={`-mb-px border-b-2 px-0.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
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
              className={`-mb-px border-b-2 px-0.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
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
                className={`-mb-px border-b-2 px-0.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
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
        <div className="mb-3 space-y-2.5">

          <div className="grid grid-cols-1 md:grid-cols-[auto,1fr] items-start gap-2.5">
            {isFieldRenderable('tipoDocumento') && (
              <div ref={selectorDocumentosRef} className="relative">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tipo de documento{' '}
                  {shouldShowRequiredIndicator('tipoDocumento') && <span className="text-red-500">*</span>}
                </label>
                <div className="flex flex-wrap md:flex-nowrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      handleFieldChange('tipoDocumento', '6', 'tipoDocumento');
                      setShowOtrosDocTypes(false);
                    }}
                    className={`h-7 px-2.5 rounded-md border text-[11px] font-medium transition-colors inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      formData.tipoDocumento === '6'
                        ? 'border-blue-500 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30'
                        : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full border ${formData.tipoDocumento === '6' ? 'bg-blue-600 border-blue-600' : 'border-gray-400 dark:border-gray-500'}`} aria-hidden="true" />
                    RUC
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleFieldChange('tipoDocumento', '1', 'tipoDocumento');
                      setShowOtrosDocTypes(false);
                    }}
                    className={`h-7 px-2.5 rounded-md border text-[11px] font-medium transition-colors inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      formData.tipoDocumento === '1'
                        ? 'border-blue-500 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30'
                        : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full border ${formData.tipoDocumento === '1' ? 'bg-blue-600 border-blue-600' : 'border-gray-400 dark:border-gray-500'}`} aria-hidden="true" />
                    DNI
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowOtrosDocTypes(!showOtrosDocTypes)}
                    className={`h-7 px-2.5 rounded-md border text-[11px] font-medium transition-colors inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      formData.tipoDocumento !== '6' && formData.tipoDocumento !== '1'
                        ? 'border-blue-500 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30'
                        : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full border ${formData.tipoDocumento !== '6' && formData.tipoDocumento !== '1' ? 'bg-blue-600 border-blue-600' : 'border-gray-400 dark:border-gray-500'}`} aria-hidden="true" />
                    <span className="whitespace-nowrap">Otros documentos</span>
                    {formData.tipoDocumento !== '6' && formData.tipoDocumento !== '1' && (
                      <span className="max-w-28 truncate text-[10px] text-gray-500 dark:text-gray-300" title={getDocLabelFromCode(formData.tipoDocumento)}>
                        {getDocLabelFromCode(formData.tipoDocumento)}
                      </span>
                    )}
                    <span className="text-[10px]">{showOtrosDocTypes ? '▴' : '▾'}</span>
                  </button>
                </div>

                {showOtrosDocTypes && (
                  <div className="absolute left-0 top-full z-50 mt-1 w-72 max-w-[min(18rem,calc(100vw-2rem))] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-56 overflow-y-auto">
                    {tiposDocumento.filter((t) => t.value !== '6' && t.value !== '1').map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        className={`w-full text-left px-2.5 py-1.5 text-xs hover:bg-blue-50 dark:hover:bg-blue-900/30 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                          formData.tipoDocumento === type.value
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                        onClick={() => {
                          handleFieldChange('tipoDocumento', type.value as ClienteFormData['tipoDocumento'], 'tipoDocumento');
                          setShowOtrosDocTypes(false);
                        }}
                      >
                        <span className="block truncate text-xs" title={type.label}>{type.label}</span>
                      </button>
                    ))}
                  </div>
                )}
                {renderFieldError('tipoDocumento')}
              </div>
            )}

            {isFieldRenderable('numeroDocumento') && (
              <div className="md:flex md:flex-col md:items-end">
                <label className="block w-full max-w-[24rem] text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 md:text-right">
                  Número de documento{' '}
                  {shouldShowRequiredIndicator('numeroDocumento') && <span className="text-red-500">*</span>}
                </label>
                {esRUC || esDNI ? (
                  <div className="inline-flex w-full max-w-[24rem] md:justify-end">
                    <input
                      type="text"
                      inputMode={esDNI || esRUC ? 'numeric' : 'text'}
                      value={formData.numeroDocumento}
                      onChange={handleNumeroDocumentoChange}
                      onBlur={handleNumeroDocumentoBlur}
                      maxLength={documentoMaxLength}
                      className={getFieldInputClass(
                        'numeroDocumento',
                        'flex-1 min-w-0 border border-gray-300 dark:border-gray-600 rounded-l-md border-r-0 px-2.5 h-7 text-[11px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                      )}
                      placeholder={esDNI ? '8 dígitos' : '11 dígitos'}
                    />
                    <button
                      type="button"
                      onClick={esRUC ? handleConsultarSunat : handleConsultarReniec}
                      disabled={
                        isConsulting ||
                        !formData.numeroDocumento ||
                        (esDNI && formData.numeroDocumento.length !== 8) ||
                        (esRUC && formData.numeroDocumento.length !== 11)
                      }
                      className={`h-7 px-3 rounded-r-md border text-[11px] font-medium uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        isConsulting ||
                        !formData.numeroDocumento ||
                        (esDNI && formData.numeroDocumento.length !== 8) ||
                        (esRUC && formData.numeroDocumento.length !== 11)
                          ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                          : 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40'
                      }`}
                    >
                      {isConsulting ? (
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-[10px]">...</span>
                        </div>
                      ) : (
                        esRUC ? 'SUNAT' : 'RENIEC'
                      )}
                    </button>
                  </div>
                ) : (
                  <input
                    type="text"
                    inputMode={esDNI || esRUC ? 'numeric' : 'text'}
                    value={formData.numeroDocumento}
                    onChange={handleNumeroDocumentoChange}
                    onBlur={handleNumeroDocumentoBlur}
                    maxLength={documentoMaxLength}
                    className={getFieldInputClass(
                      'numeroDocumento',
                      'w-full max-w-[24rem] border border-gray-300 dark:border-gray-600 rounded-md px-2.5 h-7 text-[11px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                    )}
                    placeholder="Documento"
                  />
                )}
                {renderFieldError('numeroDocumento')}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {isFieldRenderable('tipoCuenta') && (
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tipo de cuenta {shouldShowRequiredIndicator('tipoCuenta') && <span className="text-red-500">*</span>}
                </label>
                <div
                  className={`inline-flex p-0.5 rounded-lg bg-gray-100 dark:bg-gray-700 ${
                    getFieldError('tipoCuenta') ? 'ring-1 ring-red-500' : ''
                  }`}
                >
                  {['Cliente', 'Proveedor', 'Cliente-Proveedor'].map((tipo) => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => handleFieldChange('tipoCuenta', tipo as ClienteFormData['tipoCuenta'], 'tipoCuenta')}
                      className={`h-7 px-2.5 rounded-md text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        formData.tipoCuenta === tipo
                          ? 'border border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      {tipo}
                    </button>
                  ))}
                </div>
                {renderFieldError('tipoCuenta')}
              </div>
            )}

            {isFieldRenderable('tipoPersona') && (
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tipo de persona {shouldShowRequiredIndicator('tipoPersona') && <span className="text-red-500">*</span>}
                </label>
                <div
                  className={`inline-flex p-0.5 rounded-lg bg-gray-100 dark:bg-gray-700 ${
                    getFieldError('tipoPersona') ? 'ring-1 ring-red-500' : ''
                  }`}
                >
                  {['Natural', 'Juridica'].map((tipo) => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => handleFieldChange('tipoPersona', tipo as ClienteFormData['tipoPersona'], 'tipoPersona')}
                      className={`h-7 px-2.5 rounded-md text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        formData.tipoPersona === tipo
                          ? 'border border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      {tipo === 'Juridica' ? 'Jurídica' : tipo}
                    </button>
                  ))}
                </div>
                {renderFieldError('tipoPersona')}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
            {/* Razón Social (solo RUC) */}
            {esRUC && (isFieldRenderable('avatar') || isFieldRenderable('razonSocial') || isFieldRenderable('nombreComercial')) && (
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1 pb-1 border-b border-gray-200 dark:border-gray-700">
                  Datos de la empresa
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
                            'w-full border border-gray-300 dark:border-gray-600 rounded-md px-2.5 h-8 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
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
                            'w-full border border-gray-300 dark:border-gray-600 rounded-md px-2.5 h-8 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
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
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1 pb-1 border-b border-gray-200 dark:border-gray-700">
                  Datos personales
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
                              'w-full border border-gray-300 dark:border-gray-600 rounded-md px-2.5 h-8 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
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
                              'w-full border border-gray-300 dark:border-gray-600 rounded-md px-2.5 h-8 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
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
                              'w-full border border-gray-300 dark:border-gray-600 rounded-md px-2.5 h-8 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
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
                              'w-full border border-gray-300 dark:border-gray-600 rounded-md px-2.5 h-8 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
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
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-2.5 h-8 text-xs bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 cursor-not-allowed"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Estado y Configuración */}
            {(isFieldRenderable('estadoCliente') || isFieldRenderable('motivoDeshabilitacion')) && (
              <div className="pt-1">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1 pb-1 border-b border-gray-200 dark:border-gray-700">
                  Estado y configuración
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
                        'w-full max-w-xs border border-gray-300 dark:border-gray-600 rounded-md px-2.5 h-8 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
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
                        'w-full border border-gray-300 dark:border-gray-600 rounded-md px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none'
                      )}
                    />
                    {renderFieldError('motivoDeshabilitacion')}
                  </div>
                )}
              </div>
            )}

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
                <h3 className="mb-2 border-b pb-1.5 text-sm font-semibold text-gray-800 dark:text-gray-200">
                  📍 Direcciones
                </h3>

                <div className="mb-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => abrirEditorDireccion()}
                    className="inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-900/20"
                    aria-label="Agregar dirección"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Agregar
                  </button>
                </div>

                <div className="space-y-2">
                  {direccionesUI.map((direccion) => {
                    const esPrincipal = direccion.id === direccionPrincipalId;
                    const titulo = direccion.direccion?.trim() || 'Sin dirección';
                    const subtitulo = direccionSubtitulo(direccion);

                    return (
                      <div
                        key={direccion.id}
                        className="rounded-md border border-gray-200/80 bg-white px-2.5 py-2 dark:border-gray-700 dark:bg-gray-800"
                      >
                        <div className="flex items-start gap-2">
                          <input
                            type="radio"
                            name="direccion-principal"
                            checked={esPrincipal}
                            onChange={() => seleccionarDireccionPrincipal(direccion.id)}
                            className="mt-0.5 h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                            aria-label={`Marcar dirección ${titulo} como principal`}
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-gray-900 dark:text-gray-100" title={titulo}>
                                  {titulo}
                                </p>
                                <p className="mt-0.5 truncate text-[11px] text-gray-500 dark:text-gray-400" title={subtitulo}>
                                  {subtitulo}
                                  {direccion.ubigeo?.trim() && (
                                    <span className="ml-1 text-[10px] text-gray-400 dark:text-gray-500">UBI {direccion.ubigeo.trim()}</span>
                                  )}
                                </p>
                              </div>

                              {esPrincipal && (
                                <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                                  Principal
                                </span>
                              )}
                            </div>

                            {direccion.referenciaDireccion?.trim() && (
                              <p className="mt-1 truncate text-[11px] text-gray-500 dark:text-gray-400" title={direccion.referenciaDireccion}>
                                {direccion.referenciaDireccion}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => abrirEditorDireccion(direccion)}
                              className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
                              aria-label="Editar dirección"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => eliminarDireccion(direccion.id)}
                              className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
                              aria-label="Eliminar dirección"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {direccionesUI.length === 0 && (
                    <p className="py-2 text-xs text-gray-500 dark:text-gray-400">Sin direcciones</p>
                  )}
                </div>

                {direccionEditorAbierto && (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
                    onMouseDown={(event) => {
                      if (modalDireccionRef.current && !modalDireccionRef.current.contains(event.target as Node)) {
                        setDireccionEditorAbierto(false);
                        setDireccionEditandoId(null);
                      }
                    }}
                  >
                    <div
                      ref={modalDireccionRef}
                      className="w-full max-w-xl rounded-lg border border-gray-200 bg-white p-3.5 shadow-xl dark:border-gray-700 dark:bg-gray-800"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {direccionEditandoId ? 'Editar dirección' : 'Agregar dirección'}
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            setDireccionEditorAbierto(false);
                            setDireccionEditandoId(null);
                          }}
                          className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                          aria-label="Cerrar editor de dirección"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Dirección</label>
                          <input
                            type="text"
                            value={direccionDraft.direccion}
                            onChange={(event) => setDireccionDraft((prev) => ({ ...prev, direccion: event.target.value }))}
                            placeholder="Calle / jirón / número"
                            className="h-8 w-full rounded-md border border-gray-300 bg-white px-2.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">País</label>
                          <select
                            ref={firstDireccionInputRef}
                            value={direccionDraft.pais}
                            onChange={(event) => setDireccionDraft((prev) => ({ ...prev, pais: event.target.value }))}
                            className="h-8 w-full rounded-md border border-gray-300 bg-white px-2.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          >
                            <option value="PE">Perú</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Departamento</label>
                          <select
                            value={direccionDraft.departamento}
                            onChange={(event) =>
                              setDireccionDraft((prev) => ({
                                ...prev,
                                departamento: event.target.value,
                                provincia: '',
                                distrito: '',
                                ubigeo: '',
                              }))
                            }
                            className="h-8 w-full rounded-md border border-gray-300 bg-white px-2.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          >
                            <option value="">Seleccionar</option>
                            {opcionesDepartamento.map((opcion) => (
                              <option key={opcion} value={opcion}>{opcion}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Provincia</label>
                          <select
                            value={direccionDraft.provincia}
                            onChange={(event) =>
                              setDireccionDraft((prev) => ({
                                ...prev,
                                provincia: event.target.value,
                                distrito: '',
                                ubigeo: '',
                              }))
                            }
                            className="h-8 w-full rounded-md border border-gray-300 bg-white px-2.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          >
                            <option value="">Seleccionar</option>
                            {opcionesProvincia.map((opcion) => (
                              <option key={opcion} value={opcion}>{opcion}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Distrito</label>
                          <select
                            value={direccionDraft.distrito}
                            onChange={(event) => {
                              const distrito = event.target.value;
                              const ubigeoDetectado = obtenerUbigeo(
                                direccionDraft.departamento,
                                direccionDraft.provincia,
                                distrito
                              );
                              setDireccionDraft((prev) => ({
                                ...prev,
                                distrito,
                                ubigeo: ubigeoDetectado || prev.ubigeo,
                              }));
                            }}
                            className="h-8 w-full rounded-md border border-gray-300 bg-white px-2.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          >
                            <option value="">Seleccionar</option>
                            {opcionesDistrito.map((opcion) => (
                              <option key={opcion} value={opcion}>{opcion}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Ubigeo</label>
                          <input
                            type="text"
                            maxLength={6}
                            value={direccionDraft.ubigeo}
                            onChange={(event) => setDireccionDraft((prev) => ({ ...prev, ubigeo: event.target.value }))}
                            placeholder="Opcional"
                            className="h-8 w-full rounded-md border border-gray-300 bg-white px-2.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Referencia</label>
                          <input
                            type="text"
                            value={direccionDraft.referenciaDireccion}
                            onChange={(event) => setDireccionDraft((prev) => ({ ...prev, referenciaDireccion: event.target.value }))}
                            placeholder="Opcional"
                            className="h-8 w-full rounded-md border border-gray-300 bg-white px-2.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          />
                        </div>

                        <label className="sm:col-span-2 inline-flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={marcarDireccionComoPrincipal}
                            onChange={(event) => setMarcarDireccionComoPrincipal(event.target.checked)}
                            className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          Marcar como principal
                        </label>
                      </div>

                      <div className="mt-3 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setDireccionEditorAbierto(false);
                            setDireccionEditandoId(null);
                          }}
                          className="h-7 rounded-md px-2.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={guardarDireccionEditor}
                          className="h-7 rounded-md border border-blue-600 bg-blue-600 px-2.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
                        >
                          Guardar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-2.5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
        {!isEditing ? (
          <label className="inline-flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              checked={crearOtro}
              onChange={(event) => setCrearOtro(event.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Crear otro</span>
          </label>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="h-8 px-3 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Cancelar
          </button>
          <button
            onClick={handleSaveClick}
            className="h-8 px-3 text-xs font-medium text-white border rounded-md hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            style={{ backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR }}
          >
            {isEditing ? 'Actualizar' : 'Crear cliente'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClienteFormNew;
