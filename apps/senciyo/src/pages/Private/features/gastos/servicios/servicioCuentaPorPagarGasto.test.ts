// Movido desde `compras/servicios/servicioCuentaPorPagar.test.ts` (corrección
// técnica final §16): el mapeador Gasto → CuentaPorPagar vive en Gastos, no
// en el motor compartido de Compras — este archivo prueba esa MISMA lógica,
// solo reubicada junto a su código de producción.

import { describe, it, expect } from 'vitest';
import { generarCuentaPorPagarDesdeGasto } from './servicioCuentaPorPagarGasto';
import {
  aplicarPagoACuentaPorPagar,
  revertirPagoDeCuentaPorPagar,
  anularCuentaPorPagar,
} from '../../compras/servicios/servicioCuentaPorPagar';
import type { Gasto } from '../modelos/Gasto';

function crearGastoFixture(overrides: Partial<Gasto> = {}): Gasto {
  return {
    id: 'gasto-1',
    referenciaInterna: 'GTO-00000001',
    empresaId: 'empresa-1',
    fechaReconocimiento: '2026-07-01',
    categoriaId: 'cat-alquileres',
    concepto: 'Alquiler de julio',
    beneficiario: 'Inmobiliaria XYZ',
    moneda: 'PEN',
    subtotal: 100,
    impuesto: 18,
    total: 118,
    tratamientoImpuesto: 'no_recuperable',
    condicionPago: 'contado',
    pagosRelacionados: [],
    adjuntos: [],
    estadoDocumento: 'registrado',
    historial: [],
    fechaCreacion: '2026-07-01T00:00:00.000Z',
    fechaActualizacion: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('generarCuentaPorPagarDesdeGasto', () => {
  it('genera una CxP con tipoOrigen "gasto" y documentoOrigenId apuntando al gasto, sin campos de ComprobanteCompra', () => {
    const cxp = generarCuentaPorPagarDesdeGasto(crearGastoFixture(), 'cxp-gasto-1');
    expect(cxp.tipoOrigen).toBe('gasto');
    expect(cxp.documentoOrigenId).toBe('gasto-1');
    expect(cxp.comprobanteCompraId).toBe('');
    expect(cxp.saldoPendiente).toBe(118);
    expect(cxp.estadoPago).toBe('pendiente');
  });

  it('numeroDocumentoOrigen es la referenciaInterna del gasto; tipoComprobanteOrigen queda vacío (§4 de la corrección puntual — nunca el documento del proveedor interpretado como el propio)', () => {
    const cxp = generarCuentaPorPagarDesdeGasto(crearGastoFixture({ referenciaInterna: 'G001-00000007' }), 'cxp-gasto-1b');
    expect(cxp.numeroDocumentoOrigen).toBe('G001-00000007');
    expect(cxp.tipoComprobanteOrigen).toBe('');
    expect(cxp.numeroDocumentoSustentatorio).toBeUndefined();
  });

  it('con documento sustentatorio del proveedor, lo expone en numeroDocumentoSustentatorio (separado del documento origen)', () => {
    const cxp = generarCuentaPorPagarDesdeGasto(
      crearGastoFixture({ tipoDocumento: '01', serieDocumentoProveedor: 'F001', numeroDocumentoProveedor: '123' }),
      'cxp-gasto-1c',
    );
    expect(cxp.numeroDocumentoSustentatorio).toBe('Factura · F001-123');
    expect(cxp.tipoComprobanteOrigen).toBe('');
  });

  it('sin proveedor formal, usa el beneficiario de texto libre como nombre de la CxP', () => {
    const cxp = generarCuentaPorPagarDesdeGasto(
      crearGastoFixture({ proveedorId: undefined, proveedorNombre: undefined, beneficiario: 'Movilidad conductor' }),
      'cxp-gasto-2',
    );
    expect(cxp.proveedorId).toBe('');
    expect(cxp.proveedorNombre).toBe('Movilidad conductor');
  });

  it('propaga formaPagoMetodoId a la CxP cuando el gasto tiene una forma de pago configurada (§3 de la corrección — misma fuente que Compras)', () => {
    const cxp = generarCuentaPorPagarDesdeGasto(
      crearGastoFixture({ condicionPago: 'credito', formaPagoMetodoId: 'metodo-credito-1' }),
      'cxp-gasto-forma-pago',
    );
    expect(cxp.formaPagoMetodoId).toBe('metodo-credito-1');
  });

  it('gasto al crédito propaga la fecha de vencimiento; al contado la deja indefinida', () => {
    const cxpCredito = generarCuentaPorPagarDesdeGasto(
      crearGastoFixture({ condicionPago: 'credito', fechaVencimiento: '2026-08-01' }),
      'cxp-gasto-3',
    );
    expect(cxpCredito.fechaVencimiento).toBe('2026-08-01');

    const cxpContado = generarCuentaPorPagarDesdeGasto(crearGastoFixture({ condicionPago: 'contado' }), 'cxp-gasto-4');
    expect(cxpContado.fechaVencimiento).toBeUndefined();
  });

  it('reutiliza el MISMO motor aplicarPagoACuentaPorPagar/revertirPagoDeCuentaPorPagar que Compras — nunca un motor paralelo (pago total + reversión)', () => {
    const cxp = generarCuentaPorPagarDesdeGasto(crearGastoFixture(), 'cxp-gasto-5');
    const pagada = aplicarPagoACuentaPorPagar(cxp, 118, 'pago-gasto-1', '2026-07-05');
    expect(pagada.saldoPendiente).toBe(0);
    expect(pagada.estadoPago).toBe('pagada');

    const revertida = revertirPagoDeCuentaPorPagar(pagada, 118, 'pago-gasto-1', '2026-07-06');
    expect(revertida.saldoPendiente).toBe(118);
    expect(revertida.estadoPago).toBe('pendiente');
  });

  it('un pago PARCIAL de un gasto al crédito deja la CxP en estado "parcial" con el saldo restante correcto', () => {
    const cxp = generarCuentaPorPagarDesdeGasto(
      crearGastoFixture({ condicionPago: 'credito', fechaVencimiento: '2026-08-01', total: 118 }),
      'cxp-gasto-6',
    );
    const parcial = aplicarPagoACuentaPorPagar(cxp, 50, 'pago-gasto-2', '2026-07-10');
    expect(parcial.totalPagado).toBe(50);
    expect(parcial.saldoPendiente).toBe(68);
    expect(parcial.estadoPago).toBe('parcial');
  });

  it('un gasto al contado genera una única cuota con el total — nunca cuotas indefinidas (§10/§11 de la corrección: el formulario central de pago necesita cuotas seleccionables)', () => {
    const cxp = generarCuentaPorPagarDesdeGasto(crearGastoFixture({ condicionPago: 'contado', total: 118 }), 'cxp-gasto-7');
    expect(cxp.cuotas).toHaveLength(1);
    expect(cxp.cuotas?.[0]).toMatchObject({ numeroCuota: 1, montoCuota: 118, saldoPendiente: 118, estadoPago: 'pendiente' });
  });

  it('un gasto al crédito SIN cronograma configurado genera "una sola cuota" con el vencimiento elegido — nunca un texto inventado de "crédito simple sin configurar"', () => {
    const cxp = generarCuentaPorPagarDesdeGasto(
      crearGastoFixture({ condicionPago: 'credito', fechaVencimiento: '2026-08-15', total: 118 }),
      'cxp-gasto-8',
    );
    expect(cxp.cuotas).toHaveLength(1);
    expect(cxp.cuotas?.[0]).toMatchObject({ numeroCuota: 1, fechaVencimiento: '2026-08-15', montoCuota: 118 });
  });

  it('un gasto al crédito CON cronograma real configurado genera una cuota por cada cuota del cronograma, con la suma exacta del total (§10 de la corrección)', () => {
    const gasto = crearGastoFixture({
      condicionPago: 'credito',
      total: 300,
      creditTerms: {
        fechaVencimientoGlobal: '2026-09-15',
        schedule: [
          { numeroCuota: 1, fechaVencimiento: '2026-07-15', importe: 100, dias: 15 },
          { numeroCuota: 2, fechaVencimiento: '2026-08-15', importe: 100, dias: 45 },
          { numeroCuota: 3, fechaVencimiento: '2026-09-15', importe: 100, dias: 75 },
        ],
      },
    });
    const cxp = generarCuentaPorPagarDesdeGasto(gasto, 'cxp-gasto-9');
    expect(cxp.cuotas).toHaveLength(3);
    expect(cxp.cuotas?.map((c) => c.montoCuota)).toEqual([100, 100, 100]);
    expect(cxp.cuotas?.map((c) => c.fechaVencimiento)).toEqual(['2026-07-15', '2026-08-15', '2026-09-15']);
    const sumaCuotas = cxp.cuotas!.reduce((acc, c) => acc + c.montoCuota, 0);
    expect(sumaCuotas).toBe(cxp.total);
  });

  it('el pago de una cuota específica del cronograma de un gasto usa el mismo motor de asignación explícita que Compras — nunca redistribuye entre cuotas no seleccionadas', () => {
    const gasto = crearGastoFixture({
      condicionPago: 'credito',
      total: 200,
      creditTerms: {
        fechaVencimientoGlobal: '2026-08-15',
        schedule: [
          { numeroCuota: 1, fechaVencimiento: '2026-07-15', importe: 100, dias: 15 },
          { numeroCuota: 2, fechaVencimiento: '2026-08-15', importe: 100, dias: 45 },
        ],
      },
    });
    const cxp = generarCuentaPorPagarDesdeGasto(gasto, 'cxp-gasto-10');
    const cuota1 = cxp.cuotas!.find((c) => c.numeroCuota === 1)!;
    const pagada = aplicarPagoACuentaPorPagar(cxp, 100, 'pago-gasto-3', '2026-07-15', 'usr-1', [{ cuotaId: cuota1.id, monto: 100 }]);
    expect(pagada.cuotas?.find((c) => c.numeroCuota === 1)?.estadoPago).toBe('pagada');
    expect(pagada.cuotas?.find((c) => c.numeroCuota === 2)?.estadoPago).toBe('pendiente');
    expect(pagada.saldoPendiente).toBe(100);
  });
});

describe('Ciclo de vida de la CxP según el estado del gasto (corrección puntual §3/§6-B)', () => {
  it('registrado pendiente: la CxP nace con saldo pendiente igual al total, sin ningún pago aplicado', () => {
    const gasto = crearGastoFixture({ estadoDocumento: 'registrado', total: 118 });
    const cxp = generarCuentaPorPagarDesdeGasto(gasto, 'cxp-lifecycle-1');
    expect(cxp.saldoPendiente).toBe(118);
    expect(cxp.totalPagado).toBe(0);
    expect(cxp.estadoPago).toBe('pendiente');
  });

  it('pagado inmediatamente ("Registrar y pagar"): tras aplicar el pago total en la MISMA operación, la CxP no queda con deuda pendiente', () => {
    const gasto = crearGastoFixture({ estadoDocumento: 'registrado', total: 118 });
    const cxp = generarCuentaPorPagarDesdeGasto(gasto, 'cxp-lifecycle-2');
    const cxpPagada = aplicarPagoACuentaPorPagar(cxp, 118, 'pago-inmediato-1', '2026-07-15', 'usr-1');
    expect(cxpPagada.saldoPendiente).toBe(0);
    expect(cxpPagada.estadoPago).toBe('pagada');
  });

  it('anulado: anularCuentaPorPagar dejas de tener una obligación activa (estadoPago "anulada"), sin importar el saldo previo', () => {
    const gasto = crearGastoFixture({ estadoDocumento: 'registrado', total: 118 });
    const cxp = generarCuentaPorPagarDesdeGasto(gasto, 'cxp-lifecycle-3');
    const cxpAnulada = anularCuentaPorPagar(cxp, 'Gasto duplicado', '2026-07-16');
    expect(cxpAnulada.estadoPago).toBe('anulada');
    expect(cxpAnulada.saldoPendiente).toBe(cxp.saldoPendiente); // el saldo no se fuerza a 0: la CxP queda marcada como sin obligación activa vía su estado, nunca reescribiendo el monto histórico
  });

  it('un pago parcial deja la CxP con saldo pendiente reducido, nunca en "pagada" ni "anulada"', () => {
    const gasto = crearGastoFixture({ estadoDocumento: 'registrado', total: 200 });
    const cxp = generarCuentaPorPagarDesdeGasto(gasto, 'cxp-lifecycle-4');
    const cxpParcial = aplicarPagoACuentaPorPagar(cxp, 80, 'pago-parcial-1', '2026-07-15', 'usr-1');
    expect(cxpParcial.saldoPendiente).toBe(120);
    expect(cxpParcial.estadoPago).toBe('parcial');
  });
});
