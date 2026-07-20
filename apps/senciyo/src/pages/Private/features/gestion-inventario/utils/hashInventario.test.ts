import { describe, it, expect } from 'vitest';
import { calcularHashInventario, adaptadorHashWebCrypto, type AdaptadorHashInventario } from './hashInventario';
import { serializarCanonicamente } from './serializacionCanonicaInventario';

describe('calcularHashInventario (SHA-256 vía Web Crypto)', () => {
  it('la misma entrada canónica produce el mismo hash', async () => {
    const entrada = serializarCanonicamente({ a: 1, b: 2 });
    const hash1 = await calcularHashInventario(entrada);
    const hash2 = await calcularHashInventario(entrada);
    expect(hash1).toBe(hash2);
  });

  it('entradas diferentes producen hashes diferentes', async () => {
    const hash1 = await calcularHashInventario(serializarCanonicamente({ a: 1 }));
    const hash2 = await calcularHashInventario(serializarCanonicamente({ a: 2 }));
    expect(hash1).not.toBe(hash2);
  });

  it('produce un hash hexadecimal estable (64 caracteres hex para SHA-256)', async () => {
    const hash = await calcularHashInventario('texto de prueba');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('coincide con el valor SHA-256 conocido de "hello"', async () => {
    const hash = await calcularHashInventario('hello');
    expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  it('objetos equivalentes con distinto orden de propiedades producen el mismo hash (vía serialización canónica)', async () => {
    const hashA = await calcularHashInventario(serializarCanonicamente({ b: 2, a: 1 }));
    const hashB = await calcularHashInventario(serializarCanonicamente({ a: 1, b: 2 }));
    expect(hashA).toBe(hashB);
  });

  it('acepta un adaptador inyectado explícitamente, sin cambiar el comportamiento productivo por defecto', async () => {
    const adaptadorDePrueba: AdaptadorHashInventario = {
      calcularHashHex: async (entrada) => `prueba:${entrada}`,
    };
    const resultado = await calcularHashInventario('x', adaptadorDePrueba);
    expect(resultado).toBe('prueba:x');
    // El adaptador por defecto sigue siendo el real, sin necesidad de pasarlo explícitamente.
    const resultadoReal = await calcularHashInventario('x');
    expect(resultadoReal).toMatch(/^[0-9a-f]{64}$/);
    expect(adaptadorHashWebCrypto.calcularHashHex).toBeInstanceOf(Function);
  });
});
