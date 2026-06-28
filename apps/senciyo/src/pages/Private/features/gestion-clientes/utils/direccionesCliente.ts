/**
 * Utilidad compartida para leer direcciones de clientes desde el almacén local.
 * El formato de almacenamiento es el mismo que usa ClienteFormNew para persistir.
 */

export const PREFIJO_ALMACEN_DIRECCIONES = 'facturafacil:clientes:direcciones';

export type DireccionClienteUI = {
  id: string;
  pais: string;
  departamento: string;
  provincia: string;
  distrito: string;
  ubigeo: string;
  direccion: string;
  referenciaDireccion: string;
};

export type DireccionesClientePayload = {
  direcciones: DireccionClienteUI[];
  principalId: string | null;
};

function esDireccionValida(item: unknown): item is DireccionClienteUI {
  if (!item || typeof item !== 'object') return false;
  const c = item as Record<string, unknown>;
  return (
    typeof c.id === 'string' &&
    typeof c.pais === 'string' &&
    typeof c.departamento === 'string' &&
    typeof c.provincia === 'string' &&
    typeof c.distrito === 'string' &&
    typeof c.ubigeo === 'string' &&
    typeof c.direccion === 'string' &&
    typeof c.referenciaDireccion === 'string'
  );
}

/**
 * Construye las claves de almacenamiento para un cliente.
 * Usa las mismas reglas que ClienteFormNew: primero por id, luego por tipo+número.
 */
export function buildClavesAlmacenDirecciones(params: {
  clienteId?: string | number | null;
  tipoDocumento?: string;
  numeroDocumento?: string;
}): string[] {
  const claves: string[] = [];

  const id = params.clienteId;
  if (id != null && `${id}`.trim()) {
    claves.push(`${PREFIJO_ALMACEN_DIRECCIONES}:id:${`${id}`.trim()}`);
  }

  const numero = (params.numeroDocumento ?? '').trim();
  if (numero) {
    const tipo = (params.tipoDocumento ?? '').trim() || 'sin-tipo';
    claves.push(`${PREFIJO_ALMACEN_DIRECCIONES}:doc:${tipo}:${numero}`);
  }

  return claves;
}

/**
 * Lee las direcciones persistidas dado un array de claves ya construidas.
 * Útil cuando el llamador ya tiene las claves en un useMemo y no puede referenciar
 * los parámetros originales directamente en el effect (evita warnings de exhaustive-deps).
 */
export function leerDireccionesPorClaves(claves: string[]): DireccionesClientePayload | null {
  if (typeof window === 'undefined') return null;
  if (claves.length === 0) return null;

  for (const clave of claves) {
    const raw = window.localStorage.getItem(clave);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as Partial<DireccionesClientePayload>;
      const direcciones = Array.isArray(parsed?.direcciones)
        ? parsed.direcciones.filter(esDireccionValida)
        : [];
      if (direcciones.length === 0) continue;
      const principalId = typeof parsed?.principalId === 'string' ? parsed.principalId : null;
      return { direcciones, principalId };
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Lee las direcciones persistidas de un cliente por sus parámetros de identificación.
 * Devuelve null si no hay datos o si el entorno no tiene localStorage.
 */
export function leerDireccionesClientePersistidas(params: {
  clienteId?: string | number | null;
  tipoDocumento?: string;
  numeroDocumento?: string;
}): DireccionesClientePayload | null {
  return leerDireccionesPorClaves(buildClavesAlmacenDirecciones(params));
}
