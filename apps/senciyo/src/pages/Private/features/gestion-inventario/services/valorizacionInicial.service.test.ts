import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { instalarLocalStorageDePrueba } from '../repositories/localStorageDePrueba';
import {
  iniciarPreparacionValorizacion,
  confirmarCostoDetalle,
  recalcularDetalle,
  cancelarPreparacion,
  verificarCondicionesValidacion,
  validarYTransicionarAValidada,
  puedeIniciarActivacion,
  puedeReanudarOIniciarActivacion,
  construirClaveActivacion,
  calcularHashActivacion,
  verificarCondicionesActivacion,
  construirManifiestoCapacidadesActivacion,
  calcularCapacidadesActivacionReales,
  capacidadBloqueaActivacion,
  ejecutarActivacionValorizacion,
  verificarReconciliacionCapasIniciales,
} from './valorizacionInicial.service';
import {
  obtenerLoteActivoPorEmpresa,
  listarValorizacionInicialInventarioPorEmpresa,
  actualizarValorizacionInicialInventario,
  CLAVE_COLECCION_VALORIZACION_INICIAL_INVENTARIO,
} from '../repositories/valorizacionInicialInventario.repository';
import {
  encolarInvalidacionPendiente,
  listarInvalidacionesPendientes,
} from '../repositories/invalidacionPendienteValorizacionInicial.repository';
import { CLAVE_COLECCION_OPERACIONES_IDEMPOTENTES } from '../repositories/operacionIdempotenteInventario.repository';
import { guardarCapaCostoInventario, actualizarCapaCostoInventario, listarCapasCostoInventarioPorEmpresa } from '../repositories/capaCostoInventario.repository';
import { listarConsumosCapaCostoInventarioPorEmpresa } from '../repositories/consumoCapaCostoInventario.repository';
import { ServicioKardexValorizado } from './servicioKardexValorizado';
import { PRODUCT_STORAGE_KEY } from '../../catalogo-articulos/utils/catalogStorage';
import { lsKey } from '../../../../../shared/tenant';
import type { Product } from '../../catalogo-articulos/models/types';
import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';
import type { CapaCostoInventario } from '../models/capaCostoInventario.types';
import type { OperacionIdempotenteInventario } from '../models/operacionIdempotenteInventario.types';
import type { DatosOperacionSalidaCuantitativa, DatosOperacionEntradaCuantitativa } from '../models/operacionEntradaInventario.types';
import type { DatosTransferenciaInventario } from '../models/operacionTransferenciaInventario.types';

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

// ─── Cierre Etapa 4B: activación final ─────────────────────────────────────

function crearAlmacenCompleto(id: string, overrides: Partial<Almacen> = {}): Almacen {
  return {
    id,
    codigoAlmacen: `ALM-${id}`,
    nombreAlmacen: `Almacén ${id}`,
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

/** Recorre iniciar → confirmar costo de cada detalle → validar, reutilizando exactamente las mismas funciones productivas. */
function prepararLoteValidado(
  empresaId: string,
  productos: Product[],
  almacenesParam: Map<string, Almacen>,
  costoPorDefecto = 8
): ValorizacionInicialInventario {
  iniciarPreparacionValorizacion('no_iniciada', {
    empresaId, usuario: 'user-1', productos, almacenes: almacenesParam, generarId, fechaActual,
  });
  const loteInicial = obtenerLoteActivoPorEmpresa(empresaId)!;
  for (const detalle of loteInicial.detalles) {
    confirmarCostoDetalle(empresaId, detalle.productoId, detalle.almacenId, costoPorDefecto, fechaActual());
  }
  const resultado = validarYTransicionarAValidada('pendiente_costos', empresaId, 'impuesto_recuperable', productos, almacenesParam);
  return resultado.lote;
}

describe('Etapa 4B: puedeIniciarActivacion (guarda de la máquina central)', () => {
  it('permite desde validada y fallida_recuperable', () => {
    expect(puedeIniciarActivacion('validada')).toBe(true);
    expect(puedeIniciarActivacion('fallida_recuperable')).toBe(true);
  });

  it('bloquea desde cualquier otro estado', () => {
    expect(puedeIniciarActivacion('no_iniciada')).toBe(false);
    expect(puedeIniciarActivacion('en_preparacion')).toBe(false);
    expect(puedeIniciarActivacion('pendiente_costos')).toBe(false);
    expect(puedeIniciarActivacion('cancelada_antes_activacion')).toBe(false);
    expect(puedeIniciarActivacion('activando')).toBe(false);
    expect(puedeIniciarActivacion('activa')).toBe(false);
    expect(puedeIniciarActivacion('suspendida_por_inconsistencia')).toBe(false);
  });
});

describe('Etapa 4B: puedeReanudarOIniciarActivacion (revisión final §3 — recuperación real tras recarga)', () => {
  it('permite reanudar desde "activando" — bug real corregido: puedeIniciarActivacion(\'activando\') es false porque "activando→activando" nunca está en TRANSICIONES_PERMITIDAS, lo que dejaba la reanudación automática y el botón manual completamente inoperantes', () => {
    expect(puedeReanudarOIniciarActivacion('activando')).toBe(true);
    expect(puedeIniciarActivacion('activando')).toBe(false); // el guard antiguo, insuficiente por sí solo para reanudar
  });

  it('sigue permitiendo iniciar desde validada y fallida_recuperable (opción de reintentar tras un fallo real)', () => {
    expect(puedeReanudarOIniciarActivacion('validada')).toBe(true);
    expect(puedeReanudarOIniciarActivacion('fallida_recuperable')).toBe(true);
  });

  it('sigue bloqueando desde estados donde ni iniciar ni reanudar tiene sentido', () => {
    expect(puedeReanudarOIniciarActivacion('no_iniciada')).toBe(false);
    expect(puedeReanudarOIniciarActivacion('en_preparacion')).toBe(false);
    expect(puedeReanudarOIniciarActivacion('pendiente_costos')).toBe(false);
    expect(puedeReanudarOIniciarActivacion('cancelada_antes_activacion')).toBe(false);
    expect(puedeReanudarOIniciarActivacion('activa')).toBe(false);
    expect(puedeReanudarOIniciarActivacion('suspendida_por_inconsistencia')).toBe(false);
  });
});

describe('Etapa 4B: construirClaveActivacion / calcularHashActivacion', () => {
  it('la clave es estable — deriva únicamente de empresaId + loteId', () => {
    expect(construirClaveActivacion('emp-A', 'lote-1')).toBe('VALORIZACION-INICIAL:emp-A:lote-1');
    expect(construirClaveActivacion('emp-A', 'lote-1')).toBe(construirClaveActivacion('emp-A', 'lote-1'));
  });

  it('el hash cambia si cambia el costo confirmado de un detalle, con el mismo lote', async () => {
    const lote: ValorizacionInicialInventario = {
      id: 'lote-1', empresaId: 'emp-A', usuario: 'user-1', fechaCreacion: fechaActual(), estado: 'validada',
      detalles: [{ productoId: 'prod-1', almacenId: 'alm-1', cantidadDetectada: 10, costoPropuesto: 8, origenPropuesta: 'precioCompra', confirmado: true, costoConfirmado: 8, requiereRecalculo: false }],
    };
    const loteConOtroCosto: ValorizacionInicialInventario = {
      ...lote, detalles: [{ ...lote.detalles[0], costoConfirmado: 9 }],
    };
    const hash1 = await calcularHashActivacion(lote, 'PEN', 'impuesto_recuperable');
    const hash2 = await calcularHashActivacion(loteConOtroCosto, 'PEN', 'impuesto_recuperable');
    expect(hash1).not.toBe(hash2);
  });

  it('el hash es el mismo para el mismo contenido, sin importar el orden de los detalles', async () => {
    const base = { id: 'lote-1', empresaId: 'emp-A', usuario: 'user-1', fechaCreacion: fechaActual(), estado: 'validada' as const };
    const detalleA = { productoId: 'prod-1', almacenId: 'alm-1', cantidadDetectada: 10, costoPropuesto: 8, origenPropuesta: 'precioCompra' as const, confirmado: true, costoConfirmado: 8, requiereRecalculo: false };
    const detalleB = { productoId: 'prod-2', almacenId: 'alm-1', cantidadDetectada: 5, costoPropuesto: 4, origenPropuesta: 'precioCompra' as const, confirmado: true, costoConfirmado: 4, requiereRecalculo: false };
    const hash1 = await calcularHashActivacion({ ...base, detalles: [detalleA, detalleB] }, 'PEN', 'impuesto_recuperable');
    const hash2 = await calcularHashActivacion({ ...base, detalles: [detalleB, detalleA] }, 'PEN', 'impuesto_recuperable');
    expect(hash1).toBe(hash2);
  });

  it('la huella incluye empresaId y loteId aunque ya formen parte de la clave — lotes distintos con detalles idénticos nunca comparten hash', async () => {
    const base = {
      usuario: 'user-1', fechaCreacion: fechaActual(), estado: 'validada' as const,
      detalles: [{ productoId: 'prod-1', almacenId: 'alm-1', cantidadDetectada: 10, costoPropuesto: 8, origenPropuesta: 'precioCompra' as const, confirmado: true, costoConfirmado: 8, requiereRecalculo: false }],
    };
    const hashEmpresaA = await calcularHashActivacion({ ...base, id: 'lote-1', empresaId: 'emp-A' }, 'PEN', 'impuesto_recuperable');
    const hashEmpresaB = await calcularHashActivacion({ ...base, id: 'lote-1', empresaId: 'emp-B' }, 'PEN', 'impuesto_recuperable');
    const hashOtroLote = await calcularHashActivacion({ ...base, id: 'lote-2', empresaId: 'emp-A' }, 'PEN', 'impuesto_recuperable');
    expect(hashEmpresaA).not.toBe(hashEmpresaB);
    expect(hashEmpresaA).not.toBe(hashOtroLote);
  });

  it('la huella incluye la moneda base — el mismo lote con moneda base distinta produce un hash distinto', async () => {
    const lote: ValorizacionInicialInventario = {
      id: 'lote-1', empresaId: 'emp-A', usuario: 'user-1', fechaCreacion: fechaActual(), estado: 'validada',
      detalles: [{ productoId: 'prod-1', almacenId: 'alm-1', cantidadDetectada: 10, costoPropuesto: 8, origenPropuesta: 'precioCompra', confirmado: true, costoConfirmado: 8, requiereRecalculo: false }],
    };
    const hashPEN = await calcularHashActivacion(lote, 'PEN', 'impuesto_recuperable');
    const hashUSD = await calcularHashActivacion(lote, 'USD', 'impuesto_recuperable');
    expect(hashPEN).not.toBe(hashUSD);
  });

  it('la huella incluye tratamientoImpuestoCompra — el mismo lote con un tratamiento distinto produce un hash distinto', async () => {
    const lote: ValorizacionInicialInventario = {
      id: 'lote-1', empresaId: 'emp-A', usuario: 'user-1', fechaCreacion: fechaActual(), estado: 'validada',
      detalles: [{ productoId: 'prod-1', almacenId: 'alm-1', cantidadDetectada: 10, costoPropuesto: 8, origenPropuesta: 'precioCompra', confirmado: true, costoConfirmado: 8, requiereRecalculo: false }],
    };
    const hashRecuperable = await calcularHashActivacion(lote, 'PEN', 'impuesto_recuperable');
    const hashNoRecuperable = await calcularHashActivacion(lote, 'PEN', 'impuesto_no_recuperable');
    expect(hashRecuperable).not.toBe(hashNoRecuperable);
  });
});

describe('Etapa 4B: verificarCondicionesActivacion', () => {
  const almacenesCompletos = new Map([['alm-1', crearAlmacenCompleto('alm-1')]]);

  it('sin bloqueantes: lote validado, costos confirmados, stock intacto', () => {
    const lote = prepararLoteValidado('emp-A', [crearProducto()], almacenesCompletos);
    const motivos = verificarCondicionesActivacion(lote, 'impuesto_recuperable', [crearProducto()], almacenesCompletos, 'PEN');
    expect(motivos).toHaveLength(0);
  });

  it('lote no validado (pendiente_costos) bloquea', () => {
    iniciarPreparacionValorizacion('no_iniciada', depsBase());
    const lote = obtenerLoteActivoPorEmpresa('emp-A')!;
    const motivos = verificarCondicionesActivacion(lote, 'impuesto_recuperable', [crearProducto()], almacenesCompletos, 'PEN');
    expect(motivos.some((m) => m.includes('validada'))).toBe(true);
  });

  it('lote cancelado bloquea', () => {
    const lote = prepararLoteValidado('emp-A', [crearProducto()], almacenesCompletos);
    const loteCancelado = { ...lote, estado: 'cancelada' as const };
    const motivos = verificarCondicionesActivacion(loteCancelado, 'impuesto_recuperable', [crearProducto()], almacenesCompletos, 'PEN');
    expect(motivos.some((m) => m.includes('cancelado'))).toBe(true);
  });

  it('costo pendiente/inválido bloquea', () => {
    const lote = prepararLoteValidado('emp-A', [crearProducto()], almacenesCompletos);
    const loteSinCosto = { ...lote, detalles: [{ ...lote.detalles[0], costoConfirmado: undefined, confirmado: false }] };
    const motivos = verificarCondicionesActivacion(loteSinCosto, 'impuesto_recuperable', [crearProducto()], almacenesCompletos, 'PEN');
    expect(motivos.some((m) => m.includes('costo confirmado'))).toBe(true);
  });

  it('recálculo pendiente bloquea', () => {
    const lote = prepararLoteValidado('emp-A', [crearProducto()], almacenesCompletos);
    const loteConRecalculo = { ...lote, detalles: [{ ...lote.detalles[0], requiereRecalculo: true }] };
    const motivos = verificarCondicionesActivacion(loteConRecalculo, 'impuesto_recuperable', [crearProducto()], almacenesCompletos, 'PEN');
    expect(motivos.some((m) => m.includes('recálculo'))).toBe(true);
  });

  it('drift de stock (el stock actual ya no coincide con cantidadDetectada) bloquea', () => {
    const lote = prepararLoteValidado('emp-A', [crearProducto({ stockPorAlmacen: { 'alm-1': 10 } })], almacenesCompletos);
    const productoConDrift = crearProducto({ stockPorAlmacen: { 'alm-1': 7 } });
    const motivos = verificarCondicionesActivacion(lote, 'impuesto_recuperable', [productoConDrift], almacenesCompletos, 'PEN');
    expect(motivos.some((m) => m.includes('cambió'))).toBe(true);
  });

  it('journal pendiente (operación preparada sin resolver) bloquea', () => {
    const lote = prepararLoteValidado('emp-A', [crearProducto()], almacenesCompletos);
    const operacionPendiente: OperacionIdempotenteInventario = {
      id: 'op-x', empresaId: 'emp-A', clave: 'ajuste:doc-x', tipoOperacion: 'ajuste_positivo', estado: 'preparada',
      hashEntrada: 'hash-x', referenciaDocumentoId: 'doc-x', referenciaDocumentoTipo: 'ajuste', resultadoIds: [], fechaCreacion: fechaActual(),
    };
    localStorage.setItem(lsKey(CLAVE_COLECCION_OPERACIONES_IDEMPOTENTES, 'emp-A'), JSON.stringify([operacionPendiente]));
    const motivos = verificarCondicionesActivacion(lote, 'impuesto_recuperable', [crearProducto()], almacenesCompletos, 'PEN');
    expect(motivos.some((m) => m.includes('pendientes o ambiguas'))).toBe(true);
  });

  it('invalidación pendiente bloquea', () => {
    const lote = prepararLoteValidado('emp-A', [crearProducto()], almacenesCompletos);
    encolarInvalidacionPendiente({ id: 'inv-1', empresaId: 'emp-A', afectados: [{ productoId: 'prod-1', almacenId: 'alm-1' }], fecha: fechaActual() });
    const motivos = verificarCondicionesActivacion(lote, 'impuesto_recuperable', [crearProducto()], almacenesCompletos, 'PEN');
    expect(motivos.some((m) => m.includes('invalidaciones de costo'))).toBe(true);
  });

  it('moneda base ausente bloquea', () => {
    const lote = prepararLoteValidado('emp-A', [crearProducto()], almacenesCompletos);
    const motivos = verificarCondicionesActivacion(lote, 'impuesto_recuperable', [crearProducto()], almacenesCompletos, undefined);
    expect(motivos.some((m) => m.includes('moneda base'))).toBe(true);
  });

  it('tratamiento de impuesto de compra pendiente bloquea', () => {
    const lote = prepararLoteValidado('emp-A', [crearProducto()], almacenesCompletos);
    const motivos = verificarCondicionesActivacion(lote, 'pendiente_configuracion', [crearProducto()], almacenesCompletos, 'PEN');
    expect(motivos.some((m) => m.includes('impuestos de compra'))).toBe(true);
  });

  it('producto con stock positivo que no figura en el lote bloquea', () => {
    const lote = prepararLoteValidado('emp-A', [crearProducto()], almacenesCompletos);
    const productos = [crearProducto(), crearProducto({ id: 'prod-2', codigo: 'P002', stockPorAlmacen: { 'alm-1': 3 } })];
    const motivos = verificarCondicionesActivacion(lote, 'impuesto_recuperable', productos, almacenesCompletos, 'PEN');
    expect(motivos.some((m) => m.includes('no figura en el lote'))).toBe(true);
  });

  it('producto no inventariable en el lote bloquea', () => {
    const lote = prepararLoteValidado('emp-A', [crearProducto()], almacenesCompletos);
    const productoNoInventariable = crearProducto({ tipoExistencia: 'SERVICIOS' as Product['tipoExistencia'] });
    const motivos = verificarCondicionesActivacion(lote, 'impuesto_recuperable', [productoNoInventariable], almacenesCompletos, 'PEN');
    expect(motivos.some((m) => m.includes('controlado por stock'))).toBe(true);
  });

  // Revisión final Etapa 4B (§1): importación con reducción, transferencia y reversos ya no son
  // solo informativas — retirar/negar su soporte real debe bloquear la activación explícitamente.
  it('retirar el soporte de transferencia entre almacenes bloquea la activación', () => {
    const lote = prepararLoteValidado('emp-A', [crearProducto()], almacenesCompletos);
    const motivos = verificarCondicionesActivacion(lote, 'impuesto_recuperable', [crearProducto()], almacenesCompletos, 'PEN', {
      transferenciaValorizada: false,
      importacionReduccionValorizada: true,
      reversosValorizados: true,
    });
    expect(motivos.some((m) => m.includes('transferencia entre almacenes'))).toBe(true);
  });

  it('retirar el soporte de importación con reducción bloquea la activación', () => {
    const lote = prepararLoteValidado('emp-A', [crearProducto()], almacenesCompletos);
    const motivos = verificarCondicionesActivacion(lote, 'impuesto_recuperable', [crearProducto()], almacenesCompletos, 'PEN', {
      transferenciaValorizada: true,
      importacionReduccionValorizada: false,
      reversosValorizados: true,
    });
    expect(motivos.some((m) => m.includes('importación con reducción'))).toBe(true);
  });

  it('retirar el soporte de reversos bloquea la activación', () => {
    const lote = prepararLoteValidado('emp-A', [crearProducto()], almacenesCompletos);
    const motivos = verificarCondicionesActivacion(lote, 'impuesto_recuperable', [crearProducto()], almacenesCompletos, 'PEN', {
      transferenciaValorizada: true,
      importacionReduccionValorizada: true,
      reversosValorizados: false,
    });
    expect(motivos.some((m) => m.includes('reversos'))).toBe(true);
  });

  it('con las tres capacidades reales soportadas (comportamiento por defecto), ninguna de las tres bloquea', () => {
    const lote = prepararLoteValidado('emp-A', [crearProducto()], almacenesCompletos);
    const motivos = verificarCondicionesActivacion(lote, 'impuesto_recuperable', [crearProducto()], almacenesCompletos, 'PEN');
    expect(motivos.some((m) => m.includes('transferencia entre almacenes'))).toBe(false);
    expect(motivos.some((m) => m.includes('importación con reducción'))).toBe(false);
    expect(motivos.some((m) => m.includes('capacidad de reversos'))).toBe(false);
  });

  it('ejecutarActivacionValorizacion también bloquea (nunca continúa en silencio) si se niega una capacidad real', async () => {
    const productos = [crearProducto({ stockPorAlmacen: { 'alm-1': 10 } })];
    prepararLoteValidado('emp-A', productos, almacenesCompletos, 8);
    await expect(
      ejecutarActivacionValorizacion({
        empresaId: 'emp-A', tratamientoImpuestoCompra: 'impuesto_recuperable', productos, almacenes: almacenesCompletos,
        monedaBase: 'PEN', generarId, fechaActual,
        capacidadesRequeridas: { transferenciaValorizada: false },
      })
    ).rejects.toThrow(/transferencia entre almacenes/);
    expect(listarCapasCostoInventarioPorEmpresa('emp-A')).toHaveLength(0);
  });
});

describe('Etapa 4B: construirManifiestoCapacidadesActivacion', () => {
  it('reporta soportadas las capacidades expresables como Set — nunca un booleano fijado a mano', () => {
    const manifiesto = construirManifiestoCapacidadesActivacion();
    const porCapacidad = new Map(manifiesto.map((c) => [c.capacidad, c] as const));
    expect(porCapacidad.get('Nota de Ingreso manual y automática')?.soportada).toBe(true);
    expect(porCapacidad.get('Ajuste positivo')?.soportada).toBe(true);
    expect(porCapacidad.get('Importación con incremento')?.soportada).toBe(true);
    expect(porCapacidad.get('Factura/Boleta, POS y Nota de Venta')?.soportada).toBe(true);
    expect(porCapacidad.get('Nota de Salida y merma')?.soportada).toBe(true);
    expect(porCapacidad.get('Ajuste negativo')?.soportada).toBe(true);
    expect(porCapacidad.get('Rutas legacy bloqueadas en modo valorizado')?.soportada).toBe(true);
  });

  // Revisión final Etapa 4B (§1): importación con reducción, transferencia y reversos SÍ tienen un
  // predicado real y central (resolverModoOperacion === 'valorizado_exclusivo', igual que sus
  // consumidores productivos) — usarlas como 'no_aplica' solo porque su arquitectura es distinta
  // de un Set de tipoOperacion ya no es válido; ahora se reportan como boolean, con justificación.
  it('reporta cumplidas (boolean real, nunca no_aplica) las tres capacidades antes marcadas no_aplica solo por arquitectura distinta', () => {
    const manifiesto = construirManifiestoCapacidadesActivacion();
    const porCapacidad = new Map(manifiesto.map((c) => [c.capacidad, c] as const));
    for (const capacidad of ['Importación con reducción', 'Transferencia entre almacenes', 'Reversos (NI, Comprobante/POS, NV, NS, transferencia)']) {
      const entrada = porCapacidad.get(capacidad);
      expect(entrada?.soportada).toBe(true);
      expect(entrada?.detalle).toBeTruthy();
    }
  });

  it('calcularCapacidadesActivacionReales deriva del predicado central real, nunca de un booleano fijado a mano', () => {
    expect(calcularCapacidadesActivacionReales('activa')).toEqual({
      transferenciaValorizada: true,
      importacionReduccionValorizada: true,
      reversosValorizados: true,
    });
    // Desde cualquier otro estado, el modo resuelto nunca es 'valorizado_exclusivo' — las tres
    // capacidades reflejan eso fielmente (no son "siempre true" a pesar del estado real).
    expect(calcularCapacidadesActivacionReales('validada')).toEqual({
      transferenciaValorizada: false,
      importacionReduccionValorizada: false,
      reversosValorizados: false,
    });
  });

  it('capacidadBloqueaActivacion: "no_aplica" nunca bloquea si trae justificación explícita — demuestra el uso legítimo para una capacidad genuinamente inexistente', () => {
    const capacidadInexistente = {
      capacidad: 'Recepciones parciales de compra en modo valorizado',
      soportada: 'no_aplica' as const,
      detalle: 'Fuera de alcance en toda etapa hasta ahora — ninguna Nota de Ingreso admite recepción parcial de una Orden de Compra, ni en modo cuantitativo ni valorizado; no existe ninguna capacidad productiva que evaluar.',
    };
    expect(capacidadBloqueaActivacion(capacidadInexistente)).toBe(false);
  });

  it('capacidadBloqueaActivacion: "no_aplica" SIN justificación nunca es válido — lanza en vez de dejarlo pasar en silencio', () => {
    const capacidadSinJustificar = { capacidad: 'X', soportada: 'no_aplica' as const, detalle: '' };
    expect(() => capacidadBloqueaActivacion(capacidadSinJustificar)).toThrow(/sin justificación/);
  });

  it('capacidadBloqueaActivacion: false SIEMPRE bloquea, true nunca bloquea', () => {
    expect(capacidadBloqueaActivacion({ capacidad: 'X', soportada: false, detalle: 'd' })).toBe(true);
    expect(capacidadBloqueaActivacion({ capacidad: 'X', soportada: true, detalle: 'd' })).toBe(false);
  });
});

describe('Etapa 4B: ejecutarActivacionValorizacion — creación de capas iniciales', () => {
  const almacenesCompletos = new Map([
    ['alm-1', crearAlmacenCompleto('alm-1')],
    ['alm-2', crearAlmacenCompleto('alm-2', { establecimientoId: 'est-2' })],
  ]);

  it('crea una capa por producto+almacén con stock positivo, con costo/moneda/procedencia correctos, y persiste capaGeneradaId', async () => {
    const productos = [crearProducto({ stockPorAlmacen: { 'alm-1': 10 } })];
    const lote = prepararLoteValidado('emp-A', productos, almacenesCompletos, 8);
    const snapshotProductosAntes = JSON.stringify(productos);

    const resultado = await ejecutarActivacionValorizacion({
      empresaId: 'emp-A', tratamientoImpuestoCompra: 'impuesto_recuperable', productos, almacenes: almacenesCompletos,
      monedaBase: 'PEN', generarId, fechaActual,
    });

    expect(resultado.estadoValorizacion).toBe('activa');
    expect(resultado.error).toBeUndefined();

    const capas = listarCapasCostoInventarioPorEmpresa('emp-A');
    expect(capas).toHaveLength(1);
    expect(capas[0]).toMatchObject({
      productoId: 'prod-1', almacenId: 'alm-1', establecimientoId: 'est-1',
      cantidadInicial: 10, cantidadDisponible: 10,
      costoUnitarioBaseOriginal: 8, costoUnitarioBaseMonedaBase: 8,
      monedaBase: 'PEN', monedaOriginal: 'PEN',
      procedencia: 'migracion_inicial', tipoDocumentoOrigen: 'migracion',
      documentoOrigenId: lote.id, estado: 'disponible',
    });
    expect(resultado.lote.detalles[0].capaGeneradaId).toBe(capas[0].id);

    // Stock físico intacto — la activación nunca lo toca.
    expect(JSON.stringify(productos)).toBe(snapshotProductosAntes);
  });

  it('stock cero (o negativo) no genera ningún detalle relevante ni capa', async () => {
    const productos = [crearProducto({ stockPorAlmacen: { 'alm-1': 0 } })];
    // Con stock 0, iniciarPreparacionValorizacion no genera detalle (ver detectarStockPositivoPorProductoAlmacen) —
    // se valida un lote vacío directamente para probar que ejecutarActivacionValorizacion no crea nada.
    iniciarPreparacionValorizacion('no_iniciada', { empresaId: 'emp-A', usuario: 'user-1', productos, almacenes: almacenesCompletos, generarId, fechaActual });
    const resultado = validarYTransicionarAValidada('pendiente_costos', 'emp-A', 'impuesto_recuperable', productos, almacenesCompletos);
    expect(resultado.lote.detalles).toHaveLength(0);

    const resultadoActivacion = await ejecutarActivacionValorizacion({
      empresaId: 'emp-A', tratamientoImpuestoCompra: 'impuesto_recuperable', productos, almacenes: almacenesCompletos,
      monedaBase: 'PEN', generarId, fechaActual,
    });

    expect(resultadoActivacion.estadoValorizacion).toBe('activa');
    expect(listarCapasCostoInventarioPorEmpresa('emp-A')).toHaveLength(0);
  });

  it('múltiples productos y almacenes: una capa independiente por cada combinación', async () => {
    const productos = [
      crearProducto({ id: 'prod-1', codigo: 'P001', stockPorAlmacen: { 'alm-1': 10, 'alm-2': 4 } }),
      crearProducto({ id: 'prod-2', codigo: 'P002', stockPorAlmacen: { 'alm-1': 6 } }),
    ];
    prepararLoteValidado('emp-A', productos, almacenesCompletos, 5);

    const resultado = await ejecutarActivacionValorizacion({
      empresaId: 'emp-A', tratamientoImpuestoCompra: 'impuesto_recuperable', productos, almacenes: almacenesCompletos,
      monedaBase: 'PEN', generarId, fechaActual,
    });

    expect(resultado.estadoValorizacion).toBe('activa');
    const capas = listarCapasCostoInventarioPorEmpresa('emp-A');
    expect(capas).toHaveLength(3);
    expect(capas.every((c) => c.costoUnitarioBaseMonedaBase === 5)).toBe(true);
    const claves = capas.map((c) => `${c.productoId}:${c.almacenId}`).sort();
    expect(claves).toEqual(['prod-1:alm-1', 'prod-1:alm-2', 'prod-2:alm-1']);
    expect(resultado.lote.detalles.every((d) => Boolean(d.capaGeneradaId))).toBe(true);
  });

  it('aislamiento multiempresa: activar emp-A nunca crea ni afecta capas de emp-B', async () => {
    const productosA = [crearProducto({ stockPorAlmacen: { 'alm-1': 10 } })];
    prepararLoteValidado('emp-A', productosA, almacenesCompletos, 8);

    const productosB = [crearProducto({ id: 'prod-9', codigo: 'P009', stockPorAlmacen: { 'alm-1': 7 } })];
    prepararLoteValidado('emp-B', productosB, almacenesCompletos, 3);

    await ejecutarActivacionValorizacion({
      empresaId: 'emp-A', tratamientoImpuestoCompra: 'impuesto_recuperable', productos: productosA, almacenes: almacenesCompletos,
      monedaBase: 'PEN', generarId, fechaActual,
    });

    expect(listarCapasCostoInventarioPorEmpresa('emp-A')).toHaveLength(1);
    expect(listarCapasCostoInventarioPorEmpresa('emp-B')).toHaveLength(0);
  });
});

describe('Etapa 4B: ejecutarActivacionValorizacion — idempotencia y recuperación', () => {
  const almacenesCompletos = new Map([['alm-1', crearAlmacenCompleto('alm-1')]]);

  it('doble clic (misma llamada repetida sin reiniciar) no duplica capas — la segunda es "repetida"', async () => {
    const productos = [crearProducto({ stockPorAlmacen: { 'alm-1': 10 } })];
    prepararLoteValidado('emp-A', productos, almacenesCompletos, 8);
    const params = { empresaId: 'emp-A', tratamientoImpuestoCompra: 'impuesto_recuperable' as const, productos, almacenes: almacenesCompletos, monedaBase: 'PEN', generarId, fechaActual };

    const primero = await ejecutarActivacionValorizacion(params);
    const segundo = await ejecutarActivacionValorizacion(params);

    expect(primero.estadoValorizacion).toBe('activa');
    expect(segundo.estadoValorizacion).toBe('activa');
    expect(listarCapasCostoInventarioPorEmpresa('emp-A')).toHaveLength(1);
  });

  it('reintento después de que una capa ya fue creada (por un intento previo) continúa y solo crea las faltantes', async () => {
    const productos = [
      crearProducto({ id: 'prod-1', codigo: 'P001', stockPorAlmacen: { 'alm-1': 10 } }),
      crearProducto({ id: 'prod-2', codigo: 'P002', stockPorAlmacen: { 'alm-1': 6 } }),
    ];
    const lote = prepararLoteValidado('emp-A', productos, almacenesCompletos, 8);

    // Simula que un intento previo (interrumpido antes de completar la unidad de trabajo) ya
    // dejó creada la capa de prod-1 — nunca se reconstruye a mano el resto del estado interno del
    // ledger, solo la evidencia persistida real que `prepararEscriturasActivacion` reconcilia.
    const detalleProd1 = lote.detalles.find((d) => d.productoId === 'prod-1')!;
    const capaPrevia: CapaCostoInventario = {
      id: 'capa-previa-1', empresaId: 'emp-A', establecimientoId: 'est-1', productoId: 'prod-1', almacenId: 'alm-1',
      movimientoEntradaId: 'mov-previo', tipoDocumentoOrigen: 'migracion', documentoOrigenId: lote.id,
      lineaOrigenId: `${detalleProd1.productoId}:${detalleProd1.almacenId}`,
      cantidadInicial: detalleProd1.cantidadDetectada, cantidadDisponible: detalleProd1.cantidadDetectada,
      costoUnitarioBaseOriginal: 8, costoUnitarioBaseMonedaBase: 8,
      valorValorizableOriginal: 8 * detalleProd1.cantidadDetectada, valorValorizableMonedaBase: 8 * detalleProd1.cantidadDetectada,
      monedaBase: 'PEN', monedaOriginal: 'PEN', tipoCambioAplicado: 1, fechaTipoCambio: fechaActual(), fechaEntrada: fechaActual(),
      estado: 'disponible', procedencia: 'migracion_inicial', usuario: 'user-1', fechaCreacion: fechaActual(),
    };
    guardarCapaCostoInventario(capaPrevia, 'emp-A');

    const resultado = await ejecutarActivacionValorizacion({
      empresaId: 'emp-A', tratamientoImpuestoCompra: 'impuesto_recuperable', productos, almacenes: almacenesCompletos, monedaBase: 'PEN', generarId, fechaActual,
    });

    expect(resultado.estadoValorizacion).toBe('activa');
    const capas = listarCapasCostoInventarioPorEmpresa('emp-A');
    expect(capas).toHaveLength(2); // la previa reutilizada + la que faltaba, nunca 3
    expect(capas.find((c) => c.id === 'capa-previa-1')).toBeDefined(); // reutilizada, nunca reemplazada
    expect(capas.find((c) => c.productoId === 'prod-2')).toBeDefined();
    const detalleProd1Final = resultado.lote.detalles.find((d) => d.productoId === 'prod-1')!;
    expect(detalleProd1Final.capaGeneradaId).toBe('capa-previa-1');
  });

  it('reintento después de que TODAS las capas ya fueron creadas y confirmadas es "repetida" — nunca recalcula ni duplica', async () => {
    const productos = [crearProducto({ stockPorAlmacen: { 'alm-1': 10 } })];
    prepararLoteValidado('emp-A', productos, almacenesCompletos, 8);
    const params = { empresaId: 'emp-A', tratamientoImpuestoCompra: 'impuesto_recuperable' as const, productos, almacenes: almacenesCompletos, monedaBase: 'PEN', generarId, fechaActual };

    await ejecutarActivacionValorizacion(params);
    const capasTrasPrimero = listarCapasCostoInventarioPorEmpresa('emp-A');

    const resultado = await ejecutarActivacionValorizacion(params);

    expect(resultado.estadoValorizacion).toBe('activa');
    expect(listarCapasCostoInventarioPorEmpresa('emp-A')).toEqual(capasTrasPrimero);
  });

  it('misma identidad (mismo lote) con datos diferentes (costo confirmado cambiado) es un conflicto explícito, nunca silencioso', async () => {
    const productos = [crearProducto({ stockPorAlmacen: { 'alm-1': 10 } })];
    prepararLoteValidado('emp-A', productos, almacenesCompletos, 8);
    const paramsBase = { empresaId: 'emp-A', tratamientoImpuestoCompra: 'impuesto_recuperable' as const, productos, almacenes: almacenesCompletos, monedaBase: 'PEN', generarId, fechaActual };

    await ejecutarActivacionValorizacion(paramsBase);

    // Simula que, tras la confirmación, alguien (un bug, una migración manual) alteró el costo
    // confirmado del lote sin pasar por una activación nueva — la MISMA clave (mismo loteId) con
    // datos distintos debe fallar por conflicto de hash, nunca reprocesarse en silencio.
    const loteConfirmado = obtenerLoteActivoPorEmpresa('emp-A')!;
    const loteAlterado = { ...loteConfirmado, detalles: [{ ...loteConfirmado.detalles[0], costoConfirmado: 99 }] };
    actualizarValorizacionInicialInventario(loteAlterado, 'emp-A');

    await expect(ejecutarActivacionValorizacion(paramsBase)).rejects.toThrow();
  });

  // Revisión final Etapa 4B (§2): la huella canónica ahora incluye la moneda base — una
  // reanudación de la MISMA clave (mismo lote, ya confirmada) con una moneda base distinta debe
  // producir un conflicto explícito, nunca continuar en silencio con datos mezclados.
  it('misma identidad ya confirmada, con moneda base distinta en el reintento, es un conflicto explícito', async () => {
    const productos = [crearProducto({ stockPorAlmacen: { 'alm-1': 10 } })];
    prepararLoteValidado('emp-A', productos, almacenesCompletos, 8);
    const paramsPEN = { empresaId: 'emp-A', tratamientoImpuestoCompra: 'impuesto_recuperable' as const, productos, almacenes: almacenesCompletos, monedaBase: 'PEN', generarId, fechaActual };

    await ejecutarActivacionValorizacion(paramsPEN);

    const paramsUSD = { ...paramsPEN, monedaBase: 'USD' };
    await expect(ejecutarActivacionValorizacion(paramsUSD)).rejects.toThrow(/[Cc]onflicto/);
    // El reintento en conflicto nunca crea una segunda capa ni altera la ya confirmada.
    expect(listarCapasCostoInventarioPorEmpresa('emp-A')).toHaveLength(1);
    expect(listarCapasCostoInventarioPorEmpresa('emp-A')[0].monedaBase).toBe('PEN');
  });

  it('misma identidad ya confirmada, con tratamientoImpuestoCompra distinto en el reintento, es un conflicto explícito', async () => {
    const productos = [crearProducto({ stockPorAlmacen: { 'alm-1': 10 } })];
    prepararLoteValidado('emp-A', productos, almacenesCompletos, 8);
    const paramsBase = { empresaId: 'emp-A', tratamientoImpuestoCompra: 'impuesto_recuperable' as const, productos, almacenes: almacenesCompletos, monedaBase: 'PEN', generarId, fechaActual };

    await ejecutarActivacionValorizacion(paramsBase);

    await expect(
      ejecutarActivacionValorizacion({ ...paramsBase, tratamientoImpuestoCompra: 'impuesto_no_recuperable' })
    ).rejects.toThrow(/[Cc]onflicto/);
  });

  // Revisión final Etapa 4B (§2): la fecha técnica NUNCA debe impedir reconciliar — un primer
  // intento que crea una capa y se interrumpe, seguido de un segundo intento en OTRA fecha/hora,
  // debe reutilizar la capa (nunca duplicarla ni fallar por la fecha).
  it('reintento en otra fecha/hora reconcilia la capa ya creada sin conflicto por la fecha', async () => {
    const productos = [
      crearProducto({ id: 'prod-1', codigo: 'P001', stockPorAlmacen: { 'alm-1': 10 } }),
      crearProducto({ id: 'prod-2', codigo: 'P002', stockPorAlmacen: { 'alm-1': 6 } }),
    ];
    const lote = prepararLoteValidado('emp-A', productos, almacenesCompletos, 8);

    // Primer intento: solo prod-1 quedó con capa creada (simula una interrupción real).
    const detalleProd1 = lote.detalles.find((d) => d.productoId === 'prod-1')!;
    const fechaPrimerIntento = '2026-08-01T00:00:00.000Z';
    const capaPrevia: CapaCostoInventario = {
      id: 'capa-previa-1', empresaId: 'emp-A', establecimientoId: 'est-1', productoId: 'prod-1', almacenId: 'alm-1',
      movimientoEntradaId: 'mov-previo', tipoDocumentoOrigen: 'migracion', documentoOrigenId: lote.id,
      lineaOrigenId: `${detalleProd1.productoId}:${detalleProd1.almacenId}`,
      cantidadInicial: detalleProd1.cantidadDetectada, cantidadDisponible: detalleProd1.cantidadDetectada,
      costoUnitarioBaseOriginal: 8, costoUnitarioBaseMonedaBase: 8,
      valorValorizableOriginal: 8 * detalleProd1.cantidadDetectada, valorValorizableMonedaBase: 8 * detalleProd1.cantidadDetectada,
      monedaBase: 'PEN', monedaOriginal: 'PEN', tipoCambioAplicado: 1, fechaTipoCambio: fechaPrimerIntento, fechaEntrada: fechaPrimerIntento,
      estado: 'disponible', procedencia: 'migracion_inicial', usuario: 'user-1', fechaCreacion: fechaPrimerIntento,
    };
    guardarCapaCostoInventario(capaPrevia, 'emp-A');

    // Segundo intento: "días después" — un reloj distinto, nunca el mismo fechaActual().
    const resultado = await ejecutarActivacionValorizacion({
      empresaId: 'emp-A', tratamientoImpuestoCompra: 'impuesto_recuperable', productos, almacenes: almacenesCompletos,
      monedaBase: 'PEN', generarId, fechaActual: () => '2026-08-05T12:00:00.000Z',
    });

    expect(resultado.estadoValorizacion).toBe('activa');
    const capas = listarCapasCostoInventarioPorEmpresa('emp-A');
    expect(capas).toHaveLength(2);
    const capaReutilizada = capas.find((c) => c.id === 'capa-previa-1')!;
    expect(capaReutilizada.fechaEntrada).toBe(fechaPrimerIntento); // nunca reescrita con la fecha del segundo intento
    const capaNueva = capas.find((c) => c.productoId === 'prod-2')!;
    expect(capaNueva.fechaEntrada).toBe('2026-08-05T12:00:00.000Z'); // la nueva SÍ usa la fecha real de su propia creación
  });

  // Revisión final Etapa 4B (§3): dos invocaciones concurrentes (StrictMode/doble render llamando
  // a la misma función antes de que la primera resuelva) nunca deben crear dos operaciones ni
  // duplicar capas — el ledger cooperativo + idempotente es quien lo garantiza, no la UI.
  it('dos llamadas concurrentes (simulando StrictMode/doble disparo) nunca duplican capas ni crean dos operaciones', async () => {
    const productos = [crearProducto({ stockPorAlmacen: { 'alm-1': 10 } })];
    prepararLoteValidado('emp-A', productos, almacenesCompletos, 8);
    const params = { empresaId: 'emp-A', tratamientoImpuestoCompra: 'impuesto_recuperable' as const, productos, almacenes: almacenesCompletos, monedaBase: 'PEN', generarId, fechaActual };

    const [resultadoA, resultadoB] = await Promise.all([
      ejecutarActivacionValorizacion(params),
      ejecutarActivacionValorizacion(params),
    ]);

    expect(resultadoA.estadoValorizacion).toBe('activa');
    expect(resultadoB.estadoValorizacion).toBe('activa');
    expect(listarCapasCostoInventarioPorEmpresa('emp-A')).toHaveLength(1);
    const operaciones = JSON.parse(localStorage.getItem(lsKey(CLAVE_COLECCION_OPERACIONES_IDEMPOTENTES, 'emp-A')) ?? '[]');
    expect(operaciones).toHaveLength(1);
  });

  // Revisión final Etapa 4B (§3): "recarga después de una interrupción" — reanudar sobre una
  // activación YA confirmada nunca debe limitarse a confiar en 'repetida'; debe seguir
  // reconciliando, para que una inconsistencia real (capa manipulada externamente) se detecte en
  // cada reanudación en vez de quedar enmascarada.
  it('reanudar (llamar de nuevo) una activación ya confirmada vuelve a reconciliar — una inconsistencia real se sigue reportando, nunca se oculta', async () => {
    const productos = [crearProducto({ stockPorAlmacen: { 'alm-1': 10 } })];
    prepararLoteValidado('emp-A', productos, almacenesCompletos, 8);
    const params = { empresaId: 'emp-A', tratamientoImpuestoCompra: 'impuesto_recuperable' as const, productos, almacenes: almacenesCompletos, monedaBase: 'PEN', generarId, fechaActual };

    await ejecutarActivacionValorizacion(params);

    // Manipulación externa tras la confirmación: la capa queda con cantidadDisponible distinta al
    // stock físico real — una inconsistencia que la reconciliación de §11 debe seguir detectando.
    const capas = listarCapasCostoInventarioPorEmpresa('emp-A');
    const capaAlterada = { ...capas[0], cantidadDisponible: capas[0].cantidadDisponible - 3 };
    actualizarCapaCostoInventario(capaAlterada, 'emp-A');

    // "Recarga": se vuelve a llamar la MISMA función (la ruta 'repetida' del ledger) — nunca debe
    // devolver 'activa' ciegamente.
    await expect(ejecutarActivacionValorizacion(params)).rejects.toThrow(/reconciliaci[oó]n/);
  });
});

describe('Etapa 4B: verificarReconciliacionCapasIniciales', () => {
  const almacenesCompletos = new Map([['alm-1', crearAlmacenCompleto('alm-1')]]);

  function loteYCapaConsistentes(empresaId: string) {
    const productos = [crearProducto({ stockPorAlmacen: { 'alm-1': 10 } })];
    const lote = prepararLoteValidado(empresaId, productos, almacenesCompletos, 8);
    const capa: CapaCostoInventario = {
      id: 'capa-1', empresaId, establecimientoId: 'est-1', productoId: 'prod-1', almacenId: 'alm-1',
      movimientoEntradaId: 'mov-1', tipoDocumentoOrigen: 'migracion', documentoOrigenId: lote.id, lineaOrigenId: 'prod-1:alm-1',
      cantidadInicial: 10, cantidadDisponible: 10, costoUnitarioBaseOriginal: 8, costoUnitarioBaseMonedaBase: 8,
      valorValorizableOriginal: 80, valorValorizableMonedaBase: 80, monedaBase: 'PEN', monedaOriginal: 'PEN',
      tipoCambioAplicado: 1, fechaTipoCambio: fechaActual(), fechaEntrada: fechaActual(), estado: 'disponible',
      procedencia: 'migracion_inicial', usuario: 'user-1', fechaCreacion: fechaActual(),
    };
    guardarCapaCostoInventario(capa, empresaId);
    const loteConCapa = { ...lote, detalles: [{ ...lote.detalles[0], capaGeneradaId: capa.id }] };
    actualizarValorizacionInicialInventario(loteConCapa, empresaId);
    return { lote: loteConCapa, capa, productos };
  }

  it('stock físico = suma de capas vigentes: permite activa (sin inconsistencias)', () => {
    const { lote, productos } = loteYCapaConsistentes('emp-A');
    const motivos = verificarReconciliacionCapasIniciales(lote, productos, almacenesCompletos);
    expect(motivos).toHaveLength(0);
  });

  it('diferencia entre stock físico y suma de capas bloquea', () => {
    const { lote } = loteYCapaConsistentes('emp-A');
    const productosConDrift = [crearProducto({ stockPorAlmacen: { 'alm-1': 7 } })]; // ya no coincide con la capa (10)
    const motivos = verificarReconciliacionCapasIniciales(lote, productosConDrift, almacenesCompletos);
    expect(motivos.some((m) => m.includes('no coincide con la suma de capas'))).toBe(true);
  });

  it('detalle positivo sin capaGeneradaId (capa faltante) bloquea', () => {
    const { lote, productos } = loteYCapaConsistentes('emp-A');
    const loteSinCapa = { ...lote, detalles: [{ ...lote.detalles[0], capaGeneradaId: undefined }] };
    const motivos = verificarReconciliacionCapasIniciales(loteSinCapa, productos, almacenesCompletos);
    expect(motivos.some((m) => m.includes('no generó su capa'))).toBe(true);
  });

  it('capaGeneradaId apuntando a una capa inexistente (referencia rota) bloquea', () => {
    const { lote, productos } = loteYCapaConsistentes('emp-A');
    const loteConReferenciaRota = { ...lote, detalles: [{ ...lote.detalles[0], capaGeneradaId: 'capa-que-no-existe' }] };
    const motivos = verificarReconciliacionCapasIniciales(loteConReferenciaRota, productos, almacenesCompletos);
    expect(motivos.some((m) => m.includes('que no existe'))).toBe(true);
  });

  it('capa duplicada (dos capas de migración inicial de este lote para el mismo detalle) bloquea', () => {
    const { lote, productos } = loteYCapaConsistentes('emp-A');
    const capaDuplicada: CapaCostoInventario = {
      id: 'capa-2', empresaId: 'emp-A', establecimientoId: 'est-1', productoId: 'prod-1', almacenId: 'alm-1',
      movimientoEntradaId: 'mov-2', tipoDocumentoOrigen: 'migracion', documentoOrigenId: lote.id, lineaOrigenId: 'prod-1:alm-1',
      cantidadInicial: 10, cantidadDisponible: 10, costoUnitarioBaseOriginal: 8, costoUnitarioBaseMonedaBase: 8,
      valorValorizableOriginal: 80, valorValorizableMonedaBase: 80, monedaBase: 'PEN', monedaOriginal: 'PEN',
      tipoCambioAplicado: 1, fechaTipoCambio: fechaActual(), fechaEntrada: fechaActual(), estado: 'disponible',
      procedencia: 'migracion_inicial', usuario: 'user-1', fechaCreacion: fechaActual(),
    };
    guardarCapaCostoInventario(capaDuplicada, 'emp-A');
    const motivos = verificarReconciliacionCapasIniciales(lote, productos, almacenesCompletos);
    expect(motivos.some((m) => m.includes('debe ser exactamente 1'))).toBe(true);
  });

  it('capa de migración inicial de OTRO lote para el mismo producto+almacén (doble valorización) bloquea', () => {
    const { lote, productos } = loteYCapaConsistentes('emp-A');
    const capaOtroLote: CapaCostoInventario = {
      id: 'capa-otro-lote', empresaId: 'emp-A', establecimientoId: 'est-1', productoId: 'prod-1', almacenId: 'alm-1',
      movimientoEntradaId: 'mov-3', tipoDocumentoOrigen: 'migracion', documentoOrigenId: 'otro-lote-id', lineaOrigenId: 'prod-1:alm-1',
      cantidadInicial: 10, cantidadDisponible: 10, costoUnitarioBaseOriginal: 8, costoUnitarioBaseMonedaBase: 8,
      valorValorizableOriginal: 80, valorValorizableMonedaBase: 80, monedaBase: 'PEN', monedaOriginal: 'PEN',
      tipoCambioAplicado: 1, fechaTipoCambio: fechaActual(), fechaEntrada: fechaActual(), estado: 'disponible',
      procedencia: 'migracion_inicial', usuario: 'user-1', fechaCreacion: fechaActual(),
    };
    guardarCapaCostoInventario(capaOtroLote, 'emp-A');
    const motivos = verificarReconciliacionCapasIniciales(lote, productos, almacenesCompletos);
    expect(motivos.some((m) => m.includes('doble valorización'))).toBe(true);
  });
});

describe('Etapa 4B: pruebas de humo de integración post-activación — todos los canales leen estadoValorizacion="activa" real', () => {
  const almacenesCompletos = new Map([
    ['alm-1', crearAlmacenCompleto('alm-1')],
    ['alm-2', crearAlmacenCompleto('alm-2')],
  ]);

  it('tras activar de verdad (vía ejecutarActivacionValorizacion), venta_salida/ajuste_negativo/NI/transferencia/importación operan en modo valorizado real, sin ningún booleano forzado desde la UI', async () => {
    const empresaId = 'emp-A';
    const productos = [crearProducto({ stockPorAlmacen: { 'alm-1': 20 } })];
    localStorage.setItem(lsKey(PRODUCT_STORAGE_KEY, empresaId), JSON.stringify(productos));
    prepararLoteValidado(empresaId, productos, almacenesCompletos, 10);

    const activacion = await ejecutarActivacionValorizacion({
      empresaId, tratamientoImpuestoCompra: 'impuesto_recuperable', productos, almacenes: almacenesCompletos,
      monedaBase: 'PEN', generarId, fechaActual,
    });
    expect(activacion.estadoValorizacion).toBe('activa');
    const capaMigracion = listarCapasCostoInventarioPorEmpresa(empresaId)[0];
    expect(capaMigracion.procedencia).toBe('migracion_inicial');
    expect(capaMigracion.cantidadDisponible).toBe(20);

    // El orden FIFO real depende de `fechaEntrada` (el `fecha` de cada documento) — cada operación
    // usa una fecha estrictamente posterior a la anterior, igual que en producción (nunca la misma
    // marca de tiempo para dos documentos distintos), para que el desempate nunca dependa del id.
    let diaSecuencial = 2;
    const fechaSecuencial = (): string => `2026-08-${String(diaSecuencial++).padStart(2, '0')}T00:00:00.000Z`;

    // 1) Factura/Boleta/POS/Nota de Venta comparten venta_salida — consume FIFO de la capa de migración.
    const datosVenta: DatosOperacionSalidaCuantitativa = {
      modoOperacion: 'valorizado', empresaId, documentoId: 'doc-venta-1', tipoDocumento: 'venta',
      tipoOperacion: 'venta_salida', claveIdempotencia: 'venta:doc-venta-1', usuario: 'user-1', fecha: fechaSecuencial(),
      motivo: 'VENTA', lineas: [{ lineaId: 'linea-venta-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 5 }],
    };
    const resultadoVenta = await ServicioKardexValorizado.registrarSalidaValorizada(datosVenta, {
      almacenes: almacenesCompletos, generarId, fechaActual, estadoValorizacion: 'activa',
    });
    expect(resultadoVenta.estado).toBe('nueva');
    expect(listarConsumosCapaCostoInventarioPorEmpresa(empresaId).some((c) => c.motivo === 'salida')).toBe(true);
    expect(listarCapasCostoInventarioPorEmpresa(empresaId).find((c) => c.id === capaMigracion.id)?.cantidadDisponible).toBe(15);

    // 2) Ajuste negativo consume FIFO — mismo motor de salidas, mismo tipoOperacion valorizable.
    const datosAjusteNegativo: DatosOperacionSalidaCuantitativa = {
      modoOperacion: 'valorizado', empresaId, documentoId: 'doc-ajuste-neg-1', tipoDocumento: 'ajuste',
      tipoOperacion: 'ajuste_negativo', claveIdempotencia: 'ajuste_negativo:doc-ajuste-neg-1', usuario: 'user-1', fecha: fechaSecuencial(),
      motivo: 'AJUSTE_INVENTARIO', lineas: [{ lineaId: 'linea-ajuste-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 3 }],
    };
    await ServicioKardexValorizado.registrarSalidaValorizada(datosAjusteNegativo, {
      almacenes: almacenesCompletos, generarId, fechaActual, estadoValorizacion: 'activa',
    });
    expect(listarCapasCostoInventarioPorEmpresa(empresaId).find((c) => c.id === capaMigracion.id)?.cantidadDisponible).toBe(12);

    // 3) Nota de Ingreso (ajuste_positivo comparte el mismo tipo valorizable de entrada) crea una capa NUEVA — coexiste con la de migración.
    const datosEntrada: DatosOperacionEntradaCuantitativa = {
      modoOperacion: 'valorizado', empresaId, documentoId: 'doc-ni-1', tipoDocumento: 'ajuste',
      tipoOperacion: 'ajuste_positivo', claveIdempotencia: 'ajuste_positivo:doc-ni-1', usuario: 'user-1', fecha: fechaSecuencial(),
      motivo: 'COMPRA', lineas: [{ lineaId: 'linea-ni-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadUnidadMinima: 10, costoUnitarioBaseMonedaBase: 12 }],
    };
    await ServicioKardexValorizado.registrarEntradaValorizada(datosEntrada, {
      almacenes: almacenesCompletos, generarId, fechaActual, estadoValorizacion: 'activa', monedaBase: 'PEN',
    });
    const capas = listarCapasCostoInventarioPorEmpresa(empresaId);
    expect(capas).toHaveLength(2);
    expect(capas.find((c) => c.procedencia === 'ajuste' && c.costoUnitarioBaseMonedaBase === 12)).toBeDefined();

    // 4) Transferencia: mueve parte de la capa de migración (todavía la más antigua, FIFO) a otro almacén, con valorizacionHabilitada derivado del estado real.
    const datosTransferencia: DatosTransferenciaInventario = {
      modoOperacion: 'cuantitativo', empresaId, transferenciaId: 'trf-1', claveIdempotencia: 'TRANSFER-trf-1',
      tipoOperacion: 'transferencia', tipoDocumento: 'transferencia', productoId: 'prod-1',
      establecimientoOrigenId: 'est-1', almacenOrigenId: 'alm-1', establecimientoDestinoId: 'est-1', almacenDestinoId: 'alm-2',
      cantidadUnidadMinima: 4, usuario: 'user-1', fecha: fechaSecuencial(), motivo: 'TRANSFERENCIA_ALMACEN',
    };
    await ServicioKardexValorizado.transferirStockValorizado(datosTransferencia, {
      almacenes: almacenesCompletos, generarId, fechaActual, estadoValorizacion: 'activa', valorizacionHabilitada: true,
    });
    const capaDestino = listarCapasCostoInventarioPorEmpresa(empresaId).find((c) => c.almacenId === 'alm-2');
    expect(capaDestino).toBeDefined();
    expect(capaDestino?.cantidadInicial).toBe(4);
    expect(capaDestino?.capaOrigenId).toBe(capaMigracion.id);

    // 5) Importación con incremento (misma línea de entrada del motor de importación) crea otra capa nueva.
    const datosImportacion = {
      modoOperacion: 'valorizado' as const, empresaId, loteId: 'lote-import-1', claveIdempotencia: 'IMPORT-lote-import-1',
      tipoOperacion: 'importacion' as const, tipoDocumento: 'importacion' as const, usuario: 'user-1', fecha: fechaSecuencial(),
      motivo: 'AJUSTE_INVENTARIO' as const,
      lineas: [{ lineaId: 'IMPORT-lote-import-1-1', productoId: 'prod-1', almacenId: 'alm-1', diferencia: 6, costoUnitarioBaseMonedaBase: 15 }],
    };
    await ServicioKardexValorizado.importarStockValorizado(datosImportacion, {
      almacenes: almacenesCompletos, generarId, fechaActual, estadoValorizacion: 'activa', monedaBase: 'PEN',
    });
    const capasFinal = listarCapasCostoInventarioPorEmpresa(empresaId);
    expect(capasFinal.find((c) => c.procedencia === 'importacion' && c.costoUnitarioBaseMonedaBase === 15)).toBeDefined();

    // Ninguna de estas operaciones tocó stock por fuera del motor — el stock real refleja exactamente los movimientos aplicados.
    const productosFinal = JSON.parse(localStorage.getItem(lsKey(PRODUCT_STORAGE_KEY, empresaId)) as string) as Product[];
    // 20 (migración) - 5 (venta) - 3 (ajuste neg) + 10 (NI) - 4 (transferencia salida) + 6 (importación) = 24 en alm-1; 4 en alm-2.
    expect(productosFinal[0].stockPorAlmacen['alm-1']).toBe(24);
    expect(productosFinal[0].stockPorAlmacen['alm-2']).toBe(4);
  });

  it('legacy sigue bloqueado tras activar: registrarAjusteDeStock y el fallback de transferencias legacy rechazan la mutación directa', async () => {
    const empresaId = 'emp-A';
    const productos = [crearProducto({ stockPorAlmacen: { 'alm-1': 10 } })];
    prepararLoteValidado(empresaId, productos, almacenesCompletos, 10);
    await ejecutarActivacionValorizacion({
      empresaId, tratamientoImpuestoCompra: 'impuesto_recuperable', productos, almacenes: almacenesCompletos,
      monedaBase: 'PEN', generarId, fechaActual,
    });

    const { registrarAjusteDeStock } = await import('../../../../../shared/inventory/accionesStock');
    expect(() =>
      registrarAjusteDeStock({
        producto: productos[0],
        almacen: almacenesCompletos.get('alm-1')!,
        datosAjuste: { productoId: 'prod-1', almacenId: 'alm-1', tipo: 'AJUSTE_NEGATIVO', motivo: 'AJUSTE_INVENTARIO', cantidad: 1, observaciones: '', documentoReferencia: '' },
        usuario: 'user-1',
        estadoValorizacion: 'activa',
      })
    ).toThrow(/no está disponible/);

    const { puedeAnularTransferenciaLegacy } = await import('../hooks/useInventory');
    expect(puedeAnularTransferenciaLegacy('activa')).toBe(false);
  });
});
