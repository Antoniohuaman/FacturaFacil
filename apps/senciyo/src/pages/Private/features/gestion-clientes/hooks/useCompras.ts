import { useState, useCallback, useEffect, useMemo } from 'react';
import { devLocalIndicadoresStore } from '../../indicadores-negocio/integration/devLocalStore';
import type { DevVentaSnapshot } from '../../indicadores-negocio/integration/devLocalStore';
import type { CobroResumen, Compra, CompraDetalle, Producto, EstadoCobro, CompraFormaPago } from '../models';
import { useCaja } from '../../control-caja/context/CajaContext';
import { useCobranzasContext } from '../../gestion-cobranzas/context/CobranzasContext';
import type { CobranzaDocumento, CuentaPorCobrarSummary } from '../../gestion-cobranzas/models/cobranzas.types';
import { useComprobanteContext } from '../../comprobantes-electronicos/lista-comprobantes/contexts/ComprobantesListContext';
import type { Comprobante } from '../../comprobantes-electronicos/lista-comprobantes/contexts/ComprobantesListContext';
import { formatBusinessDateTimeForTicket } from '@/shared/time/businessTime';

const normalize = (value?: string | number | null) => {
  if (value === undefined || value === null) return '';
  return String(value).trim().toLowerCase();
};

const mapProductos = (venta: DevVentaSnapshot): Producto[] => (
  venta.productos.map((producto) => ({
    id: producto.id,
    nombre: producto.name,
    cantidad: producto.quantity,
    precioUnitario: producto.unitPrice,
    subtotal: producto.subtotal ?? producto.unitPrice * producto.quantity,
  }))
);

const resolveTipoComprobanteLabel = (venta: DevVentaSnapshot, comprobante?: Comprobante): string => {
  if (comprobante?.type) {
    return comprobante.type;
  }
  const normalized = venta.tipoComprobante?.toLowerCase?.() ?? '';
  if (normalized.includes('nota') && normalized.includes('credito')) {
    return 'Nota de crédito';
  }
  if (normalized.includes('nota') && normalized.includes('debito')) {
    return 'Nota de débito';
  }
  if (normalized.includes('fact')) {
    return 'Factura';
  }
  if (normalized.includes('boleta')) {
    return 'Boleta';
  }
  return venta.tipoComprobante || 'Documento';
};

const resolveEstadoComprobante = (venta: DevVentaSnapshot, comprobante?: Comprobante): string => {
  if (comprobante?.status) {
    return comprobante.status;
  }
  return venta.estado === 'anulado' ? 'Anulado' : 'Emitido';
};

const CREDIT_LABEL: CompraFormaPago = 'Crédito';
const CASH_LABEL: CompraFormaPago = 'Contado';

const includesCreditoKeyword = (value?: string | null): boolean => {
  if (!value) {
    return false;
  }
  const normalized = value.toLowerCase();
  return normalized.includes('crédito') || normalized.includes('credito');
};

const resolveFormaPago = (
  venta: DevVentaSnapshot,
  cuenta?: CuentaPorCobrarSummary
): CompraFormaPago => {
  if (cuenta?.formaPago === 'credito' || includesCreditoKeyword(cuenta?.formaPago)) {
    return CREDIT_LABEL;
  }
  if (includesCreditoKeyword(venta.formaPago)) {
    return CREDIT_LABEL;
  }
  return CASH_LABEL;
};

const resolveEstadoCobroFromFormaPago = (
  formaPago: CompraFormaPago,
  cuenta?: CuentaPorCobrarSummary
): EstadoCobro | undefined => {
  if (formaPago === CASH_LABEL) {
    return 'cancelado';
  }
  return (cuenta?.estado ?? 'pendiente') as EstadoCobro;
};

const resolveFechaDisplay = (venta: DevVentaSnapshot, comprobante?: Comprobante): string | undefined => {
  if (comprobante?.date?.trim()) {
    return comprobante.date;
  }
  if (venta.fechaEmision) {
    const parsed = new Date(venta.fechaEmision);
    if (!Number.isNaN(parsed.getTime())) {
      return formatBusinessDateTimeForTicket(parsed);
    }
  }
  return undefined;
};

const toSafeNumber = (value?: number | null) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

export const useCompras = (clienteId?: number | string, clienteNombre?: string) => {
  const { showToast } = useCaja();
  const { cuentas, cobranzas } = useCobranzasContext();
  const { state: comprobanteState } = useComprobanteContext();

  const normalizedTarget = useMemo(() => ({
    id: normalize(clienteId),
    nombre: normalize(clienteNombre),
  }), [clienteId, clienteNombre]);

  const matchesCliente = useCallback((candidate: { id?: string | number | null; documento?: string | null; nombre?: string | null }) => {
    if (!normalizedTarget.id && !normalizedTarget.nombre) {
      return true;
    }
    const candidateIds = [normalize(candidate.id), normalize(candidate.documento)].filter(Boolean);
    if (normalizedTarget.id && candidateIds.some((value) => value === normalizedTarget.id)) {
      return true;
    }
    if (normalizedTarget.nombre && normalize(candidate.nombre) === normalizedTarget.nombre) {
      return true;
    }
    return false;
  }, [normalizedTarget.id, normalizedTarget.nombre]);

  const [ventas, setVentas] = useState<DevVentaSnapshot[]>(() => devLocalIndicadoresStore.obtenerVentas());
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setVentas(devLocalIndicadoresStore.obtenerVentas());
    setLoadingList(false);
    const unsubscribe = devLocalIndicadoresStore.subscribe(() => {
      setVentas(devLocalIndicadoresStore.obtenerVentas());
    });
    return unsubscribe;
  }, []);

  const cuentasPorComprobante = useMemo(() => {
    const map = new Map<string, CuentaPorCobrarSummary>();
    cuentas.forEach((cuenta) => {
      map.set(cuenta.comprobanteId, cuenta);
      map.set(cuenta.id, cuenta);
    });
    return map;
  }, [cuentas]);

  const comprobantesPorId = useMemo(() => {
    const map = new Map<string, Comprobante>();
    comprobanteState.comprobantes.forEach((comprobante) => {
      map.set(comprobante.id, comprobante);
    });
    return map;
  }, [comprobanteState.comprobantes]);

  const ventasFiltradas = useMemo(
    () => ventas.filter((venta) => matchesCliente({
      id: venta.clienteId ?? venta.clienteDocumento ?? venta.numeroComprobante,
      documento: venta.clienteDocumento,
      nombre: venta.clienteNombre,
    })),
    [ventas, matchesCliente]
  );

  const compras = useMemo(() =>
    ventasFiltradas
      .map((venta) => {
        const cuenta = cuentasPorComprobante.get(venta.numeroComprobante) ?? cuentasPorComprobante.get(venta.id);
        const comprobante = comprobantesPorId.get(venta.numeroComprobante) ?? comprobantesPorId.get(venta.id);
        const items = mapProductos(venta);
        const formaPago = resolveFormaPago(venta, cuenta);
        const estadoCobro = resolveEstadoCobroFromFormaPago(formaPago, cuenta);
        const fechaDisplay = resolveFechaDisplay(venta, comprobante);
        return {
          id: venta.id,
          fecha: venta.fechaEmision,
          fechaDisplay,
          comprobante: venta.numeroComprobante,
          tipoComprobante: resolveTipoComprobanteLabel(venta, comprobante),
          monto: venta.total,
          moneda: comprobante?.currency ?? venta.moneda,
          estadoComprobante: resolveEstadoComprobante(venta, comprobante),
          estadoComprobanteColor: comprobante?.statusColor,
          estadoCobro,
          productos: items.length,
          clienteId: venta.clienteId ?? venta.clienteDocumento ?? venta.numeroComprobante,
          items,
          formaPago,
          cuentaId: cuenta?.id,
        } satisfies Compra;
      })
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
    [ventasFiltradas, cuentasPorComprobante, comprobantesPorId]
  );

  const ventaPorId = useMemo(() => {
    const map = new Map<string, DevVentaSnapshot>();
    ventas.forEach((venta) => {
      map.set(venta.id, venta);
      map.set(venta.numeroComprobante, venta);
    });
    return map;
  }, [ventas]);

  const reload = useCallback(() => {
    try {
      devLocalIndicadoresStore.rehydrateFromStorage();
    } catch (reloadError) {
      console.error('[useCompras] No se pudo recargar ventas', reloadError);
      const errorMessage = 'No se pudo recargar el historial de ventas.';
      setError(errorMessage);
      showToast('error', 'Error', errorMessage);
    }
  }, [showToast]);

  const getCompraDetalle = useCallback(async (
    _clienteIdParam: number | string,
    compraId: number | string
  ): Promise<CompraDetalle | null> => {
    setLoadingDetalle(true);
    setError(null);

    try {
      const venta = ventaPorId.get(String(compraId));
      if (!venta) {
        const message = 'No encontramos esta venta en el historial.';
        setError(message);
        showToast('warning', 'Detalle no disponible', message);
        return null;
      }
      const cuenta = cuentasPorComprobante.get(venta.numeroComprobante) ?? cuentasPorComprobante.get(venta.id);
      const comprobante = comprobantesPorId.get(venta.numeroComprobante) ?? comprobantesPorId.get(venta.id);
      const formaPago = resolveFormaPago(venta, cuenta);
      const estadoCobro = resolveEstadoCobroFromFormaPago(formaPago, cuenta);
      const fechaDisplay = resolveFechaDisplay(venta, comprobante);
      const detalle: CompraDetalle = {
        id: venta.id,
        fecha: venta.fechaEmision,
        fechaDisplay,
        comprobante: venta.numeroComprobante,
        tipoComprobante: resolveTipoComprobanteLabel(venta, comprobante),
        monto: venta.total,
        moneda: comprobante?.currency ?? venta.moneda,
        estadoComprobante: resolveEstadoComprobante(venta, comprobante),
        estadoComprobanteColor: comprobante?.statusColor,
        estadoCobro,
        productos: mapProductos(venta),
        cliente: {
          nombre: venta.clienteNombre,
          documento: venta.clienteDocumento ?? '—',
        },
        vendedor: venta.vendedorNombre,
        formaPago,
        subtotal: toSafeNumber(venta.subtotal),
        igv: toSafeNumber(venta.igv),
        total: venta.total,
        observaciones: comprobante?.observations,
      };
      return detalle;
    } catch (detalleError) {
      console.error('[useCompras] Error al construir detalle', detalleError);
      const message = detalleError instanceof Error ? detalleError.message : 'Error inesperado al cargar el detalle.';
      setError(message);
      showToast('error', 'Error', message);
      return null;
    } finally {
      setLoadingDetalle(false);
    }
  }, [ventaPorId, cuentasPorComprobante, comprobantesPorId, showToast]);

  const cobranzasCliente: CobroResumen[] = useMemo(() => {
    const documentosFiltrados = cobranzas.filter((documento: CobranzaDocumento) => {
      const cuenta = cuentasPorComprobante.get(documento.comprobanteId);
      return matchesCliente({
        id: cuenta?.clienteDocumento ?? documento.comprobanteId,
        documento: cuenta?.clienteDocumento,
        nombre: cuenta?.clienteNombre ?? documento.clienteNombre,
      });
    });

    return documentosFiltrados
      .map((documento) => ({
        id: documento.id,
        numero: documento.numero,
        fecha: documento.fechaCobranza,
        comprobanteId: documento.comprobanteId,
        comprobanteNumero: documento.comprobanteSerie && documento.comprobanteNumero
          ? `${documento.comprobanteSerie}-${documento.comprobanteNumero}`
          : documento.comprobanteNumero || documento.comprobanteId,
        medioPago: documento.medioPago,
        monto: documento.monto,
        moneda: documento.moneda,
        estado: documento.estado,
      }))
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [cobranzas, cuentasPorComprobante, matchesCliente]);

  return {
    compras,
    cobranzas: cobranzasCliente,
    loadingList,
    loadingDetalle,
    error,
    fetchCompras: reload,
    getCompraDetalle,
    reload,
  };
};
