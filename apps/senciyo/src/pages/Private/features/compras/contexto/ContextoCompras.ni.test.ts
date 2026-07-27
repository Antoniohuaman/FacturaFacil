import { describe, it, expect } from 'vitest';
import { construirNotaIngresoDesdeCC, sincronizarCCTrasConfirmacionNI } from './ContextoCompras';
import { prepararDatosNIDesdeCC } from '../mapeadores/mapeadorCCaNI';
import type { ComprobanteCompra } from '../modelos/ComprobanteCompra';
import type { LineaCompra } from '../modelos/LineaCompra';
import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';
import type { Series } from '../../configuracion-sistema/modelos/Series';
import type { NotaIngreso, LineaNotaIngreso } from '../../gestion-inventario/models/notaIngreso.types';

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

function crearSerieNI(overrides: Partial<Series> = {}): Series {
  return {
    id: 'serie-ni-1',
    EstablecimientoId: 'est-1',
    documentType: {
      id: 'NI',
      code: 'NI',
      name: 'Nota de Ingreso',
      shortName: 'NI',
      category: 'OTHER',
      properties: {
        affectsTaxes: false,
        requiresCustomerRuc: false,
        requiresCustomerName: false,
        allowsCredit: false,
        requiresPaymentMethod: false,
        canBeVoided: true,
        canHaveCreditNote: false,
        canHaveDebitNote: false,
        isElectronic: false,
        requiresSignature: false,
      },
      seriesConfiguration: { defaultPrefix: 'NI', seriesLength: 4, correlativeLength: 8, allowedPrefixes: ['NI'] },
      isActive: true,
    },
    series: 'NI01',
    correlativeNumber: 0,
    configuration: {
      minimumDigits: 8,
      startNumber: 1,
      autoIncrement: true,
      allowManualNumber: false,
      requireAuthorization: false,
    },
    sunatConfiguration: {
      isElectronic: false,
      environmentType: 'PRODUCTION',
      certificateRequired: false,
      mustReportToSunat: false,
      maxDaysToReport: 0,
    },
    status: 'ACTIVE',
    isDefault: true,
    statistics: { documentsIssued: 0, averageDocumentsPerDay: 0 },
    validation: { allowZeroAmount: false, requireCustomer: false },
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    createdBy: 'user-1',
    isActive: true,
    ...overrides,
  };
}

function crearLineaCompra(overrides: Partial<LineaCompra> = {}): LineaCompra {
  return {
    id: 'linea-1',
    nombreProducto: 'Producto de prueba',
    productoId: 'prod-1',
    clasificacion: 'producto',
    esInventariable: true,
    afectaInventario: true,
    unidadMedida: 'Caja x 12',
    unidadMedidaCodigo: 'BX',
    unidadesDisponibles: [
      { code: 'NIU', label: 'Unidad', isBase: true, factorConversion: 1 },
      { code: 'BX', label: 'Caja x 12', factorConversion: 12 },
    ],
    factorConversionAplicado: 12,
    cantidadDocumentadaInventariable: 24,
    cantidadSolicitada: 2,
    cantidadRecibida: 2,
    cantidadFacturada: 2,
    cantidadIngresadaInventario: 0,
    cantidadPendienteRecepcion: 0,
    cantidadPendienteFacturacion: 0,
    cantidadPendienteInventario: 2,
    costoUnitario: 120,
    subtotal: 240,
    tipoAfectacion: 'gravado',
    igv: 0,
    total: 240,
    almacenDestinoId: 'alm-1',
    almacenDestinoNombre: 'Almacén Principal',
    ...overrides,
  };
}

function crearCC(lineas: LineaCompra[], overrides: Partial<ComprobanteCompra> = {}): ComprobanteCompra {
  return {
    id: 'cc-1',
    tipoRegistro: 'comprobante_compra',
    serieProveedor: 'F001',
    numeroProveedor: '00000123',
    tipoComprobanteProveedor: 'Factura',
    fechaRegistro: '2026-01-01',
    proveedorId: 'prov-1',
    proveedorTipoDocumento: 'RUC',
    proveedorNumeroDocumento: '20123456789',
    proveedorNombre: 'Proveedor de prueba',
    moneda: 'PEN',
    formaPago: 'contado',
    modalidadInventario: 'con_nota_ingreso',
    lineas,
    totales: { subtotal: 0, subtotalExonerado: 0, subtotalInafecto: 0, descuentoTotal: 0, igv: 0, total: 0, moneda: 'PEN' },
    adjuntos: [],
    historial: [],
    fechaCreacion: '2026-01-01',
    fechaActualizacion: '2026-01-01',
    estadoDocumento: 'registrado',
    estadoPago: 'pendiente',
    estadoInventario: 'pendiente',
    ...overrides,
  };
}

const CONTEXTO_BASE = { tratamientoImpuestoCompra: 'impuesto_no_recuperable' as const, monedaBase: 'PEN' };

let contador = 0;
function generarId(): string {
  contador += 1;
  return `gen-${contador}`;
}
function fechaActual(): string {
  return '2026-08-01T00:00:00.000Z';
}

describe('construirNotaIngresoDesdeCC', () => {
  it('construye una NI Borrador con la relación técnica correcta al CC (comprobanteCompraOrigenId, modalidadOrigenCompra, lineaCompraOrigenId)', () => {
    const cc = crearCC([crearLineaCompra()]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const datosNI = prepararDatosNIDesdeCC(cc, CONTEXTO_BASE);

    const nota = construirNotaIngresoDesdeCC(cc, datosNI, almacenesMap, [crearSerieNI()], 'est-1', 'manual', 'Ana', generarId, fechaActual);

    expect(nota.estado).toBe('Borrador');
    expect(nota.esBorrador).toBe(true);
    expect(nota.comprobanteCompraOrigenId).toBe('cc-1');
    expect(nota.modalidadOrigenCompra).toBe('manual');
    expect(nota.lineas).toHaveLength(1);
    expect(nota.lineas[0].lineaCompraOrigenId).toBe('linea-1');
    expect(nota.lineas[0].cantidad).toBe(24);
    expect(nota.serie).toBe('NI01');
    expect(nota.almacenDestinoId).toBe('alm-1');
    expect(nota.numeroDocumentoOrigen).toBe('F001-00000123');
  });

  it('el costo de la línea de NI es el costo por unidad mínima ya calculado (nunca el bruto comercial del CC copiado tal cual)', () => {
    const cc = crearCC([crearLineaCompra()]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const datosNI = prepararDatosNIDesdeCC(cc, CONTEXTO_BASE);

    const nota = construirNotaIngresoDesdeCC(cc, datosNI, almacenesMap, [crearSerieNI()], 'est-1', 'automatico', 'Ana', generarId, fechaActual);

    // factor 12, total=240 (igv 0), cantidad unidad mínima=24 → costoUnitario = 240/24 = 10, nunca 120.
    expect(nota.lineas[0].costoUnitario).toBe(10);
    expect(nota.lineas[0].costoUnitarioComercialOriginal).toBe(120);
    expect(nota.lineas[0].factorConversionAplicado).toBe(12);
  });

  it('rechaza moneda no soportada por Nota de Ingreso (EUR)', () => {
    const cc = crearCC([crearLineaCompra()], { moneda: 'EUR', tipoCambio: 4.1 });
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const datosNI = prepararDatosNIDesdeCC(cc, CONTEXTO_BASE);

    expect(() =>
      construirNotaIngresoDesdeCC(cc, datosNI, almacenesMap, [crearSerieNI()], 'est-1', 'manual', 'Ana', generarId, fechaActual),
    ).toThrow(/no está soportada por Nota de Ingreso/);
  });

  it('rechaza si ninguna línea del CC pudo resolverse (datosNI.lineas vacío)', () => {
    const cc = crearCC([crearLineaCompra({ cantidadDocumentadaInventariable: 0 })]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const datosNI = prepararDatosNIDesdeCC(cc, CONTEXTO_BASE);

    expect(() =>
      construirNotaIngresoDesdeCC(cc, datosNI, almacenesMap, [crearSerieNI()], 'est-1', 'manual', 'Ana', generarId, fechaActual),
    ).toThrow(/ninguna línea del comprobante pudo resolverse/);
  });

  it('rechaza si no hay serie de Nota de Ingreso activa para el establecimiento', () => {
    const cc = crearCC([crearLineaCompra()]);
    const almacenesMap = new Map([['alm-1', crearAlmacen()]]);
    const datosNI = prepararDatosNIDesdeCC(cc, CONTEXTO_BASE);

    expect(() =>
      construirNotaIngresoDesdeCC(cc, datosNI, almacenesMap, [], 'est-1', 'manual', 'Ana', generarId, fechaActual),
    ).toThrow(/serie de Nota de Ingreso activa/);
  });
});

describe('sincronizarCCTrasConfirmacionNI', () => {
  function crearLineaNI(overrides: Partial<LineaNotaIngreso> = {}): LineaNotaIngreso {
    return {
      id: 'ni-linea-1',
      productoId: 'prod-1',
      productoCodigo: 'P001',
      productoNombre: 'Producto de prueba',
      tipoBienServicio: 'bien',
      unidad: 'Caja x 12',
      unidadCodigo: 'BX',
      almacenId: 'alm-1',
      cantidad: 24,
      costoUnitario: 10,
      subtotal: 240,
      igv: 0,
      total: 240,
      lineaCompraOrigenId: 'linea-1',
      cantidadComercialOriginal: 2,
      factorConversionAplicado: 12,
      ...overrides,
    };
  }

  function crearNotaConfirmada(overrides: Partial<NotaIngreso> = {}): NotaIngreso {
    return {
      id: 'ni-1',
      tipoDocumento: 'nota_ingreso',
      serie: 'NI01',
      correlativo: '00000001',
      numero: 'NI01-00000001',
      estado: 'Generada',
      esBorrador: false,
      fechaDocumento: '2026-08-01',
      fechaIngresoAlmacen: '2026-08-01',
      tipoIngreso: '02',
      almacenDestinoId: 'alm-1',
      almacenDestinoNombre: 'Almacén Principal',
      almacenDestinoCodigo: 'ALM01',
      moneda: 'PEN',
      comprobanteCompraOrigenId: 'cc-1',
      modalidadOrigenCompra: 'automatico',
      lineas: [crearLineaNI()],
      baseImponible: 240,
      descuentos: 0,
      isc: 0,
      impuesto: 0,
      noGravados: 0,
      otc: 0,
      total: 240,
      usuario: 'Ana',
      fechaCreacion: '2026-08-01T00:00:00.000Z',
      fechaActualizacion: '2026-08-01T00:00:00.000Z',
      historial: [],
      ...overrides,
    };
  }

  it('actualiza cantidadIngresadaInventario/cantidadPendienteInventario en UNIDAD COMERCIAL (2 cajas, nunca 24 unidades mínimas)', () => {
    const cc = crearCC([crearLineaCompra()]);
    const nota = crearNotaConfirmada();

    const actualizado = sincronizarCCTrasConfirmacionNI([cc], nota, ['mov-1'], '2026-08-01T00:00:00.000Z');

    expect(actualizado).not.toBeNull();
    expect(actualizado?.lineas[0].cantidadIngresadaInventario).toBe(2);
    expect(actualizado?.lineas[0].cantidadPendienteInventario).toBe(0);
  });

  it('marca estadoInventario="automatico" únicamente cuando modalidadOrigenCompra==="automatico" y la cantidad ingresada cubre lo facturado', () => {
    const cc = crearCC([crearLineaCompra()], { modalidadInventario: 'ingreso_automatico' });
    const nota = crearNotaConfirmada({ modalidadOrigenCompra: 'automatico' });

    const actualizado = sincronizarCCTrasConfirmacionNI([cc], nota, ['mov-1'], '2026-08-01T00:00:00.000Z');

    expect(actualizado?.estadoInventario).toBe('automatico');
  });

  it('con modalidadOrigenCompra="manual" NO produce estadoInventario="automatico" aunque la cantidad esté completa (usa la lógica cuantitativa estándar)', () => {
    const cc = crearCC([crearLineaCompra()]);
    const nota = crearNotaConfirmada({ modalidadOrigenCompra: 'manual' });

    const actualizado = sincronizarCCTrasConfirmacionNI([cc], nota, ['mov-1'], '2026-08-01T00:00:00.000Z');

    expect(actualizado?.estadoInventario).toBe('completo');
  });

  it('agrega la NI a notasIngresoRelacionadas y los movimientos a movimientosInventarioRelacionados sin duplicar en un reintento (misma NI, mismos movimientos)', () => {
    const cc = crearCC([crearLineaCompra()], { notasIngresoRelacionadas: ['ni-1'], movimientosInventarioRelacionados: ['mov-1'] });
    const nota = crearNotaConfirmada();

    const actualizado = sincronizarCCTrasConfirmacionNI([cc], nota, ['mov-1'], '2026-08-01T00:00:00.000Z');

    expect(actualizado?.notasIngresoRelacionadas).toEqual(['ni-1']);
    expect(actualizado?.movimientosInventarioRelacionados).toEqual(['mov-1']);
  });

  it('devuelve null si la NI no tiene comprobanteCompraOrigenId (NI sin origen en Compras)', () => {
    const cc = crearCC([crearLineaCompra()]);
    const nota = crearNotaConfirmada({ comprobanteCompraOrigenId: undefined, modalidadOrigenCompra: undefined });

    expect(sincronizarCCTrasConfirmacionNI([cc], nota, ['mov-1'], '2026-08-01T00:00:00.000Z')).toBeNull();
  });

  it('devuelve null si el CC de origen no está en la colección (nada que sincronizar en este contexto)', () => {
    const nota = crearNotaConfirmada({ comprobanteCompraOrigenId: 'cc-inexistente' });

    expect(sincronizarCCTrasConfirmacionNI([], nota, ['mov-1'], '2026-08-01T00:00:00.000Z')).toBeNull();
  });

  it('no toca líneas del CC que no tienen una línea de NI correspondiente (lineaCompraOrigenId distinto)', () => {
    const cc = crearCC([crearLineaCompra({ id: 'linea-A' }), crearLineaCompra({ id: 'linea-B', cantidadIngresadaInventario: 0 })]);
    const nota = crearNotaConfirmada({ lineas: [crearLineaNI({ lineaCompraOrigenId: 'linea-A' })] });

    const actualizado = sincronizarCCTrasConfirmacionNI([cc], nota, ['mov-1'], '2026-08-01T00:00:00.000Z');

    expect(actualizado?.lineas.find((l) => l.id === 'linea-A')?.cantidadIngresadaInventario).toBe(2);
    expect(actualizado?.lineas.find((l) => l.id === 'linea-B')?.cantidadIngresadaInventario).toBe(0);
  });
});
