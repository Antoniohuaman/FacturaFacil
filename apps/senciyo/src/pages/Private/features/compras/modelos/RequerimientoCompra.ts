import type { LineaCompra } from './LineaCompra';
import type { TotalesCompra, MonedaCompra } from './tiposBaseCompras';
import type { AdjuntoCompra } from './AdjuntoCompra';
import type { EventoHistorialCompras } from './EventoHistorialCompras';

export type EstadoDocumentoRC = 'borrador' | 'registrado' | 'anulado';

export const ESTADO_DOCUMENTO_RC_LABELS: Record<EstadoDocumentoRC, string> = {
  borrador: 'Borrador',
  registrado: 'Registrado',
  anulado: 'Anulado',
};

/**
 * Estado principal único del Requerimiento, derivado (no persistido) de
 * estadoDocumento + sus Órdenes de Compra / Comprobantes de Compra generados
 * directamente desde él — ver calcularEstadoPrincipalRC en logica/reglasCompras.ts.
 */
export type EstadoPrincipalRC = 'Borrador' | 'Pendiente' | 'Atendido' | 'Anulado';

export interface RequerimientoCompra {
  // Identidad
  id: string;
  tipoDocumento: 'requerimiento_compra';
  serie: string;
  correlativo: string;
  numero: string;

  // Fechas
  fechaSolicitud: string;
  fechaRequerida?: string;

  // Solicitante (usuario que registra — mismo patrón que compradorId/compradorNombre de OC)
  solicitanteId?: string;
  solicitanteNombre?: string;

  // Proveedor: a diferencia de la Orden de Compra, nunca obligatorio
  proveedorId?: string;
  proveedorTipoDocumento?: string;
  proveedorNumeroDocumento?: string;
  proveedorNombre?: string;

  // Financiero — solo referencial: sin forma de pago ni tipo de cambio
  moneda: MonedaCompra;

  // Contenido
  lineas: LineaCompra[];
  totales: TotalesCompra;

  observaciones?: string;
  adjuntos?: AdjuntoCompra[];

  // Auditoría
  historial: EventoHistorialCompras[];
  creadoPor?: string;
  fechaCreacion: string;
  fechaActualizacion: string;

  estadoDocumento: EstadoDocumentoRC;

  // Anulación
  motivoAnulacion?: string;
  fechaAnulacion?: string;
  anuladoPor?: string;
}
