import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { instalarLocalStorageDePrueba } from '../../pages/Private/features/gestion-inventario/repositories/localStorageDePrueba';
import {
  obtenerOperacionIdEstablePersistente,
  limpiarSesionPendienteOperacion,
  obtenerDatosOperacionPendiente,
  guardarDatosOperacionPendiente,
} from './sesionPendienteOperacionInventario';

instalarLocalStorageDePrueba();

const EMPRESA = 'emp-A';
const ESPACIO = 'venta_salida';

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe('sesionPendienteOperacionInventario — caché de datos de negocio (corrección post-1D, §1/§3/§5)', () => {
  it('sin sesión previa, obtenerDatosOperacionPendiente devuelve undefined', () => {
    expect(obtenerDatosOperacionPendiente(ESPACIO, EMPRESA, 'huella-1')).toBeUndefined();
  });

  it('guarda y recupera datos de negocio arbitrarios para la MISMA huella', () => {
    const datos = { lineasOperacion: [{ lineaId: 'a', productoId: 'p1', almacenId: 'alm-1', cantidadUnidadMinima: 5 }] };
    guardarDatosOperacionPendiente(ESPACIO, EMPRESA, 'huella-1', 'op-1', datos);

    const recuperado = obtenerDatosOperacionPendiente(ESPACIO, EMPRESA, 'huella-1');
    expect(recuperado).toEqual(datos);
  });

  it('una huella DISTINTA nunca reutiliza los datos de otra operación (contenido distinto = operación distinta)', () => {
    guardarDatosOperacionPendiente(ESPACIO, EMPRESA, 'huella-1', 'op-1', { valor: 'primero' });
    expect(obtenerDatosOperacionPendiente(ESPACIO, EMPRESA, 'huella-2')).toBeUndefined();
  });

  it('simula un "reintento tras recarga": los datos sobreviven mientras la sesión no se limpie explícitamente', () => {
    const datos = { numeroComprobante: 'F001-00000001', lineasOperacion: [] };
    guardarDatosOperacionPendiente(ESPACIO, EMPRESA, 'huella-recarga', 'F001-00000001', datos);

    // "Recarga": ninguna acción del proceso salvo volver a leer desde localStorage (simulado por
    // llamar la función de lectura de nuevo, como haría un nuevo montaje del hook).
    const trasRecarga = obtenerDatosOperacionPendiente<typeof datos>(ESPACIO, EMPRESA, 'huella-recarga');
    expect(trasRecarga).toEqual(datos);
    expect(trasRecarga?.numeroComprobante).toBe('F001-00000001');
  });

  it('no se limpia hasta que el llamador invoca limpiarSesionPendienteOperacion explícitamente (§5: no limpiar antes de persistir el documento)', () => {
    guardarDatosOperacionPendiente(ESPACIO, EMPRESA, 'huella-1', 'op-1', { x: 1 });
    // Ninguna otra operación de lectura limpia la sesión por sí sola.
    obtenerDatosOperacionPendiente(ESPACIO, EMPRESA, 'huella-1');
    obtenerOperacionIdEstablePersistente(ESPACIO, EMPRESA, 'huella-1', () => 'no-deberia-usarse');
    expect(obtenerDatosOperacionPendiente(ESPACIO, EMPRESA, 'huella-1')).toEqual({ x: 1 });

    limpiarSesionPendienteOperacion(ESPACIO, EMPRESA);
    expect(obtenerDatosOperacionPendiente(ESPACIO, EMPRESA, 'huella-1')).toBeUndefined();
  });

  it('obtenerOperacionIdEstablePersistente y el caché de datos comparten la misma sesión (mismo operacionId reutilizado)', () => {
    const datos = { lineasOperacion: [{ lineaId: 'a', productoId: 'p1', almacenId: 'alm-1', cantidadUnidadMinima: 5 }] };
    guardarDatosOperacionPendiente(ESPACIO, EMPRESA, 'huella-1', 'op-1', datos);

    const idReobtenido = obtenerOperacionIdEstablePersistente(ESPACIO, EMPRESA, 'huella-1', () => 'no-deberia-usarse');
    expect(idReobtenido).toBe('op-1');
    expect(obtenerDatosOperacionPendiente(ESPACIO, EMPRESA, 'huella-1')).toEqual(datos);
  });

  it('espacios de nombres distintos (p. ej. venta_salida y nota_venta_salida) nunca comparten ni pisan su sesión', () => {
    guardarDatosOperacionPendiente('venta_salida', EMPRESA, 'huella-x', 'op-venta', { tipo: 'venta' });
    guardarDatosOperacionPendiente('nota_venta_salida', EMPRESA, 'huella-x', 'op-nv', { tipo: 'nota_venta' });

    expect(obtenerDatosOperacionPendiente('venta_salida', EMPRESA, 'huella-x')).toEqual({ tipo: 'venta' });
    expect(obtenerDatosOperacionPendiente('nota_venta_salida', EMPRESA, 'huella-x')).toEqual({ tipo: 'nota_venta' });
  });
});
