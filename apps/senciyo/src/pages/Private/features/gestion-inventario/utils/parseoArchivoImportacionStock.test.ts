// Cierre de bloqueante 2 de la revisión de Etapa 2: `PanelImportacionStock.tsx` debe soportar una
// columna COSTO por almacén en la plantilla nueva, el formato legacy con COSTO
// (CODIGO | ALMACEN | CANTIDAD | COSTO), y seguir leyendo archivos antiguos sin costo exactamente
// igual que antes. Sin infraestructura de pruebas de componente en este repo (no hay React Testing
// Library/jsdom), estas pruebas ejercen directamente las funciones de parseo puras exportadas del
// componente.
import { describe, it, expect } from 'vitest';
import {
  parsearFormatoNuevo,
  parsearFormatoLegacy,
  encabezadoAlmacen,
  encabezadoCostoAlmacen,
} from './parseoArchivoImportacionStock';
import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';

function crearAlmacen(overrides: Partial<Almacen> = {}): Almacen {
  return {
    id: 'alm-1',
    codigoAlmacen: 'ALM01',
    nombreAlmacen: 'Principal',
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
  } as Almacen;
}

const almacen1 = crearAlmacen();
const almacen2 = crearAlmacen({ id: 'alm-2', codigoAlmacen: 'ALM02', nombreAlmacen: 'Secundario' });

describe('parsearFormatoNuevo — columna COSTO por almacén (Etapa 2)', () => {
  it('parsea cantidad y costo cuando ambas columnas están presentes', () => {
    const encabezados = ['CODIGO', 'PRODUCTO', 'UNIDAD', encabezadoAlmacen(almacen1), encabezadoCostoAlmacen(almacen1)];
    const filas = [['P001', 'Producto 1', 'NIU', '20', '8.50']];

    const resultado = parsearFormatoNuevo(encabezados, filas, [almacen1]);

    expect(resultado.erroresPorFila).toHaveLength(0);
    expect(resultado.filas).toHaveLength(1);
    expect(resultado.filas[0].cantidadPorAlmacen['alm-1']).toBe(20);
    expect(resultado.filas[0].costoPorAlmacen['alm-1']).toBe(8.5);
  });

  it('compatibilidad con archivos ANTIGUOS sin columna de costo — costoPorAlmacen queda vacío, cantidad se lee igual', () => {
    const encabezados = ['CODIGO', 'PRODUCTO', 'UNIDAD', encabezadoAlmacen(almacen1)];
    const filas = [['P001', 'Producto 1', 'NIU', '20']];

    const resultado = parsearFormatoNuevo(encabezados, filas, [almacen1]);

    expect(resultado.erroresPorFila).toHaveLength(0);
    expect(resultado.filas[0].cantidadPorAlmacen['alm-1']).toBe(20);
    expect(resultado.filas[0].costoPorAlmacen['alm-1']).toBeUndefined();
  });

  it('celda de costo vacía se lee como null (sin costo declarado para esa fila), nunca como error', () => {
    const encabezados = ['CODIGO', 'PRODUCTO', 'UNIDAD', encabezadoAlmacen(almacen1), encabezadoCostoAlmacen(almacen1)];
    const filas = [['P001', 'Producto 1', 'NIU', '20', '']];

    const resultado = parsearFormatoNuevo(encabezados, filas, [almacen1]);

    expect(resultado.erroresPorFila).toHaveLength(0);
    expect(resultado.filas[0].costoPorAlmacen['alm-1']).toBeNull();
  });

  it('costo no numérico produce un error de fila (mismo criterio que cantidad no numérica)', () => {
    const encabezados = ['CODIGO', 'PRODUCTO', 'UNIDAD', encabezadoAlmacen(almacen1), encabezadoCostoAlmacen(almacen1)];
    const filas = [['P001', 'Producto 1', 'NIU', '20', 'abc']];

    const resultado = parsearFormatoNuevo(encabezados, filas, [almacen1]);

    expect(resultado.erroresPorFila.length).toBeGreaterThan(0);
    expect(resultado.erroresPorFila[0].mensaje).toMatch(/costo válido/);
  });

  it('múltiples almacenes: cada columna de costo se asocia a SU propio almacén, nunca al otro', () => {
    const encabezados = [
      'CODIGO', 'PRODUCTO', 'UNIDAD',
      encabezadoAlmacen(almacen1), encabezadoCostoAlmacen(almacen1),
      encabezadoAlmacen(almacen2), encabezadoCostoAlmacen(almacen2),
    ];
    const filas = [['P001', 'Producto 1', 'NIU', '10', '5.00', '30', '9.00']];

    const resultado = parsearFormatoNuevo(encabezados, filas, [almacen1, almacen2]);

    expect(resultado.filas[0].cantidadPorAlmacen['alm-1']).toBe(10);
    expect(resultado.filas[0].costoPorAlmacen['alm-1']).toBe(5);
    expect(resultado.filas[0].cantidadPorAlmacen['alm-2']).toBe(30);
    expect(resultado.filas[0].costoPorAlmacen['alm-2']).toBe(9);
  });

  it('la columna de costo nunca se cuenta como "columna desconocida"', () => {
    const encabezados = ['CODIGO', 'PRODUCTO', 'UNIDAD', encabezadoAlmacen(almacen1), encabezadoCostoAlmacen(almacen1)];
    const filas = [['P001', 'Producto 1', 'NIU', '20', '8.50']];

    const resultado = parsearFormatoNuevo(encabezados, filas, [almacen1]);
    expect(resultado.columnasDesconocidas).toHaveLength(0);
  });
});

describe('parsearFormatoLegacy — soporte de COSTO en CODIGO | ALMACEN | CANTIDAD | COSTO', () => {
  it('parsea la columna COSTO cuando está presente', () => {
    const encabezados = ['codigo', 'almacen', 'cantidad', 'costo'];
    const filas = [['P001', 'ALM01', '15', '6.25']];

    const resultado = parsearFormatoLegacy(encabezados, filas, [almacen1]);

    expect(resultado.erroresPorFila).toHaveLength(0);
    expect(resultado.filas[0].cantidadPorAlmacen['alm-1']).toBe(15);
    expect(resultado.filas[0].costoPorAlmacen['alm-1']).toBe(6.25);
  });

  it('compatibilidad con archivos legacy ANTIGUOS sin columna COSTO — se sigue leyendo igual que antes', () => {
    const encabezados = ['codigo', 'almacen', 'cantidad'];
    const filas = [['P001', 'ALM01', '15']];

    const resultado = parsearFormatoLegacy(encabezados, filas, [almacen1]);

    expect(resultado.erroresPorFila).toHaveLength(0);
    expect(resultado.filas[0].cantidadPorAlmacen['alm-1']).toBe(15);
    expect(resultado.filas[0].costoPorAlmacen['alm-1']).toBeNull();
  });

  it('formato legacy sin columna ALMACEN (aplica a "_ALL") también soporta costo', () => {
    const encabezados = ['codigo', 'cantidad', 'costo'];
    const filas = [['P001', '15', '6.25']];

    const resultado = parsearFormatoLegacy(encabezados, filas, [almacen1]);

    expect(resultado.filas[0].cantidadPorAlmacen['_ALL']).toBe(15);
    expect(resultado.filas[0].costoPorAlmacen['_ALL']).toBe(6.25);
  });
});
