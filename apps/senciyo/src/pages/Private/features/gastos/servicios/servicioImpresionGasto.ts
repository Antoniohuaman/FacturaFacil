// gastos/servicios/servicioImpresionGasto.ts
//
// Constancia imprimible del gasto — reutiliza el MISMO motor de impresión
// compartido que Compras (`imprimirComprobante` en
// `@/shared/impresion/ServicioImpresionComprobante.ts`, el que también usan
// Pago de Compra/Orden de Compra), con el mismo patrón de composición
// inline vía `createElement` que `servicioPagoCompra.ts`. Nunca presentado
// como comprobante tributario emitido por SenciYo (encabezado dice
// "CONSTANCIA / DETALLE DE GASTO", nunca "Factura"/"Boleta"). "Imprimir /
// Guardar PDF" abre el mismo diálogo nativo del navegador — no existe una
// descarga de PDF distinta (mismo criterio honesto que
// `descargarPdfPagoCompra = imprimirPagoCompra` en Compras).

import { createElement } from 'react';
import { imprimirComprobante } from '@/shared/impresion/ServicioImpresionComprobante';
import { formatMoney } from '@/shared/currency';
import { formatearFecha } from '@/shared/formatters/fechas';
import type { CuentaPorPagar } from '../../compras/modelos/CuentaPorPagar';
import type { PagoCompra } from '../../compras/modelos/PagoCompra';
import type { Series } from '../../configuracion-sistema/modelos/Series';
import {
  ESTADO_PAGO_GASTO_LABELS,
  TRATAMIENTO_IMPUESTO_GASTO_LABELS,
  type Gasto,
  type EstadoPagoGasto,
} from '../modelos/Gasto';
import { importeReconocidoComoGasto, presentarReferenciaGasto, presentarEstadoDocumentoGasto, nombreDocumentoSustentatorioGasto, esBorradorDescartadoGasto } from './servicioGasto';

/** Datos de empresa para el encabezado — forma mínima y neutral (no importa `EmpresaOC` de Compras: el mismo shape, sin acoplar Gastos a ese módulo). */
export interface EmpresaImpresionGasto {
  razonSocial?: string;
  ruc?: string;
  direccion?: string;
}

export interface DatosImpresionGasto {
  gasto: Gasto;
  empresa?: EmpresaImpresionGasto;
  categoriaNombre: string;
  establecimientoNombre: string;
  /** Nombre de la forma de pago configurada en Configuración de Negocio → Pagos (§8/§22 de la corrección) — nunca "Contado"/"Crédito" a secas, que es solo la condición derivada. */
  formaPagoNombre?: string;
  cuentaPorPagar?: CuentaPorPagar;
  pagos: readonly PagoCompra[];
  estadoPago: EstadoPagoGasto;
  /** Catálogo central de Series — para resolver "G001 · Sin correlativo" si el gasto impreso es un borrador (corrección técnica final §11), nunca una serie inventada. */
  series?: readonly Pick<Series, 'id' | 'series'>[];
}

function fila(label: string, valor: string) {
  return createElement(
    'div',
    { style: { display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: '11px' } },
    createElement('span', { style: { color: '#6B7280' } }, label),
    createElement('span', { style: { fontWeight: 600, color: '#111827' } }, valor || '—'),
  );
}

function seccion(titulo: string, children: Array<ReturnType<typeof createElement> | null>) {
  const contenido = children.filter(Boolean);
  if (contenido.length === 0) return null;
  return createElement(
    'div',
    { style: { marginTop: '14px' } },
    createElement(
      'p',
      { style: { fontSize: '10px', textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: '#9CA3AF', marginBottom: '4px', fontWeight: 700 } },
      titulo,
    ),
    ...contenido,
  );
}

/** Construye la representación imprimible del gasto. Mismo patrón que `construirRepresentacionImpresaPago` (servicioPagoCompra.ts): sin componente/archivo separado, createElement inline. Exportada para poder verificar en tests (vía `renderToStaticMarkup`) que contiene los campos exigidos por la constancia. */
export function construirRepresentacionImpresaGasto(datos: DatosImpresionGasto) {
  const { gasto, empresa, categoriaNombre, establecimientoNombre, formaPagoNombre, cuentaPorPagar, pagos, estadoPago, series = [] } = datos;
  const importeReconocido = importeReconocidoComoGasto(gasto);

  return createElement(
    'div',
    { style: { fontFamily: 'Arial, sans-serif', padding: '28px', color: '#111827' } },
    createElement(
      'div',
      { style: { display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #111827', paddingBottom: '12px', marginBottom: '16px' } },
      createElement(
        'div',
        null,
        createElement('h1', { style: { margin: 0, fontSize: '15px' } }, empresa?.razonSocial ?? '—'),
        empresa?.ruc ? createElement('p', { style: { margin: 0, fontSize: '11px' } }, `RUC: ${empresa.ruc}`) : null,
        empresa?.direccion ? createElement('p', { style: { margin: 0, fontSize: '11px' } }, empresa.direccion) : null,
      ),
      createElement(
        'div',
        { style: { textAlign: 'right' as const } },
        createElement('h2', { style: { margin: 0, fontSize: '14px' } }, 'CONSTANCIA / DETALLE DE GASTO'),
        createElement('p', { style: { margin: 0, fontWeight: 700 } }, presentarReferenciaGasto(gasto, series)),
        createElement('p', { style: { margin: 0, fontSize: '11px' } }, presentarEstadoDocumentoGasto(gasto)),
        createElement('p', { style: { margin: 0, fontSize: '11px' } }, gasto.estadoDocumento === 'anulado' ? presentarEstadoDocumentoGasto(gasto) : ESTADO_PAGO_GASTO_LABELS[estadoPago]),
      ),
    ),
    seccion('Datos del gasto', [
      fila('Concepto', gasto.concepto),
      fila('Categoría', categoriaNombre),
      fila('Establecimiento', establecimientoNombre),
      fila('Fecha de reconocimiento', formatearFecha(gasto.fechaReconocimiento)),
      gasto.fechaEmision ? fila('Fecha de emisión', formatearFecha(gasto.fechaEmision)) : null,
      gasto.creadoPor ? fila('Usuario creador', gasto.creadoPor) : null,
    ]),
    seccion('Proveedor o beneficiario', [
      fila('Nombre', gasto.proveedorNombre ?? gasto.beneficiario ?? 'Sin proveedor'),
      gasto.proveedorNumeroDocumento ? fila('Documento', gasto.proveedorNumeroDocumento) : null,
    ]),
    seccion('Documento sustentatorio', [
      // Misma fuente única que el listado/Drawer/Excel (§15 de la
      // corrección final) — nunca una segunda concatenación de
      // tipo/serie/número que podría desalinearse (p. ej. un guion suelto
      // cuando falta uno de los dos).
      fila('Documento', nombreDocumentoSustentatorioGasto(gasto)),
    ]),
    seccion('Importes', [
      fila('Moneda', gasto.moneda),
      fila('Subtotal', formatMoney(gasto.subtotal, gasto.moneda)),
      fila('Impuesto', formatMoney(gasto.impuesto, gasto.moneda)),
      fila('Tratamiento tributario', TRATAMIENTO_IMPUESTO_GASTO_LABELS[gasto.tratamientoImpuesto]),
      fila('Total', formatMoney(gasto.total, gasto.moneda)),
      fila('Importe reconocido como gasto', formatMoney(importeReconocido, gasto.moneda)),
    ]),
    seccion('Condición de pago', [
      fila('Condición', gasto.condicionPago === 'credito' ? 'Crédito' : 'Contado'),
      formaPagoNombre ? fila('Forma de pago', formaPagoNombre) : null,
      gasto.fechaVencimiento ? fila('Vencimiento', formatearFecha(gasto.fechaVencimiento)) : null,
      cuentaPorPagar ? fila('Saldo pendiente', formatMoney(cuentaPorPagar.saldoPendiente, cuentaPorPagar.moneda)) : null,
    ]),
    gasto.creditTerms && gasto.creditTerms.schedule.length > 0
      ? seccion('Cronograma de cuotas', gasto.creditTerms.schedule.map((cuota) =>
          fila(`Cuota ${cuota.numeroCuota} — ${formatearFecha(cuota.fechaVencimiento)}`, formatMoney(cuota.importe, gasto.moneda)),
        ))
      : null,
    pagos.length > 0
      ? seccion('Pagos relacionados', pagos.map((pago) =>
          fila(`${pago.numeroPago}${pago.estadoDocumento === 'anulado' ? ' (anulado)' : ''}`, formatMoney(pago.montoTotalPagado, pago.moneda)),
        ))
      : null,
    pagos.length > 0
      ? seccion('Medios de pago', pagos.flatMap((pago) => pago.mediosPago.map((medio) =>
          fila(`${medio.medioPagoNombre}${medio.referenciaOperacion ? ` (Ref: ${medio.referenciaOperacion})` : ''}`, formatMoney(medio.monto, medio.moneda ?? pago.moneda)),
        )))
      : null,
    gasto.adjuntos.length > 0
      ? seccion('Adjuntos referenciados', gasto.adjuntos.map((adj) => fila(adj.nombreArchivo, adj.tipoAdjunto)))
      : null,
    gasto.observaciones ? seccion('Observaciones', [createElement('p', { style: { fontSize: '11px' } }, gasto.observaciones)]) : null,
    gasto.historial.length > 0
      ? seccion('Historial', gasto.historial.map((h) => fila(`${formatearFecha(h.fecha)} — ${h.accion}`, h.detalle ?? '')))
      : null,
    gasto.estadoDocumento === 'anulado' && gasto.motivoAnulacion
      ? seccion(esBorradorDescartadoGasto(gasto) ? 'Descarte' : 'Anulación', [fila('Motivo', gasto.motivoAnulacion)])
      : null,
  );
}

/**
 * Abre el diálogo de impresión con la constancia estructurada del gasto —
 * el usuario puede imprimir o "Guardar como PDF" desde ese mismo diálogo
 * nativo. `descargarPdfGasto` es un alias honesto (no existe una descarga
 * de PDF distinta), mismo criterio que Compras.
 */
export async function imprimirGasto(datos: DatosImpresionGasto): Promise<void> {
  await imprimirComprobante({
    formato: 'A4',
    titulo: `Gasto ${presentarReferenciaGasto(datos.gasto, datos.series)}`,
    render: () => construirRepresentacionImpresaGasto(datos),
  });
}

export const descargarPdfGasto = imprimirGasto;
