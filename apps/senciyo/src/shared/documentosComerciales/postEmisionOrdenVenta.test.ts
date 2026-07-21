import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { instalarLocalStorageDePrueba } from '../../pages/Private/features/gestion-inventario/repositories/localStorageDePrueba';
import { useProductStore } from '../../pages/Private/features/catalogo-articulos/hooks/useProductStore';
import { actualizarOrdenVentaPostEmision } from './postEmisionOrdenVenta';
import type { Product } from '../../pages/Private/features/catalogo-articulos/models/types';

instalarLocalStorageDePrueba();

const STORAGE_KEY_DOCUMENTOS = 'documentos_comerciales_v1';
const EMPRESA = 'emp-A';

interface GlobalConEmpresaActiva {
  __FF_ACTIVE_WORKSPACE_ID?: string;
}

beforeEach(() => {
  localStorage.clear();
  useProductStore.setState({ allProducts: [] });
  (globalThis as typeof globalThis & GlobalConEmpresaActiva).__FF_ACTIVE_WORKSPACE_ID = EMPRESA;
});
afterEach(() => {
  localStorage.clear();
  delete (globalThis as typeof globalThis & GlobalConEmpresaActiva).__FF_ACTIVE_WORKSPACE_ID;
});

function crearProducto(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod-1',
    codigo: 'P001',
    nombre: 'Producto 1',
    unidad: 'NIU',
    precio: 10,
    categoria: 'General',
    establecimientoIds: [],
    disponibleEnTodos: true,
    tipoExistencia: 'MERCADERIAS',
    stockPorAlmacen: {},
    fechaCreacion: new Date('2026-01-01T00:00:00.000Z'),
    fechaActualizacion: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function sembrarOV(ov: Record<string, unknown>): void {
  const clave = `${EMPRESA}:${STORAGE_KEY_DOCUMENTOS}`;
  localStorage.setItem(clave, JSON.stringify([ov]));
}

describe('actualizarOrdenVentaPostEmision — corrección post-1D §1: reservaYaLiberadaPorMotor evita una segunda mutación de reserva', () => {
  it('con reservaYaLiberadaPorMotor=true y modo automático, NUNCA vuelve a liberar la reserva (el motor central ya lo hizo en el mismo plan)', () => {
    useProductStore.setState({
      allProducts: [crearProducto({ stockReservadoOVPorEstablecimiento: { 'est-1': 0 } })],
    });
    sembrarOV({
      id: 'ov-1',
      tipo: 'orden_venta',
      estado: 'Reservada',
      reservasStock: [{ sku: 'P001', nombre: 'Producto 1', cantidad: 5, establecimientoId: 'est-1' }],
      historial: [],
    });

    actualizarOrdenVentaPostEmision('ov-1', {
      tipoComprobante: 'Boleta',
      numeroComprobante: 'B001-00000001',
      total: 50,
      usuario: 'user-1',
      modoDescuentoStock: 'automatico',
      reservaYaLiberadaPorMotor: true,
    });

    // La reserva ya estaba en 0 (el motor central la liberó en el mismo plan) — esta función
    // NUNCA debe volver a tocarla ni dejarla negativa.
    const producto = useProductStore.getState().allProducts[0];
    expect(producto.stockReservadoOVPorEstablecimiento?.['est-1']).toBe(0);
  });

  it('sin reservaYaLiberadaPorMotor (modo automático "clásico", sin motor): SÍ libera la reserva — comportamiento preexistente sin cambios', () => {
    useProductStore.setState({
      allProducts: [crearProducto({ stockReservadoOVPorEstablecimiento: { 'est-1': 5 } })],
    });
    sembrarOV({
      id: 'ov-2',
      tipo: 'orden_venta',
      estado: 'Reservada',
      reservasStock: [{ sku: 'P001', nombre: 'Producto 1', cantidad: 5, establecimientoId: 'est-1' }],
      historial: [],
    });

    actualizarOrdenVentaPostEmision('ov-2', {
      tipoComprobante: 'Boleta',
      numeroComprobante: 'B001-00000002',
      total: 50,
      usuario: 'user-1',
      modoDescuentoStock: 'automatico',
    });

    const producto = useProductStore.getState().allProducts[0];
    expect(producto.stockReservadoOVPorEstablecimiento?.['est-1']).toBe(0);
  });

  it('modo sin_control siempre libera la reserva (el motor central nunca corre en ese modo)', () => {
    useProductStore.setState({
      allProducts: [crearProducto({ stockReservadoOVPorEstablecimiento: { 'est-1': 5 } })],
    });
    sembrarOV({
      id: 'ov-3',
      tipo: 'orden_venta',
      estado: 'Reservada',
      reservasStock: [{ sku: 'P001', nombre: 'Producto 1', cantidad: 5, establecimientoId: 'est-1' }],
      historial: [],
    });

    actualizarOrdenVentaPostEmision('ov-3', {
      tipoComprobante: 'Boleta',
      numeroComprobante: 'B001-00000003',
      total: 50,
      usuario: 'user-1',
      modoDescuentoStock: 'sin_control',
      reservaYaLiberadaPorMotor: false,
    });

    const producto = useProductStore.getState().allProducts[0];
    expect(producto.stockReservadoOVPorEstablecimiento?.['est-1']).toBe(0);
  });

  it('solo actualiza estado/trazabilidad/historial cuando reservaYaLiberadaPorMotor=true — nunca una segunda mutación de reserva', () => {
    useProductStore.setState({
      allProducts: [crearProducto({ stockReservadoOVPorEstablecimiento: { 'est-1': 0 } })],
    });
    sembrarOV({
      id: 'ov-4',
      tipo: 'orden_venta',
      estado: 'Reservada',
      reservasStock: [{ sku: 'P001', nombre: 'Producto 1', cantidad: 5, establecimientoId: 'est-1' }],
      historial: [],
    });

    actualizarOrdenVentaPostEmision('ov-4', {
      tipoComprobante: 'Factura',
      numeroComprobante: 'F001-00000004',
      total: 100,
      usuario: 'user-1',
      modoDescuentoStock: 'automatico',
      reservaYaLiberadaPorMotor: true,
    });

    const clave = `${EMPRESA}:${STORAGE_KEY_DOCUMENTOS}`;
    const documentos = JSON.parse(localStorage.getItem(clave) as string) as Array<Record<string, unknown>>;
    const ov = documentos[0];
    expect(ov.estado).toBe('Atendida');
    expect((ov.trazabilidad as Record<string, unknown>).documentoDestinoNumero).toBe('F001-00000004');
    expect(Array.isArray(ov.historial)).toBe(true);
    expect((ov.historial as unknown[]).length).toBeGreaterThan(0);
  });
});
