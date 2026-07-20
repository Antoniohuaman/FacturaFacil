// gestion-inventario/models/estadoVersionInventario.types.ts
//
// Modelo aprobado en §9.6bis del diseño técnico (docs/diseno-tecnico-kardex-valorizado-integracion-compras.md).
// Etapa 1B: control optimista de concurrencia — un registro único por empresa (no una colección),
// versión monotónica que solo aumenta cuando una unidad de trabajo completa todas sus escrituras
// y queda confirmada (invariante 27, §32). Sin consumidor productivo todavía fuera de
// `utils/unidadTrabajoInventario.ts`/`utils/recuperacionInventario.ts`.

export interface EstadoVersionInventario {
  empresaId: string;
  /**
   * Entero seguro (`Number.isSafeInteger`), finito, ≥ 1. La versión 0 NUNCA se persiste
   * explícitamente — es únicamente la AUSENCIA de este registro (una empresa sin registro previo
   * está implícitamente en versión 0, ver `repositories/estadoVersionInventario.repository.ts`).
   * Por eso todo registro realmente persistido representa una versión > 0 y, por construcción,
   * siempre tiene una transacción real que lo produjo.
   */
  versionInventario: number;
  fechaActualizacion: string;
  /** FK obligatoria a la TransaccionInventario que produjo esta versión — nunca opcional: si el registro existe, siempre hay una transacción real detrás (nunca una versión "ficticia"). */
  ultimaTransaccionId: string;
}
