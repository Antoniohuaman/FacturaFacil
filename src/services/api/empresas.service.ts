import { httpClient } from './http-client';

export interface CreateEmpresaRequest {
  ruc: string;
  razonSocial: string;
  nombreComercial: string;
  direccionFiscal: string;
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
  monedaBase?: string; // 'PEN' | 'USD'
  representanteLegal?: string;
  nombreRepresentanteLegal?: string;
  tipoDocumentoRepresentante?: string;
  numeroDocumentoRepresentante?: string;
  ambienteSunat?: string; // 'PRUEBA' | 'PRODUCTION'
  facturarEn?: string;
  esActivo?: boolean;
}

export interface EmpresaData {
  id: string;
  ruc: string;
  razonSocial: string;
  nombreComercial: string;
  direccionFiscal: string;
  estado: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmpresaResponse {
  exito: boolean;
  mensaje: string;
  data: EmpresaData;
}

class EmpresasService {
  private readonly endpoint = '/empresas';

  async create(data: CreateEmpresaRequest): Promise<EmpresaResponse> {
    const response = await httpClient.post<EmpresaResponse>(this.endpoint, data);
    return response.data;
  }
}

export const empresasService = new EmpresasService();
