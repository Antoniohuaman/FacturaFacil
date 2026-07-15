import type { OrdenCompra, EstadoPrincipalOC } from '../modelos/OrdenCompra';
import type { ComprobanteCompra, EstadoPagoCC, EstadoPrincipalCC } from '../modelos/ComprobanteCompra';
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
 * esté en un estado ya cerrado del ciclo. Una OC "Convertida" (ya generó un
 * Comprobante de Compra) también admite edición: actualiza el mismo
 * documento (mismo id/serie/correlativo/número, sin volver a ejecutar la
 * conversión) y propaga los campos heredados al CC relacionado — ver
 * `actualizarOrdenCompra` en ContextoCompras.tsx.
 */
export function puedeEditarOC(oc: OrdenCompra): boolean {
  const estado = calcularEstadoPrincipalOC(oc);
  if (estado === 'Borrador' || estado === 'No Aprobada' || estado === 'Convertida') return true;
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
  if (oc.estadoDocumento === 'borrador') return 'Los borradores se eliminan, no se anulan.';
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

/** Disponibilidad de imprimir/PDF: no aplica a borradores (documento aún no oficial, sin correlativo). No es una transición de estado, solo disponibilidad de la acción — única fuente para listado y drawer. */
export function puedeImprimirOC(oc: OrdenCompra): boolean {
  return calcularEstadoPrincipalOC(oc) !== 'Borrador';
}

/** Disponibilidad de compartir (WhatsApp): solo documentos ya registrados y presentables formalmente. Única fuente para listado y drawer. */
export function puedeEnviarOC(oc: OrdenCompra): boolean {
  const estado = calcularEstadoPrincipalOC(oc);
  return (
    estado === 'Registrada' ||
    estado === 'Pendiente de aprobación' ||
    estado === 'Aprobada' ||
    estado === 'Convertida'
  );
}

export function puedeCerrarOC(oc: OrdenCompra): boolean {
  return oc.estadoDocumento === 'registrado';
}

/**
 * Único estado principal vigente del CC, derivado de sus dimensiones internas
 * (estadoDocumento, relación con Nota de Ingreso). Un CC anulado nunca vuelve
 * a mostrar "Registrado"; "Convertido" exige una relación real persistida
 * (Nota de Ingreso generada), no solo una acción disparada.
 */
export function calcularEstadoPrincipalCC(cc: ComprobanteCompra): EstadoPrincipalCC {
  if (cc.estadoDocumento === 'anulado') return 'Anulado';
  if (cc.estadoDocumento === 'borrador') return 'Borrador';
  if ((cc.notasIngresoRelacionadas?.length ?? 0) > 0) return 'Convertido';
  return 'Registrado';
}

/** Única lista de estados principales, reutilizada por el filtro del listado (no crear un array paralelo). */
export const ESTADOS_PRINCIPALES_CC: EstadoPrincipalCC[] = ['Borrador', 'Registrado', 'Anulado', 'Convertido'];

/**
 * Un CC en Borrador siempre es editable. Un CC Registrado también admite
 * edición (actualiza el mismo documento y su misma CxP, nunca genera un
 * segundo) — con o sin pagos aplicados: si ya tiene pagos, el formulario
 * bloquea los campos financieros (ver `puedeEditarCamposFinancierosCC`) pero
 * igual permite entrar a editar observaciones/adjuntos. Convertido (ya generó
 * Nota de Ingreso) y Anulado quedan fuera: no se tocan datos con inventario
 * ya movido ni documentos anulados.
 */
export function puedeEditarCC(cc: ComprobanteCompra): boolean {
  const estado = calcularEstadoPrincipalCC(cc);
  return estado === 'Borrador' || estado === 'Registrado';
}

/**
 * Un CC Registrado sin pagos aplicados admite editar campos financieros y
 * documentales completos; en cuanto existe algún pago (parcial o total) esos
 * campos quedan bloqueados para no romper la trazabilidad de lo ya pagado —
 * solo observaciones/adjuntos siguen editables. Esta función NO distingue si
 * el CC proviene de una OC: ese bloqueo, más acotado (solo los campos
 * realmente heredados: proveedor, direcciones, moneda/TC, forma de pago/
 * cronograma, centro de costo/presupuesto y líneas), lo resuelve el propio
 * formulario a partir de `Boolean(cc.ordenCompraOrigenId)` — una fuente
 * independiente que se combina con esta vía OR. Única fuente para el
 * formulario (deshabilitar inputs) y el servicio (`actualizarComprobanteCompra`,
 * defensa adicional que no confía solo en la UI).
 */
export function puedeEditarCamposFinancierosCC(cc: ComprobanteCompra): boolean {
  return cc.estadoPago === 'pendiente';
}

export function motivoBloqueoCamposFinancierosCC(cc: ComprobanteCompra): string | null {
  if (puedeEditarCamposFinancierosCC(cc)) return null;
  return 'Este comprobante ya tiene pagos aplicados: solo puedes editar observaciones y adjuntos.';
}

/**
 * Determina si una CxP tiene pagos activos cruzando las relaciones reales
 * (CxP → Pagos), no un estado derivado que podría no reflejar de inmediato
 * una reversión: hay pagos activos si el total pagado o el pagado de
 * cualquier cuota es mayor a cero, o si existe al menos un Pago relacionado
 * cuyo estado no sea 'anulado'. Única fuente reutilizada por el bloqueo de
 * edición de la OC convertida (`tieneOCPagosActivosRelacionados`) y de su CC
 * relacionado (`tieneCCPagosActivos`).
 */
export function tieneCxPPagosActivos(cxp: CuentaPorPagar, pagos: PagoCompra[]): boolean {
  if (cxp.totalPagado > 0) return true;
  if (cxp.cuotas?.some((cuota) => cuota.montoPagado > 0)) return true;
  return pagos.some((p) => p.cuentasPorPagarAplicadas.includes(cxp.id) && p.estadoDocumento !== 'anulado');
}

/** Mismo criterio de `tieneCxPPagosActivos`, aplicado a un CC a través de su CxP relacionada. */
export function tieneCCPagosActivos(
  cc: ComprobanteCompra,
  cuentasPorPagar: CuentaPorPagar[],
  pagos: PagoCompra[],
): boolean {
  if (!cc.cuentaPorPagarId) return false;
  const cxp = cuentasPorPagar.find((c) => c.id === cc.cuentaPorPagarId);
  return cxp ? tieneCxPPagosActivos(cxp, pagos) : false;
}

/**
 * Determina si una OC tiene pagos activos en cualquiera de sus Comprobantes
 * de Compra relacionados — regla central que bloquea la edición financiera/
 * documental heredable de una OC ya Convertida. Única fuente reutilizada por
 * el formulario de OC (bloqueo de campos) y por `actualizarOrdenCompra`
 * (ContextoCompras.tsx, defensa de servicio que no confía solo en la UI):
 * mientras exista un pago activo en cualquier CC relacionado, la OC no puede
 * modificar sus datos heredables, sin excepciones parciales.
 */
export function tieneOCPagosActivosRelacionados(
  oc: OrdenCompra,
  comprobantes: ComprobanteCompra[],
  cuentasPorPagar: CuentaPorPagar[],
  pagos: PagoCompra[],
): boolean {
  return comprobantes
    .filter((cc) => cc.ordenCompraOrigenId === oc.id)
    .some((cc) => tieneCCPagosActivos(cc, cuentasPorPagar, pagos));
}

export function puedeEliminarBorradorCC(cc: ComprobanteCompra): boolean {
  return calcularEstadoPrincipalCC(cc) === 'Borrador';
}

/** Disponibilidad de imprimir/PDF: no aplica a borradores (documento aún no registrado formalmente). Única fuente para listado y drawer. */
export function puedeImprimirCC(cc: ComprobanteCompra): boolean {
  return calcularEstadoPrincipalCC(cc) !== 'Borrador';
}

/**
 * Determina si un comprobante de compra puede anularse, o el motivo puntual
 * del bloqueo. No puede anularse si ya tiene pagos aplicados (estadoPago
 * distinto de 'pendiente') ni si ya tiene una nota de ingreso o movimiento de
 * inventario relacionado.
 */
export function motivoBloqueoAnulacionCC(cc: ComprobanteCompra): string | null {
  if (cc.estadoDocumento === 'borrador') return 'Los borradores se eliminan, no se anulan.';
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
 * Resuelve el nombre específico de la forma de pago de un documento de
 * Compras (OC o CC): nombre real del método de Configuración → Formas de
 * pago, o el snapshot de condicionesPago si ya lo tiene grabado, en vez de
 * reducir a "Contado"/"Crédito" genérico. Única fuente para drawer, listado
 * e impresión de ambos documentos.
 */
export function resolverNombreFormaPago(
  documento: { formaPago: 'contado' | 'credito'; formaPagoMetodoId?: string; condicionesPago?: string },
  metodosPago: Array<{ id: string; name: string }>,
): string {
  const metodo = metodosPago.find((m) => m.id === documento.formaPagoMetodoId);
  return metodo?.name ?? documento.condicionesPago ?? (documento.formaPago === 'contado' ? 'Contado' : 'Crédito');
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

    if (!Number.isFinite(linea.subtotal) || !Number.isFinite(linea.igv) || !Number.isFinite(linea.total)) {
      errores.push({
        campo: `${prefijo}.total`,
        mensaje: `Los cálculos de "${nombre}" no son válidos. Revisa cantidad, costo y descuento.`,
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
  monto: number;
}

export interface TotalesLineasCompra {
  subtotal: number;
  subtotalExonerado: number;
  subtotalInafecto: number;
  subtotalSinConfigurar: number;
  descuentoTotal: number;
  igv: number;
  /** IGV agrupado por cada tasa real presente en las líneas gravadas (ver formatearEtiquetaImpuesto). La base imponible gravada va consolidada en `subtotal`, no repetida aquí. */
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

export interface ResultadoLineaCompra {
  /** Base imponible (sin impuesto) para 'gravado'; para las demás afectaciones, es el neto completo. */
  baseImponible: number;
  igv: number;
  /** Total de línea (neto: cantidad × costo − descuento). Igual a baseImponible + igv. */
  total: number;
}

/**
 * Única función de cálculo por línea (formulario, drawer, impresión y
 * persistencia parten todos de aquí — ver sección 7/2 del alcance). Costo
 * unitario es tax-inclusive (misma convención que Comprobantes): si la línea
 * es 'gravado', la base se obtiene por división, nunca por resta anticipada
 * de un IGV ya redondeado. No redondea nada — precisión completa hasta que
 * el consumidor decida mostrar/persistir el Total final del documento.
 */
export function calcularLineaCompra(linea: {
  cantidadSolicitada: number;
  costoUnitario: number;
  descuentoUnitario?: number;
  tipoAfectacion: TipoAfectacionCompra;
  tasaIgv?: number;
}): ResultadoLineaCompra {
  const bruto = linea.cantidadSolicitada * linea.costoUnitario;
  const descuento = (linea.descuentoUnitario ?? 0) * linea.cantidadSolicitada;
  const neto = bruto - descuento;

  if (linea.tipoAfectacion === 'gravado') {
    const tasa = linea.tasaIgv ?? 0;
    const baseImponible = tasa > 0 ? neto / (1 + tasa) : neto;
    return { baseImponible, igv: neto - baseImponible, total: neto };
  }

  return { baseImponible: neto, igv: 0, total: neto };
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
  // Solo agrupa IGV por tasa (única fila repetida por tasa que exige el
  // resumen tributario); la base imponible gravada se consolida en una sola
  // cifra (`subtotal`), nunca repetida por tasa.
  const gruposIgv = new Map<number, DesgloseImpuestoLinea>();

  for (const linea of lineas) {
    const { baseImponible, igv: igvLinea, total } = calcularLineaCompra(linea);
    descuentoTotal += (linea.descuentoUnitario ?? 0) * linea.cantidadSolicitada;

    if (linea.tipoAfectacion === 'gravado') {
      subtotal += baseImponible;
      igv += igvLinea;
      const tasaIgv = linea.tasaIgv ?? 0;
      const grupo = gruposIgv.get(tasaIgv) ?? {
        tipoAfectacion: 'gravado' as const,
        tasaIgv,
        etiqueta: formatearEtiquetaImpuesto('gravado', tasaIgv),
        monto: 0,
      };
      grupo.monto += igvLinea;
      gruposIgv.set(tasaIgv, grupo);
    } else if (linea.tipoAfectacion === 'exonerado') {
      subtotalExonerado += total;
    } else if (linea.tipoAfectacion === 'inafecto') {
      subtotalInafecto += total;
    } else {
      subtotalSinConfigurar += total;
    }
  }

  // Sin redondeo intermedio: grupos, subtotal e igv conservan precisión
  // completa. El único punto de redondeo a dos decimales de todo el
  // documento es el Total final, evitando la deriva de ±S/0.01 que produce
  // sumar valores ya redondeados por separado.
  const impuestos = Array.from(gruposIgv.values()).sort((a, b) => a.tasaIgv - b.tasaIgv);

  return {
    subtotal,
    subtotalExonerado,
    subtotalInafecto,
    subtotalSinConfigurar,
    descuentoTotal,
    igv,
    impuestos,
    total: round2(subtotal + igv + subtotalExonerado + subtotalInafecto + subtotalSinConfigurar),
  };
}

export interface FilaResumenTributarioCompra {
  clave: string;
  etiqueta: string;
  monto: number;
  /** Fila de advertencia (línea sin impuesto configurado), no un tributo real. */
  advertencia?: boolean;
}

/**
 * Filas del resumen tributario del documento, en el orden de presentación
 * oficial: una única "Base imponible gravada" consolidada (nunca repetida
 * por tasa), un IGV independiente por cada tasa real presente en las líneas,
 * Exonerado e Inafecto (importe de la operación, no impuesto — su impuesto
 * es cero), y "Sin impuesto configurado" únicamente si existen líneas así
 * (caso bloqueado por validarLineasCompra antes de guardar). Ninguna fila se
 * muestra en cero. Única fuente reutilizada por formulario, drawer e
 * impresión — no se reconstruye esta agrupación en cada consumidor.
 */
export function construirFilasResumenTributarioCompra(
  totales: TotalesLineasCompra,
): FilaResumenTributarioCompra[] {
  const filas: FilaResumenTributarioCompra[] = [];

  if (totales.subtotal > 0) {
    filas.push({ clave: 'base-gravada', etiqueta: 'Base imponible gravada', monto: totales.subtotal });
  }

  totales.impuestos
    .filter((grupo) => grupo.tipoAfectacion === 'gravado')
    .forEach((grupo) => {
      filas.push({ clave: `igv-${grupo.tasaIgv}`, etiqueta: grupo.etiqueta, monto: grupo.monto });
    });

  if (totales.subtotalExonerado > 0) {
    filas.push({ clave: 'exonerado', etiqueta: 'Exonerado', monto: totales.subtotalExonerado });
  }

  if (totales.subtotalInafecto > 0) {
    filas.push({ clave: 'inafecto', etiqueta: 'Inafecto', monto: totales.subtotalInafecto });
  }

  if (totales.subtotalSinConfigurar > 0) {
    filas.push({
      clave: 'sin-configurar',
      etiqueta: 'Sin impuesto configurado',
      monto: totales.subtotalSinConfigurar,
      advertencia: true,
    });
  }

  return filas;
}

/** Única primitiva de redondeo monetario del módulo (con Number.EPSILON para evitar el clásico 0.1+0.2!==0.3). */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Único cálculo del monto de retención (solo Recibo por Honorarios): tasa
 * como porcentaje del total del documento. Reutilizado por el formulario de
 * CC y por la propagación OC→CC (al recalcular totales heredados, la
 * retención ya aplicada debe recalcularse sobre el nuevo total, nunca
 * quedarse con el monto anterior).
 */
export function calcularMontoRetencion(total: number, tasaRetencion: number): number {
  return round2((total * tasaRetencion) / 100);
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
