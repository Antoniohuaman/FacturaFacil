// gestion-inventario/servicios/valorizacionInicial.service.ts
//
// Orquestador de dominio del proceso de preparación de la valorización inicial (Etapa 2). Coordina
// detección (utils/deteccionValorizacionInicial.ts), la máquina de estados de la EMPRESA
// (utils/estadoActivacionValorizacionInventario.ts) y el repositorio del LOTE
// (repositories/valorizacionInicialInventario.repository.ts). No crea `CapaCostoInventario` ni
// `MovimientoStock` — esta etapa construye el proceso únicamente hasta `'validada'`.
//
// "Un solo lote activo por empresa": iniciar/reiniciar siempre crea un lote NUEVO (nunca reutiliza
// ni muta uno cancelado) — el lote cancelado permanece en el repositorio para auditoría.

import type { Product } from '../../catalogo-articulos/models/types';
import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';
import type { TratamientoImpuestoCompra } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import type { EstadoActivacionValorizacion } from '../models/estadoActivacionValorizacion.types';
import type { ValorizacionInicialInventario, DetalleValorizacionInicial } from '../models/valorizacionInicialInventario.types';
import { detectarStockPositivoPorProductoAlmacen, resolverPropuestaCosto } from '../utils/deteccionValorizacionInicial';
import { validarTransicionEstadoValorizacion } from '../utils/estadoActivacionValorizacionInventario';
import { redondearAPrecision, PRECISION_COSTO_UNITARIO_INTERNO } from '../utils/precisionInventario';
import { hayOperacionInventarioPendienteOAmbigua } from '../utils/journalInventarioPendiente';
import { listarInvalidacionesPendientes } from '../repositories/invalidacionPendienteValorizacionInicial.repository';
import {
  guardarValorizacionInicialInventario,
  actualizarValorizacionInicialInventario,
  obtenerLoteActivoPorEmpresa,
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
 * Inicia una preparación nueva (`no_iniciada → en_preparacion`) o la reinicia tras una cancelación
 * (`cancelada_antes_activacion → en_preparacion`) — ambos casos crean un lote NUEVO con la
 * detección recién calculada. Es IDEMPOTENTE: si ya existe una preparación en curso
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

  if (estadoValorizacionActual !== 'no_iniciada' && estadoValorizacionActual !== 'cancelada_antes_activacion') {
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
 * Cancela la preparación en curso (`en_preparacion`/`pendiente_costos`/`validada` →
 * `cancelada_antes_activacion`) — siempre segura en esta etapa: `'activa'` es inalcanzable, así que
 * nunca existe una capa o movimiento de migración que revertir. Nunca elimina el lote (auditoría).
 */
export function cancelarPreparacion(
  estadoValorizacionActual: EstadoActivacionValorizacion,
  empresaId: string
): ResultadoTransicionValorizacion {
  validarTransicionEstadoValorizacion(estadoValorizacionActual, 'cancelada_antes_activacion');

  const lote = obtenerLoteActivoPorEmpresa(empresaId);
  if (!lote) {
    throw new Error(`valorizacionInicial.service: la empresa "${empresaId}" no tiene ningún lote activo para cancelar.`);
  }
  const loteActualizado: ValorizacionInicialInventario = { ...lote, estado: 'cancelada' };
  actualizarValorizacionInicialInventario(loteActualizado, empresaId);
  return { lote: loteActualizado, estadoValorizacion: 'cancelada_antes_activacion' };
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
