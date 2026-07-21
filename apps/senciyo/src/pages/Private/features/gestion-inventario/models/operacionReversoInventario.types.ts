// gestion-inventario/models/operacionReversoInventario.types.ts
//
// Contratos del motor de REVERSOS (Etapa 1E, §5-§9 del encargo). Dos formas, ambas construidas
// sobre el mismo principio: el movimiento ORIGINAL confirmado es la única fuente de verdad —
// nunca se recalcula con catálogo/stock/costo actual, nunca se edita ni elimina el original.
//
// `DatosReversoInventario` revierte UN movimiento (entrada, salida, o uno de los dos legs de una
// transferencia — el motor detecta el caso automáticamente a partir de los campos ya persistidos
// en el propio `MovimientoStock`, nunca a partir de lo que el llamador declare).
//
// `DatosAnulacionDocumentoInventario` revierte VARIOS movimientos del MISMO documento comercial
// en un solo plan atómico (NI, NS, comprobante/venta, Nota de Venta) — nunca uno por uno con
// persistencia por línea.

import type { TipoDocumentoOrigenMovimiento } from './inventory.types';
import type { ReferenciaDocumentoTipoOperacionIdempotente } from './operacionIdempotenteInventario.types';

export interface DatosReversoInventario {
  empresaId: string;
  /** Id del movimiento ORIGINAL a revertir — si pertenece a una transferencia (esTransferencia=true), el motor localiza y revierte también su pareja en el MISMO plan. */
  movimientoId: string;
  /** Siempre `REVERSO-${movimientoId}` — nunca fabricada de otra forma por el consumidor. Un movimiento solo puede tener un reverso confirmado: un segundo intento con la misma clave es 'repetida' (mismo contenido) o rechazado (conflicto). */
  claveIdempotencia: string;
  tipoOperacion: 'reverso';
  /** Tipo de referencia para la reserva idempotente — el mismo que tenía la operación original (ej. 'nota_salida', 'venta', 'ajuste', 'nota_ingreso'), aportado por el llamador (que ya sabe qué está revirtiendo). */
  tipoDocumento: ReferenciaDocumentoTipoOperacionIdempotente;
  usuario: string;
  /** ISO 8601 — inyectada por el llamador. */
  fecha: string;
  /** Explicación ADICIONAL del reverso aportada por el usuario — nunca sustituye el `motivo` histórico del movimiento original, que se conserva tal cual. */
  motivoUsuario?: string;
  documentoReferencia?: string;
}

export interface DatosAnulacionDocumentoInventario {
  empresaId: string;
  tipoOperacion: 'anulacion';
  /** El documento comercial que se anula (NS id, NV id, comprobante id) — identidad estable, no un timestamp. */
  documentoId: string;
  tipoDocumentoOrigen: TipoDocumentoOrigenMovimiento;
  /** Movimientos ORIGINALES confirmados a revertir, ya localizados por el llamador (nunca recalculados desde cantidades cacheadas). Todas se preparan y confirman juntas — si una no puede revertirse, ninguna se revierte. */
  movimientoIds: string[];
  /** Siempre `ANULACION-${tipoDocumento}-${documentoId}` — nunca fabricada de otra forma por el consumidor. */
  claveIdempotencia: string;
  usuario: string;
  /** ISO 8601 — inyectada por el llamador. */
  fecha: string;
  motivoUsuario?: string;
  documentoReferencia?: string;
}
