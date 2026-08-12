import { describe, it, expect } from 'vitest';
import { resolverCamposPrioritariosVehiculo } from './helpersTransporte';

describe('resolverCamposPrioritariosVehiculo — jerarquía de campos del formulario de vehículo por contexto', () => {
  it('maestro (Configuración → Transporte → Vehículos): Estado y Conductores prioritarios; TUCE y autorización especial NO (van a "Más campos opcionales")', () => {
    const campos = resolverCamposPrioritariosVehiculo('maestro');
    expect(campos).toEqual({
      estado: true,
      conductores: true,
      autorizacionEspecial: false,
      tuce: false,
    });
  });

  it('remitente (alta rápida desde GRE Remitente): autorización especial prioritaria; Estado, Conductores y TUCE NO', () => {
    const campos = resolverCamposPrioritariosVehiculo('remitente');
    expect(campos).toEqual({
      estado: false,
      conductores: false,
      autorizacionEspecial: true,
      tuce: false,
    });
  });

  it('transportista (alta rápida desde GRE Transportista): autorización especial Y TUCE prioritarios; Estado y Conductores NO', () => {
    const campos = resolverCamposPrioritariosVehiculo('transportista');
    expect(campos).toEqual({
      estado: false,
      conductores: false,
      autorizacionEspecial: true,
      tuce: true,
    });
  });

  it('ningún contexto oculta el Estado del modelo — solo decide si el selector se muestra en el alta rápida', () => {
    // El campo Estado siempre existe y se persiste (FORM_VACIO.estado = 'ACTIVO'); esta función
    // solo decide si el selector aparece en el formulario, nunca si el dato existe.
    expect(resolverCamposPrioritariosVehiculo('remitente').estado).toBe(false);
    expect(resolverCamposPrioritariosVehiculo('transportista').estado).toBe(false);
    expect(resolverCamposPrioritariosVehiculo('maestro').estado).toBe(true);
  });
});
