import type { IndicadoresData, IndicadoresFilters, RankingItem, VentaDiaria, VentasPorComprobanteItem, VentasPorEstablecimientoItem, KpiSummary } from '../models/indicadores';
import { createEmptyIndicadoresData } from '../models/defaults';
import { devLocalIndicadoresStore, type DevVentaSnapshot } from './devLocalStore';

const MS_IN_DAY = 24 * 60 * 60 * 1000;

const startOfDay = (date: Date) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

const endOfDay = (date: Date) => {
  const normalized = new Date(date);
  normalized.setHours(23, 59, 59, 999);
  return normalized;
};

const convertToBaseCurrency = (venta: DevVentaSnapshot) => {
  if (!venta.moneda || venta.moneda === 'PEN') {
    return venta.total;
  }
  return venta.total * (venta.tipoCambio ?? 1);
};

const convertAmount = (venta: DevVentaSnapshot, field: 'total' | 'subtotal' | 'igv') => {
  const raw = venta[field];
  if (!venta.moneda || venta.moneda === 'PEN') {
    return raw;
  }
  return raw * (venta.tipoCambio ?? 1);
};

const buildPreviousRange = (range: IndicadoresFilters['dateRange']) => {
  const start = startOfDay(range.startDate).getTime();
  const end = endOfDay(range.endDate).getTime();
  const durationDays = Math.max(1, Math.round((end - start) / MS_IN_DAY) + 1);

  const previousEnd = new Date(start - MS_IN_DAY);
  const previousStart = new Date(previousEnd.getTime() - (durationDays - 1) * MS_IN_DAY);

  return {
    startDate: previousStart,
    endDate: previousEnd,
    label: 'Periodo anterior'
  };
};

const formatChangePercentage = (currentValue: number, previousValue: number) => {
  if (previousValue === 0) {
    return currentValue === 0 ? 0 : 100;
  }
  return ((currentValue - previousValue) / previousValue) * 100;
};

const formatTrendLabel = (currentValue: number, previousValue: number) => {
  const percent = formatChangePercentage(currentValue, previousValue);
  const rounded = Math.abs(percent).toFixed(1);
  const prefix = percent > 0 ? '+' : percent < 0 ? '-' : '';
  return `${prefix}${rounded}%`;
};

const pickIdentifier = (venta: DevVentaSnapshot) => venta.clienteId || venta.clienteDocumento || venta.clienteNombre || venta.id;

const filterVentas = (ventas: DevVentaSnapshot[], range: IndicadoresFilters['dateRange'], establishmentId?: string) => {
  const start = startOfDay(range.startDate).getTime();
  const end = endOfDay(range.endDate).getTime();
  const normalizedEstablishment = (establishmentId && establishmentId !== 'Todos') ? establishmentId : null;
  return ventas.filter((venta) => {
    if (venta.estado !== 'emitido') {
      return false;
    }
    if (normalizedEstablishment && venta.establecimientoId !== normalizedEstablishment) {
      return false;
    }
    const ventaDate = new Date(venta.fechaEmision).getTime();
    return ventaDate >= start && ventaDate <= end;
  });
};

const groupBy = <T>(items: T[], keySelector: (item: T) => string) => {
  const map = new Map<string, T[]>();
  items.forEach((item) => {
    const key = keySelector(item);
    const group = map.get(key) ?? [];
    group.push(item);
    map.set(key, group);
  });
  return map;
};

const aggregateVentasPorComprobante = (actual: DevVentaSnapshot[], previous: DevVentaSnapshot[]): VentasPorComprobanteItem[] => {
  const actualGroups = groupBy(actual, (venta) => venta.tipoComprobante.toLowerCase());
  const previousGroups = groupBy(previous, (venta) => venta.tipoComprobante.toLowerCase());

  const labels = new Map<string, string>([
    ['boleta', 'Boletas'],
    ['factura', 'Facturas'],
    ['nota de venta', 'Notas'],
  ]);

  const colors = new Map<string, string>([
    ['boleta', '#2563eb'],
    ['factura', '#9c27b0'],
    ['nota de venta', '#059669'],
  ]);

  const keys = new Set<string>([...actualGroups.keys(), ...previousGroups.keys()]);

  return Array.from(keys).map((key) => {
    const currentTotal = (actualGroups.get(key) ?? []).reduce((acc, venta) => acc + convertToBaseCurrency(venta), 0);
    const previousTotal = (previousGroups.get(key) ?? []).reduce((acc, venta) => acc + convertToBaseCurrency(venta), 0);
    return {
      name: labels.get(key) ?? key.toUpperCase(),
      value: currentTotal,
      color: colors.get(key) ?? '#64748b',
      trend: formatTrendLabel(currentTotal, previousTotal)
    };
  }).sort((a, b) => b.value - a.value);
};

const colorPalette = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500'];
const barPalette = ['bg-blue-200', 'bg-emerald-200', 'bg-amber-200', 'bg-purple-200', 'bg-rose-200'];

const aggregateVentasPorEstablecimiento = (actual: DevVentaSnapshot[]): VentasPorEstablecimientoItem[] => {
  const byEst = groupBy(actual, (venta) => venta.establecimientoId || 'SIN_EST');
  const totals = Array.from(byEst.entries()).map(([key, ventas], index) => {
    const amount = ventas.reduce((acc, venta) => acc + convertToBaseCurrency(venta), 0);
    const nombre = ventas[0]?.establecimientoNombre || 'General';
    const colorIndex = index % colorPalette.length;
    return {
      id: key,
      nombre,
      monto: Number(amount.toFixed(2)),
      variacion: '0%',
      porcentaje: 0,
      colorClass: colorPalette[colorIndex],
      barColorClass: barPalette[colorIndex]
    };
  });

  const totalAmount = totals.reduce((acc, item) => acc + item.monto, 0);
  return totals.map((item) => ({
    ...item,
    porcentaje: totalAmount === 0 ? 0 : Number(((item.monto / totalAmount) * 100).toFixed(1))
  })).sort((a, b) => b.monto - a.monto);
};

const aggregateVentasDiarias = (ventas: DevVentaSnapshot[]): VentaDiaria[] => {
  const byDate = new Map<string, {
    ventas: number;
    igv: number;
    count: number;
    boletas: number;
    facturas: number;
  }>();

  ventas.forEach((venta) => {
    const dateKey = new Date(venta.fechaEmision).toISOString().slice(0, 10);
    const current = byDate.get(dateKey) ?? { ventas: 0, igv: 0, count: 0, boletas: 0, facturas: 0 };
    current.ventas += convertToBaseCurrency(venta);
    current.igv += convertAmount(venta, 'igv');
    current.count += 1;
    if (venta.tipoComprobante.toLowerCase().includes('boleta')) {
      current.boletas += 1;
    }
    if (venta.tipoComprobante.toLowerCase().includes('factura')) {
      current.facturas += 1;
    }
    byDate.set(dateKey, current);
  });

  return Array.from(byDate.entries()).map(([fecha, valores]) => ({
    fecha,
    ventas: Number(valores.ventas.toFixed(2)),
    igv: Number(valores.igv.toFixed(2)),
    comprobantes: valores.count,
    ticket: valores.count === 0 ? 0 : Number((valores.ventas / valores.count).toFixed(2)),
    boletas: valores.boletas,
    facturas: valores.facturas
  })).sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
};

const aggregateRanking = (ventas: DevVentaSnapshot[], previous: DevVentaSnapshot[]) => {
  const buildMap = (items: DevVentaSnapshot[], selector: (venta: DevVentaSnapshot) => string) => {
    const map = new Map<string, number>();
    items.forEach((venta) => {
      const key = selector(venta) || 'Sin registro';
      const prev = map.get(key) ?? 0;
      map.set(key, prev + convertToBaseCurrency(venta));
    });
    return map;
  };

  const vendedoresActual = buildMap(ventas, (venta) => venta.vendedorNombre);
  const vendedoresPrev = buildMap(previous, (venta) => venta.vendedorNombre);
  const productosActual = new Map<string, number>();
  const productosPrev = new Map<string, number>();
  const clientesActual = buildMap(ventas, (venta) => venta.clienteNombre);
  const clientesPrev = buildMap(previous, (venta) => venta.clienteNombre);

  ventas.forEach((venta) => {
    venta.productos.forEach((producto) => {
      const key = producto.name;
      const prev = productosActual.get(key) ?? 0;
      const amount = (venta.moneda && venta.moneda !== 'PEN')
        ? producto.subtotal * (venta.tipoCambio ?? 1)
        : producto.subtotal;
      productosActual.set(key, prev + amount);
    });
  });

  previous.forEach((venta) => {
    venta.productos.forEach((producto) => {
      const key = producto.name;
      const prev = productosPrev.get(key) ?? 0;
      const amount = (venta.moneda && venta.moneda !== 'PEN')
        ? producto.subtotal * (venta.tipoCambio ?? 1)
        : producto.subtotal;
      productosPrev.set(key, prev + amount);
    });
  });

  const buildRankingItems = (mapActual: Map<string, number>, mapPrev: Map<string, number>): RankingItem[] => (
    Array.from(mapActual.entries())
      .map(([name, amount]) => {
        const previousAmount = mapPrev.get(name) ?? 0;
        const change = formatChangePercentage(amount, previousAmount);
        return {
          id: name,
          name,
          amount: Number(amount.toFixed(2)),
          info: 'Periodo seleccionado',
          changePercentage: Number(change.toFixed(1)),
          trend: change >= 0 ? 'up' : 'down'
        } satisfies RankingItem;
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
  );

  return {
    topVendedores: buildRankingItems(vendedoresActual, vendedoresPrev),
    productosDestacados: buildRankingItems(productosActual, productosPrev),
    clientesPrincipales: buildRankingItems(clientesActual, clientesPrev)
  };
};

const buildCrecimientoDetalle = (totalActual: number, totalPrevio: number, ventasDiarias: VentaDiaria[]) => {
  const variationPercent = Number(formatChangePercentage(totalActual, totalPrevio).toFixed(1));
  const description = variationPercent > 0
    ? 'Las ventas crecieron frente al periodo anterior.'
    : variationPercent < 0
      ? 'Las ventas cayeron frente al periodo anterior.'
      : 'Las ventas se mantuvieron estables frente al periodo anterior.';

  const comparativo = ventasDiarias.map((ventaDia) => ({
    label: ventaDia.fecha,
    ventas: ventaDia.ventas
  }));

  return {
    description,
    variationPercent,
    comparativo
  };
};

const buildKpiSummary = (
  totalActual: number,
  totalPrevio: number,
  clientesActual: number,
  clientesPrevios: number,
  comprobantesActuales: number,
  comprobantesPrevios: number
): KpiSummary => ({
  totalVentas: Number(totalActual.toFixed(2)),
  totalVentasTrend: formatTrendLabel(totalActual, totalPrevio),
  nuevosClientes: clientesActual,
  nuevosClientesDelta: formatTrendLabel(clientesActual, clientesPrevios),
  comprobantesEmitidos: comprobantesActuales,
  comprobantesDelta: formatTrendLabel(comprobantesActuales, comprobantesPrevios),
  crecimientoVsMesAnterior: formatTrendLabel(totalActual, totalPrevio),
  crecimientoDescripcion: totalActual >= totalPrevio
    ? 'Tus ventas mantienen una tendencia positiva.'
    : 'Revisa precios y campañas para impulsar las ventas.'
});

export const resolveIndicadoresFromDevLocal = async (filters: IndicadoresFilters): Promise<IndicadoresData> => {
  const ventas = devLocalIndicadoresStore.obtenerVentas();
  if (ventas.length === 0) {
    return createEmptyIndicadoresData();
  }

  const currentRangeVentas = filterVentas(ventas, filters.dateRange, filters.establishmentId);
  const previousRange = buildPreviousRange(filters.dateRange);
  const previousRangeVentas = filterVentas(ventas, previousRange, filters.establishmentId);

  const totalActual = currentRangeVentas.reduce((acc, venta) => acc + convertToBaseCurrency(venta), 0);
  const totalPrevio = previousRangeVentas.reduce((acc, venta) => acc + convertToBaseCurrency(venta), 0);

  const clientesActuales = new Set(currentRangeVentas.map(pickIdentifier)).size;
  const clientesPrevios = new Set(previousRangeVentas.map(pickIdentifier)).size;

  const ventasDiarias = aggregateVentasDiarias(currentRangeVentas);
  const ventasPorComprobante = aggregateVentasPorComprobante(currentRangeVentas, previousRangeVentas);
  const ventasPorEstablecimiento = aggregateVentasPorEstablecimiento(currentRangeVentas);
  const ranking = aggregateRanking(currentRangeVentas, previousRangeVentas);
  const crecimientoDetalle = buildCrecimientoDetalle(totalActual, totalPrevio, ventasDiarias);
  const kpis = buildKpiSummary(totalActual, totalPrevio, clientesActuales, clientesPrevios, currentRangeVentas.length, previousRangeVentas.length);

  return {
    kpis,
    ventasPorComprobante,
    ventasPorEstablecimiento,
    ventasDiarias,
    totalVentasPeriodo: Number(totalActual.toFixed(2)),
    ranking,
    crecimientoDetalle
  } satisfies IndicadoresData;
};

export const subscribeToDevLocalIndicadores = (listener: () => void) => devLocalIndicadoresStore.subscribe(listener);
