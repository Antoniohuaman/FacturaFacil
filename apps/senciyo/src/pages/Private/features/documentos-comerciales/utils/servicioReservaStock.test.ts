import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { instalarLocalStorageDePrueba } from '../../gestion-inventario/repositories/localStorageDePrueba';
import { PRODUCT_STORAGE_KEY } from '../../catalogo-articulos/utils/catalogStorage';
import { STORAGE_KEY_MOVEMENTS } from '../../gestion-inventario/repositories/stock.repository';
import { ServicioKardexValorizado } from '../../gestion-inventario/services/servicioKardexValorizado';
import { useProductStore } from '../../catalogo-articulos/hooks/useProductStore';
import {
  prepararDescuentoStockDocumento,
  ejecutarDescuentoStockNV,
  construirHuellaNotaVenta,
  cancelarNotaVentaPendiente,
  ESPACIO_NOTA_VENTA_SALIDA,
} from './servicioReservaStock';
import {
  obtenerDatosOperacionPendiente,
  guardarDatosOperacionPendiente,
} from '../../../../../shared/inventory/sesionPendienteOperacionInventario';
import type { Product } from '../../catalogo-articulos/models/types';
import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';
import type { CartItem, DatosFormularioDocumentoComercial } from '../models/documentoComercial.types';
import type { DatosOperacionSalidaCuantitativa } from '../../gestion-inventario/models/operacionEntradaInventario.types';
import { lsKey } from '../../../../../shared/tenant';

instalarLocalStorageDePrueba();

// `sincronizarInventarioTrasConfirmacion` (accionesStock.ts) dispara `window.dispatchEvent` — el
// entorno 'node' de Vitest no define `window`. Stub mínimo, exclusivo de esta prueba.
if (typeof (globalThis as typeof globalThis & { window?: unknown }).window === 'undefined') {
  Object.defineProperty(globalThis, 'window', {
    value: { dispatchEvent: () => true },
    writable: true,
    configurable: true,
  });
}

const EMPRESA = 'emp-A';

const ESTABLECIMIENTO = 'est-1';

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

function crearItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    id: 'item-1',
    code: 'P001',
    name: 'Producto 1',
    price: 10,
    quantity: 5,
    stock: 0,
    tipoBienServicio: 'bien',
    tipoDetalle: 'catalogo',
    requiresStockControl: true,
    ...overrides,
  };
}

interface GlobalConEmpresaActiva {
  __FF_ACTIVE_WORKSPACE_ID?: string;
}

beforeEach(() => {
  useProductStore.setState({ allProducts: [] });
  localStorage.clear();
  // `sincronizarInventarioTrasConfirmacion` rehidrata el store de productos leyendo la empresa
  // activa vía el contexto de tenant — necesario para las pruebas de `ejecutarDescuentoStockNV`.
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

function construirDatosOperacionVenta(documentoId: string, lineas: ReturnType<typeof prepararDescuentoStockDocumento>['lineasOperacion']): DatosOperacionSalidaCuantitativa {
  return {
    modoOperacion: 'cuantitativo',
    empresaId: EMPRESA,
    documentoId,
    tipoDocumento: 'venta',
    tipoOperacion: 'venta_salida',
    claveIdempotencia: `nota_venta_salida:${documentoId}`,
    usuario: 'user-1',
    fecha: fechaActual(),
    motivo: 'VENTA',
    observaciones: `Nota de Venta ${documentoId}`,
    documentoReferencia: documentoId,
    lineas,
  };
}

describe('prepararDescuentoStockDocumento — cálculo puro (Etapa 1D)', () => {
  it('omite ítems de servicio y de entrada libre', () => {
    useProductStore.setState({ allProducts: [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })] });
    const almacenes = [crearAlmacen()];
    const items: CartItem[] = [
      crearItem({ id: 'i1', tipoBienServicio: 'servicio' }),
      crearItem({ id: 'i2', tipoDetalle: 'libre' }),
    ];

    const resultado = prepararDescuentoStockDocumento(items, almacenes, ESTABLECIMIENTO, 'op-1');
    expect(resultado.lineasOperacion).toEqual([]);
    expect(resultado.reservasStock).toEqual([]);
  });

  it('asigna FIFO simple cuando el primer almacén alcanza', () => {
    useProductStore.setState({ allProducts: [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })] });
    const almacenes = [crearAlmacen()];
    const items: CartItem[] = [crearItem({ quantity: 5 })];

    const resultado = prepararDescuentoStockDocumento(items, almacenes, ESTABLECIMIENTO, 'op-1');
    expect(resultado.lineasOperacion).toEqual([
      { lineaId: 'op-1-0', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 5 },
    ]);
    expect(resultado.reservasStock).toEqual([
      { sku: 'P001', nombre: 'Producto 1', cantidad: 5, almacenId: 'alm-1', almacenNombre: 'Almacén Principal' },
    ]);
  });

  it('reparte entre almacenes cuando el primero no alcanza (FIFO)', () => {
    useProductStore.setState({ allProducts: [crearProducto({ stockPorAlmacen: { 'alm-1': 3, 'alm-2': 20 } })] });
    const almacenes = [
      crearAlmacen({ id: 'alm-1', prioridadSalida: 1 }),
      crearAlmacen({ id: 'alm-2', prioridadSalida: 2 }),
    ];
    const items: CartItem[] = [crearItem({ quantity: 5 })];

    const resultado = prepararDescuentoStockDocumento(items, almacenes, ESTABLECIMIENTO, 'op-1');
    expect(resultado.lineasOperacion).toHaveLength(2);
    const porAlmacen = new Map(resultado.lineasOperacion.map((l) => [l.almacenId, l.cantidadUnidadMinima]));
    expect(porAlmacen.get('alm-1')).toBe(3);
    expect(porAlmacen.get('alm-2')).toBe(2);
    // lineaId estable y única por asignación, derivada del operacionId del llamador.
    expect(resultado.lineasOperacion.map((l) => l.lineaId)).toEqual(['op-1-0', 'op-1-1']);
  });

  it('dos ítems del mismo producto consumen el stock de forma acumulativa sin mutar el store', () => {
    useProductStore.setState({ allProducts: [crearProducto({ stockPorAlmacen: { 'alm-1': 8 } })] });
    const almacenes = [crearAlmacen()];
    const items: CartItem[] = [
      crearItem({ id: 'i1', quantity: 5 }),
      crearItem({ id: 'i2', quantity: 3 }),
    ];

    const resultado = prepararDescuentoStockDocumento(items, almacenes, ESTABLECIMIENTO, 'op-1');
    expect(resultado.lineasOperacion).toHaveLength(2);
    expect(resultado.lineasOperacion.reduce((s, l) => s + l.cantidadUnidadMinima, 0)).toBe(8);
    // El store nunca se muta — prepararDescuentoStockDocumento es puro.
    expect(useProductStore.getState().allProducts[0].stockPorAlmacen?.['alm-1']).toBe(8);
  });

  it('rechaza el documento completo (fail-closed, corrección post-1D §4) si un ítem que controla stock referencia un producto inexistente', () => {
    useProductStore.setState({ allProducts: [] });
    const almacenes = [crearAlmacen()];
    const items: CartItem[] = [crearItem({ code: 'NO-EXISTE' })];

    expect(() => prepararDescuentoStockDocumento(items, almacenes, ESTABLECIMIENTO, 'op-1')).toThrow(
      /no se encontró en el catálogo/,
    );
  });

  it('rechaza el documento completo si la asignación FIFO no cubre exactamente la cantidad requerida', () => {
    useProductStore.setState({ allProducts: [crearProducto({ stockPorAlmacen: { 'alm-1': 2 } })] });
    const almacenes = [crearAlmacen()];
    const items: CartItem[] = [crearItem({ quantity: 5 })];

    expect(() => prepararDescuentoStockDocumento(items, almacenes, ESTABLECIMIENTO, 'op-1')).toThrow(
      /No se pudo asignar exactamente 5/,
    );
  });
});

describe('Corrección post-1D §1: idempotencia end-to-end de Nota de Venta repitiendo el flujo productivo completo', () => {
  function sembrarProductosLocalStorage(productos: Product[]): void {
    localStorage.setItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA), JSON.stringify(productos));
  }

  it('un segundo intento completo (preparación → contrato → motor) tras consumir todo el stock reutiliza la asignación ya calculada y el motor devuelve repetida sin descontar de nuevo', async () => {
    const documentoId = 'doc-nv-idem-1';
    sembrarProductosLocalStorage([crearProducto({ stockPorAlmacen: { 'alm-1': 5 } })]);
    useProductStore.setState({ allProducts: [crearProducto({ stockPorAlmacen: { 'alm-1': 5 } })] });
    const almacenes = [crearAlmacen()];
    const almacenesMap = new Map(almacenes.map((a) => [a.id, a]));
    const items: CartItem[] = [crearItem({ quantity: 5 })];

    // ── Intento 1: flujo completo desde los datos comerciales originales ──
    const resultado1 = prepararDescuentoStockDocumento(items, almacenes, ESTABLECIMIENTO, documentoId);
    const datos1 = construirDatosOperacionVenta(documentoId, resultado1.lineasOperacion);
    const motor1 = await ServicioKardexValorizado.registrarSalidaValorizada(datos1, { almacenes: almacenesMap, generarId, fechaActual });
    expect(motor1.estado).toBe('nueva');

    const productosTrasIntento1 = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA)) as string) as Product[];
    expect(productosTrasIntento1[0].stockPorAlmacen['alm-1']).toBe(0);

    // ── Intento 2: el stock YA está en 0 — recalcular FIFO aquí fallaría o daría un resultado
    // distinto. El flujo productivo real (useDocumentoComercialActions.ejecutarDescuentoStockNV)
    // nunca recalcula si ya existe un cálculo cacheado para la misma huella; aquí lo simulamos
    // reutilizando DIRECTAMENTE `resultado1.lineasOperacion` (exactamente lo que el caché
    // devolvería) en vez de volver a llamar a `prepararDescuentoStockDocumento`. ──
    const datos2 = construirDatosOperacionVenta(documentoId, resultado1.lineasOperacion);
    const motor2 = await ServicioKardexValorizado.registrarSalidaValorizada(datos2, { almacenes: almacenesMap, generarId, fechaActual });

    expect(motor2.estado).toBe('repetida');
    const productosTrasIntento2 = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA)) as string) as Product[];
    expect(productosTrasIntento2[0].stockPorAlmacen['alm-1']).toBe(0);
  });

  it('un fallo simulado entre confirmar inventario y persistir el documento comercial se completa en el reintento sin un segundo descuento', async () => {
    const documentoId = 'doc-nv-idem-2';
    sembrarProductosLocalStorage([crearProducto({ stockPorAlmacen: { 'alm-1': 5 } })]);
    const almacenes = [crearAlmacen()];
    const almacenesMap = new Map(almacenes.map((a) => [a.id, a]));
    useProductStore.setState({ allProducts: [crearProducto({ stockPorAlmacen: { 'alm-1': 5 } })] });
    const items: CartItem[] = [crearItem({ quantity: 5 })];

    const resultado = prepararDescuentoStockDocumento(items, almacenes, ESTABLECIMIENTO, documentoId);
    const datos = construirDatosOperacionVenta(documentoId, resultado.lineasOperacion);

    // Paso 1: inventario se confirma (equivalente a que `ejecutarDescuentoStockNV` ya corrió).
    const motor1 = await ServicioKardexValorizado.registrarSalidaValorizada(datos, { almacenes: almacenesMap, generarId, fechaActual });
    expect(motor1.estado).toBe('nueva');

    // Paso 2 (simulado): la persistencia del documento comercial "falló" — nunca se llamó a
    // agregarDocumento/actualizarEnContext. El reintento repite la MISMA llamada al motor (mismo
    // documentoId, mismas líneas) para completar la persistencia sin volver a descontar.
    const motor2 = await ServicioKardexValorizado.registrarSalidaValorizada(datos, { almacenes: almacenesMap, generarId, fechaActual });
    expect(motor2.estado).toBe('repetida');

    const productosFinales = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA)) as string) as Product[];
    expect(productosFinales[0].stockPorAlmacen['alm-1']).toBe(0);
  });
});

describe('Corrección post-1D §3: una sola persistencia (sin segunda escritura vía updateProduct)', () => {
  function sembrarProductosLocalStorage(productos: Product[]): void {
    localStorage.setItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA), JSON.stringify(productos));
  }

  it('registrarSalidaValorizada escribe la colección de productos y de movimientos EXACTAMENTE una vez cada una', async () => {
    const documentoId = 'doc-nv-writes-1';
    sembrarProductosLocalStorage([crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]);
    useProductStore.setState({ allProducts: [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })] });
    const almacenes = [crearAlmacen()];
    const almacenesMap = new Map(almacenes.map((a) => [a.id, a]));
    const items: CartItem[] = [crearItem({ quantity: 5 })];

    const resultado = prepararDescuentoStockDocumento(items, almacenes, ESTABLECIMIENTO, documentoId);
    const datos = construirDatosOperacionVenta(documentoId, resultado.lineasOperacion);

    const claveProductos = lsKey(PRODUCT_STORAGE_KEY, EMPRESA);
    const claveMovimientos = lsKey(STORAGE_KEY_MOVEMENTS, EMPRESA);
    let escriturasProductos = 0;
    let escriturasMovimientos = 0;
    const setItemOriginal = localStorage.setItem.bind(localStorage);
    const spySetItem = (clave: string, valor: string) => {
      if (clave === claveProductos) escriturasProductos += 1;
      if (clave === claveMovimientos) escriturasMovimientos += 1;
      return setItemOriginal(clave, valor);
    };
    localStorage.setItem = spySetItem;
    try {
      await ServicioKardexValorizado.registrarSalidaValorizada(datos, { almacenes: almacenesMap, generarId, fechaActual });
    } finally {
      localStorage.setItem = setItemOriginal;
    }

    // Una sola escritura de la colección de productos y una sola de movimientos: la unidad de
    // trabajo (Etapa 1B) es la única fuente de verdad — ningún `updateProduct`/segunda
    // persistencia posterior debe volver a escribirlas (otras colecciones internas de 1A/1B,
    // como la reserva idempotente o el diario de transacciones, tienen su propio ciclo de
    // escritura y no son el objeto de esta prueba).
    expect(escriturasProductos).toBe(1);
    expect(escriturasMovimientos).toBe(1);
  });

  it('una operación repetida no genera NINGUNA escritura adicional (cero segunda persistencia)', async () => {
    const documentoId = 'doc-nv-writes-2';
    sembrarProductosLocalStorage([crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]);
    useProductStore.setState({ allProducts: [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })] });
    const almacenes = [crearAlmacen()];
    const almacenesMap = new Map(almacenes.map((a) => [a.id, a]));
    const items: CartItem[] = [crearItem({ quantity: 5 })];

    const resultado = prepararDescuentoStockDocumento(items, almacenes, ESTABLECIMIENTO, documentoId);
    const datos = construirDatosOperacionVenta(documentoId, resultado.lineasOperacion);
    await ServicioKardexValorizado.registrarSalidaValorizada(datos, { almacenes: almacenesMap, generarId, fechaActual });

    let escriturasTotales = 0;
    const setItemOriginal = localStorage.setItem.bind(localStorage);
    localStorage.setItem = (clave: string, valor: string) => {
      escriturasTotales += 1;
      return setItemOriginal(clave, valor);
    };
    let motorRepetido;
    try {
      motorRepetido = await ServicioKardexValorizado.registrarSalidaValorizada(datos, { almacenes: almacenesMap, generarId, fechaActual });
    } finally {
      localStorage.setItem = setItemOriginal;
    }

    expect(motorRepetido.estado).toBe('repetida');
    // Una operación repetida solo LEE la reserva idempotente ya existente — no escribe productos
    // ni movimientos ni ningún otro recurso.
    expect(escriturasTotales).toBe(0);
  });
});

describe('Corrección post-1D §3: ejecutarDescuentoStockNV — identidad y número completamente estables (orquestación real)', () => {
  function crearDatosFormulario(overrides: Partial<DatosFormularioDocumentoComercial> = {}): DatosFormularioDocumentoComercial {
    return {
      tipo: 'nota_venta',
      serie: 'NV01',
      fechaEmision: '2026-08-01',
      moneda: 'PEN',
      items: [crearItem({ quantity: 5 })],
      modoItems: 'catalogo',
      ...overrides,
    };
  }

  function sembrarProductosLocalStorage(productos: Product[]): void {
    localStorage.setItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA), JSON.stringify(productos));
  }

  it('prueba de orquestación real: inventario se confirma, la persistencia de la NV "falla" (nunca se limpia la sesión), otro documento consumiría el siguiente correlativo, y el reintento conserva documentoId/numero/líneas originales sin descontar de nuevo', async () => {
    sembrarProductosLocalStorage([crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]);
    useProductStore.setState({ allProducts: [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })] });
    const almacenes = [crearAlmacen()];
    const datos = crearDatosFormulario();

    // Paso 1: primera preparación real — resuelve numero/documentoId/líneas y confirma inventario.
    const resultado1 = await ejecutarDescuentoStockNV({
      datos,
      almacenes,
      establecimientoId: ESTABLECIMIENTO,
      empresaId: EMPRESA,
      usuario: 'user-1',
      documentoIdExistente: undefined,
      resolverNumeroFallback: () => ({ numero: 'NV01-00000001', correlativo: '00000001' }),
    });

    expect(resultado1.numero).toBe('NV01-00000001');
    expect(resultado1.correlativo).toBe('00000001');
    const productosTrasIntento1 = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA)) as string) as Product[];
    expect(productosTrasIntento1[0].stockPorAlmacen['alm-1']).toBe(15);

    // Paso 2: la persistencia de la Nota de Venta "falla" — nunca se llama a `limpiarSesion()`,
    // por lo que la sesión pendiente sigue viva con todos los datos originales (verificado
    // indirectamente por el reintento de abajo, que la reutiliza).

    // Paso 3: "otro documento" habría consumido el siguiente correlativo de la serie — se simula
    // pasando un fallback DISTINTO ('NV01-00000002') en el reintento, para probar que se IGNORA.
    // Paso 4: se reintenta la misma Nota de Venta (mismos `datos`, mismo establecimiento/empresa).
    const resultado2 = await ejecutarDescuentoStockNV({
      datos,
      almacenes,
      establecimientoId: ESTABLECIMIENTO,
      empresaId: EMPRESA,
      usuario: 'user-1',
      documentoIdExistente: undefined,
      resolverNumeroFallback: () => ({ numero: 'NV01-00000002', correlativo: '00000002' }),
    });

    // Paso 5: conserva documentoId, numero y líneas originales — nunca el fallback del reintento.
    expect(resultado2.documentoId).toBe(resultado1.documentoId);
    expect(resultado2.numero).toBe('NV01-00000001');
    expect(resultado2.correlativo).toBe('00000001');
    expect(resultado2.reservasStock).toEqual(resultado1.reservasStock);

    // Paso 6: el motor no descuenta de nuevo — el stock sigue exactamente como quedó tras el
    // primer intento (la operación repetida no escribe nada).
    const productosTrasIntento2 = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA)) as string) as Product[];
    expect(productosTrasIntento2[0].stockPorAlmacen['alm-1']).toBe(15);

    // La sesión solo se limpia cuando el llamador la persiste correctamente.
    resultado2.limpiarSesion();
  });

  it('la sesión conserva todos los datos mientras no se llame explícitamente a limpiarSesion (persistencia comercial pendiente)', async () => {
    sembrarProductosLocalStorage([crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]);
    useProductStore.setState({ allProducts: [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })] });
    const almacenes = [crearAlmacen()];
    const datos = crearDatosFormulario();

    const resultado = await ejecutarDescuentoStockNV({
      datos,
      almacenes,
      establecimientoId: ESTABLECIMIENTO,
      empresaId: EMPRESA,
      usuario: 'user-1',
      documentoIdExistente: undefined,
      resolverNumeroFallback: () => ({ numero: 'NV01-00000005', correlativo: '00000005' }),
    });

    // Sin llamar a limpiarSesion: un reintento reutiliza exactamente los mismos datos.
    const resultadoReintento = await ejecutarDescuentoStockNV({
      datos,
      almacenes,
      establecimientoId: ESTABLECIMIENTO,
      empresaId: EMPRESA,
      usuario: 'user-1',
      documentoIdExistente: undefined,
      resolverNumeroFallback: () => ({ numero: 'NV01-00000009', correlativo: '00000009' }),
    });
    expect(resultadoReintento.documentoId).toBe(resultado.documentoId);
    expect(resultadoReintento.numero).toBe(resultado.numero);

    // Ahora sí se limpia (equivalente a que la NV se persistió correctamente).
    resultado.limpiarSesion();

    // `sincronizarInventarioTrasConfirmacion` ya rehidrató el store en las llamadas anteriores;
    // en este entorno de prueba (Node, sin `window.localStorage` real) la rehidratación no puede
    // releer el localStorage simulado, así que se resiembra explícitamente antes de la siguiente
    // preparación real (en un navegador real esto lo haría `rehydrateFromStorage` automáticamente).
    useProductStore.setState({ allProducts: [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })] });

    // Una nueva llamada (misma huella) ya no encuentra sesión: resuelve una identidad NUEVA.
    const resultadoTrasLimpiar = await ejecutarDescuentoStockNV({
      datos,
      almacenes,
      establecimientoId: ESTABLECIMIENTO,
      empresaId: EMPRESA,
      usuario: 'user-1',
      documentoIdExistente: undefined,
      resolverNumeroFallback: () => ({ numero: 'NV01-00000009', correlativo: '00000009' }),
    });
    expect(resultadoTrasLimpiar.numero).toBe('NV01-00000009');
    expect(resultadoTrasLimpiar.documentoId).not.toBe(resultado.documentoId);
  });

  it('documentoIdExistente (borrador ya persistido) tiene prioridad absoluta sobre cualquier id técnico de sesión', async () => {
    sembrarProductosLocalStorage([crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]);
    useProductStore.setState({ allProducts: [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })] });
    const almacenes = [crearAlmacen()];
    const datos = crearDatosFormulario();

    const resultado = await ejecutarDescuentoStockNV({
      datos,
      almacenes,
      establecimientoId: ESTABLECIMIENTO,
      empresaId: EMPRESA,
      usuario: 'user-1',
      documentoIdExistente: 'doc-borrador-real-123',
      resolverNumeroFallback: () => ({ numero: 'NV01-00000001', correlativo: '00000001' }),
    });

    expect(resultado.documentoId).toBe('doc-borrador-real-123');
  });
});

describe('Corrección post-1D §2: aislamiento y limpieza de sesión — Nota de Venta', () => {
  function crearDatosFormulario(overrides: Partial<DatosFormularioDocumentoComercial> = {}): DatosFormularioDocumentoComercial {
    return {
      tipo: 'nota_venta',
      serie: 'NV01',
      fechaEmision: '2026-08-01',
      moneda: 'PEN',
      items: [crearItem({ quantity: 5 })],
      modoItems: 'catalogo',
      ...overrides,
    };
  }

  function sembrarProductosLocalStorage(productos: Product[]): void {
    localStorage.setItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA), JSON.stringify(productos));
  }

  it('dos borradores NV con contenido IDÉNTICO conservan documentoId diferentes (documentoIdExistente forma parte de la huella)', async () => {
    sembrarProductosLocalStorage([crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]);
    useProductStore.setState({ allProducts: [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })] });
    const almacenes = [crearAlmacen()];
    const datos = crearDatosFormulario();

    const resultadoBorrador1 = await ejecutarDescuentoStockNV({
      datos,
      almacenes,
      establecimientoId: ESTABLECIMIENTO,
      empresaId: EMPRESA,
      usuario: 'user-1',
      documentoIdExistente: 'doc-borrador-1',
      resolverNumeroFallback: () => ({ numero: 'NV01-00000001', correlativo: '00000001' }),
    });

    // `sincronizarInventarioTrasConfirmacion` ya rehidrató el store; en este entorno de prueba
    // (Node, sin `window.localStorage` real) no puede releer el localStorage simulado, así que se
    // resiembra explícitamente (en un navegador real esto lo haría `rehydrateFromStorage`).
    useProductStore.setState({ allProducts: [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })] });

    const resultadoBorrador2 = await ejecutarDescuentoStockNV({
      datos,
      almacenes,
      establecimientoId: ESTABLECIMIENTO,
      empresaId: EMPRESA,
      usuario: 'user-1',
      documentoIdExistente: 'doc-borrador-2',
      resolverNumeroFallback: () => ({ numero: 'NV01-00000002', correlativo: '00000002' }),
    });

    expect(resultadoBorrador1.documentoId).toBe('doc-borrador-1');
    expect(resultadoBorrador2.documentoId).toBe('doc-borrador-2');
    expect(resultadoBorrador1.documentoId).not.toBe(resultadoBorrador2.documentoId);
  });

  it('el documentoIdExistente tiene prioridad real incluso cuando hay una caché de OTRA identidad (defensivo ante caché corrupta/remanente)', async () => {
    sembrarProductosLocalStorage([crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]);
    useProductStore.setState({ allProducts: [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })] });
    const almacenes = [crearAlmacen()];
    const datos = crearDatosFormulario();
    const establecimientoId = ESTABLECIMIENTO;

    // Se siembra manualmente una caché con la MISMA huella (mismo documentoIdExistente) pero un
    // documentoId interno distinto — simula una caché corrupta o remanente de otro flujo.
    const huella = construirHuellaNotaVenta(datos, establecimientoId, 'doc-real-999');
    guardarDatosOperacionPendiente(ESPACIO_NOTA_VENTA_SALIDA, EMPRESA, huella, 'doc-otro', {
      documentoId: 'doc-otro',
      numero: 'NV01-00000099',
      correlativo: '00000099',
      lineasOperacion: [],
      reservasStock: [],
    });

    const resultado = await ejecutarDescuentoStockNV({
      datos,
      almacenes,
      establecimientoId,
      empresaId: EMPRESA,
      usuario: 'user-1',
      documentoIdExistente: 'doc-real-999',
      resolverNumeroFallback: () => ({ numero: 'NV01-00000100', correlativo: '00000100' }),
    });

    // Nunca hereda "doc-otro" — el documentoId real siempre gana.
    expect(resultado.documentoId).toBe('doc-real-999');
  });

  it('una caché corrupta (lineasOperacion no es un arreglo) se descarta y NUNCA hace que se omita el inventario', async () => {
    sembrarProductosLocalStorage([crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]);
    useProductStore.setState({ allProducts: [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })] });
    const almacenes = [crearAlmacen()];
    const datos = crearDatosFormulario();
    const establecimientoId = ESTABLECIMIENTO;

    const huella = construirHuellaNotaVenta(datos, establecimientoId, undefined);
    guardarDatosOperacionPendiente(ESPACIO_NOTA_VENTA_SALIDA, EMPRESA, huella, 'doc-corrupto', {
      documentoId: 'doc-corrupto',
      numero: 'NV01-00000050',
      correlativo: '00000050',
      lineasOperacion: 'no-es-un-arreglo',
      reservasStock: [],
    });

    const resultado = await ejecutarDescuentoStockNV({
      datos,
      almacenes,
      establecimientoId,
      empresaId: EMPRESA,
      usuario: 'user-1',
      documentoIdExistente: undefined,
      resolverNumeroFallback: () => ({ numero: 'NV01-00000051', correlativo: '00000051' }),
    });

    // Se recalculó desde cero (nunca se confió en la caché corrupta) y el stock SÍ se descontó.
    const productosFinales = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA)) as string) as Product[];
    expect(productosFinales[0].stockPorAlmacen['alm-1']).toBe(15);
    expect(resultado.numero).toBe('NV01-00000051');
  });

  it('una sesión abandonada (limpiada explícitamente) nunca se reutiliza al iniciar otra venta con el mismo contenido', async () => {
    sembrarProductosLocalStorage([crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]);
    useProductStore.setState({ allProducts: [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })] });
    const almacenes = [crearAlmacen()];
    const datos = crearDatosFormulario();

    const resultado1 = await ejecutarDescuentoStockNV({
      datos,
      almacenes,
      establecimientoId: ESTABLECIMIENTO,
      empresaId: EMPRESA,
      usuario: 'user-1',
      documentoIdExistente: undefined,
      resolverNumeroFallback: () => ({ numero: 'NV01-00000060', correlativo: '00000060' }),
    });

    // Cancelación explícita del primer documento (abandona la sesión).
    cancelarNotaVentaPendiente(EMPRESA);

    useProductStore.setState({ allProducts: [crearProducto({ stockPorAlmacen: { 'alm-1': 15 } })] });
    sembrarProductosLocalStorage([crearProducto({ stockPorAlmacen: { 'alm-1': 15 } })]);

    const resultado2 = await ejecutarDescuentoStockNV({
      datos,
      almacenes,
      establecimientoId: ESTABLECIMIENTO,
      empresaId: EMPRESA,
      usuario: 'user-1',
      documentoIdExistente: undefined,
      resolverNumeroFallback: () => ({ numero: 'NV01-00000061', correlativo: '00000061' }),
    });

    expect(resultado2.documentoId).not.toBe(resultado1.documentoId);
    expect(resultado2.numero).toBe('NV01-00000061');
  });

  it('recargar la misma operación (misma huella, sesión viva) conserva la identidad — nunca genera una nueva', async () => {
    sembrarProductosLocalStorage([crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]);
    useProductStore.setState({ allProducts: [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })] });
    const almacenes = [crearAlmacen()];
    const datos = crearDatosFormulario();

    const resultado1 = await ejecutarDescuentoStockNV({
      datos,
      almacenes,
      establecimientoId: ESTABLECIMIENTO,
      empresaId: EMPRESA,
      usuario: 'user-1',
      documentoIdExistente: undefined,
      resolverNumeroFallback: () => ({ numero: 'NV01-00000070', correlativo: '00000070' }),
    });

    // "Recarga": se vuelve a invocar sin haber llamado a limpiarSesion.
    const resultado2 = await ejecutarDescuentoStockNV({
      datos,
      almacenes,
      establecimientoId: ESTABLECIMIENTO,
      empresaId: EMPRESA,
      usuario: 'user-1',
      documentoIdExistente: undefined,
      resolverNumeroFallback: () => ({ numero: 'NV01-99999999', correlativo: '99999999' }),
    });

    expect(resultado2.documentoId).toBe(resultado1.documentoId);
    expect(resultado2.numero).toBe(resultado1.numero);
  });

  it('un fallo incierto (persistencia comercial nunca se confirma) conserva la sesión — nunca se limpia sola', async () => {
    sembrarProductosLocalStorage([crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]);
    useProductStore.setState({ allProducts: [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })] });
    const almacenes = [crearAlmacen()];
    const datos = crearDatosFormulario();
    const establecimientoId = ESTABLECIMIENTO;

    const resultado = await ejecutarDescuentoStockNV({
      datos,
      almacenes,
      establecimientoId,
      empresaId: EMPRESA,
      usuario: 'user-1',
      documentoIdExistente: undefined,
      resolverNumeroFallback: () => ({ numero: 'NV01-00000080', correlativo: '00000080' }),
    });

    // Nunca se llama a resultado.limpiarSesion() — simula que la persistencia comercial nunca
    // confirmó (ni éxito ni cancelación explícita).
    const huella = construirHuellaNotaVenta(datos, establecimientoId, undefined);
    const cacheTrasFalloIncierto = obtenerDatosOperacionPendiente<{ documentoId: string }>(ESPACIO_NOTA_VENTA_SALIDA, EMPRESA, huella);
    expect(cacheTrasFalloIncierto?.documentoId).toBe(resultado.documentoId);
  });
});
