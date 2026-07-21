import type { RequerimientoCompra } from '../modelos/RequerimientoCompra';
import type { ComprobanteCompra } from '../modelos/ComprobanteCompra';

/**
 * Extrae de un Requerimiento de Compra los datos que traslada un Comprobante
 * de Compra generado directamente desde él (flujo Requerimiento →
 * Comprobante, sin Orden de Compra intermedia). Es un prefill editable
 * (`ccBase`, sin `ocOrigen`): el formulario del Comprobante NO bloquea estos
 * campos, a diferencia de la conversión OC→CC — el Requerimiento no es
 * autoritativo sobre cantidades/proveedor final de la misma forma que una OC
 * aprobada.
 */
export function extraerDatosRCParaCC(rc: RequerimientoCompra): Partial<ComprobanteCompra> {
  return {
    requerimientoCompraOrigenId: rc.id,
    proveedorId: rc.proveedorId,
    proveedorTipoDocumento: rc.proveedorTipoDocumento,
    proveedorNumeroDocumento: rc.proveedorNumeroDocumento,
    proveedorNombre: rc.proveedorNombre,
    moneda: rc.moneda,
    lineas: rc.lineas.map((linea) => ({
      ...linea,
      cantidadRecibida: linea.cantidadSolicitada,
      cantidadFacturada: linea.cantidadSolicitada,
      cantidadIngresadaInventario: 0,
      cantidadPendienteRecepcion: 0,
      cantidadPendienteFacturacion: 0,
      cantidadPendienteInventario: 0,
    })),
    observaciones: rc.observaciones,
  };
}
