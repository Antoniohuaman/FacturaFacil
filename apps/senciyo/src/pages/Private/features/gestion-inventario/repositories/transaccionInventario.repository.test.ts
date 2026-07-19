import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { instalarLocalStorageDePrueba } from './localStorageDePrueba';
import {
  guardarTransaccionInventario,
  obtenerTransaccionInventarioPorId,
  listarTransaccionesInventarioPorEmpresa,
  actualizarTransaccionInventario,
  eliminarTransaccionInventario,
  buscarTransaccionesPorClaveIdempotencia,
  filtrarTransaccionesInventarioPorEstado,
} from './transaccionInventario.repository';
import type { TransaccionInventario } from '../models/transaccionInventario.types';
import { lsKey } from '../../../../../shared/tenant';

instalarLocalStorageDePrueba();

function crearTransaccion(overrides: Partial<TransaccionInventario> = {}): TransaccionInventario {
  return {
    id: 'tx-1',
    empresaId: 'emp-A',
    tipoOperacion: 'ni_automatica',
    claveIdempotencia: 'NI-AUTO-cc-1',
    estado: 'preparada',
    hashEntrada: 'hash-1',
    clavesAfectadas: ['emp-A:facturafacil_stock_movements'],
    datosAnteriores: { productoId: 'prod-1', cantidad: 0 },
    datosPropuestos: { productoId: 'prod-1', cantidad: 10 },
    resultadoIds: [],
    fechaPreparacion: '2026-01-01T00:00:00.000Z',
    usuario: 'user-1',
    ...overrides,
  };
}

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe('transaccionInventario.repository — CRUD básico', () => {
  it('guarda y obtiene una transacción por id y empresa', () => {
    const transaccion = crearTransaccion();
    guardarTransaccionInventario(transaccion, 'emp-A');
    expect(obtenerTransaccionInventarioPorId('tx-1', 'emp-A')).toEqual(transaccion);
  });

  it('actualiza una transacción existente', () => {
    guardarTransaccionInventario(crearTransaccion(), 'emp-A');
    actualizarTransaccionInventario(crearTransaccion({ estado: 'confirmada', fechaConfirmacion: '2026-01-01T00:05:00.000Z' }), 'emp-A');
    const actualizada = obtenerTransaccionInventarioPorId('tx-1', 'emp-A');
    expect(actualizada?.estado).toBe('confirmada');
    expect(actualizada?.fechaConfirmacion).toBe('2026-01-01T00:05:00.000Z');
  });

  it('elimina una transacción', () => {
    guardarTransaccionInventario(crearTransaccion(), 'emp-A');
    eliminarTransaccionInventario('tx-1', 'emp-A');
    expect(obtenerTransaccionInventarioPorId('tx-1', 'emp-A')).toBeUndefined();
  });

  it('actualizar una transacción inexistente rechaza explícitamente', () => {
    expect(() => actualizarTransaccionInventario(crearTransaccion(), 'emp-A')).toThrow();
  });

  it('guardar dos veces la misma transacción (mismo id) rechaza explícitamente', () => {
    guardarTransaccionInventario(crearTransaccion(), 'emp-A');
    expect(() => guardarTransaccionInventario(crearTransaccion(), 'emp-A')).toThrow();
  });
});

describe('transaccionInventario.repository — filtrado y datosAnteriores/datosPropuestos', () => {
  it('filtrado por empresa', () => {
    guardarTransaccionInventario(crearTransaccion({ id: 'tx-A', empresaId: 'emp-A' }), 'emp-A');
    guardarTransaccionInventario(crearTransaccion({ id: 'tx-B', empresaId: 'emp-B' }), 'emp-B');
    expect(listarTransaccionesInventarioPorEmpresa('emp-A')).toHaveLength(1);
  });

  it('filtrado por estado dentro de la empresa', () => {
    guardarTransaccionInventario(crearTransaccion({ id: 'tx-1', estado: 'preparada' }), 'emp-A');
    guardarTransaccionInventario(crearTransaccion({ id: 'tx-2', estado: 'confirmada' }), 'emp-A');
    const resultado = filtrarTransaccionesInventarioPorEstado('emp-A', 'confirmada');
    expect(resultado.map((t) => t.id)).toEqual(['tx-2']);
  });

  it('búsqueda por claveIdempotencia dentro de la empresa', () => {
    guardarTransaccionInventario(crearTransaccion({ id: 'tx-1', claveIdempotencia: 'clave-especifica' }), 'emp-A');
    const resultado = buscarTransaccionesPorClaveIdempotencia('emp-A', 'clave-especifica');
    expect(resultado.map((t) => t.id)).toEqual(['tx-1']);
  });

  it('datosAnteriores y datosPropuestos se conservan sin mutación', () => {
    const datosAnteriores = { productoId: 'prod-1', cantidad: 5 };
    const datosPropuestos = { productoId: 'prod-1', cantidad: 15 };
    guardarTransaccionInventario(crearTransaccion({ datosAnteriores, datosPropuestos }), 'emp-A');
    const obtenida = obtenerTransaccionInventarioPorId('tx-1', 'emp-A');
    expect(obtenida?.datosAnteriores).toEqual({ productoId: 'prod-1', cantidad: 5 });
    expect(obtenida?.datosPropuestos).toEqual({ productoId: 'prod-1', cantidad: 15 });
  });

  it('no se ejecuta ninguna propuesta almacenada: el repositorio nunca interpreta datosPropuestos, solo lo persiste/devuelve', () => {
    const datosPropuestos = { accion: 'esto no debe ejecutarse', cantidad: 999 };
    guardarTransaccionInventario(crearTransaccion({ datosPropuestos }), 'emp-A');
    // El único efecto observable es la propia transacción almacenada — no hay ningún movimiento,
    // capa ni otro efecto secundario producido por guardar/leer.
    expect(obtenerTransaccionInventarioPorId('tx-1', 'emp-A')?.datosPropuestos).toEqual(datosPropuestos);
  });
});

describe('transaccionInventario.repository — aislamiento multiempresa', () => {
  it('empresa A y empresa B pueden guardar el mismo id sin mezclarse', () => {
    guardarTransaccionInventario(crearTransaccion({ id: 'tx-x', empresaId: 'emp-A' }), 'emp-A');
    guardarTransaccionInventario(crearTransaccion({ id: 'tx-x', empresaId: 'emp-B', usuario: 'user-B' }), 'emp-B');
    expect(obtenerTransaccionInventarioPorId('tx-x', 'emp-A')?.usuario).toBe('user-1');
    expect(obtenerTransaccionInventarioPorId('tx-x', 'emp-B')?.usuario).toBe('user-B');
  });

  it('una actualización de empresa A no modifica empresa B', () => {
    guardarTransaccionInventario(crearTransaccion({ id: 'tx-x', empresaId: 'emp-A' }), 'emp-A');
    guardarTransaccionInventario(crearTransaccion({ id: 'tx-x', empresaId: 'emp-B' }), 'emp-B');
    actualizarTransaccionInventario(crearTransaccion({ id: 'tx-x', empresaId: 'emp-A', estado: 'confirmada' }), 'emp-A');
    expect(obtenerTransaccionInventarioPorId('tx-x', 'emp-B')?.estado).toBe('preparada');
  });

  it('una eliminación de empresa A no elimina empresa B', () => {
    guardarTransaccionInventario(crearTransaccion({ id: 'tx-x', empresaId: 'emp-A' }), 'emp-A');
    guardarTransaccionInventario(crearTransaccion({ id: 'tx-x', empresaId: 'emp-B' }), 'emp-B');
    eliminarTransaccionInventario('tx-x', 'emp-A');
    expect(obtenerTransaccionInventarioPorId('tx-x', 'emp-B')).toBeDefined();
  });

  it('guardar una entidad cuyo empresaId no coincide con el parámetro falla explícitamente', () => {
    expect(() => guardarTransaccionInventario(crearTransaccion({ empresaId: 'emp-B' }), 'emp-A')).toThrow();
  });

  it('datos mezclados dentro de la misma colección: el filtro explícito por empresaId sigue protegiendo la consulta', () => {
    const clave = lsKey('facturafacil_transacciones_inventario', 'emp-A');
    const mezclado = [
      crearTransaccion({ id: 'tx-A', empresaId: 'emp-A' }),
      crearTransaccion({ id: 'tx-intrusa', empresaId: 'emp-B' }),
    ];
    localStorage.setItem(clave, JSON.stringify(mezclado));
    const resultado = listarTransaccionesInventarioPorEmpresa('emp-A');
    expect(resultado).toHaveLength(1);
    expect(resultado[0].id).toBe('tx-A');
  });
});

describe('transaccionInventario.repository — una colección corrupta nunca se sobrescribe', () => {
  it('guardar sobre una colección con JSON corrupto lanza error y no reemplaza el contenido crudo', () => {
    const clave = lsKey('facturafacil_transacciones_inventario', 'emp-A');
    const crudo = '{no es json valido';
    localStorage.setItem(clave, crudo);
    expect(() => guardarTransaccionInventario(crearTransaccion(), 'emp-A')).toThrow();
    expect(localStorage.getItem(clave)).toBe(crudo);
  });

  it('actualizar sobre una colección con JSON corrupto lanza error y no reemplaza el contenido crudo', () => {
    const clave = lsKey('facturafacil_transacciones_inventario', 'emp-A');
    const crudo = '{no es json valido';
    localStorage.setItem(clave, crudo);
    expect(() => actualizarTransaccionInventario(crearTransaccion(), 'emp-A')).toThrow();
    expect(localStorage.getItem(clave)).toBe(crudo);
  });

  it('eliminar sobre una colección con JSON corrupto lanza error y no reemplaza el contenido crudo', () => {
    const clave = lsKey('facturafacil_transacciones_inventario', 'emp-A');
    const crudo = '{no es json valido';
    localStorage.setItem(clave, crudo);
    expect(() => eliminarTransaccionInventario('tx-1', 'emp-A')).toThrow();
    expect(localStorage.getItem(clave)).toBe(crudo);
  });
});

describe('transaccionInventario.repository — una colección física mezclada (A+B) nunca se sobrescribe al mutar', () => {
  function colocarColeccionMezclada(): string {
    const clave = lsKey('facturafacil_transacciones_inventario', 'emp-A');
    const crudo = JSON.stringify([
      crearTransaccion({ id: 'tx-A', empresaId: 'emp-A' }),
      crearTransaccion({ id: 'tx-B', empresaId: 'emp-B' }),
    ]);
    localStorage.setItem(clave, crudo);
    return crudo;
  }

  it('guardar un nuevo registro de A cuando la colección física de A contiene A+B lanza error y no agrega el nuevo registro', () => {
    const clave = lsKey('facturafacil_transacciones_inventario', 'emp-A');
    const crudo = colocarColeccionMezclada();
    expect(() => guardarTransaccionInventario(crearTransaccion({ id: 'tx-nueva' }), 'emp-A')).toThrow();
    expect(localStorage.getItem(clave)).toBe(crudo);
  });

  it('actualizar tx-A en una colección física A+B lanza error y ambos registros quedan intactos', () => {
    const clave = lsKey('facturafacil_transacciones_inventario', 'emp-A');
    const crudo = colocarColeccionMezclada();
    expect(() =>
      actualizarTransaccionInventario(crearTransaccion({ id: 'tx-A', empresaId: 'emp-A', estado: 'confirmada' }), 'emp-A')
    ).toThrow();
    expect(localStorage.getItem(clave)).toBe(crudo);
  });

  it('eliminar tx-A en una colección física A+B lanza error y ningún registro es eliminado', () => {
    const clave = lsKey('facturafacil_transacciones_inventario', 'emp-A');
    const crudo = colocarColeccionMezclada();
    expect(() => eliminarTransaccionInventario('tx-A', 'emp-A')).toThrow();
    expect(localStorage.getItem(clave)).toBe(crudo);
  });
});
