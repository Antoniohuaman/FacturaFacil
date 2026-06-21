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
const EVENTO_RECARGA = 'documentos_comerciales_changed';

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

type DespachoBasico = { sku: string; cantidad: number; almacenId: string };

function sumarDespachos(anterior: DespachoBasico[], nuevo: DespachoBasico[]): DespachoBasico[] {
  const map = new Map<string, DespachoBasico>();
  for (const item of [...anterior, ...nuevo]) {
    const k = `${item.sku}__${item.almacenId}`;
    const ex = map.get(k);
    map.set(k, ex ? { ...ex, cantidad: ex.cantidad + item.cantidad } : { ...item });
  }
  return Array.from(map.values());
}

function restarDespachos(anterior: DespachoBasico[], aRestar: DespachoBasico[]): DespachoBasico[] {
  const map = new Map<string, number>();
  for (const item of anterior) {
    const k = `${item.sku}__${item.almacenId}`;
    map.set(k, (map.get(k) ?? 0) + item.cantidad);
  }
  for (const item of aRestar) {
    const k = `${item.sku}__${item.almacenId}`;
    map.set(k, Math.max(0, (map.get(k) ?? 0) - item.cantidad));
  }
  const seen = new Set<string>();
  return anterior.reduce<DespachoBasico[]>((acc, item) => {
    const k = `${item.sku}__${item.almacenId}`;
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
    const k = `${d.sku}__${d.almacenId}`;
    map.set(k, (map.get(k) ?? 0) + d.cantidad);
  }
  return original
    .map(r => ({ ...r, cantidad: Math.max(0, r.cantidad - (map.get(`${r.sku}__${r.almacenId}`) ?? 0)) }))
    .filter(r => r.cantidad > 0);
}

/**
 * Libera el stock reservado por la OV directamente en el store de productos (Zustand).
 */
export function liberarReservasDeOV(reservasStock: Array<{ sku: string; cantidad: number; almacenId: string }>): void {
  // getState() se llama en cada iteración para obtener el producto actualizado:
  // liberarReservasDeOV itera un almacén por vez y Zustand actualiza el store
  // síncronamente, pero un snapshot capturado antes del bucle no refleja esas
  // actualizaciones. Sin esto, la segunda iteración sobreescribiría la primera.
  for (const reserva of reservasStock) {
    const producto = useProductStore.getState().allProducts.find((p) => p.codigo === reserva.sku);
    if (!producto) continue;
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

/**
 * Lee las reservas PENDIENTES de despacho de una OV desde localStorage.
 * Descuenta las cantidades ya despachadas (campo `despachado`) de las reservas originales,
 * de modo que el resultado siempre refleja lo que queda por salir.
 */
export function obtenerReservasDeOV(
  ovId: string
): Array<{ sku: string; cantidad: number; almacenId: string; almacenNombre?: string }> {
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
 * Incrementa stockReservadoPorAlmacen usando las reservas que quedaron guardadas en la OV.
 */
export function restaurarReservasDeOV(
  reservasStock: Array<{ sku: string; cantidad: number; almacenId: string }>,
): void {
  for (const reserva of reservasStock) {
    const producto = useProductStore.getState().allProducts.find((p) => p.codigo === reserva.sku);
    if (!producto) continue;
    const reservadoActual = toNum((producto.stockReservadoPorAlmacen ?? {})[reserva.almacenId]);
    useProductStore.getState().updateProduct(producto.id, {
      stockReservadoPorAlmacen: {
        ...(producto.stockReservadoPorAlmacen ?? {}),
        [reserva.almacenId]: reservadoActual + reserva.cantidad,
      },
    });
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
  try {
    const key = tryLsKey(STORAGE_KEY_DOCUMENTOS) ?? STORAGE_KEY_DOCUMENTOS;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const documentos: any[] = JSON.parse(raw);
    const idx = documentos.findIndex((d) => d.id === docId);
    if (idx < 0) return;
    documentos[idx] = {
      ...documentos[idx],
      notaSalidaId,
      notaSalidaGenerada: true,
      notaSalidaFechaGeneracion: fechaNS,
      fechaActualizacion: obtenerFechaHoraISO(),
    };
    localStorage.setItem(key, JSON.stringify(documentos));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(EVENTO_RECARGA));
    }
  } catch (err) {
    console.error('[postEmisionOrdenVenta] Error vinculando NS a documento comercial:', err);
  }
}

/**
 * Elimina la referencia a la Nota de Salida de un documento comercial (NV u OV).
 * Se llama cuando la NS asociada es anulada.
 */
export function desvincularDocumentoComercialNS(docId: string): void {
  try {
    const key = tryLsKey(STORAGE_KEY_DOCUMENTOS) ?? STORAGE_KEY_DOCUMENTOS;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const documentos: any[] = JSON.parse(raw);
    const idx = documentos.findIndex((d) => d.id === docId);
    if (idx < 0) return;
    documentos[idx] = {
      ...documentos[idx],
      notaSalidaId: undefined,
      notaSalidaGenerada: false,
      notaSalidaFechaGeneracion: undefined,
      fechaActualizacion: obtenerFechaHoraISO(),
    };
    localStorage.setItem(key, JSON.stringify(documentos));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(EVENTO_RECARGA));
    }
  } catch (err) {
    console.error('[postEmisionOrdenVenta] Error desvinculando NS de documento comercial:', err);
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
  try {
    const key = tryLsKey(STORAGE_KEY_DOCUMENTOS) ?? STORAGE_KEY_DOCUMENTOS;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const documentos: any[] = JSON.parse(raw);
    const idx = documentos.findIndex((d) => d.id === ovId);
    if (idx < 0) return;
    const ov = documentos[idx];
    if (ov.tipo !== 'orden_venta') return;
    if (ov.estado !== 'Reservada' && ov.estado !== 'Atendida parcialmente') return;
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
  } catch (err) {
    console.error('[postEmisionOrdenVenta] Error actualizando OV post NS directa:', err);
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
  try {
    const key = tryLsKey(STORAGE_KEY_DOCUMENTOS) ?? STORAGE_KEY_DOCUMENTOS;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const documentos: any[] = JSON.parse(raw);
    const idx = documentos.findIndex((d) => d.id === ovId);
    if (idx < 0) return;
    const ov = documentos[idx];
    if (ov.tipo !== 'orden_venta') return;
    if (ov.estado !== 'Atendida' && ov.estado !== 'Atendida parcialmente') return;
    // Restaurar únicamente lo que esta NS descontó, no la reserva original completa
    if (info.aRestaurar.length > 0) {
      restaurarReservasDeOV(info.aRestaurar);
    }
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
    localStorage.setItem(key, JSON.stringify(documentos));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(EVENTO_RECARGA));
    }
  } catch (err) {
    console.error('[postEmisionOrdenVenta] Error restaurando OV post anulación NS directa:', err);
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
  try {
    const key = tryLsKey(STORAGE_KEY_DOCUMENTOS) ?? STORAGE_KEY_DOCUMENTOS;
    const raw = localStorage.getItem(key);
    if (!raw) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const documentos: any[] = JSON.parse(raw);
    const idx = documentos.findIndex((d) => d.id === ovId);
    if (idx < 0) return;

    const ov = documentos[idx];
    if (ov.tipo !== 'orden_venta' || ov.estado !== 'Reservada') return;

    const ahora = obtenerFechaHoraISO();

    const productosReservados = Array.isArray(ov.reservasStock)
      ? ov.reservasStock.map((r: { nombre: string; cantidad: number }) => `${r.nombre} (${r.cantidad})`).join(', ')
      : '';

    // En modo nota_salida, la reserva se mantiene hasta que se genere la Nota de Salida.
    // Solo liberamos la reserva en modo automático o sin_control.
    if (
      info.modoDescuentoStock !== 'nota_salida' &&
      Array.isArray(ov.reservasStock) &&
      ov.reservasStock.length > 0
    ) {
      liberarReservasDeOV(ov.reservasStock);
    }

    // Construir eventos de historial
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

    // Actualizar la OV.
    // Modo nota_salida con bienes reservados: la mercadería aún no salió físicamente;
    // la OV queda 'Pendiente de salida' hasta que se genere la Nota de Salida.
    const nuevoEstado =
      info.modoDescuentoStock === 'nota_salida' &&
      Array.isArray(ov.reservasStock) &&
      ov.reservasStock.length > 0
        ? 'Pendiente de salida'
        : 'Atendida';

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

    // Notificar al contexto de DocumentosComerciales para que recargue
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(EVENTO_RECARGA));
    }
  } catch (err) {
    console.error('[postEmisionOrdenVenta] Error actualizando OV:', err);
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
  try {
    const key = tryLsKey(STORAGE_KEY_DOCUMENTOS) ?? STORAGE_KEY_DOCUMENTOS;
    const raw = localStorage.getItem(key);
    if (!raw) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const documentos: any[] = JSON.parse(raw);
    const idx = documentos.findIndex((d) => d.id === ovId);
    if (idx < 0) return;

    const ov = documentos[idx];
    if (ov.tipo !== 'orden_venta') return;
    if (ov.estado !== 'Pendiente de salida' && ov.estado !== 'Atendida parcialmente') return;

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
  } catch (err) {
    console.error('[postEmisionOrdenVenta] Error actualizando OV post Nota de Salida:', err);
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
