import { describe, expect, it } from 'vitest';
import { detectarStockPositivoPorProductoAlmacen, resolverPropuestaCosto } from './deteccionValorizacionInicial';
import type { Product } from '../../catalogo-articulos/models/types';
import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';

function crearProducto(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod-1',
    codigo: 'P001',
    nombre: 'Producto 1',
    tipoExistencia: 'MERCADERIAS',
    price: 10,
    ...overrides,
  } as Product;
}

function crearAlmacen(id: string): Almacen {
  return { id } as Almacen;
}

const almacenes = new Map<string, Almacen>([
  ['alm-1', crearAlmacen('alm-1')],
  ['alm-2', crearAlmacen('alm-2')],
]);

describe('detectarStockPositivoPorProductoAlmacen', () => {
  it('detecta una fila por cada producto+almacén con cantidad positiva', () => {
    const productos = [crearProducto({ stockPorAlmacen: { 'alm-1': 10, 'alm-2': 5 } })];
    const resultado = detectarStockPositivoPorProductoAlmacen(productos, almacenes);
    expect(resultado).toHaveLength(2);
    expect(resultado).toEqual(
      expect.arrayContaining([
        { productoId: 'prod-1', almacenId: 'alm-1', cantidadDetectada: 10 },
        { productoId: 'prod-1', almacenId: 'alm-2', cantidadDetectada: 5 },
      ])
    );
  });

  it('excluye combinaciones con stock cero o negativo', () => {
    const productos = [crearProducto({ stockPorAlmacen: { 'alm-1': 0, 'alm-2': -3 } })];
    expect(detectarStockPositivoPorProductoAlmacen(productos, almacenes)).toHaveLength(0);
  });

  it('excluye productos no inventariables (SERVICIOS, OTROS, sin tipoExistencia)', () => {
    const productos = [
      crearProducto({ id: 'p-servicio', tipoExistencia: 'SERVICIOS', stockPorAlmacen: { 'alm-1': 10 } }),
      crearProducto({ id: 'p-otros', tipoExistencia: 'OTROS', stockPorAlmacen: { 'alm-1': 10 } }),
      crearProducto({ id: 'p-sin-tipo', tipoExistencia: undefined, stockPorAlmacen: { 'alm-1': 10 } }),
    ];
    expect(detectarStockPositivoPorProductoAlmacen(productos, almacenes)).toHaveLength(0);
  });

  it('ignora almacenes que ya no existen en el catálogo vigente', () => {
    const productos = [crearProducto({ stockPorAlmacen: { 'alm-1': 10, 'alm-inexistente': 20 } })];
    const resultado = detectarStockPositivoPorProductoAlmacen(productos, almacenes);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].almacenId).toBe('alm-1');
  });

  it('no detecta nada si stockPorAlmacen está ausente', () => {
    expect(detectarStockPositivoPorProductoAlmacen([crearProducto()], almacenes)).toHaveLength(0);
  });
});

describe('resolverPropuestaCosto', () => {
  it('usa precioCompra cuando es finito y mayor a cero', () => {
    expect(resolverPropuestaCosto({ precioCompra: 25 })).toEqual({ costoPropuesto: 25, origenPropuesta: 'precioCompra' });
  });

  it('devuelve sin_propuesta cuando no hay precioCompra válido', () => {
    expect(resolverPropuestaCosto({ precioCompra: undefined })).toEqual({ costoPropuesto: 0, origenPropuesta: 'sin_propuesta' });
    expect(resolverPropuestaCosto({ precioCompra: 0 })).toEqual({ costoPropuesto: 0, origenPropuesta: 'sin_propuesta' });
    expect(resolverPropuestaCosto({ precioCompra: -5 })).toEqual({ costoPropuesto: 0, origenPropuesta: 'sin_propuesta' });
    expect(resolverPropuestaCosto({ precioCompra: NaN })).toEqual({ costoPropuesto: 0, origenPropuesta: 'sin_propuesta' });
  });

  it('prioriza el último costo documental sobre precioCompra cuando ambos existen', () => {
    const resultado = resolverPropuestaCosto({ precioCompra: 25 }, () => 40);
    expect(resultado).toEqual({ costoPropuesto: 40, origenPropuesta: 'ultimoCostoDocumental' });
  });

  it('cae a precioCompra si el hook de costo documental no devuelve un valor válido', () => {
    const resultado = resolverPropuestaCosto({ precioCompra: 25 }, () => undefined);
    expect(resultado).toEqual({ costoPropuesto: 25, origenPropuesta: 'precioCompra' });
  });

  it('nunca usa precio de venta como costo', () => {
    // resolverPropuestaCosto solo acepta `precioCompra` en su firma — un producto con `price` alto
    // pero sin `precioCompra` debe seguir cayendo a sin_propuesta.
    expect(resolverPropuestaCosto({ precioCompra: undefined })).toEqual({ costoPropuesto: 0, origenPropuesta: 'sin_propuesta' });
  });
});
