import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { instalarLocalStorageDePrueba } from '../repositories/localStorageDePrueba';
import { ejecutarUnidadTrabajoInventario } from './unidadTrabajoInventario';
import { reservarOperacionIdempotente } from './idempotenciaInventario';
import { ConflictoIdempotencia, ConflictoVersionInventario, InconsistenciaDiarioInventario } from './erroresInventario';
import {
  buscarOperacionIdempotentePorClave,
  enlazarOperacionConTransaccionActiva,
  marcarOperacionFallida,
  CLAVE_COLECCION_OPERACIONES_IDEMPOTENTES,
} from '../repositories/operacionIdempotenteInventario.repository';
import {
  guardarTransaccionInventario,
  obtenerUltimoIntentoPorOperacionIdempotenteId,
} from '../repositories/transaccionInventario.repository';
import { obtenerEstadoVersionInventario } from '../repositories/estadoVersionInventario.repository';
import type { PlanUnidadTrabajoInventario } from '../models/planUnidadTrabajoInventario.types';
import type { OperacionIdempotenteInventario } from '../models/operacionIdempotenteInventario.types';
import type { TransaccionInventario } from '../models/transaccionInventario.types';
import { lsKey } from '../../../../../shared/tenant';

instalarLocalStorageDePrueba();

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

let contadorId = 0;
function generarId(): string {
  contadorId += 1;
  return `gen-${contadorId}`;
}
function fechaActual(): string {
  return '2026-03-01T00:00:00.000Z';
}

async function reservarNueva(clave: string, hashEntrada = 'hash-1') {
  const resultado = await reservarOperacionIdempotente({
    empresaId: 'emp-A',
    clave,
    tipoOperacion: 'ni_automatica',
    hashEntrada,
    referenciaDocumentoId: 'cc-1',
    referenciaDocumentoTipo: 'comprobante_compra',
    generarId,
    fechaActual,
  });
  if (resultado.tipo !== 'nueva') throw new Error('se esperaba una reserva nueva');
  return resultado.operacion;
}

/**
 * Helper EXCLUSIVO de pruebas: escribe directamente en el localStorage de prueba. Reemplaza al
 * antiguo `guardarOperacionIdempotente` del repositorio, que ya no se exporta desde ningún lado —
 * la única vía productiva para crear una reserva es `reservarOperacionIdempotente` (usada arriba
 * por `reservarNueva`); este helper solo sirve para sembrar la operación "vieja" del escenario de
 * recuperación, que no debe pasar por el bloqueo de una reserva nueva real.
 */
function guardarOperacionDePrueba(operacion: OperacionIdempotenteInventario, empresaId: string): void {
  const clave = lsKey(CLAVE_COLECCION_OPERACIONES_IDEMPOTENTES, empresaId);
  const actuales = JSON.parse(localStorage.getItem(clave) ?? '[]') as OperacionIdempotenteInventario[];
  localStorage.setItem(clave, JSON.stringify([...actuales, operacion]));
}

function construirPlan(operacion: OperacionIdempotenteInventario, overrides: Partial<PlanUnidadTrabajoInventario> = {}): PlanUnidadTrabajoInventario {
  return {
    id: generarId(),
    empresaId: 'emp-A',
    operacionIdempotenteId: operacion.id,
    claveIdempotencia: operacion.clave,
    tipoOperacion: operacion.tipoOperacion,
    hashEntrada: operacion.hashEntrada,
    versionEsperada: 0,
    escrituras: [{ clave: 'emp-A:facturafacil_stock:prod-1', valorAnterior: null, valorPropuesto: '10' }],
    resultadoIds: ['mov-1'],
    usuario: 'user-1',
    ...overrides,
  };
}

describe('unidadTrabajoInventario — camino feliz completo', () => {
  it('aplica las escrituras, confirma operación y transacción, e incrementa la versión, con numeroIntento 1', async () => {
    const operacion = await reservarNueva('NI-AUTO-cc-1');
    const plan = construirPlan(operacion);

    const resultado = await ejecutarUnidadTrabajoInventario({ plan, fechaActual });

    expect(resultado.resultadoIds).toEqual(['mov-1']);
    expect(localStorage.getItem('emp-A:facturafacil_stock:prod-1')).toBe('10');

    const operacionFinal = buscarOperacionIdempotentePorClave('emp-A', 'NI-AUTO-cc-1');
    expect(operacionFinal?.estado).toBe('confirmada');
    expect(operacionFinal?.resultadoIds).toEqual(['mov-1']);
    expect(operacionFinal?.transaccionInventarioId).toBe(resultado.transaccionId);
    expect(operacionFinal?.fechaConfirmacion).toBe('2026-03-01T00:00:00.000Z');

    const transaccion = obtenerUltimoIntentoPorOperacionIdempotenteId('emp-A', operacion.id);
    expect(transaccion?.estado).toBe('confirmada');
    expect(transaccion?.id).toBe(resultado.transaccionId);
    expect(transaccion?.numeroIntento).toBe(1);
    expect(transaccion?.versionEsperada).toBe(0);
    expect(transaccion?.versionResultante).toBe(1);

    const estadoVersion = obtenerEstadoVersionInventario('emp-A');
    expect(estadoVersion?.versionInventario).toBe(1);
    expect(estadoVersion?.ultimaTransaccionId).toBe(resultado.transaccionId);
  });

  it('reintento legítimo (mismo plan/hash tras confirmar): devuelve los mismos resultados, cero escrituras nuevas', async () => {
    const operacion = await reservarNueva('NI-AUTO-cc-1');
    const plan = construirPlan(operacion);
    const primero = await ejecutarUnidadTrabajoInventario({ plan, fechaActual });

    const segundo = await ejecutarUnidadTrabajoInventario({ plan, fechaActual });
    expect(segundo).toEqual(primero);
    expect(obtenerEstadoVersionInventario('emp-A')?.versionInventario).toBe(1);
  });

  it('conflicto de hash tras confirmar: un plan con hash distinto para la misma operación lanza ConflictoIdempotencia', async () => {
    const operacion = await reservarNueva('NI-AUTO-cc-1');
    const plan = construirPlan(operacion);
    await ejecutarUnidadTrabajoInventario({ plan, fechaActual });

    const planConflictivo = construirPlan(operacion, { hashEntrada: 'hash-DISTINTO' });
    await expect(ejecutarUnidadTrabajoInventario({ plan: planConflictivo, fechaActual })).rejects.toThrow(ConflictoIdempotencia);
  });
});

describe('unidadTrabajoInventario — conflicto de versión (paso 10-11)', () => {
  it('aborta sin escribir dominio, marca ambas fallidas, lanza ConflictoVersionInventario', async () => {
    const operacion = await reservarNueva('NI-AUTO-cc-1');
    const plan = construirPlan(operacion, { versionEsperada: 5 });

    await expect(ejecutarUnidadTrabajoInventario({ plan, fechaActual })).rejects.toThrow(ConflictoVersionInventario);

    expect(localStorage.getItem('emp-A:facturafacil_stock:prod-1')).toBeNull();
    expect(buscarOperacionIdempotentePorClave('emp-A', 'NI-AUTO-cc-1')?.estado).toBe('fallida');
    const transaccion = obtenerUltimoIntentoPorOperacionIdempotenteId('emp-A', operacion.id);
    expect(transaccion?.estado).toBe('fallida');
    expect(obtenerEstadoVersionInventario('emp-A')).toBeUndefined();
  });
});

describe('unidadTrabajoInventario — drift de estado base (paso 10-11)', () => {
  it('aborta sin escribir dominio si una clave no coincide con su valorAnterior declarado', async () => {
    localStorage.setItem('emp-A:facturafacil_stock:prod-1', '999'); // no es null ni '10'
    const operacion = await reservarNueva('NI-AUTO-cc-1');
    const plan = construirPlan(operacion);

    await expect(ejecutarUnidadTrabajoInventario({ plan, fechaActual })).rejects.toThrow(InconsistenciaDiarioInventario);

    expect(localStorage.getItem('emp-A:facturafacil_stock:prod-1')).toBe('999');
    expect(buscarOperacionIdempotentePorClave('emp-A', 'NI-AUTO-cc-1')?.estado).toBe('fallida');
    expect(obtenerEstadoVersionInventario('emp-A')).toBeUndefined();
  });
});

describe('unidadTrabajoInventario — validación del plan (paso 2)', () => {
  it('rechaza un plan con claves duplicadas, sin tocar ningún repositorio', async () => {
    const operacion = await reservarNueva('NI-AUTO-cc-1');
    const plan = construirPlan(operacion, {
      escrituras: [
        { clave: 'emp-A:facturafacil_stock:prod-1', valorAnterior: null, valorPropuesto: '10' },
        { clave: 'emp-A:facturafacil_stock:prod-1', valorAnterior: null, valorPropuesto: '20' },
      ],
    });
    await expect(ejecutarUnidadTrabajoInventario({ plan, fechaActual })).rejects.toThrow();
    expect(buscarOperacionIdempotentePorClave('emp-A', 'NI-AUTO-cc-1')?.estado).toBe('preparada');
  });

  it('rechaza una clave fuera del ámbito tenantizado de la empresa', async () => {
    const operacion = await reservarNueva('NI-AUTO-cc-1');
    const plan = construirPlan(operacion, {
      escrituras: [{ clave: 'emp-B:facturafacil_stock:prod-1', valorAnterior: null, valorPropuesto: '10' }],
    });
    await expect(ejecutarUnidadTrabajoInventario({ plan, fechaActual })).rejects.toThrow();
  });

  it('rechaza versionEsperada negativa o no entera', async () => {
    const operacion = await reservarNueva('NI-AUTO-cc-1');
    const plan = construirPlan(operacion, { versionEsperada: -1 });
    await expect(ejecutarUnidadTrabajoInventario({ plan, fechaActual })).rejects.toThrow();
  });

  it('rechaza un plan con versionEsperada === Number.MAX_SAFE_INTEGER antes de crear la transacción (Bloqueante de versiones seguras)', async () => {
    const operacion = await reservarNueva('NI-AUTO-cc-1');
    const plan = construirPlan(operacion, { versionEsperada: Number.MAX_SAFE_INTEGER });
    await expect(ejecutarUnidadTrabajoInventario({ plan, fechaActual })).rejects.toThrow();
    // Ninguna transacción fue creada — el rechazo ocurre en la validación del plan (paso 2), antes del paso 8.
    expect(obtenerUltimoIntentoPorOperacionIdempotenteId('emp-A', operacion.id)).toBeUndefined();
  });
});

describe('unidadTrabajoInventario — precondiciones sobre la operación referenciada (paso 5)', () => {
  it('rechaza si la operación idempotente del plan no existe', async () => {
    const operacion = await reservarNueva('NI-AUTO-cc-1');
    const plan = construirPlan(operacion, { operacionIdempotenteId: 'op-inexistente' });
    await expect(ejecutarUnidadTrabajoInventario({ plan, fechaActual })).rejects.toThrow();
  });

  it('rechaza si el hash del plan no coincide con el de la operación preparada (plan obsoleto)', async () => {
    const operacion = await reservarNueva('NI-AUTO-cc-1', 'hash-original');
    const plan = construirPlan(operacion, { hashEntrada: 'hash-plan-viejo' });
    await expect(ejecutarUnidadTrabajoInventario({ plan, fechaActual })).rejects.toThrow();
  });

  it('rechaza si la operación ya no está preparada ni confirmada (p. ej. fallida) — plan obsoleto', async () => {
    const operacion = await reservarNueva('NI-AUTO-cc-1');
    const plan = construirPlan(operacion);
    marcarOperacionFallida('emp-A', operacion.id);

    await expect(ejecutarUnidadTrabajoInventario({ plan, fechaActual })).rejects.toThrow();
  });
});

describe('unidadTrabajoInventario — integra la recuperación de trabajo pendiente de OTRA operación (paso 4)', () => {
  it('resuelve una transacción confirmando huérfana de un intento previo antes de aceptar el nuevo plan', async () => {
    // Trabajo pendiente de una operación DISTINTA (op-vieja / clave-vieja), simulando una caída previa.
    const operacionVieja: OperacionIdempotenteInventario = {
      id: 'op-vieja',
      empresaId: 'emp-A',
      clave: 'clave-vieja',
      tipoOperacion: 'ni_automatica',
      estado: 'preparada',
      hashEntrada: 'hash-vieja',
      referenciaDocumentoId: 'cc-0',
      referenciaDocumentoTipo: 'comprobante_compra',
      resultadoIds: [],
      fechaCreacion: '2026-01-01T00:00:00.000Z',
    };
    guardarOperacionDePrueba(operacionVieja, 'emp-A');
    enlazarOperacionConTransaccionActiva('emp-A', 'op-vieja', 'tx-vieja');
    const transaccionVieja: TransaccionInventario = {
      id: 'tx-vieja',
      empresaId: 'emp-A',
      operacionIdempotenteId: 'op-vieja',
      numeroIntento: 1,
      tipoOperacion: 'ni_automatica',
      claveIdempotencia: 'clave-vieja',
      estado: 'preparada',
      hashEntrada: 'hash-vieja',
      clavesAfectadas: ['emp-A:facturafacil_stock:prod-viejo'],
      datosAnteriores: { 'emp-A:facturafacil_stock:prod-viejo': null },
      datosPropuestos: { 'emp-A:facturafacil_stock:prod-viejo': '3' },
      versionEsperada: 0,
      versionResultante: 1,
      resultadoIds: ['mov-viejo'],
      fechaPreparacion: '2026-01-01T00:00:00.000Z',
      usuario: 'user-1',
    };
    guardarTransaccionInventario(transaccionVieja, 'emp-A');
    // Se coloca directamente en 'confirmando' para simular la interrupción (guardarTransaccionInventario exige 'preparada' al insertar).
    localStorage.setItem(
      lsKey('facturafacil_transacciones_inventario', 'emp-A'),
      JSON.stringify([{ ...transaccionVieja, estado: 'confirmando' }])
    );

    // Nueva operación real, sin relación con la anterior. Su versionEsperada asume que la
    // recuperación de la operación vieja YA ocurrió (paso 4 corre antes que el paso 10-11 de ESTA
    // misma llamada) — un llamador real leería la versión después de inicializar/recuperar, nunca antes.
    const operacion = await reservarNueva('NI-AUTO-cc-1');
    const plan = construirPlan(operacion, { versionEsperada: 1 });
    await ejecutarUnidadTrabajoInventario({ plan, fechaActual });

    // La operación vieja quedó resuelta (caso C de la recuperación) ANTES de que el plan nuevo se ejecutara.
    expect(buscarOperacionIdempotentePorClave('emp-A', 'clave-vieja')?.estado).toBe('confirmada');
    expect(localStorage.getItem('emp-A:facturafacil_stock:prod-viejo')).toBe('3');
    // La versión refleja AMBAS confirmaciones en orden: primero la vieja (recuperada), luego la nueva.
    expect(obtenerEstadoVersionInventario('emp-A')?.versionInventario).toBe(2);
  });
});

describe('unidadTrabajoInventario — bloqueo cooperativo entre operaciones concurrentes de la misma empresa', () => {
  it('serializa dos ejecuciones concurrentes: la segunda, construida sobre versión 0, encuentra versión 1 y falla con ConflictoVersionInventario', async () => {
    const operacion1 = await reservarNueva('clave-1');
    const operacion2 = await reservarNueva('clave-2');
    const plan1 = construirPlan(operacion1, { escrituras: [{ clave: 'emp-A:facturafacil_stock:prod-1', valorAnterior: null, valorPropuesto: '10' }] });
    const plan2 = construirPlan(operacion2, { escrituras: [{ clave: 'emp-A:facturafacil_stock:prod-2', valorAnterior: null, valorPropuesto: '20' }] });

    const resultados = await Promise.allSettled([
      ejecutarUnidadTrabajoInventario({ plan: plan1, fechaActual }),
      ejecutarUnidadTrabajoInventario({ plan: plan2, fechaActual }),
    ]);

    const cumplidos = resultados.filter((r) => r.status === 'fulfilled');
    const rechazados = resultados.filter((r) => r.status === 'rejected');
    expect(cumplidos).toHaveLength(1);
    expect(rechazados).toHaveLength(1);
    expect((rechazados[0] as PromiseRejectedResult).reason).toBeInstanceOf(ConflictoVersionInventario);
    expect(obtenerEstadoVersionInventario('emp-A')?.versionInventario).toBe(1);
  });
});

describe('unidadTrabajoInventario — aislamiento multiempresa', () => {
  it('ejecutar un plan de la empresa A no afecta la versión ni las claves de la empresa B', async () => {
    const resultadoReserva = await reservarOperacionIdempotente({
      empresaId: 'emp-B',
      clave: 'clave-B',
      tipoOperacion: 'ni_automatica',
      hashEntrada: 'hash-1',
      referenciaDocumentoId: 'cc-2',
      referenciaDocumentoTipo: 'comprobante_compra',
      generarId,
      fechaActual,
    });
    if (resultadoReserva.tipo !== 'nueva') throw new Error('se esperaba una reserva nueva');

    const operacionA = await reservarNueva('NI-AUTO-cc-1');
    const planA = construirPlan(operacionA);
    await ejecutarUnidadTrabajoInventario({ plan: planA, fechaActual });

    expect(obtenerEstadoVersionInventario('emp-A')?.versionInventario).toBe(1);
    expect(obtenerEstadoVersionInventario('emp-B')).toBeUndefined();
    expect(buscarOperacionIdempotentePorClave('emp-B', 'clave-B')?.estado).toBe('preparada');
  });
});
