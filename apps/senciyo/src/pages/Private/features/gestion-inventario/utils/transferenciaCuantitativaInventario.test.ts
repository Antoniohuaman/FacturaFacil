import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { instalarLocalStorageDePrueba } from '../repositories/localStorageDePrueba';
import { ServicioKardexValorizado } from '../services/servicioKardexValorizado';
import { ConflictoIdempotencia } from './erroresInventario';
import { PRODUCT_STORAGE_KEY } from '../../catalogo-articulos/utils/catalogStorage';
import { guardarCapaCostoInventario, listarCapasCostoInventarioPorEmpresa } from '../repositories/capaCostoInventario.repository';
import { listarConsumosCapaCostoInventarioPorEmpresa } from '../repositories/consumoCapaCostoInventario.repository';
import { CLAVE_COLECCION_TRANSFERENCIAS } from '../repositories/transferencia.repository';
import type { CapaCostoInventario } from '../models/capaCostoInventario.types';
import type { DatosTransferenciaInventario } from '../models/operacionTransferenciaInventario.types';
import type { Product } from '../../catalogo-articulos/models/types';
import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';
import type { Transferencia } from '../models/transferencia.types';
import { lsKey } from '../../../../../shared/tenant';

function leerTransferencias(empresaId: string): Transferencia[] {
  const raw = localStorage.getItem(lsKey(CLAVE_COLECCION_TRANSFERENCIAS, empresaId));
  return raw ? (JSON.parse(raw) as Transferencia[]) : [];
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

const EST_1 = 'est-1';

function crearAlmacen(overrides: Partial<Almacen> = {}): Almacen {
  return {
    id: 'alm-1',
    codigoAlmacen: 'ALM01',
    nombreAlmacen: 'Almacén 1',
    establecimientoId: EST_1,
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

function crearCapa(overrides: Partial<CapaCostoInventario> = {}): CapaCostoInventario {
  return {
    id: 'capa-1',
    empresaId: 'emp-A',
    establecimientoId: EST_1,
    productoId: 'prod-1',
    almacenId: 'alm-1',
    movimientoEntradaId: 'mov-ni-1',
    tipoDocumentoOrigen: 'nota_ingreso',
    documentoOrigenId: 'ni-1',
    cantidadInicial: 10,
    cantidadDisponible: 10,
    costoUnitarioBaseOriginal: 12.5,
    costoUnitarioBaseMonedaBase: 12.5,
    valorValorizableOriginal: 125,
    valorValorizableMonedaBase: 125,
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

function datosBase(overrides: Partial<DatosTransferenciaInventario> = {}): DatosTransferenciaInventario {
  return {
    modoOperacion: 'cuantitativo',
    empresaId: 'emp-A',
    transferenciaId: 'trf-1',
    claveIdempotencia: 'TRANSFER-trf-1',
    tipoOperacion: 'transferencia',
    tipoDocumento: 'transferencia',
    productoId: 'prod-1',
    establecimientoOrigenId: EST_1,
    almacenOrigenId: 'alm-1',
    establecimientoDestinoId: EST_1,
    almacenDestinoId: 'alm-2',
    cantidadUnidadMinima: 5,
    usuario: 'user-1',
    fecha: '2026-08-01T00:00:00.000Z',
    motivo: 'TRANSFERENCIA_ALMACEN',
    ...overrides,
  };
}

function almacenesBase(): Map<string, Almacen> {
  return new Map([
    ['alm-1', crearAlmacen({ id: 'alm-1', establecimientoId: EST_1 })],
    ['alm-2', crearAlmacen({ id: 'alm-2', codigoAlmacen: 'ALM02', nombreAlmacen: 'Almacén 2', establecimientoId: EST_1 })],
  ]);
}

describe('transferirStockValorizado — modo cuantitativo', () => {
  it('transferencia completa origen→destino: disminuye origen, aumenta destino, genera SALIDA+ENTRADA', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 20, 'alm-2': 3 } })]);

    const resultado = await ServicioKardexValorizado.transferirStockValorizado(datosBase({ empresaId }), {
      almacenes: almacenesBase(), generarId, fechaActual,
    });

    expect(resultado.estado).toBe('nueva');
    expect(resultado.movimientos).toHaveLength(2);
    expect(resultado.movimientos.map((m) => m.tipo).sort()).toEqual(['ENTRADA', 'SALIDA']);

    const productos = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productos[0].stockPorAlmacen['alm-1']).toBe(15);
    expect(productos[0].stockPorAlmacen['alm-2']).toBe(8);
  });

  it('el total global del producto en todos los almacenes no cambia', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 20, 'alm-2': 3 } })]);
    const totalAntes = 20 + 3;

    await ServicioKardexValorizado.transferirStockValorizado(datosBase({ empresaId }), {
      almacenes: almacenesBase(), generarId, fechaActual,
    });

    const productos = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    const totalDespues = productos[0].stockPorAlmacen['alm-1'] + productos[0].stockPorAlmacen['alm-2'];
    expect(totalDespues).toBe(totalAntes);
  });

  it('stock insuficiente en origen rechaza la operación completa', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 3, 'alm-2': 0 } })]);

    await expect(
      ServicioKardexValorizado.transferirStockValorizado(datosBase({ empresaId, cantidadUnidadMinima: 5 }), {
        almacenes: almacenesBase(), generarId, fechaActual,
      })
    ).rejects.toThrow(/no hay stock disponible/i);

    const productos = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productos[0].stockPorAlmacen['alm-1']).toBe(3);
  });

  it('respeta las reservas vigentes al calcular el disponible', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [
      crearProducto({ stockPorAlmacen: { 'alm-1': 10, 'alm-2': 0 }, stockReservadoPorAlmacen: { 'alm-1': 7 } }),
    ]);

    await expect(
      ServicioKardexValorizado.transferirStockValorizado(datosBase({ empresaId, cantidadUnidadMinima: 5 }), {
        almacenes: almacenesBase(), generarId, fechaActual,
      })
    ).rejects.toThrow(/no hay stock disponible/i);
  });

  it('almacén origen igual al destino se rechaza en la validación pura del contrato', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]);

    await expect(
      ServicioKardexValorizado.transferirStockValorizado(datosBase({ empresaId, almacenDestinoId: 'alm-1' }), {
        almacenes: almacenesBase(), generarId, fechaActual,
      })
    ).rejects.toThrow(/diferentes/);
  });

  it('producto inexistente rechaza la operación', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, []);

    await expect(
      ServicioKardexValorizado.transferirStockValorizado(datosBase({ empresaId }), {
        almacenes: almacenesBase(), generarId, fechaActual,
      })
    ).rejects.toThrow(/no existe en el catálogo/);
  });

  it('almacén inactivo rechaza la operación', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]);
    const almacenes = new Map([
      ['alm-1', crearAlmacen({ id: 'alm-1', estaActivoAlmacen: false })],
      ['alm-2', crearAlmacen({ id: 'alm-2', codigoAlmacen: 'ALM02' })],
    ]);

    await expect(
      ServicioKardexValorizado.transferirStockValorizado(datosBase({ empresaId }), { almacenes, generarId, fechaActual })
    ).rejects.toThrow(/inactivo/);
  });

  it('el establecimiento declarado debe coincidir con el del almacén real (sin fallback silencioso)', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })]);

    await expect(
      ServicioKardexValorizado.transferirStockValorizado(
        datosBase({ empresaId, establecimientoOrigenId: 'est-equivocado' }),
        { almacenes: almacenesBase(), generarId, fechaActual }
      )
    ).rejects.toThrow(/no pertenece al establecimiento/);
  });

  it('doble clic (mismo hash) devuelve "repetida" sin descontar dos veces', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 20, 'alm-2': 0 } })]);
    const datos = datosBase({ empresaId });

    const r1 = await ServicioKardexValorizado.transferirStockValorizado(datos, { almacenes: almacenesBase(), generarId, fechaActual });
    const r2 = await ServicioKardexValorizado.transferirStockValorizado(datos, { almacenes: almacenesBase(), generarId, fechaActual });

    expect(r1.estado).toBe('nueva');
    expect(r2.estado).toBe('repetida');
    expect(r2.resultadoIds).toEqual(r1.resultadoIds);
    expect(r2.movimientos).toEqual([]);
    expect(r2.productosActualizados).toEqual([]);

    const productos = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productos[0].stockPorAlmacen['alm-1']).toBe(15);
    expect(productos[0].stockPorAlmacen['alm-2']).toBe(5);
  });

  it('recarga tras confirmar (misma clave, mismo contenido) recupera los mismos resultadoIds', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 20, 'alm-2': 0 } })]);
    const datos = datosBase({ empresaId });

    const r1 = await ServicioKardexValorizado.transferirStockValorizado(datos, { almacenes: almacenesBase(), generarId, fechaActual });
    // Simula una "recarga de página": se reconstruye el mismo documento con la misma clave/contenido.
    const r2 = await ServicioKardexValorizado.transferirStockValorizado({ ...datos }, { almacenes: almacenesBase(), generarId, fechaActual });

    expect(r2.estado).toBe('repetida');
    expect(r2.resultadoIds).toEqual(r1.resultadoIds);
  });

  it('conflicto: misma clave con datos distintos rechaza (nunca reprocesa en silencio)', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 20, 'alm-2': 0 } })]);

    await ServicioKardexValorizado.transferirStockValorizado(datosBase({ empresaId, cantidadUnidadMinima: 5 }), {
      almacenes: almacenesBase(), generarId, fechaActual,
    });

    await expect(
      ServicioKardexValorizado.transferirStockValorizado(datosBase({ empresaId, cantidadUnidadMinima: 9 }), {
        almacenes: almacenesBase(), generarId, fechaActual,
      })
    ).rejects.toThrow(ConflictoIdempotencia);
  });

  it('cero segunda persistencia: tras "repetida" no se vuelve a escribir el documento Transferencia', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 20, 'alm-2': 0 } })]);
    const datos = datosBase({ empresaId });

    await ServicioKardexValorizado.transferirStockValorizado(datos, { almacenes: almacenesBase(), generarId, fechaActual });
    const transferenciasTrasPrimera = leerTransferencias(empresaId);
    await ServicioKardexValorizado.transferirStockValorizado(datos, { almacenes: almacenesBase(), generarId, fechaActual });
    const transferenciasTrasSegunda = leerTransferencias(empresaId);

    expect(transferenciasTrasSegunda).toHaveLength(1);
    expect(transferenciasTrasPrimera).toHaveLength(1);
  });
});

describe('transferirStockValorizado — modo valorizado (capacidad lista, dormida hasta que Etapa 2 la active explícitamente)', () => {
  it('una capa: consume exactamente lo transferido, crea capa destino con el mismo costo unitario', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 20, 'alm-2': 0 } })]);
    guardarCapaCostoInventario(crearCapa({ id: 'capa-1', cantidadInicial: 20, cantidadDisponible: 20 }), empresaId);

    await ServicioKardexValorizado.transferirStockValorizado(datosBase({ empresaId, cantidadUnidadMinima: 5 }), {
      almacenes: almacenesBase(), generarId, fechaActual, valorizacionHabilitada: true,
    });

    const capas = listarCapasCostoInventarioPorEmpresa(empresaId);
    const capaOrigen = capas.find((c) => c.id === 'capa-1');
    expect(capaOrigen?.cantidadDisponible).toBe(15);
    expect(capaOrigen?.estado).toBe('disponible');

    const capaDestino = capas.find((c) => c.almacenId === 'alm-2');
    expect(capaDestino).toBeDefined();
    expect(capaDestino?.cantidadInicial).toBe(5);
    expect(capaDestino?.cantidadDisponible).toBe(5);
    expect(capaDestino?.costoUnitarioBaseMonedaBase).toBe(12.5);
    expect(capaDestino?.costoUnitarioBaseOriginal).toBe(12.5);
    expect(capaDestino?.monedaOriginal).toBe('PEN');
    expect(capaDestino?.tipoCambioAplicado).toBe(1);
    expect(capaDestino?.fechaEntrada).toBe('2026-01-01T00:00:00.000Z');
    expect(capaDestino?.fechaCreacion).toBe('2026-08-01T00:00:00.000Z');
    expect(capaDestino?.capaOrigenId).toBe('capa-1');
    expect(capaDestino?.procedencia).toBe('transferencia');
    expect(capaDestino?.establecimientoId).toBe(EST_1);
    expect(capaDestino?.almacenId).toBe('alm-2');

    const consumos = listarConsumosCapaCostoInventarioPorEmpresa(empresaId);
    expect(consumos).toHaveLength(1);
    expect(consumos[0].capaId).toBe('capa-1');
    expect(consumos[0].cantidadConsumida).toBe(5);
    expect(consumos[0].motivo).toBe('transferencia');
  });

  it('agota una capa exactamente: cantidadDisponible llega a 0 y estado pasa a agotada', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 5, 'alm-2': 0 } })]);
    guardarCapaCostoInventario(crearCapa({ id: 'capa-1', cantidadInicial: 5, cantidadDisponible: 5 }), empresaId);

    await ServicioKardexValorizado.transferirStockValorizado(datosBase({ empresaId, cantidadUnidadMinima: 5 }), {
      almacenes: almacenesBase(), generarId, fechaActual, valorizacionHabilitada: true,
    });

    const capaOrigen = listarCapasCostoInventarioPorEmpresa(empresaId).find((c) => c.id === 'capa-1');
    expect(capaOrigen?.cantidadDisponible).toBe(0);
    expect(capaOrigen?.estado).toBe('agotada');
  });

  it('varias capas FIFO: consume en orden fechaEntrada→fechaCreacion→id, agregando por varias capas', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 20, 'alm-2': 0 } })]);
    guardarCapaCostoInventario(crearCapa({ id: 'capa-vieja', fechaEntrada: '2026-01-01T00:00:00.000Z', cantidadInicial: 4, cantidadDisponible: 4, costoUnitarioBaseMonedaBase: 10 }), empresaId);
    guardarCapaCostoInventario(crearCapa({ id: 'capa-nueva', fechaEntrada: '2026-02-01T00:00:00.000Z', cantidadInicial: 10, cantidadDisponible: 10, costoUnitarioBaseMonedaBase: 20 }), empresaId);

    await ServicioKardexValorizado.transferirStockValorizado(datosBase({ empresaId, cantidadUnidadMinima: 6 }), {
      almacenes: almacenesBase(), generarId, fechaActual, valorizacionHabilitada: true,
    });

    const capas = listarCapasCostoInventarioPorEmpresa(empresaId);
    // Consume TODA la capa vieja (4) primero, luego 2 de la nueva.
    expect(capas.find((c) => c.id === 'capa-vieja')?.cantidadDisponible).toBe(0);
    expect(capas.find((c) => c.id === 'capa-vieja')?.estado).toBe('agotada');
    expect(capas.find((c) => c.id === 'capa-nueva')?.cantidadDisponible).toBe(8);

    const capasDestino = capas.filter((c) => c.almacenId === 'alm-2');
    expect(capasDestino).toHaveLength(2);
    expect(capasDestino.map((c) => c.cantidadInicial).sort((a, b) => a - b)).toEqual([2, 4]);

    const consumos = listarConsumosCapaCostoInventarioPorEmpresa(empresaId);
    expect(consumos).toHaveLength(2);
    expect(consumos.reduce((s, c) => s + c.cantidadConsumida, 0)).toBe(6);
  });

  it('desempate por fechaCreacion cuando fechaEntrada coincide, y por id cuando ambas coinciden', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 20, 'alm-2': 0 } })]);
    guardarCapaCostoInventario(crearCapa({
      id: 'capa-b', fechaEntrada: '2026-01-01T00:00:00.000Z', fechaCreacion: '2026-01-02T00:00:00.000Z', cantidadInicial: 3, cantidadDisponible: 3,
    }), empresaId);
    guardarCapaCostoInventario(crearCapa({
      id: 'capa-a', fechaEntrada: '2026-01-01T00:00:00.000Z', fechaCreacion: '2026-01-01T00:00:00.000Z', cantidadInicial: 3, cantidadDisponible: 3,
    }), empresaId);

    await ServicioKardexValorizado.transferirStockValorizado(datosBase({ empresaId, cantidadUnidadMinima: 3 }), {
      almacenes: almacenesBase(), generarId, fechaActual, valorizacionHabilitada: true,
    });

    const capas = listarCapasCostoInventarioPorEmpresa(empresaId);
    // capa-a tiene fechaCreacion más temprana → se consume primero y queda agotada.
    expect(capas.find((c) => c.id === 'capa-a')?.cantidadDisponible).toBe(0);
    expect(capas.find((c) => c.id === 'capa-b')?.cantidadDisponible).toBe(3);
  });

  it('cantidad de capas insuficiente rechaza toda la transferencia (sin mutar stock ni capas)', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 20, 'alm-2': 0 } })]);
    guardarCapaCostoInventario(crearCapa({ id: 'capa-1', cantidadInicial: 3, cantidadDisponible: 3 }), empresaId);

    await expect(
      ServicioKardexValorizado.transferirStockValorizado(datosBase({ empresaId, cantidadUnidadMinima: 5 }), {
        almacenes: almacenesBase(), generarId, fechaActual, valorizacionHabilitada: true,
      })
    ).rejects.toThrow(/no cubren exactamente la cantidad/);

    const productos = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productos[0].stockPorAlmacen['alm-1']).toBe(20);
    expect(listarCapasCostoInventarioPorEmpresa(empresaId).find((c) => c.id === 'capa-1')?.cantidadDisponible).toBe(3);
    expect(listarConsumosCapaCostoInventarioPorEmpresa(empresaId)).toHaveLength(0);
  });

  it('linaje completo: capasOrigenIds/capasDestinoIds quedan registrados en el documento Transferencia', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 20, 'alm-2': 0 } })]);
    guardarCapaCostoInventario(crearCapa({ id: 'capa-1', cantidadInicial: 20, cantidadDisponible: 20 }), empresaId);

    await ServicioKardexValorizado.transferirStockValorizado(datosBase({ empresaId, cantidadUnidadMinima: 5 }), {
      almacenes: almacenesBase(), generarId, fechaActual, valorizacionHabilitada: true,
    });

    const transferencia = leerTransferencias(empresaId).find((t) => t.id === 'trf-1');
    expect(transferencia?.capasOrigenIds).toEqual(['capa-1']);
    expect(transferencia?.capasDestinoIds).toHaveLength(1);
    expect(transferencia?.empresaId).toBe(empresaId);
  });

  it('no genera costo de venta, utilidad ni margen: solo movimientos, capas y consumos — nada más', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 20, 'alm-2': 0 } })]);
    guardarCapaCostoInventario(crearCapa({ id: 'capa-1', cantidadInicial: 20, cantidadDisponible: 20 }), empresaId);

    const resultado = await ServicioKardexValorizado.transferirStockValorizado(datosBase({ empresaId, cantidadUnidadMinima: 5 }), {
      almacenes: almacenesBase(), generarId, fechaActual, valorizacionHabilitada: true,
    });

    for (const mov of resultado.movimientos) {
      expect((mov as unknown as Record<string, unknown>).costoVenta).toBeUndefined();
      expect((mov as unknown as Record<string, unknown>).utilidad).toBeUndefined();
      expect((mov as unknown as Record<string, unknown>).margen).toBeUndefined();
    }
  });

  it('aislamiento multiempresa: las capas de la empresa B nunca se usan para una transferencia de la empresa A', async () => {
    sembrarProductos('emp-A', [crearProducto({ stockPorAlmacen: { 'alm-1': 20, 'alm-2': 0 } })]);
    guardarCapaCostoInventario(crearCapa({ id: 'capa-B', empresaId: 'emp-B' }), 'emp-B');

    await ServicioKardexValorizado.transferirStockValorizado(datosBase({ empresaId: 'emp-A', cantidadUnidadMinima: 5 }), {
      almacenes: almacenesBase(), generarId, fechaActual, valorizacionHabilitada: true,
    });

    // Sin capas propias, la empresa A opera en modo cuantitativo puro — no crea ni toca capas.
    expect(listarCapasCostoInventarioPorEmpresa('emp-A')).toHaveLength(0);
    expect(listarCapasCostoInventarioPorEmpresa('emp-B')).toHaveLength(1);
  });
});

describe('transferirStockValorizado — cierre final Etapa 1E §1: la presencia de capas NUNCA activa la valorización por sí sola', () => {
  it('con capas disponibles pero SIN valorizacionHabilitada, la transferencia opera en modo cuantitativo puro (no toca capas ni consumos)', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 20, 'alm-2': 0 } })]);
    guardarCapaCostoInventario(crearCapa({ id: 'capa-1', cantidadInicial: 20, cantidadDisponible: 20 }), empresaId);

    const resultado = await ServicioKardexValorizado.transferirStockValorizado(datosBase({ empresaId, cantidadUnidadMinima: 5 }), {
      almacenes: almacenesBase(), generarId, fechaActual,
      // valorizacionHabilitada deliberadamente AUSENTE — igual que todo consumidor productivo hoy.
    });

    expect(resultado.movimientos).toHaveLength(2);
    const productos = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productos[0].stockPorAlmacen['alm-1']).toBe(15);
    expect(productos[0].stockPorAlmacen['alm-2']).toBe(5);

    // La capa existente permanece EXACTAMENTE igual — nunca se consultó ni se tocó.
    const capa = listarCapasCostoInventarioPorEmpresa(empresaId).find((c) => c.id === 'capa-1');
    expect(capa?.cantidadDisponible).toBe(20);
    expect(capa?.estado).toBe('disponible');
    expect(listarConsumosCapaCostoInventarioPorEmpresa(empresaId)).toHaveLength(0);
    // Tampoco se crea una capa nueva en destino.
    expect(listarCapasCostoInventarioPorEmpresa(empresaId)).toHaveLength(1);

    const transferencia = leerTransferencias(empresaId).find((t) => t.id === 'trf-1');
    expect(transferencia?.capasOrigenIds).toBeUndefined();
    expect(transferencia?.capasDestinoIds).toBeUndefined();
  });

  it('con valorizacionHabilitada explícitamente false, se comporta igual que ausente', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: { 'alm-1': 20, 'alm-2': 0 } })]);
    guardarCapaCostoInventario(crearCapa({ id: 'capa-1', cantidadInicial: 20, cantidadDisponible: 20 }), empresaId);

    await ServicioKardexValorizado.transferirStockValorizado(datosBase({ empresaId, cantidadUnidadMinima: 5 }), {
      almacenes: almacenesBase(), generarId, fechaActual, valorizacionHabilitada: false,
    });

    const capa = listarCapasCostoInventarioPorEmpresa(empresaId).find((c) => c.id === 'capa-1');
    expect(capa?.cantidadDisponible).toBe(20);
  });
});
