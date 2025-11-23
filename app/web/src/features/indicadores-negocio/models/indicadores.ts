import type { DateRange } from './dateRange';

export interface VentaDiaria {
  fecha: string;
  ventas: number;
  igv?: number;
  comprobantes: number;
  ticket: number;
  boletas?: number;
  facturas?: number;
}

export interface KpiSummary {
  totalVentas: number;
  totalVentasTrend: string;
  nuevosClientes: number;
  nuevosClientesDelta: string;
  comprobantesEmitidos: number;
  comprobantesDelta: string;
  crecimientoVsMesAnterior: string;
  crecimientoDescripcion: string;
}

export interface VentasPorComprobanteItem {
  name: string;
  value: number;
  color: string;
  trend: string;
}

export interface VentasPorEstablecimientoItem {
  id: string;
  nombre: string;
  porcentaje: number;
  monto: number;
  variacion: string;
  colorClass: string;
  barColorClass: string;
}

export interface IndicadoresData {
  kpis: KpiSummary;
  ventasPorComprobante: VentasPorComprobanteItem[];
  ventasPorEstablecimiento: VentasPorEstablecimientoItem[];
  ventasDiarias: VentaDiaria[];
  totalVentasPeriodo: number;
}

export interface IndicadoresFilters {
  dateRange: DateRange;
  establishmentId: string;
}
