import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { registrarAjusteDeStock } from './accionesStock';
import { instalarLocalStorageDePrueba } from '../../pages/Private/features/gestion-inventario/repositories/localStorageDePrueba';
import { useProductStore } from '../../pages/Private/features/catalogo-articulos/hooks/useProductStore';
import type { Product } from '../../pages/Private/features/catalogo-articulos/models/types';
import type { Almacen } from '../../pages/Private/features/configuracion-sistema/modelos/Almacen';
import type { StockAdjustmentData } from '../../pages/Private/features/gestion-inventario/models';

instalarLocalStorageDePrueba();

// `StockRepository.addMovement` (llamado por `InventoryService.registerAdjustment`, ya deprecado)
// dispara `window.dispatchEvent` — el entorno 'node' de Vitest no define `window`. Stub mínimo,
// exclusivo de esta prueba, sin efecto sobre el código productivo.
if (typeof (globalThis as typeof globalThis & { window?: unknown }).window === 'undefined') {
  Object.defineProperty(globalThis, 'window', {
    value: { dispatchEvent: () => true },
    writable: true,
    configurable: true,
  });
}

const EMPRESA = 'emp-A';

interface GlobalConEmpresaActiva {
  __FF_ACTIVE_WORKSPACE_ID?: string;
}

beforeEach(() => {
  localStorage.clear();
  (globalThis as typeof globalThis & GlobalConEmpresaActiva).__FF_ACTIVE_WORKSPACE_ID = EMPRESA;
});
afterEach(() => {
  localStorage.clear();
  delete (globalThis as typeof globalThis & GlobalConEmpresaActiva).__FF_ACTIVE_WORKSPACE_ID;
});

function crearAlmacen(overrides: Partial<Almacen> = {}): Almacen {
  return {
    id: 'alm-1',
    codigoAlmacen: 'ALM01',
    nombreAlmacen: 'Almacén Principal',
    establecimientoId: 'est-1',
    estaActivoAlmacen: true,
    esAlmacenPrincipal: true,
    configuracionInventarioAlmacen: {
      permiteStockNegativoAlmacen: false,
      controlEstrictoStock: false,
      requiereAprobacionMovimientos: false,
    },
    creadoElAlmacen: new Date('2026-01-01T00:00:00.000Z'),
    actualizadoElAlmacen: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

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
    stockPorAlmacen: { 'alm-1': 20 },
    fechaCreacion: new Date('2026-01-01T00:00:00.000Z'),
    fechaActualizacion: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function crearDatosAjuste(overrides: Partial<StockAdjustmentData> = {}): StockAdjustmentData {
  return {
    productoId: 'prod-1',
    almacenId: 'alm-1',
    tipo: 'AJUSTE_NEGATIVO',
    motivo: 'AJUSTE_INVENTARIO',
    cantidad: 5,
    observaciones: '',
    documentoReferencia: '',
    ...overrides,
  };
}

describe('Etapa 4A, §10: registrarAjusteDeStock bloquea la mutación directa fuera de los modos cuantitativos libres', () => {
  it('estadoValorizacion="no_iniciada" (cuantitativo libre): registra el ajuste normalmente', () => {
    const producto = crearProducto();
    useProductStore.setState({ allProducts: [producto] });
    const almacen = crearAlmacen();

    const resultado = registrarAjusteDeStock({
      producto,
      almacen,
      datosAjuste: crearDatosAjuste(),
      usuario: 'user-1',
      estadoValorizacion: 'no_iniciada',
      controlStockActivo: true,
    });

    expect(resultado.productoActualizado.stockPorAlmacen['alm-1']).toBe(15);
    expect(useProductStore.getState().allProducts[0].stockPorAlmacen['alm-1']).toBe(15);
  });

  it('estadoValorizacion="activa" (valorizado exclusivo): rechaza el ajuste y no muta el store', () => {
    const producto = crearProducto();
    useProductStore.setState({ allProducts: [producto] });
    const almacen = crearAlmacen();

    expect(() =>
      registrarAjusteDeStock({
        producto,
        almacen,
        datosAjuste: crearDatosAjuste(),
        usuario: 'user-1',
        estadoValorizacion: 'activa',
        controlStockActivo: true,
      })
    ).toThrow(/no está disponible/);

    expect(useProductStore.getState().allProducts[0].stockPorAlmacen['alm-1']).toBe(20);
  });

  it('estadoValorizacion="activando" (bloqueado): rechaza el ajuste y no muta el store', () => {
    const producto = crearProducto();
    useProductStore.setState({ allProducts: [producto] });
    const almacen = crearAlmacen();

    expect(() =>
      registrarAjusteDeStock({
        producto,
        almacen,
        datosAjuste: crearDatosAjuste(),
        usuario: 'user-1',
        estadoValorizacion: 'activando',
        controlStockActivo: true,
      })
    ).toThrow(/no está disponible/);

    expect(useProductStore.getState().allProducts[0].stockPorAlmacen['alm-1']).toBe(20);
  });
});
