import { describe, it, expect } from 'vitest';
import { siguienteCorrelativoInterno } from './correlativoInterno';

interface RegistroPrueba {
  numero: string;
}

function registro(numero: string): RegistroPrueba {
  return { numero };
}

describe('siguienteCorrelativoInterno (§5 de la corrección: utilidad genérica de correlativos)', () => {
  it('1. Primer registro: sin registros previos, comienza en 1', () => {
    expect(siguienteCorrelativoInterno({ registros: [], obtenerNumero: (r: RegistroPrueba) => r.numero, prefijo: 'GTO' })).toBe('GTO-00000001');
  });

  it('2. Registros consecutivos: incrementa uno a uno', () => {
    const registros = [registro('GTO-00000001'), registro('GTO-00000002')];
    expect(siguienteCorrelativoInterno({ registros, obtenerNumero: (r) => r.numero, prefijo: 'GTO' })).toBe('GTO-00000003');
  });

  it('3. Registros desordenados: toma el máximo real, no el último del arreglo', () => {
    const registros = [registro('GTO-00000005'), registro('GTO-00000001'), registro('GTO-00000003')];
    expect(siguienteCorrelativoInterno({ registros, obtenerNumero: (r) => r.numero, prefijo: 'GTO' })).toBe('GTO-00000006');
  });

  it('4. Huecos de numeración: el siguiente es max+1, nunca rellena el hueco', () => {
    const registros = [registro('GTO-00000001'), registro('GTO-00000010')];
    expect(siguienteCorrelativoInterno({ registros, obtenerNumero: (r) => r.numero, prefijo: 'GTO' })).toBe('GTO-00000011');
  });

  it('5. Formato inválido o de otro prefijo: se ignora, nunca rompe el cálculo', () => {
    const registros = [registro('GTO-00000001'), registro('formato-invalido'), registro('PG01-00000099')];
    expect(siguienteCorrelativoInterno({ registros, obtenerNumero: (r) => r.numero, prefijo: 'GTO' })).toBe('GTO-00000002');
  });

  it('6. Prefijos distintos son secuencias completamente independientes (PG vs GTO)', () => {
    const registros = [registro('PG01-00000050'), registro('GTO-00000002')];
    expect(siguienteCorrelativoInterno({ registros, obtenerNumero: (r) => r.numero, prefijo: 'GTO' })).toBe('GTO-00000003');
    expect(siguienteCorrelativoInterno({ registros, obtenerNumero: (r) => r.numero, prefijo: 'PG01' })).toBe('PG01-00000051');
  });

  it('7. Registros históricos con longitud de relleno distinta: el prefijo y el separador siguen siendo la única condición de pertenencia', () => {
    const registros = [registro('GTO-1'), registro('GTO-00000002')];
    // "GTO-1" también pertenece al prefijo (empieza con "GTO-"); su número (1) participa del máximo.
    expect(siguienteCorrelativoInterno({ registros, obtenerNumero: (r) => r.numero, prefijo: 'GTO' })).toBe('GTO-00000003');
  });

  it('8. Aislamiento por empresa: solo considera los registros del arreglo recibido — dos empresas nunca comparten secuencia', () => {
    const registrosEmpresaA = [registro('GTO-00000001'), registro('GTO-00000002')];
    const registrosEmpresaB: RegistroPrueba[] = [];
    expect(siguienteCorrelativoInterno({ registros: registrosEmpresaA, obtenerNumero: (r) => r.numero, prefijo: 'GTO' })).toBe('GTO-00000003');
    // La empresa B nunca ve los registros de la empresa A (cada una llega ya
    // tenantizada desde su propio repositorio) — su secuencia arranca en 1.
    expect(siguienteCorrelativoInterno({ registros: registrosEmpresaB, obtenerNumero: (r) => r.numero, prefijo: 'GTO' })).toBe('GTO-00000001');
  });

  it('longitud personalizada respeta el relleno solicitado', () => {
    expect(siguienteCorrelativoInterno({ registros: [], obtenerNumero: (r: RegistroPrueba) => r.numero, prefijo: 'X', longitud: 4 })).toBe('X-0001');
  });
});
