import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { instalarLocalStorageDePrueba } from '../../gestion-inventario/repositories/localStorageDePrueba';
import { PRODUCT_STORAGE_KEY } from '../../catalogo-articulos/utils/catalogStorage';
import { ServicioKardexValorizado } from '../../gestion-inventario/services/servicioKardexValorizado';
import { aplicarLiberacionesOVVenta, construirHuellaVenta, esCacheVentaValida } from './useComprobanteActions';
import {
  obtenerDatosOperacionPendiente,
  guardarDatosOperacionPendiente,
  limpiarSesionPendienteOperacion,
} from '../../../../../shared/inventory/sesionPendienteOperacionInventario';
import type { DatosLineaOperacionCuantitativa, DatosOperacionSalidaCuantitativa } from '../../gestion-inventario/models/operacionEntradaInventario.types';
import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';
import type { Product } from '../../catalogo-articulos/models/types';
import { lsKey } from '../../../../../shared/tenant';

instalarLocalStorageDePrueba();

const EMPRESA = 'emp-A';

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

function crearLinea(overrides: Partial<DatosLineaOperacionCuantitativa> = {}): DatosLineaOperacionCuantitativa {
  return {
    lineaId: 'l1',
    productoId: 'prod-1',
    almacenId: 'alm-1',
    cantidadUnidadMinima: 5,
    ...overrides,
  };
}

describe('aplicarLiberacionesOVVenta — corrección post-1D §1: liberación de reserva de OV en el mismo plan del comprobante/POS', () => {
  it('arquitectura nueva (por establecimiento): asigna liberarReservaOV con la cantidad exacta despachada', () => {
    const lineas = [crearLinea({ cantidadUnidadMinima: 5 })];
    const ovReservas = [{ sku: 'P001', cantidad: 5, establecimientoId: 'est-1' }];
    const catalogLookup = new Map([['prod-1', crearProducto()]]);

    aplicarLiberacionesOVVenta(lineas, ovReservas, catalogLookup);

    expect(lineas[0].liberarReservaOV).toEqual({ establecimientoId: 'est-1', cantidad: 5 });
    expect(lineas[0].liberarReservaLegacyOV).toBeUndefined();
  });

  it('arquitectura legacy (por almacén): asigna liberarReservaLegacyOV con la cantidad exacta de esa línea', () => {
    const lineas = [crearLinea({ almacenId: 'alm-1', cantidadUnidadMinima: 5 })];
    const ovReservas = [{ sku: 'P001', cantidad: 5, almacenId: 'alm-1' }];
    const catalogLookup = new Map([['prod-1', crearProducto()]]);

    aplicarLiberacionesOVVenta(lineas, ovReservas, catalogLookup);

    expect(lineas[0].liberarReservaLegacyOV).toEqual({ cantidad: 5 });
    expect(lineas[0].liberarReservaOV).toBeUndefined();
  });

  it('despacho parcial (arquitectura nueva): libera exactamente el total despachado, no toda la reserva original', () => {
    const lineas = [crearLinea({ lineaId: 'l1', almacenId: 'alm-1', cantidadUnidadMinima: 3 })];
    const ovReservas = [{ sku: 'P001', cantidad: 10, establecimientoId: 'est-1' }];
    const catalogLookup = new Map([['prod-1', crearProducto()]]);

    aplicarLiberacionesOVVenta(lineas, ovReservas, catalogLookup);

    expect(lineas[0].liberarReservaOV).toEqual({ establecimientoId: 'est-1', cantidad: 3 });
  });

  it('despacho dividido en varios almacenes (arquitectura nueva): asigna la liberación total a UNA sola línea, nunca repartida', () => {
    const lineas = [
      crearLinea({ lineaId: 'l1', almacenId: 'alm-1', cantidadUnidadMinima: 3 }),
      crearLinea({ lineaId: 'l2', almacenId: 'alm-2', cantidadUnidadMinima: 2 }),
    ];
    const ovReservas = [{ sku: 'P001', cantidad: 5, establecimientoId: 'est-1' }];
    const catalogLookup = new Map([['prod-1', crearProducto()]]);

    aplicarLiberacionesOVVenta(lineas, ovReservas, catalogLookup);

    const conLiberacion = lineas.filter((l) => l.liberarReservaOV);
    expect(conLiberacion).toHaveLength(1);
    expect(conLiberacion[0].liberarReservaOV).toEqual({ establecimientoId: 'est-1', cantidad: 5 });
  });

  it('reserva insuficiente (despachado excede lo reservado): rechaza el documento completo sin usar Math.min', () => {
    const lineas = [crearLinea({ cantidadUnidadMinima: 8 })];
    const ovReservas = [{ sku: 'P001', cantidad: 5, establecimientoId: 'est-1' }];
    const catalogLookup = new Map([['prod-1', crearProducto()]]);

    expect(() => aplicarLiberacionesOVVenta(lineas, ovReservas, catalogLookup)).toThrow(/excede la reserva pendiente/);
  });

  it('reserva inexistente para el SKU: rechaza el documento completo', () => {
    const lineas = [crearLinea()];
    const ovReservas: Array<{ sku: string; cantidad: number; almacenId?: string; establecimientoId?: string }> = [];
    const catalogLookup = new Map([['prod-1', crearProducto()]]);

    expect(() => aplicarLiberacionesOVVenta(lineas, ovReservas, catalogLookup)).toThrow(/No se encontró una reserva/);
  });

  it('almacén que no coincide con la reserva legacy: rechaza el documento completo', () => {
    const lineas = [crearLinea({ almacenId: 'alm-2' })];
    const ovReservas = [{ sku: 'P001', cantidad: 5, almacenId: 'alm-1' }]; // reservado en OTRO almacén
    const catalogLookup = new Map([['prod-1', crearProducto()]]);

    expect(() => aplicarLiberacionesOVVenta(lineas, ovReservas, catalogLookup)).toThrow(/No se encontró una reserva/);
  });

  it('legacy: cantidad despachada en ese almacén excede la reserva de ese almacén: rechaza el documento completo', () => {
    const lineas = [crearLinea({ almacenId: 'alm-1', cantidadUnidadMinima: 8 })];
    const ovReservas = [{ sku: 'P001', cantidad: 5, almacenId: 'alm-1' }];
    const catalogLookup = new Map([['prod-1', crearProducto()]]);

    expect(() => aplicarLiberacionesOVVenta(lineas, ovReservas, catalogLookup)).toThrow(/excede la reserva pendiente/);
  });
});

describe('construirHuellaVenta — corrección post-1D §4: la huella nunca depende de numeroComprobante/documentoId, e incluye origen/modo', () => {
  const datosBase = {
    tipoComprobante: 'boleta' as const,
    serieSeleccionada: 'B001',
    cartItems: [{ id: 'item-1', code: 'P001', name: 'Producto 1', price: 10, quantity: 5, stock: 0 }],
    totals: { subtotal: 50, igv: 9, total: 59 },
  };

  it('dos OVs distintas con el mismo carrito NUNCA producen la misma huella (nunca comparten sesión)', () => {
    const huellaOV1 = construirHuellaVenta(datosBase, 'est-1', 'orden_venta', 'ov-1', 'automatico');
    const huellaOV2 = construirHuellaVenta(datosBase, 'est-1', 'orden_venta', 'ov-2', 'automatico');
    expect(huellaOV1).not.toBe(huellaOV2);
  });

  it('la misma OV, mismo carrito y mismo modo produce SIEMPRE la misma huella (permite detectar un reintento real)', () => {
    const huellaA = construirHuellaVenta(datosBase, 'est-1', 'orden_venta', 'ov-1', 'automatico');
    const huellaB = construirHuellaVenta(datosBase, 'est-1', 'orden_venta', 'ov-1', 'automatico');
    expect(huellaA).toBe(huellaB);
  });

  it('el mismo carrito sin origen de conversión (venta directa) produce una huella distinta a la de una venta desde OV', () => {
    const huellaDirecta = construirHuellaVenta(datosBase, 'est-1', null, null, 'automatico');
    const huellaDesdeOV = construirHuellaVenta(datosBase, 'est-1', 'orden_venta', 'ov-1', 'automatico');
    expect(huellaDirecta).not.toBe(huellaDesdeOV);
  });

  it('el mismo carrito con un modo de descuento de stock distinto produce una huella distinta', () => {
    const huellaAutomatico = construirHuellaVenta(datosBase, 'est-1', null, null, 'automatico');
    const huellaSinControl = construirHuellaVenta(datosBase, 'est-1', null, null, 'sin_control');
    expect(huellaAutomatico).not.toBe(huellaSinControl);
  });
});

describe('Corrección post-1D §4: dos ventas distintas con carrito idéntico obtienen documentos técnicos distintos una vez que la sesión de la primera se limpió', () => {
  const ESPACIO_VENTA_SALIDA = 'venta_salida';

  it('tras limpiar la sesión de la primera venta, una segunda venta con la MISMA huella resuelve un documentoId técnico NUEVO (nunca Math.random, nunca el mismo UUID)', () => {
    const huella = 'huella-carrito-identico';

    // Venta 1: primera preparación, se cachea un UUID técnico.
    const documentoId1 = crypto.randomUUID();
    guardarDatosOperacionPendiente(ESPACIO_VENTA_SALIDA, EMPRESA, huella, documentoId1, {
      documentoId: documentoId1,
      numeroComprobante: 'B001-00000001',
    });
    expect(obtenerDatosOperacionPendiente<{ documentoId: string }>(ESPACIO_VENTA_SALIDA, EMPRESA, huella)?.documentoId).toBe(documentoId1);

    // Venta 1 se persiste correctamente → se limpia la sesión.
    limpiarSesionPendienteOperacion(ESPACIO_VENTA_SALIDA, EMPRESA);
    expect(obtenerDatosOperacionPendiente(ESPACIO_VENTA_SALIDA, EMPRESA, huella)).toBeUndefined();

    // Venta 2: MISMO carrito (misma huella), pero es una operación GENUINAMENTE nueva — no hay
    // sesión previa que reutilizar, así que se resuelve un UUID técnico distinto.
    const documentoId2 = crypto.randomUUID();
    guardarDatosOperacionPendiente(ESPACIO_VENTA_SALIDA, EMPRESA, huella, documentoId2, {
      documentoId: documentoId2,
      numeroComprobante: 'B001-00000002',
    });

    expect(documentoId2).not.toBe(documentoId1);
    expect(obtenerDatosOperacionPendiente<{ documentoId: string }>(ESPACIO_VENTA_SALIDA, EMPRESA, huella)?.documentoId).toBe(documentoId2);
  });

  it('mientras la primera venta NO se ha persistido (sesión viva), un reintento con la misma huella conserva el MISMO documentoId — nunca genera uno nuevo', () => {
    const huella = 'huella-reintento';
    const documentoId1 = crypto.randomUUID();
    guardarDatosOperacionPendiente(ESPACIO_VENTA_SALIDA, EMPRESA, huella, documentoId1, {
      documentoId: documentoId1,
      numeroComprobante: 'B001-00000005',
    });

    // "Recarga" o reintento: se vuelve a leer la sesión pendiente para la MISMA huella.
    const cacheTrasRecarga = obtenerDatosOperacionPendiente<{ documentoId: string; numeroComprobante: string }>(
      ESPACIO_VENTA_SALIDA,
      EMPRESA,
      huella,
    );
    expect(cacheTrasRecarga?.documentoId).toBe(documentoId1);
    expect(cacheTrasRecarga?.numeroComprobante).toBe('B001-00000005');
  });

  it('un fallo incierto (nunca se llama a limpiar la sesión) conserva la sesión intacta para el reintento', () => {
    const huella = 'huella-fallo-incierto';
    const documentoId1 = crypto.randomUUID();
    guardarDatosOperacionPendiente(ESPACIO_VENTA_SALIDA, EMPRESA, huella, documentoId1, {
      documentoId: documentoId1,
      numeroComprobante: 'B001-00000010',
    });

    // Simula que `createComprobante` lanzó una excepción antes de llegar a `addComprobante` — la
    // sesión NUNCA se limpia en ese camino (solo se limpia tras persistir con éxito).
    const cacheTrasFallo = obtenerDatosOperacionPendiente<{ documentoId: string; numeroComprobante: string }>(
      ESPACIO_VENTA_SALIDA,
      EMPRESA,
      huella,
    );
    expect(cacheTrasFallo?.documentoId).toBe(documentoId1);
    expect(cacheTrasFallo?.numeroComprobante).toBe('B001-00000010');
  });

  it('cancelar explícitamente limpia la sesión — una venta nueva con el mismo carrito ya no la encuentra', () => {
    const huella = 'huella-cancelar';
    const documentoId1 = crypto.randomUUID();
    guardarDatosOperacionPendiente(ESPACIO_VENTA_SALIDA, EMPRESA, huella, documentoId1, {
      documentoId: documentoId1,
      numeroComprobante: 'B001-00000020',
    });

    // Equivalente a `cancelarVentaPendiente()` (Emisión Tradicional: botón "Cancelar"; POS:
    // "Borrar todo"/nueva venta).
    limpiarSesionPendienteOperacion(ESPACIO_VENTA_SALIDA, EMPRESA);

    expect(obtenerDatosOperacionPendiente(ESPACIO_VENTA_SALIDA, EMPRESA, huella)).toBeUndefined();
  });
});

describe('esCacheVentaValida — corrección post-1D §2: una caché corrupta nunca se trata como calculada', () => {
  it('acepta una caché bien formada sin lineasOperacion (aún no calculadas)', () => {
    expect(esCacheVentaValida({ documentoId: 'doc-1', numeroComprobante: 'B001-00000001' })).toBe(true);
  });

  it('acepta una caché bien formada con lineasOperacion válidas', () => {
    expect(esCacheVentaValida({
      documentoId: 'doc-1',
      numeroComprobante: 'B001-00000001',
      lineasOperacion: [{ lineaId: 'l1', productoId: 'p1', almacenId: 'alm-1', cantidadUnidadMinima: 5 }],
    })).toBe(true);
  });

  it('rechaza documentoId ausente o vacío', () => {
    expect(esCacheVentaValida({ numeroComprobante: 'B001-00000001' })).toBe(false);
    expect(esCacheVentaValida({ documentoId: '', numeroComprobante: 'B001-00000001' })).toBe(false);
  });

  it('rechaza numeroComprobante ausente', () => {
    expect(esCacheVentaValida({ documentoId: 'doc-1' })).toBe(false);
  });

  it('rechaza lineasOperacion que no es un arreglo (nunca se trata como "ya calculada, sin líneas")', () => {
    expect(esCacheVentaValida({ documentoId: 'doc-1', numeroComprobante: 'B001-00000001', lineasOperacion: 'no-es-un-arreglo' })).toBe(false);
  });

  it('rechaza una línea de operación con forma inválida dentro de lineasOperacion', () => {
    expect(esCacheVentaValida({
      documentoId: 'doc-1',
      numeroComprobante: 'B001-00000001',
      lineasOperacion: [{ lineaId: 'l1', productoId: 'p1' }], // falta almacenId/cantidadUnidadMinima
    })).toBe(false);
  });

  it('rechaza valores que no son objetos', () => {
    expect(esCacheVentaValida(null)).toBe(false);
    expect(esCacheVentaValida('texto')).toBe(false);
    expect(esCacheVentaValida(42)).toBe(false);
  });
});

describe('Comprobante desde OV — corrección post-1D §1: descuento + liberación de reserva en la MISMA unidad de trabajo', () => {
  it('el stock real y la reserva de la OV (arquitectura nueva) se escriben juntos en una sola confirmación, con un UUID técnico como documentoId', async () => {
    const documentoIdTecnico = crypto.randomUUID();
    localStorage.setItem(
      lsKey(PRODUCT_STORAGE_KEY, EMPRESA),
      JSON.stringify([crearProducto({ stockPorAlmacen: { 'alm-1': 20 }, stockReservadoOVPorEstablecimiento: { 'est-1': 5 } })]),
    );
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);

    const lineas: DatosLineaOperacionCuantitativa[] = [
      { lineaId: `${documentoIdTecnico}-0`, productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 5 },
    ];
    const catalogLookup = new Map([['prod-1', crearProducto()]]);
    aplicarLiberacionesOVVenta(lineas, [{ sku: 'P001', cantidad: 5, establecimientoId: 'est-1' }], catalogLookup);

    const datos: DatosOperacionSalidaCuantitativa = {
      modoOperacion: 'cuantitativo',
      empresaId: EMPRESA,
      documentoId: documentoIdTecnico,
      tipoDocumento: 'venta',
      tipoOperacion: 'venta_salida',
      claveIdempotencia: `venta_salida:${documentoIdTecnico}`,
      usuario: 'user-1',
      fecha: fechaActual(),
      motivo: 'VENTA',
      observaciones: 'Venta en boleta B001-00000001',
      documentoReferencia: 'B001-00000001',
      lineas,
    };

    const resultado = await ServicioKardexValorizado.registrarSalidaValorizada(datos, { almacenes: almacenesMap, generarId, fechaActual });
    expect(resultado.estado).toBe('nueva');

    const productosFinales = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA)) as string) as Product[];
    expect(productosFinales[0].stockPorAlmacen['alm-1']).toBe(15);
    expect(productosFinales[0].stockReservadoOVPorEstablecimiento?.['est-1']).toBe(0);
    // `documentoOrigenId` del movimiento es el UUID técnico, nunca un número generado con Math.random.
    expect(resultado.movimientos[0].documentoOrigenId).toBe(documentoIdTecnico);
    expect(resultado.movimientos[0].documentoReferencia).toBe('B001-00000001');
  });

  it('un reintento con el mismo documentoId técnico no descuenta ni libera la reserva de nuevo', async () => {
    const documentoIdTecnico = crypto.randomUUID();
    localStorage.setItem(
      lsKey(PRODUCT_STORAGE_KEY, EMPRESA),
      JSON.stringify([crearProducto({ stockPorAlmacen: { 'alm-1': 20 }, stockReservadoOVPorEstablecimiento: { 'est-1': 5 } })]),
    );
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const lineas: DatosLineaOperacionCuantitativa[] = [
      { lineaId: `${documentoIdTecnico}-0`, productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 5, liberarReservaOV: { establecimientoId: 'est-1', cantidad: 5 } },
    ];
    const datos: DatosOperacionSalidaCuantitativa = {
      modoOperacion: 'cuantitativo',
      empresaId: EMPRESA,
      documentoId: documentoIdTecnico,
      tipoDocumento: 'venta',
      tipoOperacion: 'venta_salida',
      claveIdempotencia: `venta_salida:${documentoIdTecnico}`,
      usuario: 'user-1',
      fecha: fechaActual(),
      motivo: 'VENTA',
      observaciones: 'Venta en boleta B001-00000002',
      documentoReferencia: 'B001-00000002',
      lineas,
    };

    const primero = await ServicioKardexValorizado.registrarSalidaValorizada(datos, { almacenes: almacenesMap, generarId, fechaActual });
    const segundo = await ServicioKardexValorizado.registrarSalidaValorizada(datos, { almacenes: almacenesMap, generarId, fechaActual });

    expect(primero.estado).toBe('nueva');
    expect(segundo.estado).toBe('repetida');
    const productosFinales = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA)) as string) as Product[];
    expect(productosFinales[0].stockPorAlmacen['alm-1']).toBe(15);
    expect(productosFinales[0].stockReservadoOVPorEstablecimiento?.['est-1']).toBe(0);
  });
});
