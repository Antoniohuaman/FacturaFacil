/**
 * Configuración centralizada de la API
 */

const getApiBaseUrl = (): string => {
  const url = import.meta.env.VITE_API_BASE_URL;
  if (!url) {
    console.warn('⚠️ VITE_API_BASE_URL no está definida, usando localhost');
    return 'http://localhost:5242/api/v1';
  }
  return url;
};

export const API_CONFIG = {
  BASE_URL: getApiBaseUrl(),
  ENDPOINTS: {
    ESTABLECIMIENTOS: '/establecimientos',
    EMPRESAS: '/empresas',
  },
  TIMEOUT: 30000,
  HEADERS: {
    'Content-Type': 'application/json',
  },
} as const;

export const getAuthToken = (): string | null => {
  return localStorage.getItem('access_token');
};

export const getCurrentEmpresaId = (): string | null => {
  try {
    const configKey = Object.keys(localStorage).find(key => 
      key.includes('facturaFacilConfig') && !key.includes('series')
    );
    if (configKey) {
      const config = localStorage.getItem(configKey);
      if (config) {
        const parsed = JSON.parse(config);
        if (parsed?.company?.id) {
          return parsed.company.id;
        }
      }
    }
    const user = localStorage.getItem('user');
    if (user) {
      const parsed = JSON.parse(user);
      return parsed.empresaId || null;
    }
  } catch (error) {
    console.error('Error obteniendo empresaId:', error);
  }
  return null;
};

export const getCurrentUser = (): { id: string; nombre: string } | null => {
  try {
    const user = localStorage.getItem('user');
    if (user) {
      const parsed = JSON.parse(user);
      return {
        id: parsed.id || '',
        nombre: parsed.nombre || parsed.name || 'Usuario',
      };
    }
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
  }
  return null;
};
