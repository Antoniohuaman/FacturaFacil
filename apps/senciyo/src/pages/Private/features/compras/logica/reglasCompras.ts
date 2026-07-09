import type { OrdenCompra, EstadoPrincipalOC } from '../modelos/OrdenCompra';
import type { ComprobanteCompra, EstadoPagoCC } from '../modelos/ComprobanteCompra';
import type { CuentaPorPagar, EstadoPagoCxP } from '../modelos/CuentaPorPagar';
import type { PagoCompra } from '../modelos/PagoCompra';
import type { LineaCompra, TipoAfectacionCompra } from '../modelos/LineaCompra';
import type { ErrorValidacion } from '../servicios/tiposServiciosCompras';

/**
 * Único estado principal vigente de la OC, derivado de sus dimensiones
 * internas (estadoDocumento, estadoAprobacion, relaciones). Precedencia:
 * anulada > borrador > convertida > aprobación. Una OC anulada nunca vuelve
 * a mostrar "Aprobada" como vigente; "Convertida" exige una relación real
 * persistida (comprobante de compra generado), no solo una acción disparada.
 */
export function calcularEstadoPrincipalOC(oc: OrdenCompra): EstadoPrincipalOC {
  if (oc.estadoDocumento === 'anulado') return 'Anulada';
  if (oc.estadoDocumento === 'borrador') return 'Borrador';
  if ((oc.comprobantesCompraRelacionados?.length ?? 0) > 0) return 'Convertida';
  if (oc.estadoAprobacion === 'no_aprobada') return 'No Aprobada';
  if (oc.estadoAprobacion === 'pendiente') return 'Pendiente de aprobación';
  if (oc.estadoAprobacion === 'aprobada') return 'Aprobada';
  return 'Registrada';
}

/** Única lista de estados principales, reutilizada por el filtro del listado (no crear un array paralelo). */
export const ESTADOS_PRINCIPALES_OC: EstadoPrincipalOC[] = [
  'Borrador',
  'Registrada',
  'Pendiente de aprobación',
  'Aprobada',
  'No Aprobada',
  'Anulada',
  'Convertida',
];

/**
 * Una OC "Registrada" (sin requerir aprobación) también es editable mientras
 * no tenga documentos derivados (mismo chequeo que bloquea su anulación) ni
 * esté en un estado ya cerrado del ciclo.
 */
export function puedeEditarOC(oc: OrdenCompra): boolean {
  const estado = calcularEstadoPrincipalOC(oc);
  if (estado === 'Borrador' || estado === 'No Aprobada') return true;
  if (estado === 'Registrada') return motivoBloqueoAnulacionOC(oc) === null;
  return false;
}

export function puedeEliminarBorradorOC(oc: OrdenCompra): boolean {
  return calcularEstadoPrincipalOC(oc) === 'Borrador';
}

/**
 * Regla de adjuntos por estado (sección 11 del alcance): eliminar solo se
 * permite mientras la orden sigue en trámite (borrador, registrada o
 * pendiente de aprobación); una vez aprobada/no aprobada/anulada/convertida,
 * los adjuntos quedan fijos como sustento documental. Descargar nunca se
 * bloquea en ningún estado.
 */
export function puedeEliminarAdjuntoOC(oc: OrdenCompra): boolean {
  const estado = calcularEstadoPrincipalOC(oc);
  return estado === 'Borrador' || estado === 'Registrada' || estado === 'Pendiente de aprobación';
}

export function puedeAprobarOC(oc: OrdenCompra): boolean {
  return oc.requiereAprobacion && oc.estadoAprobacion === 'pendiente';
}

export function puedeRechazarOC(oc: OrdenCompra): boolean {
  return oc.requiereAprobacion && oc.estadoAprobacion === 'pendiente';
}

export function puedeGenerarCCDesdeOC(oc: OrdenCompra): boolean {
  return (
    oc.estadoDocumento === 'registrado' &&
    (oc.estadoAprobacion === 'aprobada' || oc.estadoAprobacion === 'no_requiere')
  );
}

/**
 * Determina si una OC puede anularse, o el motivo puntual del bloqueo.
 * Una OC con documentos derivados activos (comprobante de compra o nota de
 * ingreso) no puede anularse directamente: primero deben resolverse esos
 * derivados (anular el comprobante, etc.).
 */
export function motivoBloqueoAnulacionOC(oc: OrdenCompra): string | null {
  if (oc.estadoDocumento === 'anulado') return 'La orden de compra ya se encuentra anulada.';
  if (oc.estadoDocumento === 'cerrado') return 'La orden de compra ya se encuentra cerrada.';
  if ((oc.comprobantesCompraRelacionados?.length ?? 0) > 0) {
    return 'No se puede anular la orden porque ya tiene un comprobante de compra relacionado.';
  }
  if ((oc.notasIngresoRelacionadas?.length ?? 0) > 0) {
    return 'No se puede anular la orden porque ya tiene una nota de ingreso relacionada.';
  }
  return null;
}

export function puedeAnularOC(oc: OrdenCompra): boolean {
  return motivoBloqueoAnulacionOC(oc) === null;
}

export function puedeCerrarOC(oc: OrdenCompra): boolean {
  return oc.estadoDocumento === 'registrado';
}

/**
 * Determina si un comprobante de compra puede anularse, o el motivo puntual
 * del bloqueo. No puede anularse si ya tiene pagos aplicados (estadoPago
 * distinto de 'pendiente') ni si ya tiene una nota de ingreso o movimiento de
 * inventario relacionado.
 */
export function motivoBloqueoAnulacionCC(cc: ComprobanteCompra): string | null {
  if (cc.estadoDocumento === 'anulado') return 'El comprobante de compra ya se encuentra anulado.';
  if (cc.estadoDocumento !== 'registrado') {
    return 'Solo se puede anular un comprobante de compra registrado.';
  }
  if (cc.estadoPago !== 'pendiente') {
    return 'No se puede anular el comprobante porque tiene pagos registrados. Anula primero el pago relacionado.';
  }
  if (
    (cc.notasIngresoRelacionadas?.length ?? 0) > 0 ||
    (cc.movimientosInventarioRelacionados?.length ?? 0) > 0
  ) {
    return 'No se puede anular el comprobante porque tiene una nota de ingreso o un movimiento de inventario relacionado.';
  }
  return null;
}

export function puedeAnularCC(cc: ComprobanteCompra): boolean {
  return motivoBloqueoAnulacionCC(cc) === null;
}

export function puedeRegistrarPago(cxp: CuentaPorPagar): boolean {
  return cxp.estadoPago === 'pendiente' || cxp.estadoPago === 'parcial';
}

export function motivoBloqueoAnulacionPago(pago: PagoCompra): string | null {
  if (pago.estadoDocumento === 'anulado') return 'Este pago ya fue anulado.';
  return null;
}

export function puedeAnularPago(pago: PagoCompra): boolean {
  return motivoBloqueoAnulacionPago(pago) === null;
}

/**
 * Resuelve el nombre específico de la forma de pago de una OC (nombre real
 * del método de Configuración → Formas de pago, o el snapshot de
 * condicionesPago si ya lo tiene grabado), en vez de reducir a "Contado"/
 * "Crédito" genérico. Única fuente para drawer, listado e impresión.
 */
export function resolverNombreFormaPagoOC(
  oc: Pick<OrdenCompra, 'formaPago' | 'formaPagoMetodoId' | 'condicionesPago'>,
  metodosPago: Array<{ id: string; name: string }>,
): string {
  const metodo = metodosPago.find((m) => m.id === oc.formaPagoMetodoId);
  return metodo?.name ?? oc.condicionesPago ?? (oc.formaPago === 'contado' ? 'Contado' : 'Crédito');
}

/**
 * Identificador centralizado de "compra a crédito". La forma de pago es un
 * tipo literal ('contado' | 'credito'), no texto libre, por lo que comparar
 * contra 'credito' es seguro y no constituye un hardcode disperso.
 */
export function esCompraACredito(formaPago: 'contado' | 'credito'): boolean {
  return formaPago === 'credito';
}

/**
 * Valida que la fecha de vencimiento esté presente cuando la compra es a
 * crédito, y que sea coherente (igual o posterior) con la fecha del
 * documento/emisión cuando ambas existen.
 */
export function validarFechaVencimientoCredito(
  formaPago: 'contado' | 'credito',
  fechaDocumento: string | undefined,
  fechaVencimiento: string | undefined,
  campo = 'fechaVencimiento',
): ErrorValidacion[] {
  const errores: ErrorValidacion[] = [];

  if (esCompraACredito(formaPago) && !fechaVencimiento) {
    errores.push({
      campo,
      mensaje: 'La fecha de vencimiento es obligatoria para compras a crédito.',
    });
    return errores;
  }

  if (fechaVencimiento && fechaDocumento && fechaVencimiento < fechaDocumento) {
    errores.push({
      campo,
      mensaje: 'La fecha de vencimiento debe ser igual o posterior a la fecha del documento.',
    });
  }

  return errores;
}

/** Deriva el estadoPago del comprobante de compra a partir del estadoPago de su CxP. */
export function recalcularEstadoPagoComprobante(estadoPagoCxP: EstadoPagoCxP): EstadoPagoCC {
  if (estadoPagoCxP === 'pagada') return 'pagado';
  if (estadoPagoCxP === 'parcial') return 'parcial';
  return 'pendiente';
}

/**
 * Valida que el tipo de cambio esté presente y sea válido cuando la moneda
 * del documento es distinta de la moneda base. La moneda base se recibe como
 * parámetro (viene de Configuración) para no hardcodear "PEN": un tenant
 * puede tener una moneda base distinta.
 */
export function validarTipoCambioRequerido(
  moneda: string,
  monedaBase: string,
  tipoCambio: number | undefined,
  campo = 'tipoCambio',
): ErrorValidacion[] {
  if (moneda === monedaBase) return [];

  if (!tipoCambio || tipoCambio <= 0) {
    return [
      {
        campo,
        mensaje: `El tipo de cambio es obligatorio y debe ser mayor a 0 cuando la moneda (${moneda}) es distinta de la moneda base (${monedaBase}).`,
      },
    ];
  }

  return [];
}

/**
 * Valida las reglas comunes a las líneas de OC y CC (única fuente de verdad,
 * usada por validarOrdenCompraBasica y validarComprobanteCompraBasico):
 * - toda línea debe provenir de un producto real del catálogo (productoId),
 * - el producto debe tener unidad de medida configurada,
 * - el producto debe tener impuesto configurado,
 * - cantidad mayor a 0,
 * - costo unitario no negativo,
 * - almacén destino obligatorio si la línea afecta inventario,
 * - descuento no negativo,
 * - total de línea no negativo.
 */
export function validarLineasCompra(lineas: LineaCompra[]): ErrorValidacion[] {
  const errores: ErrorValidacion[] = [];

  lineas.forEach((linea, i) => {
    const prefijo = `lineas[${i}]`;
    const nombre = linea.nombreProducto || 'línea sin nombre';

    if (!linea.productoId) {
      errores.push({
        campo: `${prefijo}.productoId`,
        mensaje: `El ítem "${nombre}" debe provenir de un producto real del catálogo.`,
      });
    }

    if (!linea.unidadMedida) {
      errores.push({
        campo: `${prefijo}.unidadMedida`,
        mensaje: `El producto "${nombre}" no tiene unidad de medida configurada.`,
      });
    }

    if (linea.tipoAfectacion === 'sin_configurar') {
      errores.push({
        campo: `${prefijo}.tipoAfectacion`,
        mensaje: `El producto "${nombre}" no tiene impuesto configurado.`,
      });
    }

    if (linea.cantidadSolicitada <= 0) {
      errores.push({
        campo: `${prefijo}.cantidadSolicitada`,
        mensaje: `La cantidad de "${nombre}" debe ser mayor a 0.`,
      });
    }

    if (linea.costoUnitario < 0) {
      errores.push({
        campo: `${prefijo}.costoUnitario`,
        mensaje: `El costo unitario de "${nombre}" no puede ser negativo.`,
      });
    }

    if (linea.afectaInventario && !linea.almacenDestinoId) {
      errores.push({
        campo: `${prefijo}.almacenDestinoId`,
        mensaje: `El almacén de destino es obligatorio para ítems que afectan inventario ("${nombre}").`,
      });
    }

    if ((linea.descuentoUnitario ?? 0) < 0) {
      errores.push({ campo: `${prefijo}.descuentoUnitario`, mensaje: 'El descuento no puede ser negativo.' });
    }

    if (linea.total < 0) {
      errores.push({
        campo: `${prefijo}.total`,
        mensaje: `El total de la línea no puede ser negativo ("${nombre}").`,
      });
    }
  });

  return errores;
}

/**
 * Empareja las líneas de un comprobante de compra con las líneas de la OC de
 * origen (mismo id: extraerDatosOCParaCC preserva el id de la línea de OC al
 * copiarla al CC). Líneas agregadas manualmente en el formulario del CC (id
 * nuevo, ausente en la OC) no se consideran facturación de esa OC. Devuelve,
 * por id de línea de OC, la cantidad total que este CC factura de ella.
 */
function calcularCantidadFacturadaPorLineaOC(
  lineasOC: LineaCompra[],
  lineasCC: LineaCompra[],
): Map<string, number> {
  const idsOC = new Set(lineasOC.map((l) => l.id));
  const cantidadPorId = new Map<string, number>();

  for (const lineaCC of lineasCC) {
    if (!idsOC.has(lineaCC.id)) continue;
    cantidadPorId.set(lineaCC.id, (cantidadPorId.get(lineaCC.id) ?? 0) + lineaCC.cantidadSolicitada);
  }

  return cantidadPorId;
}

/**
 * Valida que la cantidad que un comprobante de compra factura de cada línea
 * de su OC de origen no supere lo pendiente de facturar de esa línea
 * (cantidadSolicitada - cantidadFacturada). Evita generar, desde la misma OC,
 * más comprobantes de los que su cantidad pendiente permite.
 */
export function validarCantidadesFacturablesDesdeOC(
  lineasOC: LineaCompra[],
  lineasCC: LineaCompra[],
): ErrorValidacion[] {
  const errores: ErrorValidacion[] = [];
  const cantidadPorId = calcularCantidadFacturadaPorLineaOC(lineasOC, lineasCC);

  for (const ocLinea of lineasOC) {
    const cantidadFacturadaAhora = cantidadPorId.get(ocLinea.id);
    if (!cantidadFacturadaAhora) continue;

    const pendiente = round2(ocLinea.cantidadSolicitada - ocLinea.cantidadFacturada);
    if (round2(cantidadFacturadaAhora - pendiente) > 0.001) {
      errores.push({
        campo: 'lineas',
        mensaje: `La cantidad facturada para "${ocLinea.nombreProducto || 'línea sin nombre'}" (${cantidadFacturadaAhora}) supera lo pendiente de la orden de compra (${pendiente}).`,
      });
    }
  }

  return errores;
}

/**
 * Aplica la facturación de un comprobante de compra a las líneas de su OC de
 * origen: incrementa cantidadFacturada y recalcula cantidadPendienteFacturacion
 * por línea (cantidadSolicitada - cantidadFacturada). Las líneas de OC sin
 * correspondencia en el CC quedan sin cambios.
 */
export function aplicarFacturacionALineasOC(
  lineasOC: LineaCompra[],
  lineasCC: LineaCompra[],
): LineaCompra[] {
  const cantidadPorId = calcularCantidadFacturadaPorLineaOC(lineasOC, lineasCC);

  return lineasOC.map((ocLinea) => {
    const facturadaAhora = cantidadPorId.get(ocLinea.id);
    if (!facturadaAhora) return ocLinea;

    const cantidadFacturada = round2(ocLinea.cantidadFacturada + facturadaAhora);
    return {
      ...ocLinea,
      cantidadFacturada,
      cantidadPendienteFacturacion: Math.max(0, round2(ocLinea.cantidadSolicitada - cantidadFacturada)),
    };
  });
}

export interface DesgloseImpuestoLinea {
  tipoAfectacion: TipoAfectacionCompra;
  tasaIgv: number;
  etiqueta: string;
  baseImponible: number;
  monto: number;
}

export interface TotalesLineasCompra {
  subtotal: number;
  subtotalExonerado: number;
  subtotalInafecto: number;
  subtotalSinConfigurar: number;
  descuentoTotal: number;
  igv: number;
  /** Desglose de impuestos por tasa/tipo real de cada línea (ver formatearEtiquetaImpuesto). */
  impuestos: DesgloseImpuestoLinea[];
  total: number;
}

/** Etiqueta real del impuesto/afectación de una línea, sin tasas inventadas. */
export function formatearEtiquetaImpuesto(tipoAfectacion: TipoAfectacionCompra, tasaIgv: number): string {
  switch (tipoAfectacion) {
    case 'gravado':
      return `IGV ${(tasaIgv * 100).toFixed(2)}%`;
    case 'exonerado':
      return 'Exonerado';
    case 'inafecto':
      return 'Inafecto';
    default:
      return 'Sin impuesto configurado';
  }
}

export function calcularTotalesLineas(
  lineas: Array<{
    cantidadSolicitada: number;
    costoUnitario: number;
    descuentoUnitario?: number;
    tipoAfectacion: TipoAfectacionCompra;
    tasaIgv?: number;
  }>,
): TotalesLineasCompra {
  let subtotal = 0;
  let subtotalExonerado = 0;
  let subtotalInafecto = 0;
  let subtotalSinConfigurar = 0;
  let descuentoTotal = 0;
  let igv = 0;
  const grupos = new Map<string, DesgloseImpuestoLinea>();

  const acumularGrupo = (tipoAfectacion: TipoAfectacionCompra, tasaIgv: number, base: number, monto: number) => {
    const clave = `${tipoAfectacion}|${tasaIgv}`;
    const grupo = grupos.get(clave) ?? {
      tipoAfectacion,
      tasaIgv,
      etiqueta: formatearEtiquetaImpuesto(tipoAfectacion, tasaIgv),
      baseImponible: 0,
      monto: 0,
    };
    grupo.baseImponible += base;
    grupo.monto += monto;
    grupos.set(clave, grupo);
  };

  for (const linea of lineas) {
    const bruto = linea.cantidadSolicitada * linea.costoUnitario;
    const descLinea = (linea.descuentoUnitario ?? 0) * linea.cantidadSolicitada;
    const neto = bruto - descLinea;
    descuentoTotal += descLinea;

    if (linea.tipoAfectacion === 'gravado') {
      const tasa = linea.tasaIgv ?? 0;
      const base = tasa > 0 ? neto / (1 + tasa) : neto;
      const monto = neto - base;
      subtotal += base;
      igv += monto;
      acumularGrupo('gravado', tasa, base, monto);
    } else if (linea.tipoAfectacion === 'exonerado') {
      subtotalExonerado += neto;
      acumularGrupo('exonerado', 0, neto, 0);
    } else if (linea.tipoAfectacion === 'inafecto') {
      subtotalInafecto += neto;
      acumularGrupo('inafecto', 0, neto, 0);
    } else {
      subtotalSinConfigurar += neto;
      acumularGrupo('sin_configurar', 0, neto, 0);
    }
  }

  const impuestos = Array.from(grupos.values())
    .map((g) => ({ ...g, baseImponible: round2(g.baseImponible), monto: round2(g.monto) }))
    .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta));

  return {
    subtotal: round2(subtotal),
    subtotalExonerado: round2(subtotalExonerado),
    subtotalInafecto: round2(subtotalInafecto),
    subtotalSinConfigurar: round2(subtotalSinConfigurar),
    descuentoTotal: round2(descuentoTotal),
    igv: round2(igv),
    impuestos,
    total: round2(subtotal + igv + subtotalExonerado + subtotalInafecto + subtotalSinConfigurar),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Resuelve la afectación/tasa de IGV real de una línea de compra a partir de
 * la etiqueta de impuesto propia del producto (ej. "IGV (18.00%)",
 * "Exonerado (0.00%)", generada por el módulo Productos al elegir el
 * impuesto en su formulario). Si el producto no tiene impuesto propio
 * definido, la línea queda como 'sin_configurar': Compras nunca inventa una
 * tasa ni usa un impuesto por defecto de Configuración.
 */
export function resolverImpuestoProducto(
  impuestoProducto: string | undefined,
): { tipoAfectacion: TipoAfectacionCompra; tasaIgv: number } {
  const etiqueta = (impuestoProducto ?? '').toLowerCase().trim();
  if (!etiqueta) return { tipoAfectacion: 'sin_configurar', tasaIgv: 0 };

  if (etiqueta.includes('exonerado')) return { tipoAfectacion: 'exonerado', tasaIgv: 0 };
  if (etiqueta.includes('inafecto')) return { tipoAfectacion: 'inafecto', tasaIgv: 0 };

  const porcentaje = etiqueta.match(/(\d+(?:\.\d+)?)/);
  if (porcentaje) {
    const tasa = parseFloat(porcentaje[1]) / 100;
    if (!Number.isNaN(tasa)) return { tipoAfectacion: 'gravado', tasaIgv: tasa };
  }

  return { tipoAfectacion: 'sin_configurar', tasaIgv: 0 };
}
