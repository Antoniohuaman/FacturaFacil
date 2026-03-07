// src/features/autenticacion/services/TokenService.ts

/**
 * ============================================
 * TOKEN SERVICE - Gestión de JWT
 * ============================================
 */

interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

const STORAGE_KEY = 'senciyo_auth_tokens';
const REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutos antes de expirar

class TokenService {
  /**
   * Guarda los tokens en storage (localStorage o sessionStorage según recordarme)
   */
  setTokens(
    accessToken: string,
    refreshToken: string,
    expiresIn: number,
    remember: boolean = false
  ): void {
    const storage = remember ? localStorage : sessionStorage;
    const expiresAt = Date.now() + expiresIn * 1000;

    const tokens: StoredTokens = {
      accessToken,
      refreshToken,
      expiresAt,
    };

    storage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  }

  /**
   * Obtiene el access token actual
   */
  getAccessToken(): string | null {
    const tokens = this.getTokens();
    if (!tokens) return null;

    // Verificar si el token expiró
    if (Date.now() >= tokens.expiresAt) {
      this.clearTokens();
      return null;
    }

    return tokens.accessToken;
  }

  /**
   * Obtiene el refresh token
   */
  getRefreshToken(): string | null {
    const tokens = this.getTokens();
    return tokens?.refreshToken || null;
  }

  /**
   * Obtiene todos los tokens almacenados
   */
  private getTokens(): StoredTokens | null {
    const localTokens = localStorage.getItem(STORAGE_KEY);
    const sessionTokens = sessionStorage.getItem(STORAGE_KEY);

    const tokensStr = localTokens || sessionTokens;
    if (!tokensStr) return null;

    try {
      return JSON.parse(tokensStr) as StoredTokens;
    } catch {
      return null;
    }
  }

  /**
   * Verifica si el token necesita ser renovado
   */
  shouldRefresh(): boolean {
    const tokens = this.getTokens();
    if (!tokens) return false;

    const timeToExpire = tokens.expiresAt - Date.now();
    return timeToExpire < REFRESH_THRESHOLD && timeToExpire > 0;
  }

  /**
   * Verifica si hay tokens válidos
   */
  hasValidTokens(): boolean {
    const tokens = this.getTokens();
    if (!tokens) return false;

    return Date.now() < tokens.expiresAt;
  }

  /**
   * Limpia todos los tokens
   */
  clearTokens(): void {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Decodifica un JWT (sin verificar firma - solo para leer payload)
   */
  decodeToken(token: string): Record<string, unknown> | null {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }
}

export const tokenService = new TokenService();
