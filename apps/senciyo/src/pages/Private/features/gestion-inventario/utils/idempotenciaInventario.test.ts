import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { instalarLocalStorageDePrueba } from '../repositories/localStorageDePrueba';
import { reservarOperacionIdempotente } from './idempotenciaInventario';
import { ConflictoIdempotencia, RecuperacionInventarioNoDeterminista } from './erroresInventario';
import {
  buscarOperacionIdempotentePorClave,
  enlazarOperacionConTransaccionActiva,
  listarOperacionesIdempotentesPorEmpresa,
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
import { actualizarEstadoVersionInventario } from '../repositories/estadoVersionInventario.repository';
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
  return '2026-01-01T00:00:00.000Z';
}

function parametrosBase(overrides: Partial<Parameters<typeof reservarOperacionIdempotente>[0]> = {}) {
  return {
    empresaId: 'emp-A',
    clave: 'NI-AUTO-cc-1',
    tipoOperacion: 'ni_automatica' as const,
    hashEntrada: 'hash-1',
    referenciaDocumentoId: 'cc-1',
    referenciaDocumentoTipo: 'comprobante_compra' as const,
    generarId,
    fechaActual,
    ...overrides,
  };
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
 * Helper EXCLUSIVO de pruebas: escribe directamente en el localStorage de prueba, sin pasar por
 * ninguna validación. Reemplaza al antiguo `guardarOperacionIdempotente` del repositorio, que ya
 * no se exporta desde ningún lado (ver `utils/idempotenciaInventario.ts` — la única forma
 * productiva de crear una reserva es `reservarOperacionIdempotente`).
 */
function guardarOperacionDePrueba(operacion: OperacionIdempotenteInventario, empresaId: string): void {
  const clave = lsKey(CLAVE_COLECCION_OPERACIONES_IDEMPOTENTES, empresaId);
  const actuales = JSON.parse(localStorage.getItem(clave) ?? '[]') as OperacionIdempotenteInventario[];
  localStorage.setItem(clave, JSON.stringify([...actuales, operacion]));
}

/** Secuencia realista completa: reserva -> crea el intento -> aplica versión -> lo confirma -> confirma la operación. */
function crearOperacionYTransaccionConfirmadas(resultadoIds: string[]): void {
  guardarOperacionDePrueba(crearOperacionDirecta(), 'emp-A');
  enlazarOperacionConTransaccionActiva('emp-A', 'op-1', 'tx-1');
  guardarTransaccionInventario(crearTransaccionDirecta({ resultadoIds }), 'emp-A');
  pasarTransaccionAConfirmando('emp-A', 'tx-1');
  actualizarEstadoVersionInventario({ empresaId: 'emp-A', versionEsperada: 0, nuevaVersion: 1, ultimaTransaccionId: 'tx-1', fechaActualizacion: '2026-01-01T00:05:00.000Z' });
  marcarTransaccionConfirmada('emp-A', 'tx-1', { fechaConfirmacion: '2026-01-01T00:05:00.000Z' });
  marcarOperacionConfirmada('emp-A', 'op-1', { transaccionId: 'tx-1', resultadoIds, fechaConfirmacion: '2026-01-01T00:05:00.000Z' });
}

describe('idempotenciaInventario — caso A: (empresaId, clave) no existe', () => {
  it('crea la operación en preparada, sin transaccionInventarioId, resultadoIds vacío', async () => {
    const resultado = await reservarOperacionIdempotente(parametrosBase());
    expect(resultado.tipo).toBe('nueva');
    expect(resultado.operacion.estado).toBe('preparada');
    expect(resultado.operacion.resultadoIds).toEqual([]);
    expect(resultado.operacion.transaccionInventarioId).toBeUndefined();
    expect(buscarOperacionIdempotentePorClave('emp-A', 'NI-AUTO-cc-1')?.id).toBe(resultado.operacion.id);
  });

  it('la reserva es la primera escritura real: queda persistida de inmediato', async () => {
    await reservarOperacionIdempotente(parametrosBase());
    expect(listarOperacionesIdempotentesPorEmpresa('emp-A')).toHaveLength(1);
  });

  it('rechaza un id duplicado (defensa en profundidad de la primitiva interna de inserción), aunque las claves sean distintas', async () => {
    const siguienteId = 'id-fijo';
    const idFijo = () => siguienteId;
    await reservarOperacionIdempotente(parametrosBase({ clave: 'clave-1', generarId: idFijo }));
    await expect(reservarOperacionIdempotente(parametrosBase({ clave: 'clave-2', generarId: idFijo }))).rejects.toThrow();
  });
});

describe('idempotenciaInventario — caso B: confirmada con el mismo hash (reintento legítimo)', () => {
  it('devuelve repetida con exactamente los resultadoIds previos, cero escrituras nuevas', async () => {
    crearOperacionYTransaccionConfirmadas(['mov-1', 'capa-1']);

    const resultado = await reservarOperacionIdempotente(parametrosBase({ hashEntrada: 'hash-1' }));
    expect(resultado.tipo).toBe('repetida');
    if (resultado.tipo === 'repetida') {
      expect(resultado.resultadoIds).toEqual(['mov-1', 'capa-1']);
    }
    expect(listarOperacionesIdempotentesPorEmpresa('emp-A')).toHaveLength(1);
  });

  it('no modifica fechaConfirmacion ni ningún otro campo de la operación existente', async () => {
    crearOperacionYTransaccionConfirmadas(['mov-1']);

    await reservarOperacionIdempotente(parametrosBase({ hashEntrada: 'hash-1' }));
    const tras = buscarOperacionIdempotentePorClave('emp-A', 'NI-AUTO-cc-1');
    expect(tras?.fechaConfirmacion).toBe('2026-01-01T00:05:00.000Z');
    expect(tras?.resultadoIds).toEqual(['mov-1']);
  });
});

describe('idempotenciaInventario — caso C: confirmada con hash distinto', () => {
  it('lanza ConflictoIdempotencia con información estructurada, cero escrituras', async () => {
    crearOperacionYTransaccionConfirmadas(['mov-1']);

    await expect(reservarOperacionIdempotente(parametrosBase({ hashEntrada: 'hash-DISTINTO' }))).rejects.toThrow(ConflictoIdempotencia);
    try {
      await reservarOperacionIdempotente(parametrosBase({ hashEntrada: 'hash-DISTINTO' }));
      throw new Error('no debería llegar aquí');
    } catch (error) {
      const conflicto = error as ConflictoIdempotencia;
      expect(conflicto.empresaId).toBe('emp-A');
      expect(conflicto.clave).toBe('NI-AUTO-cc-1');
      expect(conflicto.hashExistente).toBe('hash-1');
      expect(conflicto.hashRecibido).toBe('hash-DISTINTO');
    }
    const tras = buscarOperacionIdempotentePorClave('emp-A', 'NI-AUTO-cc-1');
    expect(tras?.resultadoIds).toEqual(['mov-1']);
  });
});

describe('idempotenciaInventario — caso "ambigua": preparada existente sin ningún intento', () => {
  it('devuelve ambigua sin crear una segunda fila con la misma clave, sin destruir la reserva', async () => {
    guardarOperacionDePrueba(crearOperacionDirecta({ estado: 'preparada' }), 'emp-A');
    const resultado = await reservarOperacionIdempotente(parametrosBase());
    expect(resultado.tipo).toBe('ambigua');
    expect(resultado.operacion.id).toBe('op-1');
    expect(listarOperacionesIdempotentesPorEmpresa('emp-A')).toHaveLength(1);
    expect(buscarOperacionIdempotentePorClave('emp-A', 'NI-AUTO-cc-1')?.estado).toBe('preparada');
  });

  it('la operación ambigua permanece intacta incluso si ya tiene un intento activo (preparada+confirmando la deja igual, ya que recovery corre primero y la resuelve como caso C)', async () => {
    guardarOperacionDePrueba(crearOperacionDirecta({ estado: 'preparada' }), 'emp-A');
    enlazarOperacionConTransaccionActiva('emp-A', 'op-1', 'tx-1');
    guardarTransaccionInventario(crearTransaccionDirecta({ estado: 'preparada' }), 'emp-A');
    pasarTransaccionAConfirmando('emp-A', 'tx-1');

    // La recuperación interna (ejecutada al inicio de reservarOperacionIdempotente) completa el
    // caso C (transacción confirmando sin escrituras pendientes) y confirma la operación.
    const resultado = await reservarOperacionIdempotente(parametrosBase());
    expect(resultado.tipo).toBe('repetida');
  });
});

describe('idempotenciaInventario — caso E: fallida existente, reactivación segura', () => {
  it('sin ningún intento: reactiva la MISMA fila, permite actualizar el hash', async () => {
    guardarOperacionDePrueba(crearOperacionDirecta(), 'emp-A');
    marcarOperacionFallida('emp-A', 'op-1');
    const resultado = await reservarOperacionIdempotente(parametrosBase({ hashEntrada: 'hash-NUEVO-INTENTO' }));
    expect(resultado.tipo).toBe('reactivada');
    expect(resultado.operacion.id).toBe('op-1');
    expect(resultado.operacion.estado).toBe('preparada');
    expect(resultado.operacion.hashEntrada).toBe('hash-NUEVO-INTENTO');
    expect(resultado.operacion.transaccionInventarioId).toBeUndefined();
    expect(listarOperacionesIdempotentesPorEmpresa('emp-A')).toHaveLength(1);
  });

  it('con un intento histórico fallido: reactiva SIN eliminar el intento fallido (evidencia histórica conservada)', async () => {
    guardarOperacionDePrueba(crearOperacionDirecta(), 'emp-A');
    enlazarOperacionConTransaccionActiva('emp-A', 'op-1', 'tx-1');
    guardarTransaccionInventario(crearTransaccionDirecta({ numeroIntento: 1 }), 'emp-A');
    marcarTransaccionFallida('emp-A', 'tx-1');
    marcarOperacionFallida('emp-A', 'op-1');

    const resultado = await reservarOperacionIdempotente(parametrosBase());
    expect(resultado.tipo).toBe('reactivada');
    // El intento histórico SIGUE existiendo, intacto — nunca se borra (Bloqueante 2).
    const historico = obtenerTransaccionInventarioPorId('tx-1', 'emp-A');
    expect(historico).toBeDefined();
    expect(historico?.estado).toBe('fallida');
  });

  it('rechaza reactivar si la operación fallida conserva resultadoIds no vacíos (viola su propio invariante)', async () => {
    localStorage.setItem(
      lsKey('facturafacil_operaciones_idempotentes_inventario', 'emp-A'),
      JSON.stringify([crearOperacionDirecta({ estado: 'fallida', resultadoIds: ['mov-1'] })])
    );
    await expect(reservarOperacionIdempotente(parametrosBase())).rejects.toThrow(RecuperacionInventarioNoDeterminista);
  });

  it('rechaza reactivar si existe un intento activo para la operación (inconsistencia real, no delega)', async () => {
    guardarOperacionDePrueba(crearOperacionDirecta(), 'emp-A');
    enlazarOperacionConTransaccionActiva('emp-A', 'op-1', 'tx-1');
    guardarTransaccionInventario(crearTransaccionDirecta({ numeroIntento: 1, estado: 'preparada' }), 'emp-A');
    marcarTransaccionFallida('emp-A', 'tx-1');
    marcarOperacionFallida('emp-A', 'op-1');
    // Se fuerza directamente un segundo intento "activo" para simular la corrupción: la operación
    // dice 'fallida' pero el diario todavía tiene un intento en curso.
    localStorage.setItem(
      lsKey('facturafacil_transacciones_inventario', 'emp-A'),
      JSON.stringify([crearTransaccionDirecta({ id: 'tx-1', numeroIntento: 1, estado: 'fallida' }), crearTransaccionDirecta({ id: 'tx-2', numeroIntento: 2, estado: 'confirmando' })])
    );
    await expect(reservarOperacionIdempotente(parametrosBase())).rejects.toThrow(RecuperacionInventarioNoDeterminista);
  });

  it('rechaza reactivar si un intento histórico llegó a confirmada (combinación imposible)', async () => {
    localStorage.setItem(
      lsKey('facturafacil_operaciones_idempotentes_inventario', 'emp-A'),
      JSON.stringify([crearOperacionDirecta({ estado: 'fallida', resultadoIds: [] })])
    );
    localStorage.setItem(
      lsKey('facturafacil_transacciones_inventario', 'emp-A'),
      JSON.stringify([crearTransaccionDirecta({ id: 'tx-1', numeroIntento: 1, estado: 'confirmada', fechaConfirmacion: '2026-01-01T00:05:00.000Z' })])
    );
    await expect(reservarOperacionIdempotente(parametrosBase())).rejects.toThrow(RecuperacionInventarioNoDeterminista);
  });
});

describe('idempotenciaInventario — caso F: revertida existente', () => {
  it('nunca se trata como si no hubiera existido: lanza error explícito, no crea una segunda fila', async () => {
    guardarOperacionDePrueba(crearOperacionDirecta(), 'emp-A');
    enlazarOperacionConTransaccionActiva('emp-A', 'op-1', 'tx-1');
    marcarOperacionConfirmada('emp-A', 'op-1', { transaccionId: 'tx-1', resultadoIds: [], fechaConfirmacion: '2026-01-01T00:05:00.000Z' });
    // 'revertida' no es alcanzable en Etapa 1B por ninguna función productiva — se fuerza directamente.
    const operacionActual = buscarOperacionIdempotentePorClave('emp-A', 'NI-AUTO-cc-1')!;
    localStorage.setItem(
      lsKey('facturafacil_operaciones_idempotentes_inventario', 'emp-A'),
      JSON.stringify([{ ...operacionActual, estado: 'revertida' }])
    );
    await expect(reservarOperacionIdempotente(parametrosBase())).rejects.toThrow();
    expect(listarOperacionesIdempotentesPorEmpresa('emp-A')).toHaveLength(1);
  });
});

describe('idempotenciaInventario — unicidad (empresaId, clave), nunca clave sola', () => {
  it('la misma clave puede reservarse de forma independiente ("nueva") en dos empresas distintas', async () => {
    const resultadoA = await reservarOperacionIdempotente(parametrosBase({ empresaId: 'emp-A' }));
    const resultadoB = await reservarOperacionIdempotente(parametrosBase({ empresaId: 'emp-B' }));
    expect(resultadoA.tipo).toBe('nueva');
    expect(resultadoB.tipo).toBe('nueva');
    expect(listarOperacionesIdempotentesPorEmpresa('emp-A')).toHaveLength(1);
    expect(listarOperacionesIdempotentesPorEmpresa('emp-B')).toHaveLength(1);
  });
});

describe('idempotenciaInventario — bloqueo unificado (Bloqueante 1)', () => {
  it('reserva dos claves distintas de la misma empresa de forma concurrente sin perder ninguna fila', async () => {
    const [resultado1, resultado2] = await Promise.all([
      reservarOperacionIdempotente(parametrosBase({ clave: 'clave-1' })),
      reservarOperacionIdempotente(parametrosBase({ clave: 'clave-2' })),
    ]);
    expect(resultado1.tipo).toBe('nueva');
    expect(resultado2.tipo).toBe('nueva');
    expect(listarOperacionesIdempotentesPorEmpresa('emp-A')).toHaveLength(2);
  });

  it('dos reservas concurrentes para la MISMA clave nunca crean dos operaciones ni se pisan: una gana, la otra ve el resultado ya creado', async () => {
    const [resultado1, resultado2] = await Promise.all([
      reservarOperacionIdempotente(parametrosBase({ clave: 'clave-1' })),
      reservarOperacionIdempotente(parametrosBase({ clave: 'clave-1' })),
    ]);
    // Como el bloqueo serializa ambas llamadas, la segunda ve la operación ya reservada por la
    // primera con el MISMO hash — resultado "repetida" no aplica aún (no está confirmada), así que
    // debería ver "ambigua" (preparada, sin intento) — en cualquier caso, nunca dos filas.
    expect([resultado1.tipo, resultado2.tipo]).toContain('nueva');
    expect(listarOperacionesIdempotentesPorEmpresa('emp-A')).toHaveLength(1);
  });
});

describe('idempotenciaInventario — retiro de exportaciones inseguras: la orquestación segura es la ÚNICA vía', () => {
  it('el repositorio ya no exporta guardarOperacionIdempotente — ningún módulo productivo puede importarla', async () => {
    const modulo = await import('../repositories/operacionIdempotenteInventario.repository');
    expect('guardarOperacionIdempotente' in modulo).toBe(false);
  });

  it('el repositorio ya no exporta marcarOperacionParaReintento — ningún módulo productivo puede importarla', async () => {
    const modulo = await import('../repositories/operacionIdempotenteInventario.repository');
    expect('marcarOperacionParaReintento' in modulo).toBe(false);
  });

  it('reservarOperacionIdempotente (la única vía para crear una reserva) sigue funcionando correctamente de punta a punta', async () => {
    const resultado = await reservarOperacionIdempotente(parametrosBase());
    expect(resultado.tipo).toBe('nueva');
  });

  it('una reactivación válida a través de reservarOperacionIdempotente (la única vía para reactivar) continúa funcionando', async () => {
    guardarOperacionDePrueba(crearOperacionDirecta(), 'emp-A');
    marcarOperacionFallida('emp-A', 'op-1');
    const resultado = await reservarOperacionIdempotente(parametrosBase({ hashEntrada: 'hash-nuevo' }));
    expect(resultado.tipo).toBe('reactivada');
  });

  it('una reactivación con un intento activo, invocada a través de reservarOperacionIdempotente, sigue siendo rechazada', async () => {
    guardarOperacionDePrueba(crearOperacionDirecta(), 'emp-A');
    enlazarOperacionConTransaccionActiva('emp-A', 'op-1', 'tx-1');
    guardarTransaccionInventario(crearTransaccionDirecta({ numeroIntento: 1, estado: 'preparada' }), 'emp-A');
    marcarOperacionFallida('emp-A', 'op-1');
    await expect(reservarOperacionIdempotente(parametrosBase())).rejects.toThrow(RecuperacionInventarioNoDeterminista);
  });

  it('una reactivación con un intento confirmado, invocada a través de reservarOperacionIdempotente, sigue siendo rechazada', async () => {
    localStorage.setItem(
      lsKey('facturafacil_operaciones_idempotentes_inventario', 'emp-A'),
      JSON.stringify([crearOperacionDirecta({ estado: 'fallida', resultadoIds: [] })])
    );
    localStorage.setItem(
      lsKey('facturafacil_transacciones_inventario', 'emp-A'),
      JSON.stringify([crearTransaccionDirecta({ id: 'tx-1', numeroIntento: 1, estado: 'confirmada', fechaConfirmacion: '2026-01-01T00:05:00.000Z' })])
    );
    await expect(reservarOperacionIdempotente(parametrosBase())).rejects.toThrow(RecuperacionInventarioNoDeterminista);
  });
});
