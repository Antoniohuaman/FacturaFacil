// Cierre de bloqueante 3 de la revisión de Etapa 2: `migratePreferenciasInventario` debe aceptar
// ÚNICAMENTE los cuatro valores reales de `tratamientoImpuestoCompra` — cualquier valor ausente o
// corrupto debe normalizarse a `'pendiente_configuracion'`, nunca pasar `??` a ciegas (que
// aceptaba cualquier string sin validar). Ver también `estadoActivacionValorizacionInventario.ts`
// (mismo principio ya aplicado a `estadoValorizacion`).
import { describe, it, expect } from 'vitest';
import { migratePreferenciasInventario } from './ContextoConfiguracion';
import { instalarLocalStorageDePrueba } from '../../gestion-inventario/repositories/localStorageDePrueba';

instalarLocalStorageDePrueba();

describe('migratePreferenciasInventario', () => {
  it('acepta los 4 valores reales de tratamientoImpuestoCompra sin modificarlos', () => {
    expect(migratePreferenciasInventario({ tratamientoImpuestoCompra: 'pendiente_configuracion' }).tratamientoImpuestoCompra).toBe('pendiente_configuracion');
    expect(migratePreferenciasInventario({ tratamientoImpuestoCompra: 'impuesto_recuperable' }).tratamientoImpuestoCompra).toBe('impuesto_recuperable');
    expect(migratePreferenciasInventario({ tratamientoImpuestoCompra: 'impuesto_no_recuperable' }).tratamientoImpuestoCompra).toBe('impuesto_no_recuperable');
    expect(migratePreferenciasInventario({ tratamientoImpuestoCompra: 'segun_afectacion' }).tratamientoImpuestoCompra).toBe('segun_afectacion');
  });

  it('normaliza a pendiente_configuracion cuando el campo está ausente', () => {
    expect(migratePreferenciasInventario(undefined).tratamientoImpuestoCompra).toBe('pendiente_configuracion');
    expect(migratePreferenciasInventario({}).tratamientoImpuestoCompra).toBe('pendiente_configuracion');
  });

  it('normaliza a pendiente_configuracion ante un valor corrupto (string desconocido) — nunca lo acepta en silencio', () => {
    // @ts-expect-error — valor deliberadamente corrupto, como vendría de un snapshot dañado o de una versión futura del tipo.
    const resultado = migratePreferenciasInventario({ tratamientoImpuestoCompra: 'valor-inventado' });
    expect(resultado.tratamientoImpuestoCompra).toBe('pendiente_configuracion');
  });

  it('normaliza a pendiente_configuracion ante un tipo completamente distinto (número, objeto, null)', () => {
    // @ts-expect-error — corrupción deliberada del tipo.
    expect(migratePreferenciasInventario({ tratamientoImpuestoCompra: 42 }).tratamientoImpuestoCompra).toBe('pendiente_configuracion');
    // @ts-expect-error — corrupción deliberada del tipo.
    expect(migratePreferenciasInventario({ tratamientoImpuestoCompra: null }).tratamientoImpuestoCompra).toBe('pendiente_configuracion');
    // @ts-expect-error — corrupción deliberada del tipo.
    expect(migratePreferenciasInventario({ tratamientoImpuestoCompra: {} }).tratamientoImpuestoCompra).toBe('pendiente_configuracion');
  });

  it('normaliza estadoValorizacion corrupto/ausente a no_iniciada (comportamiento ya aprobado, preservado)', () => {
    expect(migratePreferenciasInventario(undefined).estadoValorizacion).toBe('no_iniciada');
    // @ts-expect-error — corrupción deliberada del tipo.
    expect(migratePreferenciasInventario({ estadoValorizacion: 'estado-inventado' }).estadoValorizacion).toBe('no_iniciada');
    expect(migratePreferenciasInventario({ estadoValorizacion: 'validada' }).estadoValorizacion).toBe('validada');
  });

  it('una política tributaria corrupta normalizada a pendiente_configuracion nunca permite validar (verificado por verificarCondicionesValidacion)', async () => {
    const { verificarCondicionesValidacion } = await import('../../gestion-inventario/services/valorizacionInicial.service');
    const preferencias = migratePreferenciasInventario({
      // @ts-expect-error — corrupción deliberada del tipo.
      tratamientoImpuestoCompra: 'valor-inventado',
    });
    const lote = {
      id: 'lote-1',
      empresaId: 'emp-A',
      usuario: 'user-1',
      fechaCreacion: '2026-01-01T00:00:00.000Z',
      estado: 'pendiente_costos' as const,
      detalles: [],
    };
    const motivos = verificarCondicionesValidacion(lote, preferencias.tratamientoImpuestoCompra, [], new Map());
    expect(motivos.some((m) => m.includes('tratamiento de impuestos'))).toBe(true);
  });
});
