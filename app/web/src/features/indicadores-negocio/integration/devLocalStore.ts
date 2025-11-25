import type { CartItem } from '../../comprobantes-electronicos/models/comprobante.types';

const STORAGE_KEY = 'ff_dev_local_indicadores_ventas';
const STORAGE_VERSION = 1;
const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

interface PersistedDevLocalState {
  version: number;
  ventas: DevVentaSnapshot[];
}

export type DevVentaEstado = 'emitido' | 'anulado';

export interface DevVentaProductoSnapshot {
  id: string;
  code?: string;
  name: string;
  category?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface DevVentaSnapshot {
  id: string;
  numeroComprobante: string;
  tipoComprobante: string;
  clienteNombre: string;
  clienteDocumento?: string;
  clienteId?: string;
  vendedorNombre: string;
  vendedorId?: string;
  establecimientoId?: string;
  establecimientoNombre?: string;
  establecimientoCodigo?: string;
  empresaId?: string;
  moneda?: string;
  tipoCambio?: number;
  total: number;
  subtotal: number;
  igv: number;
  fechaEmision: string;
  productos: DevVentaProductoSnapshot[];
  formaPago?: string;
  estado: DevVentaEstado;
  source: 'emision' | 'pos' | 'otros';
}

interface VentaRecordOptions {
  numeroComprobante: string;
  tipoComprobante: string;
  clienteNombre: string;
  clienteDocumento?: string;
  clienteId?: string;
  vendedorNombre: string;
  vendedorId?: string;
  establecimientoId?: string;
  establecimientoNombre?: string;
  establecimientoCodigo?: string;
  empresaId?: string;
  moneda?: string;
  tipoCambio?: number;
  total: number;
  subtotal: number;
  igv: number;
  fechaEmision: string;
  productos: DevVentaProductoSnapshot[];
  formaPago?: string;
  source?: 'emision' | 'pos' | 'otros';
}

type StoreListener = () => void;

class DevLocalIndicadoresStore {
  private ventas: DevVentaSnapshot[] = [];

  private listeners = new Set<StoreListener>();

  constructor() {
    this.hydrateFromStorage();
  }

  registerVenta(venta: VentaRecordOptions) {
    const snapshot: DevVentaSnapshot = {
      id: venta.numeroComprobante,
      numeroComprobante: venta.numeroComprobante,
      tipoComprobante: venta.tipoComprobante,
      clienteNombre: venta.clienteNombre,
      clienteDocumento: venta.clienteDocumento,
      clienteId: venta.clienteId,
      vendedorNombre: venta.vendedorNombre,
      vendedorId: venta.vendedorId,
      establecimientoId: venta.establecimientoId,
      establecimientoNombre: venta.establecimientoNombre,
      establecimientoCodigo: venta.establecimientoCodigo,
      empresaId: venta.empresaId,
      moneda: venta.moneda ?? 'PEN',
      tipoCambio: venta.tipoCambio ?? 1,
      total: venta.total,
      subtotal: venta.subtotal,
      igv: venta.igv,
      fechaEmision: venta.fechaEmision,
      productos: venta.productos,
      formaPago: venta.formaPago,
      estado: 'emitido',
      source: venta.source ?? 'otros'
    };

    const existingIndex = this.ventas.findIndex((ventaLocal) => ventaLocal.id === snapshot.id);
    if (existingIndex >= 0) {
      this.ventas[existingIndex] = snapshot;
    } else {
      this.ventas.push(snapshot);
    }
    this.persist();
    this.notify();
  }

  marcarVentaAnulada(id: string) {
    const index = this.ventas.findIndex((venta) => venta.id === id);
    if (index === -1) {
      return;
    }
    this.ventas[index] = {
      ...this.ventas[index],
      estado: 'anulado'
    };
    this.persist();
    this.notify();
  }

  obtenerVentas() {
    return this.ventas.map((venta) => ({
      ...venta,
      productos: venta.productos.map((producto) => ({ ...producto }))
    }));
  }

  subscribe(listener: StoreListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        console.error('[DevLocalIndicadoresStore] listener error', error);
      }
    });
  }

  private hydrateFromStorage() {
    if (!isBrowser) {
      return;
    }
    try {
      // NOT tenant-specific: almacenamiento puramente local para modo DEV de indicadores
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as PersistedDevLocalState | DevVentaSnapshot[];
      if (Array.isArray(parsed)) {
        this.ventas = parsed;
        this.persist();
        return;
      }
      if (parsed && Array.isArray(parsed.ventas)) {
        this.ventas = parsed.ventas;
      }
    } catch (error) {
      console.error('[DevLocalIndicadoresStore] No se pudo leer el almacenamiento local', error);
    }
  }

  private persist() {
    if (!isBrowser) {
      return;
    }
    try {
      const payload: PersistedDevLocalState = {
        version: STORAGE_VERSION,
        ventas: this.ventas
      };
      // NOT tenant-specific: almacenamiento puramente local para modo DEV de indicadores
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.error('[DevLocalIndicadoresStore] No se pudo persistir el estado local', error);
    }
  }
}

export const devLocalIndicadoresStore = new DevLocalIndicadoresStore();

export const mapCartItemsToVentaProductos = (cartItems: CartItem[]): DevVentaProductoSnapshot[] => (
  cartItems.map((item) => ({
    id: item.id,
    code: item.code,
    name: item.name,
    category: item.category,
    quantity: item.quantity,
    unitPrice: item.price,
    subtotal: (item.total ?? item.subtotal ?? item.price * item.quantity)
  }))
);
