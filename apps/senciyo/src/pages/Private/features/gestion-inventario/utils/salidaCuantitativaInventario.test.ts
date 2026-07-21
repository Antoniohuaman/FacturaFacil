import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { instalarLocalStorageDePrueba } from '../repositories/localStorageDePrueba';
import {
  calcularHashSalidaCuantitativa,
  calcularMutacionesSalida,
  prepararOperacionSalidaInventario,
  confirmarOperacionSalidaInventario,
} from './salidaCuantitativaInventario';
import { reservarOperacionIdempotente } from './idempotenciaInventario';
import { PRODUCT_STORAGE_KEY } from '../../catalogo-articulos/utils/catalogStorage';
import { STORAGE_KEY_MOVEMENTS } from '../repositories/stock.repository';
import type { DatosOperacionSalidaCuantitativa, DatosLineaOperacionCuantitativa } from '../models/operacionEntradaInventario.types';
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
