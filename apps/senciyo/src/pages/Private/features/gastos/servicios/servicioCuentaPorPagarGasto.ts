// gastos/servicios/servicioCuentaPorPagarGasto.ts
//
// Mapeador Gasto → CuentaPorPagar — vive en Gastos (corrección técnica final
// §16), no en el motor compartido de Compras (`compras/servicios/servicioCuentaPorPagar.ts`).
// Antes vivía allí e importaba `nombreDocumentoSustentatorioGasto` de vuelta
// desde Gastos, una dependencia circular real: el motor compartido (que
// también consume Compras) terminaba importando un servicio interno de uno
// de sus propios consumidores. Aquí Gastos importa DE Compras (dirección
// correcta — `calcularEstadoVencimiento`, `aplicarPagoACuentaPorPagar`,
// `revertirPagoDeCuentaPorPagar`, `anularCuentaPorPagar`, todos genéricos y
// agnósticos de origen), nunca al revés.

import type { CuentaPorPagar, CuotaCuentaPorPagar } from '../../compras/modelos/CuentaPorPagar';
import { calcularEstadoVencimiento } from '../../compras/servicios/servicioCuentaPorPagar';
import { round2 } from '../../compras/logica/reglasCompras';
import type { Gasto } from '../modelos/Gasto';
import { nombreDocumentoSustentatorioGasto } from './servicioGasto';

/**
 * Genera el cronograma de cuotas de la CxP a partir del gasto — mismo
 * criterio que `generarCuotasDesdeCC` (§10 de la corrección): si el gasto es
 * a crédito y trae un cronograma real configurado (`creditTerms`, mismo
 * configurador/modal `CreditPaymentMethodModal` reutilizado de
 * Configuración de Negocio → Pagos), genera una cuota por cada cuota del
 * cronograma; en cualquier otro caso (contado, o crédito sin cronograma
 * configurado — "una sola cuota") genera una cuota única con el total. Un
 * gasto no tiene retención (a diferencia de un Recibo por Honorarios), por
 * lo que el importe de cada cuota nunca se reescala.
 */
function generarCuotasDesdeGasto(gasto: Gasto): CuotaCuentaPorPagar[] {
  if (gasto.condicionPago === 'credito' && gasto.creditTerms && gasto.creditTerms.schedule.length > 0) {
    const schedule = gasto.creditTerms.schedule;
    let acumulado = 0;
    return schedule.map((cuota, index) => {
      const esUltima = index === schedule.length - 1;
      const importe = esUltima ? round2(gasto.total - acumulado) : round2(cuota.importe);
      acumulado = round2(acumulado + importe);
      return {
        id: `${gasto.id}_cuota_${cuota.numeroCuota}`,
        numeroCuota: cuota.numeroCuota,
        fechaVencimiento: cuota.fechaVencimiento,
        montoCuota: importe,
        montoPagado: 0,
        saldoPendiente: importe,
        diasCredito: cuota.diasCredito,
        estadoPago: 'pendiente',
        estadoVencimiento: 'vigente',
      };
    });
  }

  return [
    {
      id: `${gasto.id}_cuota_1`,
      numeroCuota: 1,
      fechaVencimiento: gasto.condicionPago === 'credito' ? (gasto.fechaVencimiento ?? gasto.fechaReconocimiento) : (gasto.fechaEmision ?? gasto.fechaReconocimiento),
      montoCuota: gasto.total,
      montoPagado: 0,
      saldoPendiente: gasto.total,
      estadoPago: 'pendiente',
      estadoVencimiento: 'vigente',
    },
  ];
}

/**
 * Genera la Cuenta por Pagar de un gasto operativo registrado. Reutiliza EL
 * MISMO motor de aplicar/revertir pago que `generarCuentaPorPagar` (nunca una
 * segunda CxP ni un segundo modelo/repositorio) — la única diferencia es el
 * origen documental: `tipoOrigen: 'gasto'`, `documentoOrigenId` apunta al
 * propio gasto, y los campos específicos de Compras
 * (`comprobanteCompraId`/`comprobanteCompraNumero`/`tipoComprobanteOrigen`)
 * quedan vacíos — ningún consumidor de Compras debe leerlos sin filtrar
 * antes por `tipoOrigen === 'compra'` (ver `TablaCuentasPorPagar.tsx`).
 * Se genera TANTO para gastos al contado como al crédito (mismo criterio que
 * ya usa Compras: todo documento genera CxP, el pago se registra siempre
 * como una acción manual y separada contra esa CxP — nunca una segunda
 * fuente de "saldo pendiente" fuera de ella).
 */
export function generarCuentaPorPagarDesdeGasto(gasto: Gasto, id: string): CuentaPorPagar {
  const fechaVencimiento = gasto.condicionPago === 'credito' ? gasto.fechaVencimiento : undefined;
  return {
    id,
    tipoOrigen: 'gasto',
    documentoOrigenId: gasto.id,
    comprobanteCompraId: '',
    comprobanteCompraNumero: '',
    // Nunca el código del documento del proveedor (§4 de la corrección
    // puntual): estos dos campos son EXCLUSIVOS de origen "compra". El
    // documento origen real es `numeroDocumentoOrigen` (la referencia del
    // propio Gasto); su documento sustentatorio, si existe, es un dato
    // separado en `numeroDocumentoSustentatorio` — nunca se interpretan como
    // si el sistema hubiera emitido ese comprobante.
    tipoComprobanteOrigen: '',
    numeroDocumentoOrigen: gasto.referenciaInterna,
    numeroDocumentoSustentatorio: gasto.tipoDocumento ? nombreDocumentoSustentatorioGasto(gasto) : undefined,
    proveedorId: gasto.proveedorId ?? '',
    proveedorNombre: gasto.proveedorNombre ?? gasto.beneficiario ?? 'Sin proveedor',
    proveedorNumeroDocumento: gasto.proveedorNumeroDocumento ?? '',
    moneda: gasto.moneda,
    tipoCambio: gasto.tipoCambio,
    total: gasto.total,
    totalPagado: 0,
    saldoPendiente: gasto.total,
    formaPago: gasto.condicionPago,
    formaPagoMetodoId: gasto.formaPagoMetodoId,
    fechaEmision: gasto.fechaEmision ?? gasto.fechaReconocimiento,
    fechaVencimiento,
    // Cronograma real (una cuota o varias) — mismo criterio que una compra:
    // el formulario central de pago (§11) necesita cuotas seleccionables
    // incluso al contado (una sola), nunca `undefined`.
    cuotas: generarCuotasDesdeGasto(gasto),
    estadoPago: 'pendiente',
    estadoVencimiento: calcularEstadoVencimiento(fechaVencimiento, gasto.total),
    pagosRelacionados: [],
    historial: [
      {
        fecha: gasto.fechaReconocimiento,
        accion: 'Cuenta por pagar generada',
        detalle: `Desde gasto: ${gasto.concepto}`,
      },
    ],
    fechaCreacion: gasto.fechaReconocimiento,
    fechaActualizacion: gasto.fechaReconocimiento,
  };
}
