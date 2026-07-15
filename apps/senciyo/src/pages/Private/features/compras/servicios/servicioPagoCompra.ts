import { createElement } from 'react';
import { isCashPaymentMeanCode, type PaymentMeanOption } from '@/shared/payments/paymentMeans';
import { imprimirComprobante } from '@/shared/impresion/ServicioImpresionComprobante';
import { formatMoney, normalizarImporte } from '@/shared/currency';
import type { PagoCompra, MedioPagoCompra } from '../modelos/PagoCompra';
import { ESTADO_DOCUMENTO_PAGO_LABELS } from '../modelos/PagoCompra';
import type { CuentaPorPagar } from '../modelos/CuentaPorPagar';
import type { ErrorValidacion } from './tiposServiciosCompras';
import { formatearFechaCompra } from '../utilidades/formatearCompras';
import type { EmpresaOC } from './servicioOrdenCompra';

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
  const moneda = pago.moneda ?? 'PEN';
  if (
    pago.mediosPago &&
    pago.mediosPago.length > 0 &&
    normalizarImporte(sumaMedios, moneda) !== normalizarImporte(totalPago, moneda)
  ) {
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
  const moneda = cuentasPorPagar[0]?.moneda ?? 'PEN';

  if (normalizarImporte(montoTotalPagado, moneda) > normalizarImporte(saldoTotal, moneda)) {
    return [
      {
        campo: 'montoTotalPagado',
        mensaje: 'El importe pagado no puede ser mayor al saldo pendiente.',
      },
    ];
  }

  return [];
}

function fila(label: string, valor: string) {
  return createElement(
    'div',
    { style: { display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: '11px' } },
    createElement('span', { style: { color: '#6B7280' } }, label),
    createElement('span', { style: { fontWeight: 600, color: '#111827' } }, valor || '—'),
  );
}

function seccion(titulo: string, children: Array<ReturnType<typeof createElement> | null>) {
  return createElement(
    'div',
    { style: { marginTop: '14px' } },
    createElement(
      'p',
      { style: { fontSize: '10px', textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: '#9CA3AF', marginBottom: '4px', fontWeight: 700 } },
      titulo,
    ),
    ...children.filter(Boolean),
  );
}

/**
 * Construye la representación imprimible del Pago de Compra (PG). Mismo
 * patrón que construirRepresentacionImpresaCC (servicioComprobanteCompra.ts):
 * sin componente/archivo separado, createElement inline.
 */
function construirRepresentacionImpresaPago(pago: PagoCompra, empresa: EmpresaOC | undefined) {
  return createElement(
    'div',
    { style: { fontFamily: 'Arial, sans-serif', padding: '28px', color: '#111827' } },
    createElement(
      'div',
      { style: { display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #111827', paddingBottom: '12px', marginBottom: '16px' } },
      createElement(
        'div',
        null,
        createElement('h1', { style: { margin: 0, fontSize: '15px' } }, empresa?.razonSocial ?? '—'),
        empresa?.ruc ? createElement('p', { style: { margin: 0, fontSize: '11px' } }, `RUC: ${empresa.ruc}`) : null,
        empresa?.direccion ? createElement('p', { style: { margin: 0, fontSize: '11px' } }, empresa.direccion) : null,
      ),
      createElement(
        'div',
        { style: { textAlign: 'right' as const } },
        createElement('h2', { style: { margin: 0, fontSize: '14px' } }, 'PAGO DE COMPRA'),
        createElement('p', { style: { margin: 0, fontWeight: 700 } }, pago.numeroPago),
        createElement('p', { style: { margin: 0, fontSize: '11px' } }, ESTADO_DOCUMENTO_PAGO_LABELS[pago.estadoDocumento]),
        createElement('p', { style: { margin: 0, fontSize: '11px' } }, `Fecha: ${formatearFechaCompra(pago.fechaPago)}`),
      ),
    ),
    seccion('Proveedor', [
      fila('Nombre', pago.proveedorNombre),
      pago.concepto ? fila('Concepto', pago.concepto) : null,
    ]),
    seccion('Medios de pago', [
      ...pago.mediosPago.map((medio) =>
        fila(
          `${medio.medioPagoNombre}${medio.referenciaOperacion ? ` (Ref: ${medio.referenciaOperacion})` : ''}`,
          formatMoney(medio.monto, medio.moneda ?? pago.moneda),
        ),
      ),
      fila('Total', formatMoney(pago.montoTotalPagado, pago.moneda)),
    ]),
    pago.documentoSustentoTipo || pago.documentoSustentoSerie
      ? seccion('Documento sustentatorio', [
          pago.documentoSustentoTipo ? fila('Tipo', pago.documentoSustentoTipo) : null,
          (pago.documentoSustentoSerie || pago.documentoSustentoNumero)
            ? fila('Serie - número', `${pago.documentoSustentoSerie ?? ''}-${pago.documentoSustentoNumero ?? ''}`)
            : null,
        ])
      : null,
    pago.observaciones ? seccion('Observaciones', [createElement('p', { style: { fontSize: '11px' } }, pago.observaciones)]) : null,
    pago.estadoDocumento === 'anulado' && pago.motivoAnulacion
      ? seccion('Anulación', [fila('Motivo', pago.motivoAnulacion)])
      : null,
  );
}

/**
 * Imprime el Pago de Compra reutilizando el motor de impresión compartido
 * (imprimirComprobante, el mismo usado por OC/CC/GRE/comprobantes electrónicos).
 */
export async function imprimirPagoCompra(pago: PagoCompra, empresa: EmpresaOC | undefined): Promise<void> {
  await imprimirComprobante({
    formato: 'A4',
    titulo: `Pago de Compra ${pago.numeroPago}`,
    render: () => construirRepresentacionImpresaPago(pago, empresa),
  });
}

/** "Descargar PDF" reutiliza el mismo mecanismo que "Imprimir" (window.print), mismo patrón ya usado por OC/CC. */
export const descargarPdfPagoCompra = imprimirPagoCompra;
