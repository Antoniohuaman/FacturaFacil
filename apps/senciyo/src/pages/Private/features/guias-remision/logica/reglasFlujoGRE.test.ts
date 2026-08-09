import { describe, it, expect } from 'vitest';
import { obtenerReglaFlujoGRE, calcularAjusteDestinatarioPorCambioMotivo } from './reglasFlujoGRE';

const EMPRESA_A = { razonSocial: 'Empresa A S.A.C.', ruc: '20111111111', domicilioFiscal: 'Av. A 100' };
const EMPRESA_B = { razonSocial: 'Empresa B S.A.C.', ruc: '20222222222', domicilioFiscal: 'Av. B 200' };

describe('obtenerReglaFlujoGRE — Remitente', () => {
  it('motivo 01 (Venta) usa la regla base: Destinatario obligatorio, sin actor secundario, punto de llegada obligatorio', () => {
    const regla = obtenerReglaFlujoGRE('remitente', '01');
    expect(regla.actorPrincipal).toEqual({ label: 'Destinatario', obligatorio: true });
    expect(regla.actorSecundario).toBeNull();
    expect(regla.puntoLlegadaObligatorio).toBe(true);
    expect(regla.requiereEspecificacion).toBe(false);
  });

  it('motivo 02 (Compra): el destinatario (actor principal) es la propia empresa, auto-derivado, y el Proveedor es el actor secundario con búsqueda real de tercero', () => {
    const regla = obtenerReglaFlujoGRE('remitente', '02');
    expect(regla.actorPrincipal.label).toBe('Destinatario');
    expect(regla.actorPrincipal.obligatorio).toBe(true);
    expect(regla.actorPrincipal.autoDerivadoDeEmpresa).toBe(true);
    expect(regla.actorSecundario).toEqual({
      label: 'Proveedor',
      obligatorio: true,
      requiereBusquedaTercero: true,
    });
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

  it('motivo 07 (Recojo de bienes transformados): misma arquitectura de actores que Compra — Destinatario auto-derivado de empresa + Proveedor con búsqueda real de tercero', () => {
    const regla = obtenerReglaFlujoGRE('remitente', '07');
    expect(regla.actorPrincipal.label).toBe('Destinatario');
    expect(regla.actorPrincipal.obligatorio).toBe(true);
    expect(regla.actorPrincipal.autoDerivadoDeEmpresa).toBe(true);
    expect(regla.actorSecundario).toEqual({
      label: 'Proveedor',
      obligatorio: true,
      requiereBusquedaTercero: true,
    });
  });

  it('motivo 07 ya no usa el término "Tercero/Transformador" en ningún label de su regla', () => {
    const regla = obtenerReglaFlujoGRE('remitente', '07');
    expect(regla.actorPrincipal.label).not.toContain('Tercero/Transformador');
    expect(regla.actorSecundario?.label).not.toContain('Tercero/Transformador');
  });

  it('motivo 17 (Traslado de bienes para transformación) conserva su semántica legítima y distinta: el destinatario SÍ es un tercero real, no la propia empresa', () => {
    const regla = obtenerReglaFlujoGRE('remitente', '17');
    expect(regla.actorPrincipal.label).toBe('Tercero/Transformador (destino)');
    expect(regla.actorPrincipal.autoDerivadoDeEmpresa).toBeUndefined();
    expect(regla.actorSecundario).toBeNull();
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
    expect(reglaRemitente.actorPrincipal.autoDerivadoDeEmpresa).toBe(true);
    expect(reglaRemitente.actorSecundario?.label).toBe('Proveedor');
    expect(reglaTransportista.actorPrincipal.label).toBe('Destinatario');
    expect(reglaTransportista.actorPrincipal.autoDerivadoDeEmpresa).toBeUndefined();
    expect(reglaTransportista.actorSecundario).toBeNull();
  });
});

describe('calcularAjusteDestinatarioPorCambioMotivo', () => {
  it('al entrar a Compra (01 → 02) puebla el Destinatario con los datos reales de la empresa activa', () => {
    const ajuste = calcularAjusteDestinatarioPorCambioMotivo('remitente', '01', '02', EMPRESA_A);
    expect(ajuste).toEqual({
      destinatarioClienteId: undefined,
      destinatarioNombre: 'Empresa A S.A.C.',
      destinatarioTipoDocumento: 'RUC',
      destinatarioNumeroDocumento: '20111111111',
      destinatarioDireccion: 'Av. A 100',
      destinatarioDepartamento: undefined,
      destinatarioProvincia: undefined,
      destinatarioDistrito: undefined,
      destinatarioUbigeo: undefined,
    });
  });

  it('aislamiento multi-tenant: la misma transición con la empresa B produce los datos de la empresa B, nunca de A', () => {
    const ajuste = calcularAjusteDestinatarioPorCambioMotivo('remitente', '01', '02', EMPRESA_B);
    expect(ajuste?.destinatarioNombre).toBe('Empresa B S.A.C.');
    expect(ajuste?.destinatarioNumeroDocumento).toBe('20222222222');
  });

  it('sin empresa activa (null), no hardcodea ningún valor por defecto — usa cadenas vacías', () => {
    const ajuste = calcularAjusteDestinatarioPorCambioMotivo('remitente', '01', '02', null);
    expect(ajuste?.destinatarioNombre).toBe('');
    expect(ajuste?.destinatarioNumeroDocumento).toBe('');
  });

  it('al salir de Compra (02 → 01) limpia el Destinatario auto-derivado', () => {
    const ajuste = calcularAjusteDestinatarioPorCambioMotivo('remitente', '02', '01', EMPRESA_A);
    expect(ajuste).toEqual({
      destinatarioClienteId: undefined,
      destinatarioNombre: '',
      destinatarioTipoDocumento: 'RUC',
      destinatarioNumeroDocumento: '',
      destinatarioDireccion: undefined,
      destinatarioDepartamento: undefined,
      destinatarioProvincia: undefined,
      destinatarioDistrito: undefined,
      destinatarioUbigeo: undefined,
    });
  });

  it('permanecer en Compra (02 → 02, ej. al editar otro campo) no toca el Destinatario — preserva el snapshot ya guardado', () => {
    const ajuste = calcularAjusteDestinatarioPorCambioMotivo('remitente', '02', '02', EMPRESA_A);
    expect(ajuste).toBeNull();
  });

  it('transición entre dos motivos que no son auto-derivados (01 → 03) no toca el Destinatario', () => {
    const ajuste = calcularAjusteDestinatarioPorCambioMotivo('remitente', '01', '03', EMPRESA_A);
    expect(ajuste).toBeNull();
  });

  it('para Transportista, motivo 02 no es auto-derivado (cae a la regla base) — no produce ajuste', () => {
    const ajuste = calcularAjusteDestinatarioPorCambioMotivo('transportista', '01', '02', EMPRESA_A);
    expect(ajuste).toBeNull();
  });

  it('al entrar a Recojo de bienes transformados (01 → 07) puebla el Destinatario con los datos reales de la empresa activa — misma función central que Compra', () => {
    const ajuste = calcularAjusteDestinatarioPorCambioMotivo('remitente', '01', '07', EMPRESA_A);
    expect(ajuste).toEqual({
      destinatarioClienteId: undefined,
      destinatarioNombre: 'Empresa A S.A.C.',
      destinatarioTipoDocumento: 'RUC',
      destinatarioNumeroDocumento: '20111111111',
      destinatarioDireccion: 'Av. A 100',
      destinatarioDepartamento: undefined,
      destinatarioProvincia: undefined,
      destinatarioDistrito: undefined,
      destinatarioUbigeo: undefined,
    });
  });

  it('aislamiento multi-tenant en motivo 07: la empresa B produce sus propios datos, nunca los de A', () => {
    const ajuste = calcularAjusteDestinatarioPorCambioMotivo('remitente', '01', '07', EMPRESA_B);
    expect(ajuste?.destinatarioNombre).toBe('Empresa B S.A.C.');
    expect(ajuste?.destinatarioNumeroDocumento).toBe('20222222222');
  });

  it('al salir de motivo 07 (07 → 01) limpia el Destinatario auto-derivado', () => {
    const ajuste = calcularAjusteDestinatarioPorCambioMotivo('remitente', '07', '01', EMPRESA_A);
    expect(ajuste?.destinatarioNombre).toBe('');
    expect(ajuste?.destinatarioNumeroDocumento).toBe('');
  });

  it('permanecer en motivo 07 (07 → 07, ej. al editar otro campo) no toca el Destinatario — preserva el snapshot ya guardado', () => {
    const ajuste = calcularAjusteDestinatarioPorCambioMotivo('remitente', '07', '07', EMPRESA_A);
    expect(ajuste).toBeNull();
  });

  it('transición entre dos motivos auto-derivados (02 → 07, Compra → Recojo de bienes transformados) no reconstruye el Destinatario — ambos comparten la misma regla', () => {
    const ajuste = calcularAjusteDestinatarioPorCambioMotivo('remitente', '02', '07', EMPRESA_A);
    expect(ajuste).toBeNull();
  });

  it('motivo 17 (destinatario = tercero real) → 07 (destinatario = empresa): SÍ debe poblar el Destinatario, porque es una transición real hacia un motivo auto-derivado', () => {
    const ajuste = calcularAjusteDestinatarioPorCambioMotivo('remitente', '17', '07', EMPRESA_A);
    expect(ajuste?.destinatarioNombre).toBe('Empresa A S.A.C.');
  });

  it('07 → 17: SÍ debe limpiar el Destinatario auto-derivado, porque 17 exige seleccionar un tercero real', () => {
    const ajuste = calcularAjusteDestinatarioPorCambioMotivo('remitente', '07', '17', EMPRESA_A);
    expect(ajuste?.destinatarioNombre).toBe('');
  });
});
