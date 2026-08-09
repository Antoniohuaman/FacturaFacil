import type { CodigoMotivoTraslado, CodigoModalidadTransporte } from '../../configuracion-sistema/datos/catalogosGRE';
import type { DatosLineaOperacionCuantitativa } from '../../gestion-inventario/models/operacionEntradaInventario.types';
export type { CodigoMotivoTraslado, CodigoModalidadTransporte };

export type TipoGRE = 'remitente' | 'transportista';

export type EstadoGRE =
  | 'Borrador'
  | 'Pendiente'
  | 'Emitida'
  | 'Aceptada'
  | 'Observada'
  | 'Rechazada'
  | 'Anulada';

export type UnidadPeso = 'KGM' | 'TNE';

export interface BienGRE {
  id: string;
  productoId?: string | number;
  descripcion: string;
  unidad: string;
  cantidad: number;
  normalizado: boolean;
  codigoBien?: string;
  codigoProductoSunat?: string;
  codigoSubpartidaNacional?: string;
  codigoGTIN?: string;
  /** Peso total de la línea en kg (cantidad × peso unitario del catálogo). Editable en la GRE; no modifica el producto maestro. */
  pesoLineaKg?: number;
}

export interface DocumentoRelacionadoGRE {
  id: string;
  origen: 'INTERNO' | 'EXTERNO';
  documentoInternoId?: string;
  tipoDocumentoCodigo: string;
  serieDocumento?: string;
  numeroCorrelativo?: string;
  numeroDocumento: string;
  rucEmisorExterno?: string;
  fechaEmision?: string;
}

export interface PuntoTraslado {
  ubigeo?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  direccion: string;
}

export interface TransportePrivado {
  fechaInicioTraslado: string;
  vehiculosIds: string[];
  conductoresIds: string[];
  transbordo?: boolean;
  retornoVehiculoVacio?: boolean;
  retornoEnvases?: boolean;
  esM1oL?: boolean;
  placaVehiculoM1L?: string;
}

export interface TransportePublico {
  transportistaClienteId?: string | number;
  transportistaNombre: string;
  transportistaNumeroDocumento: string;
  transportistaTipoDocumento: string;
  registroMTC?: string;
  vehiculosIds: string[];
  conductoresIds: string[];
  fechaEntregaBienes?: string;
  transbordo?: boolean;
  retornoEnvases?: boolean;
  registrarVehiculosConductores?: boolean;
  esM1oL?: boolean;
  placaVehiculoM1L?: string;
}

export interface EventoGRE {
  id: string;
  tipo: 'creacion' | 'edicion' | 'emision' | 'anulacion' | 'impresion' | 'eliminacion_borrador';
  descripcion: string;
  fecha: string; // ISO string — serializa limpio a JSON
}

/**
 * Snapshot INMUTABLE de la preparación de inventario de una GRE — mismo patrón que
 * `PreparacionInventarioNS` (`gestion-inventario/models/notaSalida.types.ts`), persistido junto
 * con la guía ANTES de invocar a `ServicioKardexValorizado`. Un reintento (p. ej. tras un fallo
 * entre confirmar el movimiento y persistir la GRE como emitida) reutiliza este snapshot
 * EXACTAMENTE tal cual — nunca vuelve a ejecutar la asignación FIFO contra el stock actual (que ya
 * refleja el movimiento del intento anterior), garantizando que la operación reintentada resuelva
 * siempre la misma clave/hash de idempotencia en `ServicioKardexValorizado`.
 */
export interface PreparacionInventarioGRE {
  lineas: DatosLineaOperacionCuantitativa[];
  /** `true` cuando la primera preparación legítima determinó que esta GRE no genera ningún movimiento (sin bienes inventariables) — persistido explícitamente para que un reintento no tenga que inferirlo de nuevo. */
  sinMovimientoInventario: boolean;
}

export interface GuiaRemision {
  id: string;
  tipo: TipoGRE;
  estado: EstadoGRE;
  esBorrador: boolean;

  serie: string;
  correlativo?: string;
  fechaEmision: string;

  motivoTraslado: CodigoMotivoTraslado;
  modalidadTransporte: CodigoModalidadTransporte;

  destinatarioClienteId?: string | number;
  destinatarioNombre: string;
  destinatarioTipoDocumento: string;
  destinatarioNumeroDocumento: string;
  destinatarioDireccion?: string;
  destinatarioDepartamento?: string;
  destinatarioProvincia?: string;
  destinatarioDistrito?: string;
  destinatarioUbigeo?: string;

  pesoTotal?: number;
  unidadPeso: UnidadPeso;

  bienes: BienGRE[];
  documentosRelacionados: DocumentoRelacionadoGRE[];

  puntoPartida: PuntoTraslado;
  puntoLlegada: PuntoTraslado;

  transportePrivado?: TransportePrivado;
  transportePublico?: TransportePublico;

  // Actor secundario: comprador (motivo '03' — Venta con entrega a terceros)
  compradorNombre?: string;
  compradorNumeroDocumento?: string;
  compradorTipoDocumento?: string;

  // Campo libre para motivo '13' — Otros
  especificacionMotivo?: string;

  observaciones?: string;
  historial?: EventoGRE[];

  /** Ausente en un borrador que nunca intentó emitirse con descuento automático. Ver `PreparacionInventarioGRE`. */
  preparacionInventario?: PreparacionInventarioGRE;

  creadoEl: Date;
  actualizadoEl: Date;
}

export const ESTADOS_GRE: EstadoGRE[] = [
  'Borrador',
  'Pendiente',
  'Emitida',
  'Aceptada',
  'Observada',
  'Rechazada',
  'Anulada',
];

export const TIPO_GRE_LABELS: Record<TipoGRE, string> = {
  remitente: 'GRE Remitente',
  transportista: 'GRE Transportista',
};

export const TIPO_GRE_CODIGO_DOCUMENTO: Record<TipoGRE, string> = {
  remitente: '09',
  transportista: '31',
};

export const STORAGE_KEY_GRE = 'facturafacil_guias_remision_v1';

export const BIEN_GRE_VACIO = (): BienGRE => ({
  id: crypto.randomUUID(),
  descripcion: '',
  unidad: 'NIU',
  cantidad: 1,
  normalizado: false,
});

export const DOCUMENTO_RELACIONADO_VACIO = (): DocumentoRelacionadoGRE => ({
  id: crypto.randomUUID(),
  origen: 'EXTERNO',
  tipoDocumentoCodigo: '01',
  numeroDocumento: '',
});

export const PUNTO_TRASLADO_VACIO: PuntoTraslado = {
  direccion: '',
};

export const GUIA_REMISION_BORRADOR = (tipo: TipoGRE): GuiaRemision => ({
  id: crypto.randomUUID(),
  tipo,
  estado: 'Borrador',
  esBorrador: true,
  serie: '',
  fechaEmision: new Date().toISOString().split('T')[0],
  motivoTraslado: '01',
  modalidadTransporte: '02',
  destinatarioNombre: '',
  destinatarioTipoDocumento: 'RUC',
  destinatarioNumeroDocumento: '',
  unidadPeso: 'KGM',
  bienes: [],
  documentosRelacionados: [],
  puntoPartida: { direccion: '' },
  puntoLlegada: { direccion: '' },
  creadoEl: new Date(),
  actualizadoEl: new Date(),
});
