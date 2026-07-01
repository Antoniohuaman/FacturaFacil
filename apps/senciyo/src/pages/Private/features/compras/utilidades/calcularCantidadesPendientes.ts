export function calcularCantidadesPendientes(
  cantidadSolicitada: number,
  cantidadRecibida: number,
  cantidadFacturada: number,
  cantidadIngresadaInventario: number,
): {
  cantidadPendienteRecepcion: number;
  cantidadPendienteFacturacion: number;
  cantidadPendienteInventario: number;
} {
  return {
    cantidadPendienteRecepcion: Math.max(0, cantidadSolicitada - cantidadRecibida),
    cantidadPendienteFacturacion: Math.max(0, cantidadRecibida - cantidadFacturada),
    cantidadPendienteInventario: Math.max(0, cantidadFacturada - cantidadIngresadaInventario),
  };
}
