import { useState, useCallback, useEffect, useMemo } from 'react';
import { devLocalIndicadoresStore } from '../../indicadores-negocio/integration/devLocalStore';
import type { DevVentaSnapshot } from '../../indicadores-negocio/integration/devLocalStore';
import type { Compra, CompraDetalle, EstadoCompra, Producto, TipoComprobante } from '../models';
import { useCaja } from '../../control-caja/context/CajaContext';
import { useCobranzasContext } from '../../gestion-cobranzas/context/CobranzasContext';
import type { CuentaPorCobrarSummary } from '../../gestion-cobranzas/models/cobranzas.types';

const normalize = (value?: string | number | null) => {
  if (value === undefined || value === null) return '';
  return String(value).trim().toLowerCase();
};

const matchesCliente = (venta: DevVentaSnapshot, targetId?: number | string, targetName?: string) => {
  const normalizedId = normalize(targetId);
  const normalizedName = normalize(targetName);
  if (!normalizedId && !normalizedName) {
    return true;
  }
  const candidateIds = [normalize(venta.clienteId), normalize(venta.clienteDocumento)];
  if (normalizedId && candidateIds.some((candidate) => candidate && candidate === normalizedId)) {
    return true;
  }
  if (normalizedName && normalize(venta.clienteNombre) === normalizedName) {
    return true;
  }
  return false;
};

const mapTipoComprobante = (tipo: string): TipoComprobante => {
  const normalized = tipo?.toLowerCase?.() ?? '';
  if (normalized.includes('nota') && normalized.includes('credito')) {
    return 'NotaCredito';
  }
  if (normalized.includes('nota') && normalized.includes('debito')) {
    return 'NotaDebito';
  }
  if (normalized.includes('fact')) {
    return 'Factura';
  }
  return 'Boleta';
};

const estadoFromCuenta = (cuenta?: CuentaPorCobrarSummary): EstadoCompra | undefined => {
  if (!cuenta) return undefined;
  switch (cuenta.estado) {
    case 'cancelado':
      return 'Pagado';
    case 'pendiente':
      return 'Pendiente';
    case 'parcial':
      return 'Parcial';
    case 'vencido':
      return 'Vencido';
    case 'anulado':
      return 'Anulado';
    default:
      return undefined;
  }
};

const mapEstadoCompra = (venta: DevVentaSnapshot, cuenta?: CuentaPorCobrarSummary): EstadoCompra => {
  if (venta.estado === 'anulado') {
    return 'Anulado';
  }
  const estado = estadoFromCuenta(cuenta);
  return estado ?? 'Pendiente';
};

const mapProductos = (venta: DevVentaSnapshot): Producto[] => (
  venta.productos.map((producto) => ({
    id: producto.id,
    nombre: producto.name,
    cantidad: producto.quantity,
    precioUnitario: producto.unitPrice,
    subtotal: producto.subtotal,
  }))
);

const formatMetodoPago = (cuenta?: CuentaPorCobrarSummary, venta?: DevVentaSnapshot) => {
  if (!cuenta) {
    return venta?.formaPago || 'Sin definir';
  }
  if (cuenta.formaPago === 'credito') {
    return 'Crédito';
  }
  return venta?.formaPago || 'Contado';
};

export const useCompras = (clienteId?: number | string, clienteNombre?: string) => {
  const { showToast } = useCaja();
  const { cuentas } = useCobranzasContext();
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

  const ventasFiltradas = useMemo(
    () => ventas.filter((venta) => matchesCliente(venta, clienteId, clienteNombre)),
    [ventas, clienteId, clienteNombre]
  );

  const compras = useMemo(() =>
    ventasFiltradas
      .map((venta) => {
        const cuenta = cuentasPorComprobante.get(venta.numeroComprobante) ?? cuentasPorComprobante.get(venta.id);
        const items = mapProductos(venta);
        return {
          id: venta.id,
          fecha: venta.fechaEmision,
          comprobante: venta.numeroComprobante,
          tipoComprobante: mapTipoComprobante(venta.tipoComprobante),
          monto: venta.total,
          estado: mapEstadoCompra(venta, cuenta),
          productos: items.length,
          clienteId: venta.clienteId ?? venta.clienteDocumento ?? venta.numeroComprobante,
          items,
        } satisfies Compra;
      })
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
    [ventasFiltradas, cuentasPorComprobante]
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
      const detalle: CompraDetalle = {
        id: venta.id,
        fecha: venta.fechaEmision,
        comprobante: venta.numeroComprobante,
        tipoComprobante: mapTipoComprobante(venta.tipoComprobante),
        monto: venta.total,
        estado: mapEstadoCompra(venta, cuenta),
        productos: mapProductos(venta),
        cliente: {
          nombre: venta.clienteNombre,
          documento: venta.clienteDocumento ?? '—',
        },
        vendedor: venta.vendedorNombre,
        metodoPago: formatMetodoPago(cuenta, venta),
        subtotal: venta.subtotal,
        igv: venta.igv,
        total: venta.total,
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
  }, [ventaPorId, cuentasPorComprobante, showToast]);

  return {
    compras,
    loadingList,
    loadingDetalle,
    error,
    fetchCompras: reload,
    getCompraDetalle,
    reload,
  };
};
