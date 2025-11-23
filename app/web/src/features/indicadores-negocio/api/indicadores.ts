import type {
  IndicadoresData,
  IndicadoresFilters,
  KpiSummary,
  VentaDiaria,
  VentasPorComprobanteItem,
  VentasPorEstablecimientoItem
} from '../models/indicadores';

const kpiSummaryMock: KpiSummary = {
  totalVentas: 128450,
  totalVentasTrend: '+12.5%',
  nuevosClientes: 45,
  nuevosClientesDelta: '+8',
  comprobantesEmitidos: 1245,
  comprobantesDelta: '+5.8%',
  crecimientoVsMesAnterior: '+18.2%',
  crecimientoDescripcion: 'Sólido desempeño vs. mes anterior'
};

const ventasDiariasMock: VentaDiaria[] = [
  { fecha: '09/09', ventas: 1200, igv: 216, comprobantes: 30, boletas: 18, facturas: 12, ticket: 40.0 },
  { fecha: '08/09', ventas: 3200, igv: 576, comprobantes: 60, boletas: 36, facturas: 24, ticket: 53.33 },
  { fecha: '07/09', ventas: 4800, igv: 864, comprobantes: 90, boletas: 54, facturas: 36, ticket: 53.33 },
  { fecha: '06/09', ventas: 2500, igv: 450, comprobantes: 50, boletas: 30, facturas: 20, ticket: 50.0 },
  { fecha: '05/09', ventas: 4100, igv: 738, comprobantes: 80, boletas: 48, facturas: 32, ticket: 51.25 },
  { fecha: '04/09', ventas: 4700, igv: 846, comprobantes: 95, boletas: 57, facturas: 38, ticket: 49.47 },
  { fecha: '03/09', ventas: 1800, igv: 324, comprobantes: 40, boletas: 24, facturas: 16, ticket: 45.0 },
  { fecha: '02/09', ventas: 3500, igv: 630, comprobantes: 70, boletas: 42, facturas: 28, ticket: 50.0 },
  { fecha: '01/09', ventas: 3900, igv: 702, comprobantes: 75, boletas: 45, facturas: 30, ticket: 52.0 },
];

const ventasPorComprobanteMock: VentasPorComprobanteItem[] = [
  { name: 'Facturas', value: 324500.25, color: '#2563eb', trend: '+8.2%' },
  { name: 'Boletas', value: 161250.25, color: '#64B5F6', trend: '+5.1%' }
];

const ventasPorEstablecimientoMock: VentasPorEstablecimientoItem[] = [
  { id: 'centro', nombre: 'Tienda Centro', porcentaje: 40.9, monto: 198750.25, variacion: '↑ 15.2%', colorClass: 'bg-blue-600', barColorClass: 'bg-blue-600' },
  { id: 'norte', nombre: 'Tienda Norte', porcentaje: 33.4, monto: 162420.15, variacion: '↑ 8.7%', colorClass: 'bg-gray-400', barColorClass: 'bg-gray-400' },
  { id: 'sur', nombre: 'Tienda Sur', porcentaje: 25.7, monto: 124580.10, variacion: '↑ 22.1%', colorClass: 'bg-gray-400', barColorClass: 'bg-gray-400' }
];

const simulateNetworkDelay = () => new Promise((resolve) => setTimeout(resolve, 150));

export const fetchIndicadores = async (filters: IndicadoresFilters): Promise<IndicadoresData> => {
  void filters;
  await simulateNetworkDelay();
  return {
    kpis: kpiSummaryMock,
    ventasPorComprobante: ventasPorComprobanteMock,
    ventasPorEstablecimiento: ventasPorEstablecimientoMock,
    ventasDiarias: ventasDiariasMock,
    totalVentasPeriodo: 128450
  };
};
