import { describe, it, expect } from 'vitest';
import {
  proyectarFilasGastosOperativos,
  filtrarFilasGastosOperativos,
  calcularIndicadoresGastosOperativos,
  agruparFilasGastosOperativos,
  construirFilaExcelGastoOperativo,
  CLAVES_EXCEL_GASTOS_OPERATIVOS,
  type ParametrosProyeccionGastos,
  type FilaGastoOperativo,
} from './consultaGastosOperativos.service';
import type { Gasto } from '../modelos/Gasto';
import type { CuentaPorPagar } from '../../compras/modelos/CuentaPorPagar';
import type { PagoCompra } from '../../compras/modelos/PagoCompra';
import { MOTIVO_DESCARTE_BORRADOR_GASTO } from './servicioGasto';

function crearGastoFixture(overrides: Partial<Gasto> = {}): Gasto {
  return {
    id: 'gasto-1',
    referenciaInterna: 'GTO-00000001',
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

function crearPagoFixture(overrides: Partial<PagoCompra> = {}): PagoCompra {
  return {
    id: 'pago-1',
    numeroPago: 'PG01-00000001',
    tipoOrigen: 'gasto',
    fechaPago: '2026-07-15',
    proveedorId: '',
    proveedorNombre: 'Inmobiliaria XYZ',
    moneda: 'PEN',
    montoTotalPagado: 118,
    mediosPago: [],
    cuentasPorPagarAplicadas: ['cxp-1'],
    comprobantesCompraAplicados: [],
    estadoDocumento: 'registrado',
    historial: [],
    fechaCreacion: '2026-07-15T00:00:00.000Z',
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

  it('estadoPresentado/estadoClase resuelven la columna "Estado" única (§8 de la corrección final) sin fusionar las fuentes internas', () => {
    const filaPendiente = proyectar({ gastos: [crearGastoFixture()], cuentasPorPagar: [crearCxPFixture({ estadoPago: 'pendiente' })] })[0];
    expect(filaPendiente.estadoPresentado).toBe('Pendiente');
    expect(filaPendiente.estadoDocumento).toBe('registrado');
    expect(filaPendiente.estadoPago).toBe('pendiente');

    const filaBorrador = proyectar({ gastos: [crearGastoFixture({ estadoDocumento: 'borrador', cuentaPorPagarId: undefined })], cuentasPorPagar: [] })[0];
    expect(filaBorrador.estadoPresentado).toBe('Borrador');
    expect(filaBorrador.estadoClase).not.toBe(filaPendiente.estadoClase);
  });

  it('excluye gastos fuera del periodo, filtrando por fecha de RECONOCIMIENTO (nunca por fecha de pago)', () => {
    const filas = proyectar({
      gastos: [crearGastoFixture({ fechaReconocimiento: '2026-06-30' })],
      cuentasPorPagar: [crearCxPFixture()],
    });
    expect(filas).toHaveLength(0);
  });

  it('periodo con desde/hasta vacíos ("Todas las fechas", default de la corrección §5): no excluye ningún gasto por fecha', () => {
    const filas = proyectar({
      gastos: [
        crearGastoFixture({ id: 'g1', fechaReconocimiento: '2020-01-01' }),
        crearGastoFixture({ id: 'g2', fechaReconocimiento: '2030-12-31', cuentaPorPagarId: 'cxp-1' }),
      ],
      cuentasPorPagar: [crearCxPFixture()],
      periodo: { desde: '', hasta: '' },
    });
    expect(filas).toHaveLength(2);
  });

  it('un gasto general (sin establecimientoId) se etiqueta "Toda la empresa" y nunca se prorratea entre establecimientos', () => {
    const filas = proyectar({
      gastos: [crearGastoFixture({ establecimientoId: undefined })],
      cuentasPorPagar: [crearCxPFixture()],
    });
    expect(filas[0].establecimientoNombre).toBe('Toda la empresa');
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
  it('sin filtro de estado documental, incluye anulados (el listado operativo los muestra por defecto — §4 de la corrección)', () => {
    const filas = proyectar({
      gastos: [
        crearGastoFixture({ id: 'g1', estadoDocumento: 'registrado' }),
        crearGastoFixture({ id: 'g2', estadoDocumento: 'anulado', cuentaPorPagarId: 'cxp-1' }),
      ],
      cuentasPorPagar: [crearCxPFixture()],
    });
    expect(filtrarFilasGastosOperativos(filas, {})).toHaveLength(2);
    expect(filtrarFilasGastosOperativos(filas, { estadoDocumento: 'anulado' })).toHaveLength(1);
    expect(filtrarFilasGastosOperativos(filas, { estadoDocumento: 'registrado' })).toHaveLength(1);
  });

  it('un borrador descartado nunca aparece en el listado operativo — ni sin filtro ni al filtrar por estadoDocumento "anulado" (§9 de la corrección final, más estricto que la corrección puntual previa)', () => {
    const filas = proyectar({
      gastos: [
        crearGastoFixture({ id: 'g1', estadoDocumento: 'registrado' }),
        crearGastoFixture({ id: 'g2', estadoDocumento: 'anulado', motivoAnulacion: 'Gasto duplicado', cuentaPorPagarId: 'cxp-1' }),
        crearGastoFixture({ id: 'g3', estadoDocumento: 'anulado', motivoAnulacion: MOTIVO_DESCARTE_BORRADOR_GASTO, cuentaPorPagarId: undefined }),
      ],
      cuentasPorPagar: [crearCxPFixture()],
    });
    expect(filtrarFilasGastosOperativos(filas, {}).map((f) => f.gastoId)).toEqual(['g1', 'g2']);
    const soloAnulados = filtrarFilasGastosOperativos(filas, { estadoDocumento: 'anulado' });
    expect(soloAnulados.map((f) => f.gastoId)).toEqual(['g2']);
  });

  it('filtra por categoría', () => {
    const filas = proyectar({
      gastos: [crearGastoFixture({ id: 'g1', categoriaId: 'cat-1' }), crearGastoFixture({ id: 'g2', categoriaId: 'cat-otra', cuentaPorPagarId: 'cxp-1' })],
      cuentasPorPagar: [crearCxPFixture()],
    });
    expect(filtrarFilasGastosOperativos(filas, { categoriaId: 'cat-1' })).toHaveLength(1);
  });

  it('filtra por proveedor (§6 de la corrección — filtro movido a Filtros)', () => {
    const filas = proyectar({
      gastos: [
        crearGastoFixture({ id: 'g1', proveedorId: 'prov-1', beneficiario: undefined, proveedorNombre: 'Proveedor A' }),
        crearGastoFixture({ id: 'g2', proveedorId: 'prov-2', beneficiario: undefined, proveedorNombre: 'Proveedor B', cuentaPorPagarId: 'cxp-1' }),
      ],
      cuentasPorPagar: [crearCxPFixture()],
    });
    expect(filtrarFilasGastosOperativos(filas, { proveedorId: 'prov-1' })).toHaveLength(1);
  });

  it('filtra por condición de pago', () => {
    const filas = proyectar({
      gastos: [
        crearGastoFixture({ id: 'g1', condicionPago: 'contado' }),
        crearGastoFixture({ id: 'g2', condicionPago: 'credito', fechaVencimiento: '2026-08-15', cuentaPorPagarId: 'cxp-1' }),
      ],
      cuentasPorPagar: [crearCxPFixture()],
    });
    expect(filtrarFilasGastosOperativos(filas, { condicionPago: 'credito' })).toHaveLength(1);
  });

  it('filtra por moneda', () => {
    const filas = proyectar({
      gastos: [
        crearGastoFixture({ id: 'g1', moneda: 'PEN' }),
        crearGastoFixture({ id: 'g2', moneda: 'USD', tipoCambio: 3.8, cuentaPorPagarId: 'cxp-1' }),
      ],
      cuentasPorPagar: [crearCxPFixture()],
    });
    expect(filtrarFilasGastosOperativos(filas, { moneda: 'USD' })).toHaveLength(1);
  });

  it('la búsqueda encuentra por referencia interna del gasto', () => {
    const filas = proyectar({ gastos: [crearGastoFixture({ referenciaInterna: 'GTO-00000042' })], cuentasPorPagar: [crearCxPFixture()] });
    expect(filtrarFilasGastosOperativos(filas, { busqueda: 'GTO-00000042' })).toHaveLength(1);
  });

  it('la búsqueda encuentra por RUC/documento del proveedor', () => {
    const filas = proyectar({ gastos: [crearGastoFixture({ proveedorNumeroDocumento: '20123456789' })], cuentasPorPagar: [crearCxPFixture()] });
    expect(filtrarFilasGastosOperativos(filas, { busqueda: '20123456789' })).toHaveLength(1);
  });

  it('la búsqueda encuentra por serie y número del documento sustentatorio', () => {
    const filas = proyectar({
      gastos: [crearGastoFixture({ serieDocumentoProveedor: 'F001', numeroDocumentoProveedor: '000123' })],
      cuentasPorPagar: [crearCxPFixture()],
    });
    expect(filtrarFilasGastosOperativos(filas, { busqueda: '000123' })).toHaveLength(1);
  });

  it('la búsqueda encuentra por número de pago PG relacionado', () => {
    const gasto = crearGastoFixture({ pagosRelacionados: ['pago-1'] });
    const cxp = crearCxPFixture({ estadoPago: 'pagada' });
    const pago = { id: 'pago-1', numeroPago: 'PG01-00000007' } as PagoCompra;
    const filas = proyectarFilasGastosOperativos({
      gastos: [gasto], cuentasPorPagar: [cxp], pagos: [pago], categorias, establecimientos, monedaBase: 'PEN', periodo,
    });
    expect(filas[0].numerosPago).toEqual(['PG01-00000007']);
    expect(filtrarFilasGastosOperativos(filas, { busqueda: 'PG01-00000007' })).toHaveLength(1);
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

describe('construirFilaExcelGastoOperativo (§15/§22-G de la corrección — mapeo exacto, sin desplazamiento de columnas)', () => {
  function proyectarUnaFila(gasto: Gasto, cxp?: CuentaPorPagar): FilaGastoOperativo {
    const filas = proyectar({ gastos: [gasto], cuentasPorPagar: cxp ? [cxp] : [] });
    return filas[0];
  }

  it('el tipo de documento se traduce SIEMPRE — nunca el código SUNAT crudo', () => {
    const gasto = crearGastoFixture({ tipoDocumento: '01', serieDocumentoProveedor: 'F001', numeroDocumentoProveedor: '123' });
    const fila = construirFilaExcelGastoOperativo(proyectarUnaFila(gasto), gasto, undefined, 'PEN');
    expect(fila.tipoDocumento).toBe('Factura');
    expect(fila.tipoDocumento).not.toBe('01');
  });

  it('sin documento, exporta "Sin documento" — nunca un código ni un guion suelto', () => {
    const gasto = crearGastoFixture({ tipoDocumento: undefined });
    const fila = construirFilaExcelGastoOperativo(proyectarUnaFila(gasto), gasto, undefined, 'PEN');
    expect(fila.tipoDocumento).toBe('Sin documento');
  });

  it('sin documento (tipoDocumento ausente), Serie y Número quedan en blanco — nunca un residuo de serie/número cargado y luego quitado (corrección final puntual §3.1-B)', () => {
    const gasto = crearGastoFixture({ tipoDocumento: undefined, serieDocumentoProveedor: 'F001', numeroDocumentoProveedor: '123' });
    const fila = construirFilaExcelGastoOperativo(proyectarUnaFila(gasto), gasto, undefined, 'PEN');
    expect(fila.serie).toBe('');
    expect(fila.numero).toBe('');
  });

  it('documento con tipo, serie y número completos exporta los tres valores reales', () => {
    const gasto = crearGastoFixture({ tipoDocumento: '01', serieDocumentoProveedor: 'F001', numeroDocumentoProveedor: '123' });
    const fila = construirFilaExcelGastoOperativo(proyectarUnaFila(gasto), gasto, undefined, 'PEN');
    expect(fila.tipoDocumento).toBe('Factura');
    expect(fila.serie).toBe('F001');
    expect(fila.numero).toBe('123');
  });

  it('documento sin serie (solo número) exporta la serie en blanco, nunca un guion ni un valor inventado', () => {
    const gasto = crearGastoFixture({ tipoDocumento: '03', serieDocumentoProveedor: undefined, numeroDocumentoProveedor: '456' });
    const fila = construirFilaExcelGastoOperativo(proyectarUnaFila(gasto), gasto, undefined, 'PEN');
    expect(fila.serie).toBe('');
    expect(fila.numero).toBe('456');
  });

  it('números PG: vacío cuando no hay pagos, nunca un código de tipo de documento', () => {
    const gasto = crearGastoFixture({ tipoDocumento: '32', pagosRelacionados: [] });
    const fila = construirFilaExcelGastoOperativo(proyectarUnaFila(gasto), gasto, undefined, 'PEN');
    expect(fila.numerosPago).toBe('');
    expect(fila.numerosPago).not.toBe('32');
  });

  it('números PG: reales y separados cuando existen pagos', () => {
    const gasto = crearGastoFixture({ pagosRelacionados: ['pago-1', 'pago-2'] });
    const filaProyectada = proyectar({
      gastos: [gasto],
      cuentasPorPagar: [],
      pagos: [
        crearPagoFixture({ id: 'pago-1', numeroPago: 'PG01-00000001' }),
        crearPagoFixture({ id: 'pago-2', numeroPago: 'PG01-00000002' }),
      ],
    })[0];
    const fila = construirFilaExcelGastoOperativo(filaProyectada, gasto, undefined, 'PEN');
    expect(fila.numerosPago).toBe('PG01-00000001, PG01-00000002');
  });

  it('RUC exporta el documento real del proveedor, nunca un código de tipo de documento', () => {
    const gasto = crearGastoFixture({ proveedorNumeroDocumento: '20123456789', tipoDocumento: '01' });
    const fila = construirFilaExcelGastoOperativo(proyectarUnaFila(gasto), gasto, undefined, 'PEN');
    expect(fila.ruc).toBe('20123456789');
  });

  it('RUC vacío cuando el gasto no tiene documento de proveedor', () => {
    const gasto = crearGastoFixture({ proveedorNumeroDocumento: undefined, beneficiario: 'Movilidad varios' });
    const fila = construirFilaExcelGastoOperativo(proyectarUnaFila(gasto), gasto, undefined, 'PEN');
    expect(fila.ruc).toBe('');
  });

  it('usuario exporta el creador real del gasto, nunca un valor de una columna vecina', () => {
    const gasto = crearGastoFixture({ creadoPor: 'jperez' });
    const fila = construirFilaExcelGastoOperativo(proyectarUnaFila(gasto), gasto, undefined, 'PEN');
    expect(fila.usuario).toBe('jperez');
  });

  it('usuario con nombre visible completo se exporta tal cual (nombre visible del usuario)', () => {
    const gasto = crearGastoFixture({ creadoPor: 'Juan Pérez' });
    const fila = construirFilaExcelGastoOperativo(proyectarUnaFila(gasto), gasto, undefined, 'PEN');
    expect(fila.usuario).toBe('Juan Pérez');
  });

  it('usuario solo con correo (sin nombre resuelto) se exporta tal cual — nunca un ID técnico', () => {
    const gasto = crearGastoFixture({ creadoPor: 'juan.perez@empresa.com' });
    const fila = construirFilaExcelGastoOperativo(proyectarUnaFila(gasto), gasto, undefined, 'PEN');
    expect(fila.usuario).toBe('juan.perez@empresa.com');
  });

  it('usuario NO resoluble (creadoPor ausente) exporta la etiqueta neutral "Usuario del sistema" — nunca un ID técnico ni un valor vacío ambiguo (corrección final puntual §3.3)', () => {
    const gasto = crearGastoFixture({ creadoPor: undefined });
    const fila = construirFilaExcelGastoOperativo(proyectarUnaFila(gasto), gasto, undefined, 'PEN');
    expect(fila.usuario).toBe('Usuario del sistema');
  });

  it('usuario con una cadena solo de espacios se trata como no resoluble — nunca una celda visualmente vacía sin explicación', () => {
    const gasto = crearGastoFixture({ creadoPor: '   ' });
    const fila = construirFilaExcelGastoOperativo(proyectarUnaFila(gasto), gasto, undefined, 'PEN');
    expect(fila.usuario).toBe('Usuario del sistema');
  });

  it('moneda original y moneda base son columnas separadas y explícitas', () => {
    const gasto = crearGastoFixture({ moneda: 'USD', tipoCambio: 3.8, total: 100, subtotal: 100 });
    const fila = construirFilaExcelGastoOperativo(proyectarUnaFila(gasto), gasto, undefined, 'PEN');
    expect(fila.moneda).toBe('USD');
    expect(fila.monedaBase).toBe('PEN');
  });

  it('fechas reales de Excel (objetos Date), nunca cadenas de texto', () => {
    const gasto = crearGastoFixture({ fechaReconocimiento: '2026-07-15', fechaCreacion: '2026-07-15T14:30:00.000Z' });
    const fila = construirFilaExcelGastoOperativo(proyectarUnaFila(gasto), gasto, undefined, 'PEN');
    expect(fila.fecha).toBeInstanceOf(Date);
    expect(fila.fechaRegistro).toBeInstanceOf(Date);
  });

  it('un registro nocturno de Lima (21:46, que en UTC ya pertenece al día siguiente) exporta la fecha/hora de NEGOCIO real, nunca el instante UTC crudo (corrección final puntual §3.4)', () => {
    // 2026-08-03 21:46 hora de Lima (UTC-5) equivale a 2026-08-04 02:46 UTC —
    // el bug confirmado mostraba esta segunda fecha; el Excel debe mostrar la primera.
    const gasto = crearGastoFixture({ fechaCreacion: '2026-08-03T21:46:00.000-05:00' });
    const fila = construirFilaExcelGastoOperativo(proyectarUnaFila(gasto), gasto, undefined, 'PEN');
    const fechaRegistro = fila.fechaRegistro as Date;
    // Se leen los getters UTC porque `fechaHoraRegistroAExcel` construye el
    // Date "anclando" los componentes de negocio como si fueran UTC — así es
    // como ExcelJS calcula el número de serie de fecha que Excel muestra.
    expect(fechaRegistro.getUTCFullYear()).toBe(2026);
    expect(fechaRegistro.getUTCMonth()).toBe(7); // agosto, 0-indexado
    expect(fechaRegistro.getUTCDate()).toBe(3); // NUNCA el 4 (día siguiente en UTC)
    expect(fechaRegistro.getUTCHours()).toBe(21);
    expect(fechaRegistro.getUTCMinutes()).toBe(46);
  });

  it('un registro creado con fechaCreacion en formato UTC "Z" (convención previa a esta corrección) también se exporta en hora de negocio de Lima, nunca en UTC crudo', () => {
    // 2026-08-04T02:46:00.000Z (UTC) equivale a 2026-08-03 21:46 en Lima.
    const gasto = crearGastoFixture({ fechaCreacion: '2026-08-04T02:46:00.000Z' });
    const fila = construirFilaExcelGastoOperativo(proyectarUnaFila(gasto), gasto, undefined, 'PEN');
    const fechaRegistro = fila.fechaRegistro as Date;
    expect(fechaRegistro.getUTCDate()).toBe(3);
    expect(fechaRegistro.getUTCHours()).toBe(21);
    expect(fechaRegistro.getUTCMinutes()).toBe(46);
  });

  it('la fecha ECONÓMICA del gasto (fechaReconocimiento) nunca se desplaza de día por conversión de huso horario, sin importar la hora de fechaCreacion', () => {
    const gasto = crearGastoFixture({ fechaReconocimiento: '2026-07-15', fechaCreacion: '2026-07-15T23:50:00.000-05:00' });
    const fila = construirFilaExcelGastoOperativo(proyectarUnaFila(gasto), gasto, undefined, 'PEN');
    const fecha = fila.fecha as Date;
    expect(fecha.getUTCFullYear()).toBe(2026);
    expect(fecha.getUTCMonth()).toBe(6); // julio, 0-indexado
    expect(fecha.getUTCDate()).toBe(15);
  });

  it('contado nunca aparece "Pendiente": el Estado único refleja el de la CxP (pagada tras pago inmediato, §10; columna consolidada en la corrección final puntual §3.5)', () => {
    const gasto = crearGastoFixture({ condicionPago: 'contado', cuentaPorPagarId: 'cxp-1' });
    const cxp = crearCxPFixture({ id: 'cxp-1', estadoPago: 'pagada', saldoPendiente: 0, totalPagado: 118 });
    const fila = construirFilaExcelGastoOperativo(proyectarUnaFila(gasto, cxp), gasto, cxp, 'PEN');
    expect(fila.estado).toBe('Pagado');
    expect(fila.condicionPago).toBe('Contado');
  });

  it('un gasto al CONTADO resuelve su forma de pago configurada en el Excel — nunca vacío (corrección técnica final §6)', () => {
    const gasto = crearGastoFixture({ condicionPago: 'contado', formaPagoMetodoId: 'metodo-transferencia' });
    const formasPagoPorId = new Map([['metodo-transferencia', 'Transferencia bancaria']]);
    const fila = construirFilaExcelGastoOperativo(proyectarUnaFila(gasto), gasto, undefined, 'PEN', formasPagoPorId);
    expect(fila.formaPago).toBe('Transferencia bancaria');
  });

  it('un borrador nunca muestra su identificador técnico feo en el Excel — usa la etiqueta humana (corrección de UX)', () => {
    const borrador = crearGastoFixture({ referenciaInterna: 'BORR-gasto-1700000000-abc123', estadoDocumento: 'borrador' });
    const fila = construirFilaExcelGastoOperativo(proyectarUnaFila(borrador), borrador, undefined, 'PEN');
    expect(fila.referenciaInterna).toBe('Sin serie · Sin correlativo');
    expect(fila.referenciaInterna).not.toContain('BORR-');
  });

  it('un borrador CON serie elegida muestra "G001 · Sin correlativo" en el Excel — MISMA presentación que el listado (corrección técnica final §11)', () => {
    const borrador = crearGastoFixture({ referenciaInterna: 'BORR-gasto-1700000000-abc123', estadoDocumento: 'borrador', serieId: 'series-gto-g001-est-1' });
    const filas = proyectar({ gastos: [borrador], cuentasPorPagar: [], series: [{ id: 'series-gto-g001-est-1', series: 'G001' }] });
    const fila = construirFilaExcelGastoOperativo(filas[0], borrador, undefined, 'PEN');
    expect(fila.referenciaInterna).toBe('G001 · Sin correlativo');
  });

  it('resuelve el nombre de la forma de pago configurada a partir del mapa provisto (§8/§22 — nunca solo la condición Contado/Crédito)', () => {
    const gasto = crearGastoFixture({ formaPagoMetodoId: 'metodo-1' });
    const formasPagoPorId = new Map([['metodo-1', 'Transferencia bancaria']]);
    const fila = construirFilaExcelGastoOperativo(proyectarUnaFila(gasto), gasto, undefined, 'PEN', formasPagoPorId);
    expect(fila.formaPago).toBe('Transferencia bancaria');
  });

  it('deja la forma de pago vacía cuando el gasto no tiene formaPagoMetodoId o no hay mapa provisto', () => {
    const gasto = crearGastoFixture();
    const fila = construirFilaExcelGastoOperativo(proyectarUnaFila(gasto), gasto, undefined, 'PEN');
    expect(fila.formaPago).toBe('');
  });

  describe('escenarios de exportación con fixtures reales (corrección final puntual §3.6)', () => {
    it('1. Borrador sin documento y sin pago: referencia "Sin serie · Sin correlativo", Estado "Borrador", sin documento ni PG', () => {
      const gasto = crearGastoFixture({ estadoDocumento: 'borrador', tipoDocumento: undefined, pagosRelacionados: [] });
      const fila = construirFilaExcelGastoOperativo(proyectarUnaFila(gasto), gasto, undefined, 'PEN');
      expect(fila.referenciaInterna).toBe('Sin serie · Sin correlativo');
      expect(fila.estado).toBe('Borrador');
      expect(fila.tipoDocumento).toBe('Sin documento');
      expect(fila.serie).toBe('');
      expect(fila.numero).toBe('');
      expect(fila.numerosPago).toBe('');
    });

    it('2. Registrado pendiente sin pago: Estado "Pendiente", sin PG relacionados', () => {
      const gasto = crearGastoFixture({ estadoDocumento: 'registrado', cuentaPorPagarId: 'cxp-1', pagosRelacionados: [] });
      const cxp = crearCxPFixture({ id: 'cxp-1', estadoPago: 'pendiente', totalPagado: 0, saldoPendiente: 118 });
      const fila = construirFilaExcelGastoOperativo(proyectarUnaFila(gasto, cxp), gasto, cxp, 'PEN');
      expect(fila.estado).toBe('Pendiente');
      expect(fila.numerosPago).toBe('');
      expect(fila.saldoPendiente).toBe(118);
    });

    it('3. Pagado con UN pago (un solo PG relacionado): Estado "Pagado", numerosPago con ese único número real', () => {
      const gasto = crearGastoFixture({ estadoDocumento: 'registrado', cuentaPorPagarId: 'cxp-1', pagosRelacionados: ['pago-1'] });
      const cxp = crearCxPFixture({ id: 'cxp-1', estadoPago: 'pagada', totalPagado: 118, saldoPendiente: 0 });
      const filaProyectada = proyectar({
        gastos: [gasto],
        cuentasPorPagar: [cxp],
        pagos: [crearPagoFixture({ id: 'pago-1', numeroPago: 'PG01-00000005' })],
      })[0];
      const fila = construirFilaExcelGastoOperativo(filaProyectada, gasto, cxp, 'PEN');
      expect(fila.estado).toBe('Pagado');
      expect(fila.numerosPago).toBe('PG01-00000005');
    });

    it('5. Gasto anulado conserva su referencia definitiva y muestra Estado "Anulado", sin importar el estado de pago histórico', () => {
      const gasto = crearGastoFixture({ estadoDocumento: 'anulado', referenciaInterna: 'GTO-00000009', motivoAnulacion: 'Gasto duplicado' });
      const fila = construirFilaExcelGastoOperativo(proyectarUnaFila(gasto), gasto, undefined, 'PEN');
      expect(fila.referenciaInterna).toBe('GTO-00000009');
      expect(fila.estado).toBe('Anulado');
    });
  });

  it('las claves de columnas están completas y sin duplicados (ninguna columna queda huérfana de su valor)', () => {
    const gasto = crearGastoFixture();
    const fila = construirFilaExcelGastoOperativo(proyectarUnaFila(gasto), gasto, undefined, 'PEN');
    const clavesUnicas = new Set(CLAVES_EXCEL_GASTOS_OPERATIVOS);
    expect(clavesUnicas.size).toBe(CLAVES_EXCEL_GASTOS_OPERATIVOS.length);
    for (const clave of CLAVES_EXCEL_GASTOS_OPERATIVOS) {
      expect(Object.prototype.hasOwnProperty.call(fila, clave)).toBe(true);
    }
  });
});

/**
 * GAS-P2-003: `RentabilidadVentasPage.tsx` releía `gastos`/`cuentasPorPagar`
 * solo una vez (`useMemo(() => cargarGastos(), [])`) — el indicador quedaba
 * congelado con el primer valor aunque el usuario registrara/editara/anulara
 * un gasto después. La corrección suscribe la página al evento real
 * `EVENTO_GASTOS_CAMBIADOS` (el mismo que ya usa `useCategoriasGasto.ts`) y
 * vuelve a llamar `cargarGastos()`/`cargarCuentasPorPagar()` cuando se
 * dispara — no se puede montar el componente React en este proyecto (sin
 * jsdom ni librería de testing de componentes), pero este bloque prueba con
 * las funciones REALES de producción que, dado un arreglo de gastos FRESCO
 * (exactamente lo que produce un nuevo `cargarGastos()` tras el evento), el
 * resultado operativo SÍ refleja el cambio — la mitad de la corrección que sí
 * es verificable sin un DOM real.
 */
describe('Reactividad del resultado operativo ante cambios en Gastos (GAS-P2-003)', () => {
  it('registrar un nuevo gasto y volver a proyectar con el arreglo actualizado incrementa los gastos operativos reconocidos', () => {
    const gastosAntes: Gasto[] = [];
    const indicadoresAntes = calcularIndicadoresGastosOperativos(proyectar({ gastos: gastosAntes }));
    expect(indicadoresAntes.gastosOperativosReconocidos).toBe(0);

    // Simula lo que `cargarGastos()` devolvería tras el evento
    // `gastos_cambiados` disparado al registrar un gasto nuevo.
    const gastosDespues: Gasto[] = [crearGastoFixture({ id: 'gasto-nuevo', total: 118 })];
    const indicadoresDespues = calcularIndicadoresGastosOperativos(proyectar({ gastos: gastosDespues }));
    expect(indicadoresDespues.gastosOperativosReconocidos).toBe(118);
  });

  it('editar el importe de un gasto ya existente y volver a proyectar refleja el nuevo total, no el original', () => {
    const gastoOriginal = crearGastoFixture({ id: 'gasto-1', total: 118, subtotal: 100, impuesto: 18 });
    const indicadoresAntes = calcularIndicadoresGastosOperativos(proyectar({ gastos: [gastoOriginal] }));
    expect(indicadoresAntes.gastosOperativosReconocidos).toBe(118);

    // Simula la relectura tras editar el gasto (mismo id, nuevo total) — lo
    // que `cargarGastos()` devolvería después de que `editarGasto` persista.
    const gastoEditado = crearGastoFixture({ id: 'gasto-1', total: 200, subtotal: 200, impuesto: 0, tratamientoImpuesto: 'sin_desglose' });
    const indicadoresDespues = calcularIndicadoresGastosOperativos(proyectar({ gastos: [gastoEditado] }));
    expect(indicadoresDespues.gastosOperativosReconocidos).toBe(200);
  });

  it('anular un gasto y volver a proyectar hace que deje de afectar el resultado (queda en 0, no en su total anterior)', () => {
    const gastoRegistrado = crearGastoFixture({ id: 'gasto-1', total: 118 });
    const indicadoresAntes = calcularIndicadoresGastosOperativos(proyectar({ gastos: [gastoRegistrado] }));
    expect(indicadoresAntes.gastosOperativosReconocidos).toBe(118);

    // Simula la relectura tras anular el gasto — lo que `cargarGastos()`
    // devolvería después de que `anularGasto` persista `estadoDocumento: 'anulado'`.
    const gastoAnulado = crearGastoFixture({ id: 'gasto-1', total: 118, estadoDocumento: 'anulado', motivoAnulacion: 'Gasto duplicado' });
    const filasDespues = proyectar({ gastos: [gastoAnulado] });
    const indicadoresDespues = calcularIndicadoresGastosOperativos(filasDespues);
    expect(indicadoresDespues.gastosOperativosReconocidos).toBe(0);
  });
});
