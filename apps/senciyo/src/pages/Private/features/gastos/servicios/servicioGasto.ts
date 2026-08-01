// gastos/servicios/servicioGasto.ts
//
// Reglas puras del dominio de Gastos — nunca cálculo monetario en JSX, nunca
// una segunda CxP/Pago (reutiliza `tieneCxPPagosActivos`/`recalcularEstadoPagoComprobante`
// ya existentes en `compras/logica/reglasCompras.ts`, la MISMA regla que ya usa
// `ComprobanteCompra`, nunca una reimplementación paralela).

import type { CuentaPorPagar } from '../../compras/modelos/CuentaPorPagar';
import type { PagoCompra } from '../../compras/modelos/PagoCompra';
import type { MonedaCompra } from '../../compras/modelos/tiposBaseCompras';
import type { AdjuntoCompra } from '../../compras/modelos/AdjuntoCompra';
import { tieneCxPPagosActivos, recalcularEstadoPagoComprobante, round2 } from '../../compras/logica/reglasCompras';
import type {
  Gasto,
  EstadoPagoGasto,
  TratamientoImpuestoGasto,
} from '../modelos/Gasto';

export interface DatosNuevoGasto {
  empresaId: string;
  establecimientoId?: string;
  fechaReconocimiento: string;
  fechaEmision?: string;
  fechaVencimiento?: string;
  categoriaId: string;
  concepto: string;
  proveedorId?: string;
  proveedorNombre?: string;
  proveedorNumeroDocumento?: string;
  beneficiario?: string;
  tipoDocumento?: string;
  serieDocumentoProveedor?: string;
  numeroDocumentoProveedor?: string;
  moneda: MonedaCompra;
  tipoCambio?: number;
  subtotal: number;
  impuesto: number;
  total: number;
  tratamientoImpuesto: TratamientoImpuestoGasto;
  condicionPago: 'contado' | 'credito';
  observaciones?: string;
  adjuntos?: AdjuntoCompra[];
}

export interface ErrorValidacionGasto {
  campo: string;
  mensaje: string;
}

/** Un gasto exige proveedor O beneficiario de texto libre — nunca ninguno de los dos (§9 del alcance: no se permite un gasto sin identificar a quién se le pagó/paga). */
export function validarGastoBasico(datos: Partial<DatosNuevoGasto>): ErrorValidacionGasto[] {
  const errores: ErrorValidacionGasto[] = [];

  if (!datos.categoriaId) {
    errores.push({ campo: 'categoriaId', mensaje: 'La categoría es obligatoria.' });
  }
  if (!datos.concepto?.trim()) {
    errores.push({ campo: 'concepto', mensaje: 'El concepto es obligatorio.' });
  }
  if (!datos.proveedorId && !datos.beneficiario?.trim()) {
    errores.push({ campo: 'beneficiario', mensaje: 'Indica un proveedor o un beneficiario.' });
  }
  if (!datos.fechaReconocimiento) {
    errores.push({ campo: 'fechaReconocimiento', mensaje: 'La fecha de reconocimiento es obligatoria.' });
  }
  if (!datos.total || datos.total <= 0) {
    errores.push({ campo: 'total', mensaje: 'El total debe ser mayor a 0.' });
  }
  if (datos.condicionPago === 'credito' && !datos.fechaVencimiento) {
    errores.push({ campo: 'fechaVencimiento', mensaje: 'La fecha de vencimiento es obligatoria para gastos al crédito.' });
  }

  return errores;
}

/** Construye el Gasto — nace siempre en estado 'registrado' (nunca 'borrador'): registrar un gasto reconoce el hecho económico de inmediato. */
export function crearGasto(datos: DatosNuevoGasto, id: string, usuario?: string): Gasto {
  const ts = datos.fechaReconocimiento;
  return {
    id,
    empresaId: datos.empresaId,
    establecimientoId: datos.establecimientoId,
    fechaReconocimiento: datos.fechaReconocimiento,
    fechaEmision: datos.fechaEmision,
    fechaVencimiento: datos.condicionPago === 'credito' ? datos.fechaVencimiento : undefined,
    categoriaId: datos.categoriaId,
    concepto: datos.concepto,
    proveedorId: datos.proveedorId,
    proveedorNombre: datos.proveedorNombre,
    proveedorNumeroDocumento: datos.proveedorNumeroDocumento,
    beneficiario: datos.proveedorId ? undefined : datos.beneficiario,
    tipoDocumento: datos.tipoDocumento,
    serieDocumentoProveedor: datos.serieDocumentoProveedor,
    numeroDocumentoProveedor: datos.numeroDocumentoProveedor,
    moneda: datos.moneda,
    tipoCambio: datos.tipoCambio,
    subtotal: round2(datos.subtotal),
    impuesto: round2(datos.impuesto),
    total: round2(datos.total),
    tratamientoImpuesto: datos.tratamientoImpuesto,
    condicionPago: datos.condicionPago,
    cuentaPorPagarId: undefined,
    pagosRelacionados: [],
    adjuntos: datos.adjuntos ?? [],
    observaciones: datos.observaciones,
    estadoDocumento: 'registrado',
    historial: [
      { fecha: ts, usuario, accion: 'Gasto registrado', detalle: datos.concepto },
    ],
    creadoPor: usuario,
    fechaCreacion: ts,
    fechaActualizacion: ts,
  };
}

/**
 * Importe reconocido como gasto operativo — única fuente reutilizada por
 * Gastos, el reporte y Rentabilidad Operativa (nunca una fórmula duplicada,
 * §13 del alcance):
 * - anulado → 0 para los indicadores normales;
 * - impuesto recuperable → el impuesto NO forma parte del gasto (subtotal);
 * - impuesto no recuperable o sin desglose → el total completo.
 */
export function importeReconocidoComoGasto(
  gasto: Pick<Gasto, 'estadoDocumento' | 'tratamientoImpuesto' | 'subtotal' | 'total'>,
): number {
  if (gasto.estadoDocumento === 'anulado') return 0;
  if (gasto.tratamientoImpuesto === 'recuperable') return round2(gasto.subtotal);
  return round2(gasto.total);
}

/** Estado de pago derivado — SIEMPRE desde la CxP asociada, nunca una segunda fuente persistida. Reutiliza `recalcularEstadoPagoComprobante` (mismo mapeo que `ComprobanteCompra`). */
export function resolverEstadoPagoGasto(cuentaPorPagar: CuentaPorPagar | undefined): EstadoPagoGasto {
  if (!cuentaPorPagar) return 'pendiente';
  return recalcularEstadoPagoComprobante(cuentaPorPagar.estadoPago);
}

/** Un gasto puede editarse mientras no tenga ningún pago aplicado — mismo criterio que bloquea editar campos financieros de un ComprobanteCompra con pagos activos. */
export function puedeEditarGasto(gasto: Pick<Gasto, 'estadoDocumento' | 'pagosRelacionados'>): boolean {
  return gasto.estadoDocumento === 'registrado' && gasto.pagosRelacionados.length === 0;
}

/** Bloqueo de anulación — reutiliza `tieneCxPPagosActivos` (genérica, ya usada por Compras), nunca una segunda regla de "pagos activos". */
export function motivoBloqueoAnulacionGasto(
  gasto: Pick<Gasto, 'estadoDocumento'>,
  cuentaPorPagar: CuentaPorPagar | undefined,
  pagos: readonly PagoCompra[],
): string | null {
  if (gasto.estadoDocumento === 'anulado') return 'Este gasto ya fue anulado.';
  if (cuentaPorPagar && tieneCxPPagosActivos(cuentaPorPagar, [...pagos])) {
    return 'Este gasto tiene pagos activos. Anula primero los pagos relacionados.';
  }
  return null;
}

export function puedeAnularGasto(
  gasto: Pick<Gasto, 'estadoDocumento'>,
  cuentaPorPagar: CuentaPorPagar | undefined,
  pagos: readonly PagoCompra[],
): boolean {
  return motivoBloqueoAnulacionGasto(gasto, cuentaPorPagar, pagos) === null;
}

/**
 * Datos de prefill para "Duplicar gasto" — nunca un clon silencioso: el
 * usuario revisa y confirma en el formulario de creación antes de que exista
 * un nuevo registro (§2 del alcance: sin plantillas ni generación automática).
 * Omite deliberadamente fechas, observaciones y adjuntos — son propios de
 * cada ocurrencia real, no de la plantilla implícita.
 */
export function datosParaDuplicarGasto(gasto: Gasto): Omit<DatosNuevoGasto, 'fechaReconocimiento'> {
  return {
    empresaId: gasto.empresaId,
    establecimientoId: gasto.establecimientoId,
    categoriaId: gasto.categoriaId,
    concepto: gasto.concepto,
    proveedorId: gasto.proveedorId,
    proveedorNombre: gasto.proveedorNombre,
    proveedorNumeroDocumento: gasto.proveedorNumeroDocumento,
    beneficiario: gasto.beneficiario,
    tipoDocumento: gasto.tipoDocumento,
    moneda: gasto.moneda,
    tipoCambio: gasto.tipoCambio,
    subtotal: gasto.subtotal,
    impuesto: gasto.impuesto,
    total: gasto.total,
    tratamientoImpuesto: gasto.tratamientoImpuesto,
    condicionPago: gasto.condicionPago,
  };
}
