import { describe, expect, it } from 'vitest';
import {
  resolverModoOperacion,
  esValorizacionActiva,
  puedeOperarCuantitativamente,
  puedeMutarInventario,
  validarTransicionEstadoValorizacion,
  resolverModoInventario,
  puedeDesactivarControlInventario,
  resolverEstadoVisualInventario,
  estaPreparandoValorizacion,
} from './estadoActivacionValorizacionInventario';
import { ESTADOS_ACTIVACION_VALORIZACION, type EstadoActivacionValorizacion } from '../models/estadoActivacionValorizacion.types';

describe('resolverModoOperacion', () => {
  it('cubre los 8 estados sin lanzar', () => {
    for (const estado of ESTADOS_ACTIVACION_VALORIZACION) {
      expect(() => resolverModoOperacion(estado)).not.toThrow();
    }
  });

  it('resuelve cada estado al modo esperado', () => {
    expect(resolverModoOperacion('no_iniciada')).toBe('cuantitativo_libre');
    expect(resolverModoOperacion('en_preparacion')).toBe('cuantitativo_invalida_snapshot');
    expect(resolverModoOperacion('pendiente_costos')).toBe('cuantitativo_invalida_snapshot');
    expect(resolverModoOperacion('validada')).toBe('bloqueado_snapshot_aprobado');
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
  it('es true en no_iniciada, en_preparacion y pendiente_costos', () => {
    expect(puedeOperarCuantitativamente('no_iniciada')).toBe(true);
    expect(puedeOperarCuantitativamente('en_preparacion')).toBe(true);
    expect(puedeOperarCuantitativamente('pendiente_costos')).toBe(true);
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
    expect(puedeMutarInventario('activa')).toBe(true);
  });
});

describe('validarTransicionEstadoValorizacion', () => {
  it('permite el recorrido productivo completo hasta validada', () => {
    expect(() => validarTransicionEstadoValorizacion('no_iniciada', 'en_preparacion')).not.toThrow();
    expect(() => validarTransicionEstadoValorizacion('en_preparacion', 'pendiente_costos')).not.toThrow();
    expect(() => validarTransicionEstadoValorizacion('pendiente_costos', 'validada')).not.toThrow();
  });

  it('corrección UX-INV-P0-001 (2026-08-07): cancelar desde en_preparacion/pendiente_costos/validada siempre regresa DIRECTO a no_iniciada — nunca queda un estado "cancelada" de compañía distinto del punto de partida', () => {
    expect(() => validarTransicionEstadoValorizacion('en_preparacion', 'no_iniciada')).not.toThrow();
    expect(() => validarTransicionEstadoValorizacion('pendiente_costos', 'no_iniciada')).not.toThrow();
    expect(() => validarTransicionEstadoValorizacion('validada', 'no_iniciada')).not.toThrow();
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
    expect(() => validarTransicionEstadoValorizacion('activando', 'no_iniciada')).toThrow(/no está permitida/);
    expect(() => validarTransicionEstadoValorizacion('fallida_recuperable', 'no_iniciada')).toThrow(/no está permitida/);
  });

  it('activa es irreversible: rechaza transiciones desde un estado terminal/bloqueado sin salida', () => {
    expect(() => validarTransicionEstadoValorizacion('activa', 'no_iniciada')).toThrow(/no está permitida/);
    expect(() => validarTransicionEstadoValorizacion('activa', 'validada')).toThrow(/no está permitida/);
    expect(() => validarTransicionEstadoValorizacion('activa', 'activando')).toThrow(/no está permitida/);
    expect(() => validarTransicionEstadoValorizacion('suspendida_por_inconsistencia', 'no_iniciada')).toThrow(/no está permitida/);
  });
});

// CFG-01..05 (encargo de centralización 2026-08-05): resolvedor único de modo de inventario —
// deriva de las DOS fuentes ya existentes (`controlStockActivo` + `estadoValorizacion`), nunca una
// tercera fuente de verdad ni un booleano nuevo.
describe('resolverModoInventario', () => {
  it('CFG-01: controlStockActivo=false + estadoValorizacion="no_iniciada" resuelve "inactivo"', () => {
    expect(resolverModoInventario(false, 'no_iniciada')).toBe('inactivo');
  });

  it('CFG-01: controlStockActivo=undefined se trata igual que false (nunca lanza, nunca asume activo)', () => {
    expect(resolverModoInventario(undefined, 'no_iniciada')).toBe('inactivo');
  });

  it('CFG-02: controlStockActivo=true + estadoValorizacion="no_iniciada" resuelve "cuantitativo"', () => {
    expect(resolverModoInventario(true, 'no_iniciada')).toBe('cuantitativo');
  });

  it('CFG-02: controlStockActivo=true en cualquier sub-estado de preparación de valorización (aún no activa) sigue resolviendo "cuantitativo"', () => {
    expect(resolverModoInventario(true, 'en_preparacion')).toBe('cuantitativo');
    expect(resolverModoInventario(true, 'pendiente_costos')).toBe('cuantitativo');
    expect(resolverModoInventario(true, 'validada')).toBe('cuantitativo');
    expect(resolverModoInventario(true, 'activando')).toBe('cuantitativo');
    expect(resolverModoInventario(true, 'fallida_recuperable')).toBe('cuantitativo');
  });

  it('CFG-03: estadoValorizacion="activa" resuelve "valorizado" sin importar controlStockActivo', () => {
    expect(resolverModoInventario(true, 'activa')).toBe('valorizado');
    expect(resolverModoInventario(false, 'activa')).toBe('valorizado');
    expect(resolverModoInventario(undefined, 'activa')).toBe('valorizado');
  });

  it('CFG-03: "suspendida_por_inconsistencia" también resuelve "valorizado" (sigue siendo valorizado, solo que bloqueado a nivel de operación)', () => {
    expect(resolverModoInventario(true, 'suspendida_por_inconsistencia')).toBe('valorizado');
    expect(resolverModoInventario(false, 'suspendida_por_inconsistencia')).toBe('valorizado');
  });

  it('CFG-04 (§17 migración): la combinación inconsistente "(inactivo + activa)" nunca resuelve "inactivo" — la valorización activa manda deterministamente sobre el switch maestro desincronizado', () => {
    expect(resolverModoInventario(false, 'activa')).toBe('valorizado');
  });

  it('cubre los 8 estados con controlStockActivo true y false sin lanzar', () => {
    for (const estado of ESTADOS_ACTIVACION_VALORIZACION) {
      expect(() => resolverModoInventario(true, estado)).not.toThrow();
      expect(() => resolverModoInventario(false, estado)).not.toThrow();
    }
  });
});

describe('puedeDesactivarControlInventario (§4.5)', () => {
  it('permite desactivar en cualquier estado que no sea valorización activa/suspendida', () => {
    const permitidos: EstadoActivacionValorizacion[] = [
      'no_iniciada', 'en_preparacion', 'pendiente_costos', 'validada', 'activando', 'fallida_recuperable',
    ];
    for (const estado of permitidos) {
      expect(puedeDesactivarControlInventario(estado)).toBe(true);
    }
  });

  it('nunca permite desactivar una vez que la valorización está activa (irreversible) o suspendida', () => {
    expect(puedeDesactivarControlInventario('activa')).toBe(false);
    expect(puedeDesactivarControlInventario('suspendida_por_inconsistencia')).toBe(false);
  });
});

describe('resolverEstadoVisualInventario (corrección UX final 2026-08-07: los 5 estados reales, incluyendo "inactivo" distinto de "pendiente")', () => {
  it('UXCFG-24: "pendiente" cuando el modo es inactivo y la empresa NUNCA se configuró (inventarioConfiguradoAlgunaVez=false), sin importar el sub-estado de valorización', () => {
    expect(resolverEstadoVisualInventario('inactivo', 'no_iniciada', false)).toBe('pendiente');
    expect(resolverEstadoVisualInventario('inactivo', 'en_preparacion', false)).toBe('pendiente');
    expect(resolverEstadoVisualInventario('inactivo', 'pendiente_costos', false)).toBe('pendiente');
  });

  it('UXCFG-25/26: "inactivo" cuando el modo es inactivo pero la empresa SÍ se configuró alguna vez (inventarioConfiguradoAlgunaVez=true) — nunca "pendiente"', () => {
    expect(resolverEstadoVisualInventario('inactivo', 'no_iniciada', true)).toBe('inactivo');
  });

  it('"cuantitativo_activo" cuando el modo es cuantitativo, sin importar inventarioConfiguradoAlgunaVez ni si hay un borrador de valorización en curso — nunca "configuración en curso" como estado operativo (§22)', () => {
    expect(resolverEstadoVisualInventario('cuantitativo', 'no_iniciada', true)).toBe('cuantitativo_activo');
    expect(resolverEstadoVisualInventario('cuantitativo', 'no_iniciada', false)).toBe('cuantitativo_activo');
    for (const estado of ['en_preparacion', 'pendiente_costos', 'validada', 'activando', 'fallida_recuperable'] as const) {
      expect(resolverEstadoVisualInventario('cuantitativo', estado, true)).toBe('cuantitativo_activo');
    }
  });

  it('"valorizado_activo" únicamente cuando el modo es valorizado y el estado es exactamente "activa"', () => {
    expect(resolverEstadoVisualInventario('valorizado', 'activa', true)).toBe('valorizado_activo');
  });

  it('"requiere_atencion" siempre que el estado sea suspendida_por_inconsistencia, sin importar el modo ni inventarioConfiguradoAlgunaVez', () => {
    expect(resolverEstadoVisualInventario('valorizado', 'suspendida_por_inconsistencia', true)).toBe('requiere_atencion');
    expect(resolverEstadoVisualInventario('valorizado', 'suspendida_por_inconsistencia', false)).toBe('requiere_atencion');
  });
});

describe('UXCFG-28: cierre de UX-INV-P0-001 — reproduce el callejón sin salida original con las piezas puras de la máquina y confirma que ya no existe', () => {
  it('Control de existencias → iniciar FIFO → cancelar → desactivar → nunca queda "Pendiente" sin las tarjetas de selección', () => {
    // 1. Empresa nueva.
    let controlStockActivo = false;
    let estadoValorizacion: EstadoActivacionValorizacion = 'no_iniciada';
    let inventarioConfiguradoAlgunaVez = false;

    // 2. Activa "Control de existencias" (activarCuantitativo): switch ON + primera activación real.
    controlStockActivo = true;
    inventarioConfiguradoAlgunaVez = true;
    expect(resolverEstadoVisualInventario(resolverModoInventario(controlStockActivo, estadoValorizacion), estadoValorizacion, inventarioConfiguradoAlgunaVez)).toBe('cuantitativo_activo');

    // 3. Elige costear con FIFO (iniciarValorizado): abre un borrador — NUNCA toca controlStockActivo.
    validarTransicionEstadoValorizacion(estadoValorizacion, 'en_preparacion');
    estadoValorizacion = 'en_preparacion';
    validarTransicionEstadoValorizacion(estadoValorizacion, 'pendiente_costos');
    estadoValorizacion = 'pendiente_costos';
    expect(resolverEstadoVisualInventario(resolverModoInventario(controlStockActivo, estadoValorizacion), estadoValorizacion, inventarioConfiguradoAlgunaVez)).toBe('cuantitativo_activo'); // §22: nunca "configuración en curso" como estado operativo

    // 4. Cancela la activación de costos FIFO (handleCancelarPreparacion): regresa DIRECTO a no_iniciada.
    validarTransicionEstadoValorizacion(estadoValorizacion, 'no_iniciada');
    estadoValorizacion = 'no_iniciada';

    // 5. Desactiva el control de existencias (desactivarControl): solo apaga el switch — nunca toca el ciclo de vida.
    expect(puedeDesactivarControlInventario(estadoValorizacion)).toBe(true);
    controlStockActivo = false;

    // 6. El estado real es "Inactivo" (se configuró alguna vez) — NUNCA "Pendiente" — y por lo tanto
    // la página muestra la configuración conservada + "Activar inventario", nunca las tarjetas de
    // selección de primera configuración (cierra el callejón sin salida: la reactivación siempre
    // está disponible desde "Inactivo", no depende de `estadoValorizacion`).
    const modoFinal = resolverModoInventario(controlStockActivo, estadoValorizacion);
    const estadoVisualFinal = resolverEstadoVisualInventario(modoFinal, estadoValorizacion, inventarioConfiguradoAlgunaVez);
    expect(modoFinal).toBe('inactivo');
    expect(estadoVisualFinal).toBe('inactivo');
    expect(estadoVisualFinal).not.toBe('pendiente');
  });
});

describe('estaPreparandoValorizacion (uso exclusivo de la página de configuración, §22 de la corrección UX final)', () => {
  it('es true en los 5 sub-estados de una preparación de valorización sin activar todavía', () => {
    for (const estado of ['en_preparacion', 'pendiente_costos', 'validada', 'activando', 'fallida_recuperable'] as const) {
      expect(estaPreparandoValorizacion(estado)).toBe(true);
    }
  });

  it('es false en no_iniciada, activa y suspendida_por_inconsistencia', () => {
    expect(estaPreparandoValorizacion('no_iniciada')).toBe(false);
    expect(estaPreparandoValorizacion('activa')).toBe(false);
    expect(estaPreparandoValorizacion('suspendida_por_inconsistencia')).toBe(false);
  });
});
