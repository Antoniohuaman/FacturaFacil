import type { DocumentoComercial } from '../models/documentoComercial.types';
import type {
  CargaReutilizacionDocumentoComercial,
  InstantaneaDocumentoComercial,
} from '../../comprobantes-electronicos/models/instantaneaDocumentoComercial';
import type { TipoComprobante } from '../../comprobantes-electronicos/models/comprobante.types';

/**
 * Determina si la OV debe abrir como Factura o Boleta según el documento del cliente.
 */
export function determinarTipoComprobante(tipoDocumentoCliente?: string): TipoComprobante {
  if (!tipoDocumentoCliente) return 'boleta';
  return tipoDocumentoCliente.toUpperCase() === 'RUC' ? 'factura' : 'boleta';
}

/**
 * Mapea el tipo de documento del cliente al código SUNAT correspondiente.
 */
function codigoSunatDocumento(tipoDocumento?: string): string | null {
  const tipo = (tipoDocumento ?? '').toUpperCase();
  if (tipo === 'RUC') return '6';
  if (tipo === 'DNI') return '1';
  if (tipo === 'CE') return '4';
  if (tipo === 'PAS') return '7';
  return null;
}

/**
 * Valida que la OV esté en condiciones de ser convertida a comprobante.
 */
export function validarOVParaConversion(
  ov: DocumentoComercial,
): { valido: boolean; error?: string } {
  if (ov.tipo !== 'orden_venta') {
    return { valido: false, error: 'Solo se pueden convertir Órdenes de Venta.' };
  }
  if (ov.estado !== 'Reservada') {
    return { valido: false, error: 'Solo se pueden convertir Órdenes de Venta en estado Reservada.' };
  }
  if (!ov.numero) {
    return { valido: false, error: 'La Orden de Venta no tiene número asignado.' };
  }
  if (!ov.cliente) {
    return { valido: false, error: 'La Orden de Venta requiere un cliente para generar el comprobante.' };
  }
  if (!ov.items.length) {
    return { valido: false, error: 'La Orden de Venta no tiene productos o servicios.' };
  }

  // Verificar que todos los bienes que requieren stock tengan reserva registrada
  for (const item of ov.items) {
    if (item.tipoBienServicio === 'servicio' || item.tipoDetalle === 'libre') continue;
    if (item.requiresStockControl !== true) continue;
    const tieneReserva = ov.reservasStock?.some((r) => r.sku === item.code);
    if (!tieneReserva) {
      return {
        valido: false,
        error: `No se puede generar el comprobante porque la orden de venta no tiene una reserva de stock válida para el producto "${item.name}".`,
      };
    }
  }

  return { valido: true };
}

/**
 * Construye el estado de navegación para abrir el formulario de comprobantes
 * precargado con los datos de la Orden de Venta.
 *
 * El patrón usado es el mismo que usa duplicación/conversión existente:
 * `{ fromConversion: true, conversionData: CargaReutilizacionDocumentoComercial }`
 *
 * La clave `relaciones.idDocumentoFuente = ov.id` y
 * `relaciones.tipoDocumentoFuente = 'orden_venta'` son leídas por
 * `useDuplicateDataLoader` para escribir `conversionSourceId/Type` en
 * sessionStorage, que luego usa `useComprobanteActions` en step 7.
 */
export function construirCargaConversionDesdeOV(
  ov: DocumentoComercial,
): { state: { fromConversion: true; conversionData: CargaReutilizacionDocumentoComercial } } {
  const tipoComprobante = determinarTipoComprobante(ov.cliente?.tipoDocumento);
  const refOV = ov.numero ?? '';

  // Agregar referencia a la OV en las observaciones
  const observaciones = ov.observaciones
    ? `${ov.observaciones}\nRef. OV: ${refOV}`
    : `Ref. OV: ${refOV}`;

  const instantanea: InstantaneaDocumentoComercial = {
    version: 1,
    identidad: {
      tipoDocumento: 'documento_comercial',
      tipoComprobante,
      codigoSunat: tipoComprobante === 'factura' ? '01' : '03',
      serie: null,
      correlativo: null,
      numeroCompleto: null,
      fechaEmision: ov.fechaEmision,
      horaEmision: null,
      moneda: ov.moneda,
      tipoCambio: ov.tipoCambio ?? null,
      origen: 'conversion',
      idDocumento: ov.id,
      idInterno: ov.numero ?? null,
    },
    empresa: {
      idEmpresa: null,
      nombreComercial: null,
      razonSocial: null,
      ruc: null,
    },
    establecimiento: {
      idEstablecimiento: ov.establecimientoId ?? null,
      codigoEstablecimiento: null,
      nombreEstablecimiento: null,
    },
    vendedor: {
      idUsuario: ov.vendedorId ?? null,
      nombreUsuario: ov.vendedor ?? null,
    },
    cliente: {
      idCliente: ov.cliente ? String(ov.cliente.clienteId ?? '') || null : null,
      nombre: ov.cliente?.nombre ?? '',
      tipoDocumento: ov.cliente?.tipoDocumento ?? null,
      numeroDocumento: ov.cliente?.numeroDocumento ?? null,
      codigoSunatDocumento: codigoSunatDocumento(ov.cliente?.tipoDocumento),
      email: ov.cliente?.email ?? null,
      telefono: null,
      direccion: ov.cliente?.direccion ?? null,
      priceProfileId: ov.cliente?.priceProfileId ?? null,
    },
    camposComerciales: {
      direccionEnvio: ov.camposOpcionales?.direccionEnvio ?? null,
      ordenCompra: ov.camposOpcionales?.ordenCompra ?? null,
      guiaRemision: ov.camposOpcionales?.guiaRemision ?? null,
      centroCosto: ov.camposOpcionales?.centroCosto ?? null,
      observaciones,
      notaInterna: ov.notaInterna ?? null,
      fechaVencimiento: ov.camposOpcionales?.fechaVencimiento ?? null,
      formaPagoId: null,
      formaPagoDescripcion: ov.formaPago ?? null,
      detallesPago: null,
      terminosCredito: null,
    },
    detalle: {
      items: ov.items,
      modoDetalle: ov.modoItems === 'libre' ? 'libre' : 'catalogo',
      contieneItemsCatalogo: ov.modoItems !== 'libre',
      contieneItemsLibres: ov.modoItems === 'libre',
    },
    totales: ov.totales,
    relaciones: {
      documentoOrigenId: ov.id,
      documentoOrigenTipo: 'orden_venta',
      documentoRelacionadoId: null,
      documentoRelacionadoTipo: null,
      datosNotaCredito: null,
      // Estos campos son leídos por useDuplicateDataLoader para set sessionStorage
      idDocumentoFuente: ov.id,
      tipoDocumentoFuente: 'orden_venta',
    },
  };

  return {
    state: {
      fromConversion: true,
      conversionData: {
        instantaneaDocumentoComercial: instantanea,
        datosNotaCredito: null,
      },
    },
  };
}
