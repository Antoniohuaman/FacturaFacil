import { describe, it, expect } from 'vitest';
import {
  resolverVistaIndicadores,
  construirNavegacionVista,
  construirNormalizacionVista,
} from './indicadores';

describe('resolverVistaIndicadores', () => {
  it('ausente resuelve a "resumen"', () => {
    expect(resolverVistaIndicadores(null)).toBe('resumen');
  });

  it('"resumen" explícito resuelve a "resumen"', () => {
    expect(resolverVistaIndicadores('resumen')).toBe('resumen');
  });

  it('"rentabilidad" resuelve a "rentabilidad"', () => {
    expect(resolverVistaIndicadores('rentabilidad')).toBe('rentabilidad');
  });

  it('"reportes" resuelve a "reportes"', () => {
    expect(resolverVistaIndicadores('reportes')).toBe('reportes');
  });

  it('un valor desconocido cae de forma segura en "resumen"', () => {
    expect(resolverVistaIndicadores('cualquier-cosa')).toBe('resumen');
  });
});

describe('construirNavegacionVista — cambios de pestaña iniciados por el usuario', () => {
  it('Resumen → Rentabilidad crea navegación normal (replace:false, con historial)', () => {
    const decision = construirNavegacionVista({}, 'rentabilidad');
    expect(decision).not.toBeNull();
    expect(decision?.replace).toBe(false);
    expect(decision?.params.view).toBe('rentabilidad');
  });

  it('Rentabilidad → Reportes crea navegación normal (replace:false, con historial)', () => {
    const decision = construirNavegacionVista({ view: 'rentabilidad' }, 'reportes');
    expect(decision).not.toBeNull();
    expect(decision?.replace).toBe(false);
    expect(decision?.params.view).toBe('reportes');
  });

  it('Reportes → Resumen elimina el parámetro view (nunca "view=resumen") y también es replace:false', () => {
    const decision = construirNavegacionVista({ view: 'reportes' }, 'resumen');
    expect(decision).not.toBeNull();
    expect(decision?.replace).toBe(false);
    expect(decision?.params.view).toBeUndefined();
  });

  it('conserva todos los demás query params legítimos (periodo/establecimiento vía store, pero cualquier otro param de la URL se preserva)', () => {
    const decision = construirNavegacionVista({ from: '2026-06-01', to: '2026-06-30', EstablecimientoId: 'est-1' }, 'rentabilidad');
    expect(decision?.params).toEqual({ from: '2026-06-01', to: '2026-06-30', EstablecimientoId: 'est-1', view: 'rentabilidad' });
  });

  it('devuelve null (no-op) cuando ya se está en la vista solicitada', () => {
    expect(construirNavegacionVista({ view: 'reportes' }, 'reportes')).toBeNull();
    expect(construirNavegacionVista({}, 'resumen')).toBeNull();
  });
});

describe('construirNormalizacionVista — corrección de URL inválida', () => {
  it('un view desconocido se normaliza con replace:true (nunca genera historial)', () => {
    const decision = construirNormalizacionVista({ view: 'algo-invalido' });
    expect(decision).not.toBeNull();
    expect(decision?.replace).toBe(true);
    expect(decision?.params.view).toBeUndefined();
  });

  it('"view=resumen" explícito y redundante también se normaliza con replace:true', () => {
    const decision = construirNormalizacionVista({ view: 'resumen' });
    expect(decision).not.toBeNull();
    expect(decision?.replace).toBe(true);
  });

  it('conserva los demás parámetros al normalizar', () => {
    const decision = construirNormalizacionVista({ view: 'invalido', autoExport: '1', returnTo: '/indicadores' });
    expect(decision?.params).toEqual({ autoExport: '1', returnTo: '/indicadores' });
  });

  it('no hace nada (null) cuando el view ya es válido o está ausente', () => {
    expect(construirNormalizacionVista({ view: 'rentabilidad' })).toBeNull();
    expect(construirNormalizacionVista({ view: 'reportes' })).toBeNull();
    expect(construirNormalizacionVista({})).toBeNull();
  });
});

describe('contraste replace:false (navegación real) vs replace:true (normalización) — base de "Atrás recupera la vista anterior"', () => {
  it('un cambio de pestaña real nunca usa replace:true', () => {
    const decision = construirNavegacionVista({}, 'rentabilidad');
    expect(decision?.replace).toBe(false);
  });

  it('una normalización nunca usa replace:false', () => {
    const decision = construirNormalizacionVista({ view: 'invalido' });
    expect(decision?.replace).toBe(true);
  });
});
