import { describe, it, expect } from 'vitest';
import { puedeAnularGRE, puedeEditarGRE, puedeEliminarBorradorGRE } from './estadosGRE';

describe('puedeEditarGRE / puedeEliminarBorradorGRE — solo borradores', () => {
  it('un borrador puede editarse y eliminarse', () => {
    expect(puedeEditarGRE({ esBorrador: true })).toBe(true);
    expect(puedeEliminarBorradorGRE({ esBorrador: true })).toBe(true);
  });

  it('una guía ya emitida (no borrador) no puede editarse ni "eliminarse como borrador"', () => {
    expect(puedeEditarGRE({ esBorrador: false })).toBe(false);
    expect(puedeEliminarBorradorGRE({ esBorrador: false })).toBe(false);
  });
});

describe('puedeAnularGRE — solo guías emitidas y no anuladas previamente', () => {
  it('una guía emitida en estado "Pendiente" puede anularse', () => {
    expect(puedeAnularGRE({ esBorrador: false, estado: 'Pendiente' })).toBe(true);
  });

  it('un borrador nunca puede anularse (no ha sido emitido)', () => {
    expect(puedeAnularGRE({ esBorrador: true, estado: 'Borrador' })).toBe(false);
  });

  it('una guía ya anulada no puede volver a anularse', () => {
    expect(puedeAnularGRE({ esBorrador: false, estado: 'Anulada' })).toBe(false);
  });
});
