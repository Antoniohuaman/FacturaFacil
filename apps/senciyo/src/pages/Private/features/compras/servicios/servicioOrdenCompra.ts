import type { OrdenCompra } from '../modelos/OrdenCompra';
import type { LineaCompra } from '../modelos/LineaCompra';
import type { ErrorValidacion } from './tiposServiciosCompras';

export function validarOrdenCompraBasica(oc: Partial<OrdenCompra>): ErrorValidacion[] {
  const errores: ErrorValidacion[] = [];

  if (!oc.proveedorId) {
    errores.push({ campo: 'proveedorId', mensaje: 'El proveedor es obligatorio.' });
  }
  if (!oc.moneda) {
    errores.push({ campo: 'moneda', mensaje: 'La moneda es obligatoria.' });
  }
  if (!oc.formaPago) {
    errores.push({ campo: 'formaPago', mensaje: 'La forma de pago es obligatoria.' });
  }
  if (!oc.lineas || oc.lineas.length === 0) {
    errores.push({ campo: 'lineas', mensaje: 'Se requiere al menos una línea.' });
  }
  oc.lineas?.forEach((linea, i) => {
    if (linea.cantidadSolicitada <= 0) {
      errores.push({
        campo: `lineas[${i}].cantidadSolicitada`,
        mensaje: 'La cantidad solicitada debe ser mayor a 0.',
      });
    }
    if (linea.costoUnitario < 0) {
      errores.push({
        campo: `lineas[${i}].costoUnitario`,
        mensaje: 'El costo unitario no puede ser negativo.',
      });
    }
  });

  return errores;
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

export function crearLineaCompraVacia(id: string): LineaCompra {
  return {
    id,
    nombreProducto: '',
    clasificacion: 'producto',
    afectaInventario: true,
    unidadMedida: 'Unidad',
    unidadMedidaCodigo: 'NIU',
    cantidadSolicitada: 1,
    cantidadRecibida: 0,
    cantidadFacturada: 0,
    cantidadIngresadaInventario: 0,
    cantidadPendienteRecepcion: 1,
    cantidadPendienteFacturacion: 0,
    cantidadPendienteInventario: 0,
    costoUnitario: 0,
    subtotal: 0,
    tipoAfectacion: 'gravado',
    tasaIgv: 0.18,
    igv: 0,
    total: 0,
  };
}
