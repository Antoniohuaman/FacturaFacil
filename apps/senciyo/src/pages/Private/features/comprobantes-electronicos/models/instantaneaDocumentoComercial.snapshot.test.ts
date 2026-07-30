import { describe, it, expect } from 'vitest';
import { crearInstantaneaDocumentoComercial } from './instantaneaDocumentoComercial';
import type { CartItem } from './comprobante.types';

function crearItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    id: 'prod-1',
    lineaId: 'linea-1',
    code: 'P001',
    name: 'Producto 1',
    price: 118,
    quantity: 2,
    igvType: 'igv18',
    stock: 100,
    tipoDetalle: 'catalogo',
    ...overrides,
  };
}

describe('crearInstantaneaDocumentoComercial — cierre correctivo: snapshot financiero inmutable por línea', () => {
  it('persiste desgloseFinancieroLineas con lineaComercialId, cantidad, precio histórico, importe bruto, descuentos, venta neta, impuesto, total y moneda', () => {
    const instantanea = crearInstantaneaDocumentoComercial({
      tipoDocumento: 'factura',
      tipoComprobante: 'factura',
      numeroCompleto: 'F001-00000001',
      fechaEmision: '2026-08-01',
      horaEmision: '10:00',
      moneda: 'PEN',
      tipoCambio: null,
      origen: 'emision_tradicional',
      idDocumento: 'doc-1',
      items: [crearItem()],
      totales: { subtotal: 200, igv: 36, total: 236, currency: 'PEN' },
    });

    expect(instantanea.detalle.desgloseFinancieroLineas).toHaveLength(1);
    const linea = instantanea.detalle.desgloseFinancieroLineas![0];
    expect(linea.lineaId).toBe('linea-1'); // identidad estable de la línea (CartItem.lineaId)
    expect(linea.cantidad).toBe(2);
    expect(linea.precioUnitarioHistorico).toBe(118);
    expect(linea.importeBruto).toBe(236);
    expect(linea.ventaNetaSinImpuesto).toBe(200);
    expect(linea.impuesto).toBe(36);
    expect(linea.total).toBe(236);
    expect(linea.moneda).toBe('PEN');
  });

  it('el snapshot NO cambia si, después de emitido, el precio del producto o la configuración tributaria cambian — nunca se recalcula desde el catálogo/config actual', () => {
    const item = crearItem({ price: 118, quantity: 1, igvType: 'igv18' });
    const instantanea = crearInstantaneaDocumentoComercial({
      tipoDocumento: 'boleta',
      tipoComprobante: 'boleta',
      numeroCompleto: 'B001-00000001',
      fechaEmision: '2026-08-01',
      horaEmision: '10:00',
      moneda: 'PEN',
      tipoCambio: null,
      origen: 'pos',
      idDocumento: 'doc-2',
      items: [item],
      totales: { subtotal: 100, igv: 18, total: 118, currency: 'PEN' },
    });

    const desgloseOriginal = instantanea.detalle.desgloseFinancieroLineas![0];

    // Simula que el producto cambia de precio/IGV DESPUÉS de emitido — el snapshot ya calculado
    // nunca debe mutar (es un valor plano ya persistido, no una referencia recalculada).
    item.price = 999;
    item.igvType = 'igv10';

    expect(instantanea.detalle.desgloseFinancieroLineas![0]).toEqual(desgloseOriginal);
    expect(instantanea.detalle.desgloseFinancieroLineas![0].precioUnitarioHistorico).toBe(118);
    expect(instantanea.detalle.desgloseFinancieroLineas![0].impuesto).toBe(18);
  });

  it('documento sin items no genera desgloseFinancieroLineas (undefined, nunca un arreglo vacío inventado con datos falsos)', () => {
    const instantanea = crearInstantaneaDocumentoComercial({
      tipoDocumento: 'cotizacion',
      tipoComprobante: null,
      numeroCompleto: 'COT-1',
      fechaEmision: '2026-08-01',
      horaEmision: '10:00',
      moneda: 'PEN',
      tipoCambio: null,
      origen: 'documento_comercial',
      idDocumento: 'doc-3',
      items: [],
      totales: { subtotal: 0, igv: 0, total: 0, currency: 'PEN' },
    });

    expect(instantanea.detalle.desgloseFinancieroLineas).toBeUndefined();
  });

  it('varias líneas del mismo producto con precios distintos: cada una conserva su propio desglose (lineaComercialId distinto)', () => {
    const instantanea = crearInstantaneaDocumentoComercial({
      tipoDocumento: 'factura',
      tipoComprobante: 'factura',
      numeroCompleto: 'F001-00000002',
      fechaEmision: '2026-08-01',
      horaEmision: '10:00',
      moneda: 'PEN',
      tipoCambio: null,
      origen: 'emision_tradicional',
      idDocumento: 'doc-4',
      items: [
        crearItem({ lineaId: 'linea-A', price: 118 }),
        crearItem({ lineaId: 'linea-B', price: 59 }),
      ],
      totales: { subtotal: 150, igv: 27, total: 177, currency: 'PEN' },
    });

    const lineas = instantanea.detalle.desgloseFinancieroLineas!;
    expect(lineas).toHaveLength(2);
    expect(lineas[0].lineaId).toBe('linea-A');
    expect(lineas[0].precioUnitarioHistorico).toBe(118);
    expect(lineas[1].lineaId).toBe('linea-B');
    expect(lineas[1].precioUnitarioHistorico).toBe(59);
  });
});
