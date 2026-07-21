// gestion-inventario/utils/reversoCuantitativoInventario.ts
//
// Motor de REVERSOS (Etapa 1E, §5-§9 del encargo). El movimiento ORIGINAL confirmado es la ÚNICA
// fuente de verdad — nunca se recalcula con catálogo/stock/costo actual, nunca se edita ni
// elimina el original: se crea un movimiento NUEVO (`movimientoReversoDeId`) que referencia al
// primero. Reutiliza la misma cadena aprobada (validar → hash → reservar → preparar → confirmar)
// vía `ServicioKardexValorizado.revertirMovimientoValorizado`/`anularDocumentoValorizado`.
//
// Un único núcleo de cálculo (`calcularReversoDeUnMovimiento`) revierte UN movimiento a la vez,
// mutando un `ContextoReverso` compartido — tanto el reverso de un solo movimiento
// (`prepararReverso`) como la anulación de un documento con varios movimientos
// (`prepararAnulacion`) lo invocan repetidamente sobre el MISMO contexto acumulado, para producir
// un solo plan atómico (nunca "otro motor paralelo", §9: "no llamar revertirMovimientoValorizado
// repetidamente con persistencia por línea").

import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';
import type { Product } from '../../catalogo-articulos/models/types';
import type { MovimientoStock } from '../models/inventory.types';
import type { DatosReversoInventario, DatosAnulacionDocumentoInventario } from '../models/operacionReversoInventario.types';
import type { OperacionIdempotenteInventario } from '../models/operacionIdempotenteInventario.types';
import type { PlanUnidadTrabajoInventario, EscrituraPlanificadaInventario } from '../models/planUnidadTrabajoInventario.types';
import type { CapaCostoInventario } from '../models/capaCostoInventario.types';
import type { ConsumoCapaCostoInventario } from '../models/consumoCapaCostoInventario.types';
import type { Transferencia } from '../models/transferencia.types';
import { ejecutarUnidadTrabajoInventario } from './unidadTrabajoInventario';
import { serializarCanonicamente } from './serializacionCanonicaInventario';
import { calcularHashInventario } from './hashInventario';
import { redondearAPrecision, PRECISION_CANTIDAD_UNIDAD_MINIMA } from './precisionInventario';
import { parsearColeccion, esProductoAlmacenable } from './operacionCuantitativaInventarioComun';
import { InventoryService } from '../services/inventory.service';
import { PRODUCT_STORAGE_KEY } from '../../catalogo-articulos/utils/catalogStorage';
import { STORAGE_KEY_MOVEMENTS } from '../repositories/stock.repository';
import { CLAVE_COLECCION_CAPAS_COSTO_INVENTARIO } from '../repositories/capaCostoInventario.repository';
import { CLAVE_COLECCION_CONSUMOS_CAPA_COSTO_INVENTARIO } from '../repositories/consumoCapaCostoInventario.repository';
import { CLAVE_COLECCION_TRANSFERENCIAS } from '../repositories/transferencia.repository';
import { lsKey } from '../../../../../shared/tenant';

// ─── Validación de contrato (pura, sin snapshots) ──────────────────────────

export function validarContratoReverso(datos: DatosReversoInventario): void {
  if (datos.tipoOperacion !== 'reverso') {
    throw new Error(`reversoCuantitativoInventario: tipoOperacion "${String(datos.tipoOperacion)}" no está soportado — solo se acepta 'reverso'.`);
  }
  if (!datos.empresaId.trim()) throw new Error('reversoCuantitativoInventario: empresaId no puede estar vacío.');
  if (!datos.movimientoId.trim()) throw new Error('reversoCuantitativoInventario: movimientoId no puede estar vacío.');
  if (!datos.claveIdempotencia.trim()) throw new Error('reversoCuantitativoInventario: claveIdempotencia no puede estar vacía.');
  if (!datos.usuario.trim()) throw new Error('reversoCuantitativoInventario: usuario no puede estar vacío.');
  if (!datos.fecha.trim()) throw new Error('reversoCuantitativoInventario: fecha no puede estar vacía.');
}

export function validarContratoAnulacion(datos: DatosAnulacionDocumentoInventario): void {
  if (datos.tipoOperacion !== 'anulacion') {
    throw new Error(`reversoCuantitativoInventario: tipoOperacion "${String(datos.tipoOperacion)}" no está soportado — solo se acepta 'anulacion'.`);
  }
  if (!datos.empresaId.trim()) throw new Error('reversoCuantitativoInventario: empresaId no puede estar vacío.');
  if (!datos.documentoId.trim()) throw new Error('reversoCuantitativoInventario: documentoId no puede estar vacío.');
  if (!datos.claveIdempotencia.trim()) throw new Error('reversoCuantitativoInventario: claveIdempotencia no puede estar vacía.');
  if (!datos.usuario.trim()) throw new Error('reversoCuantitativoInventario: usuario no puede estar vacío.');
  if (!datos.fecha.trim()) throw new Error('reversoCuantitativoInventario: fecha no puede estar vacía.');
  if (datos.movimientoIds.length === 0) {
    throw new Error('reversoCuantitativoInventario: la anulación debe referenciar al menos un movimiento original.');
  }
  const vistos = new Set<string>();
  for (const id of datos.movimientoIds) {
    if (!id.trim()) throw new Error('reversoCuantitativoInventario: movimientoIds no puede contener un id vacío.');
    if (vistos.has(id)) throw new Error(`reversoCuantitativoInventario: el movimiento "${id}" está duplicado en la misma anulación.`);
    vistos.add(id);
  }
}

// ─── Hash canónico ──────────────────────────────────────────────────────────

export function calcularHashReverso(datos: DatosReversoInventario): Promise<string> {
  return calcularHashInventario(serializarCanonicamente({
    empresaId: datos.empresaId,
    movimientoId: datos.movimientoId,
    tipoDocumento: datos.tipoDocumento,
    tipoOperacion: datos.tipoOperacion,
    motivoUsuario: (datos.motivoUsuario ?? '').trim(),
    documentoReferencia: (datos.documentoReferencia ?? '').trim(),
  }));
}

export function calcularHashAnulacion(datos: DatosAnulacionDocumentoInventario): Promise<string> {
  return calcularHashInventario(serializarCanonicamente({
    empresaId: datos.empresaId,
    documentoId: datos.documentoId,
    tipoDocumentoOrigen: datos.tipoDocumentoOrigen,
    tipoOperacion: datos.tipoOperacion,
    movimientoIds: [...datos.movimientoIds].sort(),
    motivoUsuario: (datos.motivoUsuario ?? '').trim(),
    documentoReferencia: (datos.documentoReferencia ?? '').trim(),
  }));
}

function validarReservaCoincideGenerica(
  empresaId: string,
  claveIdempotencia: string,
  tipoOperacion: string,
  operacionReservada: OperacionIdempotenteInventario,
  hashEntrada: string
): void {
  if (operacionReservada.empresaId !== empresaId) {
    throw new Error('reversoCuantitativoInventario: la operación reservada pertenece a otra empresa.');
  }
  if (operacionReservada.clave !== claveIdempotencia) {
    throw new Error('reversoCuantitativoInventario: la operación reservada no corresponde a la clave de idempotencia de esta operación.');
  }
  if (operacionReservada.hashEntrada !== hashEntrada) {
    throw new Error('reversoCuantitativoInventario: la operación reservada no corresponde al hash de esta operación.');
  }
  if (operacionReservada.tipoOperacion !== tipoOperacion) {
    throw new Error('reversoCuantitativoInventario: la operación reservada no corresponde al tipo de operación de esta operación.');
  }
}

// ─── Núcleo de cálculo compartido ───────────────────────────────────────────

function esMovimientoAlmacenable(valor: unknown): valor is MovimientoStock {
  return typeof valor === 'object' && valor !== null && typeof (valor as { id?: unknown }).id === 'string';
}
function esCapaAlmacenable(valor: unknown): valor is CapaCostoInventario {
  return typeof valor === 'object' && valor !== null && typeof (valor as { id?: unknown }).id === 'string';
}
function esConsumoAlmacenable(valor: unknown): valor is ConsumoCapaCostoInventario {
  return typeof valor === 'object' && valor !== null && typeof (valor as { id?: unknown }).id === 'string';
}
function esTransferenciaAlmacenable(valor: unknown): valor is Transferencia {
  return typeof valor === 'object' && valor !== null && typeof (valor as { id?: unknown }).id === 'string';
}

interface ContextoReverso {
  empresaId: string;
  usuario: string;
  fecha: string;
  almacenes: ReadonlyMap<string, Almacen>;
  generarId: () => string;
  productosPorId: Map<string, Product>;
  productosTocados: Set<string>;
  movimientosPorId: Map<string, MovimientoStock>;
  movimientosOrden: string[];
  movimientosNuevos: MovimientoStock[];
  capasPorId: Map<string, CapaCostoInventario>;
  capasTocadas: Set<string>;
  consumosPorId: Map<string, ConsumoCapaCostoInventario>;
  consumosTocados: Set<string>;
  transferenciasPorId: Map<string, Transferencia>;
  transferenciasTocadas: Set<string>;
  huboCapas: boolean;
  huboTransferencias: boolean;
  /**
   * Punto ÚNICO de activación del modo valorizado (cierre final de Etapa 1E, §1) — dependencia de
   * TENANT explícita, nunca derivada de la mera presencia de capas/consumos. Cuando es `false`
   * (todo consumidor productivo hoy), `capasPorId`/`consumosPorId` se construyen VACÍOS a
   * propósito — ni siquiera se leen las colecciones físicas — para que ningún camino de cálculo
   * pueda reaccionar a capas que ya existan por otra vía.
   */
  valorizacionHabilitada: boolean;
}

function construirContexto(params: {
  empresaId: string;
  usuario: string;
  fecha: string;
  productosRaw: string | null;
  movimientosRaw: string | null;
  capasRaw: string | null;
  consumosRaw: string | null;
  transferenciasRaw: string | null;
  almacenes: ReadonlyMap<string, Almacen>;
  generarId: () => string;
  valorizacionHabilitada: boolean;
}): ContextoReverso {
  const { empresaId, usuario, fecha, productosRaw, movimientosRaw, capasRaw, consumosRaw, transferenciasRaw, almacenes, generarId, valorizacionHabilitada } = params;

  const productos = parsearColeccion(productosRaw, 'la colección de productos').map((elemento, indice) => {
    if (!esProductoAlmacenable(elemento)) {
      throw new Error(`reversoCuantitativoInventario: el elemento en el índice ${indice} de la colección de productos no tiene la forma esperada.`);
    }
    return elemento;
  });
  const movimientos = parsearColeccion(movimientosRaw, 'la colección de movimientos').map((elemento, indice) => {
    if (!esMovimientoAlmacenable(elemento)) {
      throw new Error(`reversoCuantitativoInventario: el elemento en el índice ${indice} de la colección de movimientos no tiene la forma esperada.`);
    }
    return elemento;
  });
  // Modo valorizado (§4/§5-§8): SOLO si `valorizacionHabilitada` fue fijado explícitamente a
  // `true` por el llamador — nunca por la mera presencia de capas/consumos. Cuando está
  // deshabilitado (todo consumidor productivo hoy), ni siquiera se PARSEAN las colecciones
  // físicas: quedan vacías a propósito, así ningún capa/consumo existente puede influir.
  const capas = valorizacionHabilitada
    ? parsearColeccion(capasRaw, 'la colección de capas de costo').map((elemento, indice) => {
        if (!esCapaAlmacenable(elemento)) {
          throw new Error(`reversoCuantitativoInventario: el elemento en el índice ${indice} de la colección de capas no tiene la forma esperada.`);
        }
        return elemento;
      })
    : [];
  const consumos = valorizacionHabilitada
    ? parsearColeccion(consumosRaw, 'la colección de consumos de capas').map((elemento, indice) => {
        if (!esConsumoAlmacenable(elemento)) {
          throw new Error(`reversoCuantitativoInventario: el elemento en el índice ${indice} de la colección de consumos no tiene la forma esperada.`);
        }
        return elemento;
      })
    : [];
  const transferencias = parsearColeccion(transferenciasRaw, 'la colección de transferencias').map((elemento, indice) => {
    if (!esTransferenciaAlmacenable(elemento)) {
      throw new Error(`reversoCuantitativoInventario: el elemento en el índice ${indice} de la colección de transferencias no tiene la forma esperada.`);
    }
    return elemento;
  });

  return {
    empresaId,
    usuario,
    fecha,
    almacenes,
    generarId,
    productosPorId: new Map(productos.map((p) => [p.id, p] as const)),
    productosTocados: new Set(),
    movimientosPorId: new Map(movimientos.map((m) => [m.id, m] as const)),
    movimientosOrden: movimientos.map((m) => m.id),
    movimientosNuevos: [],
    capasPorId: new Map(capas.map((c) => [c.id, c] as const)),
    capasTocadas: new Set(),
    consumosPorId: new Map(consumos.map((c) => [c.id, c] as const)),
    consumosTocados: new Set(),
    transferenciasPorId: new Map(transferencias.map((t) => [t.id, t] as const)),
    transferenciasTocadas: new Set(),
    huboCapas: false,
    huboTransferencias: false,
    valorizacionHabilitada,
  };
}

/** `estado==='revertido'` en el propio movimiento nunca se usa como marca — el original JAMÁS se edita. La única prueba válida de "ya revertido" es que YA EXISTA otro movimiento con `movimientoReversoDeId` apuntando a este. */
function yaFueRevertido(contexto: ContextoReverso, movimientoId: string): boolean {
  if (contexto.movimientosNuevos.some((m) => m.movimientoReversoDeId === movimientoId)) return true;
  for (const id of contexto.movimientosOrden) {
    if (contexto.movimientosPorId.get(id)?.movimientoReversoDeId === movimientoId) return true;
  }
  return false;
}

function obtenerMovimientoOriginal(contexto: ContextoReverso, movimientoId: string): MovimientoStock {
  const original = contexto.movimientosPorId.get(movimientoId);
  if (!original) {
    throw new Error(`reversoCuantitativoInventario: el movimiento "${movimientoId}" no existe — no se puede revertir.`);
  }
  if (!original.empresaId) {
    throw new Error(`reversoCuantitativoInventario: el movimiento "${movimientoId}" tiene un histórico incompleto (sin empresaId) — no puede revertirse con seguridad.`);
  }
  if (original.empresaId !== contexto.empresaId) {
    throw new Error(`reversoCuantitativoInventario: el movimiento "${movimientoId}" pertenece a otra empresa — no puede revertirse.`);
  }
  if (!original.productoId || !original.almacenId || !Number.isFinite(original.cantidad) || !Number.isFinite(original.cantidadAnterior) || !Number.isFinite(original.cantidadNueva)) {
    throw new Error(`reversoCuantitativoInventario: el movimiento "${movimientoId}" tiene un histórico incompleto — no puede revertirse con seguridad.`);
  }
  if (yaFueRevertido(contexto, movimientoId)) {
    throw new Error(`reversoCuantitativoInventario: el movimiento "${movimientoId}" ya fue revertido — un movimiento solo puede tener un reverso confirmado.`);
  }
  return original;
}

function obtenerProductoDeTrabajo(contexto: ContextoReverso, productoId: string): Product {
  const producto = contexto.productosPorId.get(productoId);
  if (!producto) {
    throw new Error(`reversoCuantitativoInventario: el producto "${productoId}" no existe en el catálogo — no se puede revertir el movimiento.`);
  }
  return producto;
}

/** Ajusta `stockPorAlmacen[almacenId]` en memoria y marca el producto como tocado — nunca toca `localStorage` directamente. */
function ajustarStockEnContexto(contexto: ContextoReverso, productoId: string, almacenId: string, nuevaCantidad: number): void {
  const producto = obtenerProductoDeTrabajo(contexto, productoId);
  const actualizado: Product = {
    ...producto,
    stockPorAlmacen: { ...(producto.stockPorAlmacen ?? {}), [almacenId]: nuevaCantidad },
    fechaActualizacion: new Date(contexto.fecha),
  };
  contexto.productosPorId.set(productoId, actualizado);
  contexto.productosTocados.add(productoId);
}

/** Restaura en memoria las capas creadas por una ENTRADA (movimientoEntradaId === original.id): rechaza TODO si alguna fue parcialmente consumida/transferida. */
function restaurarCapasDeEntrada(contexto: ContextoReverso, movimientoEntradaId: string, nombreParaError: string): string[] {
  const capasDeLaEntrada = Array.from(contexto.capasPorId.values()).filter((c) => c.movimientoEntradaId === movimientoEntradaId);
  if (capasDeLaEntrada.length === 0) return [];
  for (const capa of capasDeLaEntrada) {
    if (capa.cantidadDisponible !== capa.cantidadInicial) {
      throw new Error(
        `reversoCuantitativoInventario: la capa de costo de "${nombreParaError}" fue consumida o transferida parcialmente ` +
        `(disponible ${capa.cantidadDisponible} de ${capa.cantidadInicial}) — no se puede revertir la entrada completa.`
      );
    }
    if (capa.estado === 'revertida') {
      throw new Error(`reversoCuantitativoInventario: la capa de costo de "${nombreParaError}" ya fue revertida.`);
    }
  }
  const idsTocados: string[] = [];
  for (const capa of capasDeLaEntrada) {
    contexto.capasPorId.set(capa.id, { ...capa, cantidadDisponible: 0, estado: 'revertida' });
    contexto.capasTocadas.add(capa.id);
    idsTocados.push(capa.id);
  }
  contexto.huboCapas = true;
  return idsTocados;
}

/** Restaura en memoria los consumos de una SALIDA (movimientoSalidaId === original.id): devuelve cada capa consumida a disponible, exactamente la cantidad consumida. */
function restaurarConsumosDeSalida(contexto: ContextoReverso, movimientoSalidaId: string, nombreParaError: string): string[] {
  const consumosDeLaSalida = Array.from(contexto.consumosPorId.values()).filter((c) => c.movimientoSalidaId === movimientoSalidaId && c.estado === 'confirmado');
  if (consumosDeLaSalida.length === 0) return [];
  for (const consumo of consumosDeLaSalida) {
    const capa = contexto.capasPorId.get(consumo.capaId);
    if (!capa) {
      throw new Error(`reversoCuantitativoInventario: no se encontró la capa de costo consumida por "${nombreParaError}" — no puede restaurarse con seguridad.`);
    }
    if (capa.estado === 'revertida') {
      throw new Error(`reversoCuantitativoInventario: la capa de costo consumida por "${nombreParaError}" ya fue revertida — no puede restaurarse.`);
    }
    const nuevaDisponible = redondearAPrecision(capa.cantidadDisponible + consumo.cantidadConsumida, PRECISION_CANTIDAD_UNIDAD_MINIMA);
    if (nuevaDisponible > capa.cantidadInicial) {
      throw new Error(`reversoCuantitativoInventario: restaurar el consumo de "${nombreParaError}" dejaría la capa de costo por encima de su cantidad inicial — inconsistencia real, se rechaza.`);
    }
  }
  const idsTocados: string[] = [];
  for (const consumo of consumosDeLaSalida) {
    const capa = contexto.capasPorId.get(consumo.capaId) as CapaCostoInventario;
    const nuevaDisponible = redondearAPrecision(capa.cantidadDisponible + consumo.cantidadConsumida, PRECISION_CANTIDAD_UNIDAD_MINIMA);
    contexto.capasPorId.set(capa.id, { ...capa, cantidadDisponible: nuevaDisponible, estado: 'disponible' });
    contexto.capasTocadas.add(capa.id);
    contexto.consumosPorId.set(consumo.id, { ...consumo, estado: 'revertido' });
    contexto.consumosTocados.add(consumo.id);
    idsTocados.push(consumo.id);
  }
  contexto.huboCapas = true;
  return idsTocados;
}

/** Reverso cuantitativo (sin capas) de UN movimiento simple: calcula la nueva cantidad y valida que la reversión sea segura. Devuelve el `MovimientoStock` de reverso ya construido (sin insertarlo todavía en el contexto). */
function calcularMovimientoDeReverso(contexto: ContextoReverso, original: MovimientoStock): MovimientoStock {
  const signoOriginal = Math.sign(original.cantidadNueva - original.cantidadAnterior);
  const signoReverso = signoOriginal >= 0 ? -1 : 1;

  const producto = obtenerProductoDeTrabajo(contexto, original.productoId);
  const cantidadActual = InventoryService.getStock(producto, original.almacenId);
  const cantidadNueva = redondearAPrecision(cantidadActual + signoReverso * original.cantidad, PRECISION_CANTIDAD_UNIDAD_MINIMA);

  if (signoReverso < 0 && cantidadNueva < 0) {
    throw new Error(
      `reversoCuantitativoInventario: el stock actual de "${original.productoNombre}" en "${original.almacenNombre}" (${cantidadActual}) ` +
      `no permite revertir el movimiento "${original.id}" (dejaría ${cantidadNueva}) — operación rechazada.`
    );
  }

  ajustarStockEnContexto(contexto, original.productoId, original.almacenId, cantidadNueva);

  const almacen = contexto.almacenes.get(original.almacenId);
  const tipoReverso = signoReverso === 1 ? 'AJUSTE_POSITIVO' as const : 'AJUSTE_NEGATIVO' as const;

  return {
    id: contexto.generarId(),
    productoId: original.productoId,
    productoCodigo: original.productoCodigo,
    productoNombre: original.productoNombre,
    tipo: tipoReverso,
    // El motivo HISTÓRICO se conserva — el motivo del usuario (si existe) es solo una explicación
    // adicional, nunca sustituye este campo.
    motivo: original.motivo,
    cantidad: original.cantidad,
    cantidadAnterior: cantidadActual,
    cantidadNueva,
    usuario: contexto.usuario,
    observaciones: `Reverso de ${original.id}`,
    documentoReferencia: original.documentoReferencia,
    fecha: new Date(contexto.fecha),
    almacenId: original.almacenId,
    almacenCodigo: almacen?.codigoAlmacen ?? original.almacenCodigo,
    almacenNombre: almacen?.nombreAlmacen ?? original.almacenNombre,
    EstablecimientoId: almacen?.establecimientoId ?? original.EstablecimientoId,
    EstablecimientoCodigo: almacen?.codigoEstablecimientoDesnormalizado || original.EstablecimientoCodigo,
    EstablecimientoNombre: almacen?.nombreEstablecimientoDesnormalizado || original.EstablecimientoNombre,
    esTransferencia: false,
    empresaId: contexto.empresaId,
    documentoOrigenId: original.documentoOrigenId,
    tipoDocumentoOrigen: original.tipoDocumentoOrigen,
    lineaOrigenId: original.lineaOrigenId,
    estado: 'confirmado',
    claveIdempotencia: original.claveIdempotencia ? `REVERSO-${original.id}` : `REVERSO-${original.id}`,
    movimientoReversoDeId: original.id,
  };
}

/** Revierte AMBOS legs de una transferencia atómicamente (§8): retira del destino, restaura origen, marca capas destino como revertidas — nunca reversos en cadena automáticos si la mercancía ya no está intacta en destino. */
function calcularReversoDeTransferencia(contexto: ContextoReverso, original: MovimientoStock): MovimientoStock[] {
  if (!original.transferenciaId || !original.movimientoRelacionadoId) {
    throw new Error(`reversoCuantitativoInventario: el movimiento "${original.id}" está marcado como transferencia pero tiene un histórico incompleto — no puede revertirse.`);
  }
  const pareja = contexto.movimientosPorId.get(original.movimientoRelacionadoId);
  if (!pareja) {
    throw new Error(`reversoCuantitativoInventario: no se encontró el movimiento pareja ("${original.movimientoRelacionadoId}") de la transferencia "${original.transferenciaId}".`);
  }
  if (yaFueRevertido(contexto, pareja.id)) {
    throw new Error(`reversoCuantitativoInventario: la transferencia "${original.transferenciaId}" ya fue revertida.`);
  }

  const salida = original.tipo === 'SALIDA' ? original : pareja;
  const entrada = original.tipo === 'ENTRADA' ? original : pareja;
  if (salida.tipo !== 'SALIDA' || entrada.tipo !== 'ENTRADA') {
    throw new Error(`reversoCuantitativoInventario: la transferencia "${original.transferenciaId}" tiene un histórico incompleto (legs no reconocibles) — no puede revertirse.`);
  }

  // Modo valorizado: las capas creadas en destino por ESTA transferencia no deben haberse
  // consumido, retransferido ni revertido ya — si la mercancía ya no está intacta en destino, la
  // transferencia no puede anularse silenciosamente.
  const capasDestino = Array.from(contexto.capasPorId.values()).filter((c) => c.movimientoEntradaId === entrada.id);
  const capasOrigenRestauradasIds: string[] = [];
  const capasDestinoRevertidasIds: string[] = [];
  if (capasDestino.length > 0) {
    for (const capa of capasDestino) {
      if (capa.estado === 'revertida') {
        throw new Error(`reversoCuantitativoInventario: una capa creada por la transferencia "${original.transferenciaId}" ya fue revertida.`);
      }
      if (capa.cantidadDisponible !== capa.cantidadInicial) {
        throw new Error(
          `reversoCuantitativoInventario: una capa creada por la transferencia "${original.transferenciaId}" ya fue consumida o transferida ` +
          `nuevamente (disponible ${capa.cantidadDisponible} de ${capa.cantidadInicial}) — la transferencia no puede revertirse.`
        );
      }
    }
    for (const capa of capasDestino) {
      contexto.capasPorId.set(capa.id, { ...capa, cantidadDisponible: 0, estado: 'revertida' });
      contexto.capasTocadas.add(capa.id);
      capasDestinoRevertidasIds.push(capa.id);

      if (capa.capaOrigenId) {
        const capaOrigen = contexto.capasPorId.get(capa.capaOrigenId);
        if (!capaOrigen) {
          throw new Error(`reversoCuantitativoInventario: no se encontró la capa de origen ("${capa.capaOrigenId}") de la transferencia "${original.transferenciaId}".`);
        }
        const nuevaDisponibleOrigen = redondearAPrecision(capaOrigen.cantidadDisponible + capa.cantidadInicial, PRECISION_CANTIDAD_UNIDAD_MINIMA);
        if (nuevaDisponibleOrigen > capaOrigen.cantidadInicial) {
          throw new Error(`reversoCuantitativoInventario: restaurar la capa de origen de la transferencia "${original.transferenciaId}" excedería su cantidad inicial — inconsistencia real, se rechaza.`);
        }
        contexto.capasPorId.set(capaOrigen.id, { ...capaOrigen, cantidadDisponible: nuevaDisponibleOrigen, estado: 'disponible' });
        contexto.capasTocadas.add(capaOrigen.id);
        capasOrigenRestauradasIds.push(capaOrigen.id);
      }
    }
    contexto.huboCapas = true;
  }

  // Retira del destino (bloquea si el stock actual no lo permite — la mercancía pudo haberse
  // movido de nuevo) y restaura el origen.
  const productoDestino = obtenerProductoDeTrabajo(contexto, entrada.productoId);
  const stockActualDestino = InventoryService.getStock(productoDestino, entrada.almacenId);
  const nuevoStockDestino = redondearAPrecision(stockActualDestino - entrada.cantidad, PRECISION_CANTIDAD_UNIDAD_MINIMA);
  if (nuevoStockDestino < 0) {
    throw new Error(`reversoCuantitativoInventario: el stock actual de "${entrada.productoNombre}" en "${entrada.almacenNombre}" no permite revertir la transferencia "${original.transferenciaId}".`);
  }
  ajustarStockEnContexto(contexto, entrada.productoId, entrada.almacenId, nuevoStockDestino);

  const productoOrigen = obtenerProductoDeTrabajo(contexto, salida.productoId);
  const stockActualOrigen = InventoryService.getStock(productoOrigen, salida.almacenId);
  const nuevoStockOrigen = redondearAPrecision(stockActualOrigen + salida.cantidad, PRECISION_CANTIDAD_UNIDAD_MINIMA);
  ajustarStockEnContexto(contexto, salida.productoId, salida.almacenId, nuevoStockOrigen);

  const idReversoSalida = contexto.generarId();
  const idReversoEntrada = contexto.generarId();
  const almacenOrigenObj = contexto.almacenes.get(salida.almacenId);
  const almacenDestinoObj = contexto.almacenes.get(entrada.almacenId);
  const fechaReverso = new Date(contexto.fecha);

  const reversoSalida: MovimientoStock = {
    id: idReversoSalida,
    productoId: salida.productoId,
    productoCodigo: salida.productoCodigo,
    productoNombre: salida.productoNombre,
    tipo: 'ENTRADA',
    motivo: salida.motivo,
    cantidad: salida.cantidad,
    cantidadAnterior: stockActualOrigen,
    cantidadNueva: nuevoStockOrigen,
    usuario: contexto.usuario,
    observaciones: `Reverso de transferencia ${original.transferenciaId}`,
    documentoReferencia: salida.documentoReferencia,
    fecha: fechaReverso,
    almacenId: salida.almacenId,
    almacenCodigo: almacenOrigenObj?.codigoAlmacen ?? salida.almacenCodigo,
    almacenNombre: almacenOrigenObj?.nombreAlmacen ?? salida.almacenNombre,
    EstablecimientoId: almacenOrigenObj?.establecimientoId ?? salida.EstablecimientoId,
    EstablecimientoCodigo: almacenOrigenObj?.codigoEstablecimientoDesnormalizado || salida.EstablecimientoCodigo,
    EstablecimientoNombre: almacenOrigenObj?.nombreEstablecimientoDesnormalizado || salida.EstablecimientoNombre,
    esTransferencia: true,
    transferenciaId: salida.transferenciaId,
    tipoTransferencia: salida.tipoTransferencia,
    empresaId: contexto.empresaId,
    documentoOrigenId: salida.documentoOrigenId,
    tipoDocumentoOrigen: salida.tipoDocumentoOrigen,
    lineaOrigenId: salida.lineaOrigenId,
    estado: 'confirmado',
    claveIdempotencia: `REVERSO-${salida.id}`,
    movimientoReversoDeId: salida.id,
    movimientoRelacionadoId: idReversoEntrada,
  };

  const reversoEntrada: MovimientoStock = {
    id: idReversoEntrada,
    productoId: entrada.productoId,
    productoCodigo: entrada.productoCodigo,
    productoNombre: entrada.productoNombre,
    tipo: 'SALIDA',
    motivo: entrada.motivo,
    cantidad: entrada.cantidad,
    cantidadAnterior: stockActualDestino,
    cantidadNueva: nuevoStockDestino,
    usuario: contexto.usuario,
    observaciones: `Reverso de transferencia ${original.transferenciaId}`,
    documentoReferencia: entrada.documentoReferencia,
    fecha: fechaReverso,
    almacenId: entrada.almacenId,
    almacenCodigo: almacenDestinoObj?.codigoAlmacen ?? entrada.almacenCodigo,
    almacenNombre: almacenDestinoObj?.nombreAlmacen ?? entrada.almacenNombre,
    EstablecimientoId: almacenDestinoObj?.establecimientoId ?? entrada.EstablecimientoId,
    EstablecimientoCodigo: almacenDestinoObj?.codigoEstablecimientoDesnormalizado || entrada.EstablecimientoCodigo,
    EstablecimientoNombre: almacenDestinoObj?.nombreEstablecimientoDesnormalizado || entrada.EstablecimientoNombre,
    esTransferencia: true,
    transferenciaId: entrada.transferenciaId,
    tipoTransferencia: entrada.tipoTransferencia,
    empresaId: contexto.empresaId,
    documentoOrigenId: entrada.documentoOrigenId,
    tipoDocumentoOrigen: entrada.tipoDocumentoOrigen,
    lineaOrigenId: entrada.lineaOrigenId,
    estado: 'confirmado',
    claveIdempotencia: `REVERSO-${entrada.id}`,
    movimientoReversoDeId: entrada.id,
    movimientoRelacionadoId: idReversoSalida,
  };

  const transferenciaDoc = contexto.transferenciasPorId.get(original.transferenciaId);
  if (transferenciaDoc) {
    contexto.transferenciasPorId.set(original.transferenciaId, {
      ...transferenciaDoc,
      estado: 'REVERTIDA',
      fechaReversion: fechaReverso,
      movimientoReversoSalidaId: idReversoSalida,
      movimientoReversoEntradaId: idReversoEntrada,
      ...(capasOrigenRestauradasIds.length > 0 ? { capasOrigenIds: [...(transferenciaDoc.capasOrigenIds ?? []), ...capasOrigenRestauradasIds] } : {}),
      ...(capasDestinoRevertidasIds.length > 0 ? { capasDestinoIds: [...(transferenciaDoc.capasDestinoIds ?? []), ...capasDestinoRevertidasIds] } : {}),
    });
    contexto.transferenciasTocadas.add(original.transferenciaId);
    contexto.huboTransferencias = true;
  }

  return [reversoSalida, reversoEntrada];
}

/** Revierte UN movimiento (o, si pertenece a una transferencia, su pareja también) contra el contexto acumulado — el único núcleo de cálculo real, reutilizado por `prepararReverso` y `prepararAnulacion`. */
function calcularReversoDeUnMovimiento(contexto: ContextoReverso, movimientoId: string): MovimientoStock[] {
  const original = obtenerMovimientoOriginal(contexto, movimientoId);

  if (original.esTransferencia && original.transferenciaId) {
    const nuevos = calcularReversoDeTransferencia(contexto, original);
    for (const m of nuevos) {
      contexto.movimientosPorId.set(m.id, m);
      contexto.movimientosOrden.push(m.id);
      contexto.movimientosNuevos.push(m);
    }
    return nuevos;
  }

  // Restaurar capas/consumos ANTES de calcular el movimiento de reverso: si el histórico de
  // capas impide una restauración segura, se rechaza TODO antes de tocar stock.
  const signoOriginal = Math.sign(original.cantidadNueva - original.cantidadAnterior);
  if (signoOriginal >= 0) {
    restaurarCapasDeEntrada(contexto, original.id, `${original.productoNombre} (${original.id})`);
  } else {
    restaurarConsumosDeSalida(contexto, original.id, `${original.productoNombre} (${original.id})`);
  }

  const nuevo = calcularMovimientoDeReverso(contexto, original);
  contexto.movimientosPorId.set(nuevo.id, nuevo);
  contexto.movimientosOrden.push(nuevo.id);
  contexto.movimientosNuevos.push(nuevo);
  return [nuevo];
}

function construirEscriturasDesdeContexto(contexto: ContextoReverso, empresaId: string): EscrituraPlanificadaInventario[] {
  const claveProductos = lsKey(PRODUCT_STORAGE_KEY, empresaId);
  const claveMovimientos = lsKey(STORAGE_KEY_MOVEMENTS, empresaId);

  const productosFinales = Array.from(contexto.productosPorId.values()).map((p) =>
    InventoryService.recalcularTotalesStock(p, Array.from(contexto.almacenes.values()))
  );
  const movimientosFinales = contexto.movimientosOrden.map((id) => contexto.movimientosPorId.get(id) as MovimientoStock);

  const escrituras: EscrituraPlanificadaInventario[] = [
    { clave: claveProductos, valorAnterior: localStorage.getItem(claveProductos), valorPropuesto: JSON.stringify(productosFinales) },
    { clave: claveMovimientos, valorAnterior: localStorage.getItem(claveMovimientos), valorPropuesto: JSON.stringify(movimientosFinales) },
  ];

  if (contexto.huboCapas) {
    const claveCapas = lsKey(CLAVE_COLECCION_CAPAS_COSTO_INVENTARIO, empresaId);
    const claveConsumos = lsKey(CLAVE_COLECCION_CONSUMOS_CAPA_COSTO_INVENTARIO, empresaId);
    escrituras.push(
      { clave: claveCapas, valorAnterior: localStorage.getItem(claveCapas), valorPropuesto: JSON.stringify(Array.from(contexto.capasPorId.values())) },
      { clave: claveConsumos, valorAnterior: localStorage.getItem(claveConsumos), valorPropuesto: JSON.stringify(Array.from(contexto.consumosPorId.values())) },
    );
  }
  if (contexto.huboTransferencias) {
    const claveTransferencias = lsKey(CLAVE_COLECCION_TRANSFERENCIAS, empresaId);
    escrituras.push({
      clave: claveTransferencias,
      valorAnterior: localStorage.getItem(claveTransferencias),
      valorPropuesto: JSON.stringify(Array.from(contexto.transferenciasPorId.values())),
    });
  }

  return escrituras;
}

// ─── Reverso de UN movimiento ───────────────────────────────────────────────

export interface ParametrosPrepararReverso {
  datos: DatosReversoInventario;
  operacionReservada: OperacionIdempotenteInventario;
  hashEntrada: string;
  versionEsperada: number;
  productosRaw: string | null;
  movimientosRaw: string | null;
  almacenes: ReadonlyMap<string, Almacen>;
  generarId: () => string;
  /** Punto ÚNICO de activación del modo valorizado — ver `ContextoReverso.valorizacionHabilitada`. Ausente/`false` en todo consumidor productivo hoy. */
  valorizacionHabilitada?: boolean;
}

export interface ResultadoPreparacionReverso {
  plan: PlanUnidadTrabajoInventario;
  movimientosGenerados: MovimientoStock[];
  productosActualizados: Product[];
}

export function prepararReverso(params: ParametrosPrepararReverso): ResultadoPreparacionReverso {
  const { datos, operacionReservada, hashEntrada, versionEsperada, productosRaw, movimientosRaw, almacenes, generarId, valorizacionHabilitada } = params;
  validarReservaCoincideGenerica(datos.empresaId, datos.claveIdempotencia, datos.tipoOperacion, operacionReservada, hashEntrada);

  const empresaId = datos.empresaId;
  const contexto = construirContexto({
    empresaId,
    usuario: datos.usuario,
    fecha: datos.fecha,
    productosRaw,
    movimientosRaw,
    capasRaw: localStorage.getItem(lsKey(CLAVE_COLECCION_CAPAS_COSTO_INVENTARIO, empresaId)),
    consumosRaw: localStorage.getItem(lsKey(CLAVE_COLECCION_CONSUMOS_CAPA_COSTO_INVENTARIO, empresaId)),
    transferenciasRaw: localStorage.getItem(lsKey(CLAVE_COLECCION_TRANSFERENCIAS, empresaId)),
    almacenes,
    generarId,
    valorizacionHabilitada: Boolean(valorizacionHabilitada),
  });

  const movimientosGenerados = calcularReversoDeUnMovimiento(contexto, datos.movimientoId);
  const escrituras = construirEscriturasDesdeContexto(contexto, empresaId);
  const productosActualizados = Array.from(contexto.productosTocados).map((id) => contexto.productosPorId.get(id) as Product);

  const plan: PlanUnidadTrabajoInventario = {
    id: generarId(),
    empresaId,
    operacionIdempotenteId: operacionReservada.id,
    claveIdempotencia: datos.claveIdempotencia,
    tipoOperacion: datos.tipoOperacion,
    hashEntrada,
    versionEsperada,
    escrituras,
    resultadoIds: movimientosGenerados.map((m) => m.id),
    usuario: datos.usuario,
  };

  return { plan, movimientosGenerados, productosActualizados };
}

export interface ResultadoConfirmacionReverso {
  documentoId: string;
  resultadoIds: string[];
  transaccionId: string;
}

export async function confirmarReverso(
  documentoId: string,
  plan: PlanUnidadTrabajoInventario,
  fechaActual: () => string
): Promise<ResultadoConfirmacionReverso> {
  const resultado = await ejecutarUnidadTrabajoInventario({ plan, fechaActual });
  return { documentoId, resultadoIds: resultado.resultadoIds, transaccionId: resultado.transaccionId };
}

// ─── Anulación de un documento con varios movimientos ──────────────────────

export interface ParametrosPrepararAnulacion {
  datos: DatosAnulacionDocumentoInventario;
  operacionReservada: OperacionIdempotenteInventario;
  hashEntrada: string;
  versionEsperada: number;
  productosRaw: string | null;
  movimientosRaw: string | null;
  almacenes: ReadonlyMap<string, Almacen>;
  generarId: () => string;
  /** Punto ÚNICO de activación del modo valorizado — ver `ContextoReverso.valorizacionHabilitada`. Ausente/`false` en todo consumidor productivo hoy. */
  valorizacionHabilitada?: boolean;
}

export interface ResultadoPreparacionAnulacion {
  plan: PlanUnidadTrabajoInventario;
  movimientosGenerados: MovimientoStock[];
  productosActualizados: Product[];
}

/**
 * Anula TODOS los movimientos originales de un documento en un solo plan (§9): se validan y
 * calculan todos ANTES de escribir — si cualquiera no puede revertirse, se lanza y NINGUNO se
 * confirma (la preparación completa es pura/en memoria hasta que `confirmar` ejecuta el plan).
 */
export function prepararAnulacion(params: ParametrosPrepararAnulacion): ResultadoPreparacionAnulacion {
  const { datos, operacionReservada, hashEntrada, versionEsperada, productosRaw, movimientosRaw, almacenes, generarId, valorizacionHabilitada } = params;
  validarReservaCoincideGenerica(datos.empresaId, datos.claveIdempotencia, datos.tipoOperacion, operacionReservada, hashEntrada);

  const empresaId = datos.empresaId;
  const contexto = construirContexto({
    empresaId,
    usuario: datos.usuario,
    fecha: datos.fecha,
    productosRaw,
    movimientosRaw,
    capasRaw: localStorage.getItem(lsKey(CLAVE_COLECCION_CAPAS_COSTO_INVENTARIO, empresaId)),
    consumosRaw: localStorage.getItem(lsKey(CLAVE_COLECCION_CONSUMOS_CAPA_COSTO_INVENTARIO, empresaId)),
    transferenciasRaw: localStorage.getItem(lsKey(CLAVE_COLECCION_TRANSFERENCIAS, empresaId)),
    almacenes,
    generarId,
    valorizacionHabilitada: Boolean(valorizacionHabilitada),
  });

  const movimientosGenerados: MovimientoStock[] = [];
  for (const movimientoId of datos.movimientoIds) {
    movimientosGenerados.push(...calcularReversoDeUnMovimiento(contexto, movimientoId));
  }

  const escrituras = construirEscriturasDesdeContexto(contexto, empresaId);
  const productosActualizados = Array.from(contexto.productosTocados).map((id) => contexto.productosPorId.get(id) as Product);

  const plan: PlanUnidadTrabajoInventario = {
    id: generarId(),
    empresaId,
    operacionIdempotenteId: operacionReservada.id,
    claveIdempotencia: datos.claveIdempotencia,
    tipoOperacion: datos.tipoOperacion,
    hashEntrada,
    versionEsperada,
    escrituras,
    resultadoIds: movimientosGenerados.map((m) => m.id),
    usuario: datos.usuario,
  };

  return { plan, movimientosGenerados, productosActualizados };
}

export interface ResultadoConfirmacionAnulacion {
  documentoId: string;
  resultadoIds: string[];
  transaccionId: string;
}

export async function confirmarAnulacion(
  documentoId: string,
  plan: PlanUnidadTrabajoInventario,
  fechaActual: () => string
): Promise<ResultadoConfirmacionAnulacion> {
  const resultado = await ejecutarUnidadTrabajoInventario({ plan, fechaActual });
  return { documentoId, resultadoIds: resultado.resultadoIds, transaccionId: resultado.transaccionId };
}
