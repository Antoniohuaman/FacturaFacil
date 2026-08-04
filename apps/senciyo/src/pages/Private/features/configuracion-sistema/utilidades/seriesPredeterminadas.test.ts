import { describe, it, expect } from 'vitest';
import { buildMissingDefaultSeries } from './seriesPredeterminadas';
import { getNextExpenseDocument } from '@/shared/series/expenseSeries';

describe('buildMissingDefaultSeries — semilla de Gasto (G001)', () => {
  it('genera una serie G001 activa, predeterminada, con correlativo inicial 0 (ningún documento emitido todavía), cuando el establecimiento no tiene ninguna serie de tipo Gasto', () => {
    const seeds = buildMissingDefaultSeries({
      EstablecimientoId: 'est-1',
      environmentType: 'TESTING',
      existingSeries: [],
    });

    const gasto = seeds.find((s) => s.documentType.code === 'GTO');
    expect(gasto).toBeDefined();
    expect(gasto?.series).toBe('G001');
    expect(gasto?.correlativeNumber).toBe(0);
    expect(gasto?.status).toBe('ACTIVE');
    expect(gasto?.isActive).toBe(true);
    expect(gasto?.isDefault).toBe(true);
  });

  it('el PRIMER gasto registrado sobre la semilla G001 lee exactamente "G001-00000001" — nunca "00000002" (corrección técnica final §2)', () => {
    const seeds = buildMissingDefaultSeries({
      EstablecimientoId: 'est-1',
      environmentType: 'TESTING',
      existingSeries: [],
    });
    const gasto = seeds.find((s) => s.documentType.code === 'GTO')!;

    const primero = getNextExpenseDocument(gasto);
    expect(primero.fullNumber).toBe('G001-00000001');

    const segundo = getNextExpenseDocument({ ...gasto, correlativeNumber: primero.correlative });
    expect(segundo.fullNumber).toBe('G001-00000002');
  });

  it('no duplica la serie de Gasto si el establecimiento ya tiene una', () => {
    const primeraVez = buildMissingDefaultSeries({
      EstablecimientoId: 'est-1',
      environmentType: 'TESTING',
      existingSeries: [],
    });
    const yaExistente = primeraVez.filter((s) => s.documentType.code === 'GTO');

    const segundaVez = buildMissingDefaultSeries({
      EstablecimientoId: 'est-1',
      environmentType: 'TESTING',
      existingSeries: yaExistente,
    });

    expect(segundaVez.some((s) => s.documentType.code === 'GTO')).toBe(false);
  });

  it('genera una serie de Gasto independiente por cada establecimiento', () => {
    const seedsEst1 = buildMissingDefaultSeries({ EstablecimientoId: 'est-1', environmentType: 'TESTING', existingSeries: [] });
    const seedsEst2 = buildMissingDefaultSeries({ EstablecimientoId: 'est-2', environmentType: 'TESTING', existingSeries: seedsEst1 });

    const gastoEst2 = seedsEst2.find((s) => s.documentType.code === 'GTO');
    expect(gastoEst2).toBeDefined();
    expect(gastoEst2?.EstablecimientoId).toBe('est-2');
  });
});
