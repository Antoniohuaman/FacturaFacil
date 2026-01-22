import { API_CONFIG, getAuthToken } from './config';

interface FetchOptions extends RequestInit {
  timeout?: number;
  requiresAuth?: boolean;
}

export class ApiError extends Error {
  statusCode: number;
  codigoError: string;
  details?: unknown;

  constructor(
    message: string,
    statusCode: number,
    codigoError: string = '0',
    details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.codigoError = codigoError;
    this.details = details;
  }
}

export class NetworkError extends Error {
  originalError?: unknown;

  constructor(message: string, originalError?: unknown) {
    super(message);
    this.name = 'NetworkError';
    this.originalError = originalError;
  }
}

export async function fetchApi<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const {
    timeout = API_CONFIG.TIMEOUT,
    requiresAuth = true,
    headers = {},
    ...fetchOptions
  } = options;

  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  const requestHeaders: Record<string, string> = {
    ...API_CONFIG.HEADERS,
    ...(headers as Record<string, string>),
  };

  if (requiresAuth) {
    const token = getAuthToken();
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }

    // Inyectar contexto de empresa si existe
    try {
      // Importación dinámica para evitar ciclos de importación si fuera necesario, 
      // aunque aquí lo haremos directo si es posible o usaremos el estado del store.
      const { useTenantStore } = await import('../../autenticacion/store/TenantStore');
      const contexto = useTenantStore.getState().contextoActual;
      if (contexto?.empresaId) {
        requestHeaders['X-Empresa-Id'] = contexto.empresaId;
      }
    } catch (e) {
      console.warn('[fetchApi] No se pudo obtener el contexto de la empresa', e);
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers: requestHeaders,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let data: unknown;
    try {
      data = await response.json();
    } catch (parseError) {
      throw new ApiError(
        'Error al parsear la respuesta del servidor',
        response.status,
        'PARSE_ERROR',
        parseError
      );
    }

    if (!response.ok) {
      const errorData = data as { mensaje?: string; codigoError?: string; [key: string]: unknown };
      throw new ApiError(
        errorData.mensaje || `Error HTTP ${response.status}`,
        response.status,
        errorData.codigoError || String(response.status),
        data
      );
    }

    return data as T;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof TypeError || (error as Error).name === 'AbortError') {
      throw new NetworkError(
        (error as Error).name === 'AbortError'
          ? 'La petición tardó demasiado tiempo (timeout)'
          : 'Error de red. Verifica tu conexión a internet.',
        error
      );
    }

    if (error instanceof ApiError) {
      throw error;
    }

    throw new NetworkError('Error desconocido al realizar la petición', error);
  }
}

export function buildQueryString(
  params: Record<string, string | number | boolean | undefined | null>
): string {
  const filtered = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
    );

  return filtered.length > 0 ? `?${filtered.join('&')}` : '';
}
