import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { instalarLocalStorageDePrueba } from '../repositories/localStorageDePrueba';
import { PRODUCT_STORAGE_KEY } from '../../catalogo-articulos/utils/catalogStorage';
import { ServicioKardexValorizado } from './servicioKardexValorizado';
import {
  prepararSalidaNS,
  reconstruirOperacionNSDesdeSnapshot,
  construirPreparacionInventarioNS,
  construirDatosOperacionSalidaNS,
  construirNotaSalidaGenerada,
  prepararAnulacionNS,
  construirNotaSalidaAnulada,
} from './notaSalida.service';
import { STORAGE_KEY_MOVEMENTS } from '../repositories/stock.repository';
import type { Product } from '../../catalogo-articulos/models/types';
import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';
import type { NotaSalida, LineaNotaSalida } from '../models/notaSalida.types';
import { lsKey } from '../../../../../shared/tenant';

instalarLocalStorageDePrueba();

const EMPRESA = 'emp-A';
const ESTABLECIMIENTO = 'est-1';
const STORAGE_KEY_DOCUMENTOS = 'documentos_comerciales_v1';

interface GlobalConEmpresaActiva {
  __FF_ACTIVE_WORKSPACE_ID?: string;
}

beforeEach(() => {
  localStorage.clear();
  (globalThis as typeof globalThis & GlobalConEmpresaActiva).__FF_ACTIVE_WORKSPACE_ID = EMPRESA;
});
afterEach(() => {
  localStorage.clear();
  delete (globalThis as typeof globalThis & GlobalConEmpresaActiva).__FF_ACTIVE_WORKSPACE_ID;
});

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
    establecimientoId: ESTABLECIMIENTO,
    estaActivoAlmacen: true,
    esAlmacenPrincipal: true,
    prioridadSalida: 1,
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

function crearLinea(overrides: Partial<LineaNotaSalida> = {}): LineaNotaSalida {
  return {
    id: 'linea-1',
    productoId: 'prod-1',
    productoCodigo: 'P001',
    productoNombre: 'Producto 1',
    tipoBienServicio: 'bien',
    unidad: 'NIU',
    unidadCodigo: 'NIU',
    cantidad: 5,
    pvUnitario: 10,
    subtotal: 50,
    igv: 9,
    total: 59,
    ...overrides,
  };
}

function crearNota(overrides: Partial<NotaSalida> = {}): NotaSalida {
  return {
    id: 'ns-1',
    tipoDocumento: 'nota_salida',
    serie: 'NS01',
    estado: 'Borrador',
    esBorrador: true,
    fechaDocumento: '2026-08-01',
    tipoSalida: '01',
    moneda: 'PEN',
    lineas: [crearLinea()],
    baseImponible: 50,
    impuesto: 9,
    total: 59,
    historial: [],
    usuario: 'user-1',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

function sembrarReservaOV(
  ovId: string,
  reservasStock: Array<{ sku: string; nombre: string; cantidad: number; almacenId?: string; establecimientoId?: string }>,
  despachado: unknown[] = [],
): void {
  const clave = lsKey(STORAGE_KEY_DOCUMENTOS, EMPRESA);
  localStorage.setItem(
    clave,
    JSON.stringify([{ id: ovId, tipo: 'orden_venta', estado: 'Reservada', reservasStock, despachado }]),
  );
}

describe('prepararSalidaNS — guards de estado', () => {
  it('rechaza una NS ya Generada', () => {
    expect(() =>
      prepararSalidaNS(crearNota({ estado: 'Generada' }), [], new Map(), new Map(), ESTABLECIMIENTO)
    ).toThrow(/ya fue generada/);
  });

  it('rechaza una NS Anulada', () => {
    expect(() =>
      prepararSalidaNS(crearNota({ estado: 'Anulada' }), [], new Map(), new Map(), ESTABLECIMIENTO)
    ).toThrow(/anulada/);
  });

  it('rechaza una NS Entregada', () => {
    expect(() =>
      prepararSalidaNS(crearNota({ estado: 'Entregada' }), [], new Map(), new Map(), ESTABLECIMIENTO)
    ).toThrow(/entregada/);
  });

  it('rechaza una NS sin líneas', () => {
    expect(() =>
      prepararSalidaNS(crearNota({ lineas: [] }), [], new Map(), new Map(), ESTABLECIMIENTO)
    ).toThrow(/al menos una línea/);
  });
});

describe('prepararSalidaNS — validación previa de stock (NS manual)', () => {
  it('rechaza cuando la cantidad solicitada excede el disponible', () => {
    const productsMap = new Map([['prod-1', crearProducto({ stockPorAlmacen: { 'alm-1': 3 } })]]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const nota = crearNota({ lineas: [crearLinea({ cantidad: 5 })] });

    expect(() => prepararSalidaNS(nota, [], productsMap, almacenesMap, ESTABLECIMIENTO)).toThrow(
      /No hay stock disponible suficiente/
    );
  });

  it('descuenta el stock reservado por otros documentos al calcular el disponible', () => {
    const productsMap = new Map([
      ['prod-1', crearProducto({ stockPorAlmacen: { 'alm-1': 10 }, stockReservadoPorAlmacen: { 'alm-1': 6 } })],
    ]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const nota = crearNota({ lineas: [crearLinea({ cantidad: 5 })] });

    expect(() => prepararSalidaNS(nota, [], productsMap, almacenesMap, ESTABLECIMIENTO)).toThrow(
      /reservadas para otros documentos/
    );
  });

  it('acepta exactamente al límite del disponible', () => {
    const productsMap = new Map([['prod-1', crearProducto({ stockPorAlmacen: { 'alm-1': 5 } })]]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const nota = crearNota({ lineas: [crearLinea({ cantidad: 5 })] });

    const resultado = prepararSalidaNS(nota, [], productsMap, almacenesMap, ESTABLECIMIENTO);
    expect(resultado.lineasOperacion).toHaveLength(1);
    expect(resultado.lineasOperacion[0].cantidadUnidadMinima).toBe(5);
  });
});

describe('prepararSalidaNS — asignación FIFO por almacén', () => {
  it('asigna toda la cantidad al almacén de mayor prioridad cuando alcanza', () => {
    const productsMap = new Map([['prod-1', crearProducto({ stockPorAlmacen: { 'alm-1': 20, 'alm-2': 20 } })]]);
    const almacenesMap = new Map([
      ['alm-1', crearAlmacen({ id: 'alm-1', prioridadSalida: 1 })],
      ['alm-2', crearAlmacen({ id: 'alm-2', prioridadSalida: 2 })],
    ]);
    const nota = crearNota({ lineas: [crearLinea({ cantidad: 5 })] });

    const resultado = prepararSalidaNS(nota, [], productsMap, almacenesMap, ESTABLECIMIENTO);
    expect(resultado.lineasOperacion).toHaveLength(1);
    expect(resultado.lineasOperacion[0].almacenId).toBe('alm-1');
    expect(resultado.lineasOperacion[0].cantidadUnidadMinima).toBe(5);
    expect(resultado.lineasExpandidas).toHaveLength(1);
  });

  it('reparte entre almacenes cuando el primero no alcanza (FIFO)', () => {
    const productsMap = new Map([['prod-1', crearProducto({ stockPorAlmacen: { 'alm-1': 3, 'alm-2': 20 } })]]);
    const almacenesMap = new Map([
      ['alm-1', crearAlmacen({ id: 'alm-1', prioridadSalida: 1 })],
      ['alm-2', crearAlmacen({ id: 'alm-2', prioridadSalida: 2 })],
    ]);
    const nota = crearNota({ lineas: [crearLinea({ cantidad: 5 })] });

    const resultado = prepararSalidaNS(nota, [], productsMap, almacenesMap, ESTABLECIMIENTO);
    expect(resultado.lineasOperacion).toHaveLength(2);
    const porAlmacen = new Map(resultado.lineasOperacion.map(op => [op.almacenId, op.cantidadUnidadMinima]));
    expect(porAlmacen.get('alm-1')).toBe(3);
    expect(porAlmacen.get('alm-2')).toBe(2);
    expect(resultado.lineasExpandidas).toHaveLength(2);
    // Los ids de línea expandida son únicos y determinísticos (linea original + almacén).
    expect(resultado.lineasExpandidas.map(l => l.id)).toEqual(['linea-1-alm-1', 'linea-1-alm-2']);
  });

  it('dos líneas del mismo producto en la misma NS consumen el stock de forma acumulativa (simulación en memoria)', () => {
    const productsMap = new Map([['prod-1', crearProducto({ stockPorAlmacen: { 'alm-1': 8 } })]]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const nota = crearNota({
      lineas: [
        crearLinea({ id: 'linea-1', cantidad: 5 }),
        crearLinea({ id: 'linea-2', cantidad: 3 }),
      ],
    });

    const resultado = prepararSalidaNS(nota, [], productsMap, almacenesMap, ESTABLECIMIENTO);
    expect(resultado.lineasOperacion).toHaveLength(2);
    expect(resultado.lineasOperacion.every(op => op.almacenId === 'alm-1')).toBe(true);
    expect(resultado.lineasOperacion.reduce((s, op) => s + op.cantidadUnidadMinima, 0)).toBe(8);

    // El catálogo real (productsMap) nunca se muta — sigue reflejando el stock original.
    expect(productsMap.get('prod-1')?.stockPorAlmacen?.['alm-1']).toBe(8);
  });
});

describe('prepararSalidaNS — clasificación inventariable (Etapa 1D, §14)', () => {
  it('una línea "bien" cuyo producto no está controlado por stock se deja sin asignación (como un servicio)', () => {
    const productsMap = new Map([['prod-1', crearProducto({ tipoExistencia: 'OTROS', stockPorAlmacen: { 'alm-1': 5 } })]]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const nota = crearNota({
      lineas: [
        crearLinea({ id: 'linea-1', productoId: 'prod-1' }),
        crearLinea({ id: 'linea-2', productoId: 'prod-2', cantidad: 2 }),
      ],
    });
    productsMap.set('prod-2', crearProducto({ id: 'prod-2', codigo: 'P002', stockPorAlmacen: { 'alm-1': 10 } }));

    const resultado = prepararSalidaNS(nota, [], productsMap, almacenesMap, ESTABLECIMIENTO);
    // Solo la línea del producto inventariable genera movimiento.
    expect(resultado.lineasOperacion).toHaveLength(1);
    expect(resultado.lineasOperacion[0].productoId).toBe('prod-2');
    // La línea del producto no inventariable queda intacta (sin expandir por almacén).
    const lineaIntacta = resultado.lineasExpandidas.find(l => l.id === 'linea-1');
    expect(lineaIntacta).toBeDefined();
    expect(lineaIntacta?.cantidad).toBe(5);
  });

  it('una NS con únicamente productos no inventariables NO es un error (comportamiento preservado de antes de Etapa 1D): lineasOperacion queda vacío, sin lanzar', () => {
    const productsMap = new Map([['prod-1', crearProducto({ tipoExistencia: 'OTROS' })]]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const nota = crearNota({ lineas: [crearLinea()] });

    const resultado = prepararSalidaNS(nota, [], productsMap, almacenesMap, ESTABLECIMIENTO);
    expect(resultado.lineasOperacion).toEqual([]);
    expect(resultado.lineasExpandidas).toHaveLength(1);
  });

  it('un producto INEXISTENTE en una línea de "bien" rechaza el documento completo (nunca se confunde con "no inventariable")', () => {
    const productsMap = new Map<string, Product>();
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const nota = crearNota({ lineas: [crearLinea({ productoId: 'prod-inexistente' })] });

    expect(() => prepararSalidaNS(nota, [], productsMap, almacenesMap, ESTABLECIMIENTO)).toThrow(
      /producto inexistente/
    );
  });

  it('no rechaza líneas de servicio explícitas (comportamiento sin cambios)', () => {
    const productsMap = new Map([['prod-1', crearProducto({ stockPorAlmacen: { 'alm-1': 5 } })]]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const nota = crearNota({
      lineas: [
        crearLinea({ id: 'linea-1', cantidad: 5 }),
        crearLinea({ id: 'linea-2', tipoBienServicio: 'servicio', productoId: 'serv-1' }),
      ],
    });

    const resultado = prepararSalidaNS(nota, [], productsMap, almacenesMap, ESTABLECIMIENTO);
    expect(resultado.lineasOperacion).toHaveLength(1);
    expect(resultado.lineasExpandidas.some(l => l.id === 'linea-2')).toBe(true);
  });
});

describe('prepararSalidaNS — liberación de reserva de Orden de Venta (§13.C)', () => {
  it('arquitectura nueva (establecimientoId): asigna liberarReservaOV a UNA sola línea aunque el despacho se reparta en varios almacenes', () => {
    sembrarReservaOV('ov-1', [{ sku: 'P001', nombre: 'Producto 1', cantidad: 5, establecimientoId: ESTABLECIMIENTO }]);
    const productsMap = new Map([['prod-1', crearProducto({ stockPorAlmacen: { 'alm-1': 3, 'alm-2': 20 } })]]);
    const almacenesMap = new Map([
      ['alm-1', crearAlmacen({ id: 'alm-1', prioridadSalida: 1 })],
      ['alm-2', crearAlmacen({ id: 'alm-2', prioridadSalida: 2 })],
    ]);
    const nota = crearNota({ ordenVentaOrigenId: 'ov-1', origen: 'OrdenVenta', lineas: [crearLinea({ cantidad: 5 })] });

    const resultado = prepararSalidaNS(nota, [], productsMap, almacenesMap, ESTABLECIMIENTO);
    expect(resultado.lineasOperacion).toHaveLength(2);
    const conLiberacion = resultado.lineasOperacion.filter(op => op.liberarReservaOV);
    expect(conLiberacion).toHaveLength(1);
    expect(conLiberacion[0].liberarReservaOV).toEqual({ establecimientoId: ESTABLECIMIENTO, cantidad: 5 });
    expect(resultado.lineasOperacion.every(op => op.liberarReservaLegacyOV === undefined)).toBe(true);
    expect(resultado.despachosOV).toEqual([{ sku: 'P001', cantidad: 5, establecimientoId: ESTABLECIMIENTO }]);
  });

  it('arquitectura legacy (almacenId): asigna liberarReservaLegacyOV en la MISMA línea (mismo plan atómico, corrección post-1D §2)', () => {
    sembrarReservaOV('ov-2', [{ sku: 'P001', nombre: 'Producto 1', cantidad: 5, almacenId: 'alm-1' }]);
    const productsMap = new Map([['prod-1', crearProducto({ stockPorAlmacen: { 'alm-1': 10 }, stockReservadoPorAlmacen: { 'alm-1': 5 } })]]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const nota = crearNota({ ordenVentaOrigenId: 'ov-2', origen: 'OrdenVenta', lineas: [crearLinea({ cantidad: 5 })] });

    const resultado = prepararSalidaNS(nota, [], productsMap, almacenesMap, ESTABLECIMIENTO);
    expect(resultado.lineasOperacion.every(op => op.liberarReservaOV === undefined)).toBe(true);
    expect(resultado.lineasOperacion).toHaveLength(1);
    expect(resultado.lineasOperacion[0].liberarReservaLegacyOV).toEqual({ cantidad: 5 });
    expect(resultado.despachosOV).toEqual([{ sku: 'P001', cantidad: 5, almacenId: 'alm-1' }]);
  });

  it('sin OV vinculada: ni liberarReservaOV ni liberarReservaLegacyOV se agregan', () => {
    const productsMap = new Map([['prod-1', crearProducto({ stockPorAlmacen: { 'alm-1': 5 } })]]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const nota = crearNota({ lineas: [crearLinea({ cantidad: 5 })] });

    const resultado = prepararSalidaNS(nota, [], productsMap, almacenesMap, ESTABLECIMIENTO);
    expect(resultado.lineasOperacion.every(op => op.liberarReservaOV === undefined)).toBe(true);
    expect(resultado.lineasOperacion.every(op => op.liberarReservaLegacyOV === undefined)).toBe(true);
    expect(resultado.despachosOV).toEqual([]);
  });
});

describe('prepararSalidaNS — liberación EXACTA de reserva OV (corrección post-1D §3): elimina Math.min como corrección silenciosa', () => {
  it('reserva 10, despacho 4 → libera EXACTAMENTE 4, dejando el resto reservado (despacho parcial legítimo)', () => {
    sembrarReservaOV('ov-t1', [{ sku: 'P001', nombre: 'Producto 1', cantidad: 10, establecimientoId: ESTABLECIMIENTO }]);
    const productsMap = new Map([['prod-1', crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const nota = crearNota({ ordenVentaOrigenId: 'ov-t1', origen: 'OrdenVenta', lineas: [crearLinea({ cantidad: 4 })] });

    const resultado = prepararSalidaNS(nota, [], productsMap, almacenesMap, ESTABLECIMIENTO);
    const conLiberacion = resultado.lineasOperacion.filter(op => op.liberarReservaOV);
    expect(conLiberacion).toHaveLength(1);
    expect(conLiberacion[0].liberarReservaOV).toEqual({ establecimientoId: ESTABLECIMIENTO, cantidad: 4 });
    expect(resultado.despachosOV).toEqual([{ sku: 'P001', cantidad: 4, establecimientoId: ESTABLECIMIENTO }]);
  });

  it('reserva 6, despacho 10 (repartido en 2 líneas) → rechaza la NS completa, sin Math.min como corrección silenciosa', () => {
    sembrarReservaOV('ov-t2', [{ sku: 'P001', nombre: 'Producto 1', cantidad: 6, establecimientoId: ESTABLECIMIENTO }]);
    const productsMap = new Map([['prod-1', crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const nota = crearNota({
      ordenVentaOrigenId: 'ov-t2',
      origen: 'OrdenVenta',
      lineas: [
        crearLinea({ id: 'linea-1', cantidad: 5 }),
        crearLinea({ id: 'linea-2', cantidad: 5 }),
      ],
    });

    // Cada línea, tomada de forma aislada, respeta la reserva (5 <= 6) — solo el TOTAL acumulado
    // (10) la excede. Esto confirma que la validación agregada de aplicarLiberacionesOV es la que
    // rechaza, no solo un chequeo por línea.
    expect(() => prepararSalidaNS(nota, [], productsMap, almacenesMap, ESTABLECIMIENTO)).toThrow(
      /excede la reserva pendiente/
    );
  });

  it('reserva inexistente para el SKU → rechaza la NS completa (nunca se omite en silencio)', () => {
    sembrarReservaOV('ov-t3', []);
    const productsMap = new Map([['prod-1', crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const nota = crearNota({ ordenVentaOrigenId: 'ov-t3', origen: 'OrdenVenta', lineas: [crearLinea({ cantidad: 5 })] });

    expect(() => prepararSalidaNS(nota, [], productsMap, almacenesMap, ESTABLECIMIENTO)).toThrow(
      /No se encontró una reserva/
    );
  });

  it('reservas del mismo SKU divididas en varios registros (arquitectura nueva) se agregan correctamente', () => {
    sembrarReservaOV('ov-t4', [
      { sku: 'P001', nombre: 'Producto 1', cantidad: 5, establecimientoId: ESTABLECIMIENTO },
      { sku: 'P001', nombre: 'Producto 1', cantidad: 5, establecimientoId: ESTABLECIMIENTO },
    ]);
    const productsMap = new Map([['prod-1', crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const nota = crearNota({ ordenVentaOrigenId: 'ov-t4', origen: 'OrdenVenta', lineas: [crearLinea({ cantidad: 8 })] });

    const resultado = prepararSalidaNS(nota, [], productsMap, almacenesMap, ESTABLECIMIENTO);
    const conLiberacion = resultado.lineasOperacion.filter(op => op.liberarReservaOV);
    expect(conLiberacion).toHaveLength(1);
    // 8 <= 10 (5+5 sumados) — ni clampeado a un solo registro (5) ni igualado al total (10).
    expect(conLiberacion[0].liberarReservaOV).toEqual({ establecimientoId: ESTABLECIMIENTO, cantidad: 8 });
  });

  it('legacy con varias líneas del mismo SKU+almacén: valida el TOTAL acumulado y libera exactamente lo despachado por cada línea', () => {
    sembrarReservaOV('ov-t5', [
      { sku: 'P001', nombre: 'Producto 1', cantidad: 4, almacenId: 'alm-1' },
      { sku: 'P001', nombre: 'Producto 1', cantidad: 4, almacenId: 'alm-1' },
    ]);
    const productsMap = new Map([
      ['prod-1', crearProducto({ stockPorAlmacen: { 'alm-1': 20 }, stockReservadoPorAlmacen: { 'alm-1': 8 } })],
    ]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const nota = crearNota({
      ordenVentaOrigenId: 'ov-t5',
      origen: 'OrdenVenta',
      lineas: [
        crearLinea({ id: 'linea-1', cantidad: 3 }),
        crearLinea({ id: 'linea-2', cantidad: 3 }),
      ],
    });

    const resultado = prepararSalidaNS(nota, [], productsMap, almacenesMap, ESTABLECIMIENTO);
    const conLiberacion = resultado.lineasOperacion.filter(op => op.liberarReservaLegacyOV);
    expect(conLiberacion).toHaveLength(2);
    // Total despachado (6) <= total reservado acumulado (4+4=8) — cada línea libera EXACTAMENTE
    // lo que despachó (3), no el total combinado.
    expect(conLiberacion.map(op => op.liberarReservaLegacyOV?.cantidad)).toEqual([3, 3]);
    expect(resultado.despachosOV.reduce((s, d) => s + d.cantidad, 0)).toBe(6);
  });

  it('legacy con varias líneas del mismo SKU+almacén: rechaza cuando el TOTAL acumulado excede la reserva, aunque cada línea aislada no la exceda', () => {
    sembrarReservaOV('ov-t5b', [{ sku: 'P001', nombre: 'Producto 1', cantidad: 4, almacenId: 'alm-1' }]);
    const productsMap = new Map([
      ['prod-1', crearProducto({ stockPorAlmacen: { 'alm-1': 20 }, stockReservadoPorAlmacen: { 'alm-1': 4 } })],
    ]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const nota = crearNota({
      ordenVentaOrigenId: 'ov-t5b',
      origen: 'OrdenVenta',
      lineas: [
        crearLinea({ id: 'linea-1', cantidad: 3 }),
        crearLinea({ id: 'linea-2', cantidad: 3 }),
      ],
    });

    // 3 <= 4 en cada línea por separado, pero 3+3=6 > 4 en total — debe rechazarse.
    expect(() => prepararSalidaNS(nota, [], productsMap, almacenesMap, ESTABLECIMIENTO)).toThrow(
      /excede la reserva pendiente/
    );
  });

  it('ningún fallo de liberación deja stock real descontado, aunque una línea previa ya haya mutado su liberación en memoria', () => {
    const productos = [
      crearProducto({ stockPorAlmacen: { 'alm-1': 20 } }),
      crearProducto({ id: 'prod-2', codigo: 'P002', nombre: 'Producto 2', stockPorAlmacen: { 'alm-1': 20 } }),
    ];
    localStorage.setItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA), JSON.stringify(productos));
    sembrarReservaOV('ov-t6', [
      { sku: 'P001', nombre: 'Producto 1', cantidad: 10, establecimientoId: ESTABLECIMIENTO },
      { sku: 'P002', nombre: 'Producto 2', cantidad: 4, establecimientoId: ESTABLECIMIENTO },
    ]);
    const productsMap = new Map([
      ['prod-1', crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })],
      ['prod-2', crearProducto({ id: 'prod-2', codigo: 'P002', nombre: 'Producto 2', stockPorAlmacen: { 'alm-1': 20 } })],
    ]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const nota = crearNota({
      ordenVentaOrigenId: 'ov-t6',
      origen: 'OrdenVenta',
      lineas: [
        // P001 se procesa primero y SÍ calza contra su reserva (10) — su liberación se mutaría en
        // memoria antes de llegar a P002.
        crearLinea({ id: 'linea-1', productoId: 'prod-1', productoCodigo: 'P001', cantidad: 5 }),
        // P002 solo tiene 4 reservados pero se despachan 3+3=6 entre dos líneas — cada línea aislada
        // (3 <= 4) pasaría la validación previa por línea; solo el total agregado lo rechaza.
        crearLinea({ id: 'linea-2', productoId: 'prod-2', productoCodigo: 'P002', productoNombre: 'Producto 2', cantidad: 3 }),
        crearLinea({ id: 'linea-3', productoId: 'prod-2', productoCodigo: 'P002', productoNombre: 'Producto 2', cantidad: 3 }),
      ],
    });

    expect(() => prepararSalidaNS(nota, [], productsMap, almacenesMap, ESTABLECIMIENTO)).toThrow(
      /excede la reserva pendiente/
    );

    // prepararSalidaNS nunca llegó a devolver un resultado ni a invocar al motor — el stock real
    // en localStorage permanece exactamente como se sembró.
    const productosFinales = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA)) as string) as Product[];
    expect(productosFinales.find(p => p.codigo === 'P001')?.stockPorAlmacen?.['alm-1']).toBe(20);
    expect(productosFinales.find(p => p.codigo === 'P002')?.stockPorAlmacen?.['alm-1']).toBe(20);
  });
});

describe('construirDatosOperacionSalidaNS', () => {
  it('ensambla documentoId/tipoOperacion/tipoDocumento/claveIdempotencia estables a partir de nota.id', () => {
    const productsMap = new Map([['prod-1', crearProducto({ stockPorAlmacen: { 'alm-1': 5 } })]]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const nota = crearNota({ id: 'ns-42', lineas: [crearLinea({ cantidad: 5 })] });
    const resultado = prepararSalidaNS(nota, [], productsMap, almacenesMap, ESTABLECIMIENTO);

    const datos = construirDatosOperacionSalidaNS({ nota, resultado, empresaId: EMPRESA, usuario: 'user-1', fecha: fechaActual() });

    expect(datos.modoOperacion).toBe('cuantitativo');
    expect(datos.documentoId).toBe('ns-42');
    expect(datos.tipoOperacion).toBe('nota_salida');
    expect(datos.tipoDocumento).toBe('nota_salida');
    expect(datos.claveIdempotencia).toBe('nota_salida:ns-42');
    expect(datos.documentoReferencia).toBe(resultado.numero);
    expect(datos.lineas).toBe(resultado.lineasOperacion);
  });
});

describe('construirNotaSalidaGenerada', () => {
  it('solo marca "Generada" con el resultado ya calculado, nunca antes de confirmar', () => {
    const productsMap = new Map([['prod-1', crearProducto({ stockPorAlmacen: { 'alm-1': 5 } })]]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const nota = crearNota({ lineas: [crearLinea({ cantidad: 5 })] });
    const resultado = prepararSalidaNS(nota, [], productsMap, almacenesMap, ESTABLECIMIENTO);

    const notaGenerada = construirNotaSalidaGenerada(nota, resultado, 'user-1', '2026-08-01T01:00:00.000Z');

    expect(notaGenerada.estado).toBe('Generada');
    expect(notaGenerada.esBorrador).toBe(false);
    expect(notaGenerada.numero).toBe(resultado.numero);
    expect(notaGenerada.lineas).toBe(resultado.lineasExpandidas);
    expect(notaGenerada.historial).toHaveLength(1);
    expect(notaGenerada.historial[0].accion).toBe('Generada');
    // El objeto de entrada nunca se muta.
    expect(nota.estado).toBe('Borrador');
  });
});

describe('Integración: prepararSalidaNS + construirDatosOperacionSalidaNS + motor de salidas (Etapa 1D)', () => {
  function sembrarProductos(productos: Product[]): void {
    localStorage.setItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA), JSON.stringify(productos));
  }

  it('descuenta el stock real en una sola confirmación', async () => {
    localStorage.setItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA), JSON.stringify([crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]));
    const productsMap = new Map([['prod-1', crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const nota = crearNota({ lineas: [crearLinea({ cantidad: 8 })] });

    const resultado = prepararSalidaNS(nota, [], productsMap, almacenesMap, ESTABLECIMIENTO);
    const datos = construirDatosOperacionSalidaNS({ nota, resultado, empresaId: EMPRESA, usuario: 'user-1', fecha: fechaActual() });

    const resultadoMotor = await ServicioKardexValorizado.registrarSalidaValorizada(datos, {
      almacenes: almacenesMap,
      generarId,
      fechaActual,
    });

    expect(resultadoMotor.estado).toBe('nueva');
    const productosFinales = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA)) as string) as Product[];
    expect(productosFinales[0].stockPorAlmacen['alm-1']).toBe(12);
  });

  it('un reintento con el mismo documentoId (nota.id) no descuenta el stock dos veces', async () => {
    localStorage.setItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA), JSON.stringify([crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]));
    const productsMap = new Map([['prod-1', crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const nota = crearNota({ id: 'ns-retry', lineas: [crearLinea({ cantidad: 8 })] });

    const resultado = prepararSalidaNS(nota, [], productsMap, almacenesMap, ESTABLECIMIENTO);
    const datos = construirDatosOperacionSalidaNS({ nota, resultado, empresaId: EMPRESA, usuario: 'user-1', fecha: fechaActual() });

    const primero = await ServicioKardexValorizado.registrarSalidaValorizada(datos, { almacenes: almacenesMap, generarId, fechaActual });
    const segundo = await ServicioKardexValorizado.registrarSalidaValorizada(datos, { almacenes: almacenesMap, generarId, fechaActual });

    expect(primero.estado).toBe('nueva');
    expect(segundo.estado).toBe('repetida');
    const productosFinales = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA)) as string) as Product[];
    expect(productosFinales[0].stockPorAlmacen['alm-1']).toBe(12);
  });

  it('libera la reserva OV (arquitectura nueva) en la MISMA escritura que el descuento de stock', async () => {
    sembrarReservaOV('ov-3', [{ sku: 'P001', nombre: 'Producto 1', cantidad: 5, establecimientoId: ESTABLECIMIENTO }]);
    sembrarProductos([
      crearProducto({ stockPorAlmacen: { 'alm-1': 20 }, stockReservadoOVPorEstablecimiento: { [ESTABLECIMIENTO]: 5 } }),
    ]);
    const productsMap = new Map([
      ['prod-1', crearProducto({ stockPorAlmacen: { 'alm-1': 20 }, stockReservadoOVPorEstablecimiento: { [ESTABLECIMIENTO]: 5 } })],
    ]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const nota = crearNota({ ordenVentaOrigenId: 'ov-3', origen: 'OrdenVenta', lineas: [crearLinea({ cantidad: 5 })] });

    const resultado = prepararSalidaNS(nota, [], productsMap, almacenesMap, ESTABLECIMIENTO);
    const datos = construirDatosOperacionSalidaNS({ nota, resultado, empresaId: EMPRESA, usuario: 'user-1', fecha: fechaActual() });

    await ServicioKardexValorizado.registrarSalidaValorizada(datos, { almacenes: almacenesMap, generarId, fechaActual });

    const productosFinales = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA)) as string) as Product[];
    expect(productosFinales[0].stockPorAlmacen['alm-1']).toBe(15);
    expect(productosFinales[0].stockReservadoOVPorEstablecimiento?.[ESTABLECIMIENTO]).toBe(0);
  });

  it('rechaza la operación completa si una línea dejaría el stock en negativo (defensa del motor tras la reserva)', async () => {
    sembrarProductos([crearProducto({ stockPorAlmacen: { 'alm-1': 3 } })]);
    const productsMap = new Map([['prod-1', crearProducto({ stockPorAlmacen: { 'alm-1': 3 } })]]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    // Construimos manualmente una operación con una cantidad que ya no calza contra el stock real
    // (simula que el stock cambió entre la validación previa y la confirmación).
    const nota = crearNota({ lineas: [crearLinea({ cantidad: 3 })] });
    const resultado = prepararSalidaNS(nota, [], productsMap, almacenesMap, ESTABLECIMIENTO);
    const datos = construirDatosOperacionSalidaNS({ nota, resultado, empresaId: EMPRESA, usuario: 'user-1', fecha: fechaActual() });
    datos.lineas[0].cantidadUnidadMinima = 999;

    await expect(
      ServicioKardexValorizado.registrarSalidaValorizada(datos, { almacenes: almacenesMap, generarId, fechaActual })
    ).rejects.toThrow(/negativo/);

    const productosFinales = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA)) as string) as Product[];
    expect(productosFinales[0].stockPorAlmacen['alm-1']).toBe(3);
  });
});

describe('Corrección post-1D §2: reintento de NS desde snapshot INMUTABLE (nunca recalcula FIFO/clasificación)', () => {
  function sembrarProductos(productos: Product[]): void {
    localStorage.setItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA), JSON.stringify(productos));
  }

  /** Prepara una NS (intento 1) y devuelve la nota con identidad + snapshot ya persistidos, tal como hace `useNotasSalida.ts::generarNS`. */
  function prepararIntento1(nota: NotaSalida, productsMap: Map<string, Product>, almacenesMap: Map<string, Almacen>) {
    const resultado = prepararSalidaNS(nota, [], productsMap, almacenesMap, ESTABLECIMIENTO);
    const notaConSnapshot: NotaSalida = {
      ...nota,
      correlativo: resultado.correlativo,
      numero: resultado.numero,
      lineas: resultado.lineasExpandidas,
      preparacionInventario: construirPreparacionInventarioNS(resultado),
    };
    return { resultado, notaConSnapshot };
  }

  it('el producto cambia de MERCADERIAS a OTROS entre la preparación y el reintento: el snapshot se reutiliza igual, sin volver a consultar esProductoInventariable', async () => {
    sembrarProductos([crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const nota = crearNota({ id: 'ns-snap-1', lineas: [crearLinea({ cantidad: 5 })] });
    const productsMap1 = new Map([['prod-1', crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]]);

    const { resultado: resultado1, notaConSnapshot } = prepararIntento1(nota, productsMap1, almacenesMap);
    expect(resultado1.lineasOperacion).toHaveLength(1);

    // El producto ya no es inventariable — si se recalculara, la línea se excluiría.
    const productsMap2 = new Map([['prod-1', crearProducto({ stockPorAlmacen: { 'alm-1': 20 }, tipoExistencia: 'OTROS' })]]);
    const resultado2 = reconstruirOperacionNSDesdeSnapshot(notaConSnapshot);
    expect(resultado2.lineasOperacion).toEqual(resultado1.lineasOperacion);
    void productsMap2; // nunca se usa — el snapshot no depende del catálogo vigente
  });

  it('el producto desaparece del catálogo entre la preparación y el reintento: el snapshot se reutiliza igual', () => {
    sembrarProductos([crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const nota = crearNota({ id: 'ns-snap-2', lineas: [crearLinea({ cantidad: 5 })] });
    const productsMap1 = new Map([['prod-1', crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]]);

    const { resultado: resultado1, notaConSnapshot } = prepararIntento1(nota, productsMap1, almacenesMap);

    // Catálogo vacío — el producto "desapareció". reconstruirOperacionNSDesdeSnapshot ni siquiera
    // recibe productsMap: es estructuralmente imposible que dependa de él.
    const resultado2 = reconstruirOperacionNSDesdeSnapshot(notaConSnapshot);
    expect(resultado2.lineasOperacion).toEqual(resultado1.lineasOperacion);
  });

  it('cambia el almacén/stock actual entre la preparación y el reintento: el snapshot conserva la asignación original exacta', async () => {
    sembrarProductos([crearProducto({ stockPorAlmacen: { 'alm-1': 3, 'alm-2': 20 } })]);
    const almacenesMap = new Map([
      ['alm-1', crearAlmacen({ id: 'alm-1', prioridadSalida: 1 })],
      ['alm-2', crearAlmacen({ id: 'alm-2', prioridadSalida: 2 })],
    ]);
    const nota = crearNota({ id: 'ns-snap-3', lineas: [crearLinea({ cantidad: 5 })] });
    const productsMap1 = new Map([['prod-1', crearProducto({ stockPorAlmacen: { 'alm-1': 3, 'alm-2': 20 } })]]);

    const { resultado: resultado1, notaConSnapshot } = prepararIntento1(nota, productsMap1, almacenesMap);
    const datos1 = construirDatosOperacionSalidaNS({ nota: notaConSnapshot, resultado: resultado1, empresaId: EMPRESA, usuario: 'user-1', fecha: fechaActual() });
    const motor1 = await ServicioKardexValorizado.registrarSalidaValorizada(datos1, { almacenes: almacenesMap, generarId, fechaActual });
    expect(motor1.estado).toBe('nueva');

    const productosTrasIntento1 = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA)) as string) as Product[];
    expect(productosTrasIntento1[0].stockPorAlmacen['alm-1']).toBe(0);
    expect(productosTrasIntento1[0].stockPorAlmacen['alm-2']).toBe(18);

    // Reintento: el stock YA cambió (alm-1 pasó de 3 a 0). Recalcular FIFO aquí produciría una
    // asignación distinta o insuficiente — el snapshot es la única fuente de verdad.
    const resultado2 = reconstruirOperacionNSDesdeSnapshot(notaConSnapshot);
    expect(resultado2.lineasOperacion).toEqual(resultado1.lineasOperacion);

    const datos2 = construirDatosOperacionSalidaNS({ nota: notaConSnapshot, resultado: resultado2, empresaId: EMPRESA, usuario: 'user-1', fecha: fechaActual() });
    const motor2 = await ServicioKardexValorizado.registrarSalidaValorizada(datos2, { almacenes: almacenesMap, generarId, fechaActual });

    expect(motor2.estado).toBe('repetida');
    const productosTrasIntento2 = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA)) as string) as Product[];
    expect(productosTrasIntento2[0].stockPorAlmacen['alm-1']).toBe(0);
    expect(productosTrasIntento2[0].stockPorAlmacen['alm-2']).toBe(18);
  });

  it('se altera una línea de nota.lineas (cantidad distinta) entre la preparación y el reintento: el snapshot ignora la alteración', () => {
    sembrarProductos([crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const nota = crearNota({ id: 'ns-snap-4', lineas: [crearLinea({ cantidad: 5 })] });
    const productsMap1 = new Map([['prod-1', crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]]);

    const { resultado: resultado1, notaConSnapshot } = prepararIntento1(nota, productsMap1, almacenesMap);

    // Alguien alteró la línea persistida (p. ej. un bug en otra ruta) — el snapshot de
    // `lineasOperacion` sigue siendo el que se calculó en la preparación original.
    const notaAlterada: NotaSalida = {
      ...notaConSnapshot,
      lineas: notaConSnapshot.lineas.map((l) => ({ ...l, cantidad: 999 })),
    };

    const resultado2 = reconstruirOperacionNSDesdeSnapshot(notaAlterada);
    expect(resultado2.lineasOperacion).toEqual(resultado1.lineasOperacion);
  });

  it('el snapshot ausente rechaza el reintento', () => {
    const nota = crearNota({ id: 'ns-snap-5', numero: 'NS01-00000001', correlativo: '00000001' });
    expect(() => reconstruirOperacionNSDesdeSnapshot(nota)).toThrow(/no tiene un snapshot/);
  });

  it('el snapshot incompleto (lineasOperacion no es arreglo) rechaza el reintento', () => {
    const nota = crearNota({
      id: 'ns-snap-6',
      numero: 'NS01-00000001',
      correlativo: '00000001',
      // @ts-expect-error — snapshot corrupto deliberado, sin cast, para probar el rechazo en tiempo de ejecución.
      preparacionInventario: { lineasOperacion: 'no-es-un-arreglo', despachosOV: [], sinMovimientoInventario: false },
    });
    expect(() => reconstruirOperacionNSDesdeSnapshot(nota)).toThrow(/incompleto o corrupto/);
  });

  it('el snapshot con sinMovimientoInventario inconsistente con lineasOperacion rechaza el reintento', () => {
    const nota = crearNota({
      id: 'ns-snap-7',
      numero: 'NS01-00000001',
      correlativo: '00000001',
      preparacionInventario: {
        lineasOperacion: [{ lineaId: 'l1', productoId: 'p1', almacenId: 'alm-1', cantidadUnidadMinima: 5 }],
        despachosOV: [],
        sinMovimientoInventario: true, // inconsistente: hay una línea pero dice que no hay movimiento
      },
    });
    expect(() => reconstruirOperacionNSDesdeSnapshot(nota)).toThrow(/inconsistente/);
  });

  it('el snapshot con una línea de operación inválida (cantidad <= 0) rechaza el reintento', () => {
    const nota = crearNota({
      id: 'ns-snap-8',
      numero: 'NS01-00000001',
      correlativo: '00000001',
      preparacionInventario: {
        lineasOperacion: [{ lineaId: 'l1', productoId: 'p1', almacenId: 'alm-1', cantidadUnidadMinima: 0 }],
        despachosOV: [],
        sinMovimientoInventario: false,
      },
    });
    expect(() => reconstruirOperacionNSDesdeSnapshot(nota)).toThrow(/línea de operación inválida/);
  });

  it('el snapshot con lineaId duplicados rechaza el reintento', () => {
    const nota = crearNota({
      id: 'ns-snap-9',
      numero: 'NS01-00000001',
      correlativo: '00000001',
      preparacionInventario: {
        lineasOperacion: [
          { lineaId: 'l1', productoId: 'p1', almacenId: 'alm-1', cantidadUnidadMinima: 5 },
          { lineaId: 'l1', productoId: 'p2', almacenId: 'alm-1', cantidadUnidadMinima: 3 },
        ],
        despachosOV: [],
        sinMovimientoInventario: false,
      },
    });
    expect(() => reconstruirOperacionNSDesdeSnapshot(nota)).toThrow(/duplicada/);
  });

  it('una NS cuya primera preparación no produjo movimientos (solo no inventariables) persiste sinMovimientoInventario=true explícitamente, y el reintento lo reutiliza sin volver a consultar el catálogo', () => {
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const nota = crearNota({ id: 'ns-snap-10', lineas: [crearLinea({ productoId: 'prod-otros' })] });
    const productsMap1 = new Map([['prod-otros', crearProducto({ id: 'prod-otros', tipoExistencia: 'OTROS' })]]);

    const { resultado: resultado1, notaConSnapshot } = prepararIntento1(nota, productsMap1, almacenesMap);
    expect(resultado1.lineasOperacion).toEqual([]);
    expect(notaConSnapshot.preparacionInventario?.sinMovimientoInventario).toBe(true);

    // Reintento: aunque el catálogo ahora tuviera el producto como inventariable, el snapshot ya
    // persistido (sinMovimientoInventario: true) es la única fuente de verdad — nunca se vuelve a
    // inferir desde el catálogo actual.
    const resultado2 = reconstruirOperacionNSDesdeSnapshot(notaConSnapshot);
    expect(resultado2.lineasOperacion).toEqual([]);
  });

  it('el primer intento ya confirmó inventario: el reintento reconstruye desde el snapshot y el motor devuelve repetida sin volver a liberar la reserva', async () => {
    sembrarReservaOV('ov-snap', [{ sku: 'P001', nombre: 'Producto 1', cantidad: 5, establecimientoId: ESTABLECIMIENTO }]);
    sembrarProductos([crearProducto({ stockPorAlmacen: { 'alm-1': 20 }, stockReservadoOVPorEstablecimiento: { [ESTABLECIMIENTO]: 5 } })]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const nota = crearNota({ id: 'ns-snap-11', ordenVentaOrigenId: 'ov-snap', origen: 'OrdenVenta', lineas: [crearLinea({ cantidad: 5 })] });
    const productsMap1 = new Map([['prod-1', crearProducto({ stockPorAlmacen: { 'alm-1': 20 }, stockReservadoOVPorEstablecimiento: { [ESTABLECIMIENTO]: 5 } })]]);

    const { resultado: resultado1, notaConSnapshot } = prepararIntento1(nota, productsMap1, almacenesMap);
    const datos1 = construirDatosOperacionSalidaNS({ nota: notaConSnapshot, resultado: resultado1, empresaId: EMPRESA, usuario: 'user-1', fecha: fechaActual() });
    await ServicioKardexValorizado.registrarSalidaValorizada(datos1, { almacenes: almacenesMap, generarId, fechaActual });

    const productosTrasIntento1 = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA)) as string) as Product[];
    expect(productosTrasIntento1[0].stockReservadoOVPorEstablecimiento?.[ESTABLECIMIENTO]).toBe(0);

    const resultado2 = reconstruirOperacionNSDesdeSnapshot(notaConSnapshot);
    const datos2 = construirDatosOperacionSalidaNS({ nota: notaConSnapshot, resultado: resultado2, empresaId: EMPRESA, usuario: 'user-1', fecha: fechaActual() });
    const motor2 = await ServicioKardexValorizado.registrarSalidaValorizada(datos2, { almacenes: almacenesMap, generarId, fechaActual });

    expect(motor2.estado).toBe('repetida');
    const productosFinales = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA)) as string) as Product[];
    expect(productosFinales[0].stockReservadoOVPorEstablecimiento?.[ESTABLECIMIENTO]).toBe(0);
  });
});

describe('prepararAnulacionNS — Etapa 1E: anulación usando los movimientos originales como fuente de verdad', () => {
  it('localiza los movimientos originales de la NS y los revierte vía el motor genérico, restaurando el stock exacto', async () => {
    localStorage.setItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA), JSON.stringify([crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]));
    const productsMap = new Map([['prod-1', crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const nota = crearNota({ id: 'ns-anular-1', lineas: [crearLinea({ cantidad: 8 })] });

    const resultado = prepararSalidaNS(nota, [], productsMap, almacenesMap, ESTABLECIMIENTO);
    const datos = construirDatosOperacionSalidaNS({ nota, resultado, empresaId: EMPRESA, usuario: 'user-1', fecha: fechaActual() });
    await ServicioKardexValorizado.registrarSalidaValorizada(datos, { almacenes: almacenesMap, generarId, fechaActual });

    const notaGenerada = construirNotaSalidaGenerada(nota, resultado, 'user-1', fechaActual());

    const movimientosRaw = localStorage.getItem(lsKey(STORAGE_KEY_MOVEMENTS, EMPRESA));
    const { datosAnulacion } = prepararAnulacionNS(notaGenerada, EMPRESA, movimientosRaw, 'Error de digitación', 'user-2', '2026-08-02T00:00:00.000Z');

    expect(datosAnulacion).not.toBeNull();
    expect(datosAnulacion?.movimientoIds).toHaveLength(resultado.lineasOperacion.length);
    expect(datosAnulacion?.claveIdempotencia).toBe('ANULACION-nota_salida-ns-anular-1');

    const resultadoMotor = await ServicioKardexValorizado.anularDocumentoValorizado(datosAnulacion!, { almacenes: almacenesMap, generarId, fechaActual });

    const productosFinales = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA)) as string) as Product[];
    expect(productosFinales[0].stockPorAlmacen['alm-1']).toBe(20);

    const notaAnulada = construirNotaSalidaAnulada(notaGenerada, 'Error de digitación', 'user-2', '2026-08-02T00:00:00.000Z', resultadoMotor.resultadoIds.length);
    expect(notaAnulada.estado).toBe('Anulada');
    expect(notaAnulada.historial.at(-1)?.detalle).toMatch(/Stock repuesto en 1 línea/);
  });

  it('NS solo con productos no inventariables (sinMovimientoInventario): no hay nada que revertir, datosAnulacion es null', () => {
    const nota = crearNota({
      id: 'ns-anular-2',
      estado: 'Generada',
      lineas: [crearLinea()],
      preparacionInventario: { lineasOperacion: [], despachosOV: [], sinMovimientoInventario: true },
    });

    const { datosAnulacion } = prepararAnulacionNS(nota, EMPRESA, null, 'motivo', 'user-1', fechaActual());
    expect(datosAnulacion).toBeNull();
  });

  it('rechaza anular una NS que no está en estado Generada', () => {
    const nota = crearNota({ id: 'ns-anular-3', estado: 'Anulada', lineas: [crearLinea()] });
    expect(() => prepararAnulacionNS(nota, EMPRESA, null, 'motivo', 'user-1', fechaActual())).toThrow(/Generada/);
  });

  it('rechaza si no se encuentran los movimientos originales y la NS no es legítimamente sin movimiento', () => {
    const nota = crearNota({ id: 'ns-anular-4', estado: 'Generada', lineas: [crearLinea()] });
    expect(() => prepararAnulacionNS(nota, EMPRESA, null, 'motivo', 'user-1', fechaActual())).toThrow(/No se encontraron los movimientos/);
  });

  it('reintento idempotente de la anulación (misma clave) devuelve "repetida" sin volver a reponer stock', async () => {
    localStorage.setItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA), JSON.stringify([crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]));
    const productsMap = new Map([['prod-1', crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const nota = crearNota({ id: 'ns-anular-5', lineas: [crearLinea({ cantidad: 6 })] });

    const resultado = prepararSalidaNS(nota, [], productsMap, almacenesMap, ESTABLECIMIENTO);
    const datos = construirDatosOperacionSalidaNS({ nota, resultado, empresaId: EMPRESA, usuario: 'user-1', fecha: fechaActual() });
    await ServicioKardexValorizado.registrarSalidaValorizada(datos, { almacenes: almacenesMap, generarId, fechaActual });
    const notaGenerada = construirNotaSalidaGenerada(nota, resultado, 'user-1', fechaActual());

    const movimientosRaw = localStorage.getItem(lsKey(STORAGE_KEY_MOVEMENTS, EMPRESA));
    const { datosAnulacion } = prepararAnulacionNS(notaGenerada, EMPRESA, movimientosRaw, 'motivo', 'user-2', '2026-08-02T00:00:00.000Z');

    const r1 = await ServicioKardexValorizado.anularDocumentoValorizado(datosAnulacion!, { almacenes: almacenesMap, generarId, fechaActual });
    const r2 = await ServicioKardexValorizado.anularDocumentoValorizado(datosAnulacion!, { almacenes: almacenesMap, generarId, fechaActual });

    expect(r1.estado).toBe('nueva');
    expect(r2.estado).toBe('repetida');
    const productosFinales = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA)) as string) as Product[];
    expect(productosFinales[0].stockPorAlmacen['alm-1']).toBe(20);
  });
});
