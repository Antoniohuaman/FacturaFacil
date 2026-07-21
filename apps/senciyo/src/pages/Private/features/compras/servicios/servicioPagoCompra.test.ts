import { describe, it, expect } from 'vitest';
import { validarAplicacionesPagoCompra } from './servicioPagoCompra';
import type { CuentaPorPagar } from '../modelos/CuentaPorPagar';

function crearCxP(overrides: Partial<CuentaPorPagar> = {}): CuentaPorPagar {
  return {
    id: overrides.id ?? 'cxp-1',
    comprobanteCompraId: 'cc-1',
    comprobanteCompraNumero: 'FR23-366',
    tipoComprobanteOrigen: '01',
    proveedorId: 'prov-1',
    proveedorNombre: 'MI EMPRESA SAC',
    proveedorNumeroDocumento: '20123456789',
    moneda: 'PEN',
    total: 150,
    totalPagado: 0,
    saldoPendiente: 150,
    formaPago: 'contado',
    fechaEmision: '2026-07-01',
    estadoPago: 'pendiente',
    estadoVencimiento: 'vigente',
    pagosRelacionados: [],
    historial: [],
    fechaCreacion: '2026-07-01T00:00:00.000Z',
    fechaActualizacion: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('validarAplicacionesPagoCompra', () => {
  it('rechaza un pago sin ningún documento seleccionado', () => {
    const errores = validarAplicacionesPagoCompra([], []);
    expect(errores).toHaveLength(1);
    expect(errores[0].campo).toBe('aplicaciones');
  });

  it('un solo documento, importe igual al saldo pendiente completo: válido', () => {
    const cxp = crearCxP({ saldoPendiente: 150 });
    const errores = validarAplicacionesPagoCompra([{ cuentaPorPagarId: cxp.id, importeAplicado: 150 }], [cxp]);
    expect(errores).toEqual([]);
  });

  it('un solo documento, importe parcial menor al saldo: válido', () => {
    const cxp = crearCxP({ saldoPendiente: 150 });
    const errores = validarAplicacionesPagoCompra([{ cuentaPorPagarId: cxp.id, importeAplicado: 100 }], [cxp]);
    expect(errores).toEqual([]);
  });

  it('varios documentos del mismo proveedor y moneda, cada uno con su propio importe: válido', () => {
    const cxpA = crearCxP({ id: 'cxp-1', saldoPendiente: 150 });
    const cxpB = crearCxP({ id: 'cxp-2', saldoPendiente: 100, comprobanteCompraNumero: 'FR01-223' });
    const errores = validarAplicacionesPagoCompra(
      [
        { cuentaPorPagarId: 'cxp-1', importeAplicado: 150 },
        { cuentaPorPagarId: 'cxp-2', importeAplicado: 50 },
      ],
      [cxpA, cxpB],
    );
    expect(errores).toEqual([]);
  });

  it('rechaza mezclar documentos de proveedores distintos en el mismo pago', () => {
    const cxpA = crearCxP({ id: 'cxp-1', proveedorId: 'prov-A' });
    const cxpB = crearCxP({ id: 'cxp-2', proveedorId: 'prov-B' });
    const errores = validarAplicacionesPagoCompra(
      [
        { cuentaPorPagarId: 'cxp-1', importeAplicado: 50 },
        { cuentaPorPagarId: 'cxp-2', importeAplicado: 50 },
      ],
      [cxpA, cxpB],
    );
    expect(errores.some((e) => e.mensaje.includes('mismo proveedor'))).toBe(true);
  });

  it('rechaza mezclar documentos en monedas distintas en el mismo pago', () => {
    const cxpA = crearCxP({ id: 'cxp-1', moneda: 'PEN' });
    const cxpB = crearCxP({ id: 'cxp-2', moneda: 'USD' });
    const errores = validarAplicacionesPagoCompra(
      [
        { cuentaPorPagarId: 'cxp-1', importeAplicado: 50 },
        { cuentaPorPagarId: 'cxp-2', importeAplicado: 50 },
      ],
      [cxpA, cxpB],
    );
    expect(errores.some((e) => e.mensaje.includes('misma moneda'))).toBe(true);
  });

  it('rechaza un importe mayor al saldo pendiente de su propio documento', () => {
    const cxp = crearCxP({ saldoPendiente: 100 });
    const errores = validarAplicacionesPagoCompra([{ cuentaPorPagarId: cxp.id, importeAplicado: 150 }], [cxp]);
    expect(errores.some((e) => e.mensaje.includes('no puede superar su saldo pendiente'))).toBe(true);
  });

  it('rechaza un importe en cero o negativo', () => {
    const cxp = crearCxP();
    expect(validarAplicacionesPagoCompra([{ cuentaPorPagarId: cxp.id, importeAplicado: 0 }], [cxp])).not.toEqual([]);
    expect(validarAplicacionesPagoCompra([{ cuentaPorPagarId: cxp.id, importeAplicado: -10 }], [cxp])).not.toEqual([]);
  });

  it('rechaza un importe NaN', () => {
    const cxp = crearCxP();
    const errores = validarAplicacionesPagoCompra([{ cuentaPorPagarId: cxp.id, importeAplicado: Number.NaN }], [cxp]);
    expect(errores.length).toBeGreaterThan(0);
  });

  it('rechaza un documento que ya no existe en el arreglo de Cuentas por Pagar', () => {
    const errores = validarAplicacionesPagoCompra([{ cuentaPorPagarId: 'cxp-inexistente', importeAplicado: 50 }], []);
    expect(errores.length).toBeGreaterThan(0);
  });
});
