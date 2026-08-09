import type { TipoGRE } from '../modelos/GuiaRemision';

// ─── Tipos ───────────────────────────────────────────────────

/** Regla para el actor principal de la guía. */
export interface ReglaActorGRE {
  /** Etiqueta visible en el formulario (ej. 'Destinatario', 'Proveedor', 'Tercero/Transformador'). */
  label: string;
  /** Si true, el campo es obligatorio para emitir. */
  obligatorio: boolean;
  /**
   * Cuando es `true`, este actor NO se busca/selecciona manualmente — se deriva automáticamente
   * de la empresa emisora (RUC + razón social de `Company`/`activeWorkspace`), igual que SUNAT SOL
   * lo hace para Motivo 02 (Compra): el destinatario es la propia empresa que recibe los bienes.
   * Ausente/`false` en cualquier otro caso — el formulario sigue exigiendo selección real.
   */
  autoDerivadoDeEmpresa?: boolean;
  /**
   * Cuando es `true` (solo el Proveedor de Motivo 02, Compra), el actor secundario se busca con el
   * mismo buscador real de terceros (RUC/DNI/nombre, consulta SUNAT/RENIEC, catálogo de clientes)
   * que ya usa el actor principal — nunca un segundo buscador nuevo. Ausente/`false` conserva el
   * campo de texto libre ya existente (Comprador, Motivo 03), sin cambios.
   */
  requiereBusquedaTercero?: boolean;
}

/** Regla completa de flujo para un motivo+tipo de guía. */
export interface ReglaFlujoGRE {
  /** Actor principal — siempre presente. */
  actorPrincipal: ReglaActorGRE;
  /**
   * Actor secundario (comprador/proveedor, según el motivo).
   * Presente para motivo '03' (Venta con entrega a terceros, Comprador) y '02' (Compra,
   * Proveedor). `null` para todos los demás motivos.
   */
  actorSecundario: (ReglaActorGRE & { label: string }) | null;
  /**
   * Códigos de documentos relacionados recomendados para este motivo
   * (catálogo DOCUMENTOS_RELACIONADOS_GRE).
   */
  documentosRecomendados: string[];
  /**
   * El punto de llegada es obligatorio para emitir.
   * False para motivo '18' (emisor itinerante).
   */
  puntoLlegadaObligatorio: boolean;
  /**
   * El formulario debe mostrar un campo "Especifique el motivo".
   * Obligatorio para motivo '13' (Otros).
   */
  requiereEspecificacion: boolean;
  /**
   * Ayuda contextual del motivo — disponible como tooltip discreto sobre el campo.
   * null si no aplica.
   */
  ayudaMotivo: string | null;
}

// ─── Regla por defecto ────────────────────────────────────────

const REGLA_BASE: ReglaFlujoGRE = {
  actorPrincipal: { label: 'Destinatario', obligatorio: true },
  actorSecundario: null,
  documentosRecomendados: ['01', '03'],
  puntoLlegadaObligatorio: true,
  requiereEspecificacion: false,
  ayudaMotivo: null,
};

// ─── Matriz por motivo ────────────────────────────────────────

const REGLAS_REMITENTE: Record<string, ReglaFlujoGRE> = {
  '01': {
    ...REGLA_BASE,
    documentosRecomendados: ['01', '03'],
    ayudaMotivo: null,
  },

  '02': {
    ...REGLA_BASE,
    // El destinatario de una GRE Remitente por Compra es la propia empresa emisora (quien recibe
    // los bienes) — se deriva automáticamente, nunca se busca/selecciona (mismo comportamiento que
    // SUNAT SOL). El Proveedor (quien vende y traslada los bienes) es el actor secundario real que
    // el usuario sí selecciona.
    actorPrincipal: { ...REGLA_BASE.actorPrincipal, autoDerivadoDeEmpresa: true },
    actorSecundario: { label: 'Proveedor', obligatorio: true, requiereBusquedaTercero: true },
    documentosRecomendados: ['01', '03', '04'],
    ayudaMotivo:
      'Para Compra, el destinatario es la propia empresa (quien recibe los bienes); el Proveedor es quien los vende y traslada.',
  },

  '03': {
    ...REGLA_BASE,
    actorPrincipal: { label: 'Destinatario (receptor)', obligatorio: true },
    actorSecundario: { label: 'Comprador', obligatorio: false },
    documentosRecomendados: ['01', '03'],
    ayudaMotivo:
      'Venta con entrega a terceros: el destinatario recibe físicamente los bienes; el comprador es quien adquirió.',
  },

  '04': {
    ...REGLA_BASE,
    actorPrincipal: { label: 'Establecimiento destino', obligatorio: false },
    documentosRecomendados: [],
    ayudaMotivo:
      'Traslado entre establecimientos propios. El destinatario es opcional y no es un tercero.',
  },

  '05': {
    ...REGLA_BASE,
    actorPrincipal: { label: 'Consignatario', obligatorio: true },
    documentosRecomendados: [],
    ayudaMotivo:
      'Los documentos relacionados no son obligatorios para Consignación según la normativa SUNAT.',
  },

  '06': {
    ...REGLA_BASE,
    documentosRecomendados: ['01', '03'],
    ayudaMotivo:
      'Devolución: incluya el documento original (factura o boleta) que sustenta la operación.',
  },

  '07': {
    ...REGLA_BASE,
    actorPrincipal: { label: 'Tercero/Transformador', obligatorio: true },
    documentosRecomendados: [],
    ayudaMotivo:
      'Recojo de bienes transformados: el actor es el tercero que realizó la transformación y devuelve los bienes.',
  },

  '08': {
    ...REGLA_BASE,
    documentosRecomendados: ['50', '52'],
    ayudaMotivo:
      'Importación: incluya la Declaración Aduanera de Mercancías (DAM) o Declaración Simplificada (DS).',
  },

  '09': {
    ...REGLA_BASE,
    documentosRecomendados: ['01'],
    ayudaMotivo: null,
  },

  '13': {
    ...REGLA_BASE,
    documentosRecomendados: [],
    requiereEspecificacion: true,
    ayudaMotivo: 'Otros motivos: especifique el motivo de traslado en el campo correspondiente.',
  },

  '14': {
    ...REGLA_BASE,
    actorPrincipal: { label: 'Destinatario/Comprador', obligatorio: true },
    documentosRecomendados: ['01', '03'],
    ayudaMotivo:
      'Venta sujeta a confirmación: la operación queda pendiente de confirmación por el comprador.',
  },

  '17': {
    ...REGLA_BASE,
    actorPrincipal: { label: 'Tercero/Transformador (destino)', obligatorio: true },
    documentosRecomendados: [],
    ayudaMotivo:
      'Traslado para transformación: el destinatario es quien realizará la transformación de los bienes.',
  },

  '18': {
    ...REGLA_BASE,
    actorPrincipal: { label: 'Destinatario', obligatorio: false },
    documentosRecomendados: [],
    puntoLlegadaObligatorio: false,
    ayudaMotivo:
      'Emisor itinerante: el destinatario y el punto de llegada son opcionales según la normativa.',
  },

  '19': {
    ...REGLA_BASE,
    documentosRecomendados: ['50', '52', '91'],
    ayudaMotivo:
      'Traslado a zona primaria: incluya documentos aduaneros aplicables (DAM, DS o Manifiesto de carga).',
  },
};

const REGLAS_TRANSPORTISTA: Record<string, ReglaFlujoGRE> = {
  '13': {
    ...REGLA_BASE,
    documentosRecomendados: [],
    requiereEspecificacion: true,
    ayudaMotivo: 'Otros motivos: especifique el motivo de traslado en el campo correspondiente.',
  },

  '20': {
    ...REGLA_BASE,
    documentosRecomendados: ['09', '31'],
    ayudaMotivo:
      'Traslado por subcontrata: incluya la GRE Remitente del dueño de los bienes.',
  },

  '21': {
    ...REGLA_BASE,
    documentosRecomendados: ['09'],
    ayudaMotivo:
      'Transbordo programado: incluya la GRE Remitente y/o Transportista de origen.',
  },

  '22': {
    ...REGLA_BASE,
    documentosRecomendados: ['09', '82'],
    ayudaMotivo:
      'Traslado por contrato de almacenamiento: incluya la GRE Remitente y la Declaración jurada de mudanza si aplica.',
  },
};

// ─── Helper público ───────────────────────────────────────────

/**
 * Devuelve la regla de flujo para el tipo de GRE y motivo de traslado dados.
 * Nunca lanza — si no hay regla específica, devuelve la regla base.
 */
export function obtenerReglaFlujoGRE(tipoGRE: TipoGRE, motivo: string): ReglaFlujoGRE {
  const mapa = tipoGRE === 'transportista' ? REGLAS_TRANSPORTISTA : REGLAS_REMITENTE;
  return mapa[motivo] ?? REGLA_BASE;
}

/**
 * Devuelve los códigos de documentos relacionados recomendados por motivo.
 * Alias de conveniencia para SeccionDocumentosRelacionados.
 */
export function obtenerDocumentosRecomendadosGRE(tipoGRE: TipoGRE, motivo: string): string[] {
  return obtenerReglaFlujoGRE(tipoGRE, motivo).documentosRecomendados;
}

/** Datos reales de la empresa emisora (misma fuente que ya usa la impresión: `activeWorkspace`). */
export interface DatosEmpresaGRE {
  razonSocial: string;
  ruc: string;
  domicilioFiscal?: string;
}

/** Ajuste de campos de Destinatario a aplicar cuando el cambio de motivo lo requiere. */
export interface AjusteDestinatarioGRE {
  destinatarioClienteId: string | number | undefined;
  destinatarioNombre: string;
  destinatarioTipoDocumento: string;
  destinatarioNumeroDocumento: string;
  destinatarioDireccion: string | undefined;
  destinatarioDepartamento: string | undefined;
  destinatarioProvincia: string | undefined;
  destinatarioDistrito: string | undefined;
  destinatarioUbigeo: string | undefined;
}

/**
 * Regla central (GRE-P1-Compra): calcula el ajuste de Destinatario al cambiar de motivo de
 * traslado, para cualquier motivo con `actorPrincipal.autoDerivadoDeEmpresa` (hoy: '02', Compra).
 *
 * - Al ENTRAR a un motivo auto-derivado: puebla el Destinatario con los datos reales de la
 *   empresa emisora (snapshot — se congela en el documento, nunca se re-deriva en impresión).
 * - Al SALIR de un motivo auto-derivado: limpia ese Destinatario automático, porque ya no
 *   corresponde a un motivo distinto (nunca se conserva un dato que el sistema generó para un
 *   contexto que dejó de aplicar).
 * - Si no hay transición hacia/desde un motivo auto-derivado (incluye permanecer en el mismo
 *   motivo, p. ej. al editar otros campos de una Compra ya guardada), devuelve `null`: el llamador
 *   no debe tocar el Destinatario, preservando cualquier snapshot válido existente (borradores).
 *
 * Única fuente de esta regla — nunca debe reimplementarse con `if (motivo === '02')` sueltos.
 */
export function calcularAjusteDestinatarioPorCambioMotivo(
  tipoGRE: TipoGRE,
  motivoAnterior: string,
  motivoNuevo: string,
  empresa: DatosEmpresaGRE | null,
): AjusteDestinatarioGRE | null {
  const reglaAnterior = obtenerReglaFlujoGRE(tipoGRE, motivoAnterior);
  const reglaNueva = obtenerReglaFlujoGRE(tipoGRE, motivoNuevo);
  const entrando =
    Boolean(reglaNueva.actorPrincipal.autoDerivadoDeEmpresa) && !reglaAnterior.actorPrincipal.autoDerivadoDeEmpresa;
  const saliendo =
    !reglaNueva.actorPrincipal.autoDerivadoDeEmpresa && Boolean(reglaAnterior.actorPrincipal.autoDerivadoDeEmpresa);

  if (entrando) {
    return {
      destinatarioClienteId: undefined,
      destinatarioNombre: empresa?.razonSocial ?? '',
      destinatarioTipoDocumento: 'RUC',
      destinatarioNumeroDocumento: empresa?.ruc ?? '',
      destinatarioDireccion: empresa?.domicilioFiscal,
      destinatarioDepartamento: undefined,
      destinatarioProvincia: undefined,
      destinatarioDistrito: undefined,
      destinatarioUbigeo: undefined,
    };
  }

  if (saliendo) {
    return {
      destinatarioClienteId: undefined,
      destinatarioNombre: '',
      destinatarioTipoDocumento: 'RUC',
      destinatarioNumeroDocumento: '',
      destinatarioDireccion: undefined,
      destinatarioDepartamento: undefined,
      destinatarioProvincia: undefined,
      destinatarioDistrito: undefined,
      destinatarioUbigeo: undefined,
    };
  }

  return null;
}
