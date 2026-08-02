// Pruebas de aislamiento por origen documental (corrección puntual §1):
// Compras solo debe ver CxP/Pagos con tipoOrigen 'compra'; Gastos solo los
// suyos. Se prueban los filtros PUROS (`filtrarCuentasPorPagarPorOrigen`,
// `filtrarPagosPorOrigen`, `normalizarOrigenCxP`) en vez del acceso a
// localStorage: en el entorno de pruebas (`vitest environment: 'node'`)
// `typeof window === 'undefined'`, por lo que `cargarCuentasPorPagar`/
// `cargarPagosCompra` siempre devuelven `[]` — probar contra esos wrappers
// no ejercitaría el filtro real. Los selectores impuros
// (`listarCuentasPorPagarPorOrigen`/`listarPagosPorOrigen`) son wrappers de
// una línea sobre estas mismas funciones puras, ya cubiertas aquí.

import { describe, it, expect } from 'vitest';
import { filtrarCuentasPorPagarPorOrigen, normalizarOrigenCxP } from './repositorioCuentasPorPagar';
import { filtrarPagosPorOrigen } from './repositorioPagosCompra';
import type { CuentaPorPagar } from '../modelos/CuentaPorPagar';
import type { PagoCompra } from '../modelos/PagoCompra';

function crearCxPCompra(overrides: Partial<CuentaPorPagar> = {}): CuentaPorPagar {
  return {
    id: 'cxp-compra-1',
    tipoOrigen: 'compra',
    documentoOrigenId: 'cc-1',
    comprobanteCompraId: 'cc-1',
    comprobanteCompraNumero: 'F001-123',
    tipoComprobanteOrigen: '01',
    proveedorId: 'prov-1',
    proveedorNombre: 'Proveedor SAC',
    proveedorNumeroDocumento: '20123456789',
    moneda: 'PEN',
    total: 500,
    totalPagado: 0,
    saldoPendiente: 500,
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

function crearCxPGasto(overrides: Partial<CuentaPorPagar> = {}): CuentaPorPagar {
  return crearCxPCompra({
    id: 'cxp-gasto-1',
    tipoOrigen: 'gasto',
    documentoOrigenId: 'gasto-1',
    comprobanteCompraId: '',
    comprobanteCompraNumero: '',
    tipoComprobanteOrigen: '',
    total: 118,
    saldoPendiente: 118,
    ...overrides,
  });
}

function crearPagoCompra(overrides: Partial<PagoCompra> = {}): PagoCompra {
  return {
    id: 'pago-compra-1',
    numeroPago: 'PG01-00000001',
    tipoOrigen: 'compra',
    fechaPago: '2026-07-05',
    proveedorId: 'prov-1',
    proveedorNombre: 'Proveedor SAC',
    moneda: 'PEN',
    montoTotalPagado: 500,
    mediosPago: [],
    cuentasPorPagarAplicadas: ['cxp-compra-1'],
    comprobantesCompraAplicados: ['cc-1'],
    estadoDocumento: 'registrado',
    historial: [],
    fechaCreacion: '2026-07-05T00:00:00.000Z',
    ...overrides,
  };
}

function crearPagoGasto(overrides: Partial<PagoCompra> = {}): PagoCompra {
  return crearPagoCompra({
    id: 'pago-gasto-1',
    numeroPago: 'PG01-00000002',
    tipoOrigen: 'gasto',
    proveedorId: '',
    montoTotalPagado: 118,
    cuentasPorPagarAplicadas: ['cxp-gasto-1'],
    comprobantesCompraAplicados: [],
    ...overrides,
  });
}

describe('Aislamiento de Cuentas por Pagar por origen documental', () => {
  const cxpCompra = crearCxPCompra();
  const cxpGasto = crearCxPGasto();
  const mixto = [cxpCompra, cxpGasto];

  it('1. CxP origen compra aparece al filtrar por "compra"', () => {
    const resultado = filtrarCuentasPorPagarPorOrigen(mixto, 'compra');
    expect(resultado.map((c) => c.id)).toContain('cxp-compra-1');
  });

  it('2. CxP origen gasto NO aparece al filtrar por "compra"', () => {
    const resultado = filtrarCuentasPorPagarPorOrigen(mixto, 'compra');
    expect(resultado.map((c) => c.id)).not.toContain('cxp-gasto-1');
  });

  it('3. CxP histórica sin tipoOrigen se normaliza e interpreta como "compra"', () => {
    const completa = crearCxPCompra({ id: 'cxp-historica' });
    // Fixture real de un registro persistido ANTES de la generalización de
    // origen documental — el campo simplemente no existía todavía.
    const { tipoOrigen: tipoOrigenOriginal, ...resto } = completa;
    expect(tipoOrigenOriginal).toBe('compra');
    const normalizada = normalizarOrigenCxP(resto as CuentaPorPagar);
    expect(normalizada.tipoOrigen).toBe('compra');
    expect(normalizada.documentoOrigenId).toBe(completa.comprobanteCompraId);
    expect(filtrarCuentasPorPagarPorOrigen([normalizada], 'compra').map((c) => c.id)).toContain('cxp-historica');
  });

  it('7. Los totales de Compras excluyen completamente el origen gasto', () => {
    const soloCompra = filtrarCuentasPorPagarPorOrigen(mixto, 'compra');
    const totalPendiente = soloCompra.reduce((acc, c) => acc + c.saldoPendiente, 0);
    expect(totalPendiente).toBe(cxpCompra.saldoPendiente);
    expect(totalPendiente).not.toBe(cxpCompra.saldoPendiente + cxpGasto.saldoPendiente);
  });

  it('8. Gastos encuentra exclusivamente sus propias CxP (origen "gasto")', () => {
    const resultado = filtrarCuentasPorPagarPorOrigen(mixto, 'gasto');
    expect(resultado.map((c) => c.id)).toEqual(['cxp-gasto-1']);
  });
});

describe('Aislamiento de Pagos por origen documental', () => {
  const pagoCompra = crearPagoCompra();
  const pagoGasto = crearPagoGasto();
  const mixto = [pagoCompra, pagoGasto];

  it('4. Pago origen compra aparece al filtrar por "compra"', () => {
    const resultado = filtrarPagosPorOrigen(mixto, 'compra');
    expect(resultado.map((p) => p.id)).toContain('pago-compra-1');
  });

  it('5. Pago origen gasto NO aparece al filtrar por "compra"', () => {
    const resultado = filtrarPagosPorOrigen(mixto, 'compra');
    expect(resultado.map((p) => p.id)).not.toContain('pago-gasto-1');
  });

  it('6. Pago histórico sin tipoOrigen se interpreta como "compra" (campo opcional, nunca requerido)', () => {
    const historico = { ...crearPagoCompra({ id: 'pago-historico' }) };
    delete (historico as { tipoOrigen?: string }).tipoOrigen;
    const resultado = filtrarPagosPorOrigen([historico], 'compra');
    expect(resultado.map((p) => p.id)).toContain('pago-historico');
  });

  it('8. Gastos encuentra exclusivamente sus propios Pagos (origen "gasto")', () => {
    const resultado = filtrarPagosPorOrigen(mixto, 'gasto');
    expect(resultado.map((p) => p.id)).toEqual(['pago-gasto-1']);
  });
});
