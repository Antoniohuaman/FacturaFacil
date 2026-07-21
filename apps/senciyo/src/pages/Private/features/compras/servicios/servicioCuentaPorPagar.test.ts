import { describe, it, expect } from 'vitest';
import {
  aplicarPagoACuentaPorPagar,
  revertirPagoDeCuentaPorPagar,
  recalcularEstadoCuentaPorPagar,
} from './servicioCuentaPorPagar';
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

describe('recalcularEstadoCuentaPorPagar', () => {
  it('sin nada pagado: pendiente', () => {
    expect(recalcularEstadoCuentaPorPagar(150, 0)).toBe('pendiente');
  });
  it('pagado parcialmente: parcial', () => {
    expect(recalcularEstadoCuentaPorPagar(150, 100)).toBe('parcial');
  });
  it('pagado por completo: pagada', () => {
    expect(recalcularEstadoCuentaPorPagar(150, 150)).toBe('pagada');
  });
});

describe('aplicarPagoACuentaPorPagar — Caso 1: un documento, pago total', () => {
  it('saldo 150, aplicar 150 → saldo nuevo 0, estado pagada', () => {
    const cxp = crearCxP({ total: 150, saldoPendiente: 150, totalPagado: 0 });
    const actualizada = aplicarPagoACuentaPorPagar(cxp, 150, 'pago-1', '2026-07-21');
    expect(actualizada.totalPagado).toBe(150);
    expect(actualizada.saldoPendiente).toBe(0);
    expect(actualizada.estadoPago).toBe('pagada');
    expect(actualizada.pagosRelacionados).toEqual(['pago-1']);
  });
});

describe('aplicarPagoACuentaPorPagar — Caso 2: un documento, pago parcial', () => {
  it('saldo 150, aplicar 100 → saldo nuevo 50, estado parcial', () => {
    const cxp = crearCxP({ total: 150, saldoPendiente: 150, totalPagado: 0 });
    const actualizada = aplicarPagoACuentaPorPagar(cxp, 100, 'pago-1', '2026-07-21');
    expect(actualizada.totalPagado).toBe(100);
    expect(actualizada.saldoPendiente).toBe(50);
    expect(actualizada.estadoPago).toBe('parcial');
  });
});

describe('aplicarPagoACuentaPorPagar — Caso 3/4: varios documentos en un mismo pago, cada uno con su propio importe', () => {
  it('factura A (saldo 150, aplica 150) y factura B (saldo 30, aplica 30): ambas quedan en 0/pagada, de forma independiente', () => {
    const facturaA = crearCxP({ id: 'cxp-a', total: 150, saldoPendiente: 150 });
    const facturaB = crearCxP({ id: 'cxp-b', total: 30, saldoPendiente: 30, comprobanteCompraNumero: 'FR01-223' });

    const actualizadaA = aplicarPagoACuentaPorPagar(facturaA, 150, 'pago-1', '2026-07-21');
    const actualizadaB = aplicarPagoACuentaPorPagar(facturaB, 30, 'pago-1', '2026-07-21');

    expect(actualizadaA.saldoPendiente).toBe(0);
    expect(actualizadaA.estadoPago).toBe('pagada');
    expect(actualizadaB.saldoPendiente).toBe(0);
    expect(actualizadaB.estadoPago).toBe('pagada');
    // Un pago múltiple nunca aplica el TOTAL del pago a cada documento — cada
    // uno solo recibe su propio importeAplicado (150 y 30, nunca 180 a ambos).
    expect(actualizadaA.totalPagado).toBe(150);
    expect(actualizadaB.totalPagado).toBe(30);
  });

  it('pago mixto: factura A se cancela por completo (150/150) y factura B queda con saldo parcial (50 de 100)', () => {
    const facturaA = crearCxP({ id: 'cxp-a', total: 150, saldoPendiente: 150 });
    const facturaB = crearCxP({ id: 'cxp-b', total: 100, saldoPendiente: 100 });

    const actualizadaA = aplicarPagoACuentaPorPagar(facturaA, 150, 'pago-1', '2026-07-21');
    const actualizadaB = aplicarPagoACuentaPorPagar(facturaB, 50, 'pago-1', '2026-07-21');

    expect(actualizadaA.estadoPago).toBe('pagada');
    expect(actualizadaA.saldoPendiente).toBe(0);
    expect(actualizadaB.estadoPago).toBe('parcial');
    expect(actualizadaB.saldoPendiente).toBe(50);
  });
});

describe('revertirPagoDeCuentaPorPagar — Caso 9: anulación de un pago multi-documento restaura cada saldo de forma independiente', () => {
  it('revierte el importe exacto de CADA documento, nunca el total agregado del pago', () => {
    const facturaAPagada = aplicarPagoACuentaPorPagar(
      crearCxP({ id: 'cxp-a', total: 150, saldoPendiente: 150 }),
      150,
      'pago-1',
      '2026-07-21',
    );
    const facturaBPagada = aplicarPagoACuentaPorPagar(
      crearCxP({ id: 'cxp-b', total: 100, saldoPendiente: 100 }),
      50,
      'pago-1',
      '2026-07-21',
    );

    const facturaARevertida = revertirPagoDeCuentaPorPagar(facturaAPagada, 150, 'pago-1', '2026-07-22');
    const facturaBRevertida = revertirPagoDeCuentaPorPagar(facturaBPagada, 50, 'pago-1', '2026-07-22');

    expect(facturaARevertida.saldoPendiente).toBe(150);
    expect(facturaARevertida.totalPagado).toBe(0);
    expect(facturaARevertida.estadoPago).toBe('pendiente');

    expect(facturaBRevertida.saldoPendiente).toBe(100);
    expect(facturaBRevertida.totalPagado).toBe(0);
    expect(facturaBRevertida.estadoPago).toBe('pendiente');
  });

  it('el pago revertido permanece en pagosRelacionados (historial), no se elimina del arreglo', () => {
    const facturaPagada = aplicarPagoACuentaPorPagar(crearCxP({ saldoPendiente: 150, total: 150 }), 150, 'pago-1', '2026-07-21');
    const revertida = revertirPagoDeCuentaPorPagar(facturaPagada, 150, 'pago-1', '2026-07-22');
    expect(revertida.pagosRelacionados).toEqual(['pago-1']);
  });
});
