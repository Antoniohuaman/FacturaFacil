import { tryLsKey } from '@/shared/tenant';
import { STORAGE_KEYS } from '../models/documentoComercial.constants';
import type { DocumentoComercial } from '../models/documentoComercial.types';

function normalizarDocumentoCargado(doc: DocumentoComercial): DocumentoComercial {
  if (doc.tipo !== 'cotizacion') return doc;
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

export const guardarDocumentosEnStorage = (documentos: DocumentoComercial[]): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(obtenerClave(), JSON.stringify(documentos));
  } catch {
    // Ignorar errores de cuota
  }
};

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
