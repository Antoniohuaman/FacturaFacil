import { describe, it, expect } from 'vitest';
import { obtenerReglaFlujoGRE } from './reglasFlujoGRE';

describe('obtenerReglaFlujoGRE — Remitente', () => {
  it('motivo 01 (Venta) usa la regla base: Destinatario obligatorio, sin actor secundario, punto de llegada obligatorio', () => {
    const regla = obtenerReglaFlujoGRE('remitente', '01');
    expect(regla.actorPrincipal).toEqual({ label: 'Destinatario', obligatorio: true });
    expect(regla.actorSecundario).toBeNull();
    expect(regla.puntoLlegadaObligatorio).toBe(true);
    expect(regla.requiereEspecificacion).toBe(false);
  });

  it('motivo 02 (Compra) exige Proveedor como actor principal', () => {
    const regla = obtenerReglaFlujoGRE('remitente', '02');
    expect(regla.actorPrincipal).toEqual({ label: 'Proveedor', obligatorio: true });
  });

  it('motivo 03 (Venta con entrega a terceros) agrega un actor secundario opcional (Comprador)', () => {
    const regla = obtenerReglaFlujoGRE('remitente', '03');
    expect(regla.actorSecundario).toEqual({ label: 'Comprador', obligatorio: false });
  });

  it('motivo 13 (Otros) exige especificar el motivo de traslado', () => {
    const regla = obtenerReglaFlujoGRE('remitente', '13');
    expect(regla.requiereEspecificacion).toBe(true);
  });

  it('motivo 18 (Emisor itinerante) hace opcionales el destinatario y el punto de llegada', () => {
    const regla = obtenerReglaFlujoGRE('remitente', '18');
    expect(regla.actorPrincipal.obligatorio).toBe(false);
    expect(regla.puntoLlegadaObligatorio).toBe(false);
  });

  it('un motivo desconocido nunca lanza — devuelve la regla base', () => {
    const regla = obtenerReglaFlujoGRE('remitente', '99');
    expect(regla.actorPrincipal).toEqual({ label: 'Destinatario', obligatorio: true });
  });
});

describe('obtenerReglaFlujoGRE — Transportista', () => {
  it('motivo 20 (Subcontrata) usa la regla base, sin actor secundario', () => {
    const regla = obtenerReglaFlujoGRE('transportista', '20');
    expect(regla.actorPrincipal).toEqual({ label: 'Destinatario', obligatorio: true });
    expect(regla.actorSecundario).toBeNull();
  });

  it('motivo 13 (Otros) también exige especificación para Transportista', () => {
    const regla = obtenerReglaFlujoGRE('transportista', '13');
    expect(regla.requiereEspecificacion).toBe(true);
  });

  it('un motivo exclusivo de Remitente (ej. 02, Compra) no está en el mapa de Transportista — cae a la regla base', () => {
    const reglaRemitente = obtenerReglaFlujoGRE('remitente', '02');
    const reglaTransportista = obtenerReglaFlujoGRE('transportista', '02');
    expect(reglaRemitente.actorPrincipal.label).toBe('Proveedor');
    expect(reglaTransportista.actorPrincipal.label).toBe('Destinatario');
  });
});
