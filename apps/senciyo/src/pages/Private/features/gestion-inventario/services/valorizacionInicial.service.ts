// gestion-inventario/servicios/valorizacionInicial.service.ts
//
// Orquestador de dominio del proceso de preparación de la valorización inicial (Etapa 2) y de su
// activación final (cierre de Etapa 4B). Coordina detección (utils/deteccionValorizacionInicial.ts),
// la máquina de estados de la EMPRESA (utils/estadoActivacionValorizacionInventario.ts) y el
// repositorio del LOTE (repositories/valorizacionInicialInventario.repository.ts).
//
// "Un solo lote activo por empresa": iniciar/reiniciar siempre crea un lote NUEVO (nunca reutiliza
// ni muta uno cancelado) — el lote cancelado permanece en el repositorio para auditoría.
//
// Activación (cierre Etapa 4B): `ejecutarActivacionValorizacion` crea la `CapaCostoInventario`
// inicial de cada detalle positivo del lote validado — reutiliza exactamente la misma cadena de
// idempotencia/unidad de trabajo recuperable de Etapa 1B (`reservarOperacionIdempotente` +
// `ejecutarUnidadTrabajoInventario`), nunca un motor paralelo. La operación NUNCA muta stock físico
// — solo crea capas y persiste `capaGeneradaId` en el detalle correspondiente.

import type { Product } from '../../catalogo-articulos/models/types';
import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';
import type { TratamientoImpuestoCompra } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import type { EstadoActivacionValorizacion } from '../models/estadoActivacionValorizacion.types';
import type { ValorizacionInicialInventario, DetalleValorizacionInicial } from '../models/valorizacionInicialInventario.types';
import { claveDetalleValorizacion } from '../models/valorizacionInicialInventario.types';
import type { CapaCostoInventario } from '../models/capaCostoInventario.types';
import type { PlanUnidadTrabajoInventario } from '../models/planUnidadTrabajoInventario.types';
import { detectarStockPositivoPorProductoAlmacen, resolverPropuestaCosto } from '../utils/deteccionValorizacionInicial';
import { resolverModoOperacion, validarTransicionEstadoValorizacion } from '../utils/estadoActivacionValorizacionInventario';
import { redondearAPrecision, PRECISION_COSTO_UNITARIO_INTERNO } from '../utils/precisionInventario';
import { hayOperacionInventarioPendienteOAmbigua } from '../utils/journalInventarioPendiente';
import { listarInvalidacionesPendientes } from '../repositories/invalidacionPendienteValorizacionInicial.repository';
import { esProductoInventariable } from '@/shared/inventory/clasificacionInventario';
import { TIPOS_OPERACION_ENTRADA_VALORIZABLES } from '../utils/entradaCuantitativaInventario';
import { TIPOS_OPERACION_SALIDA_VALORIZABLES } from '../utils/salidaCuantitativaInventario';
import { serializarCanonicamente } from '../utils/serializacionCanonicaInventario';
import { calcularHashInventario } from '../utils/hashInventario';
import { reservarOperacionIdempotente } from '../utils/idempotenciaInventario';
import { marcarOperacionFallida } from '../repositories/operacionIdempotenteInventario.repository';
import { obtenerVersionInventarioActual } from '../repositories/estadoVersionInventario.repository';
import { ejecutarUnidadTrabajoInventario } from '../utils/unidadTrabajoInventario';
import type { EscrituraPlanificadaInventario } from '../models/planUnidadTrabajoInventario.types';
import { CLAVE_COLECCION_CAPAS_COSTO_INVENTARIO, listarCapasCostoInventarioPorEmpresa } from '../repositories/capaCostoInventario.repository';
import { lsKey } from '../../../../../shared/tenant';
import {
  guardarValorizacionInicialInventario,
  actualizarValorizacionInicialInventario,
  obtenerLoteActivoPorEmpresa,
  listarValorizacionInicialInventarioPorEmpresa,
  CLAVE_COLECCION_VALORIZACION_INICIAL_INVENTARIO,
} from '../repositories/valorizacionInicialInventario.repository';

export interface DependenciasValorizacionInicial {
  empresaId: string;
  establecimientoId?: string;
  usuario: string;
  productos: readonly Product[];
  almacenes: ReadonlyMap<string, Almacen>;
  generarId: () => string;
  fechaActual: () => string;
  /** Reservado para Etapa 3 (fuente documental real de compras) — ausente hoy. */
  obtenerUltimoCostoDocumental?: (productoId: string) => number | undefined;
}

function construirDetalles(
  productos: readonly Product[],
  almacenes: ReadonlyMap<string, Almacen>,
  obtenerUltimoCostoDocumental?: (productoId: string) => number | undefined
): DetalleValorizacionInicial[] {
  const stockDetectado = detectarStockPositivoPorProductoAlmacen(productos, almacenes);
  const productosPorId = new Map(productos.map((p) => [p.id, p] as const));
  return stockDetectado.map(({ productoId, almacenId, cantidadDetectada }) => {
    const producto = productosPorId.get(productoId);
    const propuesta = resolverPropuestaCosto({ precioCompra: producto?.precioCompra }, obtenerUltimoCostoDocumental ? () => obtenerUltimoCostoDocumental(productoId) : undefined);
    return {
      productoId,
      almacenId,
      cantidadDetectada,
      costoPropuesto: propuesta.costoPropuesto,
      origenPropuesta: propuesta.origenPropuesta,
      confirmado: false,
      requiereRecalculo: false,
    };
  });
}

export interface ResultadoTransicionValorizacion {
  lote: ValorizacionInicialInventario;
  estadoValorizacion: EstadoActivacionValorizacion;
}

/**
 * Inicia una preparación nueva (`no_iniciada → en_preparacion`) — una cancelación siempre devuelve
 * a `no_iniciada`, así que iniciar de nuevo después de cancelar es la misma transición, con un lote
 * NUEVO creado con la detección recién calculada. Es IDEMPOTENTE: si ya existe una preparación en curso
 * (`en_preparacion`/`pendiente_costos`), devuelve el lote activo existente sin crear uno segundo
 * (§13 del encargo: "doble inicio no duplica lote"). Detecta el stock y resuelve la transición
 * directamente hasta `'pendiente_costos'` — en esta arquitectura síncrona no existe un paso
 * intermedio útil entre "iniciar" y "stock detectado".
 */
export function iniciarPreparacionValorizacion(
  estadoValorizacionActual: EstadoActivacionValorizacion,
  deps: DependenciasValorizacionInicial
): ResultadoTransicionValorizacion {
  if (estadoValorizacionActual === 'en_preparacion' || estadoValorizacionActual === 'pendiente_costos') {
    const loteActivo = obtenerLoteActivoPorEmpresa(deps.empresaId);
    if (loteActivo && (loteActivo.estado === 'en_preparacion' || loteActivo.estado === 'pendiente_costos')) {
      return { lote: loteActivo, estadoValorizacion: estadoValorizacionActual };
    }
  }

  if (estadoValorizacionActual !== 'no_iniciada') {
    throw new Error(
      `valorizacionInicial.service: no se puede iniciar una preparación desde el estado "${estadoValorizacionActual}".`
    );
  }

  validarTransicionEstadoValorizacion(estadoValorizacionActual, 'en_preparacion');
  validarTransicionEstadoValorizacion('en_preparacion', 'pendiente_costos');

  const detalles = construirDetalles(deps.productos, deps.almacenes, deps.obtenerUltimoCostoDocumental);
  const lote: ValorizacionInicialInventario = {
    id: deps.generarId(),
    empresaId: deps.empresaId,
    establecimientoId: deps.establecimientoId,
    usuario: deps.usuario,
    fechaCreacion: deps.fechaActual(),
    estado: 'pendiente_costos',
    detalles,
  };
  guardarValorizacionInicialInventario(lote, deps.empresaId);

  return { lote, estadoValorizacion: 'pendiente_costos' };
}

function obtenerLoteEditable(empresaId: string): ValorizacionInicialInventario {
  const lote = obtenerLoteActivoPorEmpresa(empresaId);
  if (!lote) {
    throw new Error(`valorizacionInicial.service: la empresa "${empresaId}" no tiene ninguna preparación de valorización en curso.`);
  }
  if (lote.estado !== 'en_preparacion' && lote.estado !== 'pendiente_costos') {
    throw new Error(
      `valorizacionInicial.service: el lote activo de la empresa "${empresaId}" está en estado "${lote.estado}" — no admite edición de costos.`
    );
  }
  return lote;
}

/**
 * Confirma (o sobreescribe manualmente) el costo de un detalle. `costo` debe ser finito, mayor a
 * cero y respetar la precisión interna de costo (`PRECISION_COSTO_UNITARIO_INTERNO`) — nunca se
 * redondea en silencio. `esManual=true` marca `origenPropuesta='manual'` (el usuario reemplazó la
 * propuesta, no solo la aceptó).
 */
export function confirmarCostoDetalle(
  empresaId: string,
  productoId: string,
  almacenId: string,
  costo: number,
  fechaActual: string,
  esManual = false
): ValorizacionInicialInventario {
  if (!Number.isFinite(costo) || costo <= 0) {
    throw new Error(`valorizacionInicial.service: el costo confirmado debe ser finito y mayor a cero (recibido: ${costo}).`);
  }
  const redondeado = redondearAPrecision(costo, PRECISION_COSTO_UNITARIO_INTERNO);
  if (redondeado !== costo) {
    throw new Error(
      `valorizacionInicial.service: el costo (${costo}) tiene más precisión que la permitida (${PRECISION_COSTO_UNITARIO_INTERNO} decimales).`
    );
  }

  const lote = obtenerLoteEditable(empresaId);
  const indice = lote.detalles.findIndex((d) => d.productoId === productoId && d.almacenId === almacenId);
  if (indice === -1) {
    throw new Error(`valorizacionInicial.service: no existe un detalle para producto "${productoId}" + almacén "${almacenId}" en el lote activo.`);
  }
  const detalleActual = lote.detalles[indice];
  if (detalleActual.cantidadDetectada <= 0) {
    throw new Error('valorizacionInicial.service: no se puede confirmar costo sobre un detalle sin cantidad detectada positiva.');
  }

  const detalles = [...lote.detalles];
  detalles[indice] = {
    ...detalleActual,
    costoConfirmado: redondeado,
    confirmado: true,
    requiereRecalculo: false,
    origenPropuesta: esManual ? 'manual' : detalleActual.origenPropuesta,
    fechaUltimaRevision: fechaActual,
  };
  const loteActualizado: ValorizacionInicialInventario = { ...lote, detalles };
  actualizarValorizacionInicialInventario(loteActualizado, empresaId);
  return loteActualizado;
}

/**
 * Recalcula un detalle marcado `requiereRecalculo` (o cualquier detalle, a pedido del usuario):
 * relee la cantidad real desde `productos`, actualiza `cantidadDetectada`, resuelve nuevamente la
 * propuesta de costo, y exige una nueva confirmación (`confirmado=false`, `requiereRecalculo=false`
 * — deja de estar "pendiente de recálculo" porque YA se recalculó, pero todavía no está confirmado).
 * Si la cantidad recalculada es ≤ 0, el detalle se elimina del lote (ya no hay stock que valorizar).
 */
export function recalcularDetalle(
  empresaId: string,
  productoId: string,
  almacenId: string,
  productos: readonly Product[],
  fechaActual: string,
  obtenerUltimoCostoDocumental?: (productoId: string) => number | undefined
): ValorizacionInicialInventario {
  const lote = obtenerLoteEditable(empresaId);
  const indice = lote.detalles.findIndex((d) => d.productoId === productoId && d.almacenId === almacenId);
  if (indice === -1) {
    throw new Error(`valorizacionInicial.service: no existe un detalle para producto "${productoId}" + almacén "${almacenId}" en el lote activo.`);
  }

  const producto = productos.find((p) => p.id === productoId);
  const cantidadReal = producto?.stockPorAlmacen?.[almacenId] ?? 0;

  let detalles: DetalleValorizacionInicial[];
  if (!Number.isFinite(cantidadReal) || cantidadReal <= 0) {
    detalles = lote.detalles.filter((_, i) => i !== indice);
  } else {
    const propuesta = resolverPropuestaCosto(
      { precioCompra: producto?.precioCompra },
      obtenerUltimoCostoDocumental ? () => obtenerUltimoCostoDocumental(productoId) : undefined
    );
    detalles = [...lote.detalles];
    detalles[indice] = {
      ...detalles[indice],
      cantidadDetectada: cantidadReal,
      costoPropuesto: propuesta.costoPropuesto,
      origenPropuesta: propuesta.origenPropuesta,
      confirmado: false,
      requiereRecalculo: false,
      fechaUltimaRevision: fechaActual,
    };
  }

  const loteActualizado: ValorizacionInicialInventario = { ...lote, detalles };
  actualizarValorizacionInicialInventario(loteActualizado, empresaId);
  return loteActualizado;
}

/**
 * Cancela la preparación en curso (`en_preparacion`/`pendiente_costos`/`validada` → `no_iniciada`,
 * corrección UX-INV-P0-001 2026-08-07) — siempre segura: `'activa'` es inalcanzable desde estos
 * estados, así que nunca existe una capa o movimiento de migración que revertir. Nunca elimina el
 * lote (auditoría): el LOTE conserva su propio `estado: 'cancelada'` (`EstadoLoteValorizacionInicial`,
 * distinto del estado de la EMPRESA) para el historial, aunque la empresa vuelva exactamente al
 * mismo punto de partida que si nunca hubiera iniciado nada.
 */
export function cancelarPreparacion(
  estadoValorizacionActual: EstadoActivacionValorizacion,
  empresaId: string
): ResultadoTransicionValorizacion {
  validarTransicionEstadoValorizacion(estadoValorizacionActual, 'no_iniciada');

  const lote = obtenerLoteActivoPorEmpresa(empresaId);
  if (!lote) {
    throw new Error(`valorizacionInicial.service: la empresa "${empresaId}" no tiene ningún lote activo para cancelar.`);
  }
  const loteActualizado: ValorizacionInicialInventario = { ...lote, estado: 'cancelada' };
  actualizarValorizacionInicialInventario(loteActualizado, empresaId);
  return { lote: loteActualizado, estadoValorizacion: 'no_iniciada' };
}

export interface RequisitoValidacion {
  cumplido: boolean;
  motivo?: string;
}

/**
 * Verifica TODAS las condiciones de §9 antes de permitir `pendiente_costos → validada`. Devuelve la
 * lista completa de requisitos incumplidos (nunca solo el primero) para que la UI pueda mostrarlos
 * todos de una vez.
 */
export function verificarCondicionesValidacion(
  lote: ValorizacionInicialInventario,
  tratamientoImpuestoCompra: TratamientoImpuestoCompra,
  productos: readonly Product[],
  almacenes: ReadonlyMap<string, Almacen>
): string[] {
  const motivos: string[] = [];
  const productosPorId = new Map(productos.map((p) => [p.id, p] as const));

  const detallesRelevantes = lote.detalles.filter((d) => d.cantidadDetectada > 0);
  const pendientesCosto = detallesRelevantes.filter((d) => !d.confirmado || !Number.isFinite(d.costoConfirmado) || (d.costoConfirmado as number) <= 0);
  if (pendientesCosto.length > 0) {
    motivos.push(`${pendientesCosto.length} detalle(s) sin costo confirmado válido.`);
  }

  const pendientesRecalculo = detallesRelevantes.filter((d) => d.requiereRecalculo);
  if (pendientesRecalculo.length > 0) {
    motivos.push(`${pendientesRecalculo.length} detalle(s) requieren recálculo (el stock cambió durante la preparación).`);
  }

  if (tratamientoImpuestoCompra === 'pendiente_configuracion') {
    motivos.push('El tratamiento de impuestos de compra no ha sido configurado.');
  }

  const claves = new Set<string>();
  for (const detalle of lote.detalles) {
    const clave = `${detalle.productoId}:${detalle.almacenId}`;
    if (claves.has(clave)) {
      motivos.push(`Detalle duplicado para producto "${detalle.productoId}" + almacén "${detalle.almacenId}".`);
    }
    claves.add(clave);
  }

  for (const detalle of detallesRelevantes) {
    if (!productosPorId.has(detalle.productoId)) {
      motivos.push(`El producto "${detalle.productoId}" ya no existe en el catálogo.`);
    }
    if (!almacenes.has(detalle.almacenId)) {
      motivos.push(`El almacén "${detalle.almacenId}" ya no existe.`);
    }
  }

  // El snapshot sigue coincidiendo con el stock actual — red de seguridad final, redundante con
  // `invalidarDetalleSiAfectado` (que ya debería haber marcado `requiereRecalculo`), pero nunca se
  // confía únicamente en que esa invalidación se haya ejecutado correctamente en todo momento.
  for (const detalle of detallesRelevantes) {
    const producto = productosPorId.get(detalle.productoId);
    const cantidadReal = producto?.stockPorAlmacen?.[detalle.almacenId] ?? 0;
    if (cantidadReal !== detalle.cantidadDetectada) {
      motivos.push(
        `El stock de "${detalle.productoId}" en "${detalle.almacenId}" cambió (detectado: ${detalle.cantidadDetectada}, actual: ${cantidadReal}) y no fue recalculado.`
      );
    }
  }

  // Bloqueante 1 de la revisión de Etapa 2: antes de validar, consulta el diario/unidad de trabajo
  // de Etapa 1B — una transacción pendiente, ambigua o recuperable podría todavía modificar stock
  // después de aprobar el snapshot. Nunca invoca la recuperación (que MUTA); solo diagnostica.
  if (hayOperacionInventarioPendienteOAmbigua(lote.empresaId)) {
    motivos.push('Existen operaciones de inventario pendientes o ambiguas sin resolver — no se puede validar hasta que el diario esté limpio.');
  }

  // Una invalidación de valorización inicial que falló al aplicarse y quedó encolada para
  // reintento (`ServicioKardexValorizado`) significa que puede existir stock ya mutado cuyo detalle
  // todavía figura como confirmado — bloquea la validación hasta que se drene con éxito.
  if (listarInvalidacionesPendientes(lote.empresaId).length > 0) {
    motivos.push('Existen invalidaciones de costo pendientes de aplicar por un fallo previo — reintenta la operación de inventario afectada antes de validar.');
  }

  return motivos;
}

/** Transiciona `pendiente_costos → validada` solo si `verificarCondicionesValidacion` no devuelve ningún motivo de bloqueo. Persiste el snapshot aprobado e inmutable — no crea capas ni movimientos. */
export function validarYTransicionarAValidada(
  estadoValorizacionActual: EstadoActivacionValorizacion,
  empresaId: string,
  tratamientoImpuestoCompra: TratamientoImpuestoCompra,
  productos: readonly Product[],
  almacenes: ReadonlyMap<string, Almacen>
): ResultadoTransicionValorizacion {
  validarTransicionEstadoValorizacion(estadoValorizacionActual, 'validada');

  const lote = obtenerLoteActivoPorEmpresa(empresaId);
  if (!lote || lote.estado !== 'pendiente_costos') {
    throw new Error(`valorizacionInicial.service: la empresa "${empresaId}" no tiene un lote en "pendiente_costos" para validar.`);
  }

  const motivosBloqueo = verificarCondicionesValidacion(lote, tratamientoImpuestoCompra, productos, almacenes);
  if (motivosBloqueo.length > 0) {
    throw new Error(`valorizacionInicial.service: no se puede validar la preparación — ${motivosBloqueo.join(' ')}`);
  }

  const loteValidado: ValorizacionInicialInventario = { ...lote, estado: 'validada' };
  actualizarValorizacionInicialInventario(loteValidado, empresaId);
  return { lote: loteValidado, estadoValorizacion: 'validada' };
}

// ─── Cierre Etapa 4B: manifiesto de capacidades y condiciones de activación ─

export interface CapacidadActivacion {
  capacidad: string;
  /**
   * `'no_aplica'` únicamente cuando la capacidad ya está implementada y probada pero su
   * arquitectura decide por una dependencia/flag (no por un `Set` de `tipoOperacion`) y por lo
   * tanto no es expresable como una comprobación booleana en tiempo de ejecución aquí — nunca
   * significa "no implementada". Reservado para capacidades REALMENTE inexistentes
   * productivamente; nunca un atajo para "arquitectura distinta" (cierre Etapa 4B, revisión
   * final): importación con reducción, transferencia y reversos SÍ tienen un predicado real
   * central (`resolverModoOperacion`) y por eso se reportan como `boolean`, nunca `'no_aplica'`.
   */
  soportada: boolean | 'no_aplica';
  detalle: string;
}

export interface CapacidadesActivacionRequeridas {
  transferenciaValorizada: boolean;
  importacionReduccionValorizada: boolean;
  reversosValorizados: boolean;
}

/**
 * Predicado REAL y central — nunca un booleano fijado a mano — de las tres capacidades que la
 * revisión final de Etapa 4B exige verificar (no solo informar). Reutiliza EXACTAMENTE el mismo
 * mecanismo que ya usan sus consumidores productivos: `useInventory.ts` deriva
 * `valorizacionHabilitada` para transferencias con `resolverModoOperacion(estadoValorizacion) ===
 * 'valorizado_exclusivo'`; `PanelImportacionStock.tsx`/`importacionValorizadaInventario.ts`
 * derivan `datos.modoOperacion='valorizado'` con el mismo predicado para la línea de reducción.
 * Para reversos: `reversoCuantitativoInventario.ts` decide por los artefactos históricos
 * (capas/consumos) de la operación ORIGINAL, nunca por el estado actual — pero esos artefactos
 * solo existen si la operación original se creó bajo modo valorizado, así que el mismo predicado
 * es la garantía real de que las operaciones creadas bajo `'activa'` serán reversibles.
 *
 * `estadoActivo` es inyectable (nunca `'activa'` fijado a mano dentro del cuerpo) para que las
 * pruebas puedan demostrar el bloqueo real negando el soporte, sin inventar una arquitectura
 * paralela de flags.
 */
export function calcularCapacidadesActivacionReales(
  estadoActivo: EstadoActivacionValorizacion = 'activa'
): CapacidadesActivacionRequeridas {
  const soportada = resolverModoOperacion(estadoActivo) === 'valorizado_exclusivo';
  return {
    transferenciaValorizada: soportada,
    importacionReduccionValorizada: soportada,
    reversosValorizados: soportada,
  };
}

/**
 * Regla de interpretación de una entrada del manifiesto: solo `false` bloquea; `'no_aplica'`
 * nunca bloquea, pero exige `detalle` (justificación) no vacío — `'no_aplica'` sin justificación
 * nunca es válido (§ revisión final de Etapa 4B).
 */
export function capacidadBloqueaActivacion(entrada: CapacidadActivacion): boolean {
  if (entrada.soportada === 'no_aplica') {
    if (!entrada.detalle || !entrada.detalle.trim()) {
      throw new Error(`valorizacionInicial.service: la capacidad "${entrada.capacidad}" se declaró 'no_aplica' sin justificación explícita — nunca válido.`);
    }
    return false;
  }
  return entrada.soportada === false;
}

/**
 * Manifiesto INFORMATIVO para la mayoría de entradas (nunca bloqueante por sí solo), salvo las
 * tres capacidades que `verificarCondicionesActivacion` SÍ exige como condición real de bloqueo
 * (transferencia, importación con reducción, reversos) — reutiliza `calcularCapacidadesActivacionReales`
 * para evitar una segunda lista de capacidades.
 */
export function construirManifiestoCapacidadesActivacion(): CapacidadActivacion[] {
  const modoActivo = resolverModoOperacion('activa');
  const capacidadesRequeridas = calcularCapacidadesActivacionReales('activa');
  const manifiesto: CapacidadActivacion[] = [
    {
      capacidad: 'Nota de Ingreso manual y automática',
      soportada: TIPOS_OPERACION_ENTRADA_VALORIZABLES.has('ni_confirmacion') && TIPOS_OPERACION_ENTRADA_VALORIZABLES.has('ni_automatica'),
      detalle: 'entradaCuantitativaInventario.ts: ni_confirmacion/ni_automatica crean CapaCostoInventario (Etapa 3).',
    },
    {
      capacidad: 'Ajuste positivo',
      soportada: TIPOS_OPERACION_ENTRADA_VALORIZABLES.has('ajuste_positivo'),
      detalle: 'entradaCuantitativaInventario.ts: ajuste_positivo crea capa (Etapa 2).',
    },
    {
      capacidad: 'Importación con incremento',
      soportada: TIPOS_OPERACION_ENTRADA_VALORIZABLES.has('importacion'),
      detalle: 'importacionCuantitativaInventario.ts reutiliza construirCapasEntradaValorizada del motor de entradas para la línea de entrada (cierre Etapa 4A).',
    },
    {
      capacidad: 'Factura/Boleta, POS y Nota de Venta',
      soportada: TIPOS_OPERACION_SALIDA_VALORIZABLES.has('venta_salida'),
      detalle: 'salidaCuantitativaInventario.ts: venta_salida consume FIFO (Etapa 4A); useComprobanteActions.tsx/servicioReservaStock.ts resuelven el modo desde estadoValorizacion real.',
    },
    {
      capacidad: 'Nota de Salida y merma',
      soportada: TIPOS_OPERACION_SALIDA_VALORIZABLES.has('nota_salida'),
      detalle: 'notaSalida.service.ts resuelve el modo real; la merma es un motivo/tipoSalida de NS, nunca un tipoOperacion distinto.',
    },
    {
      capacidad: 'Ajuste negativo',
      soportada: TIPOS_OPERACION_SALIDA_VALORIZABLES.has('ajuste_negativo'),
      detalle: 'useInventory.ts::construirDatosAjusteNegativo resuelve el modo real (cierre Etapa 4A).',
    },
    {
      capacidad: 'Importación con reducción',
      soportada: capacidadesRequeridas.importacionReduccionValorizada,
      detalle: `PanelImportacionStock.tsx/importacionValorizadaInventario.ts: datos.modoOperacion='valorizado' se deriva de resolverModoOperacion(estadoValorizacion) === 'valorizado_exclusivo' — mismo predicado real verificado aquí (resuelto "${modoActivo}"); ya no se declara 'no_aplica' (revisión final Etapa 4B).`,
    },
    {
      capacidad: 'Transferencia entre almacenes',
      soportada: capacidadesRequeridas.transferenciaValorizada,
      detalle: `useInventory.ts: valorizacionHabilitada = resolverModoOperacion(estadoValorizacion) === 'valorizado_exclusivo' — mismo predicado real verificado aquí (resuelto "${modoActivo}"); ya no se declara 'no_aplica' (revisión final Etapa 4B).`,
    },
    {
      capacidad: 'Reversos (NI, Comprobante/POS, NV, NS, transferencia)',
      soportada: capacidadesRequeridas.reversosValorizados,
      detalle: `reversoCuantitativoInventario.ts revierte según los artefactos históricos (capas/consumos) de la operación ORIGINAL, nunca el estado actual — esos artefactos solo existen si la operación se creó bajo resolverModoOperacion === 'valorizado_exclusivo' (resuelto "${modoActivo}"); ya no se declara 'no_aplica' (revisión final Etapa 4B).`,
    },
    {
      capacidad: 'Rutas legacy bloqueadas en modo valorizado',
      soportada: modoActivo === 'valorizado_exclusivo',
      detalle: `resolverModoOperacion('activa') resuelve "${modoActivo}" — accionesStock.ts, useInventory.ts (fallback legacy y transferencias) y PanelImportacionStock.tsx bloquean toda mutación directa fuera de los modos cuantitativos libres.`,
    },
  ];
  // Autovalidación real (nunca solo en pruebas): cada entrada del manifiesto debe respetar la
  // regla de interpretación de `capacidadBloqueaActivacion` — un 'no_aplica' sin justificación
  // lanzaría aquí mismo, en producción, antes de que el manifiesto llegue a ningún consumidor.
  manifiesto.forEach(capacidadBloqueaActivacion);
  return manifiesto;
}

/**
 * Verifica TODAS las condiciones reales antes de permitir `validada → activando` (§6 A/B/C del
 * encargo). Devuelve la lista COMPLETA de bloqueantes (nunca solo el primero), igual que
 * `verificarCondicionesValidacion`, para que la UI los muestre todos de una vez. Nunca muta nada
 * — solo lee `lote`/`productos`/`almacenes`, los mismos snapshots que ya usa la preparación.
 */
export function verificarCondicionesActivacion(
  lote: ValorizacionInicialInventario,
  tratamientoImpuestoCompra: TratamientoImpuestoCompra,
  productos: readonly Product[],
  almacenes: ReadonlyMap<string, Almacen>,
  monedaBase: string | undefined,
  capacidadesRequeridas: CapacidadesActivacionRequeridas = calcularCapacidadesActivacionReales('activa')
): string[] {
  const motivos: string[] = [];
  const productosPorId = new Map(productos.map((p) => [p.id, p] as const));

  // A. Preparación
  if (lote.estado === 'cancelada') {
    motivos.push('El lote de valorización inicial fue cancelado — no puede activarse.');
  } else if (lote.estado !== 'validada') {
    motivos.push(`El lote debe estar "validada" para activarse (estado actual: "${lote.estado}").`);
  }

  const detallesRelevantes = lote.detalles.filter((d) => d.cantidadDetectada > 0);
  const pendientesCosto = detallesRelevantes.filter((d) => !d.confirmado || !Number.isFinite(d.costoConfirmado) || (d.costoConfirmado as number) <= 0);
  if (pendientesCosto.length > 0) {
    motivos.push(`${pendientesCosto.length} detalle(s) sin costo confirmado válido.`);
  }
  const pendientesRecalculo = detallesRelevantes.filter((d) => d.requiereRecalculo);
  if (pendientesRecalculo.length > 0) {
    motivos.push(`${pendientesRecalculo.length} detalle(s) requieren recálculo (el stock cambió).`);
  }

  const clavesVistas = new Set<string>();
  for (const detalle of lote.detalles) {
    const clave = claveDetalleValorizacion(detalle.productoId, detalle.almacenId);
    if (clavesVistas.has(clave)) {
      motivos.push(`Detalle duplicado para producto "${detalle.productoId}" + almacén "${detalle.almacenId}".`);
    }
    clavesVistas.add(clave);
  }

  if (tratamientoImpuestoCompra === 'pendiente_configuracion') {
    motivos.push('El tratamiento de impuestos de compra no ha sido configurado.');
  }
  if (!monedaBase || !monedaBase.trim()) {
    motivos.push('No hay una moneda base configurada para la empresa.');
  }

  // B. Stock
  for (const detalle of detallesRelevantes) {
    const producto = productosPorId.get(detalle.productoId);
    if (!producto) {
      motivos.push(`El producto "${detalle.productoId}" ya no existe en el catálogo.`);
      continue;
    }
    if (!almacenes.has(detalle.almacenId)) {
      motivos.push(`El almacén "${detalle.almacenId}" ya no existe.`);
      continue;
    }
    if (!esProductoInventariable(producto)) {
      motivos.push(`El producto "${producto.nombre}" ya no está controlado por stock — no puede generar una capa inicial.`);
      continue;
    }
    const cantidadReal = producto.stockPorAlmacen?.[detalle.almacenId] ?? 0;
    if (cantidadReal < 0) {
      motivos.push(`El stock de "${producto.nombre}" en "${detalle.almacenId}" es negativo (${cantidadReal}) — inconsistencia real.`);
    } else if (cantidadReal !== detalle.cantidadDetectada) {
      motivos.push(
        `El stock de "${producto.nombre}" en "${detalle.almacenId}" cambió (detectado: ${detalle.cantidadDetectada}, actual: ${cantidadReal}) y no fue recalculado.`
      );
    }
  }

  const clavesEnLote = new Set(lote.detalles.map((d) => claveDetalleValorizacion(d.productoId, d.almacenId)));
  for (const producto of productos) {
    if (!esProductoInventariable(producto)) continue;
    for (const [almacenId, cantidad] of Object.entries(producto.stockPorAlmacen ?? {})) {
      if (typeof cantidad === 'number' && cantidad > 0 && !clavesEnLote.has(claveDetalleValorizacion(producto.id, almacenId))) {
        motivos.push(`"${producto.nombre}" tiene stock positivo en "${almacenId}" que no figura en el lote de valorización — recalcula la preparación.`);
      }
    }
  }

  // C. Operaciones pendientes
  if (hayOperacionInventarioPendienteOAmbigua(lote.empresaId)) {
    motivos.push('Existen operaciones de inventario pendientes o ambiguas sin resolver — no se puede activar hasta que el diario esté limpio.');
  }
  if (listarInvalidacionesPendientes(lote.empresaId).length > 0) {
    motivos.push('Existen invalidaciones de costo pendientes de aplicar por un fallo previo — reintenta la operación de inventario afectada antes de activar.');
  }

  // D. Capacidades productivas requeridas (revisión final de Etapa 4B): transferencia, importación
  // con reducción y reversos ya no son solo informativas en el manifiesto — si el predicado real
  // que las sustenta no está disponible, la activación se bloquea explícitamente antes de mutar
  // nada, en vez de continuar asumiendo un soporte que no existe.
  if (!capacidadesRequeridas.transferenciaValorizada) {
    motivos.push('La capacidad de transferencia entre almacenes en modo valorizado no está disponible — no se puede activar.');
  }
  if (!capacidadesRequeridas.importacionReduccionValorizada) {
    motivos.push('La capacidad de importación con reducción en modo valorizado no está disponible — no se puede activar.');
  }
  if (!capacidadesRequeridas.reversosValorizados) {
    motivos.push('La capacidad de reversos en modo valorizado no está disponible — no se puede activar.');
  }

  return motivos;
}

/**
 * `true` únicamente cuando la transición hacia `'activando'` está permitida desde el estado
 * actual — reutiliza la máquina central (nunca duplica el conjunto de estados origen a mano). Es
 * la única puerta que la UI consulta para decidir si mostrar "Activar valorización"/"Reintentar
 * activación".
 */
export function puedeIniciarActivacion(estadoValorizacionActual: EstadoActivacionValorizacion): boolean {
  try {
    validarTransicionEstadoValorizacion(estadoValorizacionActual, 'activando');
    return true;
  } catch {
    return false;
  }
}

/**
 * `true` cuando corresponde INVOCAR `ejecutarActivacionValorizacion` — ya sea para INICIAR una
 * activación nueva (`puedeIniciarActivacion`, mismo criterio de siempre) o para REANUDAR una que
 * ya está `'activando'` (revisión final Etapa 4B, §3: recuperación real tras recarga o
 * interrupción). `'activando' → 'activando'` nunca aparece en `TRANSICIONES_PERMITIDAS` — sería
 * incorrecto reutilizar `puedeIniciarActivacion` a solas para decidir si reanudar, porque
 * devolvería `false` y dejaría el intento reanudable congelado mostrando solo un spinner sin
 * ninguna reanudación real. La propia idempotencia del ledger (`reservarOperacionIdempotente`) es
 * la que garantiza que reanudar nunca inicia una segunda activación — esta función solo decide
 * cuándo es válido intentarlo, en la UI, con la misma máquina central (nunca un booleano nuevo).
 */
export function puedeReanudarOIniciarActivacion(estadoValorizacionActual: EstadoActivacionValorizacion): boolean {
  return estadoValorizacionActual === 'activando' || puedeIniciarActivacion(estadoValorizacionActual);
}

/**
 * Identidad estable de la activación — derivada únicamente de `empresaId` + `loteId`, nunca de
 * `Math.random`/`Date.now`/la fecha del intento. La MISMA activación (mismo lote) siempre resuelve
 * a la MISMA clave, sin importar cuántas veces se reintente.
 */
export function construirClaveActivacion(empresaId: string, loteId: string): string {
  return `VALORIZACION-INICIAL:${empresaId}:${loteId}`;
}

/**
 * Versión explícita del contrato de activación — cambia únicamente si el propio contrato (qué
 * campos entran a la huella canónica) cambia; nunca se infiere del contenido del lote.
 */
const VERSION_CONTRATO_ACTIVACION_VALORIZADA = 1;

/**
 * Huella canónica de la activación (revisión final de Etapa 4B): incluye TODOS los datos
 * materiales que podrían cambiar el resultado de crear las capas iniciales — no solo
 * `empresaId`/`loteId` (que ya forman parte de la clave, pero también deben formar parte del
 * hash, para blindar contra una clave reutilizada con datos ajenos) sino además
 * `productoId`/`almacenId`/`cantidadDetectada`/`costoConfirmado` por detalle, la MONEDA BASE
 * (una reanudación con una moneda base distinta a la del primer intento nunca es el mismo
 * reintento) y `tratamientoImpuestoCompra` (forma parte de las condiciones reales de activación
 * en `verificarCondicionesActivacion`). La fecha técnica de la activación NUNCA entra aquí — debe
 * poder reintentarse horas o días después sin que eso, por sí solo, cambie la identidad.
 */
function construirDtoCanonicoActivacion(
  lote: ValorizacionInicialInventario,
  monedaBase: string,
  tratamientoImpuestoCompra: TratamientoImpuestoCompra
): Record<string, unknown> {
  const detalles = lote.detalles
    .filter((d) => d.cantidadDetectada > 0)
    .map((d) => ({
      productoId: d.productoId,
      almacenId: d.almacenId,
      cantidadDetectada: d.cantidadDetectada,
      // Un reintento con el mismo lote pero un costo CONFIRMADO distinto (p. ej. el usuario
      // canceló, recalculó y volvió a confirmar antes de reintentar) es una activación distinta,
      // nunca un reintento legítimo — debe formar parte del hash (mismo criterio que entrada/salida).
      costoConfirmado: d.costoConfirmado ?? null,
    }))
    .sort((a, b) => {
      const claveA = claveDetalleValorizacion(a.productoId, a.almacenId);
      const claveB = claveDetalleValorizacion(b.productoId, b.almacenId);
      return claveA < claveB ? -1 : claveA > claveB ? 1 : 0;
    });
  return {
    version: VERSION_CONTRATO_ACTIVACION_VALORIZADA,
    empresaId: lote.empresaId,
    loteId: lote.id,
    monedaBase,
    tratamientoImpuestoCompra,
    detalles,
  };
}

/**
 * Hash de idempotencia de la activación — nunca fabricado a mano por el consumidor. Al incluir
 * `monedaBase`/`tratamientoImpuestoCompra` en la huella, una reanudación de la MISMA clave
 * (mismo empresaId+loteId) con cualquiera de esos datos materiales distinto produce un hash
 * distinto — si la operación ya está `confirmada` (activa), `reservarOperacionIdempotente` la
 * rechaza con `ConflictoIdempotencia` en vez de continuar en silencio.
 */
export function calcularHashActivacion(
  lote: ValorizacionInicialInventario,
  monedaBase: string,
  tratamientoImpuestoCompra: TratamientoImpuestoCompra
): Promise<string> {
  return calcularHashInventario(serializarCanonicamente(construirDtoCanonicoActivacion(lote, monedaBase, tratamientoImpuestoCompra)));
}

interface ParametrosPrepararEscriturasActivacion {
  lote: ValorizacionInicialInventario;
  almacenes: ReadonlyMap<string, Almacen>;
  monedaBase: string;
  fecha: string;
  generarId: () => string;
}

interface ResultadoPrepararEscriturasActivacion {
  loteActualizado: ValorizacionInicialInventario;
  capasNuevas: CapaCostoInventario[];
  escrituras: EscrituraPlanificadaInventario[];
}

/**
 * Preparación PURA (sin efectos): construye la `CapaCostoInventario` de cada detalle positivo del
 * lote (cantidadInicial=cantidadDisponible=cantidadDetectada, costo=costoConfirmado, moneda base
 * real, procedencia='migracion_inicial', documentoOrigenId=lote.id, lineaOrigenId=clave estable
 * producto+almacén) y el lote actualizado con `capaGeneradaId` persistido por detalle — NUNCA toca
 * `stockPorAlmacen` ni genera un `MovimientoStock`.
 *
 * RECONCILIA en vez de rechazar a ciegas (§10, §7 del encargo — "el reintento localiza las capas
 * ya creadas y completa las faltantes"): si YA existe una capa para este lote+detalle (localizada
 * por `documentoOrigenId`+`lineaOrigenId`, nunca por `capaGeneradaId` a solas) y sus datos
 * coinciden EXACTAMENTE con el detalle actual, se REUTILIZA (nunca se crea una segunda); si los
 * datos no coinciden, o el detalle trae un `capaGeneradaId` que no corresponde a ninguna capa real
 * de este lote+detalle, es una inconsistencia real — se rechaza TODA la activación. Solo los
 * detalles sin ninguna capa propia todavía generan una capa nueva.
 */
function prepararEscriturasActivacion(params: ParametrosPrepararEscriturasActivacion): ResultadoPrepararEscriturasActivacion {
  const { lote, almacenes, monedaBase, fecha, generarId } = params;

  const capasExistentes = listarCapasCostoInventarioPorEmpresa(lote.empresaId);
  const capasExistentesPorClave = new Map(
    capasExistentes.filter((c) => c.documentoOrigenId === lote.id).map((c) => [c.lineaOrigenId, c] as const)
  );
  const detallesRelevantes = lote.detalles.filter((d) => d.cantidadDetectada > 0);
  const capasNuevas: CapaCostoInventario[] = [];
  const detallesActualizados = [...lote.detalles];

  for (const detalle of detallesRelevantes) {
    const clave = claveDetalleValorizacion(detalle.productoId, detalle.almacenId);
    const indice = detallesActualizados.findIndex((d) => d.productoId === detalle.productoId && d.almacenId === detalle.almacenId);
    const capaExistente = capasExistentesPorClave.get(clave);

    if (capaExistente) {
      if (
        capaExistente.productoId !== detalle.productoId ||
        capaExistente.almacenId !== detalle.almacenId ||
        capaExistente.cantidadInicial !== detalle.cantidadDetectada ||
        capaExistente.costoUnitarioBaseMonedaBase !== detalle.costoConfirmado ||
        capaExistente.monedaBase !== monedaBase
      ) {
        throw new Error(
          `valorizacionInicial.service: la capa existente "${capaExistente.id}" del detalle "${clave}" no coincide con los datos actuales del intento (cantidad/costo/moneda base) — inconsistencia real, se rechaza la activación.`
        );
      }
      if (detalle.capaGeneradaId && detalle.capaGeneradaId !== capaExistente.id) {
        throw new Error(
          `valorizacionInicial.service: el detalle "${clave}" referencia capaGeneradaId "${detalle.capaGeneradaId}", pero la capa real de este lote+detalle es "${capaExistente.id}" — inconsistencia real.`
        );
      }
      // Reutiliza la capa ya creada por un intento previo — nunca crea una segunda.
      detallesActualizados[indice] = { ...detallesActualizados[indice], capaGeneradaId: capaExistente.id };
      continue;
    }

    if (detalle.capaGeneradaId) {
      throw new Error(
        `valorizacionInicial.service: el detalle "${clave}" ya tiene capaGeneradaId "${detalle.capaGeneradaId}" pero no existe ninguna capa de este lote para ese detalle — inconsistencia real.`
      );
    }

    const almacen = almacenes.get(detalle.almacenId);
    if (!almacen) {
      throw new Error(`valorizacionInicial.service: el almacén "${detalle.almacenId}" no existe — no se puede crear la capa inicial del detalle "${clave}".`);
    }
    const costoConfirmado = detalle.costoConfirmado as number; // ya validado finito > 0 por verificarCondicionesActivacion
    const valorValorizable = redondearAPrecision(costoConfirmado * detalle.cantidadDetectada, PRECISION_COSTO_UNITARIO_INTERNO);
    const capaId = generarId();
    capasNuevas.push({
      id: capaId,
      empresaId: lote.empresaId,
      establecimientoId: almacen.establecimientoId,
      productoId: detalle.productoId,
      almacenId: detalle.almacenId,
      // No existe un MovimientoStock real de entrada (la activación nunca muta stock) — se genera
      // un id técnico propio, único por capa, nunca reutilizado ni derivado de Math.random/Date.now.
      movimientoEntradaId: generarId(),
      tipoDocumentoOrigen: 'migracion',
      documentoOrigenId: lote.id,
      lineaOrigenId: clave,
      cantidadInicial: detalle.cantidadDetectada,
      cantidadDisponible: detalle.cantidadDetectada,
      costoUnitarioBaseOriginal: costoConfirmado,
      costoUnitarioBaseMonedaBase: costoConfirmado,
      valorValorizableOriginal: valorValorizable,
      valorValorizableMonedaBase: valorValorizable,
      monedaBase,
      monedaOriginal: monedaBase,
      tipoCambioAplicado: 1,
      fechaTipoCambio: fecha,
      fechaEntrada: fecha,
      estado: 'disponible',
      procedencia: 'migracion_inicial',
      usuario: lote.usuario,
      fechaCreacion: fecha,
    });
    detallesActualizados[indice] = { ...detallesActualizados[indice], capaGeneradaId: capaId };
  }

  const loteActualizado: ValorizacionInicialInventario = { ...lote, detalles: detallesActualizados };

  const claveLote = lsKey(CLAVE_COLECCION_VALORIZACION_INICIAL_INVENTARIO, lote.empresaId);
  const lotesRawAnterior = localStorage.getItem(claveLote);
  const lotesFinales = listarValorizacionInicialInventarioPorEmpresa(lote.empresaId).map((l) => (l.id === lote.id ? loteActualizado : l));

  const claveCapas = lsKey(CLAVE_COLECCION_CAPAS_COSTO_INVENTARIO, lote.empresaId);
  const capasRawAnterior = localStorage.getItem(claveCapas);
  const capasFinales = [...capasExistentes, ...capasNuevas];

  const escrituras: EscrituraPlanificadaInventario[] = [
    { clave: claveLote, valorAnterior: lotesRawAnterior, valorPropuesto: JSON.stringify(lotesFinales) },
    { clave: claveCapas, valorAnterior: capasRawAnterior, valorPropuesto: JSON.stringify(capasFinales) },
  ];

  return { loteActualizado, capasNuevas, escrituras };
}

/**
 * Reconciliación final (§11 del encargo) — se ejecuta DESPUÉS de que la unidad de trabajo confirmó
 * la activación, ANTES de reportar `'activa'` al llamador. Nunca confía en que "terminó el bucle"
 * sea suficiente: verifica que el stock físico (intacto, nunca mutado por esta operación) coincida
 * exactamente con la suma de `cantidadDisponible` de las capas de migración inicial vigentes, que
 * cada detalle positivo tenga EXACTAMENTE una capa propia, que ningún `capaGeneradaId` apunte a una
 * capa inexistente, y que no exista una capa de migración inicial de OTRO lote para el mismo
 * producto+almacén (doble valorización).
 */
export function verificarReconciliacionCapasIniciales(
  lote: ValorizacionInicialInventario,
  productos: readonly Product[],
  almacenes: ReadonlyMap<string, Almacen>
): string[] {
  const motivos: string[] = [];
  const productosPorId = new Map(productos.map((p) => [p.id, p] as const));
  const capas = listarCapasCostoInventarioPorEmpresa(lote.empresaId);
  const capasPorId = new Map(capas.map((c) => [c.id, c] as const));
  const capasDeMigracionDeEsteLote = capas.filter((c) => c.documentoOrigenId === lote.id && c.procedencia === 'migracion_inicial');
  const detallesRelevantes = lote.detalles.filter((d) => d.cantidadDetectada > 0);

  for (const detalle of detallesRelevantes) {
    const clave = claveDetalleValorizacion(detalle.productoId, detalle.almacenId);
    if (!detalle.capaGeneradaId) {
      motivos.push(`El detalle "${clave}" no tiene capaGeneradaId — la activación no generó su capa.`);
      continue;
    }
    const capa = capasPorId.get(detalle.capaGeneradaId);
    if (!capa) {
      motivos.push(`El detalle "${clave}" referencia capaGeneradaId "${detalle.capaGeneradaId}" que no existe.`);
      continue;
    }
    if (capa.empresaId !== lote.empresaId) {
      motivos.push(`La capa "${capa.id}" del detalle "${clave}" pertenece a otra empresa.`);
    }
    if (!Number.isFinite(capa.costoUnitarioBaseMonedaBase) || capa.costoUnitarioBaseMonedaBase <= 0) {
      motivos.push(`La capa "${capa.id}" del detalle "${clave}" tiene un costo inválido.`);
    }
    if (!almacenes.has(capa.almacenId)) {
      motivos.push(`La capa "${capa.id}" del detalle "${clave}" referencia el almacén "${capa.almacenId}", que ya no existe.`);
    }
    const coincidentes = capasDeMigracionDeEsteLote.filter((c) => c.lineaOrigenId === clave);
    if (coincidentes.length !== 1) {
      motivos.push(`El detalle "${clave}" tiene ${coincidentes.length} capa(s) de migración inicial de este lote — debe ser exactamente 1.`);
    }
  }

  const sumaCapasPorClave = new Map<string, number>();
  for (const capa of capasDeMigracionDeEsteLote) {
    if (capa.estado === 'revertida') continue;
    const clave = claveDetalleValorizacion(capa.productoId, capa.almacenId);
    sumaCapasPorClave.set(clave, (sumaCapasPorClave.get(clave) ?? 0) + capa.cantidadDisponible);
  }
  for (const detalle of detallesRelevantes) {
    const clave = claveDetalleValorizacion(detalle.productoId, detalle.almacenId);
    const producto = productosPorId.get(detalle.productoId);
    const stockReal = producto?.stockPorAlmacen?.[detalle.almacenId] ?? 0;
    const sumaCapas = sumaCapasPorClave.get(clave) ?? 0;
    if (stockReal !== sumaCapas) {
      motivos.push(`El stock de "${clave}" (${stockReal}) no coincide con la suma de capas vigentes (${sumaCapas}).`);
    }
  }

  const clavesEnEsteLote = new Set(detallesRelevantes.map((d) => claveDetalleValorizacion(d.productoId, d.almacenId)));
  const capasMigracionDeOtroLote = capas.filter(
    (c) => c.procedencia === 'migracion_inicial' && c.documentoOrigenId !== lote.id && clavesEnEsteLote.has(claveDetalleValorizacion(c.productoId, c.almacenId))
  );
  if (capasMigracionDeOtroLote.length > 0) {
    motivos.push(`Existen ${capasMigracionDeOtroLote.length} capa(s) de migración inicial de OTRO lote para producto+almacén de este lote — doble valorización detectada.`);
  }

  if (hayOperacionInventarioPendienteOAmbigua(lote.empresaId)) {
    motivos.push('Existen operaciones de inventario pendientes o ambiguas tras la activación.');
  }
  if (listarInvalidacionesPendientes(lote.empresaId).length > 0) {
    motivos.push('Existen invalidaciones de costo pendientes tras la activación.');
  }

  return motivos;
}

export interface ResultadoActivacionValorizacion {
  lote: ValorizacionInicialInventario;
  estadoValorizacion: EstadoActivacionValorizacion;
  /** Presente únicamente cuando `estadoValorizacion` es `'fallida_recuperable'` — mensaje real del bloqueante, nunca un console.error silencioso. */
  error?: string;
}

export interface ParametrosEjecutarActivacion {
  empresaId: string;
  tratamientoImpuestoCompra: TratamientoImpuestoCompra;
  productos: readonly Product[];
  almacenes: ReadonlyMap<string, Almacen>;
  /** Moneda base real de la empresa (`currencyManager.getSnapshot().baseCurrency.code`) — nunca un fallback a 'PEN'. */
  monedaBase: string | undefined;
  generarId: () => string;
  fechaActual: () => string;
  /**
   * Solo para pruebas: sobreescribe capacidades individuales de `calcularCapacidadesActivacionReales('activa')`
   * — nunca usado en producción (ningún llamador real de esta función pasa este campo hoy). Permite
   * demostrar que negar una capacidad real bloquea la activación sin inventar una arquitectura de
   * feature-flags que no existe en el resto del sistema.
   */
  capacidadesRequeridas?: Partial<CapacidadesActivacionRequeridas>;
}

/**
 * Orquestación completa de la activación (`validada`/`fallida_recuperable` → `activando` →
 * `activa`): reutiliza EXACTAMENTE la misma cadena de idempotencia/unidad de trabajo recuperable
 * de Etapa 1B (`reservarOperacionIdempotente` + `ejecutarUnidadTrabajoInventario`) — nunca un motor
 * paralelo. `reservarOperacionIdempotente` resuelve por sí solo los cuatro casos productivos:
 * `'nueva'` (primer intento), `'repetida'` (ya confirmada con el mismo hash — se devuelve `'activa'`
 * sin recrear nada), `'ambigua'` (nunca se resuelve a ciegas, se reporta explícito) y `'reactivada'`
 * (reintento seguro tras `'fallida'` — exactamente `fallida_recuperable → activando`). Si la
 * preparación (síncrona, antes de cualquier escritura) falla, se marca `fallida` en el ledger y se
 * devuelve `'fallida_recuperable'` con el motivo real — nunca se deja la reserva huérfana. Si
 * `ejecutarUnidadTrabajoInventario` falla, su propio mecanismo de recuperación decide (nunca se
 * duplica esa lógica aquí); el llamador debe tratar cualquier excepción no capturada como
 * recuperable (reintentar llama a esta misma función, que resuelve el estado real del ledger).
 */
export async function ejecutarActivacionValorizacion(
  params: ParametrosEjecutarActivacion
): Promise<ResultadoActivacionValorizacion> {
  const { empresaId, tratamientoImpuestoCompra, productos, almacenes, monedaBase, generarId, fechaActual } = params;

  const lote = obtenerLoteActivoPorEmpresa(empresaId);
  if (!lote) {
    throw new Error(`valorizacionInicial.service: la empresa "${empresaId}" no tiene ningún lote de valorización inicial.`);
  }

  const capacidadesRequeridas: CapacidadesActivacionRequeridas = {
    ...calcularCapacidadesActivacionReales('activa'),
    ...params.capacidadesRequeridas,
  };
  const motivosBloqueo = verificarCondicionesActivacion(lote, tratamientoImpuestoCompra, productos, almacenes, monedaBase, capacidadesRequeridas);
  if (motivosBloqueo.length > 0) {
    throw new Error(`valorizacionInicial.service: no se puede activar — ${motivosBloqueo.join(' ')}`);
  }

  // A partir de aquí `monedaBase` ya fue validada no vacía por `verificarCondicionesActivacion`.
  const monedaBaseValidada = monedaBase as string;
  const clave = construirClaveActivacion(empresaId, lote.id);
  const hashEntrada = await calcularHashActivacion(lote, monedaBaseValidada, tratamientoImpuestoCompra);

  const resultadoReserva = await reservarOperacionIdempotente({
    empresaId,
    clave,
    tipoOperacion: 'valorizacion_inicial',
    hashEntrada,
    referenciaDocumentoId: lote.id,
    referenciaDocumentoTipo: 'valorizacion_inicial',
    generarId,
    fechaActual,
  });

  if (resultadoReserva.tipo === 'ambigua') {
    throw new Error(
      `valorizacionInicial.service: la activación de la empresa "${empresaId}" quedó en un estado ambiguo (reserva 'preparada' sin resolución) — no se puede continuar automáticamente.`
    );
  }

  if (resultadoReserva.tipo === 'repetida') {
    // Recuperación real tras recarga/reintento sobre una activación YA confirmada (revisión final
    // de Etapa 4B, §3): nunca se confía ciegamente en que 'repetida' implica consistente — se
    // vuelve a correr la MISMA reconciliación de §11 antes de reportar 'activa', para que una
    // inconsistencia real (capas rotas por una manipulación externa) se siga reportando en cada
    // reanudación en vez de quedar enmascarada por el atajo de idempotencia.
    const loteActivado = obtenerLoteActivoPorEmpresa(empresaId) ?? lote;
    const inconsistenciasRepetida = verificarReconciliacionCapasIniciales(loteActivado, productos, almacenes);
    if (inconsistenciasRepetida.length > 0) {
      throw new Error(
        `valorizacionInicial.service: la activación ya estaba confirmada pero la reconciliación detectó inconsistencias — ${inconsistenciasRepetida.join(' ')}`
      );
    }
    return { lote: loteActivado, estadoValorizacion: 'activa' };
  }

  // 'nueva' o 'reactivada': preparar (puro, síncrono) + confirmar (unidad de trabajo recuperable).
  const versionEsperada = obtenerVersionInventarioActual(empresaId);
  const fecha = fechaActual();

  let preparado: ResultadoPrepararEscriturasActivacion;
  try {
    preparado = prepararEscriturasActivacion({ lote, almacenes, monedaBase: monedaBaseValidada, fecha, generarId });
  } catch (causaPreparacion) {
    // Nunca se invocó `ejecutarUnidadTrabajoInventario` (no existe transacción ni escritura de
    // dominio para esta operación) — cerrar con la transición segura ya aprobada en vez de dejar
    // la reserva 'preparada' huérfana (ambigua para siempre).
    marcarOperacionFallida(empresaId, resultadoReserva.operacion.id);
    const mensaje = causaPreparacion instanceof Error ? causaPreparacion.message : String(causaPreparacion);
    return { lote, estadoValorizacion: 'fallida_recuperable', error: mensaje };
  }

  const plan: PlanUnidadTrabajoInventario = {
    id: generarId(),
    empresaId,
    operacionIdempotenteId: resultadoReserva.operacion.id,
    claveIdempotencia: clave,
    tipoOperacion: 'valorizacion_inicial',
    hashEntrada,
    versionEsperada,
    escrituras: preparado.escrituras,
    resultadoIds: preparado.capasNuevas.map((c) => c.id),
    usuario: lote.usuario,
  };

  await ejecutarUnidadTrabajoInventario({ plan, fechaActual });

  const loteFinal = obtenerLoteActivoPorEmpresa(empresaId) as ValorizacionInicialInventario;
  const inconsistencias = verificarReconciliacionCapasIniciales(loteFinal, productos, almacenes);
  if (inconsistencias.length > 0) {
    throw new Error(
      `valorizacionInicial.service: la activación se confirmó pero la reconciliación final detectó inconsistencias — ${inconsistencias.join(' ')}`
    );
  }

  return { lote: loteFinal, estadoValorizacion: 'activa' };
}

export interface ParametrosValidarYActivarValorizacion extends ParametrosEjecutarActivacion {
  /** Estado de activación de valorización ACTUAL de la empresa a nivel de compañía (`PreferenciasInventario.estadoValorizacion`) — nunca `lote.estado`, que es la máquina de estados propia del lote de valorización inicial. */
  estadoValorizacionActual: EstadoActivacionValorizacion;
}

/**
 * Orquestador único de "revisar resumen → click en Activar" (encargo de centralización, §11 —
 * fix de H-2). Une `validarYTransicionarAValidada` + `ejecutarActivacionValorizacion` en una sola
 * llamada para que `'validada'` deje de ser un estado de COMPAÑÍA visible y abandonable entre
 * sesiones: la UI nunca necesita despachar `SET_PREFERENCIAS_INVENTARIO` con `estadoValorizacion:
 * 'validada'` como paso intermedio — solo despacha el resultado FINAL de esta función
 * (`'activa'` o `'fallida_recuperable'`). El lote sigue transicionando internamente por
 * `pendiente_costos → validada` (persistido por `validarYTransicionarAValidada`), pero eso es un
 * detalle de implementación del lote, no un estado que el usuario deba ver ni confirmar por
 * separado.
 *
 * - Desde `'pendiente_costos'`: valida y transiciona el lote a `'validada'` PRIMERO (lanza sin
 *   mutar nada si no cumple condiciones — el modo de la empresa queda intacto, nunca a medias) y
 *   continúa de inmediato a la activación.
 * - Desde `'validada'`/`'activando'`/`'fallida_recuperable'` (recarga a mitad de camino de una
 *   activación YA confirmada por el usuario): omite el primer paso y activa/reanuda directamente —
 *   la propia idempotencia de `ejecutarActivacionValorizacion` garantiza que reanudar nunca
 *   duplica ni reactiva por error.
 * - Cualquier otro estado (`no_iniciada`, `en_preparacion`, `activa`, `suspendida_por_inconsistencia`)
 *   rechaza la llamada explícitamente antes de tocar nada — nunca se asume "reanudable" por omisión.
 */
export async function validarYActivarValorizacion(
  params: ParametrosValidarYActivarValorizacion
): Promise<ResultadoActivacionValorizacion> {
  const { estadoValorizacionActual, empresaId, tratamientoImpuestoCompra, productos, almacenes } = params;

  const puedeEjecutar = estadoValorizacionActual === 'pendiente_costos' || puedeReanudarOIniciarActivacion(estadoValorizacionActual);
  if (!puedeEjecutar) {
    throw new Error(
      `valorizacionInicial.service: no se puede activar la valorización de la empresa "${empresaId}" desde el estado actual ("${estadoValorizacionActual}") — solo es válido desde "pendiente_costos", "validada", "activando" o "fallida_recuperable".`
    );
  }

  if (estadoValorizacionActual === 'pendiente_costos') {
    validarYTransicionarAValidada(estadoValorizacionActual, empresaId, tratamientoImpuestoCompra, productos, almacenes);
  }

  return ejecutarActivacionValorizacion(params);
}
