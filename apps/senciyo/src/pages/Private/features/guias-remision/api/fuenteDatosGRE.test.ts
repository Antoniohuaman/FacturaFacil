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

describe('fuenteDatosGRE — motivo 13 (Otros): persistencia de los tres actores coexistentes', () => {
  it('guardar y rehidratar (getById) conserva Destinatario + Proveedor + Comprador de forma independiente', async () => {
    const g = guia({
      id: 'g-otros',
      motivoTraslado: '13',
      especificacionMotivo: 'Traslado por préstamo',
      destinatarioEsMismoRemitente: true,
      destinatarioNombre: 'Empresa Emisora S.A.C.',
      destinatarioNumeroDocumento: '20111111111',
      proveedorNombre: 'Proveedor Otros S.A.C.',
      proveedorNumeroDocumento: '20666666666',
      compradorNombre: 'Comprador Otros S.A.C.',
      compradorNumeroDocumento: '20777777777',
    });
    await guiasRemisionDataSource.save(EMPRESA_A, g);
    const rehidratada = await guiasRemisionDataSource.getById(EMPRESA_A, 'g-otros');

    expect(rehidratada?.destinatarioEsMismoRemitente).toBe(true);
    expect(rehidratada?.destinatarioNombre).toBe('Empresa Emisora S.A.C.');
    expect(rehidratada?.proveedorNombre).toBe('Proveedor Otros S.A.C.');
    expect(rehidratada?.compradorNombre).toBe('Comprador Otros S.A.C.');
  });

  it('el snapshot no cambia si los datos "maestros" de los terceros cambiaran después — la GRE guardada es la única fuente', async () => {
    const g = guia({
      id: 'g-otros-2',
      motivoTraslado: '13',
      proveedorNombre: 'Proveedor Original S.A.C.',
      compradorNombre: 'Comprador Original S.A.C.',
    });
    await guiasRemisionDataSource.save(EMPRESA_A, g);
    // Simula que en otro documento/catálogo el mismo tercero cambió de nombre — no debe afectar
    // esta guía ya persistida, que solo lee su propio snapshot.
    const rehidratada = await guiasRemisionDataSource.getById(EMPRESA_A, 'g-otros-2');
    expect(rehidratada?.proveedorNombre).toBe('Proveedor Original S.A.C.');
    expect(rehidratada?.compradorNombre).toBe('Comprador Original S.A.C.');
  });
});

describe('fuenteDatosGRE — migración legacy de Proveedor (motivos 02/07) al cargar', () => {
  it('una GRE de Compra guardada con el Proveedor en los campos comprador* legacy se normaliza al leer con getById()', async () => {
    // Simula un documento guardado ANTES de existir los campos `proveedor*` independientes.
    const legacy = guia({
      id: 'g-legacy-02',
      motivoTraslado: '02',
      destinatarioNombre: 'Empresa Emisora S.A.C.',
      compradorNombre: 'Proveedor Legacy S.A.C.',
      compradorTipoDocumento: 'RUC',
      compradorNumeroDocumento: '20333333333',
    });
    await guiasRemisionDataSource.save(EMPRESA_A, legacy);

    const leida = await guiasRemisionDataSource.getById(EMPRESA_A, 'g-legacy-02');
    expect(leida?.proveedorNombre).toBe('Proveedor Legacy S.A.C.');
    expect(leida?.proveedorNumeroDocumento).toBe('20333333333');
    expect(leida?.compradorNombre).toBeUndefined();
  });

  it('la misma migración aplica en list()', async () => {
    const legacy = guia({ id: 'g-legacy-07', motivoTraslado: '07', compradorNombre: 'Transformador Legacy S.A.C.' });
    await guiasRemisionDataSource.save(EMPRESA_A, legacy);

    const [leida] = await guiasRemisionDataSource.list(EMPRESA_A);
    expect(leida.proveedorNombre).toBe('Transformador Legacy S.A.C.');
    expect(leida.compradorNombre).toBeUndefined();
  });
});

describe('fuenteDatosGRE — GRE Transportista: persistencia de Remitente + Destinatario + Subcontratador + Pagador del flete', () => {
  it('guardar y rehidratar (getById) conserva los cuatro actores/datos de forma independiente (motivo 20)', async () => {
    const g = guia({
      id: 'g-transportista-20',
      tipo: 'transportista',
      motivoTraslado: '20',
      destinatarioEsMismoRemitente: true,
      destinatarioNombre: 'Remitente Transportista S.A.C.',
      destinatarioNumeroDocumento: '20999999999',
      remitenteNombre: 'Remitente Transportista S.A.C.',
      remitenteNumeroDocumento: '20999999999',
      subcontratadorNombre: 'Subcontratador S.A.C.',
      subcontratadorNumeroDocumento: '20777777777',
      pagadorFlete: 'Subcontratador',
      indicadorTrasladoTotalBienes: true,
    });
    await guiasRemisionDataSource.save(EMPRESA_A, g);
    const rehidratada = await guiasRemisionDataSource.getById(EMPRESA_A, 'g-transportista-20');

    expect(rehidratada?.destinatarioEsMismoRemitente).toBe(true);
    expect(rehidratada?.remitenteNombre).toBe('Remitente Transportista S.A.C.');
    expect(rehidratada?.subcontratadorNombre).toBe('Subcontratador S.A.C.');
    expect(rehidratada?.pagadorFlete).toBe('Subcontratador');
    expect(rehidratada?.indicadorTrasladoTotalBienes).toBe(true);
  });

  it('Pagador "Otro" persiste su propio snapshot de tercero, independiente de Remitente/Subcontratador', async () => {
    const g = guia({
      id: 'g-transportista-pagador-otro',
      tipo: 'transportista',
      motivoTraslado: '13',
      remitenteNombre: 'Remitente S.A.C.',
      pagadorFlete: 'Otro',
      pagadorTerceroNombre: 'Tercero Pagador S.A.C.',
      pagadorTerceroNumeroDocumento: '20555555555',
    });
    await guiasRemisionDataSource.save(EMPRESA_A, g);
    const rehidratada = await guiasRemisionDataSource.getById(EMPRESA_A, 'g-transportista-pagador-otro');

    expect(rehidratada?.pagadorFlete).toBe('Otro');
    expect(rehidratada?.pagadorTerceroNombre).toBe('Tercero Pagador S.A.C.');
    expect(rehidratada?.remitenteNombre).toBe('Remitente S.A.C.');
  });
});

describe('fuenteDatosGRE — GRE Transportista legacy: borradores anteriores a la corrección de motivo/subcontratado', () => {
  it('un borrador Transportista con motivo "20" legacy (sin transporteSubcontratado) carga sin romperse y NO infiere el indicador desde el motivo', async () => {
    const legacy = guia({
      id: 'g-legacy-transportista-20',
      tipo: 'transportista',
      motivoTraslado: '20',
      especificacionMotivo: 'Traslado por subcontrata',
      remitenteNombre: 'Remitente Legacy S.A.C.',
      subcontratadorNombre: 'Subcontratador Legacy S.A.C.',
      pagadorFlete: 'Subcontratador',
    });
    await guiasRemisionDataSource.save(EMPRESA_A, legacy);

    const leida = await guiasRemisionDataSource.getById(EMPRESA_A, 'g-legacy-transportista-20');
    expect(leida).not.toBeNull();
    // El dato legacy se conserva intacto (no se destruye)...
    expect(leida?.subcontratadorNombre).toBe('Subcontratador Legacy S.A.C.');
    // ...pero el indicador real NUNCA se infiere automáticamente desde el motivo heredado.
    expect(leida?.transporteSubcontratado).toBeUndefined();
  });

  it('un borrador Transportista con motivo "21" legacy (transbordo por motivo, ya no por indicador) carga sin romperse', async () => {
    const legacy = guia({
      id: 'g-legacy-transportista-21',
      tipo: 'transportista',
      motivoTraslado: '21',
      remitenteNombre: 'Remitente Legacy S.A.C.',
      transportePrivado: { fechaInicioTraslado: '2026-08-08', vehiculosIds: [], conductoresIds: [] },
    });
    await guiasRemisionDataSource.save(EMPRESA_A, legacy);

    const leida = await guiasRemisionDataSource.getById(EMPRESA_A, 'g-legacy-transportista-21');
    expect(leida).not.toBeNull();
    expect(leida?.transportePrivado?.transbordo).toBeUndefined();
  });

  it('un borrador Transportista legacy con indicadorTrasladoTotalBienes=true y SIN documentos relacionados carga sin romperse — el estado inválido se resuelve en validación al emitir, nunca inventando un documento', async () => {
    const legacy = guia({
      id: 'g-legacy-traslado-total-sin-documento',
      tipo: 'transportista',
      remitenteNombre: 'Remitente Legacy S.A.C.',
      indicadorTrasladoTotalBienes: true,
      documentosRelacionados: [],
    });
    await guiasRemisionDataSource.save(EMPRESA_A, legacy);

    const leida = await guiasRemisionDataSource.getById(EMPRESA_A, 'g-legacy-traslado-total-sin-documento');
    expect(leida).not.toBeNull();
    expect(leida?.indicadorTrasladoTotalBienes).toBe(true);
    expect(leida?.documentosRelacionados).toEqual([]);
  });
});
