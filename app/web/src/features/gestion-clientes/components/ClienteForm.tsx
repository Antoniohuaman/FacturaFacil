// Wrapper de compatibilidad para módulos legacy que usan la interfaz antigua de ClienteForm
import React, { useMemo } from 'react';
import ClienteFormNew from './ClienteFormNew';
import type { ClienteFormData, DocumentType } from '../models';
import { formatBusinessDateTimeIso } from '@/shared/time/businessTime';
import { documentCodeFromType, documentTypeFromCode } from '../utils/documents';

type ClienteFormValue = ClienteFormData[keyof ClienteFormData];

// Props legacy que esperan los módulos de comprobantes
interface ClienteFormLegacyProps {
  formData: {
    documentNumber: string;
    legalName: string;
    address: string;
    gender: string;
    phone: string;
    email: string;
    additionalData: string;
  };
  documentType?: string;
  clientType?: string;
  documentTypes?: Array<{ value: string; label: string }>;
  clientTypes?: Array<{ value: string; label: string }>;
  onInputChange: (field: string, value: string) => void;
  onDocumentTypeChange?: (value: string) => void;
  onClientTypeChange?: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isEditing?: boolean;
}

const ClienteForm: React.FC<ClienteFormLegacyProps> = (props) => {
  // Convertir del formato legacy al nuevo formato
  const adaptedFormData: ClienteFormData = useMemo(() => ({
    // Identificación
    // Fuente de verdad interna: código SUNAT ('6','1','7','4','A',...)
    // Aceptar tanto tokens legacy ('RUC'|'DNI'|...) como códigos ya normalizados.
    tipoDocumento: (() => {
      const raw = (props.documentType || '').trim();
      if (!raw) return '6';
      const asCode = documentTypeFromCode(raw.toUpperCase()) ? raw.toUpperCase() : documentCodeFromType(raw as DocumentType);
      return (asCode as string) || '6';
    })(),
    numeroDocumento: props.formData.documentNumber || '',
    tipoPersona: (() => {
      const raw = (props.documentType || '').trim();
      const code = documentTypeFromCode(raw.toUpperCase()) ? raw.toUpperCase() : documentCodeFromType(raw as DocumentType);
      return code === '6' ? 'Juridica' : 'Natural';
    })(),
    tipoCuenta: (props.clientType as ClienteFormData['tipoCuenta']) || 'Cliente',
    
    // Razón Social (Jurídica)
    razonSocial: props.formData.legalName || '',
    nombreComercial: '',
    
    // Nombres (Natural)
    primerNombre: '',
    segundoNombre: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    nombreCompleto: props.formData.legalName || '',
    
    // Contacto
    emails: props.formData.email ? [props.formData.email] : [],
    telefonos: props.formData.phone ? [{ numero: props.formData.phone, tipo: 'Móvil' }] : [],
    paginaWeb: '',
    
    // Ubicación
    pais: 'PE',
    departamento: '',
    provincia: '',
    distrito: '',
    ubigeo: '',
    direccion: props.formData.address || '',
    referenciaDireccion: '',
    
    // Estado
    tipoCliente: 'Natural',
    estadoCliente: 'Habilitado',
    motivoDeshabilitacion: '',
    
    // Datos SUNAT
    tipoContribuyente: '',
    estadoContribuyente: '',
    condicionDomicilio: '',
    fechaInscripcion: '',
    actividadesEconomicas: [],
    sistemaEmision: '',
    esEmisorElectronico: false,
    cpeHabilitado: [],
    esAgenteRetencion: false,
    esAgentePercepcion: false,
    esBuenContribuyente: false,
    
    // Comercial
    formaPago: 'Contado',
    monedaPreferida: 'PEN',
    listaPrecio: '',
    usuarioAsignado: '',
    clientePorDefecto: false,
    exceptuadaPercepcion: false,
    
    // Adicionales
    observaciones: props.formData.additionalData || '',
    adjuntos: [],
    imagenes: [],
    
    // Metadatos
    fechaRegistro: formatBusinessDateTimeIso(),
    fechaUltimaModificacion: formatBusinessDateTimeIso(),
    
    // Legacy
    gender: props.formData.gender || '',
    additionalData: props.formData.additionalData || '',
  }), [props.formData, props.documentType, props.clientType]);

  // Adaptador para el onChange
  const handleInputChange = (field: keyof ClienteFormData, value: ClienteFormValue) => {
    // Mapear los campos del nuevo formato al legacy
    const legacyFieldMap: Record<string, string> = {
      numeroDocumento: 'documentNumber',
      razonSocial: 'legalName',
      nombreCompleto: 'legalName',
      direccion: 'address',
      gender: 'gender',
      observaciones: 'additionalData',
    };

    const legacyField = legacyFieldMap[field] || field;
    
    // Manejar campos especiales
    if (field === 'tipoDocumento' && props.onDocumentTypeChange && typeof value === 'string') {
      // Convertir el código elegido a token legacy cuando sea posible (RUC/DNI/...).
      const legacyType = documentTypeFromCode((value as string).toUpperCase());
      props.onDocumentTypeChange(legacyType || (value as string));
      return;
    }

    if (field === 'tipoCuenta' && props.onClientTypeChange && typeof value === 'string') {
      props.onClientTypeChange(value);
      return;
    }

    if (field === 'emails' && Array.isArray(value) && value.length > 0) {
      const [firstEmail] = value as ClienteFormData['emails'];
      props.onInputChange('email', firstEmail);
      return;
    }

    if (field === 'telefonos' && Array.isArray(value) && value.length > 0) {
      const [firstPhone] = value as ClienteFormData['telefonos'];
      props.onInputChange('phone', firstPhone?.numero || '');
      return;
    }

    if (legacyFieldMap[field] && typeof value === 'string') {
      props.onInputChange(legacyField, value);
    }
  };

  return (
    <ClienteFormNew
      formData={adaptedFormData}
      onInputChange={handleInputChange}
      onSave={props.onSave}
      onCancel={props.onCancel}
      isEditing={props.isEditing}
    />
  );
};

export default ClienteForm;
// (Re-export de ClienteFormData removido: no hay imports desde este path)
