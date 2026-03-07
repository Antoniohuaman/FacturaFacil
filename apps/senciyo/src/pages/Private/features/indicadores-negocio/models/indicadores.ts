import type { DateRange } from './dateRange';

export interface VentaDiaria {
  fecha: string;
  ventas: number;
  igv?: number;
  comprobantes: number;
  ticket: number;
  boletas?: number;
  facturas?: number;
}

export interface KpiSummary {
  totalVentas: number;
  totalVentasTrend: string;
  nuevosClientes: number;
  nuevosClientesDelta: string;
  comprobantesEmitidos: number;
  comprobantesDelta: string;
  crecimientoVsMesAnterior: string;
  crecimientoDescripcion: string;
  ticketPromedioPeriodo: number;
  tasaAnulacionesPorcentaje: number;
  comprobantesAnulados: number;
  totalComprobantesConsiderados: number;
}

export interface VentasPorComprobanteItem {
  name: string;
  value: number;
  color: string;
  trend: string;
  ticketPromedio: number;
  comprobantes: number;
}

export interface VentasPorEstablecimientoItem {
  id: string;
  nombre: string;
  porcentaje: number;
  monto: number;
  variacion: string;
  variacionValor: number;
  colorClass: string;
  barColorClass: string;
}

export type TrendDirection = 'up' | 'down';

export interface RankingItem {
  id: string;
  name: string;
  amount: number;
  info: string;
  changePercentage: number;
  trend: TrendDirection;
}

export interface RankingData {
  topVendedores: RankingItem[];
  productosDestacados: RankingItem[];
  clientesPrincipales: RankingItem[];
  productosConcentracion: TopProductosConcentracion;
}

export interface TopProductosConcentracion {
  topN: number;
  porcentaje: number;
  montoTop: number;
  total: number;
}

export interface ClientesInsights {
  nuevos: number;
  recurrentes: number;
  totalClientes: number;
  porcentajeNuevos: number;
  porcentajeRecurrentes: number;
  frecuenciaMediaCompras: number;
}

export interface FormaPagoDistribucionItem {
  id: string;
  label: string;
  monto: number;
  porcentaje: number;
  comprobantes: number;
}

export interface CrecimientoComparativoPoint {
  label: string;
  ventas: number;
}

export interface CrecimientoDetalle {
  description: string;
  variationPercent: number;
  comparativo: CrecimientoComparativoPoint[];
}

export interface IndicadoresData {
  kpis: KpiSummary;
  ventasPorComprobante: VentasPorComprobanteItem[];
  ventasPorEstablecimiento: VentasPorEstablecimientoItem[];
  ventasDiarias: VentaDiaria[];
  totalVentasPeriodo: number;
  ranking: RankingData;
  crecimientoDetalle: CrecimientoDetalle;
  clientesInsights: ClientesInsights;
  formasPagoDistribucion: FormaPagoDistribucionItem[];
}

export interface IndicadoresFilters {
  dateRange: DateRange;
  EstablecimientoId: string;
}

// Strong aliases for API consumers
export type KPIRanking = RankingItem;
export type KPIProducto = RankingItem;
export type KPICliente = RankingItem;
export type KPIVentasDiarias = VentaDiaria;
export type KPIVentasPorEstablecimiento = VentasPorEstablecimientoItem;
export type KPICrecimiento = CrecimientoDetalle;

export type IndicadoresApiResponse = IndicadoresData;
