import type { Company } from '../modelos/Company';
import type { EmpresaBackendDto, EmpresaInputDto } from '../types/backend-types';
import { parseUbigeoCode } from '../datos/ubigeo';

export function mapBackendToFrontend(dto: EmpresaBackendDto): Company {
  return {
    id: dto.id,
    ruc: dto.ruc,
    razonSocial: dto.razonSocial,
    nombreComercial: dto.nombreComercial || dto.razonSocial,
    direccionFiscal: dto.direccionFiscal || '',
    distrito: dto.distrito || '',
    provincia: dto.provincia || '',
    departamento: dto.departamento || '',
    codigoPostal: dto.codigoPostal || '',
    telefonos: dto.telefonos || [],
    correosElectronicos: dto.correosElectronicos || [],
    sitioWeb: dto.sitioWeb,
    actividadEconomica: dto.actividadEconomica || '',
    regimenTributario: (dto.regimenTributario as 'GENERAL' | 'MYPE' | 'ESPECIAL') || 'GENERAL',
    monedaBase: (dto.monedaBase as 'PEN' | 'USD') || 'PEN',
    representanteLegal: {
      nombreRepresentanteLegal: dto.nombreRepresentanteLegal || '',
      tipoDocumentoRepresentante: (dto.tipoDocumentoRepresentante as 'DNI' | 'CE' | 'PASSPORT') || 'DNI',
      numeroDocumentoRepresentante: dto.numeroDocumentoRepresentante || ''
    },
    configuracionSunatEmpresa: {
      estaConfiguradoEnSunat: !!dto.ambienteSunat,
      entornoSunat: dto.ambienteSunat === 'PRODUCCION' ? 'PRODUCTION' : 'TESTING',
      usuarioSunat: undefined, // No expuesto directamente en este DTO
      fechaUltimaSincronizacionSunat: undefined
    },
    creadoEl: new Date(dto.createdAt),
    actualizadoEl: new Date(dto.updatedAt),
    estaActiva: dto.esActivo
  };
}

export function mapFrontendToBackendInput(company: Partial<Company>): EmpresaInputDto {
  const ubigeoInfo = company.codigoPostal ? parseUbigeoCode(company.codigoPostal) : null;
  
  return {
    ruc: company.ruc || '',
    razonSocial: company.razonSocial || '',
    nombreComercial: company.nombreComercial,
    direccionFiscal: company.direccionFiscal,
    // Datos de ubicación separados
    codigoPostal: company.codigoPostal,
    distrito: ubigeoInfo?.district || company.distrito,
    codigoDistrito: company.codigoPostal, // En Perú, el ubigeo de 6 dígitos suele usarse como código de distrito
    provincia: ubigeoInfo?.province || company.provincia,
    codigoProvincia: company.codigoPostal?.substring(0, 4),
    departamento: ubigeoInfo?.department || company.departamento,
    codigoDepartamento: company.codigoPostal?.substring(0, 2),
    
    telefonos: company.telefonos,
    correosElectronicos: company.correosElectronicos,
    sitioWeb: company.sitioWeb,
    actividadEconomica: company.actividadEconomica,
    regimenTributario: company.regimenTributario,
    monedaBase: company.monedaBase,
    
    // Representante Legal
    nombreRepresentanteLegal: company.representanteLegal?.nombreRepresentanteLegal,
    tipoDocumentoRepresentante: company.representanteLegal?.tipoDocumentoRepresentante,
    numeroDocumentoRepresentante: company.representanteLegal?.numeroDocumentoRepresentante,
    
    // Ambiente SUNAT: Mapear 'TESTING' a 'PRUEBA' y 'PRODUCTION' a 'PRODUCCION'
    ambienteSunat: company.configuracionSunatEmpresa?.entornoSunat === 'PRODUCTION' ? 'PRODUCCION' : 'PRUEBA',
    
    esActivo: company.estaActiva ?? true
  };
}
