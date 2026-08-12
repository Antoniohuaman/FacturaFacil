import type { GuiaRemision, TipoGRE } from '../modelos/GuiaRemision';
import { GUIA_REMISION_BORRADOR } from '../modelos/GuiaRemision';

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
   * Cuando es `true`, el formulario ofrece un switch "¿Es el mismo remitente?" para que el
   * USUARIO decida, documento por documento, si el Destinatario coincide con otro actor ya
   * consignado en la misma GRE:
   * - GRE Remitente, motivo '13' (Otros): el Destinatario puede ser la propia empresa emisora
   *   (misma fuente/snapshot que `autoDerivadoDeEmpresa`).
   * - GRE Transportista (todos sus motivos): el Destinatario puede ser el actor Remitente ya
   *   seleccionado en esta misma GRE — NUNCA la empresa transportista emisora, que es un concepto
   *   distinto (ver `ReglaFlujoGRE`).
   * El estado elegido se persiste en `destinatarioEsMismoRemitente`; la fuente concreta que puebla
   * el snapshot la decide el llamador (`FormularioGREPage.tsx`) según `tipoGRE`, nunca esta regla.
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
 * vive su snapshot (`proveedor*`, `comprador*` o `remitente*`) — cada rol tiene su propia ranura
 * independiente, nunca comparten campos. El Subcontratador de GRE Transportista NO es un rol de
 * este tipo: es un indicador documental booleano (`guia.transporteSubcontratado`) con su propio
 * snapshot (`subcontratador*`), autónomo — no varía por motivo ni participa en esta matriz.
 */
export interface RolActorGRE extends ReglaActorGRE {
  rol: 'proveedor' | 'comprador' | 'remitente';
}

/** Regla completa de flujo para un motivo+tipo de guía. */
export interface ReglaFlujoGRE {
  /** Actor principal — siempre presente (Destinatario, salvo relabels puntuales). */
  actorPrincipal: ReglaActorGRE;
  /**
   * Actores adicionales del motivo, cada uno con su rol documental explícito. P. ej.: Proveedor en
   * Compra/Recojo; Comprador en Venta con entrega a terceros; Proveedor + Comprador en Otros
   * (Remitente); Remitente en cualquier motivo de Transportista; Remitente + Subcontratador en
   * Transportista motivo '20' — nunca se fuerzan dos terceros dentro de una única ranura genérica.
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
   * Obligatorio para motivo '13' (Otros), en Remitente y en Transportista.
   */
  requiereEspecificacion: boolean;
  /**
   * GRE Transportista: exige consignar quién paga el flete (Remitente / Subcontratador / Otro
   * tercero). `false` para GRE Remitente, donde ese concepto no existe.
   */
  requierePagadorFlete: boolean;
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
  requierePagadorFlete: false,
  ayudaMotivo: null,
};

/**
 * Actor Remitente de GRE Transportista — mismo para los 4 motivos ('13'/'20'/'21'/'22'): la propia
 * empresa transportista (emisor de esta GRE) es un concepto distinto y nunca sustituye a este
 * actor, que siempre se busca/selecciona como un tercero real.
 */
const ACTOR_REMITENTE_TRANSPORTISTA: RolActorGRE = {
  rol: 'remitente',
  label: 'Remitente',
  obligatorio: true,
  tipoCuentaTercero: 'Cliente',
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

/**
 * Regla única de GRE Transportista — no varía por motivo de traslado: SUNAT no distingue reglas
 * de Transportista por motivo (ese catálogo es un dato heredado del documento pero no gobierna su
 * funcionalidad real). El Remitente es siempre un actor real presente; el Destinatario puede ser
 * el mismo Remitente (switch); nunca requiere "Especifique el motivo"; siempre exige Pagador del
 * flete. Transporte subcontratado, transbordo y traslado por el total de bienes son indicadores
 * documentales booleanos independientes de esta regla (`guia.transporteSubcontratado`,
 * `guia.transportePrivado.transbordo`, `guia.indicadorTrasladoTotalBienes`).
 */
const REGLA_TRANSPORTISTA: ReglaFlujoGRE = {
  actorPrincipal: { ...REGLA_BASE.actorPrincipal, permiteMismoRemitente: true },
  actoresAdicionales: [ACTOR_REMITENTE_TRANSPORTISTA],
  documentosRecomendados: ['09'],
  puntoLlegadaObligatorio: true,
  requiereEspecificacion: false,
  requierePagadorFlete: true,
  ayudaMotivo: null,
};

// ─── Helper público ───────────────────────────────────────────

/**
 * Devuelve la regla de flujo para el tipo de GRE y motivo de traslado dados.
 * Nunca lanza — si no hay regla específica, devuelve la regla base.
 */
export function obtenerReglaFlujoGRE(tipoGRE: TipoGRE, motivo: string): ReglaFlujoGRE {
  if (tipoGRE === 'transportista') return REGLA_TRANSPORTISTA;
  return REGLAS_REMITENTE[motivo] ?? REGLA_BASE;
}

/**
 * Devuelve los códigos de documentos relacionados recomendados por motivo.
 * Alias de conveniencia para SeccionDocumentosRelacionados.
 */
export function obtenerDocumentosRecomendadosGRE(tipoGRE: TipoGRE, motivo: string): string[] {
  return obtenerReglaFlujoGRE(tipoGRE, motivo).documentosRecomendados;
}

/**
 * ¿El Destinatario documental es realmente la propia empresa (nunca un tercero real)? Ocurre en dos
 * casos, ambos ya modelados en `ReglaActorGRE` — nunca una tercera fuente:
 *  - `autoDerivadoDeEmpresa` (fijo por motivo, p. ej. Compra/Recojo de bienes transformados): el
 *    usuario no puede desactivarlo.
 *  - `permiteMismoRemitente` + el switch "Mismo remitente" activo: el usuario decide, documento por
 *    documento, que el Destinatario coincide con el Remitente/la propia empresa.
 * Única fuente para esta decisión — la usan el formulario (para mostrar el campo de solo lectura)
 * y la resolución de puntos de traslado (para decidir si el Punto de llegada usa las direcciones de
 * la empresa o las de un tercero real), nunca reimplementada por separado en cada consumidor.
 */
export function destinatarioEsAutoDerivadoGRE(regla: ReglaFlujoGRE, mismoRemitente: boolean | undefined): boolean {
  return Boolean(regla.actorPrincipal.autoDerivadoDeEmpresa) || Boolean(regla.actorPrincipal.permiteMismoRemitente && mismoRemitente);
}

/** Actor real (con direcciones propias) que alimenta cada punto de traslado — nunca una dirección independiente del actor salvo que el usuario la registre manualmente vía "Otra dirección". */
export type RolPuntoTrasladoGRE = 'empresa' | 'destinatario' | 'proveedor' | 'remitente';

export interface RolesPuntosTrasladoGRE {
  /** Actor cuyas direcciones reales alimentan el Punto de partida. */
  origen: RolPuntoTrasladoGRE;
  /** Actor cuyas direcciones reales alimentan el Punto de llegada. */
  destino: RolPuntoTrasladoGRE;
}

/**
 * Determina qué actor real alimenta el Punto de partida (origen) y el Punto de llegada (destino)
 * de una GRE — única fuente para esta decisión, consumida por `SeccionPuntosTraslado.tsx`. Nunca se
 * reimplementa como `if (motivo === 'xx')` disperso en cada consumidor; se deriva enteramente de los
 * mismos campos de `ReglaActorGRE` que ya gobiernan el resto del formulario (`autoDerivadoDeEmpresa`,
 * `permiteMismoRemitente`) — ningún motivo nuevo necesita tocar esta función para comportarse bien.
 *   - GRE Transportista: origen=Remitente (quien entrega los bienes), destino=Destinatario (quien
 *     los recibe) — ninguno es la propia empresa transportista, que solo ejecuta el traslado.
 *   - GRE Remitente con Destinatario auto-derivado de la empresa (Compra, Recojo de bienes
 *     transformados, o "Mismo remitente" activo en Otros): destino=empresa; origen=Proveedor si el
 *     motivo lo exige como actor real (Compra/Recojo), o empresa si no hay Proveedor en juego.
 *   - GRE Remitente en cualquier otro caso: origen=empresa (quien remite), destino=Destinatario (el
 *     tercero real que el usuario busca/selecciona).
 */
export function obtenerRolesPuntosTrasladoGRE(
  tipoGRE: TipoGRE,
  motivoTraslado: string,
  destinatarioEsMismoRemitente: boolean | undefined,
): RolesPuntosTrasladoGRE {
  if (tipoGRE === 'transportista') return { origen: 'remitente', destino: 'destinatario' };

  const regla = obtenerReglaFlujoGRE(tipoGRE, motivoTraslado);
  const destinoEsEmpresa = destinatarioEsAutoDerivadoGRE(regla, destinatarioEsMismoRemitente);
  const hayProveedorReal = regla.actorPrincipal.autoDerivadoDeEmpresa && regla.actoresAdicionales.some((a) => a.rol === 'proveedor');

  return {
    origen: hayProveedorReal ? 'proveedor' : 'empresa',
    destino: destinoEsEmpresa ? 'empresa' : 'destinatario',
  };
}

export type DatosActorGRE = { nombre?: string; tipoDocumento?: string; numeroDocumento?: string };

type CamposActoresAdicionalesGRE = Pick<
  GuiaRemision,
  | 'proveedorNombre'
  | 'proveedorTipoDocumento'
  | 'proveedorNumeroDocumento'
  | 'compradorNombre'
  | 'compradorTipoDocumento'
  | 'compradorNumeroDocumento'
  | 'remitenteNombre'
  | 'remitenteTipoDocumento'
  | 'remitenteNumeroDocumento'
>;

/**
 * Devuelve los datos snapshot del actor adicional de un rol dado, ya persistidos en la GRE — la
 * única fuente que deben leer formulario, validación e impresión (nunca reconstruir desde el
 * catálogo maestro de clientes/proveedores).
 */
export function obtenerDatosRolActorGRE(
  guia: CamposActoresAdicionalesGRE,
  rol: RolActorGRE['rol'],
): DatosActorGRE {
  switch (rol) {
    case 'proveedor':
      return { nombre: guia.proveedorNombre, tipoDocumento: guia.proveedorTipoDocumento, numeroDocumento: guia.proveedorNumeroDocumento };
    case 'comprador':
      return { nombre: guia.compradorNombre, tipoDocumento: guia.compradorTipoDocumento, numeroDocumento: guia.compradorNumeroDocumento };
    case 'remitente':
      return { nombre: guia.remitenteNombre, tipoDocumento: guia.remitenteTipoDocumento, numeroDocumento: guia.remitenteNumeroDocumento };
  }
}

/**
 * Migración de datos legacy — un único punto de entrada llamado por `fuenteDatosGRE.ts` al
 * cargar cada documento, que aplica todas las normalizaciones legacy conocidas de forma
 * independiente e idempotente (nunca se reimplementan por separado en un loader paralelo):
 *
 * - Proveedor/Comprador: antes de existir campos `proveedor*` independientes, las GRE de motivos
 *   con un único actor adicional de rol 'proveedor' (Compra, Recojo de bienes transformados) lo
 *   guardaban en los campos `comprador*` (única ranura que existía entonces). Reubica el dato al
 *   campo real que le corresponde — nunca descarta información.
 * - Pagador del flete: la opción "Sin pagador de flete" existió brevemente y fue retirada — un
 *   documento que la hubiera persistido queda normalizado a `undefined` (nunca seleccionado),
 *   nunca se infiere Remitente/Subcontratador/Otro en su lugar (sería inventar una decisión que
 *   el usuario nunca tomó).
 */
export function normalizarActoresAdicionalesLegacyGRE(guia: GuiaRemision): GuiaRemision {
  let normalizado = guia;

  const regla = obtenerReglaFlujoGRE(guia.tipo, guia.motivoTraslado);
  const esSoloProveedor =
    regla.actoresAdicionales.length === 1 && regla.actoresAdicionales[0].rol === 'proveedor';
  const tieneDatosLegacy = !guia.proveedorNombre?.trim() && Boolean(guia.compradorNombre?.trim());
  if (esSoloProveedor && tieneDatosLegacy) {
    normalizado = {
      ...normalizado,
      proveedorNombre: guia.compradorNombre,
      proveedorTipoDocumento: guia.compradorTipoDocumento,
      proveedorNumeroDocumento: guia.compradorNumeroDocumento,
      compradorNombre: undefined,
      compradorTipoDocumento: undefined,
      compradorNumeroDocumento: undefined,
    };
  }

  const pagadorFleteLegacy: string | undefined = guia.pagadorFlete;
  if (pagadorFleteLegacy === 'SinPagador') {
    normalizado = { ...normalizado, pagadorFlete: undefined };
  }

  return normalizado;
}

/**
 * Fuente real que respalda un Destinatario auto-derivado — la propia empresa emisora
 * (`activeWorkspace`, GRE Remitente) o el actor Remitente ya seleccionado en la misma GRE (GRE
 * Transportista). Misma forma genérica para ambas fuentes: quien llama decide cuál usar según
 * `tipoGRE`, esta regla central nunca asume ni consulta una fuente concreta por sí misma.
 */
export interface FuenteDestinatarioAutoDerivadoGRE {
  nombre: string;
  numeroDocumento: string;
  tipoDocumento?: string;
  direccion?: string;
}

/** @deprecated Usar {@link FuenteDestinatarioAutoDerivadoGRE}. Mantenido como alias por compatibilidad de nombre público. */
export type DatosEmpresaGRE = FuenteDestinatarioAutoDerivadoGRE;

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

function construirDestinatarioDesdeFuente(
  fuente: FuenteDestinatarioAutoDerivadoGRE | null,
): Omit<AjusteDestinatarioGRE, 'destinatarioEsMismoRemitente'> {
  return {
    destinatarioClienteId: undefined,
    destinatarioNombre: fuente?.nombre ?? '',
    destinatarioTipoDocumento: fuente?.tipoDocumento ?? 'RUC',
    destinatarioNumeroDocumento: fuente?.numeroDocumento ?? '',
    destinatarioDireccion: fuente?.direccion,
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

/** El destinatario está efectivamente auto-derivado: fijo por motivo (Compra/Recojo) o por elección del usuario vía switch (Otros Remitente / cualquier motivo Transportista). */
function esDestinatarioAutoDerivado(actor: ReglaActorGRE, mismoRemitente: boolean): boolean {
  return Boolean(actor.autoDerivadoDeEmpresa) || Boolean(actor.permiteMismoRemitente && mismoRemitente);
}

/**
 * Regla central: calcula el ajuste de Destinatario al cambiar de motivo de traslado, para
 * cualquier motivo con `actorPrincipal.autoDerivadoDeEmpresa` (Compra, Recojo de bienes
 * transformados) o `permiteMismoRemitente` (Otros Remitente y todos los motivos de Transportista),
 * según el switch vigente antes del cambio.
 *
 * - Al ENTRAR a un motivo con destinatario auto-derivado fijo: puebla el Destinatario con la
 *   `fuente` provista (snapshot — se congela en el documento, nunca se re-deriva en impresión).
 * - Al SALIR de un motivo cuyo destinatario era efectivamente auto-derivado (fijo, o por switch
 *   activo) hacia un motivo que NO ofrece el switch: limpia ese Destinatario, porque ya no
 *   corresponde.
 * - Al TRANSICIONAR entre dos motivos que AMBOS ofrecen el switch (p. ej. entre los motivos de
 *   Transportista): el switch y su snapshot se PRESERVAN tal cual — cambiar de motivo no implica
 *   cambiar de Remitente/Destinatario.
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
  fuente: FuenteDestinatarioAutoDerivadoGRE | null,
  mismoRemitenteAntes: boolean = false,
): AjusteDestinatarioGRE | null {
  if (motivoAnterior === motivoNuevo) return null;

  const reglaAnterior = obtenerReglaFlujoGRE(tipoGRE, motivoAnterior);
  const reglaNueva = obtenerReglaFlujoGRE(tipoGRE, motivoNuevo);
  const antes = esDestinatarioAutoDerivado(reglaAnterior.actorPrincipal, mismoRemitenteAntes);
  // El switch se conserva si el motivo nuevo también lo ofrece (transiciones dentro de
  // Transportista, o entre motivos Remitente que igualmente permiten "mismo remitente"); si el
  // motivo nuevo es fijo (`autoDerivadoDeEmpresa`) queda auto-derivado sin importar el switch; si
  // el motivo nuevo no ofrece ninguno de los dos, queda en `false`.
  const despues = esDestinatarioAutoDerivado(reglaNueva.actorPrincipal, mismoRemitenteAntes);

  if (despues && !antes) {
    return { ...construirDestinatarioDesdeFuente(fuente), destinatarioEsMismoRemitente: undefined };
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
 * Calcula el ajuste de Destinatario al activar/desactivar el switch "¿Es el mismo remitente?".
 * Misma construcción de datos que `calcularAjusteDestinatarioPorCambioMotivo` — reutilizada, nunca
 * duplicada — pero disparada por la acción del usuario sobre el switch en lugar de un cambio de
 * motivo. `fuente` es la propia empresa (GRE Remitente, motivo '13') o el Remitente ya seleccionado
 * en esta GRE (GRE Transportista) — decidido por el llamador, nunca por esta función.
 */
export function calcularAjusteDestinatarioPorMismoRemitente(
  activar: boolean,
  fuente: FuenteDestinatarioAutoDerivadoGRE | null,
): AjusteDestinatarioGRE {
  return activar
    ? { ...construirDestinatarioDesdeFuente(fuente), destinatarioEsMismoRemitente: true }
    : { ...limpiarDestinatario(), destinatarioEsMismoRemitente: false };
}

/** Ajuste de campos de los actores adicionales (Proveedor/Comprador/Remitente) a aplicar cuando el cambio de motivo lo requiere. */
export interface AjusteActoresAdicionalesGRE {
  proveedorNombre?: string;
  proveedorTipoDocumento?: string;
  proveedorNumeroDocumento?: string;
  compradorNombre?: string;
  compradorTipoDocumento?: string;
  compradorNumeroDocumento?: string;
  remitenteNombre?: string;
  remitenteTipoDocumento?: string;
  remitenteNumeroDocumento?: string;
}

const ROLES_ACTOR_ADICIONAL: readonly RolActorGRE['rol'][] = ['proveedor', 'comprador', 'remitente'];

function limpiarRolActorAdicional(rol: RolActorGRE['rol']): AjusteActoresAdicionalesGRE {
  switch (rol) {
    case 'proveedor':
      return { proveedorNombre: '', proveedorTipoDocumento: undefined, proveedorNumeroDocumento: undefined };
    case 'comprador':
      return { compradorNombre: '', compradorTipoDocumento: undefined, compradorNumeroDocumento: undefined };
    case 'remitente':
      return { remitenteNombre: '', remitenteTipoDocumento: undefined, remitenteNumeroDocumento: undefined };
  }
}

/**
 * Calcula el ajuste de los actores adicionales al cambiar de motivo de traslado. Cada rol tiene su
 * propia ranura documental independiente, así que la normalización es puramente por rol: si un rol
 * deja de estar presente en el motivo nuevo, se limpia su snapshot; si sigue presente (p. ej.
 * Remitente en cualquier motivo de Transportista) se conserva; si es un rol nuevo que no existía
 * antes, no hay nada que poblar automáticamente — el usuario debe seleccionarlo.
 *
 * Devuelve `null` cuando no hay que tocar ningún actor adicional (incluye permanecer en el mismo
 * motivo). Única fuente de esta regla — nunca debe reimplementarse con `if (motivo === '20')` sueltos.
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

// ─── Transporte subcontratado y Subcontratador (GRE Transportista) ────────

/** Ajuste de campos de Subcontratador (y, si corresponde, Pagador del flete) al activar/desactivar "Transporte subcontratado". */
export interface AjusteSubcontratadoGRE {
  subcontratadorNombre?: string;
  subcontratadorTipoDocumento?: string;
  subcontratadorNumeroDocumento?: string;
  pagadorFlete?: GuiaRemision['pagadorFlete'];
}

/**
 * Calcula el ajuste al activar/desactivar el indicador "Transporte subcontratado":
 * - Al ACTIVAR: no hay nada que limpiar — el usuario aún debe seleccionar el Subcontratador.
 * - Al DESACTIVAR: limpia el snapshot del Subcontratador (deja de ser un actor válido del
 *   documento) y, si el Pagador del flete elegido era 'Subcontratador', lo limpia también —
 *   nunca se deja un pagador apuntando a un actor que ya no existe. Única fuente de esta
 *   transición — nunca debe reimplementarse con un `useEffect` disperso.
 */
export function calcularAjusteSubcontratadoGRE(
  activar: boolean,
  pagadorFleteActual: GuiaRemision['pagadorFlete'],
): AjusteSubcontratadoGRE {
  if (activar) return {};
  return {
    subcontratadorNombre: '',
    subcontratadorTipoDocumento: undefined,
    subcontratadorNumeroDocumento: undefined,
    ...(pagadorFleteActual === 'Subcontratador' ? { pagadorFlete: undefined } : {}),
  };
}

/** El Pagador del flete = 'Subcontratador' solo es una combinación válida cuando el transporte está subcontratado y hay un Subcontratador real consignado. */
export function pagadorSubcontratadorEsValidoGRE(guia: Pick<GuiaRemision, 'transporteSubcontratado' | 'subcontratadorNombre'>): boolean {
  return Boolean(guia.transporteSubcontratado) && Boolean(guia.subcontratadorNombre?.trim());
}

/**
 * El Subcontratador (GRE Transportista) no es una persona natural cualquiera: es la empresa
 * transportista a la que se subcontrata el traslado, identificada siempre por RUC. Sin
 * Subcontratador consignado aún no hay nada que validar aquí (esa obligatoriedad la exige
 * `validarGREParaEmitir` por separado) — esta función solo protege que, cuando SÍ existe un
 * Subcontratador, su documento sea realmente un RUC.
 */
export function subcontratadorTieneDocumentoValidoGRE(
  guia: Pick<GuiaRemision, 'subcontratadorNombre' | 'subcontratadorTipoDocumento'>,
): boolean {
  if (!guia.subcontratadorNombre?.trim()) return true;
  return guia.subcontratadorTipoDocumento === 'RUC';
}

/** Compara dos actores por identidad documental real (tipo + número de documento) — nunca por nombre visual, que puede repetirse o variar en mayúsculas/espacios sin ser el mismo sujeto. Sin número en cualquiera de los dos lados, no hay identidad que comparar. */
function mismaIdentidadDocumentalGRE(
  a: { tipoDocumento?: string; numeroDocumento?: string },
  b: { tipoDocumento?: string; numeroDocumento?: string },
): boolean {
  const numeroA = a.numeroDocumento?.trim();
  const numeroB = b.numeroDocumento?.trim();
  if (!numeroA || !numeroB) return false;
  return a.tipoDocumento === b.tipoDocumento && numeroA === numeroB;
}

/**
 * El tercero pagador (Pagador del flete = 'Otro') no puede ser el mismo Remitente ni el mismo
 * Subcontratador (cuando el transporte está subcontratado) — ambos ya tienen su propia opción
 * específica en el selector ('Remitente' / 'Subcontratador'); permitir que "Otro" apunte al mismo
 * sujeto sería una contradicción documental. Comparación por identidad real (tipo + número de
 * documento), reutilizando `mismaIdentidadDocumentalGRE` — nunca por nombre visual. Sin tercero
 * consignado aún, no hay nada que contradecir (esa obligatoriedad la exige `validarGREParaEmitir`
 * por separado). El Destinatario nunca se valida aquí: no existe ninguna regla que lo prohíba como
 * pagador tercero.
 */
export function pagadorTerceroEsValidoGRE(
  guia: Pick<
    GuiaRemision,
    | 'pagadorFlete' | 'pagadorTerceroTipoDocumento' | 'pagadorTerceroNumeroDocumento'
    | 'remitenteTipoDocumento' | 'remitenteNumeroDocumento'
    | 'transporteSubcontratado' | 'subcontratadorTipoDocumento' | 'subcontratadorNumeroDocumento'
  >,
): boolean {
  if (guia.pagadorFlete !== 'Otro') return true;
  const tercero = { tipoDocumento: guia.pagadorTerceroTipoDocumento, numeroDocumento: guia.pagadorTerceroNumeroDocumento };
  if (!tercero.numeroDocumento?.trim()) return true;

  const remitente = { tipoDocumento: guia.remitenteTipoDocumento, numeroDocumento: guia.remitenteNumeroDocumento };
  if (mismaIdentidadDocumentalGRE(tercero, remitente)) return false;

  if (guia.transporteSubcontratado) {
    const subcontratador = { tipoDocumento: guia.subcontratadorTipoDocumento, numeroDocumento: guia.subcontratadorNumeroDocumento };
    if (mismaIdentidadDocumentalGRE(tercero, subcontratador)) return false;
  }

  return true;
}

/**
 * El indicador "traslado por el total de los bienes consignados" (GRE Transportista) solo es
 * coherente cuando existe al menos un documento relacionado real que lo sustente — sin documento
 * no hay nada de lo que el indicador pueda ser "el total". Única fuente para esta regla: la usan
 * tanto la UI (para deshabilitar el checkbox) como la validación de dominio (para rechazar la
 * combinación al emitir), nunca reimplementada por separado en cada consumidor.
 */
export function indicadorTrasladoTotalEsValidoGRE(
  guia: Pick<GuiaRemision, 'tipo' | 'indicadorTrasladoTotalBienes' | 'documentosRelacionados'>,
): boolean {
  if (guia.tipo !== 'transportista' || !guia.indicadorTrasladoTotalBienes) return true;
  return guia.documentosRelacionados.length > 0;
}

// ─── Pagador del flete (GRE Transportista) ─────────────────────

const PAGADOR_FLETE_LABELS: Record<NonNullable<GuiaRemision['pagadorFlete']>, string> = {
  Remitente: 'Remitente',
  Subcontratador: 'Subcontratador',
  Otro: 'Otro (tercero)',
};

/** Etiqueta legible del tipo de Pagador del flete — única fuente para formulario, impresión, Vista previa y Drawer. */
export function textoTipoPagadorFleteGRE(pagadorFlete: GuiaRemision['pagadorFlete']): string | undefined {
  return pagadorFlete ? PAGADOR_FLETE_LABELS[pagadorFlete] : undefined;
}

type CamposPagadorFleteGRE = Pick<
  GuiaRemision,
  | 'pagadorFlete'
  | 'remitenteNombre' | 'remitenteTipoDocumento' | 'remitenteNumeroDocumento'
  | 'subcontratadorNombre' | 'subcontratadorTipoDocumento' | 'subcontratadorNumeroDocumento'
  | 'pagadorTerceroNombre' | 'pagadorTerceroTipoDocumento' | 'pagadorTerceroNumeroDocumento'
>;

/**
 * Snapshot con los datos concretos (nombre + documento) de QUIEN paga el flete, sin importar el
 * rol — Remitente y Subcontratador leen el mismo snapshot ya consignado para ese actor (nunca se
 * duplica el dato, solo se referencia); "Otro" lee su propio snapshot independiente. `null` cuando
 * el pagador todavía no está definido. Única fuente para impresión, Vista previa y Drawer — nunca
 * se reimplementa en cada consumidor.
 */
export function obtenerDatosPagadorFleteGRE(guia: CamposPagadorFleteGRE): DatosActorGRE | null {
  switch (guia.pagadorFlete) {
    case 'Remitente':
      return { nombre: guia.remitenteNombre, tipoDocumento: guia.remitenteTipoDocumento, numeroDocumento: guia.remitenteNumeroDocumento };
    case 'Subcontratador':
      return { nombre: guia.subcontratadorNombre, tipoDocumento: guia.subcontratadorTipoDocumento, numeroDocumento: guia.subcontratadorNumeroDocumento };
    case 'Otro':
      return { nombre: guia.pagadorTerceroNombre, tipoDocumento: guia.pagadorTerceroTipoDocumento, numeroDocumento: guia.pagadorTerceroNumeroDocumento };
    default:
      return null;
  }
}

// ─── Modalidad de transporte (público/privado) ─────────────────

/**
 * La modalidad de transporte (público/privado, catálogo `MODALIDADES_TRANSPORTE`) describe si el
 * REMITENTE traslada con recursos propios o contrata un transportista externo — es un concepto
 * exclusivo de GRE Remitente. GRE Transportista no lo tiene: el transportista siempre traslada con
 * sus propios recursos (misma forma documental "transporte privado" — vehículos/conductores
 * propios), sin importar el valor heredado que el campo `modalidadTransporte` conserve en el
 * modelo compartido. `guia.modalidadTransporte` sigue existiendo y siendo editable en Remitente sin
 * cambios; para Transportista su valor nunca debe leerse ni mostrarse como un hecho real del
 * documento — únicamente estas dos funciones deciden eso, para no distribuir el chequeo en cada
 * consumidor (formulario, validación, impresión, drawer, listado).
 */
export function aplicaModalidadTransporteGRE(tipoGRE: TipoGRE): boolean {
  return tipoGRE === 'remitente';
}

/**
 * El motivo de traslado (catálogo `MOTIVOS_TRASLADO`) es un concepto exclusivo de GRE Remitente —
 * GRE Transportista no lo usa para nada (ni UI, ni reglas, ni impresión); el campo
 * `guia.motivoTraslado` se mantiene en el modelo solo porque el tipo lo exige, con un valor
 * inerte. Única fuente para decidir si el motivo debe mostrarse — nunca un `if (tipo ===
 * 'transportista')` repetido en cada consumidor (formulario, impresión, drawer, listado).
 */
export function aplicaMotivoTrasladoGRE(tipoGRE: TipoGRE): boolean {
  return tipoGRE === 'remitente';
}

/**
 * El indicador "Vehículo categoría M1 o L" (`TransportePrivado.esM1oL` / `TransportePublico.esM1oL`)
 * es un concepto exclusivo de GRE Remitente — no forma parte del formulario documental de GRE
 * Transportista, que siempre registra vehículo(s) y conductor(es) completos. `guia.transportePrivado`
 * sigue existiendo y siendo editable en Remitente sin cambios; para Transportista un valor legacy
 * heredado en `esM1oL`/`placaVehiculoM1L` nunca debe leerse ni mostrarse como un hecho real del
 * documento — única fuente para no distribuir el chequeo en cada consumidor (formulario,
 * validación, impresión, drawer).
 */
export function aplicaM1oLGRE(tipoGRE: TipoGRE): boolean {
  return tipoGRE === 'remitente';
}

/** Si la modalidad no aplica (Transportista), el documento siempre usa la forma "transporte privado" — nunca se lee el valor heredado de `modalidadTransporte`. */
export function esTransportePrivadoGRE(tipoGRE: TipoGRE, modalidadTransporte: string): boolean {
  return !aplicaModalidadTransporteGRE(tipoGRE) || modalidadTransporte === '02';
}

// ─── Descripción documental del bien (GRE) ─────────────────────

/**
 * "Descripción detallada del bien" (concepto documental SUNAT): el nombre del producto nunca debe
 * perderse, sin importar qué tan vacía o completa esté la descripción/detalle adicional del
 * producto. Regla:
 *  - Sin descripción adicional (`undefined` o cadena vacía tras `trim()`): se usa solo el nombre.
 *  - Con descripción adicional que YA contiene el nombre (el usuario lo tipeó dos veces): se usa
 *    tal cual, sin duplicar.
 *  - Con descripción adicional distinta: se combinan como "Nombre — Detalle", sin concatenar a
 *    ciegas cuando no aporta nada nuevo.
 * Única fuente para construir `BienGRE.descripcion` al consignar un bien desde el catálogo — el
 * snapshot resultante es lo único que leen después impresión, Vista previa y Drawer (ninguno
 * vuelve a consultar el catálogo en vivo).
 */
export function obtenerDescripcionDetalladaBienGRE(nombreProducto: string, descripcionProducto?: string): string {
  const nombre = nombreProducto.trim();
  const detalle = descripcionProducto?.trim();
  if (!detalle) return nombre;
  if (detalle.toLowerCase().includes(nombre.toLowerCase())) return detalle;
  return `${nombre} — ${detalle}`;
}

// ─── Cambio de tipo GRE Remitente ↔ Transportista ──────────────

/**
 * ¿El borrador tiene información realmente ingresada por el usuario? Compara contra un borrador
 * recién creado del mismo tipo (`GUIA_REMISION_BORRADOR`), ignorando únicamente los campos que se
 * autocompletan sin intervención del usuario: identidad/fechas técnicas, la serie (se
 * autoasigna igual en el formulario destino) y el punto de partida (se re-deriva igual del
 * establecimiento activo). Ninguno de esos representa pérdida real de información — el resto del
 * documento (actores, bienes, documentos relacionados, transporte, observaciones, punto de
 * llegada, etc.) sí. Única fuente para decidir si el cambio de tipo GRE Remitente ↔ Transportista
 * debe pedir confirmación antes de limpiar el formulario.
 */
const CAMPOS_AUTOCOMPLETADOS_GRE = ['id', 'creadoEl', 'actualizadoEl', 'serie', 'puntoPartida'] as const;

export function tieneDatosIngresadosGRE(guia: GuiaRemision): boolean {
  const normalizar = (g: GuiaRemision): Partial<GuiaRemision> => {
    const copia: Partial<GuiaRemision> = { ...g };
    for (const campo of CAMPOS_AUTOCOMPLETADOS_GRE) delete copia[campo];
    return copia;
  };
  return JSON.stringify(normalizar(guia)) !== JSON.stringify(normalizar(GUIA_REMISION_BORRADOR(guia.tipo)));
}

