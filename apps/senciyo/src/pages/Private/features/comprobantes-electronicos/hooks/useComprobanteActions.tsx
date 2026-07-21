/* eslint-disable @typescript-eslint/no-unused-vars -- variables temporales; limpieza diferida */
import { useCallback, useMemo } from 'react';
import type {
  CartItem,
  ComprobanteCreditTerms,
  ComprobantePaymentTerms,
  DatosDetraccion,
  DatosNotaCredito,
  PaymentCollectionPayload,
  Currency,
  TipoComprobante,
} from '../models/comprobante.types';
import { actualizarOrdenVentaPostEmision, actualizarCotizacionPostEmision, actualizarNVPostEmision, obtenerReservasDeOV, type DadosComerciaisSyncComprobante } from '../../../../../shared/documentosComerciales/postEmisionOrdenVenta';
import { mapPaymentMethodToMedioPago } from '../../../../../shared/payments/paymentMapping';
// Reemplazamos el uso de addMovimiento desde el store del catálogo por la fachada de inventario
import { useInventoryFacade } from '../../gestion-inventario/api/inventory.facade';
import { useComprobanteContext } from '../lista-comprobantes/contexts/ComprobantesListContext';
import { useUserSession } from '../../../../../contexts/UserSessionContext';
import { useToast } from '../shared/ui/Toast/useToast';
import { devLocalIndicadoresStore, mapCartItemsToVentaProductos } from '../../indicadores-negocio/integration/devLocalStore';
import { useCobranzasContext } from '../../gestion-cobranzas/context/CobranzasContext';
import type { CobranzaStatus, CuentaPorCobrarSummary } from '../../gestion-cobranzas/models/cobranzas.types';
import {
  computeAccountStateFromInstallments,
  normalizeCreditTermsToInstallments,
  updateInstallmentsWithAllocations,
} from '../../gestion-cobranzas/utils/installments';
import type { PaymentMethod as ConfigPaymentMethod } from '../../configuracion-sistema/modelos/PaymentMethod';
import { useProductStore } from '../../catalogo-articulos/hooks/useProductStore';
import type { Product as CatalogProduct } from '../../catalogo-articulos/models/types';
import { useConfigurationContext } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import { obtenerUsuarioDesdeSesion, tienePermiso } from '../../configuracion-sistema/utilidades/permisos';
import {
  allocateSaleAcrossalmacenes,
  calculateRequiredUnidadMinima,
  resolvealmacenesForSaleFIFO,
} from '../../../../../shared/inventory/stockGateway';
import {
  assertBusinessDate,
  composeBusinessDateTime,
  formatBusinessDateTimeForTicket,
  formatBusinessDateTimeIso,
  getBusinessNow,
  getBusinessTodayISODate,
} from '@/shared/time/businessTime';
import { obtenerEtiquetaTipoComprobante, MOCK_OSE_RESPONSE_DELAY_MS } from '../models/constants';
import { StockRepository } from '../../gestion-inventario/repositories/stock.repository';
import { crearInstantaneaDocumentoComercial } from '../models/instantaneaDocumentoComercial';
import { registrarComprobanteEstadoActualizado } from '@/shared/analitica/analitica';
import { ServicioKardexValorizado } from '../../gestion-inventario/services/servicioKardexValorizado';
import type { DatosOperacionSalidaCuantitativa, DatosLineaOperacionCuantitativa } from '../../gestion-inventario/models/operacionEntradaInventario.types';
import {
  obtenerDatosOperacionPendiente,
  guardarDatosOperacionPendiente,
  limpiarSesionPendienteOperacion,
} from '../../../../../shared/inventory/sesionPendienteOperacionInventario';
import { sincronizarInventarioTrasConfirmacion } from '../../../../../shared/inventory/accionesStock';
import { serializarCanonicamente } from '../../gestion-inventario/utils/serializacionCanonicaInventario';
import { getTenantEmpresaId, tryGetTenantEmpresaId } from '../../../../../shared/tenant';
import type { MovimientoStock } from '../../gestion-inventario/models/inventory.types';
import type { DatosAnulacionDocumentoInventario } from '../../gestion-inventario/models/operacionReversoInventario.types';

/** Exportado para que la anulación de comprobante/POS (ListaComprobantes.tsx, Etapa 1E cierre final §2) pueda localizar los movimientos originales por el mismo `claveIdempotencia`. */
export const ESPACIO_VENTA_SALIDA = 'venta_salida';

/**
 * Localiza los movimientos ORIGINALES confirmados del descuento de stock de un comprobante
 * (`documentoOrigenId === inventarioDocumentoId`, `tipoDocumentoOrigen === 'venta'`,
 * `claveIdempotencia === 'venta_salida:${inventarioDocumentoId}'`) y construye el contrato para
 * `ServicioKardexValorizado.anularDocumentoValorizado` (cierre final de Etapa 1E, §2) — NUNCA
 * recalcula el ajuste desde el catálogo actual. La identidad técnica persistida
 * (`inventarioDocumentoId`, Blocker 1) tiene prioridad; un comprobante histórico creado antes de
 * que existiera ese campo se localiza por el criterio legacy (`documentoReferencia`+tipo+motivo).
 * Función pura: no toca `localStorage` ni invoca al motor — el llamador (`ListaComprobantes.tsx`)
 * debe hacerlo y solo marcar el comprobante 'anulado' DESPUÉS de que Inventario confirme o repita.
 * Devuelve `null` cuando no hay nada que revertir (p. ej. `modoDescuentoStock` distinto de
 * `'automatico'`, o ya sin movimientos de venta asociados).
 */
export function prepararAnulacionDescuentoStockComprobante(
  comprobante: { id: string; inventarioDocumentoId?: string },
  refComprobante: string,
  empresaId: string,
  movimientos: readonly MovimientoStock[],
  usuario: string,
  fecha: string,
): DatosAnulacionDocumentoInventario | null {
  const movimientosSalida = comprobante.inventarioDocumentoId
    ? movimientos.filter(
        (m) =>
          m.documentoOrigenId === comprobante.inventarioDocumentoId &&
          m.tipoDocumentoOrigen === 'venta' &&
          m.claveIdempotencia === `${ESPACIO_VENTA_SALIDA}:${comprobante.inventarioDocumentoId}`,
      )
    : movimientos.filter((m) => m.documentoReferencia === refComprobante && m.tipo === 'SALIDA' && m.motivo === 'VENTA');

  if (movimientosSalida.length === 0) return null;

  const documentoIdVenta = comprobante.inventarioDocumentoId ?? refComprobante;
  return {
    empresaId,
    tipoOperacion: 'anulacion',
    documentoId: documentoIdVenta,
    tipoDocumentoOrigen: 'venta',
    movimientoIds: movimientosSalida.map((m) => m.id),
    claveIdempotencia: `ANULACION-venta-${documentoIdVenta}`,
    usuario,
    fecha,
    documentoReferencia: refComprobante,
  };
}

/**
 * Datos cacheados en la sesión pendiente de una venta (Etapa 1D, corrección post-1D §1/§4).
 * `documentoId` es el UUID técnico real (nunca recalculado); `numeroComprobante` es la referencia
 * comercial estable; `lineasOperacion` (una vez calculadas) nunca se recalculan en un reintento.
 */
interface CacheVenta {
  documentoId: string;
  numeroComprobante: string;
  lineasOperacion?: DatosLineaOperacionCuantitativa[];
}

function esLineaOperacionVentaValida(valor: unknown): valor is DatosLineaOperacionCuantitativa {
  if (typeof valor !== 'object' || valor === null) return false;
  const l = valor as Record<string, unknown>;
  return (
    typeof l.lineaId === 'string' && l.lineaId.trim() !== '' &&
    typeof l.productoId === 'string' && l.productoId.trim() !== '' &&
    typeof l.almacenId === 'string' && l.almacenId.trim() !== '' &&
    typeof l.cantidadUnidadMinima === 'number' && Number.isFinite(l.cantidadUnidadMinima) && l.cantidadUnidadMinima > 0
  );
}

/**
 * Validación en tiempo de ejecución de `CacheVenta` (corrección post-1D, §2) — una caché corrupta
 * o incompleta NUNCA puede tratarse como "ya calculada": eso omitiría el descuento de inventario en
 * silencio (p. ej. si `lineasOperacion` llegara corrupta como `[]` o `undefined`, el llamador
 * saltaría el motor creyendo que esta venta no afecta stock). Ante cualquier forma inesperada, se
 * descarta la caché por completo y se recalcula desde cero.
 */
export function esCacheVentaValida(valor: unknown): valor is CacheVenta {
  if (typeof valor !== 'object' || valor === null) return false;
  const c = valor as Record<string, unknown>;
  if (typeof c.documentoId !== 'string' || c.documentoId.trim() === '') return false;
  if (typeof c.numeroComprobante !== 'string' || c.numeroComprobante.trim() === '') return false;
  if (c.lineasOperacion === undefined) return true;
  return Array.isArray(c.lineasOperacion) && c.lineasOperacion.every(esLineaOperacionVentaValida);
}

/**
 * Huella de la venta para la sesión pendiente de idempotencia (Etapa 1D, §9/§21) — se calcula
 * SIEMPRE a partir de `data` (estable entre reintentos del mismo click) y del contexto de origen
 * de la conversión (OV/NV/ninguno) y el modo de descuento vigente — nunca de `numeroComprobante`
 * ni del `documentoId` técnico (ambos se resuelven DESPUÉS de esta huella). Corrección post-1D,
 * §4: incluir `origenFlujo`/`origenId`/`modoDescuentoStock` es obligatorio — sin ellos, dos
 * Órdenes de Venta distintas con el mismo carrito (productos y cantidades idénticos) producirían
 * la MISMA huella y compartirían indebidamente una sesión pendiente. Un contenido distinto en
 * cualquiera de estos campos produce una huella distinta y, por tanto, una identidad nueva.
 */
export function construirHuellaVenta(
  data: ComprobanteData,
  establecimientoId: string,
  origenFlujo: string | null,
  origenId: string | null,
  modoDescuentoStock: string,
): string {
  return serializarCanonicamente({
    tipoComprobante: data.tipoComprobante,
    serieSeleccionada: data.serieSeleccionada,
    establecimientoId,
    origenFlujo: origenFlujo ?? '',
    origenId: origenId ?? '',
    modoDescuentoStock,
    cartItems: data.cartItems.map((item) => ({
      id: item.id,
      code: item.code ?? '',
      quantity: typeof item.quantity === 'number' && Number.isFinite(item.quantity) ? item.quantity : 0,
      tipoDetalle: item.tipoDetalle ?? '',
      requiresStockControl: Boolean(item.requiresStockControl),
      unidad: item.presentacionId ?? item.unidadMedida ?? item.unit ?? '',
    })),
  });
}

/**
 * Asigna, en `lineas` (mutándolas in-place), la liberación de reserva de OV que corresponda a cada
 * producto — arquitectura nueva (`liberarReservaOV`, por establecimiento) y legacy
 * (`liberarReservaLegacyOV`, por almacén) — corrección post-1D, §1: para que el motor central
 * libere la reserva en el MISMO plan que descuenta el stock, nunca en una llamada separada
 * (`liberarReservasDeOV`) después de confirmar. La liberación es SIEMPRE exactamente la cantidad
 * despachada (nunca `Math.min` para ocultar una inconsistencia) — rechaza el documento completo si
 * falta la reserva correspondiente, si la excede, o si el almacén no coincide.
 */
export function aplicarLiberacionesOVVenta(
  lineas: DatosLineaOperacionCuantitativa[],
  ovReservas: Array<{ sku: string; cantidad: number; almacenId?: string; establecimientoId?: string }>,
  catalogLookup: Map<string, CatalogProduct>,
): void {
  const porProducto = new Map<string, { sku: string; lineas: DatosLineaOperacionCuantitativa[]; total: number }>();
  for (const linea of lineas) {
    const catalogProduct = catalogLookup.get(linea.productoId);
    const sku = catalogProduct?.codigo;
    if (!sku) {
      throw new Error(
        `No se pudo resolver el código de catálogo del producto "${linea.productoId}" para liberar la reserva de la Orden de Venta — operación rechazada completa.`
      );
    }
    const entry = porProducto.get(linea.productoId) ?? { sku, lineas: [], total: 0 };
    entry.lineas.push(linea);
    entry.total += linea.cantidadUnidadMinima;
    porProducto.set(linea.productoId, entry);
  }

  for (const { sku, lineas: lineasProducto, total } of porProducto.values()) {
    const reservaGlobal = ovReservas.find((r) => r.sku === sku && r.establecimientoId);
    if (reservaGlobal?.establecimientoId) {
      if (total > reservaGlobal.cantidad) {
        throw new Error(
          `La cantidad despachada de "${sku}" (${total}) excede la reserva pendiente de la Orden de Venta (${reservaGlobal.cantidad}) — operación rechazada completa.`
        );
      }
      lineasProducto[0].liberarReservaOV = { establecimientoId: reservaGlobal.establecimientoId, cantidad: total };
      continue;
    }

    // Legacy (por almacén): cada línea física debe coincidir EXACTAMENTE con una reserva de ese
    // almacén — nunca se asume ni se reparte, se rechaza si no coincide.
    for (const linea of lineasProducto) {
      const reservaAlmacen = ovReservas.find((r) => r.sku === sku && r.almacenId === linea.almacenId);
      if (!reservaAlmacen) {
        throw new Error(
          `No se encontró una reserva de la Orden de Venta para "${sku}" en el almacén "${linea.almacenId}" — operación rechazada completa.`
        );
      }
      if (linea.cantidadUnidadMinima > reservaAlmacen.cantidad) {
        throw new Error(
          `La cantidad despachada de "${sku}" en el almacén "${linea.almacenId}" (${linea.cantidadUnidadMinima}) excede la reserva pendiente (${reservaAlmacen.cantidad}) — operación rechazada completa.`
        );
      }
      linea.liberarReservaLegacyOV = { cantidad: linea.cantidadUnidadMinima };
    }
  }
}

interface ComprobanteData {
  tipoComprobante: TipoComprobante;
  serieSeleccionada: string;
  cartItems: CartItem[];
  totals: {
    subtotal: number;
    igv: number;
    total: number;
  };
  observaciones?: string;
  notaInterna?: string;
  formaPago?: string;
  EstablecimientoId?: string;
  companyId?: string;
  exchangeRate?: number;
  source?: 'emision' | 'pos' | 'otros';
  // Campos opcionales provenientes del formulario de emisión
  client?: string;
  clientDoc?: string;
  clientDocType?: string;
  clientId?: string;
  clientPriceProfileId?: string;
  fechaEmision?: string; // ISO date 'YYYY-MM-DD'
  fechaVencimiento?: string;
  email?: string;
  address?: string;
  shippingAddress?: string;
  purchaseOrder?: string;
  costCenter?: string;
  waybill?: string;
  currency?: string;
  paymentDetails?: PaymentCollectionPayload;
  paymentTerms?: ComprobantePaymentTerms;
  creditTerms?: ComprobanteCreditTerms;
  registrarPago?: boolean;
  noteCreditData?: DatosNotaCredito;
  datosDetraccion?: DatosDetraccion;
  tipoOperacion?: string;
}

const buildPaymentModeLabel = (isCreditSale: boolean, creditTerms?: ComprobanteCreditTerms): string => {
  if (!isCreditSale) {
    return 'Contado';
  }

  const days = new Set<number>();
  creditTerms?.schedule?.forEach((installment) => {
    const normalized = Number(installment?.diasCredito);
    if (Number.isFinite(normalized)) {
      days.add(Math.max(0, Math.trunc(normalized)));
    }
  });

  if (!days.size) {
    return 'Crédito';
  }

  const orderedDays = Array.from(days).sort((a, b) => a - b);
  if (orderedDays.length === 1) {
    return `Crédito ${orderedDays[0]} días`;
  }
  return `Crédito ${orderedDays.join('-')} días`;
};

const resolverTipoComprobanteAnalitica = (
  tipoComprobante: TipoComprobante,
): 'factura' | 'boleta' | 'nota_credito' | 'nota_debito' | 'otro' => {
  if (tipoComprobante === 'factura' || tipoComprobante === 'boleta' || tipoComprobante === 'nota_credito' || tipoComprobante === 'nota_debito') {
    return tipoComprobante;
  }

  return 'otro';
};

const resolverFormaPagoAnalitica = (isCreditSale: boolean): 'contado' | 'credito' => {
  return isCreditSale ? 'credito' : 'contado';
};

export const useComprobanteActions = () => {
  const toast = useToast();
  const { addMovimiento: addMovimientoStock } = useInventoryFacade();
  const { addComprobante, dispatch } = useComprobanteContext();
  const { session } = useUserSession();
  const { upsertCuenta, registerCobranza } = useCobranzasContext();
  const { allProducts: catalogProducts } = useProductStore();
  const { state: { almacenes, salesPreferences, users }, rolesConfigurados } = useConfigurationContext();
  const allowNegativeStockConfig = Boolean(salesPreferences?.allowNegativeStock);
  const controlStockActivo = salesPreferences?.controlStockActivo ?? false;
  const stockDescuentoFacturaYBoleta = salesPreferences?.stockDescuentoFacturaYBoleta ?? 'automatico';
  const usuarioActual = obtenerUsuarioDesdeSesion(users, session);

  const catalogLookup = useMemo(() => {
    const map = new Map<string, CatalogProduct>();
    catalogProducts.forEach(product => {
      map.set(product.id, product);
      if (product.codigo) {
        map.set(product.codigo, product);
      }
    });
    return map;
  }, [catalogProducts]);

  const paymentMethods: ConfigPaymentMethod[] = [];

  const buildPaymentLabel = useCallback((paymentDetails?: PaymentCollectionPayload) => {
    if (!paymentDetails?.lines?.length) {
      return 'Sin medio';
    }

    const labels = new Set<string>();
    paymentDetails.lines.forEach((line) => {
      if (typeof line?.method === 'string' && line.method.trim().length > 0) {
        labels.add(mapPaymentMethodToMedioPago(line.method));
      }
    });

    if (!labels.size) {
      return 'Sin medio';
    }

    return Array.from(labels).join(' + ');
  }, []);

  // Validar datos del comprobante
  const validateComprobanteData = useCallback((data: ComprobanteData): boolean => {
    // Validar productos
    if (!data.cartItems || data.cartItems.length === 0) {
      toast.error(
        'Carrito vacío',
        'Debe agregar al menos un producto al comprobante antes de continuar.'
      );
      return false;
    }

    // Validar tipo de comprobante
    if (!data.tipoComprobante) {
      toast.error(
        'Tipo de comprobante requerido',
        'Por favor, seleccione si desea emitir una Boleta o Factura.'
      );
      return false;
    }

    if (data.tipoComprobante === 'nota_credito') {
      if (!data.noteCreditData?.codigo) {
        toast.error(
          'Código requerido',
          'Debe seleccionar el código de Nota de Crédito.'
        );
        return false;
      }

      if (!data.noteCreditData?.motivo?.trim()) {
        toast.error(
          'Motivo requerido',
          'Debe ingresar el motivo de emisión de la Nota de Crédito.'
        );
        return false;
      }

      if (!data.noteCreditData?.documentoRelacionado?.numeroCompleto) {
        toast.error(
          'Documento origen requerido',
          'La Nota de Crédito debe estar relacionada a una factura o boleta origen.'
        );
        return false;
      }
    }

    // Validar serie
    if (!data.serieSeleccionada) {
      toast.error(
        'Serie requerida',
        'Debe seleccionar una serie válida para el comprobante. Verifique su configuración.'
      );
      return false;
    }

    // Validar total
    if (data.totals.total <= 0) {
      toast.error(
        'Total inválido',
        'El total del comprobante debe ser mayor a cero. Verifique los precios de los productos.'
      );
      return false;
    }

    // Validar productos con precios válidos
    const productosInvalidos = data.cartItems.filter(item => 
      !item.price || item.price <= 0 || isNaN(item.price)
    );

    if (productosInvalidos.length > 0) {
      toast.error(
        'Productos con precios inválidos',
        `${productosInvalidos.length} producto(s) tienen precio inválido. Verifique los precios antes de continuar.`
      );
      return false;
    }

    // Validar cantidades válidas
    const productosConCantidadInvalida = data.cartItems.filter(item => 
      !item.quantity || item.quantity <= 0 || isNaN(item.quantity)
    );

    if (productosConCantidadInvalida.length > 0) {
      toast.error(
        'Productos con cantidad inválida',
        `${productosConCantidadInvalida.length} producto(s) tienen cantidad inválida. Verifique las cantidades.`
      );
      return false;
    }

    return true;
  }, [toast]);

  /**
   * Limpia la sesión pendiente de `venta_salida` explícitamente — corrección post-1D §2: nunca se
   * debe reutilizar una sesión abandonada solo porque un carrito nuevo coincide en contenido con
   * uno anterior. Debe invocarse al cancelar explícitamente el formulario/venta (Emisión
   * Tradicional: botón "Cancelar"; POS: "Borrar todo"/nueva venta) — nunca durante un fallo
   * incierto de la propia emisión (esa sesión debe sobrevivir para el reintento).
   */
  const cancelarVentaPendiente = useCallback((): void => {
    const empresaId = tryGetTenantEmpresaId();
    if (!empresaId) return;
    limpiarSesionPendienteOperacion(ESPACIO_VENTA_SALIDA, empresaId);
  }, []);

  // Crear comprobante
  const createComprobante = useCallback(async (data: ComprobanteData): Promise<boolean> => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    try {
      const permisoEmision = data.source === 'pos'
        ? 'ventas.pos.vender'
        : 'ventas.comprobantes.emitir';
      const establecimientoId = data.EstablecimientoId || session?.currentEstablecimientoId;

      if (!tienePermiso({
        usuario: usuarioActual,
        permisoId: permisoEmision,
        rolesDisponibles: rolesConfigurados,
        establecimientoId,
      })) {
        toast.error('Sin permiso', 'No tienes permisos para emitir comprobantes.');
        return false;
      }

      if (data.registrarPago && !tienePermiso({
        usuario: usuarioActual,
        permisoId: 'cobranzas.registrar',
        rolesDisponibles: rolesConfigurados,
        establecimientoId,
      })) {
        toast.error('Sin permiso', 'No tienes permisos para registrar cobranzas.');
        return false;
      }

      // Validar datos
      if (!validateComprobanteData(data)) {
        return false;
      }

      // Pre-validar stock antes de cualquier efecto secundario.
      // Solo aplica a Factura/Boleta en modo automático con control activo.
      // Las conversiones desde OV se omiten: sus reservas ya garantizan el stock.
      if (data.tipoComprobante !== 'nota_credito' && controlStockActivo && stockDescuentoFacturaYBoleta === 'automatico') {
        const estIdPrecheck = data.EstablecimientoId || session?.currentEstablecimientoId;
        const esOV = sessionStorage.getItem('conversionSourceType') === 'orden_venta' && Boolean(sessionStorage.getItem('conversionSourceId'));
        if (estIdPrecheck && !esOV) {
          const almacenesPrecheck = resolvealmacenesForSaleFIFO({ almacenes, EstablecimientoId: estIdPrecheck });
          for (const item of data.cartItems) {
            if (item.tipoDetalle === 'libre' || !item.requiresStockControl) continue;
            const catalogProduct = catalogLookup.get(item.id) || catalogLookup.get(item.code || '');
            if (!catalogProduct) continue;
            const qtyMin = calculateRequiredUnidadMinima({
              product: catalogProduct,
              quantity: item.quantity,
              unitCode: item.presentacionId || item.unidadMedida || item.unit,
            });
            if (qtyMin <= 0) continue;
            const allocs = allocateSaleAcrossalmacenes({
              product: catalogProduct,
              almacenesOrdered: almacenesPrecheck,
              qtyUnidadMinima: qtyMin,
              respectReservations: true,
            });
            const allocated = allocs.reduce((s, a) => s + a.qtyUnidadMinima, 0);
            if (allocated < qtyMin) {
              toast.error(
                'Stock insuficiente',
                `Stock insuficiente para emitir el comprobante. Revisa el inventario disponible del producto "${catalogProduct.nombre || item.name}".`,
              );
              return false;
            }
          }
        }
      }

      // Simular loading
      toast.info('Procesando...', 'Creando comprobante electrónico');

      // Simular llamada API con cleanup
      await new Promise((resolve) => {
        timeoutId = setTimeout(resolve, 2000);
      });

      // Simular respuesta exitosa
      const isNoteCredit = data.tipoComprobante === 'nota_credito';

      // Identidad ESTABLE del comprobante (corrección post-1D, §1/§4): solo cuando el descuento
      // automático de stock puede afectar inventario. `documentoId` es un UUID TÉCNICO
      // (crypto.randomUUID(), nunca Math.random) — es el único valor usado como
      // `documentoOrigenId`/`claveIdempotencia` del motor. `numeroComprobante` permanece como
      // referencia comercial visible (`documentoReferencia`), también estable entre reintentos
      // pero nunca usada como identidad técnica. La huella incluye el origen de conversión
      // (OV/NV/ninguno) y el modo de descuento — dos OVs distintas con el mismo carrito nunca
      // comparten sesión. En cualquier otro modo (sin control, nota_salida, NC) no hay movimiento
      // de stock en juego — se conserva el comportamiento original (número por intento).
      const empresaId = getTenantEmpresaId();
      const estIdParaHuellaVenta = data.EstablecimientoId || session?.currentEstablecimientoId || '';
      const origenFlujoParaHuella = sessionStorage.getItem('conversionSourceType');
      const origenIdParaHuella = sessionStorage.getItem('conversionSourceId');
      const huellaVenta = construirHuellaVenta(
        data,
        estIdParaHuellaVenta,
        origenFlujoParaHuella,
        origenIdParaHuella,
        stockDescuentoFacturaYBoleta,
      );
      const requiereIdentidadEstableVenta = !isNoteCredit && controlStockActivo && stockDescuentoFacturaYBoleta === 'automatico';

      let cacheVenta: CacheVenta | undefined;
      if (requiereIdentidadEstableVenta) {
        const cacheCruda = obtenerDatosOperacionPendiente<unknown>(ESPACIO_VENTA_SALIDA, empresaId, huellaVenta);
        // Corrección post-1D, §2: una caché corrupta nunca se trata como válida — se descarta y
        // se recalcula desde cero en vez de arriesgar que se omita el descuento de inventario.
        cacheVenta = esCacheVentaValida(cacheCruda) ? cacheCruda : undefined;
      }
      const numeroComprobante = cacheVenta?.numeroComprobante
        ?? `${data.serieSeleccionada}-${String(Math.floor(Math.random() * 10000)).padStart(8, '0')}`;
      const documentoIdVenta = cacheVenta?.documentoId ?? crypto.randomUUID();
      if (requiereIdentidadEstableVenta && !cacheVenta) {
        cacheVenta = { documentoId: documentoIdVenta, numeroComprobante };
        guardarDatosOperacionPendiente(ESPACIO_VENTA_SALIDA, empresaId, huellaVenta, documentoIdVenta, cacheVenta);
      }

      const paymentSummaryLabel = buildPaymentLabel(data.paymentDetails);
      const [serieCode, correlativoParte] = numeroComprobante.split('-');
      const resolvedCurrency: Currency = (data.currency as Currency) || 'PEN';
      const tipoComprobanteDisplay = obtenerEtiquetaTipoComprobante(data.tipoComprobante);
      const clienteNombre = data.client || 'Cliente General';
      const clienteDocumento = data.clientDoc || '00000000';
      const sucursalNombre = session?.currentEstablecimiento?.nombreEstablecimiento;
      const cajeroNombre = session?.userName || 'Usuario';
      const fechaEmisionIso = data.fechaEmision || getBusinessTodayISODate();
      const fechaVencimientoIso = data.creditTerms?.fechaVencimientoGlobal || data.fechaVencimiento;
      const normalizedFormaPago = data.formaPago?.toLowerCase?.().trim();
      const isCreditSale = normalizedFormaPago === 'credito' || Boolean(data.creditTerms);
      const paymentModeLabel = buildPaymentModeLabel(isCreditSale, data.creditTerms);
      const origenVentaAnalitica = data.source === 'emision' || data.source === 'pos' ? data.source : undefined;
      let createdCuenta: CuentaPorCobrarSummary | null = null;

      if (!isNoteCredit && isCreditSale) {
        const hoy = getBusinessNow();
        const vence = fechaVencimientoIso ? assertBusinessDate(fechaVencimientoIso, 'end') : null;
        const installmentsSnapshot = normalizeCreditTermsToInstallments(data.creditTerms);
        const initialSummary = installmentsSnapshot.length
          ? computeAccountStateFromInstallments(installmentsSnapshot)
          : {
              saldo: data.totals.total,
              cobrado: 0,
              totalInstallments: installmentsSnapshot.length,
              pendingInstallmentsCount: installmentsSnapshot.length,
              partialInstallmentsCount: 0,
              accountStatus: 'pendiente' as const,
            };
        const initialAllocations =
          data.paymentDetails?.mode === 'contado' && Array.isArray(data.paymentDetails.allocations)
            ? data.paymentDetails.allocations
            : [];
        const installmentsAfterIssue = initialAllocations.length
          ? updateInstallmentsWithAllocations(installmentsSnapshot, initialAllocations)
          : installmentsSnapshot;
        const summaryAfterIssue = installmentsAfterIssue.length
          ? computeAccountStateFromInstallments(installmentsAfterIssue)
          : initialSummary;
        const collectedOnIssue = data.paymentDetails?.mode === 'contado'
          ? data.paymentDetails.lines.reduce((acc, line) => acc + (Number(line.amount) || 0), 0)
          : 0;
        let saldoInicial = summaryAfterIssue.saldo;
        let cobradoInicial = summaryAfterIssue.cobrado;

        if (collectedOnIssue > 0 && initialAllocations.length === 0) {
          cobradoInicial = Math.min(data.totals.total, cobradoInicial + collectedOnIssue);
          saldoInicial = Math.max(0, data.totals.total - cobradoInicial);
        }

        const totalInstallments = installmentsAfterIssue.length || summaryAfterIssue.totalInstallments || data.creditTerms?.schedule.length || 0;
        const pendingInstallmentsCount = summaryAfterIssue.pendingInstallmentsCount ?? (totalInstallments || 0);
        const partialInstallmentsCount = summaryAfterIssue.partialInstallmentsCount ?? 0;
        const estadoBase = saldoInicial <= 0 ? 'cancelado' : cobradoInicial > 0 ? 'parcial' : 'pendiente';
        const estadoCuenta = vence && saldoInicial > 0 && vence.getTime() < hoy.getTime() ? 'vencido' : estadoBase;

        createdCuenta = {
          id: numeroComprobante,
          comprobanteId: numeroComprobante,
          comprobanteSerie: serieCode || data.serieSeleccionada,
          comprobanteNumero: correlativoParte || '',
          tipoComprobante: tipoComprobanteDisplay,
          EstablecimientoId: establecimientoId,
          clienteNombre,
          clienteDocumento,
          fechaEmision: fechaEmisionIso,
          fechaVencimiento: fechaVencimientoIso,
          formaPago: 'credito',
          moneda: resolvedCurrency,
          total: data.totals.total,
          cobrado: Number(cobradoInicial.toFixed(2)),
          saldo: Number(saldoInicial.toFixed(2)),
          cuotas: data.creditTerms?.schedule.length,
          creditTerms: data.creditTerms,
          installments: installmentsAfterIssue,
          totalInstallments,
          pendingInstallmentsCount,
          partialInstallmentsCount,
          estado: estadoCuenta,
          vencido: estadoCuenta === 'vencido',
          sucursal: sucursalNombre,
          cajero: cajeroNombre,
        };
        upsertCuenta(createdCuenta);
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem('lastCreatedReceivableId', createdCuenta.id);
        }
      } else if (!isNoteCredit) {
        const registroCobranzaInmediata = Boolean(
          data.paymentDetails &&
            data.paymentDetails.mode === 'contado' &&
            data.paymentDetails.lines.length > 0,
        );

        if (!registroCobranzaInmediata) {
          const paymentTermsDueDate = data.paymentTerms?.creditSchedule?.fechaVencimientoGlobal
            || data.paymentTerms?.installments?.[data.paymentTerms.installments.length - 1]?.fechaVencimiento;
          const dueDateCandidate =
            data.fechaVencimiento ||
            paymentTermsDueDate ||
            fechaEmisionIso;
          const dueDateObj = dueDateCandidate ? assertBusinessDate(dueDateCandidate, 'end') : null;
          const now = getBusinessNow();
          const estadoCuenta: CobranzaStatus = dueDateObj && dueDateObj < now ? 'vencido' : 'pendiente';

          createdCuenta = {
            id: numeroComprobante,
            comprobanteId: numeroComprobante,
            comprobanteSerie: serieCode || data.serieSeleccionada,
            comprobanteNumero: correlativoParte || '',
            tipoComprobante: tipoComprobanteDisplay,
            EstablecimientoId: establecimientoId,
            clienteNombre,
            clienteDocumento,
            fechaEmision: fechaEmisionIso,
            fechaVencimiento: dueDateCandidate,
            formaPago: 'contado',
            moneda: resolvedCurrency,
            total: data.totals.total,
            cobrado: 0,
            saldo: data.totals.total,
            estado: estadoCuenta,
            vencido: estadoCuenta === 'vencido',
            sucursal: sucursalNombre,
            cajero: cajeroNombre,
          };
          upsertCuenta(createdCuenta);

          if (typeof window !== 'undefined') {
            window.sessionStorage.setItem('lastCreatedReceivableId', createdCuenta.id);
          }
        }
      }

      const debeRegistrarCobranzaInmediata = Boolean(
        data.paymentDetails &&
          data.paymentDetails.mode === 'contado' &&
          (data.registrarPago ?? true) &&
          data.paymentDetails.lines.length > 0
      );

      if (!isNoteCredit && debeRegistrarCobranzaInmediata && data.paymentDetails) {
        const cuentaParaCobranza = createdCuenta ?? {
          id: numeroComprobante,
          comprobanteId: numeroComprobante,
          comprobanteSerie: serieCode || data.serieSeleccionada,
          comprobanteNumero: correlativoParte || '',
          tipoComprobante: tipoComprobanteDisplay,
          EstablecimientoId: establecimientoId,
          clienteNombre,
          clienteDocumento,
          fechaEmision: fechaEmisionIso,
          fechaVencimiento: fechaVencimientoIso,
          formaPago: 'contado',
          moneda: resolvedCurrency,
          total: data.totals.total,
          cobrado: 0,
          saldo: data.totals.total,
          estado: 'pendiente',
          vencido: false,
          sucursal: sucursalNombre,
          cajero: cajeroNombre,
        } as CuentaPorCobrarSummary;

        try {
          await registerCobranza({ cuenta: cuentaParaCobranza, payload: data.paymentDetails });
        } catch (cobranzaError) {
          console.error('Error registrando cobranza inmediata:', cobranzaError);
          toast.error(
            'No se pudo registrar el cobro',
            cobranzaError instanceof Error ? cobranzaError.message : 'Intenta nuevamente.'
          );
          throw cobranzaError;
        }
      }

      // ✅ DESCONTAR STOCK DE LOS PRODUCTOS VENDIDOS
      // Solo cuando el control de inventario está activo y el modo es automático.
      // Modo 'nota_salida': el comprobante se emite sin afectar stock; el despacho se registrará después.
      // Control inactivo: venta comercial sin gobernanza de inventario.
      if (!isNoteCredit && controlStockActivo && stockDescuentoFacturaYBoleta === 'automatico') {
      try {
        const EstablecimientoId = data.EstablecimientoId || session?.currentEstablecimientoId;
        const allowNegativeStock = allowNegativeStockConfig;

        if (!EstablecimientoId) {
          throw new Error('No se pudo resolver el establecimiento para descontar stock.');
        }

        // Comprobante desde OV: leer las reservas comprometidas y usarlas como
        // fuente de allocations exactas (no recalcular FIFO para no descontar
        // de almacenes distintos a los reservados por esa OV).
        const srcId = sessionStorage.getItem('conversionSourceId');
        const srcType = sessionStorage.getItem('conversionSourceType');
        const esDesdeOV = srcType === 'orden_venta' && Boolean(srcId);
        const ovReservas = esDesdeOV ? obtenerReservasDeOV(srcId!) : [];

        // Indexar reservas de OV por SKU para lookup O(1) en el loop de items.
        // Solo indexar reservas legacy que tienen almacenId (nueva arquitectura usa FIFO en su lugar).
        const reservasPorSku = new Map<string, Array<{ almacenId: string; cantidad: number }>>();
        for (const r of ovReservas) {
          if (!r.almacenId) continue; // Nueva arquitectura: sin almacenId → descuento vía FIFO normal
          if (!reservasPorSku.has(r.sku)) reservasPorSku.set(r.sku, []);
          reservasPorSku.get(r.sku)!.push({ almacenId: r.almacenId, cantidad: r.cantidad });
        }

        const almacenesOrdered = resolvealmacenesForSaleFIFO({ almacenes, EstablecimientoId });
        if (!almacenesOrdered.length) {
          throw new Error(`No hay almacenes activos configurados para el establecimiento ${EstablecimientoId}.`);
        }

        // Corrección post-1D, §1: si un intento previo (misma huella) ya calculó las líneas, se
        // reutilizan TAL CUAL — nunca se recalcula FIFO contra un stock que pudo haber cambiado
        // (p. ej. porque ese intento previo ya confirmó el descuento y esta es la persistencia
        // comercial que quedó pendiente). Solo se calcula cuando es genuinamente la primera vez.
        let lineas: DatosLineaOperacionCuantitativa[] = cacheVenta?.lineasOperacion ?? [];

        if (!cacheVenta?.lineasOperacion) {
          type PendingMovement = {
            productId: string;
            qtyUnidadMinima: number;
            almacenId: string;
          };

          const pendingMovements: PendingMovement[] = [];

          for (const item of data.cartItems) {
            if (item.tipoDetalle === 'libre') {
              continue;
            }

            if (!item.requiresStockControl) {
              continue;
            }

            const catalogProduct = catalogLookup.get(item.id) || catalogLookup.get(item.code || '');
            const quantityInUnidadMinima = catalogProduct
              ? calculateRequiredUnidadMinima({
                  product: catalogProduct,
                  quantity: item.quantity,
                  unitCode: item.presentacionId || item.unidadMedida || item.unit,
                })
              : (Number.isFinite(item.quantity) ? Number(item.quantity) : 0);

            if (quantityInUnidadMinima <= 0) {
              continue;
            }

            // Comprobante desde OV: consumir exactamente los almacenes y cantidades reservados.
            // No re-ejecutar FIFO para no descontar de almacenes distintos al comprometido.
            const itemReservas = reservasPorSku.get(item.code || '');
            if (esDesdeOV && itemReservas && itemReservas.length > 0) {
              for (const res of itemReservas) {
                if (res.cantidad <= 0) continue;
                pendingMovements.push({ productId: item.id, qtyUnidadMinima: res.cantidad, almacenId: res.almacenId });
              }
              continue;
            }

            // Venta directa: distribución FIFO progresiva por prioridad de almacén.
            if (!catalogProduct) {
              pendingMovements.push({ productId: item.id, qtyUnidadMinima: quantityInUnidadMinima, almacenId: almacenesOrdered[0].id });
              continue;
            }

            const allocations = allocateSaleAcrossalmacenes({
              product: catalogProduct,
              almacenesOrdered,
              qtyUnidadMinima: quantityInUnidadMinima,
              respectReservations: true,
            });

            // Fail-closed (corrección post-1D, §4): una asignación que no cubre exactamente la
            // cantidad requerida nunca se aplica parcialmente — rechaza el comprobante completo.
            const allocatedTotal = allocations.reduce((sum, seg) => sum + seg.qtyUnidadMinima, 0);
            if (allocatedTotal !== quantityInUnidadMinima) {
              throw new Error(
                `Stock insuficiente para emitir el comprobante. Revisa el inventario disponible del producto "${catalogProduct.nombre || item.name || 'producto'}".`
              );
            }

            allocations.forEach((seg) => {
              if (seg.qtyUnidadMinima <= 0) return;
              pendingMovements.push({ productId: item.id, qtyUnidadMinima: seg.qtyUnidadMinima, almacenId: seg.almacenId });
            });
          }

          lineas = pendingMovements.map((movement, indice) => ({
            lineaId: `${documentoIdVenta}-${indice}`,
            productoId: movement.productId,
            almacenId: movement.almacenId,
            cantidadUnidadMinima: movement.qtyUnidadMinima,
          }));

          // Comprobante desde OV: la liberación de la reserva se incorpora al MISMO plan que
          // descuenta el stock (corrección post-1D, §1) — nunca una llamada separada después.
          if (esDesdeOV) {
            aplicarLiberacionesOVVenta(lineas, ovReservas, catalogLookup);
          }

          if (requiereIdentidadEstableVenta) {
            cacheVenta = { documentoId: documentoIdVenta, numeroComprobante, lineasOperacion: lineas };
            guardarDatosOperacionPendiente(ESPACIO_VENTA_SALIDA, empresaId, huellaVenta, documentoIdVenta, cacheVenta);
          }
        }

        // Operación completa vía el motor central de salidas (Etapa 1D, §1): validación previa
        // (arriba), hash canónico, reserva idempotente, preparación pura del documento completo y
        // confirmación mediante `ejecutarUnidadTrabajoInventario` — nunca una escritura por línea.
        // `documentoId` es el UUID TÉCNICO real (nunca Math.random) — `numeroComprobante` queda
        // solo como `documentoReferencia` visible.
        if (lineas.length > 0) {
          const almacenesMap = new Map(almacenes.map((a) => [a.id, a]));
          const datosOperacion: DatosOperacionSalidaCuantitativa = {
            modoOperacion: 'cuantitativo',
            empresaId,
            documentoId: documentoIdVenta,
            tipoDocumento: 'venta',
            tipoOperacion: 'venta_salida',
            claveIdempotencia: `${ESPACIO_VENTA_SALIDA}:${documentoIdVenta}`,
            usuario: cajeroNombre,
            fecha: new Date().toISOString(),
            motivo: 'VENTA',
            observaciones: `Venta en ${data.tipoComprobante} ${numeroComprobante}`,
            documentoReferencia: numeroComprobante,
            lineas,
          };

          await ServicioKardexValorizado.registrarSalidaValorizada(datosOperacion, {
            almacenes: almacenesMap,
            generarId: () => crypto.randomUUID(),
            fechaActual: () => new Date().toISOString(),
            permitirStockNegativo: allowNegativeStock,
          });

          // Sincronización oficial de UI (Etapa 1B) — nunca una segunda escritura de productos ni
          // de movimientos: solo rehidrata el store desde el localStorage ya actualizado por la
          // unidad de trabajo y reutiliza el evento existente del Kardex. La sesión pendiente NO
          // se limpia aquí: solo cuando el comprobante quede correctamente persistido más abajo.
          sincronizarInventarioTrasConfirmacion();
        }
      } catch (stockError) {
        console.error('[Stock] Error descontando stock', {
          comprobante: numeroComprobante,
          error: stockError instanceof Error ? stockError.message : stockError,
        });
        // El comprobante ya se creó; informar al usuario para ajuste manual posterior.
        toast.warning(
          'Stock no actualizado',
          `El comprobante ${numeroComprobante} se creó pero el stock no pudo actualizarse. Ajusta manualmente desde Inventario > Movimientos si es necesario.`,
          {
            action: {
              label: 'Entendido',
              onClick: () => {}
            }
          }
        );
      }
      }

      // ✅ RESTAURAR STOCK PARA NOTA DE CRÉDITO POR DEVOLUCIÓN (códigos SUNAT 06 y 07)
      if (isNoteCredit) {
        // Solo los códigos de devolución implican retorno físico de mercadería.
        const CODIGOS_NC_DEVOLUCION = new Set(['06', '07']);
        const codigoNC = data.noteCreditData?.codigo ?? '';
        if (CODIGOS_NC_DEVOLUCION.has(codigoNC)) {
          try {
            const EstablecimientoId = data.EstablecimientoId || session?.currentEstablecimientoId;
            const Establecimiento = session?.currentEstablecimiento;
            // El comprobante afectado nos permite localizar los movimientos originales de salida.
            const docAfectado = data.noteCreditData?.documentoRelacionado?.numeroCompleto;

            const movimientosOriginales = docAfectado
              ? StockRepository.getMovements().filter(
                  (m) => m.documentoReferencia === docAfectado && m.tipo === 'SALIDA' && m.motivo === 'VENTA'
                )
              : [];

            for (const item of data.cartItems) {
              if (item.tipoDetalle === 'libre' || !item.requiresStockControl) continue;

              const catalogProduct = catalogLookup.get(item.id) || catalogLookup.get(item.code || '');
              const quantityInUnidadMinima = catalogProduct
                ? calculateRequiredUnidadMinima({
                    product: catalogProduct,
                    quantity: item.quantity,
                    unitCode: item.presentacionId || item.unidadMedida || item.unit,
                  })
                : (Number.isFinite(item.quantity) ? Number(item.quantity) : 0);

              if (quantityInUnidadMinima <= 0) continue;

              const observacionesNC = `Devolución NC ${numeroComprobante}${docAfectado ? ` / Ref: ${docAfectado}` : ''}`;

              // Buscar movimientos de salida del comprobante afectado para este producto.
              const salidaOriginal = movimientosOriginales.filter((m) => m.productoId === item.id);
              const totalSalidaOriginal = salidaOriginal.reduce((sum, m) => sum + m.cantidad, 0);

              if (salidaOriginal.length > 0 && totalSalidaOriginal > 0) {
                // Devolver al almacén original de forma proporcional.
                let pendiente = quantityInUnidadMinima;
                for (const mov of salidaOriginal) {
                  if (pendiente <= 0) break;
                  const proporcion = mov.cantidad / totalSalidaOriginal;
                  const cantidadDevolver = Math.min(
                    pendiente,
                    Math.round(quantityInUnidadMinima * proporcion * 1000) / 1000
                  );
                  if (cantidadDevolver <= 0) continue;
                  addMovimientoStock(
                    item.id,
                    'ENTRADA',
                    'DEVOLUCION_CLIENTE',
                    cantidadDevolver,
                    observacionesNC,
                    numeroComprobante,
                    undefined,
                    EstablecimientoId,
                    Establecimiento?.codigoEstablecimiento,
                    Establecimiento?.nombreEstablecimiento,
                    { almacenId: mov.almacenId, allowNegativeStock: true }
                  );
                  pendiente -= cantidadDevolver;
                }
                // Resto por redondeo al primer almacén original.
                if (pendiente > 0.001) {
                  addMovimientoStock(
                    item.id,
                    'ENTRADA',
                    'DEVOLUCION_CLIENTE',
                    pendiente,
                    observacionesNC,
                    numeroComprobante,
                    undefined,
                    EstablecimientoId,
                    Establecimiento?.codigoEstablecimiento,
                    Establecimiento?.nombreEstablecimiento,
                    { almacenId: salidaOriginal[0].almacenId, allowNegativeStock: true }
                  );
                }
              } else if (EstablecimientoId) {
                // Fallback: sin movimientos originales, devolver al primer almacén FIFO activo.
                const almacenesOrdered = resolvealmacenesForSaleFIFO({ almacenes, EstablecimientoId });
                const almacenDestino = almacenesOrdered[0];
                if (!almacenDestino) continue;
                addMovimientoStock(
                  item.id,
                  'ENTRADA',
                  'DEVOLUCION_CLIENTE',
                  quantityInUnidadMinima,
                  observacionesNC,
                  numeroComprobante,
                  undefined,
                  EstablecimientoId,
                  Establecimiento?.codigoEstablecimiento,
                  Establecimiento?.nombreEstablecimiento,
                  { almacenId: almacenDestino.id, allowNegativeStock: true }
                );
              }
            }
          } catch (ncStockError) {
            console.error('[Stock] Error restaurando stock por NC devolución', {
              comprobante: numeroComprobante,
              error: ncStockError instanceof Error ? ncStockError.message : ncStockError,
            });
            toast.warning(
              'Stock no restaurado',
              `La nota de crédito ${numeroComprobante} se creó pero el stock no pudo restaurarse. Ajusta manualmente desde Inventario si es necesario.`,
              { action: { label: 'Entendido', onClick: () => {} } }
            );
          }
        }
      }

      // ✅ AGREGAR COMPROBANTE A LA LISTA GLOBAL
      try {
        // Formatear fecha actual en el formato esperado por la lista
        const businessNow = getBusinessNow();
        const formattedDate = formatBusinessDateTimeForTicket(businessNow);

        // Determinar el tipo de comprobante para la lista
        // Obtener usuario actual
        const vendorName = session?.userName || 'Usuario';

        // Crear el objeto comprobante para la lista
        // Construir objeto usando los campos opcionales cuando estén presentes
        const dateToUse = data.fechaEmision
          ? (() => {
              try {
                const composedIssueDate = composeBusinessDateTime(data.fechaEmision, businessNow);
                return formatBusinessDateTimeForTicket(composedIssueDate);
              } catch (e) {
                return formattedDate;
              }
            })()
          : formattedDate;

  const paymentMethodLabel = paymentModeLabel;

        // ✅ VERIFICAR SI VIENE DE CONVERSIÓN PARA AGREGAR CORRELACIÓN
        const conversionSourceId = sessionStorage.getItem('conversionSourceId');
        const conversionSourceType = sessionStorage.getItem('conversionSourceType');
        // Número visible del documento origen (ej: OV01-00000005); ausente en flujos no-OV
        const conversionSourceNumber = sessionStorage.getItem('conversionSourceNumber');
        const targetEstablecimientoId = data.EstablecimientoId || session?.currentEstablecimientoId;
        const Establecimiento = targetEstablecimientoId
          ? (session?.availableEstablecimientos || []).find((est) => est.id === targetEstablecimientoId) || session?.currentEstablecimiento
          : session?.currentEstablecimiento;
        const instantaneaDocumentoComercial = crearInstantaneaDocumentoComercial({
          tipoDocumento: data.tipoComprobante,
          tipoComprobante: data.tipoComprobante,
          numeroCompleto: numeroComprobante,
          fechaEmision: data.fechaEmision ?? formatBusinessDateTimeIso(businessNow),
          horaEmision: formatBusinessDateTimeIso(businessNow),
          moneda: resolvedCurrency as Currency,
          tipoCambio: data.exchangeRate ?? null,
          tipoOperacion: data.tipoOperacion ?? null,
          origen:
            data.source === 'emision'
              ? 'emision_tradicional'
              : data.source === 'pos'
                ? 'pos'
                : 'documento_comercial',
          idDocumento: numeroComprobante,
          empresa: {
            idEmpresa: data.companyId || session?.currentCompanyId || null,
            nombreComercial: session?.currentCompany?.nombreComercial || null,
            razonSocial: session?.currentCompany?.razonSocial || null,
            ruc: session?.currentCompany?.ruc || null,
          },
          establecimiento: {
            idEstablecimiento: targetEstablecimientoId || null,
            codigoEstablecimiento: Establecimiento?.codigoEstablecimiento || null,
            nombreEstablecimiento: Establecimiento?.nombreEstablecimiento || null,
          },
          vendedor: {
            idUsuario: session?.userId || null,
            nombreUsuario: vendorName,
          },
          cliente: {
            idCliente: data.clientId ?? null,
            nombre: data.client || 'Cliente General',
            tipoDocumento: data.clientDocType ?? null,
            numeroDocumento: data.clientDoc || null,
            email: data.email ?? null,
            direccion: data.address ?? null,
            priceProfileId: data.clientPriceProfileId ?? null,
          },
          camposComerciales: {
            direccionEnvio: data.shippingAddress ?? null,
            ordenCompra: data.purchaseOrder ?? null,
            guiaRemision: data.waybill ?? null,
            centroCosto: data.costCenter ?? null,
            observaciones: data.observaciones ?? null,
            notaInterna: data.notaInterna ?? null,
            fechaVencimiento: fechaVencimientoIso ?? null,
            formaPagoId: data.formaPago ?? null,
            formaPagoDescripcion: paymentMethodLabel,
            detallesPago: data.paymentDetails ?? null,
            terminosCredito: data.creditTerms ?? null,
            datosDetraccion: data.datosDetraccion ?? null,
          },
          items: data.cartItems,
          totales: {
            ...data.totals,
            currency: resolvedCurrency,
          },
          relaciones: {
            documentoOrigenId:
              isNoteCredit && data.noteCreditData?.documentoRelacionado
                ? data.noteCreditData.documentoRelacionado.id ?? null
                : null,
            documentoOrigenTipo:
              isNoteCredit && data.noteCreditData?.documentoRelacionado
                ? data.noteCreditData.documentoRelacionado.tipoDocumentoLabelOrigen
                : null,
            documentoRelacionadoId:
              isNoteCredit && data.noteCreditData?.documentoRelacionado
                ? data.noteCreditData.documentoRelacionado.numeroCompleto
                : !isNoteCredit && conversionSourceId
                  ? conversionSourceId
                  : null,
            documentoRelacionadoTipo:
              isNoteCredit && data.noteCreditData?.documentoRelacionado
                ? data.noteCreditData.documentoRelacionado.tipoDocumentoLabelOrigen
                : !isNoteCredit && conversionSourceType
                  ? conversionSourceType
                  : null,
            datosNotaCredito: data.noteCreditData ?? null,
            idDocumentoFuente: conversionSourceId,
            tipoDocumentoFuente: conversionSourceType,
          },
        });

        const nuevoComprobante = {
          id: numeroComprobante,
          type: tipoComprobanteDisplay,
          clientDoc: data.clientDoc || '00000000',
          client: data.client || 'Cliente General',
          clientDocType: data.clientDocType,
          clientId: data.clientId,
          clientPriceProfileId: data.clientPriceProfileId,
          date: dateToUse,
          vendor: vendorName,
          total: data.totals.total,
          status: 'Enviado',
          statusColor: 'blue' as const,
          // Optional fields
          email: data.email,
          dueDate: fechaVencimientoIso,
          address: data.address,
          shippingAddress: data.shippingAddress,
          purchaseOrder: data.purchaseOrder,
          costCenter: data.costCenter,
          waybill: data.waybill,
          observations: data.observaciones,
          internalNote: data.notaInterna,
          // Payment and currency
          paymentMethod: paymentMethodLabel,
          paymentMethodId: data.formaPago,
          currency: data.currency || undefined,
          exchangeRate: data.exchangeRate,
          items: data.cartItems,
          cartItems: data.cartItems,
          productos: data.cartItems,
          totals: {
            ...data.totals,
            currency: resolvedCurrency,
          },
          creditTerms: data.creditTerms,
          noteCreditData: data.noteCreditData,
          instantaneaDocumentoComercial,
          // Correlación bidireccional (si viene de conversión)
          ...(isNoteCredit && data.noteCreditData?.documentoRelacionado ? {
            relatedDocumentId: data.noteCreditData.documentoRelacionado.numeroCompleto,
            relatedDocumentType: data.noteCreditData.documentoRelacionado.tipoDocumentoLabelOrigen,
            sourceDocumentId: data.noteCreditData.documentoRelacionado.id,
            sourceDocumentType: data.noteCreditData.documentoRelacionado.tipoDocumentoLabelOrigen,
          } : {}),
          ...(!isNoteCredit && conversionSourceId && conversionSourceType ? {
            // relatedDocumentId: número VISIBLE del documento origen (OV01-00000005)
            // sourceDocumentId: UUID técnico, mismo patrón que Nota de Crédito
            relatedDocumentId: conversionSourceNumber || conversionSourceId,
            relatedDocumentType: conversionSourceType,
            sourceDocumentId: conversionSourceId,
            sourceDocumentType: conversionSourceType,
            convertedFromDocument: true
          } : {}),
          ...(!isNoteCredit ? {
            modoDescuentoStock: !controlStockActivo
              ? 'sin_control' as const
              : sessionStorage.getItem('conversionSourceType') === 'nota_venta'
                ? 'sin_control' as const
                : stockDescuentoFacturaYBoleta === 'nota_salida'
                  ? 'nota_salida' as const
                  : 'automatico' as const,
          } : {}),
          // Relación oficial y navegable hacia Inventario (corrección post-1D, §1): el mismo UUID
          // técnico usado como `documentoId`/`documentoOrigenId` del motor central de salidas.
          // `numeroComprobante` (id) sigue siendo la identidad comercial visible, sin cambios.
          ...(requiereIdentidadEstableVenta ? { inventarioDocumentoId: documentoIdVenta } : {}),
        };

        // Agregar al contexto global
        addComprobante(nuevoComprobante);

        // La sesión pendiente de venta_salida solo se limpia AHORA — inventario ya quedó
        // confirmado/repetido (arriba) Y el comprobante quedó correctamente persistido (recién
        // arriba). Si `addComprobante` hubiera fallado, la sesión seguiría viva para que un
        // reintento reconstruya la MISMA identidad sin descontar stock de nuevo (corrección
        // post-1D, §1).
        if (requiereIdentidadEstableVenta) {
          limpiarSesionPendienteOperacion(ESPACIO_VENTA_SALIDA, empresaId);
        }

        registrarComprobanteEstadoActualizado({
          estado: 'enviado',
          tipoComprobante: resolverTipoComprobanteAnalitica(data.tipoComprobante),
          formaPago: resolverFormaPagoAnalitica(isCreditSale),
          ...(origenVentaAnalitica ? { origenVenta: origenVentaAnalitica } : {}),
        });

        // ✅ PROTOTIPO FUNCIONAL: Enviado -> Aceptado sigue viniendo del mock OSE.
        // En el repo oficial debe reemplazarse por una confirmación real de backend/OSE.
        if (!isNoteCredit) {
          setTimeout(() => {
            registrarComprobanteEstadoActualizado({
              estado: 'aceptado',
              tipoComprobante: resolverTipoComprobanteAnalitica(data.tipoComprobante),
              formaPago: resolverFormaPagoAnalitica(isCreditSale),
              ...(origenVentaAnalitica ? { origenVenta: origenVentaAnalitica } : {}),
            });
            dispatch({
              type: 'UPDATE_COMPROBANTE',
              payload: { ...nuevoComprobante, status: 'Aceptado', statusColor: 'green' as const },
            });
          }, MOCK_OSE_RESPONSE_DELAY_MS);
        }

        // ✅ ACTUALIZAR DOCUMENTO ORIGEN SI VIENE DE CONVERSIÓN
        try {
          const conversionSourceId = sessionStorage.getItem('conversionSourceId');
          const conversionSourceType = sessionStorage.getItem('conversionSourceType');
          
          if (!isNoteCredit && conversionSourceId && conversionSourceType) {
            // Actualizar documento origen de documentos_comerciales
            if (conversionSourceType === 'orden_venta') {
              actualizarOrdenVentaPostEmision(conversionSourceId, {
                tipoComprobante: tipoComprobanteDisplay,
                numeroComprobante,
                total: data.totals?.total ?? 0,
                usuario: session?.userName ?? undefined,
                modoDescuentoStock: nuevoComprobante.modoDescuentoStock,
                // El motor central de salidas ya liberó la reserva en el mismo plan que descontó
                // el stock (corrección post-1D, §1) — esta llamada solo debe actualizar estado,
                // trazabilidad e historial comercial, nunca volver a mutar la reserva.
                reservaYaLiberadaPorMotor: nuevoComprobante.modoDescuentoStock === 'automatico',
              });
            }
            if (conversionSourceType === 'cotizacion') {
              const rawSync = sessionStorage.getItem('conversionCotizacionComercialSync');
              sessionStorage.removeItem('conversionCotizacionComercialSync');
              let dadosComerciaisSync: DadosComerciaisSyncComprobante | undefined;
              if (rawSync) {
                try { dadosComerciaisSync = JSON.parse(rawSync) as DadosComerciaisSyncComprobante; } catch { /* ignore */ }
              }
              actualizarCotizacionPostEmision(conversionSourceId, {
                tipoComprobante: tipoComprobanteDisplay,
                numeroComprobante,
                total: data.totals?.total ?? 0,
                usuario: session?.userName ?? undefined,
              }, dadosComerciaisSync);
            }
            if (conversionSourceType === 'nota_venta') {
              actualizarNVPostEmision(conversionSourceId, {
                tipoComprobante: tipoComprobanteDisplay,
                numeroComprobante,
                total: data.totals?.total ?? 0,
                usuario: session?.userName ?? undefined,
              });
            }

            // Limpiar sessionStorage
            sessionStorage.removeItem('conversionSourceId');
            sessionStorage.removeItem('conversionSourceType');
            sessionStorage.removeItem('conversionSourceNumber');
          }
        } catch (conversionError) {
          console.error('Error actualizando documento origen:', conversionError);
          // No lanzar error, el comprobante ya se creó exitosamente
        }
      } catch (contextError) {
        console.error('Error agregando comprobante al contexto:', contextError);
        // No lanzar error, el comprobante ya se creó exitosamente
      }

      // ✅ Registrar snapshot para indicadores locales
      try {
        if (!isNoteCredit) {
          const now = getBusinessNow();
          const fechaEmisionDate = data.fechaEmision
            ? assertBusinessDate(data.fechaEmision, 'start')
            : now;
          const targetEstablecimientoId = data.EstablecimientoId || session?.currentEstablecimientoId;
          const Establecimiento = targetEstablecimientoId
            ? (session?.availableEstablecimientos || []).find((est) => est.id === targetEstablecimientoId) || session?.currentEstablecimiento
            : session?.currentEstablecimiento;

          devLocalIndicadoresStore.registerVenta({
            numeroComprobante,
            tipoComprobante: data.tipoComprobante,
            clienteNombre: data.client || 'Cliente mostrador',
            clienteDocumento: data.clientDoc,
            clienteId: data.clientDoc,
            vendedorNombre: session?.userName || 'Usuario',
            vendedorId: session?.userId,
            establecimientoId: targetEstablecimientoId,
            establecimientoNombre: Establecimiento?.nombreEstablecimiento,
            establecimientoCodigo: Establecimiento?.codigoEstablecimiento,
            empresaId: data.companyId || session?.currentCompanyId,
            moneda: data.currency || 'PEN',
            tipoCambio: data.currency && data.currency !== 'PEN' ? data.exchangeRate ?? 1 : 1,
            total: data.totals.total,
            subtotal: data.totals.subtotal,
            igv: data.totals.igv,
            fechaEmision: formatBusinessDateTimeIso(fechaEmisionDate),
            productos: mapCartItemsToVentaProductos(data.cartItems),
            formaPago: paymentModeLabel,
            medioPago: paymentSummaryLabel,
            source: data.source ?? 'otros'
          });
        }
      } catch (indicadoresError) {
        console.warn('[indicadores-dev-local] No se pudo registrar la venta local', indicadoresError);
      }

      toast.success(
        '¡Comprobante creado!',
        `${tipoComprobanteDisplay} ${numeroComprobante} generado exitosamente`,
        {
          action: {
            label: 'Ver comprobante',
            onClick: () => {
              // Aquí iría la navegación al detalle del comprobante
              console.log('Navegando a comprobante:', numeroComprobante);
            }
          }
        }
      );

      return true;

    } catch (error) {
      console.error('Error creating comprobante:', error);

      toast.error(
        'Error al crear comprobante',
        'Ocurrió un error inesperado. Por favor, inténtelo nuevamente.',
        {
          action: {
            label: 'Reintentar',
            onClick: () => createComprobante(data)
          }
        }
      );

      return false;
    } finally {
      // Cleanup del timeout si existe
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }, [toast, validateComprobanteData, buildPaymentLabel, addMovimientoStock, addComprobante, dispatch, session, registerCobranza, upsertCuenta, catalogLookup, almacenes, allowNegativeStockConfig, controlStockActivo, stockDescuentoFacturaYBoleta, rolesConfigurados, usuarioActual]);

  // Guardar borrador
  const saveDraft = useCallback(async (data: ComprobanteData, expiryDate?: Date): Promise<boolean> => {
    try {
      if (data.cartItems.length === 0) {
        toast.warning(
          'Borrador vacío',
          'No hay productos para guardar en el borrador'
        );
        return false;
      }

      toast.info('Guardando...', 'Guardando borrador del comprobante');

      // Simular guardado
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Guardar en localStorage (simulación)
      try {
        const draftId = `draft_${Date.now()}`;
        const draftData = {
          id: draftId,
          ...data,
          createdAt: formatBusinessDateTimeIso(getBusinessNow()),
          expiryDate: expiryDate ? formatBusinessDateTimeIso(expiryDate) : undefined,
        };

        const existingDrafts = JSON.parse(localStorage.getItem('comprobante_drafts') || '[]');
        existingDrafts.push(draftData);
        localStorage.setItem('comprobante_drafts', JSON.stringify(existingDrafts));
      } catch (storageError) {
        console.error('Error accessing localStorage:', storageError);
        throw new Error('No se pudo guardar el borrador en el almacenamiento local');
      }

      toast.success(
        'Borrador guardado',
        `Se guardó el borrador con ${data.cartItems.length} producto${data.cartItems.length > 1 ? 's' : ''}`,
        {
          action: {
            label: 'Ver borradores',
            onClick: () => {
              // Aquí iría la navegación a la lista de borradores
              console.log('Navegando a borradores');
            }
          }
        }
      );

      return true;

    } catch (error) {
      console.error('Error saving draft:', error);

      toast.error(
        'Error al guardar',
        'No se pudo guardar el borrador. Inténtelo nuevamente.'
      );

      return false;
    }
  }, [toast]);

  // Procesar pago
  const processPayment = useCallback(async (
    paymentData: {
      amount: number;
      method: string;
      receivedAmount?: number;
    },
    comprobanteData: ComprobanteData
  ): Promise<boolean> => {
    try {
      // Validar monto
      if (paymentData.amount <= 0) {
        toast.error('Monto inválido', 'El monto a pagar debe ser mayor a cero');
        return false;
      }

      // Validar efectivo recibido si es necesario
      if (paymentData.method === 'efectivo' && paymentData.receivedAmount) {
        if (paymentData.receivedAmount < paymentData.amount) {
          toast.error(
            'Efectivo insuficiente',
            `Se necesita S/ ${paymentData.amount.toFixed(2)} pero solo se recibió S/ ${paymentData.receivedAmount.toFixed(2)}`
          );
          return false;
        }
      }

      toast.info('Procesando pago...', 'Validando método de pago y generando comprobante');

      // Simular procesamiento
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Crear comprobante después del pago exitoso
      const success = await createComprobante(comprobanteData);

      if (success) {
        // Mostrar información adicional del pago
        const change = paymentData.receivedAmount && paymentData.receivedAmount > paymentData.amount
          ? paymentData.receivedAmount - paymentData.amount
          : 0;

        if (change > 0) {
          toast.info(
            'Vuelto',
            `Entregar S/ ${change.toFixed(2)} de vuelto`,
            {
              action: {
                label: 'Entregado',
                onClick: () => toast.success('Vuelto entregado', 'Transacción completada')
              }
            }
          );
        }
      }

      return success;

    } catch (error) {
      console.error('Error processing payment:', error);

      toast.error(
        'Error en el pago',
        'No se pudo procesar el pago. Verifique la información e inténtelo nuevamente.'
      );

      return false;
    }
  }, [toast, createComprobante]);

  return {
    // Actions
    createComprobante,
    saveDraft,
    processPayment,
    validateComprobanteData,
    cancelarVentaPendiente,

    // Toast utilities (sistema real de toasts)
    success: toast.success,
    error: toast.error,
    warning: toast.warning,
    info: toast.info,
    toasts: toast.toasts,
    removeToast: toast.removeToast,
    paymentMethods,
  };
};

