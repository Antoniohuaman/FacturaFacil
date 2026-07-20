import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { instalarLocalStorageDePrueba } from '../repositories/localStorageDePrueba';
import {
  detectarDriftEscritura,
  aplicarEscrituraPlanificada,
  verificarEscrituraAplicada,
} from './escrituraLocalStorageInventario';
import { InconsistenciaDiarioInventario } from './erroresInventario';

instalarLocalStorageDePrueba();

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

const contexto = { empresaId: 'emp-A', transaccionId: 'tx-1', operacionIdempotenteId: 'op-1' };

describe('escrituraLocalStorageInventario — detectarDriftEscritura', () => {
  it('no hay drift si la clave coincide con valorAnterior', () => {
    localStorage.setItem('clave-1', '10');
    expect(detectarDriftEscritura({ clave: 'clave-1', valorAnterior: '10', valorPropuesto: '20' })).toBe(false);
  });

  it('no hay drift si la clave ya coincide con valorPropuesto', () => {
    localStorage.setItem('clave-1', '20');
    expect(detectarDriftEscritura({ clave: 'clave-1', valorAnterior: '10', valorPropuesto: '20' })).toBe(false);
  });

  it('hay drift si la clave no coincide con ninguno de los dos', () => {
    localStorage.setItem('clave-1', '999');
    expect(detectarDriftEscritura({ clave: 'clave-1', valorAnterior: '10', valorPropuesto: '20' })).toBe(true);
  });

  it('valorAnterior null representa ausencia real de la clave', () => {
    expect(detectarDriftEscritura({ clave: 'clave-inexistente', valorAnterior: null, valorPropuesto: '20' })).toBe(false);
  });
});

describe('escrituraLocalStorageInventario — aplicarEscrituraPlanificada', () => {
  it('aplica la escritura cuando la clave coincide con valorAnterior', () => {
    localStorage.setItem('clave-1', '10');
    const resultado = aplicarEscrituraPlanificada(contexto, { clave: 'clave-1', valorAnterior: '10', valorPropuesto: '20' });
    expect(resultado).toBe('aplicada');
    expect(localStorage.getItem('clave-1')).toBe('20');
  });

  it('no reescribe si la clave ya tiene valorPropuesto (idempotente)', () => {
    localStorage.setItem('clave-1', '20');
    const resultado = aplicarEscrituraPlanificada(contexto, { clave: 'clave-1', valorAnterior: '10', valorPropuesto: '20' });
    expect(resultado).toBe('ya_aplicada');
    expect(localStorage.getItem('clave-1')).toBe('20');
  });

  it('valorPropuesto null elimina la clave (equivalente a removeItem)', () => {
    localStorage.setItem('clave-1', '10');
    const resultado = aplicarEscrituraPlanificada(contexto, { clave: 'clave-1', valorAnterior: '10', valorPropuesto: null });
    expect(resultado).toBe('aplicada');
    expect(localStorage.getItem('clave-1')).toBeNull();
  });

  it('valorAnterior null y clave inexistente: crea la clave con valorPropuesto', () => {
    const resultado = aplicarEscrituraPlanificada(contexto, { clave: 'clave-nueva', valorAnterior: null, valorPropuesto: '5' });
    expect(resultado).toBe('aplicada');
    expect(localStorage.getItem('clave-nueva')).toBe('5');
  });

  it('lanza InconsistenciaDiarioInventario con información estructurada si la clave no coincide con ninguno de los dos', () => {
    localStorage.setItem('clave-1', '999');
    expect(() =>
      aplicarEscrituraPlanificada(contexto, { clave: 'clave-1', valorAnterior: '10', valorPropuesto: '20' })
    ).toThrow(InconsistenciaDiarioInventario);
    try {
      aplicarEscrituraPlanificada(contexto, { clave: 'clave-1', valorAnterior: '10', valorPropuesto: '20' });
      throw new Error('no debería llegar aquí');
    } catch (error) {
      const inconsistencia = error as InconsistenciaDiarioInventario;
      expect(inconsistencia.empresaId).toBe('emp-A');
      expect(inconsistencia.transaccionId).toBe('tx-1');
      expect(inconsistencia.operacionIdempotenteId).toBe('op-1');
      expect(inconsistencia.clavesInconsistentes).toEqual(['clave-1']);
    }
    // Nunca sobrescribe el valor desconocido.
    expect(localStorage.getItem('clave-1')).toBe('999');
  });
});

describe('escrituraLocalStorageInventario — verificarEscrituraAplicada', () => {
  it('true cuando la clave refleja exactamente valorPropuesto', () => {
    localStorage.setItem('clave-1', '20');
    expect(verificarEscrituraAplicada({ clave: 'clave-1', valorAnterior: '10', valorPropuesto: '20' })).toBe(true);
  });

  it('false cuando la clave todavía no refleja valorPropuesto', () => {
    localStorage.setItem('clave-1', '10');
    expect(verificarEscrituraAplicada({ clave: 'clave-1', valorAnterior: '10', valorPropuesto: '20' })).toBe(false);
  });

  it('true cuando valorPropuesto es null y la clave efectivamente no existe', () => {
    expect(verificarEscrituraAplicada({ clave: 'clave-ausente', valorAnterior: '10', valorPropuesto: null })).toBe(true);
  });
});
