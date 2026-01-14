// Validation utilities for Caja (Cash Register) fields
// Pure functions following Single Responsibility Principle

import type { CreateCajaInput, UpdateCajaInput, Caja, MedioPago } from '../models/Caja';
import type { User } from '../models/User';
import { CAJA_CONSTRAINTS } from '../models/Caja';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validates caja name
 */
export function validateNombre(nombre: string): ValidationError | null {
  if (!nombre || nombre.trim().length === 0) {
    return { field: 'nombre', message: 'El nombre es requerido' };
  }

  if (nombre.length > CAJA_CONSTRAINTS.NOMBRE_MAX_LENGTH) {
    return { 
      field: 'nombre', 
      message: `El nombre no puede exceder ${CAJA_CONSTRAINTS.NOMBRE_MAX_LENGTH} caracteres` 
    };
  }

  return null;
}

/**
 * Validates nombre uniqueness within an establishment
 */
export function validateNombreUniqueness(
  nombre: string, 
  existingCajas: Caja[], 
  currentCajaId?: string
): ValidationError | null {
  const normalizedName = nombre.trim().toLowerCase();
  
  const duplicate = existingCajas.find(
    c => c.nombre.trim().toLowerCase() === normalizedName && c.id !== currentCajaId
  );

  if (duplicate) {
    return { 
      field: 'nombre', 
      message: 'Ya existe una caja con este nombre en el establecimiento' 
    };
  }

  return null;
}

/**
 * Validates currency selection
 */
export function validateMoneda(monedaId: string): ValidationError | null {
  if (!monedaId || monedaId.trim().length === 0) {
    return { field: 'monedaId', message: 'Debe seleccionar una moneda' };
  }

  return null;
}

/**
 * Validates establishment selection
 */
export function validateEstablecimiento(establecimientoId: string): ValidationError | null {
  if (!establecimientoId || establecimientoId.trim().length === 0) {
    return { field: 'establecimientoId', message: 'Debe seleccionar un establecimiento' };
  }

  return null;
}

/**
 * Validates payment methods
 */
export function validateMediosPago(
  mediosPago: MedioPago[], 
  habilitada: boolean
): ValidationError | null {
  if (habilitada && mediosPago.length === 0) {
    return { 
      field: 'mediosPagoPermitidos', 
      message: 'Debe seleccionar al menos un medio de pago si la caja está habilitada' 
    };
  }

  return null;
}

/**
 * Validates maximum limit
 */
export function validateLimiteMaximo(limite: number): ValidationError | null {
  if (limite < CAJA_CONSTRAINTS.LIMITE_MIN) {
    return { 
      field: 'limiteMaximo', 
      message: `El límite máximo no puede ser menor a ${CAJA_CONSTRAINTS.LIMITE_MIN}` 
    };
  }

  if (isNaN(limite)) {
    return { field: 'limiteMaximo', message: 'El límite máximo debe ser un número válido' };
  }

  return null;
}

/**
 * Validates discrepancy margin
 */
export function validateMargenDescuadre(margen: number): ValidationError | null {
  if (margen < CAJA_CONSTRAINTS.MARGEN_MIN || margen > CAJA_CONSTRAINTS.MARGEN_MAX) {
    return { 
      field: 'margenDescuadre', 
      message: `El margen de descuadre debe estar entre ${CAJA_CONSTRAINTS.MARGEN_MIN} y ${CAJA_CONSTRAINTS.MARGEN_MAX}` 
    };
  }

  if (isNaN(margen)) {
    return { field: 'margenDescuadre', message: 'El margen de descuadre debe ser un número válido' };
  }

  return null;
}

export function validateUsuariosAutorizados(
  usuariosAutorizados: string[] | undefined,
  users: User[],
  habilitada: boolean
): ValidationError | null {
  // If not provided, default to empty array
  const usuarios = usuariosAutorizados || [];

  // Validate that all IDs exist in users
  const invalidIds = usuarios.filter(id => 
    !users.some(user => user.id === id)
  );

  if (invalidIds.length > 0) {
    return {
      field: 'usuariosAutorizados',
      message: `Los siguientes usuarios no existen: ${invalidIds.join(', ')}`
    };
  }

  // If caja is enabled, at least one authorized user is required
  if (habilitada && usuarios.length === 0) {
    return {
      field: 'usuariosAutorizados',
      message: 'Debe autorizar al menos un usuario para operar esta caja'
    };
  }

  return null;
}

/**
 * Validates complete caja creation input
 */
export function validateCreateCaja(
  input: CreateCajaInput,
  existingCajas: Caja[],
  users: User[] = []
): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate nombre
  const nombreError = validateNombre(input.nombre);
  if (nombreError) errors.push(nombreError);

  // Check uniqueness
  const uniquenessError = validateNombreUniqueness(input.nombre, existingCajas);
  if (uniquenessError) errors.push(uniquenessError);

  // Validate moneda
  const monedaError = validateMoneda(input.monedaId);
  if (monedaError) errors.push(monedaError);

  // Validate medios de pago
  const mediosPagoError = validateMediosPago(input.mediosPagoPermitidos, input.habilitada);
  if (mediosPagoError) errors.push(mediosPagoError);

  // Validate limite
  const limiteError = validateLimiteMaximo(input.limiteMaximo);
  if (limiteError) errors.push(limiteError);

  // Validate margen
  const margenError = validateMargenDescuadre(input.margenDescuadre);
  if (margenError) errors.push(margenError);

  // Validate usuarios autorizados
  const usuariosError = validateUsuariosAutorizados(
    input.usuariosAutorizados,
    users,
    input.habilitada
  );
  if (usuariosError) errors.push(usuariosError);

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates caja update input
 */
export function validateUpdateCaja(
  input: UpdateCajaInput,
  existingCajas: Caja[],
  currentCajaId: string,
  users: User[] = []
): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate nombre if provided
  if (input.nombre !== undefined) {
    const nombreError = validateNombre(input.nombre);
    if (nombreError) errors.push(nombreError);

    const uniquenessError = validateNombreUniqueness(input.nombre, existingCajas, currentCajaId);
    if (uniquenessError) errors.push(uniquenessError);
  }

  // Validate moneda if provided
  if (input.monedaId !== undefined) {
    const monedaError = validateMoneda(input.monedaId);
    if (monedaError) errors.push(monedaError);
  }

  // Validate medios de pago if habilitada is being changed or medios are being updated
  if (input.habilitada !== undefined || input.mediosPagoPermitidos !== undefined) {
    const currentCaja = existingCajas.find(c => c.id === currentCajaId);
    const habilitada = input.habilitada ?? currentCaja?.habilitada ?? false;
    const mediosPago = input.mediosPagoPermitidos ?? currentCaja?.mediosPagoPermitidos ?? [];
    
    const mediosPagoError = validateMediosPago(mediosPago, habilitada);
    if (mediosPagoError) errors.push(mediosPagoError);
  }

  // Validate limite if provided
  if (input.limiteMaximo !== undefined) {
    const limiteError = validateLimiteMaximo(input.limiteMaximo);
    if (limiteError) errors.push(limiteError);
  }

  // Validate margen if provided
  if (input.margenDescuadre !== undefined) {
    const margenError = validateMargenDescuadre(input.margenDescuadre);
    if (margenError) errors.push(margenError);
  }

  // Validate usuarios autorizados if provided or if habilitada is changing
  if (input.usuariosAutorizados !== undefined || input.habilitada !== undefined) {
    const currentCaja = existingCajas.find(c => c.id === currentCajaId);
    const habilitada = input.habilitada ?? currentCaja?.habilitada ?? false;
    const usuariosAutorizados = input.usuariosAutorizados ?? currentCaja?.usuariosAutorizados ?? [];
    
    const usuariosError = validateUsuariosAutorizados(
      usuariosAutorizados,
      users,
      habilitada
    );
    if (usuariosError) errors.push(usuariosError);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Helper to get error message for a specific field
 */
export function getFieldError(errors: ValidationError[], field: string): string | undefined {
  return errors.find(e => e.field === field)?.message;
}

/**
 * Helper to check if a field has an error
 */
export function hasFieldError(errors: ValidationError[], field: string): boolean {
  return errors.some(e => e.field === field);
}
