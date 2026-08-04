import { describe, it, expect } from 'vitest';
import {
  validateSeriesCodeForVoucherType,
  generateSeriesSuggestion,
  getVoucherTypeFromSeries,
  getDocumentTypeForVoucherType,
} from './catalogoSeries';
import type { Series } from '../modelos/Series';

describe('validateSeriesCodeForVoucherType — EXPENSE (Gasto)', () => {
  it('acepta "G001" (corrección: antes caía al default y siempre era rechazada)', () => {
    expect(validateSeriesCodeForVoucherType('EXPENSE', 'G001')).toBe(true);
  });

  it('acepta cualquier código alfanumérico de 4 caracteres, igual que los demás tipos internos de código libre', () => {
    expect(validateSeriesCodeForVoucherType('EXPENSE', 'GAST')).toBe(true);
    expect(validateSeriesCodeForVoucherType('EXPENSE', 'G002')).toBe(true);
  });

  it('rechaza códigos de longitud distinta de 4', () => {
    expect(validateSeriesCodeForVoucherType('EXPENSE', 'G01')).toBe(false);
    expect(validateSeriesCodeForVoucherType('EXPENSE', 'G00001')).toBe(false);
  });
});

describe('generateSeriesSuggestion — EXPENSE (Gasto)', () => {
  it('sugiere "G001" cuando no hay series previas (corrección: antes devolvía cadena vacía)', () => {
    expect(generateSeriesSuggestion('EXPENSE', [])).toBe('G001');
  });

  it('sugiere el siguiente correlativo libre cuando "G001" ya existe', () => {
    expect(generateSeriesSuggestion('EXPENSE', ['G001'])).toBe('G002');
  });

  it('no colisiona con series de otros tipos que empiecen distinto', () => {
    expect(generateSeriesSuggestion('EXPENSE', ['F001', 'B001'])).toBe('G001');
  });
});

describe('validateSeriesCodeForVoucherType / generateSeriesSuggestion — no regresión en otros tipos', () => {
  it('Factura sigue exigiendo prefijo "F"', () => {
    expect(validateSeriesCodeForVoucherType('INVOICE', 'F001')).toBe(true);
    expect(validateSeriesCodeForVoucherType('INVOICE', 'G001')).toBe(false);
    expect(generateSeriesSuggestion('INVOICE', [])).toBe('FE01');
  });

  it('Requerimiento de Compra (RQ) sigue aceptando código libre de 4 caracteres', () => {
    expect(validateSeriesCodeForVoucherType('PURCHASE_REQUISITION', 'RQ01')).toBe(true);
  });
});

function crearSerieFixture(overrides: Partial<Series> = {}): Series {
  const documentType = getDocumentTypeForVoucherType('EXPENSE');
  return {
    id: 'series-gto-g001-est-1',
    EstablecimientoId: 'est-1',
    documentType,
    series: 'G001',
    correlativeNumber: 1,
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

describe('getVoucherTypeFromSeries — clasifica series de Gasto', () => {
  it('clasifica una serie con documentType.code "GTO" como EXPENSE', () => {
    expect(getVoucherTypeFromSeries(crearSerieFixture())).toBe('EXPENSE');
  });
});
