import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { instalarLocalStorageDePrueba } from '../repositories/localStorageDePrueba';
import {
  calcularHashEntradaCuantitativa,
  calcularMutacionesEntrada,
  prepararOperacionInventario,
  confirmarOperacionInventario,
} from './entradaCuantitativaInventario';
import { reservarOperacionIdempotente } from './idempotenciaInventario';
import { PRODUCT_STORAGE_KEY } from '../../catalogo-articulos/utils/catalogStorage';
import { STORAGE_KEY_MOVEMENTS } from '../repositories/stock.repository';
import type { DatosOperacionEntradaCuantitativa, DatosLineaOperacionCuantitativa } from '../models/operacionEntradaInventario.types';
import type { OperacionIdempotenteInventario } from '../models/operacionIdempotenteInventario.types';
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
    stockPorAlmacen: {},
    fechaCreacion: new Date('2026-01-01T00:00:00.000Z'),
    fechaActualizacion: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function crearOperacionReservada(overrides: Partial<OperacionIdempotenteInventario> = {}): OperacionIdempotenteInventario {
  return {
    id: 'op-1',
    empresaId: 'emp-A',
    clave: 'clave-1',
    tipoOperacion: 'ni_automatica',
    estado: 'preparada',
    hashEntrada: 'hash-1',
    referenciaDocumentoId: 'doc-1',
    referenciaDocumentoTipo: 'nota_ingreso',
    resultadoIds: [],
    fechaCreacion: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function datosBase(overrides: Partial<DatosOperacionEntradaCuantitativa> = {}): DatosOperacionEntradaCuantitativa {
  return {
    modoOperacion: 'cuantitativo',
    empresaId: 'emp-A',
    documentoId: 'doc-1',
    tipoDocumento: 'nota_ingreso',
    tipoOperacion: 'ni_automatica',
    claveIdempotencia: 'clave-1',
    usuario: 'user-1',
    fecha: '2026-01-01T00:00:00.000Z',
    motivo: 'COMPRA',
    lineas: [{ lineaId: 'linea-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 10 }],
    ...overrides,
  };
}

describe('entradaCuantitativaInventario — calcularHashEntradaCuantitativa', () => {
  it('la misma entrada produce siempre el mismo hash', async () => {
    const h1 = await calcularHashEntradaCuantitativa(datosBase());
    const h2 = await calcularHashEntradaCuantitativa(datosBase());
    expect(h1).toBe(h2);
  });

  it('el orden de las líneas no cambia el hash (se normaliza por lineaId)', async () => {
    const lineas: DatosLineaOperacionCuantitativa[] = [
      { lineaId: 'linea-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 10 },
      { lineaId: 'linea-2', productoId: 'prod-2', almacenId: 'alm-1', cantidadUnidadMinima: 5 },
    ];
    const h1 = await calcularHashEntradaCuantitativa(datosBase({ lineas }));
    const h2 = await calcularHashEntradaCuantitativa(datosBase({ lineas: [...lineas].reverse() }));
    expect(h1).toBe(h2);
  });

  it('cambiar la cantidad de una línea cambia el hash', async () => {
    const h1 = await calcularHashEntradaCuantitativa(datosBase());
    const h2 = await calcularHashEntradaCuantitativa(
      datosBase({ lineas: [{ lineaId: 'linea-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 11 }] })
    );
    expect(h1).not.toBe(h2);
  });

  it('el usuario (dato técnico/de UI, no persiste el significado del negocio) no afecta el hash', async () => {
    const h1 = await calcularHashEntradaCuantitativa(datosBase({ usuario: 'user-1' }));
    const h2 = await calcularHashEntradaCuantitativa(datosBase({ usuario: 'user-2' }));
    expect(h1).toBe(h2);
  });

  it('cambiar el motivo SÍ cambia el hash (el motivo modifica el significado del movimiento)', async () => {
    const h1 = await calcularHashEntradaCuantitativa(datosBase({ motivo: 'COMPRA' }));
    const h2 = await calcularHashEntradaCuantitativa(datosBase({ motivo: 'DEVOLUCION_CLIENTE' }));
    expect(h1).not.toBe(h2);
  });

  it('cambiar observaciones SÍ cambia el hash (dato de negocio persistido en MovimientoStock)', async () => {
    const h1 = await calcularHashEntradaCuantitativa(datosBase({ observaciones: 'a' }));
    const h2 = await calcularHashEntradaCuantitativa(datosBase({ observaciones: 'b' }));
    expect(h1).not.toBe(h2);
  });

  it('cambiar documentoReferencia SÍ cambia el hash (dato de negocio persistido en MovimientoStock)', async () => {
    const h1 = await calcularHashEntradaCuantitativa(datosBase({ documentoReferencia: 'NI01-00000001' }));
    const h2 = await calcularHashEntradaCuantitativa(datosBase({ documentoReferencia: 'NI01-00000002' }));
    expect(h1).not.toBe(h2);
  });

  it('observaciones/documentoReferencia ausentes se normalizan igual que cadena vacía (mismo hash)', async () => {
    const h1 = await calcularHashEntradaCuantitativa(datosBase({ observaciones: undefined, documentoReferencia: undefined }));
    const h2 = await calcularHashEntradaCuantitativa(datosBase({ observaciones: '', documentoReferencia: '' }));
    expect(h1).toBe(h2);
  });
});

describe('entradaCuantitativaInventario — mismo orden canónico para hash y para preparación (corrección final)', () => {
  it('el mismo conjunto de líneas en dos órdenes distintos produce el mismo plan determinista, incluidos cantidadAnterior/cantidadNueva por línea', () => {
    const productos = [crearProducto({ stockPorAlmacen: { 'alm-1': 0 } })];
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    const lineasOrdenA: DatosLineaOperacionCuantitativa[] = [
      { lineaId: 'linea-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 3 },
      { lineaId: 'linea-2', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 7 },
    ];
    const lineasOrdenB = [...lineasOrdenA].reverse();

    const resultadoA = calcularMutacionesEntrada(
      datosBase({ lineas: lineasOrdenA }), JSON.stringify(productos), null, almacenes, generarId
    );
    const resultadoB = calcularMutacionesEntrada(
      datosBase({ lineas: lineasOrdenB }), JSON.stringify(productos), null, almacenes, generarId
    );

    const porLineaA = new Map(resultadoA.movimientosGenerados.map((m) => [m.lineaOrigenId, m]));
    const porLineaB = new Map(resultadoB.movimientosGenerados.map((m) => [m.lineaOrigenId, m]));
    for (const lineaId of ['linea-1', 'linea-2']) {
      expect(porLineaA.get(lineaId)?.cantidadAnterior).toBe(porLineaB.get(lineaId)?.cantidadAnterior);
      expect(porLineaA.get(lineaId)?.cantidadNueva).toBe(porLineaB.get(lineaId)?.cantidadNueva);
    }
    expect(resultadoA.productosFinales).toEqual(resultadoB.productosFinales);
  });
});

describe('entradaCuantitativaInventario — prepararOperacionInventario: documento de una línea', () => {
  it('calcula cantidadAnterior/cantidadNueva y genera un movimiento con los campos estructurales completos', () => {
    const productos = [crearProducto({ stockPorAlmacen: { 'alm-1': 5 } })];
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    const { plan, movimientosGenerados, productosActualizados } = prepararOperacionInventario({
      datos: datosBase(),
      operacionReservada: crearOperacionReservada(),
      hashEntrada: 'hash-1',
      versionEsperada: 0,
      productosRaw: JSON.stringify(productos),
      movimientosRaw: null,
      almacenes,
      generarId,
    });

    expect(movimientosGenerados).toHaveLength(1);
    const movimiento = movimientosGenerados[0];
    expect(movimiento.cantidadAnterior).toBe(5);
    expect(movimiento.cantidadNueva).toBe(15);
    expect(movimiento.tipo).toBe('ENTRADA');
    expect(movimiento.empresaId).toBe('emp-A');
    expect(movimiento.documentoOrigenId).toBe('doc-1');
    expect(movimiento.lineaOrigenId).toBe('linea-1');
    expect(movimiento.claveIdempotencia).toBe('clave-1');
    expect(movimiento.estado).toBe('confirmado');
    expect(movimiento.capaId).toBeUndefined();

    expect(productosActualizados).toHaveLength(1);
    expect(productosActualizados[0].stockPorAlmacen?.['alm-1']).toBe(15);

    expect(plan.resultadoIds).toEqual([movimiento.id]);
    expect(plan.versionEsperada).toBe(0);
    expect(plan.escrituras).toHaveLength(2);
    const claveProductos = lsKey(PRODUCT_STORAGE_KEY, 'emp-A');
    const claveMovimientos = lsKey(STORAGE_KEY_MOVEMENTS, 'emp-A');
    expect(plan.escrituras.map((e) => e.clave).sort()).toEqual([claveMovimientos, claveProductos].sort());
  });

  it('no lee ni escribe localStorage — el localStorage permanece vacío después de preparar', () => {
    const productos = [crearProducto({ stockPorAlmacen: { 'alm-1': 5 } })];
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    prepararOperacionInventario({
      datos: datosBase(),
      operacionReservada: crearOperacionReservada(),
      hashEntrada: 'hash-1',
      versionEsperada: 0,
      productosRaw: JSON.stringify(productos),
      movimientosRaw: null,
      almacenes,
      generarId,
    });

    expect(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, 'emp-A'))).toBeNull();
    expect(localStorage.getItem(lsKey(STORAGE_KEY_MOVEMENTS, 'emp-A'))).toBeNull();
  });

  it('entrada en almacén sin stock previo: cantidadAnterior es 0', () => {
    const productos = [crearProducto({ stockPorAlmacen: {} })];
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    const { movimientosGenerados } = prepararOperacionInventario({
      datos: datosBase(),
      operacionReservada: crearOperacionReservada(),
      hashEntrada: 'hash-1',
      versionEsperada: 0,
      productosRaw: JSON.stringify(productos),
      movimientosRaw: null,
      almacenes,
      generarId,
    });

    expect(movimientosGenerados[0].cantidadAnterior).toBe(0);
    expect(movimientosGenerados[0].cantidadNueva).toBe(10);
  });
});

describe('entradaCuantitativaInventario — prepararOperacionInventario: multilínea y consolidación', () => {
  it('mismo producto y almacén repetido en dos líneas: la segunda parte del resultado de la primera (secuencial, no del snapshot)', () => {
    const productos = [crearProducto({ stockPorAlmacen: { 'alm-1': 0 } })];
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    const datos = datosBase({
      lineas: [
        { lineaId: 'linea-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 10 },
        { lineaId: 'linea-2', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 5 },
      ],
    });

    const { movimientosGenerados, productosActualizados } = prepararOperacionInventario({
      datos,
      operacionReservada: crearOperacionReservada(),
      hashEntrada: 'hash-1',
      versionEsperada: 0,
      productosRaw: JSON.stringify(productos),
      movimientosRaw: null,
      almacenes,
      generarId,
    });

    expect(movimientosGenerados).toHaveLength(2);
    expect(movimientosGenerados[0]).toMatchObject({ cantidadAnterior: 0, cantidadNueva: 10 });
    expect(movimientosGenerados[1]).toMatchObject({ cantidadAnterior: 10, cantidadNueva: 15 });
    expect(productosActualizados).toHaveLength(1);
    expect(productosActualizados[0].stockPorAlmacen?.['alm-1']).toBe(15);
  });

  it('mismo producto en almacenes distintos: cada almacén mantiene su propio cálculo, sin mezclarse', () => {
    const productos = [crearProducto({ stockPorAlmacen: { 'alm-1': 3, 'alm-2': 100 } })];
    const almacenes = new Map([
      ['alm-1', crearAlmacen({ id: 'alm-1' })],
      ['alm-2', crearAlmacen({ id: 'alm-2', codigoAlmacen: 'ALM02', nombreAlmacen: 'Sucursal' })],
    ]);
    const datos = datosBase({
      lineas: [
        { lineaId: 'linea-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 7 },
        { lineaId: 'linea-2', productoId: 'prod-1', almacenId: 'alm-2', cantidadUnidadMinima: 1 },
      ],
    });

    const { productosActualizados } = prepararOperacionInventario({
      datos,
      operacionReservada: crearOperacionReservada(),
      hashEntrada: 'hash-1',
      versionEsperada: 0,
      productosRaw: JSON.stringify(productos),
      movimientosRaw: null,
      almacenes,
      generarId,
    });

    expect(productosActualizados[0].stockPorAlmacen?.['alm-1']).toBe(10);
    expect(productosActualizados[0].stockPorAlmacen?.['alm-2']).toBe(101);
  });

  it('productos distintos: cada uno genera su propio movimiento y su propia actualización', () => {
    const productos = [
      crearProducto({ id: 'prod-1', stockPorAlmacen: { 'alm-1': 0 } }),
      crearProducto({ id: 'prod-2', codigo: 'P002', nombre: 'Producto 2', stockPorAlmacen: { 'alm-1': 20 } }),
    ];
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    const datos = datosBase({
      lineas: [
        { lineaId: 'linea-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 4 },
        { lineaId: 'linea-2', productoId: 'prod-2', almacenId: 'alm-1', cantidadUnidadMinima: 6 },
      ],
    });

    const { movimientosGenerados, productosActualizados } = prepararOperacionInventario({
      datos,
      operacionReservada: crearOperacionReservada(),
      hashEntrada: 'hash-1',
      versionEsperada: 0,
      productosRaw: JSON.stringify(productos),
      movimientosRaw: null,
      almacenes,
      generarId,
    });

    expect(movimientosGenerados).toHaveLength(2);
    expect(productosActualizados).toHaveLength(2);
    const porId = new Map(productosActualizados.map((p) => [p.id, p]));
    expect(porId.get('prod-1')?.stockPorAlmacen?.['alm-1']).toBe(4);
    expect(porId.get('prod-2')?.stockPorAlmacen?.['alm-1']).toBe(26);
  });
});

describe('entradaCuantitativaInventario — prepararOperacionInventario: rechazo del documento completo', () => {
  it('una línea que referencia un producto inexistente rechaza todo el documento (no genera plan parcial)', () => {
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    const datos = datosBase({
      lineas: [
        { lineaId: 'linea-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 1 },
        { lineaId: 'linea-2', productoId: 'prod-inexistente', almacenId: 'alm-1', cantidadUnidadMinima: 1 },
      ],
    });

    expect(() =>
      prepararOperacionInventario({
        datos,
        operacionReservada: crearOperacionReservada(),
        hashEntrada: 'hash-1',
        versionEsperada: 0,
        productosRaw: JSON.stringify([crearProducto()]),
        movimientosRaw: null,
        almacenes,
        generarId,
      })
    ).toThrow(/no existe en el catálogo/);
  });

  it('una línea que referencia un almacén inexistente rechaza todo el documento', () => {
    const almacenes = new Map<string, Almacen>();
    expect(() =>
      prepararOperacionInventario({
        datos: datosBase(),
        operacionReservada: crearOperacionReservada(),
        hashEntrada: 'hash-1',
        versionEsperada: 0,
        productosRaw: JSON.stringify([crearProducto()]),
        movimientosRaw: null,
        almacenes,
        generarId,
      })
    ).toThrow(/almacén/);
  });

  it('la operación reservada de otra empresa se rechaza', () => {
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    expect(() =>
      prepararOperacionInventario({
        datos: datosBase(),
        operacionReservada: crearOperacionReservada({ empresaId: 'emp-B' }),
        hashEntrada: 'hash-1',
        versionEsperada: 0,
        productosRaw: JSON.stringify([crearProducto()]),
        movimientosRaw: null,
        almacenes,
        generarId,
      })
    ).toThrow(/otra empresa/);
  });

  it('la operación reservada con un hash distinto se rechaza', () => {
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    expect(() =>
      prepararOperacionInventario({
        datos: datosBase(),
        operacionReservada: crearOperacionReservada(),
        hashEntrada: 'hash-DISTINTO',
        versionEsperada: 0,
        productosRaw: JSON.stringify([crearProducto()]),
        movimientosRaw: null,
        almacenes,
        generarId,
      })
    ).toThrow(/hash/);
  });
});

describe('entradaCuantitativaInventario — prepararOperacionInventario: anulación cuantitativa', () => {
  it('anulacion resta stock (signo negativo)', () => {
    const productos = [crearProducto({ stockPorAlmacen: { 'alm-1': 10 } })];
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    const datos = datosBase({ tipoOperacion: 'anulacion', claveIdempotencia: 'clave-anular' });

    const { movimientosGenerados, productosActualizados } = prepararOperacionInventario({
      datos,
      operacionReservada: crearOperacionReservada({ tipoOperacion: 'anulacion', clave: 'clave-anular' }),
      hashEntrada: 'hash-1',
      versionEsperada: 0,
      productosRaw: JSON.stringify(productos),
      movimientosRaw: null,
      almacenes,
      generarId,
    });

    expect(movimientosGenerados[0].tipo).toBe('AJUSTE_NEGATIVO');
    expect(movimientosGenerados[0].cantidadNueva).toBe(0);
    expect(productosActualizados[0].stockPorAlmacen?.['alm-1']).toBe(0);
  });

  it('anulación que dejaría el stock negativo rechaza todo el documento, sin plan parcial', () => {
    const productos = [crearProducto({ stockPorAlmacen: { 'alm-1': 3 } })];
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    const datos = datosBase({ tipoOperacion: 'anulacion', claveIdempotencia: 'clave-anular' });

    expect(() =>
      prepararOperacionInventario({
        datos,
        operacionReservada: crearOperacionReservada({ tipoOperacion: 'anulacion', clave: 'clave-anular' }),
        hashEntrada: 'hash-1',
        versionEsperada: 0,
        productosRaw: JSON.stringify(productos),
        movimientosRaw: null,
        almacenes,
        generarId,
      })
    ).toThrow(/negativo/);
  });
});

describe('entradaCuantitativaInventario — confirmarOperacionInventario: integración de punta a punta con Etapa 1B', () => {
  it('reserva real + preparación + confirmación escriben productos y movimientos, e incrementan la versión', async () => {
    const empresaId = 'emp-A';
    const productos = [crearProducto({ stockPorAlmacen: { 'alm-1': 5 } })];
    localStorage.setItem(lsKey(PRODUCT_STORAGE_KEY, empresaId), JSON.stringify(productos));
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    const datos = datosBase({ empresaId });
    const hashEntrada = await calcularHashEntradaCuantitativa(datos);
    const reserva = await reservarOperacionIdempotente({
      empresaId,
      clave: datos.claveIdempotencia,
      tipoOperacion: datos.tipoOperacion,
      hashEntrada,
      referenciaDocumentoId: datos.documentoId,
      referenciaDocumentoTipo: datos.tipoDocumento,
      generarId,
      fechaActual,
    });
    expect(reserva.tipo).toBe('nueva');
    if (reserva.tipo !== 'nueva') throw new Error('se esperaba una reserva nueva');

    const claveProductos = lsKey(PRODUCT_STORAGE_KEY, empresaId);
    const { plan, movimientosGenerados } = prepararOperacionInventario({
      datos,
      operacionReservada: reserva.operacion,
      hashEntrada,
      versionEsperada: 0,
      productosRaw: localStorage.getItem(claveProductos),
      movimientosRaw: localStorage.getItem(lsKey(STORAGE_KEY_MOVEMENTS, empresaId)),
      almacenes,
      generarId,
    });

    const resultado = await confirmarOperacionInventario(datos.documentoId, plan, fechaActual);

    expect(resultado.documentoId).toBe(datos.documentoId);
    expect(resultado.resultadoIds).toEqual(movimientosGenerados.map((m) => m.id));
    expect(resultado.transaccionId).toBeTruthy();

    const productosFinales = JSON.parse(localStorage.getItem(claveProductos) as string) as Product[];
    expect(productosFinales[0].stockPorAlmacen['alm-1']).toBe(15);
  });
});
