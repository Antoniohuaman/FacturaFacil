import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { instalarLocalStorageDePrueba } from './localStorageDePrueba';
import {
  obtenerOperacionIdempotentePorId,
  buscarOperacionIdempotentePorClave,
  listarOperacionesIdempotentesPorEmpresa,
  enlazarOperacionConTransaccionActiva,
  marcarOperacionConfirmada,
  marcarOperacionFallida,
  CLAVE_COLECCION_OPERACIONES_IDEMPOTENTES,
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
    fechaCreacion: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * Helper EXCLUSIVO de pruebas: escribe directamente en el localStorage de prueba, sin pasar por
 * ningún repositorio ni validación. `guardarOperacionIdempotente` ya no existe como API pública
 * (se retiró del repositorio — ver `utils/idempotenciaInventario.ts`), así que las pruebas que
 * necesitan sembrar un estado de partida lo hacen aquí, igual que ya hacían las pruebas de
 * "colección corrupta"/"colección mezclada" de este mismo archivo.
 */
function guardarOperacionDePrueba(operacion: OperacionIdempotenteInventario, empresaId: string): void {
  const clave = lsKey(CLAVE_COLECCION_OPERACIONES_IDEMPOTENTES, empresaId);
  const actuales = JSON.parse(localStorage.getItem(clave) ?? '[]') as OperacionIdempotenteInventario[];
  localStorage.setItem(clave, JSON.stringify([...actuales, operacion]));
}

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe('operacionIdempotenteInventario.repository — lectura básica', () => {
  it('obtiene una operación por id y empresa', () => {
    const operacion = crearOperacion();
    guardarOperacionDePrueba(operacion, 'emp-A');
    expect(obtenerOperacionIdempotentePorId('op-1', 'emp-A')).toEqual(operacion);
  });

  it('lista todas las operaciones de una empresa', () => {
    guardarOperacionDePrueba(crearOperacion({ id: 'op-1', clave: 'clave-1' }), 'emp-A');
    guardarOperacionDePrueba(crearOperacion({ id: 'op-2', clave: 'clave-2' }), 'emp-A');
    expect(listarOperacionesIdempotentesPorEmpresa('emp-A')).toHaveLength(2);
  });

  it('resultadoIds se conserva como arreglo, nunca como escalar', () => {
    guardarOperacionDePrueba(crearOperacion(), 'emp-A');
    enlazarOperacionConTransaccionActiva('emp-A', 'op-1', 'tx-1');
    marcarOperacionConfirmada('emp-A', 'op-1', { transaccionId: 'tx-1', resultadoIds: ['mov-1', 'consumo-1', 'consumo-2'], fechaConfirmacion: '2026-01-01T00:05:00.000Z' });
    const obtenida = obtenerOperacionIdempotentePorId('op-1', 'emp-A');
    expect(Array.isArray(obtenida?.resultadoIds)).toBe(true);
    expect(obtenida?.resultadoIds).toEqual(['mov-1', 'consumo-1', 'consumo-2']);
  });

  it('búsqueda por empresaId + clave', () => {
    guardarOperacionDePrueba(crearOperacion({ clave: 'VENTA-STOCK-doc-1' }), 'emp-A');
    expect(buscarOperacionIdempotentePorClave('emp-A', 'VENTA-STOCK-doc-1')?.id).toBe('op-1');
  });

  it('la misma clave es válida en dos empresas distintas', () => {
    guardarOperacionDePrueba(crearOperacion({ id: 'op-A', empresaId: 'emp-A', clave: 'clave-compartida' }), 'emp-A');
    guardarOperacionDePrueba(crearOperacion({ id: 'op-B', empresaId: 'emp-B', clave: 'clave-compartida' }), 'emp-B');
    expect(buscarOperacionIdempotentePorClave('emp-A', 'clave-compartida')?.id).toBe('op-A');
    expect(buscarOperacionIdempotentePorClave('emp-B', 'clave-compartida')?.id).toBe('op-B');
  });
});

describe('operacionIdempotenteInventario.repository — aislamiento multiempresa', () => {
  it('empresa A y empresa B pueden guardar el mismo id sin mezclarse', () => {
    guardarOperacionDePrueba(crearOperacion({ id: 'op-x', empresaId: 'emp-A', clave: 'clave-A' }), 'emp-A');
    guardarOperacionDePrueba(crearOperacion({ id: 'op-x', empresaId: 'emp-B', clave: 'clave-B' }), 'emp-B');
    expect(obtenerOperacionIdempotentePorId('op-x', 'emp-A')?.clave).toBe('clave-A');
    expect(obtenerOperacionIdempotentePorId('op-x', 'emp-B')?.clave).toBe('clave-B');
  });

  it('una consulta de empresa A nunca devuelve registros de empresa B', () => {
    guardarOperacionDePrueba(crearOperacion({ id: 'op-A', empresaId: 'emp-A', clave: 'c-A' }), 'emp-A');
    guardarOperacionDePrueba(crearOperacion({ id: 'op-B', empresaId: 'emp-B', clave: 'c-B' }), 'emp-B');
    expect(listarOperacionesIdempotentesPorEmpresa('emp-A')).toHaveLength(1);
  });

  it('una transición de empresa A no modifica empresa B', () => {
    guardarOperacionDePrueba(crearOperacion({ id: 'op-x', empresaId: 'emp-A', clave: 'c-A' }), 'emp-A');
    guardarOperacionDePrueba(crearOperacion({ id: 'op-x', empresaId: 'emp-B', clave: 'c-B' }), 'emp-B');
    marcarOperacionFallida('emp-A', 'op-x');
    expect(obtenerOperacionIdempotentePorId('op-x', 'emp-B')?.estado).toBe('preparada');
  });

  it('datos mezclados dentro de la misma colección: el filtro explícito por empresaId sigue protegiendo la consulta', () => {
    const clave = lsKey(CLAVE_COLECCION_OPERACIONES_IDEMPOTENTES, 'emp-A');
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
  it('enlazar sobre una colección con JSON corrupto lanza error y no reemplaza el contenido crudo', () => {
    const clave = lsKey(CLAVE_COLECCION_OPERACIONES_IDEMPOTENTES, 'emp-A');
    const crudo = '{no es json valido';
    localStorage.setItem(clave, crudo);
    expect(() => enlazarOperacionConTransaccionActiva('emp-A', 'op-1', 'tx-1')).toThrow();
    expect(localStorage.getItem(clave)).toBe(crudo);
  });
});

describe('operacionIdempotenteInventario.repository — una colección física mezclada (A+B) nunca se sobrescribe al mutar', () => {
  function colocarColeccionMezclada(): string {
    const clave = lsKey(CLAVE_COLECCION_OPERACIONES_IDEMPOTENTES, 'emp-A');
    const crudo = JSON.stringify([
      crearOperacion({ id: 'op-A', empresaId: 'emp-A', clave: 'clave-A' }),
      crearOperacion({ id: 'op-B', empresaId: 'emp-B', clave: 'clave-B' }),
    ]);
    localStorage.setItem(clave, crudo);
    return crudo;
  }

  it('enlazar op-A en una colección física A+B lanza error y ambos registros quedan intactos', () => {
    const clave = lsKey(CLAVE_COLECCION_OPERACIONES_IDEMPOTENTES, 'emp-A');
    const crudo = colocarColeccionMezclada();
    expect(() => enlazarOperacionConTransaccionActiva('emp-A', 'op-A', 'tx-1')).toThrow();
    expect(localStorage.getItem(clave)).toBe(crudo);
  });
});

describe('operacionIdempotenteInventario.repository — enlazarOperacionConTransaccionActiva', () => {
  it('enlaza una operación preparada con un intento activo', () => {
    guardarOperacionDePrueba(crearOperacion(), 'emp-A');
    enlazarOperacionConTransaccionActiva('emp-A', 'op-1', 'tx-1');
    expect(obtenerOperacionIdempotentePorId('op-1', 'emp-A')?.transaccionInventarioId).toBe('tx-1');
  });

  it('rechaza enlazar una operación que no está preparada', () => {
    guardarOperacionDePrueba(crearOperacion(), 'emp-A');
    enlazarOperacionConTransaccionActiva('emp-A', 'op-1', 'tx-1');
    marcarOperacionConfirmada('emp-A', 'op-1', { transaccionId: 'tx-1', resultadoIds: [], fechaConfirmacion: '2026-01-01T00:05:00.000Z' });
    expect(() => enlazarOperacionConTransaccionActiva('emp-A', 'op-1', 'tx-2')).toThrow();
  });

  it('rechaza enlazar una operación que ya tiene un transaccionInventarioId (no sobrescribe)', () => {
    guardarOperacionDePrueba(crearOperacion(), 'emp-A');
    enlazarOperacionConTransaccionActiva('emp-A', 'op-1', 'tx-1');
    expect(() => enlazarOperacionConTransaccionActiva('emp-A', 'op-1', 'tx-2')).toThrow();
    expect(obtenerOperacionIdempotentePorId('op-1', 'emp-A')?.transaccionInventarioId).toBe('tx-1');
  });
});

describe('operacionIdempotenteInventario.repository — marcarOperacionConfirmada', () => {
  it('preparada→confirmada exige que el transaccionId coincida con el enlazado', () => {
    guardarOperacionDePrueba(crearOperacion(), 'emp-A');
    enlazarOperacionConTransaccionActiva('emp-A', 'op-1', 'tx-1');
    expect(() =>
      marcarOperacionConfirmada('emp-A', 'op-1', { transaccionId: 'tx-OTRA', resultadoIds: [], fechaConfirmacion: '2026-01-01T00:05:00.000Z' })
    ).toThrow();
  });

  it('confirma correctamente cuando el transaccionId coincide', () => {
    guardarOperacionDePrueba(crearOperacion(), 'emp-A');
    enlazarOperacionConTransaccionActiva('emp-A', 'op-1', 'tx-1');
    marcarOperacionConfirmada('emp-A', 'op-1', { transaccionId: 'tx-1', resultadoIds: ['mov-1'], fechaConfirmacion: '2026-01-01T00:05:00.000Z' });
    const operacion = obtenerOperacionIdempotentePorId('op-1', 'emp-A');
    expect(operacion?.estado).toBe('confirmada');
    expect(operacion?.resultadoIds).toEqual(['mov-1']);
    expect(operacion?.fechaConfirmacion).toBe('2026-01-01T00:05:00.000Z');
  });

  it('rechaza confirmar una operación que no está preparada', () => {
    guardarOperacionDePrueba(crearOperacion(), 'emp-A');
    enlazarOperacionConTransaccionActiva('emp-A', 'op-1', 'tx-1');
    marcarOperacionConfirmada('emp-A', 'op-1', { transaccionId: 'tx-1', resultadoIds: [], fechaConfirmacion: '2026-01-01T00:05:00.000Z' });
    expect(() =>
      marcarOperacionConfirmada('emp-A', 'op-1', { transaccionId: 'tx-1', resultadoIds: [], fechaConfirmacion: '2026-01-01T00:06:00.000Z' })
    ).toThrow();
  });
});

describe('operacionIdempotenteInventario.repository — marcarOperacionFallida', () => {
  it('preparada→fallida fuerza resultadoIds a vacío y conserva transaccionInventarioId como auditoría', () => {
    guardarOperacionDePrueba(crearOperacion(), 'emp-A');
    enlazarOperacionConTransaccionActiva('emp-A', 'op-1', 'tx-1');
    marcarOperacionFallida('emp-A', 'op-1');
    const operacion = obtenerOperacionIdempotentePorId('op-1', 'emp-A');
    expect(operacion?.estado).toBe('fallida');
    expect(operacion?.resultadoIds).toEqual([]);
    expect(operacion?.transaccionInventarioId).toBe('tx-1');
  });

  it('rechaza marcar fallida una operación que no está preparada', () => {
    guardarOperacionDePrueba(crearOperacion(), 'emp-A');
    enlazarOperacionConTransaccionActiva('emp-A', 'op-1', 'tx-1');
    marcarOperacionConfirmada('emp-A', 'op-1', { transaccionId: 'tx-1', resultadoIds: [], fechaConfirmacion: '2026-01-01T00:05:00.000Z' });
    expect(() => marcarOperacionFallida('emp-A', 'op-1')).toThrow();
  });
});

describe('operacionIdempotenteInventario.repository — estados terminales inmutables', () => {
  it('confirmada es terminal: ninguna de las funciones exportadas la modifica', () => {
    guardarOperacionDePrueba(crearOperacion(), 'emp-A');
    enlazarOperacionConTransaccionActiva('emp-A', 'op-1', 'tx-1');
    marcarOperacionConfirmada('emp-A', 'op-1', { transaccionId: 'tx-1', resultadoIds: [], fechaConfirmacion: '2026-01-01T00:05:00.000Z' });
    expect(() => enlazarOperacionConTransaccionActiva('emp-A', 'op-1', 'tx-2')).toThrow();
    expect(() => marcarOperacionFallida('emp-A', 'op-1')).toThrow();
  });
});

describe('operacionIdempotenteInventario.repository — la creación y la reactivación ya no son API del repositorio', () => {
  it('guardarOperacionIdempotente ya no se exporta desde el repositorio', async () => {
    const modulo = await import('./operacionIdempotenteInventario.repository');
    expect('guardarOperacionIdempotente' in modulo).toBe(false);
  });

  it('marcarOperacionParaReintento ya no se exporta desde el repositorio', async () => {
    const modulo = await import('./operacionIdempotenteInventario.repository');
    expect('marcarOperacionParaReintento' in modulo).toBe(false);
  });
});
