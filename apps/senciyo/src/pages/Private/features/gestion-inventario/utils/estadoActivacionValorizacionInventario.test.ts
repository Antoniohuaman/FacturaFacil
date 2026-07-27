import { describe, expect, it } from 'vitest';
import {
  resolverModoOperacion,
  esValorizacionActiva,
  puedeOperarCuantitativamente,
  puedeMutarInventario,
  validarTransicionEstadoValorizacion,
} from './estadoActivacionValorizacionInventario';
import { ESTADOS_ACTIVACION_VALORIZACION } from '../models/estadoActivacionValorizacion.types';

describe('resolverModoOperacion', () => {
  it('cubre los 9 estados sin lanzar', () => {
    for (const estado of ESTADOS_ACTIVACION_VALORIZACION) {
      expect(() => resolverModoOperacion(estado)).not.toThrow();
    }
  });

  it('resuelve cada estado al modo esperado', () => {
    expect(resolverModoOperacion('no_iniciada')).toBe('cuantitativo_libre');
    expect(resolverModoOperacion('en_preparacion')).toBe('cuantitativo_invalida_snapshot');
    expect(resolverModoOperacion('pendiente_costos')).toBe('cuantitativo_invalida_snapshot');
    expect(resolverModoOperacion('validada')).toBe('bloqueado_snapshot_aprobado');
    expect(resolverModoOperacion('cancelada_antes_activacion')).toBe('cuantitativo_libre');
    expect(resolverModoOperacion('activando')).toBe('bloqueado_activacion_en_curso');
    expect(resolverModoOperacion('activa')).toBe('valorizado_exclusivo');
    expect(resolverModoOperacion('fallida_recuperable')).toBe('bloqueado_activacion_en_curso');
    expect(resolverModoOperacion('suspendida_por_inconsistencia')).toBe('bloqueado_suspension');
  });
});

describe('esValorizacionActiva', () => {
  it('solo es true en activa y suspendida_por_inconsistencia', () => {
    expect(esValorizacionActiva('activa')).toBe(true);
    expect(esValorizacionActiva('suspendida_por_inconsistencia')).toBe(true);
    for (const estado of ESTADOS_ACTIVACION_VALORIZACION) {
      if (estado === 'activa' || estado === 'suspendida_por_inconsistencia') continue;
      expect(esValorizacionActiva(estado)).toBe(false);
    }
  });
});

describe('puedeOperarCuantitativamente', () => {
  it('es true en no_iniciada, en_preparacion, pendiente_costos y cancelada_antes_activacion', () => {
    expect(puedeOperarCuantitativamente('no_iniciada')).toBe(true);
    expect(puedeOperarCuantitativamente('en_preparacion')).toBe(true);
    expect(puedeOperarCuantitativamente('pendiente_costos')).toBe(true);
    expect(puedeOperarCuantitativamente('cancelada_antes_activacion')).toBe(true);
  });

  it('es false en validada, activando, activa, fallida_recuperable y suspendida_por_inconsistencia', () => {
    expect(puedeOperarCuantitativamente('validada')).toBe(false);
    expect(puedeOperarCuantitativamente('activando')).toBe(false);
    expect(puedeOperarCuantitativamente('activa')).toBe(false);
    expect(puedeOperarCuantitativamente('fallida_recuperable')).toBe(false);
    expect(puedeOperarCuantitativamente('suspendida_por_inconsistencia')).toBe(false);
  });
});

describe('puedeMutarInventario', () => {
  it('es false solo en los 3 modos bloqueados', () => {
    expect(puedeMutarInventario('validada')).toBe(false);
    expect(puedeMutarInventario('activando')).toBe(false);
    expect(puedeMutarInventario('fallida_recuperable')).toBe(false);
    expect(puedeMutarInventario('suspendida_por_inconsistencia')).toBe(false);
  });

  it('es true en los estados cuantitativos y en activa (valorizado_exclusivo permite mutar con costo)', () => {
    expect(puedeMutarInventario('no_iniciada')).toBe(true);
    expect(puedeMutarInventario('en_preparacion')).toBe(true);
    expect(puedeMutarInventario('pendiente_costos')).toBe(true);
    expect(puedeMutarInventario('cancelada_antes_activacion')).toBe(true);
    expect(puedeMutarInventario('activa')).toBe(true);
  });
});

describe('validarTransicionEstadoValorizacion', () => {
  it('permite el recorrido productivo completo de Etapa 2', () => {
    expect(() => validarTransicionEstadoValorizacion('no_iniciada', 'en_preparacion')).not.toThrow();
    expect(() => validarTransicionEstadoValorizacion('en_preparacion', 'pendiente_costos')).not.toThrow();
    expect(() => validarTransicionEstadoValorizacion('pendiente_costos', 'validada')).not.toThrow();
    expect(() => validarTransicionEstadoValorizacion('validada', 'cancelada_antes_activacion')).not.toThrow();
    expect(() => validarTransicionEstadoValorizacion('cancelada_antes_activacion', 'en_preparacion')).not.toThrow();
  });

  it('permite cancelar desde en_preparacion y pendiente_costos', () => {
    expect(() => validarTransicionEstadoValorizacion('en_preparacion', 'cancelada_antes_activacion')).not.toThrow();
    expect(() => validarTransicionEstadoValorizacion('pendiente_costos', 'cancelada_antes_activacion')).not.toThrow();
  });

  it('cierre Etapa 4B: permite validada → activando (inicio de activación)', () => {
    expect(() => validarTransicionEstadoValorizacion('validada', 'activando')).not.toThrow();
  });

  it('cierre Etapa 4B: permite activando → activa (activación exitosa)', () => {
    expect(() => validarTransicionEstadoValorizacion('activando', 'activa')).not.toThrow();
  });

  it('cierre Etapa 4B: permite activando → fallida_recuperable y fallida_recuperable → activando (interrupción y reintento)', () => {
    expect(() => validarTransicionEstadoValorizacion('activando', 'fallida_recuperable')).not.toThrow();
    expect(() => validarTransicionEstadoValorizacion('fallida_recuperable', 'activando')).not.toThrow();
  });

  it('rechaza saltos de estado (no_iniciada → validada directamente)', () => {
    expect(() => validarTransicionEstadoValorizacion('no_iniciada', 'validada')).toThrow(/no está permitida/);
  });

  it('rechaza saltos que se evaden de la máquina (validada → activa directamente, sin pasar por activando)', () => {
    expect(() => validarTransicionEstadoValorizacion('validada', 'activa')).toThrow(/no está permitida/);
  });

  it('nunca permite retroceder desde activando/fallida_recuperable hacia validada, ni cancelar una activación en curso', () => {
    expect(() => validarTransicionEstadoValorizacion('activando', 'validada')).toThrow(/no está permitida/);
    expect(() => validarTransicionEstadoValorizacion('fallida_recuperable', 'validada')).toThrow(/no está permitida/);
    expect(() => validarTransicionEstadoValorizacion('activando', 'cancelada_antes_activacion')).toThrow(/no está permitida/);
    expect(() => validarTransicionEstadoValorizacion('fallida_recuperable', 'cancelada_antes_activacion')).toThrow(/no está permitida/);
  });

  it('activa es irreversible: rechaza transiciones desde un estado terminal/bloqueado sin salida', () => {
    expect(() => validarTransicionEstadoValorizacion('activa', 'no_iniciada')).toThrow(/no está permitida/);
    expect(() => validarTransicionEstadoValorizacion('activa', 'validada')).toThrow(/no está permitida/);
    expect(() => validarTransicionEstadoValorizacion('activa', 'activando')).toThrow(/no está permitida/);
    expect(() => validarTransicionEstadoValorizacion('suspendida_por_inconsistencia', 'no_iniciada')).toThrow(/no está permitida/);
  });
});
