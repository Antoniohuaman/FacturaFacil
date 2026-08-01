// gastos/servicios/consultaGastosOperativos.service.ts
//
// Proyección de LECTURA de Gastos operativos — única fuente reutilizada por
// la página de Gastos, su exportación a Excel, el reporte del Reports Hub y
// la sección "Utilidad operativa" de Indicadores → Rentabilidad. Nunca
// recalcula el importe reconocido (reutiliza `importeReconocidoComoGasto`) ni
// duplica agregaciones — mismo criterio arquitectónico que
// `consultaRentabilidadVentas.service.ts`.

import { round2 } from '../../compras/logica/reglasCompras';
import { convertMoney } from '@/shared/currency';
import type { CuentaPorPagar } from '../../compras/modelos/CuentaPorPagar';
import type { Gasto, EstadoDocumentoGasto } from '../modelos/Gasto';
import { importeReconocidoComoGasto, resolverEstadoPagoGasto } from './servicioGasto';

export type AgrupacionGasto = 'sin_agrupar' | 'categoria' | 'proveedor' | 'establecimiento' | 'periodo';

export interface FilaGastoOperativo {
  id: string;
  gastoId: string;
  fecha: string;
  concepto: string;
  categoriaId: string;
  categoriaNombre: string;
  proveedorONombre: string;
  establecimientoId?: string;
  establecimientoNombre: string;
  monedaOriginal: string;
  total: number;
  /** En moneda base — `null` cuando falta un TC histórico válido (nunca asumido en 1). */
  importeReconocidoBase: number | null;
  estadoDocumento: EstadoDocumentoGasto;
  estadoPago: 'pendiente' | 'parcial' | 'pagado';
  tieneDocumento: boolean;
}

export interface GrupoGastoOperativo {
  clave: string;
  etiqueta: string;
  totalGastos: number;
  importeReconocidoBase: number;
  cantidadFilas: number;
}

export interface IndicadoresGastosOperativos {
  gastosOperativosReconocidos: number;
  totalLineas: number;
  lineasSinTipoCambio: number;
}

export interface ParametrosProyeccionGastos {
  gastos: readonly Gasto[];
  cuentasPorPagar: readonly CuentaPorPagar[];
  categorias: ReadonlyMap<string, string>;
  establecimientos: ReadonlyMap<string, string>;
  monedaBase: string;
  periodo: { desde: string; hasta: string };
  establecimientoId?: string;
}

/** Convierte el importe reconocido a moneda base con el TC HISTÓRICO del propio gasto — nunca el vigente, nunca asumido en 1 (mismo criterio que Rentabilidad de Ventas). */
function convertirAMonedaBase(importe: number, monedaOriginal: string, monedaBase: string, tipoCambio: number | undefined): number | null {
  if (monedaOriginal === monedaBase) return round2(importe);
  if (!tipoCambio || tipoCambio <= 0) return null;
  return round2(convertMoney(importe, monedaOriginal, monedaBase, tipoCambio));
}

/** Proyecta una fila por gasto dentro del periodo/establecimiento indicados. Filtra por `fechaReconocimiento` — nunca por fecha de pago. */
export function proyectarFilasGastosOperativos(params: ParametrosProyeccionGastos): FilaGastoOperativo[] {
  const { gastos, cuentasPorPagar, categorias, establecimientos, monedaBase, periodo, establecimientoId } = params;
  const cxpPorId = new Map(cuentasPorPagar.map((c) => [c.id, c] as const));

  return gastos
    .filter((g) => {
      const fecha = g.fechaReconocimiento.slice(0, 10);
      if (fecha < periodo.desde || fecha > periodo.hasta) return false;
      if (establecimientoId && establecimientoId !== 'Todos' && g.establecimientoId !== establecimientoId) return false;
      return true;
    })
    .map((g) => {
      const importeReconocido = importeReconocidoComoGasto(g);
      const importeReconocidoBase = g.estadoDocumento === 'anulado'
        ? 0
        : convertirAMonedaBase(importeReconocido, g.moneda, monedaBase, g.tipoCambio);
      const cxp = g.cuentaPorPagarId ? cxpPorId.get(g.cuentaPorPagarId) : undefined;

      return {
        id: g.id,
        gastoId: g.id,
        fecha: g.fechaReconocimiento,
        concepto: g.concepto,
        categoriaId: g.categoriaId,
        categoriaNombre: categorias.get(g.categoriaId) ?? 'Sin categoría',
        proveedorONombre: g.proveedorNombre ?? g.beneficiario ?? 'Sin proveedor',
        establecimientoId: g.establecimientoId,
        establecimientoNombre: g.establecimientoId ? establecimientos.get(g.establecimientoId) ?? g.establecimientoId : 'General',
        monedaOriginal: g.moneda,
        total: g.total,
        importeReconocidoBase,
        estadoDocumento: g.estadoDocumento,
        estadoPago: resolverEstadoPagoGasto(cxp),
        tieneDocumento: Boolean(g.tipoDocumento),
      };
    });
}

export interface FiltrosAvanzadosGasto {
  busqueda?: string;
  categoriaId?: string;
  proveedorId?: string;
  estadoDocumento?: EstadoDocumentoGasto;
  estadoPago?: 'pendiente' | 'parcial' | 'pagado';
  conDocumento?: boolean;
}

/** Filtra filas ya proyectadas — nunca vuelve a leer repositorios ni a recalcular importes. Anulados excluidos por defecto salvo filtro explícito `estadoDocumento: 'anulado'`. */
export function filtrarFilasGastosOperativos(filas: readonly FilaGastoOperativo[], filtros: FiltrosAvanzadosGasto): FilaGastoOperativo[] {
  const busquedaNormalizada = filtros.busqueda?.trim().toLowerCase();
  return filas.filter((fila) => {
    if (!filtros.estadoDocumento && fila.estadoDocumento === 'anulado') return false;
    if (busquedaNormalizada) {
      const haystack = `${fila.concepto} ${fila.proveedorONombre}`.toLowerCase();
      if (!haystack.includes(busquedaNormalizada)) return false;
    }
    if (filtros.categoriaId && fila.categoriaId !== filtros.categoriaId) return false;
    if (filtros.estadoDocumento && fila.estadoDocumento !== filtros.estadoDocumento) return false;
    if (filtros.estadoPago && fila.estadoPago !== filtros.estadoPago) return false;
    if (filtros.conDocumento !== undefined && fila.tieneDocumento !== filtros.conDocumento) return false;
    return true;
  });
}

/** Indicadores agregados — SIEMPRE sobre el conjunto ya filtrado. Excluye filas sin TC válido del total reconocido (mismo criterio que Rentabilidad de Ventas con ventas sin TC). */
export function calcularIndicadoresGastosOperativos(filas: readonly FilaGastoOperativo[]): IndicadoresGastosOperativos {
  let gastosOperativosReconocidos = 0;
  let lineasSinTipoCambio = 0;
  for (const fila of filas) {
    if (fila.importeReconocidoBase === null) {
      lineasSinTipoCambio += 1;
      continue;
    }
    gastosOperativosReconocidos += fila.importeReconocidoBase;
  }
  return {
    gastosOperativosReconocidos: round2(gastosOperativosReconocidos),
    totalLineas: filas.length,
    lineasSinTipoCambio,
  };
}

function determinarClavePeriodoGasto(fechaIso: string): { clave: string; etiqueta: string } {
  const fecha = fechaIso.slice(0, 10);
  const mes = fecha.slice(0, 7);
  return { clave: mes, etiqueta: mes };
}

/** Agrupa filas ya filtradas — cambia la granularidad real, nunca solo un filtro visual (mismo principio que Rentabilidad de Ventas). */
export function agruparFilasGastosOperativos(filas: readonly FilaGastoOperativo[], modo: AgrupacionGasto): GrupoGastoOperativo[] {
  if (modo === 'sin_agrupar') {
    return filas.map((fila) => ({
      clave: fila.id,
      etiqueta: fila.concepto,
      totalGastos: fila.total,
      importeReconocidoBase: fila.importeReconocidoBase ?? 0,
      cantidadFilas: 1,
    }));
  }

  const grupos = new Map<string, GrupoGastoOperativo>();
  for (const fila of filas) {
    let clave: string;
    let etiqueta: string;
    switch (modo) {
      case 'categoria':
        clave = fila.categoriaId;
        etiqueta = fila.categoriaNombre;
        break;
      case 'proveedor':
        clave = fila.proveedorONombre;
        etiqueta = fila.proveedorONombre;
        break;
      case 'establecimiento':
        clave = fila.establecimientoId ?? '__general__';
        etiqueta = fila.establecimientoNombre;
        break;
      case 'periodo': {
        const bucket = determinarClavePeriodoGasto(fila.fecha);
        clave = bucket.clave;
        etiqueta = bucket.etiqueta;
        break;
      }
      default:
        clave = fila.id;
        etiqueta = fila.concepto;
    }

    const existente = grupos.get(clave);
    const importe = fila.importeReconocidoBase ?? 0;
    if (!existente) {
      grupos.set(clave, { clave, etiqueta, totalGastos: fila.total, importeReconocidoBase: importe, cantidadFilas: 1 });
    } else {
      existente.totalGastos = round2(existente.totalGastos + fila.total);
      existente.importeReconocidoBase = round2(existente.importeReconocidoBase + importe);
      existente.cantidadFilas += 1;
    }
  }
  return [...grupos.values()];
}
