import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { instalarLocalStorageDePrueba } from './localStorageDePrueba';
import {
  guardarCapaCostoInventario,
  obtenerCapaCostoInventarioPorId,
  listarCapasCostoInventarioPorEmpresa,
  actualizarCapaCostoInventario,
  eliminarCapaCostoInventario,
  listarCapasCostoInventarioPorAgrupacionFifo,
} from './capaCostoInventario.repository';
import type { CapaCostoInventario } from '../models/capaCostoInventario.types';
import { lsKey } from '../../../../../shared/tenant';

instalarLocalStorageDePrueba();

function crearCapa(overrides: Partial<CapaCostoInventario> = {}): CapaCostoInventario {
  return {
    id: 'capa-1',
    empresaId: 'emp-A',
    establecimientoId: 'est-1',
    productoId: 'prod-1',
    almacenId: 'alm-1',
    movimientoEntradaId: 'mov-1',
    tipoDocumentoOrigen: 'nota_ingreso',
    documentoOrigenId: 'ni-1',
    cantidadInicial: 10,
    cantidadDisponible: 10,
    costoUnitarioBaseOriginal: 10,
    costoUnitarioBaseMonedaBase: 10,
    valorValorizableOriginal: 100,
    valorValorizableMonedaBase: 100,
    monedaBase: 'PEN',
    monedaOriginal: 'PEN',
    tipoCambioAplicado: 1,
    fechaTipoCambio: '2026-01-01',
    fechaEntrada: '2026-01-01',
    estado: 'disponible',
    procedencia: 'compra',
    usuario: 'user-1',
    fechaCreacion: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe('capaCostoInventario.repository — CRUD básico', () => {
  it('guarda y obtiene una capa por id y empresa', () => {
    const capa = crearCapa();
    guardarCapaCostoInventario(capa, 'emp-A');
    expect(obtenerCapaCostoInventarioPorId('capa-1', 'emp-A')).toEqual(capa);
  });

  it('lista todas las capas de una empresa', () => {
    guardarCapaCostoInventario(crearCapa({ id: 'capa-1' }), 'emp-A');
    guardarCapaCostoInventario(crearCapa({ id: 'capa-2' }), 'emp-A');
    expect(listarCapasCostoInventarioPorEmpresa('emp-A')).toHaveLength(2);
  });

  it('actualiza una capa existente', () => {
    guardarCapaCostoInventario(crearCapa(), 'emp-A');
    const actualizada = crearCapa({ cantidadDisponible: 4, estado: 'agotada' });
    actualizarCapaCostoInventario(actualizada, 'emp-A');
    expect(obtenerCapaCostoInventarioPorId('capa-1', 'emp-A')?.cantidadDisponible).toBe(4);
    expect(obtenerCapaCostoInventarioPorId('capa-1', 'emp-A')?.estado).toBe('agotada');
  });

  it('elimina una capa', () => {
    guardarCapaCostoInventario(crearCapa(), 'emp-A');
    eliminarCapaCostoInventario('capa-1', 'emp-A');
    expect(obtenerCapaCostoInventarioPorId('capa-1', 'emp-A')).toBeUndefined();
  });

  it('no se recalculan costos ni cantidades en el repositorio: guarda exactamente lo entregado', () => {
    const capa = crearCapa({ costoUnitarioBaseMonedaBase: 3.33333333, valorValorizableMonedaBase: 33.33 });
    guardarCapaCostoInventario(capa, 'emp-A');
    expect(obtenerCapaCostoInventarioPorId('capa-1', 'emp-A')).toEqual(capa);
  });

  it('el estado se conserva sin reinterpretarlo', () => {
    guardarCapaCostoInventario(crearCapa({ estado: 'revertida' }), 'emp-A');
    expect(obtenerCapaCostoInventarioPorId('capa-1', 'emp-A')?.estado).toBe('revertida');
  });

  it('actualizar una capa inexistente rechaza explícitamente', () => {
    expect(() => actualizarCapaCostoInventario(crearCapa(), 'emp-A')).toThrow();
  });

  it('guardar dos veces la misma capa (mismo id) rechaza explícitamente, sin sobrescribir en silencio', () => {
    guardarCapaCostoInventario(crearCapa(), 'emp-A');
    expect(() => guardarCapaCostoInventario(crearCapa(), 'emp-A')).toThrow();
    expect(obtenerCapaCostoInventarioPorId('capa-1', 'emp-A')?.cantidadDisponible).toBe(10);
  });
});

describe('capaCostoInventario.repository — consulta por agrupación FIFO completa', () => {
  it('consulta exacta por empresa + establecimiento + producto + almacén', () => {
    guardarCapaCostoInventario(crearCapa({ id: 'capa-1' }), 'emp-A');
    const resultado = listarCapasCostoInventarioPorAgrupacionFifo({
      empresaId: 'emp-A', establecimientoId: 'est-1', productoId: 'prod-1', almacenId: 'alm-1',
    });
    expect(resultado).toHaveLength(1);
    expect(resultado[0].id).toBe('capa-1');
  });

  it('dos almacenes del mismo establecimiento no se mezclan', () => {
    guardarCapaCostoInventario(crearCapa({ id: 'capa-alm1', almacenId: 'alm-1' }), 'emp-A');
    guardarCapaCostoInventario(crearCapa({ id: 'capa-alm2', almacenId: 'alm-2' }), 'emp-A');
    const resultado = listarCapasCostoInventarioPorAgrupacionFifo({
      empresaId: 'emp-A', establecimientoId: 'est-1', productoId: 'prod-1', almacenId: 'alm-1',
    });
    expect(resultado.map((c) => c.id)).toEqual(['capa-alm1']);
  });

  it('dos establecimientos no se mezclan', () => {
    guardarCapaCostoInventario(crearCapa({ id: 'capa-est1', establecimientoId: 'est-1' }), 'emp-A');
    guardarCapaCostoInventario(crearCapa({ id: 'capa-est2', establecimientoId: 'est-2' }), 'emp-A');
    const resultado = listarCapasCostoInventarioPorAgrupacionFifo({
      empresaId: 'emp-A', establecimientoId: 'est-2', productoId: 'prod-1', almacenId: 'alm-1',
    });
    expect(resultado.map((c) => c.id)).toEqual(['capa-est2']);
  });

  it('dos empresas con el mismo producto y almacén no se mezclan', () => {
    guardarCapaCostoInventario(crearCapa({ id: 'capa-A', empresaId: 'emp-A' }), 'emp-A');
    guardarCapaCostoInventario(crearCapa({ id: 'capa-B', empresaId: 'emp-B' }), 'emp-B');
    const resultadoA = listarCapasCostoInventarioPorAgrupacionFifo({
      empresaId: 'emp-A', establecimientoId: 'est-1', productoId: 'prod-1', almacenId: 'alm-1',
    });
    expect(resultadoA.map((c) => c.id)).toEqual(['capa-A']);
  });

  it('filtra por estado cuando se solicita explícitamente', () => {
    guardarCapaCostoInventario(crearCapa({ id: 'capa-disp', estado: 'disponible' }), 'emp-A');
    guardarCapaCostoInventario(crearCapa({ id: 'capa-agot', estado: 'agotada' }), 'emp-A');
    const resultado = listarCapasCostoInventarioPorAgrupacionFifo({
      empresaId: 'emp-A', establecimientoId: 'est-1', productoId: 'prod-1', almacenId: 'alm-1', estado: 'disponible',
    });
    expect(resultado.map((c) => c.id)).toEqual(['capa-disp']);
  });
});

describe('capaCostoInventario.repository — aislamiento multiempresa', () => {
  it('empresa A y empresa B pueden guardar el mismo id sin mezclarse', () => {
    guardarCapaCostoInventario(crearCapa({ id: 'capa-x', empresaId: 'emp-A' }), 'emp-A');
    guardarCapaCostoInventario(crearCapa({ id: 'capa-x', empresaId: 'emp-B', productoId: 'prod-2' }), 'emp-B');
    expect(obtenerCapaCostoInventarioPorId('capa-x', 'emp-A')?.productoId).toBe('prod-1');
    expect(obtenerCapaCostoInventarioPorId('capa-x', 'emp-B')?.productoId).toBe('prod-2');
  });

  it('una consulta de empresa A nunca devuelve registros de empresa B', () => {
    guardarCapaCostoInventario(crearCapa({ id: 'capa-A', empresaId: 'emp-A' }), 'emp-A');
    guardarCapaCostoInventario(crearCapa({ id: 'capa-B', empresaId: 'emp-B' }), 'emp-B');
    expect(listarCapasCostoInventarioPorEmpresa('emp-A')).toHaveLength(1);
    expect(obtenerCapaCostoInventarioPorId('capa-B', 'emp-A')).toBeUndefined();
  });

  it('una actualización de empresa A no modifica empresa B', () => {
    guardarCapaCostoInventario(crearCapa({ id: 'capa-x', empresaId: 'emp-A' }), 'emp-A');
    guardarCapaCostoInventario(crearCapa({ id: 'capa-x', empresaId: 'emp-B' }), 'emp-B');
    actualizarCapaCostoInventario(crearCapa({ id: 'capa-x', empresaId: 'emp-A', cantidadDisponible: 0 }), 'emp-A');
    expect(obtenerCapaCostoInventarioPorId('capa-x', 'emp-B')?.cantidadDisponible).toBe(10);
  });

  it('una eliminación de empresa A no elimina empresa B', () => {
    guardarCapaCostoInventario(crearCapa({ id: 'capa-x', empresaId: 'emp-A' }), 'emp-A');
    guardarCapaCostoInventario(crearCapa({ id: 'capa-x', empresaId: 'emp-B' }), 'emp-B');
    eliminarCapaCostoInventario('capa-x', 'emp-A');
    expect(obtenerCapaCostoInventarioPorId('capa-x', 'emp-B')).toBeDefined();
  });

  it('guardar una entidad cuyo empresaId no coincide con el parámetro falla explícitamente', () => {
    expect(() => guardarCapaCostoInventario(crearCapa({ empresaId: 'emp-B' }), 'emp-A')).toThrow();
  });

  it('actualizar una entidad cuyo empresaId no coincide con el parámetro falla explícitamente, sin corregir el dato en silencio', () => {
    guardarCapaCostoInventario(crearCapa({ empresaId: 'emp-A' }), 'emp-A');
    expect(() => actualizarCapaCostoInventario(crearCapa({ empresaId: 'emp-B' }), 'emp-A')).toThrow();
  });

  it('datos mezclados dentro de la misma colección de almacenamiento: el filtro explícito por empresaId sigue protegiendo la consulta', () => {
    // Simula una escritura directa (bypaseando el repositorio) que mezcla un registro de otra
    // empresa bajo la misma clave de almacenamiento — nunca debería ocurrir en producción, pero
    // el filtro explícito (no solo el namespace de lsKey) debe seguir protegiendo la lectura.
    const clave = lsKey('facturafacil_capas_costo_inventario', 'emp-A');
    const mezclado = [crearCapa({ id: 'capa-A', empresaId: 'emp-A' }), crearCapa({ id: 'capa-intrusa', empresaId: 'emp-B' })];
    localStorage.setItem(clave, JSON.stringify(mezclado));
    const resultado = listarCapasCostoInventarioPorEmpresa('emp-A');
    expect(resultado).toHaveLength(1);
    expect(resultado[0].id).toBe('capa-A');
  });
});

describe('capaCostoInventario.repository — una colección corrupta nunca se sobrescribe', () => {
  it('guardar sobre una colección con JSON corrupto lanza error y no reemplaza el contenido crudo', () => {
    const clave = lsKey('facturafacil_capas_costo_inventario', 'emp-A');
    const crudo = '{no es json valido';
    localStorage.setItem(clave, crudo);
    expect(() => guardarCapaCostoInventario(crearCapa(), 'emp-A')).toThrow();
    expect(localStorage.getItem(clave)).toBe(crudo);
  });

  it('actualizar sobre una colección con JSON corrupto lanza error y no reemplaza el contenido crudo', () => {
    const clave = lsKey('facturafacil_capas_costo_inventario', 'emp-A');
    const crudo = '{no es json valido';
    localStorage.setItem(clave, crudo);
    expect(() => actualizarCapaCostoInventario(crearCapa(), 'emp-A')).toThrow();
    expect(localStorage.getItem(clave)).toBe(crudo);
  });

  it('eliminar sobre una colección con JSON corrupto lanza error y no reemplaza el contenido crudo', () => {
    const clave = lsKey('facturafacil_capas_costo_inventario', 'emp-A');
    const crudo = '{no es json valido';
    localStorage.setItem(clave, crudo);
    expect(() => eliminarCapaCostoInventario('capa-1', 'emp-A')).toThrow();
    expect(localStorage.getItem(clave)).toBe(crudo);
  });
});

describe('capaCostoInventario.repository — una colección física mezclada (A+B) nunca se sobrescribe al mutar', () => {
  function colocarColeccionMezclada(): string {
    const clave = lsKey('facturafacil_capas_costo_inventario', 'emp-A');
    const crudo = JSON.stringify([
      crearCapa({ id: 'capa-A', empresaId: 'emp-A' }),
      crearCapa({ id: 'capa-B', empresaId: 'emp-B' }),
    ]);
    localStorage.setItem(clave, crudo);
    return crudo;
  }

  it('guardar un nuevo registro de A cuando la colección física de A contiene A+B lanza error y no agrega el nuevo registro', () => {
    const clave = lsKey('facturafacil_capas_costo_inventario', 'emp-A');
    const crudo = colocarColeccionMezclada();
    expect(() => guardarCapaCostoInventario(crearCapa({ id: 'capa-nueva' }), 'emp-A')).toThrow();
    expect(localStorage.getItem(clave)).toBe(crudo);
  });

  it('actualizar capa-A en una colección física A+B lanza error y ambos registros quedan intactos', () => {
    const clave = lsKey('facturafacil_capas_costo_inventario', 'emp-A');
    const crudo = colocarColeccionMezclada();
    expect(() =>
      actualizarCapaCostoInventario(crearCapa({ id: 'capa-A', empresaId: 'emp-A', cantidadDisponible: 0 }), 'emp-A')
    ).toThrow();
    expect(localStorage.getItem(clave)).toBe(crudo);
  });

  it('eliminar capa-A en una colección física A+B lanza error y ningún registro es eliminado', () => {
    const clave = lsKey('facturafacil_capas_costo_inventario', 'emp-A');
    const crudo = colocarColeccionMezclada();
    expect(() => eliminarCapaCostoInventario('capa-A', 'emp-A')).toThrow();
    expect(localStorage.getItem(clave)).toBe(crudo);
  });
});
