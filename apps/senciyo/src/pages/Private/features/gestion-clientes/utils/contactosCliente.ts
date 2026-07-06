import { resolveDocumentCodeFromInputs, resolveDocumentNumberFromInputs } from './documents';

const CONTACTOS_STORAGE_PREFIX = 'facturafacil:clientes:contactos';

export interface ContactoCorreoCliente {
  id: string;
  tipo: string;
  valor: string;
}

export interface ContactoTelefonoCliente {
  id: string;
  tipo: string;
  numero: string;
}

export interface ContactoCliente {
  id: string;
  nombre: string;
  cargo: string;
  correos: ContactoCorreoCliente[];
  telefonos: ContactoTelefonoCliente[];
}

interface ContactosClientePayload {
  contactos: ContactoCliente[];
  principalId: string | null;
}

interface ClienteConDocumento {
  id?: string | number | null;
  tipoDocumento?: string | null;
  numeroDocumento?: string | null;
  document?: string | null;
}

/**
 * Claves de persistencia de contactos por cliente. Debe coincidir exactamente
 * con `buildContactosStorageKeysForClient` en ClientesPage.tsx / ClienteFormNew.tsx
 * (misma fuente de datos, sin duplicar la UI de edición — este módulo solo lee).
 */
function construirClavesContactos(cliente: ClienteConDocumento): string[] {
  const claves: string[] = [];
  const clienteId = cliente.id !== undefined && cliente.id !== null ? `${cliente.id}`.trim() : '';
  if (clienteId) {
    claves.push(`${CONTACTOS_STORAGE_PREFIX}:id:${clienteId}`);
  }

  const documentCode = resolveDocumentCodeFromInputs({
    tipoDocumento: cliente.tipoDocumento,
    legacyDocument: cliente.document,
  });
  const documentNumber = resolveDocumentNumberFromInputs({
    tipoDocumento: cliente.tipoDocumento,
    numeroDocumento: cliente.numeroDocumento,
    legacyDocument: cliente.document,
    documentCode,
  }).trim();
  if (documentNumber) {
    const typeCode = documentCode || 'sin-tipo';
    claves.push(`${CONTACTOS_STORAGE_PREFIX}:doc:${typeCode}:${documentNumber}`);
  }

  return claves;
}

function esContactoCorreoValido(value: unknown): value is ContactoCorreoCliente {
  if (!value || typeof value !== 'object') return false;
  const c = value as Record<string, unknown>;
  return typeof c.id === 'string' && typeof c.tipo === 'string' && typeof c.valor === 'string';
}

function esContactoTelefonoValido(value: unknown): value is ContactoTelefonoCliente {
  if (!value || typeof value !== 'object') return false;
  const c = value as Record<string, unknown>;
  return typeof c.id === 'string' && typeof c.tipo === 'string' && typeof c.numero === 'string';
}

function esContactoValido(value: unknown): value is ContactoCliente {
  if (!value || typeof value !== 'object') return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.id === 'string' &&
    typeof c.nombre === 'string' &&
    typeof c.cargo === 'string' &&
    Array.isArray(c.correos) &&
    c.correos.every(esContactoCorreoValido) &&
    Array.isArray(c.telefonos) &&
    c.telefonos.every(esContactoTelefonoValido)
  );
}

/**
 * Lee los contactos reales del cliente (misma fuente que la pestaña
 * "Contactos" de Gestión de Clientes). Solo lectura: la creación/edición de
 * contactos sigue viviendo exclusivamente en el formulario de Cliente.
 */
export function obtenerContactosCliente(
  cliente: ClienteConDocumento | null | undefined,
): ContactosClientePayload {
  if (!cliente || typeof window === 'undefined') {
    return { contactos: [], principalId: null };
  }

  const claves = construirClavesContactos(cliente);
  for (const clave of claves) {
    const raw = window.localStorage.getItem(clave);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw) as Partial<ContactosClientePayload>;
      const contactos = Array.isArray(parsed?.contactos)
        ? parsed.contactos.filter(esContactoValido)
        : [];
      if (contactos.length === 0) continue;

      const principalId = typeof parsed?.principalId === 'string' ? parsed.principalId : null;
      return { contactos, principalId };
    } catch {
      continue;
    }
  }

  return { contactos: [], principalId: null };
}
