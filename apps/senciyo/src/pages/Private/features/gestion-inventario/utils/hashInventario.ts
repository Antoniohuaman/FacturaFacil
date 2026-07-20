// gestion-inventario/utils/hashInventario.ts
//
// Hash determinista (SHA-256) de una entrada ya serializada canónicamente
// (serializacionCanonicaInventario.ts). Usa exclusivamente Web Crypto (`crypto.subtle`, disponible
// tanto en el navegador real como en el runtime de Node usado por Vitest) — nunca `node:crypto`
// (no es código de servidor, y este módulo debe poder ejecutarse en el navegador). Sin librería
// externa nueva.

/** Adaptador mínimo e inyectable — permite a las pruebas verificar el comportamiento sin depender de que el entorno exponga Web Crypto, sin cambiar el comportamiento productivo real. */
export interface AdaptadorHashInventario {
  calcularHashHex(entradaCanonica: string): Promise<string>;
}

function bufferAHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/** Adaptador productivo real: SHA-256 vía `globalThis.crypto.subtle.digest`. */
export const adaptadorHashWebCrypto: AdaptadorHashInventario = {
  async calcularHashHex(entradaCanonica: string): Promise<string> {
    const datos = new TextEncoder().encode(entradaCanonica);
    const buffer = await globalThis.crypto.subtle.digest('SHA-256', datos);
    return bufferAHex(buffer);
  },
};

/**
 * Calcula el hash hexadecimal estable de una entrada canónica. La misma entrada produce siempre
 * el mismo hash; entradas distintas producen hashes distintos (con probabilidad de colisión
 * criptográficamente despreciable, propia de SHA-256).
 */
export function calcularHashInventario(
  entradaCanonica: string,
  adaptador: AdaptadorHashInventario = adaptadorHashWebCrypto
): Promise<string> {
  return adaptador.calcularHashHex(entradaCanonica);
}
