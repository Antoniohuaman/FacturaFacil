import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { instalarLocalStorageDePrueba } from '../repositories/localStorageDePrueba';
import { ServicioKardexValorizado } from './servicioKardexValorizado';
import { ConflictoIdempotencia } from '../utils/erroresInventario';
import { PRODUCT_STORAGE_KEY } from '../../catalogo-articulos/utils/catalogStorage';
import {
  CLAVE_COLECCION_OPERACIONES_IDEMPOTENTES,
  buscarOperacionIdempotentePorClave,
} from '../repositories/operacionIdempotenteInventario.repository';
import { obtenerEstadoVersionInventario } from '../repositories/estadoVersionInventario.repository';
import type { DatosOperacionEntradaCuantitativa, DatosOperacionSalidaCuantitativa } from '../models/operacionEntradaInventario.types';
import type { OperacionIdempotenteInventario } from '../models/operacionIdempotenteInventario.types';
import type { DatosTransferenciaInventario } from '../models/operacionTransferenciaInventario.types';
import type { DatosReversoInventario, DatosAnulacionDocumentoInventario } from '../models/operacionReversoInventario.types';
import type { Product } from '../../catalogo-articulos/models/types';
import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';
import type { EstadoActivacionValorizacion } from '../models/estadoActivacionValorizacion.types';
import type { ValorizacionInicialInventario } from '../models/valorizacionInicialInventario.types';
import {
  guardarValorizacionInicialInventario,
  obtenerLoteActivoPorEmpresa,
  CLAVE_COLECCION_VALORIZACION_INICIAL_INVENTARIO,
} from '../repositories/valorizacionInicialInventario.repository';
import { listarInvalidacionesPendientes } from '../repositories/invalidacionPendienteValorizacionInicial.repository';
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

function sembrarProductos(empresaId: string, productos: Product[]): void {
  localStorage.setItem(lsKey(PRODUCT_STORAGE_KEY, empresaId), JSON.stringify(productos));
}

function sembrarOperacionDePrueba(empresaId: string, operacion: OperacionIdempotenteInventario): void {
  const clave = lsKey(CLAVE_COLECCION_OPERACIONES_IDEMPOTENTES, empresaId);
  const actuales = JSON.parse(localStorage.getItem(clave) ?? '[]') as OperacionIdempotenteInventario[];
  localStorage.setItem(clave, JSON.stringify([...actuales, operacion]));
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

describe('ServicioKardexValorizado.registrarEntradaValorizada — modo valorizado rechazado fuera de ajuste_positivo', () => {
  it('rechaza modoOperacion "valorizado" para tipoOperacion distinto de "ajuste_positivo" (Etapa 2, §10) sin reservar ni mutar nada', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 5 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    // 'valorizado' SÍ es un modoOperacion válido en el tipo (Etapa 2) — pero el motor de entradas
    // solo lo acepta para tipoOperacion==='ajuste_positivo'; aquí se prueba con 'ni_automatica'
    // (heredado de datosBase()) para verificar el rechazo en tiempo de ejecución.
    const datosInvalidos: DatosOperacionEntradaCuantitativa = { ...datosBase(), modoOperacion: 'valorizado' };

    await expect(
      ServicioKardexValorizado.registrarEntradaValorizada(datosInvalidos, { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' })
    ).rejects.toThrow(/ajuste_positivo/);

    expect(localStorage.getItem(lsKey(CLAVE_COLECCION_OPERACIONES_IDEMPOTENTES, empresaId))).toBeNull();
    const productos = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productos[0].stockPorAlmacen['alm-1']).toBe(5);
  });

  it('rechaza un valor de modoOperacion completamente inválido (ni cuantitativo ni valorizado)', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 5 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    // @ts-expect-error — ningún valor fuera de 'cuantitativo'/'valorizado' es válido; se fuerza
    // deliberadamente (sin cast) para probar el rechazo en tiempo de ejecución, no solo en tipos.
    const datosInvalidos: DatosOperacionEntradaCuantitativa = { ...datosBase(), modoOperacion: 'otro' };

    await expect(
      ServicioKardexValorizado.registrarEntradaValorizada(datosInvalidos, { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' })
    ).rejects.toThrow(/cuantitativ|valorizad/);

    expect(localStorage.getItem(lsKey(CLAVE_COLECCION_OPERACIONES_IDEMPOTENTES, empresaId))).toBeNull();
  });
});

describe('ServicioKardexValorizado.registrarEntradaValorizada — idempotencia', () => {
  it('primera ejecución crea movimientos y actualiza el stock', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 5 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    const resultado = await ServicioKardexValorizado.registrarEntradaValorizada(datosBase({ empresaId }), {
      almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada',
    });

    expect(resultado.estado).toBe('nueva');
    expect(resultado.movimientos).toHaveLength(1);
    expect(resultado.productosActualizados[0].stockPorAlmacen?.['alm-1']).toBe(15);
    expect(obtenerEstadoVersionInventario(empresaId)?.versionInventario).toBe(1);
  });

  it('doble ejecución con el mismo hash (doble clic / reintento tras recarga) no duplica movimientos', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 5 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    const datos = datosBase({ empresaId });

    const primero = await ServicioKardexValorizado.registrarEntradaValorizada(datos, { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' });
    const segundo = await ServicioKardexValorizado.registrarEntradaValorizada(datos, { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' });

    expect(segundo.estado).toBe('repetida');
    expect(segundo.resultadoIds).toEqual(primero.resultadoIds);
    expect(segundo.movimientos).toEqual([]);

    const productos = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productos[0].stockPorAlmacen['alm-1']).toBe(15);
    expect(obtenerEstadoVersionInventario(empresaId)?.versionInventario).toBe(1);
  });

  it('misma clave con hash distinto (datos cambiados) rechaza con ConflictoIdempotencia', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 5 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    await ServicioKardexValorizado.registrarEntradaValorizada(datosBase({ empresaId }), { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' });

    const datosCambiados = datosBase({
      empresaId,
      lineas: [{ lineaId: 'linea-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 99 }],
    });

    await expect(
      ServicioKardexValorizado.registrarEntradaValorizada(datosCambiados, { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' })
    ).rejects.toThrow(ConflictoIdempotencia);
  });

  it('misma clave con el mismo conjunto de líneas pero distinto motivo rechaza con ConflictoIdempotencia (el motivo cambia el significado del movimiento)', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 5 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    await ServicioKardexValorizado.registrarEntradaValorizada(datosBase({ empresaId, motivo: 'COMPRA' }), { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' });

    await expect(
      ServicioKardexValorizado.registrarEntradaValorizada(datosBase({ empresaId, motivo: 'DEVOLUCION_CLIENTE' }), { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' })
    ).rejects.toThrow(ConflictoIdempotencia);
  });

  it('la misma clave en una empresa distinta es completamente independiente', async () => {
    sembrarProductos('emp-A', [crearProducto({ stockPorAlmacen: { 'alm-1': 5 } })]);
    sembrarProductos('emp-B', [crearProducto({ stockPorAlmacen: { 'alm-1': 100 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    const resultadoA = await ServicioKardexValorizado.registrarEntradaValorizada(datosBase({ empresaId: 'emp-A' }), { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' });
    const resultadoB = await ServicioKardexValorizado.registrarEntradaValorizada(datosBase({ empresaId: 'emp-B' }), { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' });

    expect(resultadoA.estado).toBe('nueva');
    expect(resultadoB.estado).toBe('nueva');
    const productosA = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, 'emp-A')) as string) as Product[];
    const productosB = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, 'emp-B')) as string) as Product[];
    expect(productosA[0].stockPorAlmacen['alm-1']).toBe(15);
    expect(productosB[0].stockPorAlmacen['alm-1']).toBe(110);
  });

  it('reactivación de una operación fallida (recuperación) crea un movimiento nuevo, sin reusar IDs viejos', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 5 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    sembrarOperacionDePrueba(empresaId, {
      id: 'op-vieja',
      empresaId,
      clave: 'clave-1',
      tipoOperacion: 'ni_automatica',
      estado: 'fallida',
      hashEntrada: 'hash-viejo-no-coincide',
      referenciaDocumentoId: 'doc-1',
      referenciaDocumentoTipo: 'nota_ingreso',
      resultadoIds: [],
      fechaCreacion: '2026-01-01T00:00:00.000Z',
    });

    const resultado = await ServicioKardexValorizado.registrarEntradaValorizada(datosBase({ empresaId }), { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' });

    expect(resultado.estado).toBe('reactivada');
    expect(resultado.movimientos).toHaveLength(1);
    expect(resultado.resultadoIds).not.toContain('op-vieja');
    const productos = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productos[0].stockPorAlmacen['alm-1']).toBe(15);
  });

  it('una reserva ambigua (preparada sin transacción, no resuelta) rechaza sin mutar stock', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 5 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    sembrarOperacionDePrueba(empresaId, {
      id: 'op-ambigua',
      empresaId,
      clave: 'clave-1',
      tipoOperacion: 'ni_automatica',
      estado: 'preparada',
      hashEntrada: 'hash-cualquiera',
      referenciaDocumentoId: 'doc-1',
      referenciaDocumentoTipo: 'nota_ingreso',
      resultadoIds: [],
      fechaCreacion: '2026-01-01T00:00:00.000Z',
    });

    await expect(
      ServicioKardexValorizado.registrarEntradaValorizada(datosBase({ empresaId }), { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' })
    ).rejects.toThrow(/ambigu/);

    const productos = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productos[0].stockPorAlmacen['alm-1']).toBe(5);
  });
});

describe('ServicioKardexValorizado.registrarEntradaValorizada — corrección: una validación fallida no deja la reserva ambigua', () => {
  it('primer intento con datos inválidos: cero movimientos, cero versión, la operación NO queda "preparada" (ambigua) — corregir y reintentar con la misma clave tiene éxito', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 5 } })]);
    // El almacén referenciado por la línea no existe en el mapa — la validación funcional (que
    // depende del estado, no del contrato) solo puede detectarse después de reservar.
    const almacenesIncompletos = new Map<string, Almacen>();
    const almacenesCorregidos = new Map([['alm-1', crearAlmacen()]]);
    const datos = datosBase({ empresaId, claveIdempotencia: 'clave-reintento' });

    await expect(
      ServicioKardexValorizado.registrarEntradaValorizada(datos, { almacenes: almacenesIncompletos, generarId, fechaActual, estadoValorizacion: 'no_iniciada' })
    ).rejects.toThrow(/almacén/);

    // Cero movimientos, cero incremento de versión.
    expect(obtenerEstadoVersionInventario(empresaId)).toBeUndefined();
    const productosSinCambio = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productosSinCambio[0].stockPorAlmacen['alm-1']).toBe(5);

    // La operación quedó 'fallida' (cerrada), nunca 'preparada' (ambigua) para siempre.
    const operacionTrasFallo = buscarOperacionIdempotentePorClave(empresaId, 'clave-reintento');
    expect(operacionTrasFallo?.estado).toBe('fallida');

    // Corrección del dato (almacén real) y reintento con la MISMA clave: debe funcionar.
    const resultado = await ServicioKardexValorizado.registrarEntradaValorizada(datos, { almacenes: almacenesCorregidos, generarId, fechaActual, estadoValorizacion: 'no_iniciada' });

    expect(resultado.estado).toBe('reactivada');
    expect(resultado.movimientos).toHaveLength(1);
    const productosFinales = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productosFinales[0].stockPorAlmacen['alm-1']).toBe(15);
    expect(obtenerEstadoVersionInventario(empresaId)?.versionInventario).toBe(1);
  });
});

describe('ServicioKardexValorizado.registrarEntradaValorizada — ajustes positivos (Etapa 1C)', () => {
  function datosAjustePositivo(overrides: Partial<DatosOperacionEntradaCuantitativa> = {}): DatosOperacionEntradaCuantitativa {
    return datosBase({
      documentoId: 'ajuste-1',
      tipoDocumento: 'ajuste',
      tipoOperacion: 'ajuste_positivo',
      claveIdempotencia: 'ajuste_positivo:ajuste-1',
      motivo: 'AJUSTE_INVENTARIO',
      ...overrides,
    });
  }

  it('cambiar observaciones con la misma clave produce ConflictoIdempotencia (dato de negocio ya persistido en MovimientoStock)', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 8 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    await ServicioKardexValorizado.registrarEntradaValorizada(datosAjustePositivo({ empresaId, observaciones: 'conteo inicial' }), { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' });

    await expect(
      ServicioKardexValorizado.registrarEntradaValorizada(datosAjustePositivo({ empresaId, observaciones: 'conteo corregido' }), { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' })
    ).rejects.toThrow(ConflictoIdempotencia);
  });

  it('cambiar documentoReferencia con la misma clave produce ConflictoIdempotencia', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 8 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    await ServicioKardexValorizado.registrarEntradaValorizada(datosAjustePositivo({ empresaId, documentoReferencia: 'ACTA-001' }), { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' });

    await expect(
      ServicioKardexValorizado.registrarEntradaValorizada(datosAjustePositivo({ empresaId, documentoReferencia: 'ACTA-002' }), { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' })
    ).rejects.toThrow(ConflictoIdempotencia);
  });

  it('usa el motor nuevo: produce el mismo resultado cuantitativo que el cálculo directo, conservando motivo y usuario', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 8 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    const resultado = await ServicioKardexValorizado.registrarEntradaValorizada(
      datosAjustePositivo({ empresaId, usuario: 'usuario-ajuste' }),
      { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' }
    );

    expect(resultado.estado).toBe('nueva');
    expect(resultado.movimientos[0].tipo).toBe('AJUSTE_POSITIVO');
    expect(resultado.movimientos[0].motivo).toBe('AJUSTE_INVENTARIO');
    expect(resultado.movimientos[0].usuario).toBe('usuario-ajuste');
    expect(resultado.movimientos[0].cantidadAnterior).toBe(8);
    expect(resultado.movimientos[0].cantidadNueva).toBe(18);
    expect(resultado.productosActualizados[0].stockPorAlmacen?.['alm-1']).toBe(18);
  });

  it('doble ejecución (mismo documento de ajuste) no duplica el incremento de stock', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 8 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    const datos = datosAjustePositivo({ empresaId });

    await ServicioKardexValorizado.registrarEntradaValorizada(datos, { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' });
    const segunda = await ServicioKardexValorizado.registrarEntradaValorizada(datos, { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' });

    expect(segunda.estado).toBe('repetida');
    const productos = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productos[0].stockPorAlmacen['alm-1']).toBe(18);
  });

  it('el motor central rechaza un ajuste positivo directo (evadiendo el filtro de NI) sobre un producto tipoExistencia "SERVICIOS", sin escribir nada', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ tipoExistencia: 'SERVICIOS', stockPorAlmacen: { 'alm-1': 8 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    await expect(
      ServicioKardexValorizado.registrarEntradaValorizada(datosAjustePositivo({ empresaId }), { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' })
    ).rejects.toThrow(/no está controlado por stock/);

    const productos = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productos[0].stockPorAlmacen['alm-1']).toBe(8);
  });

  it('el motor central rechaza un ajuste positivo directo sobre un producto tipoExistencia "OTROS", sin escribir nada', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ tipoExistencia: 'OTROS', stockPorAlmacen: { 'alm-1': 8 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    await expect(
      ServicioKardexValorizado.registrarEntradaValorizada(datosAjustePositivo({ empresaId }), { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' })
    ).rejects.toThrow(/no está controlado por stock/);

    const productos = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productos[0].stockPorAlmacen['alm-1']).toBe(8);
  });
});

describe('ServicioKardexValorizado.registrarEntradaValorizada — integración con la unidad de trabajo de Etapa 1B', () => {
  it('dos operaciones concurrentes de la misma empresa (claves distintas) no se corrompen ni se pisan: ambas aplican y la versión sube una vez por cada una', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 0 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    const [resultado1, resultado2] = await Promise.all([
      ServicioKardexValorizado.registrarEntradaValorizada(
        datosBase({ empresaId, documentoId: 'doc-1', claveIdempotencia: 'clave-1' }),
        { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' }
      ),
      ServicioKardexValorizado.registrarEntradaValorizada(
        datosBase({ empresaId, documentoId: 'doc-2', claveIdempotencia: 'clave-2' }),
        { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' }
      ),
    ]);

    expect(resultado1.estado).toBe('nueva');
    expect(resultado2.estado).toBe('nueva');
    expect(new Set([...resultado1.resultadoIds, ...resultado2.resultadoIds]).size).toBe(2);

    const productos = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productos[0].stockPorAlmacen['alm-1']).toBe(20);
    expect(obtenerEstadoVersionInventario(empresaId)?.versionInventario).toBe(2);
  });

  it('un fallo detectado durante la escritura (otro proceso reescribió la colección de productos a mitad de la confirmación) propaga el error y no confirma silenciosamente sobre un valor que no reconoce', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 5 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    // Simula que otro proceso reescribió la colección de productos entre el snapshot y la
    // confirmación: al momento de aplicar la escritura planificada, el valor real ya no coincide
    // ni con "antes" ni con "después" esperados por el plan.
    const claveProductos = lsKey(PRODUCT_STORAGE_KEY, empresaId);
    const original = localStorage.getItem(claveProductos);
    const escrituraOriginal = localStorage.setItem.bind(localStorage);
    let interceptado = false;
    localStorage.setItem = ((clave: string, valor: string) => {
      if (clave === claveProductos && !interceptado) {
        interceptado = true;
        escrituraOriginal(claveProductos, JSON.stringify([crearProducto({ stockPorAlmacen: { 'alm-1': 999 } })]));
        return;
      }
      escrituraOriginal(clave, valor);
    }) as typeof localStorage.setItem;

    try {
      await expect(
        ServicioKardexValorizado.registrarEntradaValorizada(datosBase({ empresaId }), { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' })
      ).rejects.toThrow();
    } finally {
      localStorage.setItem = escrituraOriginal;
    }

    const productosFinales = JSON.parse(localStorage.getItem(claveProductos) as string) as Product[];
    expect(productosFinales[0].stockPorAlmacen['alm-1']).toBe(999);
    expect(original).not.toBeNull();
  });
});

describe('ServicioKardexValorizado.registrarEntradaValorizada — corrección: una sola escritura del catálogo', () => {
  it('confirmar escribe la colección de productos exactamente una vez (sin una segunda persistencia posterior)', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 5 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    const claveProductos = lsKey(PRODUCT_STORAGE_KEY, empresaId);

    const escrituraOriginal = localStorage.setItem.bind(localStorage);
    let escriturasProductos = 0;
    localStorage.setItem = ((clave: string, valor: string) => {
      if (clave === claveProductos) escriturasProductos += 1;
      escrituraOriginal(clave, valor);
    }) as typeof localStorage.setItem;

    try {
      await ServicioKardexValorizado.registrarEntradaValorizada(datosBase({ empresaId }), { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' });
    } finally {
      localStorage.setItem = escrituraOriginal;
    }

    expect(escriturasProductos).toBe(1);
  });
});

function datosSalidaBase(overrides: Partial<DatosOperacionSalidaCuantitativa> = {}): DatosOperacionSalidaCuantitativa {
  return {
    modoOperacion: 'cuantitativo',
    empresaId: 'emp-A',
    documentoId: 'venta-1',
    tipoDocumento: 'venta',
    tipoOperacion: 'venta_salida',
    claveIdempotencia: 'venta_salida:venta-1',
    usuario: 'user-1',
    fecha: '2026-01-01T00:00:00.000Z',
    motivo: 'VENTA',
    lineas: [{ lineaId: 'linea-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 10 }],
    ...overrides,
  };
}

describe('ServicioKardexValorizado.registrarSalidaValorizada — modo valorizado rechazado', () => {
  it('rechaza cualquier modoOperacion distinto de "cuantitativo" sin reservar ni mutar nada', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    // 'valorizado' es un modoOperacion válido en el TIPO desde Etapa 2 (solo lo acepta el motor de
    // entradas para ajuste_positivo) — el motor de SALIDAS lo sigue rechazando en tiempo de
    // ejecución para todo tipoOperacion, sin excepción (fuera de alcance de Etapa 2, §10).
    const datosInvalidos: DatosOperacionSalidaCuantitativa = { ...datosSalidaBase(), modoOperacion: 'valorizado' };

    await expect(
      ServicioKardexValorizado.registrarSalidaValorizada(datosInvalidos, { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' })
    ).rejects.toThrow(/valorizado.*no está soportado/);

    const productos = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productos[0].stockPorAlmacen['alm-1']).toBe(20);
  });
});

describe('ServicioKardexValorizado.registrarSalidaValorizada — idempotencia', () => {
  it('primera salida descuenta el stock', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    const resultado = await ServicioKardexValorizado.registrarSalidaValorizada(datosSalidaBase({ empresaId }), { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' });

    expect(resultado.estado).toBe('nueva');
    expect(resultado.movimientos).toHaveLength(1);
    expect(resultado.movimientos[0].tipo).toBe('SALIDA');
    expect(resultado.productosActualizados[0].stockPorAlmacen?.['alm-1']).toBe(10);
    expect(obtenerEstadoVersionInventario(empresaId)?.versionInventario).toBe(1);
  });

  it('doble clic / reintento tras recarga (mismo hash) no duplica el descuento ni sube la versión de nuevo', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    const datos = datosSalidaBase({ empresaId });

    const primero = await ServicioKardexValorizado.registrarSalidaValorizada(datos, { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' });
    const segundo = await ServicioKardexValorizado.registrarSalidaValorizada(datos, { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' });

    expect(segundo.estado).toBe('repetida');
    expect(segundo.resultadoIds).toEqual(primero.resultadoIds);
    expect(segundo.movimientos).toEqual([]);
    const productos = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productos[0].stockPorAlmacen['alm-1']).toBe(10);
    expect(obtenerEstadoVersionInventario(empresaId)?.versionInventario).toBe(1);
  });

  it('misma clave con cantidad distinta produce ConflictoIdempotencia', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    await ServicioKardexValorizado.registrarSalidaValorizada(datosSalidaBase({ empresaId }), { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' });

    const datosCambiados = datosSalidaBase({
      empresaId,
      lineas: [{ lineaId: 'linea-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 3 }],
    });

    await expect(
      ServicioKardexValorizado.registrarSalidaValorizada(datosCambiados, { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' })
    ).rejects.toThrow(ConflictoIdempotencia);
  });

  it('misma clave con motivo, observaciones o documentoReferencia distintos produce ConflictoIdempotencia', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    await ServicioKardexValorizado.registrarSalidaValorizada(datosSalidaBase({ empresaId, motivo: 'VENTA', observaciones: 'a', documentoReferencia: 'F001-1' }), { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' });

    await expect(
      ServicioKardexValorizado.registrarSalidaValorizada(datosSalidaBase({ empresaId, motivo: 'OTRO', observaciones: 'a', documentoReferencia: 'F001-1' }), { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' })
    ).rejects.toThrow(ConflictoIdempotencia);
  });

  it('recuperación de una operación fallida (reactivada) crea un movimiento nuevo sin reusar IDs viejos', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    sembrarOperacionDePrueba(empresaId, {
      id: 'op-vieja',
      empresaId,
      clave: 'venta_salida:venta-1',
      tipoOperacion: 'venta_salida',
      estado: 'fallida',
      hashEntrada: 'hash-viejo-no-coincide',
      referenciaDocumentoId: 'venta-1',
      referenciaDocumentoTipo: 'venta',
      resultadoIds: [],
      fechaCreacion: '2026-01-01T00:00:00.000Z',
    });

    const resultado = await ServicioKardexValorizado.registrarSalidaValorizada(datosSalidaBase({ empresaId }), { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' });

    expect(resultado.estado).toBe('reactivada');
    expect(resultado.movimientos).toHaveLength(1);
    expect(resultado.resultadoIds).not.toContain('op-vieja');
    const productos = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productos[0].stockPorAlmacen['alm-1']).toBe(10);
  });
});

describe('ServicioKardexValorizado.registrarSalidaValorizada — corrección: preparación fallida no deja reserva ambigua', () => {
  it('primer intento con almacén inexistente falla, no descuenta ni sube versión, y NO queda ambigua — el reintento con datos corregidos tiene éxito', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]);
    const almacenesIncompletos = new Map<string, Almacen>();
    const almacenesCorregidos = new Map([['alm-1', crearAlmacen()]]);
    const datos = datosSalidaBase({ empresaId, claveIdempotencia: 'clave-reintento-salida' });

    await expect(
      ServicioKardexValorizado.registrarSalidaValorizada(datos, { almacenes: almacenesIncompletos, generarId, fechaActual, estadoValorizacion: 'no_iniciada' })
    ).rejects.toThrow(/almacén/);

    expect(obtenerEstadoVersionInventario(empresaId)).toBeUndefined();
    const productosSinCambio = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productosSinCambio[0].stockPorAlmacen['alm-1']).toBe(20);
    const operacionTrasFallo = buscarOperacionIdempotentePorClave(empresaId, 'clave-reintento-salida');
    expect(operacionTrasFallo?.estado).toBe('fallida');

    const resultado = await ServicioKardexValorizado.registrarSalidaValorizada(datos, { almacenes: almacenesCorregidos, generarId, fechaActual, estadoValorizacion: 'no_iniciada' });

    expect(resultado.estado).toBe('reactivada');
    expect(resultado.movimientos).toHaveLength(1);
    const productosFinales = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productosFinales[0].stockPorAlmacen['alm-1']).toBe(10);
  });
});

describe('ServicioKardexValorizado.registrarSalidaValorizada — clasificación inventariable', () => {
  it('una salida directa sobre un producto SERVICIOS es rechazada sin escribir', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ tipoExistencia: 'SERVICIOS', stockPorAlmacen: { 'alm-1': 20 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    await expect(
      ServicioKardexValorizado.registrarSalidaValorizada(datosSalidaBase({ empresaId }), { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' })
    ).rejects.toThrow(/no está controlado por stock/);

    const productos = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productos[0].stockPorAlmacen['alm-1']).toBe(20);
  });

  it('una salida directa sobre un producto OTROS es rechazada sin escribir', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ tipoExistencia: 'OTROS', stockPorAlmacen: { 'alm-1': 20 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    await expect(
      ServicioKardexValorizado.registrarSalidaValorizada(datosSalidaBase({ empresaId }), { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' })
    ).rejects.toThrow(/no está controlado por stock/);

    const productos = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productos[0].stockPorAlmacen['alm-1']).toBe(20);
  });
});

describe('ServicioKardexValorizado.registrarSalidaValorizada — integración con la unidad de trabajo de Etapa 1B', () => {
  it('dos salidas concurrentes de la misma empresa (claves distintas) no se corrompen ni se pisan: la versión sube una vez por cada una', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    const [resultado1, resultado2] = await Promise.all([
      ServicioKardexValorizado.registrarSalidaValorizada(
        datosSalidaBase({ empresaId, documentoId: 'venta-1', claveIdempotencia: 'venta_salida:venta-1' }),
        { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' }
      ),
      ServicioKardexValorizado.registrarSalidaValorizada(
        datosSalidaBase({ empresaId, documentoId: 'venta-2', claveIdempotencia: 'venta_salida:venta-2' }),
        { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' }
      ),
    ]);

    expect(resultado1.estado).toBe('nueva');
    expect(resultado2.estado).toBe('nueva');
    expect(new Set([...resultado1.resultadoIds, ...resultado2.resultadoIds]).size).toBe(2);

    const productos = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productos[0].stockPorAlmacen['alm-1']).toBe(0);
    expect(obtenerEstadoVersionInventario(empresaId)?.versionInventario).toBe(2);
  });

  it('confirmar escribe la colección de productos exactamente una vez', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    const claveProductos = lsKey(PRODUCT_STORAGE_KEY, empresaId);

    const escrituraOriginal = localStorage.setItem.bind(localStorage);
    let escriturasProductos = 0;
    localStorage.setItem = ((clave: string, valor: string) => {
      if (clave === claveProductos) escriturasProductos += 1;
      escrituraOriginal(clave, valor);
    }) as typeof localStorage.setItem;

    try {
      await ServicioKardexValorizado.registrarSalidaValorizada(datosSalidaBase({ empresaId }), { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' });
    } finally {
      localStorage.setItem = escrituraOriginal;
    }

    expect(escriturasProductos).toBe(1);
  });
});

// ─── Cierre de bloqueante 1 de la revisión de Etapa 2: la máquina de estados de activación de
// valorización se APLICA REALMENTE en el motor (nunca solo definida sin gatear nada) ───────────

function datosTransferenciaBase(overrides: Partial<DatosTransferenciaInventario> = {}): DatosTransferenciaInventario {
  return {
    modoOperacion: 'cuantitativo',
    empresaId: 'emp-A',
    transferenciaId: 'transfer-1',
    claveIdempotencia: 'TRANSFER-transfer-1',
    tipoOperacion: 'transferencia',
    tipoDocumento: 'transferencia',
    productoId: 'prod-1',
    establecimientoOrigenId: 'est-1',
    almacenOrigenId: 'alm-1',
    establecimientoDestinoId: 'est-1',
    almacenDestinoId: 'alm-2',
    cantidadUnidadMinima: 5,
    usuario: 'user-1',
    fecha: '2026-01-01T00:00:00.000Z',
    motivo: 'TRANSFERENCIA_ALMACEN',
    ...overrides,
  };
}

function datosReversoBase(overrides: Partial<DatosReversoInventario> = {}): DatosReversoInventario {
  return {
    empresaId: 'emp-A',
    movimientoId: 'mov-1',
    claveIdempotencia: 'REVERSO-mov-1',
    tipoOperacion: 'reverso',
    tipoDocumento: 'nota_ingreso',
    usuario: 'user-1',
    fecha: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function datosAnulacionBase(overrides: Partial<DatosAnulacionDocumentoInventario> = {}): DatosAnulacionDocumentoInventario {
  return {
    empresaId: 'emp-A',
    tipoOperacion: 'anulacion',
    documentoId: 'doc-1',
    tipoDocumentoOrigen: 'nota_ingreso',
    movimientoIds: ['mov-1'],
    claveIdempotencia: 'ANULACION-nota_ingreso-doc-1',
    usuario: 'user-1',
    fecha: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('ServicioKardexValorizado — la máquina de estados de activación de valorización bloquea TODA mutación (bloqueado_snapshot_aprobado/activacion_en_curso/suspension)', () => {
  const ESTADOS_BLOQUEADOS: EstadoActivacionValorizacion[] = ['validada', 'activando', 'suspendida_por_inconsistencia', 'fallida_recuperable'];

  it.each(ESTADOS_BLOQUEADOS)('rechaza registrarEntradaValorizada cuando estadoValorizacion="%s", sin reservar nada', async (estado) => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 5 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    await expect(
      ServicioKardexValorizado.registrarEntradaValorizada(datosBase({ empresaId }), { almacenes, generarId, fechaActual, estadoValorizacion: estado })
    ).rejects.toThrow(/bloquea toda mutación/);

    expect(localStorage.getItem(lsKey(CLAVE_COLECCION_OPERACIONES_IDEMPOTENTES, empresaId))).toBeNull();
    const productos = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productos[0]?.stockPorAlmacen?.['alm-1']).toBe(5);
  });

  it('rechaza registrarSalidaValorizada cuando estadoValorizacion="validada"', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    await expect(
      ServicioKardexValorizado.registrarSalidaValorizada(datosSalidaBase({ empresaId }), { almacenes, generarId, fechaActual, estadoValorizacion: 'validada' })
    ).rejects.toThrow(/bloquea toda mutación/);

    const productos = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productos[0]?.stockPorAlmacen?.['alm-1']).toBe(20);
  });

  it('rechaza registrarEntradaValorizada de un ajuste_positivo cuando estadoValorizacion="validada"', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 5 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    await expect(
      ServicioKardexValorizado.registrarEntradaValorizada(
        datosBase({ empresaId, tipoOperacion: 'ajuste_positivo', tipoDocumento: 'ajuste', claveIdempotencia: 'ajuste_positivo:ajuste-1' }),
        { almacenes, generarId, fechaActual, estadoValorizacion: 'validada' }
      )
    ).rejects.toThrow(/bloquea toda mutación/);
  });

  it('rechaza registrarSalidaValorizada de un ajuste_negativo cuando estadoValorizacion="validada"', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    await expect(
      ServicioKardexValorizado.registrarSalidaValorizada(
        datosSalidaBase({ empresaId, tipoOperacion: 'ajuste_negativo', tipoDocumento: 'ajuste', claveIdempotencia: 'ajuste_negativo:ajuste-1' }),
        { almacenes, generarId, fechaActual, estadoValorizacion: 'validada' }
      )
    ).rejects.toThrow(/bloquea toda mutación/);
  });

  it('rechaza transferirStockValorizado cuando estadoValorizacion="validada", sin necesitar snapshots reales (el gate corta antes de leer stock)', async () => {
    await expect(
      ServicioKardexValorizado.transferirStockValorizado(datosTransferenciaBase(), {
        almacenes: new Map(), generarId, fechaActual, estadoValorizacion: 'validada',
      })
    ).rejects.toThrow(/bloquea toda mutación/);

    expect(localStorage.getItem(lsKey(CLAVE_COLECCION_OPERACIONES_IDEMPOTENTES, 'emp-A'))).toBeNull();
  });

  it('rechaza revertirMovimientoValorizado cuando estadoValorizacion="validada"', async () => {
    await expect(
      ServicioKardexValorizado.revertirMovimientoValorizado(datosReversoBase(), {
        almacenes: new Map(), generarId, fechaActual, estadoValorizacion: 'validada',
      })
    ).rejects.toThrow(/bloquea toda mutación/);

    expect(localStorage.getItem(lsKey(CLAVE_COLECCION_OPERACIONES_IDEMPOTENTES, 'emp-A'))).toBeNull();
  });

  it('rechaza anularDocumentoValorizado cuando estadoValorizacion="validada"', async () => {
    await expect(
      ServicioKardexValorizado.anularDocumentoValorizado(datosAnulacionBase(), {
        almacenes: new Map(), generarId, fechaActual, estadoValorizacion: 'validada',
      })
    ).rejects.toThrow(/bloquea toda mutación/);

    expect(localStorage.getItem(lsKey(CLAVE_COLECCION_OPERACIONES_IDEMPOTENTES, 'emp-A'))).toBeNull();
  });
});

describe('ServicioKardexValorizado — estadoValorizacion omitido/corrupto nunca permite operar (sin fallback silencioso a "no_iniciada")', () => {
  it('rechaza en tiempo de ejecución si estadoValorizacion llega undefined (evadiendo el tipo, como haría una llamada directa mal construida)', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 5 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    const dependenciasSinEstado = { almacenes, generarId, fechaActual } as unknown as {
      almacenes: typeof almacenes; generarId: typeof generarId; fechaActual: typeof fechaActual; estadoValorizacion: EstadoActivacionValorizacion;
    };

    await expect(
      ServicioKardexValorizado.registrarEntradaValorizada(datosBase({ empresaId }), dependenciasSinEstado)
    ).rejects.toThrow(/estado de activación de valorización no reconocido/);

    expect(localStorage.getItem(lsKey(CLAVE_COLECCION_OPERACIONES_IDEMPOTENTES, empresaId))).toBeNull();
  });
});

describe('ServicioKardexValorizado — invalidación del snapshot de valorización inicial durante pendiente_costos/en_preparacion', () => {
  function sembrarLote(empresaId: string, overrides: Partial<ValorizacionInicialInventario> = {}): ValorizacionInicialInventario {
    const lote: ValorizacionInicialInventario = {
      id: 'lote-1',
      empresaId,
      usuario: 'user-1',
      fechaCreacion: '2026-01-01T00:00:00.000Z',
      estado: 'pendiente_costos',
      detalles: [
        {
          productoId: 'prod-1',
          almacenId: 'alm-1',
          cantidadDetectada: 20,
          costoPropuesto: 8,
          origenPropuesta: 'precioCompra',
          costoConfirmado: 8,
          confirmado: true,
          requiereRecalculo: false,
        },
      ],
      ...overrides,
    };
    guardarValorizacionInicialInventario(lote, empresaId);
    return lote;
  }

  it('una venta (registrarSalidaValorizada) confirmada durante pendiente_costos invalida el detalle afectado', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    sembrarLote(empresaId);

    await ServicioKardexValorizado.registrarSalidaValorizada(datosSalidaBase({ empresaId }), {
      almacenes, generarId, fechaActual, estadoValorizacion: 'pendiente_costos',
    });

    const lote = obtenerLoteActivoPorEmpresa(empresaId)!;
    expect(lote.detalles[0].requiereRecalculo).toBe(true);
    expect(lote.detalles[0].confirmado).toBe(false);
    expect(lote.detalles[0].costoConfirmado).toBe(8); // se conserva como referencia visual, nunca se limpia
  });

  it('una Nota de Salida (tipoOperacion "nota_salida") confirmada durante pendiente_costos invalida el detalle afectado', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    sembrarLote(empresaId);

    await ServicioKardexValorizado.registrarSalidaValorizada(
      datosSalidaBase({ empresaId, tipoOperacion: 'nota_salida', tipoDocumento: 'nota_salida', claveIdempotencia: 'nota_salida:ns-1', documentoId: 'ns-1' }),
      { almacenes, generarId, fechaActual, estadoValorizacion: 'pendiente_costos' }
    );

    const lote = obtenerLoteActivoPorEmpresa(empresaId)!;
    expect(lote.detalles[0].requiereRecalculo).toBe(true);
  });

  it('un ajuste (ajuste_positivo) confirmado durante pendiente_costos invalida el detalle afectado', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 5 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    sembrarLote(empresaId);

    await ServicioKardexValorizado.registrarEntradaValorizada(
      datosBase({ empresaId, tipoOperacion: 'ajuste_positivo', tipoDocumento: 'ajuste', claveIdempotencia: 'ajuste_positivo:ajuste-1', documentoId: 'ajuste-1' }),
      { almacenes, generarId, fechaActual, estadoValorizacion: 'pendiente_costos' }
    );

    const lote = obtenerLoteActivoPorEmpresa(empresaId)!;
    expect(lote.detalles[0].requiereRecalculo).toBe(true);
  });

  it('una transferencia confirmada durante pendiente_costos invalida el detalle del almacén ORIGEN afectado', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 20, 'alm-2': 0 } })]);
    const almacenes = new Map([
      ['alm-1', crearAlmacen()],
      ['alm-2', crearAlmacen({ id: 'alm-2', codigoAlmacen: 'ALM02', nombreAlmacen: 'Almacén Secundario' })],
    ]);
    sembrarLote(empresaId);

    await ServicioKardexValorizado.transferirStockValorizado(datosTransferenciaBase({ empresaId }), {
      almacenes, generarId, fechaActual, estadoValorizacion: 'pendiente_costos',
    });

    const lote = obtenerLoteActivoPorEmpresa(empresaId)!;
    expect(lote.detalles[0].requiereRecalculo).toBe(true);
  });

  it('una operación REPETIDA (mismo hash, reintento) no vuelve a invalidar un detalle ya recalculado manualmente', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    sembrarLote(empresaId);

    const datos = datosSalidaBase({ empresaId });
    const dependencias = { almacenes, generarId, fechaActual, estadoValorizacion: 'pendiente_costos' as const };

    const primera = await ServicioKardexValorizado.registrarSalidaValorizada(datos, dependencias);
    expect(primera.estado).toBe('nueva');
    expect(obtenerLoteActivoPorEmpresa(empresaId)!.detalles[0].requiereRecalculo).toBe(true);

    // Un operador recalcula/reconfirma manualmente el detalle (simulado directamente en el repositorio).
    const loteRecalculado = { ...obtenerLoteActivoPorEmpresa(empresaId)! };
    loteRecalculado.detalles = loteRecalculado.detalles.map((d) => ({ ...d, requiereRecalculo: false, confirmado: true }));
    const { actualizarValorizacionInicialInventario } = await import('../repositories/valorizacionInicialInventario.repository');
    actualizarValorizacionInicialInventario(loteRecalculado, empresaId);

    const repetida = await ServicioKardexValorizado.registrarSalidaValorizada(datos, dependencias);
    expect(repetida.estado).toBe('repetida');

    // La repetición nunca vuelve a invalidar: el detalle sigue tal como el operador lo dejó.
    expect(obtenerLoteActivoPorEmpresa(empresaId)!.detalles[0].requiereRecalculo).toBe(false);
    expect(obtenerLoteActivoPorEmpresa(empresaId)!.detalles[0].confirmado).toBe(true);
  });
});

describe('ServicioKardexValorizado — la invalidación fallida nunca es best-effort silencioso (se encola de forma durable e idempotente)', () => {
  it('si la invalidación falla tras confirmar, el stock queda mutado (nunca se revierte) y la invalidación se encola para reintento', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    // Corrompe deliberadamente la colección de lotes de valorización inicial de esta empresa para
    // que `obtenerLoteActivoPorEmpresa` (invocado dentro de la invalidación) lance una excepción —
    // simula un fallo real de la invalidación SIN mockear ninguna función interna.
    localStorage.setItem(lsKey(CLAVE_COLECCION_VALORIZACION_INICIAL_INVENTARIO, empresaId), '{"esto no es un arreglo": true}');

    const resultado = await ServicioKardexValorizado.registrarSalidaValorizada(datosSalidaBase({ empresaId }), {
      almacenes, generarId, fechaActual, estadoValorizacion: 'pendiente_costos',
    });

    expect(resultado.estado).toBe('nueva');
    // El stock ya confirmado NUNCA se revierte por un fallo secundario de bookkeeping.
    const productos = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productos[0].stockPorAlmacen['alm-1']).toBe(10);

    // La invalidación fallida quedó encolada de forma durable — nunca solo un console.error perdido.
    const pendientes = listarInvalidacionesPendientes(empresaId);
    expect(pendientes).toHaveLength(1);
    expect(pendientes[0].afectados).toEqual([{ productoId: 'prod-1', almacenId: 'alm-1' }]);
  });

  it('la siguiente operación de la misma empresa drena la invalidación pendiente (idempotente, sin duplicar)', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 20, 'alm-2': 0 } })]);
    const almacenes = new Map([
      ['alm-1', crearAlmacen()],
      ['alm-2', crearAlmacen({ id: 'alm-2', codigoAlmacen: 'ALM02', nombreAlmacen: 'Almacén Secundario' })],
    ]);

    localStorage.setItem(lsKey(CLAVE_COLECCION_VALORIZACION_INICIAL_INVENTARIO, empresaId), '{"esto no es un arreglo": true}');
    await ServicioKardexValorizado.registrarSalidaValorizada(datosSalidaBase({ empresaId }), {
      almacenes, generarId, fechaActual, estadoValorizacion: 'pendiente_costos',
    });
    expect(listarInvalidacionesPendientes(empresaId)).toHaveLength(1);

    // Se repara la colección de lotes (ej. intervención manual) y el lote pasa a existir de verdad.
    const lote: ValorizacionInicialInventario = {
      id: 'lote-1',
      empresaId,
      usuario: 'user-1',
      fechaCreacion: '2026-01-01T00:00:00.000Z',
      estado: 'pendiente_costos',
      detalles: [
        { productoId: 'prod-1', almacenId: 'alm-1', cantidadDetectada: 10, costoPropuesto: 8, origenPropuesta: 'precioCompra', costoConfirmado: 8, confirmado: true, requiereRecalculo: false },
      ],
    };
    localStorage.setItem(lsKey(CLAVE_COLECCION_VALORIZACION_INICIAL_INVENTARIO, empresaId), JSON.stringify([lote]));

    // Cualquier operación NUEVA de la misma empresa drena las pendientes al inicio, antes de reservar.
    await ServicioKardexValorizado.registrarEntradaValorizada(
      datosBase({ empresaId, tipoOperacion: 'ni_automatica', documentoId: 'ni-2', claveIdempotencia: 'ni_automatica:ni-2', lineas: [{ lineaId: 'l1', productoId: 'prod-1', almacenId: 'alm-2', cantidadUnidadMinima: 1 }] }),
      { almacenes, generarId, fechaActual, estadoValorizacion: 'pendiente_costos' }
    );

    expect(listarInvalidacionesPendientes(empresaId)).toHaveLength(0);
    expect(obtenerLoteActivoPorEmpresa(empresaId)!.detalles[0].requiereRecalculo).toBe(true);
  });
});
