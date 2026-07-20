import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { instalarLocalStorageDePrueba } from '../repositories/localStorageDePrueba';
import { InventoryService } from './inventory.service';
import type { Product } from '../../catalogo-articulos/models/types';
import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';
import type { StockAdjustmentData } from '../models';

instalarLocalStorageDePrueba();

// `StockRepository.addMovement` (llamado por el wrapper `registerAdjustment`, ya deprecado)
// dispara `window.dispatchEvent` — el entorno 'node' de Vitest no define `window`. Stub mínimo,
// exclusivo de esta prueba, sin efecto sobre el código productivo.
if (typeof (globalThis as typeof globalThis & { window?: unknown }).window === 'undefined') {
  Object.defineProperty(globalThis, 'window', {
    value: { dispatchEvent: () => true },
    writable: true,
    configurable: true,
  });
}

interface GlobalConEmpresaActiva {
  __FF_ACTIVE_WORKSPACE_ID?: string;
}

beforeEach(() => {
  localStorage.clear();
  (globalThis as typeof globalThis & GlobalConEmpresaActiva).__FF_ACTIVE_WORKSPACE_ID = 'emp-A';
});
afterEach(() => {
  localStorage.clear();
  delete (globalThis as typeof globalThis & GlobalConEmpresaActiva).__FF_ACTIVE_WORKSPACE_ID;
});

function crearAlmacen(overrides: Partial<Almacen> = {}): Almacen {
  return {
    id: 'alm-1',
    codigoAlmacen: 'ALM01',
    nombreAlmacen: 'Almacén Principal',
    establecimientoId: 'est-1',
    estaActivoAlmacen: true,
    esAlmacenPrincipal: true,
    configuracionInventarioAlmacen: {
      permiteStockNegativoAlmacen: false,
      controlEstrictoStock: false,
      requiereAprobacionMovimientos: false,
    },
    creadoElAlmacen: new Date('2026-01-01T00:00:00.000Z'),
    actualizadoElAlmacen: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function crearProducto(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod-1',
    codigo: 'P001',
    nombre: 'Producto 1',
    unidad: 'NIU',
    precio: 10,
    categoria: 'General',
    establecimientoIds: [],
    disponibleEnTodos: true,
    stockPorAlmacen: {},
    fechaCreacion: new Date('2026-01-01T00:00:00.000Z'),
    fechaActualizacion: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function crearDatosAjuste(overrides: Partial<StockAdjustmentData> = {}): StockAdjustmentData {
  return {
    productoId: 'prod-1',
    almacenId: 'alm-1',
    tipo: 'AJUSTE_POSITIVO',
    motivo: 'AJUSTE_INVENTARIO',
    cantidad: 10,
    observaciones: '',
    documentoReferencia: '',
    ...overrides,
  };
}

describe('InventoryService.calcularAjustePropuesto — cálculo puro', () => {
  it('no persiste: localStorage permanece vacío tras el cálculo', () => {
    const producto = crearProducto({ stockPorAlmacen: { 'alm-1': 5 } });
    InventoryService.calcularAjustePropuesto({
      product: producto,
      almacen: crearAlmacen(),
      data: crearDatosAjuste(),
      usuario: 'user-1',
      generarId: () => 'mov-1',
      fechaActual: () => new Date('2026-01-01T00:00:00.000Z'),
    });
    expect(localStorage.length).toBe(0);
  });

  it('no muta el producto ni el almacén de entrada', () => {
    const producto = crearProducto({ stockPorAlmacen: { 'alm-1': 5 } });
    const almacen = crearAlmacen();
    const stockOriginal = { ...producto.stockPorAlmacen };

    InventoryService.calcularAjustePropuesto({
      product: producto,
      almacen,
      data: crearDatosAjuste(),
      usuario: 'user-1',
      generarId: () => 'mov-1',
      fechaActual: () => new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(producto.stockPorAlmacen).toEqual(stockOriginal);
  });

  it('es determinista para la misma entrada (incluyendo generarId/fechaActual inyectados)', () => {
    const producto = crearProducto({ stockPorAlmacen: { 'alm-1': 5 } });
    const params = {
      product: producto,
      almacen: crearAlmacen(),
      data: crearDatosAjuste(),
      usuario: 'user-1',
      generarId: () => 'mov-fijo',
      fechaActual: () => new Date('2026-01-01T00:00:00.000Z'),
    };
    const r1 = InventoryService.calcularAjustePropuesto(params);
    const r2 = InventoryService.calcularAjustePropuesto(params);
    expect(r1).toEqual(r2);
  });

  it('entrada en almacén existente (con stock previo): suma sobre el stock actual', () => {
    const producto = crearProducto({ stockPorAlmacen: { 'alm-1': 5 } });
    const resultado = InventoryService.calcularAjustePropuesto({
      product: producto,
      almacen: crearAlmacen(),
      data: crearDatosAjuste({ cantidad: 10 }),
      usuario: 'user-1',
      generarId: () => 'mov-1',
      fechaActual: () => new Date('2026-01-01T00:00:00.000Z'),
    });
    expect(resultado.cantidadAnterior).toBe(5);
    expect(resultado.cantidadNueva).toBe(15);
    expect(resultado.productoActualizado.stockPorAlmacen?.['alm-1']).toBe(15);
  });

  it('entrada en almacén sin stock previo: cantidadAnterior es 0', () => {
    const producto = crearProducto({ stockPorAlmacen: {} });
    const resultado = InventoryService.calcularAjustePropuesto({
      product: producto,
      almacen: crearAlmacen(),
      data: crearDatosAjuste({ cantidad: 7 }),
      usuario: 'user-1',
      generarId: () => 'mov-1',
      fechaActual: () => new Date('2026-01-01T00:00:00.000Z'),
    });
    expect(resultado.cantidadAnterior).toBe(0);
    expect(resultado.cantidadNueva).toBe(7);
  });

  it('respeta la precisión decimal de la cantidad', () => {
    const producto = crearProducto({ stockPorAlmacen: { 'alm-1': 2.5 } });
    const resultado = InventoryService.calcularAjustePropuesto({
      product: producto,
      almacen: crearAlmacen(),
      data: crearDatosAjuste({ cantidad: 1.25 }),
      usuario: 'user-1',
      generarId: () => 'mov-1',
      fechaActual: () => new Date('2026-01-01T00:00:00.000Z'),
    });
    expect(resultado.cantidadNueva).toBe(3.75);
  });

  it('producto y almacén aislados: un cálculo sobre un producto no afecta al cálculo de otro', () => {
    const productoA = crearProducto({ id: 'prod-A', stockPorAlmacen: { 'alm-1': 5 } });
    const productoB = crearProducto({ id: 'prod-B', stockPorAlmacen: { 'alm-1': 50 } });

    const resultadoA = InventoryService.calcularAjustePropuesto({
      product: productoA,
      almacen: crearAlmacen(),
      data: crearDatosAjuste({ productoId: 'prod-A', cantidad: 1 }),
      usuario: 'user-1',
      generarId: () => 'mov-a',
      fechaActual: () => new Date('2026-01-01T00:00:00.000Z'),
    });
    const resultadoB = InventoryService.calcularAjustePropuesto({
      product: productoB,
      almacen: crearAlmacen(),
      data: crearDatosAjuste({ productoId: 'prod-B', cantidad: 2 }),
      usuario: 'user-1',
      generarId: () => 'mov-b',
      fechaActual: () => new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(resultadoA.cantidadNueva).toBe(6);
    expect(resultadoB.cantidadNueva).toBe(52);
  });

  it('rechaza una cantidad menor o igual a cero, igual que antes', () => {
    const producto = crearProducto({ stockPorAlmacen: { 'alm-1': 5 } });
    expect(() =>
      InventoryService.calcularAjustePropuesto({
        product: producto,
        almacen: crearAlmacen(),
        data: crearDatosAjuste({ cantidad: 0 }),
        usuario: 'user-1',
        generarId: () => 'mov-1',
        fechaActual: () => new Date('2026-01-01T00:00:00.000Z'),
      })
    ).toThrow();
  });
});

describe('InventoryService.registerAdjustment (deprecated) — mismo resultado numérico que calcularAjustePropuesto', () => {
  it('produce exactamente el mismo cantidadAnterior/cantidadNueva/stockPorAlmacen que la función pura para los mismos datos', () => {
    const producto = crearProducto({ stockPorAlmacen: { 'alm-1': 5 } });
    const almacen = crearAlmacen();
    const data = crearDatosAjuste({ cantidad: 10 });

    const puro = InventoryService.calcularAjustePropuesto({
      product: producto,
      almacen,
      data,
      usuario: 'user-1',
      generarId: () => 'mov-1',
      fechaActual: () => new Date('2026-01-01T00:00:00.000Z'),
    });

    const wrapper = InventoryService.registerAdjustment(producto, almacen, data, 'user-1');

    expect(wrapper.movement.cantidadAnterior).toBe(puro.cantidadAnterior);
    expect(wrapper.movement.cantidadNueva).toBe(puro.cantidadNueva);
    expect(wrapper.product.stockPorAlmacen).toEqual(puro.productoActualizado.stockPorAlmacen);
  });

  it('sigue persistiendo el movimiento vía StockRepository (comportamiento observable sin cambios)', () => {
    const producto = crearProducto({ stockPorAlmacen: { 'alm-1': 5 } });
    const almacen = crearAlmacen();
    InventoryService.registerAdjustment(producto, almacen, crearDatosAjuste({ cantidad: 10 }), 'user-1');
    expect(localStorage.length).toBeGreaterThan(0);
  });
});
