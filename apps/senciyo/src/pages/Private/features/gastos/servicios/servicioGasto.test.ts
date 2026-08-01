import { describe, it, expect } from 'vitest';
import {
  validarGastoBasico,
  crearGasto,
  importeReconocidoComoGasto,
  resolverEstadoPagoGasto,
  puedeEditarGasto,
  motivoBloqueoAnulacionGasto,
  puedeAnularGasto,
  datosParaDuplicarGasto,
  type DatosNuevoGasto,
} from './servicioGasto';
import type { CuentaPorPagar } from '../../compras/modelos/CuentaPorPagar';
import type { PagoCompra } from '../../compras/modelos/PagoCompra';

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
    expect(validarGastoBasico(crearDatosGastoBasicos())).toEqual([]);
  });

  it('exige proveedor O beneficiario — sin ninguno de los dos, falla', () => {
    const errores = validarGastoBasico(crearDatosGastoBasicos({ beneficiario: undefined, proveedorId: undefined }));
    expect(errores.some((e) => e.campo === 'beneficiario')).toBe(true);
  });

  it('con proveedorId presente, no exige beneficiario', () => {
    const errores = validarGastoBasico(crearDatosGastoBasicos({ beneficiario: undefined, proveedorId: 'prov-1' }));
    expect(errores.some((e) => e.campo === 'beneficiario')).toBe(false);
  });

  it('exige categoría, concepto, fecha de reconocimiento y total > 0', () => {
    const errores = validarGastoBasico({});
    expect(errores.map((e) => e.campo).sort()).toEqual(['beneficiario', 'categoriaId', 'concepto', 'fechaReconocimiento', 'total'].sort());
  });

  it('gasto al crédito sin fecha de vencimiento falla', () => {
    const errores = validarGastoBasico(crearDatosGastoBasicos({ condicionPago: 'credito' }));
    expect(errores.some((e) => e.campo === 'fechaVencimiento')).toBe(true);
  });

  it('gasto al crédito CON fecha de vencimiento no falla por ese campo', () => {
    const errores = validarGastoBasico(crearDatosGastoBasicos({ condicionPago: 'credito', fechaVencimiento: '2026-08-01' }));
    expect(errores.some((e) => e.campo === 'fechaVencimiento')).toBe(false);
  });
});

describe('crearGasto', () => {
  it('nace siempre en estado "registrado" — nunca "borrador"', () => {
    const gasto = crearGasto(crearDatosGastoBasicos(), 'gasto-1', 'usuario-1');
    expect(gasto.estadoDocumento).toBe('registrado');
  });

  it('sin proveedorId, conserva el beneficiario de texto libre', () => {
    const gasto = crearGasto(crearDatosGastoBasicos({ proveedorId: undefined, beneficiario: 'Movilidad conductor' }), 'gasto-2');
    expect(gasto.beneficiario).toBe('Movilidad conductor');
    expect(gasto.proveedorId).toBeUndefined();
  });

  it('con proveedorId, el beneficiario de texto libre se descarta (nunca ambos a la vez)', () => {
    const gasto = crearGasto(crearDatosGastoBasicos({ proveedorId: 'prov-1', beneficiario: 'texto que no debería guardarse' }), 'gasto-3');
    expect(gasto.proveedorId).toBe('prov-1');
    expect(gasto.beneficiario).toBeUndefined();
  });

  it('gasto al contado nunca guarda fecha de vencimiento, aunque se haya enviado una', () => {
    const gasto = crearGasto(crearDatosGastoBasicos({ condicionPago: 'contado', fechaVencimiento: '2026-08-01' }), 'gasto-4');
    expect(gasto.fechaVencimiento).toBeUndefined();
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
});

describe('puedeEditarGasto', () => {
  it('un gasto registrado sin pagos aplicados puede editarse', () => {
    expect(puedeEditarGasto({ estadoDocumento: 'registrado', pagosRelacionados: [] })).toBe(true);
  });

  it('un gasto con al menos un pago aplicado ya no puede editarse', () => {
    expect(puedeEditarGasto({ estadoDocumento: 'registrado', pagosRelacionados: ['pago-1'] })).toBe(false);
  });

  it('un gasto anulado no puede editarse', () => {
    expect(puedeEditarGasto({ estadoDocumento: 'anulado', pagosRelacionados: [] })).toBe(false);
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
});

describe('datosParaDuplicarGasto — nunca un clon silencioso', () => {
  it('copia los datos financieros/de identificación, pero omite fecha de reconocimiento, observaciones y adjuntos', () => {
    const original = crearGasto(crearDatosGastoBasicos({ observaciones: 'nota original' }), 'gasto-1', 'usuario-1');
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
    const gasto = crearGasto(crearDatosGastoBasicos({ moneda: 'USD', tipoCambio: undefined }), 'gasto-usd-1');
    expect(gasto.moneda).toBe('USD');
    expect(gasto.tipoCambio).toBeUndefined();
  });
});
