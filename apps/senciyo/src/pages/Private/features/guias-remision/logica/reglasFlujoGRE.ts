import type { TipoGRE } from '../modelos/GuiaRemision';

// ─── Tipos ───────────────────────────────────────────────────

/** Regla para el actor principal de la guía. */
export interface ReglaActorGRE {
  /** Etiqueta visible en el formulario (ej. 'Destinatario', 'Proveedor', 'Tercero/Transformador'). */
  label: string;
  /** Si true, el campo es obligatorio para emitir. */
  obligatorio: boolean;
}

/** Regla completa de flujo para un motivo+tipo de guía. */
export interface ReglaFlujoGRE {
  /** Actor principal — siempre presente. */
  actorPrincipal: ReglaActorGRE;
  /**
   * Actor secundario (comprador).
   * Solo presente para motivo '03' (Venta con entrega a terceros).
   * null para todos los demás motivos.
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
    actorPrincipal: { label: 'Proveedor', obligatorio: true },
    documentosRecomendados: ['01', '03', '04'],
    ayudaMotivo:
      'Para Compra, el actor principal es el Proveedor (quien vende y envía los bienes).',
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
