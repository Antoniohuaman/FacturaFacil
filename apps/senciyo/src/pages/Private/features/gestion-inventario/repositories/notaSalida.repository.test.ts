import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { instalarLocalStorageDePrueba } from './localStorageDePrueba';
import { lsKey } from '../../../../../shared/tenant';
import {
  cargarNotasSalida,
  guardarNotasSalida,
  agregarOActualizarNS,
  persistirNotasSalidaCompleto,
  obtenerNSActivasPorDocumento,
} from './notaSalida.repository';
import type { NotaSalida } from '../models/notaSalida.types';

instalarLocalStorageDePrueba();

// Mismo stub mínimo de `window` que notaIngreso.repository.test.ts / inventory.service.test.ts.
if (typeof (globalThis as typeof globalThis & { window?: unknown }).window === 'undefined') {
  Object.defineProperty(globalThis, 'window', {
    value: { dispatchEvent: () => true },
    writable: true,
    configurable: true,
  });
}

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

function crearNS(overrides: Partial<NotaSalida> = {}): NotaSalida {
  return {
    id: 'ns-1',
    tipoDocumento: 'nota_salida',
    serie: 'NS01',
    estado: 'Borrador',
    esBorrador: true,
    fechaDocumento: '2026-01-01',
    tipoSalida: '01',
    moneda: 'PEN',
    lineas: [],
    baseImponible: 0,
    impuesto: 0,
    total: 0,
    historial: [],
    usuario: 'user-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('notaSalida.repository — aislamiento multiempresa (VAL-P0-001)', () => {
  it('PR-02: Empresa A guarda una NS y Empresa B no puede leerla', () => {
    agregarOActualizarNS(crearNS({ id: 'ns-A' }), 'emp-A');
    expect(cargarNotasSalida('emp-B')).toEqual([]);
    expect(cargarNotasSalida('emp-A').map((n) => n.id)).toEqual(['ns-A']);
  });

  it('cada empresa escribe bajo una clave física distinta, tenantizada', () => {
    agregarOActualizarNS(crearNS({ id: 'ns-A' }), 'emp-A');
    agregarOActualizarNS(crearNS({ id: 'ns-B' }), 'emp-B');
    expect(JSON.parse(localStorage.getItem(lsKey('notas_salida_v1', 'emp-A')) as string)).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem(lsKey('notas_salida_v1', 'emp-B')) as string)).toHaveLength(1);
  });

  it('nunca existe una clave física global sin prefijo de empresa', () => {
    agregarOActualizarNS(crearNS({ id: 'ns-A' }), 'emp-A');
    expect(localStorage.getItem('notas_salida_v1')).toBeNull();
  });

  it('PR-03: sin empresaId válido, el repositorio rechaza explícitamente', () => {
    expect(() => cargarNotasSalida('')).toThrow();
    expect(() => guardarNotasSalida([crearNS()], '')).toThrow();
    expect(() => agregarOActualizarNS(crearNS(), '  ')).toThrow();
    expect(() => obtenerNSActivasPorDocumento({ comprobanteOrigenId: 'c-1' }, '')).toThrow();
  });

  it('obtenerNSActivasPorDocumento respeta el aislamiento por empresa', () => {
    agregarOActualizarNS(crearNS({ id: 'ns-A', comprobanteOrigenId: 'c-1' }), 'emp-A');
    expect(obtenerNSActivasPorDocumento({ comprobanteOrigenId: 'c-1' }, 'emp-B')).toEqual([]);
    expect(obtenerNSActivasPorDocumento({ comprobanteOrigenId: 'c-1' }, 'emp-A')).toHaveLength(1);
  });
});

describe('notaSalida.repository — errores de persistencia nunca silenciados (VAL-P0-003)', () => {
  it('PR-05: JSON corrupto genera error controlado, nunca una colección vacía falsa', () => {
    localStorage.setItem(lsKey('notas_salida_v1', 'emp-A'), '{esto no es json valido');
    expect(() => cargarNotasSalida('emp-A')).toThrow();
  });

  it('una raíz que no es arreglo también lanza', () => {
    localStorage.setItem(lsKey('notas_salida_v1', 'emp-A'), JSON.stringify({ no: 'es un arreglo' }));
    expect(() => cargarNotasSalida('emp-A')).toThrow();
  });

  it('PR-06: QuotaExceededError al guardar se propaga', () => {
    const original = localStorage.setItem.bind(localStorage);
    localStorage.setItem = () => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    };
    try {
      expect(() => guardarNotasSalida([crearNS()], 'emp-A')).toThrow(/espacio disponible/);
    } finally {
      localStorage.setItem = original;
    }
  });

  it('persistirNotasSalidaCompleto tipa el error en vez de lanzarlo, pero nunca lo oculta', () => {
    const original = localStorage.setItem.bind(localStorage);
    localStorage.setItem = () => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    };
    try {
      const resultado = persistirNotasSalidaCompleto([crearNS()], 'emp-A');
      expect(resultado.exito).toBe(false);
      if (!resultado.exito) {
        expect(resultado.error).toMatch(/espacio disponible/);
      }
    } finally {
      localStorage.setItem = original;
    }
  });

  it('la ausencia real de la clave es una colección vacía legítima', () => {
    expect(cargarNotasSalida('emp-nueva')).toEqual([]);
  });
});
