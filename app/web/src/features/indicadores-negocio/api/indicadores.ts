import type {
  IndicadoresApiResponse,
  IndicadoresData,
  IndicadoresFilters,
  RankingItem,
  VentaDiaria,
  VentasPorEstablecimientoItem
} from '../models/indicadores';
import {
  CRECIMIENTO_DETALLE_BASE,
  KPI_SUMMARY_BASE,
  RANKING_BASE,
  VENTAS_DIARIAS_FIXTURE,
  VENTAS_POR_COMPROBANTE_BASE,
  VENTAS_POR_ESTABLECIMIENTO_BASE
} from './fixtures';

const INDICADORES_API_URL = (import.meta.env.VITE_INDICADORES_API_URL ?? '').trim();

const simulateNetworkDelay = () => new Promise((resolve) => setTimeout(resolve, 150));

const BASE_TOTAL_VENTAS = VENTAS_DIARIAS_FIXTURE.reduce((acc, item) => acc + item.ventas, 0) || 1;

const ESTABLISHMENT_MULTIPLIERS: Record<string, number> = {
  Todos: 1,
  centro: 0.95,
  norte: 0.78,
  sur: 0.63
};

const getMultiplier = (id: string) => ESTABLISHMENT_MULTIPLIERS[id] ?? 0.6;

const startOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const isWithinRange = (fechaISO: string, range: IndicadoresFilters['dateRange']) => {
  const date = new Date(fechaISO);
  if (Number.isNaN(date.getTime())) return false;
  return date >= startOfDay(range.startDate) && date <= startOfDay(range.endDate);
};

const scaleVentaDiaria = (venta: VentaDiaria, multiplier: number): VentaDiaria => {
  const ventas = venta.ventas * multiplier;
  const comprobantes = Math.max(1, Math.round(venta.comprobantes * multiplier));
  const boletaRatio = venta.boletas && venta.comprobantes ? (venta.boletas / venta.comprobantes) : 0;
  const facturaRatio = venta.facturas && venta.comprobantes ? (venta.facturas / venta.comprobantes) : 0;
  let boletas = venta.boletas ? Math.max(0, Math.round(comprobantes * boletaRatio)) : undefined;
  let facturas = venta.facturas ? Math.max(0, Math.round(comprobantes * facturaRatio)) : undefined;
  const assigned = (boletas ?? 0) + (facturas ?? 0);
  const diff = comprobantes - assigned;
  if (diff !== 0) {
    if (boletas !== undefined) {
      boletas += diff;
    } else if (facturas !== undefined) {
      facturas += diff;
    }
  }

  const ticket = ventas / comprobantes;

  return {
    fecha: venta.fecha,
    ventas: Number(ventas.toFixed(2)),
    comprobantes,
    ticket: Number(ticket.toFixed(2)),
    igv: Number((ventas * 0.18).toFixed(2)),
    boletas,
    facturas
  };
};

const scaleRankingList = (list: RankingItem[], factor: number): RankingItem[] =>
  list.map((item) => ({
    ...item,
    amount: Number((item.amount * factor).toFixed(2))
  }));

const buildVentasPorEstablecimiento = (
  totalVentasPeriodo: number,
  establishmentId: string
): VentasPorEstablecimientoItem[] => {
  const baseTotal = VENTAS_POR_ESTABLECIMIENTO_BASE.reduce((acc, item) => acc + item.monto, 0) || 1;
  const computed = VENTAS_POR_ESTABLECIMIENTO_BASE.map((item) => {
    const share = item.monto / baseTotal;
    return {
      ...item,
      monto: Number((share * totalVentasPeriodo).toFixed(2)),
      porcentaje: Number((share * 100).toFixed(1))
    };
  });

  if (establishmentId !== 'Todos') {
    const single = computed.find((item) => item.id === establishmentId);
    return single
      ? [{ ...single, porcentaje: 100 }]
      : computed;
  }

  return computed;
};

const buildQueryParams = (filters: IndicadoresFilters) => {
  const params = new URLSearchParams({
    startDate: filters.dateRange.startDate.toISOString(),
    endDate: filters.dateRange.endDate.toISOString(),
    establishmentId: filters.establishmentId ?? 'Todos'
  });
  return params.toString();
};

const normalizeApiResponse = (payload: IndicadoresApiResponse): IndicadoresData => ({
  ...payload,
  ranking: {
    topVendedores: payload.ranking.topVendedores ?? [],
    productosDestacados: payload.ranking.productosDestacados ?? [],
    clientesPrincipales: payload.ranking.clientesPrincipales ?? []
  },
  ventasPorComprobante: payload.ventasPorComprobante ?? [],
  ventasPorEstablecimiento: payload.ventasPorEstablecimiento ?? [],
  ventasDiarias: payload.ventasDiarias ?? []
});

const buildFixturesResponse = async (filters: IndicadoresFilters): Promise<IndicadoresData> => {
  await simulateNetworkDelay();

  const rangeFiltered = VENTAS_DIARIAS_FIXTURE.filter((venta) => isWithinRange(venta.fecha, filters.dateRange));
  const multiplier = getMultiplier(filters.establishmentId);
  const ventasDiarias = rangeFiltered.map((venta) => scaleVentaDiaria(venta, multiplier));
  const totalVentasPeriodo = ventasDiarias.reduce((acc, item) => acc + item.ventas, 0);
  const overallFactor = BASE_TOTAL_VENTAS ? totalVentasPeriodo / BASE_TOTAL_VENTAS : multiplier;

  const ventasPorComprobanteBaseTotal = VENTAS_POR_COMPROBANTE_BASE.reduce((acc, item) => acc + item.value, 0) || 1;
  const ventasPorComprobante = VENTAS_POR_COMPROBANTE_BASE.map((item) => {
    const share = item.value / ventasPorComprobanteBaseTotal;
    return {
      ...item,
      value: Number((share * totalVentasPeriodo).toFixed(2))
    };
  });

  const ranking = {
    topVendedores: scaleRankingList(RANKING_BASE.topVendedores, overallFactor),
    productosDestacados: scaleRankingList(RANKING_BASE.productosDestacados, overallFactor),
    clientesPrincipales: scaleRankingList(RANKING_BASE.clientesPrincipales, overallFactor)
  };

  const comparativo = CRECIMIENTO_DETALLE_BASE.comparativo.map((point) => ({
    ...point,
    ventas: Number((point.ventas * overallFactor).toFixed(2))
  }));

  const crecimientoVariation = comparativo.length >= 2
    ? Number((((comparativo[1].ventas - comparativo[0].ventas) / Math.max(1, comparativo[0].ventas)) * 100).toFixed(1))
    : CRECIMIENTO_DETALLE_BASE.variationPercent;

  const crecimientoDetalle = {
    description: CRECIMIENTO_DETALLE_BASE.description,
    variationPercent: crecimientoVariation,
    comparativo
  };

  return {
    kpis: {
      ...KPI_SUMMARY_BASE,
      totalVentas: Math.round(totalVentasPeriodo),
      nuevosClientes: Math.max(0, Math.round(KPI_SUMMARY_BASE.nuevosClientes * overallFactor)),
      comprobantesEmitidos: Math.max(0, Math.round(KPI_SUMMARY_BASE.comprobantesEmitidos * overallFactor))
    },
    ventasPorComprobante,
    ventasPorEstablecimiento: buildVentasPorEstablecimiento(totalVentasPeriodo, filters.establishmentId),
    ventasDiarias,
    totalVentasPeriodo: Number(totalVentasPeriodo.toFixed(2)),
    ranking,
    crecimientoDetalle
  };
};

export const hasIndicadoresApi = () => INDICADORES_API_URL.length > 0;

export const fetchIndicadoresFromApi = async (filters: IndicadoresFilters): Promise<IndicadoresData> => {
  if (!hasIndicadoresApi()) {
    throw new Error('No se ha configurado VITE_INDICADORES_API_URL');
  }

  const endpointUrl = (() => {
    try {
      const url = new URL(INDICADORES_API_URL);
      url.search = buildQueryParams(filters);
      return url.toString();
    } catch {
      throw new Error('VITE_INDICADORES_API_URL no es una URL válida');
    }
  })();

  const response = await fetch(endpointUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Indicadores API respondió ${response.status}`);
  }

  const payload = await response.json() as IndicadoresApiResponse;
  return normalizeApiResponse(payload);
};

export const fetchIndicadoresFromFixtures = (filters: IndicadoresFilters) => buildFixturesResponse(filters);

export const fetchIndicadores = async (filters: IndicadoresFilters): Promise<IndicadoresData> => {
  try {
    return await fetchIndicadoresFromApi(filters);
  } catch (error) {
    console.warn('[indicadores-negocio] No se pudo obtener datos reales, usando fixtures.', error);
    return fetchIndicadoresFromFixtures(filters);
  }
};
