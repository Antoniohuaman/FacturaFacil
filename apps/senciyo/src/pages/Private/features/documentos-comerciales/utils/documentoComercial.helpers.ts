import type {
  TipoDocumentoComercial,
  EstadoDocumentoComercial,
  DocumentoComercial,
  ClienteDocumentoComercial,
  TipoDocumentoCliente,
  CartItem,
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
  const minDigits = Math.max(
    CORRELATIVO_DIGITOS_DEFAULT,
    serieConfig?.configuration?.minimumDigits ?? CORRELATIVO_DIGITOS_DEFAULT,
  );

  return String(nextNumber).padStart(minDigits, '0');
};

export const formatearNumeroDocumento = (serie: string, correlativo: string): string =>
  `${serie}-${correlativo}`;

export const formatearNumeroParaBorrador = (serie: string): string =>
  serie ? `${serie} -` : '—';

export const obtenerSimboloMoneda = (moneda: string): string =>
  moneda === 'USD' ? '$' : 'S/';

export const formatearFechaCorta = (fechaISO: string | undefined): string => {
  if (!fechaISO) return '—';
  return fechaISO;
};

export const formatearDocumentoCliente = (
  tipoDocumento: string,
  numeroDocumento: string,
): string => {
  const numero = (numeroDocumento ?? '').trim();
  if (!numero || numero === '00000000') return '—';
  if (!tipoDocumento || tipoDocumento === 'OTRO') return numero;
  return `${tipoDocumento} ${numero}`;
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

export interface DesgloseImpuesto {
  kind: 'gravado' | 'exonerado' | 'inafecto';
  igvRate: number;
  taxableBase: number;
  taxAmount: number;
  key: string;
}

export const calcularDesgloseTributos = (items: CartItem[]): DesgloseImpuesto[] => {
  const grupos = new Map<string, DesgloseImpuesto>();

  items.forEach((item) => {
    const bruto = item.price * item.quantity;
    const descPct = item.descuentoItem ?? 0;
    const precioNeto = bruto * (1 - descPct / 100);
    const igvType = item.igvType ?? 'igv18';

    let kind: DesgloseImpuesto['kind'] = 'gravado';
    let rate = 0.18;

    if (igvType === 'igv18') { kind = 'gravado'; rate = 0.18; }
    else if (igvType === 'igv10') { kind = 'gravado'; rate = 0.10; }
    else if (igvType === 'exonerado') { kind = 'exonerado'; rate = 0; }
    else if (igvType === 'inafecto') { kind = 'inafecto'; rate = 0; }

    const key = kind === 'gravado' ? `gravado_${Math.round(rate * 100)}` : kind;
    const existing = grupos.get(key);

    if (kind === 'gravado' && rate > 0) {
      const taxableBase = precioNeto / (1 + rate);
      const taxAmount = precioNeto - taxableBase;
      if (existing) {
        existing.taxableBase += taxableBase;
        existing.taxAmount += taxAmount;
      } else {
        grupos.set(key, { kind, igvRate: rate, taxableBase, taxAmount, key });
      }
    } else {
      if (existing) {
        existing.taxableBase += precioNeto;
      } else {
        grupos.set(key, { kind, igvRate: 0, taxableBase: precioNeto, taxAmount: 0, key });
      }
    }
  });

  return [...grupos.values()]
    .filter((g) => g.taxableBase > 0.001)
    .map((g) => ({
      ...g,
      taxableBase: Math.round(g.taxableBase * 100) / 100,
      taxAmount: Math.round(g.taxAmount * 100) / 100,
    }));
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
    case 'Atendida':
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
    case 'Atendida parcialmente':
    case 'Atendida parcial':
      return 'yellow';
    case 'Pendiente de salida':
      return 'orange';
    default:
      return 'gray';
  }
};
