// gestion-inventario/utils/importacionCuantitativaInventario.test.ts
//
// Cierre de bloqueante 2 de la revisión de Etapa 2: la importación de stock ahora pasa por el
// motor central (`ServicioKardexValorizado.importarStockValorizado`) — lote mixto de entradas y
// salidas confirmado como una sola unidad de trabajo, una fila inválida rechaza el lote completo,
// reintento no duplica, invalidación del snapshot de valorización inicial para los producto+almacén
// realmente modificados.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { instalarLocalStorageDePrueba } from '../repositories/localStorageDePrueba';
import { ServicioKardexValorizado } from '../services/servicioKardexValorizado';
import { PRODUCT_STORAGE_KEY } from '../../catalogo-articulos/utils/catalogStorage';
import { STORAGE_KEY_MOVEMENTS } from '../repositories/stock.repository';
import { CLAVE_COLECCION_OPERACIONES_IDEMPOTENTES } from '../repositories/operacionIdempotenteInventario.repository';
import { obtenerEstadoVersionInventario } from '../repositories/estadoVersionInventario.repository';
import {
  guardarValorizacionInicialInventario,
  obtenerLoteActivoPorEmpresa,
} from '../repositories/valorizacionInicialInventario.repository';
import { construirClaveIdempotenciaImportacion } from '../models/loteImportacionValorizada.types';
import type { DatosImportacionCuantitativa } from '../models/operacionImportacionInventario.types';
import type { ValorizacionInicialInventario } from '../models/valorizacionInicialInventario.types';
import type { Product } from '../../catalogo-articulos/models/types';
import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';
import { lsKey } from '../../../../../shared/tenant';

instalarLocalStorageDePrueba();
beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

let contadorId = 0;
function generarId(): string {
  contadorId += 1;
  return `gen-${contadorId}`;
}
function fechaActual(): string {
  return '2026-08-01T00:00:00.000Z';
}

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
    tipoExistencia: 'MERCADERIAS',
    stockPorAlmacen: {},
    fechaCreacion: new Date('2026-01-01T00:00:00.000Z'),
    fechaActualizacion: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function sembrarProductos(empresaId: string, productos: Product[]): void {
  localStorage.setItem(lsKey(PRODUCT_STORAGE_KEY, empresaId), JSON.stringify(productos));
}

function datosImportacionBase(overrides: Partial<DatosImportacionCuantitativa> = {}): DatosImportacionCuantitativa {
  const loteId = overrides.loteId ?? 'lote-1';
  return {
    modoOperacion: 'cuantitativo',
    empresaId: 'emp-A',
    loteId,
    claveIdempotencia: construirClaveIdempotenciaImportacion(loteId),
    tipoOperacion: 'importacion',
    tipoDocumento: 'importacion',
    usuario: 'user-1',
    fecha: '2026-01-01T00:00:00.000Z',
    motivo: 'AJUSTE_INVENTARIO',
    lineas: [{ lineaId: 'IMPORT-lote-1-1', productoId: 'prod-1', almacenId: 'alm-1', diferencia: 10 }],
    ...overrides,
  };
}

describe('ServicioKardexValorizado.importarStockValorizado — lote mixto de entradas y salidas en una sola unidad de trabajo', () => {
  it('un lote con una línea de entrada y una de salida (productos distintos) confirma ambas en UNA sola transacción', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [
      crearProducto({ id: 'prod-1', codigo: 'P001', stockPorAlmacen: { 'alm-1': 5 } }),
      crearProducto({ id: 'prod-2', codigo: 'P002', stockPorAlmacen: { 'alm-1': 20 } }),
    ]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    const datos = datosImportacionBase({
      empresaId,
      lineas: [
        { lineaId: 'IMPORT-lote-1-1', productoId: 'prod-1', almacenId: 'alm-1', diferencia: 15 }, // entrada: 5 -> 20
        { lineaId: 'IMPORT-lote-1-2', productoId: 'prod-2', almacenId: 'alm-1', diferencia: -8 }, // salida: 20 -> 12
      ],
    });

    const resultado = await ServicioKardexValorizado.importarStockValorizado(datos, {
      almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada',
    });

    expect(resultado.estado).toBe('nueva');
    expect(resultado.movimientos).toHaveLength(2);
    expect(resultado.movimientos.find((m) => m.productoId === 'prod-1')?.tipo).toBe('ENTRADA');
    expect(resultado.movimientos.find((m) => m.productoId === 'prod-2')?.tipo).toBe('SALIDA');

    const productos = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productos.find((p) => p.id === 'prod-1')?.stockPorAlmacen?.['alm-1']).toBe(20);
    expect(productos.find((p) => p.id === 'prod-2')?.stockPorAlmacen?.['alm-1']).toBe(12);

    // Una sola unidad de trabajo: la versión de inventario sube UNA vez, no dos.
    expect(obtenerEstadoVersionInventario(empresaId)?.versionInventario).toBe(1);

    const movimientos = JSON.parse(localStorage.getItem(lsKey(STORAGE_KEY_MOVEMENTS, empresaId)) as string);
    expect(movimientos).toHaveLength(2);
  });

  it('una entrada y una salida del MISMO producto en almacenes distintos se aplican correctamente (encadenado)', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 20, 'alm-2': 5 } })]);
    const almacenes = new Map([
      ['alm-1', crearAlmacen()],
      ['alm-2', crearAlmacen({ id: 'alm-2', codigoAlmacen: 'ALM02', nombreAlmacen: 'Secundario' })],
    ]);

    const datos = datosImportacionBase({
      empresaId,
      lineas: [
        { lineaId: 'IMPORT-lote-1-1', productoId: 'prod-1', almacenId: 'alm-1', diferencia: -12 }, // salida: 20 -> 8
        { lineaId: 'IMPORT-lote-1-2', productoId: 'prod-1', almacenId: 'alm-2', diferencia: 10 }, // entrada: 5 -> 15
      ],
    });

    const resultado = await ServicioKardexValorizado.importarStockValorizado(datos, {
      almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada',
    });

    expect(resultado.estado).toBe('nueva');
    const productos = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productos[0].stockPorAlmacen?.['alm-1']).toBe(8);
    expect(productos[0].stockPorAlmacen?.['alm-2']).toBe(15);
  });

  it('una línea inválida (stock resultante negativo) rechaza el LOTE COMPLETO — ninguna línea se aplica', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [
      crearProducto({ id: 'prod-1', codigo: 'P001', stockPorAlmacen: { 'alm-1': 5 } }),
      crearProducto({ id: 'prod-2', codigo: 'P002', stockPorAlmacen: { 'alm-1': 3 } }),
    ]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    const datos = datosImportacionBase({
      empresaId,
      lineas: [
        { lineaId: 'IMPORT-lote-1-1', productoId: 'prod-1', almacenId: 'alm-1', diferencia: 15 }, // válida
        { lineaId: 'IMPORT-lote-1-2', productoId: 'prod-2', almacenId: 'alm-1', diferencia: -50 }, // inválida: dejaría stock negativo
      ],
    });

    await expect(
      ServicioKardexValorizado.importarStockValorizado(datos, { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' })
    ).rejects.toThrow(/negativo/);

    // NINGUNA línea se aplicó — ni siquiera la válida.
    const productos = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productos.find((p) => p.id === 'prod-1')?.stockPorAlmacen?.['alm-1']).toBe(5);
    expect(productos.find((p) => p.id === 'prod-2')?.stockPorAlmacen?.['alm-1']).toBe(3);
    expect(localStorage.getItem(lsKey(STORAGE_KEY_MOVEMENTS, empresaId))).toBeNull();
  });

  it('un producto inexistente en una línea rechaza el lote completo', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 5 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    const datos = datosImportacionBase({
      empresaId,
      lineas: [{ lineaId: 'IMPORT-lote-1-1', productoId: 'prod-inexistente', almacenId: 'alm-1', diferencia: 5 }],
    });

    await expect(
      ServicioKardexValorizado.importarStockValorizado(datos, { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' })
    ).rejects.toThrow(/no existe en el catálogo/);
  });

  it('reintento con la misma claveIdempotencia (mismo contenido) no duplica movimientos ni vuelve a mutar stock', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 5 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    const datos = datosImportacionBase({ empresaId });
    const dependencias = { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' as const };

    const primero = await ServicioKardexValorizado.importarStockValorizado(datos, dependencias);
    expect(primero.estado).toBe('nueva');
    const segundo = await ServicioKardexValorizado.importarStockValorizado(datos, dependencias);
    expect(segundo.estado).toBe('repetida');

    const productos = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productos[0].stockPorAlmacen?.['alm-1']).toBe(15); // 5 + 10, nunca 5 + 10 + 10
    const movimientos = JSON.parse(localStorage.getItem(lsKey(STORAGE_KEY_MOVEMENTS, empresaId)) as string);
    expect(movimientos).toHaveLength(1);
    expect(localStorage.getItem(lsKey(CLAVE_COLECCION_OPERACIONES_IDEMPOTENTES, empresaId))).not.toBeNull();
  });

  it('invalida el detalle de valorización inicial de TODOS los producto+almacén realmente modificados por el lote (entrada Y salida)', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [
      crearProducto({ id: 'prod-1', codigo: 'P001', stockPorAlmacen: { 'alm-1': 5 } }),
      crearProducto({ id: 'prod-2', codigo: 'P002', stockPorAlmacen: { 'alm-1': 20 } }),
    ]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    const lote: ValorizacionInicialInventario = {
      id: 'valorizacion-1',
      empresaId,
      usuario: 'user-1',
      fechaCreacion: '2026-01-01T00:00:00.000Z',
      estado: 'pendiente_costos',
      detalles: [
        { productoId: 'prod-1', almacenId: 'alm-1', cantidadDetectada: 5, costoPropuesto: 8, origenPropuesta: 'precioCompra', costoConfirmado: 8, confirmado: true, requiereRecalculo: false },
        { productoId: 'prod-2', almacenId: 'alm-1', cantidadDetectada: 20, costoPropuesto: 8, origenPropuesta: 'precioCompra', costoConfirmado: 8, confirmado: true, requiereRecalculo: false },
      ],
    };
    guardarValorizacionInicialInventario(lote, empresaId);

    const datos = datosImportacionBase({
      empresaId,
      lineas: [
        { lineaId: 'IMPORT-lote-1-1', productoId: 'prod-1', almacenId: 'alm-1', diferencia: 15 },
        { lineaId: 'IMPORT-lote-1-2', productoId: 'prod-2', almacenId: 'alm-1', diferencia: -8 },
      ],
    });

    await ServicioKardexValorizado.importarStockValorizado(datos, { almacenes, generarId, fechaActual, estadoValorizacion: 'pendiente_costos' });

    const loteActualizado = obtenerLoteActivoPorEmpresa(empresaId)!;
    expect(loteActualizado.detalles.find((d) => d.productoId === 'prod-1')?.requiereRecalculo).toBe(true);
    expect(loteActualizado.detalles.find((d) => d.productoId === 'prod-2')?.requiereRecalculo).toBe(true);
  });

  it('bloqueado (estadoValorizacion="validada") rechaza la importación sin reservar nada', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 5 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    await expect(
      ServicioKardexValorizado.importarStockValorizado(datosImportacionBase({ empresaId }), { almacenes, generarId, fechaActual, estadoValorizacion: 'validada' })
    ).rejects.toThrow(/bloquea toda mutación/);

    expect(localStorage.getItem(lsKey(CLAVE_COLECCION_OPERACIONES_IDEMPOTENTES, empresaId))).toBeNull();
  });
});
