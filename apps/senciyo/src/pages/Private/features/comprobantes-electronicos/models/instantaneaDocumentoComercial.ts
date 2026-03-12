import type {
  CartItem,
  ComprobanteCreditTerms,
  Currency,
  DatosNotaCredito,
  PaymentCollectionPayload,
  PaymentTotals,
  TipoComprobante,
  TipoComprobanteBase,
} from './comprobante.types';
import {
  obtenerCodigoSunatPorTipoComprobante,
  obtenerEtiquetaDocumentoRelacionado,
} from './constants';

export type OrigenDocumentoComercial =
  | 'pos'
  | 'emision_tradicional'
  | 'conversion'
  | 'duplicacion'
  | 'nota_credito'
  | 'documento_comercial'
  | 'desconocido';

export type TipoDocumentoComercial =
  | 'cotizacion'
  | 'nota_venta'
  | 'factura'
  | 'boleta'
  | 'nota_credito'
  | 'documento_comercial';

export type ModoDetalleDocumentoComercial = 'sin_items' | 'catalogo' | 'libre' | 'mixto';

export interface IdentidadDocumentoComercial {
  tipoDocumento: TipoDocumentoComercial;
  tipoComprobante: TipoComprobante | null;
  codigoSunat: string | null;
  serie: string | null;
  correlativo: string | null;
  numeroCompleto: string | null;
  fechaEmision: string | null;
  horaEmision: string | null;
  moneda: Currency | null;
  tipoCambio: number | null;
  origen: OrigenDocumentoComercial;
  idDocumento: string | null;
  idInterno: string | null;
}

export interface EmpresaDocumentoComercial {
  idEmpresa: string | null;
  nombreComercial: string | null;
  razonSocial: string | null;
  ruc: string | null;
}

export interface EstablecimientoDocumentoComercial {
  idEstablecimiento: string | null;
  codigoEstablecimiento: string | null;
  nombreEstablecimiento: string | null;
}

export interface VendedorDocumentoComercial {
  idUsuario: string | null;
  nombreUsuario: string | null;
}

export interface ClienteDocumentoComercial {
  idCliente: string | null;
  nombre: string;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  codigoSunatDocumento: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  priceProfileId: string | null;
}

export interface CamposComercialesDocumentoComercial {
  direccionEnvio: string | null;
  ordenCompra: string | null;
  guiaRemision: string | null;
  centroCosto: string | null;
  observaciones: string | null;
  notaInterna: string | null;
  fechaVencimiento: string | null;
  formaPagoId: string | null;
  formaPagoDescripcion: string | null;
  detallesPago: PaymentCollectionPayload | null;
  terminosCredito: ComprobanteCreditTerms | null;
}

export interface DetalleDocumentoComercial {
  items: CartItem[];
  modoDetalle: ModoDetalleDocumentoComercial;
  contieneItemsCatalogo: boolean;
  contieneItemsLibres: boolean;
}

export interface RelacionesDocumentoComercial {
  documentoOrigenId: string | null;
  documentoOrigenTipo: string | null;
  documentoRelacionadoId: string | null;
  documentoRelacionadoTipo: string | null;
  datosNotaCredito: DatosNotaCredito | null;
  idDocumentoFuente: string | null;
  tipoDocumentoFuente: string | null;
}

export interface InstantaneaDocumentoComercial {
  version: 1;
  identidad: IdentidadDocumentoComercial;
  empresa: EmpresaDocumentoComercial;
  establecimiento: EstablecimientoDocumentoComercial;
  vendedor: VendedorDocumentoComercial;
  cliente: ClienteDocumentoComercial;
  camposComerciales: CamposComercialesDocumentoComercial;
  detalle: DetalleDocumentoComercial;
  totales: PaymentTotals;
  relaciones: RelacionesDocumentoComercial;
}

export interface CargaReutilizacionDocumentoComercial {
  instantaneaDocumentoComercial: InstantaneaDocumentoComercial;
  datosNotaCredito: DatosNotaCredito | null;
}

export interface DatosRehidratacionDocumentoComercial {
  cliente: {
    clienteId?: string;
    nombre: string;
    dni: string;
    direccion: string;
    email?: string;
    tipoDocumento?: string;
    priceProfileId?: string;
  } | null;
  items: CartItem[];
  modoDetalle: ModoDetalleDocumentoComercial;
  observaciones: string;
  notaInterna: string;
  formaPago: string;
  moneda: Currency | null;
  tipoComprobante: TipoComprobante | null;
  camposOpcionales: Record<string, string>;
}

export interface OpcionesCrearInstantaneaDocumentoComercial {
  tipoDocumento: TipoDocumentoComercial;
  tipoComprobante: TipoComprobante | null;
  numeroCompleto: string | null;
  fechaEmision: string | null;
  horaEmision: string | null;
  moneda: Currency | null;
  tipoCambio: number | null;
  origen: OrigenDocumentoComercial;
  idDocumento: string | null;
  idInterno?: string | null;
  empresa?: Partial<EmpresaDocumentoComercial>;
  establecimiento?: Partial<EstablecimientoDocumentoComercial>;
  vendedor?: Partial<VendedorDocumentoComercial>;
  cliente?: Partial<ClienteDocumentoComercial>;
  camposComerciales?: Partial<CamposComercialesDocumentoComercial>;
  items?: CartItem[];
  totales: PaymentTotals;
  relaciones?: Partial<RelacionesDocumentoComercial>;
}

type FilaListadoCompatible = {
  id: string;
  type?: string;
  client?: string;
  clientDoc?: string;
  clientDocType?: string;
  clientId?: string;
  clientPriceProfileId?: string;
  date?: string;
  currency?: string;
  exchangeRate?: number;
  paymentMethod?: string;
  paymentMethodId?: string;
  email?: string;
  dueDate?: string;
  address?: string;
  shippingAddress?: string;
  purchaseOrder?: string;
  costCenter?: string;
  waybill?: string;
  observations?: string;
  internalNote?: string;
  relatedDocumentId?: string;
  relatedDocumentType?: string;
  sourceDocumentId?: string;
  sourceDocumentType?: string;
  items?: CartItem[];
  cartItems?: CartItem[];
  productos?: CartItem[];
  totals?: PaymentTotals;
  creditTerms?: ComprobanteCreditTerms;
  noteCreditData?: DatosNotaCredito;
  instantaneaDocumentoComercial?: InstantaneaDocumentoComercial;
};

const separarNumeroCompleto = (numeroCompleto: string | null, idDocumento: string | null) => {
  const valor = numeroCompleto || idDocumento || '';
  const [serie = '', correlativo = ''] = valor.split('-');
  return {
    serie: serie || null,
    correlativo: correlativo || null,
    numeroCompleto: valor || null,
  };
};

const normalizarTipoComprobanteBase = (valor: string | null | undefined): TipoComprobanteBase | null => {
  if (!valor) {
    return null;
  }

  const normalizado = valor.toLowerCase();
  if (normalizado.includes('boleta')) {
    return 'boleta';
  }
  if (normalizado.includes('factura')) {
    return 'factura';
  }
  return null;
};

const resolverCodigoSunat = (tipoComprobante: TipoComprobante | null): string | null => {
  if (!tipoComprobante) {
    return null;
  }

  return obtenerCodigoSunatPorTipoComprobante(tipoComprobante) ?? null;
};

const valorTextoUtil = (valor: string | null | undefined): string | null => {
  if (typeof valor !== 'string') {
    return null;
  }

  const normalizado = valor.trim();
  return normalizado.length > 0 ? normalizado : null;
};

const valorNumeroUtil = (valor: number | null | undefined): number | null => {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null;
};

const inferirTipoDocumentoCliente = (tipoDocumento: string | null | undefined, numeroDocumento: string | null | undefined): string | null => {
  const tipoNormalizado = valorTextoUtil(tipoDocumento);
  if (tipoNormalizado) {
    return tipoNormalizado;
  }

  const digitos = String(numeroDocumento ?? '').replace(/\D+/g, '');
  if (digitos.length === 11) {
    return 'RUC';
  }
  if (digitos.length === 8) {
    return 'DNI';
  }
  if (digitos.length === 0) {
    return 'SIN_DOCUMENTO';
  }
  return 'OTROS';
};

const inferirCodigoSunatDocumentoCliente = (tipoDocumento: string | null | undefined): string | null => {
  const normalizado = String(tipoDocumento ?? '').trim().toUpperCase();
  if (normalizado === 'RUC' || normalizado === '6') {
    return '6';
  }
  if (normalizado === 'DNI' || normalizado === '1') {
    return '1';
  }
  if (normalizado === 'SIN_DOCUMENTO' || normalizado === '0') {
    return '0';
  }
  return null;
};

const seleccionarItemsDisponibles = (comprobante: FilaListadoCompatible): CartItem[] => {
  if (Array.isArray(comprobante.items) && comprobante.items.length > 0) {
    return comprobante.items;
  }
  if (Array.isArray(comprobante.cartItems) && comprobante.cartItems.length > 0) {
    return comprobante.cartItems;
  }
  if (Array.isArray(comprobante.productos) && comprobante.productos.length > 0) {
    return comprobante.productos;
  }
  return [];
};

const combinarTexto = (principal: string | null | undefined, respaldo: string | null | undefined): string | null => {
  return valorTextoUtil(principal) ?? valorTextoUtil(respaldo) ?? null;
};

const combinarNumero = (principal: number | null | undefined, respaldo: number | null | undefined): number | null => {
  return valorNumeroUtil(principal) ?? valorNumeroUtil(respaldo) ?? null;
};

const combinarItems = (principal: CartItem[] | null | undefined, respaldo: CartItem[] | null | undefined): CartItem[] => {
  if (Array.isArray(principal) && principal.length > 0) {
    return principal;
  }
  if (Array.isArray(respaldo) && respaldo.length > 0) {
    return respaldo;
  }
  return [];
};

const combinarTotales = (principal: PaymentTotals, respaldo: PaymentTotals): PaymentTotals => ({
  subtotal: combinarNumero(principal.subtotal, respaldo.subtotal) ?? 0,
  igv: combinarNumero(principal.igv, respaldo.igv) ?? 0,
  total: combinarNumero(principal.total, respaldo.total) ?? 0,
  currency: (combinarTexto(principal.currency ?? null, respaldo.currency ?? null) as Currency | null) ?? undefined,
  discount: principal.discount ?? respaldo.discount,
  breakdown: principal.breakdown ?? respaldo.breakdown,
  taxBreakdown: principal.taxBreakdown ?? respaldo.taxBreakdown,
});

const combinarInstantaneaDocumentoComercial = (
  principal: InstantaneaDocumentoComercial,
  respaldo: InstantaneaDocumentoComercial,
): InstantaneaDocumentoComercial => {
  const items = combinarItems(principal.detalle.items, respaldo.detalle.items);
  const modoDetalle = inferirModoDetalleDocumentoComercial(items);

  return {
    version: 1,
    identidad: {
      tipoDocumento: principal.identidad.tipoDocumento ?? respaldo.identidad.tipoDocumento,
      tipoComprobante: principal.identidad.tipoComprobante ?? respaldo.identidad.tipoComprobante,
      codigoSunat: combinarTexto(principal.identidad.codigoSunat, respaldo.identidad.codigoSunat),
      serie: combinarTexto(principal.identidad.serie, respaldo.identidad.serie),
      correlativo: combinarTexto(principal.identidad.correlativo, respaldo.identidad.correlativo),
      numeroCompleto: combinarTexto(principal.identidad.numeroCompleto, respaldo.identidad.numeroCompleto),
      fechaEmision: combinarTexto(principal.identidad.fechaEmision, respaldo.identidad.fechaEmision),
      horaEmision: combinarTexto(principal.identidad.horaEmision, respaldo.identidad.horaEmision),
      moneda: (combinarTexto(principal.identidad.moneda ?? null, respaldo.identidad.moneda ?? null) as Currency | null) ?? null,
      tipoCambio: combinarNumero(principal.identidad.tipoCambio, respaldo.identidad.tipoCambio),
      origen: principal.identidad.origen ?? respaldo.identidad.origen,
      idDocumento: combinarTexto(principal.identidad.idDocumento, respaldo.identidad.idDocumento),
      idInterno: combinarTexto(principal.identidad.idInterno, respaldo.identidad.idInterno),
    },
    empresa: {
      idEmpresa: combinarTexto(principal.empresa.idEmpresa, respaldo.empresa.idEmpresa),
      nombreComercial: combinarTexto(principal.empresa.nombreComercial, respaldo.empresa.nombreComercial),
      razonSocial: combinarTexto(principal.empresa.razonSocial, respaldo.empresa.razonSocial),
      ruc: combinarTexto(principal.empresa.ruc, respaldo.empresa.ruc),
    },
    establecimiento: {
      idEstablecimiento: combinarTexto(principal.establecimiento.idEstablecimiento, respaldo.establecimiento.idEstablecimiento),
      codigoEstablecimiento: combinarTexto(principal.establecimiento.codigoEstablecimiento, respaldo.establecimiento.codigoEstablecimiento),
      nombreEstablecimiento: combinarTexto(principal.establecimiento.nombreEstablecimiento, respaldo.establecimiento.nombreEstablecimiento),
    },
    vendedor: {
      idUsuario: combinarTexto(principal.vendedor.idUsuario, respaldo.vendedor.idUsuario),
      nombreUsuario: combinarTexto(principal.vendedor.nombreUsuario, respaldo.vendedor.nombreUsuario),
    },
    cliente: {
      idCliente: combinarTexto(principal.cliente.idCliente, respaldo.cliente.idCliente),
      nombre: combinarTexto(principal.cliente.nombre, respaldo.cliente.nombre) ?? 'Cliente',
      tipoDocumento: combinarTexto(principal.cliente.tipoDocumento, respaldo.cliente.tipoDocumento),
      numeroDocumento: combinarTexto(principal.cliente.numeroDocumento, respaldo.cliente.numeroDocumento),
      codigoSunatDocumento: combinarTexto(principal.cliente.codigoSunatDocumento, respaldo.cliente.codigoSunatDocumento),
      email: combinarTexto(principal.cliente.email, respaldo.cliente.email),
      telefono: combinarTexto(principal.cliente.telefono, respaldo.cliente.telefono),
      direccion: combinarTexto(principal.cliente.direccion, respaldo.cliente.direccion),
      priceProfileId: combinarTexto(principal.cliente.priceProfileId, respaldo.cliente.priceProfileId),
    },
    camposComerciales: {
      direccionEnvio: combinarTexto(principal.camposComerciales.direccionEnvio, respaldo.camposComerciales.direccionEnvio),
      ordenCompra: combinarTexto(principal.camposComerciales.ordenCompra, respaldo.camposComerciales.ordenCompra),
      guiaRemision: combinarTexto(principal.camposComerciales.guiaRemision, respaldo.camposComerciales.guiaRemision),
      centroCosto: combinarTexto(principal.camposComerciales.centroCosto, respaldo.camposComerciales.centroCosto),
      observaciones: combinarTexto(principal.camposComerciales.observaciones, respaldo.camposComerciales.observaciones),
      notaInterna: combinarTexto(principal.camposComerciales.notaInterna, respaldo.camposComerciales.notaInterna),
      fechaVencimiento: combinarTexto(principal.camposComerciales.fechaVencimiento, respaldo.camposComerciales.fechaVencimiento),
      formaPagoId: combinarTexto(principal.camposComerciales.formaPagoId, respaldo.camposComerciales.formaPagoId),
      formaPagoDescripcion: combinarTexto(principal.camposComerciales.formaPagoDescripcion, respaldo.camposComerciales.formaPagoDescripcion),
      detallesPago: principal.camposComerciales.detallesPago ?? respaldo.camposComerciales.detallesPago,
      terminosCredito: principal.camposComerciales.terminosCredito ?? respaldo.camposComerciales.terminosCredito,
    },
    detalle: {
      items,
      modoDetalle,
      contieneItemsCatalogo: modoDetalle === 'catalogo' || modoDetalle === 'mixto',
      contieneItemsLibres: modoDetalle === 'libre' || modoDetalle === 'mixto',
    },
    totales: combinarTotales(principal.totales, respaldo.totales),
    relaciones: {
      documentoOrigenId: combinarTexto(principal.relaciones.documentoOrigenId, respaldo.relaciones.documentoOrigenId),
      documentoOrigenTipo: combinarTexto(principal.relaciones.documentoOrigenTipo, respaldo.relaciones.documentoOrigenTipo),
      documentoRelacionadoId: combinarTexto(principal.relaciones.documentoRelacionadoId, respaldo.relaciones.documentoRelacionadoId),
      documentoRelacionadoTipo: combinarTexto(principal.relaciones.documentoRelacionadoTipo, respaldo.relaciones.documentoRelacionadoTipo),
      datosNotaCredito: principal.relaciones.datosNotaCredito ?? respaldo.relaciones.datosNotaCredito,
      idDocumentoFuente: combinarTexto(principal.relaciones.idDocumentoFuente, respaldo.relaciones.idDocumentoFuente),
      tipoDocumentoFuente: combinarTexto(principal.relaciones.tipoDocumentoFuente, respaldo.relaciones.tipoDocumentoFuente),
    },
  };
};

export const inferirModoDetalleDocumentoComercial = (
  items: CartItem[],
): ModoDetalleDocumentoComercial => {
  if (!items.length) {
    return 'sin_items';
  }

  const contieneItemsLibres = items.some((item) => item.tipoDetalle === 'libre');
  const contieneItemsCatalogo = items.some((item) => item.tipoDetalle !== 'libre');

  if (contieneItemsLibres && contieneItemsCatalogo) {
    return 'mixto';
  }
  if (contieneItemsLibres) {
    return 'libre';
  }
  return 'catalogo';
};

export const crearInstantaneaDocumentoComercial = (
  opciones: OpcionesCrearInstantaneaDocumentoComercial,
): InstantaneaDocumentoComercial => {
  const items = Array.isArray(opciones.items) ? opciones.items : [];
  const modoDetalle = inferirModoDetalleDocumentoComercial(items);
  const identidadNumero = separarNumeroCompleto(opciones.numeroCompleto, opciones.idDocumento);

  return {
    version: 1,
    identidad: {
      tipoDocumento: opciones.tipoDocumento,
      tipoComprobante: opciones.tipoComprobante,
      codigoSunat: resolverCodigoSunat(opciones.tipoComprobante),
      serie: identidadNumero.serie,
      correlativo: identidadNumero.correlativo,
      numeroCompleto: identidadNumero.numeroCompleto,
      fechaEmision: opciones.fechaEmision ?? null,
      horaEmision: opciones.horaEmision ?? null,
      moneda: opciones.moneda ?? null,
      tipoCambio: opciones.tipoCambio ?? null,
      origen: opciones.origen,
      idDocumento: opciones.idDocumento ?? null,
      idInterno: opciones.idInterno ?? opciones.idDocumento ?? null,
    },
    empresa: {
      idEmpresa: opciones.empresa?.idEmpresa ?? null,
      nombreComercial: opciones.empresa?.nombreComercial ?? null,
      razonSocial: opciones.empresa?.razonSocial ?? null,
      ruc: opciones.empresa?.ruc ?? null,
    },
    establecimiento: {
      idEstablecimiento: opciones.establecimiento?.idEstablecimiento ?? null,
      codigoEstablecimiento: opciones.establecimiento?.codigoEstablecimiento ?? null,
      nombreEstablecimiento: opciones.establecimiento?.nombreEstablecimiento ?? null,
    },
    vendedor: {
      idUsuario: opciones.vendedor?.idUsuario ?? null,
      nombreUsuario: opciones.vendedor?.nombreUsuario ?? null,
    },
    cliente: {
      idCliente: opciones.cliente?.idCliente ?? null,
      nombre: opciones.cliente?.nombre ?? 'Cliente',
      tipoDocumento: opciones.cliente?.tipoDocumento ?? null,
      numeroDocumento: opciones.cliente?.numeroDocumento ?? null,
      codigoSunatDocumento: opciones.cliente?.codigoSunatDocumento ?? null,
      email: opciones.cliente?.email ?? null,
      telefono: opciones.cliente?.telefono ?? null,
      direccion: opciones.cliente?.direccion ?? null,
      priceProfileId: opciones.cliente?.priceProfileId ?? null,
    },
    camposComerciales: {
      direccionEnvio: opciones.camposComerciales?.direccionEnvio ?? null,
      ordenCompra: opciones.camposComerciales?.ordenCompra ?? null,
      guiaRemision: opciones.camposComerciales?.guiaRemision ?? null,
      centroCosto: opciones.camposComerciales?.centroCosto ?? null,
      observaciones: opciones.camposComerciales?.observaciones ?? null,
      notaInterna: opciones.camposComerciales?.notaInterna ?? null,
      fechaVencimiento: opciones.camposComerciales?.fechaVencimiento ?? null,
      formaPagoId: opciones.camposComerciales?.formaPagoId ?? null,
      formaPagoDescripcion: opciones.camposComerciales?.formaPagoDescripcion ?? null,
      detallesPago: opciones.camposComerciales?.detallesPago ?? null,
      terminosCredito: opciones.camposComerciales?.terminosCredito ?? null,
    },
    detalle: {
      items,
      modoDetalle,
      contieneItemsCatalogo: modoDetalle === 'catalogo' || modoDetalle === 'mixto',
      contieneItemsLibres: modoDetalle === 'libre' || modoDetalle === 'mixto',
    },
    totales: {
      ...opciones.totales,
      currency: opciones.totales.currency ?? opciones.moneda ?? undefined,
    },
    relaciones: {
      documentoOrigenId: opciones.relaciones?.documentoOrigenId ?? null,
      documentoOrigenTipo: opciones.relaciones?.documentoOrigenTipo ?? null,
      documentoRelacionadoId: opciones.relaciones?.documentoRelacionadoId ?? null,
      documentoRelacionadoTipo: opciones.relaciones?.documentoRelacionadoTipo ?? null,
      datosNotaCredito: opciones.relaciones?.datosNotaCredito ?? null,
      idDocumentoFuente: opciones.relaciones?.idDocumentoFuente ?? null,
      tipoDocumentoFuente: opciones.relaciones?.tipoDocumentoFuente ?? null,
    },
  };
};

export const construirCargaReutilizacionDocumentoComercial = (parametros: {
  instantaneaDocumentoComercial: InstantaneaDocumentoComercial;
  datosNotaCredito?: DatosNotaCredito | null;
}): CargaReutilizacionDocumentoComercial => ({
  instantaneaDocumentoComercial: parametros.instantaneaDocumentoComercial,
  datosNotaCredito: parametros.datosNotaCredito ?? null,
});

export const esCargaReutilizacionDocumentoComercial = (
  valor: unknown,
): valor is CargaReutilizacionDocumentoComercial => {
  if (!valor || typeof valor !== 'object') {
    return false;
  }

  return 'instantaneaDocumentoComercial' in valor;
};

export const crearDatosNotaCreditoDesdeInstantanea = (
  instantanea: InstantaneaDocumentoComercial,
): DatosNotaCredito | null => {
  const tipoComprobanteOrigen = normalizarTipoComprobanteBase(
    instantanea.identidad.tipoComprobante ?? instantanea.identidad.tipoDocumento,
  );

  if (!tipoComprobanteOrigen) {
    return null;
  }

  const numeroCompleto = instantanea.identidad.numeroCompleto ?? instantanea.identidad.idDocumento ?? '';
  const serie = instantanea.identidad.serie ?? instantanea.identidad.idDocumento ?? '';
  const numero = instantanea.identidad.correlativo ?? instantanea.identidad.idDocumento ?? '';

  return {
    codigo: '',
    motivo: '',
    documentoRelacionado: {
      id: instantanea.identidad.idDocumento ?? undefined,
      tipoComprobanteOrigen,
      tipoDocumentoCodigoOrigen: obtenerCodigoSunatPorTipoComprobante(tipoComprobanteOrigen) as '01' | '03',
      tipoDocumentoLabelOrigen: obtenerEtiquetaDocumentoRelacionado(tipoComprobanteOrigen),
      serie,
      numero,
      numeroCompleto,
    },
  };
};

export const extraerDatosRehidratacionDesdeInstantanea = (
  instantanea: InstantaneaDocumentoComercial,
): DatosRehidratacionDocumentoComercial => {
  const camposOpcionales: Record<string, string> = {};

  const asignarCampoOpcional = (clave: string, valor: string | null) => {
    if (typeof valor === 'string' && valor.trim().length > 0) {
      camposOpcionales[clave] = valor;
    }
  };

  asignarCampoOpcional('fechaVencimiento', instantanea.camposComerciales.fechaVencimiento);
  asignarCampoOpcional('direccionEnvio', instantanea.camposComerciales.direccionEnvio);
  asignarCampoOpcional('ordenCompra', instantanea.camposComerciales.ordenCompra);
  asignarCampoOpcional('guiaRemision', instantanea.camposComerciales.guiaRemision);
  asignarCampoOpcional('centroCosto', instantanea.camposComerciales.centroCosto);
  asignarCampoOpcional('direccion', instantanea.cliente.direccion);
  asignarCampoOpcional('correo', instantanea.cliente.email);

  return {
    cliente: instantanea.cliente.nombre
      ? {
          clienteId: instantanea.cliente.idCliente ?? undefined,
          nombre: instantanea.cliente.nombre,
          dni: instantanea.cliente.numeroDocumento ?? '',
          direccion: instantanea.cliente.direccion ?? '',
          email: instantanea.cliente.email ?? undefined,
          tipoDocumento: instantanea.cliente.tipoDocumento ?? undefined,
          priceProfileId: instantanea.cliente.priceProfileId ?? undefined,
        }
      : null,
    items: instantanea.detalle.items,
    modoDetalle: instantanea.detalle.modoDetalle,
    observaciones: instantanea.camposComerciales.observaciones ?? '',
    notaInterna: instantanea.camposComerciales.notaInterna ?? '',
    formaPago: instantanea.camposComerciales.formaPagoId ?? instantanea.camposComerciales.formaPagoDescripcion ?? '',
    moneda: instantanea.identidad.moneda,
    tipoComprobante: instantanea.identidad.tipoComprobante,
    camposOpcionales,
  };
};

export const convertirComprobanteListadoAInstantaneaDocumentoComercial = (
  comprobante: FilaListadoCompatible,
): InstantaneaDocumentoComercial => {
  const items = seleccionarItemsDisponibles(comprobante);

  const tipoComprobante = normalizarTipoComprobanteBase(comprobante.type) as TipoComprobante | null;

  const tipoDocumentoCliente = inferirTipoDocumentoCliente(comprobante.clientDocType, comprobante.clientDoc);
  const instantaneaDesdeListado = crearInstantaneaDocumentoComercial({
    tipoDocumento: tipoComprobante ?? 'documento_comercial',
    tipoComprobante,
    numeroCompleto: comprobante.id,
    fechaEmision: comprobante.date ?? null,
    horaEmision: null,
    moneda: (comprobante.currency as Currency | undefined) ?? null,
    tipoCambio: comprobante.exchangeRate ?? null,
    origen: 'documento_comercial',
    idDocumento: comprobante.id,
    empresa: {},
    establecimiento: {},
    vendedor: {},
    cliente: {
      idCliente: comprobante.clientId ?? null,
      nombre: comprobante.client ?? 'Cliente',
      tipoDocumento: tipoDocumentoCliente,
      numeroDocumento: comprobante.clientDoc ?? null,
      codigoSunatDocumento: inferirCodigoSunatDocumentoCliente(tipoDocumentoCliente),
      email: comprobante.email ?? null,
      direccion: comprobante.address ?? null,
      priceProfileId: comprobante.clientPriceProfileId ?? null,
    },
    camposComerciales: {
      direccionEnvio: comprobante.shippingAddress ?? null,
      ordenCompra: comprobante.purchaseOrder ?? null,
      guiaRemision: comprobante.waybill ?? null,
      centroCosto: comprobante.costCenter ?? null,
      observaciones: comprobante.observations ?? null,
      notaInterna: comprobante.internalNote ?? null,
      fechaVencimiento: comprobante.dueDate ?? null,
      formaPagoId: comprobante.paymentMethodId ?? null,
      formaPagoDescripcion: comprobante.paymentMethod ?? null,
      terminosCredito: comprobante.creditTerms ?? null,
    },
    items,
    totales: comprobante.totals ?? {
      subtotal: 0,
      igv: 0,
      total: 0,
      currency: (comprobante.currency as Currency | undefined) ?? undefined,
    },
    relaciones: {
      documentoRelacionadoId: comprobante.relatedDocumentId ?? null,
      documentoRelacionadoTipo: comprobante.relatedDocumentType ?? null,
      documentoOrigenId: comprobante.sourceDocumentId ?? null,
      documentoOrigenTipo: comprobante.sourceDocumentType ?? null,
      datosNotaCredito: comprobante.noteCreditData ?? null,
      idDocumentoFuente: comprobante.sourceDocumentId ?? null,
      tipoDocumentoFuente: comprobante.sourceDocumentType ?? null,
    },
  });

  if (comprobante.instantaneaDocumentoComercial) {
    return combinarInstantaneaDocumentoComercial(
      comprobante.instantaneaDocumentoComercial,
      instantaneaDesdeListado,
    );
  }

  return instantaneaDesdeListado;
};