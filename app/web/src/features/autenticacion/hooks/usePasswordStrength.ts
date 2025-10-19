// src/features/autenticacion/hooks/usePasswordStrength.ts
import { useMemo } from 'react';
import type { PasswordStrength, PasswordPolicy } from '../types/auth.types';

const DEFAULT_POLICY: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

/**
 * Hook para evaluar la fortaleza de contraseñas
 */
export function usePasswordStrength(password: string, policy: PasswordPolicy = DEFAULT_POLICY): PasswordStrength {
  return useMemo(() => {
    if (!password) {
      return {
        score: 0,
        feedback: ['Ingresa una contraseña'],
        isValid: false,
      };
    }

    let score = 0;
    const feedback: string[] = [];

    // Longitud mínima
    if (password.length < policy.minLength) {
      feedback.push(`Mínimo ${policy.minLength} caracteres`);
    } else {
      score++;
    }

    // Mayúsculas
    if (policy.requireUppercase) {
      if (!/[A-Z]/.test(password)) {
        feedback.push('Debe contener mayúsculas');
      } else {
        score++;
      }
    }

    // Minúsculas
    if (policy.requireLowercase) {
      if (!/[a-z]/.test(password)) {
        feedback.push('Debe contener minúsculas');
      } else {
        score++;
      }
    }

    // Números
    if (policy.requireNumbers) {
      if (!/[0-9]/.test(password)) {
        feedback.push('Debe contener números');
      } else {
        score++;
      }
    }

    // Caracteres especiales
    if (policy.requireSpecialChars) {
      const specialRegex = new RegExp(`[${policy.specialChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`);
      if (!specialRegex.test(password)) {
        feedback.push('Debe contener caracteres especiales');
      } else {
        score++;
      }
    }

    // Bonus por longitud extra
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;

    // Normalizar score a 0-4
    const normalizedScore = Math.min(4, Math.max(0, score)) as 0 | 1 | 2 | 3 | 4;

    // Determinar si es válido
    const isValid = 
      password.length >= policy.minLength &&
      (!policy.requireUppercase || /[A-Z]/.test(password)) &&
      (!policy.requireLowercase || /[a-z]/.test(password)) &&
      (!policy.requireNumbers || /[0-9]/.test(password)) &&
      (!policy.requireSpecialChars || new RegExp(`[${policy.specialChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`).test(password));

    return {
      score: normalizedScore,
      feedback: feedback.length > 0 ? feedback : ['Contraseña segura'],
      isValid,
    };
  }, [password, policy]);
}