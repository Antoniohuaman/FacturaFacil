import { describe, it, expect } from 'vitest';
import { resolverImpuestoPredeterminado } from './Tax';
import type { Tax } from './Tax';

function crearTax(overrides: Partial<Tax> = {}): Tax {
  return {
    id: 'tax-igv18',
    code: 'IGV18',
    name: 'IGV 18%',
    shortName: 'IGV 18%',
    type: 'PERCENTAGE',
    rate: 18,
    sunatCode: '1000',
    sunatName: 'IGV - Impuesto General a las Ventas',
    sunatType: 'VAT',
    affectationCode: '10',
    affectationName: 'Gravado - Operación Onerosa',
    category: 'SALES',
    includeInPrice: false,
    isCompound: false,
    applicableTo: { products: true, services: true, both: true },
    rules: { roundingMethod: 'ROUND', roundingPrecision: 2 },
    jurisdiction: { country: 'PE' },
    isDefault: false,
    isActive: true,
    validFrom: new Date('2011-03-01'),
    validTo: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('resolverImpuestoPredeterminado — misma regla real que Afectaciones Tributarias (tax.isDefault)', () => {
  it('empresa con IGV 18% marcado como predeterminado: producto nuevo recibe ese Tax', () => {
    const taxes = [
      crearTax({ id: 'tax-igv18', code: 'IGV18', rate: 18, isDefault: true }),
      crearTax({ id: 'tax-igv10', code: 'IGV10', rate: 10, isDefault: false }),
    ];
    const r = resolverImpuestoPredeterminado(taxes);
    expect(r?.id).toBe('tax-igv18');
    expect(r?.rate).toBe(18);
  });

  it('empresa con IGV 10% marcado como predeterminado: producto nuevo recibe IGV 10%, no 18% hardcodeado', () => {
    const taxes = [
      crearTax({ id: 'tax-igv18', code: 'IGV18', rate: 18, isDefault: false }),
      crearTax({ id: 'tax-igv10', code: 'IGV10', rate: 10, isDefault: true }),
    ];
    const r = resolverImpuestoPredeterminado(taxes);
    expect(r?.id).toBe('tax-igv10');
    expect(r?.rate).toBe(10);
  });

  it('empresa con Exonerado marcado como predeterminado: producto nuevo recibe Exonerado, tasa 0 real', () => {
    const taxes = [
      crearTax({ id: 'tax-igv18', code: 'IGV18', rate: 18, isDefault: false }),
      crearTax({ id: 'tax-exo', code: 'EXO', name: 'Exonerado', rate: 0, affectationCode: '20', isDefault: true }),
    ];
    const r = resolverImpuestoPredeterminado(taxes);
    expect(r?.id).toBe('tax-exo');
    expect(r?.rate).toBe(0);
  });

  it('empresa sin ningún impuesto marcado como predeterminado: no selecciona el primer elemento — devuelve undefined', () => {
    const taxes = [
      crearTax({ id: 'tax-igv18', code: 'IGV18', rate: 18, isDefault: false }),
      crearTax({ id: 'tax-igv10', code: 'IGV10', rate: 10, isDefault: false }),
    ];
    const r = resolverImpuestoPredeterminado(taxes);
    expect(r).toBeUndefined();
    expect(r?.id).not.toBe('tax-igv18');
  });

  it('arreglo de impuestos vacío: devuelve undefined, nunca inventa un Tax', () => {
    expect(resolverImpuestoPredeterminado([])).toBeUndefined();
  });

  it('un Tax marcado isDefault pero inactivo no cuenta como predeterminado real', () => {
    const taxes = [crearTax({ id: 'tax-igv18', isDefault: true, isActive: false })];
    expect(resolverImpuestoPredeterminado(taxes)).toBeUndefined();
  });

  it('cambiar cuál Tax está marcado como predeterminado no altera los demás Tax del arreglo (sin efectos secundarios)', () => {
    const taxes = [
      crearTax({ id: 'tax-igv18', isDefault: true }),
      crearTax({ id: 'tax-igv10', code: 'IGV10', isDefault: false }),
    ];
    const snapshot = structuredClone(taxes);
    resolverImpuestoPredeterminado(taxes);
    expect(taxes).toEqual(snapshot);
  });
});
