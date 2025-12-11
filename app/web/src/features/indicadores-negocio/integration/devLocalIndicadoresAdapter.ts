import type { ClientesInsights, FormaPagoDistribucionItem, IndicadoresData, IndicadoresFilters, KpiSummary, RankingItem, TopProductosConcentracion, VentaDiaria, VentasPorComprobanteItem, VentasPorEstablecimientoItem } from '../models/indicadores';
import { createEmptyIndicadoresData } from '../models/defaults';
import { devLocalIndicadoresStore, type DevVentaEstado, type DevVentaSnapshot } from './devLocalStore';
import { assertBusinessDate, ensureBusinessDateIso, shiftBusinessDate } from '@/shared/time/businessTime';

const MS_IN_DAY = 24 * 60 * 60 * 1000;

const getRangeBounds = (range: IndicadoresFilters['dateRange']) => ({
  start: assertBusinessDate(range.startDate, 'start').getTime(),
  end: assertBusinessDate(range.endDate, 'end').getTime(),
});

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
  const { start, end } = getRangeBounds(range);
  const durationDays = Math.max(1, Math.round((end - start) / MS_IN_DAY) + 1);

  const previousEnd = shiftBusinessDate(range.startDate, -1);
  const previousStart = shiftBusinessDate(previousEnd, -(durationDays - 1));

  return {
    startDate: previousStart,
    endDate: previousEnd,
    label: 'Periodo anterior'
  } satisfies IndicadoresFilters['dateRange'];
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

const filterVentas = (
  ventas: DevVentaSnapshot[],
  range: IndicadoresFilters['dateRange'],
  establishmentId?: string,
  estado: DevVentaEstado = 'emitido'
) => {
  const { start, end } = getRangeBounds(range);
  const normalizedEstablishment = (establishmentId && establishmentId !== 'Todos') ? establishmentId : null;
  return ventas.filter((venta) => {
    if (estado && venta.estado !== estado) {
      return false;
    }
    if (normalizedEstablishment && venta.establecimientoId !== normalizedEstablishment) {
      return false;
    }
    const ventaDate = new Date(venta.fechaEmision).getTime();
    return ventaDate >= start && ventaDate <= end;
  });
};

const filterVentasHistoricasAntesDelRango = (
  ventas: DevVentaSnapshot[],
  range: IndicadoresFilters['dateRange'],
  establishmentId?: string
) => {
  const { start } = getRangeBounds(range);
  const normalizedEstablishment = (establishmentId && establishmentId !== 'Todos') ? establishmentId : null;
  return ventas.filter((venta) => {
    if (venta.estado !== 'emitido') {
      return false;
    }
    if (normalizedEstablishment && venta.establecimientoId !== normalizedEstablishment) {
      return false;
    }
    const ventaDate = new Date(venta.fechaEmision).getTime();
    return ventaDate < start;
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
    const currentCount = actualGroups.get(key)?.length ?? 0;
    return {
      name: labels.get(key) ?? key.toUpperCase(),
      value: currentTotal,
      color: colors.get(key) ?? '#64748b',
      trend: formatTrendLabel(currentTotal, previousTotal),
      ticketPromedio: currentCount === 0 ? 0 : Number((currentTotal / currentCount).toFixed(2)),
      comprobantes: currentCount
    };
  }).sort((a, b) => b.value - a.value);
};

const colorPalette = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500'];
const barPalette = ['bg-blue-200', 'bg-emerald-200', 'bg-amber-200', 'bg-purple-200', 'bg-rose-200'];

const aggregateVentasPorEstablecimiento = (
  actual: DevVentaSnapshot[],
  previous: DevVentaSnapshot[]
): VentasPorEstablecimientoItem[] => {
  const byEstActual = groupBy(actual, (venta) => venta.establecimientoId || 'SIN_EST');
  const byEstPrevio = groupBy(previous, (venta) => venta.establecimientoId || 'SIN_EST');

  const totals = Array.from(byEstActual.entries()).map(([key, ventas], index) => {
    const amount = ventas.reduce((acc, venta) => acc + convertToBaseCurrency(venta), 0);
    const prevAmount = (byEstPrevio.get(key) ?? []).reduce((acc, venta) => acc + convertToBaseCurrency(venta), 0);
    const nombre = ventas[0]?.establecimientoNombre || 'General';
    const colorIndex = index % colorPalette.length;
    const variacionValor = formatChangePercentage(amount, prevAmount);
    return {
      id: key,
      nombre,
      monto: Number(amount.toFixed(2)),
      variacion: formatTrendLabel(amount, prevAmount),
      variacionValor,
      porcentaje: 0,
      colorClass: colorPalette[colorIndex],
      barColorClass: barPalette[colorIndex]
    } satisfies VentasPorEstablecimientoItem;
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
    const dateKey = ensureBusinessDateIso(venta.fechaEmision);
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
  })).sort((a, b) => (
    assertBusinessDate(a.fecha, 'start').getTime() - assertBusinessDate(b.fecha, 'start').getTime()
  ));
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
  const clientesActual = buildMap(ventas, (venta) => venta.clienteNombre);
  const clientesPrev = buildMap(previous, (venta) => venta.clienteNombre);

  const productosActual = new Map<string, number>();
  const productosPrev = new Map<string, number>();

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

  const productosOrdenados = Array.from(productosActual.entries())
    .sort((a, b) => b[1] - a[1]);
  const productosTop = productosOrdenados.slice(0, 5);
  const totalProductos = productosOrdenados.reduce((acc, [, amount]) => acc + amount, 0);
  const montoTop = productosTop.reduce((acc, [, amount]) => acc + amount, 0);
  const productosConcentracion: TopProductosConcentracion = {
    topN: productosTop.length,
    porcentaje: totalProductos === 0 ? 0 : Number(((montoTop / totalProductos) * 100).toFixed(1)),
    montoTop: Number(montoTop.toFixed(2)),
    total: Number(totalProductos.toFixed(2))
  };

  return {
    topVendedores: buildRankingItems(vendedoresActual, vendedoresPrev),
    productosDestacados: buildRankingItems(productosActual, productosPrev),
    clientesPrincipales: buildRankingItems(clientesActual, clientesPrev),
    productosConcentracion
  };
};

const calculateClientesInsights = (
  ventasPeriodo: DevVentaSnapshot[],
  ventasPrevias: DevVentaSnapshot[]
): ClientesInsights => {
  const clientesPrevios = new Set(ventasPrevias.map(pickIdentifier));
  const clientesPeriodo = new Map<string, number>();

  ventasPeriodo.forEach((venta) => {
    const key = pickIdentifier(venta);
    clientesPeriodo.set(key, (clientesPeriodo.get(key) ?? 0) + 1);
  });

  let nuevos = 0;
  clientesPeriodo.forEach((_count, key) => {
    if (!clientesPrevios.has(key)) {
      nuevos += 1;
    }
  });

  const totalClientes = clientesPeriodo.size;
  const recurrentes = totalClientes - nuevos;
  const porcentajeNuevos = totalClientes === 0 ? 0 : Number(((nuevos / totalClientes) * 100).toFixed(1));
  const porcentajeRecurrentes = totalClientes === 0 ? 0 : Number(((recurrentes / totalClientes) * 100).toFixed(1));
  const frecuenciaMedia = totalClientes === 0 ? 0 : Number((ventasPeriodo.length / totalClientes).toFixed(2));

  return {
    nuevos,
    recurrentes,
    totalClientes,
    porcentajeNuevos,
    porcentajeRecurrentes,
    frecuenciaMediaCompras: frecuenciaMedia
  };
};

const calculateFormaPagoDistribucion = (ventasPeriodo: DevVentaSnapshot[]): FormaPagoDistribucionItem[] => {
  const map = new Map<string, { label: string; monto: number; comprobantes: number }>();
  ventasPeriodo.forEach((venta) => {
    const raw = (venta.formaPago ?? '').trim();
    const id = raw.length > 0 ? raw.toLowerCase() : 'sin-especificar';
    const label = raw.length > 0 ? raw : 'Sin especificar';
    const current = map.get(id) ?? { label, monto: 0, comprobantes: 0 };
    current.monto += convertToBaseCurrency(venta);
    current.comprobantes += 1;
    map.set(id, current);
  });
  const total = Array.from(map.values()).reduce((acc, item) => acc + item.monto, 0);
  return Array.from(map.entries())
    .map<FormaPagoDistribucionItem>(([id, item]) => ({
      id,
      label: item.label,
      monto: Number(item.monto.toFixed(2)),
      porcentaje: total === 0 ? 0 : Number(((item.monto / total) * 100).toFixed(1)),
      comprobantes: item.comprobantes
    }))
    .sort((a, b) => b.monto - a.monto);
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
  comprobantesPrevios: number,
  ticketPromedioPeriodo: number,
  anulaciones: { totalAnulados: number; totalConsiderados: number; tasa: number }
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
    : 'Revisa precios y campañas para impulsar las ventas.',
  ticketPromedioPeriodo,
  tasaAnulacionesPorcentaje: Number(anulaciones.tasa.toFixed(1)),
  comprobantesAnulados: anulaciones.totalAnulados,
  totalComprobantesConsiderados: anulaciones.totalConsiderados
});

export const resolveIndicadoresFromDevLocal = async (filters: IndicadoresFilters): Promise<IndicadoresData> => {
  const ventas = devLocalIndicadoresStore.obtenerVentas();
  if (ventas.length === 0) {
    return createEmptyIndicadoresData();
  }

  const currentRangeVentas = filterVentas(ventas, filters.dateRange, filters.establishmentId);
  const previousRange = buildPreviousRange(filters.dateRange);
  const previousRangeVentas = filterVentas(ventas, previousRange, filters.establishmentId);
  const ventasPreviasHistoricas = filterVentasHistoricasAntesDelRango(ventas, filters.dateRange, filters.establishmentId);
  const ventasAnuladasPeriodo = filterVentas(ventas, filters.dateRange, filters.establishmentId, 'anulado');

  const totalActual = currentRangeVentas.reduce((acc, venta) => acc + convertToBaseCurrency(venta), 0);
  const totalPrevio = previousRangeVentas.reduce((acc, venta) => acc + convertToBaseCurrency(venta), 0);
  const ticketPromedioPeriodo = currentRangeVentas.length === 0 ? 0 : Number((totalActual / currentRangeVentas.length).toFixed(2));
  const totalComprobantesConsiderados = currentRangeVentas.length + ventasAnuladasPeriodo.length;
  const tasaAnulaciones = totalComprobantesConsiderados === 0
    ? 0
    : (ventasAnuladasPeriodo.length / totalComprobantesConsiderados) * 100;

  const clientesActuales = new Set(currentRangeVentas.map(pickIdentifier)).size;
  const clientesPrevios = new Set(previousRangeVentas.map(pickIdentifier)).size;
  const clientesInsights = calculateClientesInsights(currentRangeVentas, ventasPreviasHistoricas);
  const formasPagoDistribucion = calculateFormaPagoDistribucion(currentRangeVentas);

  const ventasDiarias = aggregateVentasDiarias(currentRangeVentas);
  const ventasPorComprobante = aggregateVentasPorComprobante(currentRangeVentas, previousRangeVentas);
  const ventasPorEstablecimiento = aggregateVentasPorEstablecimiento(currentRangeVentas, previousRangeVentas);
  const ranking = aggregateRanking(currentRangeVentas, previousRangeVentas);
  const crecimientoDetalle = buildCrecimientoDetalle(totalActual, totalPrevio, ventasDiarias);
  const kpis = buildKpiSummary(
    totalActual,
    totalPrevio,
    clientesActuales,
    clientesPrevios,
    currentRangeVentas.length,
    previousRangeVentas.length,
    ticketPromedioPeriodo,
    {
      totalAnulados: ventasAnuladasPeriodo.length,
      totalConsiderados: totalComprobantesConsiderados,
      tasa: tasaAnulaciones
    }
  );

  return {
    kpis,
    ventasPorComprobante,
    ventasPorEstablecimiento,
    ventasDiarias,
    totalVentasPeriodo: Number(totalActual.toFixed(2)),
    ranking,
    crecimientoDetalle,
    clientesInsights,
    formasPagoDistribucion
  } satisfies IndicadoresData;
};

export const subscribeToDevLocalIndicadores = (listener: () => void) => devLocalIndicadoresStore.subscribe(listener);

