// Utilidades para códigos compuestos de presentación usados en selectores de unidad.
// Un código compuesto tiene la forma "${codigoSunat}__${presentacionId}" (ej: "BX__pres-abc123").
// El código de unidad base siempre es un código SUNAT simple (ej: "NIU").

export const SEPARADOR_COMPUESTO = '__';

export const esCodigoPresentacion = (codigo: string): boolean =>
  typeof codigo === 'string' && codigo.includes(SEPARADOR_COMPUESTO);

export const extraerCodigoSunat = (codigo: string): string => {
  if (!codigo) return '';
  const idx = codigo.indexOf(SEPARADOR_COMPUESTO);
  return idx >= 0 ? codigo.slice(0, idx) : codigo;
};

export const extraerPresentacionId = (codigo: string): string | undefined => {
  if (!codigo || !esCodigoPresentacion(codigo)) return undefined;
  const idx = codigo.indexOf(SEPARADOR_COMPUESTO);
  const resto = codigo.slice(idx + SEPARADOR_COMPUESTO.length);
  return resto || undefined;
};

export const armarCodigoPresentacion = (codigoSunat: string, presentacionId: string): string =>
  `${codigoSunat}${SEPARADOR_COMPUESTO}${presentacionId}`;
