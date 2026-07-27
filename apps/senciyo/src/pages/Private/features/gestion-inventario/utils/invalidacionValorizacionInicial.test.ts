import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { instalarLocalStorageDePrueba } from '../repositories/localStorageDePrueba';
import { invalidarDetalleSiAfectado, invalidarLoteValorizacionInicialSiAfectado } from './invalidacionValorizacionInicial';
import {
  guardarValorizacionInicialInventario,
  obtenerValorizacionInicialInventarioPorId,
} from '../repositories/valorizacionInicialInventario.repository';
import type { ValorizacionInicialInventario, DetalleValorizacionInicial } from '../models/valorizacionInicialInventario.types';

instalarLocalStorageDePrueba();
beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

function crearDetalle(overrides: Partial<DetalleValorizacionInicial> = {}): DetalleValorizacionInicial {
  return {
    productoId: 'prod-1',
    almacenId: 'alm-1',
    cantidadDetectada: 10,
    costoPropuesto: 5,
    origenPropuesta: 'precioCompra',
    costoConfirmado: 5,
    confirmado: true,
    requiereRecalculo: false,
    ...overrides,
  };
}

function crearLote(overrides: Partial<ValorizacionInicialInventario> = {}): ValorizacionInicialInventario {
  return {
    id: 'lote-1',
    empresaId: 'emp-A',
    usuario: 'user-1',
    fechaCreacion: '2026-01-01T00:00:00.000Z',
    estado: 'pendiente_costos',
    detalles: [crearDetalle()],
    ...overrides,
  };
}

describe('invalidarDetalleSiAfectado (puro)', () => {
  it('marca requiereRecalculo=true y confirmado=false en el detalle coincidente', () => {
    const lote = crearLote();
    const resultado = invalidarDetalleSiAfectado(lote, [{ productoId: 'prod-1', almacenId: 'alm-1' }], '2026-01-02T00:00:00.000Z');
    expect(resultado.detalles[0].requiereRecalculo).toBe(true);
    expect(resultado.detalles[0].confirmado).toBe(false);
    expect(resultado.detalles[0].fechaUltimaRevision).toBe('2026-01-02T00:00:00.000Z');
  });

  it('conserva costoConfirmado como referencia visual (no lo limpia)', () => {
    const lote = crearLote({ detalles: [crearDetalle({ costoConfirmado: 7.5 })] });
    const resultado = invalidarDetalleSiAfectado(lote, [{ productoId: 'prod-1', almacenId: 'alm-1' }], '2026-01-02T00:00:00.000Z');
    expect(resultado.detalles[0].costoConfirmado).toBe(7.5);
  });

  it('no toca detalles de otro producto o de otro almacén', () => {
    const lote = crearLote({
      detalles: [crearDetalle({ productoId: 'prod-1', almacenId: 'alm-1' }), crearDetalle({ productoId: 'prod-2', almacenId: 'alm-1' })],
    });
    const resultado = invalidarDetalleSiAfectado(lote, [{ productoId: 'prod-1', almacenId: 'alm-1' }], '2026-01-02T00:00:00.000Z');
    expect(resultado.detalles[1]).toEqual(lote.detalles[1]);
  });

  it('devuelve el mismo objeto lote si ningún detalle coincide (evita escritura innecesaria)', () => {
    const lote = crearLote();
    const resultado = invalidarDetalleSiAfectado(lote, [{ productoId: 'otro-prod', almacenId: 'otro-alm' }], '2026-01-02T00:00:00.000Z');
    expect(resultado).toBe(lote);
  });

  it('es idempotente: un detalle ya invalidado no vuelve a cambiar fechaUltimaRevision', () => {
    const lote = crearLote({ detalles: [crearDetalle({ requiereRecalculo: true, confirmado: false, fechaUltimaRevision: 'fecha-original' })] });
    const resultado = invalidarDetalleSiAfectado(lote, [{ productoId: 'prod-1', almacenId: 'alm-1' }], '2026-01-02T00:00:00.000Z');
    expect(resultado).toBe(lote);
    expect(resultado.detalles[0].fechaUltimaRevision).toBe('fecha-original');
  });
});

describe('invalidarLoteValorizacionInicialSiAfectado (integración con repositorio)', () => {
  it('invalida el detalle del lote activo cuando el estado es en_preparacion', () => {
    guardarValorizacionInicialInventario(crearLote({ estado: 'en_preparacion' }), 'emp-A');
    invalidarLoteValorizacionInicialSiAfectado('emp-A', 'en_preparacion', [{ productoId: 'prod-1', almacenId: 'alm-1' }], '2026-01-02T00:00:00.000Z');
    const lote = obtenerValorizacionInicialInventarioPorId('lote-1', 'emp-A');
    expect(lote?.detalles[0].requiereRecalculo).toBe(true);
  });

  it('invalida el detalle del lote activo cuando el estado es pendiente_costos', () => {
    guardarValorizacionInicialInventario(crearLote({ estado: 'pendiente_costos' }), 'emp-A');
    invalidarLoteValorizacionInicialSiAfectado('emp-A', 'pendiente_costos', [{ productoId: 'prod-1', almacenId: 'alm-1' }], '2026-01-02T00:00:00.000Z');
    const lote = obtenerValorizacionInicialInventarioPorId('lote-1', 'emp-A');
    expect(lote?.detalles[0].requiereRecalculo).toBe(true);
  });

  it('no invalida un lote validada (snapshot aprobado, inmutable)', () => {
    guardarValorizacionInicialInventario(crearLote({ estado: 'validada' }), 'emp-A');
    invalidarLoteValorizacionInicialSiAfectado('emp-A', 'validada', [{ productoId: 'prod-1', almacenId: 'alm-1' }], '2026-01-02T00:00:00.000Z');
    const lote = obtenerValorizacionInicialInventarioPorId('lote-1', 'emp-A');
    expect(lote?.detalles[0].requiereRecalculo).toBe(false);
  });

  it('es no-op si la empresa no tiene lote activo', () => {
    expect(() =>
      invalidarLoteValorizacionInicialSiAfectado('emp-sin-lote', 'en_preparacion', [{ productoId: 'prod-1', almacenId: 'alm-1' }], '2026-01-02T00:00:00.000Z')
    ).not.toThrow();
  });

  it('es no-op cuando el estado resuelve a cuantitativo_libre (no_iniciada)', () => {
    guardarValorizacionInicialInventario(crearLote({ estado: 'en_preparacion' }), 'emp-A');
    invalidarLoteValorizacionInicialSiAfectado('emp-A', 'no_iniciada', [{ productoId: 'prod-1', almacenId: 'alm-1' }], '2026-01-02T00:00:00.000Z');
    const lote = obtenerValorizacionInicialInventarioPorId('lote-1', 'emp-A');
    expect(lote?.detalles[0].requiereRecalculo).toBe(false);
  });

  it('otra empresa nunca invalida el lote de esta empresa (aislamiento multiempresa)', () => {
    guardarValorizacionInicialInventario(crearLote({ estado: 'en_preparacion' }), 'emp-A');
    invalidarLoteValorizacionInicialSiAfectado('emp-B', 'en_preparacion', [{ productoId: 'prod-1', almacenId: 'alm-1' }], '2026-01-02T00:00:00.000Z');
    const lote = obtenerValorizacionInicialInventarioPorId('lote-1', 'emp-A');
    expect(lote?.detalles[0].requiereRecalculo).toBe(false);
  });

  it('otro almacén no invalida un detalle de un almacén distinto', () => {
    guardarValorizacionInicialInventario(crearLote({ estado: 'en_preparacion' }), 'emp-A');
    invalidarLoteValorizacionInicialSiAfectado('emp-A', 'en_preparacion', [{ productoId: 'prod-1', almacenId: 'otro-almacen' }], '2026-01-02T00:00:00.000Z');
    const lote = obtenerValorizacionInicialInventarioPorId('lote-1', 'emp-A');
    expect(lote?.detalles[0].requiereRecalculo).toBe(false);
  });
});
