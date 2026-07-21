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
} from './useInventory';
import type { StockTransferData } from '../models';
import type { DatosTransferenciaInventario } from '../models/operacionTransferenciaInventario.types';
import { ServicioKardexValorizado } from '../services/servicioKardexValorizado';
import { PRODUCT_STORAGE_KEY } from '../../catalogo-articulos/utils/catalogStorage';
import type { Product } from '../../catalogo-articulos/models/types';
import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';
import type { StockAdjustmentData } from '../models';
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
    const resultado1 = await ServicioKardexValorizado.registrarEntradaValorizada(datos1, { almacenes, generarId, fechaActual });

    // "Recarga de pantalla" simulada: no se limpió la sesión (no hubo éxito reconocido todavía
    // desde la perspectiva de la UI) — una nueva obtención con el MISMO contenido debe reutilizar
    // el mismo operacionId, sin que ninguna variable de memoria haya sobrevivido.
    const operacionId2 = obtenerOperacionIdEstablePersistente(EMPRESA, data, () => crypto.randomUUID());
    expect(operacionId2).toBe(operacionId1);
    const datos2 = construirDatosAjustePositivo({ data, almacen, empresaId: EMPRESA, usuario: 'user-1', operacionId: operacionId2, fecha: fechaActual() });
    const resultado2 = await ServicioKardexValorizado.registrarEntradaValorizada(datos2, { almacenes, generarId, fechaActual });

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
      ServicioKardexValorizado.registrarEntradaValorizada(datos1, { almacenes, generarId, fechaActual })
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
    const datos1 = construirDatosAjusteNegativo({ data, almacen, empresaId: EMPRESA, usuario: 'user-1', operacionId: operacionId1, fecha: fechaActual() });
    const resultado1 = await ServicioKardexValorizado.registrarSalidaValorizada(datos1, { almacenes, generarId, fechaActual });

    const operacionId2 = obtenerOperacionIdEstablePersistenteAjusteNegativo(EMPRESA, data, () => crypto.randomUUID());
    expect(operacionId2).toBe(operacionId1);
    const datos2 = construirDatosAjusteNegativo({ data, almacen, empresaId: EMPRESA, usuario: 'user-1', operacionId: operacionId2, fecha: fechaActual() });
    const resultado2 = await ServicioKardexValorizado.registrarSalidaValorizada(datos2, { almacenes, generarId, fechaActual });

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
    const datos = construirDatosAjusteNegativo({ data, almacen, empresaId: EMPRESA, usuario: 'user-1', operacionId, fecha: fechaActual() });

    await expect(
      ServicioKardexValorizado.registrarSalidaValorizada(datos, { almacenes, generarId, fechaActual })
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
    const datos1 = construirDatosAjusteNegativo({ data, almacen: crearAlmacen(), empresaId: EMPRESA, usuario: 'user-1', operacionId: operacionId1, fecha: fechaActual() });

    await expect(
      ServicioKardexValorizado.registrarSalidaValorizada(datos1, { almacenes, generarId, fechaActual })
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
    const datos = construirDatosAjusteNegativo({ data, almacen, empresaId: EMPRESA, usuario: 'user-1', operacionId, fecha: fechaActual() });

    const resultado = await ServicioKardexValorizado.registrarSalidaValorizada(datos, { almacenes, generarId, fechaActual });

    expect(resultado.productosActualizados[0].stockReservadoOVPorEstablecimiento?.['est-1']).toBe(7);
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
    const resultado1 = await ServicioKardexValorizado.transferirStockValorizado(datos1, { almacenes, generarId, fechaActual });

    // "Doble clic": misma sesión, sin limpiar — reutiliza el mismo transferenciaId.
    const transferenciaId2 = obtenerTransferenciaIdEstablePersistente(EMPRESA, data, () => crypto.randomUUID());
    expect(transferenciaId2).toBe(transferenciaId1);
    const datos2: DatosTransferenciaInventario = { ...datos1, transferenciaId: transferenciaId2, claveIdempotencia: `TRANSFER-${transferenciaId2}` };
    const resultado2 = await ServicioKardexValorizado.transferirStockValorizado(datos2, { almacenes, generarId, fechaActual });

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
});
