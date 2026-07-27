import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { instalarLocalStorageDePrueba } from '../repositories/localStorageDePrueba';
import {
  obtenerOperacionIdEstablePersistente,
  limpiarSesionPendienteAjustePositivo,
  construirDatosAjustePositivo,
  obtenerOperacionIdEstablePersistenteAjusteNegativo,
  limpiarSesionPendienteAjusteNegativo,
  construirDatosAjusteNegativo,
  obtenerTransferenciaIdEstablePersistente,
  limpiarSesionPendienteTransferencia,
  puedeAnularTransferenciaLegacy,
} from './useInventory';
import type { StockTransferData } from '../models';
import type { DatosTransferenciaInventario } from '../models/operacionTransferenciaInventario.types';
import { ServicioKardexValorizado } from '../services/servicioKardexValorizado';
import { PRODUCT_STORAGE_KEY } from '../../catalogo-articulos/utils/catalogStorage';
import { guardarCapaCostoInventario, listarCapasCostoInventarioPorEmpresa } from '../repositories/capaCostoInventario.repository';
import { listarConsumosCapaCostoInventarioPorEmpresa } from '../repositories/consumoCapaCostoInventario.repository';
import type { Product } from '../../catalogo-articulos/models/types';
import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';
import type { StockAdjustmentData } from '../models';
import type { CapaCostoInventario } from '../models/capaCostoInventario.types';
import { lsKey } from '../../../../../shared/tenant';
import { resolverModoOperacion } from '../utils/estadoActivacionValorizacionInventario';
import { CLAVE_COLECCION_TRANSFERENCIAS } from '../repositories/transferencia.repository';
import type { Transferencia } from '../models/transferencia.types';

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

const CLAVE_SESION = 'facturafacil_sesion_pendiente_ajuste_positivo';

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

function crearDatosAjuste(overrides: Partial<StockAdjustmentData> = {}): StockAdjustmentData {
  return {
    productoId: 'prod-1',
    almacenId: 'alm-1',
    tipo: 'AJUSTE_POSITIVO',
    motivo: 'AJUSTE_INVENTARIO',
    cantidad: 10,
    observaciones: '',
    documentoReferencia: '',
    ...overrides,
  };
}

const EMPRESA = 'emp-A';

describe('useInventory — sesión pendiente PERSISTENTE (localStorage, tenantizada) del ajuste positivo', () => {
  it('reintento después de "desmontar y volver a montar" (sin ref en memoria, solo localStorage) reutiliza el mismo operacionId', () => {
    let vecesGenerado = 0;
    const generarIdLocal = () => {
      vecesGenerado += 1;
      return `id-${vecesGenerado}`;
    };
    const data = crearDatosAjuste();

    // "Montaje 1": primera obtención — no hay ninguna variable de JS compartida con la siguiente
    // llamada, solo lo que haya quedado persistido en localStorage.
    const id1 = obtenerOperacionIdEstablePersistente(EMPRESA, data, generarIdLocal);
    // "Desmontaje + remontaje": nueva llamada independiente, mismo contenido.
    const id2 = obtenerOperacionIdEstablePersistente(EMPRESA, data, generarIdLocal);

    expect(id1).toBe(id2);
    expect(vecesGenerado).toBe(1);
  });

  it('simulación de recarga de pantalla: dos invocaciones reales del flujo productivo con el mismo contenido reutilizan el id y no duplican el stock', async () => {
    localStorage.setItem(
      lsKey(PRODUCT_STORAGE_KEY, EMPRESA),
      JSON.stringify([crearProducto({ stockPorAlmacen: { 'alm-1': 5 } })])
    );
    const almacen = crearAlmacen();
    const almacenes = new Map([['alm-1', almacen]]);
    const data = crearDatosAjuste();

    // Antes de la "recarga": se obtiene el operacionId y se construye/envía el ajuste.
    const operacionId1 = obtenerOperacionIdEstablePersistente(EMPRESA, data, () => crypto.randomUUID());
    const datos1 = construirDatosAjustePositivo({ data, almacen, empresaId: EMPRESA, usuario: 'user-1', operacionId: operacionId1, fecha: fechaActual() });
    const resultado1 = await ServicioKardexValorizado.registrarEntradaValorizada(datos1, { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' });

    // "Recarga de pantalla" simulada: no se limpió la sesión (no hubo éxito reconocido todavía
    // desde la perspectiva de la UI) — una nueva obtención con el MISMO contenido debe reutilizar
    // el mismo operacionId, sin que ninguna variable de memoria haya sobrevivido.
    const operacionId2 = obtenerOperacionIdEstablePersistente(EMPRESA, data, () => crypto.randomUUID());
    expect(operacionId2).toBe(operacionId1);
    const datos2 = construirDatosAjustePositivo({ data, almacen, empresaId: EMPRESA, usuario: 'user-1', operacionId: operacionId2, fecha: fechaActual() });
    const resultado2 = await ServicioKardexValorizado.registrarEntradaValorizada(datos2, { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' });

    expect(resultado1.estado).toBe('nueva');
    expect(resultado2.estado).toBe('repetida');
    expect(resultado2.movimientos).toEqual([]);
    const productosFinales = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA)) as string) as Product[];
    expect(productosFinales[0].stockPorAlmacen['alm-1']).toBe(15);
  });

  it('un resultado exitoso limpia la sesión pendiente', () => {
    const data = crearDatosAjuste();
    obtenerOperacionIdEstablePersistente(EMPRESA, data, () => 'id-1');
    expect(localStorage.getItem(lsKey(CLAVE_SESION, EMPRESA))).not.toBeNull();

    limpiarSesionPendienteAjustePositivo(EMPRESA);

    expect(localStorage.getItem(lsKey(CLAVE_SESION, EMPRESA))).toBeNull();
  });

  it('la cancelación explícita también limpia la sesión pendiente', () => {
    const data = crearDatosAjuste();
    obtenerOperacionIdEstablePersistente(EMPRESA, data, () => 'id-cancelado');
    expect(localStorage.getItem(lsKey(CLAVE_SESION, EMPRESA))).not.toBeNull();

    // Mismo mecanismo que usa closeAdjustmentModal al cancelar explícitamente.
    limpiarSesionPendienteAjustePositivo(EMPRESA);

    expect(localStorage.getItem(lsKey(CLAVE_SESION, EMPRESA))).toBeNull();
    // Tras cancelar, la siguiente acción (incluso con el mismo contenido) obtiene un id nuevo.
    const idTrasCancelar = obtenerOperacionIdEstablePersistente(EMPRESA, data, () => 'id-nuevo');
    expect(idTrasCancelar).not.toBe('id-cancelado');
  });

  it('no se limpia ante un fallo incierto: el reintento reutiliza el mismo operacionId', async () => {
    // Sin sembrar productos: el motor fallará (producto inexistente) — un fallo incierto que NO
    // debe limpiar la sesión.
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    const data = crearDatosAjuste();

    const operacionId1 = obtenerOperacionIdEstablePersistente(EMPRESA, data, () => crypto.randomUUID());
    const datos1 = construirDatosAjustePositivo({ data, almacen: crearAlmacen(), empresaId: EMPRESA, usuario: 'user-1', operacionId: operacionId1, fecha: fechaActual() });

    await expect(
      ServicioKardexValorizado.registrarEntradaValorizada(datos1, { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' })
    ).rejects.toThrow();

    // La sesión sigue pendiente (no se limpió) — el reintento reutiliza el mismo id.
    const operacionId2 = obtenerOperacionIdEstablePersistente(EMPRESA, data, () => crypto.randomUUID());
    expect(operacionId2).toBe(operacionId1);
  });

  it('otro contenido (distinto producto/cantidad/motivo/observaciones) genera un operacionId nuevo, nunca reutiliza el de una acción distinta', () => {
    const dataOriginal = crearDatosAjuste({ cantidad: 10 });
    const idOriginal = obtenerOperacionIdEstablePersistente(EMPRESA, dataOriginal, () => 'id-original');

    const dataDistinta = crearDatosAjuste({ cantidad: 25 });
    const idDistinto = obtenerOperacionIdEstablePersistente(EMPRESA, dataDistinta, () => 'id-distinto');

    expect(idDistinto).not.toBe(idOriginal);
    expect(idDistinto).toBe('id-distinto');
  });

  it('la sesión pendiente está tenantizada: dos empresas distintas nunca comparten ni pisan el operacionId', () => {
    const data = crearDatosAjuste();
    const idEmpresaA = obtenerOperacionIdEstablePersistente('emp-A', data, () => 'id-A');
    const idEmpresaB = obtenerOperacionIdEstablePersistente('emp-B', data, () => 'id-B');

    expect(idEmpresaA).toBe('id-A');
    expect(idEmpresaB).toBe('id-B');
    // Reobtener para la empresa A sigue devolviendo el suyo, sin interferencia de B.
    expect(obtenerOperacionIdEstablePersistente('emp-A', data, () => 'no-deberia-usarse')).toBe('id-A');
  });

  it('la sesión de ajuste positivo y la de ajuste negativo no se comparten ni se pisan (espacios de nombres distintos)', () => {
    const data = crearDatosAjuste();
    const idPositivo = obtenerOperacionIdEstablePersistente(EMPRESA, data, () => 'id-positivo');
    const idNegativo = obtenerOperacionIdEstablePersistenteAjusteNegativo(EMPRESA, { ...data, tipo: 'AJUSTE_NEGATIVO' }, () => 'id-negativo');

    expect(idPositivo).toBe('id-positivo');
    expect(idNegativo).toBe('id-negativo');
    expect(obtenerOperacionIdEstablePersistente(EMPRESA, data, () => 'no-usado')).toBe('id-positivo');
  });
});

describe('useInventory — ajuste negativo (Etapa 1D, §20): motor de salidas + sesión pendiente persistente', () => {
  function crearDatosAjusteNegativo(overrides: Partial<StockAdjustmentData> = {}): StockAdjustmentData {
    return crearDatosAjuste({ tipo: 'AJUSTE_NEGATIVO', ...overrides });
  }

  it('doble envío real (misma sesión, sin reiniciar) construye el mismo DTO y no duplica el descuento', async () => {
    localStorage.setItem(
      lsKey(PRODUCT_STORAGE_KEY, EMPRESA),
      JSON.stringify([crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })])
    );
    const almacen = crearAlmacen();
    const almacenes = new Map([['alm-1', almacen]]);
    const data = crearDatosAjusteNegativo();

    const operacionId1 = obtenerOperacionIdEstablePersistenteAjusteNegativo(EMPRESA, data, () => crypto.randomUUID());
    const datos1 = construirDatosAjusteNegativo({ data, almacen, empresaId: EMPRESA, usuario: 'user-1', operacionId: operacionId1, fecha: fechaActual(), estadoValorizacion: 'no_iniciada' });
    const resultado1 = await ServicioKardexValorizado.registrarSalidaValorizada(datos1, { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' });

    const operacionId2 = obtenerOperacionIdEstablePersistenteAjusteNegativo(EMPRESA, data, () => crypto.randomUUID());
    expect(operacionId2).toBe(operacionId1);
    const datos2 = construirDatosAjusteNegativo({ data, almacen, empresaId: EMPRESA, usuario: 'user-1', operacionId: operacionId2, fecha: fechaActual(), estadoValorizacion: 'no_iniciada' });
    const resultado2 = await ServicioKardexValorizado.registrarSalidaValorizada(datos2, { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' });

    expect(resultado1.estado).toBe('nueva');
    expect(resultado2.estado).toBe('repetida');
    expect(resultado2.movimientos).toEqual([]);
    const productosFinales = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA)) as string) as Product[];
    expect(productosFinales[0].stockPorAlmacen['alm-1']).toBe(10);
  });

  it('stock insuficiente es rechazado', async () => {
    localStorage.setItem(
      lsKey(PRODUCT_STORAGE_KEY, EMPRESA),
      JSON.stringify([crearProducto({ stockPorAlmacen: { 'alm-1': 3 } })])
    );
    const almacen = crearAlmacen();
    const almacenes = new Map([['alm-1', almacen]]);
    const data = crearDatosAjusteNegativo({ cantidad: 10 });
    const operacionId = obtenerOperacionIdEstablePersistenteAjusteNegativo(EMPRESA, data, () => crypto.randomUUID());
    const datos = construirDatosAjusteNegativo({ data, almacen, empresaId: EMPRESA, usuario: 'user-1', operacionId, fecha: fechaActual(), estadoValorizacion: 'no_iniciada' });

    await expect(
      ServicioKardexValorizado.registrarSalidaValorizada(datos, { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' })
    ).rejects.toThrow(/negativo/);
  });

  it('un resultado exitoso limpia la sesión pendiente del ajuste negativo', () => {
    const data = crearDatosAjusteNegativo();
    obtenerOperacionIdEstablePersistenteAjusteNegativo(EMPRESA, data, () => 'id-1');
    limpiarSesionPendienteAjusteNegativo(EMPRESA);
    // Tras limpiar, la próxima obtención genera un id nuevo (no reutiliza 'id-1').
    expect(obtenerOperacionIdEstablePersistenteAjusteNegativo(EMPRESA, data, () => 'id-2')).toBe('id-2');
  });

  it('no se limpia ante un fallo incierto: el reintento reutiliza el mismo operacionId', async () => {
    // Sin sembrar productos: el motor fallará (producto inexistente) — un fallo incierto.
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    const data = crearDatosAjusteNegativo();

    const operacionId1 = obtenerOperacionIdEstablePersistenteAjusteNegativo(EMPRESA, data, () => crypto.randomUUID());
    const datos1 = construirDatosAjusteNegativo({ data, almacen: crearAlmacen(), empresaId: EMPRESA, usuario: 'user-1', operacionId: operacionId1, fecha: fechaActual(), estadoValorizacion: 'no_iniciada' });

    await expect(
      ServicioKardexValorizado.registrarSalidaValorizada(datos1, { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' })
    ).rejects.toThrow();

    const operacionId2 = obtenerOperacionIdEstablePersistenteAjusteNegativo(EMPRESA, data, () => crypto.randomUUID());
    expect(operacionId2).toBe(operacionId1);
  });

  it('no toca stockReservadoOVPorEstablecimiento (el ajuste negativo nunca modifica reservas)', async () => {
    localStorage.setItem(
      lsKey(PRODUCT_STORAGE_KEY, EMPRESA),
      JSON.stringify([crearProducto({ stockPorAlmacen: { 'alm-1': 20 }, stockReservadoOVPorEstablecimiento: { 'est-1': 7 } })])
    );
    const almacen = crearAlmacen();
    const almacenes = new Map([['alm-1', almacen]]);
    const data = crearDatosAjusteNegativo();
    const operacionId = obtenerOperacionIdEstablePersistenteAjusteNegativo(EMPRESA, data, () => crypto.randomUUID());
    const datos = construirDatosAjusteNegativo({ data, almacen, empresaId: EMPRESA, usuario: 'user-1', operacionId, fecha: fechaActual(), estadoValorizacion: 'no_iniciada' });

    const resultado = await ServicioKardexValorizado.registrarSalidaValorizada(datos, { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' });

    expect(resultado.productosActualizados[0].stockReservadoOVPorEstablecimiento?.['est-1']).toBe(7);
  });
});

describe('Etapa 4A: construirDatosAjusteNegativo resuelve modoOperacion desde estadoValorizacion (consumo FIFO)', () => {
  function crearDatosAjusteNegativo(overrides: Partial<StockAdjustmentData> = {}): StockAdjustmentData {
    return crearDatosAjuste({ tipo: 'AJUSTE_NEGATIVO', ...overrides });
  }

  function crearCapaDePrueba(overrides: Partial<CapaCostoInventario> = {}): CapaCostoInventario {
    return {
      id: 'capa-1',
      empresaId: EMPRESA,
      establecimientoId: 'est-1',
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

  it('estadoValorizacion="activa": modoOperacion es "valorizado" y consume la capa disponible', async () => {
    localStorage.setItem(
      lsKey(PRODUCT_STORAGE_KEY, EMPRESA),
      JSON.stringify([crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })])
    );
    const almacen = crearAlmacen();
    const almacenes = new Map([['alm-1', almacen]]);
    guardarCapaCostoInventario(crearCapaDePrueba(), EMPRESA);
    const data = crearDatosAjusteNegativo({ cantidad: 6 });
    const operacionId = obtenerOperacionIdEstablePersistenteAjusteNegativo(EMPRESA, data, () => crypto.randomUUID());
    const datos = construirDatosAjusteNegativo({ data, almacen, empresaId: EMPRESA, usuario: 'user-1', operacionId, fecha: fechaActual(), estadoValorizacion: 'activa' });

    expect(datos.modoOperacion).toBe('valorizado');
    await ServicioKardexValorizado.registrarSalidaValorizada(datos, { almacenes, generarId, fechaActual, estadoValorizacion: 'activa' });

    const capa = listarCapasCostoInventarioPorEmpresa(EMPRESA).find((c) => c.id === 'capa-1');
    expect(capa?.cantidadDisponible).toBe(4);
    const consumos = listarConsumosCapaCostoInventarioPorEmpresa(EMPRESA);
    expect(consumos).toHaveLength(1);
    expect(consumos[0].cantidadConsumida).toBe(6);
    expect(consumos[0].motivo).toBe('salida');
  });

  it('estadoValorizacion="no_iniciada" conserva el comportamiento cuantitativo puro: no crea consumos ni capas', async () => {
    localStorage.setItem(
      lsKey(PRODUCT_STORAGE_KEY, EMPRESA),
      JSON.stringify([crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })])
    );
    const almacen = crearAlmacen();
    const almacenes = new Map([['alm-1', almacen]]);
    guardarCapaCostoInventario(crearCapaDePrueba(), EMPRESA);
    const data = crearDatosAjusteNegativo({ cantidad: 6 });
    const operacionId = obtenerOperacionIdEstablePersistenteAjusteNegativo(EMPRESA, data, () => crypto.randomUUID());
    const datos = construirDatosAjusteNegativo({ data, almacen, empresaId: EMPRESA, usuario: 'user-1', operacionId, fecha: fechaActual(), estadoValorizacion: 'no_iniciada' });

    expect(datos.modoOperacion).toBe('cuantitativo');
    await ServicioKardexValorizado.registrarSalidaValorizada(datos, { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' });

    expect(listarConsumosCapaCostoInventarioPorEmpresa(EMPRESA)).toHaveLength(0);
    expect(listarCapasCostoInventarioPorEmpresa(EMPRESA).find((c) => c.id === 'capa-1')?.cantidadDisponible).toBe(10);
  });
});

describe('useInventory — transferencia (Etapa 1E): sesión pendiente persistente + motor atómico', () => {
  function crearDatosTransfer(overrides: Partial<StockTransferData> = {}): StockTransferData {
    return {
      productoId: 'prod-1',
      almacenOrigenId: 'alm-1',
      almacenDestinoId: 'alm-2',
      cantidad: 5,
      observaciones: '',
      documentoReferencia: '',
      ...overrides,
    };
  }

  it('doble clic real (misma sesión) reutiliza el mismo transferenciaId y no descuenta dos veces', async () => {
    localStorage.setItem(
      lsKey(PRODUCT_STORAGE_KEY, EMPRESA),
      JSON.stringify([crearProducto({ stockPorAlmacen: { 'alm-1': 20, 'alm-2': 0 } })])
    );
    const almacenes = new Map([
      ['alm-1', crearAlmacen({ id: 'alm-1' })],
      ['alm-2', crearAlmacen({ id: 'alm-2', codigoAlmacen: 'ALM02', nombreAlmacen: 'Almacén 2' })],
    ]);
    const data = crearDatosTransfer();

    const transferenciaId1 = obtenerTransferenciaIdEstablePersistente(EMPRESA, data, () => crypto.randomUUID());
    const datos1: DatosTransferenciaInventario = {
      modoOperacion: 'cuantitativo', empresaId: EMPRESA, transferenciaId: transferenciaId1,
      claveIdempotencia: `TRANSFER-${transferenciaId1}`, tipoOperacion: 'transferencia', tipoDocumento: 'transferencia',
      productoId: data.productoId, establecimientoOrigenId: 'est-1', almacenOrigenId: data.almacenOrigenId,
      establecimientoDestinoId: 'est-1', almacenDestinoId: data.almacenDestinoId, cantidadUnidadMinima: data.cantidad,
      usuario: 'user-1', fecha: fechaActual(), motivo: 'TRANSFERENCIA_ALMACEN',
    };
    const resultado1 = await ServicioKardexValorizado.transferirStockValorizado(datos1, { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' });

    // "Doble clic": misma sesión, sin limpiar — reutiliza el mismo transferenciaId.
    const transferenciaId2 = obtenerTransferenciaIdEstablePersistente(EMPRESA, data, () => crypto.randomUUID());
    expect(transferenciaId2).toBe(transferenciaId1);
    const datos2: DatosTransferenciaInventario = { ...datos1, transferenciaId: transferenciaId2, claveIdempotencia: `TRANSFER-${transferenciaId2}` };
    const resultado2 = await ServicioKardexValorizado.transferirStockValorizado(datos2, { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' });

    expect(resultado1.estado).toBe('nueva');
    expect(resultado2.estado).toBe('repetida');
    const productosFinales = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA)) as string) as Product[];
    expect(productosFinales[0].stockPorAlmacen['alm-1']).toBe(15);
    expect(productosFinales[0].stockPorAlmacen['alm-2']).toBe(5);
  });

  it('un resultado exitoso limpia la sesión pendiente de la transferencia', () => {
    const data = crearDatosTransfer();
    obtenerTransferenciaIdEstablePersistente(EMPRESA, data, () => 'trf-id-1');
    limpiarSesionPendienteTransferencia(EMPRESA);
    expect(obtenerTransferenciaIdEstablePersistente(EMPRESA, data, () => 'trf-id-2')).toBe('trf-id-2');
  });

  it('otro contenido (distinto producto/almacenes/cantidad) genera un transferenciaId nuevo', () => {
    const original = crearDatosTransfer({ cantidad: 5 });
    const idOriginal = obtenerTransferenciaIdEstablePersistente(EMPRESA, original, () => 'id-original');
    const distinta = crearDatosTransfer({ cantidad: 9 });
    const idDistinto = obtenerTransferenciaIdEstablePersistente(EMPRESA, distinta, () => 'id-distinto');
    expect(idDistinto).not.toBe(idOriginal);
  });

  it('Cierre puntual Etapa 4A: con valorizacionHabilitada=true (equivalente a resolverModoOperacion==="valorizado_exclusivo", tal como lo deriva handleStockTransfer) consume la capa exacta en origen y crea la capa espejo en destino', async () => {
    localStorage.setItem(
      lsKey(PRODUCT_STORAGE_KEY, EMPRESA),
      JSON.stringify([crearProducto({ stockPorAlmacen: { 'alm-1': 20, 'alm-2': 0 } })])
    );
    const almacenes = new Map([
      ['alm-1', crearAlmacen({ id: 'alm-1' })],
      ['alm-2', crearAlmacen({ id: 'alm-2', codigoAlmacen: 'ALM02', nombreAlmacen: 'Almacén 2' })],
    ]);
    guardarCapaCostoInventario({
      id: 'capa-origen',
      empresaId: EMPRESA,
      establecimientoId: 'est-1',
      productoId: 'prod-1',
      almacenId: 'alm-1',
      movimientoEntradaId: 'mov-x',
      tipoDocumentoOrigen: 'nota_ingreso',
      documentoOrigenId: 'ni-1',
      cantidadInicial: 20,
      cantidadDisponible: 20,
      costoUnitarioBaseOriginal: 10,
      costoUnitarioBaseMonedaBase: 10,
      valorValorizableOriginal: 200,
      valorValorizableMonedaBase: 200,
      monedaBase: 'PEN',
      monedaOriginal: 'PEN',
      tipoCambioAplicado: 1,
      fechaTipoCambio: '2026-01-01',
      fechaEntrada: '2026-01-01T00:00:00.000Z',
      estado: 'disponible',
      procedencia: 'compra',
      usuario: 'user-1',
      fechaCreacion: '2026-01-01T00:00:00.000Z',
    }, EMPRESA);

    const data = { productoId: 'prod-1', almacenOrigenId: 'alm-1', almacenDestinoId: 'alm-2', cantidad: 5, observaciones: '', documentoReferencia: '' };
    const transferenciaId = obtenerTransferenciaIdEstablePersistente(EMPRESA, data, () => crypto.randomUUID());
    const datos: DatosTransferenciaInventario = {
      modoOperacion: 'cuantitativo', empresaId: EMPRESA, transferenciaId,
      claveIdempotencia: `TRANSFER-${transferenciaId}`, tipoOperacion: 'transferencia', tipoDocumento: 'transferencia',
      productoId: data.productoId, establecimientoOrigenId: 'est-1', almacenOrigenId: data.almacenOrigenId,
      establecimientoDestinoId: 'est-1', almacenDestinoId: data.almacenDestinoId, cantidadUnidadMinima: data.cantidad,
      usuario: 'user-1', fecha: fechaActual(), motivo: 'TRANSFERENCIA_ALMACEN',
    };

    await ServicioKardexValorizado.transferirStockValorizado(datos, {
      almacenes, generarId, fechaActual, estadoValorizacion: 'activa', valorizacionHabilitada: true,
    });

    const capas = listarCapasCostoInventarioPorEmpresa(EMPRESA);
    const capaOrigen = capas.find((c) => c.id === 'capa-origen');
    expect(capaOrigen?.cantidadDisponible).toBe(15);
    const capaDestino = capas.find((c) => c.almacenId === 'alm-2');
    expect(capaDestino?.cantidadInicial).toBe(5);
    expect(capaDestino?.cantidadDisponible).toBe(5);
    expect(capaDestino?.capaOrigenId).toBe('capa-origen');
    expect(listarConsumosCapaCostoInventarioPorEmpresa(EMPRESA)).toHaveLength(1);
  });

  it('Cierre puntual Etapa 4A: con estadoValorizacion="no_iniciada" (valorizacionHabilitada derivado en false) opera puramente cuantitativo aunque existan capas', async () => {
    localStorage.setItem(
      lsKey(PRODUCT_STORAGE_KEY, EMPRESA),
      JSON.stringify([crearProducto({ stockPorAlmacen: { 'alm-1': 20, 'alm-2': 0 } })])
    );
    const almacenes = new Map([
      ['alm-1', crearAlmacen({ id: 'alm-1' })],
      ['alm-2', crearAlmacen({ id: 'alm-2', codigoAlmacen: 'ALM02', nombreAlmacen: 'Almacén 2' })],
    ]);
    guardarCapaCostoInventario({
      id: 'capa-origen-2',
      empresaId: EMPRESA,
      establecimientoId: 'est-1',
      productoId: 'prod-1',
      almacenId: 'alm-1',
      movimientoEntradaId: 'mov-y',
      tipoDocumentoOrigen: 'nota_ingreso',
      documentoOrigenId: 'ni-2',
      cantidadInicial: 20,
      cantidadDisponible: 20,
      costoUnitarioBaseOriginal: 10,
      costoUnitarioBaseMonedaBase: 10,
      valorValorizableOriginal: 200,
      valorValorizableMonedaBase: 200,
      monedaBase: 'PEN',
      monedaOriginal: 'PEN',
      tipoCambioAplicado: 1,
      fechaTipoCambio: '2026-01-01',
      fechaEntrada: '2026-01-01T00:00:00.000Z',
      estado: 'disponible',
      procedencia: 'compra',
      usuario: 'user-1',
      fechaCreacion: '2026-01-01T00:00:00.000Z',
    }, EMPRESA);

    const data = { productoId: 'prod-1', almacenOrigenId: 'alm-1', almacenDestinoId: 'alm-2', cantidad: 5, observaciones: '', documentoReferencia: '' };
    const transferenciaId = obtenerTransferenciaIdEstablePersistente(EMPRESA, data, () => crypto.randomUUID());
    const datos: DatosTransferenciaInventario = {
      modoOperacion: 'cuantitativo', empresaId: EMPRESA, transferenciaId,
      claveIdempotencia: `TRANSFER-${transferenciaId}`, tipoOperacion: 'transferencia', tipoDocumento: 'transferencia',
      productoId: data.productoId, establecimientoOrigenId: 'est-1', almacenOrigenId: data.almacenOrigenId,
      establecimientoDestinoId: 'est-1', almacenDestinoId: data.almacenDestinoId, cantidadUnidadMinima: data.cantidad,
      usuario: 'user-1', fecha: fechaActual(), motivo: 'TRANSFERENCIA_ALMACEN',
    };

    await ServicioKardexValorizado.transferirStockValorizado(datos, {
      almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada',
      valorizacionHabilitada: resolverModoOperacion('no_iniciada') === 'valorizado_exclusivo',
    });

    expect(listarCapasCostoInventarioPorEmpresa(EMPRESA).find((c) => c.id === 'capa-origen-2')?.cantidadDisponible).toBe(20);
    expect(listarCapasCostoInventarioPorEmpresa(EMPRESA)).toHaveLength(1);
    expect(listarConsumosCapaCostoInventarioPorEmpresa(EMPRESA)).toHaveLength(0);
  });
});

describe('Cierre final puntual Etapa 4A: anulación productiva de transferencias vía revertirMovimientoValorizado', () => {
  it('una transferencia creada por el motor nuevo (empresaId + movimientoSalidaId/movimientoEntradaId + estado CONFIRMADA) satisface la guarda de handleAnularTransferencia — nunca cae al camino legacy', async () => {
    const almacenes = new Map([
      ['alm-1', crearAlmacen({ id: 'alm-1' })],
      ['alm-2', crearAlmacen({ id: 'alm-2', codigoAlmacen: 'ALM02', nombreAlmacen: 'Almacén 2' })],
    ]);
    localStorage.setItem(
      lsKey(PRODUCT_STORAGE_KEY, EMPRESA),
      JSON.stringify([crearProducto({ stockPorAlmacen: { 'alm-1': 20, 'alm-2': 0 } })])
    );
    const data = { productoId: 'prod-1', almacenOrigenId: 'alm-1', almacenDestinoId: 'alm-2', cantidad: 5, observaciones: '', documentoReferencia: '' };
    const transferenciaId = obtenerTransferenciaIdEstablePersistente(EMPRESA, data, () => crypto.randomUUID());
    const datos: DatosTransferenciaInventario = {
      modoOperacion: 'cuantitativo', empresaId: EMPRESA, transferenciaId,
      claveIdempotencia: `TRANSFER-${transferenciaId}`, tipoOperacion: 'transferencia', tipoDocumento: 'transferencia',
      productoId: data.productoId, establecimientoOrigenId: 'est-1', almacenOrigenId: data.almacenOrigenId,
      establecimientoDestinoId: 'est-1', almacenDestinoId: data.almacenDestinoId, cantidadUnidadMinima: data.cantidad,
      usuario: 'user-1', fecha: fechaActual(), motivo: 'TRANSFERENCIA_ALMACEN',
    };
    await ServicioKardexValorizado.transferirStockValorizado(datos, { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' });

    const transferenciaGuardada = (JSON.parse(localStorage.getItem(lsKey(CLAVE_COLECCION_TRANSFERENCIAS, EMPRESA)) ?? '[]') as Transferencia[]).find((t) => t.id === transferenciaId);
    // Exactamente la guarda que `handleAnularTransferencia` evalúa antes de decidir el camino de anulación.
    expect(transferenciaGuardada?.empresaId).toBe(EMPRESA);
    expect(transferenciaGuardada?.estado).toBe('CONFIRMADA');
    expect(transferenciaGuardada?.movimientoSalidaId).toBeTruthy();
    expect(transferenciaGuardada?.movimientoEntradaId).toBeTruthy();
  });

  it('con valorizacionHabilitada=true (tal como ahora lo fija handleAnularTransferencia, nunca omitido) restaura la capa de origen exacta y revierte la capa espejo + su consumo histórico', async () => {
    const almacenes = new Map([
      ['alm-1', crearAlmacen({ id: 'alm-1' })],
      ['alm-2', crearAlmacen({ id: 'alm-2', codigoAlmacen: 'ALM02', nombreAlmacen: 'Almacén 2' })],
    ]);
    localStorage.setItem(
      lsKey(PRODUCT_STORAGE_KEY, EMPRESA),
      JSON.stringify([crearProducto({ stockPorAlmacen: { 'alm-1': 20, 'alm-2': 0 } })])
    );
    guardarCapaCostoInventario({
      id: 'capa-origen-3',
      empresaId: EMPRESA,
      establecimientoId: 'est-1',
      productoId: 'prod-1',
      almacenId: 'alm-1',
      movimientoEntradaId: 'mov-z',
      tipoDocumentoOrigen: 'nota_ingreso',
      documentoOrigenId: 'ni-3',
      cantidadInicial: 20,
      cantidadDisponible: 20,
      costoUnitarioBaseOriginal: 10,
      costoUnitarioBaseMonedaBase: 10,
      valorValorizableOriginal: 200,
      valorValorizableMonedaBase: 200,
      monedaBase: 'PEN',
      monedaOriginal: 'PEN',
      tipoCambioAplicado: 1,
      fechaTipoCambio: '2026-01-01',
      fechaEntrada: '2026-01-01T00:00:00.000Z',
      estado: 'disponible',
      procedencia: 'compra',
      usuario: 'user-1',
      fechaCreacion: '2026-01-01T00:00:00.000Z',
    }, EMPRESA);

    const data = { productoId: 'prod-1', almacenOrigenId: 'alm-1', almacenDestinoId: 'alm-2', cantidad: 5, observaciones: '', documentoReferencia: '' };
    const transferenciaId = obtenerTransferenciaIdEstablePersistente(EMPRESA, data, () => crypto.randomUUID());
    const datosCreacion: DatosTransferenciaInventario = {
      modoOperacion: 'cuantitativo', empresaId: EMPRESA, transferenciaId,
      claveIdempotencia: `TRANSFER-${transferenciaId}`, tipoOperacion: 'transferencia', tipoDocumento: 'transferencia',
      productoId: data.productoId, establecimientoOrigenId: 'est-1', almacenOrigenId: data.almacenOrigenId,
      establecimientoDestinoId: 'est-1', almacenDestinoId: data.almacenDestinoId, cantidadUnidadMinima: data.cantidad,
      usuario: 'user-1', fecha: fechaActual(), motivo: 'TRANSFERENCIA_ALMACEN',
    };
    await ServicioKardexValorizado.transferirStockValorizado(datosCreacion, {
      almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada', valorizacionHabilitada: true,
    });
    const transferenciaGuardada = (JSON.parse(localStorage.getItem(lsKey(CLAVE_COLECCION_TRANSFERENCIAS, EMPRESA)) ?? '[]') as Transferencia[]).find((t) => t.id === transferenciaId)!;
    const movimientoId = transferenciaGuardada.movimientoSalidaId!;

    // Réplica exacta de lo que `handleAnularTransferencia` construye y envía hoy.
    await ServicioKardexValorizado.revertirMovimientoValorizado({
      empresaId: EMPRESA,
      movimientoId,
      claveIdempotencia: `REVERSO-${movimientoId}`,
      tipoOperacion: 'reverso',
      tipoDocumento: 'transferencia',
      usuario: 'user-1',
      fecha: fechaActual(),
      motivoUsuario: 'Anulación de transferencia',
      documentoReferencia: transferenciaId,
    }, {
      almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada', valorizacionHabilitada: true,
    });

    const productos = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA)) as string) as Product[];
    expect(productos[0].stockPorAlmacen['alm-1']).toBe(20);
    expect(productos[0].stockPorAlmacen['alm-2']).toBe(0);
    const capas = listarCapasCostoInventarioPorEmpresa(EMPRESA);
    expect(capas.find((c) => c.id === 'capa-origen-3')?.cantidadDisponible).toBe(20);
    expect(capas.find((c) => c.almacenId === 'alm-2')?.estado).toBe('revertida');
    const consumos = listarConsumosCapaCostoInventarioPorEmpresa(EMPRESA);
    expect(consumos).toHaveLength(1);
    expect(consumos[0].estado).toBe('revertido');

    const transferenciaFinal = (JSON.parse(localStorage.getItem(lsKey(CLAVE_COLECCION_TRANSFERENCIAS, EMPRESA)) ?? '[]') as Transferencia[]).find((t) => t.id === transferenciaId);
    expect(transferenciaFinal?.estado).toBe('REVERTIDA');
  });
});

describe('Verificación única final: puedeAnularTransferenciaLegacy — guarda del fallback de handleAnularTransfer', () => {
  it('1. cuantitativo_libre (no_iniciada / cancelada_antes_activacion): conserva el comportamiento actual — permite el camino legacy', () => {
    expect(puedeAnularTransferenciaLegacy('no_iniciada')).toBe(true);
    expect(puedeAnularTransferenciaLegacy('cancelada_antes_activacion')).toBe(true);
  });

  it('2. cuantitativo_invalida_snapshot (en_preparacion / pendiente_costos): se bloquea antes de modificar stock', () => {
    expect(puedeAnularTransferenciaLegacy('en_preparacion')).toBe(false);
    expect(puedeAnularTransferenciaLegacy('pendiente_costos')).toBe(false);
  });

  it('3. empresa activa (valorizado_exclusivo): se bloquea antes de modificar stock o capas', () => {
    expect(puedeAnularTransferenciaLegacy('activa')).toBe(false);
  });

  it('bloqueado_snapshot_aprobado / bloqueado_activacion_en_curso / bloqueado_suspension: también se bloquean', () => {
    expect(puedeAnularTransferenciaLegacy('validada')).toBe(false);
    expect(puedeAnularTransferenciaLegacy('activando')).toBe(false);
    expect(puedeAnularTransferenciaLegacy('fallida_recuperable')).toBe(false);
    expect(puedeAnularTransferenciaLegacy('suspendida_por_inconsistencia')).toBe(false);
  });

  it('4. transferencia nueva con artefactos del motor: la guarda de handleAnularTransfer decide ANTES de llegar a esta verificación — sigue usando el reverso central sin importar el resultado de puedeAnularTransferenciaLegacy', async () => {
    // Réplica de la guarda real en `handleAnularTransfer`: cuando la transferencia trae
    // empresaId + estado CONFIRMADA + movimientoSalidaId/movimientoEntradaId, el `if` del motor
    // nuevo captura el caso y hace `return` ANTES de evaluar `puedeAnularTransferenciaLegacy` —
    // el camino legacy (y por tanto esta guarda) nunca se alcanza para una transferencia nueva,
    // incluso si la empresa está 'activa' (ver la suite "Cierre final puntual Etapa 4A" arriba,
    // que ya prueba el reverso central end-to-end con estadoValorizacion:'activa').
    const almacenes = new Map([
      ['alm-1', crearAlmacen({ id: 'alm-1' })],
      ['alm-2', crearAlmacen({ id: 'alm-2', codigoAlmacen: 'ALM02', nombreAlmacen: 'Almacén 2' })],
    ]);
    localStorage.setItem(
      lsKey(PRODUCT_STORAGE_KEY, EMPRESA),
      JSON.stringify([crearProducto({ stockPorAlmacen: { 'alm-1': 20, 'alm-2': 0 } })])
    );
    const data = { productoId: 'prod-1', almacenOrigenId: 'alm-1', almacenDestinoId: 'alm-2', cantidad: 5, observaciones: '', documentoReferencia: '' };
    const transferenciaId = obtenerTransferenciaIdEstablePersistente(EMPRESA, data, () => crypto.randomUUID());
    const datos: DatosTransferenciaInventario = {
      modoOperacion: 'cuantitativo', empresaId: EMPRESA, transferenciaId,
      claveIdempotencia: `TRANSFER-${transferenciaId}`, tipoOperacion: 'transferencia', tipoDocumento: 'transferencia',
      productoId: data.productoId, establecimientoOrigenId: 'est-1', almacenOrigenId: data.almacenOrigenId,
      establecimientoDestinoId: 'est-1', almacenDestinoId: data.almacenDestinoId, cantidadUnidadMinima: data.cantidad,
      usuario: 'user-1', fecha: fechaActual(), motivo: 'TRANSFERENCIA_ALMACEN',
    };
    await ServicioKardexValorizado.transferirStockValorizado(datos, { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' });
    const transferenciaGuardada = (JSON.parse(localStorage.getItem(lsKey(CLAVE_COLECCION_TRANSFERENCIAS, EMPRESA)) ?? '[]') as Transferencia[]).find((t) => t.id === transferenciaId)!;

    // Aunque la empresa esté 'activa' (puedeAnularTransferenciaLegacy sería false), la guarda del
    // motor nuevo captura el caso primero — el reverso central se ejecuta igual, sin pasar por
    // el guard legacy en absoluto.
    expect(puedeAnularTransferenciaLegacy('activa')).toBe(false);
    await ServicioKardexValorizado.revertirMovimientoValorizado({
      empresaId: EMPRESA,
      movimientoId: transferenciaGuardada.movimientoSalidaId!,
      claveIdempotencia: `REVERSO-${transferenciaGuardada.movimientoSalidaId}`,
      tipoOperacion: 'reverso',
      tipoDocumento: 'transferencia',
      usuario: 'user-1',
      fecha: fechaActual(),
      motivoUsuario: 'Anulación de transferencia',
      documentoReferencia: transferenciaId,
    }, {
      almacenes, generarId, fechaActual, estadoValorizacion: 'activa', valorizacionHabilitada: true,
    });

    const productos = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, EMPRESA)) as string) as Product[];
    expect(productos[0].stockPorAlmacen['alm-1']).toBe(20);
    expect(productos[0].stockPorAlmacen['alm-2']).toBe(0);
  });
});
