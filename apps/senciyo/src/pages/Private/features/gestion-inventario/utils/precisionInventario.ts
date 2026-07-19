// gestion-inventario/utils/precisionInventario.ts
//
// Política técnica centralizada de precisión numérica del Kardex Valorizado (§17.3 del diseño
// aprobado). Estas constantes son decisiones técnicas fijas del motor de costeo — NUNCA
// configuración de usuario ni de tenant, y nunca se redefinen en otro archivo. Ninguna moneda,
// tasa de cambio ni `currencyManager` se referencia aquí: la precisión de PRESENTACIÓN (decimales
// por moneda) sigue viviendo exclusivamente en `currencyManager`/`normalizarImporte` (ya
// existentes) — esta utilidad solo cubre la precisión INTERNA de cantidades, factores y costos.

/** Cantidad de un producto expresada en su unidad mínima (ej. 2.5 kg, 3.333333 litros de un envase parcial). */
export const PRECISION_CANTIDAD_UNIDAD_MINIMA = 6;

/** Factor de conversión entre una presentación comercial y la unidad mínima. */
export const PRECISION_FACTOR_CONVERSION = 8;

/** Costo unitario interno (por unidad mínima), en moneda original y en moneda base — la precisión más alta del sistema. */
export const PRECISION_COSTO_UNITARIO_INTERNO = 8;

/**
 * Tipo de cambio aplicado: se resuelve centralmente desde `currencyManager` en el momento de la
 * operación (§17.1) — esta constante NO es una tasa, es únicamente la precisión de
 * ALMACENAMIENTO del valor ya capturado (misma precisión que el costo unitario interno, nunca los
 * `decimalPlaces` de presentación de la moneda).
 */
export const PRECISION_TIPO_CAMBIO_ALMACENADO = PRECISION_COSTO_UNITARIO_INTERNO;

/**
 * Redondea un número a una cantidad exacta de decimales, sin usar `toFixed()` como lógica de
 * negocio (`toFixed()` devuelve `string` y arrastra el error de representación de punto flotante
 * cuando se vuelve a parsear). Única función de redondeo interna permitida en código nuevo del
 * Kardex Valorizado — no muta el valor recibido (los `number` de JS son inmutables por valor) y
 * siempre devuelve un `number` finito.
 *
 * `decimales` debe ser un entero ≥ 0: nunca se acepta una cantidad de decimales negativa (no
 * tiene significado numérico) ni fraccionaria. `valor` debe ser finito: `NaN`/`Infinity` no tienen
 * una representación redondeada válida y esconderían un error de cálculo previo si se dejaran
 * pasar en silencio.
 */
export function redondearAPrecision(valor: number, decimales: number): number {
  if (!Number.isFinite(valor)) {
    throw new Error(`redondearAPrecision: "valor" debe ser un número finito (recibido: ${valor}).`);
  }
  if (!Number.isInteger(decimales) || decimales < 0) {
    throw new Error(`redondearAPrecision: "decimales" debe ser un entero mayor o igual a 0 (recibido: ${decimales}).`);
  }

  // El resultado real de `10 ** decimales` es lo único que determina si la escala es
  // representable — nunca un máximo de decimales hardcodeado: para `decimales` suficientemente
  // grande, `10 ** decimales` desborda a `Infinity` (ej. decimales=309), y arrastraría un `NaN`
  // hasta el resultado final si no se detuviera aquí.
  const factor = 10 ** decimales;
  if (!Number.isFinite(factor)) {
    throw new Error(`redondearAPrecision: el factor de escala (10 ** ${decimales}) no es representable como número finito — "decimales" es demasiado grande.`);
  }

  // El producto intermedio también puede desbordar aunque "valor" y "factor" sean finitos por
  // separado (ej. un "valor" cercano a Number.MAX_VALUE con un "factor" grande) — se valida antes
  // de redondear, nunca después.
  const valorEscalado = (valor + Number.EPSILON) * factor;
  if (!Number.isFinite(valorEscalado)) {
    throw new Error(`redondearAPrecision: el cálculo intermedio (valor × factor) no es finito para valor=${valor}, decimales=${decimales}.`);
  }

  const resultado = Math.round(valorEscalado) / factor;
  if (!Number.isFinite(resultado)) {
    throw new Error(`redondearAPrecision: el resultado final no es un número finito para valor=${valor}, decimales=${decimales}.`);
  }

  return resultado;
}
