import type { TrendDirection } from '../models/indicadores';

export interface VentaDiariaDTO {
  fecha?: string;
  ventas?: number | string;
  igv?: number | string;
  comprobantes?: number | string;
  ticket?: number | string;
  boletas?: number | string;
  facturas?: number | string;
}

export interface KpiSummaryDTO {
  totalVentas?: number | string;
  totalVentasTrend?: string;
  nuevosClientes?: number;
  nuevosClientesDelta?: string;
  comprobantesEmitidos?: number;
  comprobantesDelta?: string;
  crecimientoVsMesAnterior?: string;
  crecimientoDescripcion?: string;
  ticketPromedioPeriodo?: number | string;
  tasaAnulacionesPorcentaje?: number | string;
  comprobantesAnulados?: number;
  totalComprobantesConsiderados?: number;
}

export interface VentasPorComprobanteItemDTO {
  name?: string;
  value?: number | string;
  color?: string;
  trend?: string;
  ticketPromedio?: number | string;
  comprobantes?: number | string;
}

export interface VentasPorEstablecimientoItemDTO {
  id?: string;
  nombre?: string;
  porcentaje?: number | string;
  monto?: number | string;
  variacion?: string;
  variacionValor?: number | string;
  colorClass?: string;
  barColorClass?: string;
}

export interface RankingItemDTO {
  id?: string;
  name?: string;
  amount?: number | string;
  info?: string;
  changePercentage?: number | string;
  trend?: TrendDirection;
}

export interface RankingDataDTO {
  topVendedores?: RankingItemDTO[];
  productosDestacados?: RankingItemDTO[];
  clientesPrincipales?: RankingItemDTO[];
  productosConcentracion?: TopProductosConcentracionDTO;
}

export interface TopProductosConcentracionDTO {
  topN?: number;
  porcentaje?: number | string;
  montoTop?: number | string;
  total?: number | string;
}

export interface ClientesInsightsDTO {
  nuevos?: number;
  recurrentes?: number;
  totalClientes?: number;
  porcentajeNuevos?: number | string;
  porcentajeRecurrentes?: number | string;
  frecuenciaMediaCompras?: number | string;
}

export interface FormaPagoDistribucionItemDTO {
  id?: string;
  label?: string;
  monto?: number | string;
  porcentaje?: number | string;
  comprobantes?: number | string;
}

export interface CrecimientoComparativoPointDTO {
  label?: string;
  ventas?: number | string;
}

export interface CrecimientoDetalleDTO {
  description?: string;
  variationPercent?: number | string;
  comparativo?: CrecimientoComparativoPointDTO[];
}

export interface IndicadoresApiResponseDTO {
  kpis?: KpiSummaryDTO;
  ventasPorComprobante?: VentasPorComprobanteItemDTO[];
  ventasPorEstablecimiento?: VentasPorEstablecimientoItemDTO[];
  ventasDiarias?: VentaDiariaDTO[];
  totalVentasPeriodo?: number | string;
  ranking?: RankingDataDTO;
  crecimientoDetalle?: CrecimientoDetalleDTO;
  clientesInsights?: ClientesInsightsDTO;
  formasPagoDistribucion?: FormaPagoDistribucionItemDTO[];
}
