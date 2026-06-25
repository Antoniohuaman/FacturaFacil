import { tryLsKey } from '@/shared/tenant';
import { STORAGE_KEYS } from '../models/documentoComercial.constants';
import type { DocumentoComercial } from '../models/documentoComercial.types';

export type ResultadoPersistencia =
  | { exito: true }
  | { exito: false; error: string; causa?: unknown };

function normalizarDocumentoCargado(doc: DocumentoComercial): DocumentoComercial {
  // Normalización de estados legacy de Cotización
  if (doc.tipo === 'cotizacion') {
    if (doc.estado === 'Generada') {
      return {
        ...doc,
        estado: doc.camposOpcionales?.requiereAprobacion === true
          ? 'Pendiente aprobación'
          : 'Vigente',
      };
    }
    if (doc.estado === 'Rechazada') {
      return { ...doc, estado: 'No aprobada' };
    }
    return doc;
  }

  // Normalización de estados legacy de Orden de Venta
  if (doc.tipo === 'orden_venta') {
    // 'Generada' → 'Reservada' (legacy: documentos anteriores a FASE 1)
    if (doc.estado === 'Generada') return { ...doc, estado: 'Reservada' as const };
    // 'Atendida parcial' → 'Atendida parcialmente' (legacy)
    if (doc.estado === 'Atendida parcial') return { ...doc, estado: 'Atendida parcialmente' as const };
    // 'Atendida total' → 'Atendida' (legacy)
    if (doc.estado === 'Atendida total') return { ...doc, estado: 'Atendida' as const };
    // 'Convertida' → estado resuelto según evidencia disponible
    if (doc.estado === 'Convertida') {
      const modo = doc.modoDescuentoStock;
      if (modo === 'automatico' || modo === 'sin_control') {
        return { ...doc, estado: 'Atendida' as const };
      }
      if (modo === 'nota_salida') {
        // notaSalidaId solo indica que se generó una NS, no que completó el ciclo físico
        // (la NS pudo haber sido anulada). Conservador siempre: Pendiente de salida.
        return { ...doc, estado: 'Pendiente de salida' as const };
      }
      // modo undefined: información insuficiente → conservador
      return { ...doc, estado: 'Pendiente de salida' as const };
    }
    return doc;
  }

  return doc;
}

const obtenerClave = (): string => {
  const clave = tryLsKey(STORAGE_KEYS.DOCUMENTOS);
  return clave ?? STORAGE_KEYS.DOCUMENTOS;
};

export const cargarDocumentosDesdeStorage = (): DocumentoComercial[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(obtenerClave());
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return (parsed as DocumentoComercial[]).map(normalizarDocumentoCargado);
  } catch {
    return [];
  }
};

/**
 * Escribe la lista completa de documentos en localStorage.
 * Retorna un ResultadoPersistencia tipado: nunca lanza; el error es funcional (para UI).
 * `causa` se conserva para diagnóstico interno aunque no se expone al usuario.
 */
export function persistirDocumentos(documentos: DocumentoComercial[]): ResultadoPersistencia {
  if (typeof window === 'undefined') {
    return { exito: false, error: 'Almacenamiento no disponible en este entorno.' };
  }
  try {
    window.localStorage.setItem(obtenerClave(), JSON.stringify(documentos));
    return { exito: true };
  } catch (causa) {
    if (causa instanceof DOMException && causa.name === 'QuotaExceededError') {
      return {
        exito: false,
        error: 'No hay espacio disponible para guardar el documento. Libera espacio y vuelve a intentarlo.',
        causa,
      };
    }
    return { exito: false, error: 'Error al guardar el documento. Vuelve a intentarlo.', causa };
  }
}

export const guardarDocumentosEnStorage = (documentos: DocumentoComercial[]): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(obtenerClave(), JSON.stringify(documentos));
  } catch {
    // Ignorar errores de cuota — esta función sirve al useEffect de sincronización automática.
    // Para escritura crítica (OV), usar persistirDocumentos que devuelve ResultadoPersistencia.
  }
};

/**
 * Carga un único documento comercial por ID desde localStorage.
 * Devuelve undefined si no existe, si el JSON está corrupto, o si no puede leerse.
 * El catch silencioso es aceptable: es un guard de UI que falla de forma segura.
 */
export function cargarDocumentoPorId(id: string): DocumentoComercial | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = window.localStorage.getItem(obtenerClave());
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return undefined;
    return (parsed as DocumentoComercial[]).find(d => d.id === id);
  } catch {
    return undefined;
  }
}

const obtenerClaveCompatibilidadLegacy = (): string | null => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.DOCUMENTOS);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return STORAGE_KEYS.DOCUMENTOS;
  } catch {
    // silencioso
  }
  return null;
};

export const migrarDocumentosLegacy = (): void => {
  const claveTenant = tryLsKey(STORAGE_KEYS.DOCUMENTOS);
  if (!claveTenant) return;
  const tenantTieneData = window.localStorage.getItem(claveTenant);
  if (tenantTieneData) return;

  const claveLegacy = obtenerClaveCompatibilidadLegacy();
  if (!claveLegacy) return;

  const data = window.localStorage.getItem(claveLegacy);
  if (data) {
    window.localStorage.setItem(claveTenant, data);
  }
};
