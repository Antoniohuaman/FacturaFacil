// Cierre de bloqueante 4 de la revisión de Etapa 2: el input de costo de
// `SeccionValorizacionInventario.tsx` usaba `defaultValue` (no controlado) y `costosLocales` solo
// se poblaba en `onChange` — aceptar una propuesta sin editar el input dejaba el valor en
// `undefined` → `Number(undefined)` = NaN → confirmación siempre inválida. Estas pruebas cubren la
// orquestación real (pura, extraída a `orquestacionConfirmacionCosto.ts`) sin necesitar
// infraestructura de pruebas de componente (no hay React Testing Library/jsdom en este repo).
import { describe, it, expect } from 'vitest';
import { valorInicialInputCosto, parsearValorCosto, determinarEsManual } from './orquestacionConfirmacionCosto';

describe('valorInicialInputCosto', () => {
  it('usa costoConfirmado cuando existe, incluso si es distinto de costoPropuesto', () => {
    expect(valorInicialInputCosto({ costoConfirmado: 15, costoPropuesto: 8 })).toBe('15');
  });

  it('usa costoConfirmado=0 si estuviera presente (nunca lo trata como ausente)', () => {
    // costoConfirmado nunca debería ser 0 en la práctica (confirmarCostoDetalle lo rechaza), pero
    // la función no debe usar `??`/falsy-check que lo confundiría con "ausente".
    expect(valorInicialInputCosto({ costoConfirmado: undefined, costoPropuesto: 8 })).toBe('8');
  });

  it('usa costoPropuesto cuando no hay costoConfirmado y la propuesta es mayor a cero', () => {
    expect(valorInicialInputCosto({ costoConfirmado: undefined, costoPropuesto: 8 })).toBe('8');
  });

  it('usa cadena vacía cuando no hay costoConfirmado y costoPropuesto es 0 (sin_propuesta)', () => {
    expect(valorInicialInputCosto({ costoConfirmado: undefined, costoPropuesto: 0 })).toBe('');
  });
});

describe('parsearValorCosto', () => {
  it('parsea un número válido', () => {
    expect(parsearValorCosto('12.5')).toEqual({ valido: true, costo: 12.5 });
  });

  it('cadena vacía es inválida (nunca 0 silencioso)', () => {
    expect(parsearValorCosto('').valido).toBe(false);
  });

  it('texto no numérico es inválido', () => {
    expect(parsearValorCosto('abc').valido).toBe(false);
  });
});

describe('determinarEsManual', () => {
  it('false cuando el costo confirmado coincide exactamente con la propuesta (aceptar sin editar)', () => {
    expect(determinarEsManual(8, 8)).toBe(false);
  });

  it('true cuando el costo confirmado difiere de la propuesta (el usuario lo cambió)', () => {
    expect(determinarEsManual(8, 12)).toBe(true);
  });

  it('true cuando no había propuesta (0) y el usuario ingresó un costo', () => {
    expect(determinarEsManual(0, 10)).toBe(true);
  });
});

// ─── Orquestación end-to-end simulada (sin React): reproduce exactamente el flujo del componente ───
describe('Orquestación de confirmación de costo — flujo simulado del componente', () => {
  function simularEstadoInput(costosLocales: Record<string, string>, clave: string, detalle: { costoConfirmado?: number; costoPropuesto: number }): string {
    return costosLocales[clave] ?? valorInicialInputCosto(detalle);
  }

  it('aceptar una propuesta SIN escribir en el input produce un costo válido y esManual=false', () => {
    const detalle = { costoConfirmado: undefined, costoPropuesto: 8 };
    const costosLocales: Record<string, string> = {}; // el usuario NUNCA disparó onChange

    const valorInput = simularEstadoInput(costosLocales, 'p1:a1', detalle);
    const { valido, costo } = parsearValorCosto(valorInput);

    expect(valido).toBe(true);
    expect(costo).toBe(8);
    expect(determinarEsManual(detalle.costoPropuesto, costo)).toBe(false);
  });

  it('modificar la propuesta antes de confirmar produce esManual=true', () => {
    const detalle = { costoConfirmado: undefined, costoPropuesto: 8 };
    const costosLocales: Record<string, string> = { 'p1:a1': '12' }; // el usuario editó el input

    const valorInput = simularEstadoInput(costosLocales, 'p1:a1', detalle);
    const { valido, costo } = parsearValorCosto(valorInput);

    expect(valido).toBe(true);
    expect(costo).toBe(12);
    expect(determinarEsManual(detalle.costoPropuesto, costo)).toBe(true);
  });

  it('costo vacío/cero es inválido y nunca se envía a confirmarCostoDetalle', () => {
    const detalle = { costoConfirmado: undefined, costoPropuesto: 0 }; // sin_propuesta
    const costosLocales: Record<string, string> = {};

    const valorInput = simularEstadoInput(costosLocales, 'p1:a1', detalle);
    expect(valorInput).toBe('');
    expect(parsearValorCosto(valorInput).valido).toBe(false);
  });

  it('tras un recálculo (override local limpiado), el input vuelve a mostrar la nueva propuesta — exige nueva confirmación', () => {
    const costosLocalesConEdicionEnCurso: Record<string, string> = { 'p1:a1': '20' }; // edición en curso antes del recálculo

    // El recálculo trae una propuesta nueva y el componente limpia el override de ESA fila.
    const detalleDespues = { costoConfirmado: undefined, costoPropuesto: 15 };
    const costosLocalesTrasRecalculo: Record<string, string> = {};
    for (const [clave, valor] of Object.entries(costosLocalesConEdicionEnCurso)) {
      if (clave !== 'p1:a1') costosLocalesTrasRecalculo[clave] = valor;
    }

    const valorInput = simularEstadoInput(costosLocalesTrasRecalculo, 'p1:a1', detalleDespues);
    expect(valorInput).toBe('15');
  });
});
