import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { instalarLocalStorageDePrueba } from '../repositories/localStorageDePrueba';
import { generarNIEnInventario, anularNIEnInventario } from './notaIngreso.service';
import { obtenerEstadoVersionInventario } from '../repositories/estadoVersionInventario.repository';
import { CLAVE_COLECCION_OPERACIONES_IDEMPOTENTES } from '../repositories/operacionIdempotenteInventario.repository';
import { STORAGE_KEY_MOVEMENTS } from '../repositories/stock.repository';
import { PRODUCT_STORAGE_KEY } from '../../catalogo-articulos/utils/catalogStorage';
import type { NotaIngreso, LineaNotaIngreso } from '../models/notaIngreso.types';
import type { Product } from '../../catalogo-articulos/models/types';
import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';
import type { OperacionIdempotenteInventario } from '../models/operacionIdempotenteInventario.types';
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
  return '2026-08-01T00:00:00.000Z';
}
const dependencias = { generarId, fechaActual };

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

function crearLinea(overrides: Partial<LineaNotaIngreso> = {}): LineaNotaIngreso {
  return {
    id: 'linea-1',
    productoId: 'prod-1',
    productoCodigo: 'P001',
    productoNombre: 'Producto 1',
    tipoBienServicio: 'bien',
    unidad: 'NIU',
    unidadCodigo: 'NIU',
    cantidad: 10,
    costoUnitario: 5,
    subtotal: 50,
    igv: 9,
    total: 59,
    ...overrides,
  };
}

function crearNota(overrides: Partial<NotaIngreso> = {}): NotaIngreso {
  return {
    id: 'ni-1',
    tipoDocumento: 'nota_ingreso',
    serie: 'NI01',
    estado: 'Borrador',
    esBorrador: true,
    fechaDocumento: '2026-01-01',
    fechaIngresoAlmacen: '2026-01-01',
    tipoIngreso: '02',
    almacenDestinoId: 'alm-1',
    almacenDestinoNombre: 'Almacén Principal',
    almacenDestinoCodigo: 'ALM01',
    moneda: 'PEN',
    lineas: [crearLinea()],
    baseImponible: 50,
    descuentos: 0,
    isc: 0,
    impuesto: 9,
    noGravados: 0,
    otc: 0,
    total: 59,
    usuario: 'user-1',
    fechaCreacion: '2026-01-01T00:00:00.000Z',
    fechaActualizacion: '2026-01-01T00:00:00.000Z',
    historial: [],
    ...overrides,
  };
}

const EMPRESA = 'emp-A';

function sembrarProductos(productos: Product[]): void {
  localStorage.setItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA), JSON.stringify(productos));
}

describe('notaIngreso.service — generarNIEnInventario', () => {
  it('NI de una línea: genera correctamente, incrementa el stock y marca la nota como Generada', async () => {
    const producto = crearProducto({ stockPorAlmacen: { 'alm-1': 5 } });
    const productsMap = new Map([[producto.id, producto]]);
    sembrarProductos([producto]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const nota = crearNota();

    const resultado = await generarNIEnInventario(nota, [nota], productsMap, almacenesMap, 'user-1', EMPRESA, dependencias);

    expect(resultado.notaActualizada.estado).toBe('Generada');
    expect(resultado.movimientos).toHaveLength(1);
    expect(resultado.productosActualizados[0].stockPorAlmacen?.['alm-1']).toBe(15);
    expect(obtenerEstadoVersionInventario(EMPRESA)?.versionInventario).toBe(1);
  });

  it('NI multilínea (productos distintos): cada línea genera su propio movimiento, una sola operación/transacción', async () => {
    const productoA = crearProducto({ id: 'prod-A', stockPorAlmacen: { 'alm-1': 0 } });
    const productoB = crearProducto({ id: 'prod-B', codigo: 'P002', stockPorAlmacen: { 'alm-1': 0 } });
    const productsMap = new Map([[productoA.id, productoA], [productoB.id, productoB]]);
    sembrarProductos([productoA, productoB]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const nota = crearNota({
      lineas: [
        crearLinea({ id: 'linea-A', productoId: 'prod-A', cantidad: 3 }),
        crearLinea({ id: 'linea-B', productoId: 'prod-B', cantidad: 4 }),
      ],
    });

    const resultado = await generarNIEnInventario(nota, [nota], productsMap, almacenesMap, 'user-1', EMPRESA, dependencias);

    expect(resultado.movimientos).toHaveLength(2);
    expect(resultado.productosActualizados).toHaveLength(2);
    expect(obtenerEstadoVersionInventario(EMPRESA)?.versionInventario).toBe(1);
  });

  it('línea de servicio no genera movimiento ni stock', async () => {
    const producto = crearProducto({ stockPorAlmacen: { 'alm-1': 5 } });
    const productsMap = new Map([[producto.id, producto]]);
    sembrarProductos([producto]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const nota = crearNota({
      lineas: [
        crearLinea({ id: 'linea-1', productoId: 'prod-1', cantidad: 10 }),
        crearLinea({ id: 'linea-2', productoId: 'prod-servicio', tipoBienServicio: 'servicio', cantidad: 1 }),
      ],
    });

    const resultado = await generarNIEnInventario(nota, [nota], productsMap, almacenesMap, 'user-1', EMPRESA, dependencias);

    expect(resultado.movimientos).toHaveLength(1);
    expect(resultado.movimientos[0].lineaOrigenId).toBe('linea-1');
  });

  it('un producto con tipoExistencia "SERVICIOS" no genera movimiento aunque la línea NO esté marcada tipoBienServicio="servicio"', async () => {
    const productoBien = crearProducto({ id: 'prod-bien', stockPorAlmacen: { 'alm-1': 5 } });
    const productoServicio = crearProducto({ id: 'prod-servicio-real', tipoExistencia: 'SERVICIOS', stockPorAlmacen: { 'alm-1': 0 } });
    const productsMap = new Map([[productoBien.id, productoBien], [productoServicio.id, productoServicio]]);
    sembrarProductos([productoBien, productoServicio]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const nota = crearNota({
      lineas: [
        crearLinea({ id: 'linea-1', productoId: 'prod-bien', cantidad: 10 }),
        crearLinea({ id: 'linea-2', productoId: 'prod-servicio-real', tipoBienServicio: 'bien', cantidad: 1 }),
      ],
    });

    const resultado = await generarNIEnInventario(nota, [nota], productsMap, almacenesMap, 'user-1', EMPRESA, dependencias);

    expect(resultado.movimientos).toHaveLength(1);
    expect(resultado.movimientos[0].lineaOrigenId).toBe('linea-1');
  });

  it('un producto con tipoExistencia "OTROS" no genera movimiento', async () => {
    const productoBien = crearProducto({ id: 'prod-bien', stockPorAlmacen: { 'alm-1': 5 } });
    const productoOtros = crearProducto({ id: 'prod-otros', tipoExistencia: 'OTROS', stockPorAlmacen: { 'alm-1': 0 } });
    const productsMap = new Map([[productoBien.id, productoBien], [productoOtros.id, productoOtros]]);
    sembrarProductos([productoBien, productoOtros]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const nota = crearNota({
      lineas: [
        crearLinea({ id: 'linea-1', productoId: 'prod-bien', cantidad: 10 }),
        crearLinea({ id: 'linea-2', productoId: 'prod-otros', tipoBienServicio: 'bien', cantidad: 1 }),
      ],
    });

    const resultado = await generarNIEnInventario(nota, [nota], productsMap, almacenesMap, 'user-1', EMPRESA, dependencias);

    expect(resultado.movimientos).toHaveLength(1);
    expect(resultado.movimientos[0].lineaOrigenId).toBe('linea-1');
  });

  it('almacén inactivo rechaza el documento completo', async () => {
    const producto = crearProducto({ stockPorAlmacen: { 'alm-1': 5 } });
    const productsMap = new Map([[producto.id, producto]]);
    const almacenesMap = new Map([['alm-1', crearAlmacen({ estaActivoAlmacen: false })]]);
    const nota = crearNota();

    await expect(
      generarNIEnInventario(nota, [nota], productsMap, almacenesMap, 'user-1', EMPRESA, dependencias)
    ).rejects.toThrow(/inactivo/);

    expect(producto.stockPorAlmacen?.['alm-1']).toBe(5);
    expect(obtenerEstadoVersionInventario(EMPRESA)).toBeUndefined();
  });

  it('dos líneas del mismo producto+almacén se suman (no se sobrescriben)', async () => {
    const producto = crearProducto({ stockPorAlmacen: { 'alm-1': 0 } });
    const productsMap = new Map([[producto.id, producto]]);
    sembrarProductos([producto]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const nota = crearNota({
      lineas: [
        crearLinea({ id: 'linea-1', cantidad: 4 }),
        crearLinea({ id: 'linea-2', cantidad: 6 }),
      ],
    });

    const resultado = await generarNIEnInventario(nota, [nota], productsMap, almacenesMap, 'user-1', EMPRESA, dependencias);

    expect(resultado.movimientos).toHaveLength(2);
    expect(resultado.productosActualizados[0].stockPorAlmacen?.['alm-1']).toBe(10);
  });

  it('almacenes distintos por línea no se mezclan', async () => {
    const producto = crearProducto({ stockPorAlmacen: { 'alm-1': 0, 'alm-2': 0 } });
    const productsMap = new Map([[producto.id, producto]]);
    sembrarProductos([producto]);
    const almacenesMap = new Map([
      ['alm-1', crearAlmacen({ id: 'alm-1' })],
      ['alm-2', crearAlmacen({ id: 'alm-2', codigoAlmacen: 'ALM02', nombreAlmacen: 'Sucursal' })],
    ]);
    const nota = crearNota({
      lineas: [
        crearLinea({ id: 'linea-1', almacenId: 'alm-1', cantidad: 3 }),
        crearLinea({ id: 'linea-2', almacenId: 'alm-2', cantidad: 9 }),
      ],
    });

    const resultado = await generarNIEnInventario(nota, [nota], productsMap, almacenesMap, 'user-1', EMPRESA, dependencias);

    expect(resultado.productosActualizados[0].stockPorAlmacen?.['alm-1']).toBe(3);
    expect(resultado.productosActualizados[0].stockPorAlmacen?.['alm-2']).toBe(9);
  });

  it('no crea capas ni consumos de costo (Etapa 1C es puramente cuantitativa)', async () => {
    const producto = crearProducto({ stockPorAlmacen: { 'alm-1': 5 } });
    const productsMap = new Map([[producto.id, producto]]);
    sembrarProductos([producto]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const nota = crearNota();

    await generarNIEnInventario(nota, [nota], productsMap, almacenesMap, 'user-1', EMPRESA, dependencias);

    expect(localStorage.getItem(lsKey('facturafacil_capas_costo_inventario', EMPRESA))).toBeNull();
    expect(localStorage.getItem(lsKey('facturafacil_consumos_capas_inventario', EMPRESA))).toBeNull();
  });

  it('reintento con la misma NI (mismo id, mismas líneas) tras una recuperación no duplica el stock', async () => {
    const producto = crearProducto({ stockPorAlmacen: { 'alm-1': 5 } });
    const productsMap = new Map([[producto.id, producto]]);
    sembrarProductos([producto]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const nota = crearNota();

    const primero = await generarNIEnInventario(nota, [nota], productsMap, almacenesMap, 'user-1', EMPRESA, dependencias);
    // Simula un reintento con el mismo documento (p. ej. el usuario reenvía tras una recarga) —
    // la nota "productsMap" original ya refleja el stock actualizado por el primer intento.
    const segundo = await generarNIEnInventario(nota, [nota], productsMap, almacenesMap, 'user-1', EMPRESA, dependencias);

    expect(segundo.movimientos).toEqual([]);
    const productosFinales = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA)) as string) as Product[];
    expect(productosFinales[0].stockPorAlmacen['alm-1']).toBe(15);
    expect(primero.movimientos).toHaveLength(1);
  });
});

describe('notaIngreso.service — anularNIEnInventario', () => {
  async function generarYObtenerEstado() {
    const producto = crearProducto({ stockPorAlmacen: { 'alm-1': 5 } });
    const productsMap = new Map([[producto.id, producto]]);
    sembrarProductos([producto]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const nota = crearNota();
    const generada = await generarNIEnInventario(nota, [nota], productsMap, almacenesMap, 'user-1', EMPRESA, dependencias);
    return { notaGenerada: generada.notaActualizada, productsMap, almacenesMap };
  }

  it('anulación completa: revierte el stock y marca la nota como Anulada', async () => {
    const { notaGenerada, productsMap, almacenesMap } = await generarYObtenerEstado();

    const resultado = await anularNIEnInventario(notaGenerada, productsMap, almacenesMap, 'Motivo de prueba', 'user-1', EMPRESA, dependencias);

    expect(resultado.notaActualizada.estado).toBe('Anulada');
    expect(resultado.movimientos).toHaveLength(1);
    expect(resultado.movimientos[0].tipo).toBe('AJUSTE_NEGATIVO');
    expect(resultado.productosActualizados[0].stockPorAlmacen?.['alm-1']).toBe(5);
  });

  it('doble anulación (doble clic: dos llamadas con el mismo estado local, todavía no refrescado) no duplica la reversión', async () => {
    const { notaGenerada, productsMap, almacenesMap } = await generarYObtenerEstado();
    // Simula que el estado local del llamador (productsMap) todavía no se refrescó entre los dos
    // clics — ambas llamadas ven el mismo stock "antes de anular" (15), tal como ocurriría en la UI.
    const productsMapClicDos = new Map(productsMap);

    const primera = await anularNIEnInventario(notaGenerada, productsMap, almacenesMap, 'Motivo', 'user-1', EMPRESA, dependencias);
    const segunda = await anularNIEnInventario(notaGenerada, productsMapClicDos, almacenesMap, 'Motivo', 'user-1', EMPRESA, dependencias);

    expect(primera.movimientos).toHaveLength(1);
    expect(segunda.movimientos).toEqual([]);
    const productosFinales = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA)) as string) as Product[];
    expect(productosFinales[0].stockPorAlmacen['alm-1']).toBe(5);
  });

  it('producto MERCADERIAS al generar, reclasificado a OTROS antes de anular: revierte exactamente lo que ingresó (no vuelve a decidir por tipoExistencia actual)', async () => {
    const producto = crearProducto({ tipoExistencia: 'MERCADERIAS', stockPorAlmacen: { 'alm-1': 5 } });
    const productsMap = new Map([[producto.id, producto]]);
    sembrarProductos([producto]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const nota = crearNota();

    const generada = await generarNIEnInventario(nota, [nota], productsMap, almacenesMap, 'user-1', EMPRESA, dependencias);
    expect(generada.movimientos).toHaveLength(1); // stock quedó en 15

    // Reclasificación posterior del producto (ya no es MERCADERIAS) — no debe impedir la reversión.
    const productoReclasificado = crearProducto({ tipoExistencia: 'OTROS', stockPorAlmacen: { 'alm-1': 15 } });
    productsMap.set(producto.id, productoReclasificado);
    const productosStorage = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA)) as string) as Product[];
    localStorage.setItem(
      lsKey(PRODUCT_STORAGE_KEY, EMPRESA),
      JSON.stringify(productosStorage.map((p) => (p.id === producto.id ? { ...p, tipoExistencia: 'OTROS' } : p)))
    );

    const resultado = await anularNIEnInventario(generada.notaActualizada, productsMap, almacenesMap, 'Motivo', 'user-1', EMPRESA, dependencias);

    expect(resultado.movimientos).toHaveLength(1);
    expect(resultado.productosActualizados[0].stockPorAlmacen?.['alm-1']).toBe(5);
  });

  it('producto OTROS (no inventariable) al generar, luego reclasificado a MERCADERIAS: la anulación no descuenta nada porque nunca ingresó', async () => {
    const producto = crearProducto({ tipoExistencia: 'OTROS', stockPorAlmacen: { 'alm-1': 5 } });
    const productsMap = new Map([[producto.id, producto]]);
    sembrarProductos([producto]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const nota = crearNota();

    const generada = await generarNIEnInventario(nota, [nota], productsMap, almacenesMap, 'user-1', EMPRESA, dependencias);
    expect(generada.movimientos).toEqual([]); // OTROS no es inventariable: no generó movimiento
    expect(producto.stockPorAlmacen?.['alm-1']).toBe(5);

    // Reclasificación posterior a MERCADERIAS — no debe crear una reversión de algo que nunca ingresó.
    const productoReclasificado = crearProducto({ tipoExistencia: 'MERCADERIAS', stockPorAlmacen: { 'alm-1': 5 } });
    productsMap.set(producto.id, productoReclasificado);

    const resultado = await anularNIEnInventario(generada.notaActualizada, productsMap, almacenesMap, 'Motivo', 'user-1', EMPRESA, dependencias);

    expect(resultado.movimientos).toEqual([]);
    const productosFinales = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA)) as string) as Product[];
    expect(productosFinales[0].stockPorAlmacen['alm-1']).toBe(5);
  });

  it('un cambio posterior de almacén o cantidad en nota.lineas no altera lo que realmente se revierte (se usa el movimiento original, no la línea actual)', async () => {
    const producto = crearProducto({ stockPorAlmacen: { 'alm-1': 5, 'alm-2': 0 } });
    const productsMap = new Map([[producto.id, producto]]);
    sembrarProductos([producto]);
    const almacenesMap = new Map([
      ['alm-1', crearAlmacen({ id: 'alm-1' })],
      ['alm-2', crearAlmacen({ id: 'alm-2', codigoAlmacen: 'ALM02', nombreAlmacen: 'Sucursal' })],
    ]);
    const nota = crearNota({ lineas: [crearLinea({ almacenId: 'alm-1', cantidad: 10 })] });

    const generada = await generarNIEnInventario(nota, [nota], productsMap, almacenesMap, 'user-1', EMPRESA, dependencias);
    expect(generada.movimientos[0].almacenId).toBe('alm-1');
    expect(generada.movimientos[0].cantidad).toBe(10);

    // La nota "actual" fue editada después de generar (almacén y cantidad distintos) — la
    // anulación NUNCA debe leer esto; debe revertir el movimiento original (alm-1, 10).
    const notaMutada: NotaIngreso = {
      ...generada.notaActualizada,
      lineas: [{ ...generada.notaActualizada.lineas[0], almacenId: 'alm-2', cantidad: 999 }],
    };

    const resultado = await anularNIEnInventario(notaMutada, productsMap, almacenesMap, 'Motivo', 'user-1', EMPRESA, dependencias);

    expect(resultado.movimientos).toHaveLength(1);
    expect(resultado.movimientos[0].almacenId).toBe('alm-1');
    expect(resultado.movimientos[0].cantidad).toBe(10);
    expect(resultado.productosActualizados[0].stockPorAlmacen?.['alm-1']).toBe(5);
    expect(resultado.productosActualizados[0].stockPorAlmacen?.['alm-2']).toBe(0);
  });

  it('movimientos originales incompletos (un resultadoId de la operación de generación no existe) rechazan toda la anulación', async () => {
    const { notaGenerada, productsMap, almacenesMap } = await generarYObtenerEstado();

    // Corrompe el ledger: la operación de generación referencia un resultadoId que no existe en
    // la colección de movimientos.
    const claveOperaciones = lsKey(CLAVE_COLECCION_OPERACIONES_IDEMPOTENTES, EMPRESA);
    const operaciones = JSON.parse(localStorage.getItem(claveOperaciones) as string) as OperacionIdempotenteInventario[];
    const operacionesCorruptas = operaciones.map((op) =>
      op.clave === `nota_ingreso:generar:${notaGenerada.id}` ? { ...op, resultadoIds: [...op.resultadoIds, 'mov-fantasma'] } : op
    );
    localStorage.setItem(claveOperaciones, JSON.stringify(operacionesCorruptas));

    await expect(
      anularNIEnInventario(notaGenerada, productsMap, almacenesMap, 'Motivo', 'user-1', EMPRESA, dependencias)
    ).rejects.toThrow(/incompletos/);

    const productosFinales = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA)) as string) as Product[];
    expect(productosFinales[0].stockPorAlmacen['alm-1']).toBe(15);
  });

  it('movimientos originales duplicados (resultadoIds repetidos en la operación de generación) rechazan toda la anulación', async () => {
    const { notaGenerada, productsMap, almacenesMap } = await generarYObtenerEstado();

    const claveOperaciones = lsKey(CLAVE_COLECCION_OPERACIONES_IDEMPOTENTES, EMPRESA);
    const operaciones = JSON.parse(localStorage.getItem(claveOperaciones) as string) as OperacionIdempotenteInventario[];
    const operacionesCorruptas = operaciones.map((op) =>
      op.clave === `nota_ingreso:generar:${notaGenerada.id}` ? { ...op, resultadoIds: [...op.resultadoIds, ...op.resultadoIds] } : op
    );
    localStorage.setItem(claveOperaciones, JSON.stringify(operacionesCorruptas));

    await expect(
      anularNIEnInventario(notaGenerada, productsMap, almacenesMap, 'Motivo', 'user-1', EMPRESA, dependencias)
    ).rejects.toThrow(/duplicados/);

    const productosFinales = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA)) as string) as Product[];
    expect(productosFinales[0].stockPorAlmacen['alm-1']).toBe(15);
  });

  it('anulación legado (NI sin ledger de Etapa 1C, identificada por documentoReferencia) revierte el movimiento correcto', async () => {
    const producto = crearProducto({ stockPorAlmacen: { 'alm-1': 15 } });
    sembrarProductos([producto]);
    const productsMap = new Map([[producto.id, producto]]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);

    const movimientoLegado: MovimientoStock = {
      id: 'mov-legado-1',
      productoId: producto.id,
      productoCodigo: producto.codigo,
      productoNombre: producto.nombre,
      tipo: 'ENTRADA',
      motivo: 'COMPRA',
      cantidad: 10,
      cantidadAnterior: 5,
      cantidadNueva: 15,
      usuario: 'user-legado',
      documentoReferencia: 'NI01-00000001',
      fecha: new Date('2025-01-01T00:00:00.000Z'),
      almacenId: 'alm-1',
      almacenCodigo: 'ALM01',
      almacenNombre: 'Almacén Principal',
      EstablecimientoId: 'est-1',
      EstablecimientoCodigo: 'E1',
      EstablecimientoNombre: 'Establecimiento 1',
    };
    localStorage.setItem(lsKey(STORAGE_KEY_MOVEMENTS, EMPRESA), JSON.stringify([movimientoLegado]));

    const notaLegado = crearNota({ estado: 'Generada', numero: 'NI01-00000001' });

    const resultado = await anularNIEnInventario(notaLegado, productsMap, almacenesMap, 'Motivo', 'user-1', EMPRESA, dependencias);

    expect(resultado.movimientos).toHaveLength(1);
    expect(resultado.movimientos[0].cantidad).toBe(10);
    expect(resultado.productosActualizados[0].stockPorAlmacen?.['alm-1']).toBe(5);
  });

  it('falta de stock en una línea (consumido por otra operación después de generar) rechaza la anulación completa, sin modificar ningún producto', async () => {
    const productoA = crearProducto({ id: 'prod-A', stockPorAlmacen: { 'alm-1': 20 } });
    const productoB = crearProducto({ id: 'prod-B', codigo: 'P002', stockPorAlmacen: { 'alm-1': 20 } });
    const productsMap = new Map([[productoA.id, productoA], [productoB.id, productoB]]);
    sembrarProductos([productoA, productoB]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const nota = crearNota({
      lineas: [
        crearLinea({ id: 'linea-A', productoId: 'prod-A', cantidad: 10 }),
        crearLinea({ id: 'linea-B', productoId: 'prod-B', cantidad: 10 }),
      ],
    });

    const generada = await generarNIEnInventario(nota, [nota], productsMap, almacenesMap, 'user-1', EMPRESA, dependencias);

    // Simula que, después de generar la NI (stock real de prod-B en 30), otra operación
    // consumió casi todo el stock de prod-B antes del intento de anulación.
    productsMap.set('prod-B', crearProducto({ id: 'prod-B', codigo: 'P002', stockPorAlmacen: { 'alm-1': 2 } }));
    const productosStorage = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA)) as string) as Product[];
    const productosConConsumo = productosStorage.map((p) => (p.id === 'prod-B' ? { ...p, stockPorAlmacen: { 'alm-1': 2 } } : p));
    localStorage.setItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA), JSON.stringify(productosConConsumo));

    await expect(
      anularNIEnInventario(generada.notaActualizada, productsMap, almacenesMap, 'Motivo', 'user-1', EMPRESA, dependencias)
    ).rejects.toThrow(/stock actual/);

    const productosFinal = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA)) as string) as Product[];
    expect(productosFinal.find((p) => p.id === 'prod-A')?.stockPorAlmacen['alm-1']).toBe(30);
    expect(productosFinal.find((p) => p.id === 'prod-B')?.stockPorAlmacen['alm-1']).toBe(2);
  });

  it('rechaza anular una nota que no está en estado Generada', async () => {
    const productsMap = new Map<string, Product>();
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const notaBorrador = crearNota({ estado: 'Borrador' });

    await expect(
      anularNIEnInventario(notaBorrador, productsMap, almacenesMap, 'Motivo', 'user-1', EMPRESA, dependencias)
    ).rejects.toThrow(/Generada/);
  });
});
