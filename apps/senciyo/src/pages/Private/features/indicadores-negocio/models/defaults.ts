import type {
  ClientesInsights,
  FormaPagoDistribucionItem,
  IndicadoresData,
  KpiSummary,
  RankingData,
  TopProductosConcentracion
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
  crecimientoDescripcion: 'Sin datos disponibles',
  ticketPromedioPeriodo: 0,
  tasaAnulacionesPorcentaje: 0,
  comprobantesAnulados: 0,
  totalComprobantesConsiderados: 0
});

export const createDefaultRankingData = (): RankingData => ({
  topVendedores: [],
  productosDestacados: [],
  clientesPrincipales: [],
  productosConcentracion: createDefaultTopProductosConcentracion()
});

export const createDefaultTopProductosConcentracion = (): TopProductosConcentracion => ({
  topN: 0,
  porcentaje: 0,
  montoTop: 0,
  total: 0
});

export const createDefaultClientesInsights = (): ClientesInsights => ({
  nuevos: 0,
  recurrentes: 0,
  totalClientes: 0,
  porcentajeNuevos: 0,
  porcentajeRecurrentes: 0,
  frecuenciaMediaCompras: 0
});

export const createDefaultFormasPagoDistribucion = (): FormaPagoDistribucionItem[] => [];

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
  },
  clientesInsights: createDefaultClientesInsights(),
  formasPagoDistribucion: createDefaultFormasPagoDistribucion()
});
