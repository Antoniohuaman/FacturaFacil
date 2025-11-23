import type {
  CrecimientoDetalle,
  KpiSummary,
  RankingData,
  VentaDiaria,
  VentasPorComprobanteItem,
  VentasPorEstablecimientoItem
} from '../models/indicadores';

export const KPI_SUMMARY_BASE: KpiSummary = {
  totalVentas: 0,
  totalVentasTrend: '0%',
  nuevosClientes: 0,
  nuevosClientesDelta: '0',
  comprobantesEmitidos: 0,
  comprobantesDelta: '0%',
  crecimientoVsMesAnterior: '0%',
  crecimientoDescripcion: 'Sin datos disponibles'
};

export const VENTAS_DIARIAS_FIXTURE: VentaDiaria[] = [];

export const VENTAS_POR_COMPROBANTE_BASE: VentasPorComprobanteItem[] = [];

export const VENTAS_POR_ESTABLECIMIENTO_BASE: VentasPorEstablecimientoItem[] = [];

export const RANKING_BASE: RankingData = {
  topVendedores: [],
  productosDestacados: [],
  clientesPrincipales: []
};

export const CRECIMIENTO_DETALLE_BASE: CrecimientoDetalle = {
  description: 'Sin comparativo disponible',
  variationPercent: 0,
  comparativo: []
};
