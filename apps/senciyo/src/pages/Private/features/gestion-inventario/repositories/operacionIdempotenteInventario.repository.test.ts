import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { instalarLocalStorageDePrueba } from './localStorageDePrueba';
import {
  guardarOperacionIdempotente,
  obtenerOperacionIdempotentePorId,
  buscarOperacionIdempotentePorClave,
  listarOperacionesIdempotentesPorEmpresa,
  actualizarOperacionIdempotente,
  eliminarOperacionIdempotente,
} from './operacionIdempotenteInventario.repository';
import type { OperacionIdempotenteInventario } from '../models/operacionIdempotenteInventario.types';
import { lsKey } from '../../../../../shared/tenant';

instalarLocalStorageDePrueba();

function crearOperacion(overrides: Partial<OperacionIdempotenteInventario> = {}): OperacionIdempotenteInventario {
  return {
    id: 'op-1',
    empresaId: 'emp-A',
    clave: 'NI-AUTO-cc-1',
    tipoOperacion: 'ni_automatica',
    estado: 'preparada',
    hashEntrada: 'hash-1',
    referenciaDocumentoId: 'cc-1',
    referenciaDocumentoTipo: 'comprobante_compra',
    resultadoIds: [],
    transaccionInventarioId: 'tx-1',
    fechaCreacion: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe('operacionIdempotenteInventario.repository — CRUD básico', () => {
  it('guarda y obtiene una operación por id y empresa', () => {
    const operacion = crearOperacion();
    guardarOperacionIdempotente(operacion, 'emp-A');
    expect(obtenerOperacionIdempotentePorId('op-1', 'emp-A')).toEqual(operacion);
  });

  it('lista todas las operaciones de una empresa', () => {
    guardarOperacionIdempotente(crearOperacion({ id: 'op-1', clave: 'clave-1' }), 'emp-A');
    guardarOperacionIdempotente(crearOperacion({ id: 'op-2', clave: 'clave-2' }), 'emp-A');
    expect(listarOperacionesIdempotentesPorEmpresa('emp-A')).toHaveLength(2);
  });

  it('actualiza una operación existente', () => {
    guardarOperacionIdempotente(crearOperacion(), 'emp-A');
    actualizarOperacionIdempotente(crearOperacion({ estado: 'confirmada', resultadoIds: ['mov-1', 'capa-1'] }), 'emp-A');
    const actualizada = obtenerOperacionIdempotentePorId('op-1', 'emp-A');
    expect(actualizada?.estado).toBe('confirmada');
    expect(actualizada?.resultadoIds).toEqual(['mov-1', 'capa-1']);
  });

  it('elimina una operación', () => {
    guardarOperacionIdempotente(crearOperacion(), 'emp-A');
    eliminarOperacionIdempotente('op-1', 'emp-A');
    expect(obtenerOperacionIdempotentePorId('op-1', 'emp-A')).toBeUndefined();
  });

  it('resultadoIds se conserva como arreglo, nunca como escalar', () => {
    const operacion = crearOperacion({ resultadoIds: ['mov-1', 'consumo-1', 'consumo-2'] });
    guardarOperacionIdempotente(operacion, 'emp-A');
    const obtenida = obtenerOperacionIdempotentePorId('op-1', 'emp-A');
    expect(Array.isArray(obtenida?.resultadoIds)).toBe(true);
    expect(obtenida?.resultadoIds).toEqual(['mov-1', 'consumo-1', 'consumo-2']);
  });

  it('actualizar una operación inexistente rechaza explícitamente', () => {
    expect(() => actualizarOperacionIdempotente(crearOperacion(), 'emp-A')).toThrow();
  });
});

describe('operacionIdempotenteInventario.repository — unicidad (empresaId, clave)', () => {
  it('búsqueda por empresaId + clave', () => {
    guardarOperacionIdempotente(crearOperacion({ clave: 'VENTA-STOCK-doc-1' }), 'emp-A');
    expect(buscarOperacionIdempotentePorClave('emp-A', 'VENTA-STOCK-doc-1')?.id).toBe('op-1');
  });

  it('la misma clave es válida en dos empresas distintas', () => {
    guardarOperacionIdempotente(crearOperacion({ id: 'op-A', empresaId: 'emp-A', clave: 'clave-compartida' }), 'emp-A');
    guardarOperacionIdempotente(crearOperacion({ id: 'op-B', empresaId: 'emp-B', clave: 'clave-compartida' }), 'emp-B');
    expect(buscarOperacionIdempotentePorClave('emp-A', 'clave-compartida')?.id).toBe('op-A');
    expect(buscarOperacionIdempotentePorClave('emp-B', 'clave-compartida')?.id).toBe('op-B');
  });

  it('la misma empresa no puede tener dos operaciones con la misma clave — un duplicado no sobrescribe silenciosamente el registro original', () => {
    guardarOperacionIdempotente(crearOperacion({ id: 'op-1', clave: 'clave-unica', estado: 'confirmada' }), 'emp-A');
    expect(() =>
      guardarOperacionIdempotente(crearOperacion({ id: 'op-2', clave: 'clave-unica', estado: 'preparada' }), 'emp-A')
    ).toThrow();
    // El registro original permanece intacto — el intento de duplicado no lo sobrescribió.
    expect(buscarOperacionIdempotentePorClave('emp-A', 'clave-unica')?.estado).toBe('confirmada');
    expect(buscarOperacionIdempotentePorClave('emp-A', 'clave-unica')?.id).toBe('op-1');
  });

  it('no se ejecuta lógica de hash ni de reintento todavía: hashEntrada se persiste tal cual, sin comparación ni resolución de conflictos', () => {
    const operacion = crearOperacion({ hashEntrada: 'hash-cualquiera-sin-validar' });
    guardarOperacionIdempotente(operacion, 'emp-A');
    expect(obtenerOperacionIdempotentePorId('op-1', 'emp-A')?.hashEntrada).toBe('hash-cualquiera-sin-validar');
  });
});

describe('operacionIdempotenteInventario.repository — aislamiento multiempresa', () => {
  it('empresa A y empresa B pueden guardar el mismo id sin mezclarse', () => {
    guardarOperacionIdempotente(crearOperacion({ id: 'op-x', empresaId: 'emp-A', clave: 'clave-A' }), 'emp-A');
    guardarOperacionIdempotente(crearOperacion({ id: 'op-x', empresaId: 'emp-B', clave: 'clave-B' }), 'emp-B');
    expect(obtenerOperacionIdempotentePorId('op-x', 'emp-A')?.clave).toBe('clave-A');
    expect(obtenerOperacionIdempotentePorId('op-x', 'emp-B')?.clave).toBe('clave-B');
  });

  it('una consulta de empresa A nunca devuelve registros de empresa B', () => {
    guardarOperacionIdempotente(crearOperacion({ id: 'op-A', empresaId: 'emp-A', clave: 'c-A' }), 'emp-A');
    guardarOperacionIdempotente(crearOperacion({ id: 'op-B', empresaId: 'emp-B', clave: 'c-B' }), 'emp-B');
    expect(listarOperacionesIdempotentesPorEmpresa('emp-A')).toHaveLength(1);
  });

  it('una eliminación de empresa A no elimina empresa B', () => {
    guardarOperacionIdempotente(crearOperacion({ id: 'op-x', empresaId: 'emp-A', clave: 'c-A' }), 'emp-A');
    guardarOperacionIdempotente(crearOperacion({ id: 'op-x', empresaId: 'emp-B', clave: 'c-B' }), 'emp-B');
    eliminarOperacionIdempotente('op-x', 'emp-A');
    expect(obtenerOperacionIdempotentePorId('op-x', 'emp-B')).toBeDefined();
  });

  it('guardar una entidad cuyo empresaId no coincide con el parámetro falla explícitamente', () => {
    expect(() => guardarOperacionIdempotente(crearOperacion({ empresaId: 'emp-B' }), 'emp-A')).toThrow();
  });

  it('datos mezclados dentro de la misma colección: el filtro explícito por empresaId sigue protegiendo la consulta', () => {
    const clave = lsKey('facturafacil_operaciones_idempotentes_inventario', 'emp-A');
    const mezclado = [
      crearOperacion({ id: 'op-A', empresaId: 'emp-A', clave: 'c-A' }),
      crearOperacion({ id: 'op-intrusa', empresaId: 'emp-B', clave: 'c-intrusa' }),
    ];
    localStorage.setItem(clave, JSON.stringify(mezclado));
    const resultado = listarOperacionesIdempotentesPorEmpresa('emp-A');
    expect(resultado).toHaveLength(1);
    expect(resultado[0].id).toBe('op-A');
  });
});

describe('operacionIdempotenteInventario.repository — una colección corrupta nunca se sobrescribe', () => {
  it('guardar sobre una colección con JSON corrupto lanza error y no reemplaza el contenido crudo', () => {
    const clave = lsKey('facturafacil_operaciones_idempotentes_inventario', 'emp-A');
    const crudo = '{no es json valido';
    localStorage.setItem(clave, crudo);
    expect(() => guardarOperacionIdempotente(crearOperacion(), 'emp-A')).toThrow();
    expect(localStorage.getItem(clave)).toBe(crudo);
  });

  it('actualizar sobre una colección con JSON corrupto lanza error y no reemplaza el contenido crudo', () => {
    const clave = lsKey('facturafacil_operaciones_idempotentes_inventario', 'emp-A');
    const crudo = '{no es json valido';
    localStorage.setItem(clave, crudo);
    expect(() => actualizarOperacionIdempotente(crearOperacion(), 'emp-A')).toThrow();
    expect(localStorage.getItem(clave)).toBe(crudo);
  });

  it('eliminar sobre una colección con JSON corrupto lanza error y no reemplaza el contenido crudo', () => {
    const clave = lsKey('facturafacil_operaciones_idempotentes_inventario', 'emp-A');
    const crudo = '{no es json valido';
    localStorage.setItem(clave, crudo);
    expect(() => eliminarOperacionIdempotente('op-1', 'emp-A')).toThrow();
    expect(localStorage.getItem(clave)).toBe(crudo);
  });
});

describe('operacionIdempotenteInventario.repository — unicidad (empresaId, clave) también al actualizar (Corrección 2)', () => {
  it('1. actualizar op-2 (clave-B) para que tome clave-A (ya usada por op-1) lanza error', () => {
    guardarOperacionIdempotente(crearOperacion({ id: 'op-1', clave: 'clave-A' }), 'emp-A');
    guardarOperacionIdempotente(crearOperacion({ id: 'op-2', clave: 'clave-B' }), 'emp-A');
    expect(() =>
      actualizarOperacionIdempotente(crearOperacion({ id: 'op-2', clave: 'clave-A' }), 'emp-A')
    ).toThrow();
  });

  it('2. después del error, ambas operaciones conservan su clave original y ningún otro campo fue modificado', () => {
    guardarOperacionIdempotente(crearOperacion({ id: 'op-1', clave: 'clave-A', estado: 'confirmada' }), 'emp-A');
    guardarOperacionIdempotente(crearOperacion({ id: 'op-2', clave: 'clave-B', estado: 'preparada' }), 'emp-A');
    expect(() =>
      actualizarOperacionIdempotente(crearOperacion({ id: 'op-2', clave: 'clave-A', estado: 'confirmada' }), 'emp-A')
    ).toThrow();
    const op1 = obtenerOperacionIdempotentePorId('op-1', 'emp-A');
    const op2 = obtenerOperacionIdempotentePorId('op-2', 'emp-A');
    expect(op1?.clave).toBe('clave-A');
    expect(op1?.estado).toBe('confirmada');
    expect(op2?.clave).toBe('clave-B');
    expect(op2?.estado).toBe('preparada');
  });

  it('3. actualizar op-1 conservando su propia clave (clave-A) está permitido', () => {
    guardarOperacionIdempotente(crearOperacion({ id: 'op-1', clave: 'clave-A' }), 'emp-A');
    expect(() =>
      actualizarOperacionIdempotente(crearOperacion({ id: 'op-1', clave: 'clave-A', estado: 'confirmada' }), 'emp-A')
    ).not.toThrow();
    expect(obtenerOperacionIdempotentePorId('op-1', 'emp-A')?.estado).toBe('confirmada');
  });

  it('4. actualizar estado/resultadoIds sin cambiar la clave está permitido', () => {
    guardarOperacionIdempotente(crearOperacion({ id: 'op-1', clave: 'clave-A' }), 'emp-A');
    actualizarOperacionIdempotente(
      crearOperacion({ id: 'op-1', clave: 'clave-A', estado: 'confirmada', resultadoIds: ['mov-1', 'capa-1'] }),
      'emp-A'
    );
    const actualizada = obtenerOperacionIdempotentePorId('op-1', 'emp-A');
    expect(actualizada?.estado).toBe('confirmada');
    expect(actualizada?.resultadoIds).toEqual(['mov-1', 'capa-1']);
  });

  it('5. empresa B puede usar clave-A libremente aunque empresa A ya la use', () => {
    guardarOperacionIdempotente(crearOperacion({ id: 'op-1', empresaId: 'emp-A', clave: 'clave-A' }), 'emp-A');
    guardarOperacionIdempotente(crearOperacion({ id: 'op-2', empresaId: 'emp-B', clave: 'clave-otra' }), 'emp-B');
    expect(() =>
      actualizarOperacionIdempotente(crearOperacion({ id: 'op-2', empresaId: 'emp-B', clave: 'clave-A' }), 'emp-B')
    ).not.toThrow();
    expect(obtenerOperacionIdempotentePorId('op-2', 'emp-B')?.clave).toBe('clave-A');
  });

  it('6. una colección corrupta falla antes de cualquier intento de actualización de clave, y no se sobrescribe', () => {
    const clave = lsKey('facturafacil_operaciones_idempotentes_inventario', 'emp-A');
    const crudo = '{no es json valido';
    localStorage.setItem(clave, crudo);
    expect(() =>
      actualizarOperacionIdempotente(crearOperacion({ id: 'op-1', clave: 'clave-A' }), 'emp-A')
    ).toThrow();
    expect(localStorage.getItem(clave)).toBe(crudo);
  });
});

describe('operacionIdempotenteInventario.repository — una colección física mezclada (A+B) nunca se sobrescribe al mutar', () => {
  function colocarColeccionMezclada(): string {
    const clave = lsKey('facturafacil_operaciones_idempotentes_inventario', 'emp-A');
    const crudo = JSON.stringify([
      crearOperacion({ id: 'op-A', empresaId: 'emp-A', clave: 'clave-A' }),
      crearOperacion({ id: 'op-B', empresaId: 'emp-B', clave: 'clave-B' }),
    ]);
    localStorage.setItem(clave, crudo);
    return crudo;
  }

  it('guardar un nuevo registro de A cuando la colección física de A contiene A+B lanza error y no agrega el nuevo registro', () => {
    const clave = lsKey('facturafacil_operaciones_idempotentes_inventario', 'emp-A');
    const crudo = colocarColeccionMezclada();
    expect(() => guardarOperacionIdempotente(crearOperacion({ id: 'op-nueva', clave: 'clave-nueva' }), 'emp-A')).toThrow();
    expect(localStorage.getItem(clave)).toBe(crudo);
  });

  it('actualizar op-A en una colección física A+B lanza error y ambos registros quedan intactos', () => {
    const clave = lsKey('facturafacil_operaciones_idempotentes_inventario', 'emp-A');
    const crudo = colocarColeccionMezclada();
    expect(() =>
      actualizarOperacionIdempotente(crearOperacion({ id: 'op-A', empresaId: 'emp-A', clave: 'clave-A', estado: 'confirmada' }), 'emp-A')
    ).toThrow();
    expect(localStorage.getItem(clave)).toBe(crudo);
  });

  it('eliminar op-A en una colección física A+B lanza error y ningún registro es eliminado', () => {
    const clave = lsKey('facturafacil_operaciones_idempotentes_inventario', 'emp-A');
    const crudo = colocarColeccionMezclada();
    expect(() => eliminarOperacionIdempotente('op-A', 'emp-A')).toThrow();
    expect(localStorage.getItem(clave)).toBe(crudo);
  });
});
