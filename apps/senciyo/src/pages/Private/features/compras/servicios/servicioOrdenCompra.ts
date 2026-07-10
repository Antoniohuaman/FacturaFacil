import { createElement } from 'react';
import type { OrdenCompra } from '../modelos/OrdenCompra';
import type { LineaCompra } from '../modelos/LineaCompra';
import type { ErrorValidacion } from './tiposServiciosCompras';
import type { ProductUnitOption } from '@/shared/units/productUnitOptions';
import {
  validarFechaVencimientoCredito,
  validarLineasCompra,
  resolverImpuestoProducto,
  calcularEstadoPrincipalOC,
  calcularLineaCompra,
  calcularTotalesLineas,
  formatearEtiquetaImpuesto,
  construirFilasResumenTributarioCompra,
} from '../logica/reglasCompras';
import { imprimirComprobante } from '@/shared/impresion/ServicioImpresionComprobante';
import { formatMoney } from '@/shared/currency';
import { formatearFechaCompra, formatearNumeroCompra } from '../utilidades/formatearCompras';

export function validarOrdenCompraBasica(oc: Partial<OrdenCompra>): ErrorValidacion[] {
  const errores: ErrorValidacion[] = [];

  if (!oc.proveedorId) {
    errores.push({ campo: 'proveedorId', mensaje: 'El proveedor es obligatorio.' });
  }
  if (!oc.moneda) {
    errores.push({ campo: 'moneda', mensaje: 'La moneda es obligatoria.' });
  }
  if (!oc.formaPago) {
    errores.push({ campo: 'formaPago', mensaje: 'La forma de pago es obligatoria.' });
  } else {
    errores.push(...validarFechaVencimientoCredito(oc.formaPago, oc.fechaEmision, oc.fechaVencimiento));
  }
  if (!oc.lineas || oc.lineas.length === 0) {
    errores.push({ campo: 'lineas', mensaje: 'Se requiere al menos una línea.' });
  }
  if (oc.lineas) {
    errores.push(...validarLineasCompra(oc.lineas));
    const totalRecalculado = calcularTotalesLineas(oc.lineas).total;
    if (!Number.isFinite(totalRecalculado)) {
      errores.push({ campo: 'totales.total', mensaje: 'El total de la orden no es un valor numérico válido.' });
    }
  }

  return errores;
}

export interface ProductDataLineaCompra {
  productoId: string;
  codigoProducto?: string;
  nombre: string;
  precioCompra?: number;
  unidadMedida?: string;
  unidadMedidaCodigo?: string;
  unidadesDisponibles: ProductUnitOption[];
  imagen?: string;
  stockReferencia?: number;
  alias?: string;
  descripcion?: string;
  categoria?: string;
  marca?: string;
  modelo?: string;
  tipoExistencia?: string;
  codigoBarras?: string;
  codigoFabrica?: string;
  codigoSunat?: string;
  peso?: number;
  /** Etiqueta de impuesto propia del producto (ej. "IGV (18.00%)"), tal como la define Productos. */
  impuestoProducto?: string;
  esServicio: boolean;
}

/**
 * Construye una línea de compra a partir de un producto real del catálogo.
 * Toda línea de Compras se origina en un producto: unidad, impuesto/afectación
 * y clasificación se toman del producto, nunca se inventan aquí.
 */
export function crearLineaCompraDesdeProducto(
  id: string,
  productData: ProductDataLineaCompra,
  cantidad: number,
): LineaCompra {
  const { tipoAfectacion, tasaIgv } = resolverImpuestoProducto(productData.impuestoProducto);
  const costoUnitario = productData.precioCompra ?? 0;
  const { baseImponible, igv, total } = calcularLineaCompra({
    cantidadSolicitada: cantidad,
    costoUnitario,
    tipoAfectacion,
    tasaIgv,
  });

  return {
    id,
    productoId: productData.productoId,
    codigoProducto: productData.codigoProducto ?? '',
    nombreProducto: productData.nombre,
    imagen: productData.imagen,
    stockReferencia: productData.stockReferencia,
    alias: productData.alias,
    descripcion: productData.descripcion,
    categoria: productData.categoria,
    marca: productData.marca,
    modelo: productData.modelo,
    tipoExistencia: productData.tipoExistencia,
    codigoBarras: productData.codigoBarras,
    codigoFabrica: productData.codigoFabrica,
    codigoSunat: productData.codigoSunat,
    peso: productData.peso,
    precioCompraReferencia: productData.precioCompra,
    clasificacion: productData.esServicio ? 'servicio' : 'producto',
    afectaInventario: false,
    unidadMedida: productData.unidadMedida ?? '',
    unidadMedidaCodigo: productData.unidadMedidaCodigo ?? productData.unidadMedida ?? '',
    unidadesDisponibles: productData.unidadesDisponibles,
    cantidadSolicitada: cantidad,
    cantidadRecibida: 0,
    cantidadFacturada: 0,
    cantidadIngresadaInventario: 0,
    cantidadPendienteRecepcion: cantidad,
    cantidadPendienteFacturacion: 0,
    cantidadPendienteInventario: 0,
    costoUnitario,
    subtotal: baseImponible,
    tipoAfectacion,
    tasaIgv,
    igv,
    total,
  };
}

// ---------------------------------------------------------------------------
// Impresión / PDF / Enviar
// ---------------------------------------------------------------------------

export interface EmpresaOC {
  razonSocial?: string;
  ruc?: string;
  direccion?: string;
}

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
 * Construye la representación imprimible de la Orden de Compra. No se crea
 * un componente/archivo separado (regla de la tarea): el árbol se arma con
 * createElement, siguiendo el mismo patrón visual usado por
 * RepresentacionImpresaGRE (estilos inline, sin depender de clases Tailwind
 * dentro del iframe de impresión).
 */
function construirRepresentacionImpresaOC(
  oc: OrdenCompra,
  empresa: EmpresaOC | undefined,
  nombreFormaPago: string,
) {
  // Misma fuente que el formulario y el drawer: se reconstruye el desglose
  // tributario desde las líneas persistidas, nunca desde oc.totales plano.
  const totalesDocumento = calcularTotalesLineas(oc.lineas);

  return createElement(
    'div',
    { style: { fontFamily: 'Arial, sans-serif', padding: '28px', color: '#111827' } },
    // Encabezado: empresa + documento
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
        createElement('h2', { style: { margin: 0, fontSize: '14px' } }, 'ORDEN DE COMPRA'),
        createElement('p', { style: { margin: 0, fontWeight: 700 } }, formatearNumeroCompra(oc.serie, oc.correlativo || undefined)),
        createElement('p', { style: { margin: 0, fontSize: '11px' } }, calcularEstadoPrincipalOC(oc)),
        createElement('p', { style: { margin: 0, fontSize: '11px' } }, `Emisión: ${formatearFechaCompra(oc.fechaEmision)}`),
        oc.fechaVencimiento
          ? createElement('p', { style: { margin: 0, fontSize: '11px' } }, `Vencimiento: ${formatearFechaCompra(oc.fechaVencimiento)}`)
          : null,
      ),
    ),
    // Proveedor / Contacto / Envío
    seccion('Proveedor', [
      fila('Nombre', oc.proveedorNombre),
      fila('Documento', `${oc.proveedorTipoDocumento === '6' ? 'RUC' : 'DOC'} ${oc.proveedorNumeroDocumento}`),
      oc.proveedorDireccionFacturacion ? fila('Dirección de facturación', oc.proveedorDireccionFacturacion) : null,
      oc.proveedorDireccionEntrega ? fila('Dirección de entrega', oc.proveedorDireccionEntrega) : null,
    ].filter(Boolean) as ReturnType<typeof createElement>[]),
    oc.proveedorContactoNombre
      ? seccion('Contacto', [
          fila('Nombre', oc.proveedorContactoNombre),
          oc.proveedorContactoCargo ? fila('Cargo', oc.proveedorContactoCargo) : null,
          oc.proveedorContactoCorreo ? fila('Correo', oc.proveedorContactoCorreo) : null,
          oc.proveedorContactoTelefono ? fila('Teléfono', oc.proveedorContactoTelefono) : null,
        ].filter(Boolean) as ReturnType<typeof createElement>[])
      : null,
    seccion('Condiciones', [
      fila('Comprador', oc.compradorNombre ?? '—'),
      fila('Forma de pago', nombreFormaPago),
      oc.metodoEnvio ? fila('Método de envío', oc.metodoEnvio) : null,
    ].filter(Boolean) as ReturnType<typeof createElement>[]),
    // Cronograma de crédito
    oc.formaPago === 'credito' && oc.creditTerms && oc.creditTerms.schedule.length > 0
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
              ...oc.creditTerms.schedule.map((cuota) =>
                createElement(
                  'tr',
                  { key: cuota.numeroCuota },
                  createElement('td', { style: ESTILO_TD }, String(cuota.numeroCuota)),
                  createElement('td', { style: ESTILO_TD }, cuota.fechaVencimiento),
                  createElement('td', { style: { ...ESTILO_TD, textAlign: 'right' as const } }, `${cuota.porcentaje}%`),
                  createElement('td', { style: { ...ESTILO_TD, textAlign: 'right' as const } }, formatMoney(cuota.importe, oc.moneda)),
                ),
              ),
            ),
          ),
        ])
      : null,
    // Productos
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
          ...oc.lineas.map((linea) =>
            createElement(
              'tr',
              { key: linea.id },
              createElement('td', { style: ESTILO_TD }, linea.nombreProducto),
              createElement('td', { style: { ...ESTILO_TD, textAlign: 'right' as const } }, String(linea.cantidadSolicitada)),
              createElement('td', { style: { ...ESTILO_TD, textAlign: 'right' as const } }, formatMoney(linea.costoUnitario, oc.moneda)),
              createElement('td', { style: ESTILO_TD }, formatearEtiquetaImpuesto(linea.tipoAfectacion, linea.tasaIgv ?? 0)),
              createElement('td', { style: { ...ESTILO_TD, textAlign: 'right' as const } }, formatMoney(linea.total, oc.moneda)),
            ),
          ),
        ),
      ),
    ]),
    // Totales — mismo cálculo que formulario/drawer (calcularTotalesLineas
    // sobre oc.lineas), desglosado por grupo tributario real.
    seccion('Totales', [
      ...construirFilasResumenTributarioCompra(totalesDocumento).map((filaResumen) =>
        fila(filaResumen.etiqueta, formatMoney(filaResumen.monto, oc.moneda)),
      ),
      totalesDocumento.descuentoTotal > 0 ? fila('Descuentos', `-${formatMoney(totalesDocumento.descuentoTotal, oc.moneda)}`) : null,
      fila('Total', formatMoney(totalesDocumento.total, oc.moneda)),
    ].filter(Boolean) as ReturnType<typeof createElement>[]),
    oc.observaciones ? seccion('Observaciones', [createElement('p', { style: { fontSize: '11px' } }, oc.observaciones)]) : null,
  );
}

/**
 * Imprime la OC reutilizando el motor de impresión compartido
 * (imprimirComprobante, el mismo usado por GRE y comprobantes electrónicos).
 * No se genera un archivo de plantilla separado: el árbol se construye
 * inline con createElement, ya que la tarea prohíbe crear archivos nuevos.
 */
export async function imprimirOrdenCompra(
  oc: OrdenCompra,
  empresa: EmpresaOC | undefined,
  nombreFormaPago: string,
): Promise<void> {
  await imprimirComprobante({
    formato: 'A4',
    titulo: `Orden de Compra ${formatearNumeroCompra(oc.serie, oc.correlativo || undefined)}`,
    render: () => construirRepresentacionImpresaOC(oc, empresa, nombreFormaPago),
  });
}

/**
 * "Descargar PDF" reutiliza el mismo mecanismo que "Imprimir" (window.print
 * del navegador permite guardar como PDF) — es el patrón real y único que
 * usa todo el sistema hoy (ver DetalleNotaIngreso.tsx); no existe ningún
 * generador de blob PDF en ningún módulo de SenciYo.
 */
export const descargarPdfOrdenCompra = imprimirOrdenCompra;

/**
 * Comparte la OC por WhatsApp usando el teléfono real del contacto elegido
 * (patrón ya existente y funcional en comprobantes-electronicos/SuccessModal,
 * único mecanismo real de "compartir" en el repo — no se replica el "enviar
 * por correo" de esa pantalla porque ahí es una simulación con alert/setTimeout,
 * prohibida por las reglas de esta tarea).
 */
export function compartirOrdenCompraPorWhatsApp(oc: OrdenCompra): void {
  const telefono = oc.proveedorContactoTelefono?.replace(/\D/g, '');
  if (!telefono) {
    throw new Error('El proveedor no tiene un teléfono de contacto registrado para enviar por WhatsApp.');
  }
  const mensaje = encodeURIComponent(
    `Orden de Compra ${formatearNumeroCompra(oc.serie, oc.correlativo || undefined)} — ${oc.proveedorNombre} — Total: ${formatMoney(oc.totales.total, oc.moneda)}`,
  );
  window.open(`https://wa.me/${telefono}?text=${mensaje}`, '_blank', 'noopener,noreferrer');
}

// ---------------------------------------------------------------------------
// Duplicar
// ---------------------------------------------------------------------------

function generarIdLineaDuplicada(): string {
  return `linea-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Prepara los datos editables de una OC para duplicarla como un nuevo
 * borrador independiente (sección 13-16 del alcance). Devuelve exactamente
 * la forma que ya acepta `ocBase` en el formulario: sin id/correlativo/
 * número/estados/historial/relaciones/adjuntos — el usuario decide si
 * guarda borrador o registra. Copia profunda de líneas y cronograma (no se
 * comparten arrays/objetos por referencia con la orden original).
 */
export function prepararDuplicadoOC(original: OrdenCompra): Partial<OrdenCompra> {
  return {
    serie: original.serie,
    proveedorId: original.proveedorId,
    proveedorTipoDocumento: original.proveedorTipoDocumento,
    proveedorNumeroDocumento: original.proveedorNumeroDocumento,
    proveedorNombre: original.proveedorNombre,
    proveedorDireccionFacturacion: original.proveedorDireccionFacturacion,
    proveedorDireccionEntrega: original.proveedorDireccionEntrega,
    proveedorContactoId: original.proveedorContactoId,
    proveedorContactoNombre: original.proveedorContactoNombre,
    proveedorContactoCargo: original.proveedorContactoCargo,
    proveedorContactoCorreo: original.proveedorContactoCorreo,
    proveedorContactoTelefono: original.proveedorContactoTelefono,
    metodoEnvio: original.metodoEnvio,
    moneda: original.moneda,
    tipoCambio: original.tipoCambio,
    formaPago: original.formaPago,
    formaPagoMetodoId: original.formaPagoMetodoId,
    creditTerms: original.creditTerms ? structuredClone(original.creditTerms) : undefined,
    requiereAprobacion: original.requiereAprobacion,
    centroCosto: original.centroCosto,
    presupuesto: original.presupuesto,
    observaciones: original.observaciones,
    lineas: original.lineas.map((linea) => ({ ...structuredClone(linea), id: generarIdLineaDuplicada() })),
  };
}
