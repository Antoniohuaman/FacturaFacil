import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { instalarLocalStorageDePrueba } from './localStorageDePrueba';
import { lsKey } from '../../../../../shared/tenant';
import { StockRepository, STORAGE_KEY_MOVEMENTS } from './stock.repository';
import type { MovimientoStock } from '../models';

instalarLocalStorageDePrueba();

if (typeof (globalThis as typeof globalThis & { window?: unknown }).window === 'undefined') {
  Object.defineProperty(globalThis, 'window', {
    value: { dispatchEvent: () => true },
    writable: true,
    configurable: true,
  });
}

interface GlobalConEmpresaActiva {
  __FF_ACTIVE_WORKSPACE_ID?: string;
}

function activarEmpresa(empresaId: string): void {
  (globalThis as typeof globalThis & GlobalConEmpresaActiva).__FF_ACTIVE_WORKSPACE_ID = empresaId;
}

beforeEach(() => {
  localStorage.clear();
  activarEmpresa('emp-A');
});
afterEach(() => {
  localStorage.clear();
  delete (globalThis as typeof globalThis & GlobalConEmpresaActiva).__FF_ACTIVE_WORKSPACE_ID;
});

function crearMovimiento(overrides: Partial<MovimientoStock> = {}): MovimientoStock {
  return {
    id: 'mov-1',
    productoId: 'prod-1',
    productoCodigo: 'P001',
    productoNombre: 'Producto 1',
    tipo: 'ENTRADA',
    motivo: 'COMPRA',
    cantidad: 10,
    cantidadAnterior: 0,
    cantidadNueva: 10,
    usuario: 'user-1',
    fecha: new Date('2026-01-01T00:00:00.000Z'),
    almacenId: 'alm-1',
    almacenCodigo: 'ALM01',
    almacenNombre: 'Almacén Principal',
    EstablecimientoId: 'est-1',
    EstablecimientoCodigo: 'E01',
    EstablecimientoNombre: 'Establecimiento 1',
    esTransferencia: false,
    ...overrides,
  } as MovimientoStock;
}

describe('StockRepository.getMovements — VAL-P0-002: sin migración destructiva al leer', () => {
  it('PR-04: una lectura normal (clave tenantizada ya poblada) nunca toca la clave legacy', () => {
    localStorage.setItem(lsKey(STORAGE_KEY_MOVEMENTS, 'emp-A'), JSON.stringify([crearMovimiento()]));
    localStorage.setItem(STORAGE_KEY_MOVEMENTS, JSON.stringify([crearMovimiento({ id: 'legacy-1' })]));

    const movimientos = StockRepository.getMovements();

    expect(movimientos.map((m) => m.id)).toEqual(['mov-1']);
    // La clave legacy permanece intacta: la lectura no la copió ni la borró.
    expect(localStorage.getItem(STORAGE_KEY_MOVEMENTS)).not.toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY_MOVEMENTS) as string)).toHaveLength(1);
  });

  it('con la clave tenantizada vacía y una clave legacy con datos, la lectura NO migra ni copia — devuelve vacío y conserva el legado intacto', () => {
    localStorage.setItem(STORAGE_KEY_MOVEMENTS, JSON.stringify([crearMovimiento({ id: 'legacy-1' })]));

    const movimientos = StockRepository.getMovements();

    expect(movimientos).toEqual([]);
    expect(localStorage.getItem(STORAGE_KEY_MOVEMENTS)).not.toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY_MOVEMENTS) as string)).toHaveLength(1);
    // Tampoco crea la clave tenantizada como efecto colateral de leer.
    expect(localStorage.getItem(lsKey(STORAGE_KEY_MOVEMENTS, 'emp-A'))).toBeNull();
  });

  it('la primera empresa que lee en un navegador con datos legacy nunca "consume" esos datos para sí misma', () => {
    localStorage.setItem(STORAGE_KEY_MOVEMENTS, JSON.stringify([crearMovimiento({ id: 'legacy-1', productoId: 'prod-compartido' })]));

    activarEmpresa('emp-A');
    const paraA = StockRepository.getMovements();
    activarEmpresa('emp-B');
    const paraB = StockRepository.getMovements();

    expect(paraA).toEqual([]);
    expect(paraB).toEqual([]);
    // Ninguna empresa reclamó el dato legacy — sigue disponible para una migración explícita futura.
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY_MOVEMENTS) as string)).toHaveLength(1);
  });

  it('addMovement sigue escribiendo solo en la clave tenantizada de la empresa activa', () => {
    activarEmpresa('emp-A');
    StockRepository.addMovement(crearMovimiento());
    expect(JSON.parse(localStorage.getItem(lsKey(STORAGE_KEY_MOVEMENTS, 'emp-A')) as string)).toHaveLength(1);
    expect(localStorage.getItem(STORAGE_KEY_MOVEMENTS)).toBeNull();
  });
});
