import { describe, it, expect } from 'vitest';
import { calcularEstadoInventarioCC } from './calcularEstadosCompra';
import type { LineaCompra } from '../modelos/LineaCompra';

function crearLineaBase(overrides: Partial<LineaCompra> = {}): LineaCompra {
  return {
    id: 'linea-1',
    nombreProducto: 'Producto de prueba',
    clasificacion: 'producto',
    afectaInventario: true,
    unidadMedida: 'UNIDAD',
    unidadMedidaCodigo: 'NIU',
    unidadesDisponibles: [{ code: 'NIU', label: 'Unidad', isBase: true }],
    cantidadSolicitada: 10,
    cantidadRecibida: 10,
    cantidadFacturada: 10,
    cantidadIngresadaInventario: 0,
    cantidadPendienteRecepcion: 0,
    cantidadPendienteFacturacion: 0,
    cantidadPendienteInventario: 10,
    costoUnitario: 5,
    subtotal: 50,
    tipoAfectacion: 'gravado',
    igv: 9,
    total: 59,
    ...overrides,
  };
}

describe('calcularEstadoInventarioCC', () => {
  it('modalidad no_afecta_inventario siempre es no_aplica, sin importar las líneas', () => {
    const lineas = [crearLineaBase()];
    expect(calcularEstadoInventarioCC(lineas, 'no_afecta_inventario')).toBe('no_aplica');
  });

  it('modalidad automática SIN evidencia de NI confirmada es pendiente — seleccionar la modalidad nunca basta', () => {
    const lineas = [crearLineaBase({ cantidadIngresadaInventario: 0 })];
    expect(calcularEstadoInventarioCC(lineas, 'ingreso_automatico')).toBe('pendiente');
    expect(calcularEstadoInventarioCC(lineas, 'ingreso_automatico', false)).toBe('pendiente');
  });

  it('modalidad automática CON evidencia estructurada real de NI confirmada e ingreso completo es automatico', () => {
    const lineas = [crearLineaBase({ cantidadFacturada: 10, cantidadIngresadaInventario: 10 })];
    expect(calcularEstadoInventarioCC(lineas, 'ingreso_automatico', true)).toBe('automatico');
  });

  it('modalidad automática con evidencia confirmada pero ingreso todavía parcial es parcial, no automatico', () => {
    const lineas = [crearLineaBase({ cantidadFacturada: 10, cantidadIngresadaInventario: 4 })];
    expect(calcularEstadoInventarioCC(lineas, 'ingreso_automatico', true)).toBe('parcial');
  });

  it('con_nota_ingreso sin ninguna línea afectando inventario es no_aplica', () => {
    const lineas = [crearLineaBase({ afectaInventario: false })];
    expect(calcularEstadoInventarioCC(lineas, 'con_nota_ingreso')).toBe('no_aplica');
  });

  it('con_nota_ingreso recién registrado (sin NI generada) es pendiente', () => {
    const lineas = [crearLineaBase({ cantidadIngresadaInventario: 0 })];
    expect(calcularEstadoInventarioCC(lineas, 'con_nota_ingreso')).toBe('pendiente');
  });

  it('con_nota_ingreso con ingreso parcial es parcial', () => {
    const lineas = [crearLineaBase({ cantidadFacturada: 10, cantidadIngresadaInventario: 4 })];
    expect(calcularEstadoInventarioCC(lineas, 'con_nota_ingreso')).toBe('parcial');
  });

  it('con_nota_ingreso con ingreso completo es completo', () => {
    const lineas = [crearLineaBase({ cantidadFacturada: 10, cantidadIngresadaInventario: 10 })];
    expect(calcularEstadoInventarioCC(lineas, 'con_nota_ingreso')).toBe('completo');
  });

  it('una línea de servicio (afectaInventario=false) no cuenta para el cálculo', () => {
    const lineas = [
      crearLineaBase({ clasificacion: 'producto', afectaInventario: true, cantidadFacturada: 10, cantidadIngresadaInventario: 10 }),
      crearLineaBase({ id: 'linea-2', clasificacion: 'servicio', afectaInventario: false, cantidadFacturada: 5, cantidadIngresadaInventario: 0 }),
    ];
    expect(calcularEstadoInventarioCC(lineas, 'con_nota_ingreso')).toBe('completo');
  });

  it('misma entrada produce siempre el mismo resultado (determinista)', () => {
    const lineas = [crearLineaBase()];
    const a = calcularEstadoInventarioCC(lineas, 'con_nota_ingreso');
    const b = calcularEstadoInventarioCC(lineas, 'con_nota_ingreso');
    expect(a).toBe(b);
  });
});
