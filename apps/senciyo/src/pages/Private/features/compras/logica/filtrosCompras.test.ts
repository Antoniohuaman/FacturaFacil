import { describe, it, expect } from 'vitest';
import { filtrarCuentasPorPagar } from './filtrosCompras';
import type { CuentaPorPagar } from '../modelos/CuentaPorPagar';

function crearCxP(overrides: Partial<CuentaPorPagar> = {}): CuentaPorPagar {
  return {
    id: overrides.id ?? 'cxp-1',
    comprobanteCompraId: 'cc-1',
    comprobanteCompraNumero: 'FR23-366',
    tipoComprobanteOrigen: '01',
    proveedorId: 'prov-1',
    proveedorNombre: 'MI EMPRESA SAC',
    proveedorNumeroDocumento: '20123456789',
    moneda: 'PEN',
    total: 150,
    totalPagado: 0,
    saldoPendiente: 150,
    formaPago: 'contado',
    fechaEmision: '2026-07-01',
    estadoPago: 'pendiente',
    estadoVencimiento: 'vigente',
    pagosRelacionados: [],
    historial: [],
    fechaCreacion: '2026-07-01T00:00:00.000Z',
    fechaActualizacion: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('filtrarCuentasPorPagar — bandeja operativa de Cuentas por Pagar', () => {
  it('por defecto (sin soloPendientes=false) excluye las CxP en estado pagada: saldo 0 las saca de la bandeja', () => {
    const pendiente = crearCxP({ id: 'cxp-pendiente', estadoPago: 'pendiente', saldoPendiente: 150 });
    const pagada = crearCxP({ id: 'cxp-pagada', estadoPago: 'pagada', saldoPendiente: 0, totalPagado: 150 });
    const resultado = filtrarCuentasPorPagar([pendiente, pagada], {});
    expect(resultado.map((c) => c.id)).toEqual(['cxp-pendiente']);
  });

  it('excluye también las CxP anuladas', () => {
    const pendiente = crearCxP({ id: 'cxp-pendiente' });
    const anulada = crearCxP({ id: 'cxp-anulada', estadoPago: 'anulada' });
    const resultado = filtrarCuentasPorPagar([pendiente, anulada], {});
    expect(resultado.map((c) => c.id)).toEqual(['cxp-pendiente']);
  });

  it('una CxP con pago parcial (saldo > 0) permanece en la bandeja', () => {
    const parcial = crearCxP({ id: 'cxp-parcial', estadoPago: 'parcial', saldoPendiente: 50, totalPagado: 100 });
    const resultado = filtrarCuentasPorPagar([parcial], {});
    expect(resultado.map((c) => c.id)).toEqual(['cxp-parcial']);
  });

  it('anular un pago restaura la CxP a pendiente y saldo > 0: vuelve a aparecer en la bandeja', () => {
    const original = crearCxP({ id: 'cxp-1', estadoPago: 'pagada', saldoPendiente: 0, totalPagado: 150 });
    // simula lo que hace revertirPagoDeCuentaPorPagar al anular: saldo y estado vuelven a su valor previo
    const restaurada: CuentaPorPagar = { ...original, estadoPago: 'pendiente', saldoPendiente: 150, totalPagado: 0 };

    expect(filtrarCuentasPorPagar([original], {})).toEqual([]);
    expect(filtrarCuentasPorPagar([restaurada], {}).map((c) => c.id)).toEqual(['cxp-1']);
  });

  it('soloPendientes: false permite ver explícitamente también las pagadas/anuladas (uso interno de reportes, no la bandeja por defecto)', () => {
    const pagada = crearCxP({ id: 'cxp-pagada', estadoPago: 'pagada', saldoPendiente: 0 });
    const resultado = filtrarCuentasPorPagar([pagada], { soloPendientes: false });
    expect(resultado.map((c) => c.id)).toEqual(['cxp-pagada']);
  });
});
