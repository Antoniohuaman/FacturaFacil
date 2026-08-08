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
import { guardarCapaCostoInventario, listarCapasCostoInventarioPorEmpresa } from '../repositories/capaCostoInventario.repository';
import { listarConsumosCapaCostoInventarioPorEmpresa } from '../repositories/consumoCapaCostoInventario.repository';
import type { CapaCostoInventario } from '../models/capaCostoInventario.types';

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
      almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada', controlStockActivo: true,
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
      almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada', controlStockActivo: true,
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
      ServicioKardexValorizado.importarStockValorizado(datos, { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada', controlStockActivo: true })
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
      ServicioKardexValorizado.importarStockValorizado(datos, { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada', controlStockActivo: true })
    ).rejects.toThrow(/no existe en el catálogo/);
  });

  it('reintento con la misma claveIdempotencia (mismo contenido) no duplica movimientos ni vuelve a mutar stock', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 5 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    const datos = datosImportacionBase({ empresaId });
    const dependencias = { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' as const, controlStockActivo: true };

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

    await ServicioKardexValorizado.importarStockValorizado(datos, { almacenes, generarId, fechaActual, estadoValorizacion: 'pendiente_costos', controlStockActivo: true });

    const loteActualizado = obtenerLoteActivoPorEmpresa(empresaId)!;
    expect(loteActualizado.detalles.find((d) => d.productoId === 'prod-1')?.requiereRecalculo).toBe(true);
    expect(loteActualizado.detalles.find((d) => d.productoId === 'prod-2')?.requiereRecalculo).toBe(true);
  });

  it('bloqueado (estadoValorizacion="validada") rechaza la importación sin reservar nada', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 5 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    await expect(
      ServicioKardexValorizado.importarStockValorizado(datosImportacionBase({ empresaId }), { almacenes, generarId, fechaActual, estadoValorizacion: 'validada', controlStockActivo: true })
    ).rejects.toThrow(/bloquea toda mutación/);

    expect(localStorage.getItem(lsKey(CLAVE_COLECCION_OPERACIONES_IDEMPOTENTES, empresaId))).toBeNull();
  });
});

describe('Etapa 4A, §8: importación en modo reemplazo — la reducción real de stock consume capas FIFO', () => {
  function crearCapaDePrueba(overrides: Partial<CapaCostoInventario> = {}): CapaCostoInventario {
    return {
      id: 'capa-A',
      empresaId: 'emp-A',
      establecimientoId: 'est-1',
      productoId: 'prod-1',
      almacenId: 'alm-1',
      movimientoEntradaId: 'mov-x',
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
      fechaTipoCambio: '2026-01-01',
      fechaEntrada: '2026-01-01T00:00:00.000Z',
      estado: 'disponible',
      procedencia: 'compra',
      usuario: 'user-1',
      fechaCreacion: '2026-01-01T00:00:00.000Z',
      ...overrides,
    };
  }

  it('ejemplo obligatorio: capa A 10@10 + capa B 5@12, línea de salida por 12 consume 10 de A + 2 de B (costo 124)', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 15 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    guardarCapaCostoInventario(crearCapaDePrueba({ id: 'capa-A', cantidadInicial: 10, cantidadDisponible: 10, costoUnitarioBaseMonedaBase: 10, fechaEntrada: '2026-01-01T00:00:00.000Z' }), empresaId);
    guardarCapaCostoInventario(crearCapaDePrueba({ id: 'capa-B', cantidadInicial: 5, cantidadDisponible: 5, costoUnitarioBaseMonedaBase: 12, fechaEntrada: '2026-01-02T00:00:00.000Z' }), empresaId);

    const datos = datosImportacionBase({
      empresaId,
      modoOperacion: 'valorizado',
      lineas: [{ lineaId: 'IMPORT-lote-1-1', productoId: 'prod-1', almacenId: 'alm-1', diferencia: -12 }], // 15 -> 3
    });

    const resultado = await ServicioKardexValorizado.importarStockValorizado(datos, {
      almacenes, generarId, fechaActual, estadoValorizacion: 'activa', controlStockActivo: true,
    });

    expect(resultado.estado).toBe('nueva');
    const productos = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productos[0].stockPorAlmacen?.['alm-1']).toBe(3);

    const capas = listarCapasCostoInventarioPorEmpresa(empresaId);
    expect(capas.find((c) => c.id === 'capa-A')?.cantidadDisponible).toBe(0);
    expect(capas.find((c) => c.id === 'capa-A')?.estado).toBe('agotada');
    expect(capas.find((c) => c.id === 'capa-A')?.cantidadInicial).toBe(10); // nunca cambia
    expect(capas.find((c) => c.id === 'capa-B')?.cantidadDisponible).toBe(3);

    const consumos = listarConsumosCapaCostoInventarioPorEmpresa(empresaId);
    expect(consumos).toHaveLength(2);
    const costoTotal = consumos.reduce((acc, c) => acc + c.valorConsumidoMonedaBase, 0);
    expect(costoTotal).toBe(124);
  });

  it('reemplazo con aumento: la línea de entrada crea una CapaCostoInventario con el costo de la fila', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 5 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    const datos = datosImportacionBase({
      empresaId,
      modoOperacion: 'valorizado',
      lineas: [{ lineaId: 'IMPORT-lote-1-1', productoId: 'prod-1', almacenId: 'alm-1', diferencia: 15, costoUnitarioBaseMonedaBase: 9 }], // 5 -> 20
    });

    const resultado = await ServicioKardexValorizado.importarStockValorizado(datos, {
      almacenes, generarId, fechaActual, estadoValorizacion: 'activa', controlStockActivo: true, monedaBase: 'PEN',
    });

    expect(resultado.estado).toBe('nueva');
    const productos = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productos[0].stockPorAlmacen?.['alm-1']).toBe(20);

    const capas = listarCapasCostoInventarioPorEmpresa(empresaId);
    expect(capas).toHaveLength(1);
    expect(capas[0].cantidadInicial).toBe(15);
    expect(capas[0].cantidadDisponible).toBe(15);
    expect(capas[0].costoUnitarioBaseMonedaBase).toBe(9);
    expect(capas[0].procedencia).toBe('importacion');
    expect(listarConsumosCapaCostoInventarioPorEmpresa(empresaId)).toHaveLength(0);
  });

  it('reemplazo con aumento SIN costo válido rechaza el LOTE COMPLETO — nunca confirma stock incrementado sin capa', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 5 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    const datos = datosImportacionBase({
      empresaId,
      modoOperacion: 'valorizado',
      lineas: [{ lineaId: 'IMPORT-lote-1-1', productoId: 'prod-1', almacenId: 'alm-1', diferencia: 15 }], // sin costoUnitarioBaseMonedaBase
    });

    await expect(
      ServicioKardexValorizado.importarStockValorizado(datos, { almacenes, generarId, fechaActual, estadoValorizacion: 'activa', controlStockActivo: true, monedaBase: 'PEN' })
    ).rejects.toThrow(/requiere costoUnitarioBaseMonedaBase/);

    const productos = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productos[0].stockPorAlmacen?.['alm-1']).toBe(5);
    expect(listarCapasCostoInventarioPorEmpresa(empresaId)).toHaveLength(0);
  });

  it('lote mixto en modo valorizado: la línea de entrada crea su capa Y la de salida consume FIFO, ambas atómicamente', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [
      crearProducto({ id: 'prod-1', codigo: 'P001', stockPorAlmacen: { 'alm-1': 5 } }),
      crearProducto({ id: 'prod-2', codigo: 'P002', stockPorAlmacen: { 'alm-1': 20 } }),
    ]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    guardarCapaCostoInventario(crearCapaDePrueba({ id: 'capa-A', productoId: 'prod-2', cantidadInicial: 20, cantidadDisponible: 20 }), empresaId);

    const datos = datosImportacionBase({
      empresaId,
      modoOperacion: 'valorizado',
      lineas: [
        { lineaId: 'IMPORT-lote-1-1', productoId: 'prod-1', almacenId: 'alm-1', diferencia: 15, costoUnitarioBaseMonedaBase: 7 }, // entrada: 5 -> 20
        { lineaId: 'IMPORT-lote-1-2', productoId: 'prod-2', almacenId: 'alm-1', diferencia: -8 }, // salida: 20 -> 12
      ],
    });

    await ServicioKardexValorizado.importarStockValorizado(datos, { almacenes, generarId, fechaActual, estadoValorizacion: 'activa', controlStockActivo: true, monedaBase: 'PEN' });

    const productos = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productos.find((p) => p.id === 'prod-1')?.stockPorAlmacen?.['alm-1']).toBe(20);
    expect(productos.find((p) => p.id === 'prod-2')?.stockPorAlmacen?.['alm-1']).toBe(12);

    // La capa de la SALIDA (prod-2) queda consumida Y aparece una capa NUEVA para la ENTRADA (prod-1).
    const capas = listarCapasCostoInventarioPorEmpresa(empresaId);
    expect(capas).toHaveLength(2);
    const capaSalida = capas.find((c) => c.productoId === 'prod-2');
    const capaEntrada = capas.find((c) => c.productoId === 'prod-1');
    expect(capaSalida?.cantidadDisponible).toBe(12);
    expect(capaEntrada?.cantidadInicial).toBe(15);
    expect(capaEntrada?.costoUnitarioBaseMonedaBase).toBe(7);
    expect(listarConsumosCapaCostoInventarioPorEmpresa(empresaId)).toHaveLength(1);
  });

  it('reintento (misma claveIdempotencia) en modo valorizado no duplica stock, capas ni consumos', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [
      crearProducto({ id: 'prod-1', codigo: 'P001', stockPorAlmacen: { 'alm-1': 5 } }),
      crearProducto({ id: 'prod-2', codigo: 'P002', stockPorAlmacen: { 'alm-1': 20 } }),
    ]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    guardarCapaCostoInventario(crearCapaDePrueba({ id: 'capa-A', productoId: 'prod-2', cantidadInicial: 20, cantidadDisponible: 20 }), empresaId);

    const datos = datosImportacionBase({
      empresaId,
      modoOperacion: 'valorizado',
      lineas: [
        { lineaId: 'IMPORT-lote-1-1', productoId: 'prod-1', almacenId: 'alm-1', diferencia: 15, costoUnitarioBaseMonedaBase: 7 },
        { lineaId: 'IMPORT-lote-1-2', productoId: 'prod-2', almacenId: 'alm-1', diferencia: -8 },
      ],
    });
    const dependencias = { almacenes, generarId, fechaActual, estadoValorizacion: 'activa' as const, controlStockActivo: true, monedaBase: 'PEN' };

    const primero = await ServicioKardexValorizado.importarStockValorizado(datos, dependencias);
    expect(primero.estado).toBe('nueva');
    const segundo = await ServicioKardexValorizado.importarStockValorizado(datos, dependencias);
    expect(segundo.estado).toBe('repetida');

    const productos = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productos.find((p) => p.id === 'prod-1')?.stockPorAlmacen?.['alm-1']).toBe(20); // nunca 5 + 15 + 15
    expect(productos.find((p) => p.id === 'prod-2')?.stockPorAlmacen?.['alm-1']).toBe(12);
    expect(listarCapasCostoInventarioPorEmpresa(empresaId)).toHaveLength(2); // nunca una segunda capa de entrada
    expect(listarConsumosCapaCostoInventarioPorEmpresa(empresaId)).toHaveLength(1); // nunca un segundo consumo
  });

  it('diferencia=0 (sin cambio) no genera movimiento, capa ni consumo', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 10 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    // El panel nunca incluye una línea con diferencia=0 en `lineas` (se filtra antes) — este test
    // confirma que, si igual llegara una, `validarContratoImportacion` la rechaza explícitamente en
    // vez de tratarla como una operación válida sin efecto.
    const datos = datosImportacionBase({
      empresaId,
      modoOperacion: 'valorizado',
      lineas: [{ lineaId: 'IMPORT-lote-1-1', productoId: 'prod-1', almacenId: 'alm-1', diferencia: 0 }],
    });

    await expect(
      ServicioKardexValorizado.importarStockValorizado(datos, { almacenes, generarId, fechaActual, estadoValorizacion: 'activa', controlStockActivo: true, monedaBase: 'PEN' })
    ).rejects.toThrow(/distinta de cero/);

    expect(localStorage.getItem(lsKey(STORAGE_KEY_MOVEMENTS, empresaId))).toBeNull();
  });

  it('modoOperacion="cuantitativo" (comportamiento actual): ni la entrada crea capa ni la salida consume, aunque existan capas disponibles', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [
      crearProducto({ id: 'prod-1', codigo: 'P001', stockPorAlmacen: { 'alm-1': 5 } }),
      crearProducto({ id: 'prod-2', codigo: 'P002', stockPorAlmacen: { 'alm-1': 15 } }),
    ]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    guardarCapaCostoInventario(crearCapaDePrueba({ id: 'capa-A', productoId: 'prod-2' }), empresaId);

    const datos = datosImportacionBase({
      empresaId,
      modoOperacion: 'cuantitativo',
      lineas: [
        { lineaId: 'IMPORT-lote-1-1', productoId: 'prod-1', almacenId: 'alm-1', diferencia: 15 }, // sin costo — nunca exigido en cuantitativo
        { lineaId: 'IMPORT-lote-1-2', productoId: 'prod-2', almacenId: 'alm-1', diferencia: -12 },
      ],
    });

    await ServicioKardexValorizado.importarStockValorizado(datos, { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada', controlStockActivo: true });

    expect(listarConsumosCapaCostoInventarioPorEmpresa(empresaId)).toHaveLength(0);
    expect(listarCapasCostoInventarioPorEmpresa(empresaId)).toHaveLength(1); // la única preexistente, sin cambios
    expect(listarCapasCostoInventarioPorEmpresa(empresaId)[0].cantidadDisponible).toBe(10);
  });

  it('capas insuficientes para la línea de salida rechazan el LOTE COMPLETO — la línea de entrada tampoco se aplica ni crea capa', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [
      crearProducto({ id: 'prod-1', codigo: 'P001', stockPorAlmacen: { 'alm-1': 5 } }),
      crearProducto({ id: 'prod-2', codigo: 'P002', stockPorAlmacen: { 'alm-1': 20 } }),
    ]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    guardarCapaCostoInventario(crearCapaDePrueba({ id: 'capa-A', productoId: 'prod-2', cantidadInicial: 3, cantidadDisponible: 3 }), empresaId);

    const datos = datosImportacionBase({
      empresaId,
      modoOperacion: 'valorizado',
      lineas: [
        { lineaId: 'IMPORT-lote-1-1', productoId: 'prod-1', almacenId: 'alm-1', diferencia: 15, costoUnitarioBaseMonedaBase: 7 },
        { lineaId: 'IMPORT-lote-1-2', productoId: 'prod-2', almacenId: 'alm-1', diferencia: -8 }, // solo 3 disponibles, faltan 5
      ],
    });

    await expect(
      ServicioKardexValorizado.importarStockValorizado(datos, { almacenes, generarId, fechaActual, estadoValorizacion: 'activa', controlStockActivo: true, monedaBase: 'PEN' })
    ).rejects.toThrow(/no cubren exactamente/);

    const productos = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productos.find((p) => p.id === 'prod-1')?.stockPorAlmacen?.['alm-1']).toBe(5);
    expect(productos.find((p) => p.id === 'prod-2')?.stockPorAlmacen?.['alm-1']).toBe(20);
    expect(listarCapasCostoInventarioPorEmpresa(empresaId)).toHaveLength(1); // la preexistente, sin la de entrada ni tocada
    expect(listarCapasCostoInventarioPorEmpresa(empresaId)[0].cantidadDisponible).toBe(3);
  });
});
