import { describe, it, expect } from 'vitest';
import { serializarCanonicamente } from './serializacionCanonicaInventario';

describe('serializarCanonicamente', () => {
  it('objetos equivalentes con claves en distinto orden producen la misma serialización', () => {
    const a = serializarCanonicamente({ b: 2, a: 1, c: 3 });
    const b = serializarCanonicamente({ c: 3, a: 1, b: 2 });
    expect(a).toBe(b);
  });

  it('objetos anidados también producen la misma serialización sin importar el orden', () => {
    const a = serializarCanonicamente({ x: { b: 2, a: 1 }, y: 1 });
    const b = serializarCanonicamente({ y: 1, x: { a: 1, b: 2 } });
    expect(a).toBe(b);
  });

  it('el orden de los arreglos sí cambia la serialización (es información de negocio)', () => {
    const a = serializarCanonicamente({ items: [1, 2, 3] });
    const b = serializarCanonicamente({ items: [3, 2, 1] });
    expect(a).not.toBe(b);
  });

  it('diferencia valores realmente distintos', () => {
    expect(serializarCanonicamente({ a: 1 })).not.toBe(serializarCanonicamente({ a: 2 }));
    expect(serializarCanonicamente({ a: '1' })).not.toBe(serializarCanonicamente({ a: 1 }));
  });

  it('no muta la entrada', () => {
    const entrada = { b: 2, a: 1 };
    const snapshot = structuredClone(entrada);
    serializarCanonicamente(entrada);
    expect(entrada).toEqual(snapshot);
    expect(Object.keys(entrada)).toEqual(['b', 'a']);
  });

  it('rechaza referencias circulares', () => {
    const objeto: Record<string, unknown> = { a: 1 };
    objeto.self = objeto;
    expect(() => serializarCanonicamente(objeto)).toThrow();
  });

  it('rechaza un ciclo indirecto (a → b → a)', () => {
    const a: Record<string, unknown> = {};
    const b: Record<string, unknown> = { a };
    a.b = b;
    expect(() => serializarCanonicamente(a)).toThrow();
  });

  it('no confunde una referencia compartida en dos ramas distintas (no es un ciclo) con una circular', () => {
    const compartido = { valor: 1 };
    const objeto = { rama1: compartido, rama2: compartido };
    expect(() => serializarCanonicamente(objeto)).not.toThrow();
  });

  it('rechaza NaN', () => {
    expect(() => serializarCanonicamente({ a: NaN })).toThrow();
  });

  it('rechaza Infinity y -Infinity', () => {
    expect(() => serializarCanonicamente({ a: Infinity })).toThrow();
    expect(() => serializarCanonicamente({ a: -Infinity })).toThrow();
  });

  it('rechaza bigint', () => {
    expect(() => serializarCanonicamente({ a: BigInt(1) })).toThrow();
  });

  it('rechaza funciones', () => {
    expect(() => serializarCanonicamente({ a: () => 1 })).toThrow();
  });

  it('rechaza symbols', () => {
    expect(() => serializarCanonicamente({ a: Symbol('x') })).toThrow();
  });

  it('rechaza undefined ambiguo (como valor directo o como campo de un objeto)', () => {
    expect(() => serializarCanonicamente(undefined)).toThrow();
    expect(() => serializarCanonicamente({ a: undefined })).toThrow();
  });

  it('acepta null como valor legítimo, distinto de undefined', () => {
    expect(serializarCanonicamente({ a: null })).not.toBe(serializarCanonicamente({}));
    expect(() => serializarCanonicamente({ a: null })).not.toThrow();
  });

  it('es determinista: la misma entrada produce la misma salida en llamadas repetidas', () => {
    const entrada = { z: [1, { m: 2, n: 1 }], a: 'texto' };
    expect(serializarCanonicamente(entrada)).toBe(serializarCanonicamente(entrada));
  });
});

describe('serializarCanonicamente — allow-list estricta (Bloqueante 4): tipos rechazados, nunca colisionan como {}', () => {
  it('rechaza Date — dos fechas distintas nunca colisionan silenciosamente en "{}"', () => {
    expect(() => serializarCanonicamente({ fecha: new Date('2026-01-01') })).toThrow();
    expect(() => serializarCanonicamente({ fecha: new Date('2027-06-15') })).toThrow();
  });

  it('rechaza Map — nunca se convierte en un objeto plano equivalente a "{}"', () => {
    const mapa = new Map([['a', 1]]);
    expect(() => serializarCanonicamente({ valor: mapa })).toThrow();
  });

  it('rechaza Set', () => {
    expect(() => serializarCanonicamente({ valor: new Set([1, 2, 3]) })).toThrow();
  });

  it('rechaza RegExp', () => {
    expect(() => serializarCanonicamente({ valor: /abc/g })).toThrow();
  });

  it('rechaza Promise', () => {
    expect(() => serializarCanonicamente({ valor: Promise.resolve(1) })).toThrow();
  });

  it('rechaza Error', () => {
    expect(() => serializarCanonicamente({ valor: new Error('falla') })).toThrow();
  });

  it('rechaza ArrayBuffer', () => {
    expect(() => serializarCanonicamente({ valor: new ArrayBuffer(4) })).toThrow();
  });

  it('rechaza una vista tipada (TypedArray)', () => {
    expect(() => serializarCanonicamente({ valor: new Uint8Array([1, 2, 3]) })).toThrow();
  });

  it('rechaza una instancia de clase', () => {
    class Producto {
      constructor(public nombre: string) {}
    }
    expect(() => serializarCanonicamente({ valor: new Producto('x') })).toThrow();
  });

  it('rechaza un objeto con prototipo personalizado', () => {
    const prototipoPersonalizado = { saludo: 'hola' };
    const objeto = Object.create(prototipoPersonalizado) as Record<string, unknown>;
    objeto.a = 1;
    expect(() => serializarCanonicamente(objeto)).toThrow();
  });

  it('rechaza un objeto con prototipo null', () => {
    const objeto = Object.create(null) as Record<string, unknown>;
    objeto.a = 1;
    expect(() => serializarCanonicamente(objeto)).toThrow();
  });

  it('rechaza una clave Symbol en el objeto (no solo un valor Symbol)', () => {
    const clave = Symbol('clave');
    const objeto: Record<string | symbol, unknown> = { a: 1, [clave]: 'oculto' };
    expect(() => serializarCanonicamente(objeto)).toThrow();
  });

  it('rechaza una propiedad getter — nunca se ejecuta el getter', () => {
    let ejecutado = false;
    const objeto = {
      get valor() {
        ejecutado = true;
        return 1;
      },
    };
    expect(() => serializarCanonicamente(objeto)).toThrow();
    expect(ejecutado).toBe(false);
  });

  it('rechaza una propiedad setter', () => {
    const objeto = Object.defineProperty({}, 'valor', {
      set() {},
      enumerable: true,
      configurable: true,
    });
    expect(() => serializarCanonicamente(objeto)).toThrow();
  });

  it('rechaza un arreglo disperso (con huecos)', () => {
    const arreglo = [1, , 3]; // eslint-disable-line no-sparse-arrays
    expect(() => serializarCanonicamente({ valor: arreglo })).toThrow();
  });

  it('rechaza un arreglo con una propiedad adicional no indexada', () => {
    const arreglo: number[] & { extra?: string } = [1, 2, 3];
    arreglo.extra = 'no debería estar aquí';
    expect(() => serializarCanonicamente({ valor: arreglo })).toThrow();
  });

  it('un arreglo vacío y un arreglo disperso/inválido nunca se confunden', () => {
    expect(() => serializarCanonicamente({ valor: [] })).not.toThrow();
    const disperso = [1, , 3]; // eslint-disable-line no-sparse-arrays
    expect(() => serializarCanonicamente({ valor: disperso })).toThrow();
  });
});
