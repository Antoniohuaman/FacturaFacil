import { describe, it, expect } from 'vitest';
import {
  obtenerReglaFlujoGRE,
  obtenerDatosRolActorGRE,
  normalizarActoresAdicionalesLegacyGRE,
  calcularAjusteDestinatarioPorCambioMotivo,
  calcularAjusteDestinatarioPorMismoRemitente,
  calcularAjusteActoresAdicionalesPorCambioMotivo,
} from './reglasFlujoGRE';
import { GUIA_REMISION_BORRADOR } from '../modelos/GuiaRemision';
import type { GuiaRemision } from '../modelos/GuiaRemision';

const EMPRESA_A = { razonSocial: 'Empresa A S.A.C.', ruc: '20111111111', domicilioFiscal: 'Av. A 100' };
const EMPRESA_B = { razonSocial: 'Empresa B S.A.C.', ruc: '20222222222', domicilioFiscal: 'Av. B 200' };

describe('obtenerReglaFlujoGRE — Remitente', () => {
  it('motivo 01 (Venta) usa la regla base: Destinatario obligatorio, sin actores adicionales, punto de llegada obligatorio', () => {
    const regla = obtenerReglaFlujoGRE('remitente', '01');
    expect(regla.actorPrincipal).toEqual({ label: 'Destinatario', obligatorio: true });
    expect(regla.actoresAdicionales).toEqual([]);
    expect(regla.puntoLlegadaObligatorio).toBe(true);
    expect(regla.requiereEspecificacion).toBe(false);
  });

  it('motivo 02 (Compra): el destinatario (actor principal) es la propia empresa, auto-derivado, y el Proveedor es el único actor adicional con búsqueda real de tercero', () => {
    const regla = obtenerReglaFlujoGRE('remitente', '02');
    expect(regla.actorPrincipal.label).toBe('Destinatario');
    expect(regla.actorPrincipal.obligatorio).toBe(true);
    expect(regla.actorPrincipal.autoDerivadoDeEmpresa).toBe(true);
    expect(regla.actoresAdicionales).toEqual([
      { rol: 'proveedor', label: 'Proveedor', obligatorio: true, tipoCuentaTercero: 'Proveedor' },
    ]);
  });

  it('motivo 03 (Venta con entrega a terceros): Comprador es obligatorio, único actor adicional, registrado como Cliente', () => {
    const regla = obtenerReglaFlujoGRE('remitente', '03');
    expect(regla.actoresAdicionales).toEqual([
      { rol: 'comprador', label: 'Comprador', obligatorio: true, tipoCuentaTercero: 'Cliente' },
    ]);
  });

  it('motivo 13 (Otros) exige especificar el motivo de traslado', () => {
    const regla = obtenerReglaFlujoGRE('remitente', '13');
    expect(regla.requiereEspecificacion).toBe(true);
  });

  it('motivo 13 (Otros): el Destinatario ofrece el switch "mismo remitente" (no fijo) y Proveedor + Comprador coexisten, ambos opcionales', () => {
    const regla = obtenerReglaFlujoGRE('remitente', '13');
    expect(regla.actorPrincipal.permiteMismoRemitente).toBe(true);
    expect(regla.actorPrincipal.autoDerivadoDeEmpresa).toBeUndefined();
    expect(regla.actoresAdicionales).toEqual([
      { rol: 'proveedor', label: 'Proveedor', obligatorio: false, tipoCuentaTercero: 'Proveedor' },
      { rol: 'comprador', label: 'Comprador', obligatorio: false, tipoCuentaTercero: 'Cliente' },
    ]);
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
    expect(regla.actoresAdicionales).toEqual([
      { rol: 'proveedor', label: 'Proveedor', obligatorio: true, tipoCuentaTercero: 'Proveedor' },
    ]);
  });

  it('motivo 07 ya no usa el término "Tercero/Transformador" en ningún label de su regla', () => {
    const regla = obtenerReglaFlujoGRE('remitente', '07');
    expect(regla.actorPrincipal.label).not.toContain('Tercero/Transformador');
    for (const actor of regla.actoresAdicionales) {
      expect(actor.label).not.toContain('Tercero/Transformador');
    }
  });

  it('motivo 17 (Traslado de bienes para transformación) conserva su semántica legítima y distinta: el destinatario SÍ es un tercero real, no la propia empresa', () => {
    const regla = obtenerReglaFlujoGRE('remitente', '17');
    expect(regla.actorPrincipal.label).toBe('Tercero/Transformador (destino)');
    expect(regla.actorPrincipal.autoDerivadoDeEmpresa).toBeUndefined();
    expect(regla.actoresAdicionales).toEqual([]);
  });

  it('un motivo desconocido nunca lanza — devuelve la regla base', () => {
    const regla = obtenerReglaFlujoGRE('remitente', '99');
    expect(regla.actorPrincipal).toEqual({ label: 'Destinatario', obligatorio: true });
  });
});

describe('obtenerReglaFlujoGRE — Transportista', () => {
  it('motivo 20 (Subcontrata) usa la regla base, sin actores adicionales', () => {
    const regla = obtenerReglaFlujoGRE('transportista', '20');
    expect(regla.actorPrincipal).toEqual({ label: 'Destinatario', obligatorio: true });
    expect(regla.actoresAdicionales).toEqual([]);
  });

  it('motivo 13 (Otros) también exige especificación para Transportista, pero NO adopta el switch/actores adicionales de Remitente — alcance de esta corrección es solo GRE Remitente', () => {
    const regla = obtenerReglaFlujoGRE('transportista', '13');
    expect(regla.requiereEspecificacion).toBe(true);
    expect(regla.actorPrincipal.permiteMismoRemitente).toBeUndefined();
    expect(regla.actoresAdicionales).toEqual([]);
  });

  it('un motivo exclusivo de Remitente (ej. 02, Compra) no está en el mapa de Transportista — cae a la regla base', () => {
    const reglaRemitente = obtenerReglaFlujoGRE('remitente', '02');
    const reglaTransportista = obtenerReglaFlujoGRE('transportista', '02');
    expect(reglaRemitente.actorPrincipal.autoDerivadoDeEmpresa).toBe(true);
    expect(reglaRemitente.actoresAdicionales[0]?.label).toBe('Proveedor');
    expect(reglaTransportista.actorPrincipal.label).toBe('Destinatario');
    expect(reglaTransportista.actorPrincipal.autoDerivadoDeEmpresa).toBeUndefined();
    expect(reglaTransportista.actoresAdicionales).toEqual([]);
  });
});

describe('obtenerDatosRolActorGRE', () => {
  it('rol proveedor lee de los campos proveedor*, nunca de comprador*', () => {
    const guia = { proveedorNombre: 'Prov S.A.C.', proveedorTipoDocumento: 'RUC', proveedorNumeroDocumento: '20111111111', compradorNombre: 'Otro', compradorTipoDocumento: 'RUC', compradorNumeroDocumento: '20999999999' };
    expect(obtenerDatosRolActorGRE(guia, 'proveedor')).toEqual({ nombre: 'Prov S.A.C.', tipoDocumento: 'RUC', numeroDocumento: '20111111111' });
  });

  it('rol comprador lee de los campos comprador*, nunca de proveedor*', () => {
    const guia = { proveedorNombre: 'Prov S.A.C.', proveedorTipoDocumento: 'RUC', proveedorNumeroDocumento: '20111111111', compradorNombre: 'Comp S.A.C.', compradorTipoDocumento: 'RUC', compradorNumeroDocumento: '20999999999' };
    expect(obtenerDatosRolActorGRE(guia, 'comprador')).toEqual({ nombre: 'Comp S.A.C.', tipoDocumento: 'RUC', numeroDocumento: '20999999999' });
  });

  it('Proveedor y Comprador coexisten sin pisarse: cambiar uno no afecta la lectura del otro', () => {
    const guia = { proveedorNombre: 'Prov S.A.C.', proveedorTipoDocumento: 'RUC', proveedorNumeroDocumento: '20111111111', compradorNombre: 'Comp S.A.C.', compradorTipoDocumento: 'RUC', compradorNumeroDocumento: '20999999999' };
    expect(obtenerDatosRolActorGRE(guia, 'proveedor').nombre).toBe('Prov S.A.C.');
    expect(obtenerDatosRolActorGRE(guia, 'comprador').nombre).toBe('Comp S.A.C.');
  });
});

describe('normalizarActoresAdicionalesLegacyGRE', () => {
  function guiaBase(overrides: Partial<GuiaRemision> = {}): GuiaRemision {
    return { ...GUIA_REMISION_BORRADOR('remitente'), ...overrides };
  }

  it('motivo 02 con datos legacy en comprador* (Proveedor mal guardado) los reubica en proveedor*', () => {
    const migrada = normalizarActoresAdicionalesLegacyGRE(
      guiaBase({ motivoTraslado: '02', compradorNombre: 'Proveedor Legacy S.A.C.', compradorTipoDocumento: 'RUC', compradorNumeroDocumento: '20333333333' }),
    );
    expect(migrada.proveedorNombre).toBe('Proveedor Legacy S.A.C.');
    expect(migrada.proveedorTipoDocumento).toBe('RUC');
    expect(migrada.proveedorNumeroDocumento).toBe('20333333333');
    expect(migrada.compradorNombre).toBeUndefined();
  });

  it('motivo 07 con datos legacy en comprador* también se migra (misma regla, mismo rol único)', () => {
    const migrada = normalizarActoresAdicionalesLegacyGRE(
      guiaBase({ motivoTraslado: '07', compradorNombre: 'Transformador Legacy', compradorNumeroDocumento: '20444444444' }),
    );
    expect(migrada.proveedorNombre).toBe('Transformador Legacy');
    expect(migrada.compradorNombre).toBeUndefined();
  });

  it('es idempotente: una segunda ejecución sobre el resultado ya migrado no cambia nada', () => {
    const migrada = normalizarActoresAdicionalesLegacyGRE(
      guiaBase({ motivoTraslado: '02', compradorNombre: 'Proveedor Legacy S.A.C.', compradorNumeroDocumento: '20333333333' }),
    );
    const segundaVez = normalizarActoresAdicionalesLegacyGRE(migrada);
    expect(segundaVez).toEqual(migrada);
  });

  it('motivo 03 (Comprador ya es su propio rol, no legacy) no se toca', () => {
    const guia = guiaBase({ motivoTraslado: '03', compradorNombre: 'Comprador real S.A.C.' });
    expect(normalizarActoresAdicionalesLegacyGRE(guia)).toEqual(guia);
  });

  it('motivo 13 (dos actores adicionales, no aplica la migración de un-solo-rol) no se toca', () => {
    const guia = guiaBase({ motivoTraslado: '13', compradorNombre: 'Comprador real S.A.C.' });
    expect(normalizarActoresAdicionalesLegacyGRE(guia)).toEqual(guia);
  });

  it('sin datos en comprador* no hay nada que migrar', () => {
    const guia = guiaBase({ motivoTraslado: '02' });
    expect(normalizarActoresAdicionalesLegacyGRE(guia)).toEqual(guia);
  });

  it('si proveedor* ya tiene datos reales (no legacy), no se sobrescribe con comprador*', () => {
    const guia = guiaBase({ motivoTraslado: '02', proveedorNombre: 'Proveedor Real S.A.C.', compradorNombre: 'Basura legacy' });
    const migrada = normalizarActoresAdicionalesLegacyGRE(guia);
    expect(migrada.proveedorNombre).toBe('Proveedor Real S.A.C.');
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
      destinatarioEsMismoRemitente: undefined,
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
      destinatarioEsMismoRemitente: undefined,
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
    expect(ajuste?.destinatarioNombre).toBe('Empresa A S.A.C.');
  });

  it('al salir de motivo 07 (07 → 01) limpia el Destinatario auto-derivado', () => {
    const ajuste = calcularAjusteDestinatarioPorCambioMotivo('remitente', '07', '01', EMPRESA_A);
    expect(ajuste?.destinatarioNombre).toBe('');
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

  // ── Motivo 13 (switch "mismo remitente") ──────────────────────

  it('al entrar a Otros (01 → 13), el destinatario NO se auto-puebla — el switch arranca apagado, el usuario decide', () => {
    const ajuste = calcularAjusteDestinatarioPorCambioMotivo('remitente', '01', '13', EMPRESA_A);
    expect(ajuste).toBeNull();
  });

  it('Compra (switch fijo=true) → Otros (switch por defecto=false): limpia el Destinatario y deja destinatarioEsMismoRemitente en false', () => {
    const ajuste = calcularAjusteDestinatarioPorCambioMotivo('remitente', '02', '13', EMPRESA_A);
    expect(ajuste?.destinatarioNombre).toBe('');
    expect(ajuste?.destinatarioEsMismoRemitente).toBe(false);
  });

  it('Otros con switch YA activo (13 → 01): limpia el Destinatario auto-derivado por el switch', () => {
    const ajuste = calcularAjusteDestinatarioPorCambioMotivo('remitente', '13', '01', EMPRESA_A, true);
    expect(ajuste?.destinatarioNombre).toBe('');
    expect(ajuste?.destinatarioEsMismoRemitente).toBeUndefined();
  });

  it('Otros con switch apagado (13 → 01), destinatario ya era un tercero real: no se toca (el tercero sigue siendo válido en Venta)', () => {
    const ajuste = calcularAjusteDestinatarioPorCambioMotivo('remitente', '13', '01', EMPRESA_A, false);
    expect(ajuste).toBeNull();
  });

  it('Otros con switch activo (13 → 02, Compra): ambos efectivamente auto-derivados — no reconstruye el Destinatario', () => {
    const ajuste = calcularAjusteDestinatarioPorCambioMotivo('remitente', '13', '02', EMPRESA_A, true);
    expect(ajuste).toBeNull();
  });

  it('permanecer en Otros (13 → 13) nunca toca el Destinatario, sin importar el switch — es responsabilidad exclusiva del handler del switch', () => {
    expect(calcularAjusteDestinatarioPorCambioMotivo('remitente', '13', '13', EMPRESA_A, true)).toBeNull();
    expect(calcularAjusteDestinatarioPorCambioMotivo('remitente', '13', '13', EMPRESA_A, false)).toBeNull();
  });
});

describe('calcularAjusteDestinatarioPorMismoRemitente', () => {
  it('activar=true puebla el Destinatario con la empresa activa y marca destinatarioEsMismoRemitente=true', () => {
    const ajuste = calcularAjusteDestinatarioPorMismoRemitente(true, EMPRESA_A);
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
      destinatarioEsMismoRemitente: true,
    });
  });

  it('aislamiento multi-tenant: empresa B produce sus propios datos', () => {
    const ajuste = calcularAjusteDestinatarioPorMismoRemitente(true, EMPRESA_B);
    expect(ajuste.destinatarioNombre).toBe('Empresa B S.A.C.');
    expect(ajuste.destinatarioNumeroDocumento).toBe('20222222222');
  });

  it('activar=false limpia el Destinatario y marca destinatarioEsMismoRemitente=false, habilitando el buscador', () => {
    const ajuste = calcularAjusteDestinatarioPorMismoRemitente(false, EMPRESA_A);
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
      destinatarioEsMismoRemitente: false,
    });
  });
});

describe('calcularAjusteActoresAdicionalesPorCambioMotivo', () => {
  it('01 → 03 (sin actor adicional antes, Comprador ahora): no hay nada que limpiar, el usuario debe seleccionarlo', () => {
    const ajuste = calcularAjusteActoresAdicionalesPorCambioMotivo('remitente', '01', '03');
    expect(ajuste).toBeNull();
  });

  it('03 → 01 (Comprador antes, sin actor adicional ahora): limpia el snapshot residual de Comprador', () => {
    const ajuste = calcularAjusteActoresAdicionalesPorCambioMotivo('remitente', '03', '01');
    expect(ajuste).toEqual({
      compradorNombre: '',
      compradorTipoDocumento: undefined,
      compradorNumeroDocumento: undefined,
    });
  });

  it('02 → 07 (Proveedor → Proveedor, mismo rol): preserva el snapshot ya seleccionado', () => {
    const ajuste = calcularAjusteActoresAdicionalesPorCambioMotivo('remitente', '02', '07');
    expect(ajuste).toBeNull();
  });

  it('02 → 03 (Proveedor deja de existir, Comprador es nuevo): limpia SOLO Proveedor — nunca reutiliza ese dato como Comprador', () => {
    const ajuste = calcularAjusteActoresAdicionalesPorCambioMotivo('remitente', '02', '03');
    expect(ajuste).toEqual({
      proveedorNombre: '',
      proveedorTipoDocumento: undefined,
      proveedorNumeroDocumento: undefined,
    });
  });

  it('03 → 02 (Comprador deja de existir, Proveedor es nuevo): limpia SOLO Comprador', () => {
    const ajuste = calcularAjusteActoresAdicionalesPorCambioMotivo('remitente', '03', '02');
    expect(ajuste).toEqual({
      compradorNombre: '',
      compradorTipoDocumento: undefined,
      compradorNumeroDocumento: undefined,
    });
  });

  it('03 → 03 (permanecer en el mismo motivo, ej. al editar otro campo): no toca ningún actor adicional — preserva el snapshot del borrador', () => {
    const ajuste = calcularAjusteActoresAdicionalesPorCambioMotivo('remitente', '03', '03');
    expect(ajuste).toBeNull();
  });

  it('01 → 01 (ningún motivo tiene actores adicionales): no produce ajuste', () => {
    const ajuste = calcularAjusteActoresAdicionalesPorCambioMotivo('remitente', '01', '01');
    expect(ajuste).toBeNull();
  });

  // ── Coexistencia con motivo 13 (Proveedor + Comprador simultáneos) ──

  it('02 → 13 (Proveedor sigue presente, Comprador es nuevo): NO limpia Proveedor, y no hay nada que limpiar de Comprador (es nuevo)', () => {
    const ajuste = calcularAjusteActoresAdicionalesPorCambioMotivo('remitente', '02', '13');
    expect(ajuste).toBeNull();
  });

  it('03 → 13 (Comprador sigue presente, Proveedor es nuevo): NO limpia Comprador', () => {
    const ajuste = calcularAjusteActoresAdicionalesPorCambioMotivo('remitente', '03', '13');
    expect(ajuste).toBeNull();
  });

  it('13 → 02 (Proveedor sigue presente, Comprador ya no existe): limpia SOLO Comprador, Proveedor se conserva intacto', () => {
    const ajuste = calcularAjusteActoresAdicionalesPorCambioMotivo('remitente', '13', '02');
    expect(ajuste).toEqual({
      compradorNombre: '',
      compradorTipoDocumento: undefined,
      compradorNumeroDocumento: undefined,
    });
  });

  it('13 → 03 (Comprador sigue presente, Proveedor ya no existe): limpia SOLO Proveedor, Comprador se conserva intacto', () => {
    const ajuste = calcularAjusteActoresAdicionalesPorCambioMotivo('remitente', '13', '03');
    expect(ajuste).toEqual({
      proveedorNombre: '',
      proveedorTipoDocumento: undefined,
      proveedorNumeroDocumento: undefined,
    });
  });

  it('13 → 07 (Proveedor sigue presente, Comprador ya no existe): limpia SOLO Comprador', () => {
    const ajuste = calcularAjusteActoresAdicionalesPorCambioMotivo('remitente', '13', '07');
    expect(ajuste).toEqual({
      compradorNombre: '',
      compradorTipoDocumento: undefined,
      compradorNumeroDocumento: undefined,
    });
  });

  it('13 → 01 (ni Proveedor ni Comprador existen ya): limpia ambos independientemente', () => {
    const ajuste = calcularAjusteActoresAdicionalesPorCambioMotivo('remitente', '13', '01');
    expect(ajuste).toEqual({
      proveedorNombre: '',
      proveedorTipoDocumento: undefined,
      proveedorNumeroDocumento: undefined,
      compradorNombre: '',
      compradorTipoDocumento: undefined,
      compradorNumeroDocumento: undefined,
    });
  });

  it('permanecer en Otros (13 → 13) no toca ni Proveedor ni Comprador', () => {
    const ajuste = calcularAjusteActoresAdicionalesPorCambioMotivo('remitente', '13', '13');
    expect(ajuste).toBeNull();
  });
});
