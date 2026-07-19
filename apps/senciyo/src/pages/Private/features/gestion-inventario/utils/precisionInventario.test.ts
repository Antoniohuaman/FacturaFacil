import { describe, it, expect } from 'vitest';
import {
  redondearAPrecision,
  PRECISION_CANTIDAD_UNIDAD_MINIMA,
  PRECISION_FACTOR_CONVERSION,
  PRECISION_COSTO_UNITARIO_INTERNO,
  PRECISION_TIPO_CAMBIO_ALMACENADO,
} from './precisionInventario';

describe('redondearAPrecision', () => {
  it('10 / 3 redondeado a precisión de cantidad (6 decimales) produce el valor esperado', () => {
    expect(redondearAPrecision(10 / 3, PRECISION_CANTIDAD_UNIDAD_MINIMA)).toBe(3.333333);
  });

  it('10 / 3 redondeado a precisión de factor/costo (8 decimales) produce el valor esperado', () => {
    expect(redondearAPrecision(10 / 3, PRECISION_FACTOR_CONVERSION)).toBe(3.33333333);
    expect(redondearAPrecision(10 / 3, PRECISION_COSTO_UNITARIO_INTERNO)).toBe(3.33333333);
  });

  it('redondeo monetario usando decimalPlaces=2', () => {
    expect(redondearAPrecision(10 / 3, 2)).toBe(3.33);
  });

  it('redondeo monetario usando decimalPlaces distinto de 2 (ej. 0 o 3)', () => {
    expect(redondearAPrecision(10 / 3, 0)).toBe(3);
    expect(redondearAPrecision(10 / 3, 3)).toBe(3.333);
  });

  it('cero se redondea a cero, sin signo ni residuo espurio', () => {
    expect(redondearAPrecision(0, 2)).toBe(0);
  });

  it('valores negativos se redondean correctamente', () => {
    expect(redondearAPrecision(-10 / 3, 2)).toBe(-3.33);
    expect(redondearAPrecision(-1.005, 2)).toBe(-1);
  });

  it('un valor ya exacto se conserva sin alterarse', () => {
    expect(redondearAPrecision(3.33, 2)).toBe(3.33);
    expect(redondearAPrecision(100, 8)).toBe(100);
  });

  it('decimales negativos producen un error explícito', () => {
    expect(() => redondearAPrecision(10, -1)).toThrow();
  });

  it('decimales no enteros producen un error explícito', () => {
    expect(() => redondearAPrecision(10, 2.5)).toThrow();
  });

  it('valores no finitos (NaN, Infinity) producen un error explícito — nunca un resultado inventado', () => {
    expect(() => redondearAPrecision(NaN, 2)).toThrow();
    expect(() => redondearAPrecision(Infinity, 2)).toThrow();
    expect(() => redondearAPrecision(-Infinity, 2)).toThrow();
  });

  it('la función nunca retorna un string (no usa toFixed como valor final)', () => {
    const resultado = redondearAPrecision(10 / 3, 2);
    expect(typeof resultado).toBe('number');
  });

  it('no muta el valor de entrada (los number de JS son inmutables por valor, verificado con una variable de control)', () => {
    const valorOriginal = 10 / 3;
    const copia = valorOriginal;
    redondearAPrecision(valorOriginal, 2);
    expect(valorOriginal).toBe(copia);
  });

  it('es determinista: la misma entrada produce el mismo resultado', () => {
    expect(redondearAPrecision(10 / 3, 8)).toBe(redondearAPrecision(10 / 3, 8));
  });
});

describe('redondearAPrecision — nunca devuelve un resultado no finito (corrección de desbordamiento)', () => {
  it('un número de decimales extremo (309) desborda el factor de escala y lanza error explícito', () => {
    expect(() => redondearAPrecision(1, 309)).toThrow();
  });

  it('un número de decimales alto pero cuyo factor sigue siendo finito funciona con normalidad', () => {
    const resultado = redondearAPrecision(1 / 3, 15);
    expect(Number.isFinite(resultado)).toBe(true);
    expect(typeof resultado).toBe('number');
  });

  it('un valor cercano a Number.MAX_VALUE cuyo producto por el factor desborda lanza error explícito', () => {
    expect(() => redondearAPrecision(Number.MAX_VALUE, 10)).toThrow();
  });

  it('10 / 3 a 6 decimales sigue dando el resultado esperado después de la corrección', () => {
    expect(redondearAPrecision(10 / 3, PRECISION_CANTIDAD_UNIDAD_MINIMA)).toBe(3.333333);
  });

  it('10 / 3 a 8 decimales sigue dando el resultado esperado después de la corrección', () => {
    expect(redondearAPrecision(10 / 3, PRECISION_FACTOR_CONVERSION)).toBe(3.33333333);
  });

  it('todo resultado exitoso es un number finito', () => {
    const resultado = redondearAPrecision(10 / 3, 2);
    expect(typeof resultado).toBe('number');
    expect(Number.isFinite(resultado)).toBe(true);
  });

  it('NaN, Infinity y -Infinity siguen lanzando error explícito (sin cambio de comportamiento)', () => {
    expect(() => redondearAPrecision(NaN, 2)).toThrow();
    expect(() => redondearAPrecision(Infinity, 2)).toThrow();
    expect(() => redondearAPrecision(-Infinity, 2)).toThrow();
  });

  it('decimales negativos y no enteros siguen lanzando error explícito (sin cambio de comportamiento)', () => {
    expect(() => redondearAPrecision(10, -1)).toThrow();
    expect(() => redondearAPrecision(10, 2.5)).toThrow();
  });

  it('el mensaje de error identifica el problema (factor, cálculo intermedio o resultado) sin exponer una excepción genérica vacía', () => {
    expect(() => redondearAPrecision(1, 309)).toThrow(/factor de escala/);
  });
});

describe('constantes de precisión — política técnica centralizada, sin moneda ni tasa hardcodeada', () => {
  it('las constantes tienen los valores exactos aprobados en §17.3', () => {
    expect(PRECISION_CANTIDAD_UNIDAD_MINIMA).toBe(6);
    expect(PRECISION_FACTOR_CONVERSION).toBe(8);
    expect(PRECISION_COSTO_UNITARIO_INTERNO).toBe(8);
  });

  it('la precisión del tipo de cambio almacenado es la misma que la del costo unitario interno (nunca los decimalPlaces de presentación de una moneda)', () => {
    expect(PRECISION_TIPO_CAMBIO_ALMACENADO).toBe(PRECISION_COSTO_UNITARIO_INTERNO);
  });
});
