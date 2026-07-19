// gestion-inventario/models/transaccionInventario.types.ts
//
// Modelo aprobado en §9.6 del diseño técnico (docs/diseno-tecnico-kardex-valorizado-integracion-compras.md).
// Etapa 1A: solo el tipo de datos y su repositorio — NO implementa todavía
// `unidadTrabajoInventario.ts` (la secuencia transaccional), recuperación, confirmación, replay,
// rollback ni control optimista de versión (eso corresponde a la Etapa 1B en adelante).

import type { TipoOperacionIdempotenteInventario } from './operacionIdempotenteInventario.types';

export type EstadoTransaccionInventario = 'preparada' | 'confirmando' | 'confirmada' | 'revertida' | 'fallida';

export interface TransaccionInventario {
  id: string;
  empresaId: string;
  tipoOperacion: TipoOperacionIdempotenteInventario;
  claveIdempotencia: string;
  estado: EstadoTransaccionInventario;

  /** Igual valor que `OperacionIdempotenteInventario.hashEntrada` para la misma operación. */
  hashEntrada: string;

  /** Claves de `localStorage` (o futuras filas de tabla) que esta transacción va a escribir — declaradas ANTES de escribir, para poder detectar en la recuperación qué faltó. */
  clavesAfectadas: string[];

  /** Snapshot de "antes" de cada clave afectada — permite reconstruir o verificar en la recuperación. */
  datosAnteriores: Record<string, unknown>;
  /** El plan completo ya calculado — lo único que la confirmación (Etapa 1B en adelante) ejecuta, sin recalcular reglas. */
  datosPropuestos: Record<string, unknown>;

  resultadoIds: string[];
  fechaPreparacion: string;
  fechaConfirmacion?: string;
  usuario: string;
  error?: string;
}
