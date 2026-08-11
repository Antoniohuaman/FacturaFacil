import { describe, it, expect } from 'vitest';
import { derivarEstadoConfiguracionGRE } from './useEstadoConfiguracionGRE';
import type { ConexionSunat } from '../../configuracion-sistema/modelos/ConexionSunat';
import type { DatosTransportista } from '../../configuracion-sistema/modelos/Transporte';

function conexion(overrides: Partial<ConexionSunat> = {}): ConexionSunat {
  return {
    id: 'conexion-1',
    empresaId: 'empresa-1',
    actualizadoEl: new Date('2026-01-01'),
    ...overrides,
  };
}

// GRE-P1-003: `emitir()` en FormularioGREPage.tsx lee exactamente este mismo resultado
// (`puedeEmitirPorConfiguracion`) — no una copia recalculada aparte.
describe('derivarEstadoConfiguracionGRE (GRE-P1-003)', () => {
  it('sin ninguna credencial configurada, no se puede emitir', () => {
    const estado = derivarEstadoConfiguracionGRE(undefined, undefined);
    expect(estado.credencialesCompletas).toBe(false);
    expect(estado.puedeEmitirPorConfiguracion).toBe(false);
    expect(estado.faltantesCredenciales).toEqual([
      'Acceso SOL (usuario y clave)',
      'Credenciales GRE (Client ID y Client Secret)',
    ]);
  });

  it('con solo Acceso SOL completo (sin credenciales GRE), sigue sin poder emitir', () => {
    const estado = derivarEstadoConfiguracionGRE(
      conexion({ accesoSOL: { usuarioSOL: 'user', claveSOL: 'clave' } }),
      undefined,
    );
    expect(estado.credencialesCompletas).toBe(false);
    expect(estado.puedeEmitirPorConfiguracion).toBe(false);
    expect(estado.faltantesCredenciales).toEqual(['Credenciales GRE (Client ID y Client Secret)']);
  });

  it('con solo credenciales GRE completas (sin Acceso SOL), sigue sin poder emitir', () => {
    const estado = derivarEstadoConfiguracionGRE(
      conexion({ credencialesGRE: { clientId: 'id', clientSecret: 'secret' } }),
      undefined,
    );
    expect(estado.credencialesCompletas).toBe(false);
    expect(estado.faltantesCredenciales).toEqual(['Acceso SOL (usuario y clave)']);
  });

  it('valores en blanco (espacios) cuentan como incompletos, no como presentes', () => {
    const estado = derivarEstadoConfiguracionGRE(
      conexion({
        accesoSOL: { usuarioSOL: '   ', claveSOL: '   ' },
        credencialesGRE: { clientId: '', clientSecret: '' },
      }),
      undefined,
    );
    expect(estado.credencialesCompletas).toBe(false);
  });

  it('con Acceso SOL Y credenciales GRE completas, se permite continuar con la emisión', () => {
    const estado = derivarEstadoConfiguracionGRE(
      conexion({
        accesoSOL: { usuarioSOL: 'user', claveSOL: 'clave' },
        credencialesGRE: { clientId: 'id', clientSecret: 'secret' },
      }),
      undefined,
    );
    expect(estado.credencialesCompletas).toBe(true);
    expect(estado.puedeEmitirPorConfiguracion).toBe(true);
    expect(estado.faltantesCredenciales).toEqual([]);
  });

  it('sin datos de autorización especial del transportista, el resultado no incluye autorización', () => {
    const estado = derivarEstadoConfiguracionGRE(undefined, undefined);
    expect(estado.autorizacionEspecialEmisor).toBeUndefined();
  });

  it('con código de entidad y número de autorización del transportista, deriva la autorización especial', () => {
    const transportista: DatosTransportista = {
      codigoEntidadAutorizadora: '01',
      numeroAutorizacion: 'AUT-123',
    } as DatosTransportista;
    const estado = derivarEstadoConfiguracionGRE(undefined, transportista);
    expect(estado.autorizacionEspecialEmisor?.numeroAutorizacion).toBe('AUT-123');
  });

  it('sin datos de transportista, numeroRegistroMTC es undefined — GRE Transportista debe mostrarlo como "No configurado", nunca como dato falso', () => {
    const estado = derivarEstadoConfiguracionGRE(undefined, undefined);
    expect(estado.numeroRegistroMTC).toBeUndefined();
  });

  it('reutiliza el numeroRegistroMTC ya configurado en Configuración → Transporte (misma fuente que ya usa la autorización especial)', () => {
    const transportista: DatosTransportista = { numeroRegistroMTC: 'MTC-000123' } as DatosTransportista;
    const estado = derivarEstadoConfiguracionGRE(undefined, transportista);
    expect(estado.numeroRegistroMTC).toBe('MTC-000123');
  });

  it('un numeroRegistroMTC en blanco (solo espacios) cuenta como no configurado', () => {
    const transportista: DatosTransportista = { numeroRegistroMTC: '   ' } as DatosTransportista;
    const estado = derivarEstadoConfiguracionGRE(undefined, transportista);
    expect(estado.numeroRegistroMTC).toBeUndefined();
  });
});
