// src/features/autenticacion/services/RateLimitService.ts

/**
 * ============================================
 * RATE LIMIT SERVICE - Cooldown Visual
 * ============================================
 * Previene intentos excesivos de login/OTP
 */

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number; // Ventana de tiempo en ms
  cooldownMs: number; // Tiempo de espera después de exceder
}

interface AttemptRecord {
  count: number;
  firstAttempt: number;
  blockedUntil?: number;
}

const DEFAULT_CONFIG: Record<string, RateLimitConfig> = {
  login: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutos
    cooldownMs: 5 * 60 * 1000, // 5 minutos de espera
  },
  otp: {
    maxAttempts: 3,
    windowMs: 5 * 60 * 1000, // 5 minutos
    cooldownMs: 2 * 60 * 1000, // 2 minutos de espera
  },
  password_reset: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hora
    cooldownMs: 10 * 60 * 1000, // 10 minutos de espera
  },
};

class RateLimitService {
  private storage: Map<string, AttemptRecord> = new Map();

  private getStorageKey(action: string, identifier: string): string {
    return `ratelimit_${action}_${identifier}`;
  }

  /**
   * Registra un intento
   */
  recordAttempt(action: string, identifier: string): void {
    const key = this.getStorageKey(action, identifier);
    const config = DEFAULT_CONFIG[action] || DEFAULT_CONFIG.login;
    const now = Date.now();

    let record = this.storage.get(key);

    if (!record || now - record.firstAttempt > config.windowMs) {
      // Nueva ventana de tiempo
      record = {
        count: 1,
        firstAttempt: now,
      };
    } else {
      // Incrementar intentos en la ventana actual
      record.count++;

      // Si excede, bloquear
      if (record.count > config.maxAttempts) {
        record.blockedUntil = now + config.cooldownMs;
      }
    }

    this.storage.set(key, record);
  }

  /**
   * Verifica si está bloqueado
   */
  isBlocked(action: string, identifier: string): boolean {
    const key = this.getStorageKey(action, identifier);
    const record = this.storage.get(key);

    if (!record || !record.blockedUntil) return false;

    const now = Date.now();
    
    if (now >= record.blockedUntil) {
      // El cooldown terminó, limpiar
      this.storage.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Obtiene el tiempo restante de bloqueo (en segundos)
   */
  getRemainingCooldown(action: string, identifier: string): number {
    const key = this.getStorageKey(action, identifier);
    const record = this.storage.get(key);

    if (!record || !record.blockedUntil) return 0;

    const now = Date.now();
    const remaining = Math.max(0, record.blockedUntil - now);
    
    return Math.ceil(remaining / 1000);
  }

  /**
   * Obtiene los intentos restantes
   */
  getRemainingAttempts(action: string, identifier: string): number {
    const key = this.getStorageKey(action, identifier);
    const config = DEFAULT_CONFIG[action] || DEFAULT_CONFIG.login;
    const record = this.storage.get(key);

    if (!record) return config.maxAttempts;

    return Math.max(0, config.maxAttempts - record.count);
  }

  /**
   * Resetea los intentos (después de un login exitoso)
   */
  reset(action: string, identifier: string): void {
    const key = this.getStorageKey(action, identifier);
    this.storage.delete(key);
  }

  /**
   * Limpia todos los registros
   */
  clearAll(): void {
    this.storage.clear();
  }
}

export const rateLimitService = new RateLimitService();