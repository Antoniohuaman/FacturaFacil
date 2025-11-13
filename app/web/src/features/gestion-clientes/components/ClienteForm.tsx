// Wrapper de compatibilidad para módulos legacy que usan la interfaz antigua de ClienteForm
import React, { useMemo } from 'react';
import ClienteFormNew from './ClienteFormNew';
import type { ClienteFormData } from '../models';

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
  onInputChange: (field: string, value: any) => void;
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
    tipoDocumento: props.documentType || '6',
    numeroDocumento: props.formData.documentNumber || '',
    tipoPersona: (props.documentType === '6') ? 'Juridica' : 'Natural',
    tipoCuenta: (props.clientType as any) || 'Cliente',
    
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
    fechaRegistro: new Date().toISOString(),
    fechaUltimaModificacion: new Date().toISOString(),
    
    // Legacy
    gender: props.formData.gender || '',
    additionalData: props.formData.additionalData || '',
  }), [props.formData, props.documentType, props.clientType]);

  // Adaptador para el onChange
  const handleInputChange = (field: keyof ClienteFormData, value: any) => {
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
    if (field === 'tipoDocumento' && props.onDocumentTypeChange) {
      props.onDocumentTypeChange(value);
    } else if (field === 'tipoCuenta' && props.onClientTypeChange) {
      props.onClientTypeChange(value);
    } else if (field === 'emails' && Array.isArray(value) && value.length > 0) {
      props.onInputChange('email', value[0]);
    } else if (field === 'telefonos' && Array.isArray(value) && value.length > 0) {
      props.onInputChange('phone', value[0]?.numero || '');
    } else if (legacyFieldMap[field]) {
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
export type { ClienteFormData };
