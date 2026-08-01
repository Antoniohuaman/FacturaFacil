import { describe, it, expect } from 'vitest';
import {
  proyectarFilasRentabilidadVentas,
  filtrarFilasRentabilidad,
  calcularIndicadoresRentabilidad,
  calcularResultadoOperativo,
  agruparFilasRentabilidad,
  calcularAmplitudPeriodoEnDias,
  determinarClavePeriodo,
  resolverOrigenesCostoLinea,
  obtenerColumnasConfigurables,
  type ParametrosProyeccionRentabilidad,
  type IndicadoresRentabilidadVentas,
} from './consultaRentabilidadVentas.service';
import type { IndicadoresGastosOperativos } from '../../gastos/servicios/consultaGastosOperativos.service';
import type { Comprobante } from '../../comprobantes-electronicos/lista-comprobantes/contexts/ComprobantesListContext';
import type { InstantaneaDocumentoComercial } from '../../comprobantes-electronicos/models/instantaneaDocumentoComercial';
import type { CartItem } from '../../comprobantes-electronicos/models/comprobante.types';
import type { DesgloseFinancieroLinea } from '../../comprobantes-electronicos/shared/core/desgloseFinancieroVenta';
import type { MovimientoStock } from '../../gestion-inventario/models/inventory.types';
import type { ConsumoCapaCostoInventario } from '../../gestion-inventario/models/consumoCapaCostoInventario.types';
import type { CapaCostoInventario } from '../../gestion-inventario/models/capaCostoInventario.types';

const EMPRESA = 'emp-A';
const MONEDA_BASE = 'PEN';

function crearDesglose(overrides: Partial<DesgloseFinancieroLinea> = {}): DesgloseFinancieroLinea {
  return {
    lineaId: 'linea-1',
    cantidad: 2,
    precioUnitarioHistorico: 118,
    importeBruto: 236,
    descuentoLinea: 0,
    descuentoGlobalAsignado: 0,
    baseNetaAntesImpuesto: 236,
    impuesto: 36,
    ventaNetaSinImpuesto: 200,
    total: 236,
    moneda: MONEDA_BASE,
    precision: 2,
    version: 'v1-descuento-proporcional-post-descuento-linea',
    ...overrides,
  };
}

function crearItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    id: 'prod-1',
    lineaId: 'linea-1',
    code: 'P001',
    name: 'Producto 1',
    price: 118,
    quantity: 2,
    stock: 100,
    tipoDetalle: 'catalogo',
    requiresStockControl: true,
    ...overrides,
  };
}

function crearInstantanea(overrides: Partial<InstantaneaDocumentoComercial> = {}): InstantaneaDocumentoComercial {
  return {
    version: 1,
    identidad: {
      tipoDocumento: 'factura',
      tipoComprobante: 'factura',
      codigoSunat: '01',
      tipoOperacion: '0101',
      serie: 'F001',
      correlativo: '1',
      numeroCompleto: 'F001-00000001',
      fechaEmision: '2026-06-15',
      horaEmision: '10:00',
      moneda: MONEDA_BASE,
      tipoCambio: null,
      origen: 'emision_tradicional',
      idDocumento: 'doc-1',
      idInterno: 'doc-1',
    },
    empresa: { idEmpresa: EMPRESA, nombreComercial: 'Empresa', razonSocial: 'Empresa SAC', ruc: '20123456789' },
    establecimiento: { idEstablecimiento: 'est-1', codigoEstablecimiento: 'E01', nombreEstablecimiento: 'Tienda 1' },
    vendedor: { idUsuario: 'vend-1', nombreUsuario: 'Ana Vendedora' },
    cliente: { idCliente: 'cli-1', nombre: 'Cliente Uno', tipoDocumento: 'DNI', numeroDocumento: '12345678', codigoSunatDocumento: '1', email: null, telefono: null, direccion: null, priceProfileId: null },
    camposComerciales: {
      direccionEnvio: null, ordenCompra: null, guiaRemision: null, centroCosto: null,
      observaciones: null, notaInterna: null, fechaVencimiento: null, formaPagoId: null,
      formaPagoDescripcion: null, detallesPago: null, terminosCredito: null, datosDetraccion: null,
    },
    detalle: {
      items: [crearItem()],
      modoDetalle: 'catalogo',
      contieneItemsCatalogo: true,
      contieneItemsLibres: false,
      desgloseFinancieroLineas: [crearDesglose()],
    },
    totales: { subtotal: 200, igv: 36, total: 236, currency: MONEDA_BASE },
    relaciones: {
      documentoOrigenId: null, documentoOrigenTipo: null, documentoRelacionadoId: null,
      documentoRelacionadoTipo: null, datosNotaCredito: null, idDocumentoFuente: null, tipoDocumentoFuente: null,
    },
    ...overrides,
  };
}

function crearComprobante(overrides: Partial<Comprobante> = {}): Comprobante {
  return {
    id: 'comp-1',
    type: 'Factura',
    clientDoc: '12345678',
    client: 'Cliente Uno',
    date: '2026-06-15',
    vendor: 'Ana Vendedora',
    total: 236,
    status: 'Aceptado',
    statusColor: 'green',
    inventarioDocumentoId: 'inv-doc-1',
    instantaneaDocumentoComercial: crearInstantanea(),
    ...overrides,
  };
}

function crearMovimiento(overrides: Partial<MovimientoStock> = {}): MovimientoStock {
  return {
    id: 'mov-1',
    productoId: 'prod-1',
    productoCodigo: 'P001',
    productoNombre: 'Producto 1',
    tipo: 'SALIDA',
    motivo: 'VENTA',
    cantidad: 2,
    cantidadAnterior: 10,
    cantidadNueva: 8,
    usuario: 'user-1',
    fecha: new Date('2026-06-15T00:00:00.000Z'),
    almacenId: 'alm-1',
    almacenCodigo: 'ALM01',
    almacenNombre: 'Almacén Principal',
    EstablecimientoId: 'est-1',
    EstablecimientoCodigo: 'E01',
    EstablecimientoNombre: 'Tienda 1',
    empresaId: EMPRESA,
    documentoOrigenId: 'inv-doc-1',
    tipoDocumentoOrigen: 'venta',
    lineaOrigenId: 'inv-doc-1-0',
    lineaComercialId: 'linea-1',
    estado: 'confirmado',
    ...overrides,
  };
}

function crearConsumo(overrides: Partial<ConsumoCapaCostoInventario> = {}): ConsumoCapaCostoInventario {
  return {
    id: 'consumo-1',
    empresaId: EMPRESA,
    movimientoSalidaId: 'mov-1',
    lineaDocumentoSalidaId: 'inv-doc-1-0',
    lineaComercialId: 'linea-1',
    motivo: 'salida',
    capaId: 'capa-1',
    cantidadConsumida: 2,
    costoUnitarioBaseMonedaBase: 60,
    valorConsumidoMonedaBase: 120,
    monedaBase: MONEDA_BASE,
    fecha: '2026-06-15T00:00:00.000Z',
    estado: 'confirmado',
    ...overrides,
  };
}

function crearCapaDevolucion(overrides: Partial<CapaCostoInventario> = {}): CapaCostoInventario {
  return {
    id: 'capa-dev-1',
    empresaId: EMPRESA,
    establecimientoId: 'est-1',
    productoId: 'prod-1',
    almacenId: 'alm-1',
    movimientoEntradaId: 'mov-dev-1',
    tipoDocumentoOrigen: 'devolucion_cliente',
    documentoOrigenId: 'nc-inv-doc-1',
    cantidadInicial: 1,
    cantidadDisponible: 1,
    costoUnitarioBaseOriginal: 60,
    costoUnitarioBaseMonedaBase: 60,
    valorValorizableOriginal: 60,
    valorValorizableMonedaBase: 60,
    monedaBase: MONEDA_BASE,
    monedaOriginal: MONEDA_BASE,
    tipoCambioAplicado: 1,
    fechaTipoCambio: '2026-07-01',
    fechaEntrada: '2026-07-01T00:00:00.000Z',
    estado: 'disponible',
    procedencia: 'devolucion_cliente',
    usuario: 'user-1',
    fechaCreacion: '2026-07-01T00:00:00.000Z',
    consumoOrigenId: 'consumo-1',
    ...overrides,
  };
}

function parametrosBase(overrides: Partial<ParametrosProyeccionRentabilidad> = {}): ParametrosProyeccionRentabilidad {
  return {
    empresaId: EMPRESA,
    monedaBase: MONEDA_BASE,
    comprobantes: [crearComprobante()],
    movimientos: [crearMovimiento()],
    consumos: [crearConsumo()],
    capas: [],
    periodo: { desde: '2026-06-01', hasta: '2026-06-30' },
    ...overrides,
  };
}

describe('proyectarFilasRentabilidadVentas — proyección básica', () => {
  it('una venta con costo produce una fila con venta neta, costo, utilidad y margen correctos', () => {
    const filas = proyectarFilasRentabilidadVentas(parametrosBase());
    expect(filas).toHaveLength(1);
    expect(filas[0].ventaNetaBase).toBe(200);
    expect(filas[0].costoVentaBase).toBe(120);
    expect(filas[0].utilidadBrutaBase).toBe(80);
    expect(filas[0].margenBruto).toBeCloseTo(0.4);
    expect(filas[0].estadoCosto).toBe('con_costo');
  });

  it('una venta que consume varias capas suma el costo de todos los consumos de esa línea', () => {
    const consumos = [
      crearConsumo({ id: 'c1', capaId: 'capa-1', cantidadConsumida: 1, valorConsumidoMonedaBase: 50 }),
      crearConsumo({ id: 'c2', capaId: 'capa-2', cantidadConsumida: 1, valorConsumidoMonedaBase: 70 }),
    ];
    const filas = proyectarFilasRentabilidadVentas(parametrosBase({ consumos }));
    expect(filas[0].costoVentaBase).toBe(120);
  });

  it('dos líneas del mismo producto con lineaComercialId distinto no mezclan su costo', () => {
    const desgloseA = crearDesglose({ lineaId: 'linea-A', ventaNetaSinImpuesto: 100 });
    const desgloseB = crearDesglose({ lineaId: 'linea-B', ventaNetaSinImpuesto: 300 });
    const itemA = crearItem({ lineaId: 'linea-A' });
    const itemB = crearItem({ lineaId: 'linea-B' });
    const comprobante = crearComprobante({
      instantaneaDocumentoComercial: crearInstantanea({
        detalle: { items: [itemA, itemB], modoDetalle: 'catalogo', contieneItemsCatalogo: true, contieneItemsLibres: false, desgloseFinancieroLineas: [desgloseA, desgloseB] },
      }),
    });
    const movA = crearMovimiento({ id: 'mov-A', lineaComercialId: 'linea-A' });
    const movB = crearMovimiento({ id: 'mov-B', lineaComercialId: 'linea-B' });
    const consumoA = crearConsumo({ id: 'consumo-A', movimientoSalidaId: 'mov-A', lineaComercialId: 'linea-A', valorConsumidoMonedaBase: 40 });
    const consumoB = crearConsumo({ id: 'consumo-B', movimientoSalidaId: 'mov-B', lineaComercialId: 'linea-B', valorConsumidoMonedaBase: 200 });

    const filas = proyectarFilasRentabilidadVentas(parametrosBase({
      comprobantes: [comprobante], movimientos: [movA, movB], consumos: [consumoA, consumoB],
    }));

    expect(filas).toHaveLength(2);
    expect(filas.find((f) => f.lineaComercialId === 'linea-A')?.costoVentaBase).toBe(40);
    expect(filas.find((f) => f.lineaComercialId === 'linea-B')?.costoVentaBase).toBe(200);
  });

  it('una línea repartida entre varios almacenes (mismo lineaComercialId, dos movimientos) suma el costo de ambos segmentos', () => {
    const movSeg1 = crearMovimiento({ id: 'mov-seg1', almacenId: 'alm-1', lineaComercialId: 'linea-1' });
    const movSeg2 = crearMovimiento({ id: 'mov-seg2', almacenId: 'alm-2', lineaComercialId: 'linea-1' });
    const consumoSeg1 = crearConsumo({ id: 'c-seg1', movimientoSalidaId: 'mov-seg1', valorConsumidoMonedaBase: 50 });
    const consumoSeg2 = crearConsumo({ id: 'c-seg2', movimientoSalidaId: 'mov-seg2', valorConsumidoMonedaBase: 70 });

    const filas = proyectarFilasRentabilidadVentas(parametrosBase({
      movimientos: [movSeg1, movSeg2], consumos: [consumoSeg1, consumoSeg2],
    }));

    expect(filas).toHaveLength(1);
    expect(filas[0].costoVentaBase).toBe(120);
  });

  it('margen es null cuando la venta neta es cero', () => {
    const desglose = crearDesglose({ ventaNetaSinImpuesto: 0 });
    const comprobante = crearComprobante({
      instantaneaDocumentoComercial: crearInstantanea({
        detalle: { items: [crearItem()], modoDetalle: 'catalogo', contieneItemsCatalogo: true, contieneItemsLibres: false, desgloseFinancieroLineas: [desglose] },
      }),
    });
    const filas = proyectarFilasRentabilidadVentas(parametrosBase({ comprobantes: [comprobante] }));
    expect(filas[0].ventaNetaBase).toBe(0);
    expect(filas[0].margenBruto).toBeNull();
  });

  it('nunca usa Product.precioCompra ni precio actual — el costo proviene exclusivamente de ConsumoCapaCostoInventario.valorConsumidoMonedaBase', () => {
    const filas = proyectarFilasRentabilidadVentas(parametrosBase());
    // El costo (120) no coincide con ningún campo de precio del CartItem (118, 236) — prueba
    // indirecta de que la fuente es el consumo, no el precio de venta.
    expect(filas[0].costoVentaBase).not.toBe(crearItem().price);
    expect(filas[0].costoVentaBase).toBe(120);
  });
});

describe('proyectarFilasRentabilidadVentas — ausencia de costo', () => {
  it('venta inventariable sin consumo: costo/utilidad/margen null, estado sin_costo_registrado (nunca costo cero)', () => {
    const filas = proyectarFilasRentabilidadVentas(parametrosBase({ consumos: [] }));
    expect(filas[0].costoVentaBase).toBeNull();
    expect(filas[0].utilidadBrutaBase).toBeNull();
    expect(filas[0].margenBruto).toBeNull();
    expect(filas[0].estadoCosto).toBe('sin_costo_registrado');
  });

  it('servicio/línea libre se marca no_aplica_inventario, nunca como costo cero', () => {
    const item = crearItem({ tipoDetalle: 'libre', requiresStockControl: false });
    const comprobante = crearComprobante({
      instantaneaDocumentoComercial: crearInstantanea({
        detalle: { items: [item], modoDetalle: 'libre', contieneItemsCatalogo: false, contieneItemsLibres: true, desgloseFinancieroLineas: [crearDesglose()] },
      }),
    });
    const filas = proyectarFilasRentabilidadVentas(parametrosBase({ comprobantes: [comprobante], consumos: [] }));
    expect(filas[0].estadoCosto).toBe('no_aplica_inventario');
    expect(filas[0].costoVentaBase).toBeNull();
  });

  it('sin inventarioDocumentoId (venta que nunca descontó stock) queda sin_costo_registrado', () => {
    const comprobante = crearComprobante({ inventarioDocumentoId: undefined });
    const filas = proyectarFilasRentabilidadVentas(parametrosBase({ comprobantes: [comprobante] }));
    expect(filas[0].estadoCosto).toBe('sin_costo_registrado');
  });
});

describe('proyectarFilasRentabilidadVentas — estados y NC', () => {
  it('comprobante anulado se excluye por completo', () => {
    const comprobante = crearComprobante({ status: 'Anulado' });
    const filas = proyectarFilasRentabilidadVentas(parametrosBase({ comprobantes: [comprobante] }));
    expect(filas).toHaveLength(0);
  });

  it('comprobante activo se incluye', () => {
    const filas = proyectarFilasRentabilidadVentas(parametrosBase());
    expect(filas).toHaveLength(1);
  });

  it('NC financiera (código 07 no aplica — usa 05 como no-devolución): reduce venta neta, no toca costo', () => {
    const desgloseNC = crearDesglose({ ventaNetaSinImpuesto: 50 });
    const ncInstantanea = crearInstantanea({
      identidad: { ...crearInstantanea().identidad, tipoDocumento: 'nota_credito', numeroCompleto: 'FC01-1', fechaEmision: '2026-07-01' },
      detalle: { items: [crearItem()], modoDetalle: 'catalogo', contieneItemsCatalogo: true, contieneItemsLibres: false, desgloseFinancieroLineas: [desgloseNC] },
    });
    const nc = crearComprobante({
      id: 'nc-1', instantaneaDocumentoComercial: ncInstantanea,
      noteCreditData: { codigo: '05', motivo: 'Descuento posterior', documentoRelacionado: { numeroCompleto: 'F001-00000001' } },
      inventarioDocumentoId: undefined,
    });
    const filas = proyectarFilasRentabilidadVentas(parametrosBase({ comprobantes: [nc], periodo: { desde: '2026-06-01', hasta: '2026-07-31' } }));
    expect(filas).toHaveLength(1);
    expect(filas[0].tipoOperacion).toBe('nota_credito_financiera');
    expect(filas[0].ventaNetaBase).toBe(-50);
    expect(filas[0].costoVentaBase).toBeNull();
    expect(filas[0].documentoOrigenRelacionado).toBe('F001-00000001');
  });

  it('NC física (código 06/07) reduce venta neta Y costo por el monto recuperado', () => {
    const desgloseNC = crearDesglose({ ventaNetaSinImpuesto: 100, cantidad: 1 });
    const ncInstantanea = crearInstantanea({
      identidad: { ...crearInstantanea().identidad, tipoDocumento: 'nota_credito', numeroCompleto: 'FC01-2', fechaEmision: '2026-07-01' },
      detalle: { items: [crearItem({ lineaId: 'linea-1' })], modoDetalle: 'catalogo', contieneItemsCatalogo: true, contieneItemsLibres: false, desgloseFinancieroLineas: [desgloseNC] },
    });
    const nc = crearComprobante({
      id: 'nc-1', instantaneaDocumentoComercial: ncInstantanea,
      noteCreditData: { codigo: '06', motivo: 'Devolución', documentoRelacionado: { numeroCompleto: 'F001-00000001' } },
      inventarioDocumentoId: 'nc-inv-doc-1',
    });
    const capa = crearCapaDevolucion({ consumoOrigenId: 'consumo-1', cantidadInicial: 1, valorValorizableMonedaBase: 60 });

    const filas = proyectarFilasRentabilidadVentas(parametrosBase({
      comprobantes: [nc], capas: [capa], periodo: { desde: '2026-06-01', hasta: '2026-07-31' },
    }));

    expect(filas).toHaveLength(1);
    expect(filas[0].tipoOperacion).toBe('nota_credito_fisica');
    expect(filas[0].ventaNetaBase).toBe(-100);
    expect(filas[0].costoVentaBase).toBe(-60);
    expect(filas[0].costoRecuperadoBase).toBe(60);
    expect(filas[0].cantidadDevuelta).toBe(1);
    expect(filas[0].estadoCosto).toBe('con_costo');
  });

  it('NC física reconocida en SU PROPIA fecha (julio), la venta original permanece en junio — ninguna reescribe a la otra', () => {
    const ventaFila = proyectarFilasRentabilidadVentas(parametrosBase())[0];
    expect(ventaFila.fecha).toBe('2026-06-15');

    const desgloseNC = crearDesglose({ ventaNetaSinImpuesto: 100 });
    const ncInstantanea = crearInstantanea({
      identidad: { ...crearInstantanea().identidad, tipoDocumento: 'nota_credito', numeroCompleto: 'FC01-2', fechaEmision: '2026-07-20' },
      detalle: { items: [crearItem()], modoDetalle: 'catalogo', contieneItemsCatalogo: true, contieneItemsLibres: false, desgloseFinancieroLineas: [desgloseNC] },
    });
    const nc = crearComprobante({
      id: 'nc-1', instantaneaDocumentoComercial: ncInstantanea,
      noteCreditData: { codigo: '05', motivo: 'x', documentoRelacionado: { numeroCompleto: 'F001-00000001' } },
    });
    const filasNC = proyectarFilasRentabilidadVentas(parametrosBase({ comprobantes: [nc], periodo: { desde: '2026-07-01', hasta: '2026-07-31' } }));
    expect(filasNC[0].fecha).toBe('2026-07-20');
  });

  it('varias devoluciones parciales sobre la misma venta no duplican el costo recuperado (cada NC aporta su propia capa)', () => {
    const desgloseNC1 = crearDesglose({ ventaNetaSinImpuesto: 50 });
    const nc1 = crearComprobante({
      id: 'nc-1', inventarioDocumentoId: 'nc-inv-1',
      instantaneaDocumentoComercial: crearInstantanea({
        identidad: { ...crearInstantanea().identidad, tipoDocumento: 'nota_credito', numeroCompleto: 'FC01-1', fechaEmision: '2026-06-20' },
        detalle: { items: [crearItem({ lineaId: 'linea-1' })], modoDetalle: 'catalogo', contieneItemsCatalogo: true, contieneItemsLibres: false, desgloseFinancieroLineas: [desgloseNC1] },
      }),
      noteCreditData: { codigo: '06', motivo: 'x', documentoRelacionado: { numeroCompleto: 'F001-00000001' } },
    });
    const nc2 = crearComprobante({
      id: 'nc-2', inventarioDocumentoId: 'nc-inv-2',
      instantaneaDocumentoComercial: crearInstantanea({
        identidad: { ...crearInstantanea().identidad, tipoDocumento: 'nota_credito', numeroCompleto: 'FC01-2', fechaEmision: '2026-06-21' },
        detalle: { items: [crearItem({ lineaId: 'linea-1' })], modoDetalle: 'catalogo', contieneItemsCatalogo: true, contieneItemsLibres: false, desgloseFinancieroLineas: [desgloseNC1] },
      }),
      noteCreditData: { codigo: '06', motivo: 'x', documentoRelacionado: { numeroCompleto: 'F001-00000001' } },
    });
    const capa1 = crearCapaDevolucion({ id: 'cap-dev-1', documentoOrigenId: 'nc-inv-1', consumoOrigenId: 'consumo-1', cantidadInicial: 1, valorValorizableMonedaBase: 60 });
    const capa2 = crearCapaDevolucion({ id: 'cap-dev-2', documentoOrigenId: 'nc-inv-2', consumoOrigenId: 'consumo-1', cantidadInicial: 1, valorValorizableMonedaBase: 60 });

    const filas = proyectarFilasRentabilidadVentas(parametrosBase({
      comprobantes: [nc1, nc2], capas: [capa1, capa2], periodo: { desde: '2026-06-01', hasta: '2026-06-30' },
    }));

    expect(filas).toHaveLength(2);
    expect(filas[0].costoRecuperadoBase).toBe(60);
    expect(filas[1].costoRecuperadoBase).toBe(60);
    // Cada NC recuperó su propia capa — nunca la misma capa contada dos veces.
    expect(filas[0].costoRecuperadoBase + filas[1].costoRecuperadoBase).toBe(120);
  });
});

describe('proyectarFilasRentabilidadVentas — moneda y tipo de cambio', () => {
  it('venta en moneda base no requiere conversión', () => {
    const filas = proyectarFilasRentabilidadVentas(parametrosBase());
    expect(filas[0].monedaOriginal).toBe(MONEDA_BASE);
    expect(filas[0].tipoCambioHistorico).toBeUndefined();
    expect(filas[0].ventaNetaBase).toBe(filas[0].ventaNetaOriginal);
  });

  it('venta en moneda extranjera con TC histórico convierte correctamente vía el helper real', () => {
    const desgloseUsd = crearDesglose({ moneda: 'USD', ventaNetaSinImpuesto: 100 });
    const comprobante = crearComprobante({
      instantaneaDocumentoComercial: crearInstantanea({
        identidad: { ...crearInstantanea().identidad, moneda: 'USD', tipoCambio: 3.8 },
        detalle: { items: [crearItem()], modoDetalle: 'catalogo', contieneItemsCatalogo: true, contieneItemsLibres: false, desgloseFinancieroLineas: [desgloseUsd] },
      }),
    });
    const filas = proyectarFilasRentabilidadVentas(parametrosBase({ comprobantes: [comprobante] }));
    expect(filas[0].monedaOriginal).toBe('USD');
    expect(filas[0].tipoCambioHistorico).toBe(3.8);
    expect(filas[0].ventaNetaOriginal).toBe(100);
    expect(filas[0].ventaNetaBase).toBeCloseTo(380);
  });

  it('TC ausente en venta extranjera NUNCA se convierte asumiendo 1 — marca tipo_cambio_no_disponible y excluye de utilidad', () => {
    const desgloseUsd = crearDesglose({ moneda: 'USD', ventaNetaSinImpuesto: 100 });
    const comprobante = crearComprobante({
      instantaneaDocumentoComercial: crearInstantanea({
        identidad: { ...crearInstantanea().identidad, moneda: 'USD', tipoCambio: null },
        detalle: { items: [crearItem()], modoDetalle: 'catalogo', contieneItemsCatalogo: true, contieneItemsLibres: false, desgloseFinancieroLineas: [desgloseUsd] },
      }),
    });
    const filas = proyectarFilasRentabilidadVentas(parametrosBase({ comprobantes: [comprobante] }));
    expect(filas[0].estadoCosto).toBe('tipo_cambio_no_disponible');
    expect(filas[0].ventaNetaBase).toBeNull();
    expect(filas[0].costoVentaBase).toBeNull();
    expect(filas[0].margenBruto).toBeNull();
    expect(filas[0].ventaNetaOriginal).toBe(100);
  });

  it('un cambio posterior del tipo de cambio vigente no altera una venta histórica ya proyectada (el servicio nunca lee el TC actual)', () => {
    const desgloseUsd = crearDesglose({ moneda: 'USD', ventaNetaSinImpuesto: 100 });
    const comprobante = crearComprobante({
      instantaneaDocumentoComercial: crearInstantanea({
        identidad: { ...crearInstantanea().identidad, moneda: 'USD', tipoCambio: 3.5 },
        detalle: { items: [crearItem()], modoDetalle: 'catalogo', contieneItemsCatalogo: true, contieneItemsLibres: false, desgloseFinancieroLineas: [desgloseUsd] },
      }),
    });
    const filas1 = proyectarFilasRentabilidadVentas(parametrosBase({ comprobantes: [comprobante] }));
    const filas2 = proyectarFilasRentabilidadVentas(parametrosBase({ comprobantes: [comprobante] }));
    expect(filas1[0].ventaNetaBase).toBe(filas2[0].ventaNetaBase);
    expect(filas1[0].ventaNetaBase).toBeCloseTo(350);
  });
});

describe('calcularIndicadoresRentabilidad', () => {
  it('venta neta total, costo cubierto, utilidad cubierta y margen cubierto se calculan correctamente', () => {
    const filas = proyectarFilasRentabilidadVentas(parametrosBase());
    const indicadores = calcularIndicadoresRentabilidad(filas);
    expect(indicadores.ventaNetaTotal).toBe(200);
    expect(indicadores.costoVentaCubierto).toBe(120);
    expect(indicadores.utilidadBrutaCubierta).toBe(80);
    expect(indicadores.margenBrutoCubierto).toBeCloseTo(0.4);
  });

  it('cobertura se calcula sobre ventas inventariables (con + sin costo), nunca dividiendo entre toda la venta neta', () => {
    const conCosto = proyectarFilasRentabilidadVentas(parametrosBase())[0];
    const sinCosto = { ...conCosto, id: 'fila-2', estadoCosto: 'sin_costo_registrado' as const, costoVentaBase: null, utilidadBrutaBase: null, margenBruto: null, ventaNetaBase: 100 };
    const indicadores = calcularIndicadoresRentabilidad([conCosto, sinCosto]);
    // cubierta: 200 de 300 elegibles (200 con costo + 100 sin costo) = 66.67%
    expect(indicadores.coberturaPorcentaje).toBeCloseTo(66.67, 1);
    expect(indicadores.lineasSinCosto).toBe(1);
  });

  it('líneas no inventariables se cuentan aparte y no afectan la cobertura', () => {
    const conCosto = proyectarFilasRentabilidadVentas(parametrosBase())[0];
    const servicio = { ...conCosto, id: 'fila-2', estadoCosto: 'no_aplica_inventario' as const, costoVentaBase: null, utilidadBrutaBase: null, margenBruto: null };
    const indicadores = calcularIndicadoresRentabilidad([conCosto, servicio]);
    expect(indicadores.lineasNoInventariables).toBe(1);
    expect(indicadores.coberturaPorcentaje).toBe(100);
  });

  it('sin denominador (todas las filas no_aplica_inventario), cobertura es null en vez de un engañoso 0%', () => {
    const conCosto = proyectarFilasRentabilidadVentas(parametrosBase())[0];
    const servicio = { ...conCosto, estadoCosto: 'no_aplica_inventario' as const, costoVentaBase: null, utilidadBrutaBase: null, margenBruto: null };
    const indicadores = calcularIndicadoresRentabilidad([servicio]);
    expect(indicadores.coberturaPorcentaje).toBeNull();
  });

  it('las NC ajustan los importes pero la cobertura nunca es negativa ni mayor a 100%', () => {
    const venta = proyectarFilasRentabilidadVentas(parametrosBase())[0];
    const ajusteFisico = { ...venta, id: 'ajuste-1', tipoOperacion: 'nota_credito_fisica' as const, ventaNetaBase: -190, costoVentaBase: -120, utilidadBrutaBase: -70, margenBruto: null };
    const indicadores = calcularIndicadoresRentabilidad([venta, ajusteFisico]);
    expect(indicadores.coberturaPorcentaje).not.toBeNull();
    expect(indicadores.coberturaPorcentaje as number).toBeGreaterThanOrEqual(0);
    expect(indicadores.coberturaPorcentaje as number).toBeLessThanOrEqual(100);
  });
});

describe('filtrarFilasRentabilidad', () => {
  it('filtra por búsqueda de texto (documento/producto/cliente/vendedor)', () => {
    const filas = proyectarFilasRentabilidadVentas(parametrosBase());
    expect(filtrarFilasRentabilidad(filas, { busqueda: 'Producto 1' })).toHaveLength(1);
    expect(filtrarFilasRentabilidad(filas, { busqueda: 'no existe' })).toHaveLength(0);
  });

  it('filtra por estado de costo', () => {
    const filas = proyectarFilasRentabilidadVentas(parametrosBase({ consumos: [] }));
    expect(filtrarFilasRentabilidad(filas, { estadoCosto: 'sin_costo_registrado' })).toHaveLength(1);
    expect(filtrarFilasRentabilidad(filas, { estadoCosto: 'con_costo' })).toHaveLength(0);
  });

  it('filtra por con/sin devolución', () => {
    const venta = proyectarFilasRentabilidadVentas(parametrosBase())[0];
    const conDevolucion = { ...venta, id: 'nc-1', tipoOperacion: 'nota_credito_fisica' as const, cantidadDevuelta: 1 };
    expect(filtrarFilasRentabilidad([venta, conDevolucion], { conDevolucion: true })).toHaveLength(1);
    expect(filtrarFilasRentabilidad([venta, conDevolucion], { conDevolucion: false })).toHaveLength(1);
  });
});

describe('agruparFilasRentabilidad', () => {
  it('sin agrupar devuelve una fila por línea/ajuste', () => {
    const filas = proyectarFilasRentabilidadVentas(parametrosBase());
    const grupos = agruparFilasRentabilidad(filas, 'sin_agrupar');
    expect(grupos).toHaveLength(1);
  });

  it('agrupa por producto sumando cantidad/venta/costo/utilidad, con margen calculado desde totales (nunca promedio de porcentajes)', () => {
    const desgloseA = crearDesglose({ lineaId: 'linea-A', ventaNetaSinImpuesto: 100 });
    const desgloseB = crearDesglose({ lineaId: 'linea-B', ventaNetaSinImpuesto: 200 });
    const itemA = crearItem({ lineaId: 'linea-A' });
    const itemB = crearItem({ lineaId: 'linea-B' });
    const compA = crearComprobante({
      id: 'comp-A', inventarioDocumentoId: 'inv-A',
      instantaneaDocumentoComercial: crearInstantanea({ detalle: { items: [itemA], modoDetalle: 'catalogo', contieneItemsCatalogo: true, contieneItemsLibres: false, desgloseFinancieroLineas: [desgloseA] } }),
    });
    const compB = crearComprobante({
      id: 'comp-B', inventarioDocumentoId: 'inv-B',
      instantaneaDocumentoComercial: crearInstantanea({ detalle: { items: [itemB], modoDetalle: 'catalogo', contieneItemsCatalogo: true, contieneItemsLibres: false, desgloseFinancieroLineas: [desgloseB] } }),
    });
    const movA = crearMovimiento({ id: 'mov-A', documentoOrigenId: 'inv-A', lineaComercialId: 'linea-A' });
    const movB = crearMovimiento({ id: 'mov-B', documentoOrigenId: 'inv-B', lineaComercialId: 'linea-B' });
    const consumoA = crearConsumo({ id: 'c-A', movimientoSalidaId: 'mov-A', lineaComercialId: 'linea-A', valorConsumidoMonedaBase: 40 });
    const consumoB = crearConsumo({ id: 'c-B', movimientoSalidaId: 'mov-B', lineaComercialId: 'linea-B', valorConsumidoMonedaBase: 100 });

    const filas = proyectarFilasRentabilidadVentas(parametrosBase({ comprobantes: [compA, compB], movimientos: [movA, movB], consumos: [consumoA, consumoB] }));
    const grupos = agruparFilasRentabilidad(filas, 'producto');

    expect(grupos).toHaveLength(1);
    expect(grupos[0].ventaNetaBase).toBe(300);
    expect(grupos[0].costoVentaBase).toBe(140);
    expect(grupos[0].utilidadBrutaBase).toBe(160);
    // margen = utilidad total (160) / venta CUBIERTA total (300) — nunca promedio de (0.6+0.5)/2.
    expect(grupos[0].margenBruto).toBeCloseTo(160 / 300);
  });

  it('agrupa por vendedor/cliente/establecimiento', () => {
    const filas = proyectarFilasRentabilidadVentas(parametrosBase());
    expect(agruparFilasRentabilidad(filas, 'vendedor')[0].etiqueta).toBe('Ana Vendedora');
    expect(agruparFilasRentabilidad(filas, 'cliente')[0].etiqueta).toBe('Cliente Uno');
    expect(agruparFilasRentabilidad(filas, 'establecimiento')[0].etiqueta).toBe('Tienda 1');
  });

  it('la NC se incluye en el grupo de SU periodo, sin duplicar la venta original', () => {
    const venta = proyectarFilasRentabilidadVentas(parametrosBase())[0];
    const ajuste = { ...venta, id: 'ajuste-1', fecha: '2026-07-20', tipoOperacion: 'nota_credito_financiera' as const, ventaNetaBase: -50 };
    const grupos = agruparFilasRentabilidad([venta, ajuste], 'periodo', 45);
    const grupoJunio = grupos.find((g) => g.clave === '2026-06-15');
    const grupoJulio = grupos.find((g) => g.clave === '2026-07-20');
    expect(grupoJunio?.ventaNetaBase).toBe(200);
    expect(grupoJulio?.ventaNetaBase).toBe(-50);
  });

  it('columnas inválidas de "sin agrupar" no contaminan otro modo — cada grupo expone solo sus propios campos agregados', () => {
    const filas = proyectarFilasRentabilidadVentas(parametrosBase());
    const grupoProducto = agruparFilasRentabilidad(filas, 'producto')[0];
    expect(grupoProducto).not.toHaveProperty('numeroDocumento');
    expect(grupoProducto).not.toHaveProperty('documentoId');
  });
});

describe('calcularAmplitudPeriodoEnDias / determinarClavePeriodo', () => {
  it('calcula la amplitud inclusive en días', () => {
    expect(calcularAmplitudPeriodoEnDias('2026-06-01', '2026-06-30')).toBe(30);
    expect(calcularAmplitudPeriodoEnDias('2026-06-01', '2026-06-01')).toBe(1);
  });

  it('agrupa por día cuando la amplitud es <= 31 días', () => {
    expect(determinarClavePeriodo('2026-06-15T00:00:00.000Z', 15).clave).toBe('2026-06-15');
  });

  it('agrupa por mes cuando la amplitud es > 180 días', () => {
    expect(determinarClavePeriodo('2026-06-15T00:00:00.000Z', 365).clave).toBe('2026-06');
  });

  it('es determinístico: la misma fecha y amplitud siempre produce la misma clave', () => {
    const a = determinarClavePeriodo('2026-06-15T00:00:00.000Z', 90);
    const b = determinarClavePeriodo('2026-06-15T00:00:00.000Z', 90);
    expect(a).toEqual(b);
  });
});

describe('aislamiento multiempresa', () => {
  it('el servicio solo proyecta lo que el llamador le pasa — nunca mezcla datos de otra empresa por sí mismo', () => {
    // El servicio no lee repositorios ni filtra por empresaId internamente en las colecciones de
    // inventario (eso ya lo garantiza el llamador al pasar solo colecciones de una empresa) — esta
    // prueba documenta el contrato: empresaId es puramente informativo en la salida.
    const filas = proyectarFilasRentabilidadVentas(parametrosBase());
    expect(filas[0].empresaId).toBe(EMPRESA);
  });
});

describe('proyectarFilasRentabilidadVentas — anulados', () => {
  it('por defecto (incluirAnulados ausente) un comprobante anulado se excluye por completo', () => {
    const comprobante = crearComprobante({ status: 'Anulado' });
    const filas = proyectarFilasRentabilidadVentas(parametrosBase({ comprobantes: [comprobante] }));
    expect(filas).toHaveLength(0);
  });

  it('con incluirAnulados:true el comprobante anulado sí se proyecta, con estadoDocumento="Anulado"', () => {
    const comprobante = crearComprobante({ status: 'Anulado' });
    const filas = proyectarFilasRentabilidadVentas(parametrosBase({ comprobantes: [comprobante], incluirAnulados: true }));
    expect(filas).toHaveLength(1);
    expect(filas[0].estadoDocumento).toBe('Anulado');
  });
});

describe('proyectarFilasRentabilidadVentas — almacén de la línea', () => {
  it('una línea con costo resuelto expone el almacén del movimiento de salida que la originó', () => {
    const filas = proyectarFilasRentabilidadVentas(parametrosBase());
    expect(filas[0].almacen).toBe('Almacén Principal');
  });

  it('una línea sin costo (sin_costo_registrado) nunca inventa un almacén', () => {
    const filas = proyectarFilasRentabilidadVentas(parametrosBase({ consumos: [] }));
    expect(filas[0].almacen).toBeUndefined();
  });
});

describe('resolverOrigenesCostoLinea', () => {
  it('devuelve un origen por cada consumo usado por la línea, sin exponer capaId/consumoId', () => {
    const origenes = resolverOrigenesCostoLinea('inv-doc-1', 'prod-1', 'linea-1', [crearMovimiento()], [crearConsumo()], []);
    expect(origenes).toHaveLength(1);
    expect(origenes[0]).toEqual(expect.objectContaining({
      cantidad: 2,
      costoUnitario: 60,
      valor: 120,
    }));
    expect(origenes[0]).not.toHaveProperty('capaId');
    expect(origenes[0]).not.toHaveProperty('consumoId');
  });

  it('sin consumos para esa línea devuelve un arreglo vacío (nunca un origen inventado)', () => {
    const origenes = resolverOrigenesCostoLinea('inv-doc-1', 'prod-1', 'linea-1', [], [], []);
    expect(origenes).toEqual([]);
  });
});

describe('filtrarFilasRentabilidad — estado del comprobante', () => {
  it('filtra por estadoComprobante exacto sobre las filas ya proyectadas', () => {
    const aceptado = crearComprobante({ id: 'comp-aceptado', status: 'Aceptado' });
    const porCorregir = crearComprobante({ id: 'comp-corregir', status: 'Por corregir' });
    const filas = proyectarFilasRentabilidadVentas(parametrosBase({ comprobantes: [aceptado, porCorregir] }));
    const filtradas = filtrarFilasRentabilidad(filas, { estadoComprobante: 'Por corregir' });
    expect(filtradas).toHaveLength(1);
    expect(filtradas[0].estadoDocumento).toBe('Por corregir');
  });
});

describe('obtenerColumnasConfigurables', () => {
  it('el modo "sin_agrupar" expone las comunes más las 19 opcionales de línea', () => {
    const columnas = obtenerColumnasConfigurables('sin_agrupar');
    expect(columnas).toContain('fecha');
    expect(columnas).toContain('cliente');
    expect(columnas).toContain('costoRecuperado');
  });

  it('un modo agrupado nunca expone "fecha" ni las columnas opcionales de línea', () => {
    const columnas = obtenerColumnasConfigurables('producto');
    expect(columnas).not.toContain('fecha');
    expect(columnas).not.toContain('cliente');
    expect(columnas).toContain('ventaNeta');
  });
});

describe('calcularResultadoOperativo (§14/§20-D — Gastos operativos / Utilidad operativa / Margen operativo)', () => {
  function crearIndicadoresRentabilidad(overrides: Partial<IndicadoresRentabilidadVentas> = {}): IndicadoresRentabilidadVentas {
    return {
      ventaNetaTotal: 1000,
      ventaNetaCubierta: 1000,
      costoVentaCubierto: 600,
      utilidadBrutaCubierta: 400,
      margenBrutoCubierto: 0.4,
      coberturaPorcentaje: 100,
      lineasSinCosto: 0,
      lineasNoInventariables: 0,
      lineasTipoCambioNoDisponible: 0,
      totalLineas: 5,
      ...overrides,
    };
  }

  function crearIndicadoresGastos(overrides: Partial<IndicadoresGastosOperativos> = {}): IndicadoresGastosOperativos {
    return {
      gastosOperativosReconocidos: 150,
      totalLineas: 3,
      lineasSinTipoCambio: 0,
      ...overrides,
    };
  }

  it('utilidad operativa estimada = utilidad bruta cubierta − gastos operativos reconocidos', () => {
    const resultado = calcularResultadoOperativo(crearIndicadoresRentabilidad({ utilidadBrutaCubierta: 400 }), crearIndicadoresGastos({ gastosOperativosReconocidos: 150 }));
    expect(resultado.utilidadOperativaEstimada).toBe(250);
  });

  it('margen operativo estimado = utilidad operativa estimada ÷ venta neta cubierta', () => {
    const resultado = calcularResultadoOperativo(
      crearIndicadoresRentabilidad({ ventaNetaCubierta: 1000, utilidadBrutaCubierta: 400 }),
      crearIndicadoresGastos({ gastosOperativosReconocidos: 150 }),
    );
    expect(resultado.margenOperativoEstimado).toBeCloseTo(0.25, 10);
  });

  it('venta neta cubierta 0: el margen operativo es null, nunca una división por cero', () => {
    const resultado = calcularResultadoOperativo(
      crearIndicadoresRentabilidad({ ventaNetaCubierta: 0, utilidadBrutaCubierta: 0 }),
      crearIndicadoresGastos({ gastosOperativosReconocidos: 0 }),
    );
    expect(resultado.margenOperativoEstimado).toBeNull();
  });

  it('cobertura de costo 100% y sin líneas de gasto sin tipo de cambio: esCompleto = true (se omite "estimada")', () => {
    const resultado = calcularResultadoOperativo(
      crearIndicadoresRentabilidad({ coberturaPorcentaje: 100 }),
      crearIndicadoresGastos({ lineasSinTipoCambio: 0 }),
    );
    expect(resultado.esCompleto).toBe(true);
  });

  it('cobertura de costo menor a 100%: esCompleto = false (debe decir "estimada")', () => {
    const resultado = calcularResultadoOperativo(
      crearIndicadoresRentabilidad({ coberturaPorcentaje: 80 }),
      crearIndicadoresGastos({ lineasSinTipoCambio: 0 }),
    );
    expect(resultado.esCompleto).toBe(false);
  });

  it('cobertura de costo 100% pero con líneas de gasto sin tipo de cambio: esCompleto = false igualmente', () => {
    const resultado = calcularResultadoOperativo(
      crearIndicadoresRentabilidad({ coberturaPorcentaje: 100 }),
      crearIndicadoresGastos({ lineasSinTipoCambio: 2 }),
    );
    expect(resultado.esCompleto).toBe(false);
  });

  it('propaga gastosOperativosReconocidos sin recalcularlo (nunca una segunda fórmula)', () => {
    const resultado = calcularResultadoOperativo(crearIndicadoresRentabilidad(), crearIndicadoresGastos({ gastosOperativosReconocidos: 150 }));
    expect(resultado.gastosOperativosReconocidos).toBe(150);
  });
});
