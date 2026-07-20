import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { instalarLocalStorageDePrueba } from '../repositories/localStorageDePrueba';
import { recuperarTransaccionesInterrumpidas } from './recuperacionInventario';
import { InconsistenciaDiarioInventario, IntentoActivoDuplicadoInventario } from './erroresInventario';
import {
  buscarOperacionIdempotentePorClave,
  enlazarOperacionConTransaccionActiva,
  marcarOperacionConfirmada,
  marcarOperacionFallida,
  CLAVE_COLECCION_OPERACIONES_IDEMPOTENTES,
} from '../repositories/operacionIdempotenteInventario.repository';
import {
  guardarTransaccionInventario,
  marcarTransaccionConfirmada,
  marcarTransaccionFallida,
  obtenerTransaccionInventarioPorId,
  pasarTransaccionAConfirmando,
} from '../repositories/transaccionInventario.repository';
import { actualizarEstadoVersionInventario, obtenerEstadoVersionInventario } from '../repositories/estadoVersionInventario.repository';
import type { OperacionIdempotenteInventario } from '../models/operacionIdempotenteInventario.types';
import type { TransaccionInventario } from '../models/transaccionInventario.types';
import { lsKey } from '../../../../../shared/tenant';

instalarLocalStorageDePrueba();

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

function fechaActual(): string {
  return '2026-02-01T00:00:00.000Z';
}

function crearOperacionDirecta(overrides: Partial<OperacionIdempotenteInventario> = {}): OperacionIdempotenteInventario {
  return {
    id: 'op-1',
    empresaId: 'emp-A',
    clave: 'NI-AUTO-cc-1',
    tipoOperacion: 'ni_automatica',
    estado: 'preparada',
    hashEntrada: 'hash-1',
    referenciaDocumentoId: 'cc-1',
    referenciaDocumentoTipo: 'comprobante_compra',
    resultadoIds: [],
    fechaCreacion: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function crearTransaccionDirecta(overrides: Partial<TransaccionInventario> = {}): TransaccionInventario {
  return {
    id: 'tx-1',
    empresaId: 'emp-A',
    operacionIdempotenteId: 'op-1',
    numeroIntento: 1,
    tipoOperacion: 'ni_automatica',
    claveIdempotencia: 'NI-AUTO-cc-1',
    estado: 'preparada',
    hashEntrada: 'hash-1',
    clavesAfectadas: [],
    datosAnteriores: {},
    datosPropuestos: {},
    versionEsperada: 0,
    versionResultante: 1,
    resultadoIds: [],
    fechaPreparacion: '2026-01-01T00:00:00.000Z',
    usuario: 'user-1',
    ...overrides,
  };
}

/**
 * Helper EXCLUSIVO de pruebas: escribe directamente en el localStorage de prueba. Reemplaza al
 * antiguo `guardarOperacionIdempotente` del repositorio, que ya no se exporta desde ningún lado —
 * la única vía productiva para crear una reserva es `reservarOperacionIdempotente`
 * (`idempotenciaInventario.ts`).
 */
function guardarOperacionDePrueba(operacion: OperacionIdempotenteInventario, empresaId: string): void {
  const clave = lsKey(CLAVE_COLECCION_OPERACIONES_IDEMPOTENTES, empresaId);
  const actuales = JSON.parse(localStorage.getItem(clave) ?? '[]') as OperacionIdempotenteInventario[];
  localStorage.setItem(clave, JSON.stringify([...actuales, operacion]));
}

describe('recuperacionInventario — caso A: preparada sin ningún intento — NUNCA se resuelve automáticamente', () => {
  it('la deja intacta y la reporta como diagnóstico, sin marcarla fallida', () => {
    guardarOperacionDePrueba(crearOperacionDirecta(), 'emp-A');
    const resultado = recuperarTransaccionesInterrumpidas('emp-A', fechaActual);
    expect(resultado.operacionesRecuperadas).toEqual([{ operacionId: 'op-1', clave: 'NI-AUTO-cc-1', accion: 'reserva_sin_transaccion_diagnosticada' }]);
    expect(buscarOperacionIdempotentePorClave('emp-A', 'NI-AUTO-cc-1')?.estado).toBe('preparada');
    expect(obtenerEstadoVersionInventario('emp-A')).toBeUndefined();
  });

  it('ejecutarla varias veces sigue sin tocarla', () => {
    guardarOperacionDePrueba(crearOperacionDirecta(), 'emp-A');
    recuperarTransaccionesInterrumpidas('emp-A', fechaActual);
    recuperarTransaccionesInterrumpidas('emp-A', fechaActual);
    expect(buscarOperacionIdempotentePorClave('emp-A', 'NI-AUTO-cc-1')?.estado).toBe('preparada');
  });
});

describe('recuperacionInventario — caso B: intento activo preparada (nunca llegó a escribir)', () => {
  it('marca ambas fallidas, cero escrituras, cero cambio de versión', () => {
    guardarOperacionDePrueba(crearOperacionDirecta(), 'emp-A');
    enlazarOperacionConTransaccionActiva('emp-A', 'op-1', 'tx-1');
    guardarTransaccionInventario(crearTransaccionDirecta(), 'emp-A');

    const resultado = recuperarTransaccionesInterrumpidas('emp-A', fechaActual);
    expect(resultado.operacionesRecuperadas[0].accion).toBe('transaccion_preparada_marcada_fallida');
    expect(buscarOperacionIdempotentePorClave('emp-A', 'NI-AUTO-cc-1')?.estado).toBe('fallida');
    expect(obtenerTransaccionInventarioPorId('tx-1', 'emp-A')?.estado).toBe('fallida');
    expect(obtenerEstadoVersionInventario('emp-A')).toBeUndefined();
  });
});

describe('recuperacionInventario — caso C: intento activo confirmando', () => {
  it('aplica las escrituras pendientes, deja las ya aplicadas intactas, confirma ambas entidades e incrementa la versión', () => {
    localStorage.setItem('clave-ya-aplicada', '20');
    guardarOperacionDePrueba(crearOperacionDirecta(), 'emp-A');
    enlazarOperacionConTransaccionActiva('emp-A', 'op-1', 'tx-1');
    guardarTransaccionInventario(
      crearTransaccionDirecta({
        clavesAfectadas: ['clave-ya-aplicada', 'clave-pendiente'],
        datosAnteriores: { 'clave-ya-aplicada': '10', 'clave-pendiente': null },
        datosPropuestos: { 'clave-ya-aplicada': '20', 'clave-pendiente': '5' },
        resultadoIds: ['mov-1'],
      }),
      'emp-A'
    );
    pasarTransaccionAConfirmando('emp-A', 'tx-1');

    const resultado = recuperarTransaccionesInterrumpidas('emp-A', fechaActual);
    expect(resultado.operacionesRecuperadas[0].accion).toBe('escrituras_pendientes_completadas');

    expect(localStorage.getItem('clave-ya-aplicada')).toBe('20');
    expect(localStorage.getItem('clave-pendiente')).toBe('5');

    const operacion = buscarOperacionIdempotentePorClave('emp-A', 'NI-AUTO-cc-1');
    expect(operacion?.estado).toBe('confirmada');
    expect(operacion?.resultadoIds).toEqual(['mov-1']);
    expect(operacion?.transaccionInventarioId).toBe('tx-1');
    expect(operacion?.fechaConfirmacion).toBe('2026-02-01T00:00:00.000Z');

    const transaccion = obtenerTransaccionInventarioPorId('tx-1', 'emp-A');
    expect(transaccion?.estado).toBe('confirmada');

    const estadoVersion = obtenerEstadoVersionInventario('emp-A');
    expect(estadoVersion?.versionInventario).toBe(1);
    expect(estadoVersion?.ultimaTransaccionId).toBe('tx-1');
  });

  it('se detiene con InconsistenciaDiarioInventario si una clave no coincide ni con anterior ni con propuesto, sin confirmar nada', () => {
    localStorage.setItem('clave-inconsistente', '999');
    guardarOperacionDePrueba(crearOperacionDirecta(), 'emp-A');
    enlazarOperacionConTransaccionActiva('emp-A', 'op-1', 'tx-1');
    guardarTransaccionInventario(
      crearTransaccionDirecta({
        clavesAfectadas: ['clave-inconsistente'],
        datosAnteriores: { 'clave-inconsistente': '10' },
        datosPropuestos: { 'clave-inconsistente': '20' },
      }),
      'emp-A'
    );
    pasarTransaccionAConfirmando('emp-A', 'tx-1');

    expect(() => recuperarTransaccionesInterrumpidas('emp-A', fechaActual)).toThrow(InconsistenciaDiarioInventario);
    expect(localStorage.getItem('clave-inconsistente')).toBe('999');
    expect(buscarOperacionIdempotentePorClave('emp-A', 'NI-AUTO-cc-1')?.estado).toBe('preparada');
    expect(obtenerTransaccionInventarioPorId('tx-1', 'emp-A')?.estado).toBe('confirmando');
    expect(obtenerEstadoVersionInventario('emp-A')).toBeUndefined();
  });

  it('es idempotente: ejecutarla dos veces no vuelve a incrementar la versión ni duplica resultadoIds', () => {
    guardarOperacionDePrueba(crearOperacionDirecta(), 'emp-A');
    enlazarOperacionConTransaccionActiva('emp-A', 'op-1', 'tx-1');
    guardarTransaccionInventario(
      crearTransaccionDirecta({
        clavesAfectadas: ['clave-1'],
        datosAnteriores: { 'clave-1': null },
        datosPropuestos: { 'clave-1': '7' },
        resultadoIds: ['mov-1'],
      }),
      'emp-A'
    );
    pasarTransaccionAConfirmando('emp-A', 'tx-1');

    recuperarTransaccionesInterrumpidas('emp-A', fechaActual);
    const segunda = recuperarTransaccionesInterrumpidas('emp-A', fechaActual);

    expect(segunda.operacionesRecuperadas).toEqual([]);
    expect(obtenerEstadoVersionInventario('emp-A')?.versionInventario).toBe(1);
    expect(buscarOperacionIdempotentePorClave('emp-A', 'NI-AUTO-cc-1')?.resultadoIds).toEqual(['mov-1']);
  });

  it('una versión ya avanzada más allá de lo que este intento esperaba (por otra operación) nunca provoca un incremento a ciegas', () => {
    guardarOperacionDePrueba(crearOperacionDirecta(), 'emp-A');
    enlazarOperacionConTransaccionActiva('emp-A', 'op-1', 'tx-1');
    guardarTransaccionInventario(crearTransaccionDirecta({ versionEsperada: 0, versionResultante: 1 }), 'emp-A');
    pasarTransaccionAConfirmando('emp-A', 'tx-1');
    // Simula que la versión ya avanzó (por otra operación) más allá de lo que ESTE intento esperaba.
    localStorage.setItem(
      lsKey('facturafacil_estado_version_inventario', 'emp-A'),
      JSON.stringify({ empresaId: 'emp-A', versionInventario: 5, ultimaTransaccionId: 'tx-otra', fechaActualizacion: 't0' })
    );

    expect(() => recuperarTransaccionesInterrumpidas('emp-A', fechaActual)).toThrow(InconsistenciaDiarioInventario);
    // La versión no cambia: nunca se incrementa a ciegas.
    expect(obtenerEstadoVersionInventario('emp-A')?.versionInventario).toBe(5);
  });
});

describe('recuperacionInventario — caso D: sin intento activo, último intento ya confirmada', () => {
  it('no repite escrituras, cierra la operación e incrementa la versión si aún no la reflejaba', () => {
    localStorage.setItem('clave-1', '7');
    guardarOperacionDePrueba(crearOperacionDirecta(), 'emp-A');
    enlazarOperacionConTransaccionActiva('emp-A', 'op-1', 'tx-1');
    guardarTransaccionInventario(
      crearTransaccionDirecta({
        clavesAfectadas: ['clave-1'],
        datosAnteriores: { 'clave-1': null },
        datosPropuestos: { 'clave-1': '7' },
        resultadoIds: ['mov-1', 'capa-1'],
      }),
      'emp-A'
    );
    pasarTransaccionAConfirmando('emp-A', 'tx-1');
    marcarTransaccionConfirmada('emp-A', 'tx-1', { fechaConfirmacion: '2026-01-01T00:05:00.000Z' });

    const resultado = recuperarTransaccionesInterrumpidas('emp-A', fechaActual);
    expect(resultado.operacionesRecuperadas[0].accion).toBe('cierre_pendiente_completado');

    const operacion = buscarOperacionIdempotentePorClave('emp-A', 'NI-AUTO-cc-1');
    expect(operacion?.estado).toBe('confirmada');
    expect(operacion?.resultadoIds).toEqual(['mov-1', 'capa-1']);
    expect(obtenerEstadoVersionInventario('emp-A')?.versionInventario).toBe(1);
    expect(obtenerEstadoVersionInventario('emp-A')?.ultimaTransaccionId).toBe('tx-1');
  });

  it('no toca la versión si ya la reflejaba (idempotente ante una recuperación previa parcial)', () => {
    guardarOperacionDePrueba(crearOperacionDirecta(), 'emp-A');
    enlazarOperacionConTransaccionActiva('emp-A', 'op-1', 'tx-1');
    guardarTransaccionInventario(crearTransaccionDirecta(), 'emp-A');
    pasarTransaccionAConfirmando('emp-A', 'tx-1');
    marcarTransaccionConfirmada('emp-A', 'tx-1', { fechaConfirmacion: '2026-01-01T00:05:00.000Z' });
    actualizarEstadoVersionInventario({ empresaId: 'emp-A', versionEsperada: 0, nuevaVersion: 1, ultimaTransaccionId: 'tx-1', fechaActualizacion: 't0' });

    recuperarTransaccionesInterrumpidas('emp-A', fechaActual);
    expect(obtenerEstadoVersionInventario('emp-A')?.versionInventario).toBe(1);
  });
});

describe('recuperacionInventario — caso E: sin intento activo, último intento fallido', () => {
  it('cierra la operación como fallida, sin escrituras ni cambio de versión', () => {
    guardarOperacionDePrueba(crearOperacionDirecta(), 'emp-A');
    enlazarOperacionConTransaccionActiva('emp-A', 'op-1', 'tx-1');
    guardarTransaccionInventario(crearTransaccionDirecta(), 'emp-A');
    marcarTransaccionFallida('emp-A', 'tx-1');

    const resultado = recuperarTransaccionesInterrumpidas('emp-A', fechaActual);
    expect(resultado.operacionesRecuperadas[0].accion).toBe('transaccion_fallida_cerrada');
    expect(buscarOperacionIdempotentePorClave('emp-A', 'NI-AUTO-cc-1')?.estado).toBe('fallida');
    expect(obtenerEstadoVersionInventario('emp-A')).toBeUndefined();
  });

  it('rechaza si la transacción fallida conserva resultadoIds no vacíos (corrupción simulada)', () => {
    guardarOperacionDePrueba(crearOperacionDirecta(), 'emp-A');
    enlazarOperacionConTransaccionActiva('emp-A', 'op-1', 'tx-1');
    localStorage.setItem(
      lsKey('facturafacil_transacciones_inventario', 'emp-A'),
      JSON.stringify([crearTransaccionDirecta({ estado: 'fallida', resultadoIds: ['mov-huérfano'] })])
    );
    expect(() => recuperarTransaccionesInterrumpidas('emp-A', fechaActual)).toThrow(InconsistenciaDiarioInventario);
  });
});

describe('recuperacionInventario — historial de intentos: usa el ÚLTIMO por numeroIntento, no por posición', () => {
  it('un segundo intento (tras uno fallido) es el que se resuelve, el histórico queda intacto', () => {
    guardarOperacionDePrueba(crearOperacionDirecta(), 'emp-A');
    enlazarOperacionConTransaccionActiva('emp-A', 'op-1', 'tx-1');
    guardarTransaccionInventario(crearTransaccionDirecta({ id: 'tx-1', numeroIntento: 1, hashEntrada: 'hash-viejo' }), 'emp-A');
    marcarTransaccionFallida('emp-A', 'tx-1');
    marcarOperacionFallida('emp-A', 'op-1');

    // Reintento: nuevo intento (numeroIntento 2) para la misma operación.
    const operacionReactivada = buscarOperacionIdempotentePorClave('emp-A', 'NI-AUTO-cc-1')!;
    localStorage.setItem(
      lsKey('facturafacil_operaciones_idempotentes_inventario', 'emp-A'),
      JSON.stringify([{ ...operacionReactivada, estado: 'preparada', transaccionInventarioId: undefined, hashEntrada: 'hash-nuevo' }])
    );
    enlazarOperacionConTransaccionActiva('emp-A', 'op-1', 'tx-2');
    guardarTransaccionInventario(crearTransaccionDirecta({ id: 'tx-2', numeroIntento: 2, hashEntrada: 'hash-nuevo' }), 'emp-A');
    pasarTransaccionAConfirmando('emp-A', 'tx-2');

    const resultado = recuperarTransaccionesInterrumpidas('emp-A', fechaActual);
    expect(resultado.operacionesRecuperadas[0].accion).toBe('escrituras_pendientes_completadas');
    expect(obtenerTransaccionInventarioPorId('tx-2', 'emp-A')?.estado).toBe('confirmada');
    // El intento histórico (tx-1, fallido) permanece intacto — nunca se toca ni se borra.
    expect(obtenerTransaccionInventarioPorId('tx-1', 'emp-A')?.estado).toBe('fallida');
    expect(obtenerTransaccionInventarioPorId('tx-1', 'emp-A')?.hashEntrada).toBe('hash-viejo');
  });
});

describe('recuperacionInventario — ventana recuperable: confirmada + intento activo confirmando (muerte entre los pasos 18 y 19 de la unidad de trabajo)', () => {
  it('NO es una inconsistencia: completa la transacción de forma idempotente en vez de lanzar error', () => {
    localStorage.setItem('clave-1', '20');
    guardarOperacionDePrueba(crearOperacionDirecta(), 'emp-A');
    enlazarOperacionConTransaccionActiva('emp-A', 'op-1', 'tx-1');
    guardarTransaccionInventario(
      crearTransaccionDirecta({
        clavesAfectadas: ['clave-1'],
        datosAnteriores: { 'clave-1': '10' },
        datosPropuestos: { 'clave-1': '20' },
        resultadoIds: ['mov-1'],
      }),
      'emp-A'
    );
    pasarTransaccionAConfirmando('emp-A', 'tx-1');
    marcarOperacionConfirmada('emp-A', 'op-1', { transaccionId: 'tx-1', resultadoIds: ['mov-1'], fechaConfirmacion: '2026-01-01T00:05:00.000Z' });

    const resultado = recuperarTransaccionesInterrumpidas('emp-A', fechaActual);
    expect(resultado.operacionesRecuperadas).toEqual([{ operacionId: 'op-1', clave: 'NI-AUTO-cc-1', accion: 'cierre_pendiente_completado' }]);
    expect(obtenerTransaccionInventarioPorId('tx-1', 'emp-A')?.estado).toBe('confirmada');
    expect(buscarOperacionIdempotentePorClave('emp-A', 'NI-AUTO-cc-1')?.estado).toBe('confirmada');
  });

  it('es idempotente: ejecutarla dos veces no vuelve a incrementar la versión', () => {
    localStorage.setItem('clave-1', '20');
    guardarOperacionDePrueba(crearOperacionDirecta(), 'emp-A');
    enlazarOperacionConTransaccionActiva('emp-A', 'op-1', 'tx-1');
    guardarTransaccionInventario(
      crearTransaccionDirecta({
        clavesAfectadas: ['clave-1'],
        datosAnteriores: { 'clave-1': '10' },
        datosPropuestos: { 'clave-1': '20' },
        resultadoIds: ['mov-1'],
      }),
      'emp-A'
    );
    pasarTransaccionAConfirmando('emp-A', 'tx-1');
    marcarOperacionConfirmada('emp-A', 'op-1', { transaccionId: 'tx-1', resultadoIds: ['mov-1'], fechaConfirmacion: '2026-01-01T00:05:00.000Z' });

    recuperarTransaccionesInterrumpidas('emp-A', fechaActual);
    recuperarTransaccionesInterrumpidas('emp-A', fechaActual);
    expect(obtenerEstadoVersionInventario('emp-A')?.versionInventario).toBe(1);
  });
});

describe('recuperacionInventario — caso F: confirmada + confirmada — verificación estructural (Bloqueante 3)', () => {
  function confirmarEstablemente(): void {
    guardarOperacionDePrueba(crearOperacionDirecta(), 'emp-A');
    enlazarOperacionConTransaccionActiva('emp-A', 'op-1', 'tx-1');
    guardarTransaccionInventario(crearTransaccionDirecta({ resultadoIds: ['mov-1'] }), 'emp-A');
    pasarTransaccionAConfirmando('emp-A', 'tx-1');
    actualizarEstadoVersionInventario({ empresaId: 'emp-A', versionEsperada: 0, nuevaVersion: 1, ultimaTransaccionId: 'tx-1', fechaActualizacion: 't0' });
    marcarTransaccionConfirmada('emp-A', 'tx-1', { fechaConfirmacion: '2026-01-01T00:05:00.000Z' });
    marcarOperacionConfirmada('emp-A', 'op-1', { transaccionId: 'tx-1', resultadoIds: ['mov-1'], fechaConfirmacion: '2026-01-01T00:05:00.000Z' });
  }

  it('no lanza error ni modifica nada para un par ya cerrado y coherente', () => {
    confirmarEstablemente();
    const resultado = recuperarTransaccionesInterrumpidas('emp-A', fechaActual);
    expect(resultado.operacionesRecuperadas).toEqual([]);
    expect(buscarOperacionIdempotentePorClave('emp-A', 'NI-AUTO-cc-1')?.estado).toBe('confirmada');
  });

  it('detecta resultadoIds incoherentes entre operación y transacción', () => {
    confirmarEstablemente();
    const operacion = buscarOperacionIdempotentePorClave('emp-A', 'NI-AUTO-cc-1')!;
    localStorage.setItem(
      lsKey('facturafacil_operaciones_idempotentes_inventario', 'emp-A'),
      JSON.stringify([{ ...operacion, resultadoIds: ['mov-DISTINTO'] }])
    );
    expect(() => recuperarTransaccionesInterrumpidas('emp-A', fechaActual)).toThrow(InconsistenciaDiarioInventario);
  });

  it('detecta hashEntrada incoherente entre operación y transacción', () => {
    confirmarEstablemente();
    const operacion = buscarOperacionIdempotentePorClave('emp-A', 'NI-AUTO-cc-1')!;
    localStorage.setItem(
      lsKey('facturafacil_operaciones_idempotentes_inventario', 'emp-A'),
      JSON.stringify([{ ...operacion, hashEntrada: 'hash-DISTINTO' }])
    );
    expect(() => recuperarTransaccionesInterrumpidas('emp-A', fechaActual)).toThrow(InconsistenciaDiarioInventario);
  });

  it('detecta EstadoVersionInventario por debajo de versionResultante', () => {
    guardarOperacionDePrueba(crearOperacionDirecta(), 'emp-A');
    enlazarOperacionConTransaccionActiva('emp-A', 'op-1', 'tx-1');
    guardarTransaccionInventario(crearTransaccionDirecta({ resultadoIds: [] }), 'emp-A');
    pasarTransaccionAConfirmando('emp-A', 'tx-1');
    marcarTransaccionConfirmada('emp-A', 'tx-1', { fechaConfirmacion: '2026-01-01T00:05:00.000Z' });
    marcarOperacionConfirmada('emp-A', 'op-1', { transaccionId: 'tx-1', resultadoIds: [], fechaConfirmacion: '2026-01-01T00:05:00.000Z' });
    // Nunca se actualizó EstadoVersionInventario — sigue en 0, por debajo de versionResultante=1.
    expect(() => recuperarTransaccionesInterrumpidas('emp-A', fechaActual)).toThrow(InconsistenciaDiarioInventario);
  });

  it('no vuelve a comparar el contenido actual de las claves de dominio (fuera de alcance): un cambio posterior legítimo no dispara error', () => {
    confirmarEstablemente();
    // Simula que una operación confirmada POSTERIOR cambió el valor de una clave de dominio —
    // esto es exactamente lo que la reconciliación de alcance dice que NUNCA debe compararse aquí.
    localStorage.setItem('emp-A:facturafacil_stock:prod-1', 'valor-cambiado-por-otra-operacion-futura');
    expect(() => recuperarTransaccionesInterrumpidas('emp-A', fechaActual)).not.toThrow();
  });
});

describe('recuperacionInventario — caso G (variante imposible): confirmada + intento activo preparada', () => {
  it('lanza InconsistenciaDiarioInventario', () => {
    guardarOperacionDePrueba(crearOperacionDirecta(), 'emp-A');
    enlazarOperacionConTransaccionActiva('emp-A', 'op-1', 'tx-1');
    guardarTransaccionInventario(crearTransaccionDirecta(), 'emp-A');
    localStorage.setItem(
      lsKey('facturafacil_operaciones_idempotentes_inventario', 'emp-A'),
      JSON.stringify([{ ...crearOperacionDirecta(), estado: 'confirmada', transaccionInventarioId: 'tx-1', resultadoIds: [], fechaConfirmacion: '2026-01-01T00:05:00.000Z' }])
    );
    expect(() => recuperarTransaccionesInterrumpidas('emp-A', fechaActual)).toThrow(InconsistenciaDiarioInventario);
  });
});

describe('recuperacionInventario — caso H: transacción huérfana (sin operación asociada), en cualquier estado', () => {
  it('una transacción "confirmando" cuya operacionIdempotenteId no existe lanza InconsistenciaDiarioInventario', () => {
    localStorage.setItem(
      lsKey('facturafacil_transacciones_inventario', 'emp-A'),
      JSON.stringify([crearTransaccionDirecta({ operacionIdempotenteId: 'op-fantasma', estado: 'confirmando' })])
    );
    expect(() => recuperarTransaccionesInterrumpidas('emp-A', fechaActual)).toThrow(InconsistenciaDiarioInventario);
  });

  it('una transacción huérfana YA "confirmada" (histórica) también lanza InconsistenciaDiarioInventario (Bloqueante 3, §4.6: se audita en cualquier estado)', () => {
    localStorage.setItem(
      lsKey('facturafacil_transacciones_inventario', 'emp-A'),
      JSON.stringify([crearTransaccionDirecta({ operacionIdempotenteId: 'op-fantasma', estado: 'confirmada', fechaConfirmacion: '2026-01-01T00:05:00.000Z' })])
    );
    expect(() => recuperarTransaccionesInterrumpidas('emp-A', fechaActual)).toThrow(InconsistenciaDiarioInventario);
  });

  it('una transacción huérfana "fallida" (histórica) también lanza InconsistenciaDiarioInventario', () => {
    localStorage.setItem(
      lsKey('facturafacil_transacciones_inventario', 'emp-A'),
      JSON.stringify([crearTransaccionDirecta({ operacionIdempotenteId: 'op-fantasma', estado: 'fallida' })])
    );
    expect(() => recuperarTransaccionesInterrumpidas('emp-A', fechaActual)).toThrow(InconsistenciaDiarioInventario);
  });
});

describe('recuperacionInventario — caso I: más de un intento activo para la misma operación', () => {
  it('detiene la recuperación y no elige "el primero" (el repositorio rechaza la ambigüedad como una violación estructural)', () => {
    guardarOperacionDePrueba(crearOperacionDirecta(), 'emp-A');
    localStorage.setItem(
      lsKey('facturafacil_transacciones_inventario', 'emp-A'),
      JSON.stringify([
        crearTransaccionDirecta({ id: 'tx-1', numeroIntento: 1, estado: 'confirmando' }),
        crearTransaccionDirecta({ id: 'tx-2', numeroIntento: 2, estado: 'preparada' }),
      ])
    );
    expect(() => recuperarTransaccionesInterrumpidas('emp-A', fechaActual)).toThrow(IntentoActivoDuplicadoInventario);
    // Ningún intento fue tocado — la recuperación se detuvo antes de decidir nada.
    expect(obtenerTransaccionInventarioPorId('tx-1', 'emp-A')?.estado).toBe('confirmando');
    expect(obtenerTransaccionInventarioPorId('tx-2', 'emp-A')?.estado).toBe('preparada');
  });
});

describe('recuperacionInventario — aislamiento multiempresa', () => {
  it('recuperar la empresa A no toca operaciones ni transacciones de la empresa B', () => {
    guardarOperacionDePrueba(crearOperacionDirecta({ empresaId: 'emp-A' }), 'emp-A');
    guardarOperacionDePrueba(crearOperacionDirecta({ empresaId: 'emp-B' }), 'emp-B');
    enlazarOperacionConTransaccionActiva('emp-A', 'op-1', 'tx-1');
    guardarTransaccionInventario(crearTransaccionDirecta({ empresaId: 'emp-A' }), 'emp-A');

    recuperarTransaccionesInterrumpidas('emp-A', fechaActual);
    expect(buscarOperacionIdempotentePorClave('emp-B', 'NI-AUTO-cc-1')?.estado).toBe('preparada');
  });
});

describe('recuperacionInventario — nada pendiente', () => {
  it('una empresa sin operaciones no lanza error y devuelve una lista vacía', () => {
    const resultado = recuperarTransaccionesInterrumpidas('emp-A', fechaActual);
    expect(resultado).toEqual({ empresaId: 'emp-A', operacionesRecuperadas: [] });
  });
});
