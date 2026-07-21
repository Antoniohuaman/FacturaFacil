import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { instalarLocalStorageDePrueba } from '../repositories/localStorageDePrueba';
import { ServicioKardexValorizado } from '../services/servicioKardexValorizado';
import { ConflictoIdempotencia } from './erroresInventario';
import { PRODUCT_STORAGE_KEY } from '../../catalogo-articulos/utils/catalogStorage';
import { STORAGE_KEY_MOVEMENTS } from '../repositories/stock.repository';
import { guardarCapaCostoInventario, listarCapasCostoInventarioPorEmpresa } from '../repositories/capaCostoInventario.repository';
import { guardarConsumoCapaCostoInventario, listarConsumosCapaCostoInventarioPorEmpresa } from '../repositories/consumoCapaCostoInventario.repository';
import type { CapaCostoInventario } from '../models/capaCostoInventario.types';
import type { ConsumoCapaCostoInventario } from '../models/consumoCapaCostoInventario.types';
import type { DatosOperacionEntradaCuantitativa, DatosOperacionSalidaCuantitativa } from '../models/operacionEntradaInventario.types';
import type { DatosTransferenciaInventario } from '../models/operacionTransferenciaInventario.types';
import type { DatosReversoInventario, DatosAnulacionDocumentoInventario } from '../models/operacionReversoInventario.types';
import type { Product } from '../../catalogo-articulos/models/types';
import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';
import type { MovimientoStock } from '../models/inventory.types';
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
  return '2026-08-02T00:00:00.000Z';
}

const EST_1 = 'est-1';

function crearAlmacen(overrides: Partial<Almacen> = {}): Almacen {
  return {
    id: 'alm-1',
    codigoAlmacen: 'ALM01',
    nombreAlmacen: 'Almacén 1',
    establecimientoId: EST_1,
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

function almacenesBase(): Map<string, Almacen> {
  return new Map([['alm-1', crearAlmacen()]]);
}

async function crearEntradaConfirmada(empresaId: string, overrides: Partial<DatosOperacionEntradaCuantitativa> = {}) {
  const datos: DatosOperacionEntradaCuantitativa = {
    modoOperacion: 'cuantitativo',
    empresaId,
    documentoId: 'ni-1',
    tipoDocumento: 'nota_ingreso',
    tipoOperacion: 'ni_automatica',
    claveIdempotencia: 'nota_ingreso:ni-1',
    usuario: 'user-1',
    fecha: '2026-08-01T00:00:00.000Z',
    motivo: 'COMPRA',
    lineas: [{ lineaId: 'l1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 10 }],
    ...overrides,
  };
  const resultado = await ServicioKardexValorizado.registrarEntradaValorizada(datos, { almacenes: almacenesBase(), generarId, fechaActual });
  return resultado.resultadoIds[0];
}

async function crearSalidaConfirmada(empresaId: string, overrides: Partial<DatosOperacionSalidaCuantitativa> = {}) {
  const datos: DatosOperacionSalidaCuantitativa = {
    modoOperacion: 'cuantitativo',
    empresaId,
    documentoId: 'ns-1',
    tipoDocumento: 'nota_salida',
    tipoOperacion: 'nota_salida',
    claveIdempotencia: 'nota_salida:ns-1',
    usuario: 'user-1',
    fecha: '2026-08-01T00:00:00.000Z',
    motivo: 'VENTA',
    lineas: [{ lineaId: 'l1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 4 }],
    ...overrides,
  };
  const resultado = await ServicioKardexValorizado.registrarSalidaValorizada(datos, { almacenes: almacenesBase(), generarId, fechaActual });
  return resultado.resultadoIds[0];
}

function reversoBase(movimientoId: string, overrides: Partial<DatosReversoInventario> = {}): DatosReversoInventario {
  return {
    empresaId: 'emp-A',
    movimientoId,
    claveIdempotencia: `REVERSO-${movimientoId}`,
    tipoOperacion: 'reverso',
    tipoDocumento: 'nota_ingreso',
    usuario: 'user-1',
    fecha: '2026-08-02T00:00:00.000Z',
    ...overrides,
  };
}

describe('revertirMovimientoValorizado — reverso de ENTRADA (modo cuantitativo)', () => {
  it('entrada intacta: revierte exactamente la cantidad que ingresó', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 5 } })]);
    const movimientoId = await crearEntradaConfirmada(empresaId);
    // Stock ahora: 5 + 10 = 15.

    const resultado = await ServicioKardexValorizado.revertirMovimientoValorizado(
      reversoBase(movimientoId, { empresaId, tipoDocumento: 'nota_ingreso' }),
      { almacenes: almacenesBase(), generarId, fechaActual }
    );

    expect(resultado.estado).toBe('nueva');
    expect(resultado.movimientos).toHaveLength(1);
    expect(resultado.movimientos[0].movimientoReversoDeId).toBe(movimientoId);
    expect(resultado.movimientos[0].motivo).toBe('COMPRA'); // motivo histórico conservado, no sustituido

    const productos = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productos[0].stockPorAlmacen['alm-1']).toBe(5);
  });

  it('bloquea si el stock actual no permite la reversión (ya se consumió más de lo que ingresó)', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 0 } })]);
    const movimientoId = await crearEntradaConfirmada(empresaId);
    // Stock ahora 10. Simula que se consumió después (ajuste manual directo del snapshot).
    const productosRaw = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    productosRaw[0].stockPorAlmacen['alm-1'] = 3;
    localStorage.setItem(lsKey(PRODUCT_STORAGE_KEY, empresaId), JSON.stringify(productosRaw));

    await expect(
      ServicioKardexValorizado.revertirMovimientoValorizado(reversoBase(movimientoId, { empresaId }), {
        almacenes: almacenesBase(), generarId, fechaActual,
      })
    ).rejects.toThrow(/no permite revertir/);
  });

  it('entrada con capa intacta: revierte y marca la capa como revertida', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 0 } })]);
    const movimientoId = await crearEntradaConfirmada(empresaId);
    guardarCapaCostoInventario(crearCapaDePrueba({ empresaId, movimientoEntradaId: movimientoId, cantidadInicial: 10, cantidadDisponible: 10 }), empresaId);

    await ServicioKardexValorizado.revertirMovimientoValorizado(reversoBase(movimientoId, { empresaId }), {
      almacenes: almacenesBase(), generarId, fechaActual, valorizacionHabilitada: true,
    });

    const capa = listarCapasCostoInventarioPorEmpresa(empresaId)[0];
    expect(capa.estado).toBe('revertida');
    expect(capa.cantidadDisponible).toBe(0);
  });

  it('bloquea la reversión si la capa de la entrada fue parcialmente consumida', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 6 } })]);
    const movimientoId = await crearEntradaConfirmada(empresaId);
    // Stock tras la entrada: 6 + 10 = 16.
    guardarCapaCostoInventario(crearCapaDePrueba({ empresaId, movimientoEntradaId: movimientoId, cantidadInicial: 10, cantidadDisponible: 6 }), empresaId);

    await expect(
      ServicioKardexValorizado.revertirMovimientoValorizado(reversoBase(movimientoId, { empresaId }), {
        almacenes: almacenesBase(), generarId, fechaActual, valorizacionHabilitada: true,
      })
    ).rejects.toThrow(/consumida o transferida parcialmente/);

    const productos = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productos[0].stockPorAlmacen['alm-1']).toBe(16);
  });
});

describe('revertirMovimientoValorizado — reverso de SALIDA (modo cuantitativo y valorizado)', () => {
  it('salida cuantitativa: restaura exactamente la cantidad, sin FIFO nuevo ni reasignación entre almacenes', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 10 } })]);
    const movimientoId = await crearSalidaConfirmada(empresaId);
    // Stock ahora: 10 - 4 = 6.

    const resultado = await ServicioKardexValorizado.revertirMovimientoValorizado(
      reversoBase(movimientoId, { empresaId, tipoDocumento: 'nota_salida' }),
      { almacenes: almacenesBase(), generarId, fechaActual }
    );

    expect(resultado.movimientos[0].motivo).toBe('VENTA');
    const productos = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productos[0].stockPorAlmacen['alm-1']).toBe(10);
  });

  it('salida con consumos de capa: restaura exactamente la cantidad consumida en cada capa original', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 10 } })]);
    guardarCapaCostoInventario(crearCapaDePrueba({ id: 'capa-1', empresaId, cantidadInicial: 10, cantidadDisponible: 10 }), empresaId);
    const movimientoId = await crearSalidaConfirmada(empresaId);
    guardarConsumoCapaCostoInventario(crearConsumoDePrueba({ empresaId, movimientoSalidaId: movimientoId, capaId: 'capa-1', cantidadConsumida: 4 }), empresaId);
    // Simula el efecto de calcularMutacionesCuantitativas + consumo FIFO ya aplicados: la capa quedó en 6.
    const capaTrasConsumo = listarCapasCostoInventarioPorEmpresa(empresaId)[0];
    localStorage.setItem(
      lsKey('facturafacil_capas_costo_inventario', empresaId),
      JSON.stringify([{ ...capaTrasConsumo, cantidadDisponible: 6 }])
    );

    await ServicioKardexValorizado.revertirMovimientoValorizado(reversoBase(movimientoId, { empresaId, tipoDocumento: 'nota_salida' }), {
      almacenes: almacenesBase(), generarId, fechaActual, valorizacionHabilitada: true,
    });

    const capaFinal = listarCapasCostoInventarioPorEmpresa(empresaId)[0];
    expect(capaFinal.cantidadDisponible).toBe(10);
    expect(capaFinal.estado).toBe('disponible');

    const consumos = listarConsumosCapaCostoInventarioPorEmpresa(empresaId);
    expect(consumos[0].estado).toBe('revertido');
  });

  it('bloquea si la capa consumida ya fue revertida (inconsistencia real)', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 10 } })]);
    guardarCapaCostoInventario(crearCapaDePrueba({ id: 'capa-1', empresaId, cantidadInicial: 10, cantidadDisponible: 6, estado: 'revertida' }), empresaId);
    const movimientoId = await crearSalidaConfirmada(empresaId);
    guardarConsumoCapaCostoInventario(crearConsumoDePrueba({ empresaId, movimientoSalidaId: movimientoId, capaId: 'capa-1', cantidadConsumida: 4 }), empresaId);

    await expect(
      ServicioKardexValorizado.revertirMovimientoValorizado(reversoBase(movimientoId, { empresaId, tipoDocumento: 'nota_salida' }), {
        almacenes: almacenesBase(), generarId, fechaActual, valorizacionHabilitada: true,
      })
    ).rejects.toThrow(/ya fue revertida/);
  });
});

describe('revertirMovimientoValorizado — validaciones de identidad', () => {
  it('movimiento inexistente rechaza la operación', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 10 } })]);

    await expect(
      ServicioKardexValorizado.revertirMovimientoValorizado(reversoBase('mov-fantasma', { empresaId }), {
        almacenes: almacenesBase(), generarId, fechaActual,
      })
    ).rejects.toThrow(/no existe/);
  });

  it('movimiento de otra empresa rechaza la operación', async () => {
    sembrarProductos('emp-A', [crearProducto({ stockPorAlmacen: { 'alm-1': 10 } })]);
    const movimientoId = await crearEntradaConfirmada('emp-A');
    sembrarProductos('emp-B', [crearProducto({ stockPorAlmacen: { 'alm-1': 10 } })]);

    await expect(
      ServicioKardexValorizado.revertirMovimientoValorizado(reversoBase(movimientoId, { empresaId: 'emp-B' }), {
        almacenes: almacenesBase(), generarId, fechaActual,
      })
    ).rejects.toThrow(/otra empresa|no existe/);
  });

  it('movimiento con histórico incompleto (sin productoId) rechaza la operación', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 10 } })]);
    const movimientoIncompleto = {
      id: 'mov-roto', empresaId, tipo: 'ENTRADA', cantidad: 5, cantidadAnterior: 0, cantidadNueva: 5,
    } as unknown as MovimientoStock;
    localStorage.setItem(lsKey(STORAGE_KEY_MOVEMENTS, empresaId), JSON.stringify([movimientoIncompleto]));

    await expect(
      ServicioKardexValorizado.revertirMovimientoValorizado(reversoBase('mov-roto', { empresaId }), {
        almacenes: almacenesBase(), generarId, fechaActual,
      })
    ).rejects.toThrow(/histórico incompleto/);
  });

  it('un movimiento ya revertido no puede volver a revertirse', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 5 } })]);
    const movimientoId = await crearEntradaConfirmada(empresaId);

    await ServicioKardexValorizado.revertirMovimientoValorizado(reversoBase(movimientoId, { empresaId }), {
      almacenes: almacenesBase(), generarId, fechaActual,
    });

    await expect(
      ServicioKardexValorizado.revertirMovimientoValorizado(
        reversoBase(movimientoId, { empresaId, claveIdempotencia: `REVERSO-${movimientoId}-otra-clave` }),
        { almacenes: almacenesBase(), generarId, fechaActual }
      )
    ).rejects.toThrow(/ya fue revertido/);
  });

  it('reintento idempotente con la misma clave devuelve "repetida" sin volver a mutar stock', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 5 } })]);
    const movimientoId = await crearEntradaConfirmada(empresaId);
    const datos = reversoBase(movimientoId, { empresaId });

    const r1 = await ServicioKardexValorizado.revertirMovimientoValorizado(datos, { almacenes: almacenesBase(), generarId, fechaActual });
    const r2 = await ServicioKardexValorizado.revertirMovimientoValorizado(datos, { almacenes: almacenesBase(), generarId, fechaActual });

    expect(r1.estado).toBe('nueva');
    expect(r2.estado).toBe('repetida');
    expect(r2.resultadoIds).toEqual(r1.resultadoIds);
  });

  it('conflicto de hash: mismo movimiento, mismo reverso, pero motivoUsuario distinto bajo la misma clave rechaza', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 5 } })]);
    const movimientoId = await crearEntradaConfirmada(empresaId);

    await ServicioKardexValorizado.revertirMovimientoValorizado(reversoBase(movimientoId, { empresaId, motivoUsuario: 'motivo A' }), {
      almacenes: almacenesBase(), generarId, fechaActual,
    });

    await expect(
      ServicioKardexValorizado.revertirMovimientoValorizado(reversoBase(movimientoId, { empresaId, motivoUsuario: 'motivo B (distinto)' }), {
        almacenes: almacenesBase(), generarId, fechaActual,
      })
    ).rejects.toThrow(ConflictoIdempotencia);
  });
});

describe('anularDocumentoValorizado — documento multilínea, un solo plan atómico', () => {
  it('revierte varios movimientos del mismo documento en una sola confirmación', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [
      crearProducto({ id: 'prod-1', codigo: 'P001', stockPorAlmacen: { 'alm-1': 10 } }),
      crearProducto({ id: 'prod-2', codigo: 'P002', nombre: 'Producto 2', stockPorAlmacen: { 'alm-1': 10 } }),
    ]);
    const mov1 = await crearSalidaConfirmada(empresaId, {
      lineas: [{ lineaId: 'l1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 3 }],
    });
    // Segunda salida del mismo documento comercial (otra línea, otro movimiento) — misma claveIdempotencia
    // de documento no puede repetirse tal cual (cada operación cuantitativa es un documento propio en
    // este motor); para probar la anulación multilínea se seedean directamente dos movimientos con el
    // mismo documentoOrigenId, como ocurriría en una NS con varias líneas.
    const productosRaw = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    const movimientosRaw = JSON.parse(localStorage.getItem(lsKey(STORAGE_KEY_MOVEMENTS, empresaId)) as string) as MovimientoStock[];
    const mov2Id = 'mov-extra-2';
    movimientosRaw.push({
      id: mov2Id, productoId: 'prod-2', productoCodigo: 'P002', productoNombre: 'Producto 2',
      tipo: 'SALIDA', motivo: 'VENTA', cantidad: 2, cantidadAnterior: 10, cantidadNueva: 8,
      usuario: 'user-1', fecha: new Date('2026-08-01T00:00:00.000Z'), almacenId: 'alm-1',
      almacenCodigo: 'ALM01', almacenNombre: 'Almacén 1', EstablecimientoId: EST_1, EstablecimientoCodigo: '', EstablecimientoNombre: '',
      esTransferencia: false, empresaId, documentoOrigenId: 'ns-1', tipoDocumentoOrigen: 'nota_salida',
      estado: 'confirmado', claveIdempotencia: 'nota_salida:ns-1',
    });
    localStorage.setItem(lsKey(STORAGE_KEY_MOVEMENTS, empresaId), JSON.stringify(movimientosRaw));
    productosRaw.find((p) => p.id === 'prod-2')!.stockPorAlmacen['alm-1'] = 8;
    localStorage.setItem(lsKey(PRODUCT_STORAGE_KEY, empresaId), JSON.stringify(productosRaw));

    const datosAnulacion: DatosAnulacionDocumentoInventario = {
      empresaId, tipoOperacion: 'anulacion', documentoId: 'ns-1', tipoDocumentoOrigen: 'nota_salida',
      movimientoIds: [mov1, mov2Id], claveIdempotencia: 'ANULACION-nota_salida-ns-1', usuario: 'user-1', fecha: fechaActual(),
    };

    const resultado = await ServicioKardexValorizado.anularDocumentoValorizado(datosAnulacion, { almacenes: almacenesBase(), generarId, fechaActual });

    expect(resultado.movimientos).toHaveLength(2);
    const productosFinales = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productosFinales.find((p) => p.id === 'prod-1')?.stockPorAlmacen['alm-1']).toBe(10);
    expect(productosFinales.find((p) => p.id === 'prod-2')?.stockPorAlmacen['alm-1']).toBe(10);
  });

  it('si una línea no puede revertirse, NINGUNA se revierte (atomicidad total)', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ id: 'prod-1', codigo: 'P001', stockPorAlmacen: { 'alm-1': 10 } })]);
    const mov1 = await crearSalidaConfirmada(empresaId);

    const datosAnulacion: DatosAnulacionDocumentoInventario = {
      empresaId, tipoOperacion: 'anulacion', documentoId: 'ns-1', tipoDocumentoOrigen: 'nota_salida',
      movimientoIds: [mov1, 'mov-inexistente'], claveIdempotencia: 'ANULACION-nota_salida-ns-1', usuario: 'user-1', fecha: fechaActual(),
    };

    await expect(
      ServicioKardexValorizado.anularDocumentoValorizado(datosAnulacion, { almacenes: almacenesBase(), generarId, fechaActual })
    ).rejects.toThrow(/no existe/);

    const productos = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    // La salida real fue 4 (10 -> 6); si mov1 se hubiera revertido solo, sería 10. Debe seguir en 6.
    expect(productos[0].stockPorAlmacen['alm-1']).toBe(6);
  });
});

describe('revertirMovimientoValorizado — reverso de TRANSFERENCIA', () => {
  async function crearTransferenciaConfirmada(empresaId: string, overrides: Partial<DatosTransferenciaInventario> = {}, valorizacionHabilitada = false) {
    const datos: DatosTransferenciaInventario = {
      modoOperacion: 'cuantitativo',
      empresaId,
      transferenciaId: 'trf-1',
      claveIdempotencia: 'TRANSFER-trf-1',
      tipoOperacion: 'transferencia',
      tipoDocumento: 'transferencia',
      productoId: 'prod-1',
      establecimientoOrigenId: EST_1,
      almacenOrigenId: 'alm-1',
      establecimientoDestinoId: EST_1,
      almacenDestinoId: 'alm-2',
      cantidadUnidadMinima: 5,
      usuario: 'user-1',
      fecha: '2026-08-01T00:00:00.000Z',
      motivo: 'TRANSFERENCIA_ALMACEN',
      ...overrides,
    };
    const almacenes = new Map([
      ['alm-1', crearAlmacen({ id: 'alm-1' })],
      ['alm-2', crearAlmacen({ id: 'alm-2', codigoAlmacen: 'ALM02', nombreAlmacen: 'Almacén 2' })],
    ]);
    const resultado = await ServicioKardexValorizado.transferirStockValorizado(datos, { almacenes, generarId, fechaActual, valorizacionHabilitada });
    return { salidaId: resultado.movimientos.find((m) => m.tipo === 'SALIDA')!.id, almacenes };
  }

  it('transferencia no consumida en destino se revierte por completo: retira destino, restaura origen', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 20, 'alm-2': 0 } })]);
    const { salidaId, almacenes } = await crearTransferenciaConfirmada(empresaId);

    const resultado = await ServicioKardexValorizado.revertirMovimientoValorizado(
      reversoBase(salidaId, { empresaId, tipoDocumento: 'transferencia' }),
      { almacenes, generarId, fechaActual }
    );

    expect(resultado.movimientos).toHaveLength(2);
    const productos = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productos[0].stockPorAlmacen['alm-1']).toBe(20);
    expect(productos[0].stockPorAlmacen['alm-2']).toBe(0);
  });

  it('restaura exactamente las capas de origen y marca revertidas las capas de destino (modo valorizado)', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 20, 'alm-2': 0 } })]);
    guardarCapaCostoInventario(crearCapaDePrueba({ id: 'capa-origen', empresaId, cantidadInicial: 20, cantidadDisponible: 20 }), empresaId);
    const { salidaId, almacenes } = await crearTransferenciaConfirmada(empresaId, {}, true);

    const capaOrigenTrasTransferir = listarCapasCostoInventarioPorEmpresa(empresaId).find((c) => c.id === 'capa-origen');
    expect(capaOrigenTrasTransferir?.cantidadDisponible).toBe(15);
    const capaDestino = listarCapasCostoInventarioPorEmpresa(empresaId).find((c) => c.almacenId === 'alm-2');
    expect(capaDestino).toBeDefined();

    await ServicioKardexValorizado.revertirMovimientoValorizado(
      reversoBase(salidaId, { empresaId, tipoDocumento: 'transferencia' }),
      { almacenes, generarId, fechaActual, valorizacionHabilitada: true }
    );

    const capasFinales = listarCapasCostoInventarioPorEmpresa(empresaId);
    expect(capasFinales.find((c) => c.id === 'capa-origen')?.cantidadDisponible).toBe(20);
    expect(capasFinales.find((c) => c.id === capaDestino!.id)?.estado).toBe('revertida');
  });

  it('bloquea si la capa destino fue parcialmente consumida (mercancía ya no está intacta en destino)', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 20, 'alm-2': 5 } })]);
    guardarCapaCostoInventario(crearCapaDePrueba({ id: 'capa-origen', empresaId, cantidadInicial: 20, cantidadDisponible: 20 }), empresaId);
    const { salidaId, almacenes } = await crearTransferenciaConfirmada(empresaId, {}, true);

    const capaDestino = listarCapasCostoInventarioPorEmpresa(empresaId).find((c) => c.almacenId === 'alm-2')!;
    // Simula que 2 de las 5 unidades de la capa destino ya se vendieron (consumo parcial).
    const capasRaw = listarCapasCostoInventarioPorEmpresa(empresaId).map((c) =>
      c.id === capaDestino.id ? { ...c, cantidadDisponible: 3 } : c
    );
    localStorage.setItem(lsKey('facturafacil_capas_costo_inventario', empresaId), JSON.stringify(capasRaw));

    await expect(
      ServicioKardexValorizado.revertirMovimientoValorizado(reversoBase(salidaId, { empresaId, tipoDocumento: 'transferencia' }), { almacenes, generarId, fechaActual, valorizacionHabilitada: true })
    ).rejects.toThrow(/consumida o transferida/);
  });

  it('bloquea si el stock actual en destino no permite retirar la cantidad transferida', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 20, 'alm-2': 5 } })]);
    const { salidaId, almacenes } = await crearTransferenciaConfirmada(empresaId);

    // Simula que el destino despachó parte de lo recibido a otra parte (stock bajó por debajo de lo transferido).
    const productosRaw = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    productosRaw[0].stockPorAlmacen['alm-2'] = 2;
    localStorage.setItem(lsKey(PRODUCT_STORAGE_KEY, empresaId), JSON.stringify(productosRaw));

    await expect(
      ServicioKardexValorizado.revertirMovimientoValorizado(reversoBase(salidaId, { empresaId, tipoDocumento: 'transferencia' }), { almacenes, generarId, fechaActual })
    ).rejects.toThrow(/no permite revertir/);
  });

  it('ninguna escritura parcial ante fallo: el stock permanece exactamente igual tras el rechazo', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 20, 'alm-2': 5 } })]);
    const { salidaId, almacenes } = await crearTransferenciaConfirmada(empresaId);
    const productosRaw = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    productosRaw[0].stockPorAlmacen['alm-2'] = 2;
    localStorage.setItem(lsKey(PRODUCT_STORAGE_KEY, empresaId), JSON.stringify(productosRaw));
    const snapshotAntes = localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId));

    await expect(
      ServicioKardexValorizado.revertirMovimientoValorizado(reversoBase(salidaId, { empresaId, tipoDocumento: 'transferencia' }), { almacenes, generarId, fechaActual })
    ).rejects.toThrow();

    expect(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId))).toBe(snapshotAntes);
  });

  it('cierre final Etapa 1E §1: con capas existentes pero SIN valorizacionHabilitada, el reverso de transferencia es puramente cuantitativo', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 20, 'alm-2': 0 } })]);
    guardarCapaCostoInventario(crearCapaDePrueba({ id: 'capa-origen', empresaId, cantidadInicial: 20, cantidadDisponible: 20 }), empresaId);
    // La transferencia en sí también corrió sin valorización (default de `crearTransferenciaConfirmada`).
    const { salidaId, almacenes } = await crearTransferenciaConfirmada(empresaId);
    expect(listarCapasCostoInventarioPorEmpresa(empresaId).find((c) => c.id === 'capa-origen')?.cantidadDisponible).toBe(20);

    await ServicioKardexValorizado.revertirMovimientoValorizado(
      reversoBase(salidaId, { empresaId, tipoDocumento: 'transferencia' }),
      { almacenes, generarId, fechaActual }
      // valorizacionHabilitada deliberadamente AUSENTE.
    );

    const productos = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productos[0].stockPorAlmacen['alm-1']).toBe(20);
    // La capa preexistente nunca se tocó — ni durante la transferencia ni durante el reverso.
    expect(listarCapasCostoInventarioPorEmpresa(empresaId).find((c) => c.id === 'capa-origen')?.cantidadDisponible).toBe(20);
  });
});

function crearCapaDePrueba(overrides: Partial<CapaCostoInventario> = {}): CapaCostoInventario {
  return {
    id: 'capa-1',
    empresaId: 'emp-A',
    establecimientoId: EST_1,
    productoId: 'prod-1',
    almacenId: 'alm-1',
    movimientoEntradaId: 'mov-x',
    tipoDocumentoOrigen: 'nota_ingreso',
    documentoOrigenId: 'ni-1',
    cantidadInicial: 10,
    cantidadDisponible: 10,
    costoUnitarioBaseOriginal: 12.5,
    costoUnitarioBaseMonedaBase: 12.5,
    valorValorizableOriginal: 125,
    valorValorizableMonedaBase: 125,
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

function crearConsumoDePrueba(overrides: Partial<ConsumoCapaCostoInventario> = {}): ConsumoCapaCostoInventario {
  return {
    id: 'consumo-1',
    empresaId: 'emp-A',
    movimientoSalidaId: 'mov-y',
    capaId: 'capa-1',
    cantidadConsumida: 4,
    costoUnitarioBaseMonedaBase: 12.5,
    valorConsumidoMonedaBase: 50,
    monedaBase: 'PEN',
    fecha: '2026-08-01T00:00:00.000Z',
    estado: 'confirmado',
    ...overrides,
  };
}
