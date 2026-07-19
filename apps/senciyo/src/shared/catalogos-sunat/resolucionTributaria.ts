// Fuente central única para interpretar el impuesto de un producto (estructurado vía `Tax`
// cuando existe, o la etiqueta de texto libre legado en su ausencia) y resolver el tratamiento
// tributario de una compra. Sin React, sin efectos secundarios — misma convención que
// validaciones-detraccion.ts.

import type { TratamientoImpuestoCompra } from '../../pages/Private/features/configuracion-sistema/contexto/ContextoConfiguracion';
import type { Tax } from '../../pages/Private/features/configuracion-sistema/modelos/Tax';

export type CategoriaTributariaImpuesto = 'gravado' | 'exonerado' | 'inafecto' | 'exportacion' | 'gratuita' | 'sin_configurar';

export interface ResultadoParseoEtiquetaImpuesto {
  categoria: CategoriaTributariaImpuesto;
  /** Tasa como fracción (0.18 = 18%). Siempre 0 para exonerado/inafecto/exportación/gratuita/sin_configurar. */
  tasa: number;
}

/**
 * Único parser de la etiqueta de impuesto libre del producto (`Product.impuesto`) — fuente para
 * productos SIN `impuestoId` estructurado. Reconoce las categorías reales del catálogo interno,
 * nunca infiere una tasa por defecto ante texto ambiguo o ausente.
 */
export function parsearEtiquetaImpuesto(etiqueta: string | undefined): ResultadoParseoEtiquetaImpuesto {
  const normalizada = (etiqueta ?? '').toLowerCase().trim();
  if (!normalizada) return { categoria: 'sin_configurar', tasa: 0 };

  if (normalizada.includes('exporta')) return { categoria: 'exportacion', tasa: 0 };
  if (normalizada.includes('gratuita')) return { categoria: 'gratuita', tasa: 0 };
  if (normalizada.includes('exonerado')) return { categoria: 'exonerado', tasa: 0 };
  if (normalizada.includes('inafecto')) return { categoria: 'inafecto', tasa: 0 };

  const porcentaje = normalizada.match(/(\d+(?:\.\d+)?)/);
  if (porcentaje) {
    const tasa = parseFloat(porcentaje[1]) / 100;
    if (!Number.isNaN(tasa)) return { categoria: 'gravado', tasa };
  }

  return { categoria: 'sin_configurar', tasa: 0 };
}

/** Mapa inverso: código de afectación (Catálogo 07 SUNAT) → categoría interna. Fuente: `Tax.affectationCode` real, nunca un literal duplicado en otro archivo. */
const CATEGORIA_POR_CODIGO_AFECTACION: Record<string, CategoriaTributariaImpuesto> = {
  '10': 'gravado',
  '20': 'exonerado',
  '30': 'inafecto',
  '40': 'exportacion',
};

/**
 * Estado de resolución — nunca se interpreta "no resuelto" como tasa 0%. `'resuelto'` es la única
 * categoría con la que un consumidor puede continuar el cálculo/guardado normal; `'pendiente_revision'`
 * (impuesto ausente/ambiguo/impuestoId inexistente) y `'no_soportado'` (categoría reconocida pero
 * que este alcance no procesa, ej. `'gratuita'`) deben bloquear la confirmación del documento con un
 * mensaje funcional (`motivoBloqueo`) — nunca continuar con una tasa asumida (ni 0% ni 18%).
 */
export type EstadoResolucionTributaria = 'resuelto' | 'pendiente_revision' | 'no_soportado';

function estadoDeCategoria(categoria: CategoriaTributariaImpuesto): EstadoResolucionTributaria {
  if (categoria === 'sin_configurar') return 'pendiente_revision';
  if (categoria === 'gratuita') return 'no_soportado';
  return 'resuelto';
}

function motivoBloqueoDeCategoria(categoria: CategoriaTributariaImpuesto): string | undefined {
  if (categoria === 'sin_configurar') {
    return 'El impuesto del producto no está configurado o su etiqueta no pudo interpretarse. Configura un impuesto válido antes de continuar.';
  }
  if (categoria === 'gratuita') {
    return 'Este documento no admite operaciones a título gratuito en este alcance.';
  }
  return undefined;
}

export interface ResolucionTributariaProducto {
  estado: EstadoResolucionTributaria;
  /** Categoría real resuelta — nunca proyectada a otra distinta para forzar el mismo resultado numérico (ej. 'gratuita' nunca se reporta como 'exonerado'). */
  categoria: CategoriaTributariaImpuesto;
  /** Presente únicamente cuando la resolución vino de un `Tax` estructurado (`origenResolucion==='impuesto_estructurado'`). */
  impuestoId?: string;
  /** Código del Catálogo 07 SUNAT: '10' Gravado, '20' Exonerado, '30' Inafecto, '40' Exportación. Vacío si no se pudo resolver o si `categoria` no tiene código propio (ej. 'gratuita'). */
  codigoAfectacion: string;
  tasa: number;
  /** null mientras la empresa no haya confirmado tratamientoImpuestoCompra, la categoría no tenga IGV que recuperar, o la política ('segun_afectacion') no tenga aún una determinación por línea. */
  esRecuperable: boolean | null;
  tratamientoAplicado: TratamientoImpuestoCompra;
  origenResolucion: 'impuesto_estructurado' | 'texto_legado_resuelto' | 'pendiente_revision';
  /** Mensaje funcional cuando `estado !== 'resuelto'` — el consumidor debe bloquear la confirmación del documento con este texto, nunca continuar calculando en silencio. */
  motivoBloqueo?: string;
}

// NOTA DE ALCANCE: `importeRecuperable`/`importeNoRecuperable` (montos, no solo la política) NO
// se calculan en esta función porque requieren el monto de IGV ya calculado de una línea
// concreta (`calcularLineaCompra`), algo que pertenece a `calcularCostoValorizableLinea` — una
// función de la Etapa 3 (§16.3 del diseño aprobado), fuera del alcance de la Etapa 0. Agregarlos
// aquí como campos siempre en 0 sería un campo sin efecto real; se documentan como pendiente
// explícito, no se inventan.

export interface DatosProductoParaResolucionTributaria {
  /** FK estructurada a `Tax.id` — fuente prioritaria cuando existe. */
  impuestoId?: string;
  /** Etiqueta de texto libre legado (`Product.impuesto`) — solo se usa cuando `impuestoId` está ausente o no resuelve contra `taxes`. */
  impuestoTexto?: string;
}

/**
 * Fuente central única de resolución tributaria — reemplaza el parseo disperso de la etiqueta de
 * impuesto. Prioridad: (1) `impuestoId` estructurado → (2) entidad `Tax` real → (3)
 * `affectationCode`/tasa de esa `Tax` → (4) recuperabilidad según `tratamientoEmpresa`. El texto
 * legado (`impuestoTexto`) SOLO se usa cuando no hay `impuestoId` resoluble — nunca como fuente
 * primaria para un producto que ya tiene la relación estructurada.
 */
export function resolverTratamientoTributarioProducto(
  producto: DatosProductoParaResolucionTributaria,
  tratamientoEmpresa: TratamientoImpuestoCompra,
  taxes: readonly Tax[] = [],
): ResolucionTributariaProducto {
  const taxEstructurado = producto.impuestoId
    ? taxes.find((t) => t.id === producto.impuestoId && t.isActive)
    : undefined;

  let categoria: CategoriaTributariaImpuesto;
  let tasa: number;
  let origenResolucion: ResolucionTributariaProducto['origenResolucion'];
  let impuestoId: string | undefined;

  if (taxEstructurado) {
    categoria = taxEstructurado.affectationCode
      ? (CATEGORIA_POR_CODIGO_AFECTACION[taxEstructurado.affectationCode] ?? 'sin_configurar')
      : 'sin_configurar';
    tasa = categoria === 'gravado' ? taxEstructurado.rate / 100 : 0;
    origenResolucion = categoria === 'sin_configurar' ? 'pendiente_revision' : 'impuesto_estructurado';
    impuestoId = taxEstructurado.id;
  } else {
    const parseo = parsearEtiquetaImpuesto(producto.impuestoTexto);
    categoria = parseo.categoria;
    tasa = parseo.tasa;
    origenResolucion = categoria === 'sin_configurar' ? 'pendiente_revision' : 'texto_legado_resuelto';
  }

  const codigoAfectacion = categoria === 'sin_configurar' ? '' : (
    Object.entries(CATEGORIA_POR_CODIGO_AFECTACION).find(([, c]) => c === categoria)?.[0] ?? ''
  );
  const estado = estadoDeCategoria(categoria);
  const motivoBloqueo = motivoBloqueoDeCategoria(categoria);
  const base = { estado, categoria, impuestoId, codigoAfectacion, tasa, tratamientoAplicado: tratamientoEmpresa, origenResolucion, motivoBloqueo };

  // Solo una línea gravada tiene IGV que pueda ser recuperable o no — el resto (incluida
  // 'gratuita', que además queda 'no_soportado' arriba) no tiene IGV que resolver.
  if (categoria !== 'gravado') {
    return { ...base, esRecuperable: null };
  }

  if (tratamientoEmpresa === 'impuesto_recuperable') {
    return { ...base, esRecuperable: true };
  }
  if (tratamientoEmpresa === 'impuesto_no_recuperable') {
    return { ...base, esRecuperable: false };
  }
  // 'pendiente_configuracion' y 'segun_afectacion' (sin una determinación por línea todavía
  // definida — esa granularidad es Etapa 3, §16.3 del diseño) quedan en esRecuperable=null: nunca
  // se asume recuperabilidad por defecto cuando la política no la determina explícitamente.
  return { ...base, esRecuperable: null };
}

/**
 * Bloqueo mínimo para consumidores que solo trabajan con la etiqueta de texto legado (Nota de
 * Ingreso / Nota de Salida — documentos que hoy no tienen relación `impuestoId` estructurada):
 * indica si la etiqueta no pudo interpretarse, para que el formulario bloquee la confirmación con
 * un mensaje funcional en vez de continuar calculando con una tasa 0% que en realidad es "no
 * resuelto", no una exoneración real. `'gratuita'` no se bloquea aquí (esa restricción — Compras
 * no admite operaciones a título gratuito — es una decisión propia de Compras, no de NI/NS).
 */
export function motivoImpuestoSinResolver(impuesto: string | undefined): string | undefined {
  const { categoria } = parsearEtiquetaImpuesto(impuesto);
  return categoria === 'sin_configurar'
    ? 'Hay productos con el impuesto sin configurar o sin poder interpretarse.'
    : undefined;
}
