import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { instalarLocalStorageDePrueba } from '../repositories/localStorageDePrueba';
import {
  validarContrato,
  calcularHashSalidaCuantitativa,
  calcularMutacionesSalida,
  prepararOperacionSalidaInventario,
  confirmarOperacionSalidaInventario,
} from './salidaCuantitativaInventario';
import { reservarOperacionIdempotente } from './idempotenciaInventario';
import { PRODUCT_STORAGE_KEY } from '../../catalogo-articulos/utils/catalogStorage';
import { STORAGE_KEY_MOVEMENTS } from '../repositories/stock.repository';
import { guardarCapaCostoInventario, listarCapasCostoInventarioPorEmpresa } from '../repositories/capaCostoInventario.repository';
import { listarConsumosCapaCostoInventarioPorEmpresa } from '../repositories/consumoCapaCostoInventario.repository';
import type { DatosOperacionSalidaCuantitativa, DatosLineaOperacionCuantitativa } from '../models/operacionEntradaInventario.types';
import type { OperacionIdempotenteInventario } from '../models/operacionIdempotenteInventario.types';
import type { CapaCostoInventario } from '../models/capaCostoInventario.types';
import type { Product } from '../../catalogo-articulos/models/types';
import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';
import { lsKey } from '../../../../../shared/tenant';

const EST_1 = 'est-1';

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

function crearOperacionReservada(overrides: Partial<OperacionIdempotenteInventario> = {}): OperacionIdempotenteInventario {
  return {
    id: 'op-1',
    empresaId: 'emp-A',
    clave: 'clave-1',
    tipoOperacion: 'venta_salida',
    estado: 'preparada',
    hashEntrada: 'hash-1',
    referenciaDocumentoId: 'doc-1',
    referenciaDocumentoTipo: 'venta',
    resultadoIds: [],
    fechaCreacion: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function datosBase(overrides: Partial<DatosOperacionSalidaCuantitativa> = {}): DatosOperacionSalidaCuantitativa {
  return {
    modoOperacion: 'cuantitativo',
    empresaId: 'emp-A',
    documentoId: 'doc-1',
    tipoDocumento: 'venta',
    tipoOperacion: 'venta_salida',
    claveIdempotencia: 'clave-1',
    usuario: 'user-1',
    fecha: '2026-01-01T00:00:00.000Z',
    motivo: 'VENTA',
    lineas: [{ lineaId: 'linea-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 10 }],
    ...overrides,
  };
}

describe('salidaCuantitativaInventario — calcularHashSalidaCuantitativa', () => {
  it('la misma entrada produce siempre el mismo hash', async () => {
    const h1 = await calcularHashSalidaCuantitativa(datosBase());
    const h2 = await calcularHashSalidaCuantitativa(datosBase());
    expect(h1).toBe(h2);
  });

  it('el orden de las líneas no cambia el hash (se normaliza por lineaId)', async () => {
    const lineas: DatosLineaOperacionCuantitativa[] = [
      { lineaId: 'linea-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 10 },
      { lineaId: 'linea-2', productoId: 'prod-2', almacenId: 'alm-1', cantidadUnidadMinima: 5 },
    ];
    const h1 = await calcularHashSalidaCuantitativa(datosBase({ lineas }));
    const h2 = await calcularHashSalidaCuantitativa(datosBase({ lineas: [...lineas].reverse() }));
    expect(h1).toBe(h2);
  });

  it('cambiar la cantidad de una línea cambia el hash', async () => {
    const h1 = await calcularHashSalidaCuantitativa(datosBase());
    const h2 = await calcularHashSalidaCuantitativa(
      datosBase({ lineas: [{ lineaId: 'linea-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 11 }] })
    );
    expect(h1).not.toBe(h2);
  });

  it('cambiar el motivo, observaciones o documentoReferencia cambia el hash', async () => {
    const base = datosBase({ motivo: 'VENTA', observaciones: 'a', documentoReferencia: 'F001-1' });
    const hBase = await calcularHashSalidaCuantitativa(base);
    expect(await calcularHashSalidaCuantitativa({ ...base, motivo: 'OTRO' })).not.toBe(hBase);
    expect(await calcularHashSalidaCuantitativa({ ...base, observaciones: 'b' })).not.toBe(hBase);
    expect(await calcularHashSalidaCuantitativa({ ...base, documentoReferencia: 'F001-2' })).not.toBe(hBase);
  });

  it('el usuario no afecta el hash (dato técnico/de UI)', async () => {
    const h1 = await calcularHashSalidaCuantitativa(datosBase({ usuario: 'user-1' }));
    const h2 = await calcularHashSalidaCuantitativa(datosBase({ usuario: 'user-2' }));
    expect(h1).toBe(h2);
  });
});

describe('salidaCuantitativaInventario — calcularMutacionesSalida: documento de una línea', () => {
  it('calcula cantidadAnterior/cantidadNueva y genera un movimiento SALIDA con los campos estructurales completos', () => {
    const productos = [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })];
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    const { movimientosGenerados, productosActualizados } = calcularMutacionesSalida(
      datosBase(), JSON.stringify(productos), null, almacenes, generarId
    );

    expect(movimientosGenerados).toHaveLength(1);
    const movimiento = movimientosGenerados[0];
    expect(movimiento.tipo).toBe('SALIDA');
    expect(movimiento.cantidadAnterior).toBe(20);
    expect(movimiento.cantidadNueva).toBe(10);
    expect(movimiento.claveIdempotencia).toBe('clave-1');
    expect(movimiento.estado).toBe('confirmado');
    expect(movimiento.capaId).toBeUndefined();
    expect(productosActualizados[0].stockPorAlmacen?.['alm-1']).toBe(10);
  });

  it('salida exacta hasta cero es válida', () => {
    const productos = [crearProducto({ stockPorAlmacen: { 'alm-1': 10 } })];
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    const { productosActualizados } = calcularMutacionesSalida(datosBase(), JSON.stringify(productos), null, almacenes, generarId);

    expect(productosActualizados[0].stockPorAlmacen?.['alm-1']).toBe(0);
  });

  it('salida superior al stock disponible rechaza todo el documento', () => {
    const productos = [crearProducto({ stockPorAlmacen: { 'alm-1': 5 } })];
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    expect(() =>
      calcularMutacionesSalida(datosBase(), JSON.stringify(productos), null, almacenes, generarId)
    ).toThrow(/negativo/);
  });

  it('no lee ni escribe localStorage', () => {
    const productos = [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })];
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    calcularMutacionesSalida(datosBase(), JSON.stringify(productos), null, almacenes, generarId);

    expect(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, 'emp-A'))).toBeNull();
    expect(localStorage.getItem(lsKey(STORAGE_KEY_MOVEMENTS, 'emp-A'))).toBeNull();
  });
});

describe('salidaCuantitativaInventario — líneas repetidas y consolidación', () => {
  it('mismo producto+almacén repetido en dos líneas se acumula secuencialmente (ejemplo del encargo: 10 → 6 → 3)', () => {
    const productos = [crearProducto({ stockPorAlmacen: { 'alm-1': 10 } })];
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    const datos = datosBase({
      lineas: [
        { lineaId: 'linea-A', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 4 },
        { lineaId: 'linea-B', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 3 },
      ],
    });

    const { movimientosGenerados, productosActualizados } = calcularMutacionesSalida(datos, JSON.stringify(productos), null, almacenes, generarId);

    expect(movimientosGenerados).toHaveLength(2);
    expect(movimientosGenerados[0]).toMatchObject({ cantidadAnterior: 10, cantidadNueva: 6 });
    expect(movimientosGenerados[1]).toMatchObject({ cantidadAnterior: 6, cantidadNueva: 3 });
    expect(productosActualizados[0].stockPorAlmacen?.['alm-1']).toBe(3);
  });

  it('el total consolidado (no cada línea aislada) es lo que se valida contra el stock disponible', () => {
    const productos = [crearProducto({ stockPorAlmacen: { 'alm-1': 10 } })];
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    // Cada línea individualmente cabría en el stock inicial (10), pero la suma (6+6=12) no.
    const datos = datosBase({
      lineas: [
        { lineaId: 'linea-A', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 6 },
        { lineaId: 'linea-B', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 6 },
      ],
    });

    expect(() => calcularMutacionesSalida(datos, JSON.stringify(productos), null, almacenes, generarId)).toThrow(/negativo/);
  });

  it('mismo producto en almacenes distintos no se mezcla', () => {
    const productos = [crearProducto({ stockPorAlmacen: { 'alm-1': 10, 'alm-2': 5 } })];
    const almacenes = new Map([
      ['alm-1', crearAlmacen({ id: 'alm-1' })],
      ['alm-2', crearAlmacen({ id: 'alm-2', codigoAlmacen: 'ALM02', nombreAlmacen: 'Sucursal' })],
    ]);
    const datos = datosBase({
      lineas: [
        { lineaId: 'linea-A', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 4 },
        { lineaId: 'linea-B', productoId: 'prod-1', almacenId: 'alm-2', cantidadUnidadMinima: 2 },
      ],
    });

    const { productosActualizados } = calcularMutacionesSalida(datos, JSON.stringify(productos), null, almacenes, generarId);

    expect(productosActualizados[0].stockPorAlmacen?.['alm-1']).toBe(6);
    expect(productosActualizados[0].stockPorAlmacen?.['alm-2']).toBe(3);
  });

  it('productos distintos: cada uno genera su propio movimiento y actualización', () => {
    const productos = [
      crearProducto({ id: 'prod-1', stockPorAlmacen: { 'alm-1': 10 } }),
      crearProducto({ id: 'prod-2', codigo: 'P002', stockPorAlmacen: { 'alm-1': 20 } }),
    ];
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    const datos = datosBase({
      lineas: [
        { lineaId: 'linea-A', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 4 },
        { lineaId: 'linea-B', productoId: 'prod-2', almacenId: 'alm-1', cantidadUnidadMinima: 6 },
      ],
    });

    const { movimientosGenerados, productosActualizados } = calcularMutacionesSalida(datos, JSON.stringify(productos), null, almacenes, generarId);

    expect(movimientosGenerados).toHaveLength(2);
    const porId = new Map(productosActualizados.map((p) => [p.id, p]));
    expect(porId.get('prod-1')?.stockPorAlmacen?.['alm-1']).toBe(6);
    expect(porId.get('prod-2')?.stockPorAlmacen?.['alm-1']).toBe(14);
  });

  it('una línea inválida (producto inexistente) rechaza todo el documento, sin plan parcial', () => {
    const productos = [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })];
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    const datos = datosBase({
      lineas: [
        { lineaId: 'linea-A', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 1 },
        { lineaId: 'linea-B', productoId: 'prod-inexistente', almacenId: 'alm-1', cantidadUnidadMinima: 1 },
      ],
    });

    expect(() => calcularMutacionesSalida(datos, JSON.stringify(productos), null, almacenes, generarId)).toThrow(/no existe en el catálogo/);
  });
});

describe('salidaCuantitativaInventario — clasificación inventariable (defensa universal del motor)', () => {
  it('rechaza un producto tipoExistencia SERVICIOS', () => {
    const productos = [crearProducto({ tipoExistencia: 'SERVICIOS', stockPorAlmacen: { 'alm-1': 20 } })];
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    expect(() => calcularMutacionesSalida(datosBase(), JSON.stringify(productos), null, almacenes, generarId)).toThrow(/no está controlado por stock/);
  });

  it('rechaza un producto tipoExistencia OTROS', () => {
    const productos = [crearProducto({ tipoExistencia: 'OTROS', stockPorAlmacen: { 'alm-1': 20 } })];
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    expect(() => calcularMutacionesSalida(datosBase(), JSON.stringify(productos), null, almacenes, generarId)).toThrow(/no está controlado por stock/);
  });

  it('rechaza un tipoExistencia desconocido/ausente', () => {
    const productos = [crearProducto({ tipoExistencia: undefined, stockPorAlmacen: { 'alm-1': 20 } })];
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    expect(() => calcularMutacionesSalida(datosBase(), JSON.stringify(productos), null, almacenes, generarId)).toThrow(/no está controlado por stock/);
  });

  it('la defensa aplica también a ajuste_negativo y nota_salida, no solo a venta_salida', () => {
    const productos = [crearProducto({ tipoExistencia: 'OTROS', stockPorAlmacen: { 'alm-1': 20 } })];
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    expect(() =>
      calcularMutacionesSalida(datosBase({ tipoOperacion: 'ajuste_negativo' }), JSON.stringify(productos), null, almacenes, generarId)
    ).toThrow(/no está controlado por stock/);
    expect(() =>
      calcularMutacionesSalida(datosBase({ tipoOperacion: 'nota_salida', tipoDocumento: 'nota_salida' }), JSON.stringify(productos), null, almacenes, generarId)
    ).toThrow(/no está controlado por stock/);
  });
});

describe('salidaCuantitativaInventario — liberación de reserva de OV en la misma unidad de trabajo', () => {
  it('una línea con liberarReservaOV reduce stockReservadoOVPorEstablecimiento y el stock real, en el mismo cálculo', () => {
    const productos = [crearProducto({
      stockPorAlmacen: { 'alm-1': 20 },
      stockReservadoOVPorEstablecimiento: { 'est-1': 10 },
    })];
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    const datos = datosBase({
      lineas: [{ lineaId: 'linea-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 10, liberarReservaOV: { establecimientoId: 'est-1', cantidad: 10 } }],
    });

    const { productosActualizados } = calcularMutacionesSalida(datos, JSON.stringify(productos), null, almacenes, generarId);

    expect(productosActualizados[0].stockPorAlmacen?.['alm-1']).toBe(10);
    expect(productosActualizados[0].stockReservadoOVPorEstablecimiento?.['est-1']).toBe(0);
  });

  it('rechaza todo el documento si se pide liberar más de lo reservado (nunca se corrige en silencio con Math.max(0, ...))', () => {
    const productos = [crearProducto({
      stockPorAlmacen: { 'alm-1': 20 },
      stockReservadoOVPorEstablecimiento: { 'est-1': 3 },
    })];
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    const datos = datosBase({
      lineas: [{ lineaId: 'linea-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 10, liberarReservaOV: { establecimientoId: 'est-1', cantidad: 10 } }],
    });

    expect(() =>
      calcularMutacionesSalida(datos, JSON.stringify(productos), null, almacenes, generarId)
    ).toThrow(/solo hay 3 reservados/);

    // Rechazo completo: el stock real tampoco se toca (no queda un plan parcial).
    const productosSinCambios = JSON.parse(JSON.stringify(productos)) as typeof productos;
    expect(productosSinCambios[0].stockPorAlmacen['alm-1']).toBe(20);
  });

  it('rechaza todo el documento si la liberación total excede el despacho total del producto en la misma operación', () => {
    const productos = [crearProducto({
      stockPorAlmacen: { 'alm-1': 20 },
      stockReservadoOVPorEstablecimiento: { 'est-1': 100 },
    })];
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    // Se despachan 5 unidades pero se declara liberar 8 — más de lo que esta operación despacha.
    const datos = datosBase({
      lineas: [{ lineaId: 'linea-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 5, liberarReservaOV: { establecimientoId: 'est-1', cantidad: 8 } }],
    });

    expect(() =>
      calcularMutacionesSalida(datos, JSON.stringify(productos), null, almacenes, generarId)
    ).toThrow(/solo despacha 5/);
  });

  it('sin liberarReservaOV, stockReservadoOVPorEstablecimiento no se toca', () => {
    const productos = [crearProducto({
      stockPorAlmacen: { 'alm-1': 20 },
      stockReservadoOVPorEstablecimiento: { 'est-1': 10 },
    })];
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    const { productosActualizados } = calcularMutacionesSalida(datosBase(), JSON.stringify(productos), null, almacenes, generarId);

    expect(productosActualizados[0].stockReservadoOVPorEstablecimiento?.['est-1']).toBe(10);
  });

  it('la reserva de otro producto/establecimiento nunca se afecta', () => {
    const productos = [
      crearProducto({ id: 'prod-1', stockPorAlmacen: { 'alm-1': 20 }, stockReservadoOVPorEstablecimiento: { 'est-1': 10 } }),
      crearProducto({ id: 'prod-2', codigo: 'P002', stockPorAlmacen: { 'alm-1': 20 }, stockReservadoOVPorEstablecimiento: { 'est-1': 5 } }),
    ];
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    const datos = datosBase({
      lineas: [{ lineaId: 'linea-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 10, liberarReservaOV: { establecimientoId: 'est-1', cantidad: 10 } }],
    });

    const { productosActualizados } = calcularMutacionesSalida(datos, JSON.stringify(productos), null, almacenes, generarId);

    expect(productosActualizados).toHaveLength(1);
    const productoDosSinTocar = JSON.parse(JSON.stringify(productos))[1];
    expect(productoDosSinTocar.stockReservadoOVPorEstablecimiento['est-1']).toBe(5);
  });
});

describe('salidaCuantitativaInventario — liberación de reserva OV LEGACY (por almacén) en la misma unidad de trabajo (corrección post-1D, §2)', () => {
  it('una línea con liberarReservaLegacyOV reduce stockReservadoPorAlmacen y el stock real, en el mismo cálculo', () => {
    const productos = [crearProducto({
      stockPorAlmacen: { 'alm-1': 20 },
      stockReservadoPorAlmacen: { 'alm-1': 10 },
    })];
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    const datos = datosBase({
      lineas: [{ lineaId: 'linea-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 10, liberarReservaLegacyOV: { cantidad: 10 } }],
    });

    const { productosActualizados } = calcularMutacionesSalida(datos, JSON.stringify(productos), null, almacenes, generarId);

    expect(productosActualizados[0].stockPorAlmacen?.['alm-1']).toBe(10);
    expect(productosActualizados[0].stockReservadoPorAlmacen?.['alm-1']).toBe(0);
  });

  it('rechaza todo el documento si se pide liberar más reserva legacy de la vigente', () => {
    const productos = [crearProducto({
      stockPorAlmacen: { 'alm-1': 20 },
      stockReservadoPorAlmacen: { 'alm-1': 3 },
    })];
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    const datos = datosBase({
      lineas: [{ lineaId: 'linea-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 10, liberarReservaLegacyOV: { cantidad: 10 } }],
    });

    expect(() =>
      calcularMutacionesSalida(datos, JSON.stringify(productos), null, almacenes, generarId)
    ).toThrow(/reserva OV legacy/);
  });

  it('rechaza todo el documento si la liberación legacy total excede el despacho total del producto en la misma operación', () => {
    const productos = [crearProducto({
      stockPorAlmacen: { 'alm-1': 20 },
      stockReservadoPorAlmacen: { 'alm-1': 100 },
    })];
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    const datos = datosBase({
      lineas: [{ lineaId: 'linea-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 5, liberarReservaLegacyOV: { cantidad: 8 } }],
    });

    expect(() =>
      calcularMutacionesSalida(datos, JSON.stringify(productos), null, almacenes, generarId)
    ).toThrow(/solo despacha 5/);
  });

  it('una reserva legacy y una reserva nueva (establecimiento) de productos distintos se aplican juntas sin interferir', () => {
    const productos = [
      crearProducto({ id: 'prod-1', stockPorAlmacen: { 'alm-1': 20 }, stockReservadoPorAlmacen: { 'alm-1': 10 } }),
      crearProducto({ id: 'prod-2', codigo: 'P002', stockPorAlmacen: { 'alm-1': 20 }, stockReservadoOVPorEstablecimiento: { 'est-1': 10 } }),
    ];
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    const datos = datosBase({
      lineas: [
        { lineaId: 'linea-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 10, liberarReservaLegacyOV: { cantidad: 10 } },
        { lineaId: 'linea-2', productoId: 'prod-2', almacenId: 'alm-1', cantidadUnidadMinima: 10, liberarReservaOV: { establecimientoId: 'est-1', cantidad: 10 } },
      ],
    });

    const { productosActualizados } = calcularMutacionesSalida(datos, JSON.stringify(productos), null, almacenes, generarId);
    const porId = new Map(productosActualizados.map((p) => [p.id, p]));
    expect(porId.get('prod-1')?.stockReservadoPorAlmacen?.['alm-1']).toBe(0);
    expect(porId.get('prod-2')?.stockReservadoOVPorEstablecimiento?.['est-1']).toBe(0);
  });
});

describe('salidaCuantitativaInventario — permitirStockNegativo restringido a venta_salida (corrección post-1D, §4)', () => {
  it('ajuste_negativo rechaza stock negativo aunque el llamador pase permitirStockNegativo=true', () => {
    const productos = [crearProducto({ stockPorAlmacen: { 'alm-1': 3 } })];
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    const datos = datosBase({ tipoOperacion: 'ajuste_negativo', lineas: [{ lineaId: 'linea-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 10 }] });

    expect(() =>
      calcularMutacionesSalida(datos, JSON.stringify(productos), null, almacenes, generarId, true)
    ).toThrow(/negativo/);
  });

  it('nota_salida rechaza stock negativo aunque el llamador pase permitirStockNegativo=true', () => {
    const productos = [crearProducto({ stockPorAlmacen: { 'alm-1': 3 } })];
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    const datos = datosBase({ tipoOperacion: 'nota_salida', tipoDocumento: 'nota_salida', lineas: [{ lineaId: 'linea-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 10 }] });

    expect(() =>
      calcularMutacionesSalida(datos, JSON.stringify(productos), null, almacenes, generarId, true)
    ).toThrow(/negativo/);
  });

  it('venta_salida sí acepta stock negativo cuando el llamador lo declara explícitamente', () => {
    const productos = [crearProducto({ stockPorAlmacen: { 'alm-1': 3 } })];
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    const datos = datosBase({ tipoOperacion: 'venta_salida', tipoDocumento: 'venta', lineas: [{ lineaId: 'linea-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 10 }] });

    const { productosActualizados } = calcularMutacionesSalida(datos, JSON.stringify(productos), null, almacenes, generarId, true);
    expect(productosActualizados[0].stockPorAlmacen?.['alm-1']).toBe(-7);
  });
});

describe('salidaCuantitativaInventario — rechazo por reserva inválida', () => {
  it('la operación reservada de otra empresa se rechaza', () => {
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    expect(() =>
      prepararOperacionSalidaInventario({
        datos: datosBase(),
        operacionReservada: crearOperacionReservada({ empresaId: 'emp-B' }),
        hashEntrada: 'hash-1',
        versionEsperada: 0,
        productosRaw: JSON.stringify([crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]),
        movimientosRaw: null,
        almacenes,
        generarId,
      })
    ).toThrow(/otra empresa/);
  });

  it('la operación reservada con un hash distinto se rechaza', () => {
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    expect(() =>
      prepararOperacionSalidaInventario({
        datos: datosBase(),
        operacionReservada: crearOperacionReservada(),
        hashEntrada: 'hash-DISTINTO',
        versionEsperada: 0,
        productosRaw: JSON.stringify([crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]),
        movimientosRaw: null,
        almacenes,
        generarId,
      })
    ).toThrow(/hash/);
  });
});

describe('salidaCuantitativaInventario — confirmarOperacionSalidaInventario: integración de punta a punta con Etapa 1B', () => {
  it('reserva real + preparación + confirmación escriben productos y movimientos, e incrementan la versión', async () => {
    const empresaId = 'emp-A';
    const productos = [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })];
    localStorage.setItem(lsKey(PRODUCT_STORAGE_KEY, empresaId), JSON.stringify(productos));
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    const datos = datosBase({ empresaId });
    const hashEntrada = await calcularHashSalidaCuantitativa(datos);
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
    const { plan, movimientosGenerados } = prepararOperacionSalidaInventario({
      datos,
      operacionReservada: reserva.operacion,
      hashEntrada,
      versionEsperada: 0,
      productosRaw: localStorage.getItem(claveProductos),
      movimientosRaw: localStorage.getItem(lsKey(STORAGE_KEY_MOVEMENTS, empresaId)),
      almacenes,
      generarId,
    });

    const resultado = await confirmarOperacionSalidaInventario(datos.documentoId, plan, fechaActual);

    expect(resultado.resultadoIds).toEqual(movimientosGenerados.map((m) => m.id));
    const productosFinales = JSON.parse(localStorage.getItem(claveProductos) as string) as Product[];
    expect(productosFinales[0].stockPorAlmacen['alm-1']).toBe(10);
  });
});

// ─── Etapa 4A: modo valorizado — consumo FIFO de capas ─────────────────────

async function ejecutarSalidaEndToEnd(
  empresaId: string,
  datos: DatosOperacionSalidaCuantitativa,
  almacenes: Map<string, Almacen>
) {
  const claveProductos = lsKey(PRODUCT_STORAGE_KEY, empresaId);
  const hashEntrada = await calcularHashSalidaCuantitativa(datos);
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
  if (reserva.tipo !== 'nueva') throw new Error('se esperaba una reserva nueva');

  const { plan, movimientosGenerados } = prepararOperacionSalidaInventario({
    datos,
    operacionReservada: reserva.operacion,
    hashEntrada,
    versionEsperada: 0,
    productosRaw: localStorage.getItem(claveProductos),
    movimientosRaw: localStorage.getItem(lsKey(STORAGE_KEY_MOVEMENTS, empresaId)),
    almacenes,
    generarId,
  });

  const resultado = await confirmarOperacionSalidaInventario(datos.documentoId, plan, fechaActual);
  return { resultado, movimientosGenerados };
}

describe('salidaCuantitativaInventario — validarContrato: modo valorizado', () => {
  it('rechaza modoOperacion="valorizado" para un tipoOperacion no soportado (ej. importación no listada)', () => {
    expect(() =>
      validarContrato({ ...datosBase({ tipoOperacion: 'nota_salida' }), modoOperacion: 'valorizado', tipoOperacion: 'devolucion_cliente' })
    ).toThrow(/venta_salida, nota_salida, ajuste_negativo/);
  });

  it('acepta modoOperacion="valorizado" para venta_salida/nota_salida/ajuste_negativo', () => {
    for (const tipoOperacion of ['venta_salida', 'nota_salida', 'ajuste_negativo'] as const) {
      expect(() => validarContrato({ ...datosBase(), modoOperacion: 'valorizado', tipoOperacion })).not.toThrow();
    }
  });
});

describe('salidaCuantitativaInventario — modo valorizado: consumo FIFO de capas', () => {
  it('ejemplo obligatorio del encargo: capa A 10@10 + capa B 5@12, salida 12 → consume 10+2, costo total 124, saldo B=3', async () => {
    const empresaId = 'emp-A';
    localStorage.setItem(lsKey(PRODUCT_STORAGE_KEY, empresaId), JSON.stringify([crearProducto({ stockPorAlmacen: { 'alm-1': 15 } })]));
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    guardarCapaCostoInventario(crearCapaDePrueba({ id: 'capa-A', fechaEntrada: '2026-01-01T00:00:00.000Z', cantidadInicial: 10, cantidadDisponible: 10, costoUnitarioBaseMonedaBase: 10 }), empresaId);
    guardarCapaCostoInventario(crearCapaDePrueba({ id: 'capa-B', fechaEntrada: '2026-02-01T00:00:00.000Z', cantidadInicial: 5, cantidadDisponible: 5, costoUnitarioBaseMonedaBase: 12 }), empresaId);

    const datos = datosBase({ empresaId, modoOperacion: 'valorizado', lineas: [{ lineaId: 'linea-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 12 }] });
    await ejecutarSalidaEndToEnd(empresaId, datos, almacenes);

    const capas = listarCapasCostoInventarioPorEmpresa(empresaId);
    const capaA = capas.find((c) => c.id === 'capa-A');
    const capaB = capas.find((c) => c.id === 'capa-B');
    expect(capaA?.cantidadDisponible).toBe(0);
    expect(capaA?.estado).toBe('agotada');
    expect(capaA?.cantidadInicial).toBe(10); // cantidadInicial JAMÁS cambia
    expect(capaB?.cantidadDisponible).toBe(3);
    expect(capaB?.estado).toBe('disponible');
    expect(capaB?.cantidadInicial).toBe(5);

    const consumos = listarConsumosCapaCostoInventarioPorEmpresa(empresaId);
    expect(consumos).toHaveLength(2);
    const consumoA = consumos.find((c) => c.capaId === 'capa-A');
    const consumoB = consumos.find((c) => c.capaId === 'capa-B');
    expect(consumoA?.cantidadConsumida).toBe(10);
    expect(consumoB?.cantidadConsumida).toBe(2);
    const costoTotal = (consumoA?.valorConsumidoMonedaBase ?? 0) + (consumoB?.valorConsumidoMonedaBase ?? 0);
    expect(costoTotal).toBe(124);
    expect(consumos.every((c) => c.motivo === 'salida' && c.estado === 'confirmado')).toBe(true);
  });

  it('una línea consume tres capas', async () => {
    const empresaId = 'emp-A';
    localStorage.setItem(lsKey(PRODUCT_STORAGE_KEY, empresaId), JSON.stringify([crearProducto({ stockPorAlmacen: { 'alm-1': 9 } })]));
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    guardarCapaCostoInventario(crearCapaDePrueba({ id: 'capa-1', fechaEntrada: '2026-01-01T00:00:00.000Z', cantidadInicial: 2, cantidadDisponible: 2, costoUnitarioBaseMonedaBase: 10 }), empresaId);
    guardarCapaCostoInventario(crearCapaDePrueba({ id: 'capa-2', fechaEntrada: '2026-01-02T00:00:00.000Z', cantidadInicial: 3, cantidadDisponible: 3, costoUnitarioBaseMonedaBase: 11 }), empresaId);
    guardarCapaCostoInventario(crearCapaDePrueba({ id: 'capa-3', fechaEntrada: '2026-01-03T00:00:00.000Z', cantidadInicial: 4, cantidadDisponible: 4, costoUnitarioBaseMonedaBase: 12 }), empresaId);

    const datos = datosBase({ empresaId, modoOperacion: 'valorizado', lineas: [{ lineaId: 'linea-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 9 }] });
    await ejecutarSalidaEndToEnd(empresaId, datos, almacenes);

    const consumos = listarConsumosCapaCostoInventarioPorEmpresa(empresaId);
    expect(consumos).toHaveLength(3);
    expect(consumos.reduce((s, c) => s + c.cantidadConsumida, 0)).toBe(9);
    const capas = listarCapasCostoInventarioPorEmpresa(empresaId);
    expect(capas.every((c) => c.cantidadDisponible === 0 && c.estado === 'agotada')).toBe(true);
  });

  it('dos líneas del mismo documento (mismo producto+almacén) consumen secuencialmente sin releer un saldo obsoleto', async () => {
    const empresaId = 'emp-A';
    localStorage.setItem(lsKey(PRODUCT_STORAGE_KEY, empresaId), JSON.stringify([crearProducto({ stockPorAlmacen: { 'alm-1': 7 } })]));
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    // capa-1 (5, FIFO primero) + capa-2 (2, FIFO segundo) = 7 exactos para las dos líneas (4+3).
    guardarCapaCostoInventario(crearCapaDePrueba({ id: 'capa-1', fechaEntrada: '2026-01-01T00:00:00.000Z', cantidadInicial: 5, cantidadDisponible: 5, costoUnitarioBaseMonedaBase: 10 }), empresaId);
    guardarCapaCostoInventario(crearCapaDePrueba({ id: 'capa-2', fechaEntrada: '2026-01-02T00:00:00.000Z', cantidadInicial: 2, cantidadDisponible: 2, costoUnitarioBaseMonedaBase: 11 }), empresaId);

    const datos = datosBase({
      empresaId,
      modoOperacion: 'valorizado',
      lineas: [
        { lineaId: 'linea-A', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 4 },
        { lineaId: 'linea-B', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 3 },
      ],
    });
    const { movimientosGenerados } = await ejecutarSalidaEndToEnd(empresaId, datos, almacenes);

    // linea-A consume 4 de capa-1 (deja 1 disponible en capa-1). linea-B necesita 3: continúa
    // consumiendo desde el saldo de capa-1 ya actualizado por linea-A (1, nunca el original 5), y
    // completa con 2 de capa-2 — es exactamente lo que prueba que no relee un saldo obsoleto.
    const movA = movimientosGenerados.find((m) => m.lineaOrigenId === 'linea-A');
    const movB = movimientosGenerados.find((m) => m.lineaOrigenId === 'linea-B');
    const consumos = listarConsumosCapaCostoInventarioPorEmpresa(empresaId);
    const consumoDeA = consumos.filter((c) => c.movimientoSalidaId === movA?.id);
    const consumoDeB = consumos.filter((c) => c.movimientoSalidaId === movB?.id);
    expect(consumoDeA.reduce((s, c) => s + c.cantidadConsumida, 0)).toBe(4);
    expect(consumoDeB.reduce((s, c) => s + c.cantidadConsumida, 0)).toBe(3);
    expect(consumoDeB.find((c) => c.capaId === 'capa-1')?.cantidadConsumida).toBe(1);
    expect(consumoDeB.find((c) => c.capaId === 'capa-2')?.cantidadConsumida).toBe(2);

    const capas = listarCapasCostoInventarioPorEmpresa(empresaId);
    expect(capas.find((c) => c.id === 'capa-1')?.cantidadDisponible).toBe(0);
    expect(capas.find((c) => c.id === 'capa-2')?.cantidadDisponible).toBe(0);
  });

  it('cierre de brecha (identidad estable de línea): una línea comercial repartida entre dos segmentos conserva el MISMO lineaComercialId en ambos movimientos y consumos, aunque cada uno tenga su propio lineaOrigenId técnico', async () => {
    const empresaId = 'emp-A';
    localStorage.setItem(lsKey(PRODUCT_STORAGE_KEY, empresaId), JSON.stringify([crearProducto({ stockPorAlmacen: { 'alm-1': 7 } })]));
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    guardarCapaCostoInventario(crearCapaDePrueba({ id: 'capa-1', fechaEntrada: '2026-01-01T00:00:00.000Z', cantidadInicial: 5, cantidadDisponible: 5, costoUnitarioBaseMonedaBase: 10 }), empresaId);
    guardarCapaCostoInventario(crearCapaDePrueba({ id: 'capa-2', fechaEntrada: '2026-01-02T00:00:00.000Z', cantidadInicial: 2, cantidadDisponible: 2, costoUnitarioBaseMonedaBase: 11 }), empresaId);

    const datos = datosBase({
      empresaId,
      modoOperacion: 'valorizado',
      lineas: [
        { lineaId: 'seg-A', lineaComercialId: 'linea-comercial-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 4 },
        { lineaId: 'seg-B', lineaComercialId: 'linea-comercial-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 3 },
      ],
    });
    const { movimientosGenerados } = await ejecutarSalidaEndToEnd(empresaId, datos, almacenes);

    expect(movimientosGenerados).toHaveLength(2);
    expect(movimientosGenerados.map((m) => m.lineaOrigenId).sort()).toEqual(['seg-A', 'seg-B']);
    expect(movimientosGenerados.every((m) => m.lineaComercialId === 'linea-comercial-1')).toBe(true);

    const consumos = listarConsumosCapaCostoInventarioPorEmpresa(empresaId);
    expect(consumos.length).toBeGreaterThan(0);
    expect(consumos.every((c) => c.lineaComercialId === 'linea-comercial-1')).toBe(true);
    // Cada consumo conserva su propia lineaDocumentoSalidaId (clave técnica del segmento) distinta.
    const lineasDocumentoSalida = new Set(consumos.map((c) => c.lineaDocumentoSalidaId));
    expect(lineasDocumentoSalida).toEqual(new Set(['seg-A', 'seg-B']));
  });

  it('sin lineaComercialId (canal legacy), el movimiento y el consumo simplemente no lo incluyen — nunca se inventa', async () => {
    const empresaId = 'emp-A';
    localStorage.setItem(lsKey(PRODUCT_STORAGE_KEY, empresaId), JSON.stringify([crearProducto({ stockPorAlmacen: { 'alm-1': 5 } })]));
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    guardarCapaCostoInventario(crearCapaDePrueba({ id: 'capa-1', cantidadInicial: 5, cantidadDisponible: 5 }), empresaId);

    const datos = datosBase({ empresaId, modoOperacion: 'valorizado', lineas: [{ lineaId: 'linea-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 5 }] });
    const { movimientosGenerados } = await ejecutarSalidaEndToEnd(empresaId, datos, almacenes);

    expect(movimientosGenerados[0].lineaComercialId).toBeUndefined();
    expect(listarConsumosCapaCostoInventarioPorEmpresa(empresaId)[0].lineaComercialId).toBeUndefined();
  });

  it('productos y almacenes distintos no mezclan sus capas', async () => {
    const empresaId = 'emp-A';
    localStorage.setItem(
      lsKey(PRODUCT_STORAGE_KEY, empresaId),
      JSON.stringify([
        crearProducto({ id: 'prod-1', codigo: 'P001', stockPorAlmacen: { 'alm-1': 5, 'alm-2': 5 } }),
        crearProducto({ id: 'prod-2', codigo: 'P002', nombre: 'Producto 2', stockPorAlmacen: { 'alm-1': 5 } }),
      ]),
    );
    const almacenes = new Map([
      ['alm-1', crearAlmacen({ id: 'alm-1' })],
      ['alm-2', crearAlmacen({ id: 'alm-2', codigoAlmacen: 'ALM02', nombreAlmacen: 'Sucursal' })],
    ]);
    guardarCapaCostoInventario(crearCapaDePrueba({ id: 'capa-prod1-alm1', productoId: 'prod-1', almacenId: 'alm-1', cantidadInicial: 5, cantidadDisponible: 5 }), empresaId);
    guardarCapaCostoInventario(crearCapaDePrueba({ id: 'capa-prod1-alm2', productoId: 'prod-1', almacenId: 'alm-2', cantidadInicial: 5, cantidadDisponible: 5 }), empresaId);
    guardarCapaCostoInventario(crearCapaDePrueba({ id: 'capa-prod2-alm1', productoId: 'prod-2', almacenId: 'alm-1', cantidadInicial: 5, cantidadDisponible: 5 }), empresaId);

    const datos = datosBase({
      empresaId,
      modoOperacion: 'valorizado',
      lineas: [
        { lineaId: 'linea-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 5 },
        { lineaId: 'linea-2', productoId: 'prod-1', almacenId: 'alm-2', cantidadUnidadMinima: 5 },
        { lineaId: 'linea-3', productoId: 'prod-2', almacenId: 'alm-1', cantidadUnidadMinima: 5 },
      ],
    });
    await ejecutarSalidaEndToEnd(empresaId, datos, almacenes);

    const capas = listarCapasCostoInventarioPorEmpresa(empresaId);
    expect(capas.find((c) => c.id === 'capa-prod1-alm1')?.cantidadDisponible).toBe(0);
    expect(capas.find((c) => c.id === 'capa-prod1-alm2')?.cantidadDisponible).toBe(0);
    expect(capas.find((c) => c.id === 'capa-prod2-alm1')?.cantidadDisponible).toBe(0);
  });

  it('desempate FIFO fechaEntrada → fechaCreacion → id', async () => {
    const empresaId = 'emp-A';
    localStorage.setItem(lsKey(PRODUCT_STORAGE_KEY, empresaId), JSON.stringify([crearProducto({ stockPorAlmacen: { 'alm-1': 3 } })]));
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    guardarCapaCostoInventario(crearCapaDePrueba({
      id: 'capa-b', fechaEntrada: '2026-01-01T00:00:00.000Z', fechaCreacion: '2026-01-02T00:00:00.000Z', cantidadInicial: 3, cantidadDisponible: 3,
    }), empresaId);
    guardarCapaCostoInventario(crearCapaDePrueba({
      id: 'capa-a', fechaEntrada: '2026-01-01T00:00:00.000Z', fechaCreacion: '2026-01-01T00:00:00.000Z', cantidadInicial: 3, cantidadDisponible: 3,
    }), empresaId);

    const datos = datosBase({ empresaId, modoOperacion: 'valorizado', lineas: [{ lineaId: 'linea-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 3 }] });
    await ejecutarSalidaEndToEnd(empresaId, datos, almacenes);

    const capas = listarCapasCostoInventarioPorEmpresa(empresaId);
    expect(capas.find((c) => c.id === 'capa-a')?.cantidadDisponible).toBe(0); // fechaCreacion más temprana → primero
    expect(capas.find((c) => c.id === 'capa-b')?.cantidadDisponible).toBe(3);
  });

  it('capas insuficientes rechazan TODA la operación — sin mutar stock, capas ni consumos', async () => {
    const empresaId = 'emp-A';
    localStorage.setItem(lsKey(PRODUCT_STORAGE_KEY, empresaId), JSON.stringify([crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]));
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    guardarCapaCostoInventario(crearCapaDePrueba({ id: 'capa-1', cantidadInicial: 3, cantidadDisponible: 3 }), empresaId);

    const datos = datosBase({ empresaId, modoOperacion: 'valorizado', lineas: [{ lineaId: 'linea-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 5 }] });

    await expect(ejecutarSalidaEndToEnd(empresaId, datos, almacenes)).rejects.toThrow(/no cubren exactamente la cantidad/);

    const productos = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productos[0].stockPorAlmacen['alm-1']).toBe(20);
    expect(listarCapasCostoInventarioPorEmpresa(empresaId).find((c) => c.id === 'capa-1')?.cantidadDisponible).toBe(3);
    expect(listarConsumosCapaCostoInventarioPorEmpresa(empresaId)).toHaveLength(0);
  });

  it('redondeo respeta PRECISION_CANTIDAD_UNIDAD_MINIMA al partir una capa entre varias líneas', async () => {
    const empresaId = 'emp-A';
    localStorage.setItem(lsKey(PRODUCT_STORAGE_KEY, empresaId), JSON.stringify([crearProducto({ stockPorAlmacen: { 'alm-1': 1.5 } })]));
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    guardarCapaCostoInventario(crearCapaDePrueba({ id: 'capa-1', cantidadInicial: 1.5, cantidadDisponible: 1.5, costoUnitarioBaseMonedaBase: 10 }), empresaId);

    const datos = datosBase({ empresaId, modoOperacion: 'valorizado', lineas: [{ lineaId: 'linea-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 1.5 }] });
    await ejecutarSalidaEndToEnd(empresaId, datos, almacenes);

    const capa = listarCapasCostoInventarioPorEmpresa(empresaId).find((c) => c.id === 'capa-1');
    expect(capa?.cantidadDisponible).toBe(0);
    expect(capa?.estado).toBe('agotada');
  });

  it('operación cuantitativa (sin modoOperacion valorizado) no crea consumos ni toca capas existentes', async () => {
    const empresaId = 'emp-A';
    localStorage.setItem(lsKey(PRODUCT_STORAGE_KEY, empresaId), JSON.stringify([crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]));
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    guardarCapaCostoInventario(crearCapaDePrueba({ id: 'capa-1', cantidadInicial: 10, cantidadDisponible: 10 }), empresaId);

    const datos = datosBase({ empresaId }); // modoOperacion: 'cuantitativo' (default)
    await ejecutarSalidaEndToEnd(empresaId, datos, almacenes);

    expect(listarConsumosCapaCostoInventarioPorEmpresa(empresaId)).toHaveLength(0);
    expect(listarCapasCostoInventarioPorEmpresa(empresaId).find((c) => c.id === 'capa-1')?.cantidadDisponible).toBe(10);
  });

  it('reintento idempotente (misma clave) no duplica el consumo de capas', async () => {
    const empresaId = 'emp-A';
    localStorage.setItem(lsKey(PRODUCT_STORAGE_KEY, empresaId), JSON.stringify([crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]));
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    guardarCapaCostoInventario(crearCapaDePrueba({ id: 'capa-1', cantidadInicial: 10, cantidadDisponible: 10 }), empresaId);

    const datos = datosBase({ empresaId, modoOperacion: 'valorizado', lineas: [{ lineaId: 'linea-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 5 }] });
    await ejecutarSalidaEndToEnd(empresaId, datos, almacenes);
    expect(listarConsumosCapaCostoInventarioPorEmpresa(empresaId)).toHaveLength(1);

    // Reintento: misma clave, mismo hash → el motor reserva 'repetida' y nunca vuelve a invocar preparar/confirmar.
    const hashEntrada = await calcularHashSalidaCuantitativa(datos);
    const reintento = await reservarOperacionIdempotente({
      empresaId,
      clave: datos.claveIdempotencia,
      tipoOperacion: datos.tipoOperacion,
      hashEntrada,
      referenciaDocumentoId: datos.documentoId,
      referenciaDocumentoTipo: datos.tipoDocumento,
      generarId,
      fechaActual,
    });
    expect(reintento.tipo).toBe('repetida');
    expect(listarConsumosCapaCostoInventarioPorEmpresa(empresaId)).toHaveLength(1);
  });
});
