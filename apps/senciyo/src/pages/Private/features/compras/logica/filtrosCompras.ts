import type { OrdenCompra, EstadoPrincipalOC } from '../modelos/OrdenCompra';
import type { ComprobanteCompra, EstadoPrincipalCC } from '../modelos/ComprobanteCompra';
import type { CuentaPorPagar, EstadoPagoCxP, EstadoVencimientoCxP } from '../modelos/CuentaPorPagar';
import type { PagoCompra } from '../modelos/PagoCompra';
import { calcularEstadoPrincipalOC, calcularEstadoPrincipalCC } from './reglasCompras';

/** Fecha real en que la OC quedó registrada (distinta de fechaEmision, que es declarada). Sin registrar aún → null. Única fuente, reutilizada por el filtro de fechas y por la columna "F. Registro". */
export function obtenerFechaRegistroOC(oc: OrdenCompra): string | null {
  if (oc.estadoDocumento === 'borrador') return null;
  const evento = oc.historial.find((e) => e.accion === 'Orden de compra registrada');
  return evento?.fecha ?? oc.fechaCreacion;
}

export type CampoFechaFiltroOC = 'fechaEmision' | 'fechaVencimiento' | 'fechaRegistro';

/** Normaliza cualquier fecha de la OC (algunas son `YYYY-MM-DD`, otras ISO completo) al prefijo de fecha, para comparar sin drift de zona horaria. */
function obtenerValorFechaOC(oc: OrdenCompra, campo: CampoFechaFiltroOC): string | null {
  if (campo === 'fechaVencimiento') return oc.fechaVencimiento ? oc.fechaVencimiento.slice(0, 10) : null;
  if (campo === 'fechaRegistro') {
    const fecha = obtenerFechaRegistroOC(oc);
    return fecha ? fecha.slice(0, 10) : null;
  }
  return oc.fechaEmision ? oc.fechaEmision.slice(0, 10) : null;
}

export interface FiltrosOC {
  busqueda?: string;
  estadoPrincipal?: EstadoPrincipalOC | '';
  proveedorId?: string;
  campoFecha?: CampoFechaFiltroOC;
  fechaDesde?: string;
  fechaHasta?: string;
  formaPagoMetodoId?: string;
  compradorId?: string;
  documentoRelacionado?: 'todos' | 'con' | 'sin';
  moneda?: string;
}

/** Único filtro combinado de OC (AND entre todos los criterios activos). `comprobantes` solo se usa para el criterio de documento relacionado (cruce real por ordenCompraOrigenId). */
export function filtrarOrdenesCompra(
  ordenes: OrdenCompra[],
  filtros: FiltrosOC,
  comprobantes: ComprobanteCompra[],
): OrdenCompra[] {
  return ordenes.filter((oc) => {
    if (filtros.busqueda) {
      const q = filtros.busqueda.toLowerCase();
      if (
        !oc.numero.toLowerCase().includes(q) &&
        !oc.serie.toLowerCase().includes(q) &&
        !String(oc.correlativo ?? '').toLowerCase().includes(q) &&
        !oc.proveedorNombre.toLowerCase().includes(q) &&
        !oc.proveedorNumeroDocumento.toLowerCase().includes(q)
      )
        return false;
    }
    if (filtros.estadoPrincipal && calcularEstadoPrincipalOC(oc) !== filtros.estadoPrincipal) return false;
    if (filtros.proveedorId && oc.proveedorId !== filtros.proveedorId) return false;
    if (filtros.fechaDesde || filtros.fechaHasta) {
      const valor = obtenerValorFechaOC(oc, filtros.campoFecha ?? 'fechaEmision');
      if (!valor) return false;
      if (filtros.fechaDesde && valor < filtros.fechaDesde) return false;
      if (filtros.fechaHasta && valor > filtros.fechaHasta) return false;
    }
    if (filtros.formaPagoMetodoId && oc.formaPagoMetodoId !== filtros.formaPagoMetodoId) return false;
    if (filtros.compradorId && oc.compradorId !== filtros.compradorId) return false;
    if (filtros.moneda && oc.moneda !== filtros.moneda) return false;
    if (filtros.documentoRelacionado && filtros.documentoRelacionado !== 'todos') {
      const tieneRelacionado = comprobantes.some((c) => c.ordenCompraOrigenId === oc.id);
      if (filtros.documentoRelacionado === 'con' && !tieneRelacionado) return false;
      if (filtros.documentoRelacionado === 'sin' && tieneRelacionado) return false;
    }
    return true;
  });
}

export type CampoFechaFiltroCC = 'fechaEmisionProveedor' | 'fechaRegistro' | 'fechaVencimiento';

/** Normaliza cualquier fecha del CC al prefijo `YYYY-MM-DD`, para comparar sin drift de zona horaria. */
function obtenerValorFechaCC(cc: ComprobanteCompra, campo: CampoFechaFiltroCC): string | null {
  if (campo === 'fechaVencimiento') return cc.fechaVencimiento ? cc.fechaVencimiento.slice(0, 10) : null;
  if (campo === 'fechaRegistro') return cc.fechaRegistro ? cc.fechaRegistro.slice(0, 10) : null;
  return cc.fechaEmisionProveedor ? cc.fechaEmisionProveedor.slice(0, 10) : null;
}

export interface FiltrosCC {
  busqueda?: string;
  estadoPrincipal?: EstadoPrincipalCC | '';
  proveedorId?: string;
  campoFecha?: CampoFechaFiltroCC;
  fechaDesde?: string;
  fechaHasta?: string;
  tipoComprobanteProveedor?: string;
  formaPagoMetodoId?: string;
  moneda?: string;
  documentoRelacionado?: 'todos' | 'con' | 'sin';
}

/** Único filtro combinado de CC (AND entre todos los criterios activos), mismo patrón que filtrarOrdenesCompra. */
export function filtrarComprobantesCompra(
  comprobantes: ComprobanteCompra[],
  filtros: FiltrosCC,
): ComprobanteCompra[] {
  return comprobantes.filter((cc) => {
    if (filtros.busqueda) {
      const q = filtros.busqueda.toLowerCase();
      if (
        !(cc.serieProveedor ?? '').toLowerCase().includes(q) &&
        !(cc.numeroProveedor ?? '').toLowerCase().includes(q) &&
        !cc.proveedorNombre.toLowerCase().includes(q) &&
        !cc.proveedorNumeroDocumento.toLowerCase().includes(q)
      )
        return false;
    }
    if (filtros.estadoPrincipal && calcularEstadoPrincipalCC(cc) !== filtros.estadoPrincipal) return false;
    if (filtros.proveedorId && cc.proveedorId !== filtros.proveedorId) return false;
    if (filtros.fechaDesde || filtros.fechaHasta) {
      const valor = obtenerValorFechaCC(cc, filtros.campoFecha ?? 'fechaEmisionProveedor');
      if (!valor) return false;
      if (filtros.fechaDesde && valor < filtros.fechaDesde) return false;
      if (filtros.fechaHasta && valor > filtros.fechaHasta) return false;
    }
    if (filtros.tipoComprobanteProveedor && cc.tipoComprobanteProveedor !== filtros.tipoComprobanteProveedor) return false;
    if (filtros.formaPagoMetodoId && cc.formaPagoMetodoId !== filtros.formaPagoMetodoId) return false;
    if (filtros.moneda && cc.moneda !== filtros.moneda) return false;
    if (filtros.documentoRelacionado && filtros.documentoRelacionado !== 'todos') {
      const tieneRelacionado = Boolean(cc.ordenCompraOrigenId);
      if (filtros.documentoRelacionado === 'con' && !tieneRelacionado) return false;
      if (filtros.documentoRelacionado === 'sin' && tieneRelacionado) return false;
    }
    return true;
  });
}

export interface FiltrosCxP {
  busqueda?: string;
  estadoPago?: EstadoPagoCxP | '';
  estadoVencimiento?: EstadoVencimientoCxP | '';
  proveedorId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export function filtrarCuentasPorPagar(
  cuentas: CuentaPorPagar[],
  filtros: FiltrosCxP,
): CuentaPorPagar[] {
  return cuentas.filter((cxp) => {
    if (filtros.busqueda) {
      const q = filtros.busqueda.toLowerCase();
      if (
        !cxp.proveedorNombre.toLowerCase().includes(q) &&
        !cxp.proveedorNumeroDocumento.toLowerCase().includes(q) &&
        !cxp.comprobanteCompraNumero.toLowerCase().includes(q)
      )
        return false;
    }
    if (filtros.estadoPago && cxp.estadoPago !== filtros.estadoPago) return false;
    if (filtros.estadoVencimiento && cxp.estadoVencimiento !== filtros.estadoVencimiento)
      return false;
    if (filtros.proveedorId && cxp.proveedorId !== filtros.proveedorId) return false;
    if (filtros.fechaDesde && cxp.fechaEmision < filtros.fechaDesde) return false;
    if (filtros.fechaHasta && cxp.fechaEmision > filtros.fechaHasta) return false;
    return true;
  });
}

export interface FiltrosPagos {
  busqueda?: string;
  proveedorId?: string;
  estadoDocumento?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export function filtrarPagosCompra(pagos: PagoCompra[], filtros: FiltrosPagos): PagoCompra[] {
  return pagos.filter((p) => {
    if (filtros.busqueda) {
      const q = filtros.busqueda.toLowerCase();
      if (!p.numeroPago.toLowerCase().includes(q) && !p.proveedorNombre.toLowerCase().includes(q))
        return false;
    }
    if (filtros.estadoDocumento && p.estadoDocumento !== filtros.estadoDocumento) return false;
    if (filtros.proveedorId && p.proveedorId !== filtros.proveedorId) return false;
    if (filtros.fechaDesde && p.fechaPago < filtros.fechaDesde) return false;
    if (filtros.fechaHasta && p.fechaPago > filtros.fechaHasta) return false;
    return true;
  });
}
