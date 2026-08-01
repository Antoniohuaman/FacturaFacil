import { describe, it, expect } from 'vitest';
import { esMovimientoDuplicadoPorIdempotencia } from './validators';
import type { Movimiento } from '../models/Caja';

function crearMovimientoFixture(overrides: Partial<Movimiento> = {}): Movimiento {
  return {
    id: 'mov-1',
    cajaId: 'caja-1',
    aperturaId: 'apertura-1',
    tipo: 'Egreso',
    concepto: 'Pago de gasto: Alquiler de julio',
    medioPago: 'Efectivo',
    monto: 118,
    fecha: new Date('2026-07-05T00:00:00.000Z'),
    usuarioId: 'usuario-1',
    usuarioNombre: 'Usuario de prueba',
    ...overrides,
  };
}

describe('esMovimientoDuplicadoPorIdempotencia (§20-C: protección real contra doble clic/reintento en Caja)', () => {
  it('sin claveIdempotencia en el movimiento nuevo, nunca es duplicado (Compras/Cobranzas no cambian)', () => {
    const existentes = [crearMovimientoFixture({ claveIdempotencia: 'pago-gasto-1' })];
    expect(esMovimientoDuplicadoPorIdempotencia(existentes, [], undefined)).toBe(false);
  });

  it('con clave nueva que no existe en movimientos ni en el historial, no es duplicado', () => {
    const movimientos = [crearMovimientoFixture({ claveIdempotencia: 'pago-gasto-1' })];
    const historial = [crearMovimientoFixture({ id: 'mov-2', claveIdempotencia: 'pago-gasto-2' })];
    expect(esMovimientoDuplicadoPorIdempotencia(movimientos, historial, 'pago-gasto-3')).toBe(false);
  });

  it('detecta un duplicado ya presente en el estado en memoria (movimientos de la caja abierta)', () => {
    const movimientos = [crearMovimientoFixture({ claveIdempotencia: 'pago-gasto-1' })];
    expect(esMovimientoDuplicadoPorIdempotencia(movimientos, [], 'pago-gasto-1')).toBe(true);
  });

  it('detecta un duplicado presente SOLO en el historial persistido, aunque ya no esté en memoria (reintento tras recarga)', () => {
    const historial = [crearMovimientoFixture({ id: 'mov-historico', claveIdempotencia: 'pago-gasto-1' })];
    expect(esMovimientoDuplicadoPorIdempotencia([], historial, 'pago-gasto-1')).toBe(true);
  });

  it('dos movimientos distintos con claves distintas nunca se consideran duplicados entre sí', () => {
    const movimientos = [crearMovimientoFixture({ claveIdempotencia: 'pago-gasto-1' })];
    expect(esMovimientoDuplicadoPorIdempotencia(movimientos, [], 'pago-gasto-2')).toBe(false);
  });
});
