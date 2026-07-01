import type { PagoCompra } from '../modelos/PagoCompra';
import type { ErrorValidacion } from './tiposServiciosCompras';

export function validarPagoCompraBasico(pago: Partial<PagoCompra>): ErrorValidacion[] {
  const errores: ErrorValidacion[] = [];

  if (!pago.proveedorId) {
    errores.push({ campo: 'proveedorId', mensaje: 'El proveedor es obligatorio.' });
  }
  if (!pago.fechaPago) {
    errores.push({ campo: 'fechaPago', mensaje: 'La fecha de pago es obligatoria.' });
  }
  if (!pago.montoTotalPagado || pago.montoTotalPagado <= 0) {
    errores.push({ campo: 'montoTotalPagado', mensaje: 'El monto pagado debe ser mayor a 0.' });
  }
  if (!pago.mediosPago || pago.mediosPago.length === 0) {
    errores.push({ campo: 'mediosPago', mensaje: 'Se requiere al menos un medio de pago.' });
  }
  if (!pago.cuentasPorPagarAplicadas || pago.cuentasPorPagarAplicadas.length === 0) {
    errores.push({ campo: 'cuentasPorPagarAplicadas', mensaje: 'Debe asociar el pago a una cuenta por pagar.' });
  }

  const totalPago = pago.montoTotalPagado ?? 0;
  const sumaMedios = (pago.mediosPago ?? []).reduce((acc, m) => acc + m.monto, 0);
  if (pago.mediosPago && pago.mediosPago.length > 0 && Math.abs(sumaMedios - totalPago) > 0.01) {
    errores.push({
      campo: 'mediosPago',
      mensaje: `La suma de medios de pago (${sumaMedios.toFixed(2)}) no coincide con el total (${totalPago.toFixed(2)}).`,
    });
  }

  return errores;
}

export function puedeAnularPago(pago: PagoCompra): boolean {
  return pago.estadoDocumento === 'registrado';
}
