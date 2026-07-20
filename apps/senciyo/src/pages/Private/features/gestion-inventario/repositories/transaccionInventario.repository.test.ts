import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { instalarLocalStorageDePrueba } from './localStorageDePrueba';
import {
  guardarTransaccionInventario,
  obtenerTransaccionInventarioPorId,
  listarTransaccionesInventarioPorEmpresa,
  buscarTransaccionesPorClaveIdempotencia,
  filtrarTransaccionesInventarioPorEstado,
  listarTransaccionesPorOperacionIdempotenteId,
  obtenerTransaccionActivaPorOperacionIdempotenteId,
  obtenerUltimoIntentoPorOperacionIdempotenteId,
  calcularSiguienteNumeroIntento,
  pasarTransaccionAConfirmando,
  marcarTransaccionConfirmada,
  marcarTransaccionFallida,
} from './transaccionInventario.repository';
import type { TransaccionInventario } from '../models/transaccionInventario.types';
import { IntentoActivoDuplicadoInventario } from '../utils/erroresInventario';
import { lsKey } from '../../../../../shared/tenant';

instalarLocalStorageDePrueba();

function crearTransaccion(overrides: Partial<TransaccionInventario> = {}): TransaccionInventario {
  return {
    id: 'tx-1',
    empresaId: 'emp-A',
    operacionIdempotenteId: 'op-1',
    numeroIntento: 1,
    tipoOperacion: 'ni_automatica',
    claveIdempotencia: 'NI-AUTO-cc-1',
    estado: 'preparada',
    hashEntrada: 'hash-1',
    clavesAfectadas: ['emp-A:facturafacil_stock_movements'],
    datosAnteriores: { productoId: 'prod-1', cantidad: '0' },
    datosPropuestos: { productoId: 'prod-1', cantidad: '10' },
    versionEsperada: 0,
    versionResultante: 1,
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

  it('guardar dos veces la misma transacción (mismo id) rechaza explícitamente', () => {
    guardarTransaccionInventario(crearTransaccion(), 'emp-A');
    expect(() => guardarTransaccionInventario(crearTransaccion({ numeroIntento: 2 }), 'emp-A')).toThrow();
  });

  it('rechaza insertar una transacción que no está en preparada', () => {
    expect(() => guardarTransaccionInventario(crearTransaccion({ estado: 'confirmando' }), 'emp-A')).toThrow();
  });

});

describe('transaccionInventario.repository — numeroIntento y relación 1:N con la operación', () => {
  it('calcularSiguienteNumeroIntento devuelve 1 cuando no hay ningún intento previo', () => {
    expect(calcularSiguienteNumeroIntento('emp-A', 'op-1')).toBe(1);
  });

  it('rechaza un numeroIntento distinto del siguiente correcto', () => {
    expect(() => guardarTransaccionInventario(crearTransaccion({ numeroIntento: 2 }), 'emp-A')).toThrow();
  });

  it('rechaza versionResultante distinto de versionEsperada + 1', () => {
    expect(() => guardarTransaccionInventario(crearTransaccion({ versionEsperada: 0, versionResultante: 5 }), 'emp-A')).toThrow();
  });

  it('rechaza versionEsperada negativa o no entera', () => {
    expect(() => guardarTransaccionInventario(crearTransaccion({ versionEsperada: -1, versionResultante: 0 }), 'emp-A')).toThrow();
    expect(() => guardarTransaccionInventario(crearTransaccion({ versionEsperada: 0.5, versionResultante: 1.5 }), 'emp-A')).toThrow();
  });

  it('rechaza versionEsperada no segura (mayor que MAX_SAFE_INTEGER)', () => {
    expect(() =>
      guardarTransaccionInventario(crearTransaccion({ versionEsperada: Number.MAX_SAFE_INTEGER + 10, versionResultante: Number.MAX_SAFE_INTEGER + 11 }), 'emp-A')
    ).toThrow();
  });

  it('rechaza versionResultante no segura (mayor que MAX_SAFE_INTEGER, aunque numéricamente "cuadre" con versionEsperada + 1)', () => {
    expect(() =>
      guardarTransaccionInventario(
        crearTransaccion({ versionEsperada: Number.MAX_SAFE_INTEGER, versionResultante: Number.MAX_SAFE_INTEGER + 1 }),
        'emp-A'
      )
    ).toThrow();
  });

  it('rechaza versionResultante menor que 1', () => {
    expect(() => guardarTransaccionInventario(crearTransaccion({ versionEsperada: -1, versionResultante: 0 }), 'emp-A')).toThrow();
  });

  it('rechaza el overflow: versionEsperada ya en el límite de MAX_SAFE_INTEGER, sin escribir', () => {
    const clave = lsKey('facturafacil_transacciones_inventario', 'emp-A');
    expect(() =>
      guardarTransaccionInventario(
        crearTransaccion({ versionEsperada: Number.MAX_SAFE_INTEGER, versionResultante: Number.MAX_SAFE_INTEGER + 1 }),
        'emp-A'
      )
    ).toThrow();
    expect(localStorage.getItem(clave)).toBeNull();
  });

  it('localStorage permanece intacto tras cualquiera de estos rechazos de versión', () => {
    guardarTransaccionInventario(crearTransaccion(), 'emp-A');
    const clave = lsKey('facturafacil_transacciones_inventario', 'emp-A');
    const contenidoPrevio = localStorage.getItem(clave);

    expect(() =>
      guardarTransaccionInventario(crearTransaccion({ id: 'tx-2', numeroIntento: 2, versionEsperada: 0.5, versionResultante: 1.5 }), 'emp-A')
    ).toThrow();
    expect(localStorage.getItem(clave)).toBe(contenidoPrevio);

    expect(() =>
      guardarTransaccionInventario(
        crearTransaccion({ id: 'tx-3', numeroIntento: 2, versionEsperada: Number.MAX_SAFE_INTEGER, versionResultante: Number.MAX_SAFE_INTEGER + 1 }),
        'emp-A'
      )
    ).toThrow();
    expect(localStorage.getItem(clave)).toBe(contenidoPrevio);
  });

  it('un segundo intento histórico (tras uno fallido) usa numeroIntento 2', () => {
    guardarTransaccionInventario(crearTransaccion({ id: 'tx-1', numeroIntento: 1 }), 'emp-A');
    marcarTransaccionFallida('emp-A', 'tx-1');
    expect(calcularSiguienteNumeroIntento('emp-A', 'op-1')).toBe(2);
    expect(() => guardarTransaccionInventario(crearTransaccion({ id: 'tx-2', numeroIntento: 2 }), 'emp-A')).not.toThrow();
  });

  it('rechaza un nuevo intento mientras exista uno activo (preparada o confirmando)', () => {
    guardarTransaccionInventario(crearTransaccion({ id: 'tx-1', numeroIntento: 1 }), 'emp-A');
    expect(() => guardarTransaccionInventario(crearTransaccion({ id: 'tx-2', numeroIntento: 2 }), 'emp-A')).toThrow();
  });

  it('un intento fallido histórico NUNCA se elimina ni se modifica al crear uno nuevo', () => {
    guardarTransaccionInventario(crearTransaccion({ id: 'tx-1', numeroIntento: 1, hashEntrada: 'hash-viejo' }), 'emp-A');
    marcarTransaccionFallida('emp-A', 'tx-1');
    const antes = obtenerTransaccionInventarioPorId('tx-1', 'emp-A');
    guardarTransaccionInventario(crearTransaccion({ id: 'tx-2', numeroIntento: 2, hashEntrada: 'hash-nuevo' }), 'emp-A');
    const despues = obtenerTransaccionInventarioPorId('tx-1', 'emp-A');
    expect(despues).toEqual(antes);
    expect(despues?.estado).toBe('fallida');
    expect(despues?.hashEntrada).toBe('hash-viejo');
  });

  it('listarTransaccionesPorOperacionIdempotenteId devuelve todos los intentos ordenados por numeroIntento', () => {
    guardarTransaccionInventario(crearTransaccion({ id: 'tx-1', numeroIntento: 1 }), 'emp-A');
    marcarTransaccionFallida('emp-A', 'tx-1');
    guardarTransaccionInventario(crearTransaccion({ id: 'tx-2', numeroIntento: 2 }), 'emp-A');
    const intentos = listarTransaccionesPorOperacionIdempotenteId('emp-A', 'op-1');
    expect(intentos.map((t) => t.id)).toEqual(['tx-1', 'tx-2']);
  });

  it('obtenerTransaccionActivaPorOperacionIdempotenteId devuelve undefined si no hay ninguno activo', () => {
    guardarTransaccionInventario(crearTransaccion({ id: 'tx-1' }), 'emp-A');
    marcarTransaccionFallida('emp-A', 'tx-1');
    expect(obtenerTransaccionActivaPorOperacionIdempotenteId('emp-A', 'op-1')).toBeUndefined();
  });

  it('obtenerTransaccionActivaPorOperacionIdempotenteId devuelve el único intento preparada/confirmando', () => {
    guardarTransaccionInventario(crearTransaccion({ id: 'tx-1' }), 'emp-A');
    expect(obtenerTransaccionActivaPorOperacionIdempotenteId('emp-A', 'op-1')?.id).toBe('tx-1');
  });

  it('obtenerTransaccionActivaPorOperacionIdempotenteId lanza IntentoActivoDuplicadoInventario si detecta más de un intento activo (corrupción simulada)', () => {
    const clave = lsKey('facturafacil_transacciones_inventario', 'emp-A');
    localStorage.setItem(
      clave,
      JSON.stringify([
        crearTransaccion({ id: 'tx-1', numeroIntento: 1, estado: 'preparada' }),
        crearTransaccion({ id: 'tx-2', numeroIntento: 2, estado: 'confirmando' }),
      ])
    );
    expect(() => obtenerTransaccionActivaPorOperacionIdempotenteId('emp-A', 'op-1')).toThrow(IntentoActivoDuplicadoInventario);
    try {
      obtenerTransaccionActivaPorOperacionIdempotenteId('emp-A', 'op-1');
    } catch (error) {
      const duplicidad = error as IntentoActivoDuplicadoInventario;
      expect(duplicidad.empresaId).toBe('emp-A');
      expect(duplicidad.operacionIdempotenteId).toBe('op-1');
      expect(duplicidad.transaccionesActivasIds.sort()).toEqual(['tx-1', 'tx-2']);
    }
  });

  it('obtenerUltimoIntentoPorOperacionIdempotenteId devuelve el de mayor numeroIntento, sin importar su estado', () => {
    guardarTransaccionInventario(crearTransaccion({ id: 'tx-1', numeroIntento: 1 }), 'emp-A');
    marcarTransaccionFallida('emp-A', 'tx-1');
    guardarTransaccionInventario(crearTransaccion({ id: 'tx-2', numeroIntento: 2 }), 'emp-A');
    expect(obtenerUltimoIntentoPorOperacionIdempotenteId('emp-A', 'op-1')?.id).toBe('tx-2');
  });

  it('obtenerUltimoIntentoPorOperacionIdempotenteId devuelve undefined si la operación no tiene ningún intento', () => {
    expect(obtenerUltimoIntentoPorOperacionIdempotenteId('emp-A', 'op-inexistente')).toBeUndefined();
  });
});

describe('transaccionInventario.repository — transiciones específicas', () => {
  it('pasarTransaccionAConfirmando: preparada→confirmando', () => {
    guardarTransaccionInventario(crearTransaccion(), 'emp-A');
    pasarTransaccionAConfirmando('emp-A', 'tx-1');
    expect(obtenerTransaccionInventarioPorId('tx-1', 'emp-A')?.estado).toBe('confirmando');
  });

  it('rechaza pasar a confirmando una transacción que no está preparada', () => {
    guardarTransaccionInventario(crearTransaccion(), 'emp-A');
    pasarTransaccionAConfirmando('emp-A', 'tx-1');
    expect(() => pasarTransaccionAConfirmando('emp-A', 'tx-1')).toThrow();
  });

  it('marcarTransaccionConfirmada: confirmando→confirmada', () => {
    guardarTransaccionInventario(crearTransaccion(), 'emp-A');
    pasarTransaccionAConfirmando('emp-A', 'tx-1');
    marcarTransaccionConfirmada('emp-A', 'tx-1', { fechaConfirmacion: '2026-01-01T00:05:00.000Z' });
    const transaccion = obtenerTransaccionInventarioPorId('tx-1', 'emp-A');
    expect(transaccion?.estado).toBe('confirmada');
    expect(transaccion?.fechaConfirmacion).toBe('2026-01-01T00:05:00.000Z');
  });

  it('rechaza confirmar directamente desde preparada (debe pasar primero por confirmando)', () => {
    guardarTransaccionInventario(crearTransaccion(), 'emp-A');
    expect(() => marcarTransaccionConfirmada('emp-A', 'tx-1', { fechaConfirmacion: '2026-01-01T00:05:00.000Z' })).toThrow();
  });

  it('marcarTransaccionFallida: preparada→fallida', () => {
    guardarTransaccionInventario(crearTransaccion(), 'emp-A');
    marcarTransaccionFallida('emp-A', 'tx-1');
    expect(obtenerTransaccionInventarioPorId('tx-1', 'emp-A')?.estado).toBe('fallida');
  });

  it('rechaza marcar fallida una transacción confirmando (invariante: fallida solo desde preparada)', () => {
    guardarTransaccionInventario(crearTransaccion(), 'emp-A');
    pasarTransaccionAConfirmando('emp-A', 'tx-1');
    expect(() => marcarTransaccionFallida('emp-A', 'tx-1')).toThrow();
  });

  it('confirmada es terminal: ninguna función de transición la modifica', () => {
    guardarTransaccionInventario(crearTransaccion(), 'emp-A');
    pasarTransaccionAConfirmando('emp-A', 'tx-1');
    marcarTransaccionConfirmada('emp-A', 'tx-1', { fechaConfirmacion: '2026-01-01T00:05:00.000Z' });
    expect(() => pasarTransaccionAConfirmando('emp-A', 'tx-1')).toThrow();
    expect(() => marcarTransaccionFallida('emp-A', 'tx-1')).toThrow();
  });

  it('fallida es terminal: ninguna función de transición la modifica', () => {
    guardarTransaccionInventario(crearTransaccion(), 'emp-A');
    marcarTransaccionFallida('emp-A', 'tx-1');
    expect(() => pasarTransaccionAConfirmando('emp-A', 'tx-1')).toThrow();
    expect(() => marcarTransaccionConfirmada('emp-A', 'tx-1', { fechaConfirmacion: '2026-01-01T00:05:00.000Z' })).toThrow();
  });
});

describe('transaccionInventario.repository — filtrado y datosAnteriores/datosPropuestos', () => {
  it('filtrado por empresa', () => {
    guardarTransaccionInventario(crearTransaccion({ id: 'tx-A', empresaId: 'emp-A' }), 'emp-A');
    guardarTransaccionInventario(crearTransaccion({ id: 'tx-B', empresaId: 'emp-B' }), 'emp-B');
    expect(listarTransaccionesInventarioPorEmpresa('emp-A')).toHaveLength(1);
  });

  it('filtrado por estado dentro de la empresa', () => {
    guardarTransaccionInventario(crearTransaccion({ id: 'tx-1', operacionIdempotenteId: 'op-1', estado: 'preparada' }), 'emp-A');
    guardarTransaccionInventario(crearTransaccion({ id: 'tx-2', operacionIdempotenteId: 'op-2', estado: 'preparada' }), 'emp-A');
    pasarTransaccionAConfirmando('emp-A', 'tx-2');
    marcarTransaccionConfirmada('emp-A', 'tx-2', { fechaConfirmacion: '2026-01-01T00:05:00.000Z' });
    const resultado = filtrarTransaccionesInventarioPorEstado('emp-A', 'confirmada');
    expect(resultado.map((t) => t.id)).toEqual(['tx-2']);
  });

  it('búsqueda por claveIdempotencia dentro de la empresa', () => {
    guardarTransaccionInventario(crearTransaccion({ id: 'tx-1', claveIdempotencia: 'clave-especifica' }), 'emp-A');
    const resultado = buscarTransaccionesPorClaveIdempotencia('emp-A', 'clave-especifica');
    expect(resultado.map((t) => t.id)).toEqual(['tx-1']);
  });

  it('datosAnteriores y datosPropuestos se conservan sin mutación', () => {
    const datosAnteriores = { productoId: 'prod-1', cantidad: '5' };
    const datosPropuestos = { productoId: 'prod-1', cantidad: '15' };
    guardarTransaccionInventario(crearTransaccion({ datosAnteriores, datosPropuestos }), 'emp-A');
    const obtenida = obtenerTransaccionInventarioPorId('tx-1', 'emp-A');
    expect(obtenida?.datosAnteriores).toEqual({ productoId: 'prod-1', cantidad: '5' });
    expect(obtenida?.datosPropuestos).toEqual({ productoId: 'prod-1', cantidad: '15' });
  });

  it('no se ejecuta ninguna propuesta almacenada: el repositorio nunca interpreta datosPropuestos, solo lo persiste/devuelve', () => {
    const datosPropuestos = { accion: 'esto no debe ejecutarse', cantidad: '999' };
    guardarTransaccionInventario(crearTransaccion({ datosPropuestos }), 'emp-A');
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

  it('una transición de empresa A no modifica empresa B', () => {
    guardarTransaccionInventario(crearTransaccion({ id: 'tx-x', empresaId: 'emp-A' }), 'emp-A');
    guardarTransaccionInventario(crearTransaccion({ id: 'tx-x', empresaId: 'emp-B' }), 'emp-B');
    pasarTransaccionAConfirmando('emp-A', 'tx-x');
    expect(obtenerTransaccionInventarioPorId('tx-x', 'emp-B')?.estado).toBe('preparada');
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

  it('pasarTransaccionAConfirmando sobre una colección con JSON corrupto lanza error y no reemplaza el contenido crudo', () => {
    const clave = lsKey('facturafacil_transacciones_inventario', 'emp-A');
    const crudo = '{no es json valido';
    localStorage.setItem(clave, crudo);
    expect(() => pasarTransaccionAConfirmando('emp-A', 'tx-1')).toThrow();
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
    expect(() => guardarTransaccionInventario(crearTransaccion({ id: 'tx-nueva', operacionIdempotenteId: 'op-nueva' }), 'emp-A')).toThrow();
    expect(localStorage.getItem(clave)).toBe(crudo);
  });

  it('pasarTransaccionAConfirmando en tx-A en una colección física A+B lanza error y ambos registros quedan intactos', () => {
    const clave = lsKey('facturafacil_transacciones_inventario', 'emp-A');
    const crudo = colocarColeccionMezclada();
    expect(() => pasarTransaccionAConfirmando('emp-A', 'tx-A')).toThrow();
    expect(localStorage.getItem(clave)).toBe(crudo);
  });
});
