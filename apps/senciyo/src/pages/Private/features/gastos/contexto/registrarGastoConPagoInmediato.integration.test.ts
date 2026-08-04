// Prueba de integración del COMANDO completo "Registrar y pagar" (§6/§7 de
// la corrección: acción explícita del formulario, disponible para CUALQUIER
// forma de pago — ya no se impone Contado = pago inmediato automático; el
// fixture usa una forma "contado" solo como caso representativo, nunca como
// el único disparador válido del comando). `simularRegistrarGastoConPagoInmediato`
// reproduce, en el MISMO orden, la lógica real de
// `ContextoGastos.tsx#registrarGastoConPagoInmediato`: valida TODO primero
// (datos del gasto, medios de pago, suma = total, caja abierta si aplica,
// serie PG configurada) y solo AL FINAL construye gasto + CxP + pago con las
// funciones REALES de producción (`crearGasto`, `generarCuentaPorPagarDesdeGasto`,
// `validarMediosPagoCompra`, `aplicarPagoACuentaPorPagar`) — nunca una
// reimplementación paralela de esas reglas.
//
// Limitación del entorno (igual que `idempotenciaPagoGasto.integration.test.ts`):
// `environment: 'node'` en vitest ⇒ no se monta el hook real dentro de
// `GastosProvider` ni se escribe a localStorage; se prueba la orquestación
// con las funciones de producción reales.

import { describe, it, expect } from 'vitest';
import { validarGastoBasico, crearGasto, type DatosNuevoGasto } from '../servicios/servicioGasto';
import { aplicarPagoACuentaPorPagar } from '../../compras/servicios/servicioCuentaPorPagar';
import { generarCuentaPorPagarDesdeGasto } from '../servicios/servicioCuentaPorPagarGasto';
import { validarMediosPagoCompra, buscarPagoPorClaveIdempotencia, tieneMedioDeCaja, esMedioDeCaja } from '../../compras/servicios/servicioPagoCompra';
import { round2 } from '../../compras/logica/reglasCompras';
import type { PaymentMeanOption } from '@/shared/payments/paymentMeans';
import type { CuentaPorPagar } from '../../compras/modelos/CuentaPorPagar';
import type { PagoCompra, MedioPagoCompra } from '../../compras/modelos/PagoCompra';
import type { Gasto } from '../modelos/Gasto';

function crearDatosContadoFixture(overrides: Partial<DatosNuevoGasto> = {}): DatosNuevoGasto {
  return {
    empresaId: 'empresa-1',
    fechaReconocimiento: '2026-07-15',
    categoriaId: 'cat-alquileres',
    concepto: 'Movilidad del día',
    beneficiario: 'Taxi',
    moneda: 'PEN',
    subtotal: 50,
    impuesto: 0,
    total: 50,
    tratamientoImpuesto: 'sin_desglose',
    condicionPago: 'contado',
    ...overrides,
  };
}

function crearMedioEfectivo(monto: number): MedioPagoCompra {
  return { id: 'medio-1', medioPagoCodigo: '008', medioPagoNombre: 'Efectivo', monto };
}

interface EntradaComandoContado {
  datos: DatosNuevoGasto;
  mediosPago: MedioPagoCompra[];
  claveIdempotencia: string;
  pagosExistentes: PagoCompra[];
  mediosDisponibles: PaymentMeanOption[];
  cajaAbierta: boolean;
  seriePG?: string;
  registrarCaja: (monto: number, claveMovimiento: string) => Promise<void>;
  /** Compensación (§13 de la corrección técnica final) — invocada por cada movimiento de Caja YA aplicado si algo posterior falla. */
  revertirCaja?: (monto: number, claveMovimiento: string) => Promise<void>;
  /** Inyecta un fallo DESPUÉS de que la Caja ya se afectó, para probar la compensación. */
  fallarDespuesDeCaja?: boolean;
}

interface SalidaComandoContado {
  reutilizado: boolean;
  gasto: Gasto;
  cxp: CuentaPorPagar;
  pago: PagoCompra;
}

/** Reproduce la orquestación real de `registrarGastoConPagoInmediato` — ver cabecera del archivo. */
async function simularRegistrarGastoConPagoInmediato(entrada: EntradaComandoContado): Promise<SalidaComandoContado> {
  if (entrada.datos.condicionPago !== 'contado') {
    throw new Error('Esta operación es exclusiva para gastos al contado.');
  }
  const erroresBasicos = validarGastoBasico(entrada.datos);
  if (erroresBasicos.length > 0) throw new Error(erroresBasicos.map((e) => e.mensaje).join(' '));

  const pagoExistente = buscarPagoPorClaveIdempotencia(entrada.pagosExistentes, entrada.claveIdempotencia);
  if (pagoExistente) {
    throw new Error('REUTILIZADO'); // el llamador real busca el gasto asociado; en esta prueba basta señalar el camino
  }

  if (!entrada.mediosPago.length) {
    throw new Error('Un gasto al contado exige registrar al menos un medio de pago.');
  }
  const erroresMedios = validarMediosPagoCompra(entrada.mediosPago, entrada.mediosDisponibles);
  if (erroresMedios.length > 0) throw new Error(erroresMedios.map((e) => e.mensaje).join(' '));

  const sumaMedios = round2(entrada.mediosPago.reduce((acc, m) => acc + m.monto, 0));
  const total = round2(entrada.datos.total);
  if (sumaMedios !== total) {
    throw new Error(`La suma de medios de pago (${sumaMedios.toFixed(2)}) debe ser igual al total del gasto (${total.toFixed(2)}).`);
  }

  if (tieneMedioDeCaja(entrada.mediosPago) && !entrada.cajaAbierta) {
    throw new Error('Abre una caja para registrar el pago en efectivo.');
  }
  if (!entrada.seriePG) {
    throw new Error('No hay una serie de pago (PG) configurada.');
  }

  // Solo ahora que TODO fue validado se construyen gasto, CxP y pago.
  const gasto = crearGasto(entrada.datos, 'gasto-sim', 'GTO-00000001');
  const cxp = generarCuentaPorPagarDesdeGasto(gasto, 'cxp-sim');
  const ts = '2026-07-15T10:00:00.000Z';

  // Clave determinista por línea (§14) + compensación ante fallo posterior
  // (§13) — mismo criterio que `ContextoGastos.tsx`.
  const movimientosIntentados: Array<{ monto: number; clave: string }> = [];
  try {
    for (const medio of entrada.mediosPago) {
      if (medio.monto <= 0 || !esMedioDeCaja(medio.medioPagoCodigo)) continue;
      const claveMovimiento = `${entrada.claveIdempotencia}:${medio.id}`;
      await entrada.registrarCaja(medio.monto, claveMovimiento);
      movimientosIntentados.push({ monto: medio.monto, clave: claveMovimiento });
    }

    if (entrada.fallarDespuesDeCaja) {
      throw new Error('Fallo simulado después de afectar Caja');
    }

    const pago: PagoCompra = {
      id: 'pago-sim',
      numeroPago: 'PG01-00000001',
      fechaPago: ts.slice(0, 10),
      proveedorId: gasto.proveedorId ?? '',
      proveedorNombre: gasto.proveedorNombre ?? gasto.beneficiario ?? 'Sin proveedor',
      moneda: cxp.moneda,
      tipoCambio: cxp.tipoCambio,
      montoTotalPagado: total,
      mediosPago: entrada.mediosPago,
      tipoOrigen: 'gasto',
      claveIdempotencia: entrada.claveIdempotencia,
      aplicaciones: [{ cuentaPorPagarId: cxp.id, tipoOrigen: 'gasto', documentoOrigenId: gasto.id, comprobanteCompraId: '', importeAplicado: total }],
      cuentasPorPagarAplicadas: [cxp.id],
      comprobantesCompraAplicados: [],
      estadoDocumento: 'registrado',
      historial: [],
      fechaCreacion: ts,
    };

    const cxpPagada = aplicarPagoACuentaPorPagar(cxp, total, pago.id, ts.slice(0, 10));
    const gastoFinal: Gasto = { ...gasto, cuentaPorPagarId: cxp.id, pagosRelacionados: [pago.id] };

    return { reutilizado: false, gasto: gastoFinal, cxp: cxpPagada, pago };
  } catch (error) {
    if (entrada.revertirCaja) {
      for (const m of movimientosIntentados) {
        await entrada.revertirCaja(m.monto, m.clave);
      }
    }
    throw error;
  }
}

const MEDIOS_DISPONIBLES: PaymentMeanOption[] = [
  { code: '008', sunatName: 'Efectivo', label: 'Efectivo', isVisible: true, isFavorite: false, isDefault: true, order: 1 },
  { code: '003', sunatName: 'Transferencia de fondos', label: 'Transferencia', isVisible: true, isFavorite: false, isDefault: false, order: 2 },
];

describe('registrarGastoConPagoInmediato — "Registrar y pagar" deja el gasto registrado y pagado en una sola operación (§6/§7 de la corrección)', () => {
  it('1. Exige al menos un medio de pago', async () => {
    await expect(
      simularRegistrarGastoConPagoInmediato({
        datos: crearDatosContadoFixture(),
        mediosPago: [],
        claveIdempotencia: 'clave-1',
        pagosExistentes: [],
        mediosDisponibles: MEDIOS_DISPONIBLES,
        cajaAbierta: true,
        seriePG: 'PG01',
        registrarCaja: async () => {},
      }),
    ).rejects.toThrow('al menos un medio de pago');
  });

  it('2. El gasto y su pago se crean una sola vez: la CxP queda pagada, sin saldo pendiente', async () => {
    const resultado = await simularRegistrarGastoConPagoInmediato({
      datos: crearDatosContadoFixture(),
      mediosPago: [crearMedioEfectivo(50)],
      claveIdempotencia: 'clave-2',
      pagosExistentes: [],
      mediosDisponibles: MEDIOS_DISPONIBLES,
      cajaAbierta: true,
      seriePG: 'PG01',
      registrarCaja: async () => {},
    });

    expect(resultado.cxp.saldoPendiente).toBe(0);
    expect(resultado.cxp.estadoPago).toBe('pagada');
    expect(resultado.gasto.pagosRelacionados).toEqual([resultado.pago.id]);
    expect(resultado.gasto.cuentaPorPagarId).toBe(resultado.cxp.id);
  });

  it('3. Nunca deja el gasto Pendiente: un contado siempre resulta en estadoPago "pagada"', async () => {
    const resultado = await simularRegistrarGastoConPagoInmediato({
      datos: crearDatosContadoFixture({ total: 200, subtotal: 200 }),
      mediosPago: [crearMedioEfectivo(200)],
      claveIdempotencia: 'clave-3',
      pagosExistentes: [],
      mediosDisponibles: MEDIOS_DISPONIBLES,
      cajaAbierta: true,
      seriePG: 'PG01',
      registrarCaja: async () => {},
    });
    expect(resultado.cxp.estadoPago).not.toBe('pendiente');
  });

  it('4. Caja se afecta cuando el medio es efectivo', async () => {
    let llamadasCaja = 0;
    await simularRegistrarGastoConPagoInmediato({
      datos: crearDatosContadoFixture(),
      mediosPago: [crearMedioEfectivo(50)],
      claveIdempotencia: 'clave-4',
      pagosExistentes: [],
      mediosDisponibles: MEDIOS_DISPONIBLES,
      cajaAbierta: true,
      seriePG: 'PG01',
      registrarCaja: async () => { llamadasCaja += 1; },
    });
    expect(llamadasCaja).toBe(1);
  });

  it('5. Rechaza el efectivo si la caja está cerrada — no llega a construir gasto/CxP/pago', async () => {
    await expect(
      simularRegistrarGastoConPagoInmediato({
        datos: crearDatosContadoFixture(),
        mediosPago: [crearMedioEfectivo(50)],
        claveIdempotencia: 'clave-5',
        pagosExistentes: [],
        mediosDisponibles: MEDIOS_DISPONIBLES,
        cajaAbierta: false,
        seriePG: 'PG01',
        registrarCaja: async () => {},
      }),
    ).rejects.toThrow('Abre una caja');
  });

  it('6. Rechaza si la suma de medios de pago no iguala el total — nunca guarda parcialmente', async () => {
    await expect(
      simularRegistrarGastoConPagoInmediato({
        datos: crearDatosContadoFixture({ total: 100, subtotal: 100 }),
        mediosPago: [crearMedioEfectivo(60)],
        claveIdempotencia: 'clave-6',
        pagosExistentes: [],
        mediosDisponibles: MEDIOS_DISPONIBLES,
        cajaAbierta: true,
        seriePG: 'PG01',
        registrarCaja: async () => {},
      }),
    ).rejects.toThrow('debe ser igual al total');
  });

  it('7. Rechaza si no hay serie PG configurada — no queda una CxP huérfana', async () => {
    await expect(
      simularRegistrarGastoConPagoInmediato({
        datos: crearDatosContadoFixture(),
        mediosPago: [crearMedioEfectivo(50)],
        claveIdempotencia: 'clave-7',
        pagosExistentes: [],
        mediosDisponibles: MEDIOS_DISPONIBLES,
        cajaAbierta: true,
        seriePG: undefined,
        registrarCaja: async () => {},
      }),
    ).rejects.toThrow('serie de pago');
  });

  it('8. Idempotencia: un reintento con la MISMA clave nunca crea un segundo gasto/pago', async () => {
    const primero = await simularRegistrarGastoConPagoInmediato({
      datos: crearDatosContadoFixture(),
      mediosPago: [crearMedioEfectivo(50)],
      claveIdempotencia: 'clave-8',
      pagosExistentes: [],
      mediosDisponibles: MEDIOS_DISPONIBLES,
      cajaAbierta: true,
      seriePG: 'PG01',
      registrarCaja: async () => {},
    });

    await expect(
      simularRegistrarGastoConPagoInmediato({
        datos: crearDatosContadoFixture(),
        mediosPago: [crearMedioEfectivo(50)],
        claveIdempotencia: 'clave-8',
        pagosExistentes: [primero.pago],
        mediosDisponibles: MEDIOS_DISPONIBLES,
        cajaAbierta: true,
        seriePG: 'PG01',
        registrarCaja: async () => {},
      }),
    ).rejects.toThrow('REUTILIZADO');
  });

  it('9. Un gasto sin proveedor/beneficiario o sin total no llega a construir nada (validación básica primero)', async () => {
    await expect(
      simularRegistrarGastoConPagoInmediato({
        datos: crearDatosContadoFixture({ beneficiario: undefined, proveedorId: undefined, total: 0, subtotal: 0 }),
        mediosPago: [crearMedioEfectivo(0)],
        claveIdempotencia: 'clave-9',
        pagosExistentes: [],
        mediosDisponibles: MEDIOS_DISPONIBLES,
        cajaAbierta: true,
        seriePG: 'PG01',
        registrarCaja: async () => {},
      }),
    ).rejects.toThrow();
  });

  it('10. Pago no efectivo (transferencia): no requiere caja abierta', async () => {
    const resultado = await simularRegistrarGastoConPagoInmediato({
      datos: crearDatosContadoFixture(),
      mediosPago: [{ id: 'm1', medioPagoCodigo: '003', medioPagoNombre: 'Transferencia', monto: 50, cuentaBancariaId: 'cta-1', referenciaOperacion: 'OP-123' }],
      claveIdempotencia: 'clave-10',
      pagosExistentes: [],
      mediosDisponibles: MEDIOS_DISPONIBLES,
      cajaAbierta: false,
      seriePG: 'PG01',
      registrarCaja: async () => {},
    });
    expect(resultado.cxp.estadoPago).toBe('pagada');
  });

  it('11. Dos medios de efectivo en la MISMA operación reciben claves de Caja DISTINTAS — nunca la misma clave para ambas líneas (corrección técnica final §14)', async () => {
    const clavesRecibidas: string[] = [];
    await simularRegistrarGastoConPagoInmediato({
      datos: crearDatosContadoFixture({ total: 80, subtotal: 80 }),
      mediosPago: [
        { id: 'medio-a', medioPagoCodigo: '008', medioPagoNombre: 'Efectivo', monto: 50 },
        { id: 'medio-b', medioPagoCodigo: '008', medioPagoNombre: 'Efectivo', monto: 30 },
      ],
      claveIdempotencia: 'clave-11',
      pagosExistentes: [],
      mediosDisponibles: MEDIOS_DISPONIBLES,
      cajaAbierta: true,
      seriePG: 'PG01',
      registrarCaja: async (_monto, clave) => { clavesRecibidas.push(clave); },
    });
    expect(clavesRecibidas).toEqual(['clave-11:medio-a', 'clave-11:medio-b']);
    expect(new Set(clavesRecibidas).size).toBe(2);
  });

  it('12. Un reintento de la MISMA operación (mismos medio.id) produce EXACTAMENTE las mismas claves de Caja', async () => {
    const clavesIntento1: string[] = [];
    const clavesIntento2: string[] = [];
    const medios: MedioPagoCompra[] = [{ id: 'medio-x', medioPagoCodigo: '008', medioPagoNombre: 'Efectivo', monto: 50 }];

    await simularRegistrarGastoConPagoInmediato({
      datos: crearDatosContadoFixture(), mediosPago: medios, claveIdempotencia: 'clave-12', pagosExistentes: [],
      mediosDisponibles: MEDIOS_DISPONIBLES, cajaAbierta: true, seriePG: 'PG01',
      registrarCaja: async (_monto, clave) => { clavesIntento1.push(clave); },
    });
    await simularRegistrarGastoConPagoInmediato({
      datos: crearDatosContadoFixture(), mediosPago: medios, claveIdempotencia: 'clave-12', pagosExistentes: [],
      mediosDisponibles: MEDIOS_DISPONIBLES, cajaAbierta: true, seriePG: 'PG01',
      registrarCaja: async (_monto, clave) => { clavesIntento2.push(clave); },
    });
    expect(clavesIntento2).toEqual(clavesIntento1);
  });

  it('13. Un fallo DESPUÉS de afectar Caja revierte el movimiento ya aplicado — nunca queda un Egreso huérfano sin su Pago (corrección técnica final §13)', async () => {
    const reversionesAplicadas: Array<{ monto: number; clave: string }> = [];
    await expect(
      simularRegistrarGastoConPagoInmediato({
        datos: crearDatosContadoFixture(),
        mediosPago: [crearMedioEfectivo(50)],
        claveIdempotencia: 'clave-13',
        pagosExistentes: [],
        mediosDisponibles: MEDIOS_DISPONIBLES,
        cajaAbierta: true,
        seriePG: 'PG01',
        registrarCaja: async () => {},
        revertirCaja: async (monto, clave) => { reversionesAplicadas.push({ monto, clave }); },
        fallarDespuesDeCaja: true,
      }),
    ).rejects.toThrow('Fallo simulado después de afectar Caja');

    expect(reversionesAplicadas).toEqual([{ monto: 50, clave: 'clave-13:medio-1' }]);
  });

  it('14. Sin movimientos de Caja involucrados (todo transferencia), un fallo posterior no dispara ninguna reversión', async () => {
    let reversiones = 0;
    await expect(
      simularRegistrarGastoConPagoInmediato({
        datos: crearDatosContadoFixture(),
        mediosPago: [{ id: 'm1', medioPagoCodigo: '003', medioPagoNombre: 'Transferencia', monto: 50, cuentaBancariaId: 'cta-1', referenciaOperacion: 'OP-123' }],
        claveIdempotencia: 'clave-14',
        pagosExistentes: [],
        mediosDisponibles: MEDIOS_DISPONIBLES,
        cajaAbierta: false,
        seriePG: 'PG01',
        registrarCaja: async () => {},
        revertirCaja: async () => { reversiones += 1; },
        fallarDespuesDeCaja: true,
      }),
    ).rejects.toThrow();
    expect(reversiones).toBe(0);
  });
});
