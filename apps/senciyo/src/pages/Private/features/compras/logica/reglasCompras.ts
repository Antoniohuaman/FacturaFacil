import type { OrdenCompra } from '../modelos/OrdenCompra';
import type { ComprobanteCompra } from '../modelos/ComprobanteCompra';
import type { CuentaPorPagar } from '../modelos/CuentaPorPagar';
import type { PagoCompra } from '../modelos/PagoCompra';

export function puedeEditarOC(oc: OrdenCompra): boolean {
  return oc.estadoDocumento === 'borrador';
}

export function puedeAprobarOC(oc: OrdenCompra): boolean {
  return oc.requiereAprobacion && oc.estadoAprobacion === 'pendiente';
}

export function puedeRechazarOC(oc: OrdenCompra): boolean {
  return oc.requiereAprobacion && oc.estadoAprobacion === 'pendiente';
}

export function puedeGenerarCCDesdeOC(oc: OrdenCompra): boolean {
  return (
    oc.estadoDocumento === 'registrado' &&
    (oc.estadoAprobacion === 'aprobada' || oc.estadoAprobacion === 'no_requiere')
  );
}

export function puedeAnularOC(oc: OrdenCompra): boolean {
  return oc.estadoDocumento !== 'anulado' && oc.estadoDocumento !== 'cerrado';
}

export function puedeCerrarOC(oc: OrdenCompra): boolean {
  return oc.estadoDocumento === 'registrado';
}

export function puedeAnularCC(cc: ComprobanteCompra): boolean {
  return cc.estadoDocumento === 'registrado' && cc.estadoPago === 'pendiente';
}

export function puedeRegistrarPago(cxp: CuentaPorPagar): boolean {
  return cxp.estadoPago === 'pendiente' || cxp.estadoPago === 'parcial';
}

export function puedeAnularPago(pago: PagoCompra): boolean {
  return pago.estadoDocumento === 'registrado';
}

export function calcularTotalesLineas(
  lineas: Array<{
    cantidadSolicitada: number;
    costoUnitario: number;
    descuentoUnitario?: number;
    tipoAfectacion: string;
    tasaIgv?: number;
  }>,
): {
  subtotal: number;
  subtotalExonerado: number;
  subtotalInafecto: number;
  descuentoTotal: number;
  igv: number;
  total: number;
} {
  let subtotal = 0;
  let subtotalExonerado = 0;
  let subtotalInafecto = 0;
  let descuentoTotal = 0;
  let igv = 0;

  for (const linea of lineas) {
    const bruto = linea.cantidadSolicitada * linea.costoUnitario;
    const descLinea = (linea.descuentoUnitario ?? 0) * linea.cantidadSolicitada;
    const neto = bruto - descLinea;
    descuentoTotal += descLinea;

    if (linea.tipoAfectacion === 'gravado') {
      const base = neto / (1 + (linea.tasaIgv ?? 0.18));
      subtotal += base;
      igv += neto - base;
    } else if (linea.tipoAfectacion === 'exonerado') {
      subtotalExonerado += neto;
    } else {
      subtotalInafecto += neto;
    }
  }

  return {
    subtotal: round2(subtotal),
    subtotalExonerado: round2(subtotalExonerado),
    subtotalInafecto: round2(subtotalInafecto),
    descuentoTotal: round2(descuentoTotal),
    igv: round2(igv),
    total: round2(subtotal + igv + subtotalExonerado + subtotalInafecto),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
