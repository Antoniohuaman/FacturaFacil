import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { instalarLocalStorageDePrueba } from '../../gestion-inventario/repositories/localStorageDePrueba';
import { PRODUCT_STORAGE_KEY } from '../../catalogo-articulos/utils/catalogStorage';
import { STORAGE_KEY_MOVEMENTS } from '../../gestion-inventario/repositories/stock.repository';
import { ServicioKardexValorizado } from '../../gestion-inventario/services/servicioKardexValorizado';
import { guardarCapaCostoInventario, listarCapasCostoInventarioPorEmpresa } from '../../gestion-inventario/repositories/capaCostoInventario.repository';
import { listarConsumosPorMovimientoSalida } from '../../gestion-inventario/repositories/consumoCapaCostoInventario.repository';
import { lsKey } from '@/shared/tenant';
import {
  motivoTrasladoAMotivoKardex,
  esBienGREInventariable,
  construirLineasSalidaGRE,
  construirDatosOperacionSalidaGRE,
  prepararAnulacionGRE,
  claveIdempotenciaGRE,
  debeDescontarStockAutomaticamenteGRE,
} from './inventarioGRE';
import { GUIA_REMISION_BORRADOR } from '../modelos/GuiaRemision';
import type { GuiaRemision, BienGRE } from '../modelos/GuiaRemision';
import type { Product } from '../../catalogo-articulos/models/types';
import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';
import type { MovimientoStock } from '../../gestion-inventario/models/inventory.types';

instalarLocalStorageDePrueba();

const EMPRESA = 'emp-A';
const OTRA_EMPRESA = 'emp-B';
const ESTABLECIMIENTO = 'est-1';

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

function crearBien(overrides: Partial<BienGRE> = {}): BienGRE {
  return {
    id: 'bien-1',
    productoId: 'prod-1',
    descripcion: 'Producto 1',
    unidad: 'NIU',
    cantidad: 5,
    normalizado: false,
    ...overrides,
  };
}

function crearGuia(overrides: Partial<GuiaRemision> = {}): GuiaRemision {
  return {
    ...GUIA_REMISION_BORRADOR('remitente'),
    id: 'gre-1',
    serie: 'T001',
    correlativo: '00000001',
    esBorrador: false,
    estado: 'Pendiente',
    bienes: [crearBien()],
    ...overrides,
  };
}

function sembrarProductos(empresaId: string, productos: Product[]): void {
  localStorage.setItem(lsKey(PRODUCT_STORAGE_KEY, empresaId), JSON.stringify(productos));
}

function leerProductos(empresaId: string): Product[] {
  return JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
}

function leerMovimientos(empresaId: string): MovimientoStock[] {
  const raw = localStorage.getItem(lsKey(STORAGE_KEY_MOVEMENTS, empresaId));
  return raw ? (JSON.parse(raw) as MovimientoStock[]) : [];
}

// ─── Lógica pura ────────────────────────────────────────────────────────────

describe('motivoTrasladoAMotivoKardex', () => {
  it('mapea motivos conocidos a un MovimientoMotivo ya existente (nunca inventa una categoría)', () => {
    expect(motivoTrasladoAMotivoKardex('01')).toBe('VENTA');
    expect(motivoTrasladoAMotivoKardex('04')).toBe('TRANSFERENCIA_ALMACEN');
    expect(motivoTrasladoAMotivoKardex('06')).toBe('DEVOLUCION_CLIENTE');
  });

  it('un motivo sin mapeo explícito cae en "OTRO" — nunca se asume una categoría', () => {
    expect(motivoTrasladoAMotivoKardex('99')).toBe('OTRO');
    expect(motivoTrasladoAMotivoKardex('20')).toBe('OTRO');
  });
});

describe('esBienGREInventariable', () => {
  it('un bien con producto MERCADERIAS es inventariable', () => {
    const productsMap = new Map([['prod-1', crearProducto({ tipoExistencia: 'MERCADERIAS' })]]);
    expect(esBienGREInventariable(crearBien(), productsMap)).toBe(true);
  });

  it('un bien cuyo producto es SERVICIOS no es inventariable (misma fuente central que Ventas/NI/NS)', () => {
    const productsMap = new Map([['prod-1', crearProducto({ tipoExistencia: 'SERVICIOS' })]]);
    expect(esBienGREInventariable(crearBien(), productsMap)).toBe(false);
  });

  it('un bien sin productoId nunca es inventariable', () => {
    const productsMap = new Map([['prod-1', crearProducto()]]);
    expect(esBienGREInventariable(crearBien({ productoId: undefined }), productsMap)).toBe(false);
  });

  it('un bien cuyo producto ya no existe en el catálogo no es inventariable (nunca se inventa)', () => {
    const productsMap = new Map<string, Product>();
    expect(esBienGREInventariable(crearBien(), productsMap)).toBe(false);
  });
});

describe('construirLineasSalidaGRE — asignación FIFO y clasificación (GRE-P1-008)', () => {
  it('asigna toda la cantidad al almacén de mayor prioridad cuando alcanza', () => {
    const productsMap = new Map([['prod-1', crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]]);
    const almacenes = [crearAlmacen({ id: 'alm-1', prioridadSalida: 1 })];
    const guia = crearGuia({ bienes: [crearBien({ cantidad: 5 })] });

    const { lineas, bienesOmitidosNoInventariables } = construirLineasSalidaGRE(guia, productsMap, almacenes);
    expect(lineas).toHaveLength(1);
    expect(lineas[0]).toMatchObject({ productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 5 });
    expect(bienesOmitidosNoInventariables).toBe(0);
  });

  it('reparte entre almacenes por prioridad (FIFO) cuando el primero no alcanza', () => {
    const productsMap = new Map([['prod-1', crearProducto({ stockPorAlmacen: { 'alm-1': 3, 'alm-2': 20 } })]]);
    const almacenes = [
      crearAlmacen({ id: 'alm-1', prioridadSalida: 1 }),
      crearAlmacen({ id: 'alm-2', codigoAlmacen: 'ALM02', prioridadSalida: 2 }),
    ];
    const guia = crearGuia({ bienes: [crearBien({ cantidad: 5 })] });

    const { lineas } = construirLineasSalidaGRE(guia, productsMap, almacenes);
    expect(lineas).toHaveLength(2);
    const porAlmacen = new Map(lineas.map((l) => [l.almacenId, l.cantidadUnidadMinima]));
    expect(porAlmacen.get('alm-1')).toBe(3);
    expect(porAlmacen.get('alm-2')).toBe(2);
  });

  it('rechaza (fail-closed) cuando el disponible total no cubre la cantidad requerida — nunca una asignación parcial', () => {
    const productsMap = new Map([['prod-1', crearProducto({ stockPorAlmacen: { 'alm-1': 2 } })]]);
    const almacenes = [crearAlmacen({ id: 'alm-1' })];
    const guia = crearGuia({ bienes: [crearBien({ cantidad: 5 })] });

    expect(() => construirLineasSalidaGRE(guia, productsMap, almacenes)).toThrow(/No hay stock disponible suficiente/);
  });

  it('omite bienes no inventariables (producto SERVICIOS) sin generar línea ni lanzar', () => {
    const productsMap = new Map([['prod-1', crearProducto({ tipoExistencia: 'SERVICIOS' })]]);
    const almacenes = [crearAlmacen()];
    const guia = crearGuia({ bienes: [crearBien()] });

    const { lineas, bienesOmitidosNoInventariables } = construirLineasSalidaGRE(guia, productsMap, almacenes);
    expect(lineas).toHaveLength(0);
    expect(bienesOmitidosNoInventariables).toBe(1);
  });

  it('una GRE con varios bienes genera una línea por cada segmento, conservando lineaComercialId por bien', () => {
    const productsMap = new Map([
      ['prod-1', crearProducto({ id: 'prod-1', stockPorAlmacen: { 'alm-1': 10 } })],
      ['prod-2', crearProducto({ id: 'prod-2', codigo: 'P002', stockPorAlmacen: { 'alm-1': 10 } })],
    ]);
    const almacenes = [crearAlmacen({ id: 'alm-1' })];
    const guia = crearGuia({
      bienes: [crearBien({ id: 'bien-1', productoId: 'prod-1', cantidad: 3 }), crearBien({ id: 'bien-2', productoId: 'prod-2', cantidad: 4 })],
    });

    const { lineas } = construirLineasSalidaGRE(guia, productsMap, almacenes);
    expect(lineas).toHaveLength(2);
    expect(lineas.find((l) => l.productoId === 'prod-1')?.lineaComercialId).toBe('bien-1');
    expect(lineas.find((l) => l.productoId === 'prod-2')?.lineaComercialId).toBe('bien-2');
  });
});

describe('construirDatosOperacionSalidaGRE', () => {
  it('deriva modoOperacion cuantitativo cuando la valorización no está activa', () => {
    const datos = construirDatosOperacionSalidaGRE({
      guia: crearGuia(), lineas: [], empresaId: EMPRESA, usuario: 'user-1', fecha: fechaActual(), estadoValorizacion: 'no_iniciada',
    });
    expect(datos.modoOperacion).toBe('cuantitativo');
    expect(datos.tipoDocumento).toBe('guia_remision');
    expect(datos.tipoOperacion).toBe('guia_remision_salida');
    expect(datos.claveIdempotencia).toBe(claveIdempotenciaGRE('gre-1'));
    expect(datos.documentoReferencia).toBe('T001-00000001');
  });

  it('deriva modoOperacion valorizado cuando la valorización está activa — nunca se fuerza desde el llamador', () => {
    const datos = construirDatosOperacionSalidaGRE({
      guia: crearGuia(), lineas: [], empresaId: EMPRESA, usuario: 'user-1', fecha: fechaActual(), estadoValorizacion: 'activa',
    });
    expect(datos.modoOperacion).toBe('valorizado');
  });
});

describe('prepararAnulacionGRE', () => {
  it('devuelve null cuando no hay movimientos de esta GRE — nunca inventa una reversión', () => {
    const { datosAnulacion } = prepararAnulacionGRE(crearGuia(), EMPRESA, null, 'motivo', 'user-1', fechaActual());
    expect(datosAnulacion).toBeNull();
  });

  it('localiza únicamente los movimientos de ESTA GRE (documentoOrigenId + tipoDocumentoOrigen + claveIdempotencia)', () => {
    const guia = crearGuia();
    const movimientos: Partial<MovimientoStock>[] = [
      { id: 'mov-1', documentoOrigenId: 'gre-1', tipoDocumentoOrigen: 'guia_remision', claveIdempotencia: claveIdempotenciaGRE('gre-1') },
      { id: 'mov-2', documentoOrigenId: 'otra-gre', tipoDocumentoOrigen: 'guia_remision', claveIdempotencia: claveIdempotenciaGRE('otra-gre') },
      { id: 'mov-3', documentoOrigenId: 'gre-1', tipoDocumentoOrigen: 'nota_salida', claveIdempotencia: 'nota_salida:gre-1' },
    ];
    const { datosAnulacion } = prepararAnulacionGRE(guia, EMPRESA, JSON.stringify(movimientos), 'motivo', 'user-1', fechaActual());
    expect(datosAnulacion?.movimientoIds).toEqual(['mov-1']);
    expect(datosAnulacion?.tipoDocumentoOrigen).toBe('guia_remision');
  });
});

describe('debeDescontarStockAutomaticamenteGRE — la configuración cambia realmente el comportamiento (GRE-P1-008)', () => {
  it('Inventario activo + regla "automatico" → dispara la salida', () => {
    expect(debeDescontarStockAutomaticamenteGRE(true, 'automatico')).toBe(true);
  });

  it('Inventario activo + regla "nota_salida" → NO dispara la salida (el despacho queda en el flujo de NS)', () => {
    expect(debeDescontarStockAutomaticamenteGRE(true, 'nota_salida')).toBe(false);
  });

  it('Inventario activo + regla "sin_control" → NO dispara la salida', () => {
    expect(debeDescontarStockAutomaticamenteGRE(true, 'sin_control')).toBe(false);
  });

  it('Inventario inactivo → NUNCA dispara la salida, sin importar la regla de documento (el switch maestro manda)', () => {
    expect(debeDescontarStockAutomaticamenteGRE(false, 'automatico')).toBe(false);
    expect(debeDescontarStockAutomaticamenteGRE(undefined, 'automatico')).toBe(false);
  });

  it('sin ninguna regla configurada (undefined), no dispara la salida — nunca se asume "automatico" por defecto en esta función pura', () => {
    expect(debeDescontarStockAutomaticamenteGRE(true, undefined)).toBe(false);
  });
});

// ─── Integración real con el motor central (ServicioKardexValorizado) ──────

describe('Integración GRE ↔ ServicioKardexValorizado — modo cuantitativo (GRE-P1-008)', () => {
  it('emitir una GRE automática descuenta exactamente la cantidad, en el almacén y tenant correctos', async () => {
    sembrarProductos(EMPRESA, [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    const guia = crearGuia({ bienes: [crearBien({ cantidad: 5 })] });
    const productsMap = new Map([['prod-1', crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]]);
    const { lineas } = construirLineasSalidaGRE(guia, productsMap, [crearAlmacen()]);
    const datos = construirDatosOperacionSalidaGRE({ guia, lineas, empresaId: EMPRESA, usuario: 'user-1', fecha: fechaActual(), estadoValorizacion: 'no_iniciada' });

    const resultado = await ServicioKardexValorizado.registrarSalidaValorizada(datos, {
      almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada', controlStockActivo: true,
    });

    expect(resultado.estado).toBe('nueva');
    expect(resultado.movimientos).toHaveLength(1);
    expect(resultado.movimientos[0].tipo).toBe('SALIDA');
    expect(resultado.movimientos[0].cantidad).toBe(5);
    expect(resultado.movimientos[0].almacenId).toBe('alm-1');
    expect(resultado.movimientos[0].documentoOrigenId).toBe('gre-1');
    expect(resultado.movimientos[0].tipoDocumentoOrigen).toBe('guia_remision');

    const productos = leerProductos(EMPRESA);
    expect(productos[0].stockPorAlmacen['alm-1']).toBe(15);
  });

  it('multiempresa: la salida de la GRE de la empresa A nunca toca el stock de la empresa B', async () => {
    sembrarProductos(EMPRESA, [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]);
    sembrarProductos(OTRA_EMPRESA, [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    const guia = crearGuia();
    const productsMap = new Map([['prod-1', crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]]);
    const { lineas } = construirLineasSalidaGRE(guia, productsMap, [crearAlmacen()]);
    const datos = construirDatosOperacionSalidaGRE({ guia, lineas, empresaId: EMPRESA, usuario: 'user-1', fecha: fechaActual(), estadoValorizacion: 'no_iniciada' });

    await ServicioKardexValorizado.registrarSalidaValorizada(datos, {
      almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada', controlStockActivo: true,
    });

    expect(leerProductos(EMPRESA)[0].stockPorAlmacen['alm-1']).toBe(15);
    expect(leerProductos(OTRA_EMPRESA)[0].stockPorAlmacen['alm-1']).toBe(20);
  });

  it('idempotencia: reintentar la MISMA emisión (mismos datos) nunca duplica el movimiento ni el descuento', async () => {
    sembrarProductos(EMPRESA, [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    const guia = crearGuia();
    const productsMap = new Map([['prod-1', crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]]);
    const { lineas } = construirLineasSalidaGRE(guia, productsMap, [crearAlmacen()]);
    const datos = construirDatosOperacionSalidaGRE({ guia, lineas, empresaId: EMPRESA, usuario: 'user-1', fecha: fechaActual(), estadoValorizacion: 'no_iniciada' });
    const dependencias = { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' as const, controlStockActivo: true };

    const primera = await ServicioKardexValorizado.registrarSalidaValorizada(datos, dependencias);
    const segunda = await ServicioKardexValorizado.registrarSalidaValorizada(datos, dependencias);

    expect(primera.estado).toBe('nueva');
    expect(segunda.estado).toBe('repetida');
    expect(segunda.movimientos).toHaveLength(0);
    expect(leerProductos(EMPRESA)[0].stockPorAlmacen['alm-1']).toBe(15); // no 10 — el descuento no se duplicó
    expect(leerMovimientos(EMPRESA)).toHaveLength(1);
  });

  it('Inventario inactivo (controlStockActivo=false): la operación se rechaza y no se crea ningún movimiento', async () => {
    sembrarProductos(EMPRESA, [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    const guia = crearGuia();
    const productsMap = new Map([['prod-1', crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]]);
    const { lineas } = construirLineasSalidaGRE(guia, productsMap, [crearAlmacen()]);
    const datos = construirDatosOperacionSalidaGRE({ guia, lineas, empresaId: EMPRESA, usuario: 'user-1', fecha: fechaActual(), estadoValorizacion: 'no_iniciada' });

    await expect(
      ServicioKardexValorizado.registrarSalidaValorizada(datos, {
        almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada', controlStockActivo: false,
      }),
    ).rejects.toThrow(/inactivo/);

    expect(leerProductos(EMPRESA)[0].stockPorAlmacen['alm-1']).toBe(20);
    expect(leerMovimientos(EMPRESA)).toHaveLength(0);
  });
});

describe('Integración GRE ↔ ServicioKardexValorizado — modo valorizado FIFO (GRE-P1-008)', () => {
  it('la salida automática consume capas FIFO reales — GRE no implementa FIFO propio, solo lo dispara', async () => {
    sembrarProductos(EMPRESA, [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]);
    guardarCapaCostoInventario({
      id: 'capa-1', empresaId: EMPRESA, establecimientoId: ESTABLECIMIENTO, productoId: 'prod-1', almacenId: 'alm-1',
      movimientoEntradaId: 'mov-ni-1', tipoDocumentoOrigen: 'nota_ingreso', documentoOrigenId: 'ni-1',
      cantidadInicial: 20, cantidadDisponible: 20, costoUnitarioBaseOriginal: 12.5, costoUnitarioBaseMonedaBase: 12.5,
      valorValorizableOriginal: 250, valorValorizableMonedaBase: 250, monedaBase: 'PEN', monedaOriginal: 'PEN',
      tipoCambioAplicado: 1, fechaTipoCambio: '2026-01-01', fechaEntrada: '2026-01-01T00:00:00.000Z',
      estado: 'disponible', procedencia: 'compra', usuario: 'user-1', fechaCreacion: '2026-01-01T00:00:00.000Z',
    }, EMPRESA);

    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    const guia = crearGuia({ bienes: [crearBien({ cantidad: 5 })] });
    const productsMap = new Map([['prod-1', crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]]);
    const { lineas } = construirLineasSalidaGRE(guia, productsMap, [crearAlmacen()]);
    const datos = construirDatosOperacionSalidaGRE({ guia, lineas, empresaId: EMPRESA, usuario: 'user-1', fecha: fechaActual(), estadoValorizacion: 'activa' });
    expect(datos.modoOperacion).toBe('valorizado');

    const resultado = await ServicioKardexValorizado.registrarSalidaValorizada(datos, {
      almacenes, generarId, fechaActual, estadoValorizacion: 'activa', controlStockActivo: true, valorizacionHabilitada: true,
    });

    const capaFinal = listarCapasCostoInventarioPorEmpresa(EMPRESA).find((c) => c.id === 'capa-1');
    expect(capaFinal?.cantidadDisponible).toBe(15);
    const consumos = listarConsumosPorMovimientoSalida(resultado.movimientos[0].id, EMPRESA);
    expect(consumos).toHaveLength(1);
    expect(consumos[0].cantidadConsumida).toBe(5);
    expect(consumos[0].costoUnitarioBaseMonedaBase).toBe(12.5);
  });
});

describe('Integración GRE ↔ ServicioKardexValorizado — anulación (GRE-P1-008)', () => {
  async function emitirGREDePrueba() {
    sembrarProductos(EMPRESA, [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    const guia = crearGuia();
    const productsMap = new Map([['prod-1', crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]]);
    const { lineas } = construirLineasSalidaGRE(guia, productsMap, [crearAlmacen()]);
    const datos = construirDatosOperacionSalidaGRE({ guia, lineas, empresaId: EMPRESA, usuario: 'user-1', fecha: fechaActual(), estadoValorizacion: 'no_iniciada' });
    await ServicioKardexValorizado.registrarSalidaValorizada(datos, {
      almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada', controlStockActivo: true,
    });
    return { guia, almacenes };
  }

  it('anular una GRE que produjo movimiento revierte el stock exactamente una vez', async () => {
    const { guia, almacenes } = await emitirGREDePrueba();
    expect(leerProductos(EMPRESA)[0].stockPorAlmacen['alm-1']).toBe(15);

    const movimientosRaw = localStorage.getItem(lsKey(STORAGE_KEY_MOVEMENTS, EMPRESA));
    const { datosAnulacion } = prepararAnulacionGRE(guia, EMPRESA, movimientosRaw, 'Error de digitación', 'user-1', fechaActual());
    expect(datosAnulacion).not.toBeNull();

    await ServicioKardexValorizado.anularDocumentoValorizado(datosAnulacion!, {
      almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada', controlStockActivo: true, valorizacionHabilitada: true,
    });

    expect(leerProductos(EMPRESA)[0].stockPorAlmacen['alm-1']).toBe(20);
  });

  it('repetir la anulación (misma clave) nunca duplica la reversión', async () => {
    const { guia, almacenes } = await emitirGREDePrueba();
    const movimientosRaw = localStorage.getItem(lsKey(STORAGE_KEY_MOVEMENTS, EMPRESA));
    const { datosAnulacion } = prepararAnulacionGRE(guia, EMPRESA, movimientosRaw, 'motivo', 'user-1', fechaActual());
    const dependencias = { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' as const, controlStockActivo: true, valorizacionHabilitada: true };

    const primeraAnulacion = await ServicioKardexValorizado.anularDocumentoValorizado(datosAnulacion!, dependencias);
    const segundaAnulacion = await ServicioKardexValorizado.anularDocumentoValorizado(datosAnulacion!, dependencias);

    expect(primeraAnulacion.estado).toBe('nueva');
    expect(segundaAnulacion.estado).toBe('repetida');
    expect(leerProductos(EMPRESA)[0].stockPorAlmacen['alm-1']).toBe(20); // no 25 — la reversión no se duplicó
  });

  it('una GRE que no produjo movimiento (sin bienes inventariables) no genera una reversión inventada al anular', async () => {
    sembrarProductos(EMPRESA, [crearProducto({ tipoExistencia: 'SERVICIOS' })]);
    const guia = crearGuia();
    const { datosAnulacion } = prepararAnulacionGRE(guia, EMPRESA, null, 'motivo', 'user-1', fechaActual());
    expect(datosAnulacion).toBeNull();
  });
});
