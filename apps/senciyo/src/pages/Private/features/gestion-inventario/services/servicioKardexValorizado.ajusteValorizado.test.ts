// Etapa 2, §10: ajuste positivo con costo obligatorio cuando modoOperacion='valorizado'. Nunca
// activado productivamente en esta etapa (estadoValorizacion nunca llega a 'activa') — pero el
// motor debe soportarlo y rechazarlo correctamente cuando se ejerce directamente (tests).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { instalarLocalStorageDePrueba } from '../repositories/localStorageDePrueba';
import { ServicioKardexValorizado } from './servicioKardexValorizado';
import { PRODUCT_STORAGE_KEY } from '../../catalogo-articulos/utils/catalogStorage';
import { listarCapasCostoInventarioPorEmpresa } from '../repositories/capaCostoInventario.repository';
import type { DatosOperacionEntradaCuantitativa } from '../models/operacionEntradaInventario.types';
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

function sembrarProductos(empresaId: string, productos: Product[]): void {
  localStorage.setItem(lsKey(PRODUCT_STORAGE_KEY, empresaId), JSON.stringify(productos));
}

function datosAjusteValorizado(overrides: Partial<DatosOperacionEntradaCuantitativa> = {}): DatosOperacionEntradaCuantitativa {
  return {
    modoOperacion: 'valorizado',
    empresaId: 'emp-A',
    documentoId: 'ajuste-1',
    tipoDocumento: 'ajuste',
    tipoOperacion: 'ajuste_positivo',
    claveIdempotencia: 'ajuste_positivo:ajuste-1',
    usuario: 'user-1',
    fecha: '2026-01-01T00:00:00.000Z',
    motivo: 'AJUSTE_INVENTARIO',
    lineas: [{ lineaId: 'linea-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 10, costoUnitarioBaseMonedaBase: 12 }],
    ...overrides,
  };
}

describe('ServicioKardexValorizado.registrarEntradaValorizada — ajuste positivo valorizado (Etapa 2, §10)', () => {
  it('crea una CapaCostoInventario con procedencia "ajuste" y el costo declarado', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto({ stockPorAlmacen: {} })]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    const resultado = await ServicioKardexValorizado.registrarEntradaValorizada(datosAjusteValorizado({ empresaId }), {
      almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada', monedaBase: 'PEN',
    });

    expect(resultado.estado).toBe('nueva');
    expect(resultado.productosActualizados[0].stockPorAlmacen?.['alm-1']).toBe(10);

    const capas = listarCapasCostoInventarioPorEmpresa(empresaId);
    expect(capas).toHaveLength(1);
    expect(capas[0].procedencia).toBe('ajuste');
    expect(capas[0].tipoDocumentoOrigen).toBe('ajuste');
    expect(capas[0].productoId).toBe('prod-1');
    expect(capas[0].almacenId).toBe('alm-1');
    expect(capas[0].cantidadInicial).toBe(10);
    expect(capas[0].cantidadDisponible).toBe(10);
    expect(capas[0].costoUnitarioBaseMonedaBase).toBe(12);
    expect(capas[0].valorValorizableMonedaBase).toBe(120);
    expect(capas[0].monedaBase).toBe('PEN');
    expect(capas[0].estado).toBe('disponible');
  });

  it('rechaza costo cero incluso si la UI lo permitiera (defensa en el servicio, no solo en el input)', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto()]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    await expect(
      ServicioKardexValorizado.registrarEntradaValorizada(
        datosAjusteValorizado({ empresaId, lineas: [{ lineaId: 'linea-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 10, costoUnitarioBaseMonedaBase: 0 }] }),
        { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada', monedaBase: 'PEN' }
      )
    ).rejects.toThrow(/costoUnitarioBaseMonedaBase/);

    expect(listarCapasCostoInventarioPorEmpresa(empresaId)).toHaveLength(0);
  });

  it('rechaza costo negativo', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto()]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    await expect(
      ServicioKardexValorizado.registrarEntradaValorizada(
        datosAjusteValorizado({ empresaId, lineas: [{ lineaId: 'linea-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 10, costoUnitarioBaseMonedaBase: -5 }] }),
        { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada', monedaBase: 'PEN' }
      )
    ).rejects.toThrow(/costoUnitarioBaseMonedaBase/);
  });

  it('rechaza costo NaN/no finito', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto()]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    await expect(
      ServicioKardexValorizado.registrarEntradaValorizada(
        datosAjusteValorizado({ empresaId, lineas: [{ lineaId: 'linea-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 10, costoUnitarioBaseMonedaBase: NaN }] }),
        { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada', monedaBase: 'PEN' }
      )
    ).rejects.toThrow(/costoUnitarioBaseMonedaBase/);
  });

  it('rechaza si falta costoUnitarioBaseMonedaBase en la línea', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto()]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    await expect(
      ServicioKardexValorizado.registrarEntradaValorizada(
        datosAjusteValorizado({ empresaId, lineas: [{ lineaId: 'linea-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 10 }] }),
        { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada', monedaBase: 'PEN' }
      )
    ).rejects.toThrow(/costoUnitarioBaseMonedaBase/);
  });

  it('no permite saltar la validación llamando con modoOperacion="valorizado" para un tipoOperacion distinto de ajuste_positivo', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto()]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    await expect(
      ServicioKardexValorizado.registrarEntradaValorizada(
        datosAjusteValorizado({ empresaId, tipoOperacion: 'ni_automatica', tipoDocumento: 'nota_ingreso' }),
        { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada', monedaBase: 'PEN' }
      )
    ).rejects.toThrow(/ajuste_positivo/);
  });

  it('rechaza si falta monedaBase en las dependencias', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto()]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    await expect(
      ServicioKardexValorizado.registrarEntradaValorizada(datosAjusteValorizado({ empresaId }), { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada' })
    ).rejects.toThrow(/monedaBase/);
  });

  it('reintento idempotente (mismo hash) no duplica la capa', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto()]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);
    const datos = datosAjusteValorizado({ empresaId });

    await ServicioKardexValorizado.registrarEntradaValorizada(datos, { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada', monedaBase: 'PEN' });
    const resultado2 = await ServicioKardexValorizado.registrarEntradaValorizada(datos, { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada', monedaBase: 'PEN' });

    expect(resultado2.estado).toBe('repetida');
    expect(listarCapasCostoInventarioPorEmpresa(empresaId)).toHaveLength(1);
  });

  it('un reintento con la misma clave pero costo distinto es un conflicto de idempotencia (el costo forma parte del hash)', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto()]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    await ServicioKardexValorizado.registrarEntradaValorizada(datosAjusteValorizado({ empresaId }), { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada', monedaBase: 'PEN' });

    const datosCostoDistinto = datosAjusteValorizado({
      empresaId,
      lineas: [{ lineaId: 'linea-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 10, costoUnitarioBaseMonedaBase: 99 }],
    });

    await expect(
      ServicioKardexValorizado.registrarEntradaValorizada(datosCostoDistinto, { almacenes, generarId, fechaActual, estadoValorizacion: 'no_iniciada', monedaBase: 'PEN' })
    ).rejects.toThrow();
    expect(listarCapasCostoInventarioPorEmpresa(empresaId)).toHaveLength(1);
  });
});

// ─── Cierre de bloqueante 1 de la revisión de Etapa 2: "valorizado_exclusivo" (estadoValorizacion
// === 'activa', inalcanzable productivamente en Etapa 2, solo ejercido aquí por tests) exige el
// contrato valorizado — nunca puede ejecutarse en modo cuantitativo antes de 'activa'. ──────────
describe('ServicioKardexValorizado — modo "valorizado_exclusivo" (estadoValorizacion="activa") exige el contrato valorizado', () => {
  it('rechaza un ajuste_positivo CUANTITATIVO cuando estadoValorizacion="activa" — exige el contrato valorizado', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto()]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    const datosCuantitativos = {
      modoOperacion: 'cuantitativo' as const,
      empresaId,
      documentoId: 'ajuste-1',
      tipoDocumento: 'ajuste' as const,
      tipoOperacion: 'ajuste_positivo' as const,
      claveIdempotencia: 'ajuste_positivo:ajuste-1',
      usuario: 'user-1',
      fecha: '2026-01-01T00:00:00.000Z',
      motivo: 'AJUSTE_INVENTARIO' as const,
      lineas: [{ lineaId: 'linea-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 10 }],
    };

    await expect(
      ServicioKardexValorizado.registrarEntradaValorizada(datosCuantitativos, { almacenes, generarId, fechaActual, estadoValorizacion: 'activa' })
    ).rejects.toThrow(/valorizado_exclusivo/);

    expect(listarCapasCostoInventarioPorEmpresa(empresaId)).toHaveLength(0);
  });

  it('SÍ permite un ajuste_positivo VALORIZADO (modoOperacion="valorizado") cuando estadoValorizacion="activa" — el gate no bloquea el contrato correcto', async () => {
    const empresaId = 'emp-A';
    sembrarProductos(empresaId, [crearProducto()]);
    const almacenes = new Map([['alm-1', crearAlmacen()]]);

    const resultado = await ServicioKardexValorizado.registrarEntradaValorizada(datosAjusteValorizado({ empresaId }), {
      almacenes, generarId, fechaActual, estadoValorizacion: 'activa', monedaBase: 'PEN',
    });

    expect(resultado.estado).toBe('nueva');
    expect(listarCapasCostoInventarioPorEmpresa(empresaId)).toHaveLength(1);
  });
});
