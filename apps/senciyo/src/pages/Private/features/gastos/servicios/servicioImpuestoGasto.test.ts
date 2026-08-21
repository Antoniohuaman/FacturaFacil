import { describe, it, expect } from 'vitest';
import {
  listarImpuestosConfiguradosGasto,
  resolverImpuestoGasto,
  calcularImportesGastoDesdeSubtotal,
  calcularImportesGastoDesdeTotal,
  calcularImportesGastoSinDesglose,
} from './servicioImpuestoGasto';
import type { Tax } from '../../configuracion-sistema/modelos/Tax';

function crearTaxFixture(overrides: Partial<Tax> = {}): Tax {
  return {
    id: 'tax-igv',
    code: 'IGV',
    name: 'IGV',
    shortName: 'IGV',
    type: 'PERCENTAGE',
    rate: 18,
    sunatCode: '1000',
    sunatName: 'IGV',
    sunatType: 'VAT',
    affectationCode: '10',
    affectationName: 'Gravado',
    category: 'PURCHASE',
    includeInPrice: false,
    isCompound: false,
    isActive: true,
    ...overrides,
  } as Tax;
}

describe('listarImpuestosConfiguradosGasto — tasa SIEMPRE desde configuración, nunca hardcodeada', () => {
  it('expone solo los impuestos activos, con la tasa como fracción (no 0-100 crudo)', () => {
    const taxes = [crearTaxFixture(), crearTaxFixture({ id: 'tax-exonerado', name: 'Exonerado', rate: 0, isActive: false })];
    const disponibles = listarImpuestosConfiguradosGasto(taxes);
    expect(disponibles).toHaveLength(1);
    expect(disponibles[0].id).toBe('tax-igv');
    expect(disponibles[0].tasa).toBe(0.18);
  });

  it('una tasa distinta configurada (ej. 10%) se refleja sin ningún hardcode de 18%', () => {
    const taxes = [crearTaxFixture({ id: 'tax-10', rate: 10 })];
    expect(listarImpuestosConfiguradosGasto(taxes)[0].tasa).toBe(0.1);
  });
});

describe('resolverImpuestoGasto', () => {
  it('sin impuestoId, devuelve null (nunca asume una tasa)', () => {
    expect(resolverImpuestoGasto(undefined, [crearTaxFixture()])).toBeNull();
  });

  it('impuestoId inexistente o inactivo, devuelve null', () => {
    const taxes = [crearTaxFixture({ id: 'tax-inactivo', isActive: false })];
    expect(resolverImpuestoGasto('tax-inactivo', taxes)).toBeNull();
    expect(resolverImpuestoGasto('no-existe', taxes)).toBeNull();
  });

  it('impuestoId activo resuelve nombre y tasa desde la configuración', () => {
    const resuelto = resolverImpuestoGasto('tax-igv', [crearTaxFixture()]);
    expect(resuelto).not.toBeNull();
    expect(resuelto!.tasa).toBe(0.18);
    expect(resuelto!.nombre).toContain('18%');
  });

  it('un impuesto de monto fijo (ej. ICBPER) nunca se resuelve como fracción — devuelve null', () => {
    const icbper = crearTaxFixture({ id: 'tax-icbper', type: 'FIXED_AMOUNT', rate: 0.5, affectationCode: undefined });
    expect(resolverImpuestoGasto('tax-icbper', [icbper])).toBeNull();
  });
});

describe('listarImpuestosConfiguradosGasto — filtros contextuales de Gastos (auditoría de fuentes de verdad §20/§21)', () => {
  it('excluye impuestos de monto fijo (type !== PERCENTAGE) — nunca se ofrecen para calcularse como fracción', () => {
    const igv = crearTaxFixture();
    const icbper = crearTaxFixture({ id: 'tax-icbper', name: 'ICBPER', type: 'FIXED_AMOUNT', rate: 0.5, affectationCode: undefined });
    const disponibles = listarImpuestosConfiguradosGasto([igv, icbper]);
    expect(disponibles.map((d) => d.id)).toEqual(['tax-igv']);
  });

  it('sin tratamientoImpuesto (o distinto de "recuperable"), no filtra por afectación', () => {
    const gravado = crearTaxFixture();
    const exonerado = crearTaxFixture({ id: 'tax-exo', name: 'Exonerado', rate: 0, affectationCode: '20' });
    expect(listarImpuestosConfiguradosGasto([gravado, exonerado]).map((d) => d.id)).toEqual(['tax-igv', 'tax-exo']);
    expect(listarImpuestosConfiguradosGasto([gravado, exonerado], 'no_recuperable').map((d) => d.id)).toEqual(['tax-igv', 'tax-exo']);
  });

  it('con tratamientoImpuesto "recuperable", solo ofrece impuestos Gravados (afectación \'10\') — Exonerado/Inafecto/Exportación no tienen IGV que recuperar', () => {
    const gravado = crearTaxFixture();
    const exonerado = crearTaxFixture({ id: 'tax-exo', name: 'Exonerado', rate: 0, affectationCode: '20' });
    const inafecto = crearTaxFixture({ id: 'tax-ina', name: 'Inafecto', rate: 0, affectationCode: '30' });
    const disponibles = listarImpuestosConfiguradosGasto([gravado, exonerado, inafecto], 'recuperable');
    expect(disponibles.map((d) => d.id)).toEqual(['tax-igv']);
  });
});

describe('calcularImportesGastoDesdeSubtotal (A: ingreso desde subtotal)', () => {
  it('subtotal 100 con tasa 18% → impuesto 18, total 118', () => {
    expect(calcularImportesGastoDesdeSubtotal(100, 0.18)).toEqual({ subtotal: 100, impuesto: 18, total: 118 });
  });

  it('tasa 0 (sin impuesto real) → impuesto 0, total = subtotal', () => {
    expect(calcularImportesGastoDesdeSubtotal(100, 0)).toEqual({ subtotal: 100, impuesto: 0, total: 100 });
  });

  it('redondea a 2 decimales', () => {
    const resultado = calcularImportesGastoDesdeSubtotal(33.333, 0.18);
    expect(resultado.subtotal).toBe(33.33);
    expect(Number.isInteger(resultado.impuesto * 100)).toBe(true);
  });
});

describe('calcularImportesGastoDesdeTotal (B: ingreso desde total)', () => {
  it('total 118 con tasa 18% → subtotal 100, impuesto 18', () => {
    expect(calcularImportesGastoDesdeTotal(118, 0.18)).toEqual({ subtotal: 100, impuesto: 18, total: 118 });
  });

  it('tasa 0 → subtotal = total, impuesto 0', () => {
    expect(calcularImportesGastoDesdeTotal(100, 0)).toEqual({ subtotal: 100, impuesto: 0, total: 100 });
  });

  it('es la inversa exacta de calcularImportesGastoDesdeSubtotal (mismo motor en ambas direcciones)', () => {
    const desdeSubtotal = calcularImportesGastoDesdeSubtotal(250, 0.18);
    const desdeTotal = calcularImportesGastoDesdeTotal(desdeSubtotal.total, 0.18);
    expect(desdeTotal).toEqual(desdeSubtotal);
  });
});

describe('calcularImportesGastoSinDesglose', () => {
  it('el total registrado es el importe completo, sin separar impuesto', () => {
    expect(calcularImportesGastoSinDesglose(118)).toEqual({ subtotal: 118, impuesto: 0, total: 118 });
  });
});
