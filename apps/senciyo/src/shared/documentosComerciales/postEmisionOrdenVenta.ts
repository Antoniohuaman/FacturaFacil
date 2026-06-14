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

const toNum = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const obtenerFechaHoraISO = (): string => new Date().toISOString();

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
 * Lee las reservas de stock de una OV desde localStorage.
 * Al emitir un comprobante desde OV, se usan estas reservas para descontar
 * exactamente los almacenes comprometidos (no recalcular FIFO desde cero).
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
    return Array.isArray(ov.reservasStock) ? ov.reservasStock : [];
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
 * Marca la Orden de Venta como 'Atendida' cuando se generó una Nota de Salida
 * DIRECTAMENTE desde ella (sin pasar por un comprobante).
 *
 * Solo actúa si la OV está en estado 'Reservada'.
 * Diferente de atenderOrdenVentaPostNS que actúa sobre estado 'Pendiente de salida'.
 */
export function atenderOrdenVentaPostNSDirecta(
  ovId: string,
  info: { numeroNS: string; usuario?: string },
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
    documentos[idx] = {
      ...ov,
      estado: 'Atendida',
      fechaActualizacion: ahora,
      historial: [
        ...(Array.isArray(ov.historial) ? ov.historial : []),
        {
          fecha: ahora,
          usuario: info.usuario,
          accion: 'Nota de Salida directa generada — Orden atendida',
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
 * Restaura la Orden de Venta a estado 'Reservada' después de que su Nota de Salida
 * directa fue anulada. Restaura también el stockReservadoPorAlmacen.
 *
 * Solo actúa si la OV está en estado 'Atendida' (estado que adquirió al generar la NS directa).
 */
export function restaurarOVPostAnulacionNSDirecta(
  ovId: string,
  info: { numeroNS: string; usuario?: string },
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
    if (ov.tipo !== 'orden_venta' || ov.estado !== 'Atendida') return;
    const ahora = obtenerFechaHoraISO();
    // Restaurar stockReservadoPorAlmacen antes de guardar en localStorage
    if (Array.isArray(ov.reservasStock) && ov.reservasStock.length > 0) {
      restaurarReservasDeOV(ov.reservasStock);
    }
    documentos[idx] = {
      ...ov,
      estado: 'Reservada',
      notaSalidaId: undefined,
      notaSalidaGenerada: false,
      notaSalidaFechaGeneracion: undefined,
      fechaActualizacion: ahora,
      historial: [
        ...(Array.isArray(ov.historial) ? ov.historial : []),
        {
          fecha: ahora,
          usuario: info.usuario,
          accion: 'Reserva restaurada por anulación de Nota de Salida directa',
          detalle: `Nota de Salida ${info.numeroNS} anulada. Stock repuesto. Reserva de stock restaurada.`,
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
 * Marca la Orden de Venta como 'Atendida' en localStorage después de que se generó
 * la Nota de Salida desde el comprobante asociado.
 *
 * Solo actúa si la OV está en estado 'Pendiente de salida'; cualquier otro estado
 * se ignora silenciosamente (protección contra dobles llamadas).
 */
export function atenderOrdenVentaPostNS(
  ovId: string,
  info: { numeroNS: string; usuario?: string },
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
    if (ov.tipo !== 'orden_venta' || ov.estado !== 'Pendiente de salida') return;

    const ahora = obtenerFechaHoraISO();

    documentos[idx] = {
      ...ov,
      estado: 'Atendida',
      fechaActualizacion: ahora,
      historial: [
        ...(Array.isArray(ov.historial) ? ov.historial : []),
        {
          fecha: ahora,
          usuario: info.usuario,
          accion: 'Nota de Salida generada — Orden atendida',
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
