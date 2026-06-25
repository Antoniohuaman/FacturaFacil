/**
 * Utilidad compartida para actualizar una Orden de Venta después de que
 * se emite un comprobante desde ella.
 *
 * Operaciones:
 * 1. Marca la OV como 'Atendida' en localStorage.
 * 2. Registra la trazabilidad del comprobante generado.
 * 3. Libera el stock reservado (stockReservadoPorAlmacen).
 * 4. Agrega eventos al historial de la OV.
 * 5. Dispara evento DOM para que el contexto recargue desde storage.
 *
 * No usa React hooks. Accede a Zustand via getState() y a localStorage directamente.
 */

import { useProductStore } from '../../pages/Private/features/catalogo-articulos/hooks/useProductStore';
import type { ReservaStockItem } from '../../pages/Private/features/documentos-comerciales/models/documentoComercial.types';
import { tryLsKey } from '../tenant';

const STORAGE_KEY_DOCUMENTOS = 'documentos_comerciales_v1';
export const EVENTO_RECARGA = 'documentos_comerciales_changed';

/** True si la reserva usa arquitectura nueva (stockReservadoOVPorEstablecimiento). */
export function esReservaGlobal(
  r: { almacenId?: string; establecimientoId?: string },
): r is { establecimientoId: string } {
  return typeof r.establecimientoId === 'string' && r.establecimientoId.length > 0;
}

/** True si la reserva usa arquitectura legacy (stockReservadoPorAlmacen, sin establecimientoId). */
export function esReservaLegacy(
  r: { almacenId?: string; establecimientoId?: string },
): r is { almacenId: string } {
  return typeof r.almacenId === 'string' && r.almacenId.length > 0 && !r.establecimientoId;
}

export interface InfoComprobanteEmitido {
  tipoComprobante: string;
  numeroComprobante: string;
  total: number;
  usuario?: string;
  modoDescuentoStock?: 'automatico' | 'nota_salida' | 'sin_control';
}

export interface DadosComerciaisSyncComprobante {
  items?: unknown[];
  moneda?: string;
  formaPago?: string;
}

const toNum = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const obtenerFechaHoraISO = (): string => new Date().toISOString();

type DespachoBasico = { sku: string; cantidad: number; almacenId?: string; establecimientoId?: string };

function sumarDespachos(anterior: DespachoBasico[], nuevo: DespachoBasico[]): DespachoBasico[] {
  const map = new Map<string, DespachoBasico>();
  for (const item of [...anterior, ...nuevo]) {
    // Usar establecimientoId si existe (nueva arquitectura), almacenId si no (legacy)
    const k = `${item.sku}__${item.establecimientoId ?? item.almacenId ?? 'global'}`;
    const ex = map.get(k);
    map.set(k, ex ? { ...ex, cantidad: ex.cantidad + item.cantidad } : { ...item });
  }
  return Array.from(map.values());
}

function despachoKey(item: DespachoBasico): string {
  return `${item.sku}__${item.establecimientoId ?? item.almacenId ?? 'global'}`;
}

function restarDespachos(anterior: DespachoBasico[], aRestar: DespachoBasico[]): DespachoBasico[] {
  const map = new Map<string, number>();
  for (const item of anterior) {
    const k = despachoKey(item);
    map.set(k, (map.get(k) ?? 0) + item.cantidad);
  }
  for (const item of aRestar) {
    const k = despachoKey(item);
    map.set(k, Math.max(0, (map.get(k) ?? 0) - item.cantidad));
  }
  const seen = new Set<string>();
  return anterior.reduce<DespachoBasico[]>((acc, item) => {
    const k = despachoKey(item);
    if (!seen.has(k)) {
      seen.add(k);
      const qty = map.get(k) ?? 0;
      if (qty > 0) acc.push({ ...item, cantidad: qty });
    }
    return acc;
  }, []);
}

/**
 * Calcula las reservas de stock pendientes de despacho de una OV.
 * Resta las cantidades ya despachadas (`despachado`) de las reservas originales (`original`).
 * Filtra ítems con cantidad resultante ≤ 0.
 */
export function calcularReservasPendientes(
  original: ReservaStockItem[],
  despachado: DespachoBasico[],
): ReservaStockItem[] {
  if (!despachado.length) return original;
  const map = new Map<string, number>();
  for (const d of despachado) {
    const k = despachoKey(d);
    map.set(k, (map.get(k) ?? 0) + d.cantidad);
  }
  return original
    .map(r => {
      // Usar la misma clave que despachoKey para compatibilidad con ambas arquitecturas
      const rKey = `${r.sku}__${r.establecimientoId ?? r.almacenId ?? 'global'}`;
      return { ...r, cantidad: Math.max(0, r.cantidad - (map.get(rKey) ?? 0)) };
    })
    .filter(r => r.cantidad > 0);
}

/**
 * Libera el stock reservado por la OV directamente en el store de productos (Zustand).
 * Maneja tanto reservas nuevas (establecimientoId) como legacy (almacenId).
 *
 * getState() se llama en cada iteración para obtener el producto actualizado:
 * Zustand actualiza el store síncronamente, pero un snapshot capturado antes del bucle
 * no refleja esas actualizaciones. Sin esto, iteraciones sucesivas sobreescribirían las anteriores.
 */
export function liberarReservasDeOV(
  reservasStock: Array<{ sku: string; cantidad: number; almacenId?: string; establecimientoId?: string }>,
): void {
  for (const reserva of reservasStock) {
    const producto = useProductStore.getState().allProducts.find((p) => p.codigo === reserva.sku);
    if (!producto) continue;

    if (reserva.establecimientoId) {
      // Reserva global por establecimiento (nueva arquitectura OV)
      const reservadoActual = toNum(
        (producto.stockReservadoOVPorEstablecimiento ?? {})[reserva.establecimientoId],
      );
      const nuevoReservado = Math.max(0, reservadoActual - reserva.cantidad);
      useProductStore.getState().updateProduct(producto.id, {
        stockReservadoOVPorEstablecimiento: {
          ...(producto.stockReservadoOVPorEstablecimiento ?? {}),
          [reserva.establecimientoId]: nuevoReservado,
        },
      });
    } else if (reserva.almacenId) {
      // Reserva legacy por almacén (OVs creadas antes de esta versión)
      const reservadoActual = toNum((producto.stockReservadoPorAlmacen ?? {})[reserva.almacenId]);
      const nuevoReservado = Math.max(0, reservadoActual - reserva.cantidad);
      useProductStore.getState().updateProduct(producto.id, {
        stockReservadoPorAlmacen: {
          ...(producto.stockReservadoPorAlmacen ?? {}),
          [reserva.almacenId]: nuevoReservado,
        },
      });
    }
  }
}

/**
 * Lee las reservas PENDIENTES de despacho de una OV desde localStorage.
 * Descuenta las cantidades ya despachadas (campo `despachado`) de las reservas originales,
 * de modo que el resultado siempre refleja lo que queda por salir.
 */
export function obtenerReservasDeOV(
  ovId: string
): Array<{ sku: string; cantidad: number; almacenId?: string; establecimientoId?: string; almacenNombre?: string }> {
  try {
    const key = tryLsKey(STORAGE_KEY_DOCUMENTOS) ?? STORAGE_KEY_DOCUMENTOS;
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const documentos: any[] = JSON.parse(raw);
    const ov = documentos.find((d) => d.id === ovId);
    if (!ov || ov.tipo !== 'orden_venta') return [];
    const original: ReservaStockItem[] = Array.isArray(ov.reservasStock) ? ov.reservasStock : [];
    const despachado: DespachoBasico[] = Array.isArray(ov.despachado) ? ov.despachado : [];
    return despachado.length ? calcularReservasPendientes(original, despachado) : original;
  } catch {
    return [];
  }
}

/**
 * Restaura el stock reservado de una OV después de que su Nota de Salida directa fue anulada.
 * Maneja tanto reservas nuevas (establecimientoId → stockReservadoOVPorEstablecimiento)
 * como reservas legacy (almacenId → stockReservadoPorAlmacen).
 */
export function restaurarReservasDeOV(
  reservasStock: Array<{ sku: string; cantidad: number; almacenId?: string; establecimientoId?: string }>,
): void {
  for (const reserva of reservasStock) {
    const producto = useProductStore.getState().allProducts.find((p) => p.codigo === reserva.sku);
    if (!producto) continue;

    if (reserva.establecimientoId) {
      // Reserva global por establecimiento (nueva arquitectura OV)
      const reservadoActual = toNum(
        (producto.stockReservadoOVPorEstablecimiento ?? {})[reserva.establecimientoId],
      );
      useProductStore.getState().updateProduct(producto.id, {
        stockReservadoOVPorEstablecimiento: {
          ...(producto.stockReservadoOVPorEstablecimiento ?? {}),
          [reserva.establecimientoId]: reservadoActual + reserva.cantidad,
        },
      });
    } else if (reserva.almacenId) {
      // Reserva legacy por almacén
      const reservadoActual = toNum((producto.stockReservadoPorAlmacen ?? {})[reserva.almacenId]);
      useProductStore.getState().updateProduct(producto.id, {
        stockReservadoPorAlmacen: {
          ...(producto.stockReservadoPorAlmacen ?? {}),
          [reserva.almacenId]: reservadoActual + reserva.cantidad,
        },
      });
    }
  }
}

/**
 * Marca un documento comercial (NV u OV) con la referencia a su Nota de Salida generada.
 * Escribe directamente en localStorage y dispara el evento de recarga del contexto.
 */
export function vincularDocumentoComercialNS(
  docId: string,
  notaSalidaId: string,
  fechaNS: string,
): void {
  const key = tryLsKey(STORAGE_KEY_DOCUMENTOS) ?? STORAGE_KEY_DOCUMENTOS;
  const raw = localStorage.getItem(key);
  if (!raw) throw new Error(`Almacenamiento de documentos no disponible al vincular NS "${notaSalidaId}".`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const documentos: any[] = JSON.parse(raw);
  const idx = documentos.findIndex((d) => d.id === docId);
  if (idx < 0) throw new Error(`Documento "${docId}" no encontrado al vincular NS "${notaSalidaId}".`);
  const doc = documentos[idx];
  const idsActuales: string[] = Array.isArray(doc.notaSalidaIds) ? doc.notaSalidaIds : [];
  const nuevoIds = idsActuales.includes(notaSalidaId) ? idsActuales : [...idsActuales, notaSalidaId];
  documentos[idx] = {
    ...doc,
    notaSalidaId,
    notaSalidaIds: nuevoIds,
    notaSalidaGenerada: true,
    notaSalidaFechaGeneracion: fechaNS,
    fechaActualizacion: obtenerFechaHoraISO(),
  };
  localStorage.setItem(key, JSON.stringify(documentos));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(EVENTO_RECARGA));
  }
}

/**
 * Elimina la referencia a la Nota de Salida de un documento comercial (NV u OV).
 * Se llama cuando la NS asociada es anulada.
 */
export function desvincularDocumentoComercialNS(docId: string, notaSalidaIdARemover?: string): void {
  const key = tryLsKey(STORAGE_KEY_DOCUMENTOS) ?? STORAGE_KEY_DOCUMENTOS;
  const raw = localStorage.getItem(key);
  if (!raw) throw new Error(`Almacenamiento de documentos no disponible al desvincular NS de "${docId}".`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const documentos: any[] = JSON.parse(raw);
  const idx = documentos.findIndex((d) => d.id === docId);
  if (idx < 0) throw new Error(`Documento "${docId}" no encontrado al desvincular NS.`);
  const doc = documentos[idx];
  const idsActuales: string[] = Array.isArray(doc.notaSalidaIds) ? doc.notaSalidaIds : [];
  const nuevoIds = notaSalidaIdARemover
    ? idsActuales.filter((id) => id !== notaSalidaIdARemover)
    : [];
  const hayNSsRestantes = nuevoIds.length > 0;
  documentos[idx] = {
    ...doc,
    notaSalidaId: hayNSsRestantes ? nuevoIds[nuevoIds.length - 1] : undefined,
    notaSalidaIds: nuevoIds.length > 0 ? nuevoIds : undefined,
    notaSalidaGenerada: hayNSsRestantes,
    notaSalidaFechaGeneracion: hayNSsRestantes ? doc.notaSalidaFechaGeneracion : undefined,
    fechaActualizacion: obtenerFechaHoraISO(),
  };
  localStorage.setItem(key, JSON.stringify(documentos));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(EVENTO_RECARGA));
  }
}

/**
 * Marca la Orden de Venta como 'Atendida' o 'Atendida parcialmente' según cuánto
 * se despachó en la Nota de Salida generada DIRECTAMENTE desde ella.
 *
 * Acepta OV en estado 'Reservada' (primera NS) o 'Atendida parcialmente' (NSs subsiguientes).
 * Acumula los despachos en `despachado` para que futuras NSs y anulaciones calculen
 * correctamente las cantidades pendientes.
 */
export function atenderOrdenVentaPostNSDirecta(
  ovId: string,
  info: { numeroNS: string; usuario?: string; aLiberar: DespachoBasico[] },
): void {
  const key = tryLsKey(STORAGE_KEY_DOCUMENTOS) ?? STORAGE_KEY_DOCUMENTOS;
  const raw = localStorage.getItem(key);
  if (!raw) throw new Error(`Almacenamiento de documentos no disponible al atender OV "${ovId}".`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const documentos: any[] = JSON.parse(raw);
  const idx = documentos.findIndex((d) => d.id === ovId);
  if (idx < 0) throw new Error(`Orden de Venta "${ovId}" no encontrada al atender desde NS directa.`);
  const ov = documentos[idx];
  if (ov.tipo !== 'orden_venta') throw new Error(`El documento "${ovId}" no es una Orden de Venta.`);
  if (ov.estado !== 'Reservada' && ov.estado !== 'Atendida parcialmente') throw new Error(`La OV "${ovId}" no está en estado válido para atender (estado: "${String(ov.estado)}").`);
  const reservasOriginales: ReservaStockItem[] = Array.isArray(ov.reservasStock) ? ov.reservasStock : [];
  const despachadoPrevio: DespachoBasico[] = Array.isArray(ov.despachado) ? ov.despachado : [];
  const nuevoDespachado = sumarDespachos(despachadoPrevio, info.aLiberar);
  const pendientes = calcularReservasPendientes(reservasOriginales, nuevoDespachado);
  const nuevoEstado = pendientes.length > 0 ? 'Atendida parcialmente' : 'Atendida';
  const ahora = obtenerFechaHoraISO();
  documentos[idx] = {
    ...ov,
    estado: nuevoEstado,
    despachado: nuevoDespachado,
    fechaActualizacion: ahora,
    historial: [
      ...(Array.isArray(ov.historial) ? ov.historial : []),
      {
        fecha: ahora,
        usuario: info.usuario,
        accion: nuevoEstado === 'Atendida parcialmente'
          ? 'Nota de Salida directa generada — Orden atendida parcialmente'
          : 'Nota de Salida directa generada — Orden atendida',
        detalle: `Nota de Salida ${info.numeroNS} emitida. Stock descontado y reserva liberada.`,
      },
    ],
  };
  localStorage.setItem(key, JSON.stringify(documentos));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(EVENTO_RECARGA));
  }
}

/**
 * Restaura la Orden de Venta al estado correcto después de que una Nota de Salida directa
 * fue anulada. Restaura únicamente las cantidades que esa NS despachó.
 *
 * - Si ningún despacho queda acumulado → 'Reservada' (NS era la única)
 * - Si aún hay despacho acumulado → 'Atendida parcialmente'
 *
 * Acepta OV en estado 'Atendida' o 'Atendida parcialmente'.
 */
export function restaurarOVPostAnulacionNSDirecta(
  ovId: string,
  info: { numeroNS: string; usuario?: string; aRestaurar: DespachoBasico[] },
): void {
  const key = tryLsKey(STORAGE_KEY_DOCUMENTOS) ?? STORAGE_KEY_DOCUMENTOS;
  const raw = localStorage.getItem(key);
  if (!raw) throw new Error(`Almacenamiento de documentos no disponible al restaurar OV "${ovId}".`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const documentos: any[] = JSON.parse(raw);
  const idx = documentos.findIndex((d) => d.id === ovId);
  if (idx < 0) throw new Error(`Orden de Venta "${ovId}" no encontrada al restaurar tras anulación de NS.`);
  const ov = documentos[idx];
  if (ov.tipo !== 'orden_venta') throw new Error(`El documento "${ovId}" no es una Orden de Venta.`);
  if (ov.estado !== 'Atendida' && ov.estado !== 'Atendida parcialmente') throw new Error(`La OV "${ovId}" no está en estado válido para restaurar (estado: "${String(ov.estado)}").`);
  const despachadoPrevio: DespachoBasico[] = Array.isArray(ov.despachado) ? ov.despachado : [];
  const nuevoDespachado = restarDespachos(despachadoPrevio, info.aRestaurar);
  const reservasOriginales: ReservaStockItem[] = Array.isArray(ov.reservasStock) ? ov.reservasStock : [];
  const pendientes = calcularReservasPendientes(reservasOriginales, nuevoDespachado);
  const totalDespachado = nuevoDespachado.reduce((s, d) => s + d.cantidad, 0);
  const nuevoEstado = totalDespachado === 0
    ? 'Reservada'
    : pendientes.length > 0 ? 'Atendida parcialmente' : 'Atendida';
  const ahora = obtenerFechaHoraISO();
  documentos[idx] = {
    ...ov,
    estado: nuevoEstado,
    despachado: nuevoDespachado.length > 0 ? nuevoDespachado : undefined,
    notaSalidaId: undefined,
    notaSalidaGenerada: nuevoEstado !== 'Reservada',
    notaSalidaFechaGeneracion: nuevoEstado === 'Reservada' ? undefined : ov.notaSalidaFechaGeneracion,
    fechaActualizacion: ahora,
    historial: [
      ...(Array.isArray(ov.historial) ? ov.historial : []),
      {
        fecha: ahora,
        usuario: info.usuario,
        accion: nuevoEstado === 'Reservada'
          ? 'Reserva restaurada por anulación de Nota de Salida directa'
          : 'Reserva parcialmente restaurada por anulación de Nota de Salida',
        detalle: `Nota de Salida ${info.numeroNS} anulada. Stock repuesto.`,
      },
    ],
  };
  // localStorage write BEFORE Zustand mutation: si la escritura falla, la reserva no se restaura.
  try {
    localStorage.setItem(key, JSON.stringify(documentos));
  } catch (causa) {
    if (causa instanceof DOMException && causa.name === 'QuotaExceededError') {
      throw new Error(`Sin espacio en almacenamiento para restaurar OV "${ovId}".`);
    }
    throw new Error(`Error al guardar OV "${ovId}" en el almacenamiento.`);
  }
  // Restaurar reserva Zustand solo después del éxito del guardado en localStorage.
  if (info.aRestaurar.length > 0) {
    restaurarReservasDeOV(info.aRestaurar);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(EVENTO_RECARGA));
  }
}

/**
 * Actualiza la Orden de Venta en localStorage y libera la reserva de stock
 * después de que se emitió un comprobante desde ella.
 *
 * Si la OV no se encuentra o su estado no es 'Reservada', esta función no hace nada.
 */
export function actualizarOrdenVentaPostEmision(
  ovId: string,
  info: InfoComprobanteEmitido,
): void {
  const key = tryLsKey(STORAGE_KEY_DOCUMENTOS) ?? STORAGE_KEY_DOCUMENTOS;
  const raw = localStorage.getItem(key);
  if (!raw) throw new Error(`Almacenamiento de documentos no disponible al actualizar OV "${ovId}" post-emisión.`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const documentos: any[] = JSON.parse(raw);
  const idx = documentos.findIndex((d) => d.id === ovId);
  if (idx < 0) throw new Error(`Orden de Venta "${ovId}" no encontrada al actualizar post-emisión.`);

  const ov = documentos[idx];
  if (ov.tipo !== 'orden_venta') throw new Error(`El documento "${ovId}" no es una Orden de Venta.`);
  if (ov.estado !== 'Reservada') throw new Error(`La OV "${ovId}" no está en estado "Reservada" para actualizar post-emisión (estado: "${String(ov.estado)}").`);

  const ahora = obtenerFechaHoraISO();

  const productosReservados = Array.isArray(ov.reservasStock)
    ? ov.reservasStock.map((r: { nombre: string; cantidad: number }) => `${r.nombre} (${r.cantidad})`).join(', ')
    : '';

  // Liberar reserva solo en modo conocido que no sea nota_salida.
  // Si modoDescuentoStock es undefined no se libera la reserva (conservador).
  const tieneReservas = Array.isArray(ov.reservasStock) && ov.reservasStock.length > 0;
  if (
    (info.modoDescuentoStock === 'automatico' || info.modoDescuentoStock === 'sin_control') &&
    tieneReservas
  ) {
    liberarReservasDeOV(ov.reservasStock);
  }

  const eventoComprobante = {
    fecha: ahora,
    usuario: info.usuario,
    accion: 'Comprobante generado desde orden de venta',
    detalle: `${info.tipoComprobante} ${info.numeroComprobante} — Total: ${info.total.toFixed(2)}`,
  };

  const eventoReserva =
    info.modoDescuentoStock === 'nota_salida'
      ? {
          fecha: ahora,
          usuario: info.usuario,
          accion: 'Reserva pendiente de despacho',
          detalle: productosReservados
            ? `Reserva mantenida hasta emisión de Nota de Salida. Productos: ${productosReservados}`
            : 'Reserva mantenida hasta emisión de Nota de Salida.',
        }
      : {
          fecha: ahora,
          usuario: info.usuario,
          accion: 'Reserva consumida por emisión de comprobante',
          detalle: productosReservados ? `Productos: ${productosReservados}` : undefined,
        };

  // Estado explícito por modo. Modo nota_salida con bienes reservados: la mercadería aún
  // no salió físicamente; la OV queda 'Pendiente de salida'.
  // Modo undefined: conservador — si hay reservas, mantener 'Pendiente de salida'.
  let nuevoEstado: string;
  if (info.modoDescuentoStock === 'nota_salida' && tieneReservas) {
    nuevoEstado = 'Pendiente de salida';
  } else if (info.modoDescuentoStock === 'automatico' || info.modoDescuentoStock === 'sin_control') {
    nuevoEstado = 'Atendida';
  } else {
    nuevoEstado = tieneReservas ? 'Pendiente de salida' : 'Atendida';
  }

  documentos[idx] = {
    ...ov,
    estado: nuevoEstado,
    fechaActualizacion: ahora,
    trazabilidad: {
      ...(ov.trazabilidad ?? {}),
      documentoDestinoId: info.numeroComprobante,
      documentoDestinoTipo: 'comprobante',
      documentoDestinoNumero: info.numeroComprobante,
    },
    historial: [
      ...(Array.isArray(ov.historial) ? ov.historial : []),
      eventoComprobante,
      eventoReserva,
    ],
  };

  localStorage.setItem(key, JSON.stringify(documentos));

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(EVENTO_RECARGA));
  }
}

/**
 * Restaura el estado de la cotización cuando el comprobante generado desde ella es anulado.
 * Revierte el estado 'Convertida' al estado anterior (Aprobada o Vigente) y registra en historial.
 */
export function restaurarCotizacionPostAnulacion(
  cotizacionId: string,
  info: { motivoAnulacionComprobante?: string; usuario?: string; numeroComprobante?: string },
): void {
  try {
    const key = tryLsKey(STORAGE_KEY_DOCUMENTOS) ?? STORAGE_KEY_DOCUMENTOS;
    const raw = localStorage.getItem(key);
    if (!raw) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const documentos: any[] = JSON.parse(raw);
    const idx = documentos.findIndex((d) => d.id === cotizacionId);
    if (idx < 0) return;

    const cot = documentos[idx];
    if (cot.tipo !== 'cotizacion') return;
    if (cot.estado !== 'Convertida') return;

    // Solo Aceptada puede convertir, por tanto siempre se restaura a Aceptada.
    const estadoRestaurado = 'Aceptada';
    const ahora = obtenerFechaHoraISO();

    documentos[idx] = {
      ...cot,
      estado: estadoRestaurado,
      fechaActualizacion: ahora,
      trazabilidad: {
        ...(cot.trazabilidad ?? {}),
        documentoDestinoId: undefined,
        documentoDestinoTipo: undefined,
        documentoDestinoNumero: undefined,
      },
      historial: [
        ...(Array.isArray(cot.historial) ? cot.historial : []),
        {
          fecha: ahora,
          usuario: info.usuario,
          accion: `Estado restaurado por anulación de comprobante`,
          detalle: [
            info.numeroComprobante ? `Comprobante ${info.numeroComprobante} anulado.` : 'Comprobante anulado.',
            info.motivoAnulacionComprobante ? `Motivo: ${info.motivoAnulacionComprobante}` : null,
            `Estado restaurado a: ${estadoRestaurado}.`,
          ].filter(Boolean).join(' '),
        },
      ],
    };

    localStorage.setItem(key, JSON.stringify(documentos));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(EVENTO_RECARGA));
    }
  } catch (err) {
    console.error('[postEmisionOrdenVenta] Error restaurando cotización post anulación:', err);
  }
}

/**
 * Marca la Cotización como 'Convertida' después de que se emitió un comprobante desde ella.
 * No afecta stock (las cotizaciones no reservan).
 */
export function actualizarCotizacionPostEmision(
  cotizacionId: string,
  info: Omit<InfoComprobanteEmitido, 'modoDescuentoStock'>,
  dadosComerciais?: DadosComerciaisSyncComprobante,
): void {
  try {
    const key = tryLsKey(STORAGE_KEY_DOCUMENTOS) ?? STORAGE_KEY_DOCUMENTOS;
    const raw = localStorage.getItem(key);
    if (!raw) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const documentos: any[] = JSON.parse(raw);
    const idx = documentos.findIndex((d) => d.id === cotizacionId);
    if (idx < 0) return;

    const cot = documentos[idx];
    if (cot.tipo !== 'cotizacion') return;
    // Solo Aceptada puede convertirse (Regla 5). 'Generada' solo para compat legacy.
    if (cot.estado !== 'Aceptada' && cot.estado !== 'Generada') return;

    const ahora = obtenerFechaHoraISO();

    const historialEventos = [
      ...(Array.isArray(cot.historial) ? cot.historial : []),
      {
        fecha: ahora,
        usuario: info.usuario,
        accion: 'Comprobante generado desde cotización',
        detalle: `${info.tipoComprobante} ${info.numeroComprobante} — Total: ${info.total.toFixed(2)}`,
      },
    ];
    if (dadosComerciais) {
      historialEventos.push({
        fecha: ahora,
        usuario: info.usuario,
        accion: 'Datos comerciales actualizados en conversión',
        detalle: `Cambios confirmados al emitir ${info.tipoComprobante}`,
      });
    }

    documentos[idx] = {
      ...cot,
      estado: 'Convertida',
      ...(dadosComerciais?.items !== undefined ? { items: dadosComerciais.items } : {}),
      ...(dadosComerciais?.moneda !== undefined ? { moneda: dadosComerciais.moneda } : {}),
      ...(dadosComerciais?.formaPago !== undefined ? { formaPago: dadosComerciais.formaPago } : {}),
      fechaActualizacion: ahora,
      trazabilidad: {
        ...(cot.trazabilidad ?? {}),
        documentoDestinoId: info.numeroComprobante,
        documentoDestinoTipo: 'comprobante',
        documentoDestinoNumero: info.numeroComprobante,
      },
      historial: historialEventos,
    };

    localStorage.setItem(key, JSON.stringify(documentos));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(EVENTO_RECARGA));
    }
  } catch (err) {
    console.error('[postEmisionOrdenVenta] Error actualizando Cotización post emisión:', err);
  }
}

/**
 * Marca la Orden de Venta como 'Atendida' o 'Atendida parcialmente' después de que
 * se generó una Nota de Salida desde el comprobante asociado a ella.
 *
 * Acepta OV en estado 'Pendiente de salida' (primera NS) o 'Atendida parcialmente'
 * (NSs subsiguientes). Acumula los despachos igual que atenderOrdenVentaPostNSDirecta.
 */
export function atenderOrdenVentaPostNS(
  ovId: string,
  info: { numeroNS: string; usuario?: string; aLiberar: DespachoBasico[] },
): void {
  const key = tryLsKey(STORAGE_KEY_DOCUMENTOS) ?? STORAGE_KEY_DOCUMENTOS;
  const raw = localStorage.getItem(key);
  if (!raw) throw new Error(`Almacenamiento de documentos no disponible al atender OV "${ovId}".`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const documentos: any[] = JSON.parse(raw);
  const idx = documentos.findIndex((d) => d.id === ovId);
  if (idx < 0) throw new Error(`Orden de Venta "${ovId}" no encontrada al atender desde NS.`);

  const ov = documentos[idx];
  if (ov.tipo !== 'orden_venta') throw new Error(`El documento "${ovId}" no es una Orden de Venta.`);
  if (ov.estado !== 'Pendiente de salida' && ov.estado !== 'Atendida parcialmente') throw new Error(`La OV "${ovId}" no está en estado válido para atender (estado: "${String(ov.estado)}").`);

  const reservasOriginales: ReservaStockItem[] = Array.isArray(ov.reservasStock) ? ov.reservasStock : [];
  const despachadoPrevio: DespachoBasico[] = Array.isArray(ov.despachado) ? ov.despachado : [];
  const nuevoDespachado = sumarDespachos(despachadoPrevio, info.aLiberar);
  const pendientes = calcularReservasPendientes(reservasOriginales, nuevoDespachado);
  const nuevoEstado = pendientes.length > 0 ? 'Atendida parcialmente' : 'Atendida';
  const ahora = obtenerFechaHoraISO();

  documentos[idx] = {
    ...ov,
    estado: nuevoEstado,
    despachado: nuevoDespachado,
    fechaActualizacion: ahora,
    historial: [
      ...(Array.isArray(ov.historial) ? ov.historial : []),
      {
        fecha: ahora,
        usuario: info.usuario,
        accion: nuevoEstado === 'Atendida parcialmente'
          ? 'Nota de Salida generada — Orden atendida parcialmente'
          : 'Nota de Salida generada — Orden atendida',
        detalle: `Nota de Salida ${info.numeroNS} emitida. Reserva liberada y stock descontado.`,
      },
    ],
  };

  localStorage.setItem(key, JSON.stringify(documentos));

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(EVENTO_RECARGA));
  }
}

/**
 * Marca la Nota de Venta como 'Convertida' después de que se emitió un comprobante desde ella.
 */
export function actualizarNVPostEmision(
  nvId: string,
  info: Omit<InfoComprobanteEmitido, 'modoDescuentoStock'>,
): void {
  try {
    const key = tryLsKey(STORAGE_KEY_DOCUMENTOS) ?? STORAGE_KEY_DOCUMENTOS;
    const raw = localStorage.getItem(key);
    if (!raw) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const documentos: any[] = JSON.parse(raw);
    const idx = documentos.findIndex((d) => d.id === nvId);
    if (idx < 0) return;

    const nv = documentos[idx];
    if (nv.tipo !== 'nota_venta') return;
    if (nv.estado !== 'Generada') return;

    const ahora = obtenerFechaHoraISO();

    documentos[idx] = {
      ...nv,
      estado: 'Convertida',
      fechaActualizacion: ahora,
      trazabilidad: {
        ...(nv.trazabilidad ?? {}),
        documentoDestinoId: info.numeroComprobante,
        documentoDestinoTipo: 'comprobante',
        documentoDestinoNumero: info.numeroComprobante,
      },
      historial: [
        ...(Array.isArray(nv.historial) ? nv.historial : []),
        {
          fecha: ahora,
          usuario: info.usuario,
          accion: 'Comprobante generado desde nota de venta',
          detalle: `${info.tipoComprobante} ${info.numeroComprobante} — Total: ${info.total.toFixed(2)}`,
        },
      ],
    };

    localStorage.setItem(key, JSON.stringify(documentos));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(EVENTO_RECARGA));
    }
  } catch (err) {
    console.error('[postEmisionOrdenVenta] Error actualizando NV post emisión:', err);
  }
}

/**
 * Restaura el estado de la Nota de Venta cuando el comprobante generado desde ella es anulado.
 * Revierte el estado 'Convertida' a 'Generada' y registra en historial.
 */
export function restaurarNVPostAnulacionComprobante(
  nvId: string,
  info: { motivoAnulacionComprobante?: string; usuario?: string; numeroComprobante?: string },
): void {
  try {
    const key = tryLsKey(STORAGE_KEY_DOCUMENTOS) ?? STORAGE_KEY_DOCUMENTOS;
    const raw = localStorage.getItem(key);
    if (!raw) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const documentos: any[] = JSON.parse(raw);
    const idx = documentos.findIndex((d) => d.id === nvId);
    if (idx < 0) return;

    const nv = documentos[idx];
    if (nv.tipo !== 'nota_venta') return;
    if (nv.estado !== 'Convertida') return;

    const estadoRestaurado = 'Generada';
    const ahora = obtenerFechaHoraISO();

    documentos[idx] = {
      ...nv,
      estado: estadoRestaurado,
      fechaActualizacion: ahora,
      trazabilidad: {
        ...(nv.trazabilidad ?? {}),
        documentoDestinoId: undefined,
        documentoDestinoTipo: undefined,
        documentoDestinoNumero: undefined,
      },
      historial: [
        ...(Array.isArray(nv.historial) ? nv.historial : []),
        {
          fecha: ahora,
          usuario: info.usuario,
          accion: 'Estado restaurado por anulación de comprobante',
          detalle: [
            info.numeroComprobante ? `Comprobante ${info.numeroComprobante} anulado.` : 'Comprobante anulado.',
            info.motivoAnulacionComprobante ? `Motivo: ${info.motivoAnulacionComprobante}` : null,
            `Estado restaurado a: ${estadoRestaurado}.`,
          ].filter(Boolean).join(' '),
        },
      ],
    };

    localStorage.setItem(key, JSON.stringify(documentos));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(EVENTO_RECARGA));
    }
  } catch (err) {
    console.error('[postEmisionOrdenVenta] Error restaurando NV post anulación:', err);
  }
}

/**
 * Construye el array de reservas a restaurar cuando se anula una NS de OV.
 *
 * Arquitectura nueva (establecimientoId):
 *   Una NS puede tener varias líneas del mismo SKU (una por almacén físico via FIFO).
 *   Las líneas se consolidan en UNA sola entrada por SKU+establecimiento para evitar
 *   restaurar la reserva global más de una vez.
 *
 * Arquitectura legacy (almacenId):
 *   Se hace coincidir el almacenId físico de la línea NS con el almacenId de la reserva
 *   original, en lugar de distribuir greedily desde el inicio de la lista.
 *
 * lineasAnuladas debe incluir almacenId de la línea física de la NS (disponible en
 * LineaNotaSalida.almacenId) para que el matching legacy funcione correctamente.
 */
export function construirRestauracionReservaDesdeOV(
  reservasOriginalOV: Array<{ sku: string; cantidad: number; almacenId?: string; establecimientoId?: string; nombre?: string; almacenNombre?: string }>,
  lineasAnuladas: Array<{ sku: string; cantidad: number; almacenId?: string }>,
): Array<{ sku: string; cantidad: number; almacenId?: string; establecimientoId?: string; nombre?: string; almacenNombre?: string }> {
  const resultado: Array<{ sku: string; cantidad: number; almacenId?: string; establecimientoId?: string; nombre?: string; almacenNombre?: string }> = [];

  const skusUnicos = [...new Set(lineasAnuladas.map(l => l.sku))];

  for (const sku of skusUnicos) {
    const reservasDelSku = reservasOriginalOV.filter(r => r.sku === sku);
    if (reservasDelSku.length === 0) continue;

    const lineasDelSku = lineasAnuladas.filter(l => l.sku === sku);

    const reservaGlobal = reservasDelSku.find(r => esReservaGlobal(r));

    if (reservaGlobal && esReservaGlobal(reservaGlobal)) {
      // Nueva arquitectura: consolidar TODAS las líneas físicas en una sola entrada.
      // Las líneas de NS son fragmentos FIFO del mismo despacho global: sumarlas evita
      // restaurar stockReservadoOVPorEstablecimiento múltiples veces por el mismo SKU.
      const cantidadTotalAnulada = lineasDelSku.reduce((s, l) => s + l.cantidad, 0);
      const cantidadMaxReservada = reservasDelSku
        .filter(r => r.establecimientoId === reservaGlobal.establecimientoId)
        .reduce((s, r) => s + r.cantidad, 0);
      const cantidadARestaurar = Math.min(cantidadTotalAnulada, cantidadMaxReservada);
      if (cantidadARestaurar > 0) {
        resultado.push({ ...reservaGlobal, cantidad: cantidadARestaurar });
      }
    } else {
      // Arquitectura legacy: matching por sku+almacenId para no desplazar cantidades
      // entre almacenes distintos.
      const cantidadPorAlmacen = new Map<string, number>();
      for (const linea of lineasDelSku) {
        const almId = linea.almacenId ?? '';
        if (almId) {
          cantidadPorAlmacen.set(almId, (cantidadPorAlmacen.get(almId) ?? 0) + linea.cantidad);
        }
      }
      for (const [almacenId, cantidadAnulada] of cantidadPorAlmacen) {
        const reservaAlmacen = reservasDelSku.find(r => r.almacenId === almacenId);
        if (!reservaAlmacen) continue;
        const cantidadARestaurar = Math.min(cantidadAnulada, reservaAlmacen.cantidad);
        if (cantidadARestaurar > 0) {
          resultado.push({ ...reservaAlmacen, cantidad: cantidadARestaurar });
        }
      }
    }
  }

  return resultado;
}

/**
 * Restaura el estado de la Orden de Venta cuando el comprobante generado desde ella es anulado.
 *
 * Flujos manejados:
 * - modoDescuentoStock === 'automatico': el stock real ya fue repuesto por el módulo de
 *   comprobantes (NO volver a reponer). Sí restaurar la reserva global OV.
 *   OV vuelve a 'Reservada'.
 * - modoDescuentoStock === 'nota_salida': NO reponer stock real (nunca salió).
 *   NO duplicar reserva (sigue vigente). OV vuelve a 'Reservada'.
 *   Limpiar trazabilidad al comprobante.
 * - Acepta OV en estado 'Atendida' o 'Pendiente de salida'.
 */
export function restaurarOVPostAnulacionComprobante(
  ovId: string,
  info: {
    modoDescuentoStock?: 'automatico' | 'nota_salida' | 'sin_control';
    usuario?: string;
    numeroComprobante?: string;
  },
): void {
  const key = tryLsKey(STORAGE_KEY_DOCUMENTOS) ?? STORAGE_KEY_DOCUMENTOS;
  const raw = localStorage.getItem(key);
  if (!raw) throw new Error(`Almacenamiento de documentos no disponible al restaurar OV "${ovId}".`);

  const documentos = JSON.parse(raw) as Array<Record<string, unknown>>;
  const idx = documentos.findIndex((d) => d['id'] === ovId);
  if (idx < 0) throw new Error(`Orden de Venta "${ovId}" no encontrada en el almacenamiento.`);

  const ov = documentos[idx];
  if (ov['tipo'] !== 'orden_venta') throw new Error(`El documento "${ovId}" no es una Orden de Venta.`);
  if (ov['estado'] !== 'Atendida' && ov['estado'] !== 'Pendiente de salida') {
    throw new Error(`La OV "${ovId}" no está en estado válido para restaurar (estado: "${String(ov['estado'])}").`);
  }

  const ahora = obtenerFechaHoraISO();
  const reservasRaw = ov['reservasStock'];
  const reservasStock: ReservaStockItem[] = Array.isArray(reservasRaw) ? (reservasRaw as ReservaStockItem[]) : [];

  // Construir documento actualizado (sin mutaciones Zustand todavía)
  documentos[idx] = {
    ...ov,
    estado: 'Reservada',
    fechaActualizacion: ahora,
    trazabilidad: {
      ...((ov['trazabilidad'] as Record<string, unknown> | undefined) ?? {}),
      documentoDestinoId: undefined,
      documentoDestinoTipo: undefined,
      documentoDestinoNumero: undefined,
    },
    historial: [
      ...(Array.isArray(ov['historial']) ? (ov['historial'] as unknown[]) : []),
      {
        fecha: ahora,
        usuario: info.usuario,
        accion: 'Orden de Venta restaurada por anulación de Comprobante',
        detalle: [
          info.numeroComprobante ? `Comprobante ${info.numeroComprobante} anulado.` : 'Comprobante anulado.',
          info.modoDescuentoStock === 'automatico'
            ? 'Reserva global restaurada. Stock real repuesto por módulo de comprobantes.'
            : 'Reserva pendiente de Nota de Salida sigue vigente.',
          'Estado restaurado a: Reservada.',
        ].join(' '),
      },
    ],
  };

  // localStorage write BEFORE Zustand mutation: si la escritura falla, la reserva no se restaura.
  try {
    localStorage.setItem(key, JSON.stringify(documentos));
  } catch (causa) {
    if (causa instanceof DOMException && causa.name === 'QuotaExceededError') {
      throw new Error(`Sin espacio en almacenamiento para restaurar OV "${ovId}".`);
    }
    throw new Error(`Error al guardar OV "${ovId}" en el almacenamiento.`);
  }

  // Restaurar reserva Zustand solo después del éxito del guardado en localStorage.
  // En modo nota_salida la reserva sigue vigente (nunca se liberó al emitir el comprobante).
  if (info.modoDescuentoStock === 'automatico' && reservasStock.length > 0) {
    restaurarReservasDeOV(reservasStock);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(EVENTO_RECARGA));
  }
}
