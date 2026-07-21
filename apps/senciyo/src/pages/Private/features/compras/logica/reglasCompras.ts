import type { OrdenCompra, EstadoPrincipalOC } from '../modelos/OrdenCompra';
import type { ComprobanteCompra, EstadoPagoCC, EstadoPrincipalCC } from '../modelos/ComprobanteCompra';
import type { CuentaPorPagar, EstadoPagoCxP } from '../modelos/CuentaPorPagar';
import type { PagoCompra } from '../modelos/PagoCompra';
import type { RequerimientoCompra, EstadoPrincipalRC } from '../modelos/RequerimientoCompra';
import type { LineaCompra, TipoAfectacionCompra } from '../modelos/LineaCompra';
import type { ErrorValidacion } from '../servicios/tiposServiciosCompras';
import { esProductoInventariable } from '@/shared/inventory/clasificacionInventario';
import {
  resolverTratamientoTributarioProducto,
  type DatosProductoParaResolucionTributaria,
} from '@/shared/catalogos-sunat/resolucionTributaria';
import type { TratamientoImpuestoCompra } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import type { Tax } from '../../configuracion-sistema/modelos/Tax';
import { getFactorToUnidadMinima, convertToUnidadMinima, type ProductoConUnidades } from '@/shared/inventory/unitConversion';
import type { ProductUnitOption } from '@/shared/units/productUnitOptions';

/**
 * Comprobantes de Compra realmente generados por esta OC — relación
 * HISTÓRICA completa (incluye anulados: nunca se pierde la trazabilidad de
 * qué se generó desde aquí). Se deriva por búsqueda real (`cc.ordenCompraOrigenId`,
 * la FK que el propio CC persiste), no del array `oc.comprobantesCompraRelacionados`
 * (que solo se usa como snapshot auxiliar y podría no reflejar altas
 * posteriores si algún día se generara fuera de este flujo). Única fuente
 * reutilizada por listado, drawer y por `tieneConversionActivaOC`.
 */
export function obtenerComprobantesRelacionadosOC(
  oc: OrdenCompra,
  comprobantes: ComprobanteCompra[],
): ComprobanteCompra[] {
  return comprobantes.filter((cc) => cc.ordenCompraOrigenId === oc.id);
}

/**
 * Subconjunto de `obtenerComprobantesRelacionadosOC` que sigue vigente (no
 * anulado): son los que realmente cuentan como "conversión activa" de la OC.
 * Un CC anulado sigue existiendo para historial/documentos relacionados, pero
 * nunca participa en este subconjunto.
 */
export function obtenerComprobantesActivosOC(
  oc: OrdenCompra,
  comprobantes: ComprobanteCompra[],
): ComprobanteCompra[] {
  return obtenerComprobantesRelacionadosOC(oc, comprobantes).filter((cc) => cc.estadoDocumento !== 'anulado');
}

/**
 * true si la OC tiene al menos un Comprobante de Compra relacionado que siga
 * activo (no anulado). Única fuente de "conversión vigente" — reemplaza
 * cualquier chequeo disperso de `comprobantesCompraRelacionados.length` (ese
 * array no distingue anulados) en `calcularEstadoPrincipalOC` y
 * `motivoBloqueoAnulacionOC`.
 */
export function tieneConversionActivaOC(oc: OrdenCompra, comprobantes: ComprobanteCompra[]): boolean {
  return obtenerComprobantesActivosOC(oc, comprobantes).length > 0;
}

/**
 * Único estado principal vigente de la OC, derivado de sus dimensiones
 * internas (estadoDocumento, estadoAprobacion, relaciones) y de sus
 * Comprobantes de Compra reales. Precedencia: anulada > borrador > convertida
 * > aprobación. Una OC anulada nunca vuelve a mostrar "Aprobada" como
 * vigente; "Convertida" exige al menos un Comprobante de Compra relacionado
 * que siga activo (`tieneConversionActivaOC`) — si todos los CC relacionados
 * están anulados, la OC recupera el estado que le corresponda por su propio
 * ciclo de aprobación, nunca queda "Convertida" por un documento que ya no
 * representa una conversión vigente.
 */
export function calcularEstadoPrincipalOC(oc: OrdenCompra, comprobantes: ComprobanteCompra[]): EstadoPrincipalOC {
  if (oc.estadoDocumento === 'anulado') return 'Anulada';
  if (oc.estadoDocumento === 'borrador') return 'Borrador';
  if (tieneConversionActivaOC(oc, comprobantes)) return 'Convertida';
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
export function puedeEditarOC(oc: OrdenCompra, comprobantes: ComprobanteCompra[]): boolean {
  const estado = calcularEstadoPrincipalOC(oc, comprobantes);
  if (estado === 'Borrador' || estado === 'No Aprobada' || estado === 'Convertida') return true;
  if (estado === 'Registrada') return motivoBloqueoAnulacionOC(oc, comprobantes) === null;
  return false;
}

export function puedeEliminarBorradorOC(oc: OrdenCompra, comprobantes: ComprobanteCompra[]): boolean {
  return calcularEstadoPrincipalOC(oc, comprobantes) === 'Borrador';
}

/**
 * Regla de adjuntos por estado (sección 11 del alcance): eliminar solo se
 * permite mientras la orden sigue en trámite (borrador, registrada o
 * pendiente de aprobación); una vez aprobada/no aprobada/anulada/convertida,
 * los adjuntos quedan fijos como sustento documental. Descargar nunca se
 * bloquea en ningún estado.
 */
export function puedeEliminarAdjuntoOC(oc: OrdenCompra, comprobantes: ComprobanteCompra[]): boolean {
  const estado = calcularEstadoPrincipalOC(oc, comprobantes);
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
export function motivoBloqueoAnulacionOC(oc: OrdenCompra, comprobantes: ComprobanteCompra[]): string | null {
  if (oc.estadoDocumento === 'borrador') return 'Los borradores se eliminan, no se anulan.';
  if (oc.estadoDocumento === 'anulado') return 'La orden de compra ya se encuentra anulada.';
  if (oc.estadoDocumento === 'cerrado') return 'La orden de compra ya se encuentra cerrada.';
  if (tieneConversionActivaOC(oc, comprobantes)) {
    return 'No se puede anular la orden porque ya tiene un comprobante de compra relacionado.';
  }
  if ((oc.notasIngresoRelacionadas?.length ?? 0) > 0) {
    return 'No se puede anular la orden porque ya tiene una nota de ingreso relacionada.';
  }
  return null;
}

export function puedeAnularOC(oc: OrdenCompra, comprobantes: ComprobanteCompra[]): boolean {
  return motivoBloqueoAnulacionOC(oc, comprobantes) === null;
}

/** Disponibilidad de imprimir/PDF: no aplica a borradores (documento aún no oficial, sin correlativo). No es una transición de estado, solo disponibilidad de la acción — única fuente para listado y drawer. */
export function puedeImprimirOC(oc: OrdenCompra, comprobantes: ComprobanteCompra[]): boolean {
  return calcularEstadoPrincipalOC(oc, comprobantes) !== 'Borrador';
}

/** Disponibilidad de compartir (WhatsApp): solo documentos ya registrados y presentables formalmente. Única fuente para listado y drawer. */
export function puedeEnviarOC(oc: OrdenCompra, comprobantes: ComprobanteCompra[]): boolean {
  const estado = calcularEstadoPrincipalOC(oc, comprobantes);
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

// ---------------------------------------------------------------------------
// Requerimiento de Compra
// ---------------------------------------------------------------------------

/**
 * Órdenes de Compra generadas directamente desde este Requerimiento —
 * relación HISTÓRICA completa (incluye anuladas). Se deriva por búsqueda real
 * (`oc.requerimientoCompraOrigenId`, la FK que la propia OC persiste), nunca
 * de un array persistido en el Requerimiento: mismo patrón ya usado por
 * `obtenerComprobantesRelacionadosOC` para evitar el problema de
 * desincronización que ese array causó en la relación OC↔CC (ver auditoría de
 * trazabilidad).
 */
export function obtenerOrdenesCompraDesdeRC(rc: RequerimientoCompra, ordenes: OrdenCompra[]): OrdenCompra[] {
  return ordenes.filter((o) => o.requerimientoCompraOrigenId === rc.id);
}

export function obtenerOrdenesCompraActivasDesdeRC(rc: RequerimientoCompra, ordenes: OrdenCompra[]): OrdenCompra[] {
  return obtenerOrdenesCompraDesdeRC(rc, ordenes).filter((o) => o.estadoDocumento !== 'anulado');
}

/**
 * Comprobantes de Compra generados directamente desde este Requerimiento
 * (flujo Requerimiento → Comprobante, sin Orden de Compra intermedia) —
 * misma relación derivada por FK (`cc.requerimientoCompraOrigenId`), nunca un
 * array persistido en el Requerimiento.
 */
export function obtenerComprobantesCompraDirectosDesdeRC(
  rc: RequerimientoCompra,
  comprobantes: ComprobanteCompra[],
): ComprobanteCompra[] {
  return comprobantes.filter((c) => c.requerimientoCompraOrigenId === rc.id);
}

export function obtenerComprobantesCompraDirectosActivosDesdeRC(
  rc: RequerimientoCompra,
  comprobantes: ComprobanteCompra[],
): ComprobanteCompra[] {
  return obtenerComprobantesCompraDirectosDesdeRC(rc, comprobantes).filter((c) => c.estadoDocumento !== 'anulado');
}

export type DocumentoGeneradoRC =
  | { tipo: 'orden_compra'; documento: OrdenCompra }
  | { tipo: 'comprobante_compra'; documento: ComprobanteCompra };

/**
 * Todos los documentos generados desde este Requerimiento (Órdenes de Compra
 * y/o Comprobantes de Compra directos), incluidos los anulados — única fuente
 * reutilizada por el listado ("Documento relacionado") y el drawer
 * ("Documentos relacionados").
 */
export function obtenerDocumentosGeneradosRC(
  rc: RequerimientoCompra,
  ordenes: OrdenCompra[],
  comprobantes: ComprobanteCompra[],
): DocumentoGeneradoRC[] {
  return [
    ...obtenerOrdenesCompraDesdeRC(rc, ordenes).map((documento) => ({ tipo: 'orden_compra' as const, documento })),
    ...obtenerComprobantesCompraDirectosDesdeRC(rc, comprobantes).map((documento) => ({
      tipo: 'comprobante_compra' as const,
      documento,
    })),
  ];
}

/**
 * true si el Requerimiento tiene al menos una Orden de Compra o un
 * Comprobante de Compra directo que siga activo (no anulado). Un documento
 * generado anulado no cuenta como "conversión vigente" — el Requerimiento
 * puede volver a atenderse.
 */
export function tieneConversionActivaRC(
  rc: RequerimientoCompra,
  ordenes: OrdenCompra[],
  comprobantes: ComprobanteCompra[],
): boolean {
  return (
    obtenerOrdenesCompraActivasDesdeRC(rc, ordenes).length > 0 ||
    obtenerComprobantesCompraDirectosActivosDesdeRC(rc, comprobantes).length > 0
  );
}

/**
 * Único estado principal vigente del Requerimiento, derivado de
 * estadoDocumento y de sus documentos generados reales (nunca de un booleano
 * manual). Precedencia: anulado > borrador > atendido > pendiente. Esta
 * primera etapa no implementa aprobación ni atención parcial (ver alcance):
 * "Atendido" solo exige al menos un documento generado activo, sin distinguir
 * cuántos ni si cubre la totalidad de las líneas.
 */
export function calcularEstadoPrincipalRC(
  rc: RequerimientoCompra,
  ordenes: OrdenCompra[],
  comprobantes: ComprobanteCompra[],
): EstadoPrincipalRC {
  if (rc.estadoDocumento === 'anulado') return 'Anulado';
  if (rc.estadoDocumento === 'borrador') return 'Borrador';
  if (tieneConversionActivaRC(rc, ordenes, comprobantes)) return 'Atendido';
  return 'Pendiente';
}

/** Única lista de estados principales, reutilizada por el filtro del listado (no crear un array paralelo). */
export const ESTADOS_PRINCIPALES_RC: EstadoPrincipalRC[] = ['Borrador', 'Pendiente', 'Atendido', 'Anulado'];

export function puedeEditarRC(
  rc: RequerimientoCompra,
  ordenes: OrdenCompra[],
  comprobantes: ComprobanteCompra[],
): boolean {
  const estado = calcularEstadoPrincipalRC(rc, ordenes, comprobantes);
  return estado === 'Borrador' || estado === 'Pendiente';
}

export function puedeEliminarBorradorRC(
  rc: RequerimientoCompra,
  ordenes: OrdenCompra[],
  comprobantes: ComprobanteCompra[],
): boolean {
  return calcularEstadoPrincipalRC(rc, ordenes, comprobantes) === 'Borrador';
}

/**
 * Determina si un Requerimiento puede anularse, o el motivo puntual del
 * bloqueo. Un Requerimiento con al menos un documento generado activo (OC o
 * CC directo) no puede anularse directamente: primero debe resolverse ese
 * derivado (anularlo).
 */
export function motivoBloqueoAnulacionRC(
  rc: RequerimientoCompra,
  ordenes: OrdenCompra[],
  comprobantes: ComprobanteCompra[],
): string | null {
  if (rc.estadoDocumento === 'borrador') return 'Los borradores se eliminan, no se anulan.';
  if (rc.estadoDocumento === 'anulado') return 'El requerimiento de compra ya se encuentra anulado.';
  if (tieneConversionActivaRC(rc, ordenes, comprobantes)) {
    return 'No se puede anular el requerimiento porque ya tiene una orden de compra o un comprobante de compra relacionado.';
  }
  return null;
}

export function puedeAnularRC(
  rc: RequerimientoCompra,
  ordenes: OrdenCompra[],
  comprobantes: ComprobanteCompra[],
): boolean {
  return motivoBloqueoAnulacionRC(rc, ordenes, comprobantes) === null;
}

/**
 * Disponibilidad de "Generar Orden de Compra" / "Generar Comprobante de
 * Compra" desde el Requerimiento: solo mientras está Pendiente (registrado y
 * sin conversión activa todavía). No es una restricción estructural — la
 * relación sigue siendo derivada (§ obtenerOrdenesCompraDesdeRC) y admite
 * múltiples documentos generados en el futuro; en esta primera etapa la
 * acción simplemente deja de ofrecerse una vez atendido, igual que
 * `puedeGenerarCCDesdeOC` deja de mostrarse en el listado una vez que la OC
 * está "Convertida".
 */
export function puedeConvertirRCaOC(
  rc: RequerimientoCompra,
  ordenes: OrdenCompra[],
  comprobantes: ComprobanteCompra[],
): boolean {
  return calcularEstadoPrincipalRC(rc, ordenes, comprobantes) === 'Pendiente';
}

export function puedeConvertirRCaCC(
  rc: RequerimientoCompra,
  ordenes: OrdenCompra[],
  comprobantes: ComprobanteCompra[],
): boolean {
  return calcularEstadoPrincipalRC(rc, ordenes, comprobantes) === 'Pendiente';
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
  return 'Este comprobante tiene pagos activos. Para modificar datos financieros, primero anula los pagos relacionados.';
}

/**
 * CxP canónica de un CC. La fuente oficial es la FK directa `cc.cuentaPorPagarId`
 * (mantenida por `generarCxPYEnlaceCC`); si un registro antiguo no la tuviera
 * completa, se cae a la búsqueda inversa por `cxp.comprobanteCompraId` como
 * respaldo de compatibilidad — nunca al revés. Única fuente reutilizada por
 * drawers, tablas y reglas de pagos activos, para que ambos sentidos
 * resuelvan siempre el mismo resultado.
 */
export function obtenerCxPDeCC(
  cc: ComprobanteCompra,
  cuentasPorPagar: CuentaPorPagar[],
): CuentaPorPagar | undefined {
  if (cc.cuentaPorPagarId) {
    const porFkDirecta = cuentasPorPagar.find((c) => c.id === cc.cuentaPorPagarId);
    if (porFkDirecta) return porFkDirecta;
  }
  return cuentasPorPagar.find((c) => c.comprobanteCompraId === cc.id);
}

/**
 * Pagos aplicados a una CxP — relación HISTÓRICA completa (incluye
 * anulados). Cruza ambos sentidos de la FK (`cxp.pagosRelacionados`, la
 * oficial, y `pago.cuentasPorPagarAplicadas` como respaldo) para no perder
 * un pago si algún registro antiguo tuviera solo uno de los dos completos.
 */
export function obtenerPagosDeCxP(cxp: CuentaPorPagar, pagos: PagoCompra[]): PagoCompra[] {
  return pagos.filter((p) => cxp.pagosRelacionados.includes(p.id) || p.cuentasPorPagarAplicadas.includes(cxp.id));
}

/** Subconjunto de `obtenerPagosDeCxP` que sigue vigente (no anulado): única fuente de "pago activo" para saldo, cuotas y bloqueos. */
export function obtenerPagosActivosDeCxP(cxp: CuentaPorPagar, pagos: PagoCompra[]): PagoCompra[] {
  return obtenerPagosDeCxP(cxp, pagos).filter((p) => p.estadoDocumento !== 'anulado');
}

/**
 * Pagos aplicados a un CC — relación HISTÓRICA completa (incluye anulados),
 * cruzando `cc.pagosRelacionados` (oficial) y `pago.comprobantesCompraAplicados`
 * (respaldo) por el mismo motivo que `obtenerPagosDeCxP`.
 */
export function obtenerPagosDeCC(cc: ComprobanteCompra, pagos: PagoCompra[]): PagoCompra[] {
  return pagos.filter(
    (p) => (cc.pagosRelacionados ?? []).includes(p.id) || p.comprobantesCompraAplicados.includes(cc.id),
  );
}

/** CxP de un Pago: fuente oficial `pago.cuentasPorPagarAplicadas` (Fase 1: siempre una sola). */
export function obtenerCxPDePago(pago: PagoCompra, cuentasPorPagar: CuentaPorPagar[]): CuentaPorPagar | undefined {
  return cuentasPorPagar.find((c) => pago.cuentasPorPagarAplicadas.includes(c.id));
}

/**
 * CC de origen de un Pago mediante la relación oficial. La fuente directa es
 * `pago.comprobantesCompraAplicados`; si un registro antiguo no la tuviera,
 * se deriva vía su CxP (`obtenerCxPDePago` → `cxp.comprobanteCompraId`) —
 * nunca por serie, número o coincidencia de proveedor. Pago → CxP → CC es la
 * misma cadena que ya usa la navegación; esta función evita mantener dos
 * resoluciones independientes que puedan divergir.
 */
export function obtenerComprobanteDePago(
  pago: PagoCompra,
  cuentasPorPagar: CuentaPorPagar[],
  comprobantes: ComprobanteCompra[],
): ComprobanteCompra | undefined {
  const porFkDirecta = comprobantes.find((cc) => pago.comprobantesCompraAplicados.includes(cc.id));
  if (porFkDirecta) return porFkDirecta;
  const cxp = obtenerCxPDePago(pago, cuentasPorPagar);
  return cxp ? comprobantes.find((cc) => cc.id === cxp.comprobanteCompraId) : undefined;
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
  return obtenerPagosActivosDeCxP(cxp, pagos).length > 0;
}

/** Mismo criterio de `tieneCxPPagosActivos`, aplicado a un CC a través de su CxP canónica (`obtenerCxPDeCC`). */
export function tieneCCPagosActivos(
  cc: ComprobanteCompra,
  cuentasPorPagar: CuentaPorPagar[],
  pagos: PagoCompra[],
): boolean {
  const cxp = obtenerCxPDeCC(cc, cuentasPorPagar);
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
  return obtenerComprobantesRelacionadosOC(oc, comprobantes).some((cc) =>
    tieneCCPagosActivos(cc, cuentasPorPagar, pagos),
  );
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

    if (linea.costoUnitario <= 0) {
      errores.push({
        campo: `${prefijo}.costoUnitario`,
        mensaje: `El costo unitario de "${nombre}" debe ser mayor a 0.`,
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
 * Valida que las líneas de un Comprobante de Compra generado desde una OC
 * sean exactamente las líneas heredadas de esa OC: mismo id real de línea
 * (nunca comparación por nombre/descripción), misma cantidad. Esta etapa no
 * implementa facturación parcial — un CC generado desde una OC factura la
 * cantidad completa de cada línea en un solo documento — así que rechaza el
 * registro (en vez de corregir en silencio) si falta una línea de la OC, si
 * el CC incluye una línea ajena a la OC (agregada en el formulario o por
 * manipulación directa del estado/petición), o si la cantidad de alguna
 * línea fue alterada. Reutilizada como única defensa de servicio por
 * `registrarComprobanteCompra`/`registrarComprobanteCompraDesdeBorrador`
 * (ContextoCompras.tsx), la misma capa que ya bloquea por aprobación/estado
 * de facturación de la OC.
 */
export function validarCantidadesFacturablesDesdeOC(
  lineasOC: LineaCompra[],
  lineasCC: LineaCompra[],
): ErrorValidacion[] {
  const errores: ErrorValidacion[] = [];
  const lineasCCPorId = new Map(lineasCC.map((l) => [l.id, l]));
  const idsOC = new Set(lineasOC.map((l) => l.id));

  for (const ocLinea of lineasOC) {
    const lineaCC = lineasCCPorId.get(ocLinea.id);
    if (!lineaCC) {
      errores.push({
        campo: 'lineas',
        mensaje: `Falta en el comprobante la línea "${ocLinea.nombreProducto || 'sin nombre'}" de la orden de compra.`,
      });
      continue;
    }
    if (Math.abs(round2(lineaCC.cantidadSolicitada - ocLinea.cantidadSolicitada)) > 0.001) {
      errores.push({
        campo: 'lineas',
        mensaje: `La cantidad de "${ocLinea.nombreProducto || 'línea sin nombre'}" no coincide con la cantidad de la orden de compra (${ocLinea.cantidadSolicitada}).`,
      });
    }
  }

  for (const lineaCC of lineasCC) {
    if (!idsOC.has(lineaCC.id)) {
      errores.push({
        campo: 'lineas',
        mensaje: 'El comprobante incluye una línea que no pertenece a la orden de compra de origen.',
      });
    }
  }

  return errores;
}

/**
 * Única fuente de verdad del seguimiento interno de facturación de una OC
 * (`lineas[].cantidadFacturada`/`cantidadPendienteFacturacion`, y por
 * extensión `estadoFacturacion` vía `calcularEstadoFacturacion` sobre el
 * resultado). Deriva un valor ABSOLUTO — nunca incremental/acumulado — a
 * partir de las líneas de los Comprobantes de Compra realmente activos
 * relacionados a esta OC (`estadoDocumento !== 'anulado'`; el llamador
 * decide cuáles son "activos" reutilizando las reglas de relaciones ya
 * existentes, esta función no resuelve esa relación). Con la regla vigente
 * (sin facturación parcial, máximo un CC activo por OC — ver
 * `validarCantidadesFacturablesDesdeOC`), en la práctica se le pasan las
 * líneas de ese único CC activo, o un arreglo vacío si no hay ninguno.
 *
 * Al ser absoluta (no "sumar lo nuevo" ni "restar lo anulado"), la misma
 * función sirve para los tres momentos en que la relación real cambia, sin
 * arrastrar un snapshot previo ni depender del orden de las llamadas:
 * - conversión inicial OC → CC (líneas del CC recién creado);
 * - edición de una OC convertida, tras propagar el cambio al mismo CC
 *   (líneas del CC ya actualizado);
 * - anulación de un CC relacionado (líneas de los CC que sigan activos,
 *   normalmente ninguno → todas las líneas vuelven a cantidadFacturada 0).
 */
export function recalcularSeguimientoFacturacionOC(
  lineasOC: LineaCompra[],
  lineasComprobantesActivos: LineaCompra[],
): LineaCompra[] {
  const cantidadPorId = calcularCantidadFacturadaPorLineaOC(lineasOC, lineasComprobantesActivos);

  return lineasOC.map((ocLinea) => {
    // Nunca puede haber más facturado que lo solicitado (con la relación
    // exacta 1:1 vigente esto ya se cumple por construcción; el límite
    // explícito es la defensa de que facturada + pendiente = solicitada
    // siempre, incluso ante un dato heredado inconsistente).
    const cantidadFacturada = Math.min(
      round2(cantidadPorId.get(ocLinea.id) ?? 0),
      ocLinea.cantidadSolicitada,
    );
    return {
      ...ocLinea,
      cantidadFacturada,
      cantidadPendienteFacturacion: round2(ocLinea.cantidadSolicitada - cantidadFacturada),
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
    case 'exportacion':
      return 'Exportación';
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
    } else if (linea.tipoAfectacion === 'exonerado' || linea.tipoAfectacion === 'exportacion') {
      // 'exportacion' se agrega al mismo acumulador que 'exonerado' (TotalesCompra, el modelo
      // persistido, no tiene un bucket propio de exportación — ampliarlo es una decisión de
      // modelo fuera de este saneamiento). La distinción que sí importa — no confundir ambas
      // categorías — se conserva en `tipoAfectacion` de la línea (`'exportacion'` real, nunca
      // proyectado a `'exonerado'`) y en `formatearEtiquetaImpuesto`.
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
 * Resuelve la afectación/tasa de IGV real de una línea de compra — adaptador delgado sobre el
 * núcleo central `resolverTratamientoTributarioProducto` (shared/catalogos-sunat/resolucionTributaria.ts):
 * prioridad `impuestoId` estructurado → `Tax` real → `affectationCode`/tasa configurada → texto
 * legado del producto (ej. "IGV (18.00%)") solo cuando no hay `impuestoId` resoluble. Nunca
 * reimplementa su propio parseo ni su propio mapa de códigos SUNAT.
 *
 * `'exportacion'` se conserva como su propia categoría en `TipoAfectacionCompra` (nunca se
 * confunde con `'exonerado'` solo porque ambas tengan tasa cero). Cuando el núcleo no puede
 * resolver el impuesto (`estado !== 'resuelto'` — impuesto ausente/ambiguo, o `'gratuita'`, que
 * este alcance de Compras no admite — decisión 3.9 del diseño de Kardex Valorizado), la línea
 * queda `'sin_configurar'`: `validarLineasCompra` ya bloquea el registro para ese valor — nunca se
 * disfraza `'gratuita'` de `'exonerado'` para forzar el mismo resultado numérico, ni se asume una
 * tasa (0% ni 18%) cuando la resolución está pendiente.
 */
export function resolverImpuestoProducto(
  producto: DatosProductoParaResolucionTributaria,
  tratamientoEmpresa: TratamientoImpuestoCompra,
  taxes: readonly Tax[] = [],
): { tipoAfectacion: TipoAfectacionCompra; tasaIgv: number } {
  const resolucion = resolverTratamientoTributarioProducto(producto, tratamientoEmpresa, taxes);
  if (resolucion.estado !== 'resuelto') {
    return { tipoAfectacion: 'sin_configurar', tasaIgv: 0 };
  }
  switch (resolucion.categoria) {
    case 'gravado':
    case 'exonerado':
    case 'inafecto':
    case 'exportacion':
      return { tipoAfectacion: resolucion.categoria, tasaIgv: resolucion.tasa };
    default:
      // 'gratuita' y 'sin_configurar' ya quedaron excluidas por `estado !== 'resuelto'` arriba —
      // rama defensiva, no alcanzable con datos reales.
      return { tipoAfectacion: 'sin_configurar', tasaIgv: 0 };
  }
}

/**
 * Naturaleza histórica de la línea: ¿este ítem, tal como fue clasificado y tal como es el
 * producto al momento de confirmarse la línea, es controlado por stock? No depende de la
 * modalidad del documento (eso es `calcularAfectaInventarioLinea`, más abajo) — separa
 * naturaleza de efecto (decisión funcional 3.4 del diseño de Kardex Valorizado).
 *
 * - 'servicio' | 'gasto' | 'activo_fijo': nunca inventariables en este alcance.
 * - 'suministro': solo si el producto real es estructuralmente un producto controlado por
 *   stock de tipo SUMINISTROS — no basta con que la línea se haya clasificado como suministro.
 * - 'producto': inventariable según `esProductoInventariable` (fuente única, shared/inventory).
 */
export function calcularEsInventariable(
  linea: Pick<LineaCompra, 'clasificacion' | 'tipoExistencia'>,
): boolean {
  if (linea.clasificacion === 'producto') {
    return esProductoInventariable({ tipoExistencia: linea.tipoExistencia });
  }
  if (linea.clasificacion === 'suministro') {
    return linea.tipoExistencia === 'SUMINISTROS';
  }
  // servicio, gasto, activo_fijo: nunca inventariables en este alcance.
  return false;
}

/**
 * Efecto real sobre Inventario: combina la naturaleza de la línea con la modalidad del
 * documento. Reemplaza la asignación uniforme anterior (todas las líneas de un CC recibían el
 * mismo valor, sin importar su clasificación) — una línea de servicio nunca puede quedar
 * `afectaInventario=true`, sin importar la modalidad elegida para el documento.
 */
export function calcularAfectaInventarioLinea(
  esInventariable: boolean,
  modalidadInventario: ComprobanteCompra['modalidadInventario'],
): boolean {
  return esInventariable && modalidadInventario !== 'no_afecta_inventario';
}

export interface DatosSnapshotInventarioLinea {
  esInventariable: boolean;
  unidadMedidaCodigo: string;
  /** Ya incluye `factorConversion` por opción (ver `getProductUnitOptions`) — única fuente de factor que Compras conserva en cualquier momento del ciclo de vida de la línea. */
  unidadesDisponibles: ProductUnitOption[];
  /** Cantidad comercial final documentada (`LineaCompra.cantidadSolicitada`) — la que gobierna el snapshot, nunca `cantidadRecibida`. */
  cantidadComercialFinal: number;
}

export interface ResultadoSnapshotInventarioLinea {
  factorConversionAplicado?: number;
  cantidadDocumentadaInventariable?: number;
  /** Presente únicamente cuando no fue posible resolver un snapshot válido — nunca se inventa un factor. */
  error?: string;
}

function construirProductoDesdeUnidadesDisponibles(unidadesDisponibles: ProductUnitOption[]): ProductoConUnidades {
  const base = unidadesDisponibles.find((u) => u.isBase);
  return {
    unidad: base?.code,
    unidadesMedidaAdicionales: unidadesDisponibles
      .filter((u) => !u.isBase)
      .map((u) => ({ id: u.code, unidadCodigo: u.code, factorConversion: u.factorConversion ?? 0 })),
  };
}

/**
 * Regla única y pura para resolver (y validar) el snapshot histórico de conversión de una línea
 * de Compra — `factorConversionAplicado` y `cantidadDocumentadaInventariable`. Reutiliza
 * `getFactorToUnidadMinima`/`convertToUnidadMinima` (nunca reimplementa la búsqueda de
 * presentaciones ni la multiplicación). Debe invocarse en los 4 puntos donde la unidad o la
 * cantidad final de una línea inventariable pueden cambiar: al crear la línea, al cambiar de
 * unidad, al cambiar la cantidad documentada, y como validación definitiva antes de confirmar el
 * CC — siempre con los mismos datos de entrada (unidad + cantidad ya vigentes en ese momento),
 * nunca dejando un snapshot obsoleto a la espera de que otra ruta lo repare.
 */
export function resolverSnapshotInventarioLinea(
  datos: DatosSnapshotInventarioLinea,
): ResultadoSnapshotInventarioLinea {
  if (!datos.esInventariable) {
    // Una línea no inventariable no necesita snapshots de stock — ausencia válida, no un error.
    return {};
  }

  const opcionSeleccionada = datos.unidadesDisponibles.find((u) => u.code === datos.unidadMedidaCodigo);
  if (!opcionSeleccionada) {
    return { error: 'La unidad seleccionada no forma parte de las presentaciones del producto — no se puede resolver el factor de conversión.' };
  }
  // Validación explícita del factor CRUDO de la opción antes de reutilizar
  // getFactorToUnidadMinima — esa utilidad, al no encontrar un factor positivo, cae de vuelta a
  // `1` silenciosamente (pensado para "presentación no encontrada", no para "factor inválido
  // conocido"); aquí se distingue: una unidad base siempre es factor 1 por definición, pero una
  // presentación con `factorConversion` ausente o ≤ 0 es un dato inválido real que debe bloquear.
  if (!opcionSeleccionada.isBase && !(Number(opcionSeleccionada.factorConversion) > 0)) {
    return { error: `Factor de conversión inválido (${opcionSeleccionada.factorConversion}) para la unidad "${datos.unidadMedidaCodigo}" — no se puede confirmar la línea sin un factor válido.` };
  }

  const producto = construirProductoDesdeUnidadesDisponibles(datos.unidadesDisponibles);
  const factorConversionAplicado = getFactorToUnidadMinima(producto, datos.unidadMedidaCodigo);
  if (!(factorConversionAplicado > 0)) {
    return { error: `Factor de conversión inválido (${factorConversionAplicado}) para la unidad "${datos.unidadMedidaCodigo}" — no se puede confirmar la línea sin un factor válido.` };
  }

  const cantidadDocumentadaInventariable = convertToUnidadMinima({
    product: producto,
    quantity: datos.cantidadComercialFinal,
    unitCode: datos.unidadMedidaCodigo,
  });

  return { factorConversionAplicado, cantidadDocumentadaInventariable };
}
