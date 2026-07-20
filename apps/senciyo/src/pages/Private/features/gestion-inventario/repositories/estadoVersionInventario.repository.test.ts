import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { instalarLocalStorageDePrueba } from './localStorageDePrueba';
import {
  obtenerEstadoVersionInventario,
  obtenerVersionInventarioActual,
  actualizarEstadoVersionInventario,
} from './estadoVersionInventario.repository';
import { ConflictoVersionInventario } from '../utils/erroresInventario';
import { lsKey } from '../../../../../shared/tenant';

instalarLocalStorageDePrueba();

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe('estadoVersionInventario.repository', () => {
  it('una empresa sin registro previo inicia en versión 0', () => {
    expect(obtenerVersionInventarioActual('emp-A')).toBe(0);
    expect(obtenerEstadoVersionInventario('emp-A')).toBeUndefined();
  });

  it('aislamiento por empresa: cada una tiene su propio registro', () => {
    actualizarEstadoVersionInventario({ empresaId: 'emp-A', versionEsperada: 0, nuevaVersion: 1, fechaActualizacion: '2026-01-01', ultimaTransaccionId: 'tx-A' });
    expect(obtenerVersionInventarioActual('emp-A')).toBe(1);
    expect(obtenerVersionInventarioActual('emp-B')).toBe(0);
  });

  it('incremento 0→1', () => {
    actualizarEstadoVersionInventario({ empresaId: 'emp-A', versionEsperada: 0, nuevaVersion: 1, fechaActualizacion: '2026-01-01T00:00:00Z', ultimaTransaccionId: 'tx-1' });
    const estado = obtenerEstadoVersionInventario('emp-A');
    expect(estado?.versionInventario).toBe(1);
    expect(estado?.ultimaTransaccionId).toBe('tx-1');
  });

  it('incremento posterior 1→2', () => {
    actualizarEstadoVersionInventario({ empresaId: 'emp-A', versionEsperada: 0, nuevaVersion: 1, fechaActualizacion: 't1', ultimaTransaccionId: 'tx-1' });
    actualizarEstadoVersionInventario({ empresaId: 'emp-A', versionEsperada: 1, nuevaVersion: 2, fechaActualizacion: 't2', ultimaTransaccionId: 'tx-2' });
    expect(obtenerVersionInventarioActual('emp-A')).toBe(2);
  });

  it('conflicto de versión no escribe: versionEsperada distinta de la vigente lanza ConflictoVersionInventario', () => {
    actualizarEstadoVersionInventario({ empresaId: 'emp-A', versionEsperada: 0, nuevaVersion: 1, fechaActualizacion: 't1', ultimaTransaccionId: 'tx-1' });
    expect(() =>
      actualizarEstadoVersionInventario({ empresaId: 'emp-A', versionEsperada: 0, nuevaVersion: 1, fechaActualizacion: 't2', ultimaTransaccionId: 'tx-2' })
    ).toThrow(ConflictoVersionInventario);
    // La versión no cambió tras el conflicto.
    expect(obtenerVersionInventarioActual('emp-A')).toBe(1);
  });

  it('una versión "fallida" (conflicto) no cambia la versión vigente', () => {
    actualizarEstadoVersionInventario({ empresaId: 'emp-A', versionEsperada: 0, nuevaVersion: 1, fechaActualizacion: 't1', ultimaTransaccionId: 'tx-1' });
    const antes = obtenerVersionInventarioActual('emp-A');
    try {
      actualizarEstadoVersionInventario({ empresaId: 'emp-A', versionEsperada: 5, nuevaVersion: 6, fechaActualizacion: 't2', ultimaTransaccionId: 'tx-2' });
    } catch {
      // esperado
    }
    expect(obtenerVersionInventarioActual('emp-A')).toBe(antes);
  });

  it('no permite un incremento distinto de exactamente 1 (salto)', () => {
    expect(() =>
      actualizarEstadoVersionInventario({ empresaId: 'emp-A', versionEsperada: 0, nuevaVersion: 2, fechaActualizacion: 't1', ultimaTransaccionId: 'tx-1' })
    ).toThrow();
  });

  it('no permite un decremento', () => {
    actualizarEstadoVersionInventario({ empresaId: 'emp-A', versionEsperada: 0, nuevaVersion: 1, fechaActualizacion: 't1', ultimaTransaccionId: 'tx-1' });
    expect(() =>
      actualizarEstadoVersionInventario({ empresaId: 'emp-A', versionEsperada: 1, nuevaVersion: 0, fechaActualizacion: 't2', ultimaTransaccionId: 'tx-2' })
    ).toThrow();
  });

  it('el conflicto de versión expone empresaId, versionEsperada y versionVigente estructurados', () => {
    actualizarEstadoVersionInventario({ empresaId: 'emp-A', versionEsperada: 0, nuevaVersion: 1, fechaActualizacion: 't1', ultimaTransaccionId: 'tx-1' });
    try {
      actualizarEstadoVersionInventario({ empresaId: 'emp-A', versionEsperada: 0, nuevaVersion: 1, fechaActualizacion: 't2', ultimaTransaccionId: 'tx-2' });
      throw new Error('no debería llegar aquí');
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictoVersionInventario);
      const conflicto = error as ConflictoVersionInventario;
      expect(conflicto.empresaId).toBe('emp-A');
      expect(conflicto.versionEsperada).toBe(0);
      expect(conflicto.versionVigente).toBe(1);
    }
  });

  it('corrupción de almacenamiento no devuelve 0 silenciosamente — lanza error', () => {
    const clave = lsKey('facturafacil_estado_version_inventario', 'emp-A');
    localStorage.setItem(clave, '{json corrupto');
    expect(() => obtenerVersionInventarioActual('emp-A')).toThrow();
  });

  it('un registro con forma inválida (versión negativa, decimal o no segura) lanza error, nunca se acepta como vigente', () => {
    const clave = lsKey('facturafacil_estado_version_inventario', 'emp-A');
    localStorage.setItem(clave, JSON.stringify({ empresaId: 'emp-A', versionInventario: -1, fechaActualizacion: 't1' }));
    expect(() => obtenerVersionInventarioActual('emp-A')).toThrow();

    localStorage.setItem(clave, JSON.stringify({ empresaId: 'emp-A', versionInventario: 1.5, fechaActualizacion: 't1' }));
    expect(() => obtenerVersionInventarioActual('emp-A')).toThrow();

    localStorage.setItem(clave, JSON.stringify({ empresaId: 'emp-A', versionInventario: Number.MAX_SAFE_INTEGER + 10, fechaActualizacion: 't1' }));
    expect(() => obtenerVersionInventarioActual('emp-A')).toThrow();
  });

  it('un registro cuyo empresaId no coincide con el parámetro (dato mezclado) lanza error, nunca se usa silenciosamente', () => {
    const clave = lsKey('facturafacil_estado_version_inventario', 'emp-A');
    localStorage.setItem(clave, JSON.stringify({ empresaId: 'emp-B', versionInventario: 3, fechaActualizacion: 't1', ultimaTransaccionId: 'tx-1' }));
    expect(() => obtenerVersionInventarioActual('emp-A')).toThrow();
  });
});

describe('estadoVersionInventario.repository — validación completa antes de escribir (Bloqueante 5)', () => {
  it('rechaza empresaId vacío sin escribir', () => {
    expect(() =>
      actualizarEstadoVersionInventario({ empresaId: '', versionEsperada: 0, nuevaVersion: 1, fechaActualizacion: 't1', ultimaTransaccionId: 'tx-1' })
    ).toThrow();
  });

  it('rechaza fechaActualizacion vacía sin escribir', () => {
    const clave = lsKey('facturafacil_estado_version_inventario', 'emp-A');
    expect(() =>
      actualizarEstadoVersionInventario({ empresaId: 'emp-A', versionEsperada: 0, nuevaVersion: 1, fechaActualizacion: '', ultimaTransaccionId: 'tx-1' })
    ).toThrow();
    expect(localStorage.getItem(clave)).toBeNull();
  });

  it('rechaza ultimaTransaccionId ausente sin escribir', () => {
    const clave = lsKey('facturafacil_estado_version_inventario', 'emp-A');
    expect(() =>
      // @ts-expect-error se omite deliberadamente para probar la validación en tiempo de ejecución
      actualizarEstadoVersionInventario({ empresaId: 'emp-A', versionEsperada: 0, nuevaVersion: 1, fechaActualizacion: 't1' })
    ).toThrow();
    expect(localStorage.getItem(clave)).toBeNull();
  });

  it('rechaza ultimaTransaccionId vacía sin escribir', () => {
    const clave = lsKey('facturafacil_estado_version_inventario', 'emp-A');
    expect(() =>
      actualizarEstadoVersionInventario({ empresaId: 'emp-A', versionEsperada: 0, nuevaVersion: 1, fechaActualizacion: 't1', ultimaTransaccionId: '' })
    ).toThrow();
    expect(localStorage.getItem(clave)).toBeNull();
  });

  it('rechaza versionEsperada negativa sin escribir', () => {
    const clave = lsKey('facturafacil_estado_version_inventario', 'emp-A');
    expect(() =>
      actualizarEstadoVersionInventario({ empresaId: 'emp-A', versionEsperada: -1, nuevaVersion: 0, fechaActualizacion: 't1', ultimaTransaccionId: 'tx-1' })
    ).toThrow();
    expect(localStorage.getItem(clave)).toBeNull();
  });

  it('rechaza versionEsperada decimal sin escribir', () => {
    const clave = lsKey('facturafacil_estado_version_inventario', 'emp-A');
    expect(() =>
      actualizarEstadoVersionInventario({ empresaId: 'emp-A', versionEsperada: 0.5, nuevaVersion: 1.5, fechaActualizacion: 't1', ultimaTransaccionId: 'tx-1' })
    ).toThrow();
    expect(localStorage.getItem(clave)).toBeNull();
  });

  it('rechaza versionEsperada no segura (mayor que MAX_SAFE_INTEGER) sin escribir', () => {
    const clave = lsKey('facturafacil_estado_version_inventario', 'emp-A');
    expect(() =>
      actualizarEstadoVersionInventario({
        empresaId: 'emp-A',
        versionEsperada: Number.MAX_SAFE_INTEGER + 2,
        nuevaVersion: Number.MAX_SAFE_INTEGER + 3,
        fechaActualizacion: 't1',
        ultimaTransaccionId: 'tx-1',
      })
    ).toThrow();
    expect(localStorage.getItem(clave)).toBeNull();
  });

  it('rechaza nuevaVersion no segura sin escribir', () => {
    const clave = lsKey('facturafacil_estado_version_inventario', 'emp-A');
    expect(() =>
      actualizarEstadoVersionInventario({
        empresaId: 'emp-A',
        versionEsperada: 0,
        nuevaVersion: Number.MAX_SAFE_INTEGER + 10,
        fechaActualizacion: 't1',
        ultimaTransaccionId: 'tx-1',
      })
    ).toThrow();
    expect(localStorage.getItem(clave)).toBeNull();
  });

  it('rechaza el overflow: versionEsperada ya en el límite de MAX_SAFE_INTEGER, el incremento no puede escribirse', () => {
    const clave = lsKey('facturafacil_estado_version_inventario', 'emp-A');
    expect(() =>
      actualizarEstadoVersionInventario({
        empresaId: 'emp-A',
        versionEsperada: Number.MAX_SAFE_INTEGER,
        nuevaVersion: Number.MAX_SAFE_INTEGER + 1,
        fechaActualizacion: 't1',
        ultimaTransaccionId: 'tx-1',
      })
    ).toThrow();
    expect(localStorage.getItem(clave)).toBeNull();
  });

  it('el contenido existente permanece exactamente igual después de cualquier intento inválido', () => {
    actualizarEstadoVersionInventario({ empresaId: 'emp-A', versionEsperada: 0, nuevaVersion: 1, fechaActualizacion: 't1', ultimaTransaccionId: 'tx-1' });
    const clave = lsKey('facturafacil_estado_version_inventario', 'emp-A');
    const contenidoPrevio = localStorage.getItem(clave);

    expect(() =>
      actualizarEstadoVersionInventario({ empresaId: 'emp-A', versionEsperada: -5, nuevaVersion: -4, fechaActualizacion: 't2', ultimaTransaccionId: 'tx-2' })
    ).toThrow();
    expect(localStorage.getItem(clave)).toBe(contenidoPrevio);

    expect(() =>
      actualizarEstadoVersionInventario({ empresaId: 'emp-A', versionEsperada: 1, nuevaVersion: 2, fechaActualizacion: '', ultimaTransaccionId: 'tx-2' })
    ).toThrow();
    expect(localStorage.getItem(clave)).toBe(contenidoPrevio);
  });

  it('un registro persistido con versionInventario 0 nunca se acepta como vigente (0 solo es válido como ausencia de registro)', () => {
    const clave = lsKey('facturafacil_estado_version_inventario', 'emp-A');
    localStorage.setItem(clave, JSON.stringify({ empresaId: 'emp-A', versionInventario: 0, fechaActualizacion: 't1', ultimaTransaccionId: 'tx-1' }));
    expect(() => obtenerVersionInventarioActual('emp-A')).toThrow();
  });

  it('un registro persistido sin ultimaTransaccionId nunca se acepta como vigente', () => {
    const clave = lsKey('facturafacil_estado_version_inventario', 'emp-A');
    localStorage.setItem(clave, JSON.stringify({ empresaId: 'emp-A', versionInventario: 1, fechaActualizacion: 't1' }));
    expect(() => obtenerVersionInventarioActual('emp-A')).toThrow();
  });

  it('un registro persistido con ultimaTransaccionId vacía nunca se acepta como vigente', () => {
    const clave = lsKey('facturafacil_estado_version_inventario', 'emp-A');
    localStorage.setItem(clave, JSON.stringify({ empresaId: 'emp-A', versionInventario: 1, fechaActualizacion: 't1', ultimaTransaccionId: '' }));
    expect(() => obtenerVersionInventarioActual('emp-A')).toThrow();
  });
});
