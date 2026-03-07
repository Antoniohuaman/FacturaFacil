// src/features/autenticacion/utils/path.ts

/**
 * ============================================
 * PATH CONSTANTS - Rutas de Autenticación
 * ============================================
 */

export const AUTH_PATHS = {
  // Públicas
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  TWO_FACTOR: '/auth/2fa',
  PASSWORD_RESET_REQUEST: '/auth/reset',
  PASSWORD_RESET_CONFIRM: '/auth/reset/confirm',
  SET_PASSWORD: '/auth/set-password/:token',

  // Privadas (requieren auth)
  DASHBOARD: '/comprobantes',
} as const;

export type AuthPath = typeof AUTH_PATHS[keyof typeof AUTH_PATHS];

/**
 * Genera ruta con parámetros
 */
export function buildAuthPath(path: string, params?: Record<string, string>): string {
  let finalPath = path;
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      finalPath = finalPath.replace(`:${key}`, value);
    });
  }
  
  return finalPath;
}

/**
 * Verifica si una ruta requiere autenticación
 */
export function requiresAuth(pathname: string): boolean {
  const publicPaths = [
    AUTH_PATHS.LOGIN,
    AUTH_PATHS.REGISTER,
    AUTH_PATHS.PASSWORD_RESET_REQUEST,
    AUTH_PATHS.PASSWORD_RESET_CONFIRM,
  ];
  
  return !publicPaths.some(path => pathname.startsWith(path));
}

/**
 * Verifica si una ruta requiere workspace
 */
export function requiresWorkspace(pathname: string): boolean {
  const workspaceExemptPaths = [
    AUTH_PATHS.LOGIN,
    AUTH_PATHS.REGISTER,
    AUTH_PATHS.TWO_FACTOR,
    AUTH_PATHS.PASSWORD_RESET_REQUEST,
    AUTH_PATHS.PASSWORD_RESET_CONFIRM,
    AUTH_PATHS.SET_PASSWORD,
    '/auth/set-password/',
  ];

  return !workspaceExemptPaths.some(path => pathname.startsWith(path));
}