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
}

export interface VentasPorComprobanteItemDTO {
  name?: string;
  value?: number | string;
  color?: string;
  trend?: string;
}

export interface VentasPorEstablecimientoItemDTO {
  id?: string;
  nombre?: string;
  porcentaje?: number | string;
  monto?: number | string;
  variacion?: string;
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
}
