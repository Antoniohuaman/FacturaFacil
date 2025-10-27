/**
 * Utilidades para validación de borradores según normativa SUNAT
 */

import { parseDateSpanish, daysSince } from './dateUtils';

/**
 * Límites de días según SUNAT para emisión de comprobantes desde borradores
 */
export const SUNAT_DRAFT_LIMITS = {
  BOLETA_MAX_DAYS: 5,
  FACTURA_MAX_DAYS: 1
} as const;

/**
 * Tipos de comprobante soportados
 */
export type TipoComprobanteDraft = 'Boleta de venta' | 'Factura' | 'Nota de venta';

/**
 * Estado de validación de un borrador
 */
export type DraftValidationStatus = 'valid' | 'expired' | 'unknown';

/**
 * Resultado de validación de un borrador
 */
export interface DraftValidationResult {
  isValid: boolean;
  reason?: string;
  daysSinceCreation: number;
  maxDaysAllowed: number;
  status: DraftValidationStatus;
}

/**
 * Valida si un borrador puede ser emitido según la fecha de creación y tipo
 * @param createdDate - Fecha de creación en formato español "20 ago. 2025 14:30"
 * @param tipoComprobante - Tipo de comprobante
 * @returns Resultado de validación
 */
export function validateDraftForEmit(
  createdDate: string,
  tipoComprobante: string
): DraftValidationResult {
  // Parsear fecha de creación
  const created = parseDateSpanish(createdDate);

  if (!created) {
    return {
      isValid: false,
      reason: 'Fecha de creación inválida',
      daysSinceCreation: -1,
      maxDaysAllowed: 0,
      status: 'unknown'
    };
  }

  // Calcular días desde la creación
  const daysSinceCreation = daysSince(created);

  // Determinar límite según tipo de comprobante
  let maxDaysAllowed = 0;

  if (tipoComprobante === 'Boleta de venta') {
    maxDaysAllowed = SUNAT_DRAFT_LIMITS.BOLETA_MAX_DAYS;
  } else if (tipoComprobante === 'Factura') {
    maxDaysAllowed = SUNAT_DRAFT_LIMITS.FACTURA_MAX_DAYS;
  } else {
    // Tipos no reconocidos se consideran válidos (ej: Nota de venta)
    return {
      isValid: true,
      daysSinceCreation,
      maxDaysAllowed: Infinity,
      status: 'valid'
    };
  }

  // Validar si está dentro del límite
  const isValid = daysSinceCreation <= maxDaysAllowed;

  return {
    isValid,
    reason: isValid
      ? undefined
      : `Excede el límite de ${maxDaysAllowed} día(s) permitido por SUNAT`,
    daysSinceCreation,
    maxDaysAllowed,
    status: isValid ? 'valid' : 'expired'
  };
}

/**
 * Interface para objetos Draft mínimos
 */
export interface DraftForValidation {
  id: string;
  type: string;
  createdDate: string;
  client?: string;
}

/**
 * Filtra borradores válidos e inválidos para emisión masiva
 * @param drafts - Array de borradores
 * @param selectedIds - IDs de borradores seleccionados
 * @returns Objeto con borradores válidos e inválidos
 */
export function validateDraftsForBulkEmit<T extends DraftForValidation>(
  drafts: T[],
  selectedIds: string[]
): {
  valid: T[];
  invalid: T[];
  validationResults: Map<string, DraftValidationResult>;
} {
  const valid: T[] = [];
  const invalid: T[] = [];
  const validationResults = new Map<string, DraftValidationResult>();

  selectedIds.forEach(id => {
    const draft = drafts.find(d => d.id === id);
    if (!draft) return;

    const result = validateDraftForEmit(draft.createdDate, draft.type);
    validationResults.set(id, result);

    if (result.isValid) {
      valid.push(draft);
    } else {
      invalid.push(draft);
    }
  });

  return { valid, invalid, validationResults };
}

/**
 * Calcula el estado de un borrador (Vigente, Por vencer, Vencido)
 * @param createdDate - Fecha de creación
 * @param expiryDate - Fecha de vencimiento
 * @param tipoComprobante - Tipo de comprobante
 * @returns Estado y color del borrador
 */
export function calculateDraftStatus(
  createdDate: string,
  expiryDate: string,
  tipoComprobante: string
): {
  status: 'Vigente' | 'Por vencer' | 'Vencido';
  statusColor: 'green' | 'orange' | 'red';
  daysLeft: number;
} {
  // Validar si puede ser emitido
  const validation = validateDraftForEmit(createdDate, tipoComprobante);

  if (!validation.isValid) {
    return {
      status: 'Vencido',
      statusColor: 'red',
      daysLeft: validation.daysSinceCreation - validation.maxDaysAllowed
    };
  }

  // Calcular días restantes hasta vencimiento
  if (expiryDate) {
    const expiry = parseDateSpanish(expiryDate);
    if (expiry) {
      const today = new Date();
      const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysLeft < 0) {
        return {
          status: 'Vencido',
          statusColor: 'red',
          daysLeft
        };
      } else if (daysLeft <= 1) {
        return {
          status: 'Por vencer',
          statusColor: 'orange',
          daysLeft
        };
      } else {
        return {
          status: 'Vigente',
          statusColor: 'green',
          daysLeft
        };
      }
    }
  }

  // Si no hay fecha de vencimiento o no se puede parsear,
  // usar días restantes según SUNAT
  const daysLeft = validation.maxDaysAllowed - validation.daysSinceCreation;

  return {
    status: daysLeft > 1 ? 'Vigente' : 'Por vencer',
    statusColor: daysLeft > 1 ? 'green' : 'orange',
    daysLeft
  };
}

/**
 * Genera mensaje descriptivo de validación
 * @param validation - Resultado de validación
 * @param draftId - ID del borrador
 * @returns Mensaje descriptivo
 */
export function getValidationMessage(
  validation: DraftValidationResult,
  draftId: string
): string {
  if (validation.isValid) {
    return `Borrador ${draftId} válido para emisión`;
  }

  return `Borrador ${draftId} no puede emitirse: ${validation.reason} (${validation.daysSinceCreation} días desde creación, máximo ${validation.maxDaysAllowed})`;
}
