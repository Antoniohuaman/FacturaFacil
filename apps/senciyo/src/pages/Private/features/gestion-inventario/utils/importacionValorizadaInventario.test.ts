import { describe, expect, it } from 'vitest';
import { calcularDiferenciaFilaImportacion, calcularEstadoCostoFila, validarFilasLoteImportacion } from './importacionValorizadaInventario';
import type { FilaLoteImportacionValorizada } from '../models/loteImportacionValorizada.types';

describe('calcularDiferenciaFilaImportacion', () => {
  it('modo sumatoria: la diferencia es la cantidad del archivo directamente', () => {
    expect(calcularDiferenciaFilaImportacion(10, 5, 'sumatoria')).toBe(10);
    expect(calcularDiferenciaFilaImportacion(10, 0, 'sumatoria')).toBe(10);
  });

  it('modo reemplazo: la diferencia es cantidadArchivo - stockActual', () => {
    expect(calcularDiferenciaFilaImportacion(15, 10, 'reemplazo')).toBe(5);
    expect(calcularDiferenciaFilaImportacion(5, 10, 'reemplazo')).toBe(-5);
    expect(calcularDiferenciaFilaImportacion(10, 10, 'reemplazo')).toBe(0);
  });
});

describe('calcularEstadoCostoFila', () => {
  it('sin_cambio cuando la diferencia es cero, sin importar el modo de operación', () => {
    expect(calcularEstadoCostoFila(0, undefined, 'cuantitativo_libre')).toBe('sin_cambio');
    expect(calcularEstadoCostoFila(0, undefined, 'valorizado_exclusivo')).toBe('sin_cambio');
  });

  it('no_aplica cuando el modo de operación no es valorizado_exclusivo (toda importación productiva hoy)', () => {
    expect(calcularEstadoCostoFila(10, undefined, 'cuantitativo_libre')).toBe('no_aplica');
    expect(calcularEstadoCostoFila(10, undefined, 'cuantitativo_invalida_snapshot')).toBe('no_aplica');
    expect(calcularEstadoCostoFila(-10, undefined, 'cuantitativo_libre')).toBe('no_aplica');
  });

  it('no_aplica para una diferencia negativa incluso en modo valorizado (una salida no exige costo)', () => {
    expect(calcularEstadoCostoFila(-10, undefined, 'valorizado_exclusivo')).toBe('no_aplica');
  });

  it('con_costo para una diferencia positiva en modo valorizado con costo válido', () => {
    expect(calcularEstadoCostoFila(10, 25, 'valorizado_exclusivo')).toBe('con_costo');
  });

  it('requiere_costo para una diferencia positiva en modo valorizado sin costo válido', () => {
    expect(calcularEstadoCostoFila(10, undefined, 'valorizado_exclusivo')).toBe('requiere_costo');
    expect(calcularEstadoCostoFila(10, 0, 'valorizado_exclusivo')).toBe('requiere_costo');
    expect(calcularEstadoCostoFila(10, -5, 'valorizado_exclusivo')).toBe('requiere_costo');
    expect(calcularEstadoCostoFila(10, NaN, 'valorizado_exclusivo')).toBe('requiere_costo');
  });
});

function crearFila(overrides: Partial<FilaLoteImportacionValorizada> = {}): FilaLoteImportacionValorizada {
  return {
    numeroFila: 1,
    productoId: 'prod-1',
    almacenId: 'alm-1',
    cantidadArchivo: 10,
    estadoCosto: 'no_aplica',
    ...overrides,
  };
}

describe('validarFilasLoteImportacion', () => {
  it('no lanza si ninguna fila requiere costo', () => {
    expect(() => validarFilasLoteImportacion([crearFila({ estadoCosto: 'sin_cambio' }), crearFila({ estadoCosto: 'con_costo' })])).not.toThrow();
  });

  it('rechaza el lote completo si al menos una fila requiere costo', () => {
    expect(() =>
      validarFilasLoteImportacion([crearFila({ numeroFila: 1, estadoCosto: 'con_costo' }), crearFila({ numeroFila: 2, estadoCosto: 'requiere_costo' })])
    ).toThrow(/fila\(s\) requieren costo/);
  });

  it('el mensaje de error incluye todos los números de fila inválidos', () => {
    expect(() =>
      validarFilasLoteImportacion([crearFila({ numeroFila: 2, estadoCosto: 'requiere_costo' }), crearFila({ numeroFila: 5, estadoCosto: 'requiere_costo' })])
    ).toThrow(/2, 5/);
  });
});
