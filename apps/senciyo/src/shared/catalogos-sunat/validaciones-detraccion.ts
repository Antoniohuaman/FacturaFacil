// Validaciones puras de coherencia normativa entre tipo de producto, impuesto y código Cat.54.
// Sin React, sin imports de UI, sin side effects.
// Reutilizado por: formulario de producto, importación masiva, validación defensiva en emisión.

import { CATALOGO_54_DETRACCIONES } from './catalogos-tributarios';
import { esCodigoHabilitadoParaEmision } from './calculo-detraccion';
import type { CodigoDetraccionTributaria } from './tipos-catalogos-tributarios';
import { parsearEtiquetaImpuesto } from './resolucionTributaria';

// ─── Tipos ────────────────────────────────────────────────────────────

export type TipoProductoDetraccion = 'BIEN' | 'SERVICIO';

/** Afectación IGV resuelta desde el impuesto del producto. */
export type AfectacionIgv = 'gravado' | 'exonerado' | 'inafecto' | 'exportacion' | 'desconocido';

export interface ResultadoValidacionDetraccion {
  valido: boolean;
  /** Si es true, la combinación debe bloquearse. Si es false, solo es advertencia. */
  esBloqueo: boolean;
  mensaje?: string;
}

// ─── Resolver afectación desde impuesto string ────────────────────────

/**
 * Convierte el string de impuesto del formulario/importación a un enum interno.
 * Ejemplos: 'IGV (18.00%)' → 'gravado', 'Exonerado (0.00%)' → 'exonerado'
 *
 * Adaptador delgado sobre `parsearEtiquetaImpuesto` (shared/catalogos-sunat/resolucionTributaria.ts)
 * — ya no reimplementa su propia detección de palabras clave. Corrección obligatoria: antes
 * bastaba que la etiqueta contuviera la subcadena "igv" para resolver 'gravado', sin exigir un
 * porcentaje numérico; ahora exige lo mismo que la fuente central (un número parseable), igual
 * que el resto de los adaptadores — sin comportamientos divergentes entre ellos.
 * `'gratuita'` (sin categoría propia en `AfectacionIgv`) se proyecta a `'exonerado'`, misma tasa 0.
 */
export function resolverAfectacionDesdeImpuesto(impuesto: string): AfectacionIgv {
  const { categoria } = parsearEtiquetaImpuesto(impuesto);
  if (categoria === 'sin_configurar') return 'desconocido';
  if (categoria === 'gratuita') return 'exonerado';
  return categoria;
}

// ─── Clasificaciones compatibles por tipo de producto ─────────────────
// Basadas en el campo `clasificacion` de CATALOGO_54_DETRACCIONES.

const CLASIFICACIONES_BIEN: ReadonlySet<string> = new Set([
  'Bien',
  'Bien inmueble',
  'Recurso hidrobiológico',
]);

const CLASIFICACIONES_SERVICIO: ReadonlySet<string> = new Set([
  'Servicio',
  'Transporte pasajeros',
  'Transporte carga',
  'Construcción',
]);

export function clasificacionesCompatiblesPorTipoProducto(
  tipoProducto: TipoProductoDetraccion,
): ReadonlySet<string> {
  return tipoProducto === 'BIEN' ? CLASIFICACIONES_BIEN : CLASIFICACIONES_SERVICIO;
}

// ─── Consultas sobre el catálogo ──────────────────────────────────────

/** Devuelve los códigos activos y habilitados para emisión, filtrados por tipo de producto. */
export function obtenerCodigosDetraccionCompatibles(
  tipoProducto: TipoProductoDetraccion,
): CodigoDetraccionTributaria[] {
  const compatibles = clasificacionesCompatiblesPorTipoProducto(tipoProducto);
  return CATALOGO_54_DETRACCIONES.filter(
    (c) => c.activo && esCodigoHabilitadoParaEmision(c.codigo) && compatibles.has(c.clasificacion),
  );
}

/**
 * Devuelve los códigos compatibles con la combinación tipo de producto + impuesto.
 * Usa `afectacionesCompatibles` del catálogo para un filtro exacto sin heurísticas de texto.
 * Si el impuesto es inafecto, exportación o desconocido, retorna lista vacía (sin opciones seguras).
 */
export function obtenerCodigosDetraccionCompatiblesConImpuesto(
  tipoProducto: TipoProductoDetraccion,
  impuesto: string,
): CodigoDetraccionTributaria[] {
  const base = obtenerCodigosDetraccionCompatibles(tipoProducto);
  if (!impuesto.trim()) return base;

  const afectacion = resolverAfectacionDesdeImpuesto(impuesto);

  // Sin afectación confirmada compatible → no mostrar opciones dudosas
  if (afectacion === 'inafecto' || afectacion === 'exportacion' || afectacion === 'desconocido') {
    return [];
  }

  // Filtrar por afectacionesCompatibles del catálogo
  return base.filter((c) => c.afectacionesCompatibles.includes(afectacion));
}

/** Indica si el código Cat.54 es compatible con el tipo de producto. */
export function esCodigoCompatibleConTipoProducto(
  codigoCat54: string,
  tipoProducto: TipoProductoDetraccion,
): boolean {
  const entrada = CATALOGO_54_DETRACCIONES.find((c) => c.codigo === codigoCat54);
  if (!entrada) return false;
  return clasificacionesCompatiblesPorTipoProducto(tipoProducto).has(entrada.clasificacion);
}

// ─── Validación por impuesto (string del formulario) ──────────────────

/** Recibe impuesto como string del formulario/importación (ej. 'IGV (18.00%)').  */
export function validarCoherenciaCodigoConImpuesto(
  codigoCat54: string,
  impuesto: string,
): ResultadoValidacionDetraccion {
  const entrada = CATALOGO_54_DETRACCIONES.find((c) => c.codigo === codigoCat54);
  if (!entrada) {
    return { valido: false, esBloqueo: true, mensaje: 'Código de detracción no encontrado en el Catálogo 54.' };
  }

  if (!impuesto.trim()) return { valido: true, esBloqueo: false };

  const afectacion = resolverAfectacionDesdeImpuesto(impuesto);

  if (afectacion === 'inafecto') {
    return {
      valido: false,
      esBloqueo: true,
      mensaje: 'No hay códigos de detracción habilitados para productos inafectos.',
    };
  }

  if (afectacion === 'exportacion') {
    return {
      valido: false,
      esBloqueo: true,
      mensaje: 'No hay códigos de detracción habilitados para operaciones de exportación.',
    };
  }

  if (afectacion === 'desconocido') return { valido: true, esBloqueo: false };

  // gravado | exonerado: verificar contra afectacionesCompatibles del catálogo
  if (!entrada.afectacionesCompatibles.includes(afectacion)) {
    const labelCodigo = afectacion === 'gravado' ? 'exonerados' : 'gravados con el IGV';
    const labelProducto = afectacion === 'gravado' ? 'gravado con IGV' : 'exonerado';
    return {
      valido: false,
      esBloqueo: true,
      mensaje:
        `El código de detracción seleccionado corresponde a bienes/servicios ${labelCodigo}, ` +
        `pero el producto está configurado como ${labelProducto}.`,
    };
  }

  return { valido: true, esBloqueo: false };
}

// ─── Validación por igvType (enum del motor de comprobantes) ──────────

export type IgvTypeDetraccion = 'igv18' | 'igv10' | 'exonerado' | 'inafecto';

/** Versión de validarCoherenciaCodigoConImpuesto que acepta igvType del CartItem. */
export function validarCoherenciaCodigoConIgvType(
  codigoCat54: string,
  igvType: IgvTypeDetraccion,
): ResultadoValidacionDetraccion {
  const mapeo: Record<IgvTypeDetraccion, string> = {
    igv18: 'IGV (18.00%)',
    igv10: 'IGV (10.00%)',
    exonerado: 'Exonerado (0.00%)',
    inafecto: 'Inafecto (0.00%)',
  };
  return validarCoherenciaCodigoConImpuesto(codigoCat54, mapeo[igvType]);
}

// ─── Validación por tipo de producto ──────────────────────────────────

/** Valida coherencia entre clasificación Cat.54 y tipo de producto (BIEN/SERVICIO). */
export function validarCoherenciaCodigoConTipoProducto(
  codigoCat54: string,
  tipoProducto: TipoProductoDetraccion,
): ResultadoValidacionDetraccion {
  if (esCodigoCompatibleConTipoProducto(codigoCat54, tipoProducto)) {
    return { valido: true, esBloqueo: false };
  }
  const tipoLabel = tipoProducto === 'BIEN' ? 'bien' : 'servicio';
  return {
    valido: false,
    esBloqueo: true,
    mensaje: `El código de detracción seleccionado no corresponde al tipo de producto (${tipoLabel}).`,
  };
}

// ─── Validación completa combinada ────────────────────────────────────

export interface ParamsValidacionDetraccion {
  codigoCat54: string;
  tipoProducto: TipoProductoDetraccion;
  impuesto: string;
}

/**
 * Ejecuta todas las validaciones de coherencia en orden de prioridad.
 * Retorna el primer error bloqueante encontrado, o `valido: true` si no hay problemas.
 */
export function validarCoherenciaCompleta(
  params: ParamsValidacionDetraccion,
): ResultadoValidacionDetraccion {
  const { codigoCat54, tipoProducto, impuesto } = params;

  const vTipo = validarCoherenciaCodigoConTipoProducto(codigoCat54, tipoProducto);
  if (!vTipo.valido && vTipo.esBloqueo) return vTipo;

  const vIgv = validarCoherenciaCodigoConImpuesto(codigoCat54, impuesto);
  if (!vIgv.valido && vIgv.esBloqueo) return vIgv;

  if (!vTipo.valido) return vTipo;
  if (!vIgv.valido) return vIgv;

  return { valido: true, esBloqueo: false };
}
