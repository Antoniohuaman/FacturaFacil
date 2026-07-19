import { describe, it, expect } from 'vitest';
import {
  parsearEtiquetaImpuesto,
  resolverTratamientoTributarioProducto,
  motivoImpuestoSinResolver,
} from './resolucionTributaria';
import type { Tax } from '../../pages/Private/features/configuracion-sistema/modelos/Tax';

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
    category: 'PURCHASE',
    includeInPrice: false,
    isCompound: false,
    applicableTo: { products: true, services: true, both: true },
    rules: { roundingMethod: 'ROUND', roundingPrecision: 2 },
    jurisdiction: { country: 'PE' },
    isDefault: true,
    isActive: true,
    validFrom: new Date('2011-03-01'),
    validTo: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('parsearEtiquetaImpuesto', () => {
  it('etiqueta con porcentaje resuelve gravado con la tasa exacta (tasa real, nunca 18% fijo)', () => {
    expect(parsearEtiquetaImpuesto('IGV (18.00%)')).toEqual({ categoria: 'gravado', tasa: 0.18 });
    expect(parsearEtiquetaImpuesto('IGV (10.00%)')).toEqual({ categoria: 'gravado', tasa: 0.1 });
  });

  it('"Exonerado" resuelve exonerado, tasa 0', () => {
    expect(parsearEtiquetaImpuesto('Exonerado (0.00%)')).toEqual({ categoria: 'exonerado', tasa: 0 });
  });

  it('"Inafecto" resuelve inafecto, tasa 0', () => {
    expect(parsearEtiquetaImpuesto('Inafecto')).toEqual({ categoria: 'inafecto', tasa: 0 });
  });

  it('"Exportación" resuelve exportacion, tasa 0 — nunca confundida con exonerado', () => {
    const r = parsearEtiquetaImpuesto('Exportación (0.00%)');
    expect(r.categoria).toBe('exportacion');
    expect(r.categoria).not.toBe('exonerado');
  });

  it('"gratuita" resuelve su propia categoría, tasa 0', () => {
    expect(parsearEtiquetaImpuesto('Operación gratuita')).toEqual({ categoria: 'gratuita', tasa: 0 });
  });

  it('ausente o vacía resuelve sin_configurar — nunca asume 18%', () => {
    expect(parsearEtiquetaImpuesto(undefined)).toEqual({ categoria: 'sin_configurar', tasa: 0 });
    expect(parsearEtiquetaImpuesto('')).toEqual({ categoria: 'sin_configurar', tasa: 0 });
  });

  it('texto sin porcentaje ni palabra clave resuelve sin_configurar, nunca 18% por defecto', () => {
    const r = parsearEtiquetaImpuesto('N/A');
    expect(r.categoria).toBe('sin_configurar');
    expect(r.tasa).toBe(0);
  });
});

describe('resolverTratamientoTributarioProducto — prioridad impuestoId → Tax → texto legado', () => {
  it('producto con impuestoId resuelve desde Tax (tasa configurada, no 18% fijo por casualidad)', () => {
    const taxes = [crearTax({ id: 'tax-1', rate: 10, affectationCode: '10' })];
    const r = resolverTratamientoTributarioProducto({ impuestoId: 'tax-1' }, 'impuesto_recuperable', taxes);
    expect(r.origenResolucion).toBe('impuesto_estructurado');
    expect(r.tasa).toBe(0.1);
    expect(r.codigoAfectacion).toBe('10');
    expect(r.impuestoId).toBe('tax-1');
  });

  it('cuando existe impuestoId resoluble, cambiar el texto libre (impuestoTexto) no cambia el resultado', () => {
    const taxes = [crearTax({ id: 'tax-1', rate: 18, affectationCode: '10' })];
    const conTextoA = resolverTratamientoTributarioProducto({ impuestoId: 'tax-1', impuestoTexto: 'Exonerado (0.00%)' }, 'impuesto_recuperable', taxes);
    const conTextoB = resolverTratamientoTributarioProducto({ impuestoId: 'tax-1', impuestoTexto: 'Cualquier otra cosa' }, 'impuesto_recuperable', taxes);
    expect(conTextoA.tasa).toBe(0.18);
    expect(conTextoA.codigoAfectacion).toBe('10');
    expect(conTextoA).toEqual(conTextoB);
  });

  it('gravado usa la tasa configurada en Tax, no un 18% hardcodeado', () => {
    const taxes = [crearTax({ id: 'tax-1', rate: 7.5, affectationCode: '10' })];
    const r = resolverTratamientoTributarioProducto({ impuestoId: 'tax-1' }, 'impuesto_recuperable', taxes);
    expect(r.tasa).toBe(0.075);
  });

  it('exonerado (vía Tax) resuelve codigoAfectacion 20, esRecuperable null', () => {
    const taxes = [crearTax({ id: 'tax-exo', rate: 0, affectationCode: '20' })];
    const r = resolverTratamientoTributarioProducto({ impuestoId: 'tax-exo' }, 'impuesto_recuperable', taxes);
    expect(r.codigoAfectacion).toBe('20');
    expect(r.esRecuperable).toBeNull();
  });

  it('inafecto (vía Tax) resuelve codigoAfectacion 30', () => {
    const taxes = [crearTax({ id: 'tax-ina', rate: 0, affectationCode: '30' })];
    const r = resolverTratamientoTributarioProducto({ impuestoId: 'tax-ina' }, 'impuesto_recuperable', taxes);
    expect(r.codigoAfectacion).toBe('30');
  });

  it('exportación (vía Tax) resuelve codigoAfectacion 40, distinto de exonerado (20)', () => {
    const taxes = [crearTax({ id: 'tax-exp', rate: 0, affectationCode: '40' })];
    const r = resolverTratamientoTributarioProducto({ impuestoId: 'tax-exp' }, 'impuesto_recuperable', taxes);
    expect(r.codigoAfectacion).toBe('40');
    expect(r.codigoAfectacion).not.toBe('20');
  });

  it('gratuita (vía texto legado) resuelve esRecuperable null (no es una línea gravada)', () => {
    const r = resolverTratamientoTributarioProducto({ impuestoTexto: 'Operación gratuita' }, 'impuesto_recuperable');
    expect(r.esRecuperable).toBeNull();
  });

  it('texto legado inequívoco (IGV con %) se resuelve mediante el único núcleo, sin impuestoId', () => {
    const r = resolverTratamientoTributarioProducto({ impuestoTexto: 'IGV (18.00%)' }, 'impuesto_recuperable');
    expect(r.origenResolucion).toBe('texto_legado_resuelto');
    expect(r.tasa).toBe(0.18);
    expect(r.impuestoId).toBeUndefined();
  });

  it('texto legado ambiguo (sin impuestoId) queda pendiente_revision, nunca asume 18%', () => {
    const r = resolverTratamientoTributarioProducto({ impuestoTexto: 'N/A' }, 'impuesto_recuperable');
    expect(r.origenResolucion).toBe('pendiente_revision');
    expect(r.codigoAfectacion).toBe('');
    expect(r.tasa).toBe(0);
  });

  it('texto legado vacío no asume 18% — sin_configurar/pendiente_revision', () => {
    const r = resolverTratamientoTributarioProducto({ impuestoTexto: '' }, 'impuesto_recuperable');
    expect(r.origenResolucion).toBe('pendiente_revision');
    expect(r.tasa).toBe(0);
  });

  it('impuestoId inexistente o inactivo cae al texto legado (nunca inventa una resolución)', () => {
    const taxes = [crearTax({ id: 'tax-1', rate: 18, affectationCode: '10', isActive: false })];
    const r = resolverTratamientoTributarioProducto({ impuestoId: 'tax-1', impuestoTexto: 'Exonerado' }, 'impuesto_recuperable', taxes);
    expect(r.origenResolucion).toBe('texto_legado_resuelto');
    expect(r.codigoAfectacion).toBe('20');
  });

  it('pendiente_configuracion nunca asume recuperabilidad, aunque la línea sea gravada', () => {
    const r = resolverTratamientoTributarioProducto({ impuestoTexto: 'IGV (18.00%)' }, 'pendiente_configuracion');
    expect(r.esRecuperable).toBeNull();
  });

  it('impuesto_recuperable y línea gravada: esRecuperable=true', () => {
    const r = resolverTratamientoTributarioProducto({ impuestoTexto: 'IGV (18.00%)' }, 'impuesto_recuperable');
    expect(r.esRecuperable).toBe(true);
  });

  it('impuesto_no_recuperable y línea gravada: esRecuperable=false', () => {
    const r = resolverTratamientoTributarioProducto({ impuestoTexto: 'IGV (18.00%)' }, 'impuesto_no_recuperable');
    expect(r.esRecuperable).toBe(false);
  });

  it('segun_afectacion NO asume recuperable por defecto — esRecuperable=null cuando falta la determinación por línea', () => {
    const r = resolverTratamientoTributarioProducto({ impuestoTexto: 'IGV (18.00%)' }, 'segun_afectacion');
    expect(r.esRecuperable).toBeNull();
  });
});

describe('resolverTratamientoTributarioProducto — contrato estado/categoria (resuelto | pendiente_revision | no_soportado)', () => {
  it('impuesto vacío queda pendiente_revision — nunca "resuelto" con tasa 0 asumida', () => {
    const r = resolverTratamientoTributarioProducto({ impuestoTexto: '' }, 'impuesto_recuperable');
    expect(r.estado).toBe('pendiente_revision');
    expect(r.motivoBloqueo).toBeTruthy();
  });

  it('texto desconocido/ambiguo queda pendiente_revision, con motivoBloqueo explícito', () => {
    const r = resolverTratamientoTributarioProducto({ impuestoTexto: 'N/A' }, 'impuesto_recuperable');
    expect(r.estado).toBe('pendiente_revision');
    expect(r.motivoBloqueo).toBeTruthy();
  });

  it('impuestoId inexistente en el catálogo cae al texto legado; si ese texto tampoco resuelve, queda pendiente_revision', () => {
    const r = resolverTratamientoTributarioProducto({ impuestoId: 'no-existe', impuestoTexto: 'N/A' }, 'impuesto_recuperable', []);
    expect(r.estado).toBe('pendiente_revision');
  });

  it('gratuita es no_soportado — nunca se reporta como "resuelto" ni se disfraza de exonerado', () => {
    const r = resolverTratamientoTributarioProducto({ impuestoTexto: 'Operación gratuita' }, 'impuesto_recuperable');
    expect(r.estado).toBe('no_soportado');
    expect(r.categoria).toBe('gratuita');
    expect(r.categoria).not.toBe('exonerado');
    expect(r.motivoBloqueo).toBeTruthy();
  });

  it('exonerado válido: estado resuelto, tasa 0', () => {
    const r = resolverTratamientoTributarioProducto({ impuestoTexto: 'Exonerado (0.00%)' }, 'impuesto_recuperable');
    expect(r.estado).toBe('resuelto');
    expect(r.categoria).toBe('exonerado');
    expect(r.tasa).toBe(0);
    expect(r.motivoBloqueo).toBeUndefined();
  });

  it('inafecto válido: estado resuelto, tasa 0', () => {
    const r = resolverTratamientoTributarioProducto({ impuestoTexto: 'Inafecto' }, 'impuesto_recuperable');
    expect(r.estado).toBe('resuelto');
    expect(r.categoria).toBe('inafecto');
    expect(r.tasa).toBe(0);
  });

  it('exportación válida: estado resuelto, tasa 0, categoría exportación (no exonerado)', () => {
    const r = resolverTratamientoTributarioProducto({ impuestoTexto: 'Exportación (0.00%)' }, 'impuesto_recuperable');
    expect(r.estado).toBe('resuelto');
    expect(r.categoria).toBe('exportacion');
    expect(r.tasa).toBe(0);
  });

  it('gravado válido: estado resuelto, tasa configurada (no 18% fijo)', () => {
    const taxes = [crearTax({ id: 'tax-1', rate: 7.5, affectationCode: '10' })];
    const r = resolverTratamientoTributarioProducto({ impuestoId: 'tax-1' }, 'impuesto_recuperable', taxes);
    expect(r.estado).toBe('resuelto');
    expect(r.categoria).toBe('gravado');
    expect(r.tasa).toBe(0.075);
    expect(r.motivoBloqueo).toBeUndefined();
  });
});

describe('motivoImpuestoSinResolver — bloqueo mínimo para consumidores de solo texto legado (NI/NS)', () => {
  it('etiqueta ambigua o ausente devuelve un motivo de bloqueo', () => {
    expect(motivoImpuestoSinResolver(undefined)).toBeTruthy();
    expect(motivoImpuestoSinResolver('')).toBeTruthy();
    expect(motivoImpuestoSinResolver('N/A')).toBeTruthy();
  });

  it('etiqueta resuelta (gravado/exonerado/inafecto/exportación) no devuelve motivo de bloqueo', () => {
    expect(motivoImpuestoSinResolver('IGV (18.00%)')).toBeUndefined();
    expect(motivoImpuestoSinResolver('Exonerado (0.00%)')).toBeUndefined();
    expect(motivoImpuestoSinResolver('Inafecto')).toBeUndefined();
    expect(motivoImpuestoSinResolver('Exportación (0.00%)')).toBeUndefined();
  });
});
