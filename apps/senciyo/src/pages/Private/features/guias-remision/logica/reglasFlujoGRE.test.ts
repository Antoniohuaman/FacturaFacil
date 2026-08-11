import { describe, it, expect } from 'vitest';
import {
  obtenerReglaFlujoGRE,
  obtenerDatosRolActorGRE,
  normalizarActoresAdicionalesLegacyGRE,
  calcularAjusteDestinatarioPorCambioMotivo,
  calcularAjusteDestinatarioPorMismoRemitente,
  calcularAjusteActoresAdicionalesPorCambioMotivo,
  calcularAjusteSubcontratadoGRE,
  pagadorSubcontratadorEsValidoGRE,
  subcontratadorTieneDocumentoValidoGRE,
  pagadorTerceroEsValidoGRE,
  indicadorTrasladoTotalEsValidoGRE,
  textoTipoPagadorFleteGRE,
  obtenerDatosPagadorFleteGRE,
  aplicaModalidadTransporteGRE,
  aplicaMotivoTrasladoGRE,
  aplicaM1oLGRE,
  esTransportePrivadoGRE,
  obtenerDescripcionDetalladaBienGRE,
} from './reglasFlujoGRE';
import { GUIA_REMISION_BORRADOR } from '../modelos/GuiaRemision';
import type { GuiaRemision } from '../modelos/GuiaRemision';

const EMPRESA_A = { nombre: 'Empresa A S.A.C.', numeroDocumento: '20111111111', tipoDocumento: 'RUC', direccion: 'Av. A 100' };
const EMPRESA_B = { nombre: 'Empresa B S.A.C.', numeroDocumento: '20222222222', tipoDocumento: 'RUC', direccion: 'Av. B 200' };
const REMITENTE_A = { nombre: 'Remitente A S.A.C.', numeroDocumento: '20333333333', tipoDocumento: 'RUC' };
const REMITENTE_B = { nombre: 'Remitente B S.A.C.', numeroDocumento: '20444444444', tipoDocumento: 'RUC' };

describe('obtenerReglaFlujoGRE — Remitente', () => {
  it('motivo 01 (Venta) usa la regla base: Destinatario obligatorio, sin actores adicionales, punto de llegada obligatorio', () => {
    const regla = obtenerReglaFlujoGRE('remitente', '01');
    expect(regla.actorPrincipal).toEqual({ label: 'Destinatario', obligatorio: true });
    expect(regla.actoresAdicionales).toEqual([]);
    expect(regla.puntoLlegadaObligatorio).toBe(true);
    expect(regla.requiereEspecificacion).toBe(false);
    expect(regla.requierePagadorFlete).toBe(false);
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

  it('motivo 13 (Otros): el Destinatario ofrece el switch "mismo remitente" (no fijo) y Proveedor + Comprador coexisten, ambos opcionales, sin pagador del flete (concepto exclusivo de Transportista)', () => {
    const regla = obtenerReglaFlujoGRE('remitente', '13');
    expect(regla.actorPrincipal.permiteMismoRemitente).toBe(true);
    expect(regla.actorPrincipal.autoDerivadoDeEmpresa).toBeUndefined();
    expect(regla.actoresAdicionales).toEqual([
      { rol: 'proveedor', label: 'Proveedor', obligatorio: false, tipoCuentaTercero: 'Proveedor' },
      { rol: 'comprador', label: 'Comprador', obligatorio: false, tipoCuentaTercero: 'Cliente' },
    ]);
    expect(regla.requierePagadorFlete).toBe(false);
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
  it('la regla de Transportista es estática: Remitente es el único actor adicional obligatorio, "mismo remitente" disponible, sin especificación y con pagador del flete obligatorio', () => {
    const regla = obtenerReglaFlujoGRE('transportista', '13');
    expect(regla.requiereEspecificacion).toBe(false);
    expect(regla.actorPrincipal.permiteMismoRemitente).toBe(true);
    expect(regla.actorPrincipal.autoDerivadoDeEmpresa).toBeUndefined();
    expect(regla.actoresAdicionales).toEqual([
      { rol: 'remitente', label: 'Remitente', obligatorio: true, tipoCuentaTercero: 'Cliente' },
    ]);
    expect(regla.requierePagadorFlete).toBe(true);
  });

  it('el motivo de traslado ya NO diferencia ninguna regla de Transportista: legacy 13/20/21/22, un motivo desconocido, y una cadena vacía producen exactamente la misma regla', () => {
    const motivos = ['13', '20', '21', '22', '99', ''];
    const reglas = motivos.map((m) => obtenerReglaFlujoGRE('transportista', m));
    for (const regla of reglas) {
      expect(regla).toEqual(reglas[0]);
    }
  });

  it('Subcontratador NUNCA aparece en actoresAdicionales de Transportista, para ningún motivo — es un indicador booleano (transporteSubcontratado) independiente de esta regla', () => {
    for (const motivo of ['13', '20', '21', '22']) {
      const regla = obtenerReglaFlujoGRE('transportista', motivo);
      expect(regla.actoresAdicionales.some((a) => a.rol === 'remitente')).toBe(true);
      expect(regla.actoresAdicionales).toHaveLength(1);
    }
  });

  it('un motivo exclusivo de Remitente (ej. 02, Compra) no cambia nada en la regla de Transportista, que ya no lee el motivo en absoluto', () => {
    const reglaRemitente = obtenerReglaFlujoGRE('remitente', '02');
    const reglaTransportista = obtenerReglaFlujoGRE('transportista', '02');
    expect(reglaRemitente.actorPrincipal.autoDerivadoDeEmpresa).toBe(true);
    expect(reglaRemitente.actoresAdicionales[0]?.label).toBe('Proveedor');
    expect(reglaTransportista.actorPrincipal.label).toBe('Destinatario');
    expect(reglaTransportista.actorPrincipal.permiteMismoRemitente).toBe(true);
    expect(reglaTransportista.actoresAdicionales).toEqual([
      { rol: 'remitente', label: 'Remitente', obligatorio: true, tipoCuentaTercero: 'Cliente' },
    ]);
    expect(reglaTransportista.requierePagadorFlete).toBe(true);
  });
});

describe('obtenerDatosRolActorGRE', () => {
  const guiaCompleta = {
    proveedorNombre: 'Prov S.A.C.',
    proveedorTipoDocumento: 'RUC',
    proveedorNumeroDocumento: '20111111111',
    compradorNombre: 'Comp S.A.C.',
    compradorTipoDocumento: 'RUC',
    compradorNumeroDocumento: '20999999999',
    remitenteNombre: 'Remitente S.A.C.',
    remitenteTipoDocumento: 'RUC',
    remitenteNumeroDocumento: '20222222222',
  };

  it('rol proveedor lee de los campos proveedor*, nunca de otro rol', () => {
    expect(obtenerDatosRolActorGRE(guiaCompleta, 'proveedor')).toEqual({ nombre: 'Prov S.A.C.', tipoDocumento: 'RUC', numeroDocumento: '20111111111' });
  });

  it('rol comprador lee de los campos comprador*, nunca de otro rol', () => {
    expect(obtenerDatosRolActorGRE(guiaCompleta, 'comprador')).toEqual({ nombre: 'Comp S.A.C.', tipoDocumento: 'RUC', numeroDocumento: '20999999999' });
  });

  it('rol remitente lee de los campos remitente*, nunca de otro rol', () => {
    expect(obtenerDatosRolActorGRE(guiaCompleta, 'remitente')).toEqual({ nombre: 'Remitente S.A.C.', tipoDocumento: 'RUC', numeroDocumento: '20222222222' });
  });

  it('los 3 roles coexisten sin pisarse: cambiar la lectura de uno no afecta a los demás', () => {
    expect(obtenerDatosRolActorGRE(guiaCompleta, 'proveedor').nombre).toBe('Prov S.A.C.');
    expect(obtenerDatosRolActorGRE(guiaCompleta, 'comprador').nombre).toBe('Comp S.A.C.');
    expect(obtenerDatosRolActorGRE(guiaCompleta, 'remitente').nombre).toBe('Remitente S.A.C.');
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

  it('motivo 13 Remitente (dos actores adicionales, no aplica la migración de un-solo-rol) no se toca', () => {
    const guia = guiaBase({ motivoTraslado: '13', compradorNombre: 'Comprador real S.A.C.' });
    expect(normalizarActoresAdicionalesLegacyGRE(guia)).toEqual(guia);
  });

  it('GRE Transportista (rol único "remitente", no "proveedor") no dispara la migración de Proveedor', () => {
    const guia = guiaBase({ tipo: 'transportista', motivoTraslado: '21', compradorNombre: 'Basura ajena a este rol' });
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

  it('legacy: pagadorFlete="SinPagador" (opción retirada del modelo) se normaliza a undefined — nunca se infiere Remitente/Subcontratador/Otro en su lugar', () => {
    const pagadorFleteLegacy = 'SinPagador' as unknown as GuiaRemision['pagadorFlete'];
    const guia = guiaBase({ tipo: 'transportista', pagadorFlete: pagadorFleteLegacy });
    const migrada = normalizarActoresAdicionalesLegacyGRE(guia);
    expect(migrada.pagadorFlete).toBeUndefined();
  });

  it('un pagadorFlete real (no legacy) nunca se toca', () => {
    const guia = guiaBase({ tipo: 'transportista', pagadorFlete: 'Remitente' });
    expect(normalizarActoresAdicionalesLegacyGRE(guia).pagadorFlete).toBe('Remitente');
  });
});

describe('calcularAjusteDestinatarioPorCambioMotivo — GRE Remitente', () => {
  it('al entrar a Compra (01 → 02) puebla el Destinatario con los datos reales de la fuente activa', () => {
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

  it('sin fuente activa (null), no hardcodea ningún valor por defecto — usa cadenas vacías', () => {
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

  it('al entrar a Recojo de bienes transformados (01 → 07) puebla el Destinatario con los datos reales de la fuente activa — misma función central que Compra', () => {
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

describe('calcularAjusteDestinatarioPorCambioMotivo — GRE Transportista', () => {
  it('para Transportista, motivo 02 no existe en su mapa (cae a la regla base, sin permiteMismoRemitente) — no produce ajuste', () => {
    const ajuste = calcularAjusteDestinatarioPorCambioMotivo('transportista', '01', '02', EMPRESA_A);
    expect(ajuste).toBeNull();
  });

  it('al entrar a un motivo de Transportista (fuera de Transportista → 13) el switch arranca apagado — no auto-puebla', () => {
    const ajuste = calcularAjusteDestinatarioPorCambioMotivo('transportista', '13', '13', REMITENTE_A);
    expect(ajuste).toBeNull();
  });

  it('transición ENTRE motivos de Transportista (13 → 20) con el switch activo preserva el Destinatario — cambiar de motivo no implica cambiar de Remitente', () => {
    const ajuste = calcularAjusteDestinatarioPorCambioMotivo('transportista', '13', '20', REMITENTE_A, true);
    expect(ajuste).toBeNull();
  });

  it('transición ENTRE motivos de Transportista (20 → 21) con el switch apagado preserva el Destinatario tercero ya seleccionado', () => {
    const ajuste = calcularAjusteDestinatarioPorCambioMotivo('transportista', '20', '21', REMITENTE_A, false);
    expect(ajuste).toBeNull();
  });

  it('21 → 22 con switch activo: sigue preservando (los 4 motivos de Transportista comparten la misma regla de switch)', () => {
    const ajuste = calcularAjusteDestinatarioPorCambioMotivo('transportista', '21', '22', REMITENTE_B, true);
    expect(ajuste).toBeNull();
  });
});

describe('calcularAjusteDestinatarioPorMismoRemitente', () => {
  it('activar=true puebla el Destinatario con la fuente activa y marca destinatarioEsMismoRemitente=true', () => {
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

  it('GRE Transportista: activar=true con la fuente = Remitente de esta misma GRE (no la empresa) puebla el Destinatario con ese Remitente', () => {
    const ajuste = calcularAjusteDestinatarioPorMismoRemitente(true, REMITENTE_A);
    expect(ajuste.destinatarioNombre).toBe('Remitente A S.A.C.');
    expect(ajuste.destinatarioNumeroDocumento).toBe('20333333333');
    expect(ajuste.destinatarioEsMismoRemitente).toBe(true);
  });

  it('sin fuente (Remitente aún no seleccionado en Transportista), activar=true no hardcodea nada — usa cadenas vacías', () => {
    const ajuste = calcularAjusteDestinatarioPorMismoRemitente(true, null);
    expect(ajuste.destinatarioNombre).toBe('');
    expect(ajuste.destinatarioNumeroDocumento).toBe('');
  });
});

describe('calcularAjusteActoresAdicionalesPorCambioMotivo — GRE Remitente', () => {
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
});

describe('calcularAjusteActoresAdicionalesPorCambioMotivo — GRE Transportista', () => {
  it('cualquier transición de motivo en Transportista no produce ajuste — la regla es estática (Remitente siempre presente, Subcontratador ya no es un rol de esta matriz)', () => {
    expect(calcularAjusteActoresAdicionalesPorCambioMotivo('transportista', '13', '20')).toBeNull();
    expect(calcularAjusteActoresAdicionalesPorCambioMotivo('transportista', '20', '13')).toBeNull();
    expect(calcularAjusteActoresAdicionalesPorCambioMotivo('transportista', '20', '21')).toBeNull();
    expect(calcularAjusteActoresAdicionalesPorCambioMotivo('transportista', '21', '22')).toBeNull();
    expect(calcularAjusteActoresAdicionalesPorCambioMotivo('transportista', '21', '20')).toBeNull();
  });

  it('permanecer en el mismo motivo (20 → 20) no toca nada', () => {
    const ajuste = calcularAjusteActoresAdicionalesPorCambioMotivo('transportista', '20', '20');
    expect(ajuste).toBeNull();
  });
});

describe('calcularAjusteSubcontratadoGRE', () => {
  it('activar=true: no hay nada que limpiar — el usuario aún debe seleccionar el Subcontratador', () => {
    expect(calcularAjusteSubcontratadoGRE(true, undefined)).toEqual({});
    expect(calcularAjusteSubcontratadoGRE(true, 'Remitente')).toEqual({});
  });

  it('activar=false con pagadorFlete="Subcontratador": limpia el snapshot del Subcontratador Y el pagador — queda incoherente si se conserva', () => {
    const ajuste = calcularAjusteSubcontratadoGRE(false, 'Subcontratador');
    expect(ajuste).toEqual({
      subcontratadorNombre: '',
      subcontratadorTipoDocumento: undefined,
      subcontratadorNumeroDocumento: undefined,
      pagadorFlete: undefined,
    });
  });

  it('activar=false con pagadorFlete distinto de "Subcontratador": limpia SOLO el snapshot del Subcontratador, el pagador no se toca', () => {
    expect(calcularAjusteSubcontratadoGRE(false, 'Remitente')).toEqual({
      subcontratadorNombre: '',
      subcontratadorTipoDocumento: undefined,
      subcontratadorNumeroDocumento: undefined,
    });
    expect(calcularAjusteSubcontratadoGRE(false, undefined)).toEqual({
      subcontratadorNombre: '',
      subcontratadorTipoDocumento: undefined,
      subcontratadorNumeroDocumento: undefined,
    });
  });
});

describe('pagadorSubcontratadorEsValidoGRE', () => {
  it('transporteSubcontratado=true con Subcontratador consignado: válido', () => {
    expect(pagadorSubcontratadorEsValidoGRE({ transporteSubcontratado: true, subcontratadorNombre: 'Sub S.A.C.' })).toBe(true);
  });

  it('transporteSubcontratado=false, aunque exista un subcontratadorNombre legacy: inválido — nunca se infiere el indicador desde datos residuales', () => {
    expect(pagadorSubcontratadorEsValidoGRE({ transporteSubcontratado: false, subcontratadorNombre: 'Sub legacy S.A.C.' })).toBe(false);
    expect(pagadorSubcontratadorEsValidoGRE({ transporteSubcontratado: undefined, subcontratadorNombre: 'Sub legacy S.A.C.' })).toBe(false);
  });

  it('transporteSubcontratado=true sin Subcontratador consignado (vacío o solo espacios): inválido', () => {
    expect(pagadorSubcontratadorEsValidoGRE({ transporteSubcontratado: true, subcontratadorNombre: undefined })).toBe(false);
    expect(pagadorSubcontratadorEsValidoGRE({ transporteSubcontratado: true, subcontratadorNombre: '   ' })).toBe(false);
  });
});

describe('aplicaModalidadTransporteGRE / esTransportePrivadoGRE — modalidad público/privado', () => {
  it('GRE Remitente: la modalidad SÍ aplica', () => {
    expect(aplicaModalidadTransporteGRE('remitente')).toBe(true);
  });

  it('GRE Transportista: la modalidad NO aplica — es un concepto exclusivo de Remitente', () => {
    expect(aplicaModalidadTransporteGRE('transportista')).toBe(false);
  });

  it('GRE Remitente privada (modalidadTransporte="02") conserva su comportamiento: esTransportePrivadoGRE=true', () => {
    expect(esTransportePrivadoGRE('remitente', '02')).toBe(true);
  });

  it('GRE Remitente pública (modalidadTransporte="01") conserva su comportamiento: esTransportePrivadoGRE=false', () => {
    expect(esTransportePrivadoGRE('remitente', '01')).toBe(false);
  });

  it('GRE Transportista siempre es "transporte privado" sin importar el valor heredado de modalidadTransporte — nunca se lee ese valor como un hecho real', () => {
    expect(esTransportePrivadoGRE('transportista', '02')).toBe(true);
    expect(esTransportePrivadoGRE('transportista', '01')).toBe(true);
  });

  it('un valor de modalidadTransporte ajeno al catálogo ("" o cualquier otro) tampoco cambia el resultado en Transportista — sigue ignorándose por completo, nunca se fuerza ni se lee', () => {
    expect(esTransportePrivadoGRE('transportista', '')).toBe(true);
    expect(esTransportePrivadoGRE('transportista', 'cualquier-valor')).toBe(true);
  });
});

describe('transporte subcontratado — indicador booleano real, independiente del motivo (corrección arquitectónica)', () => {
  it('ningún motivo de Transportista (13/20/21/22, ni uno desconocido) expone jamás un rol "subcontratador" en actoresAdicionales — Subcontratador ya no se deriva del motivo', () => {
    for (const motivo of ['13', '20', '21', '22', '99']) {
      const regla = obtenerReglaFlujoGRE('transportista', motivo);
      expect(regla.actoresAdicionales.map((a) => a.rol)).toEqual(['remitente']);
    }
  });

  it('el indicador real es guia.transporteSubcontratado — pagadorSubcontratadorEsValidoGRE lo exige explícitamente, nunca infiere desde el motivo', () => {
    expect(pagadorSubcontratadorEsValidoGRE({ transporteSubcontratado: true, subcontratadorNombre: 'Sub S.A.C.' })).toBe(true);
    expect(pagadorSubcontratadorEsValidoGRE({ transporteSubcontratado: false, subcontratadorNombre: 'Sub S.A.C.' })).toBe(false);
  });
});

describe('aplicaMotivoTrasladoGRE — motivo de traslado exclusivo de GRE Remitente', () => {
  it('GRE Remitente: el motivo SÍ aplica', () => {
    expect(aplicaMotivoTrasladoGRE('remitente')).toBe(true);
  });

  it('GRE Transportista: el motivo NO aplica — es un concepto exclusivo de Remitente, igual que la modalidad', () => {
    expect(aplicaMotivoTrasladoGRE('transportista')).toBe(false);
  });
});

describe('aplicaM1oLGRE — "Vehículo categoría M1 o L" es exclusivo de GRE Remitente', () => {
  it('GRE Remitente: el indicador SÍ aplica — conserva su comportamiento actual', () => {
    expect(aplicaM1oLGRE('remitente')).toBe(true);
  });

  it('GRE Transportista: el indicador NO aplica — no forma parte de su formulario documental', () => {
    expect(aplicaM1oLGRE('transportista')).toBe(false);
  });
});

describe('subcontratadorTieneDocumentoValidoGRE — el Subcontratador es siempre una empresa (RUC)', () => {
  it('sin Subcontratador consignado todavía: válido (nada que rechazar aún)', () => {
    expect(subcontratadorTieneDocumentoValidoGRE({ subcontratadorNombre: undefined, subcontratadorTipoDocumento: undefined })).toBe(true);
    expect(subcontratadorTieneDocumentoValidoGRE({ subcontratadorNombre: '', subcontratadorTipoDocumento: undefined })).toBe(true);
  });

  it('Subcontratador con RUC: válido', () => {
    expect(subcontratadorTieneDocumentoValidoGRE({ subcontratadorNombre: 'Sub S.A.C.', subcontratadorTipoDocumento: 'RUC' })).toBe(true);
  });

  it('Subcontratador con DNI: inválido — no puede ser una persona natural', () => {
    expect(subcontratadorTieneDocumentoValidoGRE({ subcontratadorNombre: 'Juan Pérez', subcontratadorTipoDocumento: 'DNI' })).toBe(false);
  });

  it('Subcontratador con Carné de Extranjería: inválido', () => {
    expect(subcontratadorTieneDocumentoValidoGRE({ subcontratadorNombre: 'Juan Pérez', subcontratadorTipoDocumento: 'CE' })).toBe(false);
  });
});

describe('pagadorTerceroEsValidoGRE — el tercero de Pagador="Otro" no puede ser el mismo Remitente ni el mismo Subcontratador', () => {
  const base = {
    pagadorFlete: 'Otro' as const,
    remitenteTipoDocumento: 'RUC',
    remitenteNumeroDocumento: '20147559898',
    transporteSubcontratado: false,
    subcontratadorTipoDocumento: undefined as string | undefined,
    subcontratadorNumeroDocumento: undefined as string | undefined,
  };

  it('Pagador distinto de "Otro": siempre válido — la regla no le aplica', () => {
    expect(
      pagadorTerceroEsValidoGRE({ ...base, pagadorFlete: 'Remitente', pagadorTerceroTipoDocumento: 'RUC', pagadorTerceroNumeroDocumento: '20147559898' }),
    ).toBe(true);
  });

  it('Otro + tercero con documento distinto al Remitente: válido', () => {
    expect(
      pagadorTerceroEsValidoGRE({ ...base, pagadorTerceroTipoDocumento: 'RUC', pagadorTerceroNumeroDocumento: '20999999999' }),
    ).toBe(true);
  });

  it('Otro + mismo RUC que el Remitente: inválido — ya existe la opción "Remitente"', () => {
    expect(
      pagadorTerceroEsValidoGRE({ ...base, pagadorTerceroTipoDocumento: 'RUC', pagadorTerceroNumeroDocumento: '20147559898' }),
    ).toBe(false);
  });

  it('Subcontratado activo + Otro + mismo RUC que el Subcontratador: inválido — ya existe la opción "Subcontratador"', () => {
    expect(
      pagadorTerceroEsValidoGRE({
        ...base,
        transporteSubcontratado: true,
        subcontratadorTipoDocumento: 'RUC',
        subcontratadorNumeroDocumento: '20777777777',
        pagadorTerceroTipoDocumento: 'RUC',
        pagadorTerceroNumeroDocumento: '20777777777',
      }),
    ).toBe(false);
  });

  it('Subcontratado inactivo: el mismo número del (ex) Subcontratador no se compara — solo aplica cuando realmente está subcontratado', () => {
    expect(
      pagadorTerceroEsValidoGRE({
        ...base,
        transporteSubcontratado: false,
        subcontratadorTipoDocumento: 'RUC',
        subcontratadorNumeroDocumento: '20777777777',
        pagadorTerceroTipoDocumento: 'RUC',
        pagadorTerceroNumeroDocumento: '20777777777',
      }),
    ).toBe(true);
  });

  it('Otro con DNI distinto del tipo de documento del Remitente (RUC): válido aunque el número coincidiera dígito a dígito — la identidad exige mismo tipo y mismo número', () => {
    expect(
      pagadorTerceroEsValidoGRE({ ...base, pagadorTerceroTipoDocumento: 'DNI', pagadorTerceroNumeroDocumento: '12345678' }),
    ).toBe(true);
  });

  it('sin tercero consignado aún (numeroDocumento vacío): válido — nada que contradecir todavía', () => {
    expect(pagadorTerceroEsValidoGRE({ ...base, pagadorTerceroTipoDocumento: undefined, pagadorTerceroNumeroDocumento: undefined })).toBe(true);
    expect(pagadorTerceroEsValidoGRE({ ...base, pagadorTerceroTipoDocumento: 'RUC', pagadorTerceroNumeroDocumento: '   ' })).toBe(true);
  });
});

describe('indicadorTrasladoTotalEsValidoGRE — exige documento relacionado real', () => {
  it('GRE Remitente: siempre válido — el indicador no le aplica', () => {
    expect(indicadorTrasladoTotalEsValidoGRE({ tipo: 'remitente', indicadorTrasladoTotalBienes: true, documentosRelacionados: [] })).toBe(true);
  });

  it('indicador apagado (u omitido): siempre válido, con o sin documentos', () => {
    expect(indicadorTrasladoTotalEsValidoGRE({ tipo: 'transportista', indicadorTrasladoTotalBienes: false, documentosRelacionados: [] })).toBe(true);
    expect(indicadorTrasladoTotalEsValidoGRE({ tipo: 'transportista', indicadorTrasladoTotalBienes: undefined, documentosRelacionados: [] })).toBe(true);
  });

  it('indicador activo SIN documentos relacionados: inválido', () => {
    expect(indicadorTrasladoTotalEsValidoGRE({ tipo: 'transportista', indicadorTrasladoTotalBienes: true, documentosRelacionados: [] })).toBe(false);
  });

  it('indicador activo CON al menos un documento relacionado: válido', () => {
    expect(
      indicadorTrasladoTotalEsValidoGRE({
        tipo: 'transportista',
        indicadorTrasladoTotalBienes: true,
        documentosRelacionados: [{ id: 'd1', origen: 'EXTERNO', tipoDocumentoCodigo: '01', numeroDocumento: 'F001-1' }],
      }),
    ).toBe(true);
  });
});

describe('textoTipoPagadorFleteGRE — etiqueta legible del tipo de pagador', () => {
  it('sin pagadorFlete definido: sin texto', () => {
    expect(textoTipoPagadorFleteGRE(undefined)).toBeUndefined();
  });

  it('cada una de las 3 opciones reales tiene su propia etiqueta', () => {
    expect(textoTipoPagadorFleteGRE('Remitente')).toBe('Remitente');
    expect(textoTipoPagadorFleteGRE('Subcontratador')).toBe('Subcontratador');
    expect(textoTipoPagadorFleteGRE('Otro')).toBe('Otro (tercero)');
  });
});

describe('obtenerDatosPagadorFleteGRE — snapshot único reutilizado por impresión/Vista previa/Drawer', () => {
  function guiaConPagador(overrides: Partial<GuiaRemision> = {}): GuiaRemision {
    return { ...GUIA_REMISION_BORRADOR('transportista'), ...overrides };
  }

  it('sin pagadorFlete definido: null', () => {
    expect(obtenerDatosPagadorFleteGRE(guiaConPagador())).toBeNull();
  });

  it('pagadorFlete="Remitente": lee el snapshot ya consignado del Remitente, nunca lo duplica', () => {
    const datos = obtenerDatosPagadorFleteGRE(
      guiaConPagador({ pagadorFlete: 'Remitente', remitenteNombre: 'Remitente S.A.C.', remitenteTipoDocumento: 'RUC', remitenteNumeroDocumento: '20111111111' }),
    );
    expect(datos).toEqual({ nombre: 'Remitente S.A.C.', tipoDocumento: 'RUC', numeroDocumento: '20111111111' });
  });

  it('pagadorFlete="Subcontratador": lee el snapshot ya consignado del Subcontratador, nunca lo duplica', () => {
    const datos = obtenerDatosPagadorFleteGRE(
      guiaConPagador({ pagadorFlete: 'Subcontratador', subcontratadorNombre: 'Sub S.A.C.', subcontratadorTipoDocumento: 'RUC', subcontratadorNumeroDocumento: '20222222222' }),
    );
    expect(datos).toEqual({ nombre: 'Sub S.A.C.', tipoDocumento: 'RUC', numeroDocumento: '20222222222' });
  });

  it('pagadorFlete="Otro": lee su propio snapshot independiente de tercero', () => {
    const datos = obtenerDatosPagadorFleteGRE(
      guiaConPagador({ pagadorFlete: 'Otro', pagadorTerceroNombre: 'Tercero S.A.C.', pagadorTerceroTipoDocumento: 'RUC', pagadorTerceroNumeroDocumento: '20333333333' }),
    );
    expect(datos).toEqual({ nombre: 'Tercero S.A.C.', tipoDocumento: 'RUC', numeroDocumento: '20333333333' });
  });

  it('Subcontratador=Empresa X y Pagador=Subcontratador: ambos bloques leen el mismo snapshot — no hay dos fuentes distintas para el mismo dato', () => {
    const guia = guiaConPagador({ pagadorFlete: 'Subcontratador', subcontratadorNombre: 'Empresa X', subcontratadorTipoDocumento: 'RUC', subcontratadorNumeroDocumento: '20444444444' });
    const datosDelRolSubcontratador = { nombre: guia.subcontratadorNombre, tipoDocumento: guia.subcontratadorTipoDocumento, numeroDocumento: guia.subcontratadorNumeroDocumento };
    const datosDelPagador = obtenerDatosPagadorFleteGRE(guia);
    expect(datosDelPagador).toEqual(datosDelRolSubcontratador);
  });
});

describe('obtenerDescripcionDetalladaBienGRE — "Descripción detallada del bien" (SUNAT): el nombre nunca se pierde', () => {
  it('sin descripción adicional (undefined): usa solo el nombre — nunca queda vacía', () => {
    expect(obtenerDescripcionDetalladaBienGRE('CORAZON DE POLLO', undefined)).toBe('CORAZON DE POLLO');
  });

  it('con descripción adicional vacía (cadena vacía, el default real del formulario de productos): usa solo el nombre — el bug real era `??` no cubriendo este caso', () => {
    expect(obtenerDescripcionDetalladaBienGRE('CORAZON DE POLLO', '')).toBe('CORAZON DE POLLO');
  });

  it('con descripción adicional solo espacios en blanco: se trata igual que vacía', () => {
    expect(obtenerDescripcionDetalladaBienGRE('CORAZON DE POLLO', '   ')).toBe('CORAZON DE POLLO');
  });

  it('con descripción adicional real y distinta: combina nombre y detalle, sin perder ninguno', () => {
    expect(obtenerDescripcionDetalladaBienGRE('CORAZON DE POLLO', 'Presentación x1kg, congelado')).toBe(
      'CORAZON DE POLLO — Presentación x1kg, congelado',
    );
  });

  it('si la descripción adicional ya contiene el nombre (el usuario lo tipeó en ambos campos): se usa tal cual, sin duplicar', () => {
    expect(obtenerDescripcionDetalladaBienGRE('CORAZON DE POLLO', 'Corazon de pollo x1kg congelado')).toBe(
      'Corazon de pollo x1kg congelado',
    );
  });

  it('recorta espacios sobrantes del nombre y del detalle', () => {
    expect(obtenerDescripcionDetalladaBienGRE('  CORAZON DE POLLO  ', '  Presentación x1kg  ')).toBe(
      'CORAZON DE POLLO — Presentación x1kg',
    );
  });
});
