import { describe, it, expect } from 'vitest';
import {
  aplicarPagoACuentaPorPagar,
  revertirPagoDeCuentaPorPagar,
  recalcularEstadoCuentaPorPagar,
} from './servicioCuentaPorPagar';
import type { CuentaPorPagar, CuotaCuentaPorPagar } from '../modelos/CuentaPorPagar';

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

// ---------------------------------------------------------------------------
// Pago explícito por cuotas (FT05-236, 3 cuotas de crédito 30-60-90) — la
// funcionalidad de selección explícita de cuotas que existía antes del
// soporte multi-documento y que debe seguir funcionando igual, ahora también
// dentro de una `aplicacion` de un Pago con uno o varios documentos.
// ---------------------------------------------------------------------------

function crearCxPConCuotas(): CuentaPorPagar {
  const cuotas: CuotaCuentaPorPagar[] = [
    { id: 'cuota-1', numeroCuota: 1, fechaVencimiento: '2026-08-01', montoCuota: 500, montoPagado: 0, saldoPendiente: 500, estadoPago: 'pendiente', estadoVencimiento: 'vigente' },
    { id: 'cuota-2', numeroCuota: 2, fechaVencimiento: '2026-09-01', montoCuota: 500, montoPagado: 0, saldoPendiente: 500, estadoPago: 'pendiente', estadoVencimiento: 'vigente' },
    { id: 'cuota-3', numeroCuota: 3, fechaVencimiento: '2026-10-01', montoCuota: 500, montoPagado: 0, saldoPendiente: 500, estadoPago: 'pendiente', estadoVencimiento: 'vigente' },
  ];
  return crearCxP({
    id: 'cxp-ft05-236',
    comprobanteCompraNumero: 'FT05-236',
    formaPago: 'credito',
    total: 1500,
    saldoPendiente: 1500,
    cuotas,
  });
}

describe('aplicarPagoACuentaPorPagar — pago explícito por cuotas (Caso obligatorio §23 del alcance)', () => {
  it('Caso 1: pago completo de una cuota — cuota 1 (saldo 500) recibe 500, queda pagada; las demás no se tocan', () => {
    const cxp = crearCxPConCuotas();
    const actualizada = aplicarPagoACuentaPorPagar(cxp, 500, 'pago-1', '2026-07-21', undefined, [
      { cuotaId: 'cuota-1', monto: 500 },
    ]);
    const cuota1 = actualizada.cuotas!.find((c) => c.id === 'cuota-1')!;
    const cuota2 = actualizada.cuotas!.find((c) => c.id === 'cuota-2')!;
    expect(cuota1.montoPagado).toBe(500);
    expect(cuota1.saldoPendiente).toBe(0);
    expect(cuota1.estadoPago).toBe('pagada');
    expect(cuota2.montoPagado).toBe(0);
    expect(cuota2.saldoPendiente).toBe(500);
    expect(actualizada.saldoPendiente).toBe(1000);
    expect(actualizada.estadoPago).toBe('parcial');
  });

  it('Caso 2: pago parcial de una cuota — cuota 2 (saldo 500) recibe 200, queda con saldo 300 y estado parcial', () => {
    const cxp = crearCxPConCuotas();
    const actualizada = aplicarPagoACuentaPorPagar(cxp, 200, 'pago-1', '2026-07-21', undefined, [
      { cuotaId: 'cuota-2', monto: 200 },
    ]);
    const cuota2 = actualizada.cuotas!.find((c) => c.id === 'cuota-2')!;
    expect(cuota2.montoPagado).toBe(200);
    expect(cuota2.saldoPendiente).toBe(300);
    expect(cuota2.estadoPago).toBe('parcial');
  });

  it('Caso 3: varias cuotas del mismo documento en un solo pago — cuota 1 completa (500) + cuota 2 parcial (200), cuota 3 en 0', () => {
    const cxp = crearCxPConCuotas();
    const actualizada = aplicarPagoACuentaPorPagar(cxp, 700, 'pago-1', '2026-07-21', undefined, [
      { cuotaId: 'cuota-1', monto: 500 },
      { cuotaId: 'cuota-2', monto: 200 },
    ]);
    const cuota1 = actualizada.cuotas!.find((c) => c.id === 'cuota-1')!;
    const cuota2 = actualizada.cuotas!.find((c) => c.id === 'cuota-2')!;
    const cuota3 = actualizada.cuotas!.find((c) => c.id === 'cuota-3')!;
    expect(cuota1.estadoPago).toBe('pagada');
    expect(cuota1.saldoPendiente).toBe(0);
    expect(cuota2.estadoPago).toBe('parcial');
    expect(cuota2.saldoPendiente).toBe(300);
    expect(cuota3.montoPagado).toBe(0);
    expect(cuota3.saldoPendiente).toBe(500);
    // El saldo/estado general de la CxP se deriva del total pagado real (700 de 1500), nunca de un cálculo manual en la UI.
    expect(actualizada.totalPagado).toBe(700);
    expect(actualizada.saldoPendiente).toBe(800);
    expect(actualizada.estadoPago).toBe('parcial');
  });

  it('Caso 4/6: un documento con cuotas (700) + otro documento sin cuotas (200) en el MISMO pago — el total del pago es la suma de ambas aplicaciones', () => {
    const documentoConCuotas = crearCxPConCuotas();
    const documentoSinCuotas = crearCxP({ id: 'cxp-simple', total: 200, saldoPendiente: 200 });

    const aplicacionConCuotas = aplicarPagoACuentaPorPagar(documentoConCuotas, 700, 'pago-1', '2026-07-21', undefined, [
      { cuotaId: 'cuota-1', monto: 500 },
      { cuotaId: 'cuota-2', monto: 200 },
    ]);
    const aplicacionSimple = aplicarPagoACuentaPorPagar(documentoSinCuotas, 200, 'pago-1', '2026-07-21');

    // Importe del documento con cuotas = suma real de sus asignaciones (§7 del alcance) — nunca un valor aparte.
    const importeDocumentoConCuotas = 500 + 200;
    expect(aplicacionConCuotas.totalPagado).toBe(importeDocumentoConCuotas);
    expect(aplicacionSimple.totalPagado).toBe(200);

    const totalDelPago = Math.round((importeDocumentoConCuotas + 200) * 100) / 100;
    expect(totalDelPago).toBe(900);
  });

  it('Caso 9/10 (cuotas): anular el pago revierte exactamente las cuotas afectadas, sin tocar la cuota 3 que nunca recibió nada', () => {
    const cxp = crearCxPConCuotas();
    const pagada = aplicarPagoACuentaPorPagar(cxp, 700, 'pago-1', '2026-07-21', undefined, [
      { cuotaId: 'cuota-1', monto: 500 },
      { cuotaId: 'cuota-2', monto: 200 },
    ]);

    const revertida = revertirPagoDeCuentaPorPagar(pagada, 700, 'pago-1', '2026-07-22', undefined, [
      { cuotaId: 'cuota-1', monto: 500 },
      { cuotaId: 'cuota-2', monto: 200 },
    ]);

    const cuota1 = revertida.cuotas!.find((c) => c.id === 'cuota-1')!;
    const cuota2 = revertida.cuotas!.find((c) => c.id === 'cuota-2')!;
    const cuota3 = revertida.cuotas!.find((c) => c.id === 'cuota-3')!;
    expect(cuota1.montoPagado).toBe(0);
    expect(cuota1.saldoPendiente).toBe(500);
    expect(cuota1.estadoPago).toBe('pendiente');
    expect(cuota2.montoPagado).toBe(0);
    expect(cuota2.saldoPendiente).toBe(500);
    expect(cuota3.saldoPendiente).toBe(500);
    expect(revertida.totalPagado).toBe(0);
    expect(revertida.saldoPendiente).toBe(1500);
    expect(revertida.estadoPago).toBe('pendiente');
  });

  it('Caso 11: un documento SIN cuotas (cxp.cuotas undefined) sigue aplicándose de forma agregada, sin generar cuotas ficticias', () => {
    const cxp = crearCxP({ saldoPendiente: 150, total: 150 });
    expect(cxp.cuotas).toBeUndefined();
    const actualizada = aplicarPagoACuentaPorPagar(cxp, 100, 'pago-1', '2026-07-21');
    expect(actualizada.cuotas).toBeUndefined();
    expect(actualizada.saldoPendiente).toBe(50);
    expect(actualizada.estadoPago).toBe('parcial');
  });

  it('pagar las 3 cuotas completas deja la CxP en saldo 0 / estado pagada (sale de la bandeja de pendientes)', () => {
    const cxp = crearCxPConCuotas();
    const pagada = aplicarPagoACuentaPorPagar(cxp, 1500, 'pago-1', '2026-07-21', undefined, [
      { cuotaId: 'cuota-1', monto: 500 },
      { cuotaId: 'cuota-2', monto: 500 },
      { cuotaId: 'cuota-3', monto: 500 },
    ]);
    expect(pagada.saldoPendiente).toBe(0);
    expect(pagada.estadoPago).toBe('pagada');
    expect(pagada.cuotas!.every((c) => c.estadoPago === 'pagada' && c.saldoPendiente === 0)).toBe(true);
  });

  it('anular un pago que había cancelado las 3 cuotas restaura la CxP a pendiente con su saldo original completo', () => {
    const cxp = crearCxPConCuotas();
    const asignaciones = [
      { cuotaId: 'cuota-1', monto: 500 },
      { cuotaId: 'cuota-2', monto: 500 },
      { cuotaId: 'cuota-3', monto: 500 },
    ];
    const pagada = aplicarPagoACuentaPorPagar(cxp, 1500, 'pago-1', '2026-07-21', undefined, asignaciones);
    const restaurada = revertirPagoDeCuentaPorPagar(pagada, 1500, 'pago-1', '2026-07-22', undefined, asignaciones);

    expect(restaurada.saldoPendiente).toBe(1500);
    expect(restaurada.estadoPago).toBe('pendiente');
    expect(restaurada.cuotas!.every((c) => c.estadoPago === 'pendiente' && c.saldoPendiente === 500)).toBe(true);
  });
});
