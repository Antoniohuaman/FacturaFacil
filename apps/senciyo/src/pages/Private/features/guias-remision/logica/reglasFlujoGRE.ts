import type { GuiaRemision, TipoGRE } from '../modelos/GuiaRemision';

// ─── Tipos ───────────────────────────────────────────────────

/** Regla para un actor de la guía (principal o adicional). */
export interface ReglaActorGRE {
  /** Etiqueta visible en el formulario (ej. 'Destinatario', 'Proveedor', 'Tercero/Transformador (destino)'). */
  label: string;
  /** Si true, el campo es obligatorio para emitir. */
  obligatorio: boolean;
  /**
   * Cuando es `true`, este actor NO se busca/selecciona manualmente — se deriva automáticamente
   * de la empresa emisora (RUC + razón social de `Company`/`activeWorkspace`), igual que SUNAT SOL
   * lo hace para Motivo 02 (Compra): el destinatario es la propia empresa que recibe los bienes.
   * Fijo por motivo — a diferencia de `permiteMismoRemitente`, el usuario no puede desactivarlo.
   */
  autoDerivadoDeEmpresa?: boolean;
  /**
   * Cuando es `true` (hoy: Motivo 13, Otros), el formulario ofrece un switch "¿Es el mismo
   * remitente?" para que el USUARIO decida, documento por documento, si el Destinatario es la
   * propia empresa (igual fuente/snapshot que `autoDerivadoDeEmpresa`) o un tercero real
   * (`BuscadorTercero`). El estado elegido se persiste en `destinatarioEsMismoRemitente`.
   */
  permiteMismoRemitente?: boolean;
  /**
   * Tipo de cuenta a registrar cuando este actor se busca/crea mediante el buscador real de
   * terceros (RUC/DNI/nombre, consulta SUNAT/RENIEC, catálogo de clientes) y no existe aún en el
   * catálogo (p. ej. 'Proveedor' para Compra/Recojo de bienes transformados, 'Cliente' para el
   * Comprador de Venta con entrega a terceros). Ausente en el actor principal, que siempre es
   * 'Cliente'.
   */
  tipoCuentaTercero?: 'Cliente' | 'Proveedor';
}

/**
 * Actor adicional con rol documental explícito. `rol` determina en qué campos de `GuiaRemision`
 * vive su snapshot (`proveedor*` o `comprador*`) — cada rol tiene su propia ranura independiente,
 * nunca comparten campos, por lo que pueden coexistir en el mismo documento (motivo '13').
 */
export interface RolActorGRE extends ReglaActorGRE {
  rol: 'proveedor' | 'comprador';
}

/** Regla completa de flujo para un motivo+tipo de guía. */
export interface ReglaFlujoGRE {
  /** Actor principal — siempre presente (Destinatario, salvo relabels puntuales). */
  actorPrincipal: ReglaActorGRE;
  /**
   * Actores adicionales del motivo, cada uno con su rol documental explícito. Puede tener 0, 1
   * (Proveedor en Compra/Recojo; Comprador en Venta con entrega a terceros) o 2 elementos
   * simultáneos (Proveedor + Comprador en Otros) — nunca se fuerzan dos terceros dentro de una
   * única ranura genérica.
   */
  actoresAdicionales: RolActorGRE[];
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
  actoresAdicionales: [],
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
    // SUNAT SOL). El Proveedor (quien vende y traslada los bienes) es el actor adicional real que
    // el usuario sí selecciona.
    actorPrincipal: { ...REGLA_BASE.actorPrincipal, autoDerivadoDeEmpresa: true },
    actoresAdicionales: [{ rol: 'proveedor', label: 'Proveedor', obligatorio: true, tipoCuentaTercero: 'Proveedor' }],
    documentosRecomendados: ['01', '03', '04'],
    ayudaMotivo:
      'Para Compra, el destinatario es la propia empresa (quien recibe los bienes); el Proveedor es quien los vende y traslada.',
  },

  '03': {
    ...REGLA_BASE,
    actorPrincipal: { label: 'Destinatario (receptor)', obligatorio: true },
    // El motivo 03 existe precisamente porque el destinatario (quien recibe físicamente los
    // bienes) difiere del comprador (quien los adquirió) — por eso el Comprador es obligatorio
    // siempre que se elige este motivo, igual que el Destinatario. Usa el mismo buscador real de
    // terceros (RUC/DNI/nombre, SUNAT/RENIEC, catálogo de clientes) que el resto de actores.
    actoresAdicionales: [{ rol: 'comprador', label: 'Comprador', obligatorio: true, tipoCuentaTercero: 'Cliente' }],
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
    // Recojo de bienes transformados: misma semántica de actores que Compra ('02') — el
    // destinatario es la propia empresa emisora (quien recibe los bienes ya transformados), y el
    // Proveedor es el tercero que realizó la transformación y los entrega.
    actorPrincipal: { ...REGLA_BASE.actorPrincipal, autoDerivadoDeEmpresa: true },
    actoresAdicionales: [{ rol: 'proveedor', label: 'Proveedor', obligatorio: true, tipoCuentaTercero: 'Proveedor' }],
    documentosRecomendados: [],
    ayudaMotivo:
      'Para Recojo de bienes transformados, el destinatario es la propia empresa (quien recibe los bienes ya transformados); el Proveedor es quien realizó la transformación y los entrega.',
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
    // Otros: el destinatario puede ser la propia empresa (switch "mismo remitente", igual fuente
    // que Compra/Recojo) o un tercero real — a diferencia de esos motivos, aquí NO es fijo, lo
    // decide el usuario documento por documento. Proveedor y Comprador pueden coexistir: ninguno
    // de los dos es obligatorio por regla real de SUNAT, así que no se fuerza su obligatoriedad
    // solo porque el catálogo SUNAT los contempla.
    actorPrincipal: { ...REGLA_BASE.actorPrincipal, permiteMismoRemitente: true },
    actoresAdicionales: [
      { rol: 'proveedor', label: 'Proveedor', obligatorio: false, tipoCuentaTercero: 'Proveedor' },
      { rol: 'comprador', label: 'Comprador', obligatorio: false, tipoCuentaTercero: 'Cliente' },
    ],
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

/**
 * Devuelve los datos snapshot del actor adicional de un rol dado, ya persistidos en la GRE — la
 * única fuente que deben leer formulario, validación e impresión (nunca reconstruir desde el
 * catálogo maestro de clientes/proveedores).
 */
export function obtenerDatosRolActorGRE(
  guia: Pick<
    GuiaRemision,
    'proveedorNombre' | 'proveedorTipoDocumento' | 'proveedorNumeroDocumento' | 'compradorNombre' | 'compradorTipoDocumento' | 'compradorNumeroDocumento'
  >,
  rol: 'proveedor' | 'comprador',
): { nombre?: string; tipoDocumento?: string; numeroDocumento?: string } {
  return rol === 'proveedor'
    ? { nombre: guia.proveedorNombre, tipoDocumento: guia.proveedorTipoDocumento, numeroDocumento: guia.proveedorNumeroDocumento }
    : { nombre: guia.compradorNombre, tipoDocumento: guia.compradorTipoDocumento, numeroDocumento: guia.compradorNumeroDocumento };
}

/**
 * Migración de datos legacy: antes de existir campos `proveedor*` independientes, las GRE de
 * motivos con un único actor adicional de rol 'proveedor' (Compra, Recojo de bienes
 * transformados) lo guardaban en los campos `comprador*` (única ranura que existía entonces). Al
 * cargar un documento persistido con esa forma antigua, reubica el dato al campo real que le
 * corresponde — nunca descarta información — y es idempotente: una vez migrado, los campos
 * `comprador*` legacy quedan vacíos y una segunda ejecución no vuelve a tocar nada.
 */
export function normalizarActoresAdicionalesLegacyGRE(guia: GuiaRemision): GuiaRemision {
  const regla = obtenerReglaFlujoGRE(guia.tipo, guia.motivoTraslado);
  const esSoloProveedor =
    regla.actoresAdicionales.length === 1 && regla.actoresAdicionales[0].rol === 'proveedor';
  const tieneDatosLegacy = !guia.proveedorNombre?.trim() && Boolean(guia.compradorNombre?.trim());

  if (!esSoloProveedor || !tieneDatosLegacy) return guia;

  return {
    ...guia,
    proveedorNombre: guia.compradorNombre,
    proveedorTipoDocumento: guia.compradorTipoDocumento,
    proveedorNumeroDocumento: guia.compradorNumeroDocumento,
    compradorNombre: undefined,
    compradorTipoDocumento: undefined,
    compradorNumeroDocumento: undefined,
  };
}

/** Datos reales de la empresa emisora (misma fuente que ya usa la impresión: `activeWorkspace`). */
export interface DatosEmpresaGRE {
  razonSocial: string;
  ruc: string;
  domicilioFiscal?: string;
}

/** Ajuste de campos de Destinatario a aplicar cuando el cambio de motivo (o el switch "mismo remitente") lo requiere. */
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
  destinatarioEsMismoRemitente: boolean | undefined;
}

function construirDestinatarioEmpresa(empresa: DatosEmpresaGRE | null): Omit<AjusteDestinatarioGRE, 'destinatarioEsMismoRemitente'> {
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

function limpiarDestinatario(): Omit<AjusteDestinatarioGRE, 'destinatarioEsMismoRemitente'> {
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

/** El destinatario está efectivamente auto-derivado de la empresa: fijo por motivo (Compra/Recojo) o por elección del usuario vía switch (Otros). */
function esDestinatarioAutoDerivado(actor: ReglaActorGRE, mismoRemitente: boolean): boolean {
  return Boolean(actor.autoDerivadoDeEmpresa) || Boolean(actor.permiteMismoRemitente && mismoRemitente);
}

/**
 * Regla central: calcula el ajuste de Destinatario al cambiar de motivo de traslado, para
 * cualquier motivo con `actorPrincipal.autoDerivadoDeEmpresa` (Compra, Recojo de bienes
 * transformados) o `permiteMismoRemitente` (Otros, según el switch vigente antes del cambio).
 *
 * - Al ENTRAR a un motivo con destinatario auto-derivado fijo: puebla el Destinatario con los
 *   datos reales de la empresa emisora (snapshot — se congela en el documento, nunca se re-deriva
 *   en impresión).
 * - Al SALIR de un motivo cuyo destinatario era efectivamente auto-derivado (fijo, o por switch
 *   activo): limpia ese Destinatario, porque ya no corresponde a un motivo distinto — y si el
 *   motivo nuevo ofrece el switch (Otros), lo deja en `false` (arranca siempre apagado, nunca
 *   asume que el usuario querría reactivarlo).
 * - Si no hay transición real (incluye permanecer en el mismo motivo, p. ej. al editar otros
 *   campos de un documento ya guardado), devuelve `null`: el llamador no debe tocar el
 *   Destinatario, preservando cualquier snapshot válido existente (borradores).
 *
 * Única fuente de esta regla — nunca debe reimplementarse con `if (motivo === '02')` sueltos.
 */
export function calcularAjusteDestinatarioPorCambioMotivo(
  tipoGRE: TipoGRE,
  motivoAnterior: string,
  motivoNuevo: string,
  empresa: DatosEmpresaGRE | null,
  mismoRemitenteAntes: boolean = false,
): AjusteDestinatarioGRE | null {
  if (motivoAnterior === motivoNuevo) return null;

  const reglaAnterior = obtenerReglaFlujoGRE(tipoGRE, motivoAnterior);
  const reglaNueva = obtenerReglaFlujoGRE(tipoGRE, motivoNuevo);
  const antes = esDestinatarioAutoDerivado(reglaAnterior.actorPrincipal, mismoRemitenteAntes);
  // Al llegar a un motivo nuevo el switch siempre arranca apagado — solo `autoDerivadoDeEmpresa`
  // (fijo) puede dejar el destinatario auto-derivado nada más entrar.
  const despues = Boolean(reglaNueva.actorPrincipal.autoDerivadoDeEmpresa);

  if (despues && !antes) {
    return { ...construirDestinatarioEmpresa(empresa), destinatarioEsMismoRemitente: undefined };
  }

  if (!despues && antes) {
    return {
      ...limpiarDestinatario(),
      destinatarioEsMismoRemitente: reglaNueva.actorPrincipal.permiteMismoRemitente ? false : undefined,
    };
  }

  return null;
}

/**
 * Calcula el ajuste de Destinatario al activar/desactivar el switch "¿Es el mismo remitente?"
 * (motivo '13' — Otros). Misma construcción de datos que `calcularAjusteDestinatarioPorCambioMotivo`
 * — reutilizada, nunca duplicada — pero disparada por la acción del usuario sobre el switch en
 * lugar de un cambio de motivo.
 */
export function calcularAjusteDestinatarioPorMismoRemitente(
  activar: boolean,
  empresa: DatosEmpresaGRE | null,
): AjusteDestinatarioGRE {
  return activar
    ? { ...construirDestinatarioEmpresa(empresa), destinatarioEsMismoRemitente: true }
    : { ...limpiarDestinatario(), destinatarioEsMismoRemitente: false };
}

/** Ajuste de campos de los actores adicionales (Proveedor/Comprador) a aplicar cuando el cambio de motivo lo requiere. */
export interface AjusteActoresAdicionalesGRE {
  proveedorNombre?: string;
  proveedorTipoDocumento?: string;
  proveedorNumeroDocumento?: string;
  compradorNombre?: string;
  compradorTipoDocumento?: string;
  compradorNumeroDocumento?: string;
}

const ROLES_ACTOR_ADICIONAL = ['proveedor', 'comprador'] as const;

function limpiarRolActorAdicional(rol: 'proveedor' | 'comprador'): AjusteActoresAdicionalesGRE {
  return rol === 'proveedor'
    ? { proveedorNombre: '', proveedorTipoDocumento: undefined, proveedorNumeroDocumento: undefined }
    : { compradorNombre: '', compradorTipoDocumento: undefined, compradorNumeroDocumento: undefined };
}

/**
 * Calcula el ajuste de los actores adicionales (Proveedor/Comprador, cada uno en su propia ranura
 * de rol) al cambiar de motivo de traslado. Como Proveedor y Comprador ahora tienen campos
 * documentales independientes, la normalización es puramente por rol: si un rol deja de estar
 * presente en el motivo nuevo, se limpia su snapshot; si sigue presente (incluso si cambia su
 * obligatoriedad, p. ej. Compra → Otros) se conserva; si es un rol nuevo que no existía antes, no
 * hay nada que poblar automáticamente — el usuario debe seleccionarlo.
 *
 * Devuelve `null` cuando no hay que tocar ningún actor adicional (incluye permanecer en el mismo
 * motivo). Única fuente de esta regla — nunca debe reimplementarse con `if (motivo === '03')` sueltos.
 */
export function calcularAjusteActoresAdicionalesPorCambioMotivo(
  tipoGRE: TipoGRE,
  motivoAnterior: string,
  motivoNuevo: string,
): AjusteActoresAdicionalesGRE | null {
  if (motivoAnterior === motivoNuevo) return null;

  const reglaAnterior = obtenerReglaFlujoGRE(tipoGRE, motivoAnterior);
  const reglaNueva = obtenerReglaFlujoGRE(tipoGRE, motivoNuevo);

  let ajuste: AjusteActoresAdicionalesGRE | null = null;
  for (const rol of ROLES_ACTOR_ADICIONAL) {
    const presenteAntes = reglaAnterior.actoresAdicionales.some((a) => a.rol === rol);
    const presenteDespues = reglaNueva.actoresAdicionales.some((a) => a.rol === rol);
    if (presenteAntes && !presenteDespues) {
      ajuste = { ...(ajuste ?? {}), ...limpiarRolActorAdicional(rol) };
    }
  }
  return ajuste;
}
