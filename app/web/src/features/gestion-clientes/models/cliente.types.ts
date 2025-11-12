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

export type ClientType = 'Cliente' | 'Proveedor';

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
    direccion: string;
    estado: string;
    condicion: string;
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
