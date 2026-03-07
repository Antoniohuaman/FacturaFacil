// Validaciones para Configuración del Sistema
// ==========================================

import { validateRUC } from './rucValidator';

// Tipos para validaciones
export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

/**
 * Valida campos requeridos
 */
export function validateRequired(value: string | null | undefined, fieldName: string): ValidationResult {
  if (!value || value.trim().length === 0) {
    return {
      isValid: false,
      message: `${fieldName} es requerido`
    };
  }
  return { isValid: true };
}

/**
 * Valida email
 */
export function validateEmail(email: string): ValidationResult {
  if (!email) {
    return { isValid: false, message: 'Email es requerido' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, message: 'Email no es válido' };
  }

  return { isValid: true };
}

/**
 * Valida RUC usando el validador específico
 */
export function validateRUCField(ruc: string): ValidationResult {
  if (!ruc) {
    return { isValid: false, message: 'RUC es requerido' };
  }

  if (!validateRUC(ruc)) {
    return { isValid: false, message: 'RUC no es válido' };
  }

  return { isValid: true };
}

/**
 * Valida razón social
 */
export function validateCompanyName(name: string): ValidationResult {
  if (!name || name.trim().length === 0) {
    return { isValid: false, message: 'Razón social es requerida' };
  }

  if (name.trim().length < 3) {
    return { isValid: false, message: 'Razón social debe tener al menos 3 caracteres' };
  }

  return { isValid: true };
}

/**
 * Valida dirección
 */
export function validateAddress(address: string): ValidationResult {
  if (!address || address.trim().length === 0) {
    return { isValid: false, message: 'Dirección es requerida' };
  }

  if (address.trim().length < 5) {
    return { isValid: false, message: 'Dirección debe tener al menos 5 caracteres' };
  }

  return { isValid: true };
}

/**
 * Valida teléfono
 */
export function validatePhone(phone: string): ValidationResult {
  if (!phone) {
    return { isValid: false, message: 'Teléfono es requerido' };
  }

  // Formato básico para teléfonos peruanos
  const phoneRegex = /^(\+51|51)?[0-9]{9}$/;
  if (!phoneRegex.test(phone.replace(/\s|-/g, ''))) {
    return { isValid: false, message: 'Teléfono no es válido' };
  }

  return { isValid: true };
}