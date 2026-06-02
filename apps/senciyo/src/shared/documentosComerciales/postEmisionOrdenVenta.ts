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
}

const toNum = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const obtenerFechaHoraISO = (): string => new Date().toISOString();

/**
 * Libera el stock reservado por la OV directamente en el store de productos (Zustand).
 */
function liberarReservasDeOV(reservasStock: Array<{ sku: string; cantidad: number; almacenId: string }>): void {
  const store = useProductStore.getState();
  for (const reserva of reservasStock) {
    const producto = store.allProducts.find((p) => p.codigo === reserva.sku);
    if (!producto) continue;
    const reservadoActual = toNum((producto.stockReservadoPorAlmacen ?? {})[reserva.almacenId]);
    const nuevoReservado = Math.max(0, reservadoActual - reserva.cantidad);
    store.updateProduct(producto.id, {
      stockReservadoPorAlmacen: {
        ...(producto.stockReservadoPorAlmacen ?? {}),
        [reserva.almacenId]: nuevoReservado,
      },
    });
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

    // Liberar reserva de stock
    if (Array.isArray(ov.reservasStock) && ov.reservasStock.length > 0) {
      liberarReservasDeOV(ov.reservasStock);
    }

    // Construir eventos de historial
    const eventoComprobante = {
      fecha: ahora,
      usuario: info.usuario,
      accion: 'Comprobante generado desde orden de venta',
      detalle: `${info.tipoComprobante} ${info.numeroComprobante} — Total: ${info.total.toFixed(2)}`,
    };

    const productosReservados = Array.isArray(ov.reservasStock)
      ? ov.reservasStock.map((r: { nombre: string; cantidad: number }) => `${r.nombre} (${r.cantidad})`).join(', ')
      : '';

    const eventoReserva = {
      fecha: ahora,
      usuario: info.usuario,
      accion: 'Reserva consumida por emisión de comprobante',
      detalle: productosReservados ? `Productos: ${productosReservados}` : undefined,
    };

    // Actualizar la OV
    documentos[idx] = {
      ...ov,
      estado: 'Atendida',
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
