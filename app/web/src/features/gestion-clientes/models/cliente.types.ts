export type DocumentType =
  | 'RUC'
  | 'DNI'
  | 'SIN_DOCUMENTO'
  | 'NO_DOMICILIADO'
  | 'PASAPORTE'
  | 'CARNET_EXTRANJERIA'
  | 'CARNET_IDENTIDAD'
  | 'DOC_IDENTIF_PERS_NAT_NO_DOM'
  | 'TAM_TARJETA_ANDINA'
  | 'CARNET_PERMISO_TEMP_PERMANENCIA';

export type ClientType = 'Cliente' | 'Proveedor' | 'Cliente-Proveedor';

export type TipoPersona = 'Natural' | 'Juridica';

export type EstadoCliente = 'Habilitado' | 'Deshabilitado';

export type CondicionDomicilio = 'Habido' | 'NoHabido';

export type SistemaEmision = 'Manual' | 'Computarizado' | 'Mixto';

export type FormaPago = 'Contado' | 'Credito';

export type Moneda = 'PEN' | 'USD' | 'EUR';

export interface Telefono {
  numero: string;
  tipo: string; // Móvil, Fijo, Trabajo, etc.
}

export interface ActividadEconomica {
  codigo: string;
  descripcion: string;
  esPrincipal: boolean;
}

export interface CPEHabilitado {
  tipoCPE: string;
  fechaInicio: string;
}

export interface Ubigeo {
  codigo: string;
  departamento: string;
  provincia: string;
  distrito: string;
}

export interface Cliente {
  id: number | string;
  name: string;
  document: string;
  type: ClientType;
  address: string;
  phone: string;
  email?: string;
  gender?: string;
  additionalData?: string;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
  /** Marcador de registro no persistido (solo en memoria) */
  transient?: boolean;
}

export interface ClienteFormData {
  // Identificación
  tipoDocumento: string;
  numeroDocumento: string;
  
  // Tipo de cuenta/persona
  tipoCuenta: ClientType;
  tipoPersona: TipoPersona;
  
  // Razón Social (Jurídica)
  razonSocial: string;
  nombreComercial: string;
  
  // Nombres (Natural)
  primerNombre: string;
  segundoNombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombreCompleto: string; // readonly concatenado
  
  // Contacto
  emails: string[]; // Hasta 3
  telefonos: Telefono[]; // Hasta 3
  paginaWeb: string;
  
  // Ubicación
  pais: string;
  departamento: string;
  provincia: string;
  distrito: string;
  ubigeo: string;
  direccion: string;
  referenciaDireccion: string;
  
  // Tipo y Estado
  tipoCliente: TipoPersona;
  estadoCliente: EstadoCliente;
  motivoDeshabilitacion: string;
  
  // Datos SUNAT
  tipoContribuyente: string;
  estadoContribuyente: string;
  condicionDomicilio: CondicionDomicilio | '';
  fechaInscripcion: string;
  actividadesEconomicas: ActividadEconomica[];
  sistemaEmision: SistemaEmision | '';
  cpeHabilitado: CPEHabilitado[];
  esEmisorElectronico: boolean;
  esAgenteRetencion: boolean;
  esAgentePercepcion: boolean;
  esBuenContribuyente: boolean;
  
  // Comercial
  formaPago: FormaPago;
  monedaPreferida: Moneda;
  listaPrecio: string;
  usuarioAsignado: string;
  clientePorDefecto: boolean;
  exceptuadaPercepcion: boolean;
  
  // Adicionales
  observaciones: string;
  adjuntos: File[];
  imagenes: File[];
  
  // Metadatos
  fechaRegistro: string;
  fechaUltimaModificacion: string;
  
  // Legacy
  gender: string;
  additionalData: string;
}

// Tipo legacy para compatibilidad con código existente
export interface ClienteFormDataLegacy {
  documentNumber: string;
  legalName: string;
  address: string;
  gender: string;
  phone: string;
  email: string;
  additionalData: string;
}

export interface CreateClienteDTO {
  documentType: DocumentType;
  documentNumber: string;
  name: string;
  type: ClientType;
  address?: string;
  phone?: string;
  email?: string;
  gender?: string;
  additionalData?: string;
}

export interface UpdateClienteDTO extends Partial<CreateClienteDTO> {
  enabled?: boolean;
}

export interface ReniecResponse {
  success: boolean;
  data?: {
    dni: string;
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
    nombreCompleto: string;
  };
  message?: string;
}

export interface SunatResponse {
  success: boolean;
  data?: {
    ruc: string;
    razonSocial: string;
    nombreComercial?: string;
    tipo?: string; // Tipo de contribuyente
    direccion: string;
    estado: string; // Estado del contribuyente
    condicion: string; // Habido / No Habido
    departamento?: string;
    provincia?: string;
    distrito?: string;
    fechaInscripcion?: string;
    sistEmsion?: string; // Sistema de emisión (puede venir como sistEmsion o sistemaEmision)
    sistemaEmision?: string;
    sistContabilidad?: string;
    actEconomicas?: string[]; // Array de strings con formato "Principal - código - descripción"
    esAgenteRetencion?: boolean;
    esAgentePercepcion?: boolean;
    esBuenContribuyente?: boolean;
    esEmisorElectronico?: boolean;
    exceptuadaPercepcion?: boolean;
  };
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ClienteFilters {
  search?: string;
  type?: ClientType;
  enabled?: boolean;
  page?: number;
  limit?: number;
}
