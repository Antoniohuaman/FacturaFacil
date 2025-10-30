// src/features/autenticacion/hooks/usePasswordStrength.ts
import { useMemo } from 'react';
import type { PasswordPolicy } from '../types/auth.types';

const DEFAULT_POLICY: PasswordPolicy = {
  minLength: 5,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

export interface PasswordRequirement {
  label: string;
  met: boolean;
}

export interface EnhancedPasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  feedback: string[];
  isValid: boolean;
  requirements: PasswordRequirement[];
}

/**
 * Hook para evaluar la fortaleza de contraseñas con feedback visual mejorado
 */
export function usePasswordStrength(password: string, policy: PasswordPolicy = DEFAULT_POLICY): EnhancedPasswordStrength {
  return useMemo(() => {
    if (!password) {
      return {
        score: 0 as const,
        feedback: [],
        isValid: false,
        requirements: [
          { label: 'Mínimo 5 caracteres', met: false },
          { label: 'Una mayúscula (A-Z)', met: false },
          { label: 'Una minúscula (a-z)', met: false },
          { label: 'Un número (0-9)', met: false },
          { label: 'Un símbolo (!@#$%...)', met: false },
        ],
      };
    }

    let score = 0;
    const feedback: string[] = [];
    const requirements: PasswordRequirement[] = [];

    // Longitud mínima
    const hasMinLength = password.length >= policy.minLength;
    requirements.push({
      label: `Mínimo ${policy.minLength} caracteres`,
      met: hasMinLength,
    });
    if (hasMinLength) score++;

    // Mayúsculas
    const hasUppercase = /[A-Z]/.test(password);
    if (policy.requireUppercase) {
      requirements.push({
        label: 'Una mayúscula (A-Z)',
        met: hasUppercase,
      });
      if (hasUppercase) score++;
    }

    // Minúsculas
    const hasLowercase = /[a-z]/.test(password);
    if (policy.requireLowercase) {
      requirements.push({
        label: 'Una minúscula (a-z)',
        met: hasLowercase,
      });
      if (hasLowercase) score++;
    }

    // Números
    const hasNumber = /[0-9]/.test(password);
    if (policy.requireNumbers) {
      requirements.push({
        label: 'Un número (0-9)',
        met: hasNumber,
      });
      if (hasNumber) score++;
    }

    // Caracteres especiales
    const specialRegex = new RegExp(`[${policy.specialChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`);
    const hasSpecialChar = specialRegex.test(password);
    if (policy.requireSpecialChars) {
      requirements.push({
        label: 'Un símbolo (!@#$%...)',
        met: hasSpecialChar,
      });
      if (hasSpecialChar) score++;
    }

    // Bonus por longitud extra
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;

    // Normalizar score a 0-4
    const normalizedScore = Math.min(4, Math.max(0, score)) as 0 | 1 | 2 | 3 | 4;

    // Determinar si es válido
    const isValid = 
      password.length >= policy.minLength &&
      (!policy.requireUppercase || hasUppercase) &&
      (!policy.requireLowercase || hasLowercase) &&
      (!policy.requireNumbers || hasNumber) &&
      (!policy.requireSpecialChars || hasSpecialChar);

    // Feedback solo si no es válido
    if (!isValid) {
      if (!hasMinLength) feedback.push(`Mínimo ${policy.minLength} caracteres`);
      if (policy.requireUppercase && !hasUppercase) feedback.push('Falta mayúscula');
      if (policy.requireLowercase && !hasLowercase) feedback.push('Falta minúscula');
      if (policy.requireNumbers && !hasNumber) feedback.push('Falta número');
      if (policy.requireSpecialChars && !hasSpecialChar) feedback.push('Falta símbolo');
    }

    return {
      score: normalizedScore,
      feedback,
      isValid,
      requirements,
    };
  }, [password, policy]);
}
