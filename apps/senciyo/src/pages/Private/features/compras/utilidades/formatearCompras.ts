import { formatearFecha } from '@/shared/formatters/fechas';
import { siguienteCorrelativoInterno } from '@/shared/numbering/correlativoInterno';

/** Sin correlativo (borrador aún no registrado): serie + "sin correlativo", sin corchetes ni número simulado. */
export function formatearNumeroCompra(serie: string, correlativo: string | number | undefined): string {
  if (!correlativo) return `${serie} sin correlativo`;
  const corr =
    typeof correlativo === 'number'
      ? String(correlativo).padStart(8, '0')
      : correlativo;
  return `${serie}-${corr}`;
}

/** Identidad visible del documento del proveedor: "serie-número" cuando ambos existen; si falta (borrador aún sin el documento del proveedor cargado), usa el tipo de comprobante (o "Comprobante") + "sin número". */
export function formatearNumeroComprobanteCompra(cc: {
  tipoComprobanteProveedor?: string;
  serieProveedor?: string;
  numeroProveedor?: string;
}): string {
  if (cc.serieProveedor && cc.numeroProveedor) {
    return `${cc.serieProveedor}-${cc.numeroProveedor}`;
  }
  return `${cc.tipoComprobanteProveedor ?? 'Comprobante'} sin número`;
}

/** Reexporta el formateador transversal (`shared/formatters/fechas.ts`) por compatibilidad con el código existente de Compras — nunca una segunda implementación. */
export const formatearFechaCompra = formatearFecha;

/** Calcula el siguiente número correlativo de pago para una serie — delega en la utilidad genérica compartida (`shared/numbering/correlativoInterno.ts`), la MISMA que usa `siguienteReferenciaInternaGasto` con su propio prefijo independiente. */
export function siguienteNumeroPago(pagos: Array<{ numeroPago: string }>, serie: string): string {
  return siguienteCorrelativoInterno({ registros: pagos, obtenerNumero: (p) => p.numeroPago, prefijo: serie });
}
