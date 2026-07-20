// gestion-inventario/utils/bloqueoInventario.ts
//
// Bloqueo cooperativo POR EMPRESA (§9 del encargo de Etapa 1B). Reduce colisiones entre
// operaciones simultáneas — NO es una garantía real de atomicidad de `localStorage`. La
// verificación de versión (`estadoVersionInventario.repository.ts`) sigue siendo obligatoria pase
// lo que pase con este bloqueo: este módulo solo reduce colisiones, nunca las reemplaza como
// garantía. No implementa un bloqueo granular por recurso/clave — un bloqueo cooperativo por
// empresa es suficiente y más seguro para esta etapa que un mecanismo complejo sin evidencia de
// que las colisiones parciales por recurso realmente ocurran.

export type EjecutorBloqueoInventario = <T>(empresaId: string, fn: () => Promise<T>) => Promise<T>;

function nombreBloqueo(empresaId: string): string {
  return `facturafacil:inventario:bloqueo:${empresaId}`;
}

/**
 * Implementación real vía Web Locks API (`navigator.locks`) — serializa la ejecución para la
 * MISMA empresa, incluso entre pestañas del mismo origen. El bloqueo se libera automáticamente al
 * resolverse o rechazarse la promesa devuelta por `fn`; nunca queda una promesa colgada.
 */
export function ejecutarConBloqueoNavigatorLocks<T>(empresaId: string, fn: () => Promise<T>): Promise<T> {
  return navigator.locks.request(nombreBloqueo(empresaId), () => fn());
}

/**
 * Fallback cooperativo en memoria — cubre ÚNICAMENTE el proceso/pestaña actual. No es una
 * solución real multi-pestaña ni multi-proceso, y no se presenta como tal: si dos pestañas
 * ejecutan esta misma función con el mismo `empresaId`, cada una tiene su propio `Map` y no se
 * bloquean entre sí. Encadena promesas por empresa: cada nueva ejecución espera a que termine la
 * anterior de la MISMA empresa —éxito o error— antes de empezar. Empresas distintas tienen su
 * propia cadena independiente y nunca se bloquean entre sí.
 */
const colaPorEmpresa = new Map<string, Promise<unknown>>();

export function ejecutarConBloqueoEnMemoria<T>(empresaId: string, fn: () => Promise<T>): Promise<T> {
  const previa = colaPorEmpresa.get(empresaId) ?? Promise.resolve();
  const propia = previa.catch(() => undefined).then(fn);
  // Se registra la versión "atrapada" (nunca rechaza) para que un error en esta ejecución no deje
  // la cola de la empresa permanentemente rota — la siguiente ejecución encolada debe poder
  // continuar aunque esta falle. El rechazo real sigue propagándose a quien llamó a esta función
  // a través de `propia`, que es lo que se devuelve.
  colaPorEmpresa.set(empresaId, propia.catch(() => undefined));
  return propia;
}

function navigatorLocksDisponible(): boolean {
  return typeof navigator !== 'undefined' && 'locks' in navigator && navigator.locks != null;
}

/**
 * Selecciona la implementación disponible en este entorno: `navigator.locks` cuando existe
 * (garantía real de serialización, incluso entre pestañas); si no, el fallback cooperativo en
 * memoria descrito arriba, con su garantía más débil documentada explícitamente.
 */
export function crearEjecutorBloqueoInventario(): EjecutorBloqueoInventario {
  return navigatorLocksDisponible() ? ejecutarConBloqueoNavigatorLocks : ejecutarConBloqueoEnMemoria;
}
