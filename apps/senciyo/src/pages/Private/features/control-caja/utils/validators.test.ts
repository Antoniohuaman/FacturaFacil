import { describe, it, expect } from 'vitest';
import { esMovimientoDuplicadoPorIdempotencia, motivoRechazoMovimientoCaja } from './validators';
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

describe('motivoRechazoMovimientoCaja (GAS-P0-001: agregarMovimiento nunca debe fallar en silencio)', () => {
  it('caja cerrada → rechaza con "caja_cerrada", sin importar el permiso', () => {
    expect(motivoRechazoMovimientoCaja({ cajaAbierta: false, tienePermisoMovimiento: true })).toBe('caja_cerrada');
    expect(motivoRechazoMovimientoCaja({ cajaAbierta: false, tienePermisoMovimiento: false })).toBe('caja_cerrada');
  });

  it('caja abierta pero sin el permiso caja.movimientos.registrar → rechaza con "sin_permiso"', () => {
    expect(motivoRechazoMovimientoCaja({ cajaAbierta: true, tienePermisoMovimiento: false })).toBe('sin_permiso');
  });

  it('caja abierta y con permiso → null (el movimiento puede registrarse)', () => {
    expect(motivoRechazoMovimientoCaja({ cajaAbierta: true, tienePermisoMovimiento: true })).toBeNull();
  });

  it('caja cerrada tiene prioridad sobre la falta de permiso (un solo motivo reportado a la vez)', () => {
    // No debe reportar "sin_permiso" cuando la causa raíz real es que la caja está cerrada.
    expect(motivoRechazoMovimientoCaja({ cajaAbierta: false, tienePermisoMovimiento: false })).not.toBe('sin_permiso');
  });

  it('un reintento (doble clic reconocido cuando el primer intento ya completó su registro) nunca agrega un segundo movimiento — reutiliza esMovimientoDuplicadoPorIdempotencia, cubierto arriba', () => {
    // Caso 6 del alcance (doble clic/reintento): el escenario realmente
    // protegido por `agregarMovimiento` es el reintento SECUENCIAL — el
    // botón permanece deshabilitado mientras `isLoading` es true y el
    // historial ya refleja el primer registro cuando llega el segundo
    // intento (incluida una recarga de página). Ese escenario ya está
    // cubierto por el describe de arriba
    // ("detecta un duplicado ya presente en el estado en memoria" /
    // "...SOLO en el historial persistido"); no se duplica aquí.
    const yaRegistrado = [crearMovimientoFixture({ claveIdempotencia: 'pago-doble-clic' })];
    expect(esMovimientoDuplicadoPorIdempotencia(yaRegistrado, [], 'pago-doble-clic')).toBe(true);
  });
});
