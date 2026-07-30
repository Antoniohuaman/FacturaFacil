import { describe, it, expect } from 'vitest';
import { calcularDesgloseFinancieroVenta, VERSION_DESGLOSE_FINANCIERO_VENTA } from './desgloseFinancieroVenta';
import { calcularDesgloseTributos } from '../../../documentos-comerciales/utils/documentoComercial.helpers';
import type { CartItem } from '../../models/comprobante.types';

function crearItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    id: 'prod-1',
    lineaId: 'linea-1',
    code: 'P001',
    name: 'Producto 1',
    price: 118,
    quantity: 1,
    igvType: 'igv18',
    stock: 100,
    ...overrides,
  };
}

describe('calcularDesgloseFinancieroVenta — cierre de brecha de venta neta canónica', () => {
  it('línea sin descuento: separa base/impuesto correctamente desde un precio que incluye IGV', () => {
    const [linea] = calcularDesgloseFinancieroVenta([crearItem({ price: 118, quantity: 1 })], {
      monedaDocumento: 'PEN',
      precioIncluyeImpuesto: true,
    });
    expect(linea.importeBruto).toBe(118);
    expect(linea.descuentoLinea).toBe(0);
    expect(linea.descuentoGlobalAsignado).toBe(0);
    expect(linea.baseNetaAntesImpuesto).toBe(118);
    expect(linea.ventaNetaSinImpuesto).toBe(100);
    expect(linea.impuesto).toBe(18);
    expect(linea.total).toBe(118);
    expect(linea.version).toBe(VERSION_DESGLOSE_FINANCIERO_VENTA);
  });

  it('descuento por línea (10%) se aplica sobre el importe bruto antes de separar impuesto', () => {
    const [linea] = calcularDesgloseFinancieroVenta([crearItem({ price: 118, quantity: 1, descuentoItem: 10 })], {
      monedaDocumento: 'PEN',
      precioIncluyeImpuesto: true,
    });
    expect(linea.importeBruto).toBe(118);
    expect(linea.descuentoLinea).toBe(11.8);
    expect(linea.baseNetaAntesImpuesto).toBe(106.2);
  });

  it('descuento global se distribuye proporcionalmente entre varias líneas según su base tras descuento de línea', () => {
    const items = [
      crearItem({ id: 'p1', lineaId: 'l1', price: 100, quantity: 1, igvType: 'exonerado' }),
      crearItem({ id: 'p2', lineaId: 'l2', price: 300, quantity: 1, igvType: 'exonerado' }),
    ];
    const resultado = calcularDesgloseFinancieroVenta(items, {
      monedaDocumento: 'PEN',
      precioIncluyeImpuesto: true,
      descuentoGlobalMonto: 40,
    });
    // p1 tiene 1/4 de la base total (100 de 400) -> 10; p2 tiene 3/4 -> 30.
    expect(resultado[0].descuentoGlobalAsignado).toBe(10);
    expect(resultado[1].descuentoGlobalAsignado).toBe(30);
    expect(resultado[0].descuentoGlobalAsignado + resultado[1].descuentoGlobalAsignado).toBe(40);
  });

  it('descuento por línea + descuento global combinados: el global se distribuye sobre la base YA descontada por línea', () => {
    const items = [
      crearItem({ id: 'p1', lineaId: 'l1', price: 100, quantity: 1, igvType: 'exonerado', descuentoItem: 50 }), // base tras línea: 50
      crearItem({ id: 'p2', lineaId: 'l2', price: 100, quantity: 1, igvType: 'exonerado' }), // base tras línea: 100
    ];
    const resultado = calcularDesgloseFinancieroVenta(items, {
      monedaDocumento: 'PEN',
      precioIncluyeImpuesto: true,
      descuentoGlobalMonto: 30,
    });
    // Bases tras descuento de línea: 50 y 100 (total 150). Proporción: 1/3 y 2/3 de 30 -> 10 y 20.
    expect(resultado[0].descuentoGlobalAsignado).toBe(10);
    expect(resultado[1].descuentoGlobalAsignado).toBe(20);
    expect(resultado[0].baseNetaAntesImpuesto).toBe(40);
    expect(resultado[1].baseNetaAntesImpuesto).toBe(80);
  });

  it('residuo de redondeo del descuento global se asigna determinísticamente a la ÚLTIMA línea elegible', () => {
    const items = [
      crearItem({ id: 'p1', lineaId: 'l1', price: 10, quantity: 1, igvType: 'exonerado' }),
      crearItem({ id: 'p2', lineaId: 'l2', price: 10, quantity: 1, igvType: 'exonerado' }),
      crearItem({ id: 'p3', lineaId: 'l3', price: 10, quantity: 1, igvType: 'exonerado' }),
    ];
    // 10 repartido entre 3 líneas iguales -> 3.33/3.33/3.34 (el residuo va a la última).
    const resultado = calcularDesgloseFinancieroVenta(items, {
      monedaDocumento: 'PEN',
      precioIncluyeImpuesto: true,
      descuentoGlobalMonto: 10,
    });
    const suma = resultado.reduce((s, r) => s + r.descuentoGlobalAsignado, 0);
    expect(Math.round(suma * 100) / 100).toBe(10);
    expect(resultado[2].descuentoGlobalAsignado).toBeGreaterThanOrEqual(resultado[0].descuentoGlobalAsignado);
  });

  it('precio SIN impuesto (precioIncluyeImpuesto=false): la base neta ya es el subtotal, el impuesto se agrega encima', () => {
    const [linea] = calcularDesgloseFinancieroVenta([crearItem({ price: 100, quantity: 1, igvType: 'igv18' })], {
      monedaDocumento: 'PEN',
      precioIncluyeImpuesto: false,
    });
    expect(linea.ventaNetaSinImpuesto).toBe(100);
    expect(linea.impuesto).toBe(18);
    expect(linea.total).toBe(118);
  });

  it('distintas tasas tributarias reales (igv18/igv10/exonerado/inafecto) — nunca un 18% hardcodeado para todas', () => {
    const items = [
      crearItem({ id: 'p1', lineaId: 'l1', price: 118, igvType: 'igv18' }),
      crearItem({ id: 'p2', lineaId: 'l2', price: 110, igvType: 'igv10' }),
      crearItem({ id: 'p3', lineaId: 'l3', price: 100, igvType: 'exonerado' }),
      crearItem({ id: 'p4', lineaId: 'l4', price: 100, igvType: 'inafecto' }),
    ];
    const resultado = calcularDesgloseFinancieroVenta(items, { monedaDocumento: 'PEN', precioIncluyeImpuesto: true });
    expect(resultado[0].impuesto).toBe(18);
    expect(resultado[1].impuesto).toBe(10);
    expect(resultado[2].impuesto).toBe(0);
    expect(resultado[3].impuesto).toBe(0);
  });

  it('IGV no hardcodeado: una tasa personalizada vía item.igv (no igvType) se respeta', () => {
    const [linea] = calcularDesgloseFinancieroVenta(
      [crearItem({ price: 125, igvType: undefined, igv: 25 })],
      { monedaDocumento: 'PEN', precioIncluyeImpuesto: true }
    );
    expect(linea.ventaNetaSinImpuesto).toBe(100);
    expect(linea.impuesto).toBe(25);
  });

  it('los descuentos nunca producen una base negativa (clamp a 0)', () => {
    const [linea] = calcularDesgloseFinancieroVenta(
      [crearItem({ price: 100, quantity: 1, igvType: 'exonerado', descuentoItem: 100 })],
      { monedaDocumento: 'PEN', precioIncluyeImpuesto: true, descuentoGlobalMonto: 999 }
    );
    expect(linea.baseNetaAntesImpuesto).toBeGreaterThanOrEqual(0);
    expect(linea.descuentoGlobalAsignado).toBeGreaterThanOrEqual(0);
  });

  it('total del documento = suma de los totales de línea', () => {
    const items = [
      crearItem({ id: 'p1', lineaId: 'l1', price: 118, quantity: 2 }),
      crearItem({ id: 'p2', lineaId: 'l2', price: 59, quantity: 3, igvType: 'igv10' }),
    ];
    const resultado = calcularDesgloseFinancieroVenta(items, { monedaDocumento: 'PEN', precioIncluyeImpuesto: true });
    const totalDocumento = resultado.reduce((s, r) => s + r.total, 0);
    const totalEsperado = items.reduce((s, i) => s + i.price * i.quantity, 0);
    expect(Math.round(totalDocumento * 100) / 100).toBe(Math.round(totalEsperado * 100) / 100);
  });

  it('suma de descuentos globales asignados es EXACTAMENTE igual al descuento global declarado (nunca queda un residuo suelto)', () => {
    const items = Array.from({ length: 7 }, (_, i) => crearItem({ id: `p${i}`, lineaId: `l${i}`, price: 33.33, igvType: 'exonerado' }));
    const resultado = calcularDesgloseFinancieroVenta(items, { monedaDocumento: 'PEN', precioIncluyeImpuesto: true, descuentoGlobalMonto: 17.77 });
    const suma = resultado.reduce((s, r) => s + r.descuentoGlobalAsignado, 0);
    expect(Math.round(suma * 100) / 100).toBe(17.77);
  });

  it('moneda extranjera: conserva la moneda de la línea y aplica su propia precisión', () => {
    const [linea] = calcularDesgloseFinancieroVenta(
      [crearItem({ price: 100, currency: 'USD' })],
      { monedaDocumento: 'PEN', precioIncluyeImpuesto: true }
    );
    expect(linea.moneda).toBe('USD');
  });

  it('sin lineaId (canal legacy), usa el índice como identificador — nunca falla ni omite la línea', () => {
    const resultado = calcularDesgloseFinancieroVenta(
      [crearItem({ lineaId: undefined })],
      { monedaDocumento: 'PEN', precioIncluyeImpuesto: true }
    );
    expect(resultado[0].lineaId).toBe('0');
  });

  it('cierre de la inconsistencia real: calcularDesgloseTributos y calcularDesgloseFinancieroVenta concuerdan exactamente para el mismo carrito', () => {
    const items = [
      crearItem({ id: 'p1', lineaId: 'l1', price: 118, quantity: 2, descuentoItem: 15 }),
      crearItem({ id: 'p2', lineaId: 'l2', price: 59, quantity: 1, igvType: 'igv10' }),
    ];
    const porLinea = calcularDesgloseFinancieroVenta(items, { monedaDocumento: 'PEN', precioIncluyeImpuesto: true });
    const totalPorLinea = Math.round(porLinea.reduce((s, l) => s + l.total, 0) * 100) / 100;

    const tributos = calcularDesgloseTributos(items);
    const totalTributos = Math.round(tributos.reduce((s, g) => s + g.taxableBase + g.taxAmount, 0) * 100) / 100;

    expect(totalTributos).toBe(totalPorLinea);
  });
});
