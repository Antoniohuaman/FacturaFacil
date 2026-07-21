import type { RequerimientoCompra } from '../modelos/RequerimientoCompra';
import type { ErrorValidacion } from './tiposServiciosCompras';
import { validarLineasCompra, calcularTotalesLineas } from '../logica/reglasCompras';
import { normalizarImporte } from '@/shared/currency';

/**
 * Validación de "forma" del Requerimiento de Compra — mismo patrón que
 * validarOrdenCompraBasica, sin proveedor ni forma de pago obligatorios (el
 * Requerimiento es un documento previo de solicitud, no un compromiso de
 * compra: el proveedor puede no conocerse todavía).
 */
export function validarRequerimientoCompraBasico(rc: Partial<RequerimientoCompra>): ErrorValidacion[] {
  const errores: ErrorValidacion[] = [];

  if (!rc.moneda) {
    errores.push({ campo: 'moneda', mensaje: 'La moneda es obligatoria.' });
  }
  if (!rc.fechaSolicitud) {
    errores.push({ campo: 'fechaSolicitud', mensaje: 'La fecha de solicitud es obligatoria.' });
  }
  if (!rc.lineas || rc.lineas.length === 0) {
    errores.push({ campo: 'lineas', mensaje: 'Se requiere al menos una línea.' });
  }
  if (rc.lineas) {
    errores.push(...validarLineasCompra(rc.lineas));
    // Mismo criterio que Orden de Compra: el total se recalcula desde las
    // líneas (nunca se confía en un `rc.totales.total` recibido).
    const totalRecalculado = calcularTotalesLineas(rc.lineas).total;
    if (!Number.isFinite(totalRecalculado)) {
      errores.push({ campo: 'totales.total', mensaje: 'El total del requerimiento no es un valor numérico válido.' });
    } else if (rc.moneda && normalizarImporte(totalRecalculado, rc.moneda) <= 0) {
      errores.push({ campo: 'lineas', mensaje: 'El documento debe tener un total mayor a cero.' });
    }
  }

  return errores;
}
