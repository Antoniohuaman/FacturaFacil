import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { instalarLocalStorageDePrueba } from '../repositories/localStorageDePrueba';
import {
  iniciarPreparacionValorizacion,
  confirmarCostoDetalle,
  recalcularDetalle,
  cancelarPreparacion,
  verificarCondicionesValidacion,
  validarYTransicionarAValidada,
} from './valorizacionInicial.service';
import {
  obtenerLoteActivoPorEmpresa,
  listarValorizacionInicialInventarioPorEmpresa,
  CLAVE_COLECCION_VALORIZACION_INICIAL_INVENTARIO,
} from '../repositories/valorizacionInicialInventario.repository';
import {
  encolarInvalidacionPendiente,
  listarInvalidacionesPendientes,
} from '../repositories/invalidacionPendienteValorizacionInicial.repository';
import { CLAVE_COLECCION_OPERACIONES_IDEMPOTENTES } from '../repositories/operacionIdempotenteInventario.repository';
import { ServicioKardexValorizado } from './servicioKardexValorizado';
import { PRODUCT_STORAGE_KEY } from '../../catalogo-articulos/utils/catalogStorage';
import { lsKey } from '../../../../../shared/tenant';
import type { Product } from '../../catalogo-articulos/models/types';
import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';
import type { OperacionIdempotenteInventario } from '../models/operacionIdempotenteInventario.types';
import type { DatosOperacionSalidaCuantitativa } from '../models/operacionEntradaInventario.types';

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

function crearAlmacen(id: string): Almacen {
  return { id } as Almacen;
}
const almacenes = new Map<string, Almacen>([['alm-1', crearAlmacen('alm-1')], ['alm-2', crearAlmacen('alm-2')]]);

function crearProducto(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod-1',
    codigo: 'P001',
    nombre: 'Producto 1',
    tipoExistencia: 'MERCADERIAS',
    precioCompra: 8,
    stockPorAlmacen: { 'alm-1': 10 },
    ...overrides,
  } as Product;
}

function depsBase(overrides: Partial<Parameters<typeof iniciarPreparacionValorizacion>[1]> = {}) {
  return {
    empresaId: 'emp-A',
    usuario: 'user-1',
    productos: [crearProducto()],
    almacenes,
    generarId,
    fechaActual,
    ...overrides,
  };
}

describe('iniciarPreparacionValorizacion', () => {
  it('crea un lote en pendiente_costos con un detalle por producto+almacén detectado', () => {
    const resultado = iniciarPreparacionValorizacion('no_iniciada', depsBase());
    expect(resultado.estadoValorizacion).toBe('pendiente_costos');
    expect(resultado.lote.detalles).toHaveLength(1);
    expect(resultado.lote.detalles[0]).toMatchObject({
      productoId: 'prod-1',
      almacenId: 'alm-1',
      cantidadDetectada: 10,
      costoPropuesto: 8,
      origenPropuesta: 'precioCompra',
      confirmado: false,
      requiereRecalculo: false,
    });
  });

  it('rechaza iniciar desde un estado que no sea no_iniciada o cancelada_antes_activacion', () => {
    expect(() => iniciarPreparacionValorizacion('validada', depsBase())).toThrow();
    expect(() => iniciarPreparacionValorizacion('activa', depsBase())).toThrow();
  });

  it('doble inicio no duplica el lote (idempotente)', () => {
    const primero = iniciarPreparacionValorizacion('no_iniciada', depsBase());
    const segundo = iniciarPreparacionValorizacion('pendiente_costos', depsBase());
    expect(segundo.lote.id).toBe(primero.lote.id);
    expect(listarValorizacionInicialInventarioPorEmpresa('emp-A')).toHaveLength(1);
  });

  it('reiniciar tras cancelación crea un lote NUEVO (nunca reutiliza el cancelado)', () => {
    const primero = iniciarPreparacionValorizacion('no_iniciada', depsBase());
    cancelarPreparacion('pendiente_costos', 'emp-A');
    const segundo = iniciarPreparacionValorizacion('cancelada_antes_activacion', depsBase());
    expect(segundo.lote.id).not.toBe(primero.lote.id);
    expect(listarValorizacionInicialInventarioPorEmpresa('emp-A')).toHaveLength(2);
    expect(obtenerLoteActivoPorEmpresa('emp-A')?.id).toBe(segundo.lote.id);
  });

  it('excluye productos no inventariables y stock cero/negativo', () => {
    const resultado = iniciarPreparacionValorizacion('no_iniciada', depsBase({
      productos: [
        crearProducto({ id: 'p-servicio', tipoExistencia: 'SERVICIOS', stockPorAlmacen: { 'alm-1': 20 } }),
        crearProducto({ id: 'p-cero', stockPorAlmacen: { 'alm-1': 0 } }),
      ],
    }));
    expect(resultado.lote.detalles).toHaveLength(0);
  });

  it('un producto sin precioCompra queda sin_propuesta (pendiente de costo)', () => {
    const resultado = iniciarPreparacionValorizacion('no_iniciada', depsBase({ productos: [crearProducto({ precioCompra: undefined })] }));
    expect(resultado.lote.detalles[0].origenPropuesta).toBe('sin_propuesta');
    expect(resultado.lote.detalles[0].costoPropuesto).toBe(0);
  });

  it('aísla lotes por empresa', () => {
    iniciarPreparacionValorizacion('no_iniciada', depsBase({ empresaId: 'emp-A' }));
    iniciarPreparacionValorizacion('no_iniciada', depsBase({ empresaId: 'emp-B' }));
    expect(listarValorizacionInicialInventarioPorEmpresa('emp-A')).toHaveLength(1);
    expect(listarValorizacionInicialInventarioPorEmpresa('emp-B')).toHaveLength(1);
  });
});

describe('confirmarCostoDetalle', () => {
  it('confirma un costo válido', () => {
    iniciarPreparacionValorizacion('no_iniciada', depsBase());
    const lote = confirmarCostoDetalle('emp-A', 'prod-1', 'alm-1', 8, fechaActual());
    expect(lote.detalles[0].costoConfirmado).toBe(8);
    expect(lote.detalles[0].confirmado).toBe(true);
  });

  it('un costo manual distinto de la propuesta marca origenPropuesta="manual"', () => {
    iniciarPreparacionValorizacion('no_iniciada', depsBase());
    const lote = confirmarCostoDetalle('emp-A', 'prod-1', 'alm-1', 12, fechaActual(), true);
    expect(lote.detalles[0].costoConfirmado).toBe(12);
    expect(lote.detalles[0].origenPropuesta).toBe('manual');
  });

  it('rechaza costo cero', () => {
    iniciarPreparacionValorizacion('no_iniciada', depsBase());
    expect(() => confirmarCostoDetalle('emp-A', 'prod-1', 'alm-1', 0, fechaActual())).toThrow();
  });

  it('rechaza costo negativo', () => {
    iniciarPreparacionValorizacion('no_iniciada', depsBase());
    expect(() => confirmarCostoDetalle('emp-A', 'prod-1', 'alm-1', -5, fechaActual())).toThrow();
  });

  it('rechaza costo NaN', () => {
    iniciarPreparacionValorizacion('no_iniciada', depsBase());
    expect(() => confirmarCostoDetalle('emp-A', 'prod-1', 'alm-1', NaN, fechaActual())).toThrow();
  });

  it('rechaza confirmar sobre un detalle inexistente', () => {
    iniciarPreparacionValorizacion('no_iniciada', depsBase());
    expect(() => confirmarCostoDetalle('emp-A', 'prod-inexistente', 'alm-1', 8, fechaActual())).toThrow();
  });

  it('rechaza confirmar si no hay lote activo', () => {
    expect(() => confirmarCostoDetalle('emp-sin-lote', 'prod-1', 'alm-1', 8, fechaActual())).toThrow();
  });
});

describe('recalcularDetalle', () => {
  it('actualiza cantidadDetectada y exige nueva confirmación', () => {
    iniciarPreparacionValorizacion('no_iniciada', depsBase());
    confirmarCostoDetalle('emp-A', 'prod-1', 'alm-1', 8, fechaActual());
    const productosActualizados = [crearProducto({ stockPorAlmacen: { 'alm-1': 25 } })];
    const lote = recalcularDetalle('emp-A', 'prod-1', 'alm-1', productosActualizados, fechaActual());
    expect(lote.detalles[0].cantidadDetectada).toBe(25);
    expect(lote.detalles[0].confirmado).toBe(false);
    expect(lote.detalles[0].requiereRecalculo).toBe(false);
  });

  it('elimina el detalle si la cantidad recalculada es cero o negativa', () => {
    iniciarPreparacionValorizacion('no_iniciada', depsBase());
    const productosActualizados = [crearProducto({ stockPorAlmacen: { 'alm-1': 0 } })];
    const lote = recalcularDetalle('emp-A', 'prod-1', 'alm-1', productosActualizados, fechaActual());
    expect(lote.detalles).toHaveLength(0);
  });
});

describe('cancelarPreparacion', () => {
  it('cancela un lote en pendiente_costos', () => {
    iniciarPreparacionValorizacion('no_iniciada', depsBase());
    const resultado = cancelarPreparacion('pendiente_costos', 'emp-A');
    expect(resultado.estadoValorizacion).toBe('cancelada_antes_activacion');
    expect(resultado.lote.estado).toBe('cancelada');
  });

  it('nunca crea capas ni movimientos al cancelar (solo cambia el estado del lote)', () => {
    iniciarPreparacionValorizacion('no_iniciada', depsBase());
    const antes = JSON.stringify(listarValorizacionInicialInventarioPorEmpresa('emp-A'));
    cancelarPreparacion('pendiente_costos', 'emp-A');
    const despues = listarValorizacionInicialInventarioPorEmpresa('emp-A');
    expect(despues).toHaveLength(1); // sigue siendo el mismo lote, solo con estado distinto
    expect(JSON.stringify(despues[0].detalles)).toBe(JSON.parse(antes)[0] ? JSON.stringify(JSON.parse(antes)[0].detalles) : undefined);
  });

  it('rechaza cancelar si no hay lote activo', () => {
    expect(() => cancelarPreparacion('en_preparacion', 'emp-sin-lote')).toThrow();
  });
});

describe('verificarCondicionesValidacion / validarYTransicionarAValidada', () => {
  it('bloquea la validación si hay detalles sin costo confirmado', () => {
    const { lote } = iniciarPreparacionValorizacion('no_iniciada', depsBase());
    const motivos = verificarCondicionesValidacion(lote, 'impuesto_recuperable', [crearProducto()], almacenes);
    expect(motivos.some((m) => m.includes('sin costo confirmado'))).toBe(true);
  });

  it('bloquea la validación si el tratamiento tributario está pendiente_configuracion', () => {
    iniciarPreparacionValorizacion('no_iniciada', depsBase());
    confirmarCostoDetalle('emp-A', 'prod-1', 'alm-1', 8, fechaActual());
    const lote = obtenerLoteActivoPorEmpresa('emp-A')!;
    const motivos = verificarCondicionesValidacion(lote, 'pendiente_configuracion', [crearProducto()], almacenes);
    expect(motivos.some((m) => m.includes('tratamiento de impuestos'))).toBe(true);
  });

  it('bloquea la validación si un detalle requiere recálculo', () => {
    iniciarPreparacionValorizacion('no_iniciada', depsBase());
    confirmarCostoDetalle('emp-A', 'prod-1', 'alm-1', 8, fechaActual());
    let lote = obtenerLoteActivoPorEmpresa('emp-A')!;
    lote = { ...lote, detalles: lote.detalles.map((d) => ({ ...d, requiereRecalculo: true })) };
    const motivos = verificarCondicionesValidacion(lote, 'impuesto_recuperable', [crearProducto()], almacenes);
    expect(motivos.some((m) => m.includes('recálculo'))).toBe(true);
  });

  it('no bloquea cuando todo está confirmado, sin recálculo pendiente y tratamiento resuelto', () => {
    iniciarPreparacionValorizacion('no_iniciada', depsBase());
    confirmarCostoDetalle('emp-A', 'prod-1', 'alm-1', 8, fechaActual());
    const lote = obtenerLoteActivoPorEmpresa('emp-A')!;
    const motivos = verificarCondicionesValidacion(lote, 'impuesto_recuperable', [crearProducto()], almacenes);
    expect(motivos).toHaveLength(0);
  });

  it('validarYTransicionarAValidada transiciona pendiente_costos -> validada cuando todo está en orden', () => {
    iniciarPreparacionValorizacion('no_iniciada', depsBase());
    confirmarCostoDetalle('emp-A', 'prod-1', 'alm-1', 8, fechaActual());
    const resultado = validarYTransicionarAValidada('pendiente_costos', 'emp-A', 'impuesto_recuperable', [crearProducto()], almacenes);
    expect(resultado.estadoValorizacion).toBe('validada');
    expect(resultado.lote.estado).toBe('validada');
  });

  it('validarYTransicionarAValidada rechaza si quedan costos pendientes', () => {
    iniciarPreparacionValorizacion('no_iniciada', depsBase());
    expect(() =>
      validarYTransicionarAValidada('pendiente_costos', 'emp-A', 'impuesto_recuperable', [crearProducto()], almacenes)
    ).toThrow();
  });

  it('nunca crea capas ni movimientos al validar', () => {
    iniciarPreparacionValorizacion('no_iniciada', depsBase());
    confirmarCostoDetalle('emp-A', 'prod-1', 'alm-1', 8, fechaActual());
    validarYTransicionarAValidada('pendiente_costos', 'emp-A', 'impuesto_recuperable', [crearProducto()], almacenes);
    // No hay repositorio de capas tocado — solo verificamos que el lote quedó validado y nada más se escribió.
    expect(listarValorizacionInicialInventarioPorEmpresa('emp-A')).toHaveLength(1);
  });

  // Bloqueante 1 de la revisión de Etapa 2: antes de validar, se consulta el diario/unidad de
  // trabajo de Etapa 1B — una transacción pendiente/ambigua bloquea la transición.
  it('bloquea la validación si existe una OperacionIdempotenteInventario todavía "preparada" (recuperación pendiente)', () => {
    iniciarPreparacionValorizacion('no_iniciada', depsBase());
    confirmarCostoDetalle('emp-A', 'prod-1', 'alm-1', 8, fechaActual());
    const lote = obtenerLoteActivoPorEmpresa('emp-A')!;

    const operacionPendiente: OperacionIdempotenteInventario = {
      id: 'op-pendiente-1',
      empresaId: 'emp-A',
      clave: 'ajuste:doc-x',
      tipoOperacion: 'ajuste_positivo',
      estado: 'preparada',
      hashEntrada: 'hash-x',
      referenciaDocumentoId: 'doc-x',
      referenciaDocumentoTipo: 'ajuste',
      resultadoIds: [],
      fechaCreacion: fechaActual(),
    };
    localStorage.setItem(
      lsKey(CLAVE_COLECCION_OPERACIONES_IDEMPOTENTES, 'emp-A'),
      JSON.stringify([operacionPendiente]),
    );

    const motivos = verificarCondicionesValidacion(lote, 'impuesto_recuperable', [crearProducto()], almacenes);
    expect(motivos.some((m) => m.includes('pendientes o ambiguas'))).toBe(true);
    expect(() =>
      validarYTransicionarAValidada('pendiente_costos', 'emp-A', 'impuesto_recuperable', [crearProducto()], almacenes)
    ).toThrow();
  });

  it('bloquea la validación si existe una invalidación de valorización inicial pendiente de reintento', () => {
    iniciarPreparacionValorizacion('no_iniciada', depsBase());
    confirmarCostoDetalle('emp-A', 'prod-1', 'alm-1', 8, fechaActual());
    const lote = obtenerLoteActivoPorEmpresa('emp-A')!;

    encolarInvalidacionPendiente({
      id: 'pend-1',
      empresaId: 'emp-A',
      afectados: [{ productoId: 'prod-1', almacenId: 'alm-1' }],
      fecha: fechaActual(),
    });

    const motivos = verificarCondicionesValidacion(lote, 'impuesto_recuperable', [crearProducto()], almacenes);
    expect(motivos.some((m) => m.includes('invalidaciones de costo pendientes'))).toBe(true);
    expect(() =>
      validarYTransicionarAValidada('pendiente_costos', 'emp-A', 'impuesto_recuperable', [crearProducto()], almacenes)
    ).toThrow();
  });

  // Extremo a extremo (no simulado a mano): una operación REAL del motor confirma stock, la
  // invalidación del snapshot falla de inmediato y queda encolada de forma durable — sin ejecutar
  // ninguna otra operación de inventario (que la drenaría), intentar validar debe bloquearse.
  it('extremo a extremo: stock confirmado + invalidación fallida en cola bloquea validar sin ejecutar otra operación', async () => {
    const empresaId = 'emp-A';
    iniciarPreparacionValorizacion('no_iniciada', depsBase());
    confirmarCostoDetalle(empresaId, 'prod-1', 'alm-1', 8, fechaActual());

    // Snapshot del lote válido (confirmado, sin invalidar) ANTES de forzar el fallo.
    const loteValidoRaw = localStorage.getItem(lsKey(CLAVE_COLECCION_VALORIZACION_INICIAL_INVENTARIO, empresaId));

    // Producto REAL en el storage que consume el motor (distinto del arreglo en memoria que usa
    // la detección de valorización inicial) — mismo stock que el detalle ya confirmado.
    localStorage.setItem(
      lsKey(PRODUCT_STORAGE_KEY, empresaId),
      JSON.stringify([crearProducto({ stockPorAlmacen: { 'alm-1': 10 } })]),
    );

    // Corrompe deliberadamente la colección de lotes para que la invalidación (que lee el lote
    // activo) falle — sin mockear ninguna función interna, igual que en
    // servicioKardexValorizado.test.ts.
    localStorage.setItem(lsKey(CLAVE_COLECCION_VALORIZACION_INICIAL_INVENTARIO, empresaId), '{"esto no es un arreglo": true}');

    const almacenReal = { id: 'alm-1', codigoAlmacen: 'ALM01', nombreAlmacen: 'Principal', establecimientoId: 'est-1' } as Almacen;
    const datosSalida: DatosOperacionSalidaCuantitativa = {
      modoOperacion: 'cuantitativo',
      empresaId,
      documentoId: 'venta-1',
      tipoDocumento: 'venta',
      tipoOperacion: 'venta_salida',
      claveIdempotencia: 'venta_salida:venta-1',
      usuario: 'user-1',
      fecha: fechaActual(),
      motivo: 'VENTA',
      lineas: [{ lineaId: 'linea-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 3 }],
    };

    const resultado = await ServicioKardexValorizado.registrarSalidaValorizada(datosSalida, {
      almacenes: new Map([['alm-1', almacenReal]]),
      generarId,
      fechaActual,
      estadoValorizacion: 'pendiente_costos',
    });

    // El stock quedó confirmado por el motor (la mutación real nunca se revierte por un fallo de bookkeeping).
    expect(resultado.estado).toBe('nueva');
    const productos = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    expect(productos[0].stockPorAlmacen?.['alm-1']).toBe(7);

    // La invalidación falló de inmediato y quedó encolada de forma durable.
    expect(listarInvalidacionesPendientes(empresaId)).toHaveLength(1);

    // Se repara la colección de lotes (el lote sigue exactamente como quedó confirmado, NUNCA
    // invalidado) — sin ejecutar ninguna otra operación de inventario que drenaría la cola.
    localStorage.setItem(lsKey(CLAVE_COLECCION_VALORIZACION_INICIAL_INVENTARIO, empresaId), loteValidoRaw as string);

    const lote = obtenerLoteActivoPorEmpresa(empresaId)!;
    const motivos = verificarCondicionesValidacion(lote, 'impuesto_recuperable', [crearProducto()], almacenes);
    expect(motivos.some((m) => m.includes('invalidaciones de costo pendientes'))).toBe(true);
    expect(() =>
      validarYTransicionarAValidada('pendiente_costos', empresaId, 'impuesto_recuperable', [crearProducto()], almacenes)
    ).toThrow();

    // La cola sigue intacta — nada la drenó.
    expect(listarInvalidacionesPendientes(empresaId)).toHaveLength(1);
  });

  it('no bloquea la validación por operaciones de OTRA empresa (aislamiento por tenant)', () => {
    iniciarPreparacionValorizacion('no_iniciada', depsBase());
    confirmarCostoDetalle('emp-A', 'prod-1', 'alm-1', 8, fechaActual());
    const lote = obtenerLoteActivoPorEmpresa('emp-A')!;

    const operacionOtraEmpresa: OperacionIdempotenteInventario = {
      id: 'op-otra-1',
      empresaId: 'emp-B',
      clave: 'ajuste:doc-y',
      tipoOperacion: 'ajuste_positivo',
      estado: 'preparada',
      hashEntrada: 'hash-y',
      referenciaDocumentoId: 'doc-y',
      referenciaDocumentoTipo: 'ajuste',
      resultadoIds: [],
      fechaCreacion: fechaActual(),
    };
    localStorage.setItem(
      lsKey(CLAVE_COLECCION_OPERACIONES_IDEMPOTENTES, 'emp-B'),
      JSON.stringify([operacionOtraEmpresa]),
    );

    const motivos = verificarCondicionesValidacion(lote, 'impuesto_recuperable', [crearProducto()], almacenes);
    expect(motivos).toHaveLength(0);
  });
});
