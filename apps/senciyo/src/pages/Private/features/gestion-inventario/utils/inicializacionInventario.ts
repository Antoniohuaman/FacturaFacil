// gestion-inventario/utils/inicializacionInventario.ts
//
// Inicialización segura de la infraestructura de Inventario (§13 del encargo de Etapa 1B). SIN
// efectos secundarios al importar el archivo — nada se ejecuta hasta invocar
// `inicializarInfraestructuraInventario` explícitamente. Todavía no se conecta a React/UI ni a
// ningún consumidor productivo (Compras/Ventas/POS/NI/NS) — queda disponible para que un futuro
// `ServicioKardexValorizado` (Etapa 1C) la invoque.
//
// Corrección estructural de la revisión de Etapa 1B (Bloqueante 1, §2.4): esta función adquiere el
// MISMO bloqueo cooperativo por empresa que `idempotenciaInventario.ts`/`unidadTrabajoInventario.ts`
// antes de ejecutar la recuperación — nunca asume que "durante el arranque no puede existir una
// reserva legítima reciente". La recuperación en sí nunca resuelve automáticamente el caso A
// (operación `preparada` sin ningún intento — ver `recuperacionInventario.ts`), sin importar quién
// la invoque: esa combinación puede pertenecer a otra pestaña o a una reserva recién creada, así
// que se diagnostica y se conserva intacta, nunca se destruye.

import { crearEjecutorBloqueoInventario, type EjecutorBloqueoInventario } from './bloqueoInventario';
import { recuperarTransaccionesInterrumpidas, type ResultadoRecuperacionInventario } from './recuperacionInventario';

const empresasInicializadas = new Set<string>();

/**
 * Idempotente por empresa durante la sesión: una empresa ya inicializada con éxito no vuelve a
 * ejecutar recuperación en llamadas subsecuentes (devuelve `undefined`). Si la recuperación lanza
 * un error (inconsistencia real, ver `recuperacionInventario.ts`), la empresa NO se marca como
 * inicializada — una llamada posterior puede reintentar; el error nunca se oculta ni se convierte
 * en un éxito silencioso.
 */
export async function inicializarInfraestructuraInventario(
  empresaId: string,
  fechaActual: () => string,
  ejecutarConBloqueo: EjecutorBloqueoInventario = crearEjecutorBloqueoInventario()
): Promise<ResultadoRecuperacionInventario | undefined> {
  if (empresasInicializadas.has(empresaId)) {
    return undefined;
  }
  const resultado = await ejecutarConBloqueo(empresaId, async () => recuperarTransaccionesInterrumpidas(empresaId, fechaActual));
  empresasInicializadas.add(empresaId);
  return resultado;
}

/** `true` si la empresa ya completó su inicialización en esta sesión — sin ejecutar nada. */
export function empresaInventarioInicializada(empresaId: string): boolean {
  return empresasInicializadas.has(empresaId);
}

/**
 * Limpia el estado de inicialización en memoria — SOLO para pruebas (equivalente a `localStorage.clear()`
 * en `beforeEach`, pero para este módulo). Nunca se invoca desde código productivo: en una sesión
 * real de la aplicación, el estado de inicialización debe persistir mientras la pestaña esté abierta.
 */
export function reiniciarEstadoInicializacionInventarioParaPruebas(): void {
  empresasInicializadas.clear();
}
