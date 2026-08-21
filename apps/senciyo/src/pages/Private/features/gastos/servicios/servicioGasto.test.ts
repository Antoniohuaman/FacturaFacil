import { describe, it, expect } from 'vitest';
import {
  validarGastoBasico,
  validarMinimoBorradorGasto,
  resolverSerieGastoSeleccionada,
  crearGasto,
  importeReconocidoComoGasto,
  resolverEstadoPagoGasto,
  puedeEditarGasto,
  nivelEdicionGasto,
  puedeDescartarBorradorGasto,
  referenciaTecnicaBorradorGasto,
  presentarReferenciaGasto,
  presentarEstadoDocumentoGasto,
  presentarEstadoVisualGasto,
  presentarClaseEstadoVisualGasto,
  buscarGastoPorClaveIdempotencia,
  filtrarErroresVigentes,
  esBorradorDescartadoGasto,
  MOTIVO_DESCARTE_BORRADOR_GASTO,
  convertirBorradorEnRegistrado,
  motivoBloqueoAnulacionGasto,
  puedeAnularGasto,
  datosParaDuplicarGasto,
  motivoBloqueoEfectivoMonedaExtranjera,
  normalizarMotivoAnulacion,
  TIPOS_DOCUMENTO_SUSTENTATORIO_GASTO_COMPATIBLES,
  CODIGOS_DOCUMENTO_SUSTENTATORIO_GASTO_COMPATIBLES,
  type DatosNuevoGasto,
} from './servicioGasto';
import type { CuentaPorPagar } from '../../compras/modelos/CuentaPorPagar';
import type { PagoCompra, MedioPagoCompra } from '../../compras/modelos/PagoCompra';
import type { Series } from '../../configuracion-sistema/modelos/Series';
import { getDocumentTypeForVoucherType } from '../../configuracion-sistema/utilidades/catalogoSeries';

const MONEDA_BASE_FIXTURE = 'PEN';

function crearDatosGastoBasicos(overrides: Partial<DatosNuevoGasto> = {}): DatosNuevoGasto {
  return {
    empresaId: 'empresa-1',
    fechaReconocimiento: '2026-07-01',
    categoriaId: 'cat-alquileres',
    concepto: 'Alquiler de julio',
    beneficiario: 'Inmobiliaria XYZ',
    moneda: 'PEN',
    subtotal: 100,
    impuesto: 18,
    total: 118,
    tratamientoImpuesto: 'no_recuperable',
    impuestoId: 'imp-igv',
    condicionPago: 'contado',
    ...overrides,
  };
}

function crearCxPFixture(overrides: Partial<CuentaPorPagar> = {}): CuentaPorPagar {
  return {
    id: 'cxp-1',
    tipoOrigen: 'gasto',
    documentoOrigenId: 'gasto-1',
    comprobanteCompraId: '',
    comprobanteCompraNumero: '',
    tipoComprobanteOrigen: '',
    proveedorId: '',
    proveedorNombre: 'Inmobiliaria XYZ',
    proveedorNumeroDocumento: '',
    moneda: 'PEN',
    total: 118,
    totalPagado: 0,
    saldoPendiente: 118,
    formaPago: 'contado',
    fechaEmision: '2026-07-01',
    estadoPago: 'pendiente',
    estadoVencimiento: 'vigente',
    pagosRelacionados: [],
    historial: [],
    fechaCreacion: '2026-07-01T00:00:00.000Z',
    fechaActualizacion: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

function crearPagoFixture(overrides: Partial<PagoCompra> = {}): PagoCompra {
  return {
    id: 'pago-1',
    numeroPago: 'PG01-00000001',
    fechaPago: '2026-07-05',
    proveedorId: '',
    proveedorNombre: 'Inmobiliaria XYZ',
    moneda: 'PEN',
    montoTotalPagado: 118,
    mediosPago: [],
    tipoOrigen: 'gasto',
    aplicaciones: [{ cuentaPorPagarId: 'cxp-1', tipoOrigen: 'gasto', documentoOrigenId: 'gasto-1', comprobanteCompraId: '', importeAplicado: 118 }],
    cuentasPorPagarAplicadas: ['cxp-1'],
    comprobantesCompraAplicados: [],
    concepto: 'Pago de gasto: Alquiler de julio',
    estadoDocumento: 'registrado',
    historial: [],
    fechaCreacion: '2026-07-05T00:00:00.000Z',
    ...overrides,
  } as PagoCompra;
}

describe('validarGastoBasico', () => {
  it('acepta un gasto válido sin proveedor formal (beneficiario de texto libre)', () => {
    expect(validarGastoBasico(crearDatosGastoBasicos(), MONEDA_BASE_FIXTURE)).toEqual([]);
  });

  it('exige proveedor O beneficiario — sin ninguno de los dos, falla', () => {
    const errores = validarGastoBasico(crearDatosGastoBasicos({ beneficiario: undefined, proveedorId: undefined }), MONEDA_BASE_FIXTURE);
    expect(errores.some((e) => e.campo === 'beneficiario')).toBe(true);
  });

  it('con proveedorId presente, no exige beneficiario', () => {
    const errores = validarGastoBasico(crearDatosGastoBasicos({ beneficiario: undefined, proveedorId: 'prov-1' }), MONEDA_BASE_FIXTURE);
    expect(errores.some((e) => e.campo === 'beneficiario')).toBe(false);
  });

  it('exige categoría, concepto, fecha de reconocimiento y total > 0', () => {
    const errores = validarGastoBasico({}, MONEDA_BASE_FIXTURE);
    expect(errores.map((e) => e.campo).sort()).toEqual(['beneficiario', 'categoriaId', 'concepto', 'fechaReconocimiento', 'total'].sort());
  });

  it('gasto al crédito sin fecha de vencimiento falla', () => {
    const errores = validarGastoBasico(crearDatosGastoBasicos({ condicionPago: 'credito' }), MONEDA_BASE_FIXTURE);
    expect(errores.some((e) => e.campo === 'fechaVencimiento')).toBe(true);
  });

  it('gasto al crédito CON fecha de vencimiento no falla por ese campo', () => {
    const errores = validarGastoBasico(crearDatosGastoBasicos({ condicionPago: 'credito', fechaVencimiento: '2026-08-01' }), MONEDA_BASE_FIXTURE);
    expect(errores.some((e) => e.campo === 'fechaVencimiento')).toBe(false);
  });

  it('total NaN/Infinity es rechazado explícitamente (GAS-P2-009)', () => {
    expect(validarGastoBasico(crearDatosGastoBasicos({ total: Number.NaN }), MONEDA_BASE_FIXTURE).some((e) => e.campo === 'total')).toBe(true);
    expect(validarGastoBasico(crearDatosGastoBasicos({ total: Number.POSITIVE_INFINITY }), MONEDA_BASE_FIXTURE).some((e) => e.campo === 'total')).toBe(true);
  });

  it('moneda extranjera sin tipo de cambio (o con tipo de cambio inválido) es rechazada (GAS-P2-006)', () => {
    const sinTipoCambio = validarGastoBasico(crearDatosGastoBasicos({ moneda: 'USD' }), MONEDA_BASE_FIXTURE);
    expect(sinTipoCambio.some((e) => e.campo === 'tipoCambio')).toBe(true);

    const tipoCambioCero = validarGastoBasico(crearDatosGastoBasicos({ moneda: 'USD', tipoCambio: 0 }), MONEDA_BASE_FIXTURE);
    expect(tipoCambioCero.some((e) => e.campo === 'tipoCambio')).toBe(true);

    const tipoCambioValido = validarGastoBasico(crearDatosGastoBasicos({ moneda: 'USD', tipoCambio: 3.75 }), MONEDA_BASE_FIXTURE);
    expect(tipoCambioValido.some((e) => e.campo === 'tipoCambio')).toBe(false);
  });

  it('gasto en la moneda base nunca exige tipo de cambio', () => {
    const errores = validarGastoBasico(crearDatosGastoBasicos({ moneda: MONEDA_BASE_FIXTURE, tipoCambio: undefined }), MONEDA_BASE_FIXTURE);
    expect(errores.some((e) => e.campo === 'tipoCambio')).toBe(false);
  });

  it('tratamiento con desglose (recuperable/no recuperable) sin impuesto seleccionado es rechazado (GAS-P2-004)', () => {
    const sinImpuesto = validarGastoBasico(crearDatosGastoBasicos({ tratamientoImpuesto: 'recuperable', impuestoId: undefined }), MONEDA_BASE_FIXTURE);
    expect(sinImpuesto.some((e) => e.campo === 'impuestoId')).toBe(true);

    const conImpuesto = validarGastoBasico(crearDatosGastoBasicos({ tratamientoImpuesto: 'recuperable', impuestoId: 'imp-igv' }), MONEDA_BASE_FIXTURE);
    expect(conImpuesto.some((e) => e.campo === 'impuestoId')).toBe(false);
  });

  it('"sin_desglose" nunca exige impuesto aplicable', () => {
    const errores = validarGastoBasico(crearDatosGastoBasicos({ tratamientoImpuesto: 'sin_desglose', impuestoId: undefined }), MONEDA_BASE_FIXTURE);
    expect(errores.some((e) => e.campo === 'impuestoId')).toBe(false);
  });

  it('un documento formal compatible (Factura/Boleta/Recibo por Arrendamiento) con beneficiario libre (sin proveedor formal) es rechazado (auditoría de fuentes de verdad §11/§18)', () => {
    for (const codigo of CODIGOS_DOCUMENTO_SUSTENTATORIO_GASTO_COMPATIBLES) {
      const errores = validarGastoBasico(
        crearDatosGastoBasicos({ tipoDocumento: codigo, proveedorId: undefined, beneficiario: 'Movilidad Juan' }),
        MONEDA_BASE_FIXTURE,
      );
      expect(errores.some((e) => e.campo === 'beneficiario')).toBe(true);
    }
  });

  it('un documento formal compatible CON proveedor identificado (proveedorId) no es rechazado', () => {
    const errores = validarGastoBasico(
      crearDatosGastoBasicos({ tipoDocumento: '01', proveedorId: 'prov-1', beneficiario: undefined }),
      MONEDA_BASE_FIXTURE,
    );
    expect(errores.some((e) => e.campo === 'beneficiario')).toBe(false);
  });

  it('sin documento ("Sin documento") o con un tipo fuera del subconjunto compatible, un beneficiario libre nunca es rechazado', () => {
    const sinDocumento = validarGastoBasico(crearDatosGastoBasicos({ tipoDocumento: undefined, proveedorId: undefined, beneficiario: 'Movilidad Juan' }), MONEDA_BASE_FIXTURE);
    expect(sinDocumento.some((e) => e.campo === 'beneficiario')).toBe(false);

    // '12' (Recibo por Honorarios) es un registro histórico posible pero ya
    // no se ofrece como opción activa — nunca se re-valida retroactivamente.
    const tipoNoCompatible = validarGastoBasico(crearDatosGastoBasicos({ tipoDocumento: '12', proveedorId: undefined, beneficiario: 'Movilidad Juan' }), MONEDA_BASE_FIXTURE);
    expect(tipoNoCompatible.some((e) => e.campo === 'beneficiario')).toBe(false);
  });
});

describe('TIPOS_DOCUMENTO_SUSTENTATORIO_GASTO_COMPATIBLES — subconjunto contextual del catálogo central (nunca lo modifica)', () => {
  it('solo Factura (01), Boleta de Venta (03) y Recibo por Arrendamiento (14) — el resto queda fuera por incoherencia funcional confirmada en la auditoría', () => {
    expect(TIPOS_DOCUMENTO_SUSTENTATORIO_GASTO_COMPATIBLES.map((t) => t.codigo).sort()).toEqual(['01', '03', '14']);
  });
});

describe('validarMinimoBorradorGasto — un borrador nunca se guarda vacío o casi vacío (corrección de UX/consistencia funcional)', () => {
  it('acepta un borrador con los campos mínimos completos', () => {
    expect(validarMinimoBorradorGasto(crearDatosGastoBasicos())).toEqual([]);
  });

  it('exige categoría, concepto, fecha del gasto, total > 0 y proveedor/beneficiario', () => {
    const errores = validarMinimoBorradorGasto({});
    expect(errores.map((e) => e.campo).sort()).toEqual(['beneficiario', 'categoriaId', 'concepto', 'fechaReconocimiento', 'total'].sort());
  });

  it('NUNCA exige fecha de vencimiento aunque la condición sea crédito — un borrador puede no tener aún su cronograma definido', () => {
    const errores = validarMinimoBorradorGasto(crearDatosGastoBasicos({ condicionPago: 'credito' }));
    expect(errores.some((e) => e.campo === 'fechaVencimiento')).toBe(false);
  });

  it('con proveedorId presente, no exige beneficiario', () => {
    const errores = validarMinimoBorradorGasto(crearDatosGastoBasicos({ beneficiario: undefined, proveedorId: 'prov-1' }));
    expect(errores.some((e) => e.campo === 'beneficiario')).toBe(false);
  });
});

function crearSerieGastoFixture(overrides: Partial<Series> = {}): Series {
  return {
    id: 'series-gto-g001-est-1',
    EstablecimientoId: 'est-1',
    documentType: getDocumentTypeForVoucherType('EXPENSE'),
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

describe('resolverSerieGastoSeleccionada (§1/§2 de la corrección — serie elegida en el formulario, revalidada al registrar)', () => {
  it('resuelve la serie cuando el id elegido corresponde a una serie de Gasto activa', () => {
    const serie = crearSerieGastoFixture();
    expect(resolverSerieGastoSeleccionada([serie], serie.id)).toBe(serie);
  });

  it('sin serieId, devuelve undefined (nunca elige una por defecto por su cuenta)', () => {
    expect(resolverSerieGastoSeleccionada([crearSerieGastoFixture()], undefined)).toBeUndefined();
  });

  it('un serieId que ya no existe en el catálogo devuelve undefined', () => {
    expect(resolverSerieGastoSeleccionada([crearSerieGastoFixture()], 'serie-inexistente')).toBeUndefined();
  });

  it('una serie inactiva o suspendida ya no se resuelve, aunque el id siga siendo el elegido', () => {
    const inactiva = crearSerieGastoFixture({ id: 's-inactiva', isActive: false });
    const suspendida = crearSerieGastoFixture({ id: 's-suspendida', status: 'INACTIVE' });
    expect(resolverSerieGastoSeleccionada([inactiva], 's-inactiva')).toBeUndefined();
    expect(resolverSerieGastoSeleccionada([suspendida], 's-suspendida')).toBeUndefined();
  });

  it('ignora una serie de otro tipo documental aunque el id coincida', () => {
    const seriePG = crearSerieGastoFixture({ id: 's-pg', documentType: getDocumentTypeForVoucherType('PAYMENT_PURCHASE'), series: 'PG01' });
    expect(resolverSerieGastoSeleccionada([seriePG], 's-pg')).toBeUndefined();
  });
});

describe('crearGasto', () => {
  it('sin especificar estadoDocumento, nace "registrado" por defecto', () => {
    const gasto = crearGasto(crearDatosGastoBasicos(), 'gasto-1', 'GTO-00000001', 'usuario-1');
    expect(gasto.estadoDocumento).toBe('registrado');
  });

  it('§4 de la corrección: puede nacer explícitamente como "borrador" — sin efecto financiero, historial distinto', () => {
    const gasto = crearGasto(crearDatosGastoBasicos(), 'gasto-1', referenciaTecnicaBorradorGasto('gasto-1'), 'usuario-1', 'borrador');
    expect(gasto.estadoDocumento).toBe('borrador');
    expect(gasto.historial[0].accion).toBe('Guardado como borrador');
    expect(gasto.referenciaInterna).toBe('BORR-gasto-1');
  });

  it('sin proveedorId, conserva el beneficiario de texto libre', () => {
    const gasto = crearGasto(crearDatosGastoBasicos({ proveedorId: undefined, beneficiario: 'Movilidad conductor' }), 'gasto-2', 'GTO-00000002');
    expect(gasto.beneficiario).toBe('Movilidad conductor');
    expect(gasto.proveedorId).toBeUndefined();
  });

  it('con proveedorId, el beneficiario de texto libre se descarta (nunca ambos a la vez)', () => {
    const gasto = crearGasto(crearDatosGastoBasicos({ proveedorId: 'prov-1', beneficiario: 'texto que no debería guardarse' }), 'gasto-3', 'GTO-00000003');
    expect(gasto.proveedorId).toBe('prov-1');
    expect(gasto.beneficiario).toBeUndefined();
  });

  it('gasto al contado nunca guarda fecha de vencimiento, aunque se haya enviado una', () => {
    const gasto = crearGasto(crearDatosGastoBasicos({ condicionPago: 'contado', fechaVencimiento: '2026-08-01' }), 'gasto-4', 'GTO-00000004');
    expect(gasto.fechaVencimiento).toBeUndefined();
  });

  it('genera con la referenciaInterna provista (nunca una serie GS, mismo criterio que un pago PG)', () => {
    const gasto = crearGasto(crearDatosGastoBasicos(), 'gasto-5', 'GTO-00000005');
    expect(gasto.referenciaInterna).toBe('GTO-00000005');
  });

  it('conserva el serieId elegido en el formulario (§1/§2 de la corrección — nunca se pierde entre borrador y registro)', () => {
    const gasto = crearGasto(crearDatosGastoBasicos({ serieId: 'series-gto-g001-est-1' }), 'gasto-6', 'G001-00000001');
    expect(gasto.serieId).toBe('series-gto-g001-est-1');
  });

  describe('fechaReconocimiento (fecha del gasto) vs fechaCreacion/historial (instante real de registro) — corrección técnica final §5', () => {
    it('un gasto de julio registrado en agosto conserva fechaReconocimiento en julio, mientras fechaCreacion/fechaActualizacion/historial reflejan el instante real de agosto', () => {
      const gasto = crearGasto(
        crearDatosGastoBasicos({ fechaReconocimiento: '2026-07-15' }),
        'gasto-9', 'GTO-00000009', 'usuario-1', 'registrado',
        '2026-08-03T10:00:00-05:00',
      );
      expect(gasto.fechaReconocimiento).toBe('2026-07-15');
      expect(gasto.fechaCreacion).toBe('2026-08-03T10:00:00-05:00');
      expect(gasto.fechaActualizacion).toBe('2026-08-03T10:00:00-05:00');
      expect(gasto.historial[0].fecha).toBe('2026-08-03T10:00:00-05:00');
    });

    it('sin fechaCreacion explícita, usa la hora de negocio actual (America/Lima) — nunca datos.fechaReconocimiento', () => {
      const gasto = crearGasto(crearDatosGastoBasicos({ fechaReconocimiento: '2020-01-01' }), 'gasto-10', 'GTO-00000010');
      expect(gasto.fechaCreacion).not.toBe('2020-01-01');
      expect(gasto.fechaCreacion).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('crédito y forma de pago configurada (§3 de la corrección)', () => {
    it('3. Crédito simple: sin formaPagoMetodoId, conserva la fecha de vencimiento manual', () => {
      const gasto = crearGasto(
        crearDatosGastoBasicos({ condicionPago: 'credito', fechaVencimiento: '2026-09-01', formaPagoMetodoId: undefined }),
        'gasto-6', 'GTO-00000006',
      );
      expect(gasto.fechaVencimiento).toBe('2026-09-01');
      expect(gasto.formaPagoMetodoId).toBeUndefined();
      expect(gasto.creditTerms).toBeUndefined();
    });

    it('4/8. Crédito con plantilla configurada: persiste formaPagoMetodoId y el cronograma (CreditScheduleTerms) tal cual se recibieron', () => {
      const cronograma = {
        schedule: [
          { numeroCuota: 1, diasCredito: 30, porcentaje: 50, fechaVencimiento: '2026-08-01', importe: 59 },
          { numeroCuota: 2, diasCredito: 60, porcentaje: 50, fechaVencimiento: '2026-09-01', importe: 59 },
        ],
        fechaVencimientoGlobal: '2026-09-01',
        totalPorcentaje: 100,
      };
      const gasto = crearGasto(
        crearDatosGastoBasicos({ condicionPago: 'credito', formaPagoMetodoId: 'metodo-credito-1', creditTerms: cronograma }),
        'gasto-7', 'GTO-00000007',
      );
      expect(gasto.formaPagoMetodoId).toBe('metodo-credito-1');
      expect(gasto.creditTerms).toEqual(cronograma);
    });

    it('5. Contado SÍ persiste formaPagoMetodoId (corrección técnica final §6 — antes se descartaba y rompía la fuente de verdad de Configuración); creditTerms se descarta igual porque un cronograma de cuotas nunca aplica a contado', () => {
      const gasto = crearGasto(
        crearDatosGastoBasicos({ condicionPago: 'contado', formaPagoMetodoId: 'metodo-contado-1', creditTerms: { schedule: [], fechaVencimientoGlobal: '2026-09-01' } }),
        'gasto-8', 'GTO-00000008',
      );
      expect(gasto.formaPagoMetodoId).toBe('metodo-contado-1');
      expect(gasto.creditTerms).toBeUndefined();
    });
  });
});

describe('importeReconocidoComoGasto (§13 — única fórmula, nunca duplicada)', () => {
  it('impuesto recuperable: el impuesto NO forma parte del importe reconocido (usa el subtotal)', () => {
    expect(importeReconocidoComoGasto({ estadoDocumento: 'registrado', tratamientoImpuesto: 'recuperable', subtotal: 100, total: 118 })).toBe(100);
  });

  it('impuesto no recuperable: el importe reconocido es el total completo', () => {
    expect(importeReconocidoComoGasto({ estadoDocumento: 'registrado', tratamientoImpuesto: 'no_recuperable', subtotal: 100, total: 118 })).toBe(118);
  });

  it('sin desglose de impuesto: usa el total completo (misma política que no_recuperable)', () => {
    expect(importeReconocidoComoGasto({ estadoDocumento: 'registrado', tratamientoImpuesto: 'sin_desglose', subtotal: 100, total: 118 })).toBe(118);
  });

  it('gasto anulado: el importe reconocido es siempre 0, sin importar el tratamiento del impuesto', () => {
    expect(importeReconocidoComoGasto({ estadoDocumento: 'anulado', tratamientoImpuesto: 'no_recuperable', subtotal: 100, total: 118 })).toBe(0);
    expect(importeReconocidoComoGasto({ estadoDocumento: 'anulado', tratamientoImpuesto: 'recuperable', subtotal: 100, total: 118 })).toBe(0);
  });
});

describe('resolverEstadoPagoGasto — estado de pago SIEMPRE derivado de la CxP, nunca una segunda fuente', () => {
  it('sin Cuenta por Pagar asociada: pendiente', () => {
    expect(resolverEstadoPagoGasto(undefined)).toBe('pendiente');
  });

  it('CxP con estadoPago "pendiente": pendiente', () => {
    expect(resolverEstadoPagoGasto(crearCxPFixture({ estadoPago: 'pendiente' }))).toBe('pendiente');
  });

  it('CxP con estadoPago "parcial": parcial', () => {
    expect(resolverEstadoPagoGasto(crearCxPFixture({ estadoPago: 'parcial' }))).toBe('parcial');
  });

  it('CxP con estadoPago "pagada": pagado', () => {
    expect(resolverEstadoPagoGasto(crearCxPFixture({ estadoPago: 'pagada' }))).toBe('pagado');
  });

  it('9. Pago parcial de un gasto con cronograma de cuotas configurado: el estado de pago refleja el saldo de la CxP y el cronograma (snapshot histórico) permanece intacto — mismo criterio que un ComprobanteCompra con crédito en cuotas', () => {
    const gasto = crearGasto(
      crearDatosGastoBasicos({
        condicionPago: 'credito',
        formaPagoMetodoId: 'metodo-credito-1',
        fechaVencimiento: '2026-09-01',
        creditTerms: {
          fechaVencimientoGlobal: '2026-09-01',
          schedule: [
            { numeroCuota: 1, fechaVencimiento: '2026-08-01', importe: 59, dias: 30 },
            { numeroCuota: 2, fechaVencimiento: '2026-09-01', importe: 59, dias: 60 },
          ],
        },
      }),
      'gasto-1',
      'GTO-00000001',
    );
    const cxpTrasPagoParcial = crearCxPFixture({ totalPagado: 59, saldoPendiente: 59, estadoPago: 'parcial' });

    expect(resolverEstadoPagoGasto(cxpTrasPagoParcial)).toBe('parcial');
    expect(gasto.creditTerms?.schedule).toHaveLength(2);
    expect(gasto.creditTerms?.schedule[0].importe).toBe(59);
  });
});

describe('nivelEdicionGasto / puedeEditarGasto (§12 de la corrección: edición completa/limitada/bloqueada; corrección técnica final §10 — pagos ACTIVOS, nunca pagosRelacionados.length)', () => {
  it('un borrador siempre tiene edición completa', () => {
    expect(nivelEdicionGasto({ estadoDocumento: 'borrador' }, undefined, [])).toBe('completa');
    expect(puedeEditarGasto({ estadoDocumento: 'borrador' }, undefined, [])).toBe(true);
  });

  it('un gasto registrado sin pagos aplicados tiene edición completa', () => {
    expect(nivelEdicionGasto({ estadoDocumento: 'registrado' }, undefined, [])).toBe('completa');
    expect(puedeEditarGasto({ estadoDocumento: 'registrado' }, undefined, [])).toBe(true);
  });

  it('un gasto con al menos un pago ACTIVO aplicado tiene edición LIMITADA — la acción Editar sigue disponible, pero restringida a observaciones/adjuntos', () => {
    const cxp = crearCxPFixture({ totalPagado: 118, saldoPendiente: 0, estadoPago: 'pagada', pagosRelacionados: ['pago-1'] });
    const pago = crearPagoFixture({ estadoDocumento: 'registrado' });
    expect(nivelEdicionGasto({ estadoDocumento: 'registrado' }, cxp, [pago])).toBe('limitada');
    expect(puedeEditarGasto({ estadoDocumento: 'registrado' }, cxp, [pago])).toBe(true);
  });

  it('tras anular TODOS los pagos relacionados, la edición vuelve a ser COMPLETA — nunca limitada por el mero historial de `pagosRelacionados` (corrección técnica final §10)', () => {
    const cxp = crearCxPFixture({ totalPagado: 0, saldoPendiente: 118, estadoPago: 'pendiente', pagosRelacionados: ['pago-1'] });
    const pagoAnulado = crearPagoFixture({ estadoDocumento: 'anulado' });
    expect(nivelEdicionGasto({ estadoDocumento: 'registrado' }, cxp, [pagoAnulado])).toBe('completa');
    expect(puedeEditarGasto({ estadoDocumento: 'registrado' }, cxp, [pagoAnulado])).toBe(true);
  });

  it('un gasto anulado tiene edición bloqueada', () => {
    expect(nivelEdicionGasto({ estadoDocumento: 'anulado' }, undefined, [])).toBe('bloqueada');
    expect(puedeEditarGasto({ estadoDocumento: 'anulado' }, undefined, [])).toBe(false);
  });
});

describe('puedeDescartarBorradorGasto (§4/§13 de la corrección — nunca se anula un borrador)', () => {
  it('un borrador puede descartarse', () => {
    expect(puedeDescartarBorradorGasto({ estadoDocumento: 'borrador' })).toBe(true);
  });

  it('un gasto registrado no puede descartarse (se anula, con su propio flujo)', () => {
    expect(puedeDescartarBorradorGasto({ estadoDocumento: 'registrado' })).toBe(false);
  });

  it('un gasto ya anulado no puede "descartarse" de nuevo', () => {
    expect(puedeDescartarBorradorGasto({ estadoDocumento: 'anulado' })).toBe(false);
  });
});

describe('referenciaTecnicaBorradorGasto (§4 de la corrección — nunca simula una numeración oficial)', () => {
  it('genera un identificador estable a partir del id, nunca con el formato de una serie oficial', () => {
    const referencia = referenciaTecnicaBorradorGasto('gasto-123');
    expect(referencia).toBe('BORR-gasto-123');
    expect(referencia).not.toMatch(/^(GTO|G\d{3})-\d+$/);
  });
});

describe('presentarReferenciaGasto — nunca muestra el identificador técnico feo de un borrador (corrección de UX); única fuente para "G001 · Sin correlativo" (corrección técnica final §11)', () => {
  it('un borrador SIN serie elegida muestra "Sin serie · Sin correlativo", nunca "BORR-gasto-xxxxx"', () => {
    const borrador = crearGasto(crearDatosGastoBasicos(), 'gasto-1', referenciaTecnicaBorradorGasto('gasto-1'), 'jperez', 'borrador');
    const presentado = presentarReferenciaGasto(borrador);
    expect(presentado).toBe('Sin serie · Sin correlativo');
    expect(presentado).not.toContain('BORR-');
  });

  it('un borrador CON serie elegida muestra "G001 · Sin correlativo" — MISMA presentación en cualquier consumidor (listado/Drawer/buscador/Excel/impresión/historial/formulario)', () => {
    const series = [{ id: 'series-gto-g001-est-1', series: 'G001' }];
    const borrador = crearGasto(crearDatosGastoBasicos({ serieId: 'series-gto-g001-est-1' }), 'gasto-1', referenciaTecnicaBorradorGasto('gasto-1'), 'jperez', 'borrador');
    expect(presentarReferenciaGasto(borrador, series)).toBe('G001 · Sin correlativo');
  });

  it('un borrador con un serieId que ya no existe en el catálogo (serie desactivada/eliminada) nunca inventa un código — cae a "Sin serie · Sin correlativo"', () => {
    const borrador = crearGasto(crearDatosGastoBasicos({ serieId: 'serie-ya-no-existe' }), 'gasto-1', referenciaTecnicaBorradorGasto('gasto-1'), 'jperez', 'borrador');
    expect(presentarReferenciaGasto(borrador, [])).toBe('Sin serie · Sin correlativo');
  });

  it('un gasto registrado o anulado muestra su referencia interna real', () => {
    const registrado = crearGasto(crearDatosGastoBasicos(), 'gasto-1', 'G001-00000001', 'jperez', 'registrado');
    expect(presentarReferenciaGasto(registrado)).toBe('G001-00000001');

    const anulado = crearGasto(crearDatosGastoBasicos(), 'gasto-1', 'GTO-00000005', 'jperez', 'registrado');
    expect(presentarReferenciaGasto({ ...anulado, estadoDocumento: 'anulado' })).toBe('GTO-00000005');
  });

  it('un borrador DESCARTADO también muestra la etiqueta humana (con o sin serie), nunca "BORR-gasto-xxxxx" (corrección puntual §5 — reutiliza internamente el estado terminal "anulado")', () => {
    const id = 'gasto-descartado-1';
    const descartado = {
      ...crearGasto(crearDatosGastoBasicos(), id, referenciaTecnicaBorradorGasto(id), 'jperez', 'borrador'),
      estadoDocumento: 'anulado' as const,
      motivoAnulacion: MOTIVO_DESCARTE_BORRADOR_GASTO,
    };
    const presentado = presentarReferenciaGasto(descartado);
    expect(presentado).toBe('Sin serie · Sin correlativo');
    expect(presentado).not.toContain('BORR-');
  });
});

describe('esBorradorDescartadoGasto — señal ESTRUCTURADA (tipoCierre), nunca comparación de texto del motivo (corrección técnica final §12)', () => {
  it('un descarte NUEVO se identifica por tipoCierre, aunque el motivo textual sea distinto al histórico fijo', () => {
    const descartado = {
      ...crearGasto(crearDatosGastoBasicos(), 'gasto-1', referenciaTecnicaBorradorGasto('gasto-1'), 'jperez', 'borrador'),
      estadoDocumento: 'anulado' as const,
      motivoAnulacion: 'Ya no se necesita',
      tipoCierre: 'descarte_borrador' as const,
    };
    expect(esBorradorDescartadoGasto(descartado)).toBe(true);
  });

  it('una anulación REAL con tipoCierre "anulacion" nunca se confunde con un descarte, aunque el usuario haya escrito el mismo texto histórico como motivo', () => {
    const anuladoReal = {
      ...crearGasto(crearDatosGastoBasicos(), 'gasto-1', 'GTO-00000005', 'jperez', 'registrado'),
      estadoDocumento: 'anulado' as const,
      motivoAnulacion: MOTIVO_DESCARTE_BORRADOR_GASTO,
      tipoCierre: 'anulacion' as const,
    };
    expect(esBorradorDescartadoGasto(anuladoReal)).toBe(false);
  });

  it('un registro histórico SIN tipoCierre (anulado/descartado antes de esta corrección) cae al criterio de texto como único respaldo de compatibilidad', () => {
    const descartadoHistorico = {
      ...crearGasto(crearDatosGastoBasicos(), 'gasto-1', referenciaTecnicaBorradorGasto('gasto-1'), 'jperez', 'borrador'),
      estadoDocumento: 'anulado' as const,
      motivoAnulacion: MOTIVO_DESCARTE_BORRADOR_GASTO,
    };
    expect(esBorradorDescartadoGasto(descartadoHistorico)).toBe(true);

    const anuladoHistorico = {
      ...crearGasto(crearDatosGastoBasicos(), 'gasto-1', 'GTO-00000005', 'jperez', 'registrado'),
      estadoDocumento: 'anulado' as const,
      motivoAnulacion: 'Gasto duplicado',
    };
    expect(esBorradorDescartadoGasto(anuladoHistorico)).toBe(false);
  });
});

describe('presentarEstadoDocumentoGasto — un borrador descartado se distingue de un gasto genuinamente anulado (corrección puntual §5)', () => {
  it('un gasto registrado muestra "Registrado"', () => {
    const registrado = crearGasto(crearDatosGastoBasicos(), 'gasto-1', 'G001-00000001', 'jperez', 'registrado');
    expect(presentarEstadoDocumentoGasto(registrado)).toBe('Registrado');
  });

  it('un borrador activo muestra "Borrador"', () => {
    const borrador = crearGasto(crearDatosGastoBasicos(), 'gasto-1', referenciaTecnicaBorradorGasto('gasto-1'), 'jperez', 'borrador');
    expect(presentarEstadoDocumentoGasto(borrador)).toBe('Borrador');
  });

  it('un gasto genuinamente anulado muestra "Anulado"', () => {
    const anulado = crearGasto(crearDatosGastoBasicos(), 'gasto-1', 'GTO-00000005', 'jperez', 'registrado');
    expect(presentarEstadoDocumentoGasto({ ...anulado, estadoDocumento: 'anulado', motivoAnulacion: 'Gasto duplicado' })).toBe('Anulado');
  });

  it('un borrador descartado muestra "Borrador descartado" — NUNCA "Anulado" a secas', () => {
    const id = 'gasto-descartado-2';
    const descartado = {
      ...crearGasto(crearDatosGastoBasicos(), id, referenciaTecnicaBorradorGasto(id), 'jperez', 'borrador'),
      estadoDocumento: 'anulado' as const,
      motivoAnulacion: MOTIVO_DESCARTE_BORRADOR_GASTO,
    };
    expect(presentarEstadoDocumentoGasto(descartado)).toBe('Borrador descartado');
  });
});

describe('presentarEstadoVisualGasto — columna "Estado" única, sin fusionar estadoDocumento/estadoPago (§8 de la corrección final)', () => {
  it('un borrador activo muestra "Borrador" sin importar el estado de pago recibido', () => {
    const borrador = crearGasto(crearDatosGastoBasicos(), 'gasto-1', referenciaTecnicaBorradorGasto('gasto-1'), 'jperez', 'borrador');
    expect(presentarEstadoVisualGasto(borrador, 'pendiente')).toBe('Borrador');
  });

  it('un gasto genuinamente anulado muestra "Anulado" sin importar el estado de pago recibido', () => {
    const anulado = { ...crearGasto(crearDatosGastoBasicos(), 'gasto-1', 'GTO-00000005', 'jperez', 'registrado'), estadoDocumento: 'anulado' as const, motivoAnulacion: 'Gasto duplicado' };
    expect(presentarEstadoVisualGasto(anulado, 'parcial')).toBe('Anulado');
  });

  it('un borrador descartado muestra "Borrador descartado" — nunca "Anulado" a secas', () => {
    const id = 'gasto-descartado-3';
    const descartado = {
      ...crearGasto(crearDatosGastoBasicos(), id, referenciaTecnicaBorradorGasto(id), 'jperez', 'borrador'),
      estadoDocumento: 'anulado' as const,
      motivoAnulacion: MOTIVO_DESCARTE_BORRADOR_GASTO,
    };
    expect(presentarEstadoVisualGasto(descartado, 'pendiente')).toBe('Borrador descartado');
  });

  it('registrado + pendiente muestra "Pendiente"', () => {
    const registrado = crearGasto(crearDatosGastoBasicos(), 'gasto-1', 'G001-00000001', 'jperez', 'registrado');
    expect(presentarEstadoVisualGasto(registrado, 'pendiente')).toBe('Pendiente');
  });

  it('registrado + parcial muestra "Pago parcial"', () => {
    const registrado = crearGasto(crearDatosGastoBasicos(), 'gasto-1', 'G001-00000001', 'jperez', 'registrado');
    expect(presentarEstadoVisualGasto(registrado, 'parcial')).toBe('Pago parcial');
  });

  it('registrado + pagado muestra "Pagado"', () => {
    const registrado = crearGasto(crearDatosGastoBasicos(), 'gasto-1', 'G001-00000001', 'jperez', 'registrado');
    expect(presentarEstadoVisualGasto(registrado, 'pagado')).toBe('Pagado');
  });
});

describe('presentarClaseEstadoVisualGasto — reutiliza los MISMOS badges por dimensión, nunca un color paralelo', () => {
  it('borrador y anulado reutilizan BADGE_ESTADO_DOCUMENTO_GASTO', () => {
    const borrador = crearGasto(crearDatosGastoBasicos(), 'gasto-1', referenciaTecnicaBorradorGasto('gasto-1'), 'jperez', 'borrador');
    const anulado = { ...crearGasto(crearDatosGastoBasicos(), 'gasto-1', 'GTO-00000005', 'jperez', 'registrado'), estadoDocumento: 'anulado' as const, motivoAnulacion: 'Gasto duplicado' };
    expect(presentarClaseEstadoVisualGasto(borrador, 'pendiente')).toContain('gray');
    expect(presentarClaseEstadoVisualGasto(anulado, 'pendiente')).not.toBe(presentarClaseEstadoVisualGasto(borrador, 'pendiente'));
  });

  it('pendiente/parcial/pagado reutilizan BADGE_ESTADO_PAGO — cada uno con una clase distinta', () => {
    const registrado = crearGasto(crearDatosGastoBasicos(), 'gasto-1', 'G001-00000001', 'jperez', 'registrado');
    const clasePendiente = presentarClaseEstadoVisualGasto(registrado, 'pendiente');
    const claseParcial = presentarClaseEstadoVisualGasto(registrado, 'parcial');
    const clasePagado = presentarClaseEstadoVisualGasto(registrado, 'pagado');
    expect(new Set([clasePendiente, claseParcial, clasePagado]).size).toBe(3);
  });
});

describe('convertirBorradorEnRegistrado (§5/§16 de la corrección)', () => {
  it('asigna la referencia interna oficial y cambia el estado a registrado, conservando id/fechaCreacion/historial previo', () => {
    const borrador = crearGasto(crearDatosGastoBasicos(), 'gasto-1', referenciaTecnicaBorradorGasto('gasto-1'), 'jperez', 'borrador');
    const registrado = convertirBorradorEnRegistrado(borrador, 'G001-00000001', 'jperez');

    expect(registrado.id).toBe(borrador.id);
    expect(registrado.fechaCreacion).toBe(borrador.fechaCreacion);
    expect(registrado.estadoDocumento).toBe('registrado');
    expect(registrado.referenciaInterna).toBe('G001-00000001');
    expect(registrado.historial.length).toBe(borrador.historial.length + 1);
    expect(registrado.historial.at(-1)?.accion).toBe('Gasto registrado desde borrador');
  });

  it('preserva la claveIdempotencia de la conversión — el reintento de "Registrar" sobre el mismo borrador se puede deduplicar después (§13 de la corrección final)', () => {
    const borrador = crearGasto(crearDatosGastoBasicos(), 'gasto-1', referenciaTecnicaBorradorGasto('gasto-1'), 'jperez', 'borrador');
    // La conversión real reconstruye el gasto con los datos ACTUALES del
    // formulario (incluida su claveIdempotencia) antes de convertirlo.
    const actualizadoConDatos = crearGasto(crearDatosGastoBasicos({ claveIdempotencia: 'clave-conversion-1' }), borrador.id, borrador.referenciaInterna, borrador.creadoPor, 'borrador');
    const registrado = convertirBorradorEnRegistrado({ ...actualizadoConDatos, historial: borrador.historial, fechaCreacion: borrador.fechaCreacion }, 'G001-00000001', 'jperez');

    expect(registrado.claveIdempotencia).toBe('clave-conversion-1');
    expect(buscarGastoPorClaveIdempotencia([registrado], 'clave-conversion-1')).toBe(registrado);
  });
});

describe('buscarGastoPorClaveIdempotencia (§13 de la corrección final)', () => {
  it('encuentra el gasto cuya claveIdempotencia coincide', () => {
    const gasto = crearGasto(crearDatosGastoBasicos({ claveIdempotencia: 'clave-x' }), 'gasto-1', 'G001-00000001', 'jperez', 'registrado');
    expect(buscarGastoPorClaveIdempotencia([gasto], 'clave-x')).toBe(gasto);
  });

  it('devuelve undefined cuando ningún gasto tiene esa clave', () => {
    const gasto = crearGasto(crearDatosGastoBasicos({ claveIdempotencia: 'clave-x' }), 'gasto-1', 'G001-00000001', 'jperez', 'registrado');
    expect(buscarGastoPorClaveIdempotencia([gasto], 'clave-otra')).toBeUndefined();
  });

  it('nunca compara undefined === undefined: dos gastos sin clave jamás se consideran el mismo', () => {
    const sinClave1 = crearGasto(crearDatosGastoBasicos(), 'gasto-1', 'G001-00000001', 'jperez', 'registrado');
    crearGasto(crearDatosGastoBasicos(), 'gasto-2', 'G001-00000002', 'jperez', 'registrado');
    expect(buscarGastoPorClaveIdempotencia([sinClave1], undefined)).toBeUndefined();
  });
});

describe('motivoBloqueoAnulacionGasto / puedeAnularGasto (§20-A)', () => {
  it('un gasto ya anulado no puede volver a anularse', () => {
    const motivo = motivoBloqueoAnulacionGasto({ estadoDocumento: 'anulado' }, undefined, []);
    expect(motivo).not.toBeNull();
    expect(puedeAnularGasto({ estadoDocumento: 'anulado' }, undefined, [])).toBe(false);
  });

  it('un gasto sin CxP (no debería ocurrir, pero es seguro) puede anularse', () => {
    expect(puedeAnularGasto({ estadoDocumento: 'registrado' }, undefined, [])).toBe(true);
  });

  it('un gasto con CxP pendiente (sin pagos activos) puede anularse', () => {
    const cxp = crearCxPFixture({ totalPagado: 0, saldoPendiente: 118, estadoPago: 'pendiente' });
    expect(puedeAnularGasto({ estadoDocumento: 'registrado' }, cxp, [])).toBe(true);
  });

  it('un gasto con pagos activos NO puede anularse — hay que anular primero los pagos', () => {
    const cxp = crearCxPFixture({ totalPagado: 118, saldoPendiente: 0, estadoPago: 'pagada', pagosRelacionados: ['pago-1'] });
    const pago = crearPagoFixture({ estadoDocumento: 'registrado' });
    const motivo = motivoBloqueoAnulacionGasto({ estadoDocumento: 'registrado' }, cxp, [pago]);
    expect(motivo).not.toBeNull();
    expect(puedeAnularGasto({ estadoDocumento: 'registrado' }, cxp, [pago])).toBe(false);
  });

  it('tras anular TODOS los pagos relacionados (gasto vuelve a Registrado+Pendiente), "Anular gasto" se habilita de nuevo (§12 de la corrección final)', () => {
    const cxp = crearCxPFixture({ totalPagado: 0, saldoPendiente: 118, estadoPago: 'pendiente', pagosRelacionados: ['pago-1'] });
    const pagoAnulado = crearPagoFixture({ estadoDocumento: 'anulado' });
    const motivo = motivoBloqueoAnulacionGasto({ estadoDocumento: 'registrado' }, cxp, [pagoAnulado]);
    expect(motivo).toBeNull();
    expect(puedeAnularGasto({ estadoDocumento: 'registrado' }, cxp, [pagoAnulado])).toBe(true);
  });
});

describe('datosParaDuplicarGasto — nunca un clon silencioso', () => {
  it('copia los datos financieros/de identificación, pero omite fecha de reconocimiento, observaciones y adjuntos', () => {
    const original = crearGasto(crearDatosGastoBasicos({ observaciones: 'nota original' }), 'gasto-1', 'GTO-00000001', 'usuario-1');
    const prefill = datosParaDuplicarGasto(original);
    expect(prefill.concepto).toBe(original.concepto);
    expect(prefill.total).toBe(original.total);
    expect('fechaReconocimiento' in prefill).toBe(false);
    expect('observaciones' in prefill).toBe(false);
    expect('adjuntos' in prefill).toBe(false);
  });
});

describe('moneda extranjera / tipo de cambio faltante (§20-A)', () => {
  it('un gasto en moneda extranjera sin tipo de cambio se crea igual (la validación de TC es responsabilidad de Rentabilidad Operativa, no del registro)', () => {
    const gasto = crearGasto(crearDatosGastoBasicos({ moneda: 'USD', tipoCambio: undefined }), 'gasto-usd-1', 'GTO-00000006');
    expect(gasto.moneda).toBe('USD');
    expect(gasto.tipoCambio).toBeUndefined();
  });
});

describe('filtrarErroresVigentes — revalidación reactiva de campo (corrección final puntual §1)', () => {
  it('error inicial: un campo recién marcado inválido se conserva tal cual', () => {
    const base = { concepto: 'El concepto es obligatorio.' };
    const frescos = [{ campo: 'concepto', mensaje: 'El concepto es obligatorio.' }];
    expect(filtrarErroresVigentes(base, frescos)).toEqual({ concepto: 'El concepto es obligatorio.' });
  });

  it('corrección de concepto: el campo desaparece de inmediato en cuanto la validación fresca ya no lo reporta', () => {
    const base = { concepto: 'El concepto es obligatorio.' };
    const frescos: Array<{ campo: string; mensaje: string }> = []; // el concepto ya tiene texto válido
    expect(filtrarErroresVigentes(base, frescos)).toEqual({});
  });

  it('selección válida de proveedor: "beneficiario" desaparece en cuanto proveedorId/proveedorNombre quedan completos', () => {
    const base = { beneficiario: 'Indica un proveedor o un beneficiario.' };
    const frescos: Array<{ campo: string; mensaje: string }> = []; // proveedor válido seleccionado
    expect(filtrarErroresVigentes(base, frescos)).toEqual({});
  });

  it('beneficiario libre válido: el error de "beneficiario" también desaparece cuando el texto libre ya es válido', () => {
    const base = { beneficiario: 'Indica un proveedor o un beneficiario.' };
    const frescos: Array<{ campo: string; mensaje: string }> = [];
    expect(filtrarErroresVigentes(base, frescos)).toEqual({});
  });

  it('retiro del proveedor: si el usuario quita el proveedor sin indicar beneficiario, el campo vuelve a marcarse inválido', () => {
    const base = { beneficiario: 'Indica un proveedor o un beneficiario.' };
    const frescos = [{ campo: 'beneficiario', mensaje: 'Indica un proveedor o un beneficiario.' }];
    expect(filtrarErroresVigentes(base, frescos)).toEqual({ beneficiario: 'Indica un proveedor o un beneficiario.' });
  });

  it('valor todavía inválido: el mensaje se actualiza si la regla fresca produce un texto distinto para el mismo campo', () => {
    const base = { total: 'El total debe ser mayor a 0.' };
    const frescos = [{ campo: 'total', mensaje: 'El total debe ser mayor a 0.' }];
    expect(filtrarErroresVigentes(base, frescos)).toEqual({ total: 'El total debe ser mayor a 0.' });
  });

  it('varios errores y corrección individual: solo el campo corregido desaparece, el resto permanece', () => {
    const base = {
      concepto: 'El concepto es obligatorio.',
      total: 'El total debe ser mayor a 0.',
      categoriaId: 'La categoría es obligatoria.',
    };
    // Solo "concepto" ya no aparece en la validación fresca (el usuario lo corrigió) — total y categoriaId siguen inválidos.
    const frescos = [
      { campo: 'total', mensaje: 'El total debe ser mayor a 0.' },
      { campo: 'categoriaId', mensaje: 'La categoría es obligatoria.' },
    ];
    expect(filtrarErroresVigentes(base, frescos)).toEqual({
      total: 'El total debe ser mayor a 0.',
      categoriaId: 'La categoría es obligatoria.',
    });
  });

  it('nunca agrega un campo nuevo que no estaba en el mapa base, aunque la validación fresca lo reporte', () => {
    const base = { concepto: 'El concepto es obligatorio.' };
    // La validación fresca reporta un campo DISTINTO (p. ej. el usuario aún no tocó "total") — no debe aparecer todavía.
    const frescos = [
      { campo: 'concepto', mensaje: 'El concepto es obligatorio.' },
      { campo: 'total', mensaje: 'El total debe ser mayor a 0.' },
    ];
    expect(filtrarErroresVigentes(base, frescos)).toEqual({ concepto: 'El concepto es obligatorio.' });
  });

  it('un mapa base vacío (sin intento de envío previo) siempre produce un resultado vacío', () => {
    expect(filtrarErroresVigentes({}, [{ campo: 'concepto', mensaje: 'El concepto es obligatorio.' }])).toEqual({});
  });
});

describe('motivoBloqueoEfectivoMonedaExtranjera (GAS-P1-004)', () => {
  function crearMedio(codigo: string, monto: number): MedioPagoCompra {
    return { id: `medio-${codigo}`, medioPagoCodigo: codigo, medioPagoNombre: codigo, monto };
  }
  const EFECTIVO = '008'; // catálogo 59 SUNAT
  const TRANSFERENCIA = '003';

  it('gasto en moneda base pagado en efectivo: permitido', () => {
    expect(motivoBloqueoEfectivoMonedaExtranjera('PEN', 'PEN', [crearMedio(EFECTIVO, 100)])).toBeNull();
  });

  it('gasto en moneda extranjera pagado en efectivo: rechazado', () => {
    const motivo = motivoBloqueoEfectivoMonedaExtranjera('USD', 'PEN', [crearMedio(EFECTIVO, 100)]);
    expect(motivo).not.toBeNull();
    expect(motivo).toBe('No se puede registrar un pago en efectivo porque la moneda del gasto es distinta de la moneda base de la empresa.');
  });

  it('gasto en moneda extranjera pagado por transferencia (no impacta Caja): permitido', () => {
    expect(motivoBloqueoEfectivoMonedaExtranjera('USD', 'PEN', [crearMedio(TRANSFERENCIA, 100)])).toBeNull();
  });

  it('mezcla de medios que incluye efectivo, en moneda extranjera: la operación COMPLETA se rechaza', () => {
    const motivo = motivoBloqueoEfectivoMonedaExtranjera('USD', 'PEN', [crearMedio(TRANSFERENCIA, 60), crearMedio(EFECTIVO, 40)]);
    expect(motivo).not.toBeNull();
  });

  it('mezcla de medios SIN efectivo, en moneda extranjera: permitido', () => {
    const motivo = motivoBloqueoEfectivoMonedaExtranjera('USD', 'PEN', [crearMedio(TRANSFERENCIA, 60), crearMedio('005', 40)]);
    expect(motivo).toBeNull();
  });

  it('un medio de caja con monto 0 (línea vacía) no dispara el bloqueo por sí solo', () => {
    expect(motivoBloqueoEfectivoMonedaExtranjera('USD', 'PEN', [crearMedio(EFECTIVO, 0)])).toBeNull();
  });

  it('el mensaje de bloqueo no contiene ningún código ni símbolo de moneda hardcodeado', () => {
    const motivo = motivoBloqueoEfectivoMonedaExtranjera('USD', 'PEN', [crearMedio(EFECTIVO, 100)]);
    expect(motivo).not.toMatch(/USD|PEN|S\/|\$/);
  });

  it('sin moneda base resuelta (config incompleta): no bloquea por defecto en vez de fallar', () => {
    expect(motivoBloqueoEfectivoMonedaExtranjera('USD', '', [crearMedio(EFECTIVO, 100)])).toBeNull();
  });
});

describe('normalizarMotivoAnulacion (anular gasto / anular pago de gasto)', () => {
  it('rechaza cadena vacía', () => {
    expect(() => normalizarMotivoAnulacion('')).toThrow('Ingresa un motivo de anulación.');
  });

  it('rechaza un motivo con solo espacios', () => {
    expect(() => normalizarMotivoAnulacion('   ')).toThrow('Ingresa un motivo de anulación.');
  });

  it('rechaza un valor inexistente (undefined)', () => {
    expect(() => normalizarMotivoAnulacion(undefined)).toThrow('Ingresa un motivo de anulación.');
  });

  it('acepta un motivo válido y devuelve el texto recortado', () => {
    expect(normalizarMotivoAnulacion('  Gasto duplicado  ')).toBe('Gasto duplicado');
  });
});
