import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { instalarLocalStorageDePrueba } from '../repositories/localStorageDePrueba';
import {
  calcularHashEntradaCuantitativa,
  calcularMutacionesEntrada,
  prepararOperacionInventario,
  confirmarOperacionInventario,
  calcularCantidadYaDevueltaPorConsumo,
  construirLineasDevolucionFisica,
  type ConsumoDisponibleDevolucion,
} from './entradaCuantitativaInventario';
import { reservarOperacionIdempotente } from './idempotenciaInventario';
import { ServicioKardexValorizado } from '../services/servicioKardexValorizado';
import { PRODUCT_STORAGE_KEY } from '../../catalogo-articulos/utils/catalogStorage';
import { STORAGE_KEY_MOVEMENTS } from '../repositories/stock.repository';
import type { DatosOperacionEntradaCuantitativa, DatosLineaOperacionCuantitativa } from '../models/operacionEntradaInventario.types';
import type { OperacionIdempotenteInventario } from '../models/operacionIdempotenteInventario.types';
import type { CapaCostoInventario } from '../models/capaCostoInventario.types';
import { listarCapasCostoInventarioPorEmpresa } from '../repositories/capaCostoInventario.repository';
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

function crearCapaDevolucion(overrides: Partial<CapaCostoInventario> = {}): CapaCostoInventario {
  return {
    id: 'capa-dev-1',
    empresaId: 'emp-A',
    establecimientoId: 'est-1',
    productoId: 'prod-1',
    almacenId: 'alm-1',
    movimientoEntradaId: 'mov-dev-1',
    tipoDocumentoOrigen: 'devolucion_cliente',
    documentoOrigenId: 'nc-1',
    cantidadInicial: 3,
    cantidadDisponible: 3,
    costoUnitarioBaseOriginal: 10,
    costoUnitarioBaseMonedaBase: 10,
    valorValorizableOriginal: 30,
    valorValorizableMonedaBase: 30,
    monedaBase: 'PEN',
    monedaOriginal: 'PEN',
    tipoCambioAplicado: 1,
    fechaTipoCambio: '2026-08-01',
    fechaEntrada: '2026-08-01T00:00:00.000Z',
    estado: 'disponible',
    procedencia: 'devolucion_cliente',
    usuario: 'user-1',
    fechaCreacion: '2026-08-01T00:00:00.000Z',
    consumoOrigenId: 'consumo-1',
    ...overrides,
  };
}

function crearConsumoDisponible(overrides: Partial<ConsumoDisponibleDevolucion> = {}): ConsumoDisponibleDevolucion {
  return {
    consumoId: 'consumo-1',
    cantidadConsumida: 10,
    costoUnitarioBaseMonedaBase: 12.5,
    fecha: '2026-07-01T00:00:00.000Z',
    estado: 'confirmado',
    ...overrides,
  };
}

describe('calcularCantidadYaDevueltaPorConsumo — cierre de brecha de devoluciones físicas', () => {
  it('suma cantidadInicial de las capas de devolución no revertidas, agrupadas por consumoOrigenId', () => {
    const capas = [
      crearCapaDevolucion({ id: 'c1', consumoOrigenId: 'consumo-1', cantidadInicial: 2 }),
      crearCapaDevolucion({ id: 'c2', consumoOrigenId: 'consumo-1', cantidadInicial: 3 }),
      crearCapaDevolucion({ id: 'c3', consumoOrigenId: 'consumo-2', cantidadInicial: 4 }),
    ];
    const resultado = calcularCantidadYaDevueltaPorConsumo(capas);
    expect(resultado.get('consumo-1')).toBe(5);
    expect(resultado.get('consumo-2')).toBe(4);
  });

  it('ignora capas de devolución revertidas (libera el saldo disponible de nuevo)', () => {
    const capas = [crearCapaDevolucion({ consumoOrigenId: 'consumo-1', cantidadInicial: 5, estado: 'revertida' })];
    expect(calcularCantidadYaDevueltaPorConsumo(capas).get('consumo-1')).toBeUndefined();
  });

  it('ignora capas de otra procedencia (nunca confunde una transferencia o un ajuste con una devolución)', () => {
    const capas = [crearCapaDevolucion({ procedencia: 'transferencia', consumoOrigenId: 'consumo-1', cantidadInicial: 5 })];
    expect(calcularCantidadYaDevueltaPorConsumo(capas).get('consumo-1')).toBeUndefined();
  });

  it('ignora capas sin consumoOrigenId (no son devoluciones vinculadas)', () => {
    const capas = [crearCapaDevolucion({ consumoOrigenId: undefined })];
    expect(calcularCantidadYaDevueltaPorConsumo(capas).size).toBe(0);
  });
});

describe('construirLineasDevolucionFisica — cierre de brecha de devoluciones físicas', () => {
  it('una sola línea cuando un consumo cubre exactamente lo devuelto, con el costo histórico del consumo', () => {
    const consumos = [crearConsumoDisponible({ consumoId: 'consumo-1', cantidadConsumida: 10, costoUnitarioBaseMonedaBase: 12.5 })];
    const lineas = construirLineasDevolucionFisica(4, 'prod-1', 'alm-1', consumos, new Map(), () => 'linea-1');

    expect(lineas).toHaveLength(1);
    expect(lineas[0]).toMatchObject({
      productoId: 'prod-1',
      almacenId: 'alm-1',
      cantidadUnidadMinima: 4,
      costoUnitarioBaseMonedaBase: 12.5,
      consumoOrigenId: 'consumo-1',
    });
  });

  it('varias líneas cuando la devolución abarca varios consumos, en orden histórico determinístico (fecha, luego id)', () => {
    const consumos = [
      crearConsumoDisponible({ consumoId: 'consumo-nuevo', fecha: '2026-07-10T00:00:00.000Z', cantidadConsumida: 10, costoUnitarioBaseMonedaBase: 20 }),
      crearConsumoDisponible({ consumoId: 'consumo-viejo', fecha: '2026-07-01T00:00:00.000Z', cantidadConsumida: 4, costoUnitarioBaseMonedaBase: 10 }),
    ];
    const lineas = construirLineasDevolucionFisica(6, 'prod-1', 'alm-1', consumos, new Map(), () => `linea-${Math.random()}`);

    expect(lineas).toHaveLength(2);
    expect(lineas[0].consumoOrigenId).toBe('consumo-viejo');
    expect(lineas[0].cantidadUnidadMinima).toBe(4);
    expect(lineas[0].costoUnitarioBaseMonedaBase).toBe(10);
    expect(lineas[1].consumoOrigenId).toBe('consumo-nuevo');
    expect(lineas[1].cantidadUnidadMinima).toBe(2);
    expect(lineas[1].costoUnitarioBaseMonedaBase).toBe(20);
  });

  it('descuenta lo ya devuelto de cada consumo antes de distribuir', () => {
    const consumos = [crearConsumoDisponible({ consumoId: 'consumo-1', cantidadConsumida: 10 })];
    const yaDevuelto = new Map([['consumo-1', 6]]);
    const lineas = construirLineasDevolucionFisica(4, 'prod-1', 'alm-1', consumos, yaDevuelto, () => 'linea-1');
    expect(lineas).toHaveLength(1);
    expect(lineas[0].cantidadUnidadMinima).toBe(4);
  });

  it('rechaza con el mensaje de dominio exacto cuando no hay ningún consumo disponible (venta original sin costo histórico)', () => {
    expect(() => construirLineasDevolucionFisica(5, 'prod-1', 'alm-1', [], new Map(), () => 'linea-1')).toThrow(
      'No es posible valorizar automáticamente esta devolución porque la venta original no tiene costo histórico registrado.'
    );
  });

  it('rechaza la operación completa (sin líneas parciales) cuando la cantidad solicitada excede lo disponible (sobre-devolución)', () => {
    const consumos = [crearConsumoDisponible({ consumoId: 'consumo-1', cantidadConsumida: 5 })];
    const yaDevuelto = new Map([['consumo-1', 4]]);
    expect(() => construirLineasDevolucionFisica(3, 'prod-1', 'alm-1', consumos, yaDevuelto, () => 'linea-1')).toThrow(
      /excede lo disponible/
    );
  });

  it('nunca usa costo actual, último costo ni precio de compra/venta — solo el costoUnitarioBaseMonedaBase del consumo', () => {
    const consumos = [
      crearConsumoDisponible({ consumoId: 'c1', costoUnitarioBaseMonedaBase: 7.35, cantidadConsumida: 2 }),
    ];
    const lineas = construirLineasDevolucionFisica(2, 'prod-1', 'alm-1', consumos, new Map(), () => 'linea-1');
    expect(lineas[0].costoUnitarioBaseMonedaBase).toBe(7.35);
  });

  it('ignora consumos revertidos (la venta original ya fue anulada — nada que devolver ahí)', () => {
    const consumos = [
      crearConsumoDisponible({ consumoId: 'c1', estado: 'revertido', cantidadConsumida: 10 }),
      crearConsumoDisponible({ consumoId: 'c2', estado: 'confirmado', cantidadConsumida: 5, costoUnitarioBaseMonedaBase: 8 }),
    ];
    const lineas = construirLineasDevolucionFisica(3, 'prod-1', 'alm-1', consumos, new Map(), () => 'linea-1');
    expect(lineas).toHaveLength(1);
    expect(lineas[0].consumoOrigenId).toBe('c2');
  });
});

describe('registrarEntradaValorizada — tipoOperacion "devolucion_cliente" (cierre de brecha de devoluciones físicas)', () => {
  it('crea una capa de devolución con procedencia/tipoDocumentoOrigen correctos y el vínculo consumoOrigenId', async () => {
    const empresaId = 'emp-A';
    localStorage.setItem(lsKey(PRODUCT_STORAGE_KEY, empresaId), JSON.stringify([crearProducto({ stockPorAlmacen: { 'alm-1': 0 } })]));
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    const datos: DatosOperacionEntradaCuantitativa = {
      modoOperacion: 'valorizado',
      empresaId,
      documentoId: 'nc-1',
      tipoDocumento: 'nota_credito',
      tipoOperacion: 'devolucion_cliente',
      claveIdempotencia: 'DEVOLUCION-nc-1',
      usuario: 'user-1',
      fecha: '2026-08-01T00:00:00.000Z',
      motivo: 'DEVOLUCION_CLIENTE',
      documentoReferencia: 'F001-1',
      lineas: [
        { lineaId: 'nc-1-dev-0', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 4, costoUnitarioBaseMonedaBase: 12.5, consumoOrigenId: 'consumo-1' },
      ],
    };

    await ServicioKardexValorizado.registrarEntradaValorizada(datos, {
      almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada', monedaBase: 'PEN',
    });

    const capas = listarCapasCostoInventarioPorEmpresa(empresaId);
    expect(capas).toHaveLength(1);
    expect(capas[0].procedencia).toBe('devolucion_cliente');
    expect(capas[0].tipoDocumentoOrigen).toBe('devolucion_cliente');
    expect(capas[0].consumoOrigenId).toBe('consumo-1');
    expect(capas[0].costoUnitarioBaseMonedaBase).toBe(12.5);
    expect(capas[0].documentoOrigenId).toBe('nc-1');

    const productos = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productos[0].stockPorAlmacen['alm-1']).toBe(4);
  });

  it('doble clic (misma clave) no duplica la capa de devolución', async () => {
    const empresaId = 'emp-A';
    localStorage.setItem(lsKey(PRODUCT_STORAGE_KEY, empresaId), JSON.stringify([crearProducto({ stockPorAlmacen: { 'alm-1': 0 } })]));
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    const datos: DatosOperacionEntradaCuantitativa = {
      modoOperacion: 'valorizado',
      empresaId,
      documentoId: 'nc-1',
      tipoDocumento: 'nota_credito',
      tipoOperacion: 'devolucion_cliente',
      claveIdempotencia: 'DEVOLUCION-nc-1',
      usuario: 'user-1',
      fecha: '2026-08-01T00:00:00.000Z',
      motivo: 'DEVOLUCION_CLIENTE',
      lineas: [
        { lineaId: 'nc-1-dev-0', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 4, costoUnitarioBaseMonedaBase: 12.5, consumoOrigenId: 'consumo-1' },
      ],
    };

    const r1 = await ServicioKardexValorizado.registrarEntradaValorizada(datos, { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada', monedaBase: 'PEN' });
    const r2 = await ServicioKardexValorizado.registrarEntradaValorizada(datos, { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada', monedaBase: 'PEN' });

    expect(r1.estado).toBe('nueva');
    expect(r2.estado).toBe('repetida');
    expect(listarCapasCostoInventarioPorEmpresa(empresaId)).toHaveLength(1);
  });
});
