import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { instalarLocalStorageDePrueba } from './localStorageDePrueba';
import { leerColeccionTenantizada, leerColeccionParaMutacion, guardarColeccionTenantizada, esObjetoPlano } from './coleccionLocalStorageInventario';
import { lsKey } from '../../../../../shared/tenant';

instalarLocalStorageDePrueba();

const CLAVE_BASE = 'facturafacil_entidad_de_prueba';
const NOMBRE_RECURSO = 'entidades de prueba';

interface EntidadDePrueba {
  id: string;
  empresaId: string;
  campoExtra: string;
}

function esEntidadDePruebaValida(valor: unknown): valor is EntidadDePrueba {
  return esObjetoPlano(valor) && typeof valor.campoExtra === 'string';
}

function leer(empresaId: string): EntidadDePrueba[] {
  return leerColeccionTenantizada(CLAVE_BASE, empresaId, NOMBRE_RECURSO, esEntidadDePruebaValida);
}

function guardar(empresaId: string, coleccion: readonly EntidadDePrueba[]): void {
  guardarColeccionTenantizada(CLAVE_BASE, empresaId, coleccion);
}

function crearEntidad(overrides: Partial<EntidadDePrueba> = {}): EntidadDePrueba {
  return { id: 'e-1', empresaId: 'emp-A', campoExtra: 'valor', ...overrides };
}

function omitirCampo<T extends object, K extends keyof T>(objeto: T, campo: K): Omit<T, K> {
  const copia: Partial<T> = { ...objeto };
  delete copia[campo];
  return copia as Omit<T, K>;
}

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe('coleccionLocalStorageInventario — leerColeccionTenantizada', () => {
  it('1. clave inexistente devuelve []', () => {
    expect(leer('emp-A')).toEqual([]);
  });

  it('2. JSON inválido lanza error, no devuelve [], y el valor crudo permanece exactamente igual', () => {
    const clave = lsKey(CLAVE_BASE, 'emp-A');
    const crudoOriginal = '{esto no es json valido';
    localStorage.setItem(clave, crudoOriginal);
    expect(() => leer('emp-A')).toThrow();
    expect(localStorage.getItem(clave)).toBe(crudoOriginal);
  });

  it('3. raíz que es un objeto (no arreglo) lanza error', () => {
    localStorage.setItem(lsKey(CLAVE_BASE, 'emp-A'), JSON.stringify({ no: 'es un arreglo' }));
    expect(() => leer('emp-A')).toThrow();
  });

  it('4. raíz null lanza error', () => {
    localStorage.setItem(lsKey(CLAVE_BASE, 'emp-A'), JSON.stringify(null));
    expect(() => leer('emp-A')).toThrow();
  });

  it('5. arreglo con un elemento null lanza error', () => {
    localStorage.setItem(lsKey(CLAVE_BASE, 'emp-A'), JSON.stringify([crearEntidad(), null]));
    expect(() => leer('emp-A')).toThrow();
  });

  it('6. arreglo con número, string o boolean lanza error', () => {
    localStorage.setItem(lsKey(CLAVE_BASE, 'emp-A'), JSON.stringify([42]));
    expect(() => leer('emp-A')).toThrow();
    localStorage.setItem(lsKey(CLAVE_BASE, 'emp-A'), JSON.stringify(['texto']));
    expect(() => leer('emp-A')).toThrow();
    localStorage.setItem(lsKey(CLAVE_BASE, 'emp-A'), JSON.stringify([true]));
    expect(() => leer('emp-A')).toThrow();
  });

  it('7. arreglo con objeto sin id lanza error', () => {
    const sinId = omitirCampo(crearEntidad(), 'id');
    localStorage.setItem(lsKey(CLAVE_BASE, 'emp-A'), JSON.stringify([sinId]));
    expect(() => leer('emp-A')).toThrow();
  });

  it('8. arreglo con objeto sin empresaId lanza error', () => {
    const sinEmpresaId = omitirCampo(crearEntidad(), 'empresaId');
    localStorage.setItem(lsKey(CLAVE_BASE, 'emp-A'), JSON.stringify([sinEmpresaId]));
    expect(() => leer('emp-A')).toThrow();
  });

  it('9. arreglo con una entidad estructuralmente incompleta (sin el campo específico del modelo) lanza error', () => {
    const incompleta = omitirCampo(crearEntidad(), 'campoExtra');
    localStorage.setItem(lsKey(CLAVE_BASE, 'emp-A'), JSON.stringify([incompleta]));
    expect(() => leer('emp-A')).toThrow();
  });

  it('10. arreglo con registros válidos de dos empresas: cada consulta devuelve solo la suya', () => {
    const clave = lsKey(CLAVE_BASE, 'emp-A');
    localStorage.setItem(clave, JSON.stringify([
      crearEntidad({ id: 'e-A', empresaId: 'emp-A' }),
      crearEntidad({ id: 'e-B', empresaId: 'emp-B' }),
    ]));
    expect(leer('emp-A').map((e) => e.id)).toEqual(['e-A']);
    // La misma colección física (bajo la clave de emp-A) consultada explícitamente para emp-B
    // también filtra correctamente — demuestra que el filtro depende del parámetro, no del namespace.
    localStorage.setItem(lsKey(CLAVE_BASE, 'emp-B'), JSON.stringify([
      crearEntidad({ id: 'e-A', empresaId: 'emp-A' }),
      crearEntidad({ id: 'e-B', empresaId: 'emp-B' }),
    ]));
    expect(leer('emp-B').map((e) => e.id)).toEqual(['e-B']);
  });

  it('no muta el arreglo parseado ni las entidades durante la lectura', () => {
    const clave = lsKey(CLAVE_BASE, 'emp-A');
    const original = [crearEntidad({ id: 'e-1' })];
    localStorage.setItem(clave, JSON.stringify(original));
    const resultado = leer('emp-A');
    resultado.push(crearEntidad({ id: 'e-2' }));
    resultado[0].campoExtra = 'mutado';
    // La siguiente lectura, desde localStorage, debe seguir reflejando el original — confirma
    // que `resultado` era una colección nueva, no una referencia a datos persistidos mutables.
    expect(leer('emp-A')).toEqual(original);
  });
});

describe('coleccionLocalStorageInventario — guardarColeccionTenantizada', () => {
  it('11. intentar guardar sobre una colección con JSON corrupto lanza error y no reemplaza el contenido crudo original', () => {
    const clave = lsKey(CLAVE_BASE, 'emp-A');
    const crudoOriginal = '{json corrupto';
    localStorage.setItem(clave, crudoOriginal);
    expect(() => {
      const actuales = leer('emp-A'); // lanza antes de llegar a guardar
      guardar('emp-A', [...actuales, crearEntidad()]);
    }).toThrow();
    expect(localStorage.getItem(clave)).toBe(crudoOriginal);
  });

  it('no muta la colección recibida al escribir', () => {
    const coleccion = [crearEntidad({ id: 'e-1' })];
    const snapshot = structuredClone(coleccion);
    guardar('emp-A', coleccion);
    expect(coleccion).toEqual(snapshot);
  });
});

describe('coleccionLocalStorageInventario — leerColeccionParaMutacion (protección de colecciones mezcladas)', () => {
  function leerParaMutar(empresaId: string): EntidadDePrueba[] {
    return leerColeccionParaMutacion(CLAVE_BASE, empresaId, NOMBRE_RECURSO, esEntidadDePruebaValida);
  }

  it('colección física con registros válidos de A y B: leerColeccionTenantizada (consulta) sigue aislando correctamente', () => {
    const clave = lsKey(CLAVE_BASE, 'emp-A');
    localStorage.setItem(clave, JSON.stringify([
      crearEntidad({ id: 'e-A', empresaId: 'emp-A' }),
      crearEntidad({ id: 'e-B', empresaId: 'emp-B' }),
    ]));
    expect(leer('emp-A').map((e) => e.id)).toEqual(['e-A']);
  });

  it('colección física con registros válidos de A y B: leerColeccionParaMutacion para A lanza error (no descarta a B en silencio)', () => {
    const clave = lsKey(CLAVE_BASE, 'emp-A');
    localStorage.setItem(clave, JSON.stringify([
      crearEntidad({ id: 'e-A', empresaId: 'emp-A' }),
      crearEntidad({ id: 'e-B', empresaId: 'emp-B' }),
    ]));
    expect(() => leerParaMutar('emp-A')).toThrow();
    // La lectura de mutación no escribe nada — el contenido crudo permanece intacto.
    expect(localStorage.getItem(clave)).toBe(JSON.stringify([
      crearEntidad({ id: 'e-A', empresaId: 'emp-A' }),
      crearEntidad({ id: 'e-B', empresaId: 'emp-B' }),
    ]));
  });

  it('colección física con registros de una sola empresa: leerColeccionParaMutacion funciona con normalidad', () => {
    const clave = lsKey(CLAVE_BASE, 'emp-A');
    localStorage.setItem(clave, JSON.stringify([crearEntidad({ id: 'e-A', empresaId: 'emp-A' })]));
    expect(() => leerParaMutar('emp-A')).not.toThrow();
    expect(leerParaMutar('emp-A').map((e) => e.id)).toEqual(['e-A']);
  });

  it('la ausencia de la clave sigue equivaliendo a colección vacía también para leerColeccionParaMutacion', () => {
    expect(leerParaMutar('emp-A')).toEqual([]);
  });

  it('una colección con JSON corrupto sigue lanzando error en leerColeccionParaMutacion, antes de evaluar mezcla alguna', () => {
    const clave = lsKey(CLAVE_BASE, 'emp-A');
    localStorage.setItem(clave, '{json corrupto');
    expect(() => leerParaMutar('emp-A')).toThrow();
  });
});
