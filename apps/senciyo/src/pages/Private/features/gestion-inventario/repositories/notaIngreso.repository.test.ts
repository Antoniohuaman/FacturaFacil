import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { instalarLocalStorageDePrueba } from './localStorageDePrueba';
import { lsKey } from '../../../../../shared/tenant';
import { cargarNotasIngreso, guardarNotasIngreso, agregarOActualizarNI } from './notaIngreso.repository';
import type { NotaIngreso } from '../models/notaIngreso.types';

instalarLocalStorageDePrueba();

// `guardarNotasIngreso` dispara `window.dispatchEvent` tras escribir — el entorno 'node' de Vitest
// no define `window`. Stub mínimo, exclusivo de esta prueba, sin efecto sobre el código productivo
// (mismo patrón que inventory.service.test.ts).
if (typeof (globalThis as typeof globalThis & { window?: unknown }).window === 'undefined') {
  Object.defineProperty(globalThis, 'window', {
    value: { dispatchEvent: () => true },
    writable: true,
    configurable: true,
  });
}

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

function crearNI(overrides: Partial<NotaIngreso> = {}): NotaIngreso {
  return {
    id: 'ni-1',
    tipoDocumento: 'nota_ingreso',
    serie: 'NI01',
    estado: 'Borrador',
    esBorrador: true,
    fechaDocumento: '2026-01-01',
    fechaIngresoAlmacen: '2026-01-01',
    tipoIngreso: '02',
    almacenDestinoId: 'alm-1',
    almacenDestinoNombre: 'Almacén Principal',
    almacenDestinoCodigo: 'ALM01',
    moneda: 'PEN',
    lineas: [],
    baseImponible: 0,
    descuentos: 0,
    isc: 0,
    impuesto: 0,
    noGravados: 0,
    otc: 0,
    total: 0,
    usuario: 'user-1',
    fechaCreacion: '2026-01-01T00:00:00.000Z',
    fechaActualizacion: '2026-01-01T00:00:00.000Z',
    historial: [],
    ...overrides,
  };
}

describe('notaIngreso.repository — aislamiento multiempresa (VAL-P0-001)', () => {
  it('PR-01: Empresa A guarda una NI y Empresa B no puede leerla', () => {
    agregarOActualizarNI(crearNI({ id: 'ni-A' }), 'emp-A');
    expect(cargarNotasIngreso('emp-B')).toEqual([]);
    expect(cargarNotasIngreso('emp-A').map((n) => n.id)).toEqual(['ni-A']);
  });

  it('cada empresa escribe bajo una clave física distinta, tenantizada', () => {
    agregarOActualizarNI(crearNI({ id: 'ni-A' }), 'emp-A');
    agregarOActualizarNI(crearNI({ id: 'ni-B' }), 'emp-B');
    expect(localStorage.getItem(lsKey('notas_ingreso_v1', 'emp-A'))).not.toBeNull();
    expect(JSON.parse(localStorage.getItem(lsKey('notas_ingreso_v1', 'emp-A')) as string)).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem(lsKey('notas_ingreso_v1', 'emp-B')) as string)).toHaveLength(1);
  });

  it('nunca existe una clave física global sin prefijo de empresa', () => {
    agregarOActualizarNI(crearNI({ id: 'ni-A' }), 'emp-A');
    expect(localStorage.getItem('notas_ingreso_v1')).toBeNull();
  });

  it('cambiar de empresa nunca reutiliza el resultado de la empresa anterior', () => {
    agregarOActualizarNI(crearNI({ id: 'ni-A' }), 'emp-A');
    const paraB = cargarNotasIngreso('emp-B');
    agregarOActualizarNI(crearNI({ id: 'ni-B' }), 'emp-B');
    // La lectura anterior (antes de escribir nada para B) seguía vacía; una lectura nueva ya ve lo suyo.
    expect(paraB).toEqual([]);
    expect(cargarNotasIngreso('emp-B').map((n) => n.id)).toEqual(['ni-B']);
    expect(cargarNotasIngreso('emp-A').map((n) => n.id)).toEqual(['ni-A']);
  });

  it('PR-03: sin empresaId válido, el repositorio rechaza explícitamente (nunca clave global)', () => {
    expect(() => cargarNotasIngreso('')).toThrow();
    expect(() => cargarNotasIngreso(undefined as unknown as string)).toThrow();
    expect(() => guardarNotasIngreso([crearNI()], '')).toThrow();
    expect(() => agregarOActualizarNI(crearNI(), '   ')).toThrow();
  });
});

describe('notaIngreso.repository — errores de persistencia nunca silenciados (VAL-P0-003)', () => {
  it('PR-05: JSON corrupto genera error controlado, nunca una colección vacía falsa', () => {
    localStorage.setItem(lsKey('notas_ingreso_v1', 'emp-A'), '{esto no es json valido');
    expect(() => cargarNotasIngreso('emp-A')).toThrow();
  });

  it('una raíz que no es arreglo también lanza, en vez de interpretarse como "sin notas"', () => {
    localStorage.setItem(lsKey('notas_ingreso_v1', 'emp-A'), JSON.stringify({ no: 'es un arreglo' }));
    expect(() => cargarNotasIngreso('emp-A')).toThrow();
  });

  it('PR-06: QuotaExceededError al guardar se propaga (nunca se ignora en silencio)', () => {
    const original = localStorage.setItem.bind(localStorage);
    localStorage.setItem = () => {
      const err = new DOMException('Quota exceeded', 'QuotaExceededError');
      throw err;
    };
    try {
      expect(() => guardarNotasIngreso([crearNI()], 'emp-A')).toThrow(/espacio disponible/);
    } finally {
      localStorage.setItem = original;
    }
  });

  it('un error de escritura que no es de cuota también se propaga con mensaje de dominio', () => {
    const original = localStorage.setItem.bind(localStorage);
    localStorage.setItem = () => {
      throw new Error('disco lleno');
    };
    try {
      expect(() => guardarNotasIngreso([crearNI()], 'emp-A')).toThrow(/Error al guardar las Notas de Ingreso/);
    } finally {
      localStorage.setItem = original;
    }
  });

  it('la ausencia real de la clave (nunca escrita) sí es una colección vacía legítima', () => {
    expect(cargarNotasIngreso('emp-nueva')).toEqual([]);
  });
});
