import type {
  TipoDocumentoComercial,
  EstadoDocumentoComercial,
  DocumentoComercial,
  ClienteDocumentoComercial,
  TipoDocumentoCliente,
} from '../models/documentoComercial.types';
import {
  TIPO_DOCUMENTO_COMERCIAL_LABELS,
  CORRELATIVO_DIGITOS_DEFAULT,
} from '../models/documentoComercial.constants';
import type { Series } from '../../configuracion-sistema/modelos/Series';

let contadorFallback = 0;

export const generarIdDocumento = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  contadorFallback += 1;
  return `doc_${Date.now()}_${contadorFallback}`;
};

export const generarIdBorrador = (): string => {
  const id = generarIdDocumento();
  return `borrador_${id}`;
};

export const obtenerFechaHoyISO = (): string =>
  new Date().toISOString().split('T')[0];

export const obtenerFechaHoraISO = (): string => new Date().toISOString();

export const obtenerLabelTipo = (tipo: TipoDocumentoComercial): string =>
  TIPO_DOCUMENTO_COMERCIAL_LABELS[tipo];

export const esBorrador = (documento: DocumentoComercial): boolean =>
  documento.esBorrador || documento.estado === 'Borrador';

export const generarCorrelativoSeguro = (
  serie: string,
  documentosExistentes: DocumentoComercial[],
  configSeries: Series[],
): string => {
  const serieConfig = configSeries.find((s) => s.series === serie);

  const correlativosUsados = documentosExistentes
    .filter((d) => d.serie === serie && !d.esBorrador && d.correlativo)
    .map((d) => {
      const num = parseInt(d.correlativo ?? '0', 10);
      return Number.isFinite(num) ? num : 0;
    });

  const maxUsado = correlativosUsados.length > 0 ? Math.max(...correlativosUsados) : 0;
  const baseCorrelativo = serieConfig?.correlativeNumber ?? 0;
  const nextNumber = Math.max(baseCorrelativo, maxUsado) + 1;
  const minDigits = serieConfig?.configuration?.minimumDigits ?? CORRELATIVO_DIGITOS_DEFAULT;

  return String(nextNumber).padStart(minDigits, '0');
};

export const inferirTipoDocumentoCliente = (
  numeroDocumento: string,
): TipoDocumentoCliente => {
  const limpio = numeroDocumento.replace(/\D/g, '');
  if (limpio.length === 11) return 'RUC';
  if (limpio.length === 8) return 'DNI';
  if (limpio.length >= 9 && limpio.length <= 12) return 'CE';
  return 'OTRO';
};

export const construirClienteDesdeRuc = (data: {
  razonSocial?: string;
  nombreComercial?: string;
  direccionFiscal?: string;
  ruc?: string;
}): ClienteDocumentoComercial => ({
  nombre: data.razonSocial ?? data.nombreComercial ?? '',
  numeroDocumento: data.ruc ?? '',
  tipoDocumento: 'RUC',
  direccion: data.direccionFiscal,
});

export const construirClienteDesdeDni = (data: {
  nombres?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  dni?: string;
}): ClienteDocumentoComercial => {
  const nombreCompleto = [data.nombres, data.apellidoPaterno, data.apellidoMaterno]
    .filter(Boolean)
    .join(' ');
  return {
    nombre: nombreCompleto,
    numeroDocumento: data.dni ?? '',
    tipoDocumento: 'DNI',
  };
};

export const obtenerColorEstado = (
  estado: EstadoDocumentoComercial,
): string => {
  switch (estado) {
    case 'Borrador':
      return 'gray';
    case 'Generada':
      return 'blue';
    case 'Aprobada':
    case 'Atendida total':
      return 'green';
    case 'Rechazada':
    case 'Anulada':
    case 'Cerrada perdida':
      return 'red';
    case 'Convertida':
      return 'purple';
    case 'Vencida':
      return 'orange';
    case 'Reservada':
    case 'Atendida parcial':
      return 'yellow';
    default:
      return 'gray';
  }
};
