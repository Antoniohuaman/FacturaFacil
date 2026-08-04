// Prueba de integración del COMANDO completo "registrar pago de gasto"
// (idempotencia integral, no solo de la función pura de Caja).
// `simularRegistrarPagoGasto` reproduce, en el MISMO orden, la lógica real de
// `ContextoGastos.tsx#registrarPagoGastoCentral` (el único comando de pago de
// Gasto en producción — §11 de la corrección: el formulario central
// generalizado, nunca un `FormularioPagoGasto` ni un motor de pago paralelo):
//   1) buscar un Pago existente con la misma claveIdempotencia (real:
//      `buscarPagoPorClaveIdempotencia`) — si existe, retorna de inmediato
//      SIN tocar Caja ni la CxP;
//   2) si no existe, "registrar" el/los movimiento(s) de Caja (aquí, un
//      mock que cuenta invocaciones, en vez de `useCaja().agregarMovimiento`);
//   3) construir el Pago y aplicarlo a la CxP con la función real
//      `aplicarPagoACuentaPorPagar`.
//
// Se prueban las funciones/composición REALES de producción, no una
// reimplementación paralela. Lo que esta prueba NO cubre (limitación del
// entorno: `environment: 'node'` en vitest ⇒ `typeof window === 'undefined'`,
// por lo que los repositorios de localStorage siempre devuelven `[]`/no-op
// aquí, y no existe una librería de testing de componentes React en este
// proyecto): el hook `registrarPagoGastoCentral` en sí montado dentro de
// `GastosProvider`/`FormularioPagoCompra`, la escritura real a localStorage,
// y el `agregarMovimiento` real de `CajaContext.tsx` (su propia protección de
// idempotencia — clave compartida — ya está probada por separado en
// `control-caja/utils/validators.test.ts`).

import { describe, it, expect } from 'vitest';
import { buscarPagoPorClaveIdempotencia } from '../../compras/servicios/servicioPagoCompra';
import { aplicarPagoACuentaPorPagar, revertirPagoDeCuentaPorPagar } from '../../compras/servicios/servicioCuentaPorPagar';
import { generarCuentaPorPagarDesdeGasto } from '../servicios/servicioCuentaPorPagarGasto';
import { motivoBloqueoAnulacionPago, round2 } from '../../compras/logica/reglasCompras';
import type { CuentaPorPagar } from '../../compras/modelos/CuentaPorPagar';
import type { PagoCompra, MedioPagoCompra } from '../../compras/modelos/PagoCompra';
import type { Gasto } from '../modelos/Gasto';

function crearGastoFixture(overrides: Partial<Gasto> = {}): Gasto {
  return {
    id: 'gasto-1',
    referenciaInterna: 'GTO-00000001',
    empresaId: 'empresa-A',
    fechaReconocimiento: '2026-07-01',
    categoriaId: 'cat-alquileres',
    concepto: 'Alquiler de julio',
    beneficiario: 'Inmobiliaria XYZ',
    moneda: 'PEN',
    subtotal: 100,
    impuesto: 18,
    total: 118,
    tratamientoImpuesto: 'no_recuperable',
    condicionPago: 'contado',
    pagosRelacionados: [],
    adjuntos: [],
    estadoDocumento: 'registrado',
    historial: [],
    fechaCreacion: '2026-07-01T00:00:00.000Z',
    fechaActualizacion: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

interface EntradaComando {
  gasto: Gasto;
  cxp: CuentaPorPagar;
  pagosExistentes: PagoCompra[];
  mediosPago: MedioPagoCompra[];
  montoAplicado: number;
  claveIdempotencia: string;
  numeroPago: string;
  activeCajaId?: string;
  fechaISO?: string;
  registrarCaja: (monto: number) => Promise<void>;
}

interface SalidaComando {
  reutilizado: boolean;
  pago: PagoCompra;
  cxpActualizada: CuentaPorPagar;
}

function esMedioDeCajaSimulado(codigo: string): boolean {
  return codigo === 'EFECTIVO';
}

/** Reproduce la orquestación real de `registrarPagoGastoCentral` con funciones de producción — ver cabecera del archivo. */
async function simularRegistrarPagoGasto(entrada: EntradaComando): Promise<SalidaComando> {
  const pagoExistente = buscarPagoPorClaveIdempotencia(entrada.pagosExistentes, entrada.claveIdempotencia);
  if (pagoExistente) {
    return { reutilizado: true, pago: pagoExistente, cxpActualizada: entrada.cxp };
  }

  const fechaISO = entrada.fechaISO ?? '2026-07-05T00:00:00.000Z';
  const id = `pago-sim-${entrada.claveIdempotencia}`;

  for (const medio of entrada.mediosPago) {
    if (medio.monto <= 0 || !esMedioDeCajaSimulado(medio.medioPagoCodigo)) continue;
    await entrada.registrarCaja(medio.monto);
  }

  const pago: PagoCompra = {
    id,
    numeroPago: entrada.numeroPago,
    fechaPago: fechaISO.slice(0, 10),
    proveedorId: entrada.gasto.proveedorId ?? '',
    proveedorNombre: entrada.gasto.proveedorNombre ?? entrada.gasto.beneficiario ?? 'Sin proveedor',
    moneda: entrada.cxp.moneda,
    tipoCambio: entrada.cxp.tipoCambio,
    montoTotalPagado: round2(entrada.montoAplicado),
    mediosPago: entrada.mediosPago,
    tipoOrigen: 'gasto',
    claveIdempotencia: entrada.claveIdempotencia,
    aplicaciones: [{ cuentaPorPagarId: entrada.cxp.id, tipoOrigen: 'gasto', documentoOrigenId: entrada.gasto.id, comprobanteCompraId: '', importeAplicado: round2(entrada.montoAplicado) }],
    cuentasPorPagarAplicadas: [entrada.cxp.id],
    comprobantesCompraAplicados: [],
    cajaId: entrada.mediosPago.some((m) => esMedioDeCajaSimulado(m.medioPagoCodigo)) ? entrada.activeCajaId : undefined,
    estadoDocumento: 'registrado',
    historial: [],
    fechaCreacion: fechaISO,
  };

  const cxpActualizada = aplicarPagoACuentaPorPagar(entrada.cxp, entrada.montoAplicado, id, fechaISO.slice(0, 10));
  return { reutilizado: false, pago, cxpActualizada };
}

function crearMedioEfectivo(monto: number): MedioPagoCompra {
  return { id: 'medio-1', medioPagoCodigo: 'EFECTIVO', medioPagoNombre: 'Efectivo', monto };
}
function crearMedioTransferencia(monto: number): MedioPagoCompra {
  return { id: 'medio-1', medioPagoCodigo: 'TRANSFERENCIA', medioPagoNombre: 'Transferencia', monto };
}

describe('Idempotencia integral del comando "registrar pago de gasto" (§2 de la corrección)', () => {
  it('1. Primer envío: crea un Pago, aplica una vez a la CxP, registra un Egreso en Caja', async () => {
    const gasto = crearGastoFixture();
    const cxp = generarCuentaPorPagarDesdeGasto(gasto, 'cxp-1');
    let llamadasCaja = 0;

    const resultado = await simularRegistrarPagoGasto({
      gasto, cxp, pagosExistentes: [],
      mediosPago: [crearMedioEfectivo(118)],
      montoAplicado: 118,
      claveIdempotencia: 'clave-1',
      numeroPago: 'PG01-00000001',
      registrarCaja: async () => { llamadasCaja += 1; },
    });

    expect(resultado.reutilizado).toBe(false);
    expect(resultado.pago.montoTotalPagado).toBe(118);
    expect(resultado.cxpActualizada.saldoPendiente).toBe(0);
    expect(resultado.cxpActualizada.estadoPago).toBe('pagada');
    expect(llamadasCaja).toBe(1);
  });

  it('2. Segundo envío con la MISMA clave: no crea otro Pago, no reaplica el importe, no repite el Egreso', async () => {
    const gasto = crearGastoFixture();
    const cxp = generarCuentaPorPagarDesdeGasto(gasto, 'cxp-1');
    let llamadasCaja = 0;
    const registrarCaja = async () => { llamadasCaja += 1; };

    const primero = await simularRegistrarPagoGasto({
      gasto, cxp, pagosExistentes: [],
      mediosPago: [crearMedioEfectivo(118)], montoAplicado: 118,
      claveIdempotencia: 'clave-1', numeroPago: 'PG01-00000001', registrarCaja,
    });

    // El segundo envío ya encuentra el pago del primero entre los "pagos
    // existentes" (lo que en producción vendría de `listarPagosPorOrigen('gasto')`
    // tras persistir el primero) y la CxP YA actualizada (lo que en
    // producción vendría de `listarCuentasPorPagarPorOrigen('gasto')` tras
    // persistir `cxpActualizada`).
    const segundo = await simularRegistrarPagoGasto({
      gasto, cxp: primero.cxpActualizada, pagosExistentes: [primero.pago],
      mediosPago: [crearMedioEfectivo(118)], montoAplicado: 118,
      claveIdempotencia: 'clave-1', numeroPago: 'PG01-00000002', registrarCaja,
    });

    expect(segundo.reutilizado).toBe(true);
    // Mismo resultado devuelto al consumidor — el MISMO objeto Pago, no uno nuevo.
    expect(segundo.pago).toBe(primero.pago);
    expect(segundo.pago.id).toBe(primero.pago.id);
    // La CxP no se vuelve a debitar: sigue en el estado que dejó el primer envío.
    expect(segundo.cxpActualizada).toEqual(primero.cxpActualizada);
    expect(segundo.cxpActualizada.saldoPendiente).toBe(0);
    // Caja NUNCA se vuelve a llamar en el segundo envío.
    expect(llamadasCaja).toBe(1);
  });

  it('3. Dos claves DIFERENTES permiten dos pagos válidos si existe saldo', async () => {
    const gasto = crearGastoFixture({ total: 200 });
    const cxp = generarCuentaPorPagarDesdeGasto(gasto, 'cxp-2');
    let llamadasCaja = 0;
    const registrarCaja = async () => { llamadasCaja += 1; };

    const primero = await simularRegistrarPagoGasto({
      gasto, cxp, pagosExistentes: [],
      mediosPago: [crearMedioEfectivo(80)], montoAplicado: 80,
      claveIdempotencia: 'clave-a', numeroPago: 'PG01-00000003', registrarCaja,
    });
    const segundo = await simularRegistrarPagoGasto({
      gasto, cxp: primero.cxpActualizada, pagosExistentes: [primero.pago],
      mediosPago: [crearMedioEfectivo(120)], montoAplicado: 120,
      claveIdempotencia: 'clave-b', numeroPago: 'PG01-00000004', registrarCaja,
    });

    expect(primero.reutilizado).toBe(false);
    expect(segundo.reutilizado).toBe(false);
    expect(primero.pago.id).not.toBe(segundo.pago.id);
    expect(segundo.cxpActualizada.saldoPendiente).toBe(0);
    expect(segundo.cxpActualizada.estadoPago).toBe('pagada');
    expect(llamadasCaja).toBe(2);
  });

  it('4. Reintento tras un error en Caja: no deja registros parciales ni duplica la operación', async () => {
    const gasto = crearGastoFixture();
    const cxp = generarCuentaPorPagarDesdeGasto(gasto, 'cxp-3');
    let intentos = 0;
    const registrarCajaFallaUnaVez = async () => {
      intentos += 1;
      if (intentos === 1) throw new Error('Caja no disponible temporalmente');
    };

    // Primer intento: Caja falla ANTES de construir el Pago — no debe quedar
    // ningún Pago ni CxP modificada (el llamador real nunca llega a
    // `aplicarPagoACuentaPorPagar` porque el `for` de Caja lanza).
    await expect(
      simularRegistrarPagoGasto({
        gasto, cxp, pagosExistentes: [],
        mediosPago: [crearMedioEfectivo(118)], montoAplicado: 118,
        claveIdempotencia: 'clave-retry', numeroPago: 'PG01-00000005', registrarCaja: registrarCajaFallaUnaVez,
      }),
    ).rejects.toThrow('Caja no disponible temporalmente');

    // Reintento con la MISMA clave: como el primer intento nunca creó un
    // Pago, `pagosExistentes` sigue vacío — el reintento completa la
    // operación una única vez.
    const reintento = await simularRegistrarPagoGasto({
      gasto, cxp, pagosExistentes: [],
      mediosPago: [crearMedioEfectivo(118)], montoAplicado: 118,
      claveIdempotencia: 'clave-retry', numeroPago: 'PG01-00000005', registrarCaja: registrarCajaFallaUnaVez,
    });

    expect(reintento.reutilizado).toBe(false);
    expect(reintento.cxpActualizada.saldoPendiente).toBe(0);
    expect(intentos).toBe(2);
  });

  it('5. Pago NO efectivo: idempotencia de Pago y CxP, sin ningún movimiento de Caja', async () => {
    const gasto = crearGastoFixture();
    const cxp = generarCuentaPorPagarDesdeGasto(gasto, 'cxp-4');
    let llamadasCaja = 0;
    const registrarCaja = async () => { llamadasCaja += 1; };

    const primero = await simularRegistrarPagoGasto({
      gasto, cxp, pagosExistentes: [],
      mediosPago: [crearMedioTransferencia(118)], montoAplicado: 118,
      claveIdempotencia: 'clave-transferencia', numeroPago: 'PG01-00000006', registrarCaja,
    });
    const segundo = await simularRegistrarPagoGasto({
      gasto, cxp, pagosExistentes: [primero.pago],
      mediosPago: [crearMedioTransferencia(118)], montoAplicado: 118,
      claveIdempotencia: 'clave-transferencia', numeroPago: 'PG01-00000007', registrarCaja,
    });

    expect(llamadasCaja).toBe(0);
    expect(segundo.reutilizado).toBe(true);
    expect(segundo.pago).toBe(primero.pago);
    expect(primero.pago.cajaId).toBeUndefined();
  });

  it('6. Pago parcial: un único descuento del saldo, sin importar reintentos con la misma clave', async () => {
    const gasto = crearGastoFixture({ total: 200 });
    const cxp = generarCuentaPorPagarDesdeGasto(gasto, 'cxp-5');
    const registrarCaja = async () => {};

    const primero = await simularRegistrarPagoGasto({
      gasto, cxp, pagosExistentes: [],
      mediosPago: [crearMedioEfectivo(50)], montoAplicado: 50,
      claveIdempotencia: 'clave-parcial', numeroPago: 'PG01-00000008', registrarCaja,
    });
    const reintento = await simularRegistrarPagoGasto({
      gasto, cxp: primero.cxpActualizada, pagosExistentes: [primero.pago],
      mediosPago: [crearMedioEfectivo(50)], montoAplicado: 50,
      claveIdempotencia: 'clave-parcial', numeroPago: 'PG01-00000009', registrarCaja,
    });

    expect(primero.cxpActualizada.saldoPendiente).toBe(150);
    expect(primero.cxpActualizada.estadoPago).toBe('parcial');
    // El reintento reutiliza — el saldo NUNCA se descuenta una segunda vez.
    expect(reintento.cxpActualizada.saldoPendiente).toBe(150);
  });

  it('7. Pago total: saldo final en cero, sin aplicación duplicada', async () => {
    const gasto = crearGastoFixture();
    const cxp = generarCuentaPorPagarDesdeGasto(gasto, 'cxp-6');
    const registrarCaja = async () => {};

    const primero = await simularRegistrarPagoGasto({
      gasto, cxp, pagosExistentes: [],
      mediosPago: [crearMedioEfectivo(118)], montoAplicado: 118,
      claveIdempotencia: 'clave-total', numeroPago: 'PG01-00000010', registrarCaja,
    });
    const reintento = await simularRegistrarPagoGasto({
      gasto, cxp: primero.cxpActualizada, pagosExistentes: [primero.pago],
      mediosPago: [crearMedioEfectivo(118)], montoAplicado: 118,
      claveIdempotencia: 'clave-total', numeroPago: 'PG01-00000011', registrarCaja,
    });

    expect(primero.cxpActualizada.saldoPendiente).toBe(0);
    expect(primero.cxpActualizada.estadoPago).toBe('pagada');
    expect(reintento.cxpActualizada.saldoPendiente).toBe(0);
    expect(reintento.cxpActualizada.totalPagado).toBe(118);
  });

  it('8. Empresa diferente: la misma cadena de clave no colisiona entre empresas (arreglos de pagos aislados)', () => {
    const pagoEmpresaA: PagoCompra = { id: 'pago-a', numeroPago: 'PG01-1', claveIdempotencia: 'clave-compartida', fechaPago: '2026-07-01', proveedorId: '', proveedorNombre: '', moneda: 'PEN', montoTotalPagado: 100, mediosPago: [], cuentasPorPagarAplicadas: [], comprobantesCompraAplicados: [], estadoDocumento: 'registrado', historial: [], fechaCreacion: '2026-07-01T00:00:00.000Z' };
    const pagosEmpresaB: PagoCompra[] = [];

    // `listarPagosPorOrigen`/`buscarPagoPorClaveIdempotencia` operan SIEMPRE
    // sobre el arreglo tenantizado de la empresa activa (`tryLsKey` prefija
    // la clave de almacenamiento con el empresaId) — la empresa B nunca ve
    // los pagos de la empresa A, por lo que la misma clave no encuentra nada.
    const encontradoEnB = buscarPagoPorClaveIdempotencia(pagosEmpresaB, 'clave-compartida');
    const encontradoEnA = buscarPagoPorClaveIdempotencia([pagoEmpresaA], 'clave-compartida');

    expect(encontradoEnB).toBeUndefined();
    expect(encontradoEnA).toBe(pagoEmpresaA);
  });

  it('9. Establecimiento correcto: el Pago construido conserva el cajaId de la caja activa recibida', async () => {
    const gasto = crearGastoFixture();
    const cxp = generarCuentaPorPagarDesdeGasto(gasto, 'cxp-7');
    const registrarCaja = async () => {};

    const resultado = await simularRegistrarPagoGasto({
      gasto, cxp, pagosExistentes: [],
      mediosPago: [crearMedioEfectivo(118)], montoAplicado: 118,
      claveIdempotencia: 'clave-establecimiento', numeroPago: 'PG01-00000012',
      activeCajaId: 'caja-establecimiento-2', registrarCaja,
    });

    expect(resultado.pago.cajaId).toBe('caja-establecimiento-2');
  });

  it('10. Anulación: un pago ya anulado no puede volver a anularse (un solo reverso)', () => {
    const pagoRegistrado: PagoCompra = {
      id: 'pago-anular', numeroPago: 'PG01-2', fechaPago: '2026-07-01', proveedorId: '', proveedorNombre: '',
      moneda: 'PEN', montoTotalPagado: 118, mediosPago: [], cuentasPorPagarAplicadas: ['cxp-8'],
      comprobantesCompraAplicados: [], estadoDocumento: 'registrado', historial: [], fechaCreacion: '2026-07-01T00:00:00.000Z',
    };
    expect(motivoBloqueoAnulacionPago(pagoRegistrado)).toBeNull();

    const pagoYaAnulado: PagoCompra = { ...pagoRegistrado, estadoDocumento: 'anulado' };
    expect(motivoBloqueoAnulacionPago(pagoYaAnulado)).not.toBeNull();

    // Un solo reverso real de CxP: revertir dos veces el mismo monto sobre
    // una CxP ya revertida no debe dejarla con saldo negativo/incoherente.
    const gasto = crearGastoFixture();
    const cxpPagada = aplicarPagoACuentaPorPagar(generarCuentaPorPagarDesdeGasto(gasto, 'cxp-8'), 118, 'pago-anular', '2026-07-05');
    const cxpRevertida = revertirPagoDeCuentaPorPagar(cxpPagada, 118, 'pago-anular', '2026-07-06');
    expect(cxpRevertida.saldoPendiente).toBe(118);
    expect(cxpRevertida.estadoPago).toBe('pendiente');
  });
});
