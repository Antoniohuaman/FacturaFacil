import type { DocumentoComercial } from '../models/documentoComercial.types';
import type {
  CargaReutilizacionDocumentoComercial,
  InstantaneaDocumentoComercial,
} from '../../comprobantes-electronicos/models/instantaneaDocumentoComercial';
import type { TipoComprobante, CartItem } from '../../comprobantes-electronicos/models/comprobante.types';
import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';
import { useProductStore } from '../../catalogo-articulos/hooks/useProductStore';
import { getAvailableStockForUnit } from '@/shared/inventory/stockGateway';

/**
 * Parámetros de contexto de inventario para que los items del comprobante
 * muestren el stock disponible real en lugar del stock congelado de la OV.
 */
export interface OpcionesConversionOV {
  almacenes: Almacen[];
  establecimientoId?: string;
}

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
 * Refresca el campo `stock` de un CartItem desde el inventario actual.
 * Usa la misma fuente y lógica que usa el formulario de comprobantes directos:
 * `getAvailableStockForUnit` de stockGateway (real − reservado en la unidad del ítem).
 *
 * No modifica ítems de entrada libre — éstos no tienen respaldo en catálogo.
 * Si el producto no se encuentra en el store, mantiene el campo original.
 *
 * Exportada también para reutilizar en duplicación de documentos comerciales.
 */
export function refrescarStockItem(
  item: CartItem,
  almacenes: Almacen[],
  establecimientoId: string | undefined,
): CartItem {
  if (item.tipoDetalle === 'libre') return item;
  if (!item.code) return item;

  const productos = useProductStore.getState().allProducts;
  const producto = productos.find((p) => p.codigo === item.code);
  if (!producto) return item;

  const unitCode =
    (item as { presentacionId?: string }).presentacionId ||
    item.unidadMedida ||
    (item as { unit?: string }).unit ||
    undefined;

  const stockInfo = getAvailableStockForUnit({
    product: producto,
    almacenes,
    EstablecimientoId: establecimientoId,
    unitCode,
  });

  return { ...item, stock: stockInfo.availableInUnidadSeleccionada };
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
 * IMPORTANTE — stock en tiempo real:
 * Recalcula el campo `stock` de cada ítem desde el inventario actual usando
 * `getAvailableStockForUnit`, que es la misma fuente que usa el comprobante
 * directo y el POS. El stock congelado en la OV NO se usa como valor visible.
 *
 * El disponible mostrado = stock real del almacén − stock reservado total.
 * Esto puede ser menor que la cantidad de la OV (porque la OV ya reservó stock),
 * pero `createComprobante` puede atenderla porque `allocateSaleAcrossalmacenes`
 * con `respectReservations: true` asigna desde el disponible actual y la OV
 * libera su reserva en step 7 post-emisión.
 */
export function construirCargaConversionDesdeOV(
  ov: DocumentoComercial,
  opciones?: OpcionesConversionOV,
): { state: { fromConversion: true; conversionData: CargaReutilizacionDocumentoComercial } } {
  const almacenes = opciones?.almacenes ?? [];
  const establecimientoId = opciones?.establecimientoId;

  const tipoComprobante = determinarTipoComprobante(ov.cliente?.tipoDocumento);
  const refOV = ov.numero ?? '';

  const observaciones = ov.observaciones
    ? `${ov.observaciones}\nRef. OV: ${refOV}`
    : `Ref. OV: ${refOV}`;

  // Refrescar stock de cada ítem desde inventario actual (misma fuente que comprobante directo)
  const itemsConStockActual = ov.items.map((item) =>
    refrescarStockItem(item, almacenes, establecimientoId),
  );

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
      items: itemsConStockActual,   // stock en tiempo real, no congelado
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
