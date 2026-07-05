import { isCashPaymentMeanCode, type PaymentMeanOption } from '@/shared/payments/paymentMeans';
import type { PagoCompra, MedioPagoCompra } from '../modelos/PagoCompra';
import type { CuentaPorPagar } from '../modelos/CuentaPorPagar';
import type { ErrorValidacion } from './tiposServiciosCompras';

/**
 * Códigos del catálogo real de medios de pago (Catálogo 59 SUNAT, ver
 * @/shared/payments/paymentMeans) que se liquidan en una cuenta bancaria:
 * depósito, giro, transferencia, tarjeta débito/crédito. Único punto de
 * verdad para "medio bancario" en Compras — no se deriva de texto libre.
 */
const CODIGOS_MEDIO_BANCARIO = new Set(['001', '002', '003', '005', '006']);

/** Medios bancarios + cheque: requieren número de operación/referencia. */
const CODIGOS_MEDIO_CON_REFERENCIA = new Set(['001', '002', '003', '005', '006', '007']);

/** Único punto de verdad: ¿este código de medio de pago impacta la caja (efectivo)? */
export function esMedioDeCaja(codigoMedioPago: string): boolean {
  return isCashPaymentMeanCode(codigoMedioPago);
}

/** Único punto de verdad: ¿este código de medio de pago requiere cuenta bancaria? */
export function esMedioBancario(codigoMedioPago: string): boolean {
  return CODIGOS_MEDIO_BANCARIO.has(codigoMedioPago);
}

/** Único punto de verdad: ¿este código de medio de pago requiere número de operación/referencia? */
export function requiereReferencia(codigoMedioPago: string): boolean {
  return CODIGOS_MEDIO_CON_REFERENCIA.has(codigoMedioPago);
}

/**
 * Valida que cada medio de pago:
 * - pertenezca realmente al catálogo de medios activos/visibles (defensa
 *   contra un código que ya no existe o fue desactivado en Configuración),
 * - incluya cuenta bancaria si es un medio bancario,
 * - incluya referencia/número de operación si el medio lo requiere.
 */
export function validarMediosPagoCompra(
  medios: MedioPagoCompra[],
  mediosDisponibles: PaymentMeanOption[],
): ErrorValidacion[] {
  const errores: ErrorValidacion[] = [];
  const codigosValidos = new Set(mediosDisponibles.filter((m) => m.isVisible).map((m) => m.code));

  medios.forEach((medio, i) => {
    if (!medio.medioPagoCodigo || !codigosValidos.has(medio.medioPagoCodigo)) {
      errores.push({
        campo: `mediosPago[${i}].medioPagoCodigo`,
        mensaje: `Selecciona un medio de pago válido y activo en la línea ${i + 1}.`,
      });
      return;
    }

    if (esMedioBancario(medio.medioPagoCodigo) && !medio.cuentaBancariaId) {
      errores.push({
        campo: `mediosPago[${i}].cuentaBancariaId`,
        mensaje: `La cuenta bancaria es obligatoria para el medio de pago "${medio.medioPagoNombre}".`,
      });
    }
    if (requiereReferencia(medio.medioPagoCodigo) && !medio.referenciaOperacion?.trim()) {
      errores.push({
        campo: `mediosPago[${i}].referenciaOperacion`,
        mensaje: `El número de operación/referencia es obligatorio para el medio de pago "${medio.medioPagoNombre}".`,
      });
    }
  });

  return errores;
}

/** Indica si alguno de los medios de pago corresponde a un medio de caja (efectivo). */
export function tieneMedioDeCaja(medios: MedioPagoCompra[]): boolean {
  return medios.some((medio) => esMedioDeCaja(medio.medioPagoCodigo));
}

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

/**
 * Valida que el monto total pagado no supere la suma de saldos pendientes de
 * las cuentas por pagar a las que se aplica. Defensa de servicio: el
 * formulario ya bloquea esto en UI, pero registrarPagoCompra no debe confiar
 * solo en eso.
 */
export function validarPagoNoExcedeSaldo(
  montoTotalPagado: number,
  cuentasPorPagar: CuentaPorPagar[],
): ErrorValidacion[] {
  const saldoTotal = cuentasPorPagar.reduce((acc, c) => acc + c.saldoPendiente, 0);

  if (round2(montoTotalPagado - saldoTotal) > 0.01) {
    return [
      {
        campo: 'montoTotalPagado',
        mensaje: 'El importe pagado no puede ser mayor al saldo pendiente.',
      },
    ];
  }

  return [];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
