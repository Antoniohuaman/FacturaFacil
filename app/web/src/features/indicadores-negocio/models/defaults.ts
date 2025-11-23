import type {
  IndicadoresData,
  KpiSummary,
  RankingData
} from './indicadores';

const ZERO_TREND = '0%';

export const createDefaultKpiSummary = (): KpiSummary => ({
  totalVentas: 0,
  totalVentasTrend: ZERO_TREND,
  nuevosClientes: 0,
  nuevosClientesDelta: '0',
  comprobantesEmitidos: 0,
  comprobantesDelta: ZERO_TREND,
  crecimientoVsMesAnterior: ZERO_TREND,
  crecimientoDescripcion: 'Sin datos disponibles'
});

export const createDefaultRankingData = (): RankingData => ({
  topVendedores: [],
  productosDestacados: [],
  clientesPrincipales: []
});

export const createEmptyIndicadoresData = (): IndicadoresData => ({
  kpis: createDefaultKpiSummary(),
  ventasPorComprobante: [],
  ventasPorEstablecimiento: [],
  ventasDiarias: [],
  totalVentasPeriodo: 0,
  ranking: createDefaultRankingData(),
  crecimientoDetalle: {
    description: 'Sin datos comparativos disponibles.',
    variationPercent: 0,
    comparativo: []
  }
});
