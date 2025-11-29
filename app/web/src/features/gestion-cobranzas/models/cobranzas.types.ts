import type { Currency, PaymentCollectionPayload, ComprobanteCreditTerms } from '../../comprobantes-electronicos/models/comprobante.types';

export type CobranzaTabKey = 'cuentas' | 'cobranzas';
export type FormaPagoKey = 'contado' | 'credito';
export type MedioPagoKey = 'efectivo' | 'tarjeta' | 'transferencia' | 'yape' | 'plin' | 'deposito' | 'mixto';
export type CobranzaStatus = 'pendiente' | 'parcial' | 'cancelado' | 'anulado' | 'vencido';

export interface DateRangeFilter {
  from: string;
  to: string;
}

export interface CuentaPorCobrarSummary {
  id: string;
  comprobanteId: string;
  comprobanteSerie: string;
  comprobanteNumero: string;
  tipoComprobante: string;
  establishmentId?: string;
  clienteNombre: string;
  clienteDocumento: string;
  fechaEmision: string;
  fechaVencimiento?: string;
  formaPago: FormaPagoKey;
  moneda: Currency;
  total: number;
  cobrado: number;
  saldo: number;
  cuotas?: number;
  creditTerms?: ComprobanteCreditTerms;
  estado: CobranzaStatus;
  vencido?: boolean;
  sucursal?: string;
  cajero?: string;
}

export interface CobranzaDocumento {
  id: string;
  numero: string;
  tipo: string;
  fechaCobranza: string;
  comprobanteId: string;
  comprobanteSerie: string;
  comprobanteNumero: string;
  clienteNombre: string;
  medioPago: string;
  cajaDestino: string;
  moneda: Currency;
  monto: number;
  estado: CobranzaStatus;
  referencia?: string;
  notas?: string;
  collectionSeriesId?: string;
}

export interface CobranzaFilters {
  rangoFechas: DateRangeFilter;
  cliente: string;
  estado: CobranzaStatus | 'todos';
  formaPago: FormaPagoKey | 'todos';
  medioPago: MedioPagoKey | 'todos';
  sucursal?: string;
  cajero?: string;
}

export interface CobranzasSummary {
  totalDocumentosPendientes: number;
  totalSaldoPendiente: number;
  totalVencido: number;
  totalCobranzas: number;
  totalCobrado: number;
}

export interface RegistrarCobranzaInput {
  cuenta: CuentaPorCobrarSummary;
  payload: PaymentCollectionPayload;
}
