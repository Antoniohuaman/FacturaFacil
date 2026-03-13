/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
/* eslint-disable @typescript-eslint/no-unused-vars -- variables temporales; limpieza diferida */
import { useCallback, useMemo } from 'react';
import type {
  CartItem,
  ComprobanteCreditTerms,
  ComprobantePaymentTerms,
  DatosNotaCredito,
  PaymentCollectionPayload,
  Currency,
  TipoComprobante,
} from '../models/comprobante.types';
import { lsKey } from '../../../../../shared/tenant';
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
import { crearInstantaneaDocumentoComercial } from '../models/instantaneaDocumentoComercial';

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

export const useComprobanteActions = () => {
  const toast = useToast();
  const { addMovimiento: addMovimientoStock } = useInventoryFacade();
  const { addComprobante, dispatch } = useComprobanteContext();
  const { session } = useUserSession();
  const { upsertCuenta, registerCobranza } = useCobranzasContext();
  const { allProducts: catalogProducts } = useProductStore();
  const { state: { almacenes, salesPreferences, users }, rolesConfigurados } = useConfigurationContext();
  const allowNegativeStockConfig = Boolean(salesPreferences?.allowNegativeStock);
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

  // Crear comprobante
  const createComprobante = useCallback(async (data: ComprobanteData): Promise<boolean> => {
    let timeoutId: NodeJS.Timeout | null = null;

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

      // Simular loading
      toast.info('Procesando...', 'Creando comprobante electrónico');

      // Simular llamada API con cleanup
      await new Promise((resolve) => {
        timeoutId = setTimeout(resolve, 2000);
      });

      // Simular respuesta exitosa
      const numeroComprobante = `${data.serieSeleccionada}-${String(Math.floor(Math.random() * 10000)).padStart(8, '0')}`;

      const paymentSummaryLabel = buildPaymentLabel(data.paymentDetails);
      const [serieCode, correlativoParte] = numeroComprobante.split('-');
      const resolvedCurrency: Currency = (data.currency as Currency) || 'PEN';
      const tipoComprobanteDisplay = obtenerEtiquetaTipoComprobante(data.tipoComprobante);
      const isNoteCredit = data.tipoComprobante === 'nota_credito';
      const clienteNombre = data.client || 'Cliente General';
      const clienteDocumento = data.clientDoc || '00000000';
      const sucursalNombre = session?.currentEstablecimiento?.nombreEstablecimiento;
      const cajeroNombre = session?.userName || 'Usuario';
      const fechaEmisionIso = data.fechaEmision || getBusinessTodayISODate();
      const fechaVencimientoIso = data.creditTerms?.fechaVencimientoGlobal || data.fechaVencimiento;
      const normalizedFormaPago = data.formaPago?.toLowerCase?.().trim();
      const isCreditSale = normalizedFormaPago === 'credito' || Boolean(data.creditTerms);
      const paymentModeLabel = buildPaymentModeLabel(isCreditSale, data.creditTerms);
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
      if (!isNoteCredit) {
      try {
        // Obtener datos del establecimiento desde la sesión o datos recibidos
        const EstablecimientoId = data.EstablecimientoId || session?.currentEstablecimientoId;
        const Establecimiento = session?.currentEstablecimiento;

        const allowNegativeStock = allowNegativeStockConfig;

        if (!EstablecimientoId) {
          throw new Error('No se pudo resolver el establecimiento para descontar stock.');
        }

        const almacenesOrdered = resolvealmacenesForSaleFIFO({ almacenes, EstablecimientoId });
        if (!almacenesOrdered.length) {
          throw new Error(`No hay almacenes activos configurados para el establecimiento ${EstablecimientoId}.`);
        }

        type PendingMovement = {
          productId: string;
          qtyUnidadMinima: number;
          almacenId: string;
          observaciones: string;
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
                unitCode: item.unidadMedida || item.unit,
              })
            : (Number.isFinite(item.quantity) ? Number(item.quantity) : 0);

          if (quantityInUnidadMinima <= 0) {
            continue;
          }

          const observaciones = `Venta en ${data.tipoComprobante} ${numeroComprobante}`;

          // Si no tenemos snapshot del producto en catálogo, no podemos distribuir por almacén.
          // Mantener comportamiento simple: aplicar al primer almacén FIFO.
          if (!catalogProduct) {
            pendingMovements.push({
              productId: item.id,
              qtyUnidadMinima: quantityInUnidadMinima,
              almacenId: almacenesOrdered[0].id,
              observaciones,
            });
            continue;
          }

          const allocations = allocateSaleAcrossalmacenes({
            product: catalogProduct,
            almacenesOrdered,
            qtyUnidadMinima: quantityInUnidadMinima,
            respectReservations: true,
          });

          const allocatedTotal = allocations.reduce((sum, seg) => sum + seg.qtyUnidadMinima, 0);
          const remaining = quantityInUnidadMinima - allocatedTotal;

          if (!allowNegativeStock && remaining > 0) {
            throw new Error(
              `Stock insuficiente para ${catalogProduct.nombre || item.name || 'producto'} en el establecimiento. ` +
              `Solicitado: ${quantityInUnidadMinima}. Disponible: ${allocatedTotal}.`
            );
          }

          allocations.forEach((seg) => {
            if (seg.qtyUnidadMinima <= 0) return;
            pendingMovements.push({
              productId: item.id,
              qtyUnidadMinima: seg.qtyUnidadMinima,
              almacenId: seg.almacenId,
              observaciones,
            });
          });

          if (allowNegativeStock && remaining > 0) {
            pendingMovements.push({
              productId: item.id,
              qtyUnidadMinima: remaining,
              almacenId: almacenesOrdered[0].id,
              observaciones,
            });
          }
        }

        // Aplicación atómica: si no se permite negativo y algo falla, no se registran parciales.
        for (const movement of pendingMovements) {
          addMovimientoStock(
            movement.productId,
            'SALIDA',
            'VENTA',
            movement.qtyUnidadMinima,
            movement.observaciones,
            numeroComprobante,
            undefined,
            EstablecimientoId,
            Establecimiento?.codigoEstablecimiento,
            Establecimiento?.nombreEstablecimiento,
            {
              almacenId: movement.almacenId,
              allowNegativeStock,
            }
          );
        }
      } catch (stockError) {
        console.error('Error descontando stock:', stockError);
        // No lanzar error, el comprobante ya se creó
        toast.warning(
          'Stock no actualizado',
          'El comprobante se creó pero no se pudo actualizar el stock automáticamente.',
          {
            action: {
              label: 'Entendido',
              onClick: () => {}
            }
          }
        );
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
            relatedDocumentId: conversionSourceId,
            relatedDocumentType: conversionSourceType,
            convertedFromDocument: true
          } : {})
        };

        // Agregar al contexto global
        addComprobante(nuevoComprobante);

        // ✅ SIMULAR RESPUESTA OSE: Enviado → Aceptado (solo Factura/Boleta, no NC)
        if (!isNoteCredit) {
          setTimeout(() => {
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
            // Obtener documentos del localStorage
            const documentosLS = localStorage.getItem(lsKey('documentos_negociacion'));
            if (documentosLS) {
              const documentos = JSON.parse(documentosLS);
              
              // Buscar y actualizar el documento origen
              const updatedDocumentos = documentos.map((doc: any) => {
                if (doc.id === conversionSourceId) {
                  return {
                    ...doc,
                    status: 'Convertido',
                    statusColor: 'green',
                    relatedDocumentId: numeroComprobante,
                    relatedDocumentType: tipoComprobanteDisplay,
                    convertedToInvoice: true,
                    convertedDate: formatBusinessDateTimeIso(getBusinessNow())
                  };
                }
                return doc;
              });
              
              // Guardar documentos actualizados
              localStorage.setItem(lsKey('documentos_negociacion'), JSON.stringify(updatedDocumentos));
              
              console.log(`✅ Documento ${conversionSourceId} actualizado con relación a ${numeroComprobante}`);
            }
            
            // Limpiar sessionStorage
            sessionStorage.removeItem('conversionSourceId');
            sessionStorage.removeItem('conversionSourceType');
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
  }, [toast, validateComprobanteData, buildPaymentLabel, addMovimientoStock, addComprobante, dispatch, session, registerCobranza, upsertCuenta, catalogLookup, almacenes, allowNegativeStockConfig, rolesConfigurados, usuarioActual]);

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

