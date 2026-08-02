import { describe, it, expect } from 'vitest';
import { formatearFecha } from './fechas';

describe('formatearFecha — formato estándar dd/MM/yyyy, nunca fechas ISO en pantalla', () => {
  it('convierte una fecha corta ISO (YYYY-MM-DD)', () => {
    expect(formatearFecha('2026-08-01')).toBe('01/08/2026');
  });

  it('convierte un timestamp ISO completo, ignorando la hora', () => {
    expect(formatearFecha('2026-08-01T14:30:00.000Z')).toBe('01/08/2026');
  });

  it('cadena vacía devuelve un guion, nunca una fecha inventada', () => {
    expect(formatearFecha('')).toBe('—');
  });

  it('formato irreconocible (sin separadores) se devuelve tal cual, nunca oculta el dato', () => {
    expect(formatearFecha('invalido')).toBe('invalido');
  });
});
