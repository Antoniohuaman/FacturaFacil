import { describe, it, expect, beforeEach } from 'vitest';
import { instalarLocalStorageDePrueba } from '../../gestion-inventario/repositories/localStorageDePrueba';
import { guiasRemisionDataSource } from './fuenteDatosGRE';
import { GUIA_REMISION_BORRADOR } from '../modelos/GuiaRemision';
import type { GuiaRemision } from '../modelos/GuiaRemision';

const EMPRESA_A = 'empresa-a';
const EMPRESA_B = 'empresa-b';

beforeEach(() => {
  instalarLocalStorageDePrueba();
});

function guia(overrides: Partial<GuiaRemision> = {}): GuiaRemision {
  return { ...GUIA_REMISION_BORRADOR('remitente'), ...overrides };
}

describe('fuenteDatosGRE — CRUD', () => {
  it('list() empieza vacío para una empresa sin guías', async () => {
    expect(await guiasRemisionDataSource.list(EMPRESA_A)).toEqual([]);
  });

  it('save() agrega una guía nueva y list() la refleja', async () => {
    const g = guia({ id: 'g1' });
    await guiasRemisionDataSource.save(EMPRESA_A, g);
    const lista = await guiasRemisionDataSource.list(EMPRESA_A);
    expect(lista.map((x) => x.id)).toEqual(['g1']);
  });

  it('save() con el mismo id actualiza (upsert), nunca duplica', async () => {
    await guiasRemisionDataSource.save(EMPRESA_A, guia({ id: 'g1', observaciones: 'v1' }));
    await guiasRemisionDataSource.save(EMPRESA_A, guia({ id: 'g1', observaciones: 'v2' }));
    const lista = await guiasRemisionDataSource.list(EMPRESA_A);
    expect(lista).toHaveLength(1);
    expect(lista[0].observaciones).toBe('v2');
  });

  it('getById() encuentra una guía existente y devuelve null si no existe', async () => {
    await guiasRemisionDataSource.save(EMPRESA_A, guia({ id: 'g1' }));
    expect((await guiasRemisionDataSource.getById(EMPRESA_A, 'g1'))?.id).toBe('g1');
    expect(await guiasRemisionDataSource.getById(EMPRESA_A, 'inexistente')).toBeNull();
  });

  it('delete() elimina la guía y deja de aparecer en list()/getById()', async () => {
    await guiasRemisionDataSource.save(EMPRESA_A, guia({ id: 'g1' }));
    await guiasRemisionDataSource.delete(EMPRESA_A, 'g1');
    expect(await guiasRemisionDataSource.list(EMPRESA_A)).toEqual([]);
    expect(await guiasRemisionDataSource.getById(EMPRESA_A, 'g1')).toBeNull();
  });
});

describe('fuenteDatosGRE — aislamiento multiempresa', () => {
  it('las guías de una empresa nunca aparecen en list() de otra empresa', async () => {
    await guiasRemisionDataSource.save(EMPRESA_A, guia({ id: 'g-a' }));
    await guiasRemisionDataSource.save(EMPRESA_B, guia({ id: 'g-b' }));

    expect((await guiasRemisionDataSource.list(EMPRESA_A)).map((g) => g.id)).toEqual(['g-a']);
    expect((await guiasRemisionDataSource.list(EMPRESA_B)).map((g) => g.id)).toEqual(['g-b']);
  });

  it('getById() no encuentra una guía de otra empresa aunque el id coincida', async () => {
    await guiasRemisionDataSource.save(EMPRESA_A, guia({ id: 'mismo-id' }));
    expect(await guiasRemisionDataSource.getById(EMPRESA_B, 'mismo-id')).toBeNull();
  });

  it('delete() en una empresa nunca afecta los datos de otra empresa', async () => {
    await guiasRemisionDataSource.save(EMPRESA_A, guia({ id: 'g-a' }));
    await guiasRemisionDataSource.save(EMPRESA_B, guia({ id: 'g-b' }));
    await guiasRemisionDataSource.delete(EMPRESA_A, 'g-a');
    expect(await guiasRemisionDataSource.list(EMPRESA_B)).toHaveLength(1);
  });
});
