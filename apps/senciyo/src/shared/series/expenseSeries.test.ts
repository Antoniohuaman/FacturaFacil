import { describe, it, expect } from 'vitest';
import { isExpenseSeries, filterExpenseSeries, formatExpenseCorrelative, getNextExpenseDocument } from './expenseSeries';
import { getDocumentTypeForVoucherType } from '../../pages/Private/features/configuracion-sistema/utilidades/catalogoSeries';
import type { Series } from '../../pages/Private/features/configuracion-sistema/modelos/Series';

function crearSerieGastoFixture(overrides: Partial<Series> = {}): Series {
  return {
    id: 'series-gto-g001-est-1',
    EstablecimientoId: 'est-1',
    documentType: getDocumentTypeForVoucherType('EXPENSE'),
    series: 'G001',
    correlativeNumber: 0,
    configuration: { minimumDigits: 8, startNumber: 1, autoIncrement: true, allowManualNumber: false, requireAuthorization: false },
    sunatConfiguration: { isElectronic: false, environmentType: 'TESTING', certificateRequired: false, mustReportToSunat: false, maxDaysToReport: 0 },
    status: 'ACTIVE',
    isDefault: true,
    statistics: { documentsIssued: 0, averageDocumentsPerDay: 0 },
    validation: { allowZeroAmount: true, requireCustomer: true },
    notes: undefined,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'system',
    isActive: true,
    ...overrides,
  };
}

describe('isExpenseSeries', () => {
  it('reconoce una serie con documentType.code "GTO"', () => {
    expect(isExpenseSeries(crearSerieGastoFixture())).toBe(true);
  });

  it('rechaza una serie de otro tipo documental', () => {
    const seriePG = crearSerieGastoFixture({ documentType: getDocumentTypeForVoucherType('PAYMENT_PURCHASE') });
    expect(isExpenseSeries(seriePG)).toBe(false);
  });
});

describe('filterExpenseSeries', () => {
  it('devuelve solo series de Gasto activas', () => {
    const activa = crearSerieGastoFixture({ id: 's1' });
    const inactiva = crearSerieGastoFixture({ id: 's2', isActive: false });
    const suspendida = crearSerieGastoFixture({ id: 's3', status: 'INACTIVE' });
    const otroTipo = crearSerieGastoFixture({ id: 's4', documentType: getDocumentTypeForVoucherType('PAYMENT_PURCHASE') });

    const resultado = filterExpenseSeries([activa, inactiva, suspendida, otroTipo]);
    expect(resultado.map((s) => s.id)).toEqual(['s1']);
  });

  it('filtra por establecimiento operativo cuando se indica', () => {
    const est1 = crearSerieGastoFixture({ id: 's1', EstablecimientoId: 'est-1' });
    const est2 = crearSerieGastoFixture({ id: 's2', EstablecimientoId: 'est-2' });

    expect(filterExpenseSeries([est1, est2], 'est-1').map((s) => s.id)).toEqual(['s1']);
    expect(filterExpenseSeries([est1, est2], 'est-2').map((s) => s.id)).toEqual(['s2']);
  });

  it('sin establecimiento indicado, devuelve todas las series activas de Gasto de cualquier establecimiento', () => {
    const est1 = crearSerieGastoFixture({ id: 's1', EstablecimientoId: 'est-1' });
    const est2 = crearSerieGastoFixture({ id: 's2', EstablecimientoId: 'est-2' });
    expect(filterExpenseSeries([est1, est2]).map((s) => s.id).sort()).toEqual(['s1', 's2']);
  });
});

describe('formatExpenseCorrelative', () => {
  it('rellena con ceros hasta minimumDigits', () => {
    const serie = crearSerieGastoFixture({ configuration: { minimumDigits: 8, startNumber: 1, autoIncrement: true, allowManualNumber: false, requireAuthorization: false } });
    expect(formatExpenseCorrelative(serie, 7)).toBe('00000007');
  });
});

describe('getNextExpenseDocument', () => {
  it('reserva el siguiente correlativo como PREVIEW puro — nunca muta la serie', () => {
    const serie = crearSerieGastoFixture({ correlativeNumber: 4 });
    const siguiente = getNextExpenseDocument(serie);
    expect(siguiente).toEqual({ seriesId: serie.id, seriesCode: 'G001', correlative: 5, fullNumber: 'G001-00000005' });
    expect(serie.correlativeNumber).toBe(4);
  });

  it('dos series distintas mantienen correlativos completamente independientes', () => {
    const serieA = crearSerieGastoFixture({ id: 'serie-a', series: 'G001', correlativeNumber: 10 });
    const serieB = crearSerieGastoFixture({ id: 'serie-b', series: 'G002', correlativeNumber: 0 });
    expect(getNextExpenseDocument(serieA).fullNumber).toBe('G001-00000011');
    expect(getNextExpenseDocument(serieB).fullNumber).toBe('G002-00000001');
  });
});
