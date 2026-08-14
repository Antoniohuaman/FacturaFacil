// Prueba de integración de GAS-P3-002 — la auditoría señaló que la
// reversión de Caja al anular un pago de gasto PARECÍA correcta por
// inspección de código, pero no tenía ninguna prueba dedicada. Este archivo
// cierra esa brecha reproduciendo, con las funciones REALES de producción
// (`motivoBloqueoAnulacionPago`, `revertirPagoDeCuentaPorPagar`,
// `esMedioDeCaja`, `normalizarMotivoAnulacion`), la MISMA secuencia que
// `ContextoGastos.tsx#anularPagoGasto` — nunca una reimplementación paralela
// de esas reglas. También agrega la prueba de "pagos parciales secuenciales"
// que la auditoría señaló como faltante (parcial → parcial → saldo
// pendiente, no solo "parcial → total"), reutilizando exclusivamente el
// motor de CxP ya existente (`aplicarPagoACuentaPorPagar`/
// `revertirPagoDeCuentaPorPagar`), sin ninguna lógica de saldo nueva.
//
// Limitación de entorno (igual que el resto de `.integration.test.ts` de
// Gastos): sin librería de testing de componentes React, no se monta
// `GastosProvider`/`CajaProvider` reales — se simula la orquestación con un
// mock de `agregarMovimiento` que registra cada invocación (tipo, monto,
// referencia, claveIdempotencia) para poder aserirlas.

import { describe, it, expect } from 'vitest';
import { motivoBloqueoAnulacionPago } from '../../compras/logica/reglasCompras';
import { esMedioDeCaja, tieneMedioDeCaja } from '../../compras/servicios/servicioPagoCompra';
import { aplicarPagoACuentaPorPagar, revertirPagoDeCuentaPorPagar } from '../../compras/servicios/servicioCuentaPorPagar';
import { generarCuentaPorPagarDesdeGasto } from '../servicios/servicioCuentaPorPagarGasto';
import { crearGasto, normalizarMotivoAnulacion } from '../servicios/servicioGasto';
import type { CuentaPorPagar } from '../../compras/modelos/CuentaPorPagar';
import type { PagoCompra, MedioPagoCompra } from '../../compras/modelos/PagoCompra';
import type { Gasto } from '../modelos/Gasto';

interface MovimientoCajaRegistrado {
  tipo: 'Ingreso' | 'Egreso';
  concepto: string;
  monto: number;
  referencia: string;
  claveIdempotencia: string;
}

function crearGastoFixture(overrides: Partial<Gasto> = {}): Gasto {
  return crearGasto(
    {
      empresaId: 'empresa-1', fechaReconocimiento: '2026-07-01', categoriaId: 'cat-mantenimiento',
      concepto: 'Mantenimiento de equipos', beneficiario: 'Técnico SAC', moneda: 'PEN',
      subtotal: 1000, impuesto: 0, total: 1000, tratamientoImpuesto: 'sin_desglose', condicionPago: 'contado',
      ...overrides,
    },
    overrides.id ?? 'gasto-1',
    'GTO-00000001',
  );
}

function crearMedioEfectivo(id: string, monto: number): MedioPagoCompra {
  return { id, medioPagoCodigo: '008', medioPagoNombre: 'Efectivo', monto };
}

/**
 * Reproduce, con funciones reales, la secuencia exacta de
 * `ContextoGastos.tsx#anularPagoGasto` (líneas 801-866): valida bloqueo,
 * valida caja abierta si el pago tuvo medio de caja, registra el Ingreso
 * compensatorio POR MEDIO (clave `reversion-${pagoId}:${medio.id}`, la MISMA
 * corrección aplicada en esta tarea para GAS-P3-002), marca el Pago como
 * anulado, y revierte la CxP con `revertirPagoDeCuentaPorPagar`.
 */
async function simularAnularPagoGasto(params: {
  pago: PagoCompra;
  cxp: CuentaPorPagar;
  cajaAbierta: boolean;
  registrarCaja: (movimiento: MovimientoCajaRegistrado) => Promise<void>;
  motivo?: string;
  anuladoPor?: string;
  fecha?: string;
}): Promise<{ pagoAnulado: PagoCompra; cxpRevertida: CuentaPorPagar }> {
  const { pago, cxp, cajaAbierta, registrarCaja, anuladoPor = 'user-1', fecha = '2026-07-10T00:00:00.000Z' } = params;
  const motivoLimpio = normalizarMotivoAnulacion(params.motivo ?? 'Gasto duplicado');

  const motivoBloqueo = motivoBloqueoAnulacionPago(pago);
  if (motivoBloqueo) throw new Error(motivoBloqueo);

  if (tieneMedioDeCaja(pago.mediosPago) && !cajaAbierta) {
    throw new Error('No se puede anular el pago porque la caja relacionada está cerrada y no se puede registrar la compensación.');
  }

  for (const medio of pago.mediosPago) {
    if (medio.monto <= 0 || !esMedioDeCaja(medio.medioPagoCodigo)) continue;
    await registrarCaja({
      tipo: 'Ingreso',
      concepto: `Reversión por anulación de pago ${pago.numeroPago}`,
      monto: medio.monto,
      referencia: pago.numeroPago,
      claveIdempotencia: `reversion-${pago.id}:${medio.id}`,
    });
  }

  const pagoAnulado: PagoCompra = {
    ...pago,
    estadoDocumento: 'anulado',
    motivoAnulacion: motivoLimpio,
    fechaAnulacion: fecha,
    anuladoPor,
    historial: [...pago.historial, { fecha, usuario: anuladoPor, accion: 'Pago anulado', detalle: motivoLimpio }],
  };

  const cxpRevertida = revertirPagoDeCuentaPorPagar(cxp, pago.montoTotalPagado, pago.id, fecha, anuladoPor);

  return { pagoAnulado, cxpRevertida };
}

describe('GAS-P3-002 — Reversión real de Caja al anular un Pago de gasto', () => {
  it('Gasto → Pago en efectivo → Egreso Caja → Anular Pago → Ingreso compensatorio → CxP recupera saldo → Pago = anulado', async () => {
    const gasto = crearGastoFixture();
    const cxpPendiente = generarCuentaPorPagarDesdeGasto(gasto, 'cxp-1');
    const cxpPagada = aplicarPagoACuentaPorPagar(cxpPendiente, 1000, 'pago-1', '2026-07-05');
    expect(cxpPagada.saldoPendiente).toBe(0);
    expect(cxpPagada.estadoPago).toBe('pagada');

    const pago: PagoCompra = {
      id: 'pago-1', numeroPago: 'PG01-00000001', fechaPago: '2026-07-05', proveedorId: '', proveedorNombre: 'Técnico SAC',
      moneda: 'PEN', montoTotalPagado: 1000, mediosPago: [crearMedioEfectivo('medio-1', 1000)], tipoOrigen: 'gasto',
      cuentasPorPagarAplicadas: ['cxp-1'], comprobantesCompraAplicados: [], estadoDocumento: 'registrado',
      historial: [{ fecha: '2026-07-05T00:00:00.000Z', accion: 'Pago registrado', detalle: 'PG01-00000001 — 1000.00' }],
      fechaCreacion: '2026-07-05T00:00:00.000Z',
    };

    const movimientos: MovimientoCajaRegistrado[] = [];
    const { pagoAnulado, cxpRevertida } = await simularAnularPagoGasto({
      pago, cxp: cxpPagada, cajaAbierta: true,
      registrarCaja: async (m) => { movimientos.push(m); },
      motivo: 'Error en importes', anuladoPor: 'user-42',
    });

    // Egreso original → Ingreso compensatorio: mismo importe, signo/tipo correcto.
    expect(movimientos).toHaveLength(1);
    expect(movimientos[0].tipo).toBe('Ingreso');
    expect(movimientos[0].monto).toBe(1000);
    expect(movimientos[0].referencia).toBe('PG01-00000001'); // trazable al pago original
    expect(movimientos[0].claveIdempotencia).toBe('reversion-pago-1:medio-1');

    // CxP recupera el saldo completo, vuelve a "pendiente" (nunca queda "pagada" con un pago anulado).
    expect(cxpRevertida.saldoPendiente).toBe(1000);
    expect(cxpRevertida.totalPagado).toBe(0);
    expect(cxpRevertida.estadoPago).toBe('pendiente');

    // Pago queda anulado, con motivo y usuario — nunca eliminado.
    expect(pagoAnulado.estadoDocumento).toBe('anulado');
    expect(pagoAnulado.motivoAnulacion).toBe('Error en importes');
    expect(pagoAnulado.anuladoPor).toBe('user-42');
    expect(pagoAnulado.fechaAnulacion).toBeTruthy();

    // Historial preservado (nunca sobrescrito) + nueva entrada de anulación.
    expect(pagoAnulado.historial).toHaveLength(2);
    expect(pagoAnulado.historial[0].accion).toBe('Pago registrado');
    expect(pagoAnulado.historial[1].accion).toBe('Pago anulado');
    expect(pagoAnulado.historial[1].detalle).toBe('Error en importes');

    // La reversión de CxP también deja su propio rastro de historial.
    expect(cxpRevertida.historial.some((h) => h.accion === 'Pago anulado')).toBe(true);
  });

  it('un pago YA anulado no puede volver a anularse — motivoBloqueoAnulacionPago lo bloquea antes de tocar Caja', () => {
    const pagoAnulado: PagoCompra = {
      id: 'pago-2', numeroPago: 'PG01-00000002', fechaPago: '2026-07-05', proveedorId: '', proveedorNombre: 'Técnico SAC',
      moneda: 'PEN', montoTotalPagado: 1000, mediosPago: [crearMedioEfectivo('medio-1', 1000)], tipoOrigen: 'gasto',
      cuentasPorPagarAplicadas: ['cxp-1'], comprobantesCompraAplicados: [], estadoDocumento: 'anulado',
      motivoAnulacion: 'Ya anulado antes', historial: [], fechaCreacion: '2026-07-05T00:00:00.000Z',
    };
    expect(motivoBloqueoAnulacionPago(pagoAnulado)).not.toBeNull();
  });

  it('caja cerrada bloquea la anulación de un pago en efectivo ANTES de intentar cualquier movimiento — nunca deja el pago vigente sin compensación', async () => {
    const gasto = crearGastoFixture();
    const cxpPagada = aplicarPagoACuentaPorPagar(generarCuentaPorPagarDesdeGasto(gasto, 'cxp-3'), 1000, 'pago-3', '2026-07-05');
    const pago: PagoCompra = {
      id: 'pago-3', numeroPago: 'PG01-00000003', fechaPago: '2026-07-05', proveedorId: '', proveedorNombre: 'Técnico SAC',
      moneda: 'PEN', montoTotalPagado: 1000, mediosPago: [crearMedioEfectivo('medio-1', 1000)], tipoOrigen: 'gasto',
      cuentasPorPagarAplicadas: ['cxp-3'], comprobantesCompraAplicados: [], estadoDocumento: 'registrado', historial: [], fechaCreacion: '2026-07-05T00:00:00.000Z',
    };
    let movimientos = 0;

    await expect(
      simularAnularPagoGasto({ pago, cxp: cxpPagada, cajaAbierta: false, registrarCaja: async () => { movimientos += 1; } }),
    ).rejects.toThrow('la caja relacionada está cerrada');
    expect(movimientos).toBe(0);
  });

  it('pago con transferencia (sin medio de caja): anular no genera ningún movimiento de Caja, pero SÍ revierte la CxP', async () => {
    const gasto = crearGastoFixture();
    const cxpPagada = aplicarPagoACuentaPorPagar(generarCuentaPorPagarDesdeGasto(gasto, 'cxp-4'), 1000, 'pago-4', '2026-07-05');
    const pago: PagoCompra = {
      id: 'pago-4', numeroPago: 'PG01-00000004', fechaPago: '2026-07-05', proveedorId: '', proveedorNombre: 'Técnico SAC',
      moneda: 'PEN', montoTotalPagado: 1000,
      mediosPago: [{ id: 'medio-1', medioPagoCodigo: '003', medioPagoNombre: 'Transferencia', monto: 1000, cuentaBancariaId: 'cta-1', referenciaOperacion: 'OP-1' }],
      tipoOrigen: 'gasto', cuentasPorPagarAplicadas: ['cxp-4'], comprobantesCompraAplicados: [], estadoDocumento: 'registrado', historial: [], fechaCreacion: '2026-07-05T00:00:00.000Z',
    };
    let movimientos = 0;

    const { cxpRevertida } = await simularAnularPagoGasto({
      pago, cxp: cxpPagada, cajaAbierta: false, registrarCaja: async () => { movimientos += 1; },
    });
    expect(movimientos).toBe(0); // no es medio de caja: caja cerrada no bloquea, y no hay nada que revertir en Caja
    expect(cxpRevertida.saldoPendiente).toBe(1000);
  });

  it('reintentar la reversión (misma claveIdempotencia por medio) es idempotente: el guard de Caja lo reconoce como ya registrado, nunca duplica el Ingreso', async () => {
    const gasto = crearGastoFixture();
    const cxpPagada = aplicarPagoACuentaPorPagar(generarCuentaPorPagarDesdeGasto(gasto, 'cxp-5'), 1000, 'pago-5', '2026-07-05');
    const pago: PagoCompra = {
      id: 'pago-5', numeroPago: 'PG01-00000005', fechaPago: '2026-07-05', proveedorId: '', proveedorNombre: 'Técnico SAC',
      moneda: 'PEN', montoTotalPagado: 1000, mediosPago: [crearMedioEfectivo('medio-1', 1000)], tipoOrigen: 'gasto',
      cuentasPorPagarAplicadas: ['cxp-5'], comprobantesCompraAplicados: [], estadoDocumento: 'registrado', historial: [], fechaCreacion: '2026-07-05T00:00:00.000Z',
    };

    const clavesYaRegistradas = new Set<string>();
    const movimientosReales: MovimientoCajaRegistrado[] = [];
    const registrarCajaConGuardDeIdempotencia = async (m: MovimientoCajaRegistrado) => {
      if (clavesYaRegistradas.has(m.claveIdempotencia)) return; // mismo comportamiento que `esMovimientoDuplicadoPorIdempotencia`
      clavesYaRegistradas.add(m.claveIdempotencia);
      movimientosReales.push(m);
    };

    await simularAnularPagoGasto({ pago, cxp: cxpPagada, cajaAbierta: true, registrarCaja: registrarCajaConGuardDeIdempotencia });
    // Reintento de la MISMA anulación (ej. doble clic en "Confirmar anulación").
    await simularAnularPagoGasto({ pago, cxp: cxpPagada, cajaAbierta: true, registrarCaja: registrarCajaConGuardDeIdempotencia });

    expect(movimientosReales).toHaveLength(1); // nunca un segundo Ingreso compensatorio
  });

  it('un pago con DOS medios de efectivo distintos genera dos reversiones con claves DISTINTAS — nunca la segunda se descarta como duplicado de la primera (corrección aplicada en esta tarea)', async () => {
    const gasto = crearGastoFixture({ total: 300, subtotal: 300 });
    const cxpPagada = aplicarPagoACuentaPorPagar(generarCuentaPorPagarDesdeGasto(gasto, 'cxp-6'), 300, 'pago-6', '2026-07-05');
    const pago: PagoCompra = {
      id: 'pago-6', numeroPago: 'PG01-00000006', fechaPago: '2026-07-05', proveedorId: '', proveedorNombre: 'Técnico SAC',
      moneda: 'PEN', montoTotalPagado: 300,
      mediosPago: [crearMedioEfectivo('medio-a', 200), crearMedioEfectivo('medio-b', 100)],
      tipoOrigen: 'gasto', cuentasPorPagarAplicadas: ['cxp-6'], comprobantesCompraAplicados: [], estadoDocumento: 'registrado', historial: [], fechaCreacion: '2026-07-05T00:00:00.000Z',
    };

    const movimientos: MovimientoCajaRegistrado[] = [];
    await simularAnularPagoGasto({ pago, cxp: cxpPagada, cajaAbierta: true, registrarCaja: async (m) => { movimientos.push(m); } });

    expect(movimientos).toHaveLength(2);
    expect(movimientos.map((m) => m.claveIdempotencia)).toEqual(['reversion-pago-6:medio-a', 'reversion-pago-6:medio-b']);
    expect(new Set(movimientos.map((m) => m.claveIdempotencia)).size).toBe(2);
    expect(movimientos.reduce((acc, m) => acc + m.monto, 0)).toBe(300);
  });
});

describe('GAS-P3-002 — Pagos parciales secuenciales (parcial → parcial → saldo pendiente, no solo "parcial → total")', () => {
  it('Gasto 1000 → Pago 300 (parcial, saldo 700) → Pago 200 (parcial, saldo 500) → Pago 500 (pagada, saldo 0)', () => {
    const gasto = crearGastoFixture({ total: 1000, subtotal: 1000 });
    const cxpInicial = generarCuentaPorPagarDesdeGasto(gasto, 'cxp-parcial');
    expect(cxpInicial.saldoPendiente).toBe(1000);
    expect(cxpInicial.estadoPago).toBe('pendiente');

    const cxpTrasPago1 = aplicarPagoACuentaPorPagar(cxpInicial, 300, 'pago-p1', '2026-07-05');
    expect(cxpTrasPago1.saldoPendiente).toBe(700);
    expect(cxpTrasPago1.totalPagado).toBe(300);
    expect(cxpTrasPago1.estadoPago).toBe('parcial');

    const cxpTrasPago2 = aplicarPagoACuentaPorPagar(cxpTrasPago1, 200, 'pago-p2', '2026-07-06');
    expect(cxpTrasPago2.saldoPendiente).toBe(500);
    expect(cxpTrasPago2.totalPagado).toBe(500);
    expect(cxpTrasPago2.estadoPago).toBe('parcial'); // SIGUE parcial — no salta a "pagada" antes de tiempo

    const cxpTrasPago3 = aplicarPagoACuentaPorPagar(cxpTrasPago2, 500, 'pago-p3', '2026-07-07');
    expect(cxpTrasPago3.saldoPendiente).toBe(0);
    expect(cxpTrasPago3.totalPagado).toBe(1000);
    expect(cxpTrasPago3.estadoPago).toBe('pagada');

    // Los 3 pagos quedan todos en `pagosRelacionados` — historial completo, ninguno se pierde.
    expect(cxpTrasPago3.pagosRelacionados).toEqual(['pago-p1', 'pago-p2', 'pago-p3']);
  });

  it('anular el pago INTERMEDIO (200) tras los 3 pagos: el saldo se recalcula correctamente (no queda en 0 ni en el total, sino en el neto real) usando exclusivamente el motor de CxP existente', () => {
    const gasto = crearGastoFixture({ total: 1000, subtotal: 1000 });
    const cxpInicial = generarCuentaPorPagarDesdeGasto(gasto, 'cxp-anular-intermedio');

    const cxpTras1 = aplicarPagoACuentaPorPagar(cxpInicial, 300, 'pago-p1', '2026-07-05');
    const cxpTras2 = aplicarPagoACuentaPorPagar(cxpTras1, 200, 'pago-p2', '2026-07-06');
    const cxpTras3 = aplicarPagoACuentaPorPagar(cxpTras2, 500, 'pago-p3', '2026-07-07');
    expect(cxpTras3.saldoPendiente).toBe(0);
    expect(cxpTras3.estadoPago).toBe('pagada');

    // Anular el pago-p2 (200) — usa la MISMA función `revertirPagoDeCuentaPorPagar`
    // que usa `anularPagoGasto` en producción, nunca un cálculo de saldo nuevo.
    const cxpTrasAnularP2 = revertirPagoDeCuentaPorPagar(cxpTras3, 200, 'pago-p2', '2026-07-08', 'user-1');

    expect(cxpTrasAnularP2.totalPagado).toBe(800); // 1000 - 200
    expect(cxpTrasAnularP2.saldoPendiente).toBe(200); // el neto real, ni 0 ni 1000
    expect(cxpTrasAnularP2.estadoPago).toBe('parcial'); // recalculado correctamente: ya no está "pagada"

    // pago-p2 permanece en `pagosRelacionados` (historial/documentos relacionados) —
    // deja de contar como pago ACTIVO por su propio estadoDocumento (fuera de esta CxP), nunca por ausencia aquí.
    expect(cxpTrasAnularP2.pagosRelacionados).toContain('pago-p2');

    // Historial preservado + nueva entrada de la reversión — nunca se pierde el rastro de los 3 pagos originales.
    expect(cxpTrasAnularP2.historial.length).toBeGreaterThan(cxpInicial.historial.length);
    expect(cxpTrasAnularP2.historial.some((h) => h.detalle?.includes('pago-p2'))).toBe(true);
  });

  it('tras anular el pago intermedio, un pago posterior sigue aplicándose correctamente sobre el saldo ya recalculado', () => {
    const gasto = crearGastoFixture({ total: 1000, subtotal: 1000 });
    const cxpInicial = generarCuentaPorPagarDesdeGasto(gasto, 'cxp-secuencia-completa');
    const cxpTras1 = aplicarPagoACuentaPorPagar(cxpInicial, 300, 'pago-p1', '2026-07-05');
    const cxpTras2 = aplicarPagoACuentaPorPagar(cxpTras1, 200, 'pago-p2', '2026-07-06');
    const cxpTrasAnularP2 = revertirPagoDeCuentaPorPagar(cxpTras2, 200, 'pago-p2', '2026-07-07', 'user-1');
    expect(cxpTrasAnularP2.saldoPendiente).toBe(700); // 1000 - 300 (solo pago-p1 sigue activo)

    const cxpTrasPago4 = aplicarPagoACuentaPorPagar(cxpTrasAnularP2, 700, 'pago-p4', '2026-07-09');
    expect(cxpTrasPago4.saldoPendiente).toBe(0);
    expect(cxpTrasPago4.estadoPago).toBe('pagada');
    expect(cxpTrasPago4.totalPagado).toBe(1000);
  });
});
