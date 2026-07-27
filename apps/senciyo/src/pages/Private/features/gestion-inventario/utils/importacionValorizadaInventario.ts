// gestion-inventario/utils/importacionValorizadaInventario.ts
//
// Funciones puras de clasificación y validación de costo para la importación de stock con costo
// (Etapa 2, §11 del encargo; §13.5 del diseño técnico). No leen ni escriben `localStorage` — el
// panel de importación (`components/PanelImportacionStock.tsx`) las usa para calcular el estado de
// costo de cada fila de la previsualización.
//
// En esta etapa `estadoValorizacion` nunca es `'activa'` para ninguna empresa (Etapa 4), así que
// `modoOperacionResuelto` siempre llega como un modo cuantitativo en producción — estas funciones
// devuelven `'no_aplica'`/`'sin_cambio'` para toda fila en ese caso, preservando exactamente el
// comportamiento cuantitativo actual. La rama que exige costo solo se ejerce con
// `'valorizado_exclusivo'` (inalcanzable hoy, ejercida por tests para preparar la Etapa 4).

import type { ModoOperacionInventario } from '../models/estadoActivacionValorizacion.types';
import type { ModoLoteImportacionValorizada, EstadoCostoFilaImportacion, FilaLoteImportacionValorizada } from '../models/loteImportacionValorizada.types';

/**
 * Diferencia de cantidad que una fila representa (§11, §13.4): en modo `'sumatoria'` toda cantidad
 * declarada es una entrada adicional (nunca se resta el stock actual); en modo `'reemplazo'` la
 * diferencia es `cantidadArchivo - stockActual` — positiva es entrada, negativa es salida, cero es
 * "sin cambio".
 */
export function calcularDiferenciaFilaImportacion(
  cantidadArchivo: number,
  stockActual: number,
  modo: ModoLoteImportacionValorizada
): number {
  return modo === 'sumatoria' ? cantidadArchivo : cantidadArchivo - stockActual;
}

/**
 * Clasifica el estado de costo de una fila (§11): `'sin_cambio'` si la diferencia es cero;
 * `'no_aplica'` si el modo de operación resuelto no es `'valorizado_exclusivo'` (todo consumidor
 * productivo hoy) o si la diferencia es una salida (una reducción de stock nunca "declara" costo,
 * consume capas existentes); en modo valorizado con diferencia positiva, `'con_costo'` si
 * `costoUnitario` es finito y > 0, `'requiere_costo'` en caso contrario.
 */
export function calcularEstadoCostoFila(
  diferencia: number,
  costoUnitario: number | undefined,
  modoOperacionResuelto: ModoOperacionInventario
): EstadoCostoFilaImportacion {
  if (diferencia === 0) return 'sin_cambio';
  if (modoOperacionResuelto !== 'valorizado_exclusivo') return 'no_aplica';
  if (diferencia < 0) return 'no_aplica';
  return Number.isFinite(costoUnitario) && (costoUnitario as number) > 0 ? 'con_costo' : 'requiere_costo';
}

/**
 * Valida el lote completo (§11: "una fila inválida rechaza el lote completo") — lanza en cuanto
 * encuentra AL MENOS una fila `'requiere_costo'`; nunca confirma parcialmente. No-op si el modo de
 * operación resuelto no es `'valorizado_exclusivo'` (toda importación productiva hoy).
 */
export function validarFilasLoteImportacion(filas: readonly FilaLoteImportacionValorizada[]): void {
  const filasInvalidas = filas.filter((f) => f.estadoCosto === 'requiere_costo');
  if (filasInvalidas.length > 0) {
    const numeros = filasInvalidas.map((f) => f.numeroFila).join(', ');
    throw new Error(
      `importacionValorizadaInventario: ${filasInvalidas.length} fila(s) requieren costo antes de confirmar (filas: ${numeros}) — el lote completo se rechaza.`
    );
  }
}
