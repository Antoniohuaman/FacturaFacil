import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { instalarLocalStorageDePrueba } from '../repositories/localStorageDePrueba';
import {
  inicializarInfraestructuraInventario,
  empresaInventarioInicializada,
  reiniciarEstadoInicializacionInventarioParaPruebas,
} from './inicializacionInventario';
import { InconsistenciaDiarioInventario } from './erroresInventario';
import {
  buscarOperacionIdempotentePorClave,
  enlazarOperacionConTransaccionActiva,
  CLAVE_COLECCION_OPERACIONES_IDEMPOTENTES,
} from '../repositories/operacionIdempotenteInventario.repository';
import { guardarTransaccionInventario } from '../repositories/transaccionInventario.repository';
import { reservarOperacionIdempotente } from './idempotenciaInventario';
import type { OperacionIdempotenteInventario } from '../models/operacionIdempotenteInventario.types';
import type { TransaccionInventario } from '../models/transaccionInventario.types';
import { lsKey } from '../../../../../shared/tenant';

let contadorId = 0;
function generarId(): string {
  contadorId += 1;
  return `gen-${contadorId}`;
}

instalarLocalStorageDePrueba();

beforeEach(() => {
  localStorage.clear();
  reiniciarEstadoInicializacionInventarioParaPruebas();
});
afterEach(() => {
  localStorage.clear();
  reiniciarEstadoInicializacionInventarioParaPruebas();
});

function fechaActual(): string {
  return '2026-04-01T00:00:00.000Z';
}

function guardarOperacionDePrueba(operacion: OperacionIdempotenteInventario, empresaId: string): void {
  const clave = lsKey(CLAVE_COLECCION_OPERACIONES_IDEMPOTENTES, empresaId);
  const actuales = JSON.parse(localStorage.getItem(clave) ?? '[]') as OperacionIdempotenteInventario[];
  localStorage.setItem(clave, JSON.stringify([...actuales, operacion]));
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

describe('inicializacionInventario — sin efectos secundarios antes de invocar explícitamente', () => {
  it('una operación preparada sin transacción no se toca hasta llamar a inicializarInfraestructuraInventario', () => {
    guardarOperacionDePrueba(crearOperacionDirecta(), 'emp-A');
    expect(buscarOperacionIdempotentePorClave('emp-A', 'NI-AUTO-cc-1')?.estado).toBe('preparada');
    expect(empresaInventarioInicializada('emp-A')).toBe(false);
  });
});

describe('inicializacionInventario — adquiere el bloqueo y ejecuta recuperación (Bloqueante 1, §2.4)', () => {
  it('una operación preparada SIN ningún intento nunca se marca fallida automáticamente (caso A siempre ambiguo, incluso en inicialización)', async () => {
    guardarOperacionDePrueba(crearOperacionDirecta(), 'emp-A');
    const resultado = await inicializarInfraestructuraInventario('emp-A', fechaActual);
    expect(buscarOperacionIdempotentePorClave('emp-A', 'NI-AUTO-cc-1')?.estado).toBe('preparada');
    expect(resultado?.operacionesRecuperadas).toEqual([{ operacionId: 'op-1', clave: 'NI-AUTO-cc-1', accion: 'reserva_sin_transaccion_diagnosticada' }]);
  });

  it('SÍ resuelve un intento activo preparada (caso B) — no es ambiguo, hay evidencia objetiva de un ciclo de bloqueo anterior', async () => {
    guardarOperacionDePrueba(crearOperacionDirecta(), 'emp-A');
    enlazarOperacionConTransaccionActiva('emp-A', 'op-1', 'tx-1');
    guardarTransaccionInventario(crearTransaccionDirecta(), 'emp-A');

    await inicializarInfraestructuraInventario('emp-A', fechaActual);
    expect(buscarOperacionIdempotentePorClave('emp-A', 'NI-AUTO-cc-1')?.estado).toBe('fallida');
  });
});

describe('inicializacionInventario — idempotente por empresa durante la sesión', () => {
  it('una segunda llamada no vuelve a ejecutar recuperación: devuelve undefined y no repite el diagnóstico', async () => {
    guardarOperacionDePrueba(crearOperacionDirecta(), 'emp-A');
    const primera = await inicializarInfraestructuraInventario('emp-A', fechaActual);
    expect(primera?.operacionesRecuperadas).toHaveLength(1);

    const segunda = await inicializarInfraestructuraInventario('emp-A', fechaActual);
    expect(segunda).toBeUndefined();
    expect(empresaInventarioInicializada('emp-A')).toBe(true);
  });
});

describe('inicializacionInventario — permite reintentar tras una inicialización fallida', () => {
  it('si la recuperación lanza una inconsistencia, la empresa NO queda marcada como inicializada', async () => {
    // Transacción huérfana (caso H): operacionIdempotenteId que no existe. Se fuerza directamente
    // en 'confirmando' — el repositorio nunca permite insertar un intento nuevo en ese estado.
    localStorage.setItem(
      lsKey('facturafacil_transacciones_inventario', 'emp-A'),
      JSON.stringify([crearTransaccionDirecta({ operacionIdempotenteId: 'op-fantasma', estado: 'confirmando' })])
    );

    await expect(inicializarInfraestructuraInventario('emp-A', fechaActual)).rejects.toThrow(InconsistenciaDiarioInventario);
    expect(empresaInventarioInicializada('emp-A')).toBe(false);

    // Una segunda llamada, sin corregir el problema, vuelve a intentarlo y vuelve a fallar (nunca se oculta el error).
    await expect(inicializarInfraestructuraInventario('emp-A', fechaActual)).rejects.toThrow(InconsistenciaDiarioInventario);
    expect(empresaInventarioInicializada('emp-A')).toBe(false);
  });
});

describe('inicializacionInventario — comparte el bloqueo por empresa con la reserva de idempotencia (Bloqueante 1)', () => {
  it('inicialización y reserva concurrentes para la misma empresa no corrompen el estado ni se pisan (misma cola de bloqueo)', async () => {
    // Trabajo pendiente ajeno (caso B: intento activo preparada) que la inicialización resolverá.
    guardarOperacionDePrueba(crearOperacionDirecta({ id: 'op-vieja', clave: 'clave-vieja' }), 'emp-A');
    enlazarOperacionConTransaccionActiva('emp-A', 'op-vieja', 'tx-vieja');
    guardarTransaccionInventario(crearTransaccionDirecta({ id: 'tx-vieja', operacionIdempotenteId: 'op-vieja', claveIdempotencia: 'clave-vieja' }), 'emp-A');

    const [resultadoInit, resultadoReserva] = await Promise.all([
      inicializarInfraestructuraInventario('emp-A', fechaActual),
      reservarOperacionIdempotente({
        empresaId: 'emp-A',
        clave: 'clave-nueva',
        tipoOperacion: 'ni_automatica',
        hashEntrada: 'hash-1',
        referenciaDocumentoId: 'cc-1',
        referenciaDocumentoTipo: 'comprobante_compra',
        generarId,
        fechaActual,
      }),
    ]);

    expect(resultadoInit?.operacionesRecuperadas[0].accion).toBe('transaccion_preparada_marcada_fallida');
    expect(resultadoReserva.tipo).toBe('nueva');
    expect(buscarOperacionIdempotentePorClave('emp-A', 'clave-vieja')?.estado).toBe('fallida');
    expect(buscarOperacionIdempotentePorClave('emp-A', 'clave-nueva')?.estado).toBe('preparada');
  });
});

describe('inicializacionInventario — aislamiento multiempresa', () => {
  it('inicializar la empresa A no marca la empresa B como inicializada', async () => {
    await inicializarInfraestructuraInventario('emp-A', fechaActual);
    expect(empresaInventarioInicializada('emp-A')).toBe(true);
    expect(empresaInventarioInicializada('emp-B')).toBe(false);
  });
});
