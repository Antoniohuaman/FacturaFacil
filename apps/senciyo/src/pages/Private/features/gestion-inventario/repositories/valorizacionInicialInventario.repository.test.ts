import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { instalarLocalStorageDePrueba } from './localStorageDePrueba';
import {
  guardarValorizacionInicialInventario,
  obtenerValorizacionInicialInventarioPorId,
  listarValorizacionInicialInventarioPorEmpresa,
  obtenerLoteActivoPorEmpresa,
  actualizarValorizacionInicialInventario,
} from './valorizacionInicialInventario.repository';
import type { ValorizacionInicialInventario, DetalleValorizacionInicial } from '../models/valorizacionInicialInventario.types';

instalarLocalStorageDePrueba();

function crearDetalle(overrides: Partial<DetalleValorizacionInicial> = {}): DetalleValorizacionInicial {
  return {
    productoId: 'prod-1',
    almacenId: 'alm-1',
    cantidadDetectada: 10,
    costoPropuesto: 5,
    origenPropuesta: 'precioCompra',
    confirmado: false,
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
    estado: 'en_preparacion',
    detalles: [crearDetalle()],
    ...overrides,
  };
}

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe('valorizacionInicialInventario.repository — CRUD básico', () => {
  it('guarda y obtiene un lote por id y empresa', () => {
    const lote = crearLote();
    guardarValorizacionInicialInventario(lote, 'emp-A');
    expect(obtenerValorizacionInicialInventarioPorId('lote-1', 'emp-A')).toEqual(lote);
  });

  it('rechaza guardar dos lotes con el mismo id para la misma empresa', () => {
    guardarValorizacionInicialInventario(crearLote(), 'emp-A');
    expect(() => guardarValorizacionInicialInventario(crearLote(), 'emp-A')).toThrow(/ya existe/);
  });

  it('rechaza guardar si empresaId del parámetro no coincide con el de la entidad', () => {
    expect(() => guardarValorizacionInicialInventario(crearLote({ empresaId: 'emp-B' }), 'emp-A')).toThrow(/no coincide/);
  });

  it('lista todos los lotes de una empresa', () => {
    guardarValorizacionInicialInventario(crearLote({ id: 'lote-1' }), 'emp-A');
    guardarValorizacionInicialInventario(crearLote({ id: 'lote-2', fechaCreacion: '2026-01-02T00:00:00.000Z' }), 'emp-A');
    expect(listarValorizacionInicialInventarioPorEmpresa('emp-A')).toHaveLength(2);
  });

  it('actualiza un lote existente', () => {
    guardarValorizacionInicialInventario(crearLote(), 'emp-A');
    const actualizado = crearLote({ estado: 'pendiente_costos' });
    actualizarValorizacionInicialInventario(actualizado, 'emp-A');
    expect(obtenerValorizacionInicialInventarioPorId('lote-1', 'emp-A')?.estado).toBe('pendiente_costos');
  });

  it('rechaza actualizar un lote inexistente', () => {
    expect(() => actualizarValorizacionInicialInventario(crearLote(), 'emp-A')).toThrow(/no existe/);
  });
});

describe('valorizacionInicialInventario.repository — aislamiento multiempresa', () => {
  it('un lote de la empresa A nunca aparece al listar/leer la empresa B', () => {
    guardarValorizacionInicialInventario(crearLote({ id: 'lote-1', empresaId: 'emp-A' }), 'emp-A');
    expect(listarValorizacionInicialInventarioPorEmpresa('emp-B')).toHaveLength(0);
    expect(obtenerValorizacionInicialInventarioPorId('lote-1', 'emp-B')).toBeUndefined();
  });

  it('obtenerLoteActivoPorEmpresa nunca cruza empresas', () => {
    guardarValorizacionInicialInventario(crearLote({ id: 'lote-A', empresaId: 'emp-A' }), 'emp-A');
    expect(obtenerLoteActivoPorEmpresa('emp-B')).toBeUndefined();
    expect(obtenerLoteActivoPorEmpresa('emp-A')?.id).toBe('lote-A');
  });
});

describe('valorizacionInicialInventario.repository — obtenerLoteActivoPorEmpresa', () => {
  it('devuelve undefined si la empresa nunca inició una preparación', () => {
    expect(obtenerLoteActivoPorEmpresa('emp-A')).toBeUndefined();
  });

  it('devuelve el lote de fechaCreacion más reciente', () => {
    guardarValorizacionInicialInventario(crearLote({ id: 'lote-viejo', fechaCreacion: '2026-01-01T00:00:00.000Z' }), 'emp-A');
    guardarValorizacionInicialInventario(crearLote({ id: 'lote-nuevo', fechaCreacion: '2026-02-01T00:00:00.000Z' }), 'emp-A');
    expect(obtenerLoteActivoPorEmpresa('emp-A')?.id).toBe('lote-nuevo');
  });
});
