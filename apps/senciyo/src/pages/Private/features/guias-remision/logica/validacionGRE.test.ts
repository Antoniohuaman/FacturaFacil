import { describe, it, expect } from 'vitest';
import { validarGREParaEmitir, hayErrores } from './validacionGRE';
import { GUIA_REMISION_BORRADOR } from '../modelos/GuiaRemision';
import type { GuiaRemision, BienGRE } from '../modelos/GuiaRemision';

function bien(overrides: Partial<BienGRE> = {}): BienGRE {
  return {
    id: 'bien-1',
    descripcion: 'Producto A',
    unidad: 'NIU',
    cantidad: 1,
    normalizado: false,
    ...overrides,
  };
}

/** Guía Remitente, motivo '01' (regla base), con todos los campos mínimos completos — el punto de
 * partida de todas las pruebas de esta suite: se anula UN campo por prueba, nunca varios a la vez. */
function guiaValidaBase(): GuiaRemision {
  return {
    ...GUIA_REMISION_BORRADOR('remitente'),
    serie: 'T001',
    destinatarioNombre: 'Cliente de prueba',
    destinatarioTipoDocumento: 'RUC',
    destinatarioNumeroDocumento: '20123456789',
    bienes: [bien()],
    pesoTotal: 10,
    puntoPartida: { direccion: 'Av. Origen 123' },
    puntoLlegada: { direccion: 'Av. Destino 456' },
    modalidadTransporte: '02',
    transportePrivado: {
      fechaInicioTraslado: '2026-08-08',
      vehiculosIds: [],
      conductoresIds: [],
      esM1oL: true,
      placaVehiculoM1L: 'ABC-123',
    },
  };
}

describe('validarGREParaEmitir — guía válida de referencia', () => {
  it('la guía base de la suite no tiene errores', () => {
    expect(hayErrores(validarGREParaEmitir(guiaValidaBase()))).toBe(false);
  });
});

describe('validarGREParaEmitir — campos ya existentes', () => {
  it('serie vacía es inválida', () => {
    const errores = validarGREParaEmitir({ ...guiaValidaBase(), serie: '' });
    expect(errores.serie).toBeDefined();
  });

  it('sin bienes es inválido', () => {
    const errores = validarGREParaEmitir({ ...guiaValidaBase(), bienes: [] });
    expect(errores.bienes).toBe('Debe incluir al menos un bien.');
  });

  it('peso total <= 0 es inválido', () => {
    expect(validarGREParaEmitir({ ...guiaValidaBase(), pesoTotal: 0 }).pesoTotal).toBeDefined();
    expect(validarGREParaEmitir({ ...guiaValidaBase(), pesoTotal: undefined }).pesoTotal).toBeDefined();
  });

  it('punto de partida sin dirección es inválido', () => {
    const errores = validarGREParaEmitir({ ...guiaValidaBase(), puntoPartida: { direccion: '' } });
    expect(errores.puntoPartida).toBeDefined();
  });

  it('punto de llegada sin dirección es inválido cuando el motivo lo exige (motivo 01)', () => {
    const errores = validarGREParaEmitir({ ...guiaValidaBase(), puntoLlegada: { direccion: '' } });
    expect(errores.puntoLlegada).toBeDefined();
  });

  it('sin datos de transporte privado es inválido', () => {
    const errores = validarGREParaEmitir({ ...guiaValidaBase(), transportePrivado: undefined });
    expect(errores.transporte).toBeDefined();
  });
});

// GRE-P1-005 — cantidad de bienes: cada línea debe tener cantidad > 0 y finita.
describe('validarGREParaEmitir — cantidad de bienes (GRE-P1-005)', () => {
  it('cantidad entera positiva es válida', () => {
    const errores = validarGREParaEmitir({ ...guiaValidaBase(), bienes: [bien({ cantidad: 1 })] });
    expect(errores.bienes).toBeUndefined();
  });

  it('cantidad decimal positiva es válida (el modelo lo permite)', () => {
    const errores = validarGREParaEmitir({ ...guiaValidaBase(), bienes: [bien({ cantidad: 2.5 })] });
    expect(errores.bienes).toBeUndefined();
  });

  it('cantidad 0 es inválida', () => {
    const errores = validarGREParaEmitir({ ...guiaValidaBase(), bienes: [bien({ cantidad: 0 })] });
    expect(errores.bienes).toBeDefined();
  });

  it('cantidad negativa es inválida', () => {
    const errores = validarGREParaEmitir({ ...guiaValidaBase(), bienes: [bien({ cantidad: -5 })] });
    expect(errores.bienes).toBeDefined();
  });

  it('cantidad NaN es inválida', () => {
    const errores = validarGREParaEmitir({ ...guiaValidaBase(), bienes: [bien({ cantidad: NaN })] });
    expect(errores.bienes).toBeDefined();
  });

  it('cantidad Infinity es inválida', () => {
    const errores = validarGREParaEmitir({ ...guiaValidaBase(), bienes: [bien({ cantidad: Infinity })] });
    expect(errores.bienes).toBeDefined();
  });

  it('cantidad -Infinity es inválida', () => {
    const errores = validarGREParaEmitir({ ...guiaValidaBase(), bienes: [bien({ cantidad: -Infinity })] });
    expect(errores.bienes).toBeDefined();
  });

  it('con varios bienes, basta que UNO tenga cantidad inválida para rechazar la emisión completa', () => {
    const errores = validarGREParaEmitir({
      ...guiaValidaBase(),
      bienes: [bien({ id: 'b1', cantidad: 3 }), bien({ id: 'b2', descripcion: 'Producto B', cantidad: 0 })],
    });
    expect(errores.bienes).toBeDefined();
  });

  it('el mensaje identifica el bien con la cantidad inválida', () => {
    const errores = validarGREParaEmitir({
      ...guiaValidaBase(),
      bienes: [bien({ descripcion: 'Producto Defectuoso', cantidad: -1 })],
    });
    expect(errores.bienes).toContain('Producto Defectuoso');
  });
});
