import { describe, it, expect } from 'vitest';
import {
  contarUsoCategoriaGasto,
  crearCategoriaGasto,
  editarCategoriaGasto,
  cambiarEstadoCategoriaGasto,
} from './servicioCategoriaGasto';
import type { CategoriaGasto } from '../modelos/CategoriaGasto';
import type { Gasto } from '../modelos/Gasto';

function crearCategoriaFixture(overrides: Partial<CategoriaGasto> = {}): CategoriaGasto {
  return {
    id: 'cat-1',
    empresaId: 'empresa-1',
    nombre: 'Alquileres',
    estado: 'activa',
    orden: 0,
    fechaCreacion: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

function crearGastoFixture(overrides: Partial<Gasto> = {}): Gasto {
  return {
    id: 'gasto-1',
    referenciaInterna: 'GTO-00000001',
    empresaId: 'empresa-1',
    fechaReconocimiento: '2026-07-01',
    categoriaId: 'cat-1',
    concepto: 'Alquiler de julio',
    beneficiario: 'Inmobiliaria XYZ',
    moneda: 'PEN',
    subtotal: 100,
    impuesto: 18,
    total: 118,
    tratamientoImpuesto: 'no_recuperable',
    condicionPago: 'contado',
    pagosRelacionados: [],
    adjuntos: [],
    estadoDocumento: 'registrado',
    historial: [],
    fechaCreacion: '2026-07-01T00:00:00.000Z',
    fechaActualizacion: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('contarUsoCategoriaGasto (§20 de la corrección: borradores no descartados + registrados + anulados)', () => {
  it('cuenta los gastos registrados que usan la categoría', () => {
    const gastos = [crearGastoFixture({ id: 'g1', categoriaId: 'cat-1' }), crearGastoFixture({ id: 'g2', categoriaId: 'cat-1' })];
    expect(contarUsoCategoriaGasto(gastos, 'cat-1')).toBe(2);
  });

  it('INCLUYE gastos anulados genuinos en el conteo — un gasto anulado conserva su referencia histórica y sigue bloqueando la eliminación física de su categoría', () => {
    const gastos = [crearGastoFixture({ id: 'g1', categoriaId: 'cat-1', estadoDocumento: 'anulado', motivoAnulacion: 'Gasto duplicado' })];
    expect(contarUsoCategoriaGasto(gastos, 'cat-1')).toBe(1);
  });

  it('EXCLUYE un borrador descartado (motivoAnulacion técnico "Borrador descartado") — nunca fue registrado oficialmente, no cuenta como uso histórico', () => {
    const gastos = [crearGastoFixture({ id: 'g1', categoriaId: 'cat-1', estadoDocumento: 'anulado', motivoAnulacion: 'Borrador descartado' })];
    expect(contarUsoCategoriaGasto(gastos, 'cat-1')).toBe(0);
  });

  it('INCLUYE un borrador activo (no descartado) — mientras exista, referencia la categoría', () => {
    const gastos = [crearGastoFixture({ id: 'g1', categoriaId: 'cat-1', estadoDocumento: 'borrador' })];
    expect(contarUsoCategoriaGasto(gastos, 'cat-1')).toBe(1);
  });

  it('un gasto histórico conserva su categoría aunque otra categoría cambie de estado (el conteo es por categoriaId, no por estado de la categoría)', () => {
    const gastos = [crearGastoFixture({ id: 'g1', categoriaId: 'cat-1' })];
    expect(contarUsoCategoriaGasto(gastos, 'cat-1')).toBe(1);
    expect(contarUsoCategoriaGasto(gastos, 'cat-otra')).toBe(0);
  });

  it('varias categorías con uso real mixto (borrador, registrado, anulado genuino, borrador descartado) — cada una refleja su conteo exacto', () => {
    const gastos = [
      crearGastoFixture({ id: 'g1', categoriaId: 'cat-alquileres' }),
      crearGastoFixture({ id: 'g2', categoriaId: 'cat-alquileres' }),
      crearGastoFixture({ id: 'g3', categoriaId: 'cat-movilidad' }),
      crearGastoFixture({ id: 'g4', categoriaId: 'cat-movilidad', estadoDocumento: 'anulado', motivoAnulacion: 'Error en importes' }),
      crearGastoFixture({ id: 'g5', categoriaId: 'cat-publicidad-inactiva' }),
      crearGastoFixture({ id: 'g6', categoriaId: 'cat-viaticos', estadoDocumento: 'borrador' }),
      crearGastoFixture({ id: 'g7', categoriaId: 'cat-viaticos', estadoDocumento: 'anulado', motivoAnulacion: 'Borrador descartado' }),
    ];
    expect(contarUsoCategoriaGasto(gastos, 'cat-alquileres')).toBe(2);
    expect(contarUsoCategoriaGasto(gastos, 'cat-movilidad')).toBe(2);
    expect(contarUsoCategoriaGasto(gastos, 'cat-publicidad-inactiva')).toBe(1);
    expect(contarUsoCategoriaGasto(gastos, 'cat-viaticos')).toBe(1);
    expect(contarUsoCategoriaGasto(gastos, 'cat-sin-uso')).toBe(0);
  });
});

describe('crearCategoriaGasto', () => {
  it('agrega una nueva categoría activa al final del arreglo, aislada por empresa', () => {
    const categorias = [crearCategoriaFixture()];
    const siguiente = crearCategoriaGasto(categorias, { nombre: 'Publicidad' }, 'empresa-1', 'cat-2', '2026-07-02T00:00:00.000Z');
    expect(siguiente).toHaveLength(2);
    expect(siguiente[1]).toMatchObject({ id: 'cat-2', empresaId: 'empresa-1', nombre: 'Publicidad', estado: 'activa', orden: 1 });
  });

  it('recorta espacios del nombre y descarta descripción vacía', () => {
    const siguiente = crearCategoriaGasto([], { nombre: '  Movilidad  ', descripcion: '   ' }, 'empresa-1', 'cat-1', '2026-07-01T00:00:00.000Z');
    expect(siguiente[0].nombre).toBe('Movilidad');
    expect(siguiente[0].descripcion).toBeUndefined();
  });

  it('no muta el arreglo original (nunca reemplaza el catálogo por una lista cerrada)', () => {
    const categorias = [crearCategoriaFixture()];
    crearCategoriaGasto(categorias, { nombre: 'Publicidad' }, 'empresa-1', 'cat-2', '2026-07-02T00:00:00.000Z');
    expect(categorias).toHaveLength(1);
  });
});

describe('editarCategoriaGasto', () => {
  it('actualiza nombre y descripción de la categoría indicada, sin tocar las demás', () => {
    const categorias = [crearCategoriaFixture({ id: 'cat-1' }), crearCategoriaFixture({ id: 'cat-2', nombre: 'Publicidad' })];
    const siguiente = editarCategoriaGasto(categorias, 'cat-1', { nombre: 'Alquileres y rentas', descripcion: 'Incluye locales' });
    expect(siguiente.find((c) => c.id === 'cat-1')).toMatchObject({ nombre: 'Alquileres y rentas', descripcion: 'Incluye locales' });
    expect(siguiente.find((c) => c.id === 'cat-2')?.nombre).toBe('Publicidad');
  });
});

describe('cambiarEstadoCategoriaGasto — desactivar/reactivar (§8/§9: nunca eliminación física)', () => {
  it('desactivar dos veces deja la categoría inactiva de forma idempotente', () => {
    const categorias = [crearCategoriaFixture({ estado: 'activa' })];
    const unaVez = cambiarEstadoCategoriaGasto(categorias, 'cat-1', 'inactiva');
    const dosVeces = cambiarEstadoCategoriaGasto(unaVez, 'cat-1', 'inactiva');
    expect(dosVeces[0].estado).toBe('inactiva');
  });

  it('reactivar una categoría inactiva la devuelve a "activa"', () => {
    const categorias = [crearCategoriaFixture({ estado: 'inactiva' })];
    const reactivada = cambiarEstadoCategoriaGasto(categorias, 'cat-1', 'activa');
    expect(reactivada[0].estado).toBe('activa');
  });

  it('la categoría nunca se elimina del arreglo — solo cambia su estado', () => {
    const categorias = [crearCategoriaFixture()];
    const siguiente = cambiarEstadoCategoriaGasto(categorias, 'cat-1', 'inactiva');
    expect(siguiente).toHaveLength(1);
    expect(siguiente[0].id).toBe('cat-1');
  });
});
