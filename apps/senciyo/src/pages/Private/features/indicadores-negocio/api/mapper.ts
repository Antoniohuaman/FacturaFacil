import type {
  ClientesInsights,
  FormaPagoDistribucionItem,
  IndicadoresData,
  KpiSummary,
  RankingData,
  RankingItem,
  TopProductosConcentracion,
  VentaDiaria,
  VentasPorComprobanteItem,
  VentasPorEstablecimientoItem,
  CrecimientoDetalle
} from '../models/indicadores';
import {
  createDefaultClientesInsights,
  createDefaultFormasPagoDistribucion,
  createDefaultKpiSummary,
  createDefaultRankingData,
  createDefaultTopProductosConcentracion,
  createEmptyIndicadoresData
} from '../models/defaults';
import type {
  ClientesInsightsDTO,
  FormaPagoDistribucionItemDTO,
  IndicadoresApiResponseDTO,
  RankingItemDTO,
  TopProductosConcentracionDTO,
  VentaDiariaDTO,
  VentasPorComprobanteItemDTO,
  VentasPorEstablecimientoItemDTO
} from './types';

const toNumber = (value: number | string | undefined, fallback = 0): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
};

const safeRandomId = () => (
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `ranking-${Math.random().toString(36).slice(2, 10)}`
);

const sanitizeRankingList = (list?: RankingItemDTO[]): RankingItem[] => {
  if (!Array.isArray(list)) return [];
  return list
    .filter((item) => Boolean(item?.id && item?.name))
    .map<RankingItem>((item) => ({
      id: item.id ?? safeRandomId(),
      name: item.name ?? 'Sin nombre',
      amount: toNumber(item.amount),
      info: item.info ?? 'Sin información',
      changePercentage: toNumber(item.changePercentage),
      trend: item.trend ?? 'down'
    }));
};

const sanitizeVentasDiarias = (list?: VentaDiariaDTO[]): VentaDiaria[] => {
  if (!Array.isArray(list)) return [];
  return list
    .filter((item): item is Required<Pick<VentaDiariaDTO, 'fecha'>> & VentaDiariaDTO => Boolean(item?.fecha))
    .map<VentaDiaria>((item) => ({
      fecha: item.fecha!,
      ventas: toNumber(item.ventas),
      igv: item.igv !== undefined ? toNumber(item.igv) : undefined,
      comprobantes: Math.max(0, Math.trunc(toNumber(item.comprobantes))),
      ticket: toNumber(item.ticket),
      boletas: item.boletas !== undefined ? Math.max(0, Math.trunc(toNumber(item.boletas))) : undefined,
      facturas: item.facturas !== undefined ? Math.max(0, Math.trunc(toNumber(item.facturas))) : undefined
    }));
};

const sanitizeVentasPorComprobante = (list?: VentasPorComprobanteItemDTO[]): VentasPorComprobanteItem[] => {
  if (!Array.isArray(list)) return [];
  return list
    .filter((item) => Boolean(item?.name))
    .map<VentasPorComprobanteItem>((item) => ({
      name: item.name!,
      value: toNumber(item.value),
      color: item.color ?? '#2563eb',
      trend: item.trend ?? '0%',
      ticketPromedio: Number(toNumber(item.ticketPromedio).toFixed(2)),
      comprobantes: Math.max(0, Math.trunc(toNumber(item.comprobantes)))
    }));
};

const sanitizeVentasPorEstablecimiento = (list?: VentasPorEstablecimientoItemDTO[]): VentasPorEstablecimientoItem[] => {
  if (!Array.isArray(list)) return [];
  return list
    .filter((item) => Boolean(item?.id && item?.nombre))
    .map<VentasPorEstablecimientoItem>((item) => ({
      id: item.id!,
      nombre: item.nombre!,
      porcentaje: Number(toNumber(item.porcentaje).toFixed(1)),
      monto: Number(toNumber(item.monto).toFixed(2)),
      variacion: item.variacion ?? '0%',
      variacionValor: toNumber(item.variacionValor),
      colorClass: item.colorClass ?? 'bg-slate-400',
      barColorClass: item.barColorClass ?? 'bg-slate-400'
    }));
};

const sanitizeKpis = (kpis?: IndicadoresApiResponseDTO['kpis']): KpiSummary => {
  const defaults = createDefaultKpiSummary();
  if (!kpis) return defaults;
  return {
    totalVentas: toNumber(kpis.totalVentas, defaults.totalVentas),
    totalVentasTrend: kpis.totalVentasTrend ?? defaults.totalVentasTrend,
    nuevosClientes: kpis.nuevosClientes ?? defaults.nuevosClientes,
    nuevosClientesDelta: kpis.nuevosClientesDelta ?? defaults.nuevosClientesDelta,
    comprobantesEmitidos: kpis.comprobantesEmitidos ?? defaults.comprobantesEmitidos,
    comprobantesDelta: kpis.comprobantesDelta ?? defaults.comprobantesDelta,
    crecimientoVsMesAnterior: kpis.crecimientoVsMesAnterior ?? defaults.crecimientoVsMesAnterior,
    crecimientoDescripcion: kpis.crecimientoDescripcion ?? defaults.crecimientoDescripcion,
    ticketPromedioPeriodo: toNumber(kpis.ticketPromedioPeriodo, defaults.ticketPromedioPeriodo),
    tasaAnulacionesPorcentaje: toNumber(kpis.tasaAnulacionesPorcentaje, defaults.tasaAnulacionesPorcentaje),
    comprobantesAnulados: kpis.comprobantesAnulados ?? defaults.comprobantesAnulados,
    totalComprobantesConsiderados: kpis.totalComprobantesConsiderados ?? defaults.totalComprobantesConsiderados
  };
};

const sanitizeRanking = (ranking?: IndicadoresApiResponseDTO['ranking']): RankingData => {
  const defaults = createDefaultRankingData();
  if (!ranking) return defaults;
  return {
    topVendedores: sanitizeRankingList(ranking.topVendedores),
    productosDestacados: sanitizeRankingList(ranking.productosDestacados),
    clientesPrincipales: sanitizeRankingList(ranking.clientesPrincipales),
    productosConcentracion: sanitizeTopProductosConcentracion(ranking.productosConcentracion)
  };
};

const sanitizeTopProductosConcentracion = (data?: TopProductosConcentracionDTO): TopProductosConcentracion => {
  const defaults = createDefaultTopProductosConcentracion();
  if (!data) {
    return defaults;
  }
  return {
    topN: data.topN ?? defaults.topN,
    porcentaje: Number(toNumber(data.porcentaje, defaults.porcentaje).toFixed(1)),
    montoTop: Number(toNumber(data.montoTop, defaults.montoTop).toFixed(2)),
    total: Number(toNumber(data.total, defaults.total).toFixed(2))
  };
};

const sanitizeClientesInsights = (insights?: ClientesInsightsDTO): ClientesInsights => {
  const defaults = createDefaultClientesInsights();
  if (!insights) {
    return defaults;
  }
  return {
    nuevos: insights.nuevos ?? defaults.nuevos,
    recurrentes: insights.recurrentes ?? defaults.recurrentes,
    totalClientes: insights.totalClientes ?? defaults.totalClientes,
    porcentajeNuevos: Number(toNumber(insights.porcentajeNuevos, defaults.porcentajeNuevos).toFixed(1)),
    porcentajeRecurrentes: Number(toNumber(insights.porcentajeRecurrentes, defaults.porcentajeRecurrentes).toFixed(1)),
    frecuenciaMediaCompras: Number(toNumber(insights.frecuenciaMediaCompras, defaults.frecuenciaMediaCompras).toFixed(2))
  };
};

const sanitizeFormasPagoDistribucion = (items?: FormaPagoDistribucionItemDTO[]): FormaPagoDistribucionItem[] => {
  if (!Array.isArray(items)) {
    return createDefaultFormasPagoDistribucion();
  }
  return items
    .filter((item): item is Required<Pick<FormaPagoDistribucionItemDTO, 'id'>> & FormaPagoDistribucionItemDTO => Boolean(item?.id))
    .map<FormaPagoDistribucionItem>((item) => ({
      id: item.id!,
      label: item.label ?? item.id ?? 'Sin especificar',
      monto: Number(toNumber(item.monto).toFixed(2)),
      porcentaje: Number(toNumber(item.porcentaje).toFixed(1)),
      comprobantes: Math.max(0, Math.trunc(toNumber(item.comprobantes)))
    }));
};

const sanitizeCrecimientoDetalle = (detalle?: IndicadoresApiResponseDTO['crecimientoDetalle']): CrecimientoDetalle => {
  if (!detalle) {
    return createEmptyIndicadoresData().crecimientoDetalle;
  }
  return {
    description: detalle.description ?? 'Sin datos comparativos disponibles.',
    variationPercent: toNumber(detalle.variationPercent),
    comparativo: Array.isArray(detalle.comparativo)
      ? detalle.comparativo
        .filter((item) => Boolean(item?.label))
        .map((item) => ({
          label: item.label!,
          ventas: Number(toNumber(item.ventas).toFixed(2))
        }))
      : []
  };
};

export const mapIndicadoresResponse = (payload?: IndicadoresApiResponseDTO): IndicadoresData => {
  if (!payload) return createEmptyIndicadoresData();
  return {
    kpis: sanitizeKpis(payload.kpis),
    ventasPorComprobante: sanitizeVentasPorComprobante(payload.ventasPorComprobante),
    ventasPorEstablecimiento: sanitizeVentasPorEstablecimiento(payload.ventasPorEstablecimiento),
    ventasDiarias: sanitizeVentasDiarias(payload.ventasDiarias),
    totalVentasPeriodo: toNumber(payload.totalVentasPeriodo),
    ranking: sanitizeRanking(payload.ranking),
    crecimientoDetalle: sanitizeCrecimientoDetalle(payload.crecimientoDetalle),
    clientesInsights: sanitizeClientesInsights(payload.clientesInsights),
    formasPagoDistribucion: sanitizeFormasPagoDistribucion(payload.formasPagoDistribucion)
  };
};
