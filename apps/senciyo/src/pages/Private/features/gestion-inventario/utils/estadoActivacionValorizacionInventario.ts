// gestion-inventario/utils/estadoActivacionValorizacionInventario.ts
//
// Helpers puros de la máquina de estados de activación de valorización (Etapa 2, §24.1ter/§31.5).
// Reemplaza cualquier chequeo plano tipo `estado !== 'suspendida_por_inconsistencia'` — toda ruta de
// mutación del motor central (gestion-inventario/services/servicioKardexValorizado.ts) resuelve el
// modo de operación a través de `resolverModoOperacion`, nunca comparando el estado directamente.

import type { EstadoActivacionValorizacion, ModoOperacionInventario } from '../models/estadoActivacionValorizacion.types';

/**
 * Matriz completa 9 estados × modo (§24.1quater) — sin rama "default" que oculte un estado nuevo:
 * un estado no contemplado aquí produce un error de tipos en compilación (switch exhaustivo).
 */
export function resolverModoOperacion(estado: EstadoActivacionValorizacion): ModoOperacionInventario {
  switch (estado) {
    case 'no_iniciada':
      return 'cuantitativo_libre';
    case 'en_preparacion':
    case 'pendiente_costos':
      return 'cuantitativo_invalida_snapshot';
    case 'validada':
      return 'bloqueado_snapshot_aprobado';
    case 'activando':
      return 'bloqueado_activacion_en_curso';
    case 'activa':
      return 'valorizado_exclusivo';
    // Recuperable desde una interrupción de la activación (Etapa 4) — bloquea mutación igual que
    // 'activando' hasta que se resuelva; inalcanzable en Etapa 2.
    case 'fallida_recuperable':
      return 'bloqueado_activacion_en_curso';
    case 'suspendida_por_inconsistencia':
      return 'bloqueado_suspension';
    default: {
      const _exhaustivo: never = estado;
      throw new Error(`resolverModoOperacion: estado de activación de valorización no reconocido: "${String(_exhaustivo)}".`);
    }
  }
}

/** `true` únicamente cuando la empresa ya completó la activación (o quedó suspendida tras activar) — §24.1ter. Inalcanzable en Etapa 2, expuesta para consistencia con el diseño aprobado. */
export function esValorizacionActiva(estado: EstadoActivacionValorizacion): boolean {
  return estado === 'activa' || estado === 'suspendida_por_inconsistencia';
}

/**
 * Modo de inventario único y coordinado que ve el usuario y que consultan TODOS los módulos que
 * mueven stock (Ventas, Compras, NI, NS, Ajustes, Importaciones, Transferencias). Se deriva —
 * nunca se persiste por separado — de las dos fuentes ya existentes y coordinadas:
 * `SalesPreferences.controlStockActivo` (switch maestro de control de existencias) y
 * `PreferenciasInventario.estadoValorizacion` (máquina de activación de valorización). No crear
 * una tercera fuente de verdad ni un booleano nuevo — ver
 * docs/AUDITORIA_FLUJO_ACTIVACION_VALORIZACION_INVENTARIO_2026-08-05.md.
 */
export type ModoInventario = 'inactivo' | 'cuantitativo' | 'valorizado';

/**
 * Resolvedor central del modo de inventario (§4/§5 del encargo de centralización). La Valorización
 * activa (o suspendida por inconsistencia tras haber estado activa) siempre implica modo
 * `'valorizado'`, incluso si `controlStockActivo` llegara desincronizado — esto cierra
 * deterministamente la combinación migrada "(inactivo + activa)" descrita en §17 sin necesitar que
 * el llamador la conozca. Sin valorización activa, el modo depende únicamente del switch maestro.
 */
export function resolverModoInventario(
  controlStockActivo: boolean | undefined,
  estadoValorizacion: EstadoActivacionValorizacion
): ModoInventario {
  if (esValorizacionActiva(estadoValorizacion)) {
    return 'valorizado';
  }
  return controlStockActivo ? 'cuantitativo' : 'inactivo';
}

/**
 * `true` cuando la desactivación del control de existencias (§4.5) es una operación permitida por
 * el estado de valorización — `false` en cuanto la valorización está activa o suspendida por
 * inconsistencia (irreversible: nunca puede desactivarse ni retroceder a cuantitativo/inactivo).
 * Es la única puerta que UI y servicio deben consultar antes de desactivar.
 */
export function puedeDesactivarControlInventario(estadoValorizacion: EstadoActivacionValorizacion): boolean {
  return !esValorizacionActiva(estadoValorizacion);
}

/**
 * Los 5 estados visuales reales que la UI debe mostrar (§4 de la corrección UX final 2026-08-07):
 * `pendiente` (nunca se configuró nada) y `inactivo` (se configuró alguna vez, hoy está apagado)
 * son estados DISTINTOS a propósito — ver `inventarioConfiguradoAlgunaVez` más abajo. No existe un
 * estado operativo "configuración en curso": armar una preparación de valorización (borrador FIFO,
 * `estaPreparandoValorizacion`) es un detalle de la página de configuración, nunca algo que cambie
 * el modo que Compras/Ventas/Kardex ven operar — ver §22 de la corrección UX final. Misma fuente
 * para el header de Inventario (`InventoryPage.tsx`), la tarjeta del panel de Configuración
 * (`PanelConfiguracion.tsx`) y la página dedicada (`ConfiguracionInventario.tsx`) — nunca una copia
 * local del cálculo.
 */
export type EstadoVisualInventario =
  | 'pendiente'
  | 'inactivo'
  | 'cuantitativo_activo'
  | 'valorizado_activo'
  | 'requiere_atencion';

/**
 * `resolverEstadoVisualInventario` necesita una tercera señal además de `modo` y
 * `estadoValorizacion`: sin ella, "nunca configurado" y "configurado y hoy apagado" son
 * indistinguibles (ambos resuelven `modo='inactivo'` con `estadoValorizacion` en su valor por
 * defecto). `inventarioConfiguradoAlgunaVez` es esa señal — vive en `PreferenciasInventario`
 * (persistida, tenantizada, junto a las otras dos fuentes), es monótona (una vez `true`, nunca
 * vuelve a `false`: ni desactivar el control de existencias ni cancelar una preparación de
 * valorización la reinician) y NO reemplaza ni duplica `controlStockActivo`/`estadoValorizacion` —
 * solo responde "¿esta empresa completó alguna activación real, alguna vez?".
 */
export function resolverEstadoVisualInventario(
  modo: ModoInventario,
  estadoValorizacion: EstadoActivacionValorizacion,
  inventarioConfiguradoAlgunaVez: boolean
): EstadoVisualInventario {
  if (estadoValorizacion === 'suspendida_por_inconsistencia') return 'requiere_atencion';
  if (modo === 'valorizado' && estadoValorizacion === 'activa') return 'valorizado_activo';
  if (modo === 'cuantitativo') return 'cuantitativo_activo';
  return inventarioConfiguradoAlgunaVez ? 'inactivo' : 'pendiente';
}

const ESTADOS_PREPARACION_VALORIZACION: readonly EstadoActivacionValorizacion[] = [
  'en_preparacion',
  'pendiente_costos',
  'validada',
  'activando',
  'fallida_recuperable',
];

/**
 * `true` mientras existe un borrador de valorización FIFO sin activar (o intentando activarse) —
 * uso exclusivo de la página de configuración para decidir qué secciones desplegar y para el
 * indicador discreto "Configuración de costos pendiente" (§22). NUNCA debe usarse para calcular el
 * estado operativo visible (`resolverEstadoVisualInventario` no lo consulta a propósito).
 */
export function estaPreparandoValorizacion(estadoValorizacion: EstadoActivacionValorizacion): boolean {
  return ESTADOS_PREPARACION_VALORIZACION.includes(estadoValorizacion);
}

/** `true` cuando el inventario admite mutaciones cuantitativas normales (con o sin invalidación de snapshot) — usado por AdjustmentModal/PanelImportacionStock para decidir si el campo de costo es obligatorio. */
export function puedeOperarCuantitativamente(estado: EstadoActivacionValorizacion): boolean {
  const modo = resolverModoOperacion(estado);
  return modo === 'cuantitativo_libre' || modo === 'cuantitativo_invalida_snapshot';
}

/** `true` cuando el motor permite mutar inventario en ALGÚN modo (cuantitativo o valorizado) — `false` únicamente en los 3 modos bloqueados. */
export function puedeMutarInventario(estado: EstadoActivacionValorizacion): boolean {
  const modo = resolverModoOperacion(estado);
  return modo !== 'bloqueado_snapshot_aprobado' && modo !== 'bloqueado_activacion_en_curso' && modo !== 'bloqueado_suspension';
}

/**
 * Transiciones productivamente permitidas de la máquina central (Etapa 2 §4 + cierre de Etapa 4B +
 * corrección UX-INV-P0-001, 2026-08-07). `validada → activando` (inicio de activación),
 * `activando → activa` (éxito) y `activando → fallida_recuperable` / `fallida_recuperable →
 * activando` (interrupción y reintento) son la extensión de Etapa 4B. La corrección de 2026-08-07
 * simplifica el ciclo de cancelación: `en_preparacion`/`pendiente_costos`/`validada` cancelan
 * DIRECTO a `no_iniciada` (antes pasaban por un estado `cancelada_antes_activacion` que nunca
 * volvía a `no_iniciada` por sí mismo — la raíz de UX-INV-P0-001). Es seguro porque antes de
 * `activa` nunca existe ninguna capa ni movimiento — cancelar nunca tiene nada que revertir. Un
 * intento de invocar una transición ausente de este mapa se rechaza explícitamente (nunca se
 * "permite por omisión"). `activa` permanece sin salida (irreversible: ninguna acción de
 * desactivar ni retroceso a un estado anterior).
 */
const TRANSICIONES_PERMITIDAS: Readonly<Record<EstadoActivacionValorizacion, readonly EstadoActivacionValorizacion[]>> = {
  no_iniciada: ['en_preparacion'],
  en_preparacion: ['pendiente_costos', 'no_iniciada'],
  pendiente_costos: ['validada', 'no_iniciada'],
  validada: ['no_iniciada', 'activando'],
  activando: ['activa', 'fallida_recuperable'],
  activa: [],
  fallida_recuperable: ['activando'],
  suspendida_por_inconsistencia: [],
};

/**
 * Valida que `actual → siguiente` sea una transición productivamente permitida — lanza si no lo
 * es. Es la única puerta de transición: ningún llamador construye el nuevo estado "a mano" sin
 * pasar por aquí primero.
 */
export function validarTransicionEstadoValorizacion(
  actual: EstadoActivacionValorizacion,
  siguiente: EstadoActivacionValorizacion
): void {
  const permitidas = TRANSICIONES_PERMITIDAS[actual] ?? [];
  if (!permitidas.includes(siguiente)) {
    throw new Error(
      `estadoActivacionValorizacionInventario: la transición "${actual}" → "${siguiente}" no está permitida ` +
      `(recorrido productivo: no_iniciada→en_preparacion→pendiente_costos→validada→activando→activa; ` +
      `en_preparacion/pendiente_costos/validada→no_iniciada para cancelar; ` +
      `activando⇄fallida_recuperable para interrupción/reintento; "activa" nunca retrocede).`
    );
  }
}
