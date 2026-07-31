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
  ticketPromedioPeriodo: number;
  tasaAnulacionesPorcentaje: number;
  comprobantesAnulados: number;
  totalComprobantesConsiderados: number;
}

export interface VentasPorComprobanteItem {
  name: string;
  value: number;
  color: string;
  trend: string;
  ticketPromedio: number;
  comprobantes: number;
}

export interface VentasPorEstablecimientoItem {
  id: string;
  nombre: string;
  porcentaje: number;
  monto: number;
  variacion: string;
  variacionValor: number;
  colorClass: string;
  barColorClass: string;
}

export type TrendDirection = 'up' | 'down';

export interface RankingItem {
  id: string;
  name: string;
  amount: number;
  info: string;
  changePercentage: number;
  trend: TrendDirection;
}

export interface RankingData {
  topVendedores: RankingItem[];
  productosDestacados: RankingItem[];
  clientesPrincipales: RankingItem[];
  productosConcentracion: TopProductosConcentracion;
}

export interface TopProductosConcentracion {
  topN: number;
  porcentaje: number;
  montoTop: number;
  total: number;
}

export interface ClientesInsights {
  nuevos: number;
  recurrentes: number;
  totalClientes: number;
  porcentajeNuevos: number;
  porcentajeRecurrentes: number;
  frecuenciaMediaCompras: number;
}

export interface FormaPagoDistribucionItem {
  id: string;
  label: string;
  monto: number;
  porcentaje: number;
  comprobantes: number;
}

export interface CrecimientoComparativoPoint {
  label: string;
  ventas: number;
}

export interface CrecimientoDetalle {
  description: string;
  variationPercent: number;
  comparativo: CrecimientoComparativoPoint[];
}

export interface IndicadoresData {
  kpis: KpiSummary;
  ventasPorComprobante: VentasPorComprobanteItem[];
  ventasPorEstablecimiento: VentasPorEstablecimientoItem[];
  ventasDiarias: VentaDiaria[];
  totalVentasPeriodo: number;
  ranking: RankingData;
  crecimientoDetalle: CrecimientoDetalle;
  clientesInsights: ClientesInsights;
  formasPagoDistribucion: FormaPagoDistribucionItem[];
}

export interface IndicadoresFilters {
  dateRange: DateRange;
  EstablecimientoId: string;
}

// Strong aliases for API consumers
export type KPIRanking = RankingItem;
export type KPIProducto = RankingItem;
export type KPICliente = RankingItem;
export type KPIVentasDiarias = VentaDiaria;
export type KPIVentasPorEstablecimiento = VentasPorEstablecimientoItem;
export type KPICrecimiento = CrecimientoDetalle;

export type IndicadoresApiResponse = IndicadoresData;

// --- Navegación entre pestañas de Indicadores (Resumen/Rentabilidad/Reportes) ---------------
//
// Vive aquí (junto a los demás modelos de Indicadores) y no en `IndicadoresPage.tsx` por dos
// razones: (1) un componente `.tsx` solo puede exportar componentes
// (`react-refresh/only-export-components`, ver el mismo criterio ya aplicado en
// `consultaRentabilidadVentas.service.ts`); (2) mantenerla pura (sin React Router) permite
// probarla sin instalar jsdom/Testing Library. `IndicadoresPage.tsx` es el único consumidor real.

export type IndicadoresView = "resumen" | "rentabilidad" | "reportes";

/** Resuelve la vista activa a partir del query param `view` — ausente, vacío, "resumen" explícito o cualquier valor desconocido caen en "resumen". */
export function resolverVistaIndicadores(rawView: string | null): IndicadoresView {
  return rawView === "reportes" ? "reportes" : rawView === "rentabilidad" ? "rentabilidad" : "resumen";
}

export interface DecisionNavegacionVista {
  /** Parámetros resultantes tras aplicar el cambio (mismos params previos + `view` corregido/eliminado). */
  params: Record<string, string>;
  /** `false` = navegación normal iniciada por el usuario (crea historial, Atrás/Adelante funcionan). `true` = normalización/redirección (nunca genera historial). */
  replace: boolean;
}

/**
 * Decisión de navegación para un cambio de pestaña REAL iniciado por el usuario — SIEMPRE
 * `replace:false` (nunca reemplaza historial), preserva todos los demás query params legítimos
 * (autoExport, from, to, EstablecimientoId, returnTo, etc.). Devuelve `null` cuando ya se está en
 * esa vista (no-op, nunca navegación redundante).
 */
export function construirNavegacionVista(
  paramsActuales: Record<string, string>,
  vistaSiguiente: IndicadoresView,
): DecisionNavegacionVista | null {
  const rawViewActual = paramsActuales.view ?? null;
  const yaEnEsaVista = rawViewActual === null ? vistaSiguiente === "resumen" : rawViewActual === vistaSiguiente;
  if (yaEnEsaVista) {
    return null;
  }
  const params = { ...paramsActuales };
  if (vistaSiguiente === "resumen") {
    delete params.view;
  } else {
    params.view = vistaSiguiente;
  }
  return { params, replace: false };
}

/**
 * Decisión de NORMALIZACIÓN (no un cambio de vista real): un `view` desconocido o redundante
 * ("resumen" explícito) se corrige SIN generar historial navegable (`replace:true`). Devuelve
 * `null` cuando el `view` actual ya es válido (`rentabilidad`/`reportes`) o está ausente.
 */
export function construirNormalizacionVista(paramsActuales: Record<string, string>): DecisionNavegacionVista | null {
  const rawView = paramsActuales.view ?? null;
  if (rawView === null || rawView === "rentabilidad" || rawView === "reportes") {
    return null;
  }
  const params = { ...paramsActuales };
  delete params.view;
  return { params, replace: true };
}
