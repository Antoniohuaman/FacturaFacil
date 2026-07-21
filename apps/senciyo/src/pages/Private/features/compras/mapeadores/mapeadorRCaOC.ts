import type { RequerimientoCompra } from '../modelos/RequerimientoCompra';
import type { OrdenCompra } from '../modelos/OrdenCompra';

/**
 * Extrae de un Requerimiento de Compra los datos que traslada una nueva Orden
 * de Compra generada desde él (acción "Generar Orden de Compra"). A
 * diferencia de la conversión OC→CC, esto NO es una herencia bloqueada en el
 * formulario: es un prefill editable, igual que `prepararDuplicadoOC` — el
 * usuario puede completar el proveedor si el Requerimiento no lo tenía, y
 * ajustar cualquier dato antes de registrar la OC.
 */
export function extraerDatosRCParaOC(rc: RequerimientoCompra): Partial<OrdenCompra> {
  return {
    requerimientoCompraOrigenId: rc.id,
    proveedorId: rc.proveedorId,
    proveedorTipoDocumento: rc.proveedorTipoDocumento,
    proveedorNumeroDocumento: rc.proveedorNumeroDocumento,
    proveedorNombre: rc.proveedorNombre,
    moneda: rc.moneda,
    lineas: rc.lineas.map((linea) => ({
      ...linea,
      cantidadRecibida: 0,
      cantidadFacturada: 0,
      cantidadIngresadaInventario: 0,
      cantidadPendienteRecepcion: linea.cantidadSolicitada,
      cantidadPendienteFacturacion: linea.cantidadSolicitada,
      cantidadPendienteInventario: 0,
    })),
    observaciones: rc.observaciones,
  };
}
