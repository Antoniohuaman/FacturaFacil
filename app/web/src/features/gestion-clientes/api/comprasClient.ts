/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
import type { Compra, CompraDetalle, Producto } from '../models';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const envMockToggle = import.meta.env.VITE_USE_MOCK_COMPRAS;
const USE_MOCKS = envMockToggle ? envMockToggle === 'true' : true;

const mockClientesMetadata: Record<string, { nombre: string; documento: string }> = {
  '1767646070033159': {
    nombre: 'Empresa 2366 SAC',
    documento: '20608956321',
  },
  '1029384756': {
    nombre: 'Ferretería Los Andes',
    documento: '20112233445',
  },
};

const createMockItems = (items: Array<Omit<Producto, 'subtotal'>>): Producto[] =>
  items.map((item) => ({
    ...item,
    subtotal: Number((item.cantidad * item.precioUnitario).toFixed(2)),
  }));

const mockCompras: Compra[] = [
  {
    id: 'CMP-0001',
    fecha: '2025-01-05T14:20:00Z',
    comprobante: 'F001-000245',
    tipoComprobante: 'Factura',
    monto: 1840.5,
    estado: 'Pagado',
    productos: 4,
    clienteId: '1767646070033159',
    items: createMockItems([
      { id: 'PRD-01', nombre: 'POS All-in-one', cantidad: 1, precioUnitario: 1380 },
      { id: 'PRD-02', nombre: 'Impresora Térmica', cantidad: 1, precioUnitario: 289.9 },
      { id: 'PRD-03', nombre: 'Papel térmico (pack)', cantidad: 2, precioUnitario: 85.3 },
    ]),
  },
  {
    id: 'CMP-0002',
    fecha: '2024-12-28T09:15:00Z',
    comprobante: 'B001-000987',
    tipoComprobante: 'Boleta',
    monto: 320.75,
    estado: 'Pendiente',
    productos: 2,
    clienteId: '1767646070033159',
    items: createMockItems([
      { id: 'PRD-02', nombre: 'Impresora Térmica', cantidad: 1, precioUnitario: 289.9 },
      { id: 'PRD-04', nombre: 'Kit etiquetas', cantidad: 1, precioUnitario: 30.85 },
    ]),
  },
  {
    id: 'CMP-0003',
    fecha: '2024-12-10T11:45:00Z',
    comprobante: 'NC01-000045',
    tipoComprobante: 'NotaCredito',
    monto: 150.0,
    estado: 'Anulado',
    productos: 1,
    clienteId: '1767646070033159',
    items: createMockItems([
      { id: 'PRD-05', nombre: 'Servicio instalación', cantidad: 1, precioUnitario: 150 },
    ]),
  },
  {
    id: 'CMP-0004',
    fecha: '2024-11-18T18:05:00Z',
    comprobante: 'F002-000111',
    tipoComprobante: 'Factura',
    monto: 980.0,
    estado: 'Pagado',
    productos: 3,
    clienteId: '1029384756',
    items: createMockItems([
      { id: 'PRD-06', nombre: 'Licencia POS', cantidad: 1, precioUnitario: 600 },
      { id: 'PRD-07', nombre: 'Lector código barras', cantidad: 2, precioUnitario: 190 },
    ]),
  },
];

const mockDetalles: Record<string, CompraDetalle> = mockCompras.reduce((acc, compra) => {
  const cliente = mockClientesMetadata[String(compra.clienteId)] ?? {
    nombre: 'Cliente Demo',
    documento: '00000000000',
  };
  const subtotal = Number((compra.monto / 1.18).toFixed(2));
  const igv = Number((compra.monto - subtotal).toFixed(2));
  acc[`${compra.clienteId}-${compra.id}`] = {
    id: compra.id,
    fecha: compra.fecha,
    comprobante: compra.comprobante,
    tipoComprobante: compra.tipoComprobante,
    monto: compra.monto,
    estado: compra.estado,
    productos: compra.items ?? [],
    cliente,
    vendedor: compra.estado === 'Pagado' ? 'Ana López' : 'Luis Pérez',
    metodoPago: compra.estado === 'Pagado' ? 'Transferencia bancaria' : 'Por confirmar',
    observaciones: compra.estado === 'Anulado' ? 'Documento anulado a solicitud del cliente.' : undefined,
    subtotal,
    igv,
    total: compra.monto,
  };
  return acc;
}, {} as Record<string, CompraDetalle>);

interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

class ComprasClient {
  private async simulateNetworkDelay(ms = 800): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (USE_MOCKS) {
      return this.handleMockRequest<T>(endpoint, options);
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error: ApiError = await response.json().catch(() => ({
          code: 'UNKNOWN_ERROR',
          message: 'Error en la solicitud',
        }));
        throw error;
      }

      return response.json();
    } catch (error: any) {
      throw {
        code: error.code || 'NETWORK_ERROR',
        message: error.message || 'Error de conexión',
        details: error.details,
      };
    }
  }

  private async handleMockRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    await this.simulateNetworkDelay(400);
    const method = (options.method ?? 'GET').toUpperCase();

    const listadoMatch = endpoint.match(/\/clientes\/(.+)\/compras$/);
    if (listadoMatch && method === 'GET') {
      const [, clienteId] = listadoMatch;
      const data = mockCompras.filter((compra) => String(compra.clienteId) === clienteId);
      return { data } as T;
    }

    const detalleMatch = endpoint.match(/\/clientes\/(.+)\/compras\/(.+)$/);
    if (detalleMatch && method === 'GET') {
      const [, clienteId, compraId] = detalleMatch;
      const detalle = mockDetalles[`${clienteId}-${compraId}`];
      if (!detalle) {
        throw {
          code: 'NOT_FOUND',
          message: 'Compra no encontrada en mock',
        };
      }
      return detalle as T;
    }

    throw {
      code: 'NOT_IMPLEMENTED',
      message: 'Endpoint no implementado en modo mock',
    };
  }

  /**
   * Obtener compras de un cliente
   */
  async getComprasByCliente(clienteId: number | string, options: { signal?: AbortSignal } = {}): Promise<{ data: Compra[] }> {
    return this.request<{ data: Compra[] }>(`/clientes/${clienteId}/compras`, {
      method: 'GET',
      signal: options.signal,
    });
  }

  /**
   * Obtener detalle de una compra
   */
  async getCompraDetalle(
    clienteId: number | string,
    compraId: number | string,
    options: { signal?: AbortSignal } = {}
  ): Promise<CompraDetalle> {
    return this.request<CompraDetalle>(`/clientes/${clienteId}/compras/${compraId}`, {
      method: 'GET',
      signal: options.signal,
    });
  }
}

export const comprasClient = new ComprasClient();
