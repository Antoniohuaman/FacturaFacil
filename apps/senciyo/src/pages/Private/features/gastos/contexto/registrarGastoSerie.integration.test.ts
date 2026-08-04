// Prueba de integración del consumo de correlativo de Series en el comando
// "Registrar gasto" (corrección puntual §1/§2: selector real de Series,
// NUNCA una única serie fija, NUNCA escaneo de gastos existentes). Reproduce,
// en el MISMO orden, la lógica real de `ContextoGastos.tsx#registrarGasto`:
//   1) resuelve y REVALIDA la serie elegida contra el catálogo central
//      (`resolverSerieGastoSeleccionada` — real, activa, tipo "Gasto");
//   2) si no es válida, bloquea SIN tocar nada;
//   3) reserva el siguiente correlativo como preview puro (`getNextExpenseDocument`
//      — real, nunca escaneado);
//   4) construye el gasto (`crearGasto` — real) con esa referencia;
//   5) recién al final, "confirma" la reserva incrementando
//      `Series.correlativeNumber` (aquí, un mock que cuenta invocaciones en
//      vez de `useSeriesCommands().incrementSeriesCorrelative`, que requiere
//      contexto de React — mismo criterio que `registrarCaja` en
//      `registrarGastoConPagoInmediato.integration.test.ts`).
//
// Se prueban las funciones REALES de producción (`resolverSerieGastoSeleccionada`,
// `getNextExpenseDocument`, `crearGasto`, `validarGastoBasico`,
// `validarMinimoBorradorGasto`), nunca una reimplementación paralela de esas
// reglas.

import { describe, it, expect } from 'vitest';
import {
  validarGastoBasico,
  validarMinimoBorradorGasto,
  resolverSerieGastoSeleccionada,
  crearGasto,
  buscarGastoPorClaveIdempotencia,
  type DatosNuevoGasto,
} from '../servicios/servicioGasto';
import { getNextExpenseDocument } from '@/shared/series/expenseSeries';
import { getDocumentTypeForVoucherType } from '../../configuracion-sistema/utilidades/catalogoSeries';
import type { Series } from '../../configuracion-sistema/modelos/Series';
import type { Gasto } from '../modelos/Gasto';

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

function crearDatosGastoFixture(overrides: Partial<DatosNuevoGasto> = {}): DatosNuevoGasto {
  return {
    empresaId: 'empresa-1',
    fechaReconocimiento: '2026-07-15',
    categoriaId: 'cat-alquileres',
    concepto: 'Alquiler de julio',
    beneficiario: 'Inmobiliaria XYZ',
    moneda: 'PEN',
    subtotal: 100,
    impuesto: 18,
    total: 118,
    tratamientoImpuesto: 'no_recuperable',
    condicionPago: 'contado',
    ...overrides,
  };
}

interface SalidaComandoRegistrar {
  gasto: Gasto;
  correlativeConsumido: number;
}

/**
 * Reproduce la orquestación real de `registrarGasto` (sin pagar) — ver
 * cabecera del archivo. Incluye la comprobación de idempotencia (§13 de la
 * corrección final consolidada), en el MISMO orden que
 * `ContextoGastos.tsx#registrarGasto`: se comprueba ANTES de resolver la
 * serie/correlativo, para que un reintento con la misma clave nunca
 * reincremente el correlativo ni construya un segundo gasto.
 */
function simularRegistrarGasto(
  datos: DatosNuevoGasto,
  seriesDisponibles: readonly Series[],
  incrementSeriesCorrelative: (seriesId: string, nextCorrelative: number) => void,
  gastosExistentes: readonly Gasto[] = [],
): SalidaComandoRegistrar {
  const erroresBasicos = validarGastoBasico(datos);
  if (erroresBasicos.length > 0) throw new Error(erroresBasicos.map((e) => e.mensaje).join(' '));

  const gastoExistentePorClave = buscarGastoPorClaveIdempotencia(gastosExistentes, datos.claveIdempotencia);
  if (gastoExistentePorClave) return { gasto: gastoExistentePorClave, correlativeConsumido: 0 };

  const serieGasto = resolverSerieGastoSeleccionada(seriesDisponibles, datos.serieId);
  if (!serieGasto) {
    throw new Error('Selecciona una serie de Gasto activa antes de registrar.');
  }
  const { correlative, fullNumber } = getNextExpenseDocument(serieGasto);

  const gasto = crearGasto(datos, 'gasto-sim', fullNumber, 'usuario-1', 'registrado');

  incrementSeriesCorrelative(serieGasto.id, correlative);

  return { gasto, correlativeConsumido: correlative };
}

/** Reproduce `guardarBorradorGasto` — nunca resuelve ni consume ninguna serie. */
function simularGuardarBorrador(datos: DatosNuevoGasto): Gasto {
  const errores = validarMinimoBorradorGasto(datos);
  if (errores.length > 0) throw new Error(errores.map((e) => e.mensaje).join(' '));
  return crearGasto(datos, 'gasto-sim', 'BORR-gasto-sim', 'usuario-1', 'borrador');
}

describe('registrarGasto — consumo de correlativo vía el catálogo central de Series (corrección puntual §1/§2)', () => {
  it('1. Con una serie activa, registra con el siguiente correlativo y confirma la reserva UNA sola vez', () => {
    const serie = crearSerieGastoFixture({ correlativeNumber: 4 });
    let llamadas = 0;
    let ultimoCorrelativoConfirmado: number | null = null;

    const resultado = simularRegistrarGasto(
      crearDatosGastoFixture({ serieId: serie.id }),
      [serie],
      (seriesId, correlative) => {
        llamadas += 1;
        expect(seriesId).toBe(serie.id);
        ultimoCorrelativoConfirmado = correlative;
      },
    );

    expect(resultado.gasto.referenciaInterna).toBe('G001-00000005');
    expect(resultado.gasto.serieId).toBe(serie.id);
    expect(llamadas).toBe(1);
    expect(ultimoCorrelativoConfirmado).toBe(5);
  });

  it('2. Sin serieId elegido, bloquea ANTES de tocar el correlativo — nunca genera una referencia local de respaldo', () => {
    const serie = crearSerieGastoFixture();
    let llamadas = 0;

    expect(() => simularRegistrarGasto(crearDatosGastoFixture({ serieId: undefined }), [serie], () => { llamadas += 1; }))
      .toThrow('Selecciona una serie de Gasto activa');
    expect(llamadas).toBe(0);
  });

  it('3. Una serie INACTIVA ya no se resuelve, aunque sea la que el usuario había elegido — bloquea sin consumir', () => {
    const serieInactiva = crearSerieGastoFixture({ isActive: false });
    let llamadas = 0;

    expect(() => simularRegistrarGasto(crearDatosGastoFixture({ serieId: serieInactiva.id }), [serieInactiva], () => { llamadas += 1; }))
      .toThrow('Selecciona una serie de Gasto activa');
    expect(llamadas).toBe(0);
  });

  it('4. Dos series DISTINTAS mantienen correlativos completamente independientes', () => {
    const serieA = crearSerieGastoFixture({ id: 'serie-a', series: 'G001', correlativeNumber: 10 });
    const serieB = crearSerieGastoFixture({ id: 'serie-b', series: 'G002', correlativeNumber: 0 });
    const confirmaciones: Array<{ seriesId: string; correlative: number }> = [];
    const incrementar = (seriesId: string, correlative: number) => confirmaciones.push({ seriesId, correlative });

    const resultadoA = simularRegistrarGasto(crearDatosGastoFixture({ serieId: serieA.id }), [serieA, serieB], incrementar);
    const resultadoB = simularRegistrarGasto(crearDatosGastoFixture({ serieId: serieB.id }), [serieA, serieB], incrementar);

    expect(resultadoA.gasto.referenciaInterna).toBe('G001-00000011');
    expect(resultadoB.gasto.referenciaInterna).toBe('G002-00000001');
    expect(confirmaciones).toEqual([
      { seriesId: 'serie-a', correlative: 11 },
      { seriesId: 'serie-b', correlative: 1 },
    ]);
  });

  it('5. Registrar con una serie de OTRO establecimiento (no filtrada previamente por el formulario) igual la rechaza si no es de tipo Gasto', () => {
    const seriePG = crearSerieGastoFixture({ id: 'serie-pg', documentType: getDocumentTypeForVoucherType('PAYMENT_PURCHASE'), series: 'PG01' });
    let llamadas = 0;

    expect(() => simularRegistrarGasto(crearDatosGastoFixture({ serieId: 'serie-pg' }), [seriePG], () => { llamadas += 1; }))
      .toThrow('Selecciona una serie de Gasto activa');
    expect(llamadas).toBe(0);
  });

  it('6. Idempotencia (§13 de la corrección final): un reintento con la MISMA clave nunca reincrementa el correlativo ni construye un segundo gasto', () => {
    const serie = crearSerieGastoFixture({ correlativeNumber: 4 });
    let llamadas = 0;
    const incrementar = () => { llamadas += 1; };

    const primero = simularRegistrarGasto(crearDatosGastoFixture({ serieId: serie.id, claveIdempotencia: 'clave-abc' }), [serie], incrementar);
    expect(llamadas).toBe(1);
    expect(primero.gasto.referenciaInterna).toBe('G001-00000005');

    // Reintento (doble clic / reenvío) con la MISMA clave — devuelve el MISMO
    // gasto ya persistido, sin volver a tocar el correlativo.
    const reintento = simularRegistrarGasto(
      crearDatosGastoFixture({ serieId: serie.id, claveIdempotencia: 'clave-abc' }),
      [serie],
      incrementar,
      [primero.gasto],
    );
    expect(llamadas).toBe(1);
    expect(reintento.gasto).toBe(primero.gasto);
    expect(reintento.correlativeConsumido).toBe(0);
  });

  it('7. Dos operaciones SIN clave de idempotencia nunca se consideran la misma — cada una consume su propio correlativo', () => {
    const serie = crearSerieGastoFixture({ correlativeNumber: 4 });
    let llamadas = 0;
    const incrementar = () => { llamadas += 1; };

    const primero = simularRegistrarGasto(crearDatosGastoFixture({ serieId: serie.id }), [serie], incrementar);
    const segundo = simularRegistrarGasto(crearDatosGastoFixture({ serieId: serie.id }), [serie], incrementar, [primero.gasto]);

    expect(llamadas).toBe(2);
    expect(segundo.gasto).not.toBe(primero.gasto);
  });

  it('8. Claves DISTINTAS nunca colisionan — cada operación consume su propio correlativo', () => {
    const serie = crearSerieGastoFixture({ correlativeNumber: 4 });
    let llamadas = 0;
    const incrementar = () => { llamadas += 1; };

    const primero = simularRegistrarGasto(crearDatosGastoFixture({ serieId: serie.id, claveIdempotencia: 'clave-1' }), [serie], incrementar);
    const segundo = simularRegistrarGasto(
      crearDatosGastoFixture({ serieId: serie.id, claveIdempotencia: 'clave-2' }),
      [serie],
      incrementar,
      [primero.gasto],
    );

    expect(llamadas).toBe(2);
    expect(segundo.gasto).not.toBe(primero.gasto);
  });
});

describe('guardarBorradorGasto — nunca resuelve ni consume ninguna serie (corrección puntual §2)', () => {
  it('6. Un borrador se guarda sin serieId, sin serie disponible, y sin ningún efecto sobre el correlativo', () => {
    const gasto = simularGuardarBorrador(crearDatosGastoFixture({ serieId: undefined }));
    expect(gasto.estadoDocumento).toBe('borrador');
    expect(gasto.serieId).toBeUndefined();
  });

  it('7. Un borrador PUEDE conservar una serie ya elegida, sin que eso consuma su correlativo', () => {
    const serie = crearSerieGastoFixture({ correlativeNumber: 7 });
    const gasto = simularGuardarBorrador(crearDatosGastoFixture({ serieId: serie.id }));
    expect(gasto.serieId).toBe(serie.id);
    expect(serie.correlativeNumber).toBe(7); // nunca mutada por guardar un borrador
  });
});
