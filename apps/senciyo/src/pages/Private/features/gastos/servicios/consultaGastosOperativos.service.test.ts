import { describe, it, expect } from 'vitest';
import {
  proyectarFilasGastosOperativos,
  filtrarFilasGastosOperativos,
  calcularIndicadoresGastosOperativos,
  agruparFilasGastosOperativos,
  type ParametrosProyeccionGastos,
} from './consultaGastosOperativos.service';
import type { Gasto } from '../modelos/Gasto';
import type { CuentaPorPagar } from '../../compras/modelos/CuentaPorPagar';

function crearGastoFixture(overrides: Partial<Gasto> = {}): Gasto {
  return {
    id: 'gasto-1',
    empresaId: 'empresa-1',
    fechaReconocimiento: '2026-07-15',
    categoriaId: 'cat-1',
    concepto: 'Alquiler de julio',
    beneficiario: 'Inmobiliaria XYZ',
    moneda: 'PEN',
    subtotal: 100,
    impuesto: 18,
    total: 118,
    tratamientoImpuesto: 'no_recuperable',
    condicionPago: 'contado',
    cuentaPorPagarId: 'cxp-1',
    pagosRelacionados: [],
    adjuntos: [],
    estadoDocumento: 'registrado',
    historial: [],
    fechaCreacion: '2026-07-15T00:00:00.000Z',
    fechaActualizacion: '2026-07-15T00:00:00.000Z',
    ...overrides,
  };
}

function crearCxPFixture(overrides: Partial<CuentaPorPagar> = {}): CuentaPorPagar {
  return {
    id: 'cxp-1',
    tipoOrigen: 'gasto',
    documentoOrigenId: 'gasto-1',
    comprobanteCompraId: '',
    comprobanteCompraNumero: '',
    tipoComprobanteOrigen: '',
    proveedorId: '',
    proveedorNombre: 'Inmobiliaria XYZ',
    proveedorNumeroDocumento: '',
    moneda: 'PEN',
    total: 118,
    totalPagado: 0,
    saldoPendiente: 118,
    formaPago: 'contado',
    fechaEmision: '2026-07-15',
    estadoPago: 'pendiente',
    estadoVencimiento: 'vigente',
    pagosRelacionados: [],
    historial: [],
    fechaCreacion: '2026-07-15T00:00:00.000Z',
    fechaActualizacion: '2026-07-15T00:00:00.000Z',
    ...overrides,
  };
}

const categorias = new Map([['cat-1', 'Alquileres']]);
const establecimientos = new Map([['est-1', 'Tienda Centro']]);
const periodo = { desde: '2026-07-01', hasta: '2026-07-31' };

function proyectar(params: Partial<ParametrosProyeccionGastos>) {
  return proyectarFilasGastosOperativos({
    gastos: [],
    cuentasPorPagar: [],
    categorias,
    establecimientos,
    monedaBase: 'PEN',
    periodo,
    ...params,
  });
}

describe('proyectarFilasGastosOperativos (§20-D)', () => {
  it('incluye un gasto pendiente dentro del periodo', () => {
    const filas = proyectar({ gastos: [crearGastoFixture()], cuentasPorPagar: [crearCxPFixture({ estadoPago: 'pendiente' })] });
    expect(filas).toHaveLength(1);
    expect(filas[0].estadoPago).toBe('pendiente');
  });

  it('incluye un gasto ya pagado — como UNA sola fila, nunca duplicado por el hecho de pagarse', () => {
    const gasto = crearGastoFixture({ pagosRelacionados: ['pago-1', 'pago-2'] });
    const filas = proyectar({
      gastos: [gasto],
      cuentasPorPagar: [crearCxPFixture({ estadoPago: 'pagada', totalPagado: 118, saldoPendiente: 0 })],
    });
    expect(filas).toHaveLength(1);
    expect(filas[0].estadoPago).toBe('pagado');
    expect(filas[0].importeReconocidoBase).toBe(118);
  });

  it('excluye gastos fuera del periodo, filtrando por fecha de RECONOCIMIENTO (nunca por fecha de pago)', () => {
    const filas = proyectar({
      gastos: [crearGastoFixture({ fechaReconocimiento: '2026-06-30' })],
      cuentasPorPagar: [crearCxPFixture()],
    });
    expect(filas).toHaveLength(0);
  });

  it('un gasto general (sin establecimientoId) se etiqueta "General" y nunca se prorratea entre establecimientos', () => {
    const filas = proyectar({
      gastos: [crearGastoFixture({ establecimientoId: undefined })],
      cuentasPorPagar: [crearCxPFixture()],
    });
    expect(filas[0].establecimientoNombre).toBe('General');
  });

  it('un gasto general se EXCLUYE (nunca prorrateado) cuando se filtra por un establecimiento específico', () => {
    const filas = proyectar({
      gastos: [crearGastoFixture({ establecimientoId: undefined })],
      cuentasPorPagar: [crearCxPFixture()],
      establecimientoId: 'est-1',
    });
    expect(filas).toHaveLength(0);
  });

  it('un gasto asignado a un establecimiento se incluye al filtrar exactamente por ese establecimiento', () => {
    const filas = proyectar({
      gastos: [crearGastoFixture({ establecimientoId: 'est-1' })],
      cuentasPorPagar: [crearCxPFixture()],
      establecimientoId: 'est-1',
    });
    expect(filas).toHaveLength(1);
    expect(filas[0].establecimientoNombre).toBe('Tienda Centro');
  });

  it('impuesto recuperable: el importe reconocido usa el subtotal, no el total con impuesto', () => {
    const filas = proyectar({
      gastos: [crearGastoFixture({ tratamientoImpuesto: 'recuperable', subtotal: 100, total: 118 })],
      cuentasPorPagar: [crearCxPFixture()],
    });
    expect(filas[0].importeReconocidoBase).toBe(100);
  });

  it('un gasto anulado se proyecta con importeReconocidoBase = 0, sin importar el tratamiento del impuesto', () => {
    const filas = proyectar({
      gastos: [crearGastoFixture({ estadoDocumento: 'anulado', tratamientoImpuesto: 'no_recuperable' })],
      cuentasPorPagar: [crearCxPFixture()],
    });
    expect(filas[0].importeReconocidoBase).toBe(0);
  });

  it('sin CxP asociada (dato inconsistente), el estado de pago por defecto es "pendiente"', () => {
    const filas = proyectar({
      gastos: [crearGastoFixture({ cuentaPorPagarId: undefined })],
      cuentasPorPagar: [],
    });
    expect(filas[0].estadoPago).toBe('pendiente');
  });
});

describe('filtrarFilasGastosOperativos', () => {
  it('excluye anulados por defecto, salvo que se filtre explícitamente por ese estado documental', () => {
    const filas = proyectar({
      gastos: [
        crearGastoFixture({ id: 'g1', estadoDocumento: 'registrado' }),
        crearGastoFixture({ id: 'g2', estadoDocumento: 'anulado', cuentaPorPagarId: 'cxp-1' }),
      ],
      cuentasPorPagar: [crearCxPFixture()],
    });
    expect(filtrarFilasGastosOperativos(filas, {})).toHaveLength(1);
    expect(filtrarFilasGastosOperativos(filas, { estadoDocumento: 'anulado' })).toHaveLength(1);
  });

  it('filtra por categoría', () => {
    const filas = proyectar({
      gastos: [crearGastoFixture({ id: 'g1', categoriaId: 'cat-1' }), crearGastoFixture({ id: 'g2', categoriaId: 'cat-otra', cuentaPorPagarId: 'cxp-1' })],
      cuentasPorPagar: [crearCxPFixture()],
    });
    expect(filtrarFilasGastosOperativos(filas, { categoriaId: 'cat-1' })).toHaveLength(1);
  });
});

describe('calcularIndicadoresGastosOperativos (pendientes y pagados incluidos, cada uno una sola vez)', () => {
  it('suma el importe reconocido de gastos pendientes y pagados combinados', () => {
    const filas = proyectar({
      gastos: [
        crearGastoFixture({ id: 'g1' }),
        crearGastoFixture({ id: 'g2', total: 50, subtotal: 42.37, impuesto: 7.63, cuentaPorPagarId: 'cxp-2' }),
      ],
      cuentasPorPagar: [
        crearCxPFixture({ estadoPago: 'pendiente' }),
        crearCxPFixture({ id: 'cxp-2', estadoPago: 'pagada', total: 50, totalPagado: 50, saldoPendiente: 0 }),
      ],
    });
    const indicadores = calcularIndicadoresGastosOperativos(filas);
    expect(indicadores.gastosOperativosReconocidos).toBe(168);
    expect(indicadores.totalLineas).toBe(2);
  });

  it('gasto en moneda extranjera sin tipo de cambio: se excluye del total reconocido y se cuenta en lineasSinTipoCambio (nunca asumido en 1)', () => {
    const filas = proyectar({
      gastos: [crearGastoFixture({ moneda: 'USD', tipoCambio: undefined })],
      cuentasPorPagar: [crearCxPFixture({ moneda: 'USD' })],
    });
    const indicadores = calcularIndicadoresGastosOperativos(filas);
    expect(indicadores.gastosOperativosReconocidos).toBe(0);
    expect(indicadores.lineasSinTipoCambio).toBe(1);
  });

  it('gasto en moneda extranjera CON tipo de cambio válido se convierte a moneda base', () => {
    const filas = proyectar({
      gastos: [crearGastoFixture({ moneda: 'USD', tipoCambio: 3.8, total: 100, subtotal: 84.75, impuesto: 15.25 })],
      cuentasPorPagar: [crearCxPFixture({ moneda: 'USD' })],
    });
    const indicadores = calcularIndicadoresGastosOperativos(filas);
    expect(indicadores.gastosOperativosReconocidos).toBe(380);
    expect(indicadores.lineasSinTipoCambio).toBe(0);
  });
});

describe('agruparFilasGastosOperativos', () => {
  it('agrupa por categoría sumando el importe reconocido de cada gasto', () => {
    const filas = proyectar({
      gastos: [
        crearGastoFixture({ id: 'g1' }),
        crearGastoFixture({ id: 'g2', categoriaId: 'cat-1', total: 50, subtotal: 42.37, impuesto: 7.63, cuentaPorPagarId: 'cxp-2' }),
      ],
      cuentasPorPagar: [crearCxPFixture(), crearCxPFixture({ id: 'cxp-2' })],
    });
    const grupos = agruparFilasGastosOperativos(filas, 'categoria');
    expect(grupos).toHaveLength(1);
    expect(grupos[0].etiqueta).toBe('Alquileres');
    expect(grupos[0].cantidadFilas).toBe(2);
  });

  it('"sin_agrupar" devuelve una fila por gasto, sin combinar nada', () => {
    const filas = proyectar({
      gastos: [crearGastoFixture({ id: 'g1' }), crearGastoFixture({ id: 'g2', cuentaPorPagarId: 'cxp-2' })],
      cuentasPorPagar: [crearCxPFixture(), crearCxPFixture({ id: 'cxp-2' })],
    });
    expect(agruparFilasGastosOperativos(filas, 'sin_agrupar')).toHaveLength(2);
  });
});
