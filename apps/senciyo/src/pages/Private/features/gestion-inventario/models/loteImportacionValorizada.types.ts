// gestion-inventario/models/loteImportacionValorizada.types.ts
//
// Modelo del lote de importación de stock con costo (Etapa 2, §9.7/§13 del encargo). Documento
// completo — nunca se persiste fila por fila. Ancla de idempotencia de una importación
// (`IMPORT-${loteId}`) y `documentoOrigenId`/`tipoDocumentoOrigen:'importacion'` de las
// `CapaCostoInventario` que sus filas generarían en modo valorizado (futuro, cuando
// `estadoValorizacion==='activa'` — inalcanzable en esta etapa).

export type EstadoLoteImportacionValorizada = 'previsualizado' | 'confirmado' | 'cancelado';

/** `'sumatoria'` = toda cantidad del archivo es una entrada adicional; `'reemplazo'` = la cantidad del archivo reemplaza el stock actual (entrada o salida por la diferencia). */
export type ModoLoteImportacionValorizada = 'sumatoria' | 'reemplazo';

export type EstadoCostoFilaImportacion = 'con_costo' | 'requiere_costo' | 'sin_cambio' | 'no_aplica';

export interface FilaLoteImportacionValorizada {
  numeroFila: number;
  productoId: string;
  almacenId: string;
  /** Cantidad declarada en el archivo para esta fila — semántica depende de `modo` del lote. */
  cantidadArchivo: number;
  /** Costo por unidad mínima, en moneda base — ausente si el archivo no trae columna de costo o la celda está vacía. */
  costoUnitario?: number;
  estadoCosto: EstadoCostoFilaImportacion;
}

export interface LoteImportacionValorizada {
  id: string;
  empresaId: string;
  establecimientoId: string;
  modo: ModoLoteImportacionValorizada;
  fecha: string;
  usuario: string;
  moneda: string;
  estado: EstadoLoteImportacionValorizada;
  nombreArchivo: string;
  totalFilas: number;
  filasConCostoPendiente: number;
  filas: FilaLoteImportacionValorizada[];
  /** Huella estable de idempotencia (`IMPORT-${id}`) — nunca `Math.random()`/timestamp como identidad. */
  huella: string;
}

export function construirClaveIdempotenciaImportacion(loteId: string): string {
  return `IMPORT-${loteId}`;
}

export function construirDocumentoOrigenFilaImportacion(loteId: string, numeroFila: number): string {
  return `IMPORT-${loteId}-${numeroFila}`;
}
