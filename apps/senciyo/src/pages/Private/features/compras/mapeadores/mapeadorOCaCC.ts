import type { OrdenCompra } from '../modelos/OrdenCompra';
import type { ModalidadInventarioCC } from '../modelos/ComprobanteCompra';

export interface DatosCCDesdeOC {
  ordenCompraOrigenId: string;
  proveedorId: string;
  proveedorTipoDocumento: string;
  proveedorNumeroDocumento: string;
  proveedorNombre: string;
  proveedorDireccionFacturacion?: string;
  proveedorDireccionEntrega?: string;
  moneda: OrdenCompra['moneda'];
  tipoCambio?: number;
  formaPago: OrdenCompra['formaPago'];
  formaPagoMetodoId?: string;
  creditTerms?: OrdenCompra['creditTerms'];
  condicionesPago?: string;
  modalidadInventarioSugerida: ModalidadInventarioCC;
  lineas: OrdenCompra['lineas'];
  centroCosto?: string;
  presupuesto?: string;
  observaciones?: string;
}

export function extraerDatosOCParaCC(oc: OrdenCompra): DatosCCDesdeOC {
  return {
    ordenCompraOrigenId: oc.id,
    proveedorId: oc.proveedorId,
    proveedorTipoDocumento: oc.proveedorTipoDocumento,
    proveedorNumeroDocumento: oc.proveedorNumeroDocumento,
    proveedorNombre: oc.proveedorNombre,
    proveedorDireccionFacturacion: oc.proveedorDireccionFacturacion,
    proveedorDireccionEntrega: oc.proveedorDireccionEntrega,
    moneda: oc.moneda,
    tipoCambio: oc.tipoCambio,
    formaPago: oc.formaPago,
    formaPagoMetodoId: oc.formaPagoMetodoId,
    creditTerms: oc.creditTerms,
    condicionesPago: oc.condicionesPago,
    modalidadInventarioSugerida: sugerirModalidadInventario(oc),
    lineas: oc.lineas.map((linea) => ({
      ...linea,
      cantidadRecibida: linea.cantidadSolicitada,
      cantidadFacturada: linea.cantidadSolicitada,
      cantidadIngresadaInventario: 0,
      cantidadPendienteRecepcion: 0,
      cantidadPendienteFacturacion: 0,
      cantidadPendienteInventario: linea.afectaInventario ? linea.cantidadSolicitada : 0,
    })),
    centroCosto: oc.centroCosto,
    presupuesto: oc.presupuesto,
    observaciones: oc.observaciones,
  };
}

export function sugerirModalidadInventario(oc: OrdenCompra): ModalidadInventarioCC {
  const tieneLineasConInventario = oc.lineas.some((l) => l.afectaInventario);
  if (!tieneLineasConInventario) return 'no_afecta_inventario';
  return 'con_nota_ingreso';
}
