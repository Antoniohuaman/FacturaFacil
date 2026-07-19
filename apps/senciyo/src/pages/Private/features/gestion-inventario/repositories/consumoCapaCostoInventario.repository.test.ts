import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { instalarLocalStorageDePrueba } from './localStorageDePrueba';
import {
  guardarConsumoCapaCostoInventario,
  obtenerConsumoCapaCostoInventarioPorId,
  listarConsumosCapaCostoInventarioPorEmpresa,
  actualizarConsumoCapaCostoInventario,
  eliminarConsumoCapaCostoInventario,
  listarConsumosPorMovimientoSalida,
  listarConsumosPorCapa,
} from './consumoCapaCostoInventario.repository';
import type { ConsumoCapaCostoInventario } from '../models/consumoCapaCostoInventario.types';
import { lsKey } from '../../../../../shared/tenant';

instalarLocalStorageDePrueba();

function crearConsumo(overrides: Partial<ConsumoCapaCostoInventario> = {}): ConsumoCapaCostoInventario {
  return {
    id: 'consumo-1',
    empresaId: 'emp-A',
    movimientoSalidaId: 'mov-salida-1',
    capaId: 'capa-1',
    cantidadConsumida: 3,
    costoUnitarioBaseMonedaBase: 3.33333333,
    valorConsumidoMonedaBase: 10,
    monedaBase: 'PEN',
    fecha: '2026-01-01',
    estado: 'confirmado',
    ...overrides,
  };
}

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe('consumoCapaCostoInventario.repository — CRUD básico', () => {
  it('guarda y obtiene un consumo por id y empresa', () => {
    const consumo = crearConsumo();
    guardarConsumoCapaCostoInventario(consumo, 'emp-A');
    expect(obtenerConsumoCapaCostoInventarioPorId('consumo-1', 'emp-A')).toEqual(consumo);
  });

  it('lista todos los consumos de una empresa', () => {
    guardarConsumoCapaCostoInventario(crearConsumo({ id: 'c-1' }), 'emp-A');
    guardarConsumoCapaCostoInventario(crearConsumo({ id: 'c-2' }), 'emp-A');
    expect(listarConsumosCapaCostoInventarioPorEmpresa('emp-A')).toHaveLength(2);
  });

  it('actualiza un consumo existente', () => {
    guardarConsumoCapaCostoInventario(crearConsumo(), 'emp-A');
    actualizarConsumoCapaCostoInventario(crearConsumo({ estado: 'revertido' }), 'emp-A');
    expect(obtenerConsumoCapaCostoInventarioPorId('consumo-1', 'emp-A')?.estado).toBe('revertido');
  });

  it('elimina un consumo', () => {
    guardarConsumoCapaCostoInventario(crearConsumo(), 'emp-A');
    eliminarConsumoCapaCostoInventario('consumo-1', 'emp-A');
    expect(obtenerConsumoCapaCostoInventarioPorId('consumo-1', 'emp-A')).toBeUndefined();
  });

  it('los snapshots monetarios se conservan exactamente como fueron entregados — el repositorio no los recalcula', () => {
    const consumo = crearConsumo({ costoUnitarioBaseMonedaBase: 7.77777777, valorConsumidoMonedaBase: 23.33 });
    guardarConsumoCapaCostoInventario(consumo, 'emp-A');
    expect(obtenerConsumoCapaCostoInventarioPorId('consumo-1', 'emp-A')).toEqual(consumo);
  });

  it('guardar dos veces el mismo consumo (mismo id) rechaza explícitamente', () => {
    guardarConsumoCapaCostoInventario(crearConsumo(), 'emp-A');
    expect(() => guardarConsumoCapaCostoInventario(crearConsumo(), 'emp-A')).toThrow();
  });

  it('actualizar un consumo inexistente rechaza explícitamente', () => {
    expect(() => actualizarConsumoCapaCostoInventario(crearConsumo(), 'emp-A')).toThrow();
  });
});

describe('consumoCapaCostoInventario.repository — consultas por movimiento y por capa', () => {
  it('consulta por movimientoSalidaId dentro de una empresa', () => {
    guardarConsumoCapaCostoInventario(crearConsumo({ id: 'c-1', movimientoSalidaId: 'mov-X' }), 'emp-A');
    guardarConsumoCapaCostoInventario(crearConsumo({ id: 'c-2', movimientoSalidaId: 'mov-Y' }), 'emp-A');
    const resultado = listarConsumosPorMovimientoSalida('mov-X', 'emp-A');
    expect(resultado.map((c) => c.id)).toEqual(['c-1']);
  });

  it('consulta por capaId dentro de una empresa', () => {
    guardarConsumoCapaCostoInventario(crearConsumo({ id: 'c-1', capaId: 'capa-X' }), 'emp-A');
    guardarConsumoCapaCostoInventario(crearConsumo({ id: 'c-2', capaId: 'capa-Y' }), 'emp-A');
    const resultado = listarConsumosPorCapa('capa-X', 'emp-A');
    expect(resultado.map((c) => c.id)).toEqual(['c-1']);
  });

  it('igual movimientoSalidaId en empresas distintas no colisiona', () => {
    guardarConsumoCapaCostoInventario(crearConsumo({ id: 'c-A', empresaId: 'emp-A', movimientoSalidaId: 'mov-compartido' }), 'emp-A');
    guardarConsumoCapaCostoInventario(crearConsumo({ id: 'c-B', empresaId: 'emp-B', movimientoSalidaId: 'mov-compartido' }), 'emp-B');
    expect(listarConsumosPorMovimientoSalida('mov-compartido', 'emp-A').map((c) => c.id)).toEqual(['c-A']);
    expect(listarConsumosPorMovimientoSalida('mov-compartido', 'emp-B').map((c) => c.id)).toEqual(['c-B']);
  });

  it('igual capaId en empresas distintas no colisiona', () => {
    guardarConsumoCapaCostoInventario(crearConsumo({ id: 'c-A', empresaId: 'emp-A', capaId: 'capa-compartida' }), 'emp-A');
    guardarConsumoCapaCostoInventario(crearConsumo({ id: 'c-B', empresaId: 'emp-B', capaId: 'capa-compartida' }), 'emp-B');
    expect(listarConsumosPorCapa('capa-compartida', 'emp-A').map((c) => c.id)).toEqual(['c-A']);
    expect(listarConsumosPorCapa('capa-compartida', 'emp-B').map((c) => c.id)).toEqual(['c-B']);
  });
});

describe('consumoCapaCostoInventario.repository — aislamiento multiempresa', () => {
  it('empresa A y empresa B pueden guardar el mismo id sin mezclarse', () => {
    guardarConsumoCapaCostoInventario(crearConsumo({ id: 'consumo-x', empresaId: 'emp-A' }), 'emp-A');
    guardarConsumoCapaCostoInventario(crearConsumo({ id: 'consumo-x', empresaId: 'emp-B', capaId: 'capa-otra' }), 'emp-B');
    expect(obtenerConsumoCapaCostoInventarioPorId('consumo-x', 'emp-A')?.capaId).toBe('capa-1');
    expect(obtenerConsumoCapaCostoInventarioPorId('consumo-x', 'emp-B')?.capaId).toBe('capa-otra');
  });

  it('una consulta de empresa A nunca devuelve registros de empresa B', () => {
    guardarConsumoCapaCostoInventario(crearConsumo({ id: 'c-A', empresaId: 'emp-A' }), 'emp-A');
    guardarConsumoCapaCostoInventario(crearConsumo({ id: 'c-B', empresaId: 'emp-B' }), 'emp-B');
    expect(listarConsumosCapaCostoInventarioPorEmpresa('emp-A')).toHaveLength(1);
  });

  it('una actualización de empresa A no modifica empresa B', () => {
    guardarConsumoCapaCostoInventario(crearConsumo({ id: 'c-x', empresaId: 'emp-A' }), 'emp-A');
    guardarConsumoCapaCostoInventario(crearConsumo({ id: 'c-x', empresaId: 'emp-B' }), 'emp-B');
    actualizarConsumoCapaCostoInventario(crearConsumo({ id: 'c-x', empresaId: 'emp-A', estado: 'revertido' }), 'emp-A');
    expect(obtenerConsumoCapaCostoInventarioPorId('c-x', 'emp-B')?.estado).toBe('confirmado');
  });

  it('una eliminación de empresa A no elimina empresa B', () => {
    guardarConsumoCapaCostoInventario(crearConsumo({ id: 'c-x', empresaId: 'emp-A' }), 'emp-A');
    guardarConsumoCapaCostoInventario(crearConsumo({ id: 'c-x', empresaId: 'emp-B' }), 'emp-B');
    eliminarConsumoCapaCostoInventario('c-x', 'emp-A');
    expect(obtenerConsumoCapaCostoInventarioPorId('c-x', 'emp-B')).toBeDefined();
  });

  it('guardar una entidad cuyo empresaId no coincide con el parámetro falla explícitamente', () => {
    expect(() => guardarConsumoCapaCostoInventario(crearConsumo({ empresaId: 'emp-B' }), 'emp-A')).toThrow();
  });

  it('datos mezclados dentro de la misma colección: el filtro explícito por empresaId sigue protegiendo la consulta', () => {
    const clave = lsKey('facturafacil_consumos_capas_inventario', 'emp-A');
    const mezclado = [crearConsumo({ id: 'c-A', empresaId: 'emp-A' }), crearConsumo({ id: 'c-intruso', empresaId: 'emp-B' })];
    localStorage.setItem(clave, JSON.stringify(mezclado));
    const resultado = listarConsumosCapaCostoInventarioPorEmpresa('emp-A');
    expect(resultado).toHaveLength(1);
    expect(resultado[0].id).toBe('c-A');
  });
});

describe('consumoCapaCostoInventario.repository — una colección corrupta nunca se sobrescribe', () => {
  it('guardar sobre una colección con JSON corrupto lanza error y no reemplaza el contenido crudo', () => {
    const clave = lsKey('facturafacil_consumos_capas_inventario', 'emp-A');
    const crudo = '{no es json valido';
    localStorage.setItem(clave, crudo);
    expect(() => guardarConsumoCapaCostoInventario(crearConsumo(), 'emp-A')).toThrow();
    expect(localStorage.getItem(clave)).toBe(crudo);
  });

  it('actualizar sobre una colección con JSON corrupto lanza error y no reemplaza el contenido crudo', () => {
    const clave = lsKey('facturafacil_consumos_capas_inventario', 'emp-A');
    const crudo = '{no es json valido';
    localStorage.setItem(clave, crudo);
    expect(() => actualizarConsumoCapaCostoInventario(crearConsumo(), 'emp-A')).toThrow();
    expect(localStorage.getItem(clave)).toBe(crudo);
  });

  it('eliminar sobre una colección con JSON corrupto lanza error y no reemplaza el contenido crudo', () => {
    const clave = lsKey('facturafacil_consumos_capas_inventario', 'emp-A');
    const crudo = '{no es json valido';
    localStorage.setItem(clave, crudo);
    expect(() => eliminarConsumoCapaCostoInventario('consumo-1', 'emp-A')).toThrow();
    expect(localStorage.getItem(clave)).toBe(crudo);
  });
});

describe('consumoCapaCostoInventario.repository — una colección física mezclada (A+B) nunca se sobrescribe al mutar', () => {
  function colocarColeccionMezclada(): string {
    const clave = lsKey('facturafacil_consumos_capas_inventario', 'emp-A');
    const crudo = JSON.stringify([
      crearConsumo({ id: 'c-A', empresaId: 'emp-A' }),
      crearConsumo({ id: 'c-B', empresaId: 'emp-B' }),
    ]);
    localStorage.setItem(clave, crudo);
    return crudo;
  }

  it('guardar un nuevo registro de A cuando la colección física de A contiene A+B lanza error y no agrega el nuevo registro', () => {
    const clave = lsKey('facturafacil_consumos_capas_inventario', 'emp-A');
    const crudo = colocarColeccionMezclada();
    expect(() => guardarConsumoCapaCostoInventario(crearConsumo({ id: 'c-nuevo' }), 'emp-A')).toThrow();
    expect(localStorage.getItem(clave)).toBe(crudo);
  });

  it('actualizar c-A en una colección física A+B lanza error y ambos registros quedan intactos', () => {
    const clave = lsKey('facturafacil_consumos_capas_inventario', 'emp-A');
    const crudo = colocarColeccionMezclada();
    expect(() =>
      actualizarConsumoCapaCostoInventario(crearConsumo({ id: 'c-A', empresaId: 'emp-A', estado: 'revertido' }), 'emp-A')
    ).toThrow();
    expect(localStorage.getItem(clave)).toBe(crudo);
  });

  it('eliminar c-A en una colección física A+B lanza error y ningún registro es eliminado', () => {
    const clave = lsKey('facturafacil_consumos_capas_inventario', 'emp-A');
    const crudo = colocarColeccionMezclada();
    expect(() => eliminarConsumoCapaCostoInventario('c-A', 'emp-A')).toThrow();
    expect(localStorage.getItem(clave)).toBe(crudo);
  });
});
