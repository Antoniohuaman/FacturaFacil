// gestion-inventario/utils/idempotenciaInventario.ts
//
// Reserva de idempotencia (§8 y §21 del encargo/diseño de Etapa 1B). La reserva es la PRIMERA
// escritura real de una operación — ocurre ANTES de que exista cualquier TransaccionInventario.
// Este módulo NO ejecuta escrituras de dominio, NO calcula el hash (recibe `hashEntrada` ya
// calculado por el llamador vía `hashInventario.ts`) y NO implementa la recuperación completa
// (ver `recuperacionInventario.ts`) — cuando detecta que la resolución depende de esa
// recuperación, delega explícitamente en vez de adivinar.
//
// Corrección estructural de la revisión de Etapa 1B (Bloqueante 1): `reservarOperacionIdempotente`
// adquiere el MISMO bloqueo cooperativo por empresa que `unidadTrabajoInventario.ts` y ejecuta la
// recuperación pendiente ANTES de leer/escribir la reserva — así no existe ninguna ventana entre
// "consultar si existe la clave" y "persistir la reserva" en la que dos llamadas concurrentes
// puedan observar ambas "no existe" y crear/pisar la misma fila.
//
// Corrección estructural de la corrección final (retiro de exportaciones inseguras): las dos
// primitivas de escritura (insertar una reserva nueva; escribir una reactivación ya validada) son
// funciones NO EXPORTADAS de ESTE archivo — antes vivían exportadas desde
// `operacionIdempotenteInventario.repository.ts`, pero ninguna advertencia de JSDoc puede impedir
// que un consumidor futuro las importe y se salte el bloqueo o la validación del historial. La
// única forma de que una función sea invisible para cualquier otro módulo en JavaScript/TypeScript
// es que nunca se exporte desde el archivo donde realmente se ejecuta la decisión de seguridad —
// por eso esas dos primitivas ahora viven aquí, junto al bloqueo y la validación que las autorizan
// a ejecutarse, en vez de en el repositorio (que ya no las conoce en absoluto). Para no duplicar el
// guard de forma ni la clave de almacenamiento, este módulo reutiliza
// `esOperacionIdempotenteValida`/`CLAVE_COLECCION_OPERACIONES_IDEMPOTENTES`, exportados por el
// repositorio (ninguno de los dos, por sí solo, permite reservar ni reactivar nada), junto con los
// primitivos genéricos y ya compartidos de `coleccionLocalStorageInventario.ts`.
//
// Unicidad real: SIEMPRE (empresaId, clave), nunca `clave` sola.

import type {
  OperacionIdempotenteInventario,
  ReferenciaDocumentoTipoOperacionIdempotente,
  TipoOperacionIdempotenteInventario,
} from '../models/operacionIdempotenteInventario.types';
import {
  buscarOperacionIdempotentePorClave,
  CLAVE_COLECCION_OPERACIONES_IDEMPOTENTES,
  esOperacionIdempotenteValida,
} from '../repositories/operacionIdempotenteInventario.repository';
import { leerColeccionParaMutacion, guardarColeccionTenantizada } from '../repositories/coleccionLocalStorageInventario';
import { listarTransaccionesPorOperacionIdempotenteId } from '../repositories/transaccionInventario.repository';
import { ConflictoIdempotencia, RecuperacionInventarioNoDeterminista } from './erroresInventario';
import { crearEjecutorBloqueoInventario, type EjecutorBloqueoInventario } from './bloqueoInventario';
import { recuperarTransaccionesInterrumpidas } from './recuperacionInventario';

const NOMBRE_RECURSO_OPERACIONES = 'operaciones idempotentes de inventario';

export interface ParametrosReservaIdempotencia {
  empresaId: string;
  clave: string;
  tipoOperacion: TipoOperacionIdempotenteInventario;
  hashEntrada: string;
  referenciaDocumentoId: string;
  referenciaDocumentoTipo: ReferenciaDocumentoTipoOperacionIdempotente;
  /** Generador de id explícito — este módulo nunca decide su propio esquema de identificadores. */
  generarId: () => string;
  /** Fecha actual inyectable — nunca `new Date()` directo, para mantener la reserva determinista y testeable. */
  fechaActual: () => string;
  /** Ejecutor de bloqueo inyectable (tests) — por defecto, el seleccionado automáticamente según el entorno. */
  ejecutarConBloqueo?: EjecutorBloqueoInventario;
}

/**
 * Resultado discriminado de una reserva (§8 del encargo):
 * - `nueva`: (empresaId, clave) no existía — se creó la operación en `preparada`, primera escritura real.
 * - `repetida`: ya existía `confirmada` con el MISMO hash — reintento legítimo, cero escrituras nuevas.
 * - `ambigua`: ya existía `preparada` — puede ser una operación abandonada o una reserva legítima
 *   reciente cuya unidad de trabajo todavía no se ejecutó (Bloqueante 1 de la revisión: la reserva
 *   y la creación de la transacción activa ocurren en ciclos de bloqueo SEPARADOS, así que esta
 *   combinación nunca se resuelve automáticamente — nunca se destruye una reserva legítima). El
 *   llamador debe diagnosticar o reintentar más tarde, nunca reservar una segunda fila.
 * - `reactivada`: ya existía `fallida` y se demostró segura para reintentar — se reutiliza la MISMA fila.
 */
export type ResultadoReservaIdempotencia =
  | { tipo: 'nueva'; operacion: OperacionIdempotenteInventario }
  | { tipo: 'repetida'; resultadoIds: string[]; operacion: OperacionIdempotenteInventario }
  | { tipo: 'ambigua'; operacion: OperacionIdempotenteInventario }
  | { tipo: 'reactivada'; operacion: OperacionIdempotenteInventario };

function leerOperacionesParaMutar(empresaId: string): OperacionIdempotenteInventario[] {
  return leerColeccionParaMutacion(CLAVE_COLECCION_OPERACIONES_IDEMPOTENTES, empresaId, NOMBRE_RECURSO_OPERACIONES, esOperacionIdempotenteValida);
}

function guardarOperacionesCompletas(empresaId: string, operaciones: readonly OperacionIdempotenteInventario[]): void {
  guardarColeccionTenantizada(CLAVE_COLECCION_OPERACIONES_IDEMPOTENTES, empresaId, operaciones);
}

/**
 * PRIMITIVA INTERNA de persistencia — inserta una operación nueva en el ledger, siempre en estado
 * `preparada` y sin transacción enlazada todavía. Rechaza explícitamente (nunca sobrescribe en
 * silencio) si ya existe una operación con el mismo `id`, o si ya existe otra operación con la
 * misma combinación (empresaId, clave) — esa es la unicidad lógica real del ledger.
 *
 * NO exportada: solo `reservarOperacionIdempotenteSinBloqueo` la invoca, y esta a su vez solo se
 * alcanza después de que `reservarOperacionIdempotente` adquirió el bloqueo cooperativo por
 * empresa y ejecutó la recuperación pendiente. No hay forma de llamar a esta función sin haber
 * pasado por ese camino, porque ningún otro archivo puede siquiera importarla.
 */
function insertarOperacionIdempotenteNueva(operacion: OperacionIdempotenteInventario, empresaId: string): void {
  if (empresaId !== operacion.empresaId) {
    throw new Error(
      `idempotenciaInventario: empresaId del parámetro ("${empresaId}") no coincide con empresaId de la entidad ("${operacion.empresaId}").`
    );
  }
  if (operacion.estado !== 'preparada' || operacion.transaccionInventarioId !== undefined) {
    throw new Error(`idempotenciaInventario: una operación nueva debe insertarse en 'preparada' y sin transaccionInventarioId (clave="${operacion.clave}").`);
  }
  if (operacion.resultadoIds.length > 0) {
    throw new Error(`idempotenciaInventario: una operación nueva no puede traer resultadoIds (clave="${operacion.clave}").`);
  }
  const operaciones = leerOperacionesParaMutar(empresaId);
  if (operaciones.some((o) => o.id === operacion.id)) {
    throw new Error(`idempotenciaInventario: ya existe una operación con id "${operacion.id}" para la empresa "${empresaId}".`);
  }
  if (operaciones.some((o) => o.clave === operacion.clave)) {
    throw new Error(
      `idempotenciaInventario: ya existe una operación con clave "${operacion.clave}" para la empresa "${empresaId}" — la combinación (empresaId, clave) debe ser única.`
    );
  }
  guardarOperacionesCompletas(empresaId, [...operaciones, operacion]);
}

/**
 * PRIMITIVA INTERNA de persistencia (`fallida → preparada`) — escribe el resultado de una
 * reactivación YA VALIDADA por `verificarReactivacionSeguraOperacionFallida` (§8 caso E). Limpia
 * `transaccionInventarioId` (el próximo intento tendrá su propia transacción con `numeroIntento`
 * incrementado) y actualiza `hashEntrada` para el nuevo intento — decisión explícita: la clave
 * quedó liberada para un reintento limpio, y ese reintento puede corresponder a una entrada con un
 * hash distinto del intento fallido (§8 caso E de la revisión de Etapa 1B).
 *
 * NO exportada: solo se alcanza DESPUÉS de que `verificarReactivacionSeguraOperacionFallida` (en
 * este mismo archivo) comprobó el historial completo de intentos — la validación nunca se duplica
 * en otro archivo porque esta función, al no exportarse, no puede invocarse desde ningún otro.
 */
function escribirReactivacionOperacionFallida(empresaId: string, operacionId: string, nuevoHashEntrada: string): void {
  const operaciones = leerOperacionesParaMutar(empresaId);
  const indice = operaciones.findIndex((o) => o.id === operacionId);
  if (indice === -1) {
    throw new Error(`idempotenciaInventario: no existe una operación con id "${operacionId}" para la empresa "${empresaId}".`);
  }
  const actual = operaciones[indice];
  if (actual.estado !== 'fallida') {
    throw new Error(`idempotenciaInventario: solo una operación 'fallida' puede prepararse para reintento (estado actual: "${actual.estado}", id="${operacionId}").`);
  }
  if (actual.resultadoIds.length > 0) {
    throw new Error(`idempotenciaInventario: la operación "${operacionId}" está 'fallida' pero conserva resultadoIds no vacíos — no puede reactivarse.`);
  }
  const siguientes = [...operaciones];
  siguientes[indice] = {
    ...actual,
    estado: 'preparada',
    hashEntrada: nuevoHashEntrada,
    transaccionInventarioId: undefined,
    error: undefined,
  };
  guardarOperacionesCompletas(empresaId, siguientes);
}

/**
 * Verifica si una operación `fallida` puede reactivarse de forma segura (§8 caso E; §3.6 de la
 * revisión de Etapa 1B): nunca aplicó escrituras de dominio (resultadoIds vacío), no tiene ningún
 * intento activo (`preparada`/`confirmando`) y ningún intento histórico llegó a `confirmada` — si
 * lo tuviera, la operación nunca debería haber quedado `fallida` en primer lugar (inconsistencia
 * real, no un caso pendiente de recuperar).
 */
function verificarReactivacionSeguraOperacionFallida(empresaId: string, operacion: OperacionIdempotenteInventario): void {
  if (operacion.resultadoIds.length > 0) {
    throw new RecuperacionInventarioNoDeterminista({
      empresaId,
      detalle: `la operación "${operacion.id}" (clave="${operacion.clave}") está 'fallida' pero conserva resultadoIds no vacíos — viola su propio invariante de estado y no puede reactivarse automáticamente.`,
    });
  }

  const intentos = listarTransaccionesPorOperacionIdempotenteId(empresaId, operacion.id);
  const activo = intentos.find((t) => t.estado === 'preparada' || t.estado === 'confirmando');
  if (activo) {
    throw new RecuperacionInventarioNoDeterminista({
      empresaId,
      detalle: `la operación "${operacion.id}" (clave="${operacion.clave}") está 'fallida' pero tiene un intento activo ("${activo.id}", estado="${activo.estado}") — debe resolverse antes de reactivar.`,
    });
  }
  const confirmado = intentos.find((t) => t.estado === 'confirmada');
  if (confirmado) {
    throw new RecuperacionInventarioNoDeterminista({
      empresaId,
      detalle: `la operación "${operacion.id}" (clave="${operacion.clave}") está 'fallida' pero su intento "${confirmado.id}" está 'confirmada' — combinación imposible, no puede reactivarse automáticamente.`,
    });
  }
}

/**
 * Lógica real de la reserva — SIN adquirir ningún bloqueo. Privada del módulo (§2.2 de la
 * revisión): solo se invoca desde `reservarOperacionIdempotente`, que ya adquirió el bloqueo antes
 * de llamarla. Nunca se exporta.
 */
function reservarOperacionIdempotenteSinBloqueo(params: ParametrosReservaIdempotencia): ResultadoReservaIdempotencia {
  const { empresaId, clave, tipoOperacion, hashEntrada, referenciaDocumentoId, referenciaDocumentoTipo, generarId, fechaActual } = params;
  const existente = buscarOperacionIdempotentePorClave(empresaId, clave);

  if (!existente) {
    const operacion: OperacionIdempotenteInventario = {
      id: generarId(),
      empresaId,
      clave,
      tipoOperacion,
      estado: 'preparada',
      hashEntrada,
      referenciaDocumentoId,
      referenciaDocumentoTipo,
      resultadoIds: [],
      fechaCreacion: fechaActual(),
    };
    insertarOperacionIdempotenteNueva(operacion, empresaId);
    return { tipo: 'nueva', operacion };
  }

  switch (existente.estado) {
    case 'confirmada': {
      if (existente.hashEntrada !== hashEntrada) {
        throw new ConflictoIdempotencia({ empresaId, clave, hashExistente: existente.hashEntrada, hashRecibido: hashEntrada });
      }
      // Reintento legítimo: cero escrituras, cero cambios de fecha, se devuelven exactamente los resultados ya confirmados.
      return { tipo: 'repetida', resultadoIds: existente.resultadoIds, operacion: existente };
    }

    case 'preparada': {
      // Ambigua (ver el JSDoc de ResultadoReservaIdempotencia) — nunca se re-ejecuta a ciegas ni
      // se crea una segunda fila con la misma clave.
      return { tipo: 'ambigua', operacion: existente };
    }

    case 'revertida': {
      // Nunca se trata como si nunca hubiera existido, ni se reprocesa en silencio.
      throw new Error(
        `idempotenciaInventario: la operación con clave "${clave}" de la empresa "${empresaId}" ya fue revertida — no puede reprocesarse ni reservarse de nuevo bajo la misma clave.`
      );
    }

    case 'fallida': {
      verificarReactivacionSeguraOperacionFallida(empresaId, existente);
      // Decisión explícita (§8 caso E): el hash SÍ puede actualizarse al reactivar. La clave quedó
      // liberada para un reintento limpio — ese reintento corresponde a una entrada real que puede
      // tener un hash distinto del intento fallido, y no hay ningún resultado previo que ese hash
      // antiguo estuviera protegiendo (resultadoIds ya viene vacío, verificado arriba). El intento
      // fallido NUNCA se elimina — permanece como evidencia histórica (Bloqueante 2).
      escribirReactivacionOperacionFallida(empresaId, existente.id, hashEntrada);
      const reactivada = buscarOperacionIdempotentePorClave(empresaId, clave);
      if (!reactivada) {
        throw new Error(`idempotenciaInventario: la operación "${existente.id}" desapareció inmediatamente después de prepararla para reintento — estado interno inconsistente.`);
      }
      return { tipo: 'reactivada', operacion: reactivada };
    }

    default: {
      const estadoDesconocido: never = existente.estado;
      throw new Error(`idempotenciaInventario: estado de operación idempotente desconocido: "${estadoDesconocido}".`);
    }
  }
}

/**
 * Reserva una operación idempotente bajo el bloqueo cooperativo por empresa (§2.1 de la revisión
 * de Etapa 1B): adquiere el bloqueo, ejecuta la recuperación pendiente de la empresa PRIMERO
 * (§4.4: ningún intento `confirmando`/`preparada`-con-transacción puede quedar sin resolver antes
 * de aceptar una reserva nueva), y solo entonces consulta/persiste la reserva — sin ninguna
 * ventana entre ambos pasos en la que otra llamada concurrente pueda intercalarse.
 */
export async function reservarOperacionIdempotente(params: ParametrosReservaIdempotencia): Promise<ResultadoReservaIdempotencia> {
  const ejecutarConBloqueo = params.ejecutarConBloqueo ?? crearEjecutorBloqueoInventario();
  return ejecutarConBloqueo(params.empresaId, async () => {
    recuperarTransaccionesInterrumpidas(params.empresaId, params.fechaActual);
    return reservarOperacionIdempotenteSinBloqueo(params);
  });
}
