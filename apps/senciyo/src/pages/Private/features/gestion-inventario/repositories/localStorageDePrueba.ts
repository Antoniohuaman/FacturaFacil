// gestion-inventario/repositories/localStorageDePrueba.ts
//
// Polyfill mínimo de `localStorage` exclusivo para pruebas de los repositorios de Etapa 1A. El
// entorno `'node'` de Vitest (apps/senciyo/vitest.config.ts) no implementa un `localStorage`
// funcional (`localStorage.setItem` no es una función ahí) — en vez de instalar una dependencia
// nueva (jsdom/happy-dom, ninguna presente hoy en el proyecto), un `Map` en memoria es suficiente
// para probar CRUD y aislamiento multiempresa sin tocar `package.json`.
//
// Sin consumidor productivo: solo se importa desde archivos `*.test.ts` de este mismo directorio.

class AlmacenamientoLocalDePrueba {
  private datos = new Map<string, string>();

  get length(): number {
    return this.datos.size;
  }

  getItem(clave: string): string | null {
    return this.datos.has(clave) ? this.datos.get(clave)! : null;
  }

  setItem(clave: string, valor: string): void {
    this.datos.set(clave, valor);
  }

  removeItem(clave: string): void {
    this.datos.delete(clave);
  }

  clear(): void {
    this.datos.clear();
  }
}

/** Instala (o reinstala) el polyfill como `globalThis.localStorage`. Llamar una vez por archivo de prueba, antes de cualquier `describe`. */
export function instalarLocalStorageDePrueba(): void {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new AlmacenamientoLocalDePrueba(),
    writable: true,
    configurable: true,
  });
}
