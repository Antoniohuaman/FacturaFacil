// shared/numbering/correlativoInterno.ts
//
// Utilidad genérica de numeración correlativa interna — fuente única para
// cualquier secuencia con formato "PREFIJO-00000001". `siguienteNumeroPago`
// (Compras/Pagos, serie "PG" compartida entre Compras y Gastos) y
// `siguienteReferenciaInternaGasto` (Gastos, prefijo "GTO") consumen AMBAS
// esta misma función con secuencias independientes — nunca una depende de
// la otra, nunca una cuarta implementación copiada del algoritmo.

export interface ParametrosSiguienteCorrelativoInterno<T> {
  registros: readonly T[];
  obtenerNumero: (registro: T) => string;
  prefijo: string;
  /** Cantidad de dígitos del correlativo, con ceros a la izquierda. Default 8 (mismo formato ya usado por PG y GTO). */
  longitud?: number;
}

export function siguienteCorrelativoInterno<T>({
  registros,
  obtenerNumero,
  prefijo,
  longitud = 8,
}: ParametrosSiguienteCorrelativoInterno<T>): string {
  const existentes = registros
    .map(obtenerNumero)
    .filter((numero) => numero.startsWith(`${prefijo}-`))
    .map((numero) => parseInt(numero.split('-').pop() ?? '0', 10))
    .filter((n) => !isNaN(n));
  const siguiente = existentes.length > 0 ? Math.max(...existentes) + 1 : 1;
  return `${prefijo}-${String(siguiente).padStart(longitud, '0')}`;
}
