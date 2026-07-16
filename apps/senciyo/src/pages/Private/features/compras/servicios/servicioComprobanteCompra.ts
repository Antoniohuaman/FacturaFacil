import { createElement } from 'react';
import type { ComprobanteCompra } from '../modelos/ComprobanteCompra';
import type { ErrorValidacion } from './tiposServiciosCompras';
import {
  validarFechaVencimientoCredito,
  validarLineasCompra,
  calcularEstadoPrincipalCC,
  calcularTotalesLineas,
  construirFilasResumenTributarioCompra,
  formatearEtiquetaImpuesto,
} from '../logica/reglasCompras';
import { imprimirComprobante } from '@/shared/impresion/ServicioImpresionComprobante';
import { formatMoney, normalizarImporte } from '@/shared/currency';
import { formatearFechaCompra, formatearNumeroComprobanteCompra } from '../utilidades/formatearCompras';
import { ETIQUETA_ESTADO_PRINCIPAL_CC } from '../constantes/estadosCompras';
import type { EmpresaOC } from './servicioOrdenCompra';

export function validarComprobanteCompraBasico(
  cc: Partial<ComprobanteCompra>,
): ErrorValidacion[] {
  const errores: ErrorValidacion[] = [];

  if (!cc.proveedorId) {
    errores.push({ campo: 'proveedorId', mensaje: 'El proveedor es obligatorio.' });
  }
  if (!cc.tipoComprobanteProveedor) {
    errores.push({ campo: 'tipoComprobanteProveedor', mensaje: 'El tipo de comprobante es obligatorio.' });
  }
  if (!cc.serieProveedor) {
    errores.push({ campo: 'serieProveedor', mensaje: 'La serie del comprobante es obligatoria.' });
  }
  if (!cc.numeroProveedor) {
    errores.push({ campo: 'numeroProveedor', mensaje: 'El número del comprobante es obligatorio.' });
  }
  if (!cc.fechaEmisionProveedor) {
    errores.push({ campo: 'fechaEmisionProveedor', mensaje: 'La fecha de emisión es obligatoria.' });
  }
  if (!cc.moneda) {
    errores.push({ campo: 'moneda', mensaje: 'La moneda es obligatoria.' });
  }
  if (!cc.formaPago) {
    errores.push({ campo: 'formaPago', mensaje: 'La forma de pago es obligatoria.' });
  } else {
    errores.push(
      ...validarFechaVencimientoCredito(cc.formaPago, cc.fechaEmisionProveedor, cc.fechaVencimiento),
    );
  }
  if (!cc.modalidadInventario) {
    errores.push({ campo: 'modalidadInventario', mensaje: 'La modalidad de inventario es obligatoria.' });
  }
  if (!cc.lineas || cc.lineas.length === 0) {
    errores.push({ campo: 'lineas', mensaje: 'Se requiere al menos una línea.' });
  }
  if (cc.lineas) {
    errores.push(...validarLineasCompra(cc.lineas));
    // El total se recalcula siempre desde las líneas (nunca se confía en
    // `cc.totales.total` recibido) y se normaliza con la precisión real de
    // la moneda del documento — nunca dos decimales fijos — antes de exigir
    // que sea estrictamente mayor a cero. Un documento en S/ 0.00 no
    // representa una operación económica real y no debe poder registrarse.
    const totalRecalculado = calcularTotalesLineas(cc.lineas).total;
    if (cc.moneda && Number.isFinite(totalRecalculado) && normalizarImporte(totalRecalculado, cc.moneda) <= 0) {
      errores.push({ campo: 'lineas', mensaje: 'El documento debe tener un total mayor a cero.' });
    }
  }

  return errores;
}

/** Genera una clave única para detectar comprobantes duplicados del mismo proveedor */
export function generarClaveUnicaCC(
  proveedorRuc: string,
  tipoComprobante: string,
  serie: string,
  numero: string,
): string {
  return `${proveedorRuc}|${tipoComprobante}|${serie}|${numero}`.toUpperCase();
}

/**
 * Verifica si ya existe un comprobante de compra registrado con la misma
 * combinación proveedor + tipo + serie + número. Por defecto, un comprobante
 * anulado sigue bloqueando el número (no se reutiliza), ya que el modelo
 * actual no define una política segura de reutilización de numeración anulada.
 */
export function validarComprobanteCompraDuplicado(
  comprobantes: ComprobanteCompra[],
  datos: Pick<
    ComprobanteCompra,
    'proveedorNumeroDocumento' | 'tipoComprobanteProveedor' | 'serieProveedor' | 'numeroProveedor'
  >,
): boolean {
  // Un borrador aún sin tipo/serie/número no tiene identidad que comparar.
  if (!datos.tipoComprobanteProveedor || !datos.serieProveedor || !datos.numeroProveedor) return false;

  const claveNueva = generarClaveUnicaCC(
    datos.proveedorNumeroDocumento,
    datos.tipoComprobanteProveedor,
    datos.serieProveedor,
    datos.numeroProveedor,
  );

  return comprobantes.some((cc) => {
    if (!cc.tipoComprobanteProveedor || !cc.serieProveedor || !cc.numeroProveedor) return false;
    return (
      generarClaveUnicaCC(cc.proveedorNumeroDocumento, cc.tipoComprobanteProveedor, cc.serieProveedor, cc.numeroProveedor) ===
      claveNueva
    );
  });
}

// ---------------------------------------------------------------------------
// Duplicar
// ---------------------------------------------------------------------------

function generarIdLineaDuplicadaCC(): string {
  return `linea-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Prepara los datos editables de un CC para duplicarlo como un nuevo
 * borrador independiente (mismo patrón que prepararDuplicadoOC). No copia
 * tipoComprobanteProveedor/serieProveedor/numeroProveedor/fechaEmisionProveedor:
 * son la identidad real del documento físico del proveedor — copiarlos
 * dispararía la propia validación de duplicado. Tampoco copia id/estados/
 * historial/CxP/pagos/adjuntos/documentos relacionados. Copia profunda de
 * líneas y cronograma (sin compartir arrays/objetos por referencia).
 */
export function prepararDuplicadoCC(original: ComprobanteCompra): Partial<ComprobanteCompra> {
  return {
    proveedorId: original.proveedorId,
    proveedorTipoDocumento: original.proveedorTipoDocumento,
    proveedorNumeroDocumento: original.proveedorNumeroDocumento,
    proveedorNombre: original.proveedorNombre,
    proveedorDireccionFacturacion: original.proveedorDireccionFacturacion,
    proveedorDireccionEntrega: original.proveedorDireccionEntrega,
    tipoOperacion: original.tipoOperacion,
    moneda: original.moneda,
    tipoCambio: original.tipoCambio,
    formaPago: original.formaPago,
    formaPagoMetodoId: original.formaPagoMetodoId,
    condicionesPago: original.condicionesPago,
    creditTerms: original.creditTerms ? structuredClone(original.creditTerms) : undefined,
    modalidadInventario: original.modalidadInventario,
    centroCosto: original.centroCosto,
    presupuesto: original.presupuesto,
    observaciones: original.observaciones,
    observacionPresupuestal: original.observacionPresupuestal,
    lineas: original.lineas.map((linea) => ({ ...structuredClone(linea), id: generarIdLineaDuplicadaCC() })),
  };
}

// ---------------------------------------------------------------------------
// Impresión / PDF
// ---------------------------------------------------------------------------

const ESTILO_TH = {
  padding: '5px 8px',
  fontWeight: 'bold' as const,
  color: '#4B5563',
  textAlign: 'left' as const,
  border: '1px solid #E5E7EB',
  fontSize: '10px',
  textTransform: 'uppercase' as const,
  background: '#F9FAFB',
};

const ESTILO_TD = {
  padding: '5px 8px',
  border: '1px solid #E5E7EB',
  verticalAlign: 'top' as const,
  fontSize: '11px',
};

function fila(label: string, valor: string) {
  return createElement(
    'div',
    { style: { display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: '11px' } },
    createElement('span', { style: { color: '#6B7280' } }, label),
    createElement('span', { style: { fontWeight: 600, color: '#111827' } }, valor || '—'),
  );
}

function seccion(titulo: string, children: ReturnType<typeof createElement>[]) {
  return createElement(
    'div',
    { style: { marginTop: '14px' } },
    createElement(
      'p',
      { style: { fontSize: '10px', textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: '#9CA3AF', marginBottom: '4px', fontWeight: 700 } },
      titulo,
    ),
    ...children,
  );
}

/**
 * Construye la representación imprimible del Comprobante de Compra. Mismo
 * patrón que construirRepresentacionImpresaOC (servicioOrdenCompra.ts): sin
 * componente/archivo separado, createElement inline, reutilizando
 * calcularTotalesLineas/construirFilasResumenTributarioCompra (no se
 * recalcula ni duplica el desglose tributario).
 */
function construirRepresentacionImpresaCC(
  cc: ComprobanteCompra,
  empresa: EmpresaOC | undefined,
  nombreFormaPago: string,
) {
  const totalesDocumento = calcularTotalesLineas(cc.lineas);
  const numero = formatearNumeroComprobanteCompra(cc);

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
        createElement('h2', { style: { margin: 0, fontSize: '14px' } }, 'COMPROBANTE DE COMPRA'),
        createElement('p', { style: { margin: 0, fontWeight: 700 } }, numero),
        createElement('p', { style: { margin: 0, fontSize: '11px' } }, ETIQUETA_ESTADO_PRINCIPAL_CC[calcularEstadoPrincipalCC(cc)]),
        cc.fechaEmisionProveedor
          ? createElement('p', { style: { margin: 0, fontSize: '11px' } }, `Emisión: ${formatearFechaCompra(cc.fechaEmisionProveedor)}`)
          : null,
        cc.fechaVencimiento
          ? createElement('p', { style: { margin: 0, fontSize: '11px' } }, `Vencimiento: ${formatearFechaCompra(cc.fechaVencimiento)}`)
          : null,
      ),
    ),
    seccion('Proveedor', [
      fila('Nombre', cc.proveedorNombre),
      fila('Documento', `${cc.proveedorTipoDocumento === '6' ? 'RUC' : 'DOC'} ${cc.proveedorNumeroDocumento}`),
      cc.proveedorDireccionFacturacion ? fila('Dirección de facturación', cc.proveedorDireccionFacturacion) : null,
      cc.proveedorDireccionEntrega ? fila('Dirección de entrega', cc.proveedorDireccionEntrega) : null,
    ].filter(Boolean) as ReturnType<typeof createElement>[]),
    seccion('Condiciones', [
      cc.compradorNombre ? fila('Comprador', cc.compradorNombre) : null,
      fila('Forma de pago', nombreFormaPago),
      cc.tipoOperacion ? fila('Tipo de operación', cc.tipoOperacion) : null,
    ].filter(Boolean) as ReturnType<typeof createElement>[]),
    cc.formaPago === 'credito' && cc.creditTerms && cc.creditTerms.schedule.length > 0
      ? seccion('Cronograma de crédito', [
          createElement(
            'table',
            { style: { width: '100%', borderCollapse: 'collapse' as const, marginTop: '4px' } },
            createElement(
              'thead',
              null,
              createElement(
                'tr',
                null,
                createElement('th', { style: ESTILO_TH }, 'N°'),
                createElement('th', { style: ESTILO_TH }, 'Vencimiento'),
                createElement('th', { style: { ...ESTILO_TH, textAlign: 'right' as const } }, '%'),
                createElement('th', { style: { ...ESTILO_TH, textAlign: 'right' as const } }, 'Importe'),
              ),
            ),
            createElement(
              'tbody',
              null,
              ...cc.creditTerms.schedule.map((cuota) =>
                createElement(
                  'tr',
                  { key: cuota.numeroCuota },
                  createElement('td', { style: ESTILO_TD }, String(cuota.numeroCuota)),
                  createElement('td', { style: ESTILO_TD }, cuota.fechaVencimiento),
                  createElement('td', { style: { ...ESTILO_TD, textAlign: 'right' as const } }, `${cuota.porcentaje}%`),
                  createElement('td', { style: { ...ESTILO_TD, textAlign: 'right' as const } }, formatMoney(cuota.importe, cc.moneda)),
                ),
              ),
            ),
          ),
        ])
      : null,
    seccion('Productos / Servicios', [
      createElement(
        'table',
        { style: { width: '100%', borderCollapse: 'collapse' as const, marginTop: '4px' } },
        createElement(
          'thead',
          null,
          createElement(
            'tr',
            null,
            createElement('th', { style: ESTILO_TH }, 'Descripción'),
            createElement('th', { style: { ...ESTILO_TH, textAlign: 'right' as const } }, 'Cant.'),
            createElement('th', { style: { ...ESTILO_TH, textAlign: 'right' as const } }, 'Costo U.'),
            createElement('th', { style: ESTILO_TH }, 'Impuesto'),
            createElement('th', { style: { ...ESTILO_TH, textAlign: 'right' as const } }, 'Total'),
          ),
        ),
        createElement(
          'tbody',
          null,
          ...cc.lineas.map((linea) =>
            createElement(
              'tr',
              { key: linea.id },
              createElement('td', { style: ESTILO_TD }, linea.nombreProducto),
              createElement('td', { style: { ...ESTILO_TD, textAlign: 'right' as const } }, String(linea.cantidadSolicitada)),
              createElement('td', { style: { ...ESTILO_TD, textAlign: 'right' as const } }, formatMoney(linea.costoUnitario, cc.moneda)),
              createElement('td', { style: ESTILO_TD }, formatearEtiquetaImpuesto(linea.tipoAfectacion, linea.tasaIgv ?? 0)),
              createElement('td', { style: { ...ESTILO_TD, textAlign: 'right' as const } }, formatMoney(linea.total, cc.moneda)),
            ),
          ),
        ),
      ),
    ]),
    seccion('Totales', [
      ...construirFilasResumenTributarioCompra(totalesDocumento).map((filaResumen) =>
        fila(filaResumen.etiqueta, formatMoney(filaResumen.monto, cc.moneda)),
      ),
      totalesDocumento.descuentoTotal > 0 ? fila('Descuentos', `-${formatMoney(totalesDocumento.descuentoTotal, cc.moneda)}`) : null,
      fila('Total', formatMoney(totalesDocumento.total, cc.moneda)),
    ].filter(Boolean) as ReturnType<typeof createElement>[]),
    cc.observaciones ? seccion('Observaciones', [createElement('p', { style: { fontSize: '11px' } }, cc.observaciones)]) : null,
    cc.adjuntos.length > 0
      ? seccion('Adjuntos', [
          createElement(
            'p',
            { style: { fontSize: '11px', color: '#6B7280' } },
            `${cc.adjuntos.length} archivo(s) adjunto(s) — referencia, no incluidos en la impresión.`,
          ),
        ])
      : null,
  );
}

/**
 * Imprime el CC reutilizando el motor de impresión compartido
 * (imprimirComprobante, el mismo usado por OC/GRE/comprobantes electrónicos).
 */
export async function imprimirComprobanteCompra(
  cc: ComprobanteCompra,
  empresa: EmpresaOC | undefined,
  nombreFormaPago: string,
): Promise<void> {
  await imprimirComprobante({
    formato: 'A4',
    titulo: `Comprobante de Compra ${formatearNumeroComprobanteCompra(cc)}`,
    render: () => construirRepresentacionImpresaCC(cc, empresa, nombreFormaPago),
  });
}

/** "Descargar PDF" reutiliza el mismo mecanismo que "Imprimir" (window.print), mismo patrón ya usado por OC. */
export const descargarPdfComprobanteCompra = imprimirComprobanteCompra;
