/**
 * Tipos que coinciden con los DTOs del backend C#
 */

export interface ApiResponse<T> {
  exito: boolean;
  mensaje: string;
  codigoError: string;
  data: T | null;
  timestamp: string;
}

export interface ApiResponsePaginado<T> {
  exito: boolean;
  mensaje: string;
  codigoError: string;
  data: T[] | null;
  paginacion: PaginacionInfo;
  timestamp: string;
}

export interface PaginacionInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface EstablecimientoBackendDto {
  id: string;
  empresaId: string;
  codigo: string;
  nombre: string;
  direccion: string | null;
  codigoDistrito: string | null;
  distrito: string | null;
  codigoProvincia: string | null;
  provincia: string | null;
  codigoDepartamento: string | null;
  departamento: string | null;
  codigoPostal: string | null;
  telefono: string | null;
  correo: string | null;
  esActivo: boolean;
  usuarioId: string | null;
  usuarioNombre: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EstablecimientoInputDto {
  empresaId: string;
  codigo: string;
  nombre: string;
  direccion?: string;
  codigoDistrito?: string;
  distrito?: string;
  codigoProvincia?: string;
  provincia?: string;
  codigoDepartamento?: string;
  departamento?: string;
  codigoPostal?: string;
  telefono?: string;
  correo?: string;
  esActivo?: boolean;
  usuarioId?: string;
  usuarioNombre?: string;
}

export interface EmpresaBackendDto {
  id: string;
  ruc: string;
  razonSocial: string;
  nombreComercial?: string;
  direccionFiscal?: string;
  codigoDistrito?: string;
  distrito?: string;
  codigoProvincia?: string;
  provincia?: string;
  codigoDepartamento?: string;
  departamento?: string;
  codigoPostal?: string;
  telefonos?: string[];
  correosElectronicos?: string[];
  sitioWeb?: string;
  rutaLogo?: string;
  textoPiePagina?: string;
  actividadEconomica?: string;
  regimenTributario?: string;
  monedaBase?: string;
  representanteLegal?: string;
  nombreRepresentanteLegal?: string;
  tipoDocumentoRepresentante?: string;
  numeroDocumentoRepresentante?: string;
  ambienteSunat?: string;
  facturarEn?: string;
  esActivo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmpresaInputDto {
  ruc: string;
  razonSocial: string;
  nombreComercial?: string;
  direccionFiscal?: string;
  codigoDistrito?: string;
  distrito?: string;
  codigoProvincia?: string;
  provincia?: string;
  codigoDepartamento?: string;
  departamento?: string;
  codigoPostal?: string;
  telefonos?: string[];
  correosElectronicos?: string[];
  sitioWeb?: string;
  rutaLogo?: string;
  textoPiePagina?: string;
  actividadEconomica?: string;
  regimenTributario?: string;
  monedaBase?: string;
  representanteLegal?: string;
  nombreRepresentanteLegal?: string;
  tipoDocumentoRepresentante?: string;
  numeroDocumentoRepresentante?: string;
  ambienteSunat?: string;
  facturarEn?: string;
  esActivo: boolean;
}
