// gestion-inventario/models/transaccionInventario.types.ts
//
// Modelo aprobado en §9.6 del diseño técnico (docs/diseno-tecnico-kardex-valorizado-integracion-compras.md).
// Etapa 1B: diario transaccional recuperable — ver `utils/unidadTrabajoInventario.ts` (secuencia
// de confirmación) y `utils/recuperacionInventario.ts` (recuperación tras interrupción).
//
// Corrección estructural de la revisión de Etapa 1B (Bloqueante 2): una OperacionIdempotenteInventario
// puede tener VARIOS intentos históricos si los intentos anteriores terminaron `fallida` sin
// efectos — el diario se conserva siempre, nunca se borra una transacción para "liberar" la
// relación con la operación. Por eso la relación real ya NO es 1:1 operación↔transacción: es
// 1:N — cada intento de ejecución es su propia fila, identificada por `numeroIntento`. La unicidad
// que sí se protege (repositories/transaccionInventario.repository.ts) es
// (empresaId, operacionIdempotenteId, numeroIntento), y como máximo UN intento puede estar activo
// (`preparada`/`confirmando`) por operación a la vez — `preparada`/`confirmando`/`confirmada`/`fallida`/`revertida`
// coexisten en el historial, pero solo la fila activa puede mutar; el resto es histórico inmutable.
//
// Corrección estructural (Bloqueante 3): `versionEsperada`/`versionResultante` se persisten en la
// PROPIA transacción — sin ellas, una recuperación tras reinicio no tiene forma determinista de
// saber qué versión debía producir este intento específico (el `EstadoVersionInventario` vigente
// por sí solo no basta: puede haber avanzado por operaciones posteriores). Ambos campos son
// inmutables una vez creada la transacción — nunca se recalculan durante la recuperación.

import type { TipoOperacionIdempotenteInventario } from './operacionIdempotenteInventario.types';

export type EstadoTransaccionInventario = 'preparada' | 'confirmando' | 'confirmada' | 'revertida' | 'fallida';

export interface TransaccionInventario {
  id: string;
  empresaId: string;

  /**
   * FK obligatoria a la OperacionIdempotenteInventario que originó esta transacción — corrección
   * estructural de Etapa 1B (§4.2 del encargo): la recuperación debe cruzar ambas entidades de
   * forma explícita, nunca depender únicamente de `claveIdempotencia` (que no es una FK, es un
   * dato de negocio que podría en teoría repetirse entre operaciones ya cerradas de formas que no
   * garantizan unicidad histórica). La relación real es 1:N (ver nota de cabecera del archivo):
   * varias transacciones pueden compartir la misma `operacionIdempotenteId`, una por intento.
   */
  operacionIdempotenteId: string;

  /**
   * Número de intento de ejecución para esta `operacionIdempotenteId` — entero seguro, ≥ 1,
   * asignado por el repositorio como `máximo histórico + 1` (nunca por posición en el arreglo,
   * nunca reutilizado). El primer intento de una operación es siempre 1. Inmutable tras crear la
   * transacción.
   */
  numeroIntento: number;

  tipoOperacion: TipoOperacionIdempotenteInventario;
  claveIdempotencia: string;
  estado: EstadoTransaccionInventario;

  /** Igual valor que `OperacionIdempotenteInventario.hashEntrada` para la misma operación. */
  hashEntrada: string;

  /** Claves de `localStorage` (o futuras filas de tabla) que esta transacción va a escribir — declaradas ANTES de escribir, para poder detectar en la recuperación qué faltó. */
  clavesAfectadas: string[];

  /**
   * Snapshot de "antes"/"propuesto" de cada clave afectada, indexado por la misma clave —
   * `Record<string, string | null>` (no `Record<string, unknown>`): cada valor es exactamente el
   * string serializado que se escribiría en `localStorage.setItem`, o `null` cuando la ausencia
   * real de la clave es el estado esperado (equivalente a `removeItem`/clave nunca creada).
   * Ajuste de tipo respecto a la Etapa 1A — sin consumidor productivo todavía, cambio compatible:
   * permite a `unidadTrabajoInventario.ts` comparar el valor actual de `localStorage.getItem(...)`
   * (también `string | null`) directamente contra estos snapshots, sin parsear ni adivinar forma.
   */
  datosAnteriores: Record<string, string | null>;
  /** Ver `datosAnteriores` — el plan completo ya calculado, lo único que la confirmación ejecuta, sin recalcular reglas. */
  datosPropuestos: Record<string, string | null>;

  /** Versión de Inventario que este intento asumió vigente al construir su plan (entero seguro, ≥ 0). Inmutable. */
  versionEsperada: number;
  /** Versión que este intento produce al confirmarse — siempre `versionEsperada + 1`. Inmutable. */
  versionResultante: number;

  resultadoIds: string[];
  fechaPreparacion: string;
  fechaConfirmacion?: string;
  usuario: string;
  error?: string;
}
