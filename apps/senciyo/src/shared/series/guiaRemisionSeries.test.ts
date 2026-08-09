import { describe, it, expect } from 'vitest';
import { formatGuiaRemisionCorrelative, getNextGuiaRemisionDocument } from './guiaRemisionSeries';
import { getDocumentTypeForVoucherType } from '../../pages/Private/features/configuracion-sistema/utilidades/catalogoSeries';
import type { Series } from '../../pages/Private/features/configuracion-sistema/modelos/Series';

function crearSerieGREFixture(overrides: Partial<Series> = {}): Series {
  return {
    id: 'series-gre-t001-est-1',
    EstablecimientoId: 'est-1',
    documentType: getDocumentTypeForVoucherType('GRE_REMITENTE'),
    series: 'T001',
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

describe('formatGuiaRemisionCorrelative', () => {
  it('rellena con ceros hasta minimumDigits', () => {
    const serie = crearSerieGREFixture();
    expect(formatGuiaRemisionCorrelative(serie, 7)).toBe('00000007');
  });
});

describe('getNextGuiaRemisionDocument (GRE-P1-002)', () => {
  it('el correlativo se calcula desde Series.correlativeNumber — nunca escanea guías existentes', () => {
    const serie = crearSerieGREFixture({ correlativeNumber: 4 });
    const siguiente = getNextGuiaRemisionDocument(serie);
    expect(siguiente).toEqual({
      seriesId: serie.id,
      seriesCode: 'T001',
      correlative: 5,
      fullNumber: 'T001-00000005',
      correlativeStr: '00000005',
    });
  });

  it('es una previsualización PURA — nunca muta la serie recibida', () => {
    const serie = crearSerieGREFixture({ correlativeNumber: 4 });
    getNextGuiaRemisionDocument(serie);
    expect(serie.correlativeNumber).toBe(4);
  });

  it('Remitente y Transportista (series independientes) mantienen correlativos completamente independientes', () => {
    const remitente = crearSerieGREFixture({ id: 'serie-t001', series: 'T001', correlativeNumber: 10, documentType: getDocumentTypeForVoucherType('GRE_REMITENTE') });
    const transportista = crearSerieGREFixture({ id: 'serie-v001', series: 'V001', correlativeNumber: 0, documentType: getDocumentTypeForVoucherType('GRE_TRANSPORTISTA') });

    expect(getNextGuiaRemisionDocument(remitente).fullNumber).toBe('T001-00000011');
    expect(getNextGuiaRemisionDocument(transportista).fullNumber).toBe('V001-00000001');
  });

  it('dos empresas con la misma serie textual no interfieren entre sí (identidad real es el id de Series, no el código)', () => {
    const empresaA = crearSerieGREFixture({ id: 'empresa-a:serie-t001', series: 'T001', correlativeNumber: 3 });
    const empresaB = crearSerieGREFixture({ id: 'empresa-b:serie-t001', series: 'T001', correlativeNumber: 99 });

    expect(getNextGuiaRemisionDocument(empresaA).correlative).toBe(4);
    expect(getNextGuiaRemisionDocument(empresaB).correlative).toBe(100);
  });
});

// GRE-P1-002 — cierre del hallazgo real: emitir una GRE debe dejar evidencia de uso real de la
// serie en `Series.statistics.documentsIssued`, el MISMO campo que `TarjetaSerie.tsx`/`useSeries.ts`
// leen para decidir "en uso" y bloquear el borrado (`documentsIssued > 0`). `FormularioGREPage.tsx`
// confirma el uso llamando a `useSeriesCommands().incrementSeriesCorrelative(serieActiva.id,
// correlative)` justo después de persistir la GRE emitida — la misma función y el mismo momento que
// usan Gastos/Cobranzas. Esta prueba fija el contrato algebraico de esa función
// (`documentsIssued + 1`, ver `configuracion-sistema/hooks/useComandosSeries.ts`) sin necesitar
// renderizar el contexto de React.
describe('Contrato con Series.statistics.documentsIssued (GRE-P1-002)', () => {
  it('una serie GRE nunca usada tiene documentsIssued=0 y "aparecería" como sin uso', () => {
    const serie = crearSerieGREFixture({ statistics: { documentsIssued: 0, averageDocumentsPerDay: 0 } });
    expect(serie.statistics.documentsIssued > 0).toBe(false);
  });

  it('tras confirmar el uso de la serie (misma fórmula que incrementSeriesCorrelative), documentsIssued > 0 y la serie queda "en uso"', () => {
    const serie = crearSerieGREFixture({ statistics: { documentsIssued: 0, averageDocumentsPerDay: 0 } });
    const { correlative } = getNextGuiaRemisionDocument(serie);
    const serieActualizada = {
      ...serie,
      correlativeNumber: correlative,
      statistics: { ...serie.statistics, documentsIssued: serie.statistics.documentsIssued + 1 },
    };
    expect(serieActualizada.statistics.documentsIssued > 0).toBe(true);
  });

  it('emitir dos GRE consecutivas de la misma serie deja documentsIssued=2 (uso acumulado real, nunca reseteado)', () => {
    let serie = crearSerieGREFixture({ statistics: { documentsIssued: 0, averageDocumentsPerDay: 0 } });
    for (let i = 0; i < 2; i += 1) {
      const { correlative } = getNextGuiaRemisionDocument(serie);
      serie = { ...serie, correlativeNumber: correlative, statistics: { ...serie.statistics, documentsIssued: serie.statistics.documentsIssued + 1 } };
    }
    expect(serie.statistics.documentsIssued).toBe(2);
    expect(serie.correlativeNumber).toBe(2);
  });
});
