/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
/* eslint-disable @typescript-eslint/no-unused-vars -- variables temporales; limpieza diferida */
import { useCallback } from 'react';
import type { CartItem } from '../models/comprobante.types';
import { useCaja } from '../../control-caja/context/CajaContext';
import type { MedioPago } from '../../control-caja/models/Caja';
import { lsKey } from '../../../shared/tenant';
// Reemplazamos el uso de addMovimiento desde el store del catálogo por la fachada de inventario
import { useInventoryFacade } from '../../gestion-inventario/api/inventory.facade';
import { useComprobanteContext } from '../lista-comprobantes/contexts/ComprobantesListContext';
import { useUserSession } from '../../../contexts/UserSessionContext';
import { useToast } from '../shared/ui/Toast/useToast';
import { devLocalIndicadoresStore, mapCartItemsToVentaProductos } from '../../indicadores-negocio/integration/devLocalStore';

interface ComprobanteData {
  tipoComprobante: string;
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
  establishmentId?: string;
  companyId?: string;
  exchangeRate?: number;
  source?: 'emision' | 'pos' | 'otros';
  // Campos opcionales provenientes del formulario de emisión
  client?: string;
  clientDoc?: string;
  fechaEmision?: string; // ISO date 'YYYY-MM-DD'
  fechaVencimiento?: string;
  email?: string;
  address?: string;
  shippingAddress?: string;
  purchaseOrder?: string;
  costCenter?: string;
  waybill?: string;
  currency?: string;
}

export const useComprobanteActions = () => {
  const toast = useToast();
  const { agregarMovimiento, status: cajaStatus } = useCaja();
  const { addMovimiento: addMovimientoStock } = useInventoryFacade();
  const { addComprobante } = useComprobanteContext();
  const { session } = useUserSession();

  /**
   * Mapea las formas de pago de comprobantes a los medios de pago de caja
   */
  const mapFormaPagoToMedioPago = useCallback((formaPago: string): MedioPago => {
    const mapping: Record<string, MedioPago> = {
      'efectivo': 'Efectivo',
      'contado': 'Efectivo', // Contado se asume como efectivo
      'tarjeta': 'Tarjeta',
      'yape': 'Yape',
      'plin': 'Plin',
      'transferencia': 'Transferencia',
      'deposito': 'Deposito'
    };

    return mapping[formaPago.toLowerCase()] || 'Efectivo';
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

      // Registrar movimiento en caja si está abierta
      if (cajaStatus === 'abierta') {
        try {
          const medioPago = mapFormaPagoToMedioPago(data.formaPago || 'contado');
          
          // Obtener usuario actual desde sesión
          const userId = session?.userId || 'temp-user-id';
          const userName = session?.userName || 'Usuario';

          await agregarMovimiento({
            tipo: 'Ingreso',
            concepto: `${data.tipoComprobante} ${numeroComprobante}`,
            medioPago: medioPago,
            monto: data.totals.total,
            referencia: numeroComprobante,
            usuarioId: userId,
            usuarioNombre: userName
          });
        } catch (cajaError) {
          console.error('Error registrando movimiento en caja:', cajaError);
          // No lanzar error, el comprobante ya se creó exitosamente
          toast.warning(
            'Comprobante creado',
            'El comprobante se creó pero no se pudo registrar en caja. Registre manualmente.',
            {
              action: {
                label: 'Entendido',
                onClick: () => {}
              }
            }
          );
        }
      }

      // ✅ DESCONTAR STOCK DE LOS PRODUCTOS VENDIDOS
      try {
        // Obtener datos del establecimiento desde la sesión o datos recibidos
        const establishmentId = data.establishmentId || session?.currentEstablishmentId;
        const establishment = session?.currentEstablishment;

        for (const item of data.cartItems) {
          // Solo descontar stock si el producto requiere control de stock
          if (item.requiresStockControl) {
            addMovimientoStock(
              item.id,
              'SALIDA',
              'VENTA',
              item.quantity,
              `Venta en ${data.tipoComprobante} ${numeroComprobante}`,
              numeroComprobante,
              undefined, // ubicación
              establishmentId,
              establishment?.code,
              establishment?.name
            );
          }
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

      // ✅ AGREGAR COMPROBANTE A LA LISTA GLOBAL
      try {
        // Formatear fecha actual en el formato esperado por la lista
        const now = new Date();
        const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
        const formattedDate = `${now.getDate()} ${months[now.getMonth()]}. ${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        // Determinar el tipo de comprobante para la lista
        let tipoComprobanteDisplay = 'Boleta de venta';
        if (data.tipoComprobante.toLowerCase().includes('factura')) {
          tipoComprobanteDisplay = 'Factura';
        }

        // Obtener usuario actual
        const vendorName = session?.userName || 'Usuario';

        // Crear el objeto comprobante para la lista
        // Construir objeto usando los campos opcionales cuando estén presentes
        const dateToUse = data.fechaEmision ? ((): string => {
          try {
            const d = new Date(data.fechaEmision + 'T00:00:00');
            const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
            return `${d.getDate()} ${months[d.getMonth()]}. ${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
          } catch (e) {
            return formattedDate;
          }
        })() : formattedDate;

        const paymentMethodLabel = data.formaPago ? mapFormaPagoToMedioPago(data.formaPago) : 'Efectivo';

        // ✅ VERIFICAR SI VIENE DE CONVERSIÓN PARA AGREGAR CORRELACIÓN
        const conversionSourceId = sessionStorage.getItem('conversionSourceId');
        const conversionSourceType = sessionStorage.getItem('conversionSourceType');

        const nuevoComprobante = {
          id: numeroComprobante,
          type: tipoComprobanteDisplay,
          clientDoc: data.clientDoc || '00000000',
          client: data.client || 'Cliente General',
          date: dateToUse,
          vendor: vendorName,
          total: data.totals.total,
          status: 'Enviado',
          statusColor: 'blue' as const,
          // Optional fields
          email: data.email,
          dueDate: data.fechaVencimiento,
          address: data.address,
          shippingAddress: data.shippingAddress,
          purchaseOrder: data.purchaseOrder,
          costCenter: data.costCenter,
          waybill: data.waybill,
          observations: data.observaciones,
          internalNote: data.notaInterna,
          // Payment and currency
          paymentMethod: paymentMethodLabel,
          currency: data.currency || undefined,
          // Correlación bidireccional (si viene de conversión)
          ...(conversionSourceId && conversionSourceType ? {
            relatedDocumentId: conversionSourceId,
            relatedDocumentType: conversionSourceType,
            convertedFromDocument: true
          } : {})
        };

        // Agregar al contexto global
        addComprobante(nuevoComprobante);

        // ✅ ACTUALIZAR DOCUMENTO ORIGEN SI VIENE DE CONVERSIÓN
        try {
          const conversionSourceId = sessionStorage.getItem('conversionSourceId');
          const conversionSourceType = sessionStorage.getItem('conversionSourceType');
          
          if (conversionSourceId && conversionSourceType) {
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
                    convertedDate: new Date().toISOString()
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
        const now = new Date();
        const fechaEmisionDate = data.fechaEmision
          ? new Date(`${data.fechaEmision}T00:00:00`)
          : now;
        const targetEstablishmentId = data.establishmentId || session?.currentEstablishmentId;
        const establishment = targetEstablishmentId
          ? (session?.availableEstablishments || []).find((est) => est.id === targetEstablishmentId) || session?.currentEstablishment
          : session?.currentEstablishment;

        devLocalIndicadoresStore.registerVenta({
          numeroComprobante,
          tipoComprobante: data.tipoComprobante,
          clienteNombre: data.client || 'Cliente mostrador',
          clienteDocumento: data.clientDoc,
          clienteId: data.clientDoc,
          vendedorNombre: session?.userName || 'Usuario',
          vendedorId: session?.userId,
          establecimientoId: targetEstablishmentId,
          establecimientoNombre: establishment?.name,
          establecimientoCodigo: establishment?.code,
          empresaId: data.companyId || session?.currentCompanyId,
          moneda: data.currency || 'PEN',
          tipoCambio: data.currency && data.currency !== 'PEN' ? data.exchangeRate ?? 1 : 1,
          total: data.totals.total,
          subtotal: data.totals.subtotal,
          igv: data.totals.igv,
          fechaEmision: fechaEmisionDate.toISOString(),
          productos: mapCartItemsToVentaProductos(data.cartItems),
          formaPago: data.formaPago,
          source: data.source ?? 'otros'
        });
      } catch (indicadoresError) {
        console.warn('[indicadores-dev-local] No se pudo registrar la venta local', indicadoresError);
      }

      toast.success(
        '¡Comprobante creado!',
        `${data.tipoComprobante} ${numeroComprobante} generado exitosamente`,
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
  }, [toast, validateComprobanteData, cajaStatus, agregarMovimiento, mapFormaPagoToMedioPago, addMovimientoStock, addComprobante, session]);

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
          createdAt: new Date().toISOString(),
          expiryDate: expiryDate?.toISOString(),
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
  };
};