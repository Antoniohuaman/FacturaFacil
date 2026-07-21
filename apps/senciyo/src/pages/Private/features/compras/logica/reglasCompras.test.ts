import { describe, it, expect } from 'vitest';
import {
  calcularEsInventariable,
  calcularAfectaInventarioLinea,
  resolverImpuestoProducto,
  resolverSnapshotInventarioLinea,
  obtenerAplicacionesPago,
  obtenerCuentasPorPagarDePago,
} from './reglasCompras';
import type { ProductUnitOption } from '@/shared/units/productUnitOptions';
import type { PagoCompra } from '../modelos/PagoCompra';
import type { CuentaPorPagar } from '../modelos/CuentaPorPagar';

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

function crearCxP(overrides: Partial<CuentaPorPagar> = {}): CuentaPorPagar {
  return {
    id: overrides.id ?? 'cxp-1',
    comprobanteCompraId: 'cc-1',
    comprobanteCompraNumero: 'FR23-366',
    tipoComprobanteOrigen: '01',
    proveedorId: 'prov-1',
    proveedorNombre: 'MI EMPRESA SAC',
    proveedorNumeroDocumento: '20123456789',
    moneda: 'PEN',
    total: 150,
    totalPagado: 0,
    saldoPendiente: 150,
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

function crearPago(overrides: Partial<PagoCompra> = {}): PagoCompra {
  return {
    id: 'pago-1',
    numeroPago: 'PG01-00000001',
    fechaPago: '2026-07-21',
    proveedorId: 'prov-1',
    proveedorNombre: 'MI EMPRESA SAC',
    moneda: 'PEN',
    montoTotalPagado: 150,
    mediosPago: [],
    cuentasPorPagarAplicadas: ['cxp-1'],
    comprobantesCompraAplicados: ['cc-1'],
    estadoDocumento: 'registrado',
    historial: [],
    fechaCreacion: '2026-07-21T00:00:00.000Z',
    ...overrides,
  };
}

describe('obtenerAplicacionesPago', () => {
  it('un pago nuevo (con aplicaciones) devuelve exactamente sus aplicaciones reales', () => {
    const pago = crearPago({
      aplicaciones: [
        { cuentaPorPagarId: 'cxp-1', comprobanteCompraId: 'cc-1', importeAplicado: 150 },
        { cuentaPorPagarId: 'cxp-2', comprobanteCompraId: 'cc-2', importeAplicado: 30 },
      ],
      montoTotalPagado: 180,
      cuentasPorPagarAplicadas: ['cxp-1', 'cxp-2'],
      comprobantesCompraAplicados: ['cc-1', 'cc-2'],
    });
    expect(obtenerAplicacionesPago(pago)).toEqual([
      { cuentaPorPagarId: 'cxp-1', comprobanteCompraId: 'cc-1', importeAplicado: 150 },
      { cuentaPorPagarId: 'cxp-2', comprobanteCompraId: 'cc-2', importeAplicado: 30 },
    ]);
  });

  it('un pago legacy (sin aplicaciones) sintetiza una única aplicación desde sus campos históricos', () => {
    const pago = crearPago({ montoTotalPagado: 150, cuentasPorPagarAplicadas: ['cxp-1'], comprobantesCompraAplicados: ['cc-1'] });
    expect(obtenerAplicacionesPago(pago)).toEqual([
      { cuentaPorPagarId: 'cxp-1', comprobanteCompraId: 'cc-1', importeAplicado: 150, asignacionesCuotas: undefined },
    ]);
  });

  it('un pago legacy sin ninguna CxP aplicada devuelve un arreglo vacío (nunca inventa una aplicación)', () => {
    const pago = crearPago({ cuentasPorPagarAplicadas: [], comprobantesCompraAplicados: [] });
    expect(obtenerAplicacionesPago(pago)).toEqual([]);
  });

  it('un pago legacy conserva la asignación por cuota de nivel superior dentro de la aplicación sintetizada', () => {
    const pago = crearPago({ asignacionesCuotas: [{ cuotaId: 'cuota-1', monto: 150 }] });
    expect(obtenerAplicacionesPago(pago)[0].asignacionesCuotas).toEqual([{ cuotaId: 'cuota-1', monto: 150 }]);
  });
});

describe('obtenerCuentasPorPagarDePago', () => {
  it('resuelve las N Cuentas por Pagar reales de un pago multi-documento', () => {
    const cxpA = crearCxP({ id: 'cxp-1', comprobanteCompraNumero: 'FR23-366' });
    const cxpB = crearCxP({ id: 'cxp-2', comprobanteCompraNumero: 'FR01-223' });
    const pago = crearPago({
      aplicaciones: [
        { cuentaPorPagarId: 'cxp-1', comprobanteCompraId: 'cc-1', importeAplicado: 150 },
        { cuentaPorPagarId: 'cxp-2', comprobanteCompraId: 'cc-2', importeAplicado: 30 },
      ],
    });
    expect(obtenerCuentasPorPagarDePago(pago, [cxpA, cxpB])).toEqual([cxpA, cxpB]);
  });

  it('omite silenciosamente una CxP aplicada que ya no existe en el arreglo actual', () => {
    const cxpA = crearCxP({ id: 'cxp-1' });
    const pago = crearPago({
      aplicaciones: [
        { cuentaPorPagarId: 'cxp-1', comprobanteCompraId: 'cc-1', importeAplicado: 150 },
        { cuentaPorPagarId: 'cxp-inexistente', comprobanteCompraId: 'cc-x', importeAplicado: 30 },
      ],
    });
    expect(obtenerCuentasPorPagarDePago(pago, [cxpA])).toEqual([cxpA]);
  });
});
