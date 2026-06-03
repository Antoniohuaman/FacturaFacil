// Motor puro de cálculo y evaluación de detracciones SPOT.
// Sin UI, sin side effects, sin imports de React.
// Consume exclusivamente los catálogos existentes de la fuente de verdad.

import { CATALOGO_54_DETRACCIONES } from './catalogos-tributarios';
import type { CodigoDetraccionTributaria } from './tipos-catalogos-tributarios';

// ─── Constantes normativas ───────────────────────────────────────────

const UMBRAL_GENERAL_PEN = 700;
const UMBRAL_TRANSPORTE_PEN = 400;

const CODIGOS_UMBRAL_TRANSPORTE = new Set(['026', '027', '028']);
const CODIGOS_BLOQUEADOS = new Set(['002', '099']);
const CODIGOS_CONDICIONALES = new Set(['004']);
const TIPO_OPERACION_VENTA_INTERNA = '0101';

// ─── Tipos de entrada ────────────────────────────────────────────────

export interface ItemEvaluableDetraccion {
  /** ID del ítem para reportar cuáles están en conflicto. */
  id?: string;
  sujetoDetraccion?: boolean;
  codigoDetraccion?: string | null;
  tipoDetalle?: string;
}

export interface EntradaEvaluacionDetraccion {
  tipoComprobante: string;
  items: ItemEvaluableDetraccion[];
  /** Total del documento ya convertido a PEN. */
  totalEnPen: number;
  moneda: string;
  tipoCambio: number | null;
  redondearMonto: boolean;
}

export interface ResultadoEvaluacionDetraccion {
  aplica: boolean;
  codigoDetraccion: string | null;
  descripcionDetraccion: string | null;
  tipoOperacion: string;
  porcentaje: number | null;
  montoDetraccion: number;
  montoDetraccionRedondeado: number;
  montoParaDeposito: number;
  netoACobrar: number;
  totalComprobante: number;
  monedaCalculo: string;
  errores: string[];
  /** IDs de los ítems que generan el conflicto (para marcado visual en la tabla). */
  idsItemsEnConflicto: string[];
}

// ─── Funciones públicas ──────────────────────────────────────────────

/** Umbral aplicable para un código Cat.54. */
export function obtenerUmbralDetraccionPorCodigo(codigoCat54: string): number {
  return CODIGOS_UMBRAL_TRANSPORTE.has(codigoCat54)
    ? UMBRAL_TRANSPORTE_PEN
    : UMBRAL_GENERAL_PEN;
}

/** Tipo de operación Cat.51 derivado del código Cat.54. */
export function resolverTipoOperacionDetraccion(codigoCat54: string | null): string {
  if (!codigoCat54) return TIPO_OPERACION_VENTA_INTERNA;
  const entrada = CATALOGO_54_DETRACCIONES.find((c) => c.codigo === codigoCat54);
  return entrada?.tipoOperacionRelacionado ?? TIPO_OPERACION_VENTA_INTERNA;
}

/**
 * Valida que no haya mezcla de ítems de catálogo sujetos y no sujetos.
 * Devuelve error y los IDs de los ítems no sujetos (los problemáticos).
 */
export function validarReglasDetraccion(items: ItemEvaluableDetraccion[]): {
  error: string | null;
  idsConflicto: string[];
} {
  const catalogoItems = items.filter((i) => i.tipoDetalle !== 'libre');
  if (catalogoItems.length === 0) return { error: null, idsConflicto: [] };

  const sujetos = catalogoItems.filter((i) => i.sujetoDetraccion === true && i.codigoDetraccion);
  const noSujetos = catalogoItems.filter((i) => !i.sujetoDetraccion || !i.codigoDetraccion);

  if (sujetos.length > 0 && noSujetos.length > 0) {
    return {
      error:
        'El comprobante contiene productos sin código de detracción. ' +
        'Actualiza el producto o emite comprobantes separados.',
      idsConflicto: noSujetos.map((i) => i.id ?? '').filter(Boolean),
    };
  }
  return { error: null, idsConflicto: [] };
}

/**
 * Resuelve el código único de detracción de los ítems sujetos.
 * Devuelve error y los IDs de todos los ítems si hay múltiples códigos.
 */
export function resolverCodigoDetraccion(items: ItemEvaluableDetraccion[]): {
  codigo: string | null;
  error: string | null;
  idsConflicto: string[];
} {
  const sujetos = items.filter(
    (i) => i.tipoDetalle !== 'libre' && i.sujetoDetraccion === true && i.codigoDetraccion,
  );
  if (sujetos.length === 0) return { codigo: null, error: null, idsConflicto: [] };

  const codigos = new Set(sujetos.map((i) => i.codigoDetraccion!));
  if (codigos.size > 1) {
    return {
      codigo: null,
      error:
        'El comprobante contiene productos con distintos códigos de detracción. ' +
        'Usa productos con el mismo código o emite comprobantes separados.',
      idsConflicto: sujetos.map((i) => i.id ?? '').filter(Boolean),
    };
  }
  return { codigo: [...codigos][0], error: null, idsConflicto: [] };
}

/** Montos de detracción (exacto, redondeado, para depósito). */
export function calcularMontoDetraccion(
  totalPen: number,
  porcentaje: number,
  redondear: boolean,
): { montoDetraccion: number; montoDetraccionRedondeado: number; montoParaDeposito: number } {
  const montoDetraccion = (totalPen * porcentaje) / 100;
  const montoDetraccionRedondeado = Math.round(montoDetraccion);
  return {
    montoDetraccion,
    montoDetraccionRedondeado,
    montoParaDeposito: redondear ? montoDetraccionRedondeado : montoDetraccion,
  };
}

/**
 * Motor principal: evalúa si aplica detracción y calcula montos.
 *
 * Orden deliberado:
 * 1. Solo facturas.
 * 2. USD sin tipo de cambio → error.
 * 3. Sin ítems sujetos → venta interna (sin errores).
 * 4. Total < umbral mínimo posible (S/400) → venta interna (sin errores).
 * 5. Mezcla sujeto/no-sujeto → error con IDs de ítems conflictivos.
 * 6. Múltiples códigos → error con IDs de ítems conflictivos.
 * 7. Umbral específico del código → venta interna si no lo supera (sin errores).
 * 8. Código bloqueado/condicional → error.
 * 9. Calcular y devolver con aplica: true.
 *
 * Los errores de conflicto (pasos 5 y 6) solo se muestran cuando el total
 * ya supera el umbral mínimo posible, evitando alertas prematuras.
 */
export function evaluarDetraccion(
  entrada: EntradaEvaluacionDetraccion,
): ResultadoEvaluacionDetraccion {
  const sinDetraccion: ResultadoEvaluacionDetraccion = {
    aplica: false,
    codigoDetraccion: null,
    descripcionDetraccion: null,
    tipoOperacion: TIPO_OPERACION_VENTA_INTERNA,
    porcentaje: null,
    montoDetraccion: 0,
    montoDetraccionRedondeado: 0,
    montoParaDeposito: 0,
    netoACobrar: entrada.totalEnPen,
    totalComprobante: entrada.totalEnPen,
    monedaCalculo: 'PEN',
    errores: [],
    idsItemsEnConflicto: [],
  };

  // 1. Solo facturas
  if (entrada.tipoComprobante !== 'factura') return sinDetraccion;

  // 2. USD sin tipo de cambio
  if (entrada.moneda !== 'PEN' && !entrada.tipoCambio) {
    return {
      ...sinDetraccion,
      errores: ['Configure el tipo de cambio antes de emitir con detracción.'],
    };
  }

  // 3. Sin ítems sujetos → venta interna normal, sin mensajes
  const hayItemsSujetos = entrada.items.some(
    (i) => i.tipoDetalle !== 'libre' && i.sujetoDetraccion === true && i.codigoDetraccion,
  );
  if (!hayItemsSujetos) return sinDetraccion;

  // 4. Total < umbral mínimo posible → venta interna sin errores
  if (entrada.totalEnPen < UMBRAL_TRANSPORTE_PEN) return sinDetraccion;

  // 5. Mezcla sujeto/no-sujeto → error con IDs
  const { error: errorMezcla, idsConflicto: idsConflictoMezcla } =
    validarReglasDetraccion(entrada.items);
  if (errorMezcla) {
    return { ...sinDetraccion, errores: [errorMezcla], idsItemsEnConflicto: idsConflictoMezcla };
  }

  // 6. Múltiples códigos → error con IDs
  const {
    codigo,
    error: errorCodigo,
    idsConflicto: idsConflictoCodigos,
  } = resolverCodigoDetraccion(entrada.items);
  if (errorCodigo) {
    return { ...sinDetraccion, errores: [errorCodigo], idsItemsEnConflicto: idsConflictoCodigos };
  }
  if (!codigo) return sinDetraccion;

  // 7. Umbral específico del código (S/400 transporte, S/700 general)
  if (entrada.totalEnPen < obtenerUmbralDetraccionPorCodigo(codigo)) return sinDetraccion;

  // 8. Código bloqueado o condicional
  if (CODIGOS_BLOQUEADOS.has(codigo) || CODIGOS_CONDICIONALES.has(codigo)) {
    return {
      ...sinDetraccion,
      errores: [
        'Este código de detracción requiere validación especial y no está habilitado para emisión automática.',
      ],
    };
  }

  // Buscar en catálogo
  const entrada54: CodigoDetraccionTributaria | undefined = CATALOGO_54_DETRACCIONES.find(
    (c) => c.codigo === codigo,
  );
  if (!entrada54 || !entrada54.activo || entrada54.porcentajeNormativo === null) {
    return {
      ...sinDetraccion,
      errores: [
        'Este código de detracción requiere validación especial y no está habilitado para emisión automática.',
      ],
    };
  }

  // 9. Calcular
  const { montoDetraccion, montoDetraccionRedondeado, montoParaDeposito } =
    calcularMontoDetraccion(
      entrada.totalEnPen,
      entrada54.porcentajeNormativo,
      entrada.redondearMonto,
    );

  return {
    aplica: true,
    codigoDetraccion: codigo,
    descripcionDetraccion: entrada54.descripcion,
    tipoOperacion: resolverTipoOperacionDetraccion(codigo),
    porcentaje: entrada54.porcentajeNormativo,
    montoDetraccion,
    montoDetraccionRedondeado,
    montoParaDeposito,
    netoACobrar: entrada.totalEnPen - montoDetraccionRedondeado,
    totalComprobante: entrada.totalEnPen,
    monedaCalculo: 'PEN',
    errores: [],
    idsItemsEnConflicto: [],
  };
}
