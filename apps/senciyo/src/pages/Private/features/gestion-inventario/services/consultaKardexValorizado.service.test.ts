import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { instalarLocalStorageDePrueba } from '../repositories/localStorageDePrueba';
import {
  proyectarKardexValorizado,
  calcularValorStockPorProductoAlmacen,
  obtenerValorStockProducto,
  claveValorStock,
} from './consultaKardexValorizado.service';
import { guardarCapaCostoInventario } from '../repositories/capaCostoInventario.repository';
import { guardarConsumoCapaCostoInventario } from '../repositories/consumoCapaCostoInventario.repository';
import type { MovimientoStock } from '../models/inventory.types';
import type { CapaCostoInventario } from '../models/capaCostoInventario.types';
import type { ConsumoCapaCostoInventario } from '../models/consumoCapaCostoInventario.types';

instalarLocalStorageDePrueba();
beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

function crearMovimiento(overrides: Partial<MovimientoStock> = {}): MovimientoStock {
  return {
    id: 'mov-1',
    productoId: 'prod-1',
    productoCodigo: 'P001',
    productoNombre: 'Producto 1',
    tipo: 'ENTRADA',
    motivo: 'COMPRA',
    cantidad: 10,
    cantidadAnterior: 0,
    cantidadNueva: 10,
    usuario: 'user-1',
    fecha: new Date('2026-08-01T00:00:00.000Z'),
    almacenId: 'alm-1',
    almacenCodigo: 'ALM-1',
    almacenNombre: 'Almacén 1',
    EstablecimientoId: 'est-1',
    EstablecimientoCodigo: 'EST-1',
    EstablecimientoNombre: 'Establecimiento 1',
    ...overrides,
  };
}

function crearCapa(overrides: Partial<CapaCostoInventario> = {}): CapaCostoInventario {
  return {
    id: 'capa-1',
    empresaId: 'emp-A',
    establecimientoId: 'est-1',
    productoId: 'prod-1',
    almacenId: 'alm-1',
    movimientoEntradaId: 'mov-1',
    tipoDocumentoOrigen: 'nota_ingreso',
    documentoOrigenId: 'ni-1',
    cantidadInicial: 10,
    cantidadDisponible: 10,
    costoUnitarioBaseOriginal: 10,
    costoUnitarioBaseMonedaBase: 10,
    valorValorizableOriginal: 100,
    valorValorizableMonedaBase: 100,
    monedaBase: 'PEN',
    monedaOriginal: 'PEN',
    tipoCambioAplicado: 1,
    fechaTipoCambio: '2026-08-01T00:00:00.000Z',
    fechaEntrada: '2026-08-01T00:00:00.000Z',
    estado: 'disponible',
    procedencia: 'compra',
    usuario: 'user-1',
    fechaCreacion: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

function crearConsumo(overrides: Partial<ConsumoCapaCostoInventario> = {}): ConsumoCapaCostoInventario {
  return {
    id: 'consumo-1',
    empresaId: 'emp-A',
    movimientoSalidaId: 'mov-2',
    capaId: 'capa-1',
    cantidadConsumida: 3,
    costoUnitarioBaseMonedaBase: 10,
    valorConsumidoMonedaBase: 30,
    monedaBase: 'PEN',
    fecha: '2026-08-02T00:00:00.000Z',
    estado: 'confirmado',
    ...overrides,
  };
}

describe('proyectarKardexValorizado — entradas', () => {
  it('una capa vinculada calcula costo unitario y valor del movimiento (positivo)', () => {
    guardarCapaCostoInventario(crearCapa(), 'emp-A');
    const movimiento = crearMovimiento();
    const filas = proyectarKardexValorizado({ empresaId: 'emp-A', movimientos: [movimiento] });
    const fila = filas.get('mov-1')!;
    expect(fila.tieneValorizacion).toBe(true);
    expect(fila.costoUnitario).toBe(10);
    expect(fila.valorMovimiento).toBe(100);
    expect(fila.monedaBase).toBe('PEN');
    expect(fila.origenes).toHaveLength(0);
  });

  it('varias capas vinculadas al mismo movimiento de entrada agregan correctamente', () => {
    guardarCapaCostoInventario(crearCapa({ id: 'capa-1', cantidadInicial: 6, cantidadDisponible: 6, costoUnitarioBaseMonedaBase: 10 }), 'emp-A');
    guardarCapaCostoInventario(crearCapa({ id: 'capa-2', cantidadInicial: 4, cantidadDisponible: 4, costoUnitarioBaseMonedaBase: 12 }), 'emp-A');
    const movimiento = crearMovimiento({ cantidad: 10 });
    const filas = proyectarKardexValorizado({ empresaId: 'emp-A', movimientos: [movimiento] });
    const fila = filas.get('mov-1')!;
    // 6*10 + 4*12 = 108
    expect(fila.valorMovimiento).toBe(108);
    expect(fila.costoUnitario).toBeCloseTo(10.8, 6);
  });
});

describe('proyectarKardexValorizado — salidas', () => {
  it('salida de una sola capa calcula costo y valor (negativo)', () => {
    guardarCapaCostoInventario(crearCapa({ cantidadDisponible: 7 }), 'emp-A');
    guardarConsumoCapaCostoInventario(crearConsumo({ cantidadConsumida: 3, costoUnitarioBaseMonedaBase: 10, valorConsumidoMonedaBase: 30 }), 'emp-A');
    const movimientoSalida = crearMovimiento({
      id: 'mov-2', tipo: 'SALIDA', motivo: 'VENTA', cantidad: 3, cantidadAnterior: 10, cantidadNueva: 7,
    });
    const filas = proyectarKardexValorizado({ empresaId: 'emp-A', movimientos: [movimientoSalida] });
    const fila = filas.get('mov-2')!;
    expect(fila.tieneValorizacion).toBe(true);
    expect(fila.costoUnitario).toBe(10);
    expect(fila.valorMovimiento).toBe(-30);
    expect(fila.origenes).toHaveLength(1);
    expect(fila.origenes[0]).toMatchObject({ documentoOrigenId: 'ni-1', tipoDocumentoOrigen: 'nota_ingreso', cantidad: 3, costoUnitario: 10, valor: 30 });
  });

  it('un origen del costo nunca expone capaId ni consumoId (ningún ID técnico) — solo documento/fecha/cantidad/costo/valor', () => {
    guardarCapaCostoInventario(crearCapa({ cantidadDisponible: 7 }), 'emp-A');
    guardarConsumoCapaCostoInventario(crearConsumo(), 'emp-A');
    const movimientoSalida = crearMovimiento({ id: 'mov-2', tipo: 'SALIDA', motivo: 'VENTA', cantidad: 3 });
    const filas = proyectarKardexValorizado({ empresaId: 'emp-A', movimientos: [movimientoSalida] });
    const origen = filas.get('mov-2')!.origenes[0];
    expect(Object.keys(origen).sort()).toEqual(['cantidad', 'costoUnitario', 'documentoOrigenId', 'fecha', 'tipoDocumentoOrigen', 'valor'].sort());
  });

  it('salida que consume varias capas suma correctamente (ejemplo del encargo: 10 a costo 10 + 2 a costo 12 = 124)', () => {
    guardarCapaCostoInventario(crearCapa({ id: 'capa-1', costoUnitarioBaseMonedaBase: 10, cantidadDisponible: 0 }), 'emp-A');
    guardarCapaCostoInventario(crearCapa({ id: 'capa-2', costoUnitarioBaseMonedaBase: 12, cantidadDisponible: 3 }), 'emp-A');
    guardarConsumoCapaCostoInventario(crearConsumo({ id: 'consumo-1', capaId: 'capa-1', cantidadConsumida: 10, costoUnitarioBaseMonedaBase: 10, valorConsumidoMonedaBase: 100 }), 'emp-A');
    guardarConsumoCapaCostoInventario(crearConsumo({ id: 'consumo-2', capaId: 'capa-2', cantidadConsumida: 2, costoUnitarioBaseMonedaBase: 12, valorConsumidoMonedaBase: 24 }), 'emp-A');
    const movimientoSalida = crearMovimiento({ id: 'mov-2', tipo: 'SALIDA', motivo: 'VENTA', cantidad: 12 });
    const filas = proyectarKardexValorizado({ empresaId: 'emp-A', movimientos: [movimientoSalida] });
    const fila = filas.get('mov-2')!;
    expect(fila.valorMovimiento).toBe(-124);
    expect(fila.costoUnitario).toBeCloseTo(124 / 12, 6);
    expect(fila.origenes).toHaveLength(2);
  });
});

describe('proyectarKardexValorizado — transferencias', () => {
  it('leg origen (salida) y leg destino (entrada) conservan la misma magnitud, con dirección distinta', () => {
    // Leg destino: una capa nueva (espejo) en el almacén destino, vinculada al movimiento de entrada de la transferencia.
    guardarCapaCostoInventario(crearCapa({
      id: 'capa-destino', almacenId: 'alm-2', movimientoEntradaId: 'mov-entrada-trf',
      tipoDocumentoOrigen: 'transferencia', documentoOrigenId: 'trf-1', capaOrigenId: 'capa-origen',
      cantidadInicial: 5, cantidadDisponible: 5, costoUnitarioBaseMonedaBase: 8,
    }), 'emp-A');
    // Leg origen: consumo de la capa original en el almacén origen.
    guardarCapaCostoInventario(crearCapa({ id: 'capa-origen', cantidadDisponible: 5, costoUnitarioBaseMonedaBase: 8 }), 'emp-A');
    guardarConsumoCapaCostoInventario(crearConsumo({
      id: 'consumo-trf', movimientoSalidaId: 'mov-salida-trf', capaId: 'capa-origen',
      cantidadConsumida: 5, costoUnitarioBaseMonedaBase: 8, valorConsumidoMonedaBase: 40, motivo: 'transferencia',
    }), 'emp-A');

    const movSalida = crearMovimiento({ id: 'mov-salida-trf', tipo: 'TRANSFERENCIA', motivo: 'TRANSFERENCIA_ALMACEN', cantidad: 5, esTransferencia: true });
    const movEntrada = crearMovimiento({ id: 'mov-entrada-trf', tipo: 'TRANSFERENCIA', motivo: 'TRANSFERENCIA_ALMACEN', cantidad: 5, almacenId: 'alm-2', esTransferencia: true });

    const filas = proyectarKardexValorizado({ empresaId: 'emp-A', movimientos: [movSalida, movEntrada] });
    const filaSalida = filas.get('mov-salida-trf')!;
    const filaEntrada = filas.get('mov-entrada-trf')!;

    expect(filaSalida.valorMovimiento).toBe(-40);
    expect(filaEntrada.valorMovimiento).toBe(40);
    expect(Math.abs(filaSalida.valorMovimiento!)).toBe(Math.abs(filaEntrada.valorMovimiento!));
  });
});

describe('proyectarKardexValorizado — movimientos sin valorización y revertidos', () => {
  it('movimiento cuantitativo histórico (sin capa ni consumo vinculado) devuelve sin valorización, nunca inventa un costo', () => {
    const movimiento = crearMovimiento({ id: 'mov-historico' });
    const filas = proyectarKardexValorizado({ empresaId: 'emp-A', movimientos: [movimiento] });
    const fila = filas.get('mov-historico')!;
    expect(fila.tieneValorizacion).toBe(false);
    expect(fila.costoUnitario).toBeUndefined();
    expect(fila.valorMovimiento).toBeUndefined();
    expect(fila.origenes).toHaveLength(0);
  });

  it('movimiento revertido conserva su costo histórico (el consumo mutado a revertido sigue sumando)', () => {
    guardarCapaCostoInventario(crearCapa({ cantidadDisponible: 0 }), 'emp-A');
    guardarConsumoCapaCostoInventario(crearConsumo({ estado: 'revertido' }), 'emp-A');
    const movimientoSalida = crearMovimiento({ id: 'mov-2', tipo: 'SALIDA', motivo: 'VENTA', cantidad: 3, estado: 'revertido' });
    const filas = proyectarKardexValorizado({ empresaId: 'emp-A', movimientos: [movimientoSalida] });
    const fila = filas.get('mov-2')!;
    expect(fila.tieneValorizacion).toBe(true);
    expect(fila.valorMovimiento).toBe(-30);
    expect(fila.estadoMovimiento).toBe('revertido');
  });
});

describe('proyectarKardexValorizado — aislamiento', () => {
  it('no mezcla capas/consumos de otra empresa', () => {
    guardarCapaCostoInventario(crearCapa({ empresaId: 'emp-B' }), 'emp-B');
    const movimiento = crearMovimiento();
    const filas = proyectarKardexValorizado({ empresaId: 'emp-A', movimientos: [movimiento] });
    expect(filas.get('mov-1')!.tieneValorizacion).toBe(false);
  });

  it('no mezcla productos ni almacenes distintos en la misma agregación', () => {
    guardarCapaCostoInventario(crearCapa({ id: 'capa-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadDisponible: 5 }), 'emp-A');
    guardarCapaCostoInventario(crearCapa({ id: 'capa-2', productoId: 'prod-2', almacenId: 'alm-1', movimientoEntradaId: 'mov-otro', cantidadDisponible: 5 }), 'emp-A');
    const valores = calcularValorStockPorProductoAlmacen('emp-A');
    expect(valores.get(claveValorStock('prod-1', 'alm-1'))?.valorStock).toBe(50);
    expect(valores.get(claveValorStock('prod-2', 'alm-1'))?.valorStock).toBe(50);
  });

  it('no usa Product.precioCompra ni ningún campo de producto — el resultado depende solo de las capas', () => {
    guardarCapaCostoInventario(crearCapa({ costoUnitarioBaseMonedaBase: 25, cantidadDisponible: 4 }), 'emp-A');
    const valores = calcularValorStockPorProductoAlmacen('emp-A');
    expect(valores.get(claveValorStock('prod-1', 'alm-1'))?.valorStock).toBe(100);
  });
});

describe('calcularValorStockPorProductoAlmacen / obtenerValorStockProducto', () => {
  it('valor por producto+almacén es la suma de cantidadDisponible × costoUnitarioBaseMonedaBase de las capas vigentes', () => {
    guardarCapaCostoInventario(crearCapa({ id: 'capa-1', cantidadDisponible: 6, costoUnitarioBaseMonedaBase: 10 }), 'emp-A');
    guardarCapaCostoInventario(crearCapa({ id: 'capa-2', cantidadDisponible: 4, costoUnitarioBaseMonedaBase: 12, movimientoEntradaId: 'mov-otro' }), 'emp-A');
    const valores = calcularValorStockPorProductoAlmacen('emp-A');
    // 6*10 + 4*12 = 108
    expect(valores.get(claveValorStock('prod-1', 'alm-1'))?.valorStock).toBe(108);
  });

  it('capa revertida o agotada (cantidadDisponible 0) no se incluye en el valor de stock', () => {
    guardarCapaCostoInventario(crearCapa({ id: 'capa-1', cantidadDisponible: 5, costoUnitarioBaseMonedaBase: 10 }), 'emp-A');
    guardarCapaCostoInventario(crearCapa({ id: 'capa-2', cantidadDisponible: 0, estado: 'agotada', costoUnitarioBaseMonedaBase: 10, movimientoEntradaId: 'mov-otro' }), 'emp-A');
    guardarCapaCostoInventario(crearCapa({ id: 'capa-3', cantidadDisponible: 5, estado: 'revertida', costoUnitarioBaseMonedaBase: 10, movimientoEntradaId: 'mov-otro-2' }), 'emp-A');
    const valores = calcularValorStockPorProductoAlmacen('emp-A');
    expect(valores.get(claveValorStock('prod-1', 'alm-1'))?.valorStock).toBe(50);
  });

  it('el filtro de establecimiento/almacén (alcance) se respeta al sumar por producto y el total', () => {
    guardarCapaCostoInventario(crearCapa({ id: 'capa-1', almacenId: 'alm-1', cantidadDisponible: 5, costoUnitarioBaseMonedaBase: 10 }), 'emp-A');
    guardarCapaCostoInventario(crearCapa({ id: 'capa-2', almacenId: 'alm-2', cantidadDisponible: 3, costoUnitarioBaseMonedaBase: 20, movimientoEntradaId: 'mov-otro' }), 'emp-A');
    const valores = calcularValorStockPorProductoAlmacen('emp-A');
    expect(obtenerValorStockProducto(valores, 'prod-1', ['alm-1'])).toBe(50);
    expect(obtenerValorStockProducto(valores, 'prod-1', ['alm-1', 'alm-2'])).toBe(110);
  });

  it('el valor total del alcance (suma de obtenerValorStockProducto de cada producto — mismo cálculo que usa el resumen de Stock Actual) coincide con la suma de las filas, nunca usa precio de venta', () => {
    guardarCapaCostoInventario(crearCapa({ id: 'capa-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadDisponible: 5, costoUnitarioBaseMonedaBase: 10 }), 'emp-A');
    guardarCapaCostoInventario(crearCapa({ id: 'capa-2', productoId: 'prod-2', almacenId: 'alm-1', movimientoEntradaId: 'mov-otro', cantidadDisponible: 2, costoUnitarioBaseMonedaBase: 15 }), 'emp-A');
    guardarCapaCostoInventario(crearCapa({ id: 'capa-3', productoId: 'prod-3', almacenId: 'alm-2', movimientoEntradaId: 'mov-otro-2', cantidadDisponible: 1, costoUnitarioBaseMonedaBase: 100 }), 'emp-A');
    const valores = calcularValorStockPorProductoAlmacen('emp-A');
    const productos = ['prod-1', 'prod-2', 'prod-3'];
    const totalAlmacen1 = productos.reduce((sum, id) => sum + obtenerValorStockProducto(valores, id, ['alm-1']), 0);
    const totalAmbosAlmacenes = productos.reduce((sum, id) => sum + obtenerValorStockProducto(valores, id, ['alm-1', 'alm-2']), 0);
    expect(totalAlmacen1).toBe(80);
    expect(totalAmbosAlmacenes).toBe(180);
  });
});
