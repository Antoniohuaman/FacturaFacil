import { describe, it, expect } from 'vitest';
import {
  calcularEsInventariable,
  calcularAfectaInventarioLinea,
  resolverImpuestoProducto,
  resolverSnapshotInventarioLinea,
} from './reglasCompras';
import type { ProductUnitOption } from '@/shared/units/productUnitOptions';

const UNIDADES_CAJA_DE_12: ProductUnitOption[] = [
  { code: 'NIU', label: 'Unidad', isBase: true, factorConversion: 1 },
  { code: 'BX', label: 'Caja x 12', factorConversion: 12 },
];

describe('calcularEsInventariable', () => {
  it('producto con tipoExistencia inventariable es esInventariable=true', () => {
    expect(calcularEsInventariable({ clasificacion: 'producto', tipoExistencia: 'MERCADERIAS' })).toBe(true);
  });

  it('producto con tipoExistencia SERVICIOS (dato inconsistente) es esInventariable=false', () => {
    expect(calcularEsInventariable({ clasificacion: 'producto', tipoExistencia: 'SERVICIOS' })).toBe(false);
  });

  it('servicio nunca es inventariable, sin importar tipoExistencia', () => {
    expect(calcularEsInventariable({ clasificacion: 'servicio', tipoExistencia: 'MERCADERIAS' })).toBe(false);
  });

  it('gasto nunca es inventariable', () => {
    expect(calcularEsInventariable({ clasificacion: 'gasto', tipoExistencia: 'MERCADERIAS' })).toBe(false);
  });

  it('activo_fijo nunca es inventariable', () => {
    expect(calcularEsInventariable({ clasificacion: 'activo_fijo', tipoExistencia: 'MERCADERIAS' })).toBe(false);
  });

  it('suministro es inventariable solo si el producto real es SUMINISTROS', () => {
    expect(calcularEsInventariable({ clasificacion: 'suministro', tipoExistencia: 'SUMINISTROS' })).toBe(true);
  });

  it('suministro NO es inventariable si el producto real no es estructuralmente SUMINISTROS', () => {
    expect(calcularEsInventariable({ clasificacion: 'suministro', tipoExistencia: 'MERCADERIAS' })).toBe(false);
  });
});

describe('calcularAfectaInventarioLinea', () => {
  it('línea inventariable en modalidad con_nota_ingreso afecta inventario', () => {
    expect(calcularAfectaInventarioLinea(true, 'con_nota_ingreso')).toBe(true);
  });

  it('línea inventariable en modalidad ingreso_automatico afecta inventario', () => {
    expect(calcularAfectaInventarioLinea(true, 'ingreso_automatico')).toBe(true);
  });

  it('línea inventariable en modalidad no_afecta_inventario NO afecta inventario', () => {
    expect(calcularAfectaInventarioLinea(true, 'no_afecta_inventario')).toBe(false);
  });

  it('línea NO inventariable nunca afecta inventario, sin importar la modalidad del documento', () => {
    expect(calcularAfectaInventarioLinea(false, 'con_nota_ingreso')).toBe(false);
    expect(calcularAfectaInventarioLinea(false, 'ingreso_automatico')).toBe(false);
  });
});

describe('resolverImpuestoProducto (adaptador delgado sobre resolverTratamientoTributarioProducto)', () => {
  it('etiqueta con porcentaje resuelve gravado con la tasa exacta', () => {
    expect(resolverImpuestoProducto({ impuestoTexto: 'IGV (18.00%)' }, 'impuesto_recuperable')).toEqual({ tipoAfectacion: 'gravado', tasaIgv: 0.18 });
  });

  it('etiqueta "Exonerado" resuelve exonerado con tasa 0', () => {
    expect(resolverImpuestoProducto({ impuestoTexto: 'Exonerado (0.00%)' }, 'impuesto_recuperable')).toEqual({ tipoAfectacion: 'exonerado', tasaIgv: 0 });
  });

  it('etiqueta "Inafecto" resuelve inafecto con tasa 0', () => {
    expect(resolverImpuestoProducto({ impuestoTexto: 'Inafecto' }, 'impuesto_recuperable')).toEqual({ tipoAfectacion: 'inafecto', tasaIgv: 0 });
  });

  it('etiqueta de exportación conserva su propia categoría, nunca se confunde con exonerado', () => {
    const r = resolverImpuestoProducto({ impuestoTexto: 'Exportación (0.00%)' }, 'impuesto_recuperable');
    expect(r).toEqual({ tipoAfectacion: 'exportacion', tasaIgv: 0 });
    expect(r.tipoAfectacion).not.toBe('exonerado');
  });

  it('operación gratuita queda sin_configurar (Compras no admite operaciones a título gratuito) — nunca se disfraza de exonerado', () => {
    const r = resolverImpuestoProducto({ impuestoTexto: 'Operación gratuita' }, 'impuesto_recuperable');
    expect(r).toEqual({ tipoAfectacion: 'sin_configurar', tasaIgv: 0 });
    expect(r.tipoAfectacion).not.toBe('exonerado');
  });

  it('etiqueta ausente o vacía resuelve sin_configurar, nunca un valor por defecto', () => {
    expect(resolverImpuestoProducto({ impuestoTexto: undefined }, 'impuesto_recuperable')).toEqual({ tipoAfectacion: 'sin_configurar', tasaIgv: 0 });
    expect(resolverImpuestoProducto({ impuestoTexto: '' }, 'impuesto_recuperable')).toEqual({ tipoAfectacion: 'sin_configurar', tasaIgv: 0 });
  });

  it('etiqueta sin porcentaje ni palabra clave resuelve sin_configurar', () => {
    expect(resolverImpuestoProducto({ impuestoTexto: 'algo desconocido' }, 'impuesto_recuperable')).toEqual({ tipoAfectacion: 'sin_configurar', tasaIgv: 0 });
  });

  it('impuestoId estructurado resuelve desde Tax, con prioridad sobre el texto legado', () => {
    const taxes = [{
      id: 'tax-1', code: 'IGV10', name: 'IGV 10%', shortName: 'IGV 10%', type: 'PERCENTAGE' as const,
      rate: 10, sunatCode: '1000', sunatName: 'IGV', sunatType: 'VAT' as const, affectationCode: '10',
      category: 'PURCHASE' as const, includeInPrice: false, isCompound: false,
      applicableTo: { products: true, services: true, both: true },
      rules: { roundingMethod: 'ROUND' as const, roundingPrecision: 2 },
      jurisdiction: { country: 'PE' }, isDefault: true, isActive: true,
      validFrom: new Date('2011-03-01'), validTo: null,
      createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
    }];
    const r = resolverImpuestoProducto({ impuestoId: 'tax-1', impuestoTexto: 'Exonerado (0.00%)' }, 'impuesto_recuperable', taxes);
    expect(r).toEqual({ tipoAfectacion: 'gravado', tasaIgv: 0.1 });
  });
});

describe('resolverSnapshotInventarioLinea', () => {
  it('agregar 2 cajas de 12 produce factor 12 y cantidad 24', () => {
    const r = resolverSnapshotInventarioLinea({
      esInventariable: true,
      unidadMedidaCodigo: 'BX',
      unidadesDisponibles: UNIDADES_CAJA_DE_12,
      cantidadComercialFinal: 2,
    });
    expect(r.factorConversionAplicado).toBe(12);
    expect(r.cantidadDocumentadaInventariable).toBe(24);
    expect(r.error).toBeUndefined();
  });

  it('cambiar de caja de 12 a unidad recalcula factor 1 y cantidad correcta', () => {
    const r = resolverSnapshotInventarioLinea({
      esInventariable: true,
      unidadMedidaCodigo: 'NIU',
      unidadesDisponibles: UNIDADES_CAJA_DE_12,
      cantidadComercialFinal: 2,
    });
    expect(r.factorConversionAplicado).toBe(1);
    expect(r.cantidadDocumentadaInventariable).toBe(2);
  });

  it('cambiar la cantidad de 2 a 3 cajas recalcula de 24 a 36', () => {
    const antes = resolverSnapshotInventarioLinea({
      esInventariable: true,
      unidadMedidaCodigo: 'BX',
      unidadesDisponibles: UNIDADES_CAJA_DE_12,
      cantidadComercialFinal: 2,
    });
    const despues = resolverSnapshotInventarioLinea({
      esInventariable: true,
      unidadMedidaCodigo: 'BX',
      unidadesDisponibles: UNIDADES_CAJA_DE_12,
      cantidadComercialFinal: 3,
    });
    expect(antes.cantidadDocumentadaInventariable).toBe(24);
    expect(despues.cantidadDocumentadaInventariable).toBe(36);
  });

  it('cambiar unidad y luego cantidad mantiene snapshots coherentes (factor y cantidad de la unidad final)', () => {
    const cambioUnidad = resolverSnapshotInventarioLinea({
      esInventariable: true,
      unidadMedidaCodigo: 'NIU',
      unidadesDisponibles: UNIDADES_CAJA_DE_12,
      cantidadComercialFinal: 2,
    });
    expect(cambioUnidad.factorConversionAplicado).toBe(1);
    const cambioCantidad = resolverSnapshotInventarioLinea({
      esInventariable: true,
      unidadMedidaCodigo: 'NIU',
      unidadesDisponibles: UNIDADES_CAJA_DE_12,
      cantidadComercialFinal: 5,
    });
    expect(cambioCantidad.factorConversionAplicado).toBe(1);
    expect(cambioCantidad.cantidadDocumentadaInventariable).toBe(5);
  });

  it('factor inválido (cero) bloquea el guardado con un error explícito', () => {
    const unidadesConFactorInvalido: ProductUnitOption[] = [
      { code: 'NIU', label: 'Unidad', isBase: true, factorConversion: 1 },
      { code: 'BX', label: 'Caja', factorConversion: 0 },
    ];
    const r = resolverSnapshotInventarioLinea({
      esInventariable: true,
      unidadMedidaCodigo: 'BX',
      unidadesDisponibles: unidadesConFactorInvalido,
      cantidadComercialFinal: 2,
    });
    expect(r.error).toBeDefined();
    expect(r.factorConversionAplicado).toBeUndefined();
    expect(r.cantidadDocumentadaInventariable).toBeUndefined();
  });

  it('una línea inventariable nueva no puede resolver snapshot si la unidad no está entre las disponibles', () => {
    const r = resolverSnapshotInventarioLinea({
      esInventariable: true,
      unidadMedidaCodigo: 'NO_EXISTE',
      unidadesDisponibles: UNIDADES_CAJA_DE_12,
      cantidadComercialFinal: 2,
    });
    expect(r.error).toBeDefined();
  });

  it('una línea no inventariable no necesita snapshot (sin error, sin valores)', () => {
    const r = resolverSnapshotInventarioLinea({
      esInventariable: false,
      unidadMedidaCodigo: 'BX',
      unidadesDisponibles: UNIDADES_CAJA_DE_12,
      cantidadComercialFinal: 2,
    });
    expect(r).toEqual({});
  });

  it('es puro: la misma entrada produce siempre el mismo resultado (no muta los argumentos)', () => {
    const entrada = {
      esInventariable: true,
      unidadMedidaCodigo: 'BX',
      unidadesDisponibles: UNIDADES_CAJA_DE_12,
      cantidadComercialFinal: 2,
    };
    const snapshotEntrada = JSON.parse(JSON.stringify(entrada));
    const a = resolverSnapshotInventarioLinea(entrada);
    const b = resolverSnapshotInventarioLinea(entrada);
    expect(a).toEqual(b);
    expect(entrada).toEqual(snapshotEntrada);
  });
});
