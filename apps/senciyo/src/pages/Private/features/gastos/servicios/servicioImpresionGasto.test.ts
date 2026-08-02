import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { construirRepresentacionImpresaGasto } from './servicioImpresionGasto';
import type { Gasto } from '../modelos/Gasto';
import type { CuentaPorPagar } from '../../compras/modelos/CuentaPorPagar';
import type { PagoCompra } from '../../compras/modelos/PagoCompra';

function crearGastoFixture(overrides: Partial<Gasto> = {}): Gasto {
  return {
    id: 'gasto-1',
    empresaId: 'empresa-1',
    referenciaInterna: 'GTO-00000001',
    fechaReconocimiento: '2026-07-01',
    categoriaId: 'cat-1',
    concepto: 'Alquiler de local',
    moneda: 'PEN',
    subtotal: 100,
    impuesto: 18,
    total: 118,
    tratamientoImpuesto: 'recuperable',
    condicionPago: 'contado',
    pagosRelacionados: [],
    adjuntos: [],
    estadoDocumento: 'registrado',
    historial: [],
    fechaCreacion: '2026-07-01T10:00:00.000Z',
    fechaActualizacion: '2026-07-01T10:00:00.000Z',
    ...overrides,
  };
}

function renderizar(datos: Parameters<typeof construirRepresentacionImpresaGasto>[0]): string {
  return renderToStaticMarkup(construirRepresentacionImpresaGasto(datos));
}

describe('construirRepresentacionImpresaGasto (§2/§10-A de la corrección)', () => {
  it('incluye los datos de empresa en el encabezado', () => {
    const html = renderizar({
      gasto: crearGastoFixture(),
      empresa: { razonSocial: 'Comercial Los Andes SAC', ruc: '20123456789', direccion: 'Av. Siempre Viva 123' },
      categoriaNombre: 'Alquileres',
      establecimientoNombre: 'Tienda Central',
      pagos: [],
      estadoPago: 'pendiente',
    });
    expect(html).toContain('Comercial Los Andes SAC');
    expect(html).toContain('20123456789');
    expect(html).toContain('Av. Siempre Viva 123');
  });

  it('incluye referencia interna, estado documental, estado de pago, concepto, categoría, establecimiento y fecha de reconocimiento', () => {
    const html = renderizar({
      gasto: crearGastoFixture({ referenciaInterna: 'GTO-00000007' }),
      categoriaNombre: 'Alquileres',
      establecimientoNombre: 'Tienda Central',
      pagos: [],
      estadoPago: 'pendiente',
    });
    expect(html).toContain('GTO-00000007');
    expect(html).toContain('Registrado');
    expect(html).toContain('Pendiente');
    expect(html).toContain('Alquiler de local');
    expect(html).toContain('Alquileres');
    expect(html).toContain('Tienda Central');
  });

  it('traduce el tipo de documento del proveedor (no muestra el código SUNAT crudo)', () => {
    const html = renderizar({
      gasto: crearGastoFixture({
        tipoDocumento: '01',
        serieDocumentoProveedor: 'F001',
        numeroDocumentoProveedor: '123',
        proveedorId: 'prov-1',
        proveedorNombre: 'Proveedor SAC',
        proveedorNumeroDocumento: '20999999999',
      }),
      categoriaNombre: 'Alquileres',
      establecimientoNombre: 'General',
      pagos: [],
      estadoPago: 'pendiente',
    });
    expect(html).toContain('Factura');
    expect(html).not.toContain('>01<');
    expect(html).toContain('F001-123');
  });

  it('muestra "Sin documento" cuando el gasto no tiene documento sustentatorio', () => {
    const html = renderizar({
      gasto: crearGastoFixture({ beneficiario: 'Movilidad varios' }),
      categoriaNombre: 'Movilidad',
      establecimientoNombre: 'General',
      pagos: [],
      estadoPago: 'pendiente',
    });
    expect(html).toContain('Sin documento');
    expect(html).toContain('Movilidad varios');
  });

  it('incluye importes: moneda, subtotal, impuesto, tratamiento tributario, total e importe reconocido', () => {
    const html = renderizar({
      gasto: crearGastoFixture({ tratamientoImpuesto: 'no_recuperable' }),
      categoriaNombre: 'Alquileres',
      establecimientoNombre: 'General',
      pagos: [],
      estadoPago: 'pendiente',
    });
    expect(html).toContain('PEN');
    expect(html).toContain('Impuesto no recuperable');
  });

  it('incluye el cronograma de cuotas cuando el gasto tiene crédito configurado', () => {
    const html = renderizar({
      gasto: crearGastoFixture({
        condicionPago: 'credito',
        formaPagoMetodoId: 'metodo-credito-1',
        creditTerms: {
          fechaVencimientoGlobal: '2026-09-01',
          schedule: [
            { numeroCuota: 1, fechaVencimiento: '2026-08-01', importe: 59, dias: 30 },
            { numeroCuota: 2, fechaVencimiento: '2026-09-01', importe: 59, dias: 60 },
          ],
        },
      }),
      categoriaNombre: 'Alquileres',
      establecimientoNombre: 'General',
      pagos: [],
      estadoPago: 'pendiente',
    });
    expect(html).toContain('Cuota 1');
    expect(html).toContain('Cuota 2');
  });

  it('incluye los pagos PG relacionados y sus medios de pago', () => {
    const pago: PagoCompra = {
      id: 'pago-1',
      numeroPago: 'PG-00000005',
      tipoOrigen: 'gasto',
      fechaPago: '2026-07-05',
      proveedorId: 'prov-1',
      proveedorNombre: 'Proveedor SAC',
      moneda: 'PEN',
      montoTotalPagado: 118,
      mediosPago: [{ id: 'medio-1', medioPagoCodigo: 'efectivo', medioPagoNombre: 'Efectivo', monto: 118, referenciaOperacion: 'OP-1' }],
      cuentasPorPagarAplicadas: ['cxp-1'],
      comprobantesCompraAplicados: [],
      estadoDocumento: 'registrado',
      historial: [],
      fechaCreacion: '2026-07-05T10:00:00.000Z',
    };
    const html = renderizar({
      gasto: crearGastoFixture({ pagosRelacionados: ['pago-1'] }),
      categoriaNombre: 'Alquileres',
      establecimientoNombre: 'General',
      pagos: [pago],
      estadoPago: 'pagado',
    });
    expect(html).toContain('PG-00000005');
    expect(html).toContain('Efectivo');
    expect(html).toContain('OP-1');
  });

  it('incluye el saldo pendiente de la Cuenta por Pagar asociada', () => {
    const cxp: CuentaPorPagar = {
      id: 'cxp-1',
      tipoOrigen: 'gasto',
      documentoOrigenId: 'gasto-1',
      comprobanteCompraId: '',
      comprobanteCompraNumero: '',
      tipoComprobanteOrigen: '',
      proveedorId: '',
      proveedorNombre: 'Proveedor SAC',
      proveedorNumeroDocumento: '',
      moneda: 'PEN',
      total: 118,
      totalPagado: 68,
      saldoPendiente: 50,
      formaPago: 'contado',
      fechaEmision: '2026-07-01',
      estadoPago: 'parcial',
      estadoVencimiento: 'vigente',
      pagosRelacionados: [],
      historial: [],
      fechaCreacion: '2026-07-01T00:00:00.000Z',
      fechaActualizacion: '2026-07-01T00:00:00.000Z',
    };
    const html = renderizar({
      gasto: crearGastoFixture(),
      categoriaNombre: 'Alquileres',
      establecimientoNombre: 'General',
      cuentaPorPagar: cxp,
      pagos: [],
      estadoPago: 'parcial',
    });
    expect(html).toContain('Saldo pendiente');
  });

  it('incluye observaciones, adjuntos referenciados, usuario creador e historial básico', () => {
    const html = renderizar({
      gasto: crearGastoFixture({
        observaciones: 'Pago correspondiente a julio',
        creadoPor: 'jperez',
        adjuntos: [{ id: 'adj-1', tipoAdjunto: 'factura_proveedor', nombreArchivo: 'factura.pdf', tipoArchivo: 'application/pdf', fechaCarga: '2026-07-01' }],
        historial: [{ fecha: '2026-07-01', usuario: 'jperez', accion: 'Registrado', detalle: 'Gasto registrado' }],
      }),
      categoriaNombre: 'Alquileres',
      establecimientoNombre: 'General',
      pagos: [],
      estadoPago: 'pendiente',
    });
    expect(html).toContain('Pago correspondiente a julio');
    expect(html).toContain('factura.pdf');
    expect(html).toContain('jperez');
    expect(html).toContain('Registrado');
  });

  it('un gasto anulado muestra el estado y el motivo de anulación', () => {
    const html = renderizar({
      gasto: crearGastoFixture({
        estadoDocumento: 'anulado',
        motivoAnulacion: 'Registrado por error',
        fechaAnulacion: '2026-07-02',
        anuladoPor: 'jperez',
      }),
      categoriaNombre: 'Alquileres',
      establecimientoNombre: 'General',
      pagos: [],
      estadoPago: 'pendiente',
    });
    expect(html).toContain('Anulado');
    expect(html).toContain('Registrado por error');
  });
});
