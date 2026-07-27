// gestion-inventario/models/valorizacionInicialInventario.types.ts
//
// Modelo del proceso de preparación de la valorización inicial del inventario existente (Etapa 2,
// §9.4/§24 del diseño técnico aprobado). Representa el lote de migración — detección de stock
// positivo por producto+almacén, propuesta y confirmación de costo — hasta el estado 'validada'.
// Esta etapa NO crea `CapaCostoInventario` desde este lote: `capaGeneradaId` solo se puebla tras
// ejecutar la transición `activando → activa` (Etapa 4), inalcanzable aquí.

export type OrigenPropuestaCosto = 'precioCompra' | 'ultimoCostoDocumental' | 'manual' | 'sin_propuesta';

/**
 * Estado del LOTE de migración — distinto de `EstadoActivacionValorizacion` (estado de la EMPRESA).
 * Un lote 'validada' es un snapshot aprobado e inmutable; 'cancelada' preserva el lote para
 * auditoría (nunca se elimina) y deja de ser el lote activo de la empresa.
 */
export type EstadoLoteValorizacionInicial = 'en_preparacion' | 'pendiente_costos' | 'validada' | 'cancelada';

export interface DetalleValorizacionInicial {
  productoId: string;
  almacenId: string;
  /** Snapshot de la cantidad real al iniciar o recalcular — nunca reconstruida desde movimientos históricos. */
  cantidadDetectada: number;
  costoPropuesto: number;
  origenPropuesta: OrigenPropuestaCosto;
  costoConfirmado?: number;
  confirmado: boolean;
  /**
   * Poblado ÚNICAMENTE tras ejecutar `activando → activa` (Etapa 4) — nunca antes. El gate previo
   * a la activación no exige este campo, solo que el detalle sea valorizable.
   */
  capaGeneradaId?: string;
  /**
   * `true` si, mientras el lote estaba en `en_preparacion`/`pendiente_costos`, ocurrió una mutación
   * cuantitativa confirmada sobre este producto+almacén — invalida la confirmación previa y
   * bloquea `pendiente_costos → validada` hasta revisión (`invalidarDetalleSiAfectado`).
   */
  requiereRecalculo: boolean;
  fechaUltimaRevision?: string;
}

export interface ValorizacionInicialInventario {
  id: string;
  /** Toda la operación de migración es por empresa — nunca mezcla detalles de dos empresas en el mismo lote. */
  empresaId: string;
  establecimientoId?: string;
  usuario: string;
  fechaCreacion: string;
  estado: EstadoLoteValorizacionInicial;
  detalles: DetalleValorizacionInicial[];
}

/** Clave única de un detalle dentro de un lote — nunca dos detalles con la misma combinación producto+almacén. */
export function claveDetalleValorizacion(productoId: string, almacenId: string): string {
  return `${productoId}:${almacenId}`;
}
