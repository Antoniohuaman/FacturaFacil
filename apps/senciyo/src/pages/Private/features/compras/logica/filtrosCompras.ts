import type { OrdenCompra, EstadoPrincipalOC } from '../modelos/OrdenCompra';
import type { ComprobanteCompra } from '../modelos/ComprobanteCompra';
import type { CuentaPorPagar, EstadoPagoCxP, EstadoVencimientoCxP } from '../modelos/CuentaPorPagar';
import type { PagoCompra } from '../modelos/PagoCompra';
import { calcularEstadoPrincipalOC } from './reglasCompras';

export interface FiltrosOC {
  busqueda?: string;
  estadoPrincipal?: EstadoPrincipalOC | '';
  proveedorId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export function filtrarOrdenesCompra(ordenes: OrdenCompra[], filtros: FiltrosOC): OrdenCompra[] {
  return ordenes.filter((oc) => {
    if (filtros.busqueda) {
      const q = filtros.busqueda.toLowerCase();
      if (
        !oc.numero.toLowerCase().includes(q) &&
        !oc.proveedorNombre.toLowerCase().includes(q) &&
        !oc.proveedorNumeroDocumento.toLowerCase().includes(q)
      )
        return false;
    }
    if (filtros.estadoPrincipal && calcularEstadoPrincipalOC(oc) !== filtros.estadoPrincipal) return false;
    if (filtros.proveedorId && oc.proveedorId !== filtros.proveedorId) return false;
    if (filtros.fechaDesde && oc.fechaEmision < filtros.fechaDesde) return false;
    if (filtros.fechaHasta && oc.fechaEmision > filtros.fechaHasta) return false;
    return true;
  });
}

export interface FiltrosCC {
  busqueda?: string;
  estadoDocumento?: string;
  estadoPago?: string;
  proveedorId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export function filtrarComprobantesCompra(
  comprobantes: ComprobanteCompra[],
  filtros: FiltrosCC,
): ComprobanteCompra[] {
  return comprobantes.filter((cc) => {
    if (filtros.busqueda) {
      const q = filtros.busqueda.toLowerCase();
      const numero = `${cc.serieProveedor}-${cc.numeroProveedor}`;
      if (
        !numero.toLowerCase().includes(q) &&
        !cc.proveedorNombre.toLowerCase().includes(q) &&
        !cc.proveedorNumeroDocumento.toLowerCase().includes(q)
      )
        return false;
    }
    if (filtros.estadoDocumento && cc.estadoDocumento !== filtros.estadoDocumento) return false;
    if (filtros.estadoPago && cc.estadoPago !== filtros.estadoPago) return false;
    if (filtros.proveedorId && cc.proveedorId !== filtros.proveedorId) return false;
    if (filtros.fechaDesde && cc.fechaEmisionProveedor < filtros.fechaDesde) return false;
    if (filtros.fechaHasta && cc.fechaEmisionProveedor > filtros.fechaHasta) return false;
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
